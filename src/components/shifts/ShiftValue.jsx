import React from 'react';
import useShiftQuote from '@/lib/useShiftQuote';

export default function ShiftValue({ shift }) {
  const { data, isFetching, error } = useShiftQuote({
    doctorId: shift.doctor_id,
    hospital: shift.hospital,
    period: shift.period || '12h',
    shiftType: shift.shift_type || '',
    enabled: shift.status !== 'Pago',
    grossValue: shift.usar_valor_informado ? shift.valor_bruto_informado : null,
    quantity: Number(shift.quantidade_consultas) || 0,
    valorConsulta: Number(shift.valor_consulta) || 0,
  });
  const value = shift.status !== 'Pago' && data?.configured ? data.value : Number(shift.value) || 0;
  return (
    <div className="rounded-xl border border-border bg-muted p-4">
      <p className="text-xs font-bold uppercase text-muted-foreground">{data?.billingMode === 'por_periodo' ? data.manual || data.quantity > 0 ? 'Valor líquido das consultas' : 'Estimativa por período (líquido)' : 'Valor do plantão'}</p>
      {isFetching ? <p className="text-sm text-muted-foreground">Calculando...</p> : <p className="text-lg font-bold text-foreground">{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
      {error && <p role="alert" className="text-sm text-destructive">Não foi possível atualizar o valor configurado.</p>}
    </div>
  );
}