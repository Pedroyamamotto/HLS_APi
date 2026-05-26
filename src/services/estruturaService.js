import { queryWithParams } from '../utils/database.js';

function normalizarStatus(status) {
  if (!status) return null;
  return String(status).trim().toLowerCase();
}

function normalizarNumeroEntrada(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return null;
  }

  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : NaN;
  }

  if (typeof valor === 'string') {
    const limpo = valor.trim().replace(',', '.');
    if (!limpo) return null;
    return Number(limpo);
  }

  return Number(valor);
}

async function validarHotelExiste(hotelId) {
  const resultado = await queryWithParams(
    `SELECT TOP 1 id FROM hotel WHERE id = @hotelId`,
    { hotelId }
  );

  if (resultado.recordset.length === 0) {
    throw new Error('Hotel não encontrado');
  }
}

async function obterAndarDoHotel({ hotelId, andarId }) {
  const resultado = await queryWithParams(
    `SELECT TOP 1 id, hotel_id, numero, nome
     FROM andar
     WHERE id = @andarId
       AND hotel_id = @hotelId`,
    { hotelId, andarId }
  );

  if (resultado.recordset.length === 0) {
    throw new Error('Andar não encontrado');
  }

  return resultado.recordset[0];
}

async function obterCategoriaDoHotel({ hotelId, categoriaId }) {
  const resultado = await queryWithParams(
    `SELECT TOP 1 id, hotel_id, nome, descricao, capacidade, preco_diaria
     FROM categoria_quarto
     WHERE id = @categoriaId
       AND hotel_id = @hotelId`,
    { hotelId, categoriaId }
  );

  if (resultado.recordset.length === 0) {
    throw new Error('Categoria de quarto não encontrada');
  }

  return resultado.recordset[0];
}

async function validarNumeroAndarUnico({ hotelId, numero, ignorarId = null }) {
  const params = { hotelId, numero };
  let sql = `SELECT TOP 1 id
             FROM andar
             WHERE hotel_id = @hotelId
               AND numero = @numero`;

  if (ignorarId) {
    sql += ' AND id <> @ignorarId';
    params.ignorarId = ignorarId;
  }

  const resultado = await queryWithParams(sql, params);
  if (resultado.recordset.length > 0) {
    throw new Error('Registro duplicado: já existe andar com este número');
  }
}

async function validarNomeCategoriaUnico({ hotelId, nome, ignorarId = null }) {
  const params = { hotelId, nome };
  let sql = `SELECT TOP 1 id
             FROM categoria_quarto
             WHERE hotel_id = @hotelId
               AND LOWER(nome) = LOWER(@nome)`;

  if (ignorarId) {
    sql += ' AND id <> @ignorarId';
    params.ignorarId = ignorarId;
  }

  const resultado = await queryWithParams(sql, params);
  if (resultado.recordset.length > 0) {
    throw new Error('Registro duplicado: já existe categoria com este nome');
  }
}

async function validarNumeroQuartoUnico({ hotelId, numero, ignorarId = null }) {
  const params = { hotelId, numero };
  let sql = `SELECT TOP 1 q.id
             FROM quarto q
             INNER JOIN andar a ON a.id = q.andar_id
             WHERE a.hotel_id = @hotelId
               AND q.numero = @numero`;

  if (ignorarId) {
    sql += ' AND q.id <> @ignorarId';
    params.ignorarId = ignorarId;
  }

  const resultado = await queryWithParams(sql, params);
  if (resultado.recordset.length > 0) {
    throw new Error('Registro duplicado: já existe quarto com este número no hotel');
  }
}

export async function listarAndares({ hotelId }) {
  await validarHotelExiste(hotelId);

  const resultado = await queryWithParams(
    `SELECT
        a.id,
        a.hotel_id,
        a.numero,
        a.nome,
        COUNT(q.id) AS total_quartos
     FROM andar a
     LEFT JOIN quarto q ON q.andar_id = a.id
     WHERE a.hotel_id = @hotelId
     GROUP BY a.id, a.hotel_id, a.numero, a.nome
     ORDER BY a.numero, a.nome`,
    { hotelId }
  );

  return resultado.recordset;
}

export async function obterAndarPorId({ hotelId, andarId }) {
  await validarHotelExiste(hotelId);

  const resultado = await queryWithParams(
    `SELECT TOP 1
        a.id,
        a.hotel_id,
        a.numero,
        a.nome,
        (SELECT COUNT(1) FROM quarto q WHERE q.andar_id = a.id) AS total_quartos
     FROM andar a
     WHERE a.id = @andarId
       AND a.hotel_id = @hotelId`,
    { hotelId, andarId }
  );

  if (resultado.recordset.length === 0) {
    throw new Error('Andar não encontrado');
  }

  return resultado.recordset[0];
}

export async function criarAndar({ hotelId, numero, nome = null }) {
  await validarHotelExiste(hotelId);

  if (numero === undefined || numero === null || String(numero).trim() === '') {
    throw new Error('Campo obrigatório: numero');
  }

  await validarNumeroAndarUnico({ hotelId, numero: Number(numero) });

  const resultado = await queryWithParams(
    `INSERT INTO andar (hotel_id, numero, nome)
     OUTPUT INSERTED.id, INSERTED.hotel_id, INSERTED.numero, INSERTED.nome
     VALUES (@hotelId, @numero, @nome)`,
    { hotelId, numero: Number(numero), nome }
  );

  return resultado.recordset[0];
}

export async function atualizarAndar({ hotelId, andarId, numero, nome }) {
  await validarHotelExiste(hotelId);
  await obterAndarDoHotel({ hotelId, andarId });

  const campos = [];
  const params = { hotelId, andarId };

  if (numero !== undefined) {
    const numeroNormalizado = Number(numero);
    await validarNumeroAndarUnico({ hotelId, numero: numeroNormalizado, ignorarId: andarId });
    campos.push('numero = @numero');
    params.numero = numeroNormalizado;
  }

  if (nome !== undefined) {
    campos.push('nome = @nome');
    params.nome = nome || null;
  }

  if (campos.length === 0) {
    throw new Error('Nenhum campo para atualizar');
  }

  const resultado = await queryWithParams(
    `UPDATE andar
     SET ${campos.join(', ')}
     OUTPUT INSERTED.id, INSERTED.hotel_id, INSERTED.numero, INSERTED.nome
     WHERE id = @andarId
       AND hotel_id = @hotelId`,
    params
  );

  return resultado.recordset[0];
}

export async function deletarAndar({ hotelId, andarId }) {
  await validarHotelExiste(hotelId);
  await obterAndarDoHotel({ hotelId, andarId });

  const resultado = await queryWithParams(
    `DELETE FROM andar
     OUTPUT DELETED.id, DELETED.hotel_id, DELETED.numero, DELETED.nome
     WHERE id = @andarId
       AND hotel_id = @hotelId`,
    { hotelId, andarId }
  );

  return resultado.recordset[0];
}

export async function listarCategoriasQuarto({ hotelId }) {
  await validarHotelExiste(hotelId);

  const resultado = await queryWithParams(
    `SELECT
        c.id,
        c.hotel_id,
        c.nome,
        c.descricao,
        c.capacidade,
        c.preco_diaria,
        COUNT(q.id) AS total_quartos
     FROM categoria_quarto c
     LEFT JOIN quarto q ON q.categoria_id = c.id
     WHERE c.hotel_id = @hotelId
     GROUP BY c.id, c.hotel_id, c.nome, c.descricao, c.capacidade, c.preco_diaria
     ORDER BY c.nome`,
    { hotelId }
  );

  return resultado.recordset;
}

export async function obterCategoriaQuartoPorId({ hotelId, categoriaId }) {
  await validarHotelExiste(hotelId);

  const resultado = await queryWithParams(
    `SELECT TOP 1
        c.id,
        c.hotel_id,
        c.nome,
        c.descricao,
        c.capacidade,
        c.preco_diaria,
        (SELECT COUNT(1) FROM quarto q WHERE q.categoria_id = c.id) AS total_quartos
     FROM categoria_quarto c
     WHERE c.id = @categoriaId
       AND c.hotel_id = @hotelId`,
    { hotelId, categoriaId }
  );

  if (resultado.recordset.length === 0) {
    throw new Error('Categoria de quarto não encontrada');
  }

  return resultado.recordset[0];
}

export async function criarCategoriaQuarto({ hotelId, nome, descricao = null, capacidade, precoDiaria }) {
  await validarHotelExiste(hotelId);

  if (!nome) {
    throw new Error('Campo obrigatório: nome');
  }
  if (capacidade === undefined || capacidade === null) {
    throw new Error('Campo obrigatório: capacidade');
  }
  if (precoDiaria === undefined || precoDiaria === null) {
    throw new Error('Campo obrigatório: preco_diaria');
  }

  const capacidadeNumero = normalizarNumeroEntrada(capacidade);
  if (!Number.isFinite(capacidadeNumero) || capacidadeNumero <= 0) {
    throw new Error('Campo obrigatório: capacidade');
  }

  const precoDiariaNumero = normalizarNumeroEntrada(precoDiaria);
  if (!Number.isFinite(precoDiariaNumero) || precoDiariaNumero < 0) {
    throw new Error('Campo obrigatório: preco_diaria');
  }

  await validarNomeCategoriaUnico({ hotelId, nome: String(nome).trim() });

  const resultado = await queryWithParams(
    `INSERT INTO categoria_quarto (hotel_id, nome, descricao, capacidade, preco_diaria)
     OUTPUT INSERTED.id, INSERTED.hotel_id, INSERTED.nome, INSERTED.descricao, INSERTED.capacidade, INSERTED.preco_diaria
     VALUES (@hotelId, @nome, @descricao, @capacidade, @precoDiaria)`,
    {
      hotelId,
      nome: String(nome).trim(),
      descricao,
      capacidade: capacidadeNumero,
      precoDiaria: precoDiariaNumero,
    }
  );

  return resultado.recordset[0];
}

export async function atualizarCategoriaQuarto({ hotelId, categoriaId, nome, descricao, capacidade, precoDiaria }) {
  await validarHotelExiste(hotelId);
  await obterCategoriaDoHotel({ hotelId, categoriaId });

  const campos = [];
  const params = { hotelId, categoriaId };

  if (nome !== undefined) {
    const nomeNormalizado = String(nome).trim();
    await validarNomeCategoriaUnico({ hotelId, nome: nomeNormalizado, ignorarId: categoriaId });
    campos.push('nome = @nome');
    params.nome = nomeNormalizado;
  }

  if (descricao !== undefined) {
    campos.push('descricao = @descricao');
    params.descricao = descricao || null;
  }

  if (capacidade !== undefined) {
    const capacidadeNumero = normalizarNumeroEntrada(capacidade);
    if (!Number.isFinite(capacidadeNumero) || capacidadeNumero <= 0) {
      throw new Error('Campo obrigatório: capacidade');
    }
    campos.push('capacidade = @capacidade');
    params.capacidade = capacidadeNumero;
  }

  if (precoDiaria !== undefined) {
    const precoDiariaNumero = normalizarNumeroEntrada(precoDiaria);
    if (!Number.isFinite(precoDiariaNumero) || precoDiariaNumero < 0) {
      throw new Error('Campo obrigatório: preco_diaria');
    }
    campos.push('preco_diaria = @precoDiaria');
    params.precoDiaria = precoDiariaNumero;
  }

  if (campos.length === 0) {
    throw new Error('Nenhum campo para atualizar');
  }

  const resultado = await queryWithParams(
    `UPDATE categoria_quarto
     SET ${campos.join(', ')}
     OUTPUT INSERTED.id, INSERTED.hotel_id, INSERTED.nome, INSERTED.descricao, INSERTED.capacidade, INSERTED.preco_diaria
     WHERE id = @categoriaId
       AND hotel_id = @hotelId`,
    params
  );

  return resultado.recordset[0];
}

export async function deletarCategoriaQuarto({ hotelId, categoriaId }) {
  await validarHotelExiste(hotelId);
  await obterCategoriaDoHotel({ hotelId, categoriaId });

  const resultado = await queryWithParams(
    `DELETE FROM categoria_quarto
     OUTPUT DELETED.id, DELETED.hotel_id, DELETED.nome
     WHERE id = @categoriaId
       AND hotel_id = @hotelId`,
    { hotelId, categoriaId }
  );

  return resultado.recordset[0];
}

export async function listarQuartos({ hotelId, andarId, categoriaId, status }) {
  await validarHotelExiste(hotelId);

  const filtros = ['a.hotel_id = @hotelId'];
  const params = { hotelId };

  if (andarId) {
    filtros.push('q.andar_id = @andarId');
    params.andarId = andarId;
  }

  if (categoriaId) {
    filtros.push('q.categoria_id = @categoriaId');
    params.categoriaId = categoriaId;
  }

  if (status) {
    filtros.push('LOWER(q.status) = LOWER(@status)');
    params.status = status;
  }

  const whereClause = `WHERE ${filtros.join(' AND ')}`;

  const resultado = await queryWithParams(
    `SELECT
        q.id,
        q.numero,
        q.descricao,
        q.capacidade,
        q.quantidade_camas,
        q.status,
        q.andar_id,
        a.numero AS andar_numero,
        a.nome AS andar_nome,
        q.categoria_id,
        c.nome AS categoria_nome,
        c.descricao AS categoria_descricao,
        c.preco_diaria
     FROM quarto q
     INNER JOIN andar a ON a.id = q.andar_id
     INNER JOIN categoria_quarto c ON c.id = q.categoria_id
     ${whereClause}
     ORDER BY a.numero, q.numero`,
    params
  );

  return resultado.recordset;
}

export async function obterQuartoPorId({ hotelId, quartoId }) {
  await validarHotelExiste(hotelId);

  const resultado = await queryWithParams(
    `SELECT TOP 1
        q.id,
        q.numero,
        q.descricao,
        q.capacidade,
        q.quantidade_camas,
        q.status,
        q.andar_id,
        a.numero AS andar_numero,
        a.nome AS andar_nome,
        q.categoria_id,
        c.nome AS categoria_nome,
        c.descricao AS categoria_descricao,
        c.preco_diaria
     FROM quarto q
     INNER JOIN andar a ON a.id = q.andar_id
     INNER JOIN categoria_quarto c ON c.id = q.categoria_id
     WHERE q.id = @quartoId
       AND a.hotel_id = @hotelId`,
    { hotelId, quartoId }
  );

  if (resultado.recordset.length === 0) {
    throw new Error('Quarto não encontrado');
  }

  return resultado.recordset[0];
}

export async function criarQuarto({ hotelId, andarId, categoriaId, numero, descricao = null, capacidade, quantidadeCamas = null, status = 'livre' }) {
  await validarHotelExiste(hotelId);

  if (!andarId) {
    throw new Error('Campo obrigatório: andar_id');
  }

  if (!categoriaId) {
    throw new Error('Campo obrigatório: categoria_id');
  }

  if (!numero) {
    throw new Error('Campo obrigatório: numero');
  }

  const andar = await obterAndarDoHotel({ hotelId, andarId });
  const categoria = await obterCategoriaDoHotel({ hotelId, categoriaId });

  if (andar.hotel_id !== categoria.hotel_id) {
    throw new Error('Dados inválidos: andar e categoria devem pertencer ao mesmo hotel');
  }

  await validarNumeroQuartoUnico({ hotelId, numero: String(numero).trim() });

  const capacidadeFinal = capacidade !== undefined && capacidade !== null
    ? Number(capacidade)
    : Number(categoria.capacidade);

  const resultado = await queryWithParams(
    `INSERT INTO quarto (andar_id, categoria_id, numero, descricao, capacidade, quantidade_camas, status)
     OUTPUT
       INSERTED.id,
       INSERTED.andar_id,
       INSERTED.categoria_id,
       INSERTED.numero,
       INSERTED.descricao,
       INSERTED.capacidade,
       INSERTED.quantidade_camas,
       INSERTED.status
     VALUES (@andarId, @categoriaId, @numero, @descricao, @capacidade, @quantidadeCamas, @status)`,
    {
      andarId,
      categoriaId,
      numero: String(numero).trim(),
      descricao,
      capacidade: capacidadeFinal,
      quantidadeCamas,
      status: normalizarStatus(status) || 'livre',
    }
  );

  return resultado.recordset[0];
}

export async function atualizarQuarto({ hotelId, quartoId, andarId, categoriaId, numero, descricao, capacidade, quantidadeCamas, status }) {
  await validarHotelExiste(hotelId);
  await obterQuartoPorId({ hotelId, quartoId });

  const campos = [];
  const params = { quartoId, hotelId };

  if (andarId !== undefined) {
    await obterAndarDoHotel({ hotelId, andarId });
    campos.push('andar_id = @andarId');
    params.andarId = andarId;
  }

  if (categoriaId !== undefined) {
    await obterCategoriaDoHotel({ hotelId, categoriaId });
    campos.push('categoria_id = @categoriaId');
    params.categoriaId = categoriaId;
  }

  if (numero !== undefined) {
    const numeroNormalizado = String(numero).trim();
    await validarNumeroQuartoUnico({ hotelId, numero: numeroNormalizado, ignorarId: quartoId });
    campos.push('numero = @numero');
    params.numero = numeroNormalizado;
  }

  if (descricao !== undefined) {
    campos.push('descricao = @descricao');
    params.descricao = descricao || null;
  }

  if (capacidade !== undefined) {
    campos.push('capacidade = @capacidade');
    params.capacidade = Number(capacidade);
  }

  if (quantidadeCamas !== undefined) {
    campos.push('quantidade_camas = @quantidadeCamas');
    params.quantidadeCamas = quantidadeCamas === null || quantidadeCamas === '' ? null : Number(quantidadeCamas);
  }

  if (status !== undefined) {
    campos.push('status = @status');
    params.status = normalizarStatus(status);
  }

  if (campos.length === 0) {
    throw new Error('Nenhum campo para atualizar');
  }

  const resultado = await queryWithParams(
    `UPDATE quarto
     SET ${campos.join(', ')}
     OUTPUT
       INSERTED.id,
       INSERTED.andar_id,
       INSERTED.categoria_id,
       INSERTED.numero,
       INSERTED.descricao,
       INSERTED.capacidade,
       INSERTED.quantidade_camas,
       INSERTED.status
     WHERE id = @quartoId
       AND EXISTS (
         SELECT 1
         FROM andar a
         WHERE a.id = quarto.andar_id
           AND a.hotel_id = @hotelId
       )`,
    params
  );

  return resultado.recordset[0];
}

export async function deletarQuarto({ hotelId, quartoId }) {
  await validarHotelExiste(hotelId);
  await obterQuartoPorId({ hotelId, quartoId });

  const resultado = await queryWithParams(
    `DELETE FROM quarto
     OUTPUT DELETED.id, DELETED.numero
     WHERE id = @quartoId
       AND EXISTS (
         SELECT 1
         FROM andar a
         WHERE a.id = quarto.andar_id
           AND a.hotel_id = @hotelId
       )`,
    { hotelId, quartoId }
  );

  return resultado.recordset[0];
}

export async function obterArquiteturaHotel({ hotelId }) {
  await validarHotelExiste(hotelId);

  const andares = await queryWithParams(
    `SELECT id, hotel_id, numero, nome
     FROM andar
     WHERE hotel_id = @hotelId
     ORDER BY numero, nome`,
    { hotelId }
  );

  const quartos = await queryWithParams(
    `SELECT
        q.id,
        q.numero,
        q.descricao,
        q.capacidade,
        q.quantidade_camas,
        q.status,
        q.andar_id,
        q.categoria_id,
        c.nome AS categoria_nome,
        c.descricao AS categoria_descricao,
        c.preco_diaria
     FROM quarto q
     INNER JOIN andar a ON a.id = q.andar_id
     INNER JOIN categoria_quarto c ON c.id = q.categoria_id
     WHERE a.hotel_id = @hotelId
     ORDER BY a.numero, q.numero`,
    { hotelId }
  );

  const quartosPorAndar = new Map();

  for (const quarto of quartos.recordset) {
    if (!quartosPorAndar.has(quarto.andar_id)) {
      quartosPorAndar.set(quarto.andar_id, []);
    }
    quartosPorAndar.get(quarto.andar_id).push(quarto);
  }

  const totalQuartos = quartos.recordset.length;
  const quartosEmManutencao = quartos.recordset.filter((q) => normalizarStatus(q.status) === 'manutencao').length;
  const quartosAtivos = quartos.recordset.filter((q) => {
    const st = normalizarStatus(q.status);
    return st !== 'inativo' && st !== 'desativado';
  }).length;
  const capacidadeTotal = quartos.recordset.reduce((acc, q) => acc + (Number(q.capacidade) || 0), 0);

  return {
    metricas: {
      total_andares: andares.recordset.length,
      total_quartos: totalQuartos,
      quartos_ativos: quartosAtivos,
      quartos_manutencao: quartosEmManutencao,
      capacidade_total: capacidadeTotal,
    },
    andares: andares.recordset.map((andar) => ({
      ...andar,
      quartos: quartosPorAndar.get(andar.id) || [],
    })),
  };
}
