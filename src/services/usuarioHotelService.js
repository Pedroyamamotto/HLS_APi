import crypto from 'crypto';
import { queryWithParams } from '../utils/database.js';

function hashPassword(senha) {
  return crypto.createHash('sha256').update(senha).digest('hex');
}

function normalizarFotoUrl(valor) {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  const url = String(valor).trim();
  return url || null;
}

let usuarioPossuiColunaHotelId = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Verifica se a tabela usuario possui a coluna hotel_id.
 */
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

/**
 * Verifica se o hotel existe e retorna dados mínimos.
 * Lança erro 'Hotel não encontrado' se não existir.
 */
async function obterDadosDoHotel(hotelId) {
  const res = await queryWithParams(
    `SELECT id, assinatura_id, nome FROM hotel WHERE id = @hotelId`,
    { hotelId }
  );
  if (res.recordset.length === 0) throw new Error('Hotel não encontrado');
  return res.recordset[0];
}

/**
 * Retorna o filtro SQL de escopo do usuário por hotel.
 * Prioriza vínculo direto por hotel_id quando disponível.
 */
async function obterEscopoDoUsuarioPorHotel(hotelId) {
  const hotel = await obterDadosDoHotel(hotelId);
  const temHotelId = await tabelaUsuarioTemHotelId();

  if (temHotelId) {
    return {
      filtroSql: 'u.hotel_id = @hotelId',
      params: { hotelId },
      hotel,
    };
  }

  return {
    filtroSql: 'u.assinatura_id = @assinaturaId',
    params: { assinaturaId: hotel['assinatura_id'] },
    hotel,
  };
}

/**
 * Verifica se o usuário pertence ao hotel.
 * Retorna o registro completo do usuario ou lança 'Usuário não encontrado'.
 */
async function obterUsuarioDoHotel(userId, hotelId) {
  const escopo = await obterEscopoDoUsuarioPorHotel(hotelId);

  const res = await queryWithParams(
    `SELECT u.id, u.nome, u.email, u.telefone, u.tipo_usuario, u.role_id,
            ua.id AS usuario_auth_id, ua.status AS ativo
     FROM [usuario] u
     JOIN usuario_auth ua ON ua.id = u.usuario_auth_id
     WHERE u.id = @userId AND ${escopo.filtroSql}`,
    { userId, ...escopo.params }
  );

  if (res.recordset.length === 0) throw new Error('Usuário não encontrado neste hotel');
  return res.recordset[0];
}

// ─── 1. Listar usuários do hotel ──────────────────────────────────────────────

export async function listarUsuariosDoHotel({ hotelId }) {
  const escopo = await obterEscopoDoUsuarioPorHotel(hotelId);

  const res = await queryWithParams(
    `SELECT
       u.id,
       u.nome        AS NomeCompleto,
       u.email       AS Email,
       u.foto_url    AS FotoUrl,
       u.tipo_usuario AS TipoUsuario,
       r.nome        AS Role,
       ua.status     AS Ativo
     FROM [usuario] u
     JOIN usuario_auth ua ON ua.id = u.usuario_auth_id
     LEFT JOIN [role] r   ON r.id  = u.role_id
     WHERE ${escopo.filtroSql}
     ORDER BY u.nome`,
    { ...escopo.params }
  );

  const usuarios = res.recordset;
  const total   = usuarios.length;
  const ativos  = usuarios.filter(u => u.Ativo === true || u.Ativo === 1).length;

  return { total, ativos, usuarios };
}

// ─── 2. Obter usuário individual ──────────────────────────────────────────────

export async function obterUsuarioDoHotelPorId({ hotelId, userId }) {
  const escopo = await obterEscopoDoUsuarioPorHotel(hotelId);

  const res = await queryWithParams(
    `SELECT
       u.id,
       u.nome        AS NomeCompleto,
       u.email       AS Email,
       u.telefone    AS Telefone,
       u.foto_url    AS FotoUrl,
       u.tipo_usuario AS TipoUsuario,
       u.role_id     AS RoleId,
       r.nome        AS Role,
       ua.status     AS Ativo
     FROM [usuario] u
     JOIN usuario_auth ua ON ua.id  = u.usuario_auth_id
     LEFT JOIN [role]  r  ON r.id  = u.role_id
     WHERE u.id = @userId AND ${escopo.filtroSql}`,
    { userId, ...escopo.params }
  );

  if (res.recordset.length === 0) throw new Error('Usuário não encontrado neste hotel');

  return {
    ...res.recordset[0],
    HotelId: escopo.hotel.id,
    NomeHotel: escopo.hotel.nome,
  };
}

// ─── 3. Atualizar usuário ─────────────────────────────────────────────────────

export async function atualizarUsuarioDoHotel({
  hotelId,
  userId,
  nomeCompleto,
  email,
  telefone,
  roleId,
  fotoUrl,
  senhaAtual,
  novaSenha,
}) {
  const usuario      = await obterUsuarioDoHotel(userId, hotelId);
  const usuarioAuthId = usuario['usuario_auth_id'];

  // ── Atualizar senha (se fornecida) ──
  if (novaSenha) {
    if (!senhaAtual) throw new Error('Senha atual é obrigatória para alterar a senha');

    const authRes = await queryWithParams(
      `SELECT senha_hash FROM usuario_auth WHERE id = @usuarioAuthId`,
      { usuarioAuthId }
    );
    if (hashPassword(senhaAtual) !== authRes.recordset[0]['senha_hash']) {
      throw new Error('Senha atual inválida');
    }

    await queryWithParams(
      `UPDATE usuario_auth SET senha_hash = @hash WHERE id = @usuarioAuthId`,
      { usuarioAuthId, hash: hashPassword(novaSenha) }
    );
  }

  // ── Atualizar campos do usuario ──
  const campos = [];
  const params = { userId };

  if (nomeCompleto) { campos.push('nome = @nomeCompleto'); params.nomeCompleto = nomeCompleto; }
  if (telefone !== undefined) { campos.push('telefone = @telefone'); params.telefone = telefone || null; }
  if (roleId !== undefined) { campos.push('role_id = @roleId'); params.roleId = roleId || null; }
  if (fotoUrl !== undefined) { campos.push('foto_url = @fotoUrl'); params.fotoUrl = normalizarFotoUrl(fotoUrl); }

  if (email) {
    const dup = await queryWithParams(
      `SELECT id FROM usuario_auth WHERE email = @email AND id <> @usuarioAuthId`,
      { email, usuarioAuthId }
    );
    if (dup.recordset.length > 0) throw new Error('Email já cadastrado');

    await queryWithParams(
      `UPDATE usuario_auth SET email = @email WHERE id = @usuarioAuthId`,
      { usuarioAuthId, email }
    );
    campos.push('email = @email');
    params.email = email;
  }

  if (campos.length > 0) {
    await queryWithParams(
      `UPDATE [usuario] SET ${campos.join(', ')} WHERE id = @userId`,
      params
    );
  }

  return obterUsuarioDoHotelPorId({ hotelId, userId });
}

// ─── 4. Remover usuário do hotel ──────────────────────────────────────────────

export async function removerUsuarioDoHotel({ hotelId, userId }) {
  await obterUsuarioDoHotel(userId, hotelId); // valida pertencimento

  const authRes = await queryWithParams(
    `SELECT usuario_auth_id FROM [usuario] WHERE id = @userId`,
    { userId }
  );
  const usuarioAuthId = authRes.recordset[0]['usuario_auth_id'];

  await queryWithParams(`DELETE FROM sessao           WHERE usuario_auth_id = @usuarioAuthId`, { usuarioAuthId });
  await queryWithParams(`DELETE FROM codigo_verificacao WHERE usuario_auth_id = @usuarioAuthId`, { usuarioAuthId });
  await queryWithParams(`DELETE FROM [usuario]        WHERE id = @userId`, { userId });
  await queryWithParams(`DELETE FROM usuario_auth     WHERE id = @usuarioAuthId`, { usuarioAuthId });

  return { mensagem: 'Usuário removido com sucesso' };
}

// ─── 5. Security Matrix ───────────────────────────────────────────────────────

/**
 * Retorna todas as roles com suas permissoes (matriz de acesso).
 * Não é escopado por hotel — é global para o sistema.
 */
export async function obterSecurityMatrix() {
  const roles = await queryWithParams(`SELECT id, nome FROM [role] ORDER BY nome`, {});
  const perms = await queryWithParams(`SELECT id, nome FROM permissao ORDER BY nome`, {});
  const matrix = await queryWithParams(
    `SELECT rp.role_id, rp.permissao_id FROM role_permissao rp`,
    {}
  );

  const permissaoIds = new Set(matrix.recordset.map(m => `${m.role_id}|${m.permissao_id}`));

  const resultado = roles.recordset.map(role => ({
    id: role.id,
    nome: role.nome,
    permissoes: perms.recordset.map(p => ({
      id: p.id,
      nome: p.nome,
      ativo: permissaoIds.has(`${role.id}|${p.id}`),
    })),
  }));

  return { permissoes: perms.recordset, roles: resultado };
}

/**
 * Atualiza as permissoes de uma role.
 * @param {string} roleId
 * @param {string[]} permissaoIds - array de IDs de permissao que devem ficar ATIVAS
 */
export async function atualizarPermissoesRole({ roleId, permissaoIds }) {
  // Valida se role existe
  const roleRes = await queryWithParams(`SELECT id FROM [role] WHERE id = @roleId`, { roleId });
  if (roleRes.recordset.length === 0) throw new Error('Role não encontrada');

  // Remove todas as permissoes atuais da role
  await queryWithParams(`DELETE FROM role_permissao WHERE role_id = @roleId`, { roleId });

  // Reinsere somente as ativas
  if (permissaoIds && permissaoIds.length > 0) {
    for (const permissaoId of permissaoIds) {
      await queryWithParams(
        `INSERT INTO role_permissao (id, role_id, permissao_id) VALUES (NEWID(), @roleId, @permissaoId)`,
        { roleId, permissaoId }
      );
    }
  }

  return obterSecurityMatrix();
}
