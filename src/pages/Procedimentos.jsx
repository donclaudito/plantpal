import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Filter, List, Paperclip } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProcedimentoModal from '@/components/procedimentos/ProcedimentoModal';
import ProcedimentoTable from '@/components/procedimentos/ProcedimentoTable';
import CirurgiasPendentes from '@/components/procedimentos/CirurgiasPendentes';
import DadosFaltandoAlerta from '@/components/procedimentos/DadosFaltandoAlerta';
import ReciboEnvioModal from '@/components/procedimentos/ReciboEnvioModal';
import Toast from '@/components/common/Toast';
import { procedimentoTotal, somaProcedimentos } from '@/lib/procedimentoTotals';
import { monthKeyFromDate, formatMonthLabel } from '@/lib/dateKeys';
import { normalizarHospital, normalizarNome } from '@/lib/shiftFilters';
import { idMedicoPadrao } from '@/lib/defaultDoctor';

const SEM_HOSPITAL = '__sem-hospitais__';

export default function Procedimentos() {
  const [message, setMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProcedimento, setEditingProcedimento] = useState(null);
  const [tipoModal, setTipoModal] = useState('Cirurgia');
  const [view, setView] = useState('todas');
  const [reciboProcedimento, setReciboProcedimento] = useState(null);
  const [concluindoId, setConcluindoId] = useState(null);
  const [filters, setFilters] = useState({
    tipo: 'all',
    doctor: null,
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

  const handleAnexarDocumentos = async (procedimento, files) => {
    try {
      const anexos = [...(procedimento.anexos || [])];
      for (const file of files) {
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
        anexos.push({ nome: file.name, file_uri, enviado_em: new Date().toISOString() });
      }
      updateMutation.mutate({ id: procedimento.id, data: { anexos } });
      showToast('Documentos anexados à cirurgia!');
    } catch (e) {
      showToast('Não foi possível anexar os documentos.', 'error');
    }
  };

  const hospitalDoProcedimento = (procedimento) =>
    hospitals.find(h => h.id === procedimento?.hospital_id)
    || hospitals.find(h => normalizarHospital(h.name) === normalizarHospital(procedimento?.hospital_name))
    || null;

  const handleReciboEnviado = async (destinatario, resultado) => {
    const hospital = hospitalDoProcedimento(reciboProcedimento);
    setReciboProcedimento(null);
    if (hospital && destinatario && destinatario !== hospital.email) {
      await base44.entities.Hospital.update(hospital.id, { email: destinatario });
      queryClient.invalidateQueries({ queryKey: ['hospitals'] });
    }
    queryClient.invalidateQueries({ queryKey: ['procedimentos'] });
    showToast(`Recibo enviado para ${resultado?.destinatario || destinatario}!`);
  };

  const handleConcluir = async (procedimento, concluido) => {
    setConcluindoId(procedimento.id);
    try {
      await base44.entities.Procedimento.update(procedimento.id, { concluido });

      if (!concluido) {
        showToast('Procedimento reaberto.');
        return;
      }

      if (procedimento.recibo_enviado_em) {
        showToast('Procedimento concluído. O recibo já tinha sido enviado.');
        return;
      }

      const destinatario = hospitalDoProcedimento(procedimento)?.email;
      if (!destinatario) {
        showToast('Procedimento concluído, mas o hospital não tem e-mail para receber o recibo.', 'error');
        return;
      }

      const { data } = await base44.functions.invoke('enviarReciboProcedimento', {
        procedimento_id: procedimento.id,
        email_destino: destinatario,
      });
      if (data?.error) {
        showToast(data.error, 'error');
        return;
      }
      showToast(`Procedimento concluído e recibo enviado para ${data?.destinatario || destinatario}!`);
    } catch (e) {
      showToast('Não foi possível concluir o procedimento ou enviar o recibo.', 'error');
    } finally {
      setConcluindoId(null);
      queryClient.invalidateQueries({ queryKey: ['procedimentos'] });
    }
  };

  const nomeMedico = (procedimento) =>
    normalizarNome(procedimento.doctor_name) ||
    normalizarNome(doctors.find(d => d.id === procedimento.doctor_id)?.full_name);

  const nomeHospital = (procedimento) =>
    normalizarHospital(procedimento.hospital_name) ||
    normalizarHospital(hospitals.find(h => h.id === procedimento.hospital_id)?.name);

  const hospitalOptions = useMemo(() => {
    const mapa = new Map();
    hospitals.forEach(h => {
      const chave = normalizarHospital(h.name);
      if (chave && !mapa.has(chave)) mapa.set(chave, h.name);
    });
    procedimentos.forEach(p => {
      const chave = normalizarHospital(p.hospital_name);
      if (chave && !mapa.has(chave)) mapa.set(chave, p.hospital_name);
    });
    return Array.from(mapa, ([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt'));
  }, [hospitals, procedimentos]);

  const doctorFilter = filters.doctor ?? idMedicoPadrao(doctors);

  const filteredProcedimentos = procedimentos.filter(p => {
    if (filters.tipo !== 'all' && p.tipo !== filters.tipo) return false;
    if (doctorFilter !== 'all') {
      const alvo = normalizarNome(doctors.find(d => d.id === doctorFilter)?.full_name) || doctorFilter;
      if (nomeMedico(p) !== alvo) return false;
    }
    if (filters.hospital === SEM_HOSPITAL) {
      if (nomeHospital(p)) return false;
    } else if (filters.hospital !== 'all' && nomeHospital(p) !== filters.hospital) {
      return false;
    }
    if (filters.tipo_pagamento !== 'all' && p.tipo_pagamento !== filters.tipo_pagamento) return false;
    if (filters.mes !== 'all' && monthKeyFromDate(p.data) !== filters.mes) return false;
    return true;
  });

  const cirurgias = filteredProcedimentos.filter(p => p.tipo === 'Cirurgia');
  const consultas = filteredProcedimentos.filter(p => p.tipo === 'Consulta');
  const cirurgiasPendentes = cirurgias.filter(p => !(p.anexos || []).length);
  const semHospital = filteredProcedimentos.filter(p => !nomeHospital(p)).length;

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

      <ReciboEnvioModal
        procedimento={reciboProcedimento}
        hospital={hospitalDoProcedimento(reciboProcedimento)}
        onClose={() => setReciboProcedimento(null)}
        onSent={handleReciboEnviado}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Procedimentos</h1>
            <p className="text-sm text-gray-600 mt-1">
              Faturamento dos procedimentos filtrados: <span className="font-bold text-gray-900">R$ {somaProcedimentos(filteredProcedimentos).toFixed(2)}</span>
            </p>
          </div>
          <div className="flex gap-2 bg-white border border-gray-200 p-1.5 rounded-2xl w-fit">
            <Button variant={view === 'todas' ? 'default' : 'ghost'} size="sm" onClick={() => setView('todas')}>
              <List className="w-4 h-4 mr-2" />
              Todas
            </Button>
            <Button variant={view === 'pendentes' ? 'default' : 'ghost'} size="sm" onClick={() => setView('pendentes')}>
              <Paperclip className="w-4 h-4 mr-2" />
              Sem documentos ({cirurgiasPendentes.length})
            </Button>
          </div>
        </div>

        <DadosFaltandoAlerta procedimentos={procedimentos} onAbrir={handleEdit} />

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
                <Select value={doctorFilter} onValueChange={(v) => setFilters({ ...filters, doctor: v })}>
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
                    <SelectItem value={SEM_HOSPITAL}>
                      Sem hospital{semHospital > 0 ? ` (${semHospital})` : ''}
                    </SelectItem>
                    {hospitalOptions.map(h => (
                      <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
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

        {view === 'pendentes' ? (
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader>
              <CardTitle className="text-amber-800">
                Cirurgias pendentes de documentos ({cirurgiasPendentes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CirurgiasPendentes
                items={cirurgiasPendentes}
                onAnexar={handleAnexarDocumentos}
                onEdit={handleEdit}
              />
            </CardContent>
          </Card>
        ) : (
        <>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-green-800">Cirurgias ({cirurgias.length}) · R$ {somaProcedimentos(cirurgias).toFixed(2)}</CardTitle>
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
              <ProcedimentoTable items={cirurgias} tipo="Cirurgia" onEdit={handleEdit} onDelete={handleDelete} onEnviarRecibo={setReciboProcedimento} onConcluir={handleConcluir} concluindoId={concluindoId} />
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-orange-800">Consultas ({consultas.length}) · R$ {somaProcedimentos(consultas).toFixed(2)}</CardTitle>
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
              <ProcedimentoTable items={consultas} tipo="Consulta" onEdit={handleEdit} onDelete={handleDelete} onEnviarRecibo={setReciboProcedimento} onConcluir={handleConcluir} concluindoId={concluindoId} />
            )}
          </CardContent>
        </Card>
        </>
        )}
      </div>
    </div>
  );
}