import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  especialidadeDe,
  formatarData,
  formatarMoeda,
  montarRecibo,
  nomeMedicoDe,
  normalizarNome,
  paraBase64,
  totalDe,
} from '../../shared/reciboProcedimento.ts';

const escaparHtml = (valor) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function montarCorpoHtml({ tipo, paciente, prontuario, atendimento, data, procedimento, convenio, nomeMedico, referencia, valor }) {
  const linhas: [string, string][] = [
    ['Paciente', paciente],
    ['Prontuário', prontuario],
    ['Atendimento', atendimento],
    ['Data do Procedimento', data],
    ['Procedimento', procedimento],
    ['Convênio', convenio],
    ['Médico Responsável', nomeMedico],
    ['Procedimento nº', `${referencia} (Valor: ${valor})`],
  ];

  const detalhes = linhas
    .map(
      ([rotulo, conteudo]) => `<tr>
                <td style="padding:8px 0;font-size:13px;color:#737373;width:170px;vertical-align:top;border-bottom:1px solid #f0f0f0;">${escaparHtml(rotulo)}</td>
                <td style="padding:8px 0;font-size:14px;color:#0a0a0a;border-bottom:1px solid #f0f0f0;">${escaparHtml(conteudo)}</td>
              </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f4f5f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#0a0a0a;">
          <tr>
            <td style="height:6px;background:#16a34a;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:24px 28px 0;">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#16a34a;font-weight:bold;">Encaminhamento de documentação</p>
              <p style="margin:0;font-size:18px;font-weight:bold;">Faturamento de ${escaparHtml(tipo)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 0;font-size:14px;line-height:1.65;">
              <p style="margin:0 0 14px;">Prezada equipe do Setor de Faturamento,</p>
              <p style="margin:0 0 20px;">Encaminho em anexo a documentação referente ao procedimento realizado.</p>
              <p style="margin:0 0 6px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:#166534;">Dados do atendimento</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${detalhes}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 24px;font-size:14px;line-height:1.65;">
              <p style="margin:0 0 18px;">Fico à disposição caso seja necessário o envio de qualquer documento complementar para a regularização do processo.</p>
              <p style="margin:0;">Atenciosamente,</p>
              <p style="margin:2px 0 0;font-weight:bold;">${escaparHtml(nomeMedico)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const textoParaBase64 = (texto: string) => paraBase64(new TextEncoder().encode(texto));

const quebrarLinhas = (base64: string) => base64.replace(/(.{76})/g, '$1\r\n');

const base64Url = (texto: string) =>
  paraBase64(new TextEncoder().encode(texto)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

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
    const procedimentoExibicao = {
      ...procedimento,
      doctor_name: nomeMedico,
      especialidade: especialidadeDe(procedimento, medicos),
    };

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
    const tipo = procedimento.tipo || 'Procedimento';
    const paciente = procedimento.paciente || 'não informado';
    const ficha = (procedimento.ficha || {}) as Record<string, unknown>;
    const assunto = `Encaminhamento de Documentação – Faturamento de ${tipo} (Paciente: ${paciente})`;
    const corpo = montarCorpoHtml({
      tipo,
      paciente,
      prontuario: ficha.prontuario || '-',
      atendimento: ficha.atendimento || '-',
      data: formatarData(procedimento.data),
      procedimento: `${tipo} - ${procedimento.descricao || '-'}`,
      convenio: hospital?.name || procedimento.hospital_name || '-',
      nomeMedico,
      referencia: String(procedimento.id || '').slice(-8).toUpperCase(),
      valor: formatarMoeda(totalDe(procedimento)),
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