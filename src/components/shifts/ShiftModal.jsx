import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const specialties = [
  "CIRURGIA GERAL", "CLÍNICA MÉDICA", "PEDIATRIA", "GINECOLOGIA", "ORTOPEDIA", "ANESTESIA", "GASTROENTEROLOGIA", "CIRURGIA DIGESTIVA", "OUTRA"
];

const shiftTypes = ["DIURNO MANHÃ", "DIURNO TARDE", "DIURNO", "NOTURNO", "24H"];

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

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: configValores = [] } = useQuery({
    queryKey: ['configValores', user?.email],
    queryFn: async () => {
      const all = await base44.entities.ConfiguracaoPlantao.list();
      return all.filter(c => c.created_by === user?.email);
    },
    enabled: !!user,
  });

  const { data: configDescontos = [] } = useQuery({
    queryKey: ['configDescontos', user?.email],
    queryFn: async () => {
      const all = await base44.entities.ConfiguracaoDesconto.list();
      return all.filter(c => c.created_by === user?.email);
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (editingShift) {
      const doctor = doctors.find(d => d.full_name === editingShift.doctor_name);
      setFormData({
        date: editingShift.date,
        doctorId: editingShift.doctor_id || (doctor?.id || ''),
        doctorName: editingShift.doctor_name,
        specialty: editingShift.shift_type || 'CIRURGIA GERAL',
        unit: editingShift.hospital,
        type: editingShift.shift_type || 'DIURNO',
        period: editingShift.period || '12h',
        value: editingShift.value,
        paid: editingShift.status === 'Pago'
      });
    } else if (initialDate) {
      setFormData(prev => ({ ...prev, date: initialDate }));
    }
  }, [initialDate, editingShift, doctors]);

  const calculateValue = (doctorId, hospitalName, period) => {
    const hospital = hospitals.find(h => h.name === hospitalName);
    const hospitalId = hospital?.id;

    let config = configValores.find(c => c.doctor_id === doctorId && c.hospital_id === hospitalId);
    if (!config) {
      config = configValores.find(c => c.doctor_id === doctorId && !c.hospital_id);
    }
    if (!config) {
      config = configValores.find(c => !c.doctor_id && c.hospital_id === hospitalId);
    }
    if (!config) {
      config = configValores.find(c => !c.doctor_id && !c.hospital_id);
    }

    let baseValue = 0;
    if (config) {
      switch (period) {
        case '6h':
          baseValue = config.valor_6h || 0;
          break;
        case '12h':
          baseValue = config.valor_12h || 0;
          break;
        case 'retaguarda':
          baseValue = config.valor_retaguarda || 0;
          break;
        case 'coordenador':
          baseValue = config.valor_coordenador || 0;
          break;
        default:
          baseValue = 0;
      }
    }

    let desconto = configDescontos.find(d => d.doctor_id === doctorId && d.hospital_id === hospitalId);
    if (!desconto) {
      desconto = configDescontos.find(d => d.doctor_id === doctorId && !d.hospital_id);
    }
    if (!desconto) {
      desconto = configDescontos.find(d => !d.doctor_id && d.hospital_id === hospitalId);
    }
    if (!desconto) {
      desconto = configDescontos.find(d => !d.doctor_id && !d.hospital_id);
    }

    let finalValue = baseValue;
    if (desconto) {
      if (desconto.tipo_desconto === 'percentual') {
        finalValue = baseValue - (baseValue * desconto.valor_desconto / 100);
      } else {
        finalValue = baseValue - desconto.valor_desconto;
      }
    }

    return Math.max(0, finalValue);
  };

  const handleDoctorChange = (e) => {
    const doctorId = e.target.value;
    const doctor = doctors.find(d => d.id === doctorId);
    if (doctor) {
      const newValue = calculateValue(doctorId, formData.unit, formData.period);
      setFormData({
        ...formData,
        doctorId: doctor.id,
        doctorName: doctor.full_name,
        specialty: doctor.specialty || 'CIRURGIA GERAL',
        value: newValue
      });
    }
  };

  const handleHospitalChange = (e) => {
    const hospitalName = e.target.value;
    const newValue = calculateValue(formData.doctorId, hospitalName, formData.period);
    setFormData({ ...formData, unit: hospitalName, value: newValue });
  };

  const handlePeriodChange = (e) => {
    const period = e.target.value;
    const newValue = calculateValue(formData.doctorId, formData.unit, period);
    setFormData({ ...formData, period, value: newValue });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const saveData = {
      date: formData.date,
      doctor_id: formData.doctorId,
      doctor_name: formData.doctorName,
      hospital: formData.unit,
      shift_type: formData.type,
      period: formData.period,
      value: formData.value,
      status: formData.paid ? 'Pago' : 'Realizado'
    };
    onSave(saveData);
    setFormData({
      date: '',
      doctorId: '',
      doctorName: '',
      specialty: 'CIRURGIA GERAL',
      unit: '',
      type: 'DIURNO',
      period: '12h',
      value: 0,
      paid: false
    });
    onClose();
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
              <select
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-2 border-transparent focus:border-blue-600 dark:focus:border-blue-400 rounded-xl font-bold text-slate-900 dark:text-white transition-colors"
              >
                {specialties.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
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
                value={formData.period || '12h'}
                onChange={handlePeriodChange}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-2 border-transparent focus:border-blue-600 dark:focus:border-blue-400 rounded-xl font-bold text-slate-900 dark:text-white transition-colors"
              >
                <option value="12h">12h</option>
                <option value="6h">6h</option>
                <option value="retaguarda">Retaguarda</option>
                <option value="coordenador">Coordenador</option>
              </select>
            </div>
          </div>



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
              className="flex-1 py-4 bg-blue-600 dark:bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              {editingShift ? 'Atualizar' : 'Guardar Plantão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}