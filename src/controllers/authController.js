import {
  registrarUsuario,
  autenticarLogin,
  verificarConta,
  reenviarCodigo,
  atualizarUsuario,
  trocarSenha,
  deletarUsuario,
  recuperarSenha,
  redefinirSenha,
} from '../services/authService.js';

/**
 * Register - Criar novo usuário
 */
export async function register(req, res) {
  try {
    const NomeCompleto = req.body.NomeCompleto ?? req.body.nomeCompleto;
    const Email = req.body.Email ?? req.body.email;
    const Senha = req.body.Senha ?? req.body.senha;
    const NumeroDeLicenca = req.body.NumeroDeLicenca ?? req.body.NumeroDeLisesa ?? req.body.numeroLicensa ?? req.body.numeroLicenca;
    const NumeroTelefone = req.body.NumeroTelefone ?? req.body.telefone;
    const TipoUsuario = req.body.Tipo_Usuario ?? req.body.tipoUsuario ?? 'normal';

    // Validações básicas
    if (!NomeCompleto || !Email || !Senha || !NumeroDeLicenca) {
      return res.status(400).json({
        erro: 'Faltam campos obrigatórios',
        campos: ['NomeCompleto', 'Email', 'Senha', 'NumeroDeLicenca'],
      });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(Email)) {
      return res.status(400).json({ erro: 'Email inválido' });
    }

    // Validar senha (mínimo 6 caracteres)
    if (Senha.length < 6) {
      return res.status(400).json({
        erro: 'Senha deve ter no mínimo 6 caracteres',
      });
    }

    const resultado = await registrarUsuario({
      nomeCompleto: NomeCompleto,
      email: Email,
      senha: Senha,
      numeroLicensa: NumeroDeLicenca,
      numeroTelefone: NumeroTelefone,
      tipoUsuario: TipoUsuario,
    });

    return res.status(201).json({
      sucesso: true,
      dados: resultado,
    });
  } catch (erro) {
    console.error('Erro no register:', erro?.message || erro);
    if (erro?.stack) {
      console.error(erro.stack);
    }

    if (
      erro.message.includes('Email já cadastrado') ||
      erro.message.includes('inválido')
    ) {
      return res.status(400).json({ erro: erro.message });
    }

    return res.status(500).json({ erro: 'Erro ao registrar usuário' });
  }
}

/**
 * Auth - Autenticar com email e senha
 */
export async function auth(req, res) {
  try {
    const Email = req.body.Email ?? req.body.email;
    const Senha = req.body.Senha ?? req.body.senha;

    // Validações básicas
    if (!Email || !Senha) {
      return res.status(400).json({
        erro: 'Faltam campos obrigatórios',
        campos: ['Email', 'Senha'],
      });
    }

    const resultado = await autenticarLogin({
      email: Email,
      senha: Senha,
    });

    return res.status(200).json({
      sucesso: true,
      token: resultado.token,
      usuario: resultado.usuario,
      licensa: resultado.licensa,
      dataExpiracao: resultado.dataExpiracao,
    });
  } catch (erro) {
    console.error('Erro no auth:', erro?.message || erro);
    if (erro?.stack) {
      console.error(erro.stack);
    }

    if (
      erro.message.includes('não verificada') ||
      erro.message.includes('não Verificado') ||
      erro.message.includes('inválidos')
    ) {
      return res.status(401).json({ erro: erro.message });
    }

    return res.status(500).json({ erro: 'Erro ao autenticar' });
  }
}

/**
 * Verificação de conta com código
 */
export async function vercacao(req, res) {
  try {
    const Email = req.body.Email ?? req.body.email;
    const Code = req.body.Code ?? req.body.code;

    if (!Email || !Code) {
      return res.status(400).json({
        erro: 'Faltam campos obrigatórios',
        campos: ['Email', 'Code'],
      });
    }

    const resultado = await verificarConta({
      email: Email,
      code: Code,
    });

    return res.status(200).json({
      sucesso: true,
      token: resultado.token,
      usuario: resultado.usuario,
      licensa: resultado.licensa,
      dataExpiracao: resultado.dataExpiracao,
    });
  } catch (erro) {
    console.error('Erro na verificação:', erro?.message || erro);
    if (erro?.message?.includes('não encontrado') || erro?.message?.includes('inválido')) {
      return res.status(401).json({ erro: erro.message });
    }
    return res.status(500).json({ erro: 'Erro ao verificar conta' });
  }
}

/**
 * Reenviar código de verificação
 */
export async function reenviaCodigo(req, res) {
  try {
    const Email = req.body.Email ?? req.body.email;

    if (!Email) {
      return res.status(400).json({
        erro: 'Email é obrigatório',
      });
    }

    const resultado = await reenviarCodigo({ email: Email });

    return res.status(200).json({
      sucesso: true,
      dados: resultado,
    });
  } catch (erro) {
    console.error('Erro ao reenviar código:', erro?.message || erro);
    if (erro?.stack) {
      console.error(erro.stack);
    }

    if (erro.message.includes('não encontrado')) {
      return res.status(404).json({ erro: erro.message });
    }

    return res.status(500).json({ erro: 'Erro ao reenviar código' });
  }
}

/**
 * Patch - Atualizar usuário autenticado
 */
export async function updateUser(req, res) {
  try {
    const nomeCompleto = req.body.NomeCompleto ?? req.body.nomeCompleto;
    const email = req.body.Email ?? req.body.email;
    const telefone = req.body.NumeroTelefone ?? req.body.telefone;

    const usuario = await atualizarUsuario({
      usuarioAuthId: req.usuario.id,
      nomeCompleto,
      email,
      telefone,
    });

    return res.status(200).json({
      sucesso: true,
      dados: usuario,
    });
  } catch (erro) {
    console.error('Erro ao atualizar usuário:', erro?.message || erro);
    if (erro?.message?.includes('Email já cadastrado')) {
      return res.status(400).json({ erro: erro.message });
    }
    if (erro?.message?.includes('Nenhum campo')) {
      return res.status(400).json({ erro: erro.message });
    }
    return res.status(500).json({ erro: 'Erro ao atualizar usuário' });
  }
}

/**
 * Patch - Trocar senha
 */
export async function changePassword(req, res) {
  try {
    const senhaAtual = req.body.SenhaAtual ?? req.body.senhaAtual;
    const novaSenha = req.body.NovaSenha ?? req.body.novaSenha;

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({
        erro: 'Faltam campos obrigatórios',
        campos: ['SenhaAtual', 'NovaSenha'],
      });
    }

    const resultado = await trocarSenha({
      usuarioAuthId: req.usuario.id,
      senhaAtual,
      novaSenha,
    });

    return res.status(200).json({ sucesso: true, dados: resultado });
  } catch (erro) {
    console.error('Erro ao trocar senha:', erro?.message || erro);
    if (erro?.message?.includes('inválida') || erro?.message?.includes('não encontrado')) {
      return res.status(400).json({ erro: erro.message });
    }
    return res.status(500).json({ erro: 'Erro ao trocar senha' });
  }
}

/**
 * Delete - Remover usuário autenticado
 */
export async function deleteUser(req, res) {
  try {
    const resultado = await deletarUsuario({
      usuarioAuthId: req.usuario.id,
    });

    return res.status(200).json({ sucesso: true, dados: resultado });
  } catch (erro) {
    console.error('Erro ao deletar usuário:', erro?.message || erro);
    return res.status(500).json({ erro: 'Erro ao deletar usuário' });
  }
}

/**
 * POST /auth/recuperar-senha
 * Envia código de recuperação por email (sem autenticação)
 */
export async function recuperarSenhaHandler(req, res) {
  try {
    const Email = req.body.Email ?? req.body.email;

    if (!Email) {
      return res.status(400).json({ erro: 'Email é obrigatório' });
    }

    const resultado = await recuperarSenha({ email: Email });
    return res.status(200).json({ sucesso: true, dados: resultado });
  } catch (erro) {
    console.error('Erro ao recuperar senha:', erro?.message || erro);
    if (erro?.message?.includes('não encontrado')) {
      return res.status(404).json({ erro: erro.message });
    }
    return res.status(500).json({ erro: 'Erro ao enviar código de recuperação' });
  }
}

/**
 * POST /auth/redefinir-senha
 * Valida o código de recuperação e redefine a senha
 */
export async function redefinirSenhaHandler(req, res) {
  try {
    const Email = req.body.Email ?? req.body.email;
    const Code = req.body.Code ?? req.body.code;
    const NovaSenha = req.body.NovaSenha ?? req.body.novaSenha;

    if (!Email || !Code || !NovaSenha) {
      return res.status(400).json({
        erro: 'Faltam campos obrigatórios',
        campos: ['Email', 'Code', 'NovaSenha'],
      });
    }

    if (NovaSenha.length < 6) {
      return res.status(400).json({ erro: 'Senha deve ter no mínimo 6 caracteres' });
    }

    const resultado = await redefinirSenha({ email: Email, code: Code, novaSenha: NovaSenha });
    return res.status(200).json({ sucesso: true, dados: resultado });
  } catch (erro) {
    console.error('Erro ao redefinir senha:', erro?.message || erro);
    if (erro?.message?.includes('inválido') || erro?.message?.includes('expirado') || erro?.message?.includes('não encontrado')) {
      return res.status(400).json({ erro: erro.message });
    }
    return res.status(500).json({ erro: 'Erro ao redefinir senha' });
  }
}
