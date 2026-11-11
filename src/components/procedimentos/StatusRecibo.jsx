import React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';

export default function StatusRecibo({ procedimento }) {
  const enviadoEm = procedimento?.recibo_enviado_em;

  if (!enviadoEm) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
        <Clock className="w-3 h-3" />
        Não enviado
      </span>
    );
  }

  const data = new Date(enviadoEm);
  const quando = Number.isNaN(data.getTime())
    ? 'enviado'
    : `${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800"
      title={procedimento?.recibo_enviado_para ? `Enviado para ${procedimento.recibo_enviado_para}` : 'Recibo enviado'}
    >
      <CheckCircle2 className="w-3 h-3" />
      Enviado {quando}
    </span>
  );
}