import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatMonthLabel } from '@/lib/dateKeys';

const OPCOES = [
  { value: 'all', label: 'Todas' },
  { value: 'SUS', label: 'SUS' },
  { value: 'Convenio', label: 'Convênio' },
];

export default function FiltroConsultaPagamento({ value, onChange, contagens = {}, mes, onMesChange, meses = [] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-44">
        <Select value={mes} onValueChange={onMesChange}>
          <SelectTrigger>
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {meses.map((chave) => (
              <SelectItem key={chave} value={chave}>{formatMonthLabel(chave)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
    </div>
  );
}