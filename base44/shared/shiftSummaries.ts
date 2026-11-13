import { quoteShift, quoteSurgeries, appliesTo, hospitalKey, normalizeName, money, twelveHourWeight } from './shiftPricing.ts';

export function monthKeyOfDate(date) {
  const value = String(date || '');
  if (/^[0-9]{4}-[0-9]{2}/.test(value)) return value.slice(0, 7);
  const parts = value.split('/');
  return parts.length === 3 ? `${parts[2]}-${parts[1]}` : '';
}

export function summarizeShifts(context, rows, allMonths, surgeryRows = []) {
  const grouped = new Map();
  const fixedApplied = new Set();
  for (const row of surgeryRows) {
    const quote = quoteSurgeries(context, { doctor_name: row.doctor_name, hospital: row.hospital_name });
    if (!quote) continue;
    const monthKey = allMonths ? monthKeyOfDate(row.data) : '';
    const key = JSON.stringify([quote.doctorId || normalizeName(row.doctor_name), quote.hospitalId || hospitalKey(row.hospital_name), 'cirurgias', monthKey]);
    if (!grouped.has(key)) grouped.set(key, { doctorId: quote.doctorId, hospitalId: quote.hospitalId, doctorName: quote.doctorName, hospitalName: quote.hospitalName, period: 'cirurgias', monthKey, quantity: 0, grossValue: 0, discountValue: 0, netValue: 0, discountDetails: [] });
    const item = grouped.get(key);
    item.quantity += row.count;
    item.grossValue += money(quote.baseValue * row.count);
    item.discountValue += money(quote.discountValue * row.count);
    for (const detail of quote.details) {
      const existing = item.discountDetails.find(d => d.descricao === detail.descricao && d.tipo === detail.tipo && d.valor_config === detail.valor_config);
      if (existing) existing.valor_calculado = money(existing.valor_calculado + detail.valor_calculado * row.count);
      else item.discountDetails.push({ ...detail, valor_calculado: money(detail.valor_calculado * row.count) });
    }
  }
  for (const row of rows) {
    const quote = quoteShift(context, { ...row, value: 0 });
    const multiplier = row.count;
    const period = quote.billingMode === 'por_periodo' ? 'consultas' : row.period || '12h';
    const monthKey = allMonths ? monthKeyOfDate(row.date) : '';
    const key = JSON.stringify([quote.doctorId || normalizeName(row.doctor_name), quote.hospitalId || hospitalKey(row.hospital), period, monthKey]);
    if (!grouped.has(key)) grouped.set(key, { doctorId: quote.doctorId, hospitalId: quote.hospitalId, doctorName: quote.doctorName, hospitalName: quote.hospitalName, period, monthKey, quantity: 0, grossValue: 0, discountValue: 0, netValue: 0, discountDetails: [] });
    const item = grouped.get(key);
    item.quantity = money(item.quantity + row.count * twelveHourWeight(period));
    item.grossValue += quote.configured || quote.manual ? money(quote.baseValue * multiplier) : money(row.sum_value);
    item.discountValue += money(quote.discountValue * multiplier);
    for (const detail of quote.details) {
      const existing = item.discountDetails.find(d => d.descricao === detail.descricao && d.tipo === detail.tipo && d.valor_config === detail.valor_config);
      if (existing) existing.valor_calculado = money(existing.valor_calculado + detail.valor_calculado * multiplier);
      else item.discountDetails.push({ ...detail, valor_calculado: money(detail.valor_calculado * multiplier) });
    }
  }
  const summary = Array.from(grouped.values());
  for (const item of summary) {
    const key = JSON.stringify([item.doctorId || normalizeName(item.doctorName), item.hospitalId || hospitalKey(item.hospitalName), item.monthKey]);
    if (!fixedApplied.has(key)) {
      fixedApplied.add(key);
      for (const d of context.discounts.filter(d => d.tipo_desconto === 'valor_fixo' && appliesTo(d, item.doctorId, item.hospitalId, item.hospitalName, context))) {
        item.discountValue += Number(d.valor_desconto) || 0;
        item.discountDetails.push({ descricao: d.descricao, tipo: d.tipo_desconto, valor_config: d.valor_desconto, valor_calculado: d.valor_desconto });
      }
    }
    item.quantity = money(item.quantity);
    item.grossValue = money(item.grossValue);
    item.discountValue = money(item.discountValue);
    item.netValue = money(item.grossValue - item.discountValue);
  }
  return summary;
}

export function financialViews(summary) {
  const hospitals = new Map(), doctors = new Map(), pairs = new Map();
  const totals = { quantity: 0, grossValue: 0, discountValue: 0, netValue: 0 };
  const empty = () => ({ numPlantoes: 0, valorBruto: 0, valorDescontos: 0, valorLiquido: 0 });
  const add = (target, item) => {
    target.numPlantoes += item.quantity;
    target.valorBruto = money(target.valorBruto + item.grossValue);
    target.valorDescontos = money(target.valorDescontos + item.discountValue);
    target.valorLiquido = money(target.valorLiquido + item.netValue);
  };
  for (const item of summary) {
    totals.quantity += item.quantity;
    for (const field of ['grossValue', 'discountValue', 'netValue']) totals[field] = money(totals[field] + item[field]);
    const hk = item.hospitalId || hospitalKey(item.hospitalName), dk = item.doctorId || normalizeName(item.doctorName);
    if (!hospitals.has(hk)) hospitals.set(hk, { ...empty(), name: item.hospitalName, members: new Set() });
    if (!doctors.has(dk)) doctors.set(dk, { ...empty(), name: item.doctorName, members: new Set() });
    const h = hospitals.get(hk), d = doctors.get(dk);
    h.members.add(dk); d.members.add(hk); add(h, item); add(d, item);
    const pk = JSON.stringify([dk, hk, item.monthKey]);
    if (!pairs.has(pk)) {
      const [year, month] = item.monthKey ? item.monthKey.split('-').map(Number) : [0, 0];
      const mesDeposito = month ? `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}` : '';
      pairs.set(pk, { ...empty(), doctor: item.doctorName, hospital: item.hospitalName, doctorId: item.doctorId, doctorName: item.doctorName, hospitalId: item.hospitalId, hospitalName: item.hospitalName, mesCompetencia: item.monthKey, mesDeposito, descontosDetalhados: [] });
    }
    const pair = pairs.get(pk); add(pair, item);
    for (const detail of item.discountDetails) {
      const previous = pair.descontosDetalhados.find(d => d.descricao === detail.descricao && d.tipo === detail.tipo && d.valor_config === detail.valor_config);
      if (previous) previous.valor_calculado = money(previous.valor_calculado + detail.valor_calculado);
      else pair.descontosDetalhados.push({ ...detail });
    }
  }
  return { totals, deposits: Array.from(pairs.values()), reports: { totals: { bruto: totals.grossValue, descontos: totals.discountValue, liquido: totals.netValue, numShifts: totals.quantity }, byHospital: Array.from(hospitals.values(), ({ members, ...h }) => ({ ...h, doctorCount: members.size })), byDoctor: Array.from(doctors.values(), ({ members, ...d }) => ({ ...d, hospitalCount: members.size })), byDoctorHospital: Array.from(pairs.values()) } };
}