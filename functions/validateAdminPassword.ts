import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verifica autenticação do usuário
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtém a senha do payload
    const { password } = await req.json();

    // Valida a senha (você pode alterar isso para usar variáveis de ambiente)
    const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD') || 'claudito';
    const isValid = password === ADMIN_PASSWORD;

    return Response.json({ valid: isValid });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});