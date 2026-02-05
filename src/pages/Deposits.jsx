import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Upload, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [holeritePdfUrl, setHoleritePdfUrl] = useState(null);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [uploadingPix, setUploadingPix] = useState(null);

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

  const { data: savedDeposits = [] } = useQuery({
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
          doctor_id: doctorId,
          doctor_name: doctorName,
          hospital_id: hospitalId,
          hospital_name: hospitalName,
          mes_competencia: mesCompetencia,
          mes_deposito: mesDeposito,
          num_plantoes: 0,
          valor_bruto: 0,
          valor_descontos: 0,
          valor_liquido: 0,
          descontos_detalhados: []
        };
      }

      const baseValue = calculateBaseValue(doctorId, hospitalId, period);
      const discountResult = calculateAllDiscounts(doctorId, hospitalId, baseValue);
      const netValue = baseValue - discountResult.totalValue;

      grouped[key].num_plantoes += 1;
      grouped[key].valor_bruto += baseValue;
      grouped[key].valor_descontos += discountResult.totalValue;
      grouped[key].valor_liquido += netValue;
      if (discountResult.details.length > 0 && grouped[key].descontos_detalhados.length === 0) {
        grouped[key].descontos_detalhados = discountResult.details;
      }
    });

    const calculated = Object.values(grouped);
    
    return calculated.map(calc => {
      const saved = savedDeposits.find(
        s => s.doctor_id === calc.doctorId && 
             s.hospital_id === calc.hospitalId && 
             s.mes_competencia === calc.mesCompetencia
      );
      
      return saved ? { ...calc, ...saved, isSaved: true } : { ...calc, isSaved: false };
    });
  }, [shifts, hospitals, configValores, configDescontos, savedDeposits]);

  const filteredDeposits = useMemo(() => {
    return depositsData.filter(d => {
      const matchDoctor = filterDoctor === 'all' || d.doctor_id === filterDoctor;
      const matchHospital = filterHospital === 'all' || d.hospital_id === filterHospital;
      const matchCompetencia = filterCompetencia === 'all' || d.mes_competencia === filterCompetencia;
      const matchDeposito = filterDeposito === 'all' || d.mes_deposito === filterDeposito;
      
      return matchDoctor && matchHospital && matchCompetencia && matchDeposito;
    });
  }, [depositsData, filterDoctor, filterHospital, filterCompetencia, filterDeposito]);

  const createOrUpdateDepositMutation = useMutation({
    mutationFn: (depositData) => {
      if (depositData.id) {
        return base44.entities.Deposit.update(depositData.id, depositData);
      }
      return base44.entities.Deposit.create(depositData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
    },
  });

  const handlePixUpload = async (deposit, file) => {
    setUploadingPix(deposit);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    const depositData = {
      doctor_id: deposit.doctor_id,
      doctor_name: deposit.doctor_name,
      hospital_id: deposit.hospital_id,
      hospital_name: deposit.hospital_name,
      mes_competencia: deposit.mes_competencia,
      mes_deposito: deposit.mes_deposito,
      num_plantoes: deposit.num_plantoes,
      valor_bruto: deposit.valor_bruto,
      valor_descontos: deposit.valor_descontos,
      valor_liquido: deposit.valor_liquido,
      descontos_detalhados: deposit.descontos_detalhados,
      comprovante_pix: file_url,
      status: 'Pago',
      data_pagamento: new Date().toISOString().split('T')[0],
    };

    if (deposit.id) {
      depositData.id = deposit.id;
    }

    createOrUpdateDepositMutation.mutate(depositData);
    setUploadingPix(null);
  };

  const generateHolerite = (deposit) => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('HOLERITE DE PAGAMENTO', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Mês de Competência: ${formatMonth(deposit.mes_competencia)}`, 20, 40);
    doc.text(`Mês de Depósito: ${formatMonth(deposit.mes_deposito)}`, 20, 50);

    doc.setFontSize(14);
    doc.text('DADOS DO MÉDICO', 20, 70);
    doc.setFontSize(11);
    doc.text(`Nome: ${deposit.doctor_name}`, 20, 80);
    doc.text(`Hospital: ${deposit.hospital_name}`, 20, 90);

    doc.setFontSize(14);
    doc.text('RESUMO FINANCEIRO', 20, 110);
    doc.setFontSize(11);
    doc.text(`Número de Plantões: ${deposit.num_plantoes}`, 20, 120);
    doc.text(`Valor Bruto: R$ ${(deposit.valor_bruto || 0).toFixed(2)}`, 20, 130);

    let yPos = 150;
    doc.setFontSize(14);
    doc.text('DESCONTOS', 20, yPos);
    yPos += 10;
    doc.setFontSize(11);

    const descontos = deposit.descontos_detalhados || [];
    if (descontos.length > 0) {
      descontos.forEach(desc => {
        const descText = desc.tipo === 'percentual' 
          ? `${desc.descricao} (${desc.valor_config}%): R$ ${desc.valor_calculado.toFixed(2)}`
          : `${desc.descricao}: R$ ${desc.valor_calculado.toFixed(2)}`;
        doc.text(descText, 20, yPos);
        yPos += 10;
      });
    }

    yPos += 10;
    doc.text(`Total de Descontos: R$ ${(deposit.valor_descontos || 0).toFixed(2)}`, 20, yPos);

    yPos += 20;
    doc.setFontSize(16);
    doc.text(`VALOR LÍQUIDO A PAGAR: R$ ${(deposit.valor_liquido || 0).toFixed(2)}`, 20, yPos);

    const pdfOutput = doc.output('datauristring');
    setHoleritePdfUrl(pdfOutput);
    setSelectedDeposit(deposit);
  };

  const sendWhatsApp = async () => {
    if (!selectedDeposit) return;
    
    try {
      const { data } = await base44.functions.invoke('validateAdminPassword', { password: adminPassword });
      
      if (!data.valid) {
        alert('Senha incorreta!');
        return;
      }

      const descontos = selectedDeposit.descontos_detalhados || [];
      let descontosText = '';
      if (descontos.length > 0) {
        descontosText = '\n\n📋 *DESCONTOS APLICADOS:*\n' + descontos.map(desc => {
          const descText = desc.tipo === 'percentual' 
            ? `  • ${desc.descricao} (${desc.valor_config}%): R$ ${desc.valor_calculado.toFixed(2)}`
            : `  • ${desc.descricao}: R$ ${desc.valor_calculado.toFixed(2)}`;
          return descText;
        }).join('\n');
      }
      
      const dataPagamento = selectedDeposit.data_pagamento 
        ? `\n📅 Data do Pagamento: ${new Date(selectedDeposit.data_pagamento).toLocaleDateString('pt-BR')}`
        : '';
      
      const message = `🏥 *HOLERITE DE PAGAMENTO*

👤 *Médico(a):* ${selectedDeposit.doctor_name}
🏥 *Hospital:* ${selectedDeposit.hospital_name}
📆 *Mês de Competência:* ${formatMonth(selectedDeposit.mes_competencia)}
📆 *Mês de Depósito:* ${formatMonth(selectedDeposit.mes_deposito)}

━━━━━━━━━━━━━━━━━━━━━━

💼 *RESUMO FINANCEIRO:*
  • Número de Plantões: ${selectedDeposit.num_plantoes}
  • Valor Bruto: R$ ${(selectedDeposit.valor_bruto || 0).toFixed(2)}${descontosText}

━━━━━━━━━━━━━━━━━━━━━━

📊 *Total de Descontos:* R$ ${(selectedDeposit.valor_descontos || 0).toFixed(2)}

💰 *VALOR LÍQUIDO A PAGAR:* R$ ${(selectedDeposit.valor_liquido || 0).toFixed(2)}${dataPagamento}

━━━━━━━━━━━━━━━━━━━━━━

Qualquer dúvida, estamos à disposição! 🙂`;

      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      
      window.open(whatsappUrl, '_blank');
      setShowAdminPrompt(false);
      setAdminPassword('');
    } catch (error) {
      alert('Erro ao validar senha: ' + error.message);
    }
  };

  const availableCompetencias = useMemo(() => {
    const competencias = new Set();
    shifts.forEach(shift => {
      if (shift.date) {
        const dateParts = shift.date.split('-');
        if (dateParts.length >= 2) {
          const [year, month] = dateParts.map(Number);
          if (!isNaN(year) && !isNaN(month)) {
            competencias.add(`${year}-${String(month).padStart(2, '0')}`);
          }
        }
      }
    });
    return Array.from(competencias).sort().reverse();
  }, [shifts]);

  const availableDepositos = useMemo(() => {
    const depositos = new Set();
    depositsData.forEach(d => {
      if (d.mes_deposito) {
        depositos.add(d.mes_deposito);
      }
    });
    return Array.from(depositos).filter(d => d && typeof d === 'string' && d.includes('-')).sort().reverse();
  }, [depositsData]);



  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    const parts = monthStr.split('-');
    if (parts.length < 2) return '';
    const month = parseInt(parts[1]);
    const year = parts[0];
    if (isNaN(month) || !year) return '';
    return `${monthNames[month - 1]} ${year}`;
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
                <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase">Valor Líquido</th>
                <th className="px-6 py-4 text-center text-xs font-black text-slate-600 uppercase">Status</th>
                <th className="px-6 py-4 text-center text-xs font-black text-slate-600 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredDeposits.map((deposit) => (
                <tr key={deposit.id || `${deposit.doctor_id}-${deposit.hospital_id}-${deposit.mes_competencia}`} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{deposit.doctor_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{deposit.hospital_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatMonth(deposit.mes_competencia)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatMonth(deposit.mes_deposito)}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-slate-900">{deposit.num_plantoes}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">R$ {(deposit.valor_liquido || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-center">
                    {deposit.status === 'Pago' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                        <CheckCircle size={14} /> Pago
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">
                        <XCircle size={14} /> Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex gap-2 justify-center flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => generateHolerite(deposit)}
                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                      >
                        <FileText size={14} />
                        Holerite
                      </Button>
                      {deposit.status !== 'Pago' && (
                        <label>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) handlePixUpload(deposit, file);
                            }}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            disabled={uploadingPix === deposit}
                            asChild
                          >
                            <span>
                              <Upload size={14} />
                              {uploadingPix === deposit ? 'Enviando...' : 'PIX'}
                            </span>
                          </Button>
                        </label>
                      )}
                      {deposit.comprovante_pix && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(deposit.comprovante_pix, '_blank')}
                          className="gap-2"
                        >
                          Ver Comprovante
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDeposits.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                    Nenhum depósito encontrado para os filtros selecionados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {holeritePdfUrl && selectedDeposit && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6">
          <h2 className="text-xl font-black text-slate-900 mb-4">
            Holerite de {selectedDeposit.doctor_name} - {formatMonth(selectedDeposit.mes_competencia)}
          </h2>
          
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {!showAdminPrompt ? (
              <Button
                onClick={() => setShowAdminPrompt(true)}
                className="gap-2 bg-green-500 hover:bg-green-600"
              >
                <MessageSquare size={16} /> Enviar por WhatsApp
              </Button>
            ) : (
              <div className="flex gap-2 items-center flex-wrap">
                <Input
                  type="password"
                  placeholder="Senha Admin"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-48"
                />
                <Button
                  onClick={sendWhatsApp}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  Confirmar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAdminPrompt(false);
                    setAdminPassword('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>

          <iframe src={holeritePdfUrl} width="100%" height="600px" className="border rounded-md"></iframe>
        </div>
      )}
    </div>
  );
}