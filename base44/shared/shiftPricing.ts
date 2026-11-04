export const normalizeName = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
const HOSPITAL_ALIASES = {
  'AMBULATORIO': 'AMBULATORIO CONVENIO',
  'AMBULATORIO CONV': 'AMBULATORIO CONVENIO',
  'AMBULATORIO CONVENIO': 'AMBULATORIO CONVENIO',
};
export const hospitalKey = (value) => {
  const name = normalizeName(value);
  return HOSPITAL_ALIASES[name] || name;
};
export const money = (value) => Math.round((Number(value) || 0) * 100) / 100;
export async function readPages(entity, query = {}, sort = '-updated_date') {
  const records = [];
  let cursor;
  do {
    const page = await entity.filter(query, { sort, limit: 200, cursor });
    records.push(...page.items);
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return records;
}
export async function readDistinct(entity, field) {
  const items = [];
  let cursor;
  do {
    const page = await entity.list({ distinct: field, limit: 200, cursor });
    items.push(...page.items);
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return { items };
}
export async function loadPricing(client) {
  const [rates, discounts, doctors, hospitals] = await Promise.all([
    readPages(client.entities.ConfiguracaoPlantao), readPages(client.entities.ConfiguracaoDesconto),
    readPages(client.entities.Doctor, {}, 'full_name'), readPages(client.entities.Hospital, {}, 'name')
  ]);
  return { rates, discounts, doctors, hospitals };
}
export function resolveParties(context, shift) {
  const doctor = context.doctors.find(d => d.id === shift.doctor_id) || context.doctors.find(d => normalizeName(d.full_name) === normalizeName(shift.doctor_name));
  const hospital = context.hospitals.find(h => h.id === shift.hospital_id) || context.hospitals.find(h => hospitalKey(h.name) === hospitalKey(shift.hospital));
  return { doctorId: doctor?.id || shift.doctor_id || '', hospitalId: hospital?.id || '', doctorName: doctor?.full_name || shift.doctor_name, hospitalName: hospital?.name || shift.hospital };
}
export const appliesTo = (config, doctorId, hospitalId) => (!config.doctor_id || config.doctor_id === doctorId) && (!config.hospital_id || config.hospital_id === hospitalId);
export function periodValue(config, period) {
  if (config.tipo_calculo === 'por_periodo') return money(config.valor_periodo);
  const field = { '6h': 'valor_6h', '12h': 'valor_12h', 'mais tarde': 'valor_12h', retaguarda: 'valor_retaguarda', coordenador: 'valor_coordenador', professor: 'valor_professor' }[String(period || '12h').trim().toLowerCase()];
  return field ? money(config[field]) : 0;
}
export function quoteShift(context, shift) {
  const parties = resolveParties(context, shift);
  const candidates = context.rates.filter(c => appliesTo(c, parties.doctorId, parties.hospitalId)).sort((a, b) => {
    const score = c => (c.doctor_id ? 2 : 0) + (c.hospital_id ? (c.tipo_calculo === 'por_periodo' ? 4 : 1) : 0);
    return score(b) - score(a) || String(b.updated_date).localeCompare(String(a.updated_date));
  });
  const rate = candidates.find(c => c.tipo_calculo === 'por_periodo' || periodValue(c, shift.period) > 0);
  const manual = shift.usar_valor_informado === true && Number.isFinite(shift.valor_bruto_informado) && shift.valor_bruto_informado >= 0;
  const baseValue = manual ? money(shift.valor_bruto_informado) : rate ? periodValue(rate, shift.period) : money(shift.value);
  const details = rate || manual ? context.discounts.filter(d => d.tipo_desconto === 'percentual' && appliesTo(d, parties.doctorId, parties.hospitalId)).map(d => ({ descricao: d.descricao, tipo: d.tipo_desconto, valor_config: d.valor_desconto, valor_calculado: money(baseValue * d.valor_desconto / 100) })) : [];
  const discountValue = money(details.reduce((total, d) => total + d.valor_calculado, 0));
  return { ...parties, configured: !!rate, manual, billingMode: rate?.tipo_calculo || 'por_plantao', configurationId: rate?.id || null, estimatedBaseValue: rate ? periodValue(rate, shift.period) : 0, baseValue, discountValue, value: money(Math.max(0, baseValue - discountValue)), details };
}