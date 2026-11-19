import React, { useEffect, useState } from 'react';
import { X, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import ProntuarioSection from '@/components/shifts/ProntuarioSection';
import AvisoConflitoAgenda from '@/components/shifts/AvisoConflitoAgenda';
import useShiftQuote from '@/lib/useShiftQuote';
import { emptyProntuario, fichaDoProcedimento, internamentoDoProntuario, tipoPagamentoDoConvenio } from '@/lib/prontuario';

const toIsoDate = (value) => {
  const raw = String(value || '').trim();
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : '';
};

const inputClass = 'w-full px-4 py-3 bg-white dark:bg-slate-700 border-2 border-transparent focus:border-rose-500 dark:focus:border-rose-400 rounded-xl font-bold text-slate-900 dark:text-white transition-colors';

export default function SurgeryModal({ surgery, isOpen, onClose, doctors = [], hospitals = [], onSave, onDelete, onGoToProcedimentos, isViewer = false }) {
  const [ficha, setFicha] = useState(emptyProntuario());
  const [form, setForm] = useState({ data: '', hospital_id: '', doctor_id: '', tipo_pagamento: 'SUS', quantidade: 1, observacoes: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!surgery) return;
    setFicha(fichaDoProcedimento(surgery));
    setForm({
      data: toIsoDate(surgery.data),
      hospital_id: surgery.hospital_id || '',
      doctor_id: surgery.doctor_id || '',
      tipo_pagamento: surgery.tipo_pagamento || 'SUS',
      quantidade: surgery.quantidade || 1,
      observacoes: String(surgery.observacoes || '').replace(/Conv[eê]nio:\s*[^•\n]*/i, '').replace(/^•\s*/, '').trim(),
    });
    setError('');
  }, [surgery]);

  const hospitalNome = hospitals.find(h => h.id === form.hospital_id)?.name || surgery?.hospital_name || '';
  const { data: cirurgiaQuote } = useShiftQuote({
    doctorId: form.doctor_id,
    hospital: hospitalNome,
    tipo: 'cirurgia',
    enabled: isOpen,
  });

  // Valor por cirurgia configurado no Settings entra como valor unitário em Procedimentos.
  useEffect(() => {
    const valorTabela = Number(cirurgiaQuote?.value) || 0;
    if (!cirurgiaQuote?.configured || valorTabela <= 0) return;
    setFicha(prev => (Number(prev.valor) > 0 ? prev : { ...prev, valor: String(valorTabela) }));
  }, [cirurgiaQuote]);

  if (!isOpen || !surgery) return null;

  const handleImportacao = (patch) => {
    const { data: dataImportada, ...campos } = patch;
    setFicha(prev => ({ ...prev, ...campos }));
    const iso = dataImportada ? toIsoDate(dataImportada) : '';
    if (iso) setForm(prev => ({ ...prev, data: iso }));
  };

  const buildPayload = () => {
    const hospital = hospitals.find(h => h.id === form.hospital_id);
    const doctor = doctors.find(d => d.id === form.doctor_id);
    const convenio = ficha.convenio.trim();
    const observacoes = [convenio ? `Convênio: ${convenio}` : '', form.observacoes.trim()].filter(Boolean).join(' • ');
    return {
      data: toIsoDate(form.data) || surgery.data,
      hospital_id: hospital?.id ?? surgery.hospital_id ?? '',
      hospital_name: hospital?.name ?? surgery.hospital_name ?? '',
      doctor_id: doctor?.id ?? surgery.doctor_id ?? '',
      doctor_name: doctor?.full_name ?? surgery.doctor_name ?? '',
      paciente: ficha.paciente.trim(),
      tipo_pagamento: convenio ? tipoPagamentoDoConvenio(convenio) : form.tipo_pagamento,
      descricao: [ficha.nomeCirurgia.trim(), ficha.tipoCirurgia.trim()].filter(Boolean).join(' • '),
      valor: Number(ficha.valor) || Number(cirurgiaQuote?.value) || 0,
      quantidade: Number(form.quantidade) || 1,
      observacoes,
      ficha: internamentoDoProntuario(ficha),
    };
  };

  const handleSave = async (irParaProcedimentos) => {
    if (isSaving || isViewer) return;
    setIsSaving(true);
    setError('');
    try {
      await onSave(buildPayload());
      if (irParaProcedimentos && onGoToProcedimentos) onGoToProcedimentos();
    } catch (e) {
      setError(`Não foi possível guardar: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-wide">Cirurgia</h2>
            <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{surgery.hospital_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
            <X className="text-slate-400" size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Data</label>
              <input
                type="date"
                value={form.data}
                onChange={(e) => setForm(prev => ({ ...prev, data: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Hospital</label>
              <select
                value={form.hospital_id}
                onChange={(e) => setForm(prev => ({ ...prev, hospital_id: e.target.value }))}
                className={inputClass}
              >
                <option value="">{surgery.hospital_name || 'Selecione'}</option>
                {hospitals.map(hospital => (
                  <option key={hospital.id} value={hospital.id}>{hospital.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Médico</label>
              <select
                value={form.doctor_id}
                onChange={(e) => setForm(prev => ({ ...prev, doctor_id: e.target.value }))}
                className={inputClass}
              >
                <option value="">{surgery.doctor_name || 'Selecione'}</option>
                {doctors.map(doctor => (
                  <option key={doctor.id} value={doctor.id}>{doctor.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Tipo de pagamento</label>
              <select
                value={form.tipo_pagamento}
                onChange={(e) => setForm(prev => ({ ...prev, tipo_pagamento: e.target.value }))}
                className={inputClass}
              >
                <option value="SUS">SUS</option>
                <option value="Convenio">Convênio</option>
                <option value="Particular">Particular</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Quantidade</label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.quantidade}
                onChange={(e) => setForm(prev => ({ ...prev, quantidade: parseInt(e.target.value, 10) || 1 }))}
                className={inputClass}
              />
            </div>
          </div>

          <AvisoConflitoAgenda
            data={form.data}
            doctorName={doctors.find(d => d.id === form.doctor_id)?.full_name || surgery.doctor_name}
            tipo="cirurgia"
            ignorarIds={[surgery.id]}
            enabled={isOpen}
          />

          <ProntuarioSection dados={ficha} onChange={handleImportacao} />

          <div>
            <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Observações</label>
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
              rows={2}
              placeholder="Observações adicionais..."
              className={inputClass}
            />
          </div>

          {error && <p role="alert" className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>}

          {!isViewer && (
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => onDelete(surgery)}
                className="flex items-center gap-2 px-4 py-3 bg-red-600 dark:bg-red-500 text-white rounded-xl font-bold text-sm uppercase hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
              >
                <Trash2 size={16} /> Excluir
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-3 bg-slate-800 dark:bg-slate-600 text-white rounded-xl font-bold text-sm uppercase hover:bg-slate-900 dark:hover:bg-slate-500 transition-colors disabled:opacity-60"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />} Enviar para Procedimentos
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="flex-1 min-w-[140px] px-4 py-3 bg-rose-600 dark:bg-rose-500 text-white rounded-xl font-bold text-sm uppercase hover:bg-rose-700 dark:hover:bg-rose-600 transition-colors disabled:opacity-60"
              >
                {isSaving ? 'A guardar...' : 'Guardar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}