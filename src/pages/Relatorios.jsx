import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { formatMonthLabel, monthKeyFromDate } from '@/lib/dateKeys';
import { normalizarNome, normalizarHospital } from '@/lib/shiftFilters';
import { resumirPorMes, resumoDoMes } from '@/lib/relatorioMensal';
import RelatorioFiltros from '@/components/relatorios/RelatorioFiltros';
import RelatorioTotais from '@/components/relatorios/RelatorioTotais';
import GanhosMensais from '@/components/relatorios/GanhosMensais';
import DetalhamentoFinanceiro from '@/components/relatorios/DetalhamentoFinanceiro';

export default function Relatorios() {
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedHospital, setSelectedHospital] = useState('all');
  const [selectedDoctor, setSelectedDoctor] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
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

  const { data: shifts = [], isPending: loadingShifts } = useQuery({
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

  const mesSelecionado = selectedMonth !== 'all';

  const { data: financialData, isPending: loadingFinance, error: financeError, refetch: reloadFinance } = useQuery({
    queryKey: ['finance', 'reports', user?.email, selectedMonth, selectedHospital, selectedDoctor],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-').map(Number);
      return (await base44.functions.invoke('getShiftFinance', { year, month, doctor: selectedDoctor, hospital: selectedHospital })).data;
    },
    enabled: !!user && mesSelecionado,
  });

  const reports = financialData?.reports || { totals: { bruto: 0, descontos: 0, liquido: 0, numShifts: 0 }, byHospital: [], byDoctor: [], byDoctorHospital: [] };

  const mesmoMedico = (nome) => selectedDoctor === 'all' || normalizarNome(nome) === normalizarNome(selectedDoctor);
  const mesmoHospital = (nome) => selectedHospital === 'all' || normalizarHospital(nome) === normalizarHospital(selectedHospital);
  const noMes = (data) => selectedMonth === 'all' || monthKeyFromDate(data) === selectedMonth;

  const plantoesFiltrados = useMemo(
    () => shifts.filter((s) => mesmoMedico(s.doctor_name) && mesmoHospital(s.hospital) && noMes(s.date)),
    [shifts, selectedDoctor, selectedHospital, selectedMonth]
  );

  const cirurgiasFiltradas = useMemo(
    () => cirurgias.filter((p) => mesmoMedico(p.doctor_name) && mesmoHospital(p.hospital_name) && noMes(p.data)),
    [cirurgias, selectedDoctor, selectedHospital, selectedMonth]
  );

  const resumo = useMemo(
    () => resumirPorMes({ shifts: plantoesFiltrados, procedimentos: cirurgiasFiltradas }),
    [plantoesFiltrados, cirurgiasFiltradas]
  );

  const totaisDoMes = resumoDoMes(resumo, selectedMonth);

  const meses = useMemo(() => {
    const chaves = new Set([
      ...shifts.map((s) => monthKeyFromDate(s.date)),
      ...cirurgias.map((p) => monthKeyFromDate(p.data)),
      ...(financialData?.availableMonths || []),
    ]);
    return Array.from(chaves).filter(Boolean).sort().reverse();
  }, [shifts, cirurgias, financialData]);

  const periodoLabel = selectedMonth === 'all' ? 'todos os meses' : formatMonthLabel(selectedMonth);

  const exportCSV = () => {
    let csv = 'RELATÓRIO DE PLANTÕES E CIRURGIAS\n';
    csv += `Período: ${periodoLabel}\n`;
    csv += `Médico: ${selectedDoctor === 'all' ? 'Todos' : selectedDoctor}\n`;
    csv += `Hospital: ${selectedHospital === 'all' ? 'Todos' : selectedHospital}\n\n`;

    csv += '--- GANHOS POR MÊS ---\n';
    csv += 'Mês,Plantões,Valor Plantões,Cirurgias,Valor Cirurgias,Total\n';
    resumo.rows.forEach((row) => {
      csv += `"${formatMonthLabel(row.mes)}",${row.plantoes},${row.valorPlantoes.toFixed(2)},${row.cirurgias},${row.valorCirurgias.toFixed(2)},${(row.valorPlantoes + row.valorCirurgias).toFixed(2)}\n`;
    });
    csv += `"TOTAL",${resumo.totais.plantoes},${resumo.totais.valorPlantoes.toFixed(2)},${resumo.totais.cirurgias},${resumo.totais.valorCirurgias.toFixed(2)},${resumo.totalGeral.toFixed(2)}\n`;

    if (mesSelecionado) {
      csv += '\n--- POR HOSPITAL ---\n';
      csv += 'Hospital,Nº Médicos,Nº Plantões,Valor Bruto,Descontos,Valor Líquido\n';
      reports.byHospital.forEach((h) => {
        csv += `"${h.name}",${h.doctorCount},${h.numPlantoes},${h.valorBruto.toFixed(2)},${h.valorDescontos.toFixed(2)},${h.valorLiquido.toFixed(2)}\n`;
      });

      csv += '\n--- POR MÉDICO ---\n';
      csv += 'Médico,Nº Hospitais,Nº Plantões,Valor Bruto,Descontos,Valor Líquido\n';
      reports.byDoctor.forEach((d) => {
        csv += `"${d.name}",${d.hospitalCount},${d.numPlantoes},${d.valorBruto.toFixed(2)},${d.valorDescontos.toFixed(2)},${d.valorLiquido.toFixed(2)}\n`;
      });

      csv += '\n--- POR MÉDICO E HOSPITAL ---\n';
      csv += 'Médico,Hospital,Nº Plantões,Valor Bruto,Descontos,Valor Líquido\n';
      reports.byDoctorHospital.forEach((dh) => {
        csv += `"${dh.doctor}","${dh.hospital}",${dh.numPlantoes},${dh.valorBruto.toFixed(2)},${dh.valorDescontos.toFixed(2)},${dh.valorLiquido.toFixed(2)}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${selectedMonth === 'all' ? 'todos-os-meses' : selectedMonth}.csv`;
    link.click();
  };

  if (!user || loadingShifts || loadingCirurgias) {
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
        <div>
          <h1 className="text-3xl font-black text-slate-900">Relatórios</h1>
          <p className="text-sm text-slate-600 mt-1">
            Total de plantões e cirurgias por mês — {periodoLabel}
          </p>
        </div>
        <Button onClick={exportCSV} className="gap-2 bg-green-600 hover:bg-green-700">
          <Download size={16} />
          Exportar CSV
        </Button>
      </div>

      <RelatorioFiltros
        months={meses}
        month={selectedMonth}
        onMonthChange={setSelectedMonth}
        doctors={doctors}
        doctor={selectedDoctor}
        onDoctorChange={setSelectedDoctor}
        hospitals={hospitals}
        hospital={selectedHospital}
        onHospitalChange={setSelectedHospital}
      />

      <RelatorioTotais
        plantoes={{ quantidade: totaisDoMes.plantoes, valor: totaisDoMes.valorPlantoes }}
        cirurgias={{ quantidade: totaisDoMes.cirurgias, valor: totaisDoMes.valorCirurgias }}
        total={totaisDoMes.valorPlantoes + totaisDoMes.valorCirurgias}
        periodo={periodoLabel}
      />

      <GanhosMensais resumo={resumo} selectedMonth={selectedMonth} />

      {mesSelecionado ? (
        <DetalhamentoFinanceiro
          reports={reports}
          loading={loadingFinance}
          error={financeError}
          onRetry={reloadFinance}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6">
          <h2 className="text-lg font-black text-slate-900">Detalhamento financeiro dos plantões</h2>
          <p className="text-sm text-slate-500 mt-2">
            Selecione um mês para ver o detalhamento por hospital, por médico e por médico e hospital.
          </p>
        </div>
      )}
    </div>
  );
}