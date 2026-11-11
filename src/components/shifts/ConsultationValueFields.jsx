import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const brl = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ConsultationValueFields({ quote, quantidade, valorConsulta, onChangeQuantidade, onChangeValorConsulta }) {
  const qtd = Number(quantidade);
  const unitario = Number(valorConsulta);
  const preenchido = quantidade !== '' && valorConsulta !== '' && Number.isFinite(qtd) && Number.isFinite(unitario);
  const bruto = preenchido ? Math.round(qtd * unitario * 100) / 100 : 0;

  return <div className="rounded-xl border border-border bg-muted p-4 space-y-3">
    <p className="text-sm text-muted-foreground">Estimativa: {brl(quote.estimatedBaseValue)} por período de consultas. Manhã e tarde são lançamentos separados.</p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label htmlFor="consultas-quantidade">Quantidade de consultas</Label>
        <Input id="consultas-quantidade" type="number" min="0" max="999" step="1" placeholder="0" value={quantidade} onChange={e => onChangeQuantidade(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="consulta-valor">Valor por consulta (R$)</Label>
        <Input id="consulta-valor" type="number" min="0" max="100000" step="0.01" placeholder="0,00" value={valorConsulta} onChange={e => onChangeValorConsulta(e.target.value)} />
      </div>
    </div>
    <p className="text-sm font-semibold text-foreground">{preenchido ? `${qtd} × ${brl(unitario)} = ${brl(bruto)}` : 'Preencha quantidade e valor por consulta para calcular o valor do período.'}</p>
    <p className="text-xs text-muted-foreground">O bruto das consultas substitui a estimativa apenas neste período e os descontos são aplicados sobre ele.</p>
  </div>;
}