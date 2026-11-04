import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { loadPricing, hospitalKey, normalizeName } from '../../shared/shiftPricing.ts';
import { summarizeShifts, financialViews, monthKeyOfDate } from '../../shared/shiftSummaries.ts';

export default async function(req) {
  try {
    const client = createClientFromRequest(req);
    const user = await client.auth.me().catch(e => e.status === 401 ? null : Promise.reject(e));
    if (!user) return Response.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Acesso restrito ao financeiro.' }, { status: 403 });
    const { year, month, doctor = 'all', hospital = 'all', period = 'all', allMonths = false } = await req.json().catch(() => ({}));
    if (typeof allMonths !== 'boolean' || (!allMonths && (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12)) || [doctor, hospital, period].some(v => typeof v !== 'string' || v.length > 200)) return Response.json({ error: 'Filtros inválidos.' }, { status: 400 });
    const [context, hospitalNames, doctorNames] = await Promise.all([
      loadPricing(client), client.entities.Shift.list({ distinct: 'hospital' }), client.entities.Shift.list({ distinct: 'doctor_name' })
    ]);
    const options = (records, names, field, normalize) => {
      const map = new Map(records.map(r => [normalize(r[field]), r[field]]));
      names.forEach(name => { if (name && !map.has(normalize(name))) map.set(normalize(name), name); });
      return Array.from(map, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'pt'));
    };
    const query = { $and: [] };
    if (!allMonths) {
      const mm = String(month).padStart(2, '0');
      const end = String(new Date(year, month, 0).getDate()).padStart(2, '0');
      query.$and.push({ $or: [{ date: { $gte: `${year}-${mm}-01`, $lte: `${year}-${mm}-${end}` } }, { date: { $regex: `^[0-9]{2}/${mm}/${year}$` } }] });
    }
    if (doctor !== 'all') {
      const doctorName = context.doctors.find(d => d.id === doctor)?.full_name || doctor;
      query.$and.push({ doctor_name: { $in: doctorNames.items.filter(name => normalizeName(name) === normalizeName(doctorName)) } });
    }
    if (hospital !== 'all') {
      const hospitalName = context.hospitals.find(h => h.id === hospital)?.name || hospital;
      query.$and.push({ hospital: { $in: hospitalNames.items.filter(name => hospitalKey(name) === hospitalKey(hospitalName)) } });
    }
    if (period !== 'all') query.$and.push({ period });
    const [aggregate, dates] = await Promise.all([
      client.entities.Shift.aggregate({ query: query.$and.length ? query : {}, groupBy: ['doctor_id', 'doctor_name', 'hospital', 'period', 'usar_valor_informado', 'valor_bruto_informado', ...(allMonths ? ['date'] : [])], sum: ['value'] }),
      client.entities.Shift.list({ distinct: 'date' })
    ]);
    if (aggregate.truncated) return Response.json({ error: 'Selecione um médico ou hospital para reduzir o relatório.' }, { status: 400 });
    const summary = summarizeShifts(context, aggregate.rows, allMonths);
    const views = financialViews(summary);
    const availableMonths = Array.from(new Set(dates.items.map(monthKeyOfDate).filter(Boolean))).sort().reverse();
    return Response.json({ summary, ...views, availableMonths, doctorOptions: options(context.doctors, doctorNames.items, 'full_name', normalizeName), hospitalOptions: options(context.hospitals, hospitalNames.items, 'name', hospitalKey) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}