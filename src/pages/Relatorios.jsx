import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function Relatorios() {
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [selectedHospital, setSelectedHospital] = useState('all');
  const [selectedDoctor, setSelectedDoctor] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', user?.email],
    queryFn: () => base44.entities.Shift.list('-date'),
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

  const { data: configValores = [] } = useQuery({
    queryKey: ['configValores', user?.email],
    queryFn: () => base44.entities.ConfiguracaoPlantao.list(),
    enabled: !!user,
  });

  const { data: configDescontos = [] } = useQuery({
    queryKey: ['configDescontos', user?.email],
    queryFn: () => base44.entities.ConfiguracaoDesconto.list(),
    enabled: !!user,
  });

  const calculateBaseValue = (doctorId, hospitalId, period) => {
    let config = configValores.find(c => c.doctor_id === doctorId && c.hospital_id === hospitalId);
    if (!config) config = configValores.find(c => c.doctor_id === doctorId && !c.hospital_id);
    if (!config) config = configValores.find(c => !c.doctor_id && c.hospital_id === hospitalId);
    if (!config) config = configValores.find(c => !c.doctor_id && !c.hospital_id);

    if (!config) return 0;

    switch (period) {
      case '6h': return config.valor_6h || 0;
      case '12h':
      case 'mais tarde': return config.valor_12h || 0;
      case 'retaguarda': return config.valor_retaguarda || 0;
      case 'coordenador': return config.valor_coordenador || 0;
      default: return 0;
    }
  };

  const calculateAllDiscounts = (doctorId, hospitalId, baseValue) => {
    const applicableDiscounts = configDescontos.filter(d => 
      (d.doctor_id === doctorId && d.hospital_id === hospitalId) ||
      (d.doctor_id === doctorId && !d.hospital_id) ||
      (!d.doctor_id && d.hospital_id === hospitalId) ||
      (!d.doctor_id && !d.hospital_id)
    );

    let totalDiscount = 0;
    applicableDiscounts.forEach(desconto => {
      const value = desconto.tipo_desconto === 'percentual' 
        ? baseValue * desconto.valor_desconto / 100 
        : desconto.valor_desconto;
      totalDiscount += value;
    });

    // Adicionar o imposto de 15% sobre o valor bruto
    const impostoValue = baseValue * 0.15;
    totalDiscount += impostoValue;

    return totalDiscount;
  };

  const reports = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const filteredShifts = shifts.filter(s => {
      if (!s.date) return false;
      const [sYear, sMonth] = s.date.split('-').map(Number);
      const monthMatch = sYear === year && sMonth === month;
      const hospitalMatch = selectedHospital === 'all' || s.hospital === selectedHospital;
      const doctorMatch = selectedDoctor === 'all' || s.doctor_name === selectedDoctor;
      return monthMatch && hospitalMatch && doctorMatch;
    });

    // Totais gerais
    let totalBruto = 0;
    let totalDescontos = 0;
    filteredShifts.forEach(shift => {
      const hospitalData = hospitals.find(h => h.name === shift.hospital);
      const hospitalId = hospitalData?.id;
      const baseValue = calculateBaseValue(shift.doctor_id, hospitalId, shift.period || '12h');
      const discount = calculateAllDiscounts(shift.doctor_id, hospitalId, baseValue);
      totalBruto += baseValue;
      totalDescontos += discount;
    });
    const totalLiquido = totalBruto - totalDescontos;
    const totals = {
      bruto: totalBruto,
      descontos: totalDescontos,
      liquido: totalLiquido,
      numShifts: filteredShifts.length,
    };

    // Relatório por Hospital
    const byHospital = {};
    filteredShifts.forEach(shift => {
      const hospital = shift.hospital;
      const hospitalData = hospitals.find(h => h.name === hospital);
      const hospitalId = hospitalData?.id;
      
      if (!byHospital[hospital]) {
        byHospital[hospital] = {
          name: hospital,
          doctors: new Set(),
          numPlantoes: 0,
          valorBruto: 0,
          valorDescontos: 0,
          valorLiquido: 0,
        };
      }
      byHospital[hospital].doctors.add(shift.doctor_name);
      byHospital[hospital].numPlantoes += 1;

      const baseValue = calculateBaseValue(shift.doctor_id, hospitalId, shift.period || '12h');
      const discount = calculateAllDiscounts(shift.doctor_id, hospitalId, baseValue);

      byHospital[hospital].valorBruto += baseValue;
      byHospital[hospital].valorDescontos += discount;
      byHospital[hospital].valorLiquido += (baseValue - discount);
    });

    // Relatório por Médico
    const byDoctor = {};
    filteredShifts.forEach(shift => {
      const doctor = shift.doctor_name;
      const hospitalData = hospitals.find(h => h.name === shift.hospital);
      const hospitalId = hospitalData?.id;
      
      if (!byDoctor[doctor]) {
        byDoctor[doctor] = {
          name: doctor,
          hospitals: new Set(),
          numPlantoes: 0,
          valorBruto: 0,
          valorDescontos: 0,
          valorLiquido: 0,
        };
      }
      byDoctor[doctor].hospitals.add(shift.hospital);
      byDoctor[doctor].numPlantoes += 1;

      const baseValue = calculateBaseValue(shift.doctor_id, hospitalId, shift.period || '12h');
      const discount = calculateAllDiscounts(shift.doctor_id, hospitalId, baseValue);

      byDoctor[doctor].valorBruto += baseValue;
      byDoctor[doctor].valorDescontos += discount;
      byDoctor[doctor].valorLiquido += (baseValue - discount);
    });

    // Relatório por Médico e Hospital
    const byDoctorHospital = {};
    filteredShifts.forEach(shift => {
      const key = `${shift.doctor_name}|${shift.hospital}`;
      const hospitalData = hospitals.find(h => h.name === shift.hospital);
      const hospitalId = hospitalData?.id;
      
      if (!byDoctorHospital[key]) {
        byDoctorHospital[key] = {
          doctor: shift.doctor_name,
          hospital: shift.hospital,
          numPlantoes: 0,
          valorBruto: 0,
          valorDescontos: 0,
          valorLiquido: 0,
        };
      }
      byDoctorHospital[key].numPlantoes += 1;

      const baseValue = calculateBaseValue(shift.doctor_id, hospitalId, shift.period || '12h');
      const discount = calculateAllDiscounts(shift.doctor_id, hospitalId, baseValue);

      byDoctorHospital[key].valorBruto += baseValue;
      byDoctorHospital[key].valorDescontos += discount;
      byDoctorHospital[key].valorLiquido += (baseValue - discount);
    });

    return {
      totals,
      byHospital: Object.values(byHospital),
      byDoctor: Object.values(byDoctor),
      byDoctorHospital: Object.values(byDoctorHospital),
    };
  }, [shifts, selectedMonth, selectedHospital, selectedDoctor, hospitals, configValores, configDescontos]);

  const availableMonths = useMemo(() => {
    const months = new Set();
    shifts.forEach(shift => {
      if (shift.date) {
        const [year, month] = shift.date.split('-').map(Number);
        months.add(`${year}-${String(month).padStart(2, '0')}`);
      }
    });
    return Array.from(months).sort().reverse();
  }, [shifts]);

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
      csv += `"${h.name}",${h.doctors.size},${h.numPlantoes},${h.valorBruto.toFixed(2)},${h.valorDescontos.toFixed(2)},${h.valorLiquido.toFixed(2)}\n`;
    });

    csv += '\n--- POR MÉDICO ---\n';
    csv += 'Médico,Nº Hospitais,Nº Plantões,Valor Bruto,Descontos,Valor Líquido\n';
    reports.byDoctor.forEach(d => {
      csv += `"${d.name}",${d.hospitals.size},${d.numPlantoes},${d.valorBruto.toFixed(2)},${d.valorDescontos.toFixed(2)},${d.valorLiquido.toFixed(2)}\n`;
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

  if (!user) {
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
                  <td className="px-6 py-4 text-sm text-right text-slate-600">{h.doctors.size}</td>
                  <td className="px-6 py-4 text-sm text-right text-slate-600">{h.numPlantoes}</td>
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
                  <td className="px-6 py-4 text-sm text-right text-slate-600">{d.hospitals.size}</td>
                  <td className="px-6 py-4 text-sm text-right text-slate-600">{d.numPlantoes}</td>
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
                  <td className="px-6 py-4 text-sm text-right text-slate-600">{dh.numPlantoes}</td>
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