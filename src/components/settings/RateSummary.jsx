import React from 'react';

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function RateSummary({ config }) {
  if (config.tipo_calculo === 'por_periodo') return <div className="space-y-1">
    <p className="text-sm text-muted-foreground">Valor por consulta no Ambulatório SUS</p>
    <p className="font-bold text-foreground">Manhã: {money(config.valor_consulta_manha)} por consulta</p>
    <p className="font-bold text-foreground">Tarde: {money(config.valor_consulta_tarde)} por consulta</p>
    {Number(config.valor_periodo) > 0 && <p className="text-sm text-muted-foreground">Sem quantidade informada: {money(config.valor_periodo)} por período</p>}
    <p className="text-sm text-muted-foreground">Quantidade × valor do período, menos os descontos, resulta no líquido.</p>
  </div>;
  if (config.tipo_calculo === 'por_cirurgia') return <div className="space-y-1">
    <p className="text-sm text-muted-foreground">Valor por cirurgia realizada no convênio</p>
    <p className="font-bold text-foreground">{money(config.valor_cirurgia)} por cirurgia</p>
    <p className="text-sm text-muted-foreground">Sem cálculo por hora nem por plantão.</p>
  </div>;
  return <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
    {[['valor_6h', 'Plantão 6h (integral)'], ['valor_12h', 'Plantão 12h (integral)'], ['valor_retaguarda', 'Retaguarda'], ['valor_coordenador', 'Coordenador'], ['valor_professor', 'Professor']].map(([field, label]) => <div key={field}><p className="text-sm text-muted-foreground">{label}</p><p className="font-bold text-foreground">{money(config[field])}</p></div>)}
  </div>;
}