import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Download, Upload, FileText, Edit, Trash2, Calendar, LayoutGrid, List } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Shifts() {
  const [showForm, setShowForm] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    doctor_id: '',
    doctor_name: '',
    hospital: '',
    shift_type: 'Diurno',
    value: '',
    status: 'Agendado',
    notes: ''
  });
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedShifts, setSelectedShifts] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

  const queryClient = useQueryClient();

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-date')
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => base44.entities.Doctor.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Shift.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts']);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts']);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Shift.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts']);
    }
  });

  const resetForm = () => {
    setFormData({
      date: '',
      doctor_id: '',
      doctor_name: '',
      hospital: '',
      shift_type: 'Diurno',
      value: '',
      status: 'Agendado',
      notes: ''
    });
    setEditingShift(null);
    setShowForm(false);
  };

  const handleEdit = (shift) => {
    setEditingShift(shift);
    setFormData({
      date: shift.date,
      doctor_id: shift.doctor_id || '',
      doctor_name: shift.doctor_name,
      hospital: shift.hospital,
      shift_type: shift.shift_type || 'Diurno',
      value: shift.value.toString(),
      status: shift.status || 'Agendado',
      notes: shift.notes || ''
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      value: parseFloat(formData.value)
    };
    if (editingShift) {
      updateMutation.mutate({ id: editingShift.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDoctorSelect = (doctorId) => {
    const doctor = doctors.find(d => d.id === doctorId);
    if (doctor) {
      setFormData({
        ...formData,
        doctor_id: doctor.id,
        doctor_name: doctor.full_name
      });
    }
  };

  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());

      const shifts = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const shift = {};
        headers.forEach((header, index) => {
          if (values[index]) {
            if (header === 'value') {
              shift[header] = parseFloat(values[index]);
            } else {
              shift[header] = values[index];
            }
          }
        });
        return shift;
      }).filter(shift => shift.date && shift.doctor_name && shift.hospital && shift.value);

      if (shifts.length === 0) {
        alert('Nenhum plantão válido encontrado no arquivo.');
        return;
      }

      await base44.entities.Shift.bulkCreate(shifts);
      queryClient.invalidateQueries(['shifts']);
      alert(`${shifts.length} plantão(ões) importado(s) com sucesso!`);
    } catch (error) {
      alert('Erro ao importar arquivo: ' + error.message);
    }
  };

  const handleExport = () => {
    const headers = ['date', 'doctor_name', 'hospital', 'shift_type', 'value', 'status', 'notes'];
    const csv = [
      headers.join(','),
      ...shifts.map(s => headers.map(h => s[h] || '').join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantoes.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = () => {
    const template = 'date,doctor_name,hospital,shift_type,value,status,notes\n2026-02-10,João Silva,Hospital Central,Diurno,1500,Agendado,';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_plantoes.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const toggleSelectShift = (id) => {
    setSelectedShifts(prev =>
      prev.includes(id) ? prev.filter(shiftId => shiftId !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    for (const id of selectedShifts) {
      await deleteMutation.mutateAsync(id);
    }
    setSelectedShifts([]);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Agendado': 'bg-blue-100 text-blue-800',
      'Realizado': 'bg-green-100 text-green-800',
      'Cancelado': 'bg-red-100 text-red-800',
      'Pago': 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredShifts = filterStatus === 'all' 
    ? shifts 
    : shifts.filter(s => s.status === filterStatus);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Plantões</h1>
          <Button onClick={() => setShowForm(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Adicionar Plantão
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total de Plantões</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{shifts.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Valor Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                R$ {shifts.reduce((sum, s) => sum + (s.value || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Agendados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">
                {shifts.filter(s => s.status === 'Agendado').length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Importar Plantões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileImport}
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
                  <FileText className="w-4 h-4" />
                  Modelo
                </Button>
              </div>
              <p className="text-sm text-gray-600">💡 Dica: Use o botão "Modelo" para descarregar exemplo.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Lista de Plantões</CardTitle>
              <div className="flex gap-2">
                <div className="flex border rounded-lg">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-r-none"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-l-none"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filtrar Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Agendado">Agendado</SelectItem>
                    <SelectItem value="Realizado">Realizado</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
                {selectedShifts.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleDeleteSelected} className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    Excluir ({selectedShifts.length})
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                  <Download className="w-4 h-4" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-gray-600">Carregando...</p>
            ) : filteredShifts.length === 0 ? (
              <p className="text-center text-gray-600">Nenhum plantão encontrado</p>
            ) : viewMode === 'list' ? (
              <div className="space-y-2">
                {filteredShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedShifts.includes(shift.id)}
                        onChange={() => toggleSelectShift(shift.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="font-semibold text-gray-900">
                            {format(new Date(shift.date), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                          <Badge className={getStatusColor(shift.status)}>
                            {shift.status}
                          </Badge>
                          {shift.shift_type && (
                            <Badge variant="outline">{shift.shift_type}</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">{shift.doctor_name}</span> - {shift.hospital}
                        </div>
                        <div className="text-sm font-semibold text-green-600 mt-1">
                          R$ {shift.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        {shift.notes && (
                          <div className="text-xs text-gray-500 mt-1">{shift.notes}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(shift)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(shift.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredShifts.map((shift) => (
                  <Card key={shift.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <input
                          type="checkbox"
                          checked={selectedShifts.includes(shift.id)}
                          onChange={() => toggleSelectShift(shift.id)}
                          className="w-4 h-4 mt-1"
                        />
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(shift)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(shift.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-lg flex items-center gap-2 mt-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        {format(new Date(shift.date), "dd/MM/yyyy", { locale: ptBR })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Médico</div>
                        <div className="font-semibold">{shift.doctor_name}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Hospital</div>
                        <div className="text-sm">{shift.hospital}</div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge className={getStatusColor(shift.status)}>
                          {shift.status}
                        </Badge>
                        {shift.shift_type && (
                          <Badge variant="outline">{shift.shift_type}</Badge>
                        )}
                      </div>
                      <div className="pt-2 border-t">
                        <div className="text-sm font-semibold text-green-600">
                          R$ {shift.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      {shift.notes && (
                        <div className="text-xs text-gray-500 italic pt-2 border-t">
                          {shift.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingShift ? 'Editar Plantão' : 'Adicionar Plantão'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="shift_type">Tipo de Plantão</Label>
                  <Select
                    value={formData.shift_type}
                    onValueChange={(value) => setFormData({ ...formData, shift_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Diurno">Diurno</SelectItem>
                      <SelectItem value="Noturno">Noturno</SelectItem>
                      <SelectItem value="24h">24h</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="doctor">Médico *</Label>
                <Select
                  value={formData.doctor_id}
                  onValueChange={handleDoctorSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um médico" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.full_name} - {doctor.specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="hospital">Hospital *</Label>
                <Input
                  id="hospital"
                  value={formData.hospital}
                  onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="value">Valor (R$) *</Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Agendado">Agendado</SelectItem>
                      <SelectItem value="Realizado">Realizado</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                      <SelectItem value="Pago">Pago</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Salvar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}