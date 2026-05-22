import { queryWithParams } from '../utils/database.js';

/**
 * Middleware para validar token JWT/Sessão
 * Extrai o token do header Authorization: Bearer <token>
 */
export async function autenticarToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        erro: 'Token não fornecido ou formato inválido',
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    // Validar token na database
    const sessao = await queryWithParams(
      `SELECT TOP 1
          ua.id AS AuthId,
          u.id AS UsuarioId,
          u.nome AS NomeCompleto,
          u.email AS Email,
          u.telefone AS Telefone,
          u.tipo_usuario AS TipoUsuario,
          u.assinatura_id AS AssinaturaId,
          l.numero_licenca AS NumeroLicensa,
          l.chave AS ChaveLicensa
       FROM sessao s
       INNER JOIN usuario_auth ua ON s.usuario_auth_id = ua.id
       INNER JOIN [usuario] u ON ua.id = u.usuario_auth_id
       LEFT JOIN licenca l ON l.assinatura_id = u.assinatura_id AND l.ativa = 1
       WHERE s.token = @token AND s.expira_em > SYSUTCDATETIME()`,
      { token }
    );

    if (sessao.recordset.length === 0) {
      return res.status(401).json({
        erro: 'Token inválido ou expirado',
      });
    }

    // Adicionar dados do usuário ao request
    req.usuario = {
      id: sessao.recordset[0]['AuthId'],
      usuarioId: sessao.recordset[0]['UsuarioId'],
      nome: sessao.recordset[0]['NomeCompleto'],
      email: sessao.recordset[0]['Email'],
      telefone: sessao.recordset[0]['Telefone'],
      tipoUsuario: sessao.recordset[0]['TipoUsuario'],
      assinaturaId: sessao.recordset[0]['AssinaturaId'] || null,
      numeroLicensa: sessao.recordset[0]['NumeroLicensa'] || null,
      chaveLicensa: sessao.recordset[0]['ChaveLicensa'] || null,
      token,
    };

    next();
  } catch (erro) {
    console.error('Erro ao autenticar token:', erro.message);
    return res.status(500).json({
      erro: 'Erro ao validar token',
    });
  }
}

/**
 * Middleware para fazer logout
 */
export async function logout(req, res) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({
        erro: 'Token não fornecido',
      });
    }

    const token = authHeader.substring(7);

    // Desativar sessão
    await queryWithParams(
      `DELETE FROM sessao WHERE token = @token`,
      { token }
    );

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Logout realizado com sucesso',
    });
  } catch (erro) {
    console.error('Erro ao fazer logout:', erro.message);
    return res.status(500).json({
      erro: 'Erro ao fazer logout',
    });
  }
}
