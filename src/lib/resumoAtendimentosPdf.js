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

const ESCURO = [17, 24, 39];
const CINZA_CLARO = [243, 244, 246];
const CINZA_BORDA = [229, 231, 235];
const CINZA_TEXTO = [107, 114, 128];
const VERDE = [22, 163, 74];

const corta = (texto, max) => {
  const t = String(texto || '-');
  return t.length > max ? `${t.slice(0, max - 3)}...` : t;
};

const nomeArquivo = (mesLabel, rotulo) =>
  `resumo-${mesLabel}-${rotulo}`.normalize('NFD').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();

function construirDoc({ mesLabel, escopo = 'Todos', rotulo = 'Tudo', itens, mostrarValores = true }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const consultas = itens.filter((p) => p.tipo === 'Consulta');
  const cirurgias = itens.filter((p) => p.tipo === 'Cirurgia');
  const total = somar(itens);

  const caixas = [{ label: 'TOTAL DE ATENDIMENTOS', dados: total, unidade: 'atendimentos' }];
  if (escopo !== 'Cirurgia') {
    caixas.push(
      { label: 'CONSULTAS', dados: somar(consultas), unidade: 'consultas' },
      { label: 'MANHÃ', dados: somar(consultas.filter((c) => periodoDe(c) === 'Manhã')), unidade: 'consultas' },
      { label: 'TARDE', dados: somar(consultas.filter((c) => periodoDe(c) === 'Tarde')), unidade: 'consultas' }
    );
  }
  if (escopo !== 'Consulta') {
    caixas.push({ label: 'CIRURGIAS', dados: somar(cirurgias), unidade: 'cirurgias' });
  }

  // Cabeçalho
  doc.setFillColor(...ESCURO);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setFillColor(...VERDE);
  doc.rect(0, 32, 210, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('RESUMO DE ATENDIMENTOS', 20, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`${mesLabel}  ·  ${rotulo}`, 20, 23.5);

  doc.setFontSize(8);
  doc.text('REFUA CATAN', 190, 14, { align: 'right' });
  doc.setTextColor(190, 195, 205);
  doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`, 190, 23.5, { align: 'right' });

  // Indicadores
  let y = 45;
  const gap = 4;
  const largura = (170 - gap * (caixas.length - 1)) / caixas.length;

  caixas.forEach((caixa, i) => {
    const x = 20 + i * (largura + gap);
    doc.setFillColor(...CINZA_CLARO);
    doc.setDrawColor(...CINZA_BORDA);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, largura, 26, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...CINZA_TEXTO);
    doc.setFontSize(6.5);
    doc.text(caixa.label, x + 4, y + 7);

    doc.setTextColor(...ESCURO);
    doc.setFontSize(largura < 34 ? 15 : 17);
    doc.text(String(caixa.dados.quantidade), x + 4, y + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...CINZA_TEXTO);
    const legenda = mostrarValores ? `${caixa.unidade} · ${brl(caixa.dados.valor)}` : caixa.unidade;
    doc.text(corta(legenda, largura < 34 ? 22 : 34), x + 4, y + 22);
  });

  y += 34;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ESCURO);
  doc.setFontSize(11);
  doc.text('DETALHAMENTO', 20, y);
  y += 6;

  const col = mostrarValores
    ? { data: 20, tipo: 44, medico: 72, hospital: 122, qtd: 166, valor: 190 }
    : { data: 20, tipo: 44, medico: 72, hospital: 122, qtd: 190 };

  const desenhaCabecalho = () => {
    doc.setFillColor(...ESCURO);
    doc.rect(20, y, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('DATA', col.data + 3, y + 5.4);
    doc.text('TIPO', col.tipo, y + 5.4);
    doc.text('MÉDICO', col.medico, y + 5.4);
    doc.text('HOSPITAL', col.hospital, y + 5.4);
    doc.text('QTD', col.qtd, y + 5.4, { align: 'right' });
    if (mostrarValores) doc.text('VALOR', col.valor, y + 5.4, { align: 'right' });
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
  };

  desenhaCabecalho();

  itens
    .slice()
    .sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')))
    .forEach((item, indice) => {
      if (y > 266) {
        doc.addPage();
        y = 20;
        desenhaCabecalho();
      }
      if (indice % 2 === 0) {
        doc.setFillColor(...CINZA_CLARO);
        doc.rect(20, y, 170, 7, 'F');
      }
      doc.setTextColor(55, 65, 81);
      doc.text(item.data ? formatDatePtBr(item.data) : '-', col.data + 3, y + 4.8);
      doc.text(String(item.tipo || '-'), col.tipo, y + 4.8);
      doc.text(corta(item.doctor_name, 26), col.medico, y + 4.8);
      doc.text(corta(item.hospital_name, 22), col.hospital, y + 4.8);
      doc.text(String(procedimentoQuantidade(item)), col.qtd, y + 4.8, { align: 'right' });
      if (mostrarValores) {
        doc.text(brl(procedimentoTotal(item)), col.valor, y + 4.8, { align: 'right' });
      }
      y += 7;
    });

  if (y > 258) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(...ESCURO);
  doc.setLineWidth(0.5);
  doc.line(20, y + 1, 190, y + 1);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...ESCURO);
  doc.text('TOTAL', col.tipo, y + 7);
  doc.text(String(total.quantidade), col.qtd, y + 7, { align: 'right' });
  if (mostrarValores) doc.text(brl(total.valor), col.valor, y + 7, { align: 'right' });

  // Rodapé
  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    doc.setPage(pagina);
    doc.setDrawColor(...CINZA_BORDA);
    doc.setLineWidth(0.3);
    doc.line(20, 283, 190, 283);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...CINZA_TEXTO);
    doc.text(`Resumo de atendimentos · ${mesLabel}`, 20, 288);
    doc.text(`Página ${pagina} de ${paginas}`, 190, 288, { align: 'right' });
  }

  return doc;
}

export default function gerarPdfResumoAtendimentos(opcoes) {
  const doc = construirDoc(opcoes);
  doc.save(`${nomeArquivo(opcoes.mesLabel, opcoes.rotulo)}.pdf`);
}

export function imprimirResumoAtendimentos(opcoes) {
  const doc = construirDoc(opcoes);
  const url = doc.output('bloburl');

  // Janela centrada no ecrã e com proporção próxima da folha A4,
  // para o documento aparecer enquadrado em vez de encostado à esquerda.
  const disponivelLargura = window.screen.availWidth || window.innerWidth;
  const disponivelAltura = window.screen.availHeight || window.innerHeight;
  const altura = Math.round(Math.min(disponivelAltura * 0.92, 1000));
  const largura = Math.round(Math.min(disponivelLargura * 0.9, altura * 0.75, 820));
  const esquerda = Math.max(0, Math.round((disponivelLargura - largura) / 2));
  const topo = Math.max(0, Math.round((disponivelAltura - altura) / 2));

  const janela = window.open(
    url,
    '_blank',
    `width=${largura},height=${altura},left=${esquerda},top=${topo}`
  );
  if (!janela) doc.save(`${nomeArquivo(opcoes.mesLabel, opcoes.rotulo)}.pdf`);
}