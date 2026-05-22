import crypto from 'crypto';
import { queryWithParams } from '../utils/database.js';
import { enviarCodigoVerificacao, enviarEmailBoasVindas } from './emailService.js';

/**
 * Hash password using SHA-256 (considere usar bcrypt em produção)
 */
function hashPassword(senha) {
  return crypto.createHash('sha256').update(senha).digest('hex');
}

/**
 * Gera código de verificação (6 dígitos)
 */
function gerarCodigoVerificacao() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Gera token de sessão
 */
function gerarToken() {
  return crypto.randomBytes(32).toString('hex');
}

function usuarioEstaVerificado(status) {
  return status === true || status === 1;
}

let usuarioPossuiColunaHotelId = null;

async function tabelaUsuarioTemHotelId() {
  if (usuarioPossuiColunaHotelId !== null) return usuarioPossuiColunaHotelId;

  const res = await queryWithParams(
    `SELECT TOP 1 1 AS existe
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'usuario'
        AND COLUMN_NAME = 'hotel_id'`,
    {}
  );

  usuarioPossuiColunaHotelId = res.recordset.length > 0;
  return usuarioPossuiColunaHotelId;
}

async function obterHotelPadraoDaAssinatura(assinaturaId) {
  const hotel = await queryWithParams(
    `SELECT TOP 1 id
       FROM hotel
      WHERE assinatura_id = @assinaturaId
      ORDER BY nome, id`,
    { assinaturaId }
  );

  if (hotel.recordset.length === 0) return null;
  return hotel.recordset[0]['id'];
}

async function buscarLicensaDoUsuarioAuth(usuarioAuthId) {
  const resultado = await queryWithParams(
    `SELECT TOP 1
        l.id AS LicensaId,
        l.numero_licenca AS NumeroLicensa,
        l.chave AS ChaveLicensa,
        l.empresa_nome AS EmpresaNome,
        l.validade AS ValidadeLicensa,
        l.status AS StatusLicensa,
        l.assinatura_id AS AssinaturaId
     FROM [usuario] u
     LEFT JOIN licenca l ON l.assinatura_id = u.assinatura_id
     WHERE u.usuario_auth_id = @usuarioAuthId
       AND l.ativa = 1
     ORDER BY
       CASE WHEN l.status IN ('ativo', 'ativa') THEN 0 ELSE 1 END,
       l.validade DESC`,
    { usuarioAuthId }
  );

  if (resultado.recordset.length === 0) {
    return null;
  }

  return resultado.recordset[0];
}

/**
 * Register: Criar novo usuário
 */
export async function registrarUsuario({ nomeCompleto, email, senha, numeroLicensa, numeroTelefone, tipoUsuario = 'normal' }) {
  const usuarioExistente = await queryWithParams(
    `SELECT id FROM usuario_auth WHERE email = @email`,
    { email }
  );

  if (usuarioExistente.recordset.length > 0) {
    throw new Error('Email já cadastrado');
  }

  const licensa = await queryWithParams(
    `SELECT assinatura_id FROM licenca WHERE numero_licenca = @numeroLicensa AND ativa = 1`,
    { numeroLicensa }
  );

  if (licensa.recordset.length === 0) {
    throw new Error('Número de licensa inválido ou inativo');
  }

  const assinaturaId = licensa.recordset[0]['assinatura_id'];
  const hotelId = await obterHotelPadraoDaAssinatura(assinaturaId);
  const temHotelId = await tabelaUsuarioTemHotelId();
  const senhaHash = hashPassword(senha);
  const codigoVerificacao = gerarCodigoVerificacao();

  const usuarioAuthResult = await queryWithParams(
    `INSERT INTO usuario_auth (email, senha_hash, status, ultimo_login)
     OUTPUT INSERTED.id
     VALUES (@email, @senhaHash, 0, NULL)`,
    { email, senhaHash }
  );

  const usuarioAuthId = usuarioAuthResult.recordset[0]['id'];

  if (temHotelId) {
    await queryWithParams(
      `INSERT INTO [usuario] (usuario_auth_id, assinatura_id, hotel_id, nome, email, numero, telefone, tipo_usuario)
       VALUES (@usuarioAuthId, @assinaturaId, @hotelId, @nomeCompleto, @email, NULL, @numeroTelefone, @tipoUsuario)`,
      {
        usuarioAuthId,
        assinaturaId,
        hotelId,
        nomeCompleto,
        email,
        numeroTelefone: numeroTelefone || null,
        tipoUsuario,
      }
    );
  } else {
    await queryWithParams(
      `INSERT INTO [usuario] (usuario_auth_id, assinatura_id, nome, email, numero, telefone, tipo_usuario)
       VALUES (@usuarioAuthId, @assinaturaId, @nomeCompleto, @email, NULL, @numeroTelefone, @tipoUsuario)`,
      { usuarioAuthId, assinaturaId, nomeCompleto, email, numeroTelefone: numeroTelefone || null, tipoUsuario }
    );
  }

  const dataExpiracao = new Date();
  dataExpiracao.setHours(dataExpiracao.getHours() + 1);

  await queryWithParams(
    `INSERT INTO codigo_verificacao (usuario_auth_id, codigo, tipo, expira_em)
     VALUES (@usuarioAuthId, @codigo, 'EmailVerification', @dataExpiracao)`,
    { usuarioAuthId, codigo: codigoVerificacao, dataExpiracao }
  );

  await enviarEmailBoasVindas({
    email,
    nomeCompleto,
  });

  await enviarCodigoVerificacao({
    email,
    nomeCompleto,
    codigo: codigoVerificacao,
    tipo: 'EmailVerification',
  });

  return {
    id: usuarioAuthId,
    email,
    mensagem: `Código de verificação enviado para ${email}`,
  };
}

/**
 * Login: Verificar email e senha
 * - Se conta já verificada (status=true/1): retorna token direto
 * - Se conta não verificada (status=false/0): retorna erro pedindo verificação
 */
export async function autenticarLogin({ email, senha }) {
  const senhaHash = hashPassword(senha);

  const usuario = await queryWithParams(
    `SELECT id, status FROM usuario_auth WHERE email = @email AND senha_hash = @senhaHash`,
    { email, senhaHash }
  );

  if (usuario.recordset.length === 0) {
    throw new Error('Email ou senha inválidos');
  }

  const { id: usuarioAuthId, status } = usuario.recordset[0];

  if (!usuarioEstaVerificado(status)) {
    console.warn('Usuario não Verificado');
    throw new Error('Usuario não Verificado');
  }

  await queryWithParams(
    `UPDATE usuario_auth SET ultimo_login = SYSUTCDATETIME() WHERE id = @usuarioAuthId`,
    { usuarioAuthId }
  );

  const token = gerarToken();
  const dataExpiracao = new Date();
  dataExpiracao.setDate(dataExpiracao.getDate() + 7);

  await queryWithParams(
    `INSERT INTO sessao (usuario_auth_id, token, expira_em)
     OUTPUT INSERTED.id
     VALUES (@usuarioAuthId, @token, @dataExpiracao)`,
    { usuarioAuthId, token, dataExpiracao }
  );

  const usuarioData = await queryWithParams(
    `SELECT u.id, u.nome AS NomeCompleto, u.email AS Email, u.telefone AS Telefone, u.tipo_usuario AS TipoUsuario FROM [usuario] u
     INNER JOIN usuario_auth ua ON u.usuario_auth_id = ua.id
     WHERE ua.id = @usuarioAuthId`,
    { usuarioAuthId }
  );

  const licensa = await buscarLicensaDoUsuarioAuth(usuarioAuthId);

  const usuarioRetorno = {
    ...usuarioData.recordset[0],
    NumeroLicensa: licensa?.NumeroLicensa || null,
    ChaveLicensa: licensa?.ChaveLicensa || null,
    AssinaturaId: licensa?.AssinaturaId || null,
  };

  return {
    token,
    usuario: usuarioRetorno,
    licensa,
    dataExpiracao,
  };
}

/**
 * Verificação de conta com código
 */
export async function verificarConta({ email, code }) {
  const usuario = await queryWithParams(
    `SELECT id FROM usuario_auth WHERE email = @email`,
    { email }
  );

  if (usuario.recordset.length === 0) {
    throw new Error('Email não encontrado');
  }

  const usuarioAuthId = usuario.recordset[0]['id'];

  const codigoValido = await queryWithParams(
    `SELECT id FROM codigo_verificacao 
     WHERE usuario_auth_id = @usuarioAuthId 
     AND codigo = @codigo 
     AND tipo = 'EmailVerification'
     AND expira_em > SYSUTCDATETIME()`,
    { usuarioAuthId, codigo: code }
  );

  if (codigoValido.recordset.length === 0) {
    throw new Error('Código de verificação inválido ou expirado');
  }

  await queryWithParams(
    `UPDATE usuario_auth SET status = 1, ultimo_login = SYSUTCDATETIME() WHERE id = @usuarioAuthId`,
    { usuarioAuthId }
  );

  await queryWithParams(
    `DELETE FROM codigo_verificacao 
     WHERE usuario_auth_id = @usuarioAuthId 
     AND tipo = 'EmailVerification'`,
    { usuarioAuthId }
  );

  const token = gerarToken();
  const dataExpiracao = new Date();
  dataExpiracao.setDate(dataExpiracao.getDate() + 7);

  await queryWithParams(
    `INSERT INTO sessao (usuario_auth_id, token, expira_em)
     OUTPUT INSERTED.id
     VALUES (@usuarioAuthId, @token, @dataExpiracao)`,
    { usuarioAuthId, token, dataExpiracao }
  );

  const usuarioData = await queryWithParams(
    `SELECT u.id, u.nome AS NomeCompleto, u.email AS Email, u.telefone AS Telefone, u.tipo_usuario AS TipoUsuario FROM [usuario] u
     INNER JOIN usuario_auth ua ON u.usuario_auth_id = ua.id
     WHERE ua.id = @usuarioAuthId`,
    { usuarioAuthId }
  );

  const licensa = await buscarLicensaDoUsuarioAuth(usuarioAuthId);

  const usuarioRetorno = {
    ...usuarioData.recordset[0],
    NumeroLicensa: licensa?.NumeroLicensa || null,
    ChaveLicensa: licensa?.ChaveLicensa || null,
    AssinaturaId: licensa?.AssinaturaId || null,
  };

  return {
    token,
    usuario: usuarioRetorno,
    licensa,
    dataExpiracao,
  };
}

export async function atualizarUsuario({ usuarioAuthId, nomeCompleto, email, telefone }) {
  const camposUsuario = [];
  const params = { usuarioAuthId };

  if (nomeCompleto) {
    camposUsuario.push('nome = @nomeCompleto');
    params.nomeCompleto = nomeCompleto;
  }

  if (telefone !== undefined) {
    camposUsuario.push('telefone = @telefone');
    params.telefone = telefone || null;
  }

  if (email) {
    const emailExistente = await queryWithParams(
      `SELECT id FROM usuario_auth WHERE email = @email AND id <> @usuarioAuthId`,
      { email, usuarioAuthId }
    );

    if (emailExistente.recordset.length > 0) {
      throw new Error('Email já cadastrado');
    }

    await queryWithParams(
      `UPDATE usuario_auth SET email = @email WHERE id = @usuarioAuthId`,
      { usuarioAuthId, email }
    );

    camposUsuario.push('email = @email');
    params.email = email;
  }

  if (camposUsuario.length === 0) {
    throw new Error('Nenhum campo para atualizar');
  }

  await queryWithParams(
    `UPDATE [usuario] SET ${camposUsuario.join(', ')} WHERE usuario_auth_id = @usuarioAuthId`,
    params
  );

  const usuarioAtualizado = await queryWithParams(
    `SELECT u.id, u.nome AS NomeCompleto, u.email AS Email, u.telefone AS Telefone, u.tipo_usuario AS TipoUsuario
     FROM [usuario] u
     WHERE u.usuario_auth_id = @usuarioAuthId`,
    { usuarioAuthId }
  );

  return usuarioAtualizado.recordset[0];
}

export async function trocarSenha({ usuarioAuthId, senhaAtual, novaSenha }) {
  const usuario = await queryWithParams(
    `SELECT senha_hash FROM usuario_auth WHERE id = @usuarioAuthId`,
    { usuarioAuthId }
  );

  if (usuario.recordset.length === 0) {
    throw new Error('Usuário não encontrado');
  }

  const senhaAtualHash = hashPassword(senhaAtual);
  if (usuario.recordset[0]['senha_hash'] !== senhaAtualHash) {
    throw new Error('Senha atual inválida');
  }

  const novaSenhaHash = hashPassword(novaSenha);
  await queryWithParams(
    `UPDATE usuario_auth SET senha_hash = @novaSenhaHash WHERE id = @usuarioAuthId`,
    { usuarioAuthId, novaSenhaHash }
  );

  return { mensagem: 'Senha alterada com sucesso' };
}

export async function deletarUsuario({ usuarioAuthId }) {
  await queryWithParams(`DELETE FROM sessao WHERE usuario_auth_id = @usuarioAuthId`, { usuarioAuthId });
  await queryWithParams(`DELETE FROM codigo_verificacao WHERE usuario_auth_id = @usuarioAuthId`, { usuarioAuthId });
  await queryWithParams(`DELETE FROM [usuario] WHERE usuario_auth_id = @usuarioAuthId`, { usuarioAuthId });
  await queryWithParams(`DELETE FROM usuario_auth WHERE id = @usuarioAuthId`, { usuarioAuthId });

  return { mensagem: 'Usuário removido com sucesso' };
}

/**
 * Recuperar senha: envia código de recuperação por email
 */
export async function recuperarSenha({ email }) {
  const usuario = await queryWithParams(
    `SELECT id FROM usuario_auth WHERE email = @email`,
    { email }
  );

  if (usuario.recordset.length === 0) {
    throw new Error('Email não encontrado');
  }

  const usuarioAuthId = usuario.recordset[0]['id'];

  await queryWithParams(
    `DELETE FROM codigo_verificacao 
     WHERE usuario_auth_id = @usuarioAuthId 
     AND tipo = 'PasswordReset'`,
    { usuarioAuthId }
  );

  const codigo = gerarCodigoVerificacao();
  const dataExpiracao = new Date();
  dataExpiracao.setMinutes(dataExpiracao.getMinutes() + 30);

  await queryWithParams(
    `INSERT INTO codigo_verificacao (usuario_auth_id, codigo, tipo, expira_em)
     VALUES (@usuarioAuthId, @codigo, 'PasswordReset', @dataExpiracao)`,
    { usuarioAuthId, codigo, dataExpiracao }
  );

  await enviarCodigoVerificacao({ email, codigo, tipo: 'PasswordReset' });

  return { mensagem: `Código de recuperação enviado para ${email}. Válido por 30 minutos.` };
}

/**
 * Redefinir senha: valida o código e define a nova senha
 */
export async function redefinirSenha({ email, code, novaSenha }) {
  const usuario = await queryWithParams(
    `SELECT id FROM usuario_auth WHERE email = @email`,
    { email }
  );

  if (usuario.recordset.length === 0) {
    throw new Error('Email não encontrado');
  }

  const usuarioAuthId = usuario.recordset[0]['id'];

  const codigoValido = await queryWithParams(
    `SELECT id FROM codigo_verificacao 
     WHERE usuario_auth_id = @usuarioAuthId 
     AND codigo = @codigo 
     AND tipo = 'PasswordReset'
     AND expira_em > SYSUTCDATETIME()`,
    { usuarioAuthId, codigo: code }
  );

  if (codigoValido.recordset.length === 0) {
    throw new Error('Código de recuperação inválido ou expirado');
  }

  const novaSenhaHash = hashPassword(novaSenha);
  await queryWithParams(
    `UPDATE usuario_auth SET senha_hash = @novaSenhaHash WHERE id = @usuarioAuthId`,
    { usuarioAuthId, novaSenhaHash }
  );

  await queryWithParams(
    `DELETE FROM codigo_verificacao 
     WHERE usuario_auth_id = @usuarioAuthId 
     AND tipo = 'PasswordReset'`,
    { usuarioAuthId }
  );

  return { mensagem: 'Senha redefinida com sucesso' };
}

/**
 * Reenviar código de verificação
 */
export async function reenviarCodigo({ email }) {
  const usuario = await queryWithParams(
    `SELECT id FROM usuario_auth WHERE email = @email`,
    { email }
  );

  if (usuario.recordset.length === 0) {
    throw new Error('Email não encontrado');
  }

  const usuarioAuthId = usuario.recordset[0]['id'];

  await queryWithParams(
    `DELETE FROM codigo_verificacao 
     WHERE usuario_auth_id = @usuarioAuthId 
     AND tipo = 'EmailVerification'`,
    { usuarioAuthId }
  );

  const codigoVerificacao = gerarCodigoVerificacao();
  const dataExpiracao = new Date();
  dataExpiracao.setHours(dataExpiracao.getHours() + 1);

  await queryWithParams(
    `INSERT INTO codigo_verificacao (usuario_auth_id, codigo, tipo, expira_em)
     VALUES (@usuarioAuthId, @codigo, 'EmailVerification', @dataExpiracao)`,
    { usuarioAuthId, codigo: codigoVerificacao, dataExpiracao }
  );

  await enviarCodigoVerificacao({
    email,
    codigo: codigoVerificacao,
    tipo: 'EmailVerification',
  });

  return {
    mensagem: `Novo código enviado para ${email}`,
  };
}
