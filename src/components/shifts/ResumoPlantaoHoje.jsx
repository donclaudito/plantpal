import React from 'react';
import { Stethoscope, Scissors } from 'lucide-react';

const chave = (valor) => String(valor || '').trim().toUpperCase();

function horasDoPlantao(shift) {
  const periodo = String(shift.period || '').trim();
  if (periodo.toLowerCase() === 'consultas') {
    return shift.quantidade_consultas ? `Ambulatório · ${shift.quantidade_consultas} consultas` : 'Ambulatório';
  }
  return periodo || '';
}

export default function ResumoPlantaoHoje({ shift, cirurgias = [] }) {
  const cirurgiasDoPlantao = cirurgias.filter(
    (cirurgia) =>
      chave(cirurgia.doctor_name) === chave(shift.doctor_name) &&
      chave(cirurgia.hospital_name) === chave(shift.hospital)
  );
  const temAmbulatorio = String(shift.period || '').toLowerCase() === 'consultas';
  const horas = horasDoPlantao(shift);

  return (
    <div className="mt-2">
      <p className="text-xs opacity-95">
        <strong>{shift.doctor_name}</strong> em {shift.hospital} ({shift.shift_type})
        {horas && <span className="opacity-90"> · {horas}</span>}
      </p>
      {(temAmbulatorio || cirurgiasDoPlantao.length > 0) && (
        <div className="flex flex-wrap gap-2 mt-2">
          {temAmbulatorio && (
            <span className="inline-flex items-center gap-1 bg-white/20 border border-white/40 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest">
              <Stethoscope size={12} /> Ambulatório
            </span>
          )}
          {cirurgiasDoPlantao.length > 0 && (
            <span className="inline-flex items-center gap-1 bg-white/20 border border-white/40 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest">
              <Scissors size={12} /> {cirurgiasDoPlantao.length} {cirurgiasDoPlantao.length === 1 ? 'cirurgia' : 'cirurgias'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}