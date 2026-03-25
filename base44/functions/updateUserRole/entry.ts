import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado. Apenas administradores podem alterar papéis.' }, { status: 403 });
    }

    const { email, role } = await req.json();

    if (!email || !role) {
      return Response.json({ error: 'Email e papel são obrigatórios.' }, { status: 400 });
    }

    if (!['user', 'admin', 'viewer'].includes(role)) {
      return Response.json({ error: 'Papel inválido. Use: user, admin ou viewer.' }, { status: 400 });
    }

    // Buscar o utilizador pelo email
    const users = await base44.asServiceRole.entities.User.filter({ email });
    
    if (!users || users.length === 0) {
      return Response.json({ error: 'Utilizador não encontrado.' }, { status: 404 });
    }

    const targetUser = users[0];

    // Atualizar o papel do utilizador
    await base44.asServiceRole.entities.User.update(targetUser.id, { role });

    return Response.json({ 
      success: true, 
      message: `Papel de ${email} atualizado para ${role}.`,
      user: { email: targetUser.email, role }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});