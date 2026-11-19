import React, { useState } from 'react';
import { FileDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { procedimentoQuantidade, procedimentoTotal } from '@/lib/procedimentoTotals';
import { monthKeyFromDate, formatMonthLabel } from '@/lib/dateKeys';
import gerarPdfResumoAtendimentos from '@/lib/resumoAtendimentosPdf';

const brl = (valor) => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const periodoDe = (procedimento) => {
  const descricao = String(procedimento.descricao || '').toUpperCase();
  if (descricao.includes('MANH')) return 'Manhã';
  if (descricao.includes('TARDE')) return 'Tarde';
  return 'Outros';
};

const somar = (items) =>
  items.reduce(
    (acc, item) => ({
      quantidade: acc.quantidade + procedimentoQuantidade(item),
      valor: acc.valor + procedimentoTotal(item),
    }),
    { quantidade: 0, valor: 0 }
  );

const Caixa = ({ titulo, quantidade, valor, unidade, destaque }) => (
  <div className={`rounded-xl border p-4 ${destaque ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
    <p className="text-xs font-bold text-gray-600 uppercase">{titulo}</p>
    <p className="text-2xl font-black text-gray-900 mt-1">{quantidade}</p>
    <p className="text-xs font-semibold text-gray-600">{unidade} · {brl(valor)}</p>
  </div>
);

const OPCOES = [
  { valor: 'Todos', label: 'Tudo' },
  { valor: 'Consulta', label: 'Consultas' },
  { valor: 'Cirurgia', label: 'Cirurgias' },
];

const PAGAMENTOS = [
  { valor: 'Todos', label: 'Tudo' },
  { valor: 'SUS', label: 'SUS' },
  { valor: 'Convenio', label: 'Convênio' },
  { valor: 'Particular', label: 'Particular' },
];

export default function ResumoAtendimentosModal({ isOpen, onClose, procedimentos = [] }) {
  const [mes, setMes] = useState('');
  const [escopo, setEscopo] = useState('Todos');
  const [pagamento, setPagamento] = useState('Todos');
  const [mostrarValores, setMostrarValores] = useState(true);

  const meses = Array.from(
    new Set(procedimentos.map((p) => monthKeyFromDate(p.data)).filter(Boolean))
  ).sort().reverse();
  const mesSelecionado = mes || meses[0] || '';

  const doMes = procedimentos.filter((p) => monthKeyFromDate(p.data) === mesSelecionado);
  const filtrados = doMes.filter(
    (p) =>
      (escopo === 'Todos' || p.tipo === escopo) &&
      (pagamento === 'Todos' || p.tipo_pagamento === pagamento)
  );
  const rotulo = [
    OPCOES.find((o) => o.valor === escopo).label,
    pagamento === 'Todos' ? null : PAGAMENTOS.find((o) => o.valor === pagamento).label,
  ]
    .filter(Boolean)
    .join(' · ');
  const consultas = filtrados.filter((p) => p.tipo === 'Consulta');
  const cirurgias = filtrados.filter((p) => p.tipo === 'Cirurgia');
  const total = somar(filtrados);
  const manha = somar(consultas.filter((c) => periodoDe(c) === 'Manhã'));
  const tarde = somar(consultas.filter((c) => periodoDe(c) === 'Tarde'));

  return (
    <Dialog open={isOpen} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Resumo dos atendimentos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-56">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Mês</label>
              <Select value={mesSelecionado} onValueChange={setMes}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {meses.length === 0 ? (
                    <SelectItem value="vazio" disabled>Sem atendimentos registados</SelectItem>
                  ) : (
                    meses.map((chave) => (
                      <SelectItem key={chave} value={chave}>{formatMonthLabel(chave)}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Incluir no PDF</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                {OPCOES.map((opcao) => (
                  <button
                    key={opcao.valor}
                    type="button"
                    onClick={() => setEscopo(opcao.valor)}
                    className={`px-4 h-9 text-sm font-semibold transition-colors ${
                      escopo === opcao.valor ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opcao.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-40">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Pagamento</label>
              <Select value={pagamento} onValueChange={setPagamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Pagamento" />
                </SelectTrigger>
                <SelectContent>
                  {PAGAMENTOS.map((opcao) => (
                    <SelectItem key={opcao.valor} value={opcao.valor}>{opcao.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              disabled={filtrados.length === 0}
              onClick={() =>
                gerarPdfResumoAtendimentos({
                  mesLabel: formatMonthLabel(mesSelecionado),
                  escopo,
                  rotulo,
                  itens: filtrados,
                  mostrarValores,
                })
              }
            >
              <FileDown className="w-4 h-4 mr-2" />
              Gerar PDF
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Mostrar valores no PDF</span>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {[{ valor: true, label: 'Sim' }, { valor: false, label: 'Não' }].map((opcao) => (
                <button
                  key={opcao.label}
                  type="button"
                  onClick={() => setMostrarValores(opcao.valor)}
                  className={`px-4 h-8 text-sm font-semibold transition-colors ${
                    mostrarValores === opcao.valor ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {opcao.label}
                </button>
              ))}
            </div>
          </div>

          {filtrados.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum atendimento registado com este filtro.</p>
          ) : (
            <>
              <Caixa
                titulo={`${escopo === 'Todos' ? 'Total de atendimentos' : escopo === 'Consulta' ? 'Total de consultas' : 'Total de cirurgias'} · ${formatMonthLabel(mesSelecionado)}`}
                quantidade={total.quantidade}
                valor={total.valor}
                unidade={escopo === 'Cirurgia' ? 'cirurgias' : escopo === 'Consulta' ? 'consultas' : 'atendimentos'}
                destaque
              />
              {escopo === 'Todos' && (
                <div className="grid grid-cols-2 gap-3">
                  <Caixa titulo="Consultas" quantidade={somar(consultas).quantidade} valor={somar(consultas).valor} unidade="consultas" />
                  <Caixa titulo="Cirurgias" quantidade={somar(cirurgias).quantidade} valor={somar(cirurgias).valor} unidade="cirurgias" />
                </div>
              )}
              {escopo !== 'Cirurgia' && (
                <div className="grid grid-cols-2 gap-3">
                  <Caixa titulo="Consultas de manhã" quantidade={manha.quantidade} valor={manha.valor} unidade="consultas" />
                  <Caixa titulo="Consultas de tarde" quantidade={tarde.quantidade} valor={tarde.valor} unidade="consultas" />
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}