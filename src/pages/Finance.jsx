import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, DollarSign, TrendingUp, TrendingDown, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Toast from '@/components/common/Toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatQuantity } from '@/lib/quantity';
import { MEDICO_PADRAO } from '@/lib/defaultDoctor';


const PERIOD_LABELS = { consultas: 'Período de consultas', cirurgias: 'Cirurgias do convênio' };

export default function Finance() {
  const [filterDoctor, setFilterDoctor] = useState(MEDICO_PADRAO);
  const [filterHospital, setFilterHospital] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState(null);
  const queryClient = useQueryClient();

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: report, isPending: isLoadingReport, error: reportError, refetch } = useQuery({
    queryKey: ['finance', user?.email, filterYear, filterMonth, filterDoctor, filterHospital, filterPeriod],
    queryFn: async () => {
      const response = await base44.functions.invoke('getShiftFinance', {
        year: filterYear, month: filterMonth + 1,
        doctor: filterDoctor, hospital: filterHospital, period: filterPeriod,
      });
      return response.data;
    },
    enabled: !!user,
  });
  const financialSummary = report?.summary || [];
  const doctorOptions = report?.doctorOptions || [];
  const hospitalOptions = report?.hospitalOptions || [];
  const totals = report?.totals || { quantity: 0, grossValue: 0, discountValue: 0, netValue: 0 };

  const sincronizarProcedimentos = async () => {
    setIsSyncing(true);
    try {
      const response = await base44.functions.invoke('sincronizarProcedimentos', {
        year: filterYear, month: filterMonth + 1, doctor: filterDoctor, hospital: filterHospital,
      });
      if (response.data?.error) {
        showToast(response.data.error, 'error');
        return;
      }
      const { criados = 0, atualizados = 0 } = response.data || {};
      showToast(`${criados} procedimento(s) criado(s) e ${atualizados} valor(es) sincronizado(s).`);
      queryClient.invalidateQueries({ queryKey: ['procedimentos'] });
      await refetch();
    } catch (error) {
      showToast(error.message || 'Não foi possível sincronizar os procedimentos.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Médico', 'Hospital', 'Período', 'Quantidade', 'Valor Bruto', 'Descontos', 'Valor Líquido'];
    const rows = financialSummary.map(item => [
      item.doctorName,
      item.hospitalName,
      PERIOD_LABELS[item.period] || item.period,
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

  if (reportError) {
    return <div className="p-6 space-y-3"><p role="alert" className="text-destructive">Não foi possível carregar os valores financeiros: {reportError.message}</p><Button onClick={() => refetch()}>Tentar novamente</Button></div>;
  }

  if (!user || isLoadingReport) {
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
      <Toast message={message?.text} type={message?.type} />
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Finanças</h1>
        <div className="flex items-center gap-3">
          <Button onClick={sincronizarProcedimentos} disabled={isSyncing} variant="outline" className="gap-2">
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'A sincronizar...' : 'Sincronizar procedimentos'}
          </Button>
          <Button onClick={exportToCSV} className="gap-2 bg-green-600 hover:bg-green-700">
            <Download size={16} />
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="text-blue-600 dark:text-blue-400" size={24} />
            <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase">Plantões (12h)</span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{formatQuantity(totals.quantity)}</p>
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
                <SelectItem value="consultas">Período de consultas</SelectItem>
                <SelectItem value="cirurgias">Cirurgias do convênio</SelectItem>
                {['1h', '2h', '3h', '4h', '5h'].map(period => <SelectItem key={period} value={period}>{period}</SelectItem>)}
                <SelectItem value="12h">12h</SelectItem>
                <SelectItem value="6h">6h</SelectItem>
                <SelectItem value="retaguarda">Retaguarda</SelectItem>
                <SelectItem value="coordenador">Coordenador</SelectItem>
                <SelectItem value="professor">Professor</SelectItem>
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
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{PERIOD_LABELS[item.period] || item.period}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-slate-900 dark:text-white">{formatQuantity(item.quantity)}</td>
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
                  <td className="px-6 py-4 text-sm text-right font-black text-slate-900 dark:text-white">{formatQuantity(totals.quantity)}</td>
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