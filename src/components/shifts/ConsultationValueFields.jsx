import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ConsultationValueFields({ quote, actualValue, onChange }) {
  return <div className="rounded-xl border border-border bg-muted p-4 space-y-3">
    <p className="text-sm text-muted-foreground">Estimativa bruta: {Number(quote.estimatedBaseValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por período, sem relação com as horas.</p>
    <div className="space-y-1"><Label htmlFor="actual-period-value">Valor real bruto do período (R$, opcional)</Label><Input id="actual-period-value" type="number" min="0" max="100000000" step="0.01" placeholder="Deixe vazio para usar a estimativa" value={actualValue} onChange={e => onChange(e.target.value)} /></div>
    <p className="text-xs text-muted-foreground">Informe o total das consultas realizadas quando souber o valor. Ele substitui a estimativa apenas neste período e não é alterado ao atualizar as configurações.</p>
  </div>;
}