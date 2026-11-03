import React from 'react';
import useShiftQuote from '@/lib/useShiftQuote';

export default function ShiftValue({ shift }) {
  const { data, isPending, error } = useShiftQuote(shift.doctor_id, shift.hospital, shift.period || '12h');
  const value = data?.configured ? data.value : Number(shift.value) || 0;
  return (
    <div className="rounded-xl border border-border bg-muted p-4">
      <p className="text-xs font-bold uppercase text-muted-foreground">Valor do plantão</p>
      {isPending && shift.doctor_id ? <p className="text-sm text-muted-foreground">Calculando...</p> : <p className="text-lg font-bold text-foreground">{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
      {error && <p role="alert" className="text-sm text-destructive">Não foi possível atualizar o valor configurado.</p>}
    </div>
  );
}