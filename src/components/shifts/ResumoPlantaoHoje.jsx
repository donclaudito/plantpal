import React from 'react';
import { Stethoscope } from 'lucide-react';

function horasDoPlantao(shift) {
  const periodo = String(shift.period || '').trim();
  if (periodo.toLowerCase() === 'consultas') {
    return shift.quantidade_consultas ? `Ambulatório · ${shift.quantidade_consultas} consultas` : 'Ambulatório';
  }
  return periodo || '';
}

export default function ResumoPlantaoHoje({ shift }) {
  const temAmbulatorio = String(shift.period || '').toLowerCase() === 'consultas';
  const horas = horasDoPlantao(shift);

  return (
    <div className="mt-2">
      <p className="text-xs opacity-95">
        <strong>{shift.doctor_name}</strong> em {shift.hospital} ({shift.shift_type})
        {horas && <span className="opacity-90"> · {horas}</span>}
      </p>
      {temAmbulatorio && (
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="inline-flex items-center gap-1 bg-white/20 border border-white/40 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest">
            <Stethoscope size={12} /> Ambulatório
          </span>
        </div>
      )}
    </div>
  );
}