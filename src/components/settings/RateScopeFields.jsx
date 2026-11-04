import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RateScopeFields({ doctors, hospitals, data, onChange }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {[{ field: 'doctor_id', label: 'Médico (opcional)', all: 'Todos os médicos', records: doctors, name: 'full_name' }, { field: 'hospital_id', label: 'Hospital (opcional)', all: 'Todos os hospitais', records: hospitals, name: 'name' }].map(({ field, label, all, records, name }) => <div key={field}>
      <Label>{label}</Label>
      <Select value={data[field] || 'global'} onValueChange={value => onChange(field, value === 'global' ? '' : value)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="global">{all}</SelectItem>{records.map(record => <SelectItem key={record.id} value={record.id}>{record[name]}</SelectItem>)}</SelectContent>
      </Select>
    </div>)}
  </div>;
}