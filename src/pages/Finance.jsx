import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Download, DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Finance() {
  const [filterDoctor, setFilterDoctor] = useState('all');
  const [filterHospital, setFilterHospital] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

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

  const calculateBaseValue = (shift) => {
    if (shift.value !== undefined && shift.value !== null && shift.value !== 0) {
      return shift.value;
    }

    const doctorId = shift.doctor_id;
    const hospitalId = hospitals.find(h => h.name === shift.hospital)?.id;
    const period = shift.period;

    let config = configValores.find(c => c.doctor_id === doctorId && c.hospital_id === hospitalId);
    if (!config) {
      config = configValores.find(c => c.doctor_id === doctorId && !c.hospital_id);
    }
    if (!config) {
      config = configValores.find(c => !c.doctor_id && c.hospital_id === hospitalId);
    }
    if (!config) {
      config = configValores.find(c => !c.doctor_id && !c.hospital_id);
    }

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
    const applicableDiscounts = [];

    const specific = configDescontos.filter(d => d.doctor_id === doctorId && d.hospital_id === hospitalId);
    applicableDiscounts.push(...specific);

    const byDoctor = configDescontos.filter(d => d.doctor_id === doctorId && !d.hospital_id);
    applicableDiscounts.push(...byDoctor);

    const byHospital = configDescontos.filter(d => !d.doctor_id && d.hospital_id === hospitalId);
    applicableDiscounts.push(...byHospital);

    const global = configDescontos.filter(d => !d.doctor_id && !d.hospital_id);
    applicableDiscounts.push(...global);

    let totalDiscount = 0;
    const details = [];

    applicableDiscounts.forEach(desconto => {
      const value = desconto.tipo_desconto === 'percentual' 
        ? baseValue * desconto.valor_desconto / 100 
        : desconto.valor_desconto;

      totalDiscount += value;

      details.push({
        descricao: desconto.descricao,
        tipo: desconto.tipo_desconto,
        valor_config: desconto.valor_desconto,
        valor_calculado: value
      });
    });

    return {
      totalValue: totalDiscount,
      details
    };
  };

  const filteredShifts = useMemo(() => {
    return shifts.filter(s => {
      if (!s.date) return false;

      const [year, month] = s.date.split('-').map(Number);
      const matchMonth = month === filterMonth + 1 && year === filterYear;

      const matchDoctor = filterDoctor === 'all' || s.doctor_id === filterDoctor;

      const hospital = hospitals.find(h => h.name === s.hospital);
      const matchHospital = filterHospital === 'all' || hospital?.id === filterHospital;

      const matchPeriod = filterPeriod === 'all' || s.period === filterPeriod;

      return matchMonth && matchDoctor && matchHospital && matchPeriod;
    });
  }, [shifts, filterMonth, filterYear, filterDoctor, filterHospital, filterPeriod, hospitals]);

  const financialSummary = useMemo(() => {
    const grouped = {};

    filteredShifts.forEach(shift => {
      const doctorId = shift.doctor_id;
      const doctorName = shift.doctor_name;
      const hospital = hospitals.find(h => h.name === shift.hospital);
      const hospitalId = hospital?.id;
      const hospitalName = shift.hospital;
      const period = shift.period || '12h';

      const key = `${doctorId}-${hospitalId}-${period}`;

      if (!grouped[key]) {
        grouped[key] = {
          doctorName,
          hospitalName,
          period,
          quantity: 0,
          grossValue: 0,
          discountValue: 0,
          netValue: 0,
          discountDetails: [],
        };
      }

      const baseValue = calculateBaseValue(shift);
      const discountResult = calculateAllDiscounts(doctorId, hospitalId, baseValue);
      const netValue = baseValue - discountResult.totalValue;

      grouped[key].quantity += 1;
      grouped[key].grossValue += baseValue;
      grouped[key].discountValue += discountResult.totalValue;
      grouped[key].netValue += netValue;
      if (discountResult.details.length > 0) {
        grouped[key].discountDetails = discountResult.details;
      }
    });

    return Object.values(grouped);
  }, [filteredShifts, hospitals, configValores, configDescontos]);

  const totals = useMemo(() => {
    return financialSummary.reduce((acc, item) => ({
      quantity: acc.quantity + item.quantity,
      grossValue: acc.grossValue + item.grossValue,
      discountValue: acc.discountValue + item.discountValue,
      netValue: acc.netValue + item.netValue,
    }), { quantity: 0, grossValue: 0, discountValue: 0, netValue: 0 });
  }, [financialSummary]);

  const exportToCSV = () => {
    const headers = ['Médico', 'Hospital', 'Período', 'Quantidade', 'Valor Bruto', 'Descontos', 'Valor Líquido'];
    const rows = financialSummary.map(item => [
      item.doctorName,
      item.hospitalName,
      item.period,
      item.quantity,
      `R$ ${item.grossValue.toFixed(2)}`,
      `R$ ${item.discountValue.toFixed(2)}`,
      `R$ ${item.netValue.toFixed(2)}`,
    ]);

    rows.push([
      'TOTAL',
      '',
      '',
      totals.quantity,
      `R$ ${totals.grossValue.toFixed(2)}`,
      `R$ ${totals.discountValue.toFixed(2)}`,
      `R$ ${totals.netValue.toFixed(2)}`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `financeiro_${filterMonth + 1}_${filterYear}.csv`;
    link.click();
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 dark:text-slate-500 font-bold">A carregar dados financeiros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Finanças</h1>
        <Button onClick={exportToCSV} className="gap-2 bg-green-600 hover:bg-green-700">
          <Download size={16} />
          Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="text-blue-600 dark:text-blue-400" size={24} />
            <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase">Plantões</span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{totals.quantity}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
            <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase">Valor Bruto</span>
          </div>
          <p className="text-3xl font-black text-green-600 dark:text-green-400">R$ {totals.grossValue.toFixed(2)}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="text-red-600 dark:text-red-400" size={24} />
            <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase">Descontos</span>
          </div>
          <p className="text-3xl font-black text-red-600 dark:text-red-400">R$ {totals.discountValue.toFixed(2)}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="text-blue-600 dark:text-blue-400" size={24} />
            <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase">Valor Líquido</span>
          </div>
          <p className="text-3xl font-black text-blue-600 dark:text-blue-400">R$ {totals.netValue.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md">
        <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase mb-2">Mês</label>
            <Select value={filterMonth.toString()} onValueChange={(v) => setFilterMonth(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((name, idx) => (
                  <SelectItem key={idx} value={idx.toString()}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase mb-2">Ano</label>
            <Select value={filterYear.toString()} onValueChange={(v) => setFilterYear(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase mb-2">Médico</label>
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
            <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase mb-2">Hospital</label>
            <Select value={filterHospital} onValueChange={setFilterHospital}>
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
            <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase mb-2">Período</label>
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="12h">12h</SelectItem>
                <SelectItem value="6h">6h</SelectItem>
                <SelectItem value="retaguarda">Retaguarda</SelectItem>
                <SelectItem value="coordenador">Coordenador</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-600 dark:text-slate-400 uppercase">Médico</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-600 dark:text-slate-400 uppercase">Hospital</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-600 dark:text-slate-400 uppercase">Período</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 dark:text-slate-400 uppercase">Quantidade</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 dark:text-slate-400 uppercase">Valor Bruto</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-600 dark:text-slate-400 uppercase">Descontos (Detalhes)</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 dark:text-slate-400 uppercase">Valor Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {financialSummary.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{item.doctorName}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{item.hospitalName}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{item.period}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-slate-900 dark:text-white">{item.quantity}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-green-600 dark:text-green-400">R$ {item.grossValue.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="font-bold text-red-600 dark:text-red-400">R$ {item.discountValue.toFixed(2)}</div>
                    {item.discountDetails && item.discountDetails.length > 0 && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-1">
                        {item.discountDetails.map((detail, idx) => (
                          <div key={idx}>
                            • {detail.descricao} 
                            {detail.tipo === 'percentual' 
                              ? ` (${detail.valor_config}%) = R$ ${detail.valor_calculado.toFixed(2)}` 
                              : ` (R$ ${detail.valor_config.toFixed(2)})`}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-blue-600 dark:text-blue-400">R$ {item.netValue.toFixed(2)}</td>
                </tr>
              ))}
              {financialSummary.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                    Nenhum plantão encontrado para os filtros selecionados
                  </td>
                </tr>
              )}
            </tbody>
            {financialSummary.length > 0 && (
              <tfoot className="bg-slate-100 dark:bg-slate-700">
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-sm font-black text-slate-900 dark:text-white uppercase">Total</td>
                  <td className="px-6 py-4 text-sm text-right font-black text-slate-900 dark:text-white">{totals.quantity}</td>
                  <td className="px-6 py-4 text-sm text-right font-black text-green-600 dark:text-green-400">R$ {totals.grossValue.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right font-black text-red-600 dark:text-red-400">R$ {totals.discountValue.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right font-black text-blue-600 dark:text-blue-400">R$ {totals.netValue.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}