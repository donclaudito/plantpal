import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Toast from '@/components/common/Toast';

export default function Settings() {
  const [message, setMessage] = useState(null);
  const [editingValor, setEditingValor] = useState(null);
  const [editingDesconto, setEditingDesconto] = useState(null);
  const [showValorForm, setShowValorForm] = useState(false);
  const [showDescontoForm, setShowDescontoForm] = useState(false);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors', user?.email],
    queryFn: async () => {
      const all = await base44.entities.Doctor.list('full_name');
      return all.filter(d => d.created_by === user?.email);
    },
    enabled: !!user,
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ['hospitals', user?.email],
    queryFn: async () => {
      const all = await base44.entities.Hospital.list('name');
      return all.filter(h => h.created_by === user?.email);
    },
    enabled: !!user,
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

  const createValorMutation = useMutation({
    mutationFn: (data) => base44.entities.ConfiguracaoPlantao.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configValores'] });
      setShowValorForm(false);
      setEditingValor(null);
      showToast('Configuração salva!');
    },
  });

  const updateValorMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ConfiguracaoPlantao.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configValores'] });
      setEditingValor(null);
      showToast('Configuração atualizada!');
    },
  });

  const deleteValorMutation = useMutation({
    mutationFn: (id) => base44.entities.ConfiguracaoPlantao.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configValores'] });
      showToast('Configuração removida!');
    },
  });

  const createDescontoMutation = useMutation({
    mutationFn: (data) => base44.entities.ConfiguracaoDesconto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configDescontos'] });
      setShowDescontoForm(false);
      setEditingDesconto(null);
      showToast('Desconto salvo!');
    },
  });

  const updateDescontoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ConfiguracaoDesconto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configDescontos'] });
      setEditingDesconto(null);
      showToast('Desconto atualizado!');
    },
  });

  const deleteDescontoMutation = useMutation({
    mutationFn: (id) => base44.entities.ConfiguracaoDesconto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configDescontos'] });
      showToast('Desconto removido!');
    },
  });

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const getDoctorName = (id) => doctors.find(d => d.id === id)?.full_name || 'Global';
  const getHospitalName = (id) => hospitals.find(h => h.id === id)?.name || 'Global';

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-bold">A carregar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <Toast message={message?.text} type={message?.type} />
      
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Valores dos Plantões</CardTitle>
              <Button onClick={() => setShowValorForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Configuração
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showValorForm && (
              <ValorForm
                doctors={doctors}
                hospitals={hospitals}
                onSave={(data) => createValorMutation.mutate(data)}
                onCancel={() => setShowValorForm(false)}
              />
            )}

            <div className="space-y-4 mt-4">
              {configValores.map((config) => (
                <div key={config.id} className="p-4 border rounded-lg bg-white">
                  {editingValor?.id === config.id ? (
                    <ValorForm
                      doctors={doctors}
                      hospitals={hospitals}
                      initialData={config}
                      onSave={(data) => updateValorMutation.mutate({ id: config.id, data })}
                      onCancel={() => setEditingValor(null)}
                    />
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-bold text-lg">
                            {config.doctor_id ? getDoctorName(config.doctor_id) : 'Todos os médicos'} • 
                            {config.hospital_id ? getHospitalName(config.hospital_id) : 'Todos os hospitais'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingValor(config)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteValorMutation.mutate(config.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">6 horas</p>
                          <p className="font-bold">R$ {config.valor_6h?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">12 horas</p>
                          <p className="font-bold">R$ {config.valor_12h?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Retaguarda</p>
                          <p className="font-bold">R$ {config.valor_retaguarda?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Coordenador</p>
                          <p className="font-bold">R$ {config.valor_coordenador?.toFixed(2) || '0.00'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Descontos</CardTitle>
              <Button onClick={() => setShowDescontoForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Desconto
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showDescontoForm && (
              <DescontoForm
                doctors={doctors}
                hospitals={hospitals}
                onSave={(data) => createDescontoMutation.mutate(data)}
                onCancel={() => setShowDescontoForm(false)}
              />
            )}

            <div className="space-y-4 mt-4">
              {configDescontos.map((config) => (
                <div key={config.id} className="p-4 border rounded-lg bg-white">
                  {editingDesconto?.id === config.id ? (
                    <DescontoForm
                      doctors={doctors}
                      hospitals={hospitals}
                      initialData={config}
                      onSave={(data) => updateDescontoMutation.mutate({ id: config.id, data })}
                      onCancel={() => setEditingDesconto(null)}
                    />
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-lg">
                          {config.doctor_id ? getDoctorName(config.doctor_id) : 'Todos os médicos'} • 
                          {config.hospital_id ? getHospitalName(config.hospital_id) : 'Todos os hospitais'}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{config.descricao}</p>
                        <p className="text-lg font-bold text-red-600 mt-2">
                          {config.tipo_desconto === 'percentual' ? `${config.valor_desconto}%` : `R$ ${config.valor_desconto.toFixed(2)}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingDesconto(config)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteDescontoMutation.mutate(config.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ValorForm({ doctors, hospitals, initialData, onSave, onCancel }) {
  const [formData, setFormData] = useState(initialData || {
    doctor_id: '',
    hospital_id: '',
    valor_6h: 0,
    valor_12h: 0,
    valor_retaguarda: 0,
    valor_coordenador: 0,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-slate-50 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Médico (opcional)</Label>
          <Select value={formData.doctor_id || 'global'} onValueChange={(v) => setFormData({ ...formData, doctor_id: v === 'global' ? '' : v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Todos os médicos</SelectItem>
              {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Hospital (opcional)</Label>
          <Select value={formData.hospital_id || 'global'} onValueChange={(v) => setFormData({ ...formData, hospital_id: v === 'global' ? '' : v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Todos os hospitais</SelectItem>
              {hospitals.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <Label>Valor 6h</Label>
          <Input type="number" step="0.01" value={formData.valor_6h} onChange={(e) => setFormData({ ...formData, valor_6h: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <Label>Valor 12h</Label>
          <Input type="number" step="0.01" value={formData.valor_12h} onChange={(e) => setFormData({ ...formData, valor_12h: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <Label>Valor Retaguarda</Label>
          <Input type="number" step="0.01" value={formData.valor_retaguarda} onChange={(e) => setFormData({ ...formData, valor_retaguarda: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <Label>Valor Coordenador</Label>
          <Input type="number" step="0.01" value={formData.valor_coordenador} onChange={(e) => setFormData({ ...formData, valor_coordenador: parseFloat(e.target.value) || 0 })} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit">
          <Save className="w-4 h-4 mr-2" />
          Salvar
        </Button>
      </div>
    </form>
  );
}

function DescontoForm({ doctors, hospitals, initialData, onSave, onCancel }) {
  const [formData, setFormData] = useState(initialData || {
    doctor_id: '',
    hospital_id: '',
    tipo_desconto: 'percentual',
    valor_desconto: 0,
    descricao: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-slate-50 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Médico (opcional)</Label>
          <Select value={formData.doctor_id || 'global'} onValueChange={(v) => setFormData({ ...formData, doctor_id: v === 'global' ? '' : v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Todos os médicos</SelectItem>
              {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Hospital (opcional)</Label>
          <Select value={formData.hospital_id || 'global'} onValueChange={(v) => setFormData({ ...formData, hospital_id: v === 'global' ? '' : v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Todos os hospitais</SelectItem>
              {hospitals.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Tipo de Desconto</Label>
          <Select value={formData.tipo_desconto} onValueChange={(v) => setFormData({ ...formData, tipo_desconto: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentual">Percentual (%)</SelectItem>
              <SelectItem value="valor_fixo">Valor Fixo (R$)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Valor do Desconto</Label>
          <Input type="number" step="0.01" value={formData.valor_desconto} onChange={(e) => setFormData({ ...formData, valor_desconto: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <Label>Descrição</Label>
          <Input value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} placeholder="Ex: Desconto INSS" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit">
          <Save className="w-4 h-4 mr-2" />
          Salvar
        </Button>
      </div>
    </form>
  );
}