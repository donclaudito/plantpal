import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Download, FileText, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Doctors() {
  const [showForm, setShowForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    specialty: '',
    phone: '',
    pix_account_holder: '',
    pix_cpf: '',
    pix_key: ''
  });
  const [importFile, setImportFile] = useState(null);
  const [selectedDoctors, setSelectedDoctors] = useState([]);
  const [usarEspecialidadeLivre, setUsarEspecialidadeLivre] = useState(false);

  const queryClient = useQueryClient();

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => base44.entities.Doctor.list('-created_date')
  });

  const { data: especialidades = [] } = useQuery({
    queryKey: ['especialidades'],
    queryFn: async () => {
      try {
        return await base44.entities.Especialidade.list('name');
      } catch (error) {
        // Entidade ainda não publicada no Base44: o campo volta a ser texto livre.
        console.error('Erro ao carregar especialidades:', error);
        return [];
      }
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Doctor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['doctors']);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Doctor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['doctors']);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Doctor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['doctors']);
    }
  });

  const resetForm = () => {
    setFormData({
      full_name: '',
      specialty: '',
      phone: '',
      pix_account_holder: '',
      pix_cpf: '',
      pix_key: ''
    });
    setEditingDoctor(null);
    setUsarEspecialidadeLivre(false);
    setShowForm(false);
  };

  const handleEdit = (doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      full_name: doctor.full_name,
      specialty: doctor.specialty,
      phone: doctor.phone || '',
      pix_account_holder: doctor.pix_account_holder || '',
      pix_cpf: doctor.pix_cpf || '',
      pix_key: doctor.pix_key || ''
    });
    setUsarEspecialidadeLivre(false);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingDoctor) {
      updateMutation.mutate({ id: editingDoctor.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleImportPix = () => {
    if (editingDoctor) {
      setFormData({
        ...formData,
        pix_account_holder: formData.full_name,
        pix_cpf: '',
        pix_key: ''
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

      const doctors = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const doctor = {};
        headers.forEach((header, index) => {
          if (values[index]) {
            doctor[header] = values[index];
          }
        });
        return doctor;
      }).filter(doctor => doctor.full_name && doctor.specialty);

      if (doctors.length === 0) {
        alert('Nenhum médico válido encontrado no arquivo. Certifique-se de que o CSV possui as colunas "full_name" e "specialty".');
        return;
      }

      await base44.entities.Doctor.bulkCreate(doctors);
      queryClient.invalidateQueries(['doctors']);
      alert(`${doctors.length} médico(s) importado(s) com sucesso!`);
      setImportFile(null);
    } catch (error) {
      alert('Erro ao importar arquivo: ' + error.message);
    }
  };

  const handleExport = () => {
    const headers = ['full_name', 'specialty', 'phone', 'pix_account_holder', 'pix_cpf', 'pix_key'];
    const csv = [
      headers.join(','),
      ...doctors.map(d => headers.map(h => d[h] || '').join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'medicos.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = () => {
    const template = 'full_name,specialty,phone,pix_account_holder,pix_cpf,pix_key\nJoão Silva,CIRURGIA GERAL,11999999999,João Silva,12345678900,joao@email.com';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_medicos.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const toggleSelectDoctor = (id) => {
    setSelectedDoctors(prev =>
      prev.includes(id) ? prev.filter(docId => docId !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    for (const id of selectedDoctors) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        console.error(`Erro ao deletar médico ${id}:`, error);
      }
    }
    setSelectedDoctors([]);
  };

  // Especialidades configuradas no módulo (apenas as ativas) + o valor atual do
  // médico, para não perder registos antigos que não estejam na lista.
  const specialtyOptions = (() => {
    const nomes = especialidades
      .filter((e) => e.ativo !== false && e.name)
      .map((e) => e.name.trim());
    const atuais = [...new Set([...nomes, formData.specialty, ...doctors.map((d) => d.specialty)])];
    const limpos = [...new Set(atuais.map((s) => (s || '').trim()).filter(Boolean))];
    const extras = limpos
      .filter((s) => !nomes.some((n) => n.toLowerCase() === s.toLowerCase()))
      .sort((a, b) => a.localeCompare(b));
    return { configuradas: nomes, extras };
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Cadastro de Médicos</h1>
          <Button onClick={() => setShowForm(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Adicionar Médico
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Importar Médicos</CardTitle>
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
              <CardTitle>Lista de Médicos</CardTitle>
              <div className="flex gap-2">
                {selectedDoctors.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleDeleteSelected} className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    Excluir ({selectedDoctors.length})
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
            ) : doctors.length === 0 ? (
              <p className="text-center text-gray-600">Nenhum médico cadastrado</p>
            ) : (
              <div className="space-y-2">
                {doctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedDoctors.includes(doctor.id)}
                        onChange={() => toggleSelectDoctor(doctor.id)}
                        className="w-4 h-4"
                      />
                      <div>
                        <div className="font-semibold text-gray-900">
                          {doctor.full_name} | {doctor.specialty}
                          {doctor.phone && <span className="text-gray-600"> | {doctor.phone}</span>}
                        </div>
                        {doctor.pix_account_holder && (
                          <div className="text-sm text-gray-600">
                            PIX: {doctor.pix_account_holder}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(doctor)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(doctor.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDoctor ? 'Editar Médico' : 'Adicionar Médico'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="full_name">Nome completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="specialty">Especialidade *</Label>
                {usarEspecialidadeLivre ? (
                  <Input
                    id="specialty"
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    placeholder="Digite a especialidade"
                    required
                    autoFocus
                  />
                ) : (
                  <Select
                    value={formData.specialty || undefined}
                    onValueChange={(value) => setFormData({ ...formData, specialty: value })}
                  >
                    <SelectTrigger id="specialty">
                      <SelectValue placeholder="Selecione a especialidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {specialtyOptions.configuradas.map((nome) => (
                        <SelectItem key={nome} value={nome}>
                          {nome}
                        </SelectItem>
                      ))}
                      {specialtyOptions.extras.map((nome) => (
                        <SelectItem key={`extra-${nome}`} value={nome}>
                          {nome} (fora do cadastro)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {specialtyOptions.configuradas.length === 0
                    ? 'Nenhuma especialidade configurada. Cadastre em "Especialidades" ou digite o valor.'
                    : 'Lista gerida em "Especialidades".'}
                </p>
                {!usarEspecialidadeLivre && (
                  <button
                    type="button"
                    onClick={() => setUsarEspecialidadeLivre(true)}
                    className="text-xs text-blue-600 hover:underline mt-1"
                  >
                    Não encontrou? Digitar especialidade
                  </button>
                )}
                <input type="hidden" required value={formData.specialty} readOnly />
              </div>

              <div>
                <Label htmlFor="phone">Telefone (opcional)</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <Label className="text-base">Dados PIX (Opcional)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleImportPix}>
                    Importar PIX
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="pix_account_holder">Nome do titular da conta</Label>
                    <Input
                      id="pix_account_holder"
                      value={formData.pix_account_holder}
                      onChange={(e) => setFormData({ ...formData, pix_account_holder: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="pix_cpf">CPF</Label>
                    <Input
                      id="pix_cpf"
                      value={formData.pix_cpf}
                      onChange={(e) => setFormData({ ...formData, pix_cpf: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="pix_key">Chave PIX</Label>
                    <Input
                      id="pix_key"
                      value={formData.pix_key}
                      onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                    />
                  </div>
                </div>
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