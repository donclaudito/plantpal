import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  especialidadeDe,
  formatarData,
  montarRecibo,
  nomeMedicoDe,
  normalizarNome,
  paraBase64,
} from '../../shared/reciboProcedimento.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Sessão inválida.' }, { status: 401 });

    const { procedimento_id } = await req.json().catch(() => ({}));
    if (!procedimento_id) return Response.json({ error: 'Procedimento não indicado.' }, { status: 400 });

    const procedimento = await base44.entities.Procedimento
      .get(procedimento_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!procedimento) return Response.json({ error: 'Procedimento não encontrado.' }, { status: 404 });

    const { items: hospitais } = await base44.entities.Hospital.filter({}, { limit: 200 });
    const hospital = hospitais.find((h) => h.id === procedimento.hospital_id)
      || hospitais.find((h) => normalizarNome(h.name) === normalizarNome(procedimento.hospital_name))
      || null;

    const { items: medicos } = await base44.entities.Doctor.filter({}, { limit: 200 });
    const nomeMedico = nomeMedicoDe(procedimento, medicos);
    const especialidade = especialidadeDe(procedimento, medicos);

    const emitidoEm = formatarData(new Date().toISOString());
    const pdf = new Uint8Array(
      montarRecibo({ ...procedimento, doctor_name: nomeMedico, especialidade }, hospital, emitidoEm)
    );

    return Response.json({
      pdf_base64: paraBase64(pdf),
      nome: `recibo-${String(procedimento.id || '').slice(-8).toLowerCase()}.pdf`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}