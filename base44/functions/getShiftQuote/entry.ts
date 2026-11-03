import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { loadPricing, quoteShift } from '../../shared/shiftPricing.ts';

export default async function(req) {
  try {
    const client = createClientFromRequest(req);
    const user = await client.auth.me().catch(e => e.status === 401 ? null : Promise.reject(e));
    if (!user) return Response.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    const { doctorId, hospital, period } = await req.json().catch(() => ({}));
    if (typeof doctorId !== 'string' || doctorId.length > 100 || typeof hospital !== 'string' || !hospital.trim() || hospital.length > 200 || !['1h','2h','3h','4h','5h','6h','12h','24h','retaguarda','mais tarde','coordenador','professor'].includes(period)) {
      return Response.json({ error: 'Informe médico, hospital e período válidos.' }, { status: 400 });
    }
    const context = await loadPricing(client);
    return Response.json(quoteShift(context, { doctor_id: doctorId, hospital, period }));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}