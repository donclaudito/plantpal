import React from 'react';
import { procedimentoQuantidade, procedimentoTotal } from '@/lib/procedimentoTotals';

const periodoDe = (procedimento) => {
  const descricao = String(procedimento.descricao || '').toUpperCase();
  if (descricao.includes('MANH')) return 'Manhã';
  if (descricao.includes('TARDE')) return 'Tarde';
  return 'Outros';
};

const brl = (valor) => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const somar = (consultas) =>
  consultas.reduce(
    (acc, consulta) => ({
      quantidade: acc.quantidade + procedimentoQuantidade(consulta),
      valor: acc.valor + procedimentoTotal(consulta),
    }),
    { quantidade: 0, valor: 0 }
  );

const Caixa = ({ titulo, quantidade, valor, destaque }) => (
  <div className={`rounded-xl border p-4 ${destaque ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}>
    <p className="text-xs font-bold text-gray-600 uppercase">{titulo}</p>
    <p className="text-2xl font-black text-gray-900 mt-1">{quantidade}</p>
    <p className="text-xs font-semibold text-gray-600">consultas · {brl(valor)}</p>
  </div>
);

export default function ConsultasPorPeriodo({ consultas = [] }) {
  const manha = somar(consultas.filter((c) => periodoDe(c) === 'Manhã'));
  const tarde = somar(consultas.filter((c) => periodoDe(c) === 'Tarde'));
  const outros = somar(consultas.filter((c) => periodoDe(c) === 'Outros'));
  const total = somar(consultas);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <Caixa titulo="Manhã" quantidade={manha.quantidade} valor={manha.valor} />
      <Caixa titulo="Tarde" quantidade={tarde.quantidade} valor={tarde.valor} />
      <Caixa titulo="Outros" quantidade={outros.quantidade} valor={outros.valor} />
      <Caixa titulo="Total no período" quantidade={total.quantidade} valor={total.valor} destaque />
    </div>
  );
}