import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { loadPricing, readDistinct, quoteShift, resolveParties, hospitalKey, normalizeName, money } from '../../shared/shiftPricing.ts';

export default async function(req) {
  try {
    const client = createClientFromRequest(req);
    const user = await client.auth.me().catch(e => e.status === 401 ? null : Promise.reject(e));
    if (!user) return Response.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Somente administradores podem sincronizar os valores.' }, { status: 403 });
    const { configId } = await req.json().catch(() => ({}));
    if (typeof configId !== 'string' || !/^[a-f0-9]{24}$/.test(configId)) return Response.json({ error: 'Configuração inválida.' }, { status: 400 });
    const context = await loadPricing(client);
    const config = context.rates.find(c => c.id === configId);
    if (!config) return Response.json({ error: 'Configuração não encontrada.' }, { status: 404 });
    const query = { status: 'Realizado' };
    if (config.hospital_id) {
      const hospital = context.hospitals.find(h => h.id === config.hospital_id);
      if (!hospital) return Response.json({ error: 'Hospital da configuração não encontrado.' }, { status: 400 });
      const { items: names } = await readDistinct(client.entities.Shift, 'hospital');
      query.hospital = { $in: names.filter(name => hospitalKey(name) === hospitalKey(hospital.name)) };
    }
    if (config.doctor_id) {
      const doctor = context.doctors.find(d => d.id === config.doctor_id);
      const { items: names } = await readDistinct(client.entities.Shift, 'doctor_name');
      query.$or = [{ doctor_id: config.doctor_id }, { doctor_name: { $in: names.filter(name => doctor && normalizeName(name) === normalizeName(doctor.full_name)) } }];
    }
    let cursor;
    let updated = 0;
    do {
      const page = await client.entities.Shift.filter(query, { sort: 'created_date', limit: 200, cursor });
      const changes = [];
      for (const shift of page.items) {
        if (shift.usar_valor_informado === true) continue;
        const parties = resolveParties(context, shift);
        if ((config.doctor_id && parties.doctorId !== config.doctor_id) || (config.hospital_id && parties.hospitalId !== config.hospital_id)) continue;
        const quote = quoteShift(context, shift);
        const period = quote.billingMode === 'por_periodo' ? 'consultas' : shift.period;
        if (quote.configured && (money(shift.value) !== quote.value || period !== shift.period)) changes.push({ id: shift.id, value: quote.value, period });
      }
      if (changes.length) {
        await client.entities.Shift.bulkUpdate(changes);
        updated += changes.length;
      }
      cursor = page.has_more ? page.next_cursor : null;
    } while (cursor);
    return Response.json({ updated, message: 'Valores por período sincronizados. Plantões pagos e valores reais informados foram preservados.' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}