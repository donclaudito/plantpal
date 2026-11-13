import React, { useMemo } from 'react';
import { monthKeyFromDate, formatMonthLabel } from '@/lib/dateKeys';
import { procedimentoTotal } from '@/lib/procedimentoTotals';

const brl = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const centavos = (value) => Math.round((Number(value) || 0) * 100) / 100;

export default function GanhosMensais({ shifts = [], procedimentos = [], selectedMonth }) {
  const rows = useMemo(() => {
    const map = new Map();
    const linha = (mes) => {
      if (!map.has(mes)) {
        map.set(mes, { mes, plantoes: 0, valorPlantoes: 0, cirurgias: 0, valorCirurgias: 0 });
      }
      return map.get(mes);
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

    return Array.from(map.values()).sort((a, b) => b.mes.localeCompare(a.mes));
  }, [shifts, procedimentos]);

  const totais = rows.reduce(
    (acc, row) => ({
      plantoes: acc.plantoes + row.plantoes,
      valorPlantoes: centavos(acc.valorPlantoes + row.valorPlantoes),
      cirurgias: acc.cirurgias + row.cirurgias,
      valorCirurgias: centavos(acc.valorCirurgias + row.valorCirurgias),
    }),
    { plantoes: 0, valorPlantoes: 0, cirurgias: 0, valorCirurgias: 0 }
  );

  const totalGeral = centavos(totais.valorPlantoes + totais.valorCirurgias);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
      <div className="px-6 py-4 bg-slate-100 border-b border-slate-200">
        <h2 className="text-lg font-black text-slate-900">Ganhos por Mês</h2>
        <p className="text-xs font-bold text-slate-500 uppercase mt-1">
          Soma das cirurgias e dos plantões de cada mês, com os filtros de médico e hospital aplicados
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="px-6 py-8 text-sm text-slate-500">Sem cirurgias ou plantões para os filtros selecionados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase">Mês</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Plantões</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Valor Plantões</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Cirurgias</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Valor Cirurgias</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-900 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row) => (
                <tr
                  key={row.mes}
                  className={row.mes === selectedMonth ? 'bg-blue-50' : 'hover:bg-slate-50'}
                >
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{formatMonthLabel(row.mes)}</td>
                  <td className="px-6 py-4 text-sm text-right text-slate-600">{row.plantoes}</td>
                  <td className="px-6 py-4 text-sm text-right text-slate-700">{brl(row.valorPlantoes)}</td>
                  <td className="px-6 py-4 text-sm text-right text-slate-600">{row.cirurgias}</td>
                  <td className="px-6 py-4 text-sm text-right text-slate-700">{brl(row.valorCirurgias)}</td>
                  <td className="px-6 py-4 text-sm text-right font-black text-blue-600">
                    {brl(centavos(row.valorPlantoes + row.valorCirurgias))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td className="px-6 py-4 text-sm font-black text-slate-900 uppercase">Total</td>
                <td className="px-6 py-4 text-sm text-right font-black text-slate-900">{totais.plantoes}</td>
                <td className="px-6 py-4 text-sm text-right font-black text-slate-900">{brl(totais.valorPlantoes)}</td>
                <td className="px-6 py-4 text-sm text-right font-black text-slate-900">{totais.cirurgias}</td>
                <td className="px-6 py-4 text-sm text-right font-black text-slate-900">{brl(totais.valorCirurgias)}</td>
                <td className="px-6 py-4 text-sm text-right font-black text-blue-700">{brl(totalGeral)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}