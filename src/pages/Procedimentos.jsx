import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import DeleteConfirmation from '@/components/common/DeleteConfirmation';

export default function Procedimentos() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingProcedimento, setEditingProcedimento] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [procedimentoToDelete, setProcedimentoToDelete] = useState(null);

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const [filterDoctor, setFilterDoctor] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMonth, setFilterMonth] = useState(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`);

  const [formData, setFormData] = useState({
    doctor_id: '',
    doctor_name: '',
    hospital_id: '',
    hospital_name: '',
    type: 'Consulta',
    category: 'Particular',
    date: new Date().toISOString().split('T')[0],
    value: 0,
    notes: ''
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: procedimentos = [] } = useQuery({
    queryKey: ['procedimentos', user?.email],
    queryFn: async () => {
      const all = await base44.entities.Procedimento.list('-date');
      return all.filter(p => p.created_by === user?.email);
    },
    enabled: !!user,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => base44.entities.Doctor.list('full_name'),
    enabled: !!user,
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => base44.entities.Hospital.list('name'),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Procedimento.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedimentos'] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Procedimento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedimentos'] });
      setShowForm(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Procedimento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedimentos'] });
      setShowDeleteConfirm(false);
      setProcedimentoToDelete(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingProcedimento) {
      updateMutation.mutate({ id: editingProcedimento.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (procedimento) => {
    setEditingProcedimento(procedimento);
    setFormData({
      doctor_id: procedimento.doctor_id,
      doctor_name: procedimento.doctor_name,
      hospital_id: procedimento.hospital_id || '',
      hospital_name: procedimento.hospital_name || '',
      type: procedimento.type,
      category: procedimento.category,
      date: procedimento.date,
      value: procedimento.value,
      notes: procedimento.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = (procedimento) => {
    setProcedimentoToDelete(procedimento);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (procedimentoToDelete) {
      deleteMutation.mutate(procedimentoToDelete.id);
    }
  };

  const resetForm = () => {
    setFormData({
      doctor_id: '',
      doctor_name: '',
      hospital_id: '',
      hospital_name: '',
      type: 'Consulta',
      category: 'Particular',
      date: new Date().toISOString().split('T')[0],
      value: 0,
      notes: ''
    });
    setEditingProcedimento(null);
  };

  const handleDoctorChange = (doctorId) => {
    const doctor = doctors.find(d => d.id === doctorId);
    if (doctor) {
      setFormData({
        ...formData,
        doctor_id: doctorId,
        doctor_name: doctor.full_name
      });
    }
  };

  const handleHospitalChange = (hospitalId) => {
    const hospital = hospitals.find(h => h.id === hospitalId);
    if (hospital) {
      setFormData({
        ...formData,
        hospital_id: hospitalId,
        hospital_name: hospital.name
      });
    } else {
      setFormData({
        ...formData,
        hospital_id: '',
        hospital_name: ''
      });
    }
  };

  const filteredProcedimentos = useMemo(() => {
    return procedimentos.filter(p => {
      const matchDoctor = filterDoctor === 'all' || p.doctor_id === filterDoctor;
      const matchType = filterType === 'all' || p.type === filterType;
      const matchCategory = filterCategory === 'all' || p.category === filterCategory;
      
      let matchMonth = true;
      if (filterMonth !== 'all' && p.date) {
        const [year, month] = p.date.split('-').map(Number);
        const procMonth = `${year}-${String(month).padStart(2, '0')}`;
        matchMonth = procMonth === filterMonth;
      }
      
      return matchDoctor && matchType && matchCategory && matchMonth;
    });
  }, [procedimentos, filterDoctor, filterType, filterCategory, filterMonth]);

  const availableMonths = useMemo(() => {
    const months = new Set();
    procedimentos.forEach(p => {
      if (p.date) {
        const [year, month] = p.date.split('-').map(Number);
        if (!isNaN(year) && !isNaN(month)) {
          months.add(`${year}-${String(month).padStart(2, '0')}`);
        }
      }
    });
    return Array.from(months).sort().reverse();
  }, [procedimentos]);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    const parts = monthStr.split('-');
    if (parts.length < 2) return '';
    const month = parseInt(parts[1]);
    const year = parts[0];
    if (isNaN(month) || !year) return '';
    return `${monthNames[month - 1]} ${year}`;
  };

  const summary = useMemo(() => {
    const total = filteredProcedimentos.reduce((sum, p) => sum + (p.value || 0), 0);
    const consultas = filteredProcedimentos.filter(p => p.type === 'Consulta').length;
    const cirurgias = filteredProcedimentos.filter(p => p.type.includes('Cirurgia')).length;
    
    return { total, consultas, cirurgias, count: filteredProcedimentos.length };
  }, [filteredProcedimentos]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-bold">A carregar procedimentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-slate-900">Consultas e Cirurgias</h1>
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Plus size={18} />
          Novo Procedimento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total de Procedimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{summary.count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Consultas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summary.consultas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Cirurgias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.cirurgias}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">R$ {summary.total.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md">
        <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
          <Filter size={20} />
          Filtros
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs font-black text-slate-600 uppercase">Médico</Label>
            <Select value={filterDoctor} onValueChange={setFilterDoctor}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {doctors.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-black text-slate-600 uppercase">Tipo</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Consulta">Consulta</SelectItem>
                <SelectItem value="Cirurgia Eletiva">Cirurgia Eletiva</SelectItem>
                <SelectItem value="Cirurgia Urgência">Cirurgia Urgência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-black text-slate-600 uppercase">Categoria</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Particular">Particular</SelectItem>
                <SelectItem value="Convênio">Convênio</SelectItem>
                <SelectItem value="SUS">SUS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-black text-slate-600 uppercase">Mês</Label>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {availableMonths.map(m => (
                  <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase">Data</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase">Médico</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase">Hospital</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase">Tipo</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase">Categoria</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Valor</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase">Observações</th>
                <th className="px-6 py-4 text-center text-xs font-black text-slate-600 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProcedimentos.map((proc) => (
                <tr key={proc.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(proc.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{proc.doctor_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{proc.hospital_name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                      proc.type === 'Consulta' ? 'bg-blue-100 text-blue-700' :
                      proc.type === 'Cirurgia Eletiva' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {proc.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                      proc.category === 'Particular' ? 'bg-purple-100 text-purple-700' :
                      proc.category === 'Convênio' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {proc.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-slate-900">
                    R$ {(proc.value || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{proc.notes || '-'}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(proc)}
                        className="gap-1"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(proc)}
                        className="gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProcedimentos.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                    Nenhum procedimento encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProcedimento ? 'Editar Procedimento' : 'Novo Procedimento'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Médico *</Label>
                <Select
                  value={formData.doctor_id}
                  onValueChange={handleDoctorChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o médico" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Hospital</Label>
                <Select
                  value={formData.hospital_id}
                  onValueChange={handleHospitalChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o hospital" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Nenhum</SelectItem>
                    {hospitals.map(h => (
                      <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipo *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Consulta">Consulta</SelectItem>
                    <SelectItem value="Cirurgia Eletiva">Cirurgia Eletiva</SelectItem>
                    <SelectItem value="Cirurgia Urgência">Cirurgia Urgência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Particular">Particular</SelectItem>
                    <SelectItem value="Convênio">Convênio</SelectItem>
                    <SelectItem value="SUS">SUS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações adicionais..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingProcedimento ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmation
        isOpen={showDeleteConfirm}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setProcedimentoToDelete(null);
        }}
        onConfirm={confirmDelete}
        itemName={procedimentoToDelete?.type || 'procedimento'}
      />
    </div>
  );
}