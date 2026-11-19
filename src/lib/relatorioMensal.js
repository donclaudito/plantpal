import { monthKeyFromDate } from '@/lib/dateKeys';
import { procedimentoTotal } from '@/lib/procedimentoTotals';

const centavos = (valor) => Math.round((Number(valor) || 0) * 100) / 100;

/**
 * Soma plantões e cirurgias de cada mês, já com os filtros aplicados pela página.
 */
export const resumirPorMes = ({ shifts = [], procedimentos = [] } = {}) => {
  const mapa = new Map();

  const linha = (mes) => {
    if (!mapa.has(mes)) {
      mapa.set(mes, { mes, plantoes: 0, valorPlantoes: 0, cirurgias: 0, valorCirurgias: 0 });
    }
    return mapa.get(mes);
  };

  shifts.forEach((shift) => {
    const mes = monthKeyFromDate(shift.date);
    if (!mes) return;
    const row = linha(mes);
    row.plantoes += 1;
    row.valorPlantoes += Number(shift.value) || 0;
  });

  procedimentos.forEach((procedimento) => {
    const mes = monthKeyFromDate(procedimento.data);
    if (!mes) return;
    const row = linha(mes);
    row.cirurgias += 1;
    row.valorCirurgias += procedimentoTotal(procedimento);
  });

  const rows = Array.from(mapa.values())
    .map((row) => ({
      ...row,
      valorPlantoes: centavos(row.valorPlantoes),
      valorCirurgias: centavos(row.valorCirurgias),
    }))
    .sort((a, b) => b.mes.localeCompare(a.mes));

  const totais = rows.reduce(
    (acc, row) => ({
      plantoes: acc.plantoes + row.plantoes,
      valorPlantoes: centavos(acc.valorPlantoes + row.valorPlantoes),
      cirurgias: acc.cirurgias + row.cirurgias,
      valorCirurgias: centavos(acc.valorCirurgias + row.valorCirurgias),
    }),
    { plantoes: 0, valorPlantoes: 0, cirurgias: 0, valorCirurgias: 0 }
  );

  return { rows, totais, totalGeral: centavos(totais.valorPlantoes + totais.valorCirurgias) };
};

export const resumoDoMes = (resumo, mes) => {
  if (!mes || mes === 'all') return resumo.totais;
  const row = resumo.rows.find((item) => item.mes === mes);
  return row
    ? {
        plantoes: row.plantoes,
        valorPlantoes: row.valorPlantoes,
        cirurgias: row.cirurgias,
        valorCirurgias: row.valorCirurgias,
      }
    : { plantoes: 0, valorPlantoes: 0, cirurgias: 0, valorCirurgias: 0 };
};