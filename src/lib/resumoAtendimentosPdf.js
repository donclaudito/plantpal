import jsPDF from 'jspdf';
import { procedimentoQuantidade, procedimentoTotal } from '@/lib/procedimentoTotals';
import { formatDatePtBr } from '@/lib/dateKeys';

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

export default function gerarPdfResumoAtendimentos({ mesLabel, itens }) {
  const doc = new jsPDF();
  const consultas = itens.filter((p) => p.tipo === 'Consulta');
  const cirurgias = itens.filter((p) => p.tipo === 'Cirurgia');
  const total = somar(itens);
  const manha = somar(consultas.filter((c) => periodoDe(c) === 'Manhã'));
  const tarde = somar(consultas.filter((c) => periodoDe(c) === 'Tarde'));

  doc.setFontSize(18);
  doc.text('RESUMO DE ATENDIMENTOS', 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.text(`Mês: ${mesLabel}`, 20, 34);
  doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 42);

  doc.setFontSize(14);
  doc.text('TOTAIS DO PERÍODO', 20, 56);
  doc.setFontSize(11);
  doc.text(`Total de atendimentos: ${total.quantidade}`, 20, 66);
  doc.text(`Valor total: ${brl(total.valor)}`, 20, 73);
  doc.text(`Consultas: ${somar(consultas).quantidade} — ${brl(somar(consultas).valor)}`, 20, 80);
  doc.text(`Cirurgias: ${somar(cirurgias).quantidade} — ${brl(somar(cirurgias).valor)}`, 20, 87);
  doc.text(`Consultas de manhã: ${manha.quantidade}`, 20, 94);
  doc.text(`Consultas de tarde: ${tarde.quantidade}`, 20, 101);

  const colunas = [20, 45, 75, 130, 172, 186];
  const cabecalho = ['Data', 'Tipo', 'Médico', 'Hospital', 'Qtd', 'Valor'];
  let y = 118;

  doc.setFontSize(14);
  doc.text('ATENDIMENTOS', 20, y);
  y += 8;

  const escreverCabecalho = () => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    cabecalho.forEach((texto, i) => doc.text(texto, colunas[i], y));
    doc.setFont('helvetica', 'normal');
    y += 6;
  };

  escreverCabecalho();

  itens
    .slice()
    .sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')))
    .forEach((item) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
        escreverCabecalho();
      }
      doc.setFontSize(9);
      doc.text(item.data ? formatDatePtBr(item.data) : '-', colunas[0], y);
      doc.text(String(item.tipo || '-'), colunas[1], y);
      doc.text(String(item.doctor_name || '-').substring(0, 28), colunas[2], y);
      doc.text(String(item.hospital_name || '-').substring(0, 22), colunas[3], y);
      doc.text(String(procedimentoQuantidade(item)), colunas[4], y);
      doc.text(brl(procedimentoTotal(item)), colunas[5], y);
      y += 6;
    });

  doc.save(`resumo-atendimentos-${mesLabel.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}