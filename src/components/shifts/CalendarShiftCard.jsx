import React from 'react';
import { Trash2, Check } from 'lucide-react';
import { getHospitalColor } from '@/lib/hospitalColors';

const getShiftTypeColor = (shiftType) => {
  const type = (shiftType || '').toUpperCase();
  if (type.includes('MANHÃ') || type.includes('MANHA')) {
    return { bg: 'bg-yellow-200 dark:bg-yellow-600/40', border: 'border-yellow-500 dark:border-yellow-400' };
  }
  if (type.includes('TARDE')) {
    return { bg: 'bg-orange-200 dark:bg-orange-600/40', border: 'border-orange-500 dark:border-orange-400' };
  }
  if (type.includes('DIURN')) {
    return { bg: 'bg-teal-200 dark:bg-teal-600/40', border: 'border-teal-500 dark:border-teal-400' };
  }
  if (type.includes('NOTURN')) {
    return { bg: 'bg-violet-200 dark:bg-violet-700/40', border: 'border-violet-500 dark:border-violet-400' };
  }
  if (type.includes('24')) {
    return { bg: 'bg-rose-200 dark:bg-rose-700/40', border: 'border-rose-500 dark:border-rose-400' };
  }
  return { bg: 'bg-slate-200 dark:bg-slate-600/40', border: 'border-slate-400 dark:border-slate-500' };
};

export function ordenarPlantoes(shifts = []) {
  return [...shifts].sort((a, b) => {
    const aDiurno = a.shift_type && a.shift_type.toUpperCase().includes('DIURN');
    const bDiurno = b.shift_type && b.shift_type.toUpperCase().includes('DIURN');
    return bDiurno - aDiurno;
  });
}

export function resumoPlantao(shift) {
  const periodo = shift.period === 'consultas' ? 'Consultas' : shift.period || '12h';
  return `${shift.shift_type || 'Plantão'} • ${periodo}`;
}

export default function CalendarShiftCard({
  shift,
  isSelected = false,
  isDragging = false,
  isViewer = false,
  dragProps = {},
  onClick,
  onDelete,
  compact = false,
}) {
  const isPaid = shift.status === 'Pago';
  const color = getHospitalColor(shift.hospital) || getShiftTypeColor(shift.shift_type);

  return (
    <div
      {...dragProps}
      title={`${shift.doctor_name || ''} • ${shift.hospital || ''} • ${resumoPlantao(shift)}`}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging && onClick) onClick(shift);
      }}
      className={`group relative rounded-xl transition-all hover:shadow-lg ${compact ? 'p-2 text-xs' : 'p-3'} ${
        !isViewer ? 'cursor-move' : 'cursor-pointer'
      } ${isDragging ? 'opacity-50 scale-95' : ''} ${
        isPaid
          ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-400 dark:border-green-600'
          : `${color.bg} border ${color.border}`
      } ${isSelected ? 'ring-2 ring-blue-600 dark:ring-blue-400' : ''}`}
    >
      <div className="font-black text-slate-800 dark:text-slate-200 truncate uppercase tracking-wide text-[10px]">
        {shift.doctor_name}
      </div>
      <div className={`text-slate-600 dark:text-slate-400 truncate mt-0.5 ${compact ? 'text-[9px]' : 'text-[11px]'}`}>
        {shift.hospital}
      </div>
      <div className="flex items-center justify-between gap-1 mt-1">
        <span className={`font-bold text-slate-500 dark:text-slate-400 truncate ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
          {resumoPlantao(shift)}
        </span>
        {isPaid && <Check size={10} className="text-green-600 dark:text-green-400 flex-shrink-0" />}
      </div>

      {!isViewer && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(shift.id, shift.doctor_name);
          }}
          className={`absolute -top-1 -right-1 w-5 h-5 bg-red-600 dark:bg-red-500 text-white rounded-full transition-opacity flex items-center justify-center shadow-lg ${
            compact ? 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100' : 'opacity-100'
          }`}
        >
          <Trash2 size={10} />
        </button>
      )}
    </div>
  );
}