import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const TZ = 'America/Sao_Paulo';

const dataNoFuso = (deslocamentoDias = 0) => {
  const alvo = new Date(Date.now() + deslocamentoDias * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(alvo);
};

const formatarData = (iso) => {
  const partes = String(iso || '').split('-');
  return partes.length === 3 ? `${partes[2]}/${partes[1]}` : String(iso || '');
};

const itensDaConsulta = async (base44, entidade, filtro) => {
  const resultado = await base44.asServiceRole.entities[entidade].filter(filtro, { limit: 200 });
  return Array.isArray(resultado) ? resultado : resultado.items || [];
};

const descreverPlantoes = (shifts) => {
  if (!shifts.length) return 'Sem plantões marcados';
  return shifts
    .map((shift) => `${shift.hospital || 'Hospital'} - ${shift.shift_type || 'Plantão'}`)
    .join('  |  ');
};

const descreverCirurgias = (cirurgias) => {
  if (!cirurgias.length) return 'Sem cirurgias marcadas';
  return cirurgias
    .map((cirurgia) => `${cirurgia.hospital_name || 'Hospital'}${cirurgia.paciente ? ` - ${cirurgia.paciente}` : ''}`)
    .join('  |  ');
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const corpo = await req.json().catch(() => ({}));
    const simular = corpo?.dry_run === true;

    const hoje = dataNoFuso(0);
    const amanha = dataNoFuso(1);

    const [shiftsHoje, shiftsAmanha, cirurgiasHoje, cirurgiasAmanha, usuarios] = await Promise.all([
      itensDaConsulta(base44, 'Shift', { date: hoje }),
      itensDaConsulta(base44, 'Shift', { date: amanha }),
      itensDaConsulta(base44, 'Procedimento', { tipo: 'Cirurgia', data: hoje }),
      itensDaConsulta(base44, 'Procedimento', { tipo: 'Cirurgia', data: amanha }),
      base44.asServiceRole.entities.User.list(),
    ]);

    const totalHoje = shiftsHoje.length + cirurgiasHoje.length;
    const totalAmanha = shiftsAmanha.length + cirurgiasAmanha.length;

    const resumo = { hoje, amanha, totalHoje, totalAmanha };

    if (simular) return Response.json({ ...resumo, sent: 0, simulado: true });
    if (totalHoje === 0 && totalAmanha === 0) {
      return Response.json({ ...resumo, sent: 0, motivo: 'Sem compromissos hoje nem amanhã' });
    }

    const destinatarios = (usuarios || []).filter((item) => item?.email);
    let enviados = 0;
    const falhas = [];

    for (const destinatario of destinatarios) {
      const resposta = await base44.asServiceRole.integrations.Core.SendEmail({
        to: destinatario.email,
        template_name: 'LembreteAgenda',
        category: 'transactional',
        variables: {
          primeiro_nome: destinatario.full_name ? destinatario.full_name.split(' ')[0] : 'Doutor(a)',
          data_hoje: formatarData(hoje),
          data_amanha: formatarData(amanha),
          hoje_plantoes: descreverPlantoes(shiftsHoje),
          hoje_cirurgias: descreverCirurgias(cirurgiasHoje),
          amanha_plantoes: descreverPlantoes(shiftsAmanha),
          amanha_cirurgias: descreverCirurgias(cirurgiasAmanha),
          total_hoje: `${totalHoje} compromisso(s) hoje`,
          total_amanha: `${totalAmanha} compromisso(s) amanhã`,
        },
      });
      if (resposta?.success === false) {
        falhas.push({ email: destinatario.email, motivo: resposta.reason || resposta.message });
      } else {
        enviados += 1;
      }
    }

    return Response.json({ ...resumo, sent: enviados, falhas });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}