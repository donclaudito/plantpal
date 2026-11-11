import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { jsPDF } from 'npm:jspdf@4.0.0';

const formatarData = (valor) => {
  const texto = String(valor || '');
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) return texto || '-';
  return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
};

const formatarMoeda = (valor) => `R$ ${(Number(valor) || 0).toFixed(2)}`;

const quantidadeDe = (procedimento) => {
  const quantidade = Number(procedimento?.quantidade);
  return quantidade > 0 ? quantidade : 1;
};

const totalDe = (procedimento) => (Number(procedimento?.valor) || 0) * quantidadeDe(procedimento);

function montarRecibo(procedimento, hospital, emitidoEm) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margem = 18;
  const largura = 174;
  let y = 24;

  doc.setFillColor(22, 163, 74);
  doc.rect(0, 0, 210, 12, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(17, 24, 39);
  doc.text('RECIBO DE PROCEDIMENTO', margem, y);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(`Recibo nº ${String(procedimento.id || '').slice(-8).toUpperCase()}`, margem, y);
  doc.text(`Emitido em ${emitidoEm}`, margem + largura, y, { align: 'right' });

  y += 8;
  doc.setDrawColor(229, 231, 235);
  doc.line(margem, y, margem + largura, y);

  const linhas: [string, string][] = [
    ['Paciente', procedimento.paciente || '-'],
    ['Médico', procedimento.doctor_name || '-'],
    ['Hospital', hospital?.name || procedimento.hospital_name || '-'],
    ['Data do procedimento', formatarData(procedimento.data)],
    ['Tipo', procedimento.tipo || '-'],
    ['Pagamento', procedimento.tipo_pagamento || '-'],
  ];

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
  doc.text('Descrição', margem, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(17, 24, 39);
  const descricao = doc.splitTextToSize(procedimento.descricao || '-', largura);
  doc.text(descricao, margem, y);
  y += descricao.length * 5 + 6;

  doc.setFillColor(243, 244, 246);
  doc.rect(margem, y, largura, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81);
  doc.text('Quantidade', margem + 4, y + 7);
  doc.text('Valor unitário', margem + 50, y + 7);
  doc.text('Total', margem + largura - 4, y + 7, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(17, 24, 39);
  doc.text(String(quantidadeDe(procedimento)), margem + 4, y + 16);
  doc.text(formatarMoeda(procedimento.valor), margem + 50, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.text(formatarMoeda(totalDe(procedimento)), margem + largura - 4, y + 16, { align: 'right' });

  y += 32;
  if (procedimento.observacoes) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 65, 81);
    doc.text('Observações', margem, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(17, 24, 39);
    const observacoes = doc.splitTextToSize(procedimento.observacoes, largura);
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

const paraBase64 = (bytes: Uint8Array) => {
  let binario = '';
  const bloco = 0x8000;
  for (let i = 0; i < bytes.length; i += bloco) {
    binario += String.fromCharCode(...bytes.subarray(i, i + bloco));
  }
  return btoa(binario);
};

const textoParaBase64 = (texto: string) => paraBase64(new TextEncoder().encode(texto));

const quebrarLinhas = (base64: string) => base64.replace(/(.{76})/g, '$1\r\n');

const base64Url = (texto: string) =>
  paraBase64(new TextEncoder().encode(texto)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function montarMensagem({ destinatario, assunto, corpo, pdfBase64, nomeFicheiro }) {
  const fronteira = `recibo_${crypto.randomUUID()}`;
  const partes = [
    `To: ${destinatario}`,
    `Subject: =?UTF-8?B?${textoParaBase64(assunto)}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${fronteira}"`,
    '',
    `--${fronteira}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    quebrarLinhas(textoParaBase64(corpo)),
    '',
    `--${fronteira}`,
    `Content-Type: application/pdf; name="${nomeFicheiro}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${nomeFicheiro}"`,
    '',
    quebrarLinhas(pdfBase64),
    '',
    `--${fronteira}--`,
    '',
  ];
  return partes.join('\r\n');
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Sessão inválida.' }, { status: 401 });

    const { procedimento_id, email_destino } = await req.json().catch(() => ({}));
    if (!procedimento_id) return Response.json({ error: 'Procedimento não indicado.' }, { status: 400 });

    const procedimento = await base44.entities.Procedimento
      .get(procedimento_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!procedimento) return Response.json({ error: 'Procedimento não encontrado.' }, { status: 404 });

    const { items: hospitais } = await base44.entities.Hospital.filter({}, { limit: 200 });
    const hospital = hospitais.find((h) => h.id === procedimento.hospital_id)
      || hospitais.find((h) => h.name === procedimento.hospital_name)
      || null;

    const destinatario = String(email_destino || hospital?.email || '').trim();
    if (!/.+@.+\..+/.test(destinatario)) {
      return Response.json({ error: 'Indique um e-mail válido do hospital.' }, { status: 400 });
    }

    const emitidoEm = formatarData(new Date().toISOString());
    const pdf = new Uint8Array(montarRecibo(procedimento, hospital, emitidoEm));

    const referencia = String(procedimento.id || '').slice(-8).toLowerCase();
    const nomeFicheiro = `recibo-${referencia}.pdf`;
    const assunto = `Recibo de procedimento - ${hospital?.name || procedimento.hospital_name || 'hospital'} - ${formatarData(procedimento.data)}`;
    const corpo = [
      'Segue em anexo o recibo do procedimento realizado.',
      '',
      `Paciente: ${procedimento.paciente || '-'}`,
      `Médico: ${procedimento.doctor_name || '-'}`,
      `Data: ${formatarData(procedimento.data)}`,
      `Procedimento: ${procedimento.tipo || '-'} - ${procedimento.descricao || '-'}`,
      `Total: ${formatarMoeda(totalDe(procedimento))}`,
      '',
      `Emitido por: ${user.full_name || user.email}`,
    ].join('\n');

    const mensagem = montarMensagem({
      destinatario,
      assunto,
      corpo,
      pdfBase64: paraBase64(pdf),
      nomeFicheiro,
    });

    let accessToken: string | undefined;
    try {
      const conexao = await base44.asServiceRole.connectors.getConnection('gmail');
      accessToken = conexao?.accessToken;
    } catch {
      accessToken = undefined;
    }
    if (!accessToken) {
      return Response.json({
        error: 'A conta Gmail ainda não está conectada. Autorize o envio para o recibo sair.',
      }, { status: 400 });
    }

    const resposta = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: base64Url(mensagem) }),
      signal: AbortSignal.timeout(20000),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text();
      return Response.json({
        error: `O Gmail recusou o envio (${resposta.status}). Verifique a conexão da conta.`,
        detalhe,
      }, { status: 502 });
    }

    await base44.asServiceRole.entities.Procedimento.update(procedimento_id, {
      recibo_enviado_em: new Date().toISOString(),
      recibo_enviado_para: destinatario,
    });

    return Response.json({ enviado: true, destinatario, assunto });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}