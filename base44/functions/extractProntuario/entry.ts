import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const schemaProntuario = {
  type: 'object',
  properties: {
    paciente: { type: 'string', description: 'Nome completo do paciente' },
    data: { type: 'string', description: 'Data da cirurgia no formato YYYY-MM-DD' },
    convenio: { type: 'string', description: 'Convênio ou forma de pagamento indicada no documento' },
    tipo_cirurgia: { type: 'string', description: 'Tipo ou especialidade da cirurgia' },
    nome_cirurgia: { type: 'string', description: 'Nome do procedimento cirúrgico realizado' }
  },
  required: ['paciente', 'data', 'convenio', 'tipo_cirurgia', 'nome_cirurgia']
};

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { fileUri } = await req.json().catch(() => ({}));
    if (!fileUri || typeof fileUri !== 'string') {
      return Response.json({ error: 'fileUri é obrigatório' }, { status: 400 });
    }

    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 600 });

    const dados = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analise a imagem anexada de um prontuário ou ficha cirúrgica e extraia os dados da cirurgia.

Regras:
- "paciente": nome completo do paciente.
- "data": data da cirurgia ou do atendimento, sempre no formato YYYY-MM-DD. Se o documento trouxer só dia e mês, assuma o ano atual.
- "convenio": convênio ou forma de pagamento (por exemplo SUS, Unimed, Bradesco Saúde, Particular). Se não estiver explícito, devolva string vazia.
- "tipo_cirurgia": tipo ou especialidade cirúrgica (por exemplo Cirurgia Geral, Ortopedia, Videolaparoscopia).
- "nome_cirurgia": nome do procedimento realizado.
Devolva string vazia em qualquer campo que não esteja legível no documento. Não invente dados.`,
      file_urls: [signed_url],
      response_json_schema: schemaProntuario
    });

    return Response.json(dados);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}