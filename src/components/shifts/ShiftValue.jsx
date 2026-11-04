import React from 'react';
import useShiftQuote from '@/lib/useShiftQuote';

export default function ShiftValue({ shift }) {
  const { data, isFetching, error } = useShiftQuote(shift.doctor_id, shift.hospital, shift.period || '12h', shift.status !== 'Pago', shift.usar_valor_informado ? shift.valor_bruto_informado : null);
  const value = shift.status !== 'Pago' && data?.configured ? data.value : Number(shift.value) || 0;
  return (
    <div className="rounded-xl border border-border bg-muted p-4">
      <p className="text-xs font-bold uppercase text-muted-foreground">{data?.billingMode === 'por_periodo' ? data.manual ? 'Valor real do período (líquido)' : 'Estimativa por período (líquido)' : 'Valor do plantão'}</p>
      {isFetching ? <p className="text-sm text-muted-foreground">Calculando...</p> : <p className="text-lg font-bold text-foreground">{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
      {error && <p role="alert" className="text-sm text-destructive">Não foi possível atualizar o valor configurado.</p>}
    </div>
  );
}