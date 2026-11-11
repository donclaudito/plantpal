import React from 'react';
import { Edit, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { procedimentoQuantidade, procedimentoTotal } from '@/lib/procedimentoTotals';
import { formatDatePtBr } from '@/lib/dateKeys';

const CORES_LINHA = {
  Cirurgia: 'bg-green-50 hover:bg-green-100 border-l-4 border-l-green-500',
  Consulta: 'bg-orange-50 hover:bg-orange-100 border-l-4 border-l-orange-500',
};

const SemDado = ({ texto }) => (
  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
    <AlertTriangle className="w-3 h-3" />
    {texto}
  </span>
);

export default function ProcedimentoTable({ items, tipo, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Médico</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hospital</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pagamento</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qtd</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Unit.</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((proc) => (
            <tr key={proc.id} className={CORES_LINHA[tipo] || 'bg-white hover:bg-gray-50'}>
              <td className="px-4 py-4 text-sm text-gray-900">
                {proc.data ? formatDatePtBr(proc.data) : <SemDado texto="Sem data" />}
              </td>
              <td className="px-4 py-4 text-sm text-gray-900">
                {proc.doctor_name || <SemDado texto="Sem médico" />}
              </td>
              <td className="px-4 py-4 text-sm text-gray-900">
                {proc.hospital_name || <SemDado texto="Sem hospital" />}
              </td>
              <td className="px-4 py-4">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  proc.tipo_pagamento === 'SUS' ? 'bg-blue-100 text-blue-800' :
                  proc.tipo_pagamento === 'Convenio' ? 'bg-green-100 text-green-800' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  {proc.tipo_pagamento || '—'}
                </span>
              </td>
              <td className="px-4 py-4 text-sm text-gray-600">{proc.descricao || '-'}</td>
              <td className="px-4 py-4 text-sm text-right text-gray-900">{procedimentoQuantidade(proc)}</td>
              <td className="px-4 py-4 text-sm text-right text-gray-600">
                {proc.valor === null || proc.valor === undefined
                  ? <SemDado texto="Sem valor" />
                  : `R$ ${Number(proc.valor).toFixed(2)}`}
              </td>
              <td className="px-4 py-4 text-sm text-right font-semibold text-gray-900">
                R$ {procedimentoTotal(proc).toFixed(2)}
              </td>
              <td className="px-4 py-4 text-right">
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(proc)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(proc.id)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}