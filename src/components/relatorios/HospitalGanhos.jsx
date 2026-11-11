import React, { useMemo } from 'react';

const brl = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const centavos = (value) => Math.round((Number(value) || 0) * 100) / 100;

const BUCKETS = [
  { key: 'consultas', label: 'Consultas', tone: 'text-sky-700' },
  { key: 'cirurgias', label: 'Cirurgias', tone: 'text-amber-700' },
  { key: 'seis', label: 'Plantões 6h', tone: 'text-slate-700' },
  { key: 'doze', label: 'Plantões 12h', tone: 'text-indigo-700' },
];

const bucketOf = (period) => {
  if (period === 'consultas') return 'consultas';
  if (period === 'cirurgias') return 'cirurgias';
  if (period === '6h') return 'seis';
  if (period === '12h') return 'doze';
  return null;
};

export default function HospitalGanhos({ summary = [] }) {
  const rows = useMemo(() => {
    const map = new Map();
    for (const item of summary || []) {
      const key = item.hospitalId || item.hospitalName || 'sem-hospital';
      if (!map.has(key)) map.set(key, { name: item.hospitalName || 'Sem hospital', consultas: 0, cirurgias: 0, seis: 0, doze: 0, outros: 0, total: 0 });
      const row = map.get(key);
      const value = Number(item.netValue) || 0;
      const bucket = bucketOf(item.period);
      if (bucket) row[bucket] += value;
      else row.outros += value;
      row.total += value;
    }
    return Array.from(map.values())
      .map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === 'number' ? centavos(value) : value])))
      .sort((a, b) => b.total - a.total);
  }, [summary]);

  const totals = rows.reduce((acc, row) => ({
    consultas: centavos(acc.consultas + row.consultas),
    cirurgias: centavos(acc.cirurgias + row.cirurgias),
    seis: centavos(acc.seis + row.seis),
    doze: centavos(acc.doze + row.doze),
    outros: centavos(acc.outros + row.outros),
    total: centavos(acc.total + row.total),
  }), { consultas: 0, cirurgias: 0, seis: 0, doze: 0, outros: 0, total: 0 });

  const temOutros = rows.some(row => row.outros > 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
      <div className="px-6 py-4 bg-slate-100 border-b border-slate-200">
        <h2 className="text-lg font-black text-slate-900">Ganhos por Hospital</h2>
        <p className="text-xs font-bold text-slate-500 uppercase mt-1">Valores líquidos recebidos, separados por consultas, cirurgias e plantões de 6h e 12h</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-6 py-8 text-sm text-slate-500">Sem ganhos registados para os filtros selecionados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase">Hospital</th>
                {BUCKETS.map(bucket => (
                  <th key={bucket.key} className={`px-6 py-4 text-right text-xs font-black uppercase ${bucket.tone}`}>{bucket.label}</th>
                ))}
                {temOutros && <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase">Outros</th>}
                <th className="px-6 py-4 text-right text-xs font-black text-slate-900 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map(row => (
                <tr key={row.name} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{row.name}</td>
                  {BUCKETS.map(bucket => (
                    <td key={bucket.key} className="px-6 py-4 text-sm text-right text-slate-700">{brl(row[bucket.key])}</td>
                  ))}
                  {temOutros && <td className="px-6 py-4 text-sm text-right text-slate-500">{brl(row.outros)}</td>}
                  <td className="px-6 py-4 text-sm text-right font-black text-blue-600">{brl(row.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td className="px-6 py-4 text-sm font-black text-slate-900 uppercase">Total</td>
                {BUCKETS.map(bucket => (
                  <td key={bucket.key} className="px-6 py-4 text-sm text-right font-black text-slate-900">{brl(totals[bucket.key])}</td>
                ))}
                {temOutros && <td className="px-6 py-4 text-sm text-right font-black text-slate-700">{brl(totals.outros)}</td>}
                <td className="px-6 py-4 text-sm text-right font-black text-blue-700">{brl(totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}