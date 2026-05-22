import { queryWithParams } from '../utils/database.js';

function normalizarStatus(status) {
  if (!status) return null;
  return String(status).trim().toLowerCase();
}

function parseAtiva(ativa) {
  if (ativa === true || ativa === 1 || ativa === '1' || ativa === 'true') {
    return 1;
  }
  return 0;
}

function statusPermiteAutenticacao(status) {
  const valor = normalizarStatus(status);
  if (!valor) return true;

  const bloqueados = ['inativo', 'inativa', 'bloqueado', 'bloqueada', 'cancelado', 'cancelada'];
  return !bloqueados.includes(valor);
}

function dataJaExpirou(data) {
  if (!data) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataComparacao = new Date(data);
  dataComparacao.setHours(0, 0, 0, 0);

  return dataComparacao < hoje;
}

export async function criarLisensa({
  validade,
  chave,
  empresaNome,
  status,
  numeroLicensa,
  ativa = true,
  assinaturaId = null,
}) {
  const numeroExistente = await queryWithParams(
    `SELECT TOP 1 id FROM licenca WHERE numero_licenca = @numeroLicensa`,
    { numeroLicensa }
  );

  if (numeroExistente.recordset.length > 0) {
    throw new Error('Número de lisensa já cadastrado');
  }

  const chaveExistente = await queryWithParams(
    `SELECT TOP 1 id FROM licenca WHERE chave = @chave`,
    { chave }
  );

  if (chaveExistente.recordset.length > 0) {
    throw new Error('Chave de lisensa já cadastrada');
  }

  const resultado = await queryWithParams(
    `INSERT INTO licenca (validade, chave, empresa_nome, status, numero_licenca, ativa, assinatura_id)
     OUTPUT INSERTED.id, INSERTED.validade, INSERTED.chave, INSERTED.empresa_nome, INSERTED.status,
            INSERTED.numero_licenca, INSERTED.ativa, INSERTED.assinatura_id
     VALUES (@validade, @chave, @empresaNome, @status, @numeroLicensa, @ativa, @assinaturaId)`,
    {
      validade,
      chave,
      empresaNome,
      status,
      numeroLicensa,
      ativa: parseAtiva(ativa),
      assinaturaId,
    }
  );

  return resultado.recordset[0];
}

export async function editarLisensa({ id, validade, chave, empresaNome, status, numeroLicensa, ativa, assinaturaId }) {
  const campos = [];
  const params = { id };

  if (validade !== undefined) {
    campos.push('validade = @validade');
    params.validade = validade;
  }

  if (chave !== undefined) {
    campos.push('chave = @chave');
    params.chave = chave;
  }

  if (empresaNome !== undefined) {
    campos.push('empresa_nome = @empresaNome');
    params.empresaNome = empresaNome;
  }

  if (status !== undefined) {
    campos.push('status = @status');
    params.status = status;
  }

  if (numeroLicensa !== undefined) {
    campos.push('numero_licenca = @numeroLicensa');
    params.numeroLicensa = numeroLicensa;
  }

  if (ativa !== undefined) {
    campos.push('ativa = @ativa');
    params.ativa = parseAtiva(ativa);
  }

  if (assinaturaId !== undefined) {
    campos.push('assinatura_id = @assinaturaId');
    params.assinaturaId = assinaturaId || null;
  }

  if (campos.length === 0) {
    throw new Error('Nenhum campo para atualizar');
  }

  const resultado = await queryWithParams(
    `UPDATE licenca
     SET ${campos.join(', ')}
     OUTPUT INSERTED.id, INSERTED.validade, INSERTED.chave, INSERTED.empresa_nome, INSERTED.status,
            INSERTED.numero_licenca, INSERTED.ativa, INSERTED.assinatura_id
     WHERE id = @id`,
    params
  );

  if (resultado.recordset.length === 0) {
    throw new Error('Lisensa não encontrada');
  }

  return resultado.recordset[0];
}

export async function autentificarLisensa({ numeroLicensa, chave }) {
  const resultado = await queryWithParams(
    `SELECT TOP 1
        l.id,
        l.validade,
        l.chave,
        l.empresa_nome,
        l.status AS licensa_status,
        l.numero_licenca,
        l.ativa,
        l.assinatura_id,
        a.data_vencimento,
        a.tipo AS assinatura_tipo,
        a.valor_mensal,
        a.status AS assinatura_status,
        h.nome AS hotel_nome
     FROM licenca l
     LEFT JOIN assinatura a ON a.id = l.assinatura_id
     LEFT JOIN hotel h ON h.assinatura_id = a.id
     WHERE l.numero_licenca = @numeroLicensa
       AND l.chave = @chave
       AND l.ativa = 1`,
    { numeroLicensa, chave }
  );

  if (resultado.recordset.length === 0) {
    throw new Error('Lisensa inválida ou inativa');
  }

  const dados = resultado.recordset[0];

  if (!statusPermiteAutenticacao(dados.licensa_status)) {
    throw new Error('Lisensa não está ativa');
  }

  if (dataJaExpirou(dados.validade)) {
    throw new Error('Lisensa expirada');
  }

  if (dados.data_vencimento && dataJaExpirou(dados.data_vencimento)) {
    throw new Error('Assinatura vinculada está expirada');
  }

  if (dados.assinatura_status && !statusPermiteAutenticacao(dados.assinatura_status)) {
    throw new Error('Assinatura vinculada não está ativa');
  }

  return {
    licensaId: dados.id,
    numeroLicensa: dados.numero_licenca,
    empresaNome: dados.empresa_nome,
    assinaturaId: dados.assinatura_id,
    hotelNome: dados.hotel_nome || null,
  };
}

export async function deletarLisensa({ id }) {
  const resultado = await queryWithParams(
    `DELETE FROM licenca
     OUTPUT DELETED.id, DELETED.numero_licenca
     WHERE id = @id`,
    { id }
  );

  if (resultado.recordset.length === 0) {
    throw new Error('Lisensa não encontrada');
  }

  return resultado.recordset[0];
}

export async function obterDetalhesLisensa({ numeroLicensa }) {
  const resultado = await queryWithParams(
    `SELECT TOP 1
        l.id AS licensa_id,
        l.numero_licenca,
        l.chave,
        l.empresa_nome,
        l.status AS licensa_status,
        l.validade,
        l.ativa,
        l.assinatura_id,
        a.data_vencimento,
        a.tipo AS assinatura_tipo,
        a.valor_mensal,
        a.status AS assinatura_status,
        h.id AS hotel_id,
        h.nome AS hotel_nome,
        h.moeda_local,
        h.endereco
     FROM licenca l
     LEFT JOIN assinatura a ON a.id = l.assinatura_id
     LEFT JOIN hotel h ON h.assinatura_id = a.id
     WHERE l.numero_licenca = @numeroLicensa`,
    { numeroLicensa }
  );

  if (resultado.recordset.length === 0) {
    throw new Error('Lisensa não encontrada');
  }

  return resultado.recordset[0];
}

export async function listarHoteisDaLisensa({ numeroLicensa }) {
  const licensaResult = await queryWithParams(
    `SELECT TOP 1 id, numero_licenca, assinatura_id, empresa_nome
     FROM licenca
     WHERE numero_licenca = @numeroLicensa`,
    { numeroLicensa }
  );

  if (licensaResult.recordset.length === 0) {
    throw new Error('Lisensa não encontrada');
  }

  const licensa = licensaResult.recordset[0];

  if (!licensa.assinatura_id) {
    return {
      licensa: licensa,
      hoteis: [],
    };
  }

  const hoteisResult = await queryWithParams(
    `SELECT
        h.id,
        h.nome,
        h.moeda_local,
        h.endereco,
        h.assinatura_id
     FROM hotel h
     WHERE h.assinatura_id = @assinaturaId
     ORDER BY h.nome`,
    { assinaturaId: licensa.assinatura_id }
  );

  return {
    licensa,
    hoteis: hoteisResult.recordset,
  };
}

export async function vincularHotelNaLisensa({
  numeroLicensa,
  nomeHotel,
  moedaLocal = 'BRL',
  endereco = null,
  dataVencimentoAssinatura,
  tipoAssinatura = 'Premium',
  valorMensal = 0,
  statusAssinatura = 'ativo',
}) {
  const licensaResult = await queryWithParams(
    `SELECT TOP 1 id, assinatura_id
     FROM licenca
     WHERE numero_licenca = @numeroLicensa`,
    { numeroLicensa }
  );

  if (licensaResult.recordset.length === 0) {
    throw new Error('Lisensa não encontrada');
  }

  const licensa = licensaResult.recordset[0];
  let assinaturaId = licensa.assinatura_id;

  if (!assinaturaId) {
    const assinaturaResult = await queryWithParams(
      `INSERT INTO assinatura (data_vencimento, tipo, valor_mensal, status)
       OUTPUT INSERTED.id
       VALUES (@dataVencimentoAssinatura, @tipoAssinatura, @valorMensal, @statusAssinatura)`,
      {
        dataVencimentoAssinatura: dataVencimentoAssinatura || new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        tipoAssinatura,
        valorMensal,
        statusAssinatura,
      }
    );

    assinaturaId = assinaturaResult.recordset[0].id;

    await queryWithParams(
      `UPDATE licenca
       SET assinatura_id = @assinaturaId
       WHERE id = @licensaId`,
      { assinaturaId, licensaId: licensa.id }
    );
  }

  const hotelExistenteResult = await queryWithParams(
    `SELECT TOP 1 id
     FROM hotel
     WHERE assinatura_id = @assinaturaId`,
    { assinaturaId }
  );

  let hotel;

  if (hotelExistenteResult.recordset.length > 0) {
    const hotelAtualizado = await queryWithParams(
      `UPDATE hotel
       SET nome = @nomeHotel,
           moeda_local = @moedaLocal,
           endereco = @endereco
       OUTPUT INSERTED.id, INSERTED.nome, INSERTED.moeda_local, INSERTED.endereco, INSERTED.assinatura_id
       WHERE assinatura_id = @assinaturaId`,
      { assinaturaId, nomeHotel, moedaLocal, endereco }
    );

    hotel = hotelAtualizado.recordset[0];
  } else {
    const hotelCriado = await queryWithParams(
      `INSERT INTO hotel (assinatura_id, politica_id, nome, moeda_local, endereco)
       OUTPUT INSERTED.id, INSERTED.nome, INSERTED.moeda_local, INSERTED.endereco, INSERTED.assinatura_id
       VALUES (@assinaturaId, NULL, @nomeHotel, @moedaLocal, @endereco)`,
      { assinaturaId, nomeHotel, moedaLocal, endereco }
    );

    hotel = hotelCriado.recordset[0];
  }

  const detalhes = await obterDetalhesLisensa({ numeroLicensa });

  return {
    assinaturaId,
    hotel,
    detalhes,
  };
}
