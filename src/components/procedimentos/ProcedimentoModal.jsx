import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { procedimentoQuantidade, procedimentoTotal } from '@/lib/procedimentoTotals';
import useShiftQuote from '@/lib/useShiftQuote';

const normalizar = (valor) => String(valor || '').trim().toUpperCase();

const brl = (valor) => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const campo =
  'w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-2 border-transparent focus:border-blue-600 dark:focus:border-blue-400 rounded-xl font-bold text-slate-900 dark:text-white transition-colors';

const Rotulo = ({ children, htmlFor }) => (
  <label
    htmlFor={htmlFor}
    className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2"
  >
    {children}
  </label>
);

const criarFormulario = ({ initialData, doctors, hospitals, tipo }) => {
  const base = {
    tipo: tipo || 'Cirurgia',
    doctor_id: '',
    doctor_name: '',
    hospital_id: '',
    hospital_name: '',
    data: '',
    tipo_pagamento: 'SUS',
    descricao: '',
    valor: 0,
    observacoes: '',
    paciente: '',
    ...(initialData || {}),
  };

  const medico =
    doctors.find((d) => d.id === base.doctor_id) ||
    doctors.find((d) => normalizar(d.full_name) === normalizar(base.doctor_name));
  const hospital =
    hospitals.find((h) => h.id === base.hospital_id) ||
    hospitals.find((h) => normalizar(h.name) === normalizar(base.hospital_name));

  return {
    ...base,
    doctor_id: medico?.id || base.doctor_id || '',
    doctor_name: base.doctor_name || medico?.full_name || '',
    hospital_id: hospital?.id || base.hospital_id || '',
    hospital_name: base.hospital_name || hospital?.name || '',
    quantidade: procedimentoQuantidade(base),
  };
};

export default function ProcedimentoModal({ isOpen, onClose, onSave, doctors, hospitals, initialData, tipo }) {
  const [formData, setFormData] = useState(() => criarFormulario({ initialData, doctors, hospitals, tipo }));

  useEffect(() => {
    if (isOpen) {
      setFormData(criarFormulario({ initialData, doctors, hospitals, tipo }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData?.id]);

  const { data: cirurgiaQuote } = useShiftQuote({
    doctorId: formData.doctor_id,
    hospital: formData.hospital_name,
    tipo: 'cirurgia',
    enabled: isOpen && formData.tipo === 'Cirurgia',
  });

  // Valor por cirurgia configurado no Settings preenche o valor unitário vazio.
  useEffect(() => {
    const valorTabela = Number(cirurgiaQuote?.value) || 0;
    if (!cirurgiaQuote?.configured || valorTabela <= 0) return;
    setFormData(prev => (prev.tipo === 'Cirurgia' && !(Number(prev.valor) > 0) ? { ...prev, valor: valorTabela } : prev));
  }, [cirurgiaQuote]);

  const handleDoctorChange = (doctorId) => {
    const doctor = doctors.find(d => d.id === doctorId);
    if (doctor) {
      setFormData({
        ...formData,
        doctor_id: doctor.id,
        doctor_name: doctor.full_name
      });
    }
  };

  const handleHospitalChange = (hospitalId) => {
    const hospital = hospitals.find(h => h.id === hospitalId);
    if (hospital) {
      setFormData({
        ...formData,
        hospital_id: hospital.id,
        hospital_name: hospital.name
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, valor: Number(formData.valor) || Number(cirurgiaQuote?.value) || 0 });
    onClose();
  };

  if (!isOpen) return null;

  const editando = !!initialData?.id;
  const quantidade = Number(formData.quantidade) || 0;
  const unitario = Number(formData.valor) || 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            {editando ? `Editar ${formData.tipo}` : `Novo ${formData.tipo}`}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
            <X className="text-slate-400 dark:text-slate-500" size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Rotulo>Tipo de Procedimento</Rotulo>
              <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                <SelectTrigger className={campo}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cirurgia">Cirurgia</SelectItem>
                  <SelectItem value="Consulta">Consulta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Rotulo htmlFor="procedimento-data">Data</Rotulo>
              <Input
                id="procedimento-data"
                type="date"
                value={formData.data || ''}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                required
                className={campo}
              />
            </div>

            <div>
              <Rotulo>Médico</Rotulo>
              <Select value={formData.doctor_id || ''} onValueChange={handleDoctorChange}>
                <SelectTrigger className={campo}>
                  <SelectValue placeholder="Selecione um médico" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Rotulo>Hospital / Local</Rotulo>
              <Select value={formData.hospital_id || ''} onValueChange={handleHospitalChange}>
                <SelectTrigger className={campo}>
                  <SelectValue placeholder="Selecione um hospital" />
                </SelectTrigger>
                <SelectContent>
                  {hospitals.map(h => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Rotulo htmlFor="procedimento-paciente">Paciente</Rotulo>
              <Input
                id="procedimento-paciente"
                value={formData.paciente || ''}
                onChange={(e) => setFormData({ ...formData, paciente: e.target.value })}
                placeholder="Nome do paciente"
                className={campo}
              />
            </div>

            <div>
              <Rotulo>Tipo de Pagamento</Rotulo>
              <Select value={formData.tipo_pagamento} onValueChange={(v) => setFormData({ ...formData, tipo_pagamento: v })}>
                <SelectTrigger className={campo}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUS">SUS</SelectItem>
                  <SelectItem value="Convenio">Convênio</SelectItem>
                  <SelectItem value="Particular">Particular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              {formData.tipo === 'Consulta'
                ? `Valor por consulta: ${brl(unitario)}. Quantidade × valor resulta no faturamento do atendimento.`
                : `Valor por cirurgia: ${brl(unitario)}. A quantidade multiplica o valor unitário do procedimento.`}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Rotulo htmlFor="procedimento-valor">Valor Unitário (R$)</Rotulo>
                <Input
                  id="procedimento-valor"
                  type="number"
                  step="0.01"
                  value={formData.valor ?? 0}
                  onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
                  required
                  className={campo}
                />
              </div>
              <div>
                <Rotulo htmlFor="procedimento-quantidade">
                  {formData.tipo === 'Consulta' ? 'Quantidade de consultas' : 'Quantidade'}
                </Rotulo>
                <Input
                  id="procedimento-quantidade"
                  type="number"
                  step="1"
                  min="1"
                  value={formData.quantidade}
                  onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value, 10) || 1 })}
                  required
                  className={campo}
                />
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {quantidade} × {brl(unitario)} = {brl(quantidade * unitario)}
            </p>
            <p className="text-xs text-muted-foreground">
              O valor unitário é preenchido pela configuração do Settings quando não é informado.
            </p>
          </div>

          <div aria-live="polite" className="rounded-xl border border-border bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              {formData.tipo === 'Consulta' ? 'Faturamento das consultas' : 'Valor do procedimento'}
            </p>
            <p className="font-bold text-foreground">{brl(procedimentoTotal(formData))}</p>
          </div>

          <div>
            <Rotulo htmlFor="procedimento-descricao">Descrição do Procedimento</Rotulo>
            <Textarea
              id="procedimento-descricao"
              value={formData.descricao || ''}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descreva o procedimento realizado..."
              rows={3}
              className={campo}
            />
          </div>

          <div>
            <Rotulo htmlFor="procedimento-observacoes">Observações</Rotulo>
            <Textarea
              id="procedimento-observacoes"
              value={formData.observacoes || ''}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observações adicionais..."
              rows={2}
              className={campo}
            />
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
              {editando ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}