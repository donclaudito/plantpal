import React from 'react';
import { Plus } from 'lucide-react';
import CalendarShiftCard, { ordenarPlantoes } from '@/components/shifts/CalendarShiftCard';
import CalendarSurgeryCard from '@/components/shifts/CalendarSurgeryCard';

const rotuloDia = (date) => {
  const parsed = new Date(`${date}T00:00:00`);
  const dia = parsed.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  return `${String(parsed.getDate()).padStart(2, '0')}/${String(parsed.getMonth() + 1).padStart(2, '0')} · ${dia.toUpperCase()}`;
};

export default function AgendaMovel({
  calendarDays,
  surgeriesByDate,
  onDayClick,
  onDeleteShift,
  onViewShiftDetails,
  onDeleteSurgery,
  onViewSurgery,
  isViewer = false,
}) {
  const dias = calendarDays.filter(
    (day) => day.day && (day.shifts.length > 0 || (surgeriesByDate?.get(day.date) || []).length > 0)
  );

  if (dias.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 text-center">
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
          Nenhum plantão ou cirurgia neste mês com os filtros atuais.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {dias.map((day) => (
        <div
          key={day.date}
          className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
            <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
              {rotuloDia(day.date)}
            </span>
            {!isViewer && onDayClick && (
              <button
                onClick={() => onDayClick(day.date)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase tracking-wide"
              >
                <Plus size={12} /> Novo
              </button>
            )}
          </div>

          <div className="p-3 space-y-2">
            {ordenarPlantoes(day.shifts).map((shift) => (
              <CalendarShiftCard
                key={shift.id}
                shift={shift}
                isViewer={isViewer}
                onClick={onViewShiftDetails}
                onDelete={onDeleteShift}
              />
            ))}

            {(surgeriesByDate?.get(day.date) || []).map((surgery) => (
              <CalendarSurgeryCard
                key={surgery.id}
                surgery={surgery}
                isViewer={isViewer}
                onClick={onViewSurgery}
                onDelete={onDeleteSurgery}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}