import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Download, DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { encontrarHospital, normalizarNome, opcoesHospitais, opcoesMedicos, resolverDoctorId } from '@/lib/shiftFilters';

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
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-date'),
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

  const { data: configValores = [] } = useQuery({
    queryKey: ['configValores'],
    queryFn: () => base44.entities.ConfiguracaoPlantao.list(),
    enabled: !!user,
  });

  const { data: configDescontos = [] } = useQuery({
    queryKey: ['configDescontos'],
    queryFn: () => base44.entities.ConfiguracaoDesconto.list(),
    enabled: !!user,
  });

  const doctorOptions = useMemo(() => opcoesMedicos(doctors, shifts), [doctors, shifts]);
  const hospitalOptions = useMemo(() => opcoesHospitais(hospitals, shifts), [hospitals, shifts]);

  // Valor do plantão segundo a configuração: usa o valor explícito do período
  // e, para períodos por hora (1h a 5h, ou 12h sem valor configurado), calcula
  // proporcionalmente ao valor/hora da configuração.
  const valorDoPeriodo = (config, period) => {
    const chave = String(period || '').trim().toLowerCase();

    const valoresFixos = {
      '6h': config.valor_6h,
      '12h': config.valor_12h,
      'mais tarde': config.valor_12h,
      retaguarda: config.valor_retaguarda,
      coordenador: config.valor_coordenador,
      professor: config.valor_professor,
    };

    if (valoresFixos[chave] > 0) return valoresFixos[chave];

    const horas = parseInt(chave, 10);
    if (!horas) return 0;

    const valorHora = (config.valor_12h || 0) / 12 || (config.valor_6h || 0) / 6;
    return valorHora * horas;
  };

  const calculateBaseValue = (shift) => {
    const doctorId = resolverDoctorId(doctors, shift);
    const hospitalId = encontrarHospital(hospitals, shift.hospital)?.id;

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

    return valorDoPeriodo(config, shift.period);
  };

  const calculatePercentageDiscounts = (doctorId, hospitalId, baseValue) => {
    const applicableDiscounts = [];

    const specific = configDescontos.filter(d => d.doctor_id === doctorId && d.hospital_id === hospitalId && d.tipo_desconto === 'percentual');
    applicableDiscounts.push(...specific);

    const byDoctor = configDescontos.filter(d => d.doctor_id === doctorId && !d.hospital_id && d.tipo_desconto === 'percentual');
    applicableDiscounts.push(...byDoctor);

    const byHospital = configDescontos.filter(d => !d.doctor_id && d.hospital_id === hospitalId && d.tipo_desconto === 'percentual');
    applicableDiscounts.push(...byHospital);

    const global = configDescontos.filter(d => !d.doctor_id && !d.hospital_id && d.tipo_desconto === 'percentual');
    applicableDiscounts.push(...global);

    let totalDiscount = 0;
    const details = [];

    applicableDiscounts.forEach(desconto => {
      const value = baseValue * desconto.valor_desconto / 100;

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

  const calculateFixedDiscounts = (doctorId, hospitalId) => {
    const applicableDiscounts = [];

    const specific = configDescontos.filter(d => d.doctor_id === doctorId && d.hospital_id === hospitalId && d.tipo_desconto === 'valor_fixo');
    applicableDiscounts.push(...specific);

    const byDoctor = configDescontos.filter(d => d.doctor_id === doctorId && !d.hospital_id && d.tipo_desconto === 'valor_fixo');
    applicableDiscounts.push(...byDoctor);

    const byHospital = configDescontos.filter(d => !d.doctor_id && d.hospital_id === hospitalId && d.tipo_desconto === 'valor_fixo');
    applicableDiscounts.push(...byHospital);

    const global = configDescontos.filter(d => !d.doctor_id && !d.hospital_id && d.tipo_desconto === 'valor_fixo');
    applicableDiscounts.push(...global);

    let totalDiscount = 0;
    const details = [];

    applicableDiscounts.forEach(desconto => {
      totalDiscount += desconto.valor_desconto;

      details.push({
        descricao: desconto.descricao,
        tipo: desconto.tipo_desconto,
        valor_config: desconto.valor_desconto,
        valor_calculado: desconto.valor_desconto
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

      const matchDoctor = filterDoctor === 'all' || normalizarNome(s.doctor_name) === filterDoctor;

      const matchHospital = filterHospital === 'all' || normalizarNome(s.hospital) === filterHospital;

      const matchPeriod = filterPeriod === 'all' || s.period === filterPeriod;

      return matchMonth && matchDoctor && matchHospital && matchPeriod;
    });
  }, [shifts, filterMonth, filterYear, filterDoctor, filterHospital, filterPeriod, hospitals]);

  const financialSummary = useMemo(() => {
    const grouped = {};
    const fixedDiscountsByDoctorHospital = new Map();

    filteredShifts.forEach(shift => {
      const doctorId = resolverDoctorId(doctors, shift);
      const doctorName = shift.doctor_name;
      const hospitalId = encontrarHospital(hospitals, shift.hospital)?.id;
      const hospitalName = shift.hospital;
      const period = shift.period || '12h';

      const doctorKey = doctorId || normalizarNome(doctorName);
      const hospitalKey = hospitalId || normalizarNome(hospitalName);
      const key = `${doctorKey}-${hospitalKey}-${period}`;
      const fixedKey = `${doctorKey}-${hospitalKey}`;

      if (!grouped[key]) {
        grouped[key] = {
          doctorId,
          hospitalId,
          doctorName,
          hospitalName,
          period,
          fixedKey,
          quantity: 0,
          grossValue: 0,
          discountValue: 0,
          netValue: 0,
          discountDetailsMap: new Map(),
        };
      }

      const baseValue = calculateBaseValue(shift);
      const percentageDiscounts = calculatePercentageDiscounts(doctorId, hospitalId, baseValue);

      grouped[key].quantity += 1;
      grouped[key].grossValue += baseValue;
      grouped[key].discountValue += percentageDiscounts.totalValue;
      grouped[key].netValue += baseValue - percentageDiscounts.totalValue;
      
      if (percentageDiscounts.details.length > 0) {
        percentageDiscounts.details.forEach(detail => {
          const detailKey = detail.descricao;
          if (!grouped[key].discountDetailsMap.has(detailKey)) {
            grouped[key].discountDetailsMap.set(detailKey, {
              descricao: detail.descricao,
              tipo: detail.tipo,
              valor_config: detail.valor_config,
              valor_calculado: 0
            });
          }
          const existing = grouped[key].discountDetailsMap.get(detailKey);
          existing.valor_calculado += detail.valor_calculado;
        });
      }

      if (!fixedDiscountsByDoctorHospital.has(fixedKey)) {
        const fixedDiscounts = calculateFixedDiscounts(doctorId, hospitalId);
        fixedDiscountsByDoctorHospital.set(fixedKey, fixedDiscounts);
      }
    });

    const groupedArray = Object.values(grouped);
    groupedArray.forEach(item => {
      const fixedDiscounts = fixedDiscountsByDoctorHospital.get(item.fixedKey);
      
      if (fixedDiscounts) {
        const doctorHospitalGroups = groupedArray.filter(g => g.fixedKey === item.fixedKey);
        
        const isFirstGroup = doctorHospitalGroups[0] === item;
        
        if (isFirstGroup) {
          item.discountValue += fixedDiscounts.totalValue;
          item.netValue -= fixedDiscounts.totalValue;
          
          fixedDiscounts.details.forEach(detail => {
            item.discountDetailsMap.set(detail.descricao, detail);
          });
        }
      }
    });

    return groupedArray.map(item => ({
      ...item,
      discountDetails: Array.from(item.discountDetailsMap.values())
    }));
  }, [filteredShifts, hospitals, doctors, configValores, configDescontos]);

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
                {doctorOptions.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
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
                {hospitalOptions.map(h => (
                  <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
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