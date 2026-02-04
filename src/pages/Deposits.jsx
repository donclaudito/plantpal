import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Download, Calendar, Building, User, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import jsPDF from 'jspdf';

export default function Deposits() {
  const queryClient = useQueryClient();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const [filterDoctor, setFilterDoctor] = useState('all');
  const [filterHospital, setFilterHospital] = useState('all');
  const [filterCompetencia, setFilterCompetencia] = useState(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`);
  const [filterDeposito, setFilterDeposito] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', user?.email],
    queryFn: async () => {
      const allShifts = await base44.entities.Shift.list('-date');
      return allShifts.filter(s => s.created_by === user?.email);
    },
    enabled: !!user,
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

  const { data: deposits = [] } = useQuery({
    queryKey: ['deposits', user?.email],
    queryFn: async () => {
      const all = await base44.entities.Deposit.list('-created_date');
      return all.filter(d => d.created_by === user?.email);
    },
    enabled: !!user,
  });

  const calculateBaseValue = (doctorId, hospitalId, period) => {
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

    if (applicableDiscounts.length === 0) {
      return { totalValue: 0, details: [] };
    }

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

  const depositsData = useMemo(() => {
    const grouped = {};

    shifts.forEach(shift => {
      if (!shift.date) return;

      const [year, month] = shift.date.split('-').map(Number);
      const mesCompetencia = `${year}-${String(month).padStart(2, '0')}`;
      const depositMonth = month === 12 ? 1 : month + 1;
      const depositYear = month === 12 ? year + 1 : year;
      const mesDeposito = `${depositYear}-${String(depositMonth).padStart(2, '0')}`;

      const doctorId = shift.doctor_id;
      const doctorName = shift.doctor_name;
      const hospital = hospitals.find(h => h.name === shift.hospital);
      const hospitalId = hospital?.id;
      const hospitalName = shift.hospital;
      const period = shift.period || '12h';

      const key = `${doctorId}-${hospitalId}-${mesCompetencia}`;

      if (!grouped[key]) {
        grouped[key] = {
          doctorId,
          doctorName,
          hospitalId,
          hospitalName,
          mesCompetencia,
          mesDeposito,
          numPlantoes: 0,
          valorBruto: 0,
          valorDescontos: 0,
          valorLiquido: 0,
          descontosDetalhados: []
        };
      }

      const baseValue = calculateBaseValue(doctorId, hospitalId, period);
      const discountResult = calculateAllDiscounts(doctorId, hospitalId, baseValue);
      const netValue = baseValue - discountResult.totalValue;

      grouped[key].numPlantoes += 1;
      grouped[key].valorBruto += baseValue;
      grouped[key].valorDescontos += discountResult.totalValue;
      grouped[key].valorLiquido += netValue;
      if (discountResult.details.length > 0 && grouped[key].descontosDetalhados.length === 0) {
        grouped[key].descontosDetalhados = discountResult.details;
      }
    });

    return Object.values(grouped);
  }, [shifts, hospitals, configValores, configDescontos]);

  const filteredDeposits = useMemo(() => {
    return depositsData.filter(d => {
      const matchDoctor = filterDoctor === 'all' || d.doctorId === filterDoctor;
      const matchHospital = filterHospital === 'all' || d.hospitalId === filterHospital;
      const matchCompetencia = filterCompetencia === 'all' || d.mesCompetencia === filterCompetencia;
      const matchDeposito = filterDeposito === 'all' || d.mesDeposito === filterDeposito;
      
      return matchDoctor && matchHospital && matchCompetencia && matchDeposito;
    });
  }, [depositsData, filterDoctor, filterHospital, filterCompetencia, filterDeposito]);

  const createDepositMutation = useMutation({
    mutationFn: (depositData) => base44.entities.Deposit.create(depositData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
    },
  });

  const generateHolerite = (deposit) => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('HOLERITE DE PAGAMENTO', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Mês de Competência: ${deposit.mesCompetencia}`, 20, 40);
    doc.text(`Mês de Depósito: ${deposit.mesDeposito}`, 20, 50);

    doc.setFontSize(14);
    doc.text('DADOS DO MÉDICO', 20, 70);
    doc.setFontSize(11);
    doc.text(`Nome: ${deposit.doctorName}`, 20, 80);
    doc.text(`Hospital: ${deposit.hospitalName}`, 20, 90);

    doc.setFontSize(14);
    doc.text('RESUMO FINANCEIRO', 20, 110);
    doc.setFontSize(11);
    doc.text(`Número de Plantões: ${deposit.numPlantoes}`, 20, 120);
    doc.text(`Valor Bruto: R$ ${deposit.valorBruto.toFixed(2)}`, 20, 130);

    let yPos = 150;
    doc.setFontSize(14);
    doc.text('DESCONTOS', 20, yPos);
    yPos += 10;
    doc.setFontSize(11);

    if (deposit.descontosDetalhados && deposit.descontosDetalhados.length > 0) {
      deposit.descontosDetalhados.forEach(desc => {
        const descText = desc.tipo === 'percentual' 
          ? `${desc.descricao} (${desc.valor_config}%): R$ ${desc.valor_calculado.toFixed(2)}`
          : `${desc.descricao}: R$ ${desc.valor_calculado.toFixed(2)}`;
        doc.text(descText, 20, yPos);
        yPos += 10;
      });
    }

    yPos += 10;
    doc.text(`Total de Descontos: R$ ${deposit.valorDescontos.toFixed(2)}`, 20, yPos);

    yPos += 20;
    doc.setFontSize(16);
    doc.text(`VALOR LÍQUIDO A PAGAR: R$ ${deposit.valorLiquido.toFixed(2)}`, 20, yPos);

    doc.save(`holerite_${deposit.doctorName}_${deposit.mesCompetencia}.pdf`);
  };

  const saveDeposit = (deposit) => {
    createDepositMutation.mutate({
      doctor_id: deposit.doctorId,
      doctor_name: deposit.doctorName,
      hospital_id: deposit.hospitalId,
      hospital_name: deposit.hospitalName,
      mes_competencia: deposit.mesCompetencia,
      mes_deposito: deposit.mesDeposito,
      num_plantoes: deposit.numPlantoes,
      valor_bruto: deposit.valorBruto,
      valor_descontos: deposit.valorDescontos,
      valor_liquido: deposit.valorLiquido,
      descontos_detalhados: deposit.descontosDetalhados,
      status: 'Pendente'
    });
  };

  const availableCompetencias = useMemo(() => {
    const competencias = new Set();
    shifts.forEach(shift => {
      if (shift.date) {
        const [year, month] = shift.date.split('-').map(Number);
        competencias.add(`${year}-${String(month).padStart(2, '0')}`);
      }
    });
    return Array.from(competencias).sort().reverse();
  }, [shifts]);

  const availableDepositos = useMemo(() => {
    const depositos = new Set();
    depositsData.forEach(d => {
      depositos.add(d.mesDeposito);
    });
    return Array.from(depositos).sort().reverse();
  }, [depositsData]);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-bold">A carregar depósitos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-slate-900">Depósitos</h1>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md">
        <h2 className="text-lg font-black text-slate-900 mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-600 uppercase mb-2">Médico</label>
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
            <label className="block text-xs font-black text-slate-600 uppercase mb-2">Hospital</label>
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
            <label className="block text-xs font-black text-slate-600 uppercase mb-2">Mês de Competência</label>
            <Select value={filterCompetencia} onValueChange={setFilterCompetencia}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {availableCompetencias.map(comp => (
                  <SelectItem key={comp} value={comp}>{formatMonth(comp)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 uppercase mb-2">Mês de Depósito</label>
            <Select value={filterDeposito} onValueChange={setFilterDeposito}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {availableDepositos.map(dep => (
                  <SelectItem key={dep} value={dep}>{formatMonth(dep)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase">Médico</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase">Hospital</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase">Competência</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase">Depósito</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Nº Plantões</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Valor Bruto</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Descontos</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Valor Líquido</th>
                <th className="px-6 py-4 text-center text-xs font-black text-slate-600 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredDeposits.map((deposit, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{deposit.doctorName}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{deposit.hospitalName}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatMonth(deposit.mesCompetencia)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatMonth(deposit.mesDeposito)}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-slate-900">{deposit.numPlantoes}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-green-600">R$ {deposit.valorBruto.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-red-600">R$ {deposit.valorDescontos.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">R$ {deposit.valorLiquido.toFixed(2)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        onClick={() => generateHolerite(deposit)}
                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                      >
                        <FileText size={14} />
                        Holerite
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDeposits.length === 0 && (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-slate-400">
                    Nenhum depósito encontrado para os filtros selecionados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}