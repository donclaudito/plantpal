import React from 'react';
import { AlertTriangle } from 'lucide-react';
import useConflitosAgenda from '@/lib/useConflitosAgenda';

export default function AvisoConflitoAgenda({
  data,
  doctorName,
  tipo = 'plantao',
  shiftType,
  period,
  ignorarIds = [],
  enabled = true,
}) {
  const conflitos = useConflitosAgenda({
    data,
    doctorName,
    tipo,
    shiftType,
    period,
    ignorarIds,
    enabled,
  });

  if (conflitos.length === 0) return null;

  return (
    <div role="alert" className="border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
      <p className="flex items-center gap-2 text-sm font-black text-red-800 dark:text-red-300 uppercase tracking-wide">
        <AlertTriangle size={16} />
        {conflitos.length === 1
          ? 'Conflito de agenda neste horário'
          : `Conflito de agenda: ${conflitos.length} compromissos neste horário`}
      </p>
      <ul className="mt-2 space-y-1">
        {conflitos.map((conflito) => (
          <li key={conflito.id} className="text-sm font-bold text-red-900 dark:text-red-200">
            {conflito.rotulo}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs font-bold text-red-700 dark:text-red-400">
        Pode guardar mesmo assim — o novo compromisso será registado na mesma.
      </p>
    </div>
  );
}