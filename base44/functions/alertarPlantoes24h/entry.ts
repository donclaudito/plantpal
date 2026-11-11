import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { inicioDoPlantao, horaLocal, dataLocal, FUSO } from '../../shared/shiftWindows.ts';

// Verifica, de hora a hora, quais os plantões que começam nas próximas 24 horas
// e envia o aviso por WhatsApp. A janela [23h, 24h) garante um único aviso por plantão.

const ANTECEDENCIA_HORAS = 24;
const API_WHATSAPP = 'https://graph.facebook.com/v20.0';

const itens = async (base44: any, entidade: string, filtro: any, limite = 300) => {
  const resultado = await base44.asServiceRole.entities[entidade].filter(filtro, { limit: limite });
  return Array.isArray(resultado) ? resultado : resultado.items || [];
};

const dataNoFuso = (deslocamentoDias: number) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() + deslocamentoDias * 86400000));

const textoDoPlantao = (shift: any, inicio: Date) =>
  `• ${dataLocal(inicio)} às ${horaLocal(inicio)} — ${shift.hospital || 'Hospital'}` +
  `${shift.shift_type ? ` (${shift.shift_type})` : ''}` +
  `${shift.doctor_name ? ` · ${shift.doctor_name}` : ''}`;

const enviarWhatsApp = async (texto: string) => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const destino = process.env.WHATSAPP_NUMERO_DESTINO;

  if (!token || !phoneId || !destino) {
    return { success: false, motivo: 'WhatsApp ainda não configurado' };
  }

  const resposta = await fetch(`${API_WHATSAPP}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: destino,
      type: 'text',
      text: { body: texto },
    }),
  });

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    return { success: false, motivo: dados?.error?.message || `WhatsApp respondeu ${resposta.status}` };
  }
  return { success: true, id: dados?.messages?.[0]?.id };
};

export default async function (req: any) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth
      .me()
      .catch((e: any) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const corpo = await req.json().catch(() => ({}));
    const simular = corpo?.dry_run === true;

    const candidatos = await itens(base44, 'Shift', {
      date: { $gte: dataNoFuso(0), $lte: dataNoFuso(2) },
    });

    const agora = Date.now();
    const limiteMinimo = agora + (ANTECEDENCIA_HORAS - 1) * 3600000;
    const limiteMaximo = agora + ANTECEDENCIA_HORAS * 3600000;

    const alerts = candidatos
      .filter((shift: any) => shift.status !== 'Cancelado')
      .map((shift: any) => ({ shift, inicio: inicioDoPlantao(shift) }))
      .filter(({ inicio }: any) => {
        if (!inicio) return false;
        const instante = inicio.getTime();
        return instante > limiteMinimo && instante <= limiteMaximo;
      })
      .map(({ shift, inicio }: any) => ({
        shift_id: shift.id,
        hospital: shift.hospital,
        doctor_name: shift.doctor_name,
        shift_type: shift.shift_type,
        inicia_em: inicio.toISOString(),
        texto: textoDoPlantao(shift, inicio),
      }));

    const resumo = { antecedencia_horas: ANTECEDENCIA_HORAS, alerts };

    if (simular) return Response.json({ ...resumo, simulado: true });
    if (alerts.length === 0) return Response.json({ ...resumo, avisos: 0 });

    const texto = [
      '*Plantões nas próximas 24 horas*',
      ...alerts.map((item: any) => item.texto),
    ].join('\n');

    const whatsapp = await enviarWhatsApp(texto);
    return Response.json({ ...resumo, avisos: whatsapp.success ? alerts.length : 0, whatsapp });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}