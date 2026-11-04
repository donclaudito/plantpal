import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { encontrarHospital, resolverDoctorId } from '@/lib/shiftFilters';
import useShiftQuote from '@/lib/useShiftQuote';
import EspecialidadeSelect from '@/components/EspecialidadeSelect';
import ConsultationValueFields from '@/components/shifts/ConsultationValueFields';

const shiftTypes = ["DIURNO MANHÃ", "DIURNO TARDE", "DIURNO", "NOTURNO", "24H", "PARCIAL", "ESPECIAL(DAS10 AS 22)"];

export default function ShiftModal({ isOpen, onClose, onSave, doctors, hospitals, initialDate, editingShift }) {
  const [formData, setFormData] = useState({
    date: initialDate || '',
    doctorId: '',
    doctorName: '',
    specialty: 'CIRURGIA GERAL',
    unit: '',
    type: 'DIURNO',
    period: '12h',
    value: 0,
    paid: false
  });
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('weekly');
  const [recurrenceCount, setRecurrenceCount] = useState(4);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [actualValue, setActualValue] = useState('');
  const grossValue = actualValue === '' ? null : Number(actualValue);
  const { data: quote, isFetching: isLoadingQuote, error: quoteError } = useShiftQuote(formData.doctorId, formData.unit, formData.period, isOpen, grossValue);
  const byConsultations = quote?.billingMode === 'por_periodo';
  const shiftValue = quote?.configured || quote?.manual ? quote.value : Number(formData.value) || 0;

  useEffect(() => {
    if (isOpen) { // Adicionado: Só inicializa/reseta quando o modal abre
      setSaveError('');
      setActualValue(editingShift?.usar_valor_informado ? String(editingShift.valor_bruto_informado) : '');
      if (editingShift) {
        const doctorId = resolverDoctorId(doctors, editingShift);
        setFormData({
          date: editingShift.date,
          doctorId: doctorId || '',
          doctorName: editingShift.doctor_name,
          specialty: editingShift.shift_type || 'CIRURGIA GERAL',
          unit: encontrarHospital(hospitals, editingShift.hospital)?.name || editingShift.hospital,
          type: editingShift.shift_type || 'DIURNO',
          period: editingShift.period || '12h',
          value: editingShift.value,
          paid: editingShift.status === 'Pago'
        });
      } else { // Caso seja um novo plantão ou o modal foi fechado e reaberto
        setFormData({
          date: initialDate || '',
          doctorId: '',
          doctorName: '',
          specialty: 'CIRURGIA GERAL',
          unit: '',
          type: 'DIURNO',
          period: '12h',
          value: 0,
          paid: false
        });
        setIsRecurring(false);
        setRecurrenceFrequency('weekly');
        setRecurrenceCount(4);
      }
    }
  }, [isOpen, initialDate, editingShift, doctors]); // Adicionado 'isOpen' aqui

  const handleDoctorChange = (e) => {
    setActualValue('');
    const doctorId = e.target.value;
    const doctor = doctors.find(d => d.id === doctorId);
    if (doctor) {
      setFormData({
        ...formData,
        doctorId: doctor.id,
        doctorName: doctor.full_name,
        specialty: doctor.specialty || 'CIRURGIA GERAL',
        value: 0
      });
    }
  };

  const handleHospitalChange = (e) => {
    setActualValue('');
    const hospitalName = e.target.value;
    setFormData({ ...formData, unit: hospitalName, value: 0 });
  };

  const handlePeriodChange = (e) => {
    setActualValue('');
    const period = e.target.value;
    setFormData({ ...formData, period, value: 0 });
  };

  const generateRecurringDates = (startDate, frequency, count) => {
    const dates = [];
    const start = new Date(startDate + 'T00:00:00');
    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      if (frequency === 'weekly') {
        d.setDate(d.getDate() + (i * 7));
      } else if (frequency === 'biweekly') {
        d.setDate(d.getDate() + (i * 14));
      } else if (frequency === 'monthly') {
        d.setMonth(d.getMonth() + i);
      }
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoadingQuote || quoteError || isSaving) return;
    setIsSaving(true);
    setSaveError('');
    const buildShift = (date) => ({
      date,
      doctor_id: formData.doctorId,
      doctor_name: formData.doctorName,
      hospital: formData.unit,
      shift_type: formData.type,
      period: byConsultations ? 'consultas' : formData.period,
      usar_valor_informado: grossValue !== null,
      valor_bruto_informado: grossValue ?? 0,
      value: shiftValue,
      status: formData.paid ? 'Pago' : 'Realizado'
    });

    try {
      if (isRecurring && !editingShift) {
        const dates = generateRecurringDates(formData.date, recurrenceFrequency, recurrenceCount);
        await onSave(dates.map(d => buildShift(d)));
      } else {
        await onSave(buildShift(formData.date));
      }
      onClose();
    } catch (error) {
      setSaveError(`Não foi possível salvar o plantão: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            {editingShift ? 'Editar Plantão' : 'Novo Plantão'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
            <X className="text-slate-400 dark:text-slate-500" size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Data
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-2 border-transparent focus:border-blue-600 dark:focus:border-blue-400 rounded-xl font-bold text-slate-900 dark:text-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Médico
              </label>
              <select
                value={formData.doctorId}
                onChange={handleDoctorChange}
                required
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-2 border-transparent focus:border-blue-600 dark:focus:border-blue-400 rounded-xl font-bold text-slate-900 dark:text-white transition-colors"
              >
                <option value="">Selecione um médico</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Especialidade
              </label>
              <EspecialidadeSelect
                value={formData.specialty}
                onChange={(valor) => setFormData({ ...formData, specialty: valor })}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-2 border-transparent focus:border-blue-600 dark:focus:border-blue-400 rounded-xl font-bold text-slate-900 dark:text-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Hospital / Unidade
              </label>
              <select
                value={formData.unit}
                onChange={handleHospitalChange}
                required
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-2 border-transparent focus:border-blue-600 dark:focus:border-blue-400 rounded-xl font-bold text-slate-900 dark:text-white transition-colors"
              >
                <option value="">Selecione um hospital</option>
                {hospitals.map(h => (
                  <option key={h.id} value={h.name}>{h.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Tipo de Plantão
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-2 border-transparent focus:border-blue-600 dark:focus:border-blue-400 rounded-xl font-bold text-slate-900 dark:text-white transition-colors"
              >
                {shiftTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Período
              </label>
              <select
                value={byConsultations ? 'consultas' : formData.period || '12h'}
                disabled={byConsultations}
                onChange={handlePeriodChange}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-2 border-transparent focus:border-blue-600 dark:focus:border-blue-400 rounded-xl font-bold text-slate-900 dark:text-white transition-colors"
              >
                {byConsultations && <option value="consultas">Período de consultas (sem duração)</option>}
                <option value="1h">1h</option>
                <option value="2h">2h</option>
                <option value="3h">3h</option>
                <option value="4h">4h</option>
                <option value="5h">5h</option>
                <option value="6h">6h</option>
                <option value="12h">12h</option>
                <option value="retaguarda">Retaguarda</option>
                <option value="coordenador">Coordenador</option>
                <option value="professor">Professor</option>
              </select>
            </div>
          </div>

          {!editingShift && (
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-600">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  Repetir plantão
                </span>
              </label>

              {isRecurring && (
                <div className="grid grid-cols-2 gap-4 mt-4 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Frequência
                    </label>
                    <select
                      value={recurrenceFrequency}
                      onChange={(e) => setRecurrenceFrequency(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-2 border-transparent focus:border-blue-600 dark:focus:border-blue-400 rounded-xl font-bold text-slate-900 dark:text-white transition-colors"
                    >
                      <option value="weekly">Semanalmente</option>
                      <option value="biweekly">A cada 2 semanas</option>
                      <option value="monthly">Mensalmente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Nº de repetições
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="52"
                      value={recurrenceCount}
                      onChange={(e) => setRecurrenceCount(Math.max(1, Math.min(52, parseInt(e.target.value) || 1)))}
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-2 border-transparent focus:border-blue-600 dark:focus:border-blue-400 rounded-xl font-bold text-slate-900 dark:text-white transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {byConsultations && <ConsultationValueFields quote={quote} actualValue={actualValue} onChange={setActualValue} />}
          {formData.doctorId && formData.unit && (
            <div aria-live="polite" className="rounded-xl border border-border bg-muted p-4">
              <p className="text-sm text-muted-foreground">{byConsultations ? grossValue === null ? 'Estimativa líquida por período' : 'Valor real líquido do período' : 'Valor do plantão'}</p>
              <p className="font-bold text-foreground">{isLoadingQuote ? 'Calculando...' : shiftValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              {quote?.configured && !isLoadingQuote && <p className="text-xs text-muted-foreground">Bruto: {quote.baseValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} • Descontos: {quote.discountValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
              {quoteError && <p role="alert" className="text-sm text-destructive">Não foi possível consultar o valor. Tente selecionar o hospital novamente.</p>}
            </div>
          )}
          {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || isLoadingQuote || !!quoteError}
              className="flex-1 py-4 bg-blue-600 dark:bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              {isSaving ? 'Salvando...' : editingShift ? 'Atualizar' : 'Guardar Plantão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}