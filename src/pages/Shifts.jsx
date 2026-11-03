import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar as CalendarIcon, Filter, X, Download } from 'lucide-react';
import CalendarView from '@/components/shifts/CalendarView';
import ShiftModal from '@/components/shifts/ShiftModal';
import ShiftDetailsModal from '@/components/shifts/ShiftDetailsModal';
import DeleteConfirmation from '@/components/common/DeleteConfirmation';
import Toast from '@/components/common/Toast';

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const specialties = [
  "CIRURGIA GERAL", "CLÍNICA MÉDICA", "PEDIATRIA", "GINECOLOGIA", "ORTOPEDIA", "ANESTESIA", "GASTROENTEROLOGIA", "CIRURGIA DIGESTIVA", "OUTRA"
];

export default function Shifts() {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [filterSpecialty, setFilterSpecialty] = useState('TODAS');
  const [filterDoctor, setFilterDoctor] = useState('TODOS');
  const [filterWeek, setFilterWeek] = useState('TODAS');
  const [filterHospital, setFilterHospital] = useState('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [message, setMessage] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, id: '', name: '' });
  const [selectedShifts, setSelectedShifts] = useState([]);
  const [viewDetailsShift, setViewDetailsShift] = useState(null);
  const [editingShift, setEditingShift] = useState(null);

  const queryClient = useQueryClient();

  const { data: user, isLoading: isLoadingUser, error: userError } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  console.log('Current user:', user, 'Is Loading User:', isLoadingUser, 'User Error:', userError);

  React.useEffect(() => {
    if (userError && !isLoadingUser) {
      base44.auth.redirectToLogin();
    }
  }, [userError, isLoadingUser]);

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', user?.email],
    queryFn: async () => {
      const fetchedShifts = await base44.entities.Shift.list('-date');
      console.log('Shifts fetched for user:', user?.email, fetchedShifts);
      return fetchedShifts;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 10,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors', user?.email],
    queryFn: () => base44.entities.Doctor.list('full_name'),
    enabled: !!user,
    staleTime: 1000 * 60 * 30,
    cacheTime: 1000 * 60 * 60,
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ['hospitals', user?.email],
    queryFn: () => base44.entities.Hospital.list('name'),
    enabled: !!user,
    staleTime: 1000 * 60 * 30,
    cacheTime: 1000 * 60 * 60,
  });

  const createShiftMutation = useMutation({
    mutationFn: (data) => base44.entities.Shift.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      setIsModalOpen(false);
      showToast('Plantão registado!');
    },
  });

  const bulkCreateShiftMutation = useMutation({
    mutationFn: (dataArray) => base44.entities.Shift.bulkCreate(dataArray),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      setIsModalOpen(false);
      showToast(`${Array.isArray(result) ? result.length : 'Vários'} plantões criados!`);
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      showToast('Plantão atualizado!');
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: (id) => base44.entities.Shift.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      setDeleteConfirmation({ isOpen: false, id: '', name: '' });
      showToast('Plantão removido!');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      const results = await Promise.allSettled(ids.map(id => base44.entities.Shift.delete(id)));
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      return { successful, failed, total: ids.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      setSelectedShifts([]);
      if (result.failed > 0) {
        showToast(`${result.successful} plantões removidos (${result.failed} já não existiam)`);
      } else {
        showToast(`${result.successful} plantões removidos!`);
      }
    },
  });

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleToday = () => {
    setCurrentMonth(new Date().getMonth());
    setCurrentYear(new Date().getFullYear());
  };

  const filteredShifts = useMemo(() => {
    return shifts.filter(s => {
      if (!s.date) return false;
      
      const dateParts = s.date.split('-').map(Number);
      if (dateParts.length < 2) return false;
      
      const [year, month] = dateParts;
      const matchMonth = month === currentMonth + 1 && year === currentYear;

      const normalizedFilterDoctor = filterDoctor === 'TODOS' ? 'TODOS' : filterDoctor.trim().toUpperCase();
      const normalizedDoctorName = (s.doctor_name || '').trim().toUpperCase();
      const matchDoctor = normalizedFilterDoctor === 'TODOS' || normalizedDoctorName === normalizedFilterDoctor;

      const matchSpecialty = filterSpecialty === 'TODAS' || (s.specialty || '').toUpperCase() === filterSpecialty.toUpperCase();

      const normalizedFilterHospital = filterHospital === 'TODOS' ? 'TODOS' : filterHospital.trim().toUpperCase();
      const normalizedHospital = (s.hospital || '').trim().toUpperCase();
      const matchHospital = normalizedFilterHospital === 'TODOS' || normalizedHospital === normalizedFilterHospital;

      let matchWeek = true;
      if (filterWeek !== 'TODAS') {
        const weekNum = parseInt(filterWeek);
        const [, , day] = s.date.split('-').map(Number);
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
        const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
        const weekOfMonth = Math.ceil((day + adjustedFirstDay) / 7);
        matchWeek = weekOfMonth === weekNum;
      }

      return matchMonth && matchDoctor && matchSpecialty && matchWeek && matchHospital;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [shifts, currentMonth, currentYear, filterDoctor, filterSpecialty, filterWeek, filterHospital]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const dayOfWeek = firstDay.getDay();
    const adjustedFirstDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days = [];

    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push({ day: null, date: null, shifts: [] });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayShifts = filteredShifts.filter(s => s.date === dateStr);
      days.push({ day: i, date: dateStr, shifts: dayShifts });
    }

    return days;
  }, [currentMonth, currentYear, filteredShifts]);

  const handleDayClick = (date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleDeleteShift = (id, name) => {
    setDeleteConfirmation({ isOpen: true, id, name });
  };

  const handleTogglePaid = (id, paid) => {
    updateShiftMutation.mutate({ id, data: { paid } });
  };

  const handleUpdateShiftDate = (id, newDate) => {
    updateShiftMutation.mutate({ id, data: { date: newDate } });
  };

  const toggleSelectShift = (id) => {
    setSelectedShifts(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedShifts.length === filteredShifts.length) {
      setSelectedShifts([]);
    } else {
      setSelectedShifts(filteredShifts.map(s => s.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedShifts.length === 0) return;
    if (confirm(`Tem certeza que deseja eliminar ${selectedShifts.length} plantões selecionados?`)) {
      bulkDeleteMutation.mutate(selectedShifts);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 dark:text-slate-500 font-bold">A carregar plantões...</p>
        </div>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayShifts = filteredShifts.filter(s => s.date === todayStr);
  const upcomingShifts = filteredShifts.filter(s => s.date > todayStr).sort((a, b) => a.date.localeCompare(b.date));
  const nextShift = upcomingShifts[0];

  const isViewer = user?.role === 'viewer';

  const exportToCSV = () => {
    const headers = ['Data', 'Hospital', 'Médico', 'Especialidade', 'Tipo', 'Horas', 'Valor', 'Status'];
    const rows = filteredShifts.map(s => [
      new Date(s.date + 'T00:00:00').toLocaleDateString('pt-PT'),
      s.hospital,
      s.doctor_name,
      s.shift_type,
      s.shift_type,
      '-',
      `R$ ${s.value.toFixed(2)}`,
      s.status
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `plantoes_${monthNames[currentMonth]}_${currentYear}.csv`;
    link.click();
  };

  return (
    <div className="animate-in fade-in duration-300">
      <Toast message={message?.text} type={message?.type} />

      {todayShifts.length > 0 ? (
        <div className="bg-gradient-to-r from-red-500 to-rose-600 dark:from-red-600 dark:to-rose-700 text-white p-4 rounded-2xl mb-6 shadow-lg dark:shadow-red-900/30 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
            <div className="flex-1">
              <p className="font-black text-sm uppercase tracking-wide">Hoje está de plantão!</p>
              <p className="text-xs opacity-90 mt-1">
                Médicos de serviço: {todayShifts.map((s, i) => (
                  <span key={s.id}>
                    <strong>{s.doctor_name}</strong> em {s.hospital} ({s.shift_type})
                    {i < todayShifts.length - 1 ? ' • ' : ''}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 text-white p-4 rounded-2xl mb-6 shadow-lg dark:shadow-blue-900/30">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-white rounded-full"></div>
            <div className="flex-1">
              <p className="font-black text-sm uppercase tracking-wide">
                {filterDoctor !== 'TODOS' ? `${filterDoctor} está de folga hoje.` : 'Hoje está de folga!'}
              </p>
              {nextShift && (
                <p className="text-xs opacity-90 mt-2">
                  Próximo plantão: {new Date(nextShift.date + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })} • <strong>{nextShift.doctor_name}</strong> em {nextShift.hospital} ({nextShift.shift_type})
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md">
          <button
            onClick={handlePreviousMonth}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <svg className="w-6 h-6 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-wide">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          
          <div className="flex gap-2">
            <button
              onClick={handleToday}
              className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl font-bold text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              <svg className="w-6 h-6 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
            {!isViewer && selectedShifts.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 bg-red-600 dark:bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase hover:bg-red-700 dark:hover:bg-red-600 transition-colors shadow-md"
              >
                <X size={16} /> Eliminar {selectedShifts.length}
              </button>
            )}
            {!isViewer && (
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase hover:bg-green-700 dark:hover:bg-green-600 transition-colors shadow-md"
              >
                <Download size={16} /> Exportar CSV
              </button>
            )}
          
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
            <div className="p-2 text-slate-400 dark:text-slate-500"><Filter size={16}/></div>
            <select 
              value={filterDoctor} 
              onChange={e => setFilterDoctor(e.target.value)}
              className="bg-transparent text-xs font-black uppercase tracking-widest border-none focus:ring-0 cursor-pointer text-slate-600 dark:text-slate-300 pr-8"
            >
              <option value="TODOS">TODOS MÉDICOS</option>
              {doctors.map(d => <option key={d.id} value={d.full_name}>{d.full_name}</option>)}
            </select>
          </div>
          
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
            <div className="p-2 text-slate-400 dark:text-slate-500"><Filter size={16}/></div>
            <select 
              value={filterWeek} 
              onChange={e => setFilterWeek(e.target.value)}
              className="bg-transparent text-xs font-black uppercase tracking-widest border-none focus:ring-0 cursor-pointer text-slate-600 dark:text-slate-300 pr-8"
            >
              <option value="TODAS">TODAS SEMANAS</option>
              <option value="1">SEMANA 1</option>
              <option value="2">SEMANA 2</option>
              <option value="3">SEMANA 3</option>
              <option value="4">SEMANA 4</option>
              <option value="5">SEMANA 5</option>
            </select>
          </div>
          
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
            <div className="p-2 text-slate-400 dark:text-slate-500"><Filter size={16}/></div>
            <select 
              value={filterHospital} 
              onChange={e => setFilterHospital(e.target.value)}
              className="bg-transparent text-xs font-black uppercase tracking-widest border-none focus:ring-0 cursor-pointer text-slate-600 dark:text-slate-300 pr-8"
            >
              <option value="TODOS">TODOS HOSPITAIS</option>
              {hospitals.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
            </select>
          </div>

          <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
            <div className="p-2 text-slate-400 dark:text-slate-500"><Filter size={16}/></div>
            <select 
              value={filterSpecialty} 
              onChange={e => setFilterSpecialty(e.target.value)}
              className="bg-transparent text-xs font-black uppercase tracking-widest border-none focus:ring-0 cursor-pointer text-slate-600 dark:text-slate-300 pr-8"
            >
              <option value="TODAS">TODAS ESPECIALIDADES</option>
              {specialties.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <CalendarView 
        calendarDays={calendarDays}
        currentMonth={currentMonth}
        currentYear={currentYear}
        onDayClick={isViewer ? null : handleDayClick}
        onDeleteShift={isViewer ? null : handleDeleteShift}
        onUpdateShiftDate={isViewer ? null : handleUpdateShiftDate}
        selectedShifts={selectedShifts}
        onToggleSelect={isViewer ? null : toggleSelectShift}
        onToggleSelectAll={isViewer ? null : toggleSelectAll}
        onViewShiftDetails={(shift) => setViewDetailsShift(shift)}
        isViewer={isViewer}
      />


      <ShiftModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingShift(null);
        }}
        onSave={async (data) => {
          if (editingShift) {
            await updateShiftMutation.mutateAsync({ id: editingShift.id, data });
          } else if (Array.isArray(data)) {
            await bulkCreateShiftMutation.mutateAsync(data);
          } else {
            await createShiftMutation.mutateAsync(data);
          }
          setEditingShift(null);
        }}
        doctors={doctors}
        hospitals={hospitals}
        initialDate={selectedDate}
        editingShift={editingShift}
      />

      <DeleteConfirmation 
        isOpen={deleteConfirmation.isOpen}
        name={deleteConfirmation.name}
        onConfirm={() => deleteShiftMutation.mutate(deleteConfirmation.id)}
        onCancel={() => setDeleteConfirmation({ isOpen: false, id: '', name: '' })}
      />

      <ShiftDetailsModal 
        shift={viewDetailsShift}
        isOpen={!!viewDetailsShift}
        onClose={() => setViewDetailsShift(null)}
        onEdit={(shift) => {
          setEditingShift(shift);
          setIsModalOpen(true);
        }}
        onDelete={handleDeleteShift}
        isViewer={isViewer}
      />
    </div>
  );
}