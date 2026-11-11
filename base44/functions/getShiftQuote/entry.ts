import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { loadPricing, quoteShift } from '../../shared/shiftPricing.ts';

export default async function(req) {
  try {
    const client = createClientFromRequest(req);
    const user = await client.auth.me().catch(e => e.status === 401 ? null : Promise.reject(e));
    if (!user) return Response.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    const { doctorId, hospital, period, grossValue = null, shiftType = '', quantity = 0, valorConsulta = 0 } = await req.json().catch(() => ({}));
    const validPeriods = ['consultas','1h','2h','3h','4h','5h','6h','12h','24h','retaguarda','mais tarde','coordenador','professor'];
    if (typeof doctorId !== 'string' || doctorId.length > 100 || typeof hospital !== 'string' || !hospital.trim() || hospital.length > 200 || !validPeriods.includes(period) || (grossValue !== null && (!Number.isFinite(grossValue) || grossValue < 0 || grossValue > 100000000)) || typeof shiftType !== 'string' || shiftType.length > 100 || !Number.isFinite(Number(quantity)) || Number(quantity) < 0 || Number(quantity) > 10000 || !Number.isFinite(Number(valorConsulta)) || Number(valorConsulta) < 0 || Number(valorConsulta) > 1000000) {
      return Response.json({ error: 'Informe médico, hospital e período válidos.' }, { status: 400 });
    }
    const context = await loadPricing(client);
    return Response.json(quoteShift(context, {
      doctor_id: doctorId,
      hospital,
      shift_type: shiftType,
      period,
      usar_valor_informado: grossValue !== null,
      valor_bruto_informado: grossValue,
      quantidade_consultas: Number(quantity) || 0,
      valor_consulta: Number(valorConsulta) || 0,
    }));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}