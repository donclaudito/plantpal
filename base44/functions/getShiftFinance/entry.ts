import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { loadPricing, readDistinct, readPages, hospitalKey, normalizeName } from '../../shared/shiftPricing.ts';
import { casarConsultas, linhaDoProcedimento, linhaDoPlantao, isoDate } from '../../shared/consultasProcedimentos.ts';
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
      loadPricing(client), readDistinct(client.entities.Shift, 'hospital'), readDistinct(client.entities.Shift, 'doctor_name')
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
    const groupBy = ['doctor_name', 'hospital', 'period', ...(allMonths ? ['date'] : [])];
    const surgeryQuery = { $and: [{ tipo: 'Cirurgia' }, { tipo_pagamento: 'Convenio' }] };
    if (!allMonths) {
      const mm = String(month).padStart(2, '0');
      const start = `${year}-${mm}-01`, end = `${year}-${mm}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
      surgeryQuery.$and.push({ $or: [{ data: { $gte: start, $lte: end } }, { data: { $regex: `^[0-9]{2}/${mm}/${year}$` } }] });
    }
    if (doctor !== 'all') {
      const doctorName = context.doctors.find(d => d.id === doctor)?.full_name || doctor;
      surgeryQuery.$and.push({ doctor_name: { $in: doctorNames.items.filter(name => normalizeName(name) === normalizeName(doctorName)) } });
    }
    if (hospital !== 'all') {
      const hospitalName = context.hospitals.find(h => h.id === hospital)?.name || hospital;
      surgeryQuery.$and.push({ hospital_name: { $in: hospitalNames.items.filter(name => hospitalKey(name) === hospitalKey(hospitalName)) } });
    }
    const wantsSurgeries = period === 'all' || period === 'cirurgias';
    const wantsConsultas = period === 'all' || period === 'consultas';
    // As consultas vêm dos procedimentos registados, por isso os plantões de
    // consultas ficam fora da agregação para não contar o mesmo período duas vezes.
    const shiftQuery = { $and: [...query.$and, ...(wantsConsultas ? [{ period: { $ne: 'consultas' } }] : [])] };
    const consultaQuery = { $and: [{ tipo: 'Consulta' }] };
    if (!allMonths) {
      const mm = String(month).padStart(2, '0');
      const start = `${year}-${mm}-01`, end = `${year}-${mm}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
      consultaQuery.$and.push({ $or: [{ data: { $gte: start, $lte: end } }, { data: { $regex: `^[0-9]{2}/${mm}/${year}$` } }] });
    }
    if (doctor !== 'all') {
      const doctorName = context.doctors.find(d => d.id === doctor)?.full_name || doctor;
      const nomes = Array.from(new Set([doctorName, ...doctorNames.items.filter(name => normalizeName(name) === normalizeName(doctorName))]));
      consultaQuery.$and.push({ doctor_name: { $in: nomes } });
    }
    if (hospital !== 'all') {
      const hospitalName = context.hospitals.find(h => h.id === hospital)?.name || hospital;
      const nomes = Array.from(new Set([hospitalName, ...hospitalNames.items.filter(name => hospitalKey(name) === hospitalKey(hospitalName))]));
      consultaQuery.$and.push({ hospital_name: { $in: nomes } });
    }
    const consultaShiftQuery = { $and: [...query.$and, { period: 'consultas' }] };
    const [estimated, actual, surgeries, consultas, plantoesConsulta, dates] = await Promise.all([
      client.entities.Shift.aggregate({ query: { $and: [...shiftQuery.$and, { usar_valor_informado: { $ne: true } }] }, groupBy, sum: ['value'] }),
      client.entities.Shift.aggregate({ query: { $and: [...shiftQuery.$and, { usar_valor_informado: true }] }, groupBy: ['doctor_name', 'hospital', 'valor_bruto_informado', allMonths ? 'date' : 'period'], sum: ['value'] }),
      wantsSurgeries ? client.entities.Procedimento.aggregate({ query: surgeryQuery, groupBy: ['doctor_name', 'hospital_name', ...(allMonths ? ['data'] : [])] }) : { rows: [], truncated: false },
      wantsConsultas ? readPages(client.entities.Procedimento, consultaQuery) : [],
      wantsConsultas ? readPages(client.entities.Shift, consultaShiftQuery) : [],
      readDistinct(client.entities.Shift, 'date')
    ]);
    if (estimated.truncated || actual.truncated || surgeries.truncated) return Response.json({ error: 'Selecione um médico ou hospital para reduzir o relatório.' }, { status: 400 });
    // Procedimentos faturados + plantões de consultas ainda sem procedimento,
    // para que nenhum período desapareça do relatório.
    const { pares, plantoesSemProcedimento, procedimentosSemPlantao } = casarConsultas(plantoesConsulta, consultas);
    const consultaRows = [
      ...pares.map(({ procedimento }) => linhaDoProcedimento(procedimento)),
      ...procedimentosSemPlantao.map(linhaDoProcedimento),
      ...plantoesSemProcedimento.map(linhaDoPlantao),
    ];
    const summary = summarizeShifts(context, [...estimated.rows, ...actual.rows.map(row => ({ ...row, period: row.period || 'consultas', usar_valor_informado: true })), ...consultaRows], allMonths, surgeries.rows);
    // Cada consulta realizada (por dia e período) para detalhar a quantidade no relatório.
    const chaveDetalhe = (doctorName, hospitalName) => JSON.stringify([normalizeName(doctorName), hospitalKey(hospitalName)]);
    const consultasPorChave = new Map();
    for (const linha of consultaRows) {
      const key = chaveDetalhe(linha.doctor_name, linha.hospital);
      if (!consultasPorChave.has(key)) consultasPorChave.set(key, []);
      consultasPorChave.get(key).push({
        data: isoDate(linha.date),
        periodo: String(linha.shift_type || '').trim(),
        quantidade: Number(linha.quantidade_consultas) || 0,
        valorConsulta: Number(linha.valor_consulta) || 0,
        total: Number(linha.sum_value) || 0,
      });
    }
    const summaryDetalhado = summary.map(item => ({
      ...item,
      consultas: item.period === 'consultas'
        ? (consultasPorChave.get(chaveDetalhe(item.doctorName, item.hospitalName)) || []).sort((a, b) => a.data.localeCompare(b.data))
        : undefined,
    }));
    const views = financialViews(summary);
    const availableMonths = Array.from(new Set(dates.items.map(monthKeyOfDate).filter(Boolean))).sort().reverse();
    return Response.json({ summary: summaryDetalhado, ...views, availableMonths, doctorOptions: options(context.doctors, doctorNames.items, 'full_name', normalizeName), hospitalOptions: options(context.hospitals, hospitalNames.items, 'name', hospitalKey) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}