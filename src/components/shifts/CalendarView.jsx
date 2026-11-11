import React, { useState } from 'react';
import { Trash2, Check, Plus } from 'lucide-react';
import { getHospitalColor } from '@/lib/hospitalColors';

const weekDays = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

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

const getShiftHours = (shiftType) => {
  switch (shiftType) {
    case '24h':
      return '24h';
    case 'Noturno':
      return '12h';
    case 'Diurno':
      return '12h';
    default:
      return '';
  }
};

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
  isViewer = false
}) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [draggedShift, setDraggedShift] = useState(null);

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
    setDraggedShift(null);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl dark:shadow-slate-900/30 overflow-hidden border border-slate-200 dark:border-slate-700">
      <div className="grid grid-cols-7 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
        {weekDays.map(day => (
          <div key={day} className="p-4 text-center">
            <span className="text-xs font-black text-slate-600 dark:text-slate-400 tracking-widest">{day}</span>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7">
        {calendarDays.map((dayData, idx) => {
          const isToday = dayData.date === todayStr;
          const isEmpty = !dayData.day;
          
          return (
            <div
              key={idx}
              className={`group min-h-[140px] border-r border-b border-slate-200 dark:border-slate-700 p-2 transition-colors relative ${
                isEmpty ? 'bg-slate-50 dark:bg-slate-900/50' : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'
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
                      className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
                  
                  <div className="space-y-1.5">
                    {dayData.shifts.sort((a, b) => {
                      const aDiurno = a.shift_type && a.shift_type.toUpperCase().includes('DIURN');
                      const bDiurno = b.shift_type && b.shift_type.toUpperCase().includes('DIURN');
                      return bDiurno - aDiurno;
                    }).map(shift => {
                      const isSelected = selectedShifts.includes(shift.id);
                      const isDragging = draggedShift?.id === shift.id;
                      const isPaid = shift.status === 'Pago';
                      const doctorColor = getHospitalColor(shift.hospital) || getShiftTypeColor(shift.shift_type);
                      
                      return (
                        <div
                          key={shift.id}
                          draggable={!isViewer}
                          onDragStart={!isViewer ? (e) => handleDragStart(e, shift) : undefined}
                          onDragEnd={!isViewer ? () => setDraggedShift(null) : undefined}
                          className={`group relative p-2 rounded-xl text-xs transition-all ${!isViewer ? 'cursor-move' : 'cursor-pointer'} hover:shadow-lg ${
                            isDragging ? 'opacity-50 scale-95' : ''
                          } ${
                            isPaid
                              ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-400 dark:border-green-600'
                              : `${doctorColor.bg} border ${doctorColor.border}`
                          } ${isSelected ? 'ring-2 ring-blue-600 dark:ring-blue-400' : ''}`}
                          onClick={(e) => {
                            if (!isDragging) {
                              onViewShiftDetails(shift);
                            }
                          }}
                        >
                          <div className="font-black text-slate-800 dark:text-slate-200 truncate text-[10px] uppercase tracking-wide">
                            {shift.doctor_name}
                          </div>
                          <div className="text-slate-600 dark:text-slate-400 truncate text-[9px] mt-0.5">
                            {shift.hospital}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                              {shift.shift_type} • {shift.period === 'consultas' ? 'Consultas' : shift.period || '12h'}
                            </span>
                            {shift.status === 'Pago' && (
                              <Check size={10} className="text-green-600 dark:text-green-400" />
                            )}
                          </div>
                          
                          {!isViewer && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteShift(shift.id, shift.doctor_name);
                              }}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 dark:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}