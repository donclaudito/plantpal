import React from 'react';
import { CAMPOS_INTERNAMENTO } from '@/lib/prontuario';

const inputClass = 'w-full px-4 py-3 bg-white dark:bg-slate-700 border-2 border-transparent focus:border-blue-600 dark:focus:border-blue-400 rounded-xl font-bold text-slate-900 dark:text-white transition-colors';

export default function DadosFolhaSala({ dados, onChange }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">Dados da folha de sala</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CAMPOS_INTERNAMENTO.map(campo => (
          <div key={campo.key}>
            <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              {campo.label}
            </label>
            <input
              type="text"
              value={dados[campo.key] || ''}
              onChange={(e) => onChange({ [campo.key]: e.target.value })}
              className={inputClass}
            />
          </div>
        ))}
      </div>
    </div>
  );
}