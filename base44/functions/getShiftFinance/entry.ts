import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { loadPricing, quoteShift, appliesTo, hospitalKey, normalizeName, money } from '../../shared/shiftPricing.ts';

export default async function(req) {
  try {
    const client = createClientFromRequest(req);
    const user = await client.auth.me().catch(e => e.status === 401 ? null : Promise.reject(e));
    if (!user) return Response.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Acesso restrito ao financeiro.' }, { status: 403 });
    const { year, month, doctor = 'all', hospital = 'all', period = 'all' } = await req.json().catch(() => ({}));
    if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12 || [doctor, hospital, period].some(v => typeof v !== 'string' || v.length > 200)) return Response.json({ error: 'Filtros inválidos.' }, { status: 400 });
    const [context, hospitalNames, doctorNames] = await Promise.all([
      loadPricing(client), client.entities.Shift.list({ distinct: 'hospital' }), client.entities.Shift.list({ distinct: 'doctor_name' })
    ]);
    const options = (records, names, field, normalize) => {
      const map = new Map(records.map(r => [normalize(r[field]), r[field]]));
      names.forEach(name => { if (name && !map.has(normalize(name))) map.set(normalize(name), name); });
      return Array.from(map, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'pt'));
    };
    const mm = String(month).padStart(2, '0');
    const end = String(new Date(year, month, 0).getDate()).padStart(2, '0');
    const query = { $and: [{ $or: [{ date: { $gte: `${year}-${mm}-01`, $lte: `${year}-${mm}-${end}` } }, { date: { $regex: `^\\d{2}/${mm}/${year}$` } }] }] };
    if (doctor !== 'all') query.$and.push({ doctor_name: { $in: doctorNames.items.filter(name => normalizeName(name) === doctor) } });
    if (hospital !== 'all') query.$and.push({ hospital: { $in: hospitalNames.items.filter(name => hospitalKey(name) === hospitalKey(hospital)) } });
    if (period !== 'all') query.$and.push({ period });
    const aggregate = await client.entities.Shift.aggregate({ query, groupBy: ['doctor_id', 'doctor_name', 'hospital', 'period'], sum: ['value'] });
    if (aggregate.truncated) return Response.json({ error: 'Selecione um médico ou hospital para reduzir o relatório.' }, { status: 400 });
    const grouped = new Map();
    const fixedApplied = new Set();
    for (const row of aggregate.rows) {
      const quote = quoteShift(context, { ...row, value: 0 });
      const key = JSON.stringify([quote.doctorId || normalizeName(row.doctor_name), quote.hospitalId || hospitalKey(row.hospital), row.period || '12h']);
      if (!grouped.has(key)) grouped.set(key, { doctorId: quote.doctorId, hospitalId: quote.hospitalId, doctorName: quote.doctorName, hospitalName: quote.hospitalName, period: row.period || '12h', quantity: 0, grossValue: 0, discountValue: 0, netValue: 0, discountDetails: [] });
      const item = grouped.get(key);
      item.quantity += row.count;
      item.grossValue += quote.configured ? money(quote.baseValue * row.count) : money(row.sum_value);
      item.discountValue += money(quote.discountValue * row.count);
      for (const detail of quote.details) {
        const existing = item.discountDetails.find(d => d.descricao === detail.descricao && d.tipo === detail.tipo && d.valor_config === detail.valor_config);
        if (existing) existing.valor_calculado = money(existing.valor_calculado + detail.valor_calculado * row.count);
        else item.discountDetails.push({ ...detail, valor_calculado: money(detail.valor_calculado * row.count) });
      }
    }
    const summary = Array.from(grouped.values());
    for (const item of summary) {
      const key = JSON.stringify([item.doctorId || normalizeName(item.doctorName), item.hospitalId || hospitalKey(item.hospitalName)]);
      if (!fixedApplied.has(key)) {
        fixedApplied.add(key);
        for (const discount of context.discounts.filter(d => d.tipo_desconto === 'valor_fixo' && appliesTo(d, item.doctorId, item.hospitalId))) {
          item.discountValue += Number(discount.valor_desconto) || 0;
          item.discountDetails.push({ descricao: discount.descricao, tipo: discount.tipo_desconto, valor_config: discount.valor_desconto, valor_calculado: discount.valor_desconto });
        }
      }
      item.grossValue = money(item.grossValue);
      item.discountValue = money(item.discountValue);
      item.netValue = money(item.grossValue - item.discountValue);
    }
    const totals = summary.reduce((acc, item) => ({ quantity: acc.quantity + item.quantity, grossValue: money(acc.grossValue + item.grossValue), discountValue: money(acc.discountValue + item.discountValue), netValue: money(acc.netValue + item.netValue) }), { quantity: 0, grossValue: 0, discountValue: 0, netValue: 0 });
    return Response.json({ summary, totals, doctorOptions: options(context.doctors, doctorNames.items, 'full_name', normalizeName), hospitalOptions: options(context.hospitals, hospitalNames.items, 'name', hospitalKey) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}