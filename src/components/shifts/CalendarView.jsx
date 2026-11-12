import React, { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import CalendarShiftCard, { ordenarPlantoes } from '@/components/shifts/CalendarShiftCard';
import CalendarSurgeryCard from '@/components/shifts/CalendarSurgeryCard';
import AgendaMovel from '@/components/shifts/AgendaMovel';
import { dataHoje } from '@/lib/shiftConflicts';

const weekDays = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

export default function CalendarView({ 
  calendarDays, 
  currentMonth, 
  currentYear, 
  onDayClick, 
  onDeleteShift,
  onUpdateShiftDate,
  selectedShifts,
  onToggleSelect,
  onToggleSelectAll,
  onViewShiftDetails,
  surgeries = [],
  onDeleteSurgery,
  onUpdateSurgeryDate,
  onViewSurgery,
  isViewer = false
}) {
  const todayStr = dataHoje();
  const [draggedShift, setDraggedShift] = useState(null);
  const [draggedSurgery, setDraggedSurgery] = useState(null);

  const surgeriesByDate = useMemo(() => {
    const map = new Map();
    for (const surgery of surgeries) {
      const raw = String(surgery.data || '');
      const key = /^\d{2}\/\d{2}\/\d{4}$/.test(raw)
        ? `${raw.slice(6)}-${raw.slice(3, 5)}-${raw.slice(0, 2)}`
        : raw.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(surgery);
    }
    return map;
  }, [surgeries]);

  const handleDragStart = (e, shift) => {
    e.stopPropagation();
    setDraggedShift(shift);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetDate) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedShift && draggedShift.date !== targetDate) {
      onUpdateShiftDate(draggedShift.id, targetDate);
    }
    if (draggedSurgery && onUpdateSurgeryDate && draggedSurgery.date !== targetDate) {
      onUpdateSurgeryDate(draggedSurgery, targetDate);
    }
    setDraggedShift(null);
    setDraggedSurgery(null);
  };

  return (
    <div>
      <div className="lg:hidden">
        <AgendaMovel
          calendarDays={calendarDays}
          surgeriesByDate={surgeriesByDate}
          onDayClick={onDayClick}
          onDeleteShift={onDeleteShift}
          onViewShiftDetails={onViewShiftDetails}
          onDeleteSurgery={onDeleteSurgery}
          onViewSurgery={onViewSurgery}
          isViewer={isViewer}
        />
      </div>

      <div className="hidden lg:block bg-white dark:bg-slate-800 rounded-3xl shadow-xl dark:shadow-slate-900/30 overflow-x-auto border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-7 min-w-[820px] bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
          {weekDays.map(day => (
            <div key={day} className="p-2 sm:p-4 text-center">
              <span className="text-xs font-black text-slate-600 dark:text-slate-400 tracking-widest">{day}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 min-w-[820px]">
          {calendarDays.map((dayData, idx) => {
            const isToday = dayData.date === todayStr;
            const isEmpty = !dayData.day;
            const hasAgenda = dayData.shifts.length > 0 || (surgeriesByDate.get(dayData.date) || []).length > 0;

            return (
              <div
                key={idx}
                className={`group min-h-[140px] border-r border-b border-slate-200 dark:border-slate-700 p-2 transition-colors relative ${
                  isEmpty
                    ? 'bg-slate-50 dark:bg-slate-900/50'
                    : hasAgenda
                      ? 'bg-green-200/80 dark:bg-green-900/40 hover:bg-green-300/70 dark:hover:bg-green-900/50'
                      : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
                onDragOver={!isEmpty ? handleDragOver : undefined}
                onDrop={!isEmpty ? (e) => handleDrop(e, dayData.date) : undefined}
              >
                {!isEmpty && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => !isViewer && onDayClick && onDayClick(dayData.date)}
                        className={`w-8 h-8 rounded-full font-black text-sm transition-all ${
                          isToday
                            ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-lg scale-110'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {dayData.day}
                      </button>

                      {!isViewer && (
                        <button
                          onClick={() => onDayClick(dayData.date)}
                          className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {ordenarPlantoes(dayData.shifts).map(shift => (
                        <CalendarShiftCard
                          key={shift.id}
                          shift={shift}
                          compact
                          isSelected={selectedShifts.includes(shift.id)}
                          isDragging={draggedShift?.id === shift.id}
                          isViewer={isViewer}
                          dragProps={{
                            draggable: !isViewer,
                            onDragStart: !isViewer ? (e) => handleDragStart(e, shift) : undefined,
                            onDragEnd: !isViewer ? () => setDraggedShift(null) : undefined,
                          }}
                          onClick={onViewShiftDetails}
                          onDelete={onDeleteShift}
                        />
                      ))}

                      {(surgeriesByDate.get(dayData.date) || []).map(surgery => (
                        <CalendarSurgeryCard
                          key={surgery.id}
                          surgery={surgery}
                          compact
                          isDragging={draggedSurgery?.id === surgery.id}
                          isViewer={isViewer}
                          dragProps={{
                            draggable: !isViewer,
                            onDragStart: !isViewer ? (e) => {
                              e.stopPropagation();
                              setDraggedSurgery(surgery);
                              setDraggedShift(null);
                              e.dataTransfer.effectAllowed = 'move';
                            } : undefined,
                            onDragEnd: !isViewer ? () => setDraggedSurgery(null) : undefined,
                          }}
                          onClick={onViewSurgery}
                          onDelete={onDeleteSurgery}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}