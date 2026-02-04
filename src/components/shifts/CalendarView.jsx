import React, { useState } from 'react';
import { Trash2, Check, Plus } from 'lucide-react';

const weekDays = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

const getDoctorColor = (doctorName) => {
  if (!doctorName) return { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-300 dark:border-blue-700' };
  
  const colors = [
    { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-300 dark:border-blue-700' },
    { bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-300 dark:border-purple-700' },
    { bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-300 dark:border-pink-700' },
    { bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-300 dark:border-orange-700' },
    { bg: 'bg-teal-100 dark:bg-teal-900/30', border: 'border-teal-300 dark:border-teal-700' },
    { bg: 'bg-indigo-100 dark:bg-indigo-900/30', border: 'border-indigo-300 dark:border-indigo-700' },
    { bg: 'bg-cyan-100 dark:bg-cyan-900/30', border: 'border-cyan-300 dark:border-cyan-700' },
    { bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-300 dark:border-amber-700' },
  ];
  
  let hash = 0;
  for (let i = 0; i < doctorName.length; i++) {
    hash = doctorName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
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
  onViewShiftDetails
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
                      onClick={() => onDayClick(dayData.date)}
                      className={`w-8 h-8 rounded-full font-black text-sm transition-all ${
                        isToday
                          ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-lg scale-110'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {dayData.day}
                    </button>
                    
                    <button
                      onClick={() => onDayClick(dayData.date)}
                      className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  
                  <div className="space-y-1.5">
                    {dayData.shifts.map(shift => {
                      const isSelected = selectedShifts.includes(shift.id);
                      const isDragging = draggedShift?.id === shift.id;
                      const isPaid = shift.status === 'Pago';
                      const doctorColor = getDoctorColor(shift.doctor_name);
                      
                      return (
                        <div
                          key={shift.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, shift)}
                          onDragEnd={() => setDraggedShift(null)}
                          className={`group relative p-2 rounded-xl text-xs transition-all cursor-move hover:shadow-lg ${
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
                              {shift.shift_type} • {shift.period || '12h'}
                            </span>
                            {shift.status === 'Pago' && (
                              <Check size={10} className="text-green-600 dark:text-green-400" />
                            )}
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteShift(shift.id, shift.doctor_name);
                            }}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 dark:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg"
                          >
                            <Trash2 size={10} />
                          </button>
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