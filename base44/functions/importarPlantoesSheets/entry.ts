import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { loadPricing, quoteShift, readPages, normalizeName, hospitalKey } from '../../shared/shiftPricing.ts';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSSMUi8NwiPta8Au6fINivc4XmQKQJ_P_u7G-LPzOlA05JO_jYxjSZAxhZa0KvnSg/pub?gid=33289472&single=true&output=csv';

const MESES = {
  JANEIRO: 1, FEVEREIRO: 2, MARCO: 3, ABRIL: 4, MAIO: 5, JUNHO: 6,
  JULHO: 7, AGOSTO: 8, SETEMBRO: 9, OUTUBRO: 10, NOVEMBRO: 11, DEZEMBRO: 12,
};

const semAcentos = (valor) => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const lerCsv = (texto) =>
  texto
    .split(/\r?\n/)
    .filter((linha) => linha.trim().length)
    .map((linha) => linha.split(',').map((campo) => campo.replace(/^"|"$/g, '').trim()));

const tipoDaLinha = (rotulo) => {
  const nome = normalizeName(rotulo);
  if (nome.startsWith('12H DIA')) return { shift_type: 'Diurno', period: '12h' };
  if (nome.includes('PRESENCIAL')) return { shift_type: 'Diurno', period: '6h' };
  if (nome.startsWith('12H NOITE')) return { shift_type: 'Noturno', period: '12h' };
  return null;
};

function extrairPlantoes(linhas) {
  let ano = null;
  let mes = null;
  let dias = [];
  const encontrados = [];

  for (const linha of linhas) {
    const rotulo = (linha[0] || '').trim();

    const mesAno = /^([A-Za-z]+)\s*\/\s*(\d{4})$/.exec(semAcentos(rotulo));
    if (mesAno && MESES[mesAno[1].toUpperCase()]) {
      mes = MESES[mesAno[1].toUpperCase()];
      ano = Number(mesAno[2]);
      continue;
    }

    const colunas = linha.slice(1, 8);
    const numeros = colunas.map((c) => (/^\d{1,2}$/.test(c) ? Number(c) : null));
    const ehLinhaDeDias = numeros.some((n) => n !== null) && colunas.every((c) => c === '' || /^\d{1,2}$/.test(c));
    if (ehLinhaDeDias) {
      dias = numeros;
      continue;
    }

    if (!mes || !ano || !dias.length) continue;
    const tipo = tipoDaLinha(rotulo);
    if (!tipo) continue;

    dias.forEach((dia, indice) => {
      if (!dia) return;
      const celula = colunas[indice] || '';
      if (!normalizeName(celula).includes('CLAUDIO')) return;

      const meioPeriodo = /6\s*H/.test(normalizeName(celula));
      encontrados.push({
        date: `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
        shift_type: tipo.shift_type,
        period: meioPeriodo ? '6h' : tipo.period,
        notes: `Escala Google: ${rotulo}`,
      });
    });
  }

  return encontrados;
}

const dataIso = (valor) => {
  const texto = String(valor || '');
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(texto);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return texto;
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Sessão inválida.' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Apenas administradores podem importar plantões.' }, { status: 403 });

    const { hospital } = await req.json().catch(() => ({}));
    if (typeof hospital !== 'string' || !hospital.trim() || hospital.length > 200) {
      return Response.json({ error: 'Indique o hospital dos plantões.' }, { status: 400 });
    }

    const resposta = await fetch(SHEET_URL, { signal: AbortSignal.timeout(15000) });
    if (!resposta.ok) return Response.json({ error: `Não foi possível ler a planilha (${resposta.status}).` }, { status: 502 });

    const encontrados = extrairPlantoes(lerCsv(await resposta.text()));
    if (!encontrados.length) return Response.json({ error: 'Nenhum plantão do CLAUDIO encontrado na planilha.' }, { status: 400 });

    const contexto = await loadPricing(base44);
    const hospitalNome = contexto.hospitals.find((h) => hospitalKey(h.name) === hospitalKey(hospital))?.name
      || contexto.hospitals.find((h) => hospitalKey(h.name) === 'CSSM')?.name;
    if (!hospitalNome) return Response.json({ error: 'Hospital não encontrado.' }, { status: 400 });

    const medico = contexto.doctors.find((d) => normalizeName(d.full_name) === 'CLAUDIO');

    const chave = (s) => `${dataIso(s.date)}|${s.period || ''}|${normalizeName(s.shift_type)}`;

    const existentes = await readPages(base44.entities.Shift, { doctor_name: 'CLAUDIO' });
    const jaExistem = new Set(existentes.map(chave));

    const novos = [];
    let ignorados = 0;
    for (const plantao of encontrados) {
      const chavePlantao = chave(plantao);
      if (jaExistem.has(chavePlantao)) {
        ignorados += 1;
        continue;
      }
      jaExistem.add(chavePlantao);
      const cotacao = quoteShift(contexto, {
        doctor_id: medico?.id || '',
        hospital: hospitalNome,
        shift_type: plantao.shift_type,
        period: plantao.period,
        usar_valor_informado: false,
      });
      novos.push({
        date: plantao.date,
        doctor_id: medico?.id || '',
        doctor_name: medico?.full_name || 'CLAUDIO',
        hospital: hospitalNome,
        shift_type: plantao.shift_type,
        period: plantao.period,
        value: cotacao.value,
        status: 'Realizado',
        notes: plantao.notes,
      });
    }

    if (novos.length) await base44.entities.Shift.bulkCreate(novos);

    return Response.json({
      hospital: hospitalNome,
      encontrados: encontrados.length,
      criados: novos.length,
      ignorados,
      plantoes: novos.map((p) => ({ date: p.date, shift_type: p.shift_type, period: p.period, value: p.value })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}