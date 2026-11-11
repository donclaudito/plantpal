// Horário real de cada plantão, a partir do tipo e do período registados.

export const FUSO = 'America/Sao_Paulo';
const DESLOCAMENTO_MS = -3 * 60 * 60 * 1000; // Brasília, sem horário de verão

export const normalizar = (valor: any) =>
  (valor || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

// Horário escrito no próprio tipo: "ESPECIAL(DAS10 AS 22)" ou "DAS 8 AS 14"
const janelaExplicita = (tipo: string) => {
  const achado = tipo.match(/DAS?\s*(\d{1,2})\s*(?:H(?:S|ORAS)?)?\s*(?:AS|A|ATE)\s*(\d{1,2})/);
  if (!achado) return null;
  const inicio = Number(achado[1]);
  let fim = Number(achado[2]);
  if (!Number.isFinite(inicio) || !Number.isFinite(fim) || inicio > 23 || fim > 24) return null;
  if (fim <= inicio) fim += 24;
  return [inicio * 60, fim * 60];
};

const JANELAS_POR_TIPO = [
  { chave: (t: string) => t.includes('24H'), janela: [420, 1860] },
  { chave: (t: string) => t.includes('DIURN') && t.includes('MANHA'), janela: [420, 780] },
  { chave: (t: string) => t.includes('DIURN') && t.includes('TARDE'), janela: [780, 1140] },
  { chave: (t: string) => t.includes('NOTURNO') || t.includes('NOTURN') || t.includes('NOITE'), janela: [1140, 1860] },
  { chave: (t: string) => t.includes('DIURN'), janela: [420, 1140] },
];

const JANELAS_POR_PERIODO: Record<string, number[]> = {
  '24H': [420, 1860],
  '12H': [420, 1140],
  '6H': [420, 780],
};

export const janelaDoPlantao = (shift: any): number[] => {
  const tipo = normalizar(shift?.shift_type);
  const explicita = janelaExplicita(tipo);
  if (explicita) return explicita;
  const porTipo = JANELAS_POR_TIPO.find((item) => item.chave(tipo));
  if (porTipo) return porTipo.janela;
  const porPeriodo = JANELAS_POR_PERIODO[normalizar(shift?.period)];
  if (porPeriodo) return porPeriodo;
  const horas = Number(String(shift?.period || '').replace(/[^0-9]/g, ''));
  if (horas > 0 && horas <= 24) return [420, 420 + horas * 60];
  return [420, 1140];
};

// Instante de início do plantão (UTC), considerando o fuso de Brasília
export const inicioDoPlantao = (shift: any): Date | null => {
  const partes = String(shift?.date || '').split('-').map(Number);
  if (partes.length !== 3 || !partes[0] || !partes[1] || !partes[2]) return null;
  const [ano, mes, dia] = partes;
  const minutos = janelaDoPlantao(shift)[0];
  return new Date(Date.UTC(ano, mes - 1, dia, 0, minutos) - DESLOCAMENTO_MS);
};

export const horaLocal = (instante: Date): string =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO,
    hour: '2-digit',
    minute: '2-digit',
  }).format(instante);

export const dataLocal = (instante: Date): string =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO,
    day: '2-digit',
    month: '2-digit',
  }).format(instante);