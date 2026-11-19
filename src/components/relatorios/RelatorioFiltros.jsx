import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatMonthLabel } from '@/lib/dateKeys';

const Rotulo = ({ children }) => (
  <label className="block text-xs font-black text-slate-600 uppercase mb-2">{children}</label>
);

export default function RelatorioFiltros({
  months = [],
  month,
  onMonthChange,
  doctors = [],
  doctor,
  onDoctorChange,
  hospitals = [],
  hospital,
  onHospitalChange,
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Rotulo>Mês</Rotulo>
          <Select value={month} onValueChange={onMonthChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {months.map((mes) => (
                <SelectItem key={mes} value={mes}>{formatMonthLabel(mes)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Rotulo>Médico</Rotulo>
          <Select value={doctor} onValueChange={onDoctorChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {doctors.map((d) => (
                <SelectItem key={d.id} value={d.full_name}>{d.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Rotulo>Hospital</Rotulo>
          <Select value={hospital} onValueChange={onHospitalChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {hospitals.map((h) => (
                <SelectItem key={h.id} value={h.name}>{h.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}