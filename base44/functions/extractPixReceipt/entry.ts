import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url } = await req.json().catch(() => ({}));
    if (!file_url || typeof file_url !== 'string' || !/^https:\/\//.test(file_url)) {
      return Response.json({ error: 'file_url é obrigatório' }, { status: 400 });
    }

    const result = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: 'object',
        properties: {
          valor: { type: 'number', description: 'Valor total do PIX em reais, somente número, por exemplo 1500.00' },
          data: { type: 'string', description: 'Data do PIX no formato YYYY-MM-DD' },
          pagador: { type: 'string', description: 'Nome de quem enviou o PIX' },
          recebedor: { type: 'string', description: 'Nome de quem recebeu o PIX' },
          descricao: { type: 'string', description: 'Descrição ou mensagem do comprovante' },
        },
        required: ['valor', 'data'],
      },
    });

    if (result.status !== 'success') {
      return Response.json({ error: result.details || 'Não foi possível ler este recibo' }, { status: 422 });
    }

    const output = Array.isArray(result.output) ? result.output[0] : result.output;
    if (!output) return Response.json({ error: 'Nenhum dado encontrado no recibo' }, { status: 422 });

    return Response.json({ data: output });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}