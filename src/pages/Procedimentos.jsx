import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProcedimentoModal from '@/components/procedimentos/ProcedimentoModal';
import Toast from '@/components/common/Toast';
import { procedimentoQuantidade, procedimentoTotal, somaProcedimentos } from '@/lib/procedimentoTotals';
import { monthKeyFromDate, formatMonthLabel, formatDatePtBr } from '@/lib/dateKeys';

export default function Procedimentos() {
  const [message, setMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProcedimento, setEditingProcedimento] = useState(null);
  const [tipoModal, setTipoModal] = useState('Cirurgia');
  const [filters, setFilters] = useState({
    tipo: 'all',
    doctor: 'all',
    hospital: 'all',
    tipo_pagamento: 'all',
    mes: 'all'
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: procedimentos = [], isLoading } = useQuery({
    queryKey: ['procedimentos', user?.email],
    queryFn: async () => {
      const all = [];
      let cursor = null;
      let hasMore = true;
      while (hasMore) {
        const page = await base44.entities.Procedimento.filter({}, { sort: '-data', limit: 200, ...(cursor ? { cursor } : {}) });
        all.push(...page.items);
        hasMore = page.has_more;
        cursor = page.next_cursor;
        if (!cursor) break;
      }
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
      showToast('Procedimento cadastrado com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Procedimento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedimentos'] });
      showToast('Procedimento atualizado!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Procedimento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedimentos'] });
      showToast('Procedimento removido!');
    },
  });

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = (data) => {
    if (editingProcedimento) {
      updateMutation.mutate({ id: editingProcedimento.id, data });
    } else {
      createMutation.mutate(data);
    }
    setEditingProcedimento(null);
  };

  const handleEdit = (procedimento) => {
    setEditingProcedimento(procedimento);
    setTipoModal(procedimento.tipo);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja remover este procedimento?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewProcedimento = (tipo) => {
    setEditingProcedimento(null);
    setTipoModal(tipo);
    setShowModal(true);
  };

  const filteredProcedimentos = procedimentos.filter(p => {
    if (filters.tipo !== 'all' && p.tipo !== filters.tipo) return false;
    if (filters.doctor !== 'all' && p.doctor_id !== filters.doctor) return false;
    if (filters.hospital !== 'all' && p.hospital_id !== filters.hospital) return false;
    if (filters.tipo_pagamento !== 'all' && p.tipo_pagamento !== filters.tipo_pagamento) return false;
    if (filters.mes !== 'all' && monthKeyFromDate(p.data) !== filters.mes) return false;
    return true;
  });

  const cirurgias = filteredProcedimentos.filter(p => p.tipo === 'Cirurgia');
  const consultas = filteredProcedimentos.filter(p => p.tipo === 'Consulta');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 font-bold">A carregar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <Toast message={message?.text} type={message?.type} />

      <ProcedimentoModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingProcedimento(null);
        }}
        onSave={handleSave}
        doctors={doctors}
        hospitals={hospitals}
        initialData={editingProcedimento}
        tipo={tipoModal}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Procedimentos</h1>
            <p className="text-sm text-gray-600 mt-1">
              Faturamento dos procedimentos filtrados: <span className="font-bold text-gray-900">R$ {somaProcedimentos(filteredProcedimentos).toFixed(2)}</span>
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <CardTitle>Filtros</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Mês</label>
                <Select value={filters.mes} onValueChange={(v) => setFilters({ ...filters, mes: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Array.from(new Set(procedimentos.map(p => monthKeyFromDate(p.data)).filter(Boolean))).sort().reverse().map(mes => (
                      <SelectItem key={mes} value={mes}>{formatMonthLabel(mes)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Tipo</label>
                <Select value={filters.tipo} onValueChange={(v) => setFilters({ ...filters, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Cirurgia">Cirurgia</SelectItem>
                    <SelectItem value="Consulta">Consulta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Médico</label>
                <Select value={filters.doctor} onValueChange={(v) => setFilters({ ...filters, doctor: v })}>
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
                <label className="text-sm font-medium text-gray-700 mb-2 block">Hospital</label>
                <Select value={filters.hospital} onValueChange={(v) => setFilters({ ...filters, hospital: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {hospitals.map(h => (
                      <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Pagamento</label>
                <Select value={filters.tipo_pagamento} onValueChange={(v) => setFilters({ ...filters, tipo_pagamento: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="SUS">SUS</SelectItem>
                    <SelectItem value="Convenio">Convênio</SelectItem>
                    <SelectItem value="Particular">Particular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Cirurgias ({cirurgias.length}) · R$ {somaProcedimentos(cirurgias).toFixed(2)}</CardTitle>
              <Button onClick={() => handleNewProcedimento('Cirurgia')}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Cirurgia
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {cirurgias.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhuma cirurgia cadastrada</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Médico</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hospital</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pagamento</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qtd</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Unit.</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cirurgias.map(proc => (
                      <tr key={proc.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm text-gray-900">{formatDatePtBr(proc.data)}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{proc.doctor_name}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{proc.hospital_name}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            proc.tipo_pagamento === 'SUS' ? 'bg-blue-100 text-blue-800' :
                            proc.tipo_pagamento === 'Convenio' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {proc.tipo_pagamento}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{proc.descricao || '-'}</td>
                        <td className="px-4 py-4 text-sm text-right text-gray-900">{procedimentoQuantidade(proc)}</td>
                        <td className="px-4 py-4 text-sm text-right text-gray-600">R$ {proc.valor.toFixed(2)}</td>
                        <td className="px-4 py-4 text-sm text-right font-semibold text-gray-900">R$ {procedimentoTotal(proc).toFixed(2)}</td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(proc)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(proc.id)}>
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Consultas ({consultas.length}) · R$ {somaProcedimentos(consultas).toFixed(2)}</CardTitle>
              <Button onClick={() => handleNewProcedimento('Consulta')}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Consulta
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {consultas.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhuma consulta cadastrada</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Médico</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hospital</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pagamento</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qtd</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Unit.</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {consultas.map(proc => (
                      <tr key={proc.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm text-gray-900">{formatDatePtBr(proc.data)}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{proc.doctor_name}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{proc.hospital_name}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            proc.tipo_pagamento === 'SUS' ? 'bg-blue-100 text-blue-800' :
                            proc.tipo_pagamento === 'Convenio' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {proc.tipo_pagamento}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{proc.descricao || '-'}</td>
                        <td className="px-4 py-4 text-sm text-right text-gray-900">{procedimentoQuantidade(proc)}</td>
                        <td className="px-4 py-4 text-sm text-right text-gray-600">R$ {proc.valor.toFixed(2)}</td>
                        <td className="px-4 py-4 text-sm text-right font-semibold text-gray-900">R$ {procedimentoTotal(proc).toFixed(2)}</td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(proc)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(proc.id)}>
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}