import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { procedimentoQuantidade, procedimentoTotal } from '@/lib/procedimentoTotals';

export default function ProcedimentoModal({ isOpen, onClose, onSave, doctors, hospitals, initialData, tipo }) {
  const [formData, setFormData] = useState({
    ...(initialData || {
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
      paciente: ''
    }),
    quantidade: procedimentoQuantidade(initialData),
  });

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
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Novo Procedimento
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="text-gray-400" size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Tipo de Procedimento</Label>
              <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cirurgia">Cirurgia</SelectItem>
                  <SelectItem value="Consulta">Consulta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Médico</Label>
              <Select value={formData.doctor_id} onValueChange={handleDoctorChange} required>
                <SelectTrigger>
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
              <Label>Hospital / Local</Label>
              <Select value={formData.hospital_id} onValueChange={handleHospitalChange} required>
                <SelectTrigger>
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
              <Label>Paciente</Label>
              <Input
                value={formData.paciente || ''}
                onChange={(e) => setFormData({ ...formData, paciente: e.target.value })}
                placeholder="Nome do paciente"
              />
            </div>

            <div>
              <Label>Tipo de Pagamento</Label>
              <Select value={formData.tipo_pagamento} onValueChange={(v) => setFormData({ ...formData, tipo_pagamento: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUS">SUS</SelectItem>
                  <SelectItem value="Convenio">Convênio</SelectItem>
                  <SelectItem value="Particular">Particular</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Valor Unitário (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                step="1"
                min="1"
                value={formData.quantidade}
                onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value, 10) || 1 })}
                required
              />
            </div>
          </div>

          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">
              Faturamento do atendimento ({formData.quantidade} × R$ {(Number(formData.valor) || 0).toFixed(2)})
            </span>
            <span className="text-lg font-black text-blue-700">R$ {procedimentoTotal(formData).toFixed(2)}</span>
          </div>

          <div>
            <Label>Descrição do Procedimento</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descreva o procedimento realizado..."
              rows={3}
            />
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
              {initialData ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}