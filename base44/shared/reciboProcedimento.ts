import { jsPDF } from 'npm:jspdf@4.0.0';

export const formatarData = (valor) => {
  const texto = String(valor || '');
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) return texto || '-';
  return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
};

export const formatarMoeda = (valor) => `R$ ${(Number(valor) || 0).toFixed(2)}`;

export const normalizarNome = (valor) =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

export const nomeProprio = (valor) =>
  String(valor || '')
    .toLowerCase()
    .replace(/(^|[\s-])([a-zà-öø-ÿ])/g, (_, separador, letra) => separador + letra.toUpperCase())
    .trim();

export const nomeMedicoDe = (procedimento, medicos) => {
  const alvo = normalizarNome(procedimento?.doctor_name);
  const medico =
    medicos.find((d) => d.id && d.id === procedimento?.doctor_id) ||
    medicos.find((d) => normalizarNome(d.full_name) === alvo) ||
    (alvo ? medicos.find((d) => normalizarNome(d.full_name).includes(alvo)) : null) ||
    null;
  const bruto = nomeProprio(medico?.full_name || procedimento?.doctor_name || '');
  if (!bruto) return '-';
  const titulo = /^(dr|dra)\.?\s+/i.exec(bruto);
  const semTitulo = bruto.replace(/^(dr|dra)\.?\s+/i, '');
  const prefixo = titulo ? titulo[1][0].toUpperCase() + titulo[1].slice(1).toLowerCase() : 'Dr';
  return `${prefixo} ${semTitulo}`.trim();
};

export const convenioDe = (procedimento) => {
  const achado = /Conv[eê]nio:\s*([^•\n]+)/i.exec(String(procedimento?.observacoes || ''));
  return achado ? achado[1].trim() : '';
};

export const quantidadeDe = (procedimento) => {
  const quantidade = Number(procedimento?.quantidade);
  return quantidade > 0 ? quantidade : 1;
};

export const totalDe = (procedimento) => (Number(procedimento?.valor) || 0) * quantidadeDe(procedimento);

export const paraBase64 = (bytes: Uint8Array) => {
  let binario = '';
  const bloco = 0x8000;
  for (let i = 0; i < bytes.length; i += bloco) {
    binario += String.fromCharCode(...bytes.subarray(i, i + bloco));
  }
  return btoa(binario);
};

export function montarRecibo(procedimento, hospital, emitidoEm) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margem = 18;
  const largura = 174;
  let y = 24;

  doc.setFillColor(22, 163, 74);
  doc.rect(0, 0, 210, 12, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(17, 24, 39);
  doc.text('PROCEDIMENTO REALIZADO', margem, y);

  y += 7;
  doc.setFontSize(11);
  doc.setTextColor(55, 65, 81);
  doc.text(procedimento.doctor_name || '-', margem, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(`Recibo nº ${String(procedimento.id || '').slice(-8).toUpperCase()}`, margem, y);
  doc.text(`Emitido em ${emitidoEm}`, margem + largura, y, { align: 'right' });

  y += 8;
  doc.setDrawColor(229, 231, 235);
  doc.line(margem, y, margem + largura, y);

  const ficha = procedimento.ficha || {};
  const ehCirurgia = procedimento.tipo === 'Cirurgia';

  const linhas: [string, string][] = [
    ['Paciente', procedimento.paciente || '-'],
    ['Médico', procedimento.doctor_name || '-'],
    ['Hospital', hospital?.name || procedimento.hospital_name || '-'],
    [ehCirurgia ? 'Data da cirurgia' : 'Data do procedimento', formatarData(procedimento.data)],
    ['Tipo', procedimento.tipo || '-'],
    ['Pagamento', procedimento.tipo_pagamento || '-'],
  ];
  const convenio = convenioDe(procedimento);
  if (convenio) linhas.push(['Convênio', convenio]);

  y += 8;
  doc.setFontSize(10);
  for (const [rotulo, valor] of linhas) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 65, 81);
    doc.text(rotulo, margem, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(17, 24, 39);
    doc.text(doc.splitTextToSize(String(valor), 110), margem + 60, y);
    y += 7;
  }

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81);
  doc.text(ehCirurgia ? 'Cirurgia' : 'Descrição', margem, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(17, 24, 39);
  const descricao = doc.splitTextToSize(procedimento.descricao || '-', largura);
  doc.text(descricao, margem, y);
  y += descricao.length * 5 + 4;

  const dadosCirurgia: [string, string][] = [
    ['Prontuário', ficha.prontuario],
    ['Atendimento', ficha.atendimento],
    ['Prescrição', ficha.prescricao],
    ['Código da cirurgia', ficha.cirurgia_codigo],
    ['Caráter cirúrgico', ficha.carater_cirurgico],
    ['Duração', ficha.duracao],
    ['Setor', ficha.setor],
    ['Acomodação', ficha.acomodacao],
    ['Internamento', ficha.tipo_internamento],
    ['Sexo', ficha.sexo],
    ['Nascimento', ficha.data_nascimento],
    ['Mãe', ficha.mae],
  ].filter(([, valor]) => String(valor || '').trim());

  if (dadosCirurgia.length) {
    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 65, 81);
    doc.text('Dados da cirurgia', margem, y);
    y += 6;
    doc.setFontSize(9);
    for (const [rotulo, valor] of dadosCirurgia) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(107, 114, 128);
      doc.text(rotulo, margem, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(17, 24, 39);
      doc.text(doc.splitTextToSize(String(valor), 110), margem + 60, y);
      y += 6;
    }
    doc.setFontSize(10);
  }

  y += 4;

  doc.setFillColor(243, 244, 246);
  doc.rect(margem, y, largura, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81);
  doc.text(ehCirurgia ? 'Quantidade' : 'Consultas', margem + 4, y + 7);
  doc.text(ehCirurgia ? 'Valor unitário' : 'Valor da consulta', margem + 50, y + 7);
  doc.text('Total', margem + largura - 4, y + 7, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(17, 24, 39);
  doc.text(String(quantidadeDe(procedimento)), margem + 4, y + 16);
  doc.text(formatarMoeda(procedimento.valor), margem + 50, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.text(formatarMoeda(totalDe(procedimento)), margem + largura - 4, y + 16, { align: 'right' });

  y += 32;
  const observacoesTexto = String(procedimento.observacoes || '')
    .replace(/Conv[eê]nio:\s*[^•\n]*/i, '')
    .replace(/^•\s*/, '')
    .replace(/\s*•\s*$/, '')
    .trim();
  if (observacoesTexto) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 65, 81);
    doc.text('Observações', margem, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(17, 24, 39);
    const observacoes = doc.splitTextToSize(observacoesTexto, largura);
    doc.text(observacoes, margem, y);
    y += observacoes.length * 5;
  }

  y = Math.max(y + 20, 240);
  doc.setDrawColor(156, 163, 175);
  doc.line(margem, y, margem + 80, y);
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(procedimento.doctor_name || 'Assinatura do médico', margem, y + 5);

  return doc.output('arraybuffer');
}