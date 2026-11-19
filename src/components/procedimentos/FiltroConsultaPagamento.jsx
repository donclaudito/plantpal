import React from 'react';
import { Button } from '@/components/ui/button';

const OPCOES = [
  { value: 'all', label: 'Todas' },
  { value: 'SUS', label: 'SUS' },
  { value: 'Convenio', label: 'Convênio' },
];

export default function FiltroConsultaPagamento({ value, onChange, contagens = {} }) {
  return (
    <div className="flex gap-1 bg-white border border-gray-200 p-1.5 rounded-2xl w-fit">
      {OPCOES.map((opcao) => (
        <Button
          key={opcao.value}
          size="sm"
          variant={value === opcao.value ? 'default' : 'ghost'}
          onClick={() => onChange(opcao.value)}
        >
          {opcao.label}
          {contagens[opcao.value] !== undefined ? ` (${contagens[opcao.value]})` : ''}
        </Button>
      ))}
    </div>
  );
}