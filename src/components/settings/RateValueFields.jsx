import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const FIELDS = {
  por_periodo: [['valor_periodo', 'Estimativa bruta por período de consultas (R$)']],
  por_cirurgia: [['valor_cirurgia', 'Valor por cirurgia realizada no convênio (R$)']],
  por_plantao: [['valor_6h', 'Plantão 6h, valor integral'], ['valor_12h', 'Plantão 12h, valor integral'], ['valor_retaguarda', 'Retaguarda'], ['valor_coordenador', 'Coordenador'], ['valor_professor', 'Professor']],
};

const HELP = {
  por_periodo: 'Cada período conta uma vez, independentemente das horas. A estimativa pode ser substituída pelo valor real das consultas em cada lançamento.',
  por_cirurgia: 'O valor é pago por cirurgia de convênio realizada. Nenhum valor é dividido ou multiplicado pelas horas do plantão.',
  por_plantao: 'Valores integrais por tipo de plantão. O sistema não divide nem multiplica valores pelas horas.',
};

export default function RateValueFields({ data, onChange }) {
  const mode = FIELDS[data.tipo_calculo] ? data.tipo_calculo : 'por_plantao';
  const fields = FIELDS[mode];
  const single = mode !== 'por_plantao';
  return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">{HELP[mode]}</p>
    <div className={single ? 'max-w-md' : 'grid grid-cols-2 md:grid-cols-5 gap-4'}>
      {fields.map(([field, label]) => <div key={field}><Label htmlFor={`rate-${field}`}>{label}</Label><Input id={`rate-${field}`} type="number" min="0" max="100000000" step="0.01" required={single} placeholder="0,00" value={data[field] ?? ''} onChange={e => onChange(field, e.target.value)} /></div>)}
    </div>
  </div>;
}