import React from 'react';

const brl = (valor) => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const Card = ({ titulo, quantidade, valor, tom }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md">
    <p className="text-xs font-black text-slate-600 uppercase mb-2">{titulo}</p>
    <p className={`text-3xl font-black ${tom}`}>{brl(valor)}</p>
    <p className="text-xs font-bold text-slate-500 mt-1">
      {quantidade} {quantidade === 1 ? 'registro' : 'registros'}
    </p>
  </div>
);

export default function RelatorioTotais({ plantoes, cirurgias, total, periodo }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-black text-slate-500 uppercase">Total em {periodo}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card titulo="Plantões" quantidade={plantoes.quantidade} valor={plantoes.valor} tom="text-slate-900" />
        <Card titulo="Cirurgias" quantidade={cirurgias.quantidade} valor={cirurgias.valor} tom="text-amber-600" />
        <Card titulo="Total Geral" quantidade={plantoes.quantidade + cirurgias.quantidade} valor={total} tom="text-blue-600" />
      </div>
    </div>
  );
}