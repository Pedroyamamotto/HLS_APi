import {
  listarUsuariosDoHotel,
  obterUsuarioDoHotelPorId,
  atualizarUsuarioDoHotel,
  removerUsuarioDoHotel,
  obterSecurityMatrix,
  atualizarPermissoesRole,
} from '../services/usuarioHotelService.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function naoEncontrado(res, msg = 'Não encontrado') {
  return res.status(404).json({ erro: msg });
}

function erroDadosInvalidos(res, msg) {
  return res.status(400).json({ erro: msg });
}

function erroCamposObrigatorios(res, campos) {
  return res.status(400).json({ erro: 'Faltam campos obrigatórios', campos });
}

// ─── 1. GET /hotel/:hotelId/users ─────────────────────────────────────────────

export async function listUsers(req, res) {
  try {
    const { hotelId } = req.params;
    const dados = await listarUsuariosDoHotel({ hotelId });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    if (erro?.message?.includes('não encontrado')) return naoEncontrado(res, erro.message);
    console.error('Erro ao listar usuários:', erro?.message || erro);
    return res.status(500).json({ erro: 'Erro ao listar usuários do hotel' });
  }
}

// ─── 2. GET /hotel/:hotelId/users/:userId ─────────────────────────────────────

export async function getUser(req, res) {
  try {
    const { hotelId, userId } = req.params;
    const dados = await obterUsuarioDoHotelPorId({ hotelId, userId });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    if (erro?.message?.includes('não encontrado')) return naoEncontrado(res, erro.message);
    console.error('Erro ao obter usuário:', erro?.message || erro);
    return res.status(500).json({ erro: 'Erro ao obter usuário' });
  }
}

// ─── 3. PATCH /hotel/:hotelId/users/:userId ───────────────────────────────────

export async function updateUser(req, res) {
  try {
    const { hotelId, userId } = req.params;
    const nomeCompleto = req.body.NomeCompleto ?? req.body.nomeCompleto;
    const email        = req.body.Email        ?? req.body.email;
    const telefone     = req.body.Telefone     ?? req.body.telefone;
    const roleId       = req.body.RoleId       ?? req.body.roleId;
    const fotoUrl      = req.body.FotoUrl      ?? req.body.fotoUrl ?? req.body.foto_url;
    const senhaAtual   = req.body.SenhaAtual   ?? req.body.senhaAtual;
    const novaSenha    = req.body.NovaSenha    ?? req.body.novaSenha;

    const dados = await atualizarUsuarioDoHotel({
      hotelId, userId,
      nomeCompleto, email, telefone, roleId, fotoUrl,
      senhaAtual, novaSenha,
    });

    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    if (erro?.message?.includes('não encontrado')) return naoEncontrado(res, erro.message);
    if (erro?.message?.includes('inválida') || erro?.message?.includes('obrigatória') || erro?.message?.includes('já cadastrado')) {
      return erroDadosInvalidos(res, erro.message);
    }
    console.error('Erro ao atualizar usuário:', erro?.message || erro);
    return res.status(500).json({ erro: 'Erro ao atualizar usuário' });
  }
}

// ─── 4. DELETE /hotel/:hotelId/users/:userId ──────────────────────────────────

export async function removeUser(req, res) {
  try {
    const { hotelId, userId } = req.params;
    const dados = await removerUsuarioDoHotel({ hotelId, userId });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    if (erro?.message?.includes('não encontrado')) return naoEncontrado(res, erro.message);
    console.error('Erro ao remover usuário:', erro?.message || erro);
    return res.status(500).json({ erro: 'Erro ao remover usuário' });
  }
}

// ─── 5. GET /hotel/:hotelId/security-matrix ───────────────────────────────────

export async function getSecurityMatrix(req, res) {
  try {
    const dados = await obterSecurityMatrix();
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao obter security matrix:', erro?.message || erro);
    return res.status(500).json({ erro: 'Erro ao obter security matrix' });
  }
}

// ─── 6. PATCH /hotel/:hotelId/security-matrix/roles/:roleId ──────────────────

export async function updateRolePermissions(req, res) {
  try {
    const { roleId } = req.params;
    const permissaoIds = req.body.permissaoIds ?? req.body.PermissaoIds;

    if (!Array.isArray(permissaoIds)) {
      return erroCamposObrigatorios(res, ['permissaoIds']);
    }

    const dados = await atualizarPermissoesRole({ roleId, permissaoIds });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    if (erro?.message?.includes('não encontrada')) return naoEncontrado(res, erro.message);
    console.error('Erro ao atualizar permissões:', erro?.message || erro);
    return res.status(500).json({ erro: 'Erro ao atualizar permissões da role' });
  }
}
