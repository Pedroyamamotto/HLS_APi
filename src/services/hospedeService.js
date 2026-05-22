import { queryWithParams } from '../utils/database.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function apenasDigitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function validarEmail(email) {
  if (!email) return;

  if (!EMAIL_REGEX.test(String(email).trim())) {
    throw new Error('Dados inválidos: email inválido');
  }
}

function validarDocumento({ cpf, passaporte }) {
  if (cpf && passaporte) {
    throw new Error('Dados inválidos: informe apenas cpf ou passaporte');
  }

  if (cpf) {
    const digitosCpf = apenasDigitos(cpf);
    if (digitosCpf.length !== 11) {
      throw new Error('Dados inválidos: cpf deve ter 11 dígitos');
    }
  }

  if (passaporte) {
    const texto = String(passaporte).trim();
    if (texto.length < 5) {
      throw new Error('Dados inválidos: passaporte inválido');
    }
  }
}

function validarDataNascimento(dataNascimento) {
  if (!dataNascimento) return;

  const data = new Date(dataNascimento);
  if (Number.isNaN(data.getTime())) {
    throw new Error('Dados inválidos: data_nascimento inválida');
  }

  const hoje = new Date();
  if (data > hoje) {
    throw new Error('Dados inválidos: data_nascimento não pode ser futura');
  }
}

function validarNome(nome, campo = 'nome') {
  if (nome === undefined || nome === null) return;
  if (!String(nome).trim()) {
    throw new Error(`Dados inválidos: ${campo} não pode ser vazio`);
  }
}

function tratarDocumento({ documento, cpf, passaporte }) {
  if (documento !== undefined) {
    return { cpf: documento ? apenasDigitos(documento) : null, passaporte: null };
  }

  return {
    cpf: cpf ? apenasDigitos(cpf) : null,
    passaporte: passaporte ? String(passaporte).trim() : null,
  };
}

async function validarUnicidadeDocumento({ hotelId, cpf, passaporte, ignorarId = null }) {
  if (!cpf && !passaporte) return;

  const condicoes = [];
  const params = { hotelId };

  if (cpf) {
    condicoes.push('cpf = @cpf');
    params.cpf = cpf;
  }

  if (passaporte) {
    condicoes.push('passaporte = @passaporte');
    params.passaporte = passaporte;
  }

  let sql = `SELECT TOP 1 id FROM hospede WHERE hotel_id = @hotelId AND (${condicoes.join(' OR ')})`;

  if (ignorarId) {
    sql += ' AND id <> @ignorarId';
    params.ignorarId = ignorarId;
  }

  const existente = await queryWithParams(sql, params);

  if (existente.recordset.length > 0) {
    throw new Error('Registro duplicado: já existe hóspede com este cpf/passaporte');
  }
}

async function validarUnicidadeDocumentoDependente({ hospedeId, documento, ignorarDependenteId = null }) {
  if (!documento) return;

  const params = { hospedeId, documento };
  let sql = `SELECT TOP 1 id
             FROM dependente
             WHERE hospede_id = @hospedeId
               AND documento = @documento`;

  if (ignorarDependenteId) {
    sql += ' AND id <> @ignorarDependenteId';
    params.ignorarDependenteId = ignorarDependenteId;
  }

  const existente = await queryWithParams(sql, params);

  if (existente.recordset.length > 0) {
    throw new Error('Registro duplicado: já existe dependente com este documento para o hóspede');
  }
}

export async function listarHospedes({ hotelId, nome, email, documento, page = 1, limit = 20 }) {
  const pageNumber = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const offset = (pageNumber - 1) * pageSize;

  const filtros = ['h.hotel_id = @hotelId'];
  const params = { hotelId, offset, pageSize };

  if (nome) {
    filtros.push('h.nome LIKE @nome');
    params.nome = `%${nome}%`;
  }

  if (email) {
    filtros.push('h.email LIKE @email');
    params.email = `%${email}%`;
  }

  if (documento) {
    filtros.push('(h.cpf = @documento OR h.passaporte = @documento)');
    params.documento = documento;
  }

  const whereClause = filtros.length > 0 ? `WHERE ${filtros.join(' AND ')}` : '';

  const totalResult = await queryWithParams(
    `SELECT COUNT(1) AS total
     FROM hospede h
     ${whereClause}`,
    params
  );

  const dadosResult = await queryWithParams(
    `SELECT
        h.id,
        h.nome,
        h.email,
        h.telefone,
        h.cpf,
        h.passaporte,
        h.nacionalidade,
        h.endereco,
        h.data_nascimento,
        (SELECT COUNT(1) FROM dependente d WHERE d.hospede_id = h.id) AS total_dependentes
     FROM hospede h
     ${whereClause}
     ORDER BY h.nome
     OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
    params
  );

  const total = totalResult.recordset[0]?.total || 0;

  return {
    dados: dadosResult.recordset,
    paginacao: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function obterHospedePorId({ id, hotelId }) {
  const hospedeResult = await queryWithParams(
    `SELECT TOP 1
        h.id,
        h.nome,
        h.email,
        h.telefone,
        h.cpf,
        h.passaporte,
        h.nacionalidade,
        h.endereco,
        h.data_nascimento
     FROM hospede h
     WHERE h.id = @id
       AND h.hotel_id = @hotelId`,
    { id, hotelId }
  );

  if (hospedeResult.recordset.length === 0) {
    throw new Error('Hospede não encontrado');
  }

  const dependentesResult = await queryWithParams(
    `SELECT
        d.id,
        d.hospede_id,
        d.nome,
        d.documento
     FROM dependente d
     WHERE d.hospede_id = @id
     ORDER BY d.nome`,
    { id }
  );

  return {
    ...hospedeResult.recordset[0],
    dependentes: dependentesResult.recordset,
  };
}

export async function criarHospede({ hotelId, nome, email = null, telefone = null, cpf, passaporte, documento, nacionalidade = null, endereco = null, dataNascimento = null }) {
  if (!nome) {
    throw new Error('Campo obrigatório: nome');
  }

  validarNome(nome);
  validarEmail(email);

  const doc = tratarDocumento({ documento, cpf, passaporte });
  validarDocumento(doc);
  validarDataNascimento(dataNascimento);
  await validarUnicidadeDocumento({ hotelId, cpf: doc.cpf, passaporte: doc.passaporte });

  const result = await queryWithParams(
    `INSERT INTO hospede (hotel_id, nome, email, telefone, cpf, passaporte, nacionalidade, endereco, data_nascimento)
     OUTPUT
       INSERTED.id,
       INSERTED.hotel_id,
       INSERTED.nome,
       INSERTED.email,
       INSERTED.telefone,
       INSERTED.cpf,
       INSERTED.passaporte,
       INSERTED.nacionalidade,
       INSERTED.endereco,
       INSERTED.data_nascimento
     VALUES (@hotelId, @nome, @email, @telefone, @cpf, @passaporte, @nacionalidade, @endereco, @dataNascimento)`,
    {
      hotelId,
      nome,
      email,
      telefone,
      cpf: doc.cpf,
      passaporte: doc.passaporte,
      nacionalidade,
      endereco,
      dataNascimento,
    }
  );

  return result.recordset[0];
}

export async function atualizarHospede({ id, hotelId, nome, email, telefone, cpf, passaporte, documento, nacionalidade, endereco, dataNascimento }) {
  const campos = [];
  const params = { id, hotelId };

  validarNome(nome);
  validarEmail(email);

  if (nome !== undefined) {
    campos.push('nome = @nome');
    params.nome = nome;
  }

  if (email !== undefined) {
    campos.push('email = @email');
    params.email = email || null;
  }

  if (telefone !== undefined) {
    campos.push('telefone = @telefone');
    params.telefone = telefone || null;
  }

  if (documento !== undefined || cpf !== undefined || passaporte !== undefined) {
    const doc = tratarDocumento({ documento, cpf, passaporte });
    validarDocumento(doc);
    await validarUnicidadeDocumento({ hotelId, cpf: doc.cpf, passaporte: doc.passaporte, ignorarId: id });
    campos.push('cpf = @cpf');
    campos.push('passaporte = @passaporte');
    params.cpf = doc.cpf;
    params.passaporte = doc.passaporte;
  }

  if (nacionalidade !== undefined) {
    campos.push('nacionalidade = @nacionalidade');
    params.nacionalidade = nacionalidade || null;
  }

  if (endereco !== undefined) {
    campos.push('endereco = @endereco');
    params.endereco = endereco || null;
  }

  if (dataNascimento !== undefined) {
    validarDataNascimento(dataNascimento);
    campos.push('data_nascimento = @dataNascimento');
    params.dataNascimento = dataNascimento || null;
  }

  if (campos.length === 0) {
    throw new Error('Nenhum campo para atualizar');
  }

  const result = await queryWithParams(
    `UPDATE hospede
     SET ${campos.join(', ')}
     OUTPUT
       INSERTED.id,
      INSERTED.hotel_id,
       INSERTED.nome,
       INSERTED.email,
       INSERTED.telefone,
       INSERTED.cpf,
       INSERTED.passaporte,
       INSERTED.nacionalidade,
       INSERTED.endereco,
       INSERTED.data_nascimento
     WHERE id = @id
       AND hotel_id = @hotelId`,
    params
  );

  if (result.recordset.length === 0) {
    throw new Error('Hospede não encontrado');
  }

  return result.recordset[0];
}

export async function deletarHospede({ id, hotelId }) {
  const existe = await queryWithParams(
    `SELECT TOP 1 id FROM hospede WHERE id = @id AND hotel_id = @hotelId`,
    { id, hotelId }
  );

  if (existe.recordset.length === 0) {
    throw new Error('Hospede não encontrado');
  }

  await queryWithParams(
    `DELETE FROM dependente WHERE hospede_id = @id`,
    { id }
  );

  await queryWithParams(
    `DELETE FROM hospede WHERE id = @id AND hotel_id = @hotelId`,
    { id, hotelId }
  );

  return { mensagem: 'Hospede removido com sucesso' };
}

export async function listarDependentes({ hospedeId, hotelId }) {
  const hospede = await queryWithParams(
    `SELECT TOP 1 id FROM hospede WHERE id = @hospedeId AND hotel_id = @hotelId`,
    { hospedeId, hotelId }
  );

  if (hospede.recordset.length === 0) {
    throw new Error('Hospede não encontrado');
  }

  const result = await queryWithParams(
    `SELECT
        d.id,
        d.hospede_id,
        d.nome,
        d.documento
     FROM dependente d
     WHERE d.hospede_id = @hospedeId
     ORDER BY d.nome`,
    { hospedeId }
  );

  return result.recordset;
}

export async function criarDependente({ hospedeId, hotelId, nome, documento = null }) {
  if (!nome) {
    throw new Error('Campo obrigatório: nome');
  }

  validarNome(nome);

  if (documento) {
    const doc = String(documento).trim();
    if (doc.length < 5) {
      throw new Error('Dados inválidos: documento do dependente inválido');
    }
    documento = doc;
  }

  const hospede = await queryWithParams(
    `SELECT TOP 1 id FROM hospede WHERE id = @hospedeId AND hotel_id = @hotelId`,
    { hospedeId, hotelId }
  );

  if (hospede.recordset.length === 0) {
    throw new Error('Hospede não encontrado');
  }

  await validarUnicidadeDocumentoDependente({ hospedeId, documento });

  const result = await queryWithParams(
    `INSERT INTO dependente (hospede_id, nome, documento)
     OUTPUT INSERTED.id, INSERTED.hospede_id, INSERTED.nome, INSERTED.documento
     VALUES (@hospedeId, @nome, @documento)`,
    { hospedeId, nome, documento }
  );

  return result.recordset[0];
}

export async function atualizarDependente({ hospedeId, hotelId, dependenteId, nome, documento }) {
  const campos = [];
  const params = { hospedeId, dependenteId };

  validarNome(nome);

  if (documento !== undefined && documento) {
    const doc = String(documento).trim();
    if (doc.length < 5) {
      throw new Error('Dados inválidos: documento do dependente inválido');
    }
    documento = doc;
  }

  if (documento !== undefined && documento) {
    await validarUnicidadeDocumentoDependente({
      hospedeId,
      documento,
      ignorarDependenteId: dependenteId,
    });
  }

  const hospede = await queryWithParams(
    `SELECT TOP 1 id FROM hospede WHERE id = @hospedeId AND hotel_id = @hotelId`,
    { hospedeId, hotelId }
  );

  if (hospede.recordset.length === 0) {
    throw new Error('Hospede não encontrado');
  }

  if (nome !== undefined) {
    campos.push('nome = @nome');
    params.nome = nome;
  }

  if (documento !== undefined) {
    campos.push('documento = @documento');
    params.documento = documento || null;
  }

  if (campos.length === 0) {
    throw new Error('Nenhum campo para atualizar');
  }

  const result = await queryWithParams(
    `UPDATE dependente
     SET ${campos.join(', ')}
     OUTPUT INSERTED.id, INSERTED.hospede_id, INSERTED.nome, INSERTED.documento
     WHERE id = @dependenteId
       AND hospede_id = @hospedeId`,
    params
  );

  if (result.recordset.length === 0) {
    throw new Error('Dependente não encontrado');
  }

  return result.recordset[0];
}

export async function deletarDependente({ hospedeId, hotelId, dependenteId }) {
  const hospede = await queryWithParams(
    `SELECT TOP 1 id FROM hospede WHERE id = @hospedeId AND hotel_id = @hotelId`,
    { hospedeId, hotelId }
  );

  if (hospede.recordset.length === 0) {
    throw new Error('Hospede não encontrado');
  }

  const result = await queryWithParams(
    `DELETE FROM dependente
     OUTPUT DELETED.id, DELETED.hospede_id, DELETED.nome
     WHERE id = @dependenteId
       AND hospede_id = @hospedeId`,
    { hospedeId, dependenteId }
  );

  if (result.recordset.length === 0) {
    throw new Error('Dependente não encontrado');
  }

  return { mensagem: 'Dependente removido com sucesso' };
}

export async function listarPresencasRefeicoesHospede({ hospedeId, hotelId }) {
  const hospede = await queryWithParams(
    `SELECT TOP 1 id FROM hospede WHERE id = @hospedeId AND hotel_id = @hotelId`,
    { hospedeId, hotelId }
  );

  if (hospede.recordset.length === 0) {
    throw new Error('Hospede não encontrado');
  }

  const resultado = await queryWithParams(
    `SELECT
        pc.id,
        pc.hospede_id,
        pc.refeicao_id,
        pc.reserva_id,
        r.codigo AS reserva_codigo,
        r.data_checkin,
        r.data_checkout,
        hr.nome AS refeicao_nome,
        pc.presente,
        pc.[data]
     FROM pedido_consumo pc
     INNER JOIN hotel_refeicao hr ON hr.id = pc.refeicao_id
     LEFT JOIN reserva r ON r.id = pc.reserva_id
     WHERE pc.hospede_id = @hospedeId
       AND hr.hotel_id = @hotelId
       AND pc.presente = 1
     ORDER BY pc.[data] DESC, hr.nome`,
    { hospedeId, hotelId }
  );

  return resultado.recordset.map((item) => ({
    ...item,
    presente: !!item.presente,
  }));
}

export async function atualizarPresencaRefeicaoHospede({ hospedeId, hotelId, pedidoConsumoId, presente }) {
  const hospede = await queryWithParams(
    `SELECT TOP 1 id FROM hospede WHERE id = @hospedeId AND hotel_id = @hotelId`,
    { hospedeId, hotelId }
  );

  if (hospede.recordset.length === 0) {
    throw new Error('Hospede não encontrado');
  }

  const resultado = await queryWithParams(
    `UPDATE pc
     SET pc.presente = @presente
     OUTPUT INSERTED.id, INSERTED.hospede_id, INSERTED.refeicao_id, INSERTED.reserva_id, INSERTED.presente, INSERTED.[data]
     FROM pedido_consumo pc
     INNER JOIN hotel_refeicao hr ON hr.id = pc.refeicao_id
     WHERE pc.id = @pedidoConsumoId
       AND pc.hospede_id = @hospedeId
       AND hr.hotel_id = @hotelId`,
    {
      hospedeId,
      hotelId,
      pedidoConsumoId,
      presente: presente ? 1 : 0,
    }
  );

  if (resultado.recordset.length === 0) {
    throw new Error('Registro de presença não encontrado');
  }

  return {
    ...resultado.recordset[0],
    presente: !!resultado.recordset[0].presente,
  };
}
