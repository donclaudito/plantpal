import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import RateScopeFields from '@/components/settings/RateScopeFields';
import RateValueFields from '@/components/settings/RateValueFields';
import { normalizarHospital } from '@/lib/shiftFilters';

export default function ShiftRateForm({ doctors, hospitals, initialData = {}, onSave, onCancel, isSaving }) {
  const [data, setData] = useState({ doctor_id: initialData.doctor_id || '', hospital_id: initialData.hospital_id || '', tipo_calculo: initialData.tipo_calculo || 'por_plantao', ...Object.fromEntries(['valor_periodo', 'valor_6h', 'valor_12h', 'valor_retaguarda', 'valor_coordenador', 'valor_professor'].map(field => [field, initialData[field] ?? ''])) });
  const change = (field, value) => setData(previous => {
    const next = { ...previous, [field]: value };
    if (field === 'hospital_id' && normalizarHospital(hospitals.find(h => h.id === value)?.name).startsWith('AMBULATORIO')) next.tipo_calculo = 'por_periodo';
    if (next.tipo_calculo === 'por_periodo' && next.valor_periodo === '') next.valor_periodo = previous.valor_6h || previous.valor_12h || '';
    return next;
  });
  const submit = e => {
    e.preventDefault();
    const values = Object.fromEntries(['valor_periodo', 'valor_6h', 'valor_12h', 'valor_retaguarda', 'valor_coordenador', 'valor_professor'].map(field => [field, Number(data[field]) || 0]));
    onSave({ ...data, ...values });
  };
  return <form onSubmit={submit} className="space-y-4 p-4 bg-muted rounded-lg">
    <RateScopeFields doctors={doctors} hospitals={hospitals} data={data} onChange={change} />
    <div className="space-y-1"><Label htmlFor="billing-mode">Forma de cálculo</Label><select id="billing-mode" className="w-full rounded-md border border-input bg-background text-foreground p-2 text-sm" value={data.tipo_calculo} onChange={e => change('tipo_calculo', e.target.value)}><option value="por_plantao">Valor fixo por tipo de plantão</option><option value="por_periodo">Estimativa por período de consultas</option></select></div>
    <RateValueFields data={data} onChange={change} />
    <div className="flex gap-2"><Button type="button" variant="outline" onClick={onCancel}><X className="w-4 h-4" />Cancelar</Button><Button type="submit" disabled={isSaving}><Save className="w-4 h-4" />{isSaving ? 'Salvando e sincronizando...' : 'Salvar'}</Button></div>
  </form>;
}