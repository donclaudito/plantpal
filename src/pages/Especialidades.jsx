import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Stethoscope, Plus, Edit, Trash2, Info } from 'lucide-react';
import Toast from '@/components/common/Toast';

const emptyForm = {
  name: '',
  descricao: '',
  ativo: true,
  observacoes: ''
};

export default function Especialidades() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [message, setMessage] = useState(null);

  const queryClient = useQueryClient();

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const { data: especialidades = [], isLoading } = useQuery({
    queryKey: ['especialidades'],
    queryFn: async () => {
      try {
        return await base44.entities.Especialidade.list('name');
      } catch (error) {
        // Entidade ainda não publicada no Base44: mostra lista vazia em vez de quebrar a página.
        console.error('Erro ao carregar especialidades:', error);
        return [];
      }
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Especialidade.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['especialidades'] });
      showToast('Especialidade criada com sucesso!');
      resetForm();
    },
    onError: (error) => showToast(error.message || 'Erro ao criar especialidade', 'error')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Especialidade.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['especialidades'] });
      showToast('Especialidade atualizada!');
      resetForm();
    },
    onError: (error) => showToast(error.message || 'Erro ao atualizar especialidade', 'error')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Especialidade.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['especialidades'] });
      showToast('Especialidade removida!');
    },
    onError: (error) => showToast(error.message || 'Erro ao remover especialidade', 'error')
  });

  const resetForm = () => {
    setFormData(emptyForm);
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (especialidade) => {
    setEditing(especialidade);
    setFormData({
      name: especialidade.name || '',
      descricao: especialidade.descricao || '',
      ativo: especialidade.ativo !== false,
      observacoes: especialidade.observacoes || ''
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const name = formData.name.trim();
    if (!name) {
      showToast('Informe o nome da especialidade', 'error');
      return;
    }

    const duplicada = especialidades.some(
      (e) => e.id !== editing?.id && (e.name || '').trim().toLowerCase() === name.toLowerCase()
    );
    if (duplicada) {
      showToast('Já existe uma especialidade com esse nome', 'error');
      return;
    }

    const payload = { ...formData, name };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (especialidade) => {
    if (confirm(`Tem certeza que deseja excluir a especialidade "${especialidade.name}"?`)) {
      deleteMutation.mutate(especialidade.id);
    }
  };

  const ativas = especialidades.filter((e) => e.ativo !== false).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <Toast message={message?.text} type={message?.type} />

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Especialidades</h1>
            <p className="text-gray-600 mt-1">
              Configure as especialidades médicas usadas no cadastro de médicos
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Nova Especialidade
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <Badge variant="secondary" className="text-sm">
            {especialidades.length} {especialidades.length === 1 ? 'cadastrada' : 'cadastradas'}
          </Badge>
          <Badge className="text-sm bg-green-600 hover:bg-green-600">
            {ativas} {ativas === 1 ? 'ativa' : 'ativas'}
          </Badge>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="text-center py-12 text-gray-500">Carregando...</CardContent>
          </Card>
        ) : especialidades.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Stethoscope className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Nenhuma especialidade cadastrada ainda</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeira Especialidade
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {especialidades.map((especialidade) => (
              <Card key={especialidade.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Stethoscope className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <span className="truncate">{especialidade.name}</span>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(especialidade)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(especialidade)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Badge
                    variant={especialidade.ativo === false ? 'secondary' : 'default'}
                    className={especialidade.ativo === false ? '' : 'bg-green-600 hover:bg-green-600'}
                  >
                    {especialidade.ativo === false ? 'Inativa' : 'Ativa'}
                  </Badge>

                  {especialidade.descricao && (
                    <p className="text-sm text-gray-700">{especialidade.descricao}</p>
                  )}

                  {especialidade.observacoes && (
                    <div className="flex items-start gap-2 text-sm text-gray-600 mt-2 pt-2 border-t">
                      <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <p className="italic">{especialidade.observacoes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Especialidade' : 'Nova Especialidade'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da especialidade *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: CIRURGIA GERAL"
                  required
                />
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Breve descrição da especialidade"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="ativo" className="cursor-pointer">Ativa</Label>
                  <p className="text-sm text-gray-500">
                    Especialidades inativas não aparecem para seleção no cadastro de médicos.
                  </p>
                </div>
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                />
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Informações adicionais"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Salvando...'
                    : editing
                      ? 'Salvar Alterações'
                      : 'Criar Especialidade'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
