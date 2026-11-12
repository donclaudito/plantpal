import React from 'react';
import { Scissors } from 'lucide-react';

const chave = (valor) => String(valor || '').trim().toUpperCase();

export default function CirurgiasDoDia({ cirurgias = [], medico = 'TODOS' }) {
  const lista = cirurgias.filter(
    (cirurgia) => !medico || medico === 'TODOS' || chave(cirurgia.doctor_name) === chave(medico)
  );

  if (lista.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-white/25">
      <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
        <Scissors size={12} /> Cirurgias de hoje ({lista.length})
      </p>
      <ul className="mt-1 space-y-1">
        {lista.map((cirurgia) => (
          <li key={cirurgia.id} className="text-xs opacity-95">
            <strong>{cirurgia.doctor_name}</strong> em {cirurgia.hospital_name}
            {cirurgia.paciente ? ` · ${cirurgia.paciente}` : ''}
            {cirurgia.descricao ? ` · ${cirurgia.descricao}` : ''}
            {cirurgia.tipo_pagamento ? ` · ${cirurgia.tipo_pagamento}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}