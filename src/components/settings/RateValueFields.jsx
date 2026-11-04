import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RateValueFields({ data, onChange }) {
  const byPeriod = data.tipo_calculo === 'por_periodo';
  const fields = byPeriod ? [['valor_periodo', 'Estimativa bruta por período de consultas (R$)']] : [['valor_6h', 'Plantão 6h, valor integral'], ['valor_12h', 'Plantão 12h, valor integral'], ['valor_retaguarda', 'Retaguarda'], ['valor_coordenador', 'Coordenador'], ['valor_professor', 'Professor']];
  return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">{byPeriod ? 'Cada período conta uma vez, independentemente das horas. A estimativa pode ser substituída pelo valor real das consultas em cada lançamento.' : 'Valores integrais por tipo de plantão. O sistema não divide nem multiplica valores pelas horas.'}</p>
    <div className={byPeriod ? 'max-w-md' : 'grid grid-cols-2 md:grid-cols-5 gap-4'}>
      {fields.map(([field, label]) => <div key={field}><Label htmlFor={`rate-${field}`}>{label}</Label><Input id={`rate-${field}`} type="number" min="0" max="100000000" step="0.01" required={byPeriod} placeholder="0,00" value={data[field] ?? ''} onChange={e => onChange(field, e.target.value)} /></div>)}
    </div>
  </div>;
}