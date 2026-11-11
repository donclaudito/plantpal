import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const variantesData = (date) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return [];
  const [year, month, day] = date.split('-');
  return [date, `${day}/${month}/${year}`];
};

export default function AvisoCirurgiaData({ date }) {
  const datas = variantesData(date);

  const { data: cirurgias = [] } = useQuery({
    queryKey: ['cirurgias-data', date],
    queryFn: async () => {
      const page = await base44.entities.Procedimento.filter({ tipo: 'Cirurgia', data: { $in: datas } }, { limit: 20 });
      return page.items || [];
    },
    enabled: datas.length > 0,
  });

  if (cirurgias.length === 0) return null;

  return (
    <div role="alert" className="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
      <p className="flex items-center gap-2 text-sm font-black text-amber-800 dark:text-amber-300 uppercase tracking-wide">
        <AlertTriangle size={16} />
        {cirurgias.length === 1 ? 'Já existe cirurgia programada nesta data' : `Já existem ${cirurgias.length} cirurgias programadas nesta data`}
      </p>
      <ul className="mt-2 space-y-1">
        {cirurgias.map(cirurgia => (
          <li key={cirurgia.id} className="text-sm font-bold text-amber-900 dark:text-amber-200">
            {cirurgia.hospital_name}{cirurgia.paciente ? ` • ${cirurgia.paciente}` : ''}{cirurgia.descricao ? ` • ${cirurgia.descricao}` : ''}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs font-bold text-amber-700 dark:text-amber-400">Pode guardar mesmo assim — será registada outra cirurgia para o mesmo dia.</p>
    </div>
  );
}