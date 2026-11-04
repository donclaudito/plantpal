import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import RateScopeFields from '@/components/settings/RateScopeFields';
import RateValueFields from '@/components/settings/RateValueFields';
import { normalizarHospital } from '@/lib/shiftFilters';

export default function ShiftRateForm({ doctors, hospitals, initialData = {}, onSave, onCancel, isSaving }) {
  const VALUE_FIELDS = ['valor_periodo', 'valor_cirurgia', 'valor_6h', 'valor_12h', 'valor_retaguarda', 'valor_coordenador', 'valor_professor'];
  const [data, setData] = useState({ doctor_id: initialData.doctor_id || '', hospital_id: initialData.hospital_id || '', tipo_calculo: initialData.tipo_calculo || 'por_plantao', ...Object.fromEntries(VALUE_FIELDS.map(field => [field, initialData[field] ?? ''])) });
  const change = (field, value) => setData(previous => {
    const next = { ...previous, [field]: value };
    if (field === 'hospital_id') {
      const name = normalizarHospital(hospitals.find(h => h.id === value)?.name);
      if (name.startsWith('AMBULATORIO')) next.tipo_calculo = 'por_periodo';
      else if (name.startsWith('CIRURGIA')) next.tipo_calculo = 'por_cirurgia';
    }
    if (next.tipo_calculo === 'por_periodo' && next.valor_periodo === '') next.valor_periodo = previous.valor_6h || previous.valor_12h || '';
    if (next.tipo_calculo === 'por_cirurgia' && next.valor_cirurgia === '') next.valor_cirurgia = previous.valor_12h || previous.valor_6h || '';
    return next;
  });
  const submit = e => {
    e.preventDefault();
    const values = Object.fromEntries(VALUE_FIELDS.map(field => [field, Number(data[field]) || 0]));
    onSave({ ...data, ...values });
  };
  return <form onSubmit={submit} className="space-y-4 p-4 bg-muted rounded-lg">
    <RateScopeFields doctors={doctors} hospitals={hospitals} data={data} onChange={change} />
    <div className="space-y-1"><Label htmlFor="billing-mode">Forma de cálculo</Label><select id="billing-mode" className="w-full rounded-md border border-input bg-background text-foreground p-2 text-sm" value={data.tipo_calculo} onChange={e => change('tipo_calculo', e.target.value)}><option value="por_plantao">Valor fixo por tipo de plantão</option><option value="por_periodo">Estimativa por período de consultas</option><option value="por_cirurgia">Por cirurgia realizada no convênio</option></select></div>
    <RateValueFields data={data} onChange={change} />
    <div className="flex gap-2"><Button type="button" variant="outline" onClick={onCancel}><X className="w-4 h-4" />Cancelar</Button><Button type="submit" disabled={isSaving}><Save className="w-4 h-4" />{isSaving ? 'Salvando e sincronizando...' : 'Salvar'}</Button></div>
  </form>;
}