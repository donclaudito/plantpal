import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MonthlyCalendarView({ 
  shifts, 
  filterDoctor, 
  filterHospital, 
  onAddShift, 
  onDeleteShift,
  getStatusColor 
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calcular o dia da semana do primeiro dia (0 = domingo)
  const firstDayOfWeek = monthStart.getDay();

  // Criar array para preencher os dias vazios no início
  const emptyDays = Array(firstDayOfWeek).fill(null);

  // Filtrar plantões
  const filteredShifts = shifts.filter(shift => {
    const matchDoctor = filterDoctor === 'all' || shift.doctor_name === filterDoctor;
    const matchHospital = filterHospital === 'all' || shift.hospital === filterHospital;
    return matchDoctor && matchHospital;
  });

  // Obter plantões de um dia específico, agrupados por médico
  const getShiftsForDay = (day) => {
    const dayShifts = filteredShifts.filter(shift => {
      const shiftDate = new Date(shift.date);
      return isSameDay(shiftDate, day);
    });
    
    // Agrupar por médico
    const groupedByDoctor = dayShifts.reduce((acc, shift) => {
      const doctor = shift.doctor_name;
      if (!acc[doctor]) {
        acc[doctor] = [];
      }
      acc[doctor].push(shift);
      return acc;
    }, {});
    
    return groupedByDoctor;
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDayClick = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    onAddShift(dateStr);
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho do Calendário */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Grade do Calendário */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 bg-gray-100 border-b">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-semibold text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Dias do mês */}
        <div className="grid grid-cols-7">
          {/* Dias vazios no início */}
          {emptyDays.map((_, index) => (
            <div key={`empty-${index}`} className="min-h-[120px] border-b border-r bg-gray-50" />
          ))}

          {/* Dias do mês */}
          {daysInMonth.map((day) => {
            const dayShiftsGrouped = getShiftsForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toString()}
                className="min-h-[120px] border-b border-r p-2 hover:bg-gray-50 transition-colors relative group"
              >
                {/* Número do dia */}
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-semibold ${isToday ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : 'text-gray-700'}`}>
                    {format(day, 'd')}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDayClick(day)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>

                {/* Plantões do dia agrupados por médico */}
                <div className="space-y-2 overflow-y-auto max-h-[80px]">
                  {Object.entries(dayShiftsGrouped).map(([doctorName, shifts]) => (
                    <div key={doctorName} className="space-y-1">
                      <div className="text-[10px] font-bold text-gray-700 truncate border-b border-gray-300 pb-0.5">
                        {doctorName}
                      </div>
                      {shifts.map((shift) => (
                        <div
                          key={shift.id}
                          className="text-xs p-1 rounded bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors group/shift"
                        >
                          <div className="flex justify-between items-start gap-1">
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-600 truncate text-[10px]">
                                {shift.hospital}
                              </div>
                              <div className="flex gap-1 mt-0.5 flex-wrap">
                                <Badge className={`${getStatusColor(shift.status)} text-[9px] px-1 py-0`}>
                                  {shift.status}
                                </Badge>
                                {shift.shift_type && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                                    {shift.shift_type}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 opacity-0 group-hover/shift:opacity-100 transition-opacity flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteShift(shift.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}