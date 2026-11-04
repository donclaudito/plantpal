import React from 'react';

export default function RateSummary({ config }) {
  if (config.tipo_calculo === 'por_periodo') return <div className="space-y-1">
    <p className="text-sm text-muted-foreground">Estimativa por período de consultas</p>
    <p className="font-bold text-foreground">{Number(config.valor_periodo || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por período</p>
    <p className="text-sm text-muted-foreground">Sem cálculo por hora. O valor real pode variar conforme as consultas realizadas.</p>
  </div>;
  return <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
    {[['valor_6h', 'Plantão 6h (integral)'], ['valor_12h', 'Plantão 12h (integral)'], ['valor_retaguarda', 'Retaguarda'], ['valor_coordenador', 'Coordenador'], ['valor_professor', 'Professor']].map(([field, label]) => <div key={field}><p className="text-sm text-muted-foreground">{label}</p><p className="font-bold text-foreground">{Number(config[field] || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>)}
  </div>;
}