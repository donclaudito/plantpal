import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatQuantity } from '@/lib/quantity';

const formatarData = (valor) => {
  const match = String(valor || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : valor;
};

export default function ConsultasDetalheModal({ open, onClose, item }) {
  const consultas = item?.consultas || [];
  const totalConsultas = consultas.reduce((soma, c) => soma + (c.quantidade || 0), 0);
  const totalGeral = consultas.reduce((soma, c) => soma + (c.total || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-black text-slate-900 dark:text-white">
            Consultas realizadas · {item?.hospitalName}
          </DialogTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400">{item?.doctorName}</p>
        </DialogHeader>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full">
            <thead className="bg-slate-100 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-600 dark:text-slate-400 uppercase">Data</th>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-600 dark:text-slate-400 uppercase">Período</th>
                <th className="px-4 py-3 text-right text-xs font-black text-slate-600 dark:text-slate-400 uppercase">Consultas</th>
                <th className="px-4 py-3 text-right text-xs font-black text-slate-600 dark:text-slate-400 uppercase">Valor unit.</th>
                <th className="px-4 py-3 text-right text-xs font-black text-slate-600 dark:text-slate-400 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {consultas.map((consulta, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-white">{formatarData(consulta.data)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{consulta.periodo || '—'}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-slate-900 dark:text-white">{formatQuantity(consulta.quantidade)}</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600 dark:text-slate-400">R$ {consulta.valorConsulta.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-green-600 dark:text-green-400">R$ {consulta.total.toFixed(2)}</td>
                </tr>
              ))}
              {consultas.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    Nenhuma consulta registada neste período
                  </td>
                </tr>
              )}
            </tbody>
            {consultas.length > 0 && (
              <tfoot className="bg-slate-100 dark:bg-slate-700">
                <tr>
                  <td colSpan="2" className="px-4 py-3 text-sm font-black text-slate-900 dark:text-white uppercase">Total</td>
                  <td className="px-4 py-3 text-sm text-right font-black text-slate-900 dark:text-white">{formatQuantity(totalConsultas)}</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-sm text-right font-black text-green-600 dark:text-green-400">R$ {totalGeral.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}