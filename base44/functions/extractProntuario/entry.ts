import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const schemaProntuario = {
  type: 'object',
  properties: {
    paciente: { type: 'string', description: 'Nome completo do paciente' },
    data: { type: 'string', description: 'Data da cirurgia ou do internamento no formato YYYY-MM-DD' },
    convenio: { type: 'string', description: 'Convênio ou forma de pagamento indicada no documento' },
    tipo_cirurgia: { type: 'string', description: 'Tipo ou especialidade da cirurgia' },
    nome_cirurgia: { type: 'string', description: 'Nome do procedimento cirúrgico realizado' },
    mae: { type: 'string', description: 'Nome da mãe do paciente' },
    prontuario: { type: 'string', description: 'Número do prontuário' },
    data_nascimento: { type: 'string', description: 'Data de nascimento do paciente (DD/MM/AAAA como está no documento)' },
    atendimento: { type: 'string', description: 'Número do atendimento' },
    prescricao: { type: 'string', description: 'Número da prescrição' },
    cirurgia_codigo: { type: 'string', description: 'Número ou código da cirurgia' },
    sexo: { type: 'string', description: 'Sexo do paciente' },
    duracao: { type: 'string', description: 'Duração da cirurgia' },
    carater_cirurgico: { type: 'string', description: 'Caráter cirúrgico (Eletiva, Urgência)' },
    setor: { type: 'string', description: 'Setor do internamento' },
    acomodacao: { type: 'string', description: 'Acomodação (Enfermaria, Apartamento)' },
    tipo_internamento: { type: 'string', description: 'Tipo de internamento (Internado, Ambulatorial)' }
  },
  required: ['paciente', 'convenio', 'nome_cirurgia']
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
      prompt: `Analise a imagem anexada de um prontuário, folha de sala ou ficha cirúrgica de hospital e extraia os dados do paciente e da cirurgia.

Regras:
- "paciente": nome completo do paciente.
- "data": data da cirurgia ou do internamento, sempre no formato YYYY-MM-DD. Se o documento trouxer só dia e mês, assuma o ano atual.
- "convenio": convênio ou forma de pagamento por extenso (por exemplo "Associação Santa Casa Saúde de São José dos Campos", SUS, Unimed, Particular). Ignore se aparecer apenas "SUS" como tipo isolado sem ser o convênio.
- "tipo_cirurgia": tipo ou especialidade cirúrgica (por exemplo Cirurgia Geral, Videolaparoscopia). Vazio se não estiver explícito.
- "nome_cirurgia": nome do procedimento realizado, exatamente como escrito (por exemplo "Colecistectomia • Vídeo").
- "mae": nome da mãe do paciente.
- "prontuario": número do prontuário.
- "data_nascimento": data de nascimento no formato DD/MM/AAAA, como está no documento; ignore a idade entre parênteses.
- "atendimento": número do atendimento.
- "prescricao": número da prescrição.
- "cirurgia_codigo": número ou código da cirurgia (campo "Cirurgia" quando for apenas um número).
- "sexo": sexo do paciente.
- "duracao": duração da cirurgia tal como escrita (por exemplo "30 minutos").
- "carater_cirurgico": caráter cirúrgico (Eletiva, Urgência, Emergência).
- "setor": setor indicado no documento (por exemplo Centro Cirúrgico).
- "acomodacao": acomodação (Enfermaria, Apartamento, UTI).
- "tipo_internamento": tipo de internamento (Internado, Ambulatorial, Observação).

Devolva string vazia em qualquer campo que não esteja legível no documento. Não invente dados.`,
      file_urls: [signed_url],
      response_json_schema: schemaProntuario
    });

    return Response.json(dados);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}