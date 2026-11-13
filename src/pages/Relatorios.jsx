import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { formatQuantity } from '@/lib/quantity';
import { MEDICO_PADRAO } from '@/lib/defaultDoctor';
import HospitalGanhos from '@/components/relatorios/HospitalGanhos';
import GanhosMensais from '@/components/relatorios/GanhosMensais';
import { normalizarNome, normalizarHospital } from '@/lib/shiftFilters';

export default function Relatorios() {
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [selectedHospital, setSelectedHospital] = useState('all');
  const [selectedDoctor, setSelectedDoctor] = useState(MEDICO_PADRAO);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: financialData, isPending: loadingFinance, error: financeError, refetch: reloadFinance } = useQuery({
    queryKey: ['finance', 'reports', user?.email, selectedMonth, selectedHospital, selectedDoctor],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-').map(Number);
      return (await base44.functions.invoke('getShiftFinance', { year, month, doctor: selectedDoctor, hospital: selectedHospital })).data;
    },
    enabled: !!user,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors', user?.email],
    queryFn: () => base44.entities.Doctor.list('full_name'),
    enabled: !!user,
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ['hospitals', user?.email],
    queryFn: () => base44.entities.Hospital.list('name'),
    enabled: !!user,
  });

  const { data: shifts = [], isPending: loadingGanhos } = useQuery({
    queryKey: ['shifts', 'relatorios', user?.email],
    queryFn: async () => {
      const todos = [];
      let cursor = null;
      do {
        const page = await base44.entities.Shift.filter({}, { sort: '-date', limit: 200, ...(cursor ? { cursor } : {}) });
        todos.push(...page.items);
        cursor = page.has_more ? page.next_cursor : null;
      } while (cursor);
      return todos;
    },
    enabled: !!user,
  });

  const { data: cirurgias = [], isPending: loadingCirurgias } = useQuery({
    queryKey: ['cirurgias', 'relatorios', user?.email],
    queryFn: async () => {
      const todas = [];
      let cursor = null;
      do {
        const page = await base44.entities.Procedimento.filter({ tipo: 'Cirurgia' }, { sort: '-data', limit: 200, ...(cursor ? { cursor } : {}) });
        todas.push(...page.items);
        cursor = page.has_more ? page.next_cursor : null;
      } while (cursor);
      return todas;
    },
    enabled: !!user,
  });

  const reports = financialData?.reports || { totals: { bruto: 0, descontos: 0, liquido: 0, numShifts: 0 }, byHospital: [], byDoctor: [], byDoctorHospital: [] };
  const availableMonths = financialData?.availableMonths || [];

  const mesmoMedico = (nome) =>
    selectedDoctor === 'all' || normalizarNome(nome) === normalizarNome(selectedDoctor);
  const mesmoHospital = (nome) =>
    selectedHospital === 'all' || normalizarHospital(nome) === normalizarHospital(selectedHospital);

  const plantoesFiltrados = shifts.filter((s) => mesmoMedico(s.doctor_name) && mesmoHospital(s.hospital));
  const cirurgiasFiltradas = cirurgias.filter((p) => mesmoMedico(p.doctor_name) && mesmoHospital(p.hospital_name));

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const exportCSV = () => {
    let csv = 'RELATÓRIO DE PLANTÕES\n';
    csv += `Mês: ${formatMonth(selectedMonth)}\n\n`;

    csv += '--- POR HOSPITAL ---\n';
    csv += 'Hospital,Nº Médicos,Nº Plantões,Valor Bruto,Descontos,Valor Líquido\n';
    reports.byHospital.forEach(h => {
      csv += `"${h.name}",${h.doctorCount},${h.numPlantoes},${h.valorBruto.toFixed(2)},${h.valorDescontos.toFixed(2)},${h.valorLiquido.toFixed(2)}\n`;
    });

    csv += '\n--- POR MÉDICO ---\n';
    csv += 'Médico,Nº Hospitais,Nº Plantões,Valor Bruto,Descontos,Valor Líquido\n';
    reports.byDoctor.forEach(d => {
      csv += `"${d.name}",${d.hospitalCount},${d.numPlantoes},${d.valorBruto.toFixed(2)},${d.valorDescontos.toFixed(2)},${d.valorLiquido.toFixed(2)}\n`;
    });

    csv += '\n--- POR MÉDICO E HOSPITAL ---\n';
    csv += 'Médico,Hospital,Nº Plantões,Valor Bruto,Descontos,Valor Líquido\n';
    reports.byDoctorHospital.forEach(dh => {
      csv += `"${dh.doctor}","${dh.hospital}",${dh.numPlantoes},${dh.valorBruto.toFixed(2)},${dh.valorDescontos.toFixed(2)},${dh.valorLiquido.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${selectedMonth}.csv`;
    link.click();
  };

  if (financeError) return <div className="p-6 space-y-3"><p role="alert" className="text-destructive">Não foi possível carregar o relatório: {financeError.message}</p><Button onClick={() => reloadFinance()}>Tentar novamente</Button></div>;

  if (!user || loadingFinance || loadingGanhos || loadingCirurgias) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-bold">A carregar relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-slate-900">Relatórios</h1>
        <Button onClick={exportCSV} className="gap-2 bg-green-600 hover:bg-green-700">
          <Download size={16} />
          Exportar CSV
        </Button>
      </div>

      {/* Totais Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md">
          <p className="text-xs font-black text-slate-600 uppercase mb-2">Nº Plantões</p>
          <p className="text-3xl font-black text-slate-900">{reports.totals.numShifts}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md">
          <p className="text-xs font-black text-slate-600 uppercase mb-2">Total Custo Bruto</p>
          <p className="text-3xl font-black text-slate-900">R$ {reports.totals.bruto.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md">
          <p className="text-xs font-black text-slate-600 uppercase mb-2">Total Descontos</p>
          <p className="text-3xl font-black text-red-600">R$ {reports.totals.descontos.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md">
          <p className="text-xs font-black text-slate-600 uppercase mb-2">Total Custo Líquido</p>
          <p className="text-3xl font-black text-blue-600">R$ {reports.totals.liquido.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-600 uppercase mb-2">Mês</label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map(month => (
                  <SelectItem key={month} value={month}>{formatMonth(month)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-600 uppercase mb-2">Hospital</label>
            <Select value={selectedHospital} onValueChange={setSelectedHospital}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {hospitals.map(h => (
                  <SelectItem key={h.id} value={h.name}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-600 uppercase mb-2">Médico</label>
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {doctors.map(d => (
                  <SelectItem key={d.id} value={d.full_name}>{d.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <GanhosMensais
        shifts={plantoesFiltrados}
        procedimentos={cirurgiasFiltradas}
        selectedMonth={selectedMonth}
      />

      <HospitalGanhos summary={financialData?.summary || []} />

      {/* Relatório por Hospital */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-slate-100 border-b border-slate-200">
          <h2 className="text-lg font-black text-slate-900">Por Hospital</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase">Hospital</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Nº Médicos</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Nº Plantões</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Valor Bruto</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Descontos</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Valor Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reports.byHospital.map((h, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{h.name}</td>
                  <td className="px-6 py-4 text-sm text-right text-slate-600">{h.doctorCount}</td>
                  <td className="px-6 py-4 text-sm text-right text-slate-600">{formatQuantity(h.numPlantoes)}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-slate-900">R$ {h.valorBruto.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right text-red-600">R$ {h.valorDescontos.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">R$ {h.valorLiquido.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Relatório por Médico */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-slate-100 border-b border-slate-200">
          <h2 className="text-lg font-black text-slate-900">Por Médico</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase">Médico</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Nº Hospitais</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Nº Plantões</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Valor Bruto</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Descontos</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Valor Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reports.byDoctor.map((d, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{d.name}</td>
                  <td className="px-6 py-4 text-sm text-right text-slate-600">{d.hospitalCount}</td>
                  <td className="px-6 py-4 text-sm text-right text-slate-600">{formatQuantity(d.numPlantoes)}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-slate-900">R$ {d.valorBruto.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right text-red-600">R$ {d.valorDescontos.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">R$ {d.valorLiquido.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Relatório por Médico e Hospital */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-slate-100 border-b border-slate-200">
          <h2 className="text-lg font-black text-slate-900">Por Médico e Hospital</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase">Médico</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase">Hospital</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Nº Plantões</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Valor Bruto</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Descontos</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Valor Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reports.byDoctorHospital.map((dh, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{dh.doctor}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{dh.hospital}</td>
                  <td className="px-6 py-4 text-sm text-right text-slate-600">{formatQuantity(dh.numPlantoes)}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-slate-900">R$ {dh.valorBruto.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right text-red-600">R$ {dh.valorDescontos.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">R$ {dh.valorLiquido.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}