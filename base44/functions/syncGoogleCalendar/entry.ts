import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const TZ = 'America/Sao_Paulo';
const CONECTOR = 'googlecalendar';
const CALENDARIO = 'primary';
const API = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDARIO)}/events`;

const normalizar = (valor) =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

const dataNoFuso = (deslocamentoDias = 0) => {
  const alvo = new Date(Date.now() + deslocamentoDias * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(alvo);
};

const somarMinutos = (data, minutos) => {
  const [ano, mes, dia] = String(data).split('-').map(Number);
  const instante = new Date(Date.UTC(ano, mes - 1, dia));
  instante.setUTCMinutes(instante.getUTCMinutes() + minutos);
  return instante.toISOString().slice(0, 19);
};

const JANELAS_POR_TIPO = [
  { chave: (t) => t.includes('24H'), janela: [420, 1860] },
  { chave: (t) => t.includes('DIURN') && t.includes('MANHA'), janela: [420, 780] },
  { chave: (t) => t.includes('DIURN') && t.includes('TARDE'), janela: [780, 1140] },
  { chave: (t) => t.includes('NOTURN') || t.includes('NOITE'), janela: [1140, 1860] },
  { chave: (t) => t.includes('DIURN'), janela: [420, 1140] },
];

const JANELAS_POR_PERIODO = {
  '24H': [420, 1860],
  '12H': [420, 1140],
  '6H': [420, 780],
};

const janelaDoPlantao = (shift) => {
  const tipo = normalizar(shift.shift_type);
  const porTipo = JANELAS_POR_TIPO.find((item) => item.chave(tipo));
  if (porTipo) return porTipo.janela;
  const porPeriodo = JANELAS_POR_PERIODO[normalizar(shift.period)];
  if (porPeriodo) return porPeriodo;
  const horas = Number(String(shift.period || '').replace(/[^0-9]/g, ''));
  if (horas > 0 && horas <= 24) return [420, 420 + horas * 60];
  return [420, 1140];
};

const lembrar = () => ({
  useDefault: false,
  overrides: [
    { method: 'popup', minutes: 1440 },
    { method: 'popup', minutes: 60 },
  ],
});

const eventoDoPlantao = (shift) => {
  const [inicio, fim] = janelaDoPlantao(shift);
  const descricao = [
    shift.doctor_name ? `Médico: ${shift.doctor_name}` : null,
    shift.hospital ? `Hospital: ${shift.hospital}` : null,
    shift.shift_type ? `Tipo: ${shift.shift_type}` : null,
    shift.period ? `Período: ${shift.period}` : null,
    shift.notes ? `Observações: ${shift.notes}` : null,
    'Sincronizado pelo PlantPal',
  ].filter(Boolean);

  return {
    summary: `Plantão · ${shift.hospital || 'Hospital'}`,
    location: shift.hospital || undefined,
    description: descricao.join('\n'),
    start: { dateTime: somarMinutos(shift.date, inicio), timeZone: TZ },
    end: { dateTime: somarMinutos(shift.date, fim), timeZone: TZ },
    reminders: lembrar(),
  };
};

const eventoDaCirurgia = (cirurgia) => {
  const descricao = [
    cirurgia.paciente ? `Paciente: ${cirurgia.paciente}` : null,
    cirurgia.hospital_name ? `Hospital: ${cirurgia.hospital_name}` : null,
    cirurgia.descricao ? `Procedimento: ${cirurgia.descricao}` : null,
    cirurgia.tipo_pagamento ? `Pagamento: ${cirurgia.tipo_pagamento}` : null,
    cirurgia.observacoes ? `Observações: ${cirurgia.observacoes}` : null,
    'Sincronizado pelo PlantPal',
  ].filter(Boolean);

  return {
    summary: `Cirurgia · ${cirurgia.hospital_name || 'Hospital'}`,
    location: cirurgia.hospital_name || undefined,
    description: descricao.join('\n'),
    start: { date: cirurgia.data },
    end: { date: somarMinutos(cirurgia.data, 1440).slice(0, 10) },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 1440 },
        { method: 'popup', minutes: 120 },
      ],
    },
  };
};

const listar = async (base44, entidade, filtro, limite = 500) => {
  const resultado = await base44.asServiceRole.entities[entidade].filter(filtro, { limit: limite });
  return Array.isArray(resultado) ? resultado : resultado.items || [];
};

const salvarEvento = async (accessToken, eventoId, corpo) => {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  if (eventoId) {
    const resposta = await fetch(`${API}/${eventoId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(corpo),
    });
    if (resposta.ok) {
      const dados = await resposta.json();
      return { id: dados.id, criado: false };
    }
    if (resposta.status !== 404 && resposta.status !== 410) {
      throw new Error(`Google Calendar respondeu ${resposta.status}`);
    }
  }

  const resposta = await fetch(API, {
    method: 'POST',
    headers,
    body: JSON.stringify(corpo),
  });
  if (!resposta.ok) throw new Error(`Google Calendar respondeu ${resposta.status}`);
  const dados = await resposta.json();
  return { id: dados.id, criado: true };
};

const removerEvento = async (accessToken, eventoId) => {
  if (!eventoId) return;
  await fetch(`${API}/${eventoId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => null);
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let accessToken = null;
    try {
      const conexao = await base44.asServiceRole.connectors.getConnection(CONECTOR);
      accessToken = conexao?.accessToken || null;
    } catch {
      accessToken = null;
    }
    if (!accessToken) {
      return Response.json(
        { connected: false, needs_connection: true, error: 'Google Calendar não conectado' },
        { status: 409 }
      );
    }

    const inicio = dataNoFuso(-30);
    const fim = dataNoFuso(240);

    const [shifts, cirurgias, vinculos] = await Promise.all([
      listar(base44, 'Shift', { date: { $gte: inicio, $lte: fim } }),
      listar(base44, 'Procedimento', { tipo: 'Cirurgia', data: { $gte: inicio, $lte: fim } }),
      listar(base44, 'CalendarSync', {}, 1000),
    ]);

    const mapa = new Map(vinculos.map((v) => [`${v.record_type}:${v.record_id}`, v]));

    const gravarVinculo = async (tipo, recordId, eventoId, data) => {
      const chave = `${tipo}:${recordId}`;
      const vinculo = mapa.get(chave);
      if (vinculo) {
        await base44.asServiceRole.entities.CalendarSync.update(vinculo.id, {
          google_event_id: eventoId,
          event_date: data,
        });
      } else {
        const criado = await base44.asServiceRole.entities.CalendarSync.create({
          record_type: tipo,
          record_id: recordId,
          google_event_id: eventoId,
          event_date: data,
        });
        mapa.set(chave, criado);
      }
    };

    const contadoresPlantoes = { created: 0, updated: 0, removed: 0 };
    const contadoresCirurgias = { created: 0, updated: 0, removed: 0 };

    for (const shift of shifts) {
      if (!shift.date) continue;
      const vinculo = mapa.get(`Shift:${shift.id}`);

      if (shift.status === 'Cancelado') {
        if (vinculo) {
          await removerEvento(accessToken, vinculo.google_event_id);
          await base44.asServiceRole.entities.CalendarSync.delete(vinculo.id);
          mapa.delete(`Shift:${shift.id}`);
          contadoresPlantoes.removed += 1;
        }
        continue;
      }

      const evento = await salvarEvento(accessToken, vinculo?.google_event_id, eventoDoPlantao(shift));
      await gravarVinculo('Shift', shift.id, evento.id, shift.date);
      if (evento.criado) contadoresPlantoes.created += 1;
      else contadoresPlantoes.updated += 1;
    }

    for (const cirurgia of cirurgias) {
      if (!cirurgia.data) continue;
      const vinculo = mapa.get(`Procedimento:${cirurgia.id}`);
      const evento = await salvarEvento(accessToken, vinculo?.google_event_id, eventoDaCirurgia(cirurgia));
      await gravarVinculo('Procedimento', cirurgia.id, evento.id, cirurgia.data);
      if (evento.criado) contadoresCirurgias.created += 1;
      else contadoresCirurgias.updated += 1;
    }

    const ativos = new Set([
      ...shifts.map((shift) => `Shift:${shift.id}`),
      ...cirurgias.map((cirurgia) => `Procedimento:${cirurgia.id}`),
    ]);

    for (const vinculo of mapa.values()) {
      const data = vinculo.event_date || '';
      if (data < inicio || data > fim) continue;
      if (ativos.has(`${vinculo.record_type}:${vinculo.record_id}`)) continue;
      await removerEvento(accessToken, vinculo.google_event_id);
      await base44.asServiceRole.entities.CalendarSync.delete(vinculo.id);
      if (vinculo.record_type === 'Shift') contadoresPlantoes.removed += 1;
      else contadoresCirurgias.removed += 1;
    }

    return Response.json({
      connected: true,
      shifts: contadoresPlantoes,
      surgeries: contadoresCirurgias,
      synced_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}