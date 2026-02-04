import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, DollarSign } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Calendar() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [selectedHospital, setSelectedHospital] = useState('all');
  const [selectedDate, setSelectedDate] = useState(null);

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list(),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => base44.entities.Doctor.list(),
  });

  // Get unique hospitals from shifts
  const hospitals = useMemo(() => {
    const uniqueHospitals = [...new Set(shifts.map(s => s.hospital))];
    return uniqueHospitals.filter(Boolean);
  }, [shifts]);

  // Filter shifts
  const filteredShifts = useMemo(() => {
    return shifts.filter(shift => {
      const doctorMatch = selectedDoctor === 'all' || shift.doctor_name === selectedDoctor;
      const hospitalMatch = selectedHospital === 'all' || shift.hospital === selectedHospital;
      return doctorMatch && hospitalMatch;
    });
  }, [shifts, selectedDoctor, selectedHospital]);

  // Get week days
  const weekStart = startOfWeek(currentWeek, { locale: ptBR });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Get shifts for a specific day
  const getShiftsForDay = (date) => {
    return filteredShifts.filter(shift => {
      try {
        const shiftDate = parseISO(shift.date);
        return isSameDay(shiftDate, date);
      } catch {
        return false;
      }
    });
  };

  // Get shifts for selected date
  const selectedDateShifts = selectedDate ? getShiftsForDay(selectedDate) : [];

  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToToday = () => setCurrentWeek(new Date());

  const getStatusColor = (status) => {
    const colors = {
      'Agendado': 'bg-blue-100 text-blue-800',
      'Realizado': 'bg-green-100 text-green-800',
      'Cancelado': 'bg-red-100 text-red-800',
      'Pago': 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getShiftTypeColor = (type) => {
    const colors = {
      'Diurno': 'bg-yellow-100 text-yellow-800',
      'Noturno': 'bg-indigo-100 text-indigo-800',
      '24h': 'bg-orange-100 text-orange-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Calendário de Plantões</h1>
          <p className="text-gray-600">Visualize e gerencie plantões por semana</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Médico</label>
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os médicos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os médicos</SelectItem>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.full_name}>
                        {doctor.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Hospital</label>
                <Select value={selectedHospital} onValueChange={setSelectedHospital}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os hospitais" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os hospitais</SelectItem>
                    {hospitals.map((hospital) => (
                      <SelectItem key={hospital} value={hospital}>
                        {hospital}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Week Navigation */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={goToPreviousWeek}>
                <ChevronLeft className="w-4 h-4" />
                Semana Anterior
              </Button>
              
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={goToToday}>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Hoje
                </Button>
                <span className="text-lg font-semibold">
                  {format(weekStart, 'dd MMM', { locale: ptBR })} - {format(addDays(weekStart, 6), 'dd MMM yyyy', { locale: ptBR })}
                </span>
              </div>

              <Button variant="outline" onClick={goToNextWeek}>
                Próxima Semana
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
          {weekDays.map((day, index) => {
            const dayShifts = getShiftsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <Card 
                key={index}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                } ${isToday ? 'border-blue-500 border-2' : ''}`}
                onClick={() => setSelectedDate(day)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-center">
                    <div className="text-sm text-gray-600 font-normal">
                      {format(day, 'EEE', { locale: ptBR })}
                    </div>
                    <div className={`text-2xl font-bold ${isToday ? 'text-blue-600' : ''}`}>
                      {format(day, 'd')}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dayShifts.length > 0 ? (
                    <>
                      {dayShifts.slice(0, 3).map((shift) => (
                        <div 
                          key={shift.id}
                          className="p-2 rounded-lg bg-blue-50 text-xs space-y-1"
                        >
                          <div className="font-semibold truncate">{shift.doctor_name}</div>
                          <div className="text-gray-600 truncate">{shift.hospital}</div>
                          <div className={`inline-block px-2 py-0.5 rounded-full text-xs ${getShiftTypeColor(shift.shift_type)}`}>
                            {shift.shift_type}
                          </div>
                        </div>
                      ))}
                      {dayShifts.length > 3 && (
                        <div className="text-xs text-center text-gray-500 pt-1">
                          +{dayShifts.length - 3} mais
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-gray-400 text-center py-4">
                      Sem plantões
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Selected Date Details */}
        {selectedDate && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Plantões de {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDateShifts.length > 0 ? (
                <div className="space-y-4">
                  {selectedDateShifts.map((shift) => (
                    <Card key={shift.id} className="bg-gray-50">
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Médico</div>
                            <div className="font-semibold text-lg">{shift.doctor_name}</div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Hospital</div>
                            <div className="font-semibold text-lg">{shift.hospital}</div>
                          </div>

                          <div>
                            <div className="text-sm text-gray-600 mb-1">Tipo de Plantão</div>
                            <span className={`inline-block px-3 py-1 rounded-full text-sm ${getShiftTypeColor(shift.shift_type)}`}>
                              {shift.shift_type}
                            </span>
                          </div>

                          <div>
                            <div className="text-sm text-gray-600 mb-1">Valor</div>
                            <div className="font-semibold text-lg flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(shift.value)}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm text-gray-600 mb-1">Status</div>
                            <span className={`inline-block px-3 py-1 rounded-full text-sm ${getStatusColor(shift.status)}`}>
                              {shift.status}
                            </span>
                          </div>

                          {shift.notes && (
                            <div className="md:col-span-2">
                              <div className="text-sm text-gray-600 mb-1">Observações</div>
                              <div className="text-gray-700">{shift.notes}</div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nenhum plantão agendado para esta data
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {shiftsLoading && (
          <div className="text-center py-8 text-gray-500">
            Carregando plantões...
          </div>
        )}
      </div>
    </div>
  );
}