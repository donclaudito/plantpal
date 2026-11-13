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

const normalizarNome = (valor) =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const nomeProprio = (valor) =>
  String(valor || '')
    .toLowerCase()
    .replace(/(^|[\s-])([a-zà-öø-ÿ])/g, (_, separador, letra) => separador + letra.toUpperCase())
    .trim();

const nomeMedicoDe = (procedimento, medicos) => {
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

const escaparHtml = (valor) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const convenioDe = (procedimento) => {
  const achado = /Conv[eê]nio:\s*([^•\n]+)/i.exec(String(procedimento?.observacoes || ''));
  return achado ? achado[1].trim() : '';
};

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

const PASTA_DRIVE = 'Recibos de Plantão';

const obterPastaDrive = async (accessToken: string) => {
  const busca = new URL('https://www.googleapis.com/drive/v3/files');
  busca.searchParams.set(
    'q',
    `mimeType='application/vnd.google-apps.folder' and name='${PASTA_DRIVE}' and trashed=false`
  );
  busca.searchParams.set('fields', 'files(id,name)');
  const resposta = await fetch(busca, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!resposta.ok) throw new Error(`Google Drive respondeu ${resposta.status}`);
  const dados = await resposta.json();
  if (dados.files?.[0]?.id) return dados.files[0].id;

  const criada = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: PASTA_DRIVE, mimeType: 'application/vnd.google-apps.folder' }),
  });
  if (!criada.ok) throw new Error(`Google Drive respondeu ${criada.status}`);
  return (await criada.json()).id;
};

const guardarNoDrive = async (accessToken: string, pdf: Uint8Array, nomeFicheiro: string) => {
  const pasta = await obterPastaDrive(accessToken);
  const fronteira = `recibo_${crypto.randomUUID()}`;
  const cabecalho = new TextEncoder().encode(
    `--${fronteira}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify({ name: nomeFicheiro, parents: [pasta] }) +
      `\r\n--${fronteira}\r\nContent-Type: application/pdf\r\n\r\n`
  );
  const rodape = new TextEncoder().encode(`\r\n--${fronteira}--`);
  const corpo = new Uint8Array(cabecalho.length + pdf.length + rodape.length);
  corpo.set(cabecalho, 0);
  corpo.set(pdf, cabecalho.length);
  corpo.set(rodape, cabecalho.length + pdf.length);

  const resposta = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${fronteira}`,
      },
      body: corpo,
      signal: AbortSignal.timeout(20000),
    }
  );
  if (!resposta.ok) throw new Error(`Google Drive respondeu ${resposta.status}`);
  return resposta.json();
};

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

function montarCorpoHtml({ nomeMedico, referencia, emitidoEm, linhas, total, emitidoPor }) {
  const detalhes = linhas
    .map(
      ([rotulo, valor]) => `<tr>
              <td style="padding:6px 0;font-size:13px;color:#737373;width:140px;vertical-align:top;">${escaparHtml(rotulo)}</td>
              <td style="padding:6px 0;font-size:14px;color:#0a0a0a;font-weight:bold;">${escaparHtml(valor)}</td>
            </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f4f5f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
          <tr>
            <td style="background:#16a34a;padding:16px 24px;font-size:16px;font-weight:bold;color:#000000;letter-spacing:0.5px;">PROCEDIMENTO REALIZADO</td>
          </tr>
          <tr>
            <td style="padding:24px 24px 4px;">
              <p style="margin:0;font-size:22px;font-weight:bold;color:#0a0a0a;">${escaparHtml(nomeMedico)}</p>
              <p style="margin:6px 0 0;font-size:12px;color:#737373;">Recibo nº ${escaparHtml(referencia)} &middot; Emitido em ${escaparHtml(emitidoEm)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${detalhes}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
                <tr>
                  <td style="padding:14px 16px;font-size:14px;color:#166534;font-weight:bold;">Total</td>
                  <td align="right" style="padding:14px 16px;font-size:20px;color:#166534;font-weight:bold;">${escaparHtml(total)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;font-size:12px;color:#737373;line-height:1.6;">
              Segue também em anexo o recibo em PDF.<br />
              Emitido por: ${escaparHtml(emitidoPor)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function montarMensagem({ destinatario, assunto, corpo, pdfBase64, nomeFicheiro }) {
  const fronteira = `recibo_${crypto.randomUUID()}`;
  const partes = [
    `To: ${destinatario}`,
    `Subject: =?UTF-8?B?${textoParaBase64(assunto)}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${fronteira}"`,
    '',
    `--${fronteira}`,
    'Content-Type: text/html; charset="UTF-8"',
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
      || hospitais.find((h) => normalizarNome(h.name) === normalizarNome(procedimento.hospital_name))
      || null;

    const { items: medicos } = await base44.entities.Doctor.filter({}, { limit: 200 });
    const nomeMedico = nomeMedicoDe(procedimento, medicos);
    const procedimentoExibicao = { ...procedimento, doctor_name: nomeMedico };

    const destinatario = String(email_destino || hospital?.email || '').trim();
    if (!/.+@.+\..+/.test(destinatario)) {
      return Response.json({ error: 'Indique um e-mail válido do hospital.' }, { status: 400 });
    }

    const emitidoEm = formatarData(new Date().toISOString());
    const pdf = new Uint8Array(montarRecibo(procedimentoExibicao, hospital, emitidoEm));

    const referencia = String(procedimento.id || '').slice(-8).toLowerCase();
    const nomeFicheiro = `recibo-${referencia}.pdf`;

    // Cópia automática na pasta do Google Drive
    let copiaDrive: any;
    try {
      const { accessToken: tokenDrive } = await base44.asServiceRole.connectors.getConnection('googledrive');
      copiaDrive = await guardarNoDrive(tokenDrive, pdf, nomeFicheiro);
    } catch (e: any) {
      copiaDrive = { erro: e.message };
    }
    const assunto = `Recibo de procedimento - ${hospital?.name || procedimento.hospital_name || 'hospital'} - ${formatarData(procedimento.data)}`;
    const linhasEmail: [string, string][] = [
      ['Paciente', procedimento.paciente || '-'],
      ['Médico', nomeMedico],
      ['Hospital', hospital?.name || procedimento.hospital_name || '-'],
      ['Data', formatarData(procedimento.data)],
      ['Procedimento', `${procedimento.tipo || '-'} - ${procedimento.descricao || '-'}`],
      ['Pagamento', procedimento.tipo_pagamento || '-'],
    ];
    const corpo = montarCorpoHtml({
      nomeMedico,
      referencia: String(procedimento.id || '').slice(-8).toUpperCase(),
      emitidoEm,
      linhas: linhasEmail,
      total: formatarMoeda(totalDe(procedimento)),
      emitidoPor: user.full_name || user.email,
    });

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

    return Response.json({ enviado: true, destinatario, assunto, drive: copiaDrive });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}