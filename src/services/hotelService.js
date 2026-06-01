import { queryWithParams } from '../utils/database.js';

let colunaFotoUrlHotelGarantida = false;

function normalizarFotoUrl(valor) {
  if (valor === undefined) return null;
  if (valor === null) return null;
  const url = String(valor).trim();
  return url || null;
}

async function garantirColunaFotoUrlHotel() {
  if (colunaFotoUrlHotelGarantida) return;

  await queryWithParams(
    `IF OBJECT_ID('hotel', 'U') IS NOT NULL
     BEGIN
       IF COL_LENGTH('hotel', 'foto_url') IS NULL
         ALTER TABLE hotel ADD foto_url NVARCHAR(MAX) NULL;

       IF COL_LENGTH('hotel', 'foto_url') IS NOT NULL
         AND EXISTS (
           SELECT 1
           FROM sys.columns
           WHERE object_id = OBJECT_ID('hotel')
             AND name = 'foto_url'
             AND system_type_id <> 231
         )
         ALTER TABLE hotel ALTER COLUMN foto_url NVARCHAR(MAX) NULL;
     END`,
    {}
  );

  colunaFotoUrlHotelGarantida = true;
}

function twoDigits(value) {
  return String(value).padStart(2, '0');
}

function normalizarHorario(valor) {
  if (valor === null || valor === undefined) return null;

  if (valor instanceof Date) {
    return `${twoDigits(valor.getUTCHours())}:${twoDigits(valor.getUTCMinutes())}:${twoDigits(valor.getUTCSeconds())}`;
  }

  if (typeof valor === 'string') {
    const somenteHora = valor.match(/^(\d{2}:\d{2})(:\d{2})?$/);
    if (somenteHora) {
      return somenteHora[2] ? valor : `${valor}:00`;
    }

    const isoComHora = valor.match(/T(\d{2}:\d{2}:\d{2})/);
    if (isoComHora) {
      return isoComHora[1];
    }
  }

  return valor;
}

function normalizarPolitica(politica) {
  if (!politica) return politica;

  return {
    ...politica,
    horario_check_in: normalizarHorario(politica.horario_check_in),
    horario_check_out: normalizarHorario(politica.horario_check_out),
  };
}

function normalizarRefeicao(refeicao) {
  if (!refeicao) return refeicao;

  return {
    ...refeicao,
    horario_inicio: normalizarHorario(refeicao.horario_inicio),
    horario_fim: normalizarHorario(refeicao.horario_fim),
  };
}

function dataPadraoAssinatura() {
  const data = new Date();
  data.setFullYear(data.getFullYear() + 1);
  return data;
}

async function criarAssinatura({ dataVencimento, tipo = 'Premium', valorMensal = 0, status = 'ativo' }) {
  const resultado = await queryWithParams(
    `INSERT INTO assinatura (data_vencimento, tipo, valor_mensal, status)
     OUTPUT INSERTED.id, INSERTED.data_vencimento, INSERTED.tipo, INSERTED.valor_mensal, INSERTED.status
     VALUES (@dataVencimento, @tipo, @valorMensal, @status)`,
    {
      dataVencimento: dataVencimento || dataPadraoAssinatura(),
      tipo,
      valorMensal,
      status,
    }
  );

  return resultado.recordset[0];
}

export async function listarHoteis() {
  await garantirColunaFotoUrlHotel();

  const resultado = await queryWithParams(
    `SELECT
        h.id,
        h.nome,
        h.moeda_local,
        h.endereco,
        h.foto_url,
        h.assinatura_id,
        h.politica_id,
        a.data_vencimento,
        a.tipo AS assinatura_tipo,
        a.valor_mensal,
        a.status AS assinatura_status
     FROM hotel h
     LEFT JOIN assinatura a ON a.id = h.assinatura_id
     ORDER BY h.nome`,
    {}
  );

  return resultado.recordset;
}

export async function obterHotelPorId({ id }) {
  await garantirColunaFotoUrlHotel();

  const resultado = await queryWithParams(
    `SELECT TOP 1
        h.id,
        h.nome,
        h.moeda_local,
        h.endereco,
        h.foto_url,
        h.assinatura_id,
        h.politica_id,
        a.data_vencimento,
        a.tipo AS assinatura_tipo,
        a.valor_mensal,
        a.status AS assinatura_status
     FROM hotel h
     LEFT JOIN assinatura a ON a.id = h.assinatura_id
     WHERE h.id = @id`,
    { id }
  );

  if (resultado.recordset.length === 0) {
    throw new Error('Hotel não encontrado');
  }

  return resultado.recordset[0];
}

export async function criarHotel({ nome, moedaLocal, endereco = null, assinaturaId = null, politicaId = null, fotoUrl = null }) {
  await garantirColunaFotoUrlHotel();

  const resultado = await queryWithParams(
    `INSERT INTO hotel (assinatura_id, politica_id, nome, moeda_local, endereco, foto_url)
     OUTPUT INSERTED.id, INSERTED.nome, INSERTED.moeda_local, INSERTED.endereco, INSERTED.foto_url, INSERTED.assinatura_id, INSERTED.politica_id
     VALUES (@assinaturaId, @politicaId, @nome, @moedaLocal, @endereco, @fotoUrl)`,
    { nome, moedaLocal, endereco, assinaturaId, politicaId, fotoUrl: normalizarFotoUrl(fotoUrl) }
  );

  return resultado.recordset[0];
}

export async function atualizarHotel({ id, nome, moedaLocal, endereco, assinaturaId, politicaId, fotoUrl }) {
  await garantirColunaFotoUrlHotel();

  const campos = [];
  const params = { id };

  if (nome !== undefined) {
    campos.push('nome = @nome');
    params.nome = nome;
  }

  if (moedaLocal !== undefined) {
    campos.push('moeda_local = @moedaLocal');
    params.moedaLocal = moedaLocal;
  }

  if (endereco !== undefined) {
    campos.push('endereco = @endereco');
    params.endereco = endereco;
  }

  if (assinaturaId !== undefined) {
    campos.push('assinatura_id = @assinaturaId');
    params.assinaturaId = assinaturaId || null;
  }

  if (politicaId !== undefined) {
    campos.push('politica_id = @politicaId');
    params.politicaId = politicaId || null;
  }

  if (fotoUrl !== undefined) {
    campos.push('foto_url = @fotoUrl');
    params.fotoUrl = normalizarFotoUrl(fotoUrl);
  }

  if (campos.length === 0) {
    throw new Error('Nenhum campo para atualizar');
  }

  const resultado = await queryWithParams(
    `UPDATE hotel
     SET ${campos.join(', ')}
     OUTPUT INSERTED.id, INSERTED.nome, INSERTED.moeda_local, INSERTED.endereco, INSERTED.foto_url, INSERTED.assinatura_id, INSERTED.politica_id
     WHERE id = @id`,
    params
  );

  if (resultado.recordset.length === 0) {
    throw new Error('Hotel não encontrado');
  }

  return resultado.recordset[0];
}

export async function deletarHotel({ id }) {
  const resultado = await queryWithParams(
    `DELETE FROM hotel
     OUTPUT DELETED.id, DELETED.nome
     WHERE id = @id`,
    { id }
  );

  if (resultado.recordset.length === 0) {
    throw new Error('Hotel não encontrado');
  }

  return resultado.recordset[0];
}

export async function vincularHotelComLisensa({
  hotelId,
  numeroLicensa,
  dataVencimentoAssinatura,
  tipoAssinatura = 'Premium',
  valorMensal = 0,
  statusAssinatura = 'ativo',
}) {
  const hotelResult = await queryWithParams(
    `SELECT TOP 1 id, nome, assinatura_id
     FROM hotel
     WHERE id = @hotelId`,
    { hotelId }
  );

  if (hotelResult.recordset.length === 0) {
    throw new Error('Hotel não encontrado');
  }

  const licensaResult = await queryWithParams(
    `SELECT TOP 1 id, numero_licenca, assinatura_id
     FROM licenca
     WHERE numero_licenca = @numeroLicensa`,
    { numeroLicensa }
  );

  if (licensaResult.recordset.length === 0) {
    throw new Error('Lisensa não encontrada');
  }

  const hotel = hotelResult.recordset[0];
  const licensa = licensaResult.recordset[0];

  if (hotel.assinatura_id && licensa.assinatura_id && hotel.assinatura_id !== licensa.assinatura_id) {
    throw new Error('Hotel e lisensa já estão vinculados a assinaturas diferentes');
  }

  let assinaturaId = licensa.assinatura_id || hotel.assinatura_id;

  if (!assinaturaId) {
    const assinatura = await criarAssinatura({
      dataVencimento: dataVencimentoAssinatura,
      tipo: tipoAssinatura,
      valorMensal,
      status: statusAssinatura,
    });
    assinaturaId = assinatura.id;
  }

  await queryWithParams(
    `UPDATE hotel
     SET assinatura_id = @assinaturaId
     WHERE id = @hotelId`,
    { assinaturaId, hotelId }
  );

  await queryWithParams(
    `UPDATE licenca
     SET assinatura_id = @assinaturaId
     WHERE id = @licensaId`,
    { assinaturaId, licensaId: licensa.id }
  );

  const detalhes = await queryWithParams(
    `SELECT TOP 1
        h.id AS hotel_id,
        h.nome AS hotel_nome,
        h.moeda_local,
        h.endereco,
        l.id AS licensa_id,
        l.numero_licenca,
        l.assinatura_id,
        a.data_vencimento,
        a.tipo AS assinatura_tipo,
        a.valor_mensal,
        a.status AS assinatura_status
     FROM hotel h
     INNER JOIN assinatura a ON a.id = h.assinatura_id
     INNER JOIN licenca l ON l.assinatura_id = a.id
     WHERE h.id = @hotelId
       AND l.numero_licenca = @numeroLicensa`,
    { hotelId, numeroLicensa }
  );

  return detalhes.recordset[0];
}

// ─── POLÍTICA ─────────────────────────────────────────────────────────────────

export async function obterPoliticaDoHotel({ hotelId }) {
  const resultado = await queryWithParams(
    `SELECT TOP 1
        p.id,
        p.politica_cancelamento,
        p.horario_check_in,
        p.horario_check_out,
        p.carencia_minutos
     FROM hotel h
     INNER JOIN politica p ON p.id = h.politica_id
     WHERE h.id = @hotelId`,
    { hotelId }
  );

  if (resultado.recordset.length === 0) {
    return null;
  }

  return normalizarPolitica(resultado.recordset[0]);
}

export async function criarPoliticaParaHotel({ hotelId, politicaCancelamento = null, horarioCheckIn = null, horarioCheckOut = null, carenciaMinutos = null }) {
  const hotel = await queryWithParams(
    `SELECT TOP 1 id, politica_id FROM hotel WHERE id = @hotelId`,
    { hotelId }
  );

  if (hotel.recordset.length === 0) {
    throw new Error('Hotel não encontrado');
  }

  if (hotel.recordset[0].politica_id) {
    throw new Error('Hotel já possui uma política. Use PATCH para atualizar.');
  }

  const politica = await queryWithParams(
    `INSERT INTO politica (politica_cancelamento, horario_check_in, horario_check_out, carencia_minutos)
     OUTPUT INSERTED.id, INSERTED.politica_cancelamento, INSERTED.horario_check_in, INSERTED.horario_check_out, INSERTED.carencia_minutos
     VALUES (@politicaCancelamento, @horarioCheckIn, @horarioCheckOut, @carenciaMinutos)`,
    { politicaCancelamento, horarioCheckIn, horarioCheckOut, carenciaMinutos }
  );

  const politicaId = politica.recordset[0].id;

  await queryWithParams(
    `UPDATE hotel SET politica_id = @politicaId WHERE id = @hotelId`,
    { politicaId, hotelId }
  );

  return normalizarPolitica(politica.recordset[0]);
}

export async function atualizarPoliticaDoHotel({ hotelId, politicaCancelamento, horarioCheckIn, horarioCheckOut, carenciaMinutos }) {
  const hotel = await queryWithParams(
    `SELECT TOP 1 id, politica_id FROM hotel WHERE id = @hotelId`,
    { hotelId }
  );

  if (hotel.recordset.length === 0) {
    throw new Error('Hotel não encontrado');
  }

  const politicaId = hotel.recordset[0].politica_id;

  if (!politicaId) {
    throw new Error('Hotel não possui política cadastrada. Use POST para criar.');
  }

  const campos = [];
  const params = { politicaId };

  if (politicaCancelamento !== undefined) {
    campos.push('politica_cancelamento = @politicaCancelamento');
    params.politicaCancelamento = politicaCancelamento;
  }
  if (horarioCheckIn !== undefined) {
    campos.push('horario_check_in = @horarioCheckIn');
    params.horarioCheckIn = horarioCheckIn;
  }
  if (horarioCheckOut !== undefined) {
    campos.push('horario_check_out = @horarioCheckOut');
    params.horarioCheckOut = horarioCheckOut;
  }
  if (carenciaMinutos !== undefined) {
    campos.push('carencia_minutos = @carenciaMinutos');
    params.carenciaMinutos = carenciaMinutos;
  }

  if (campos.length === 0) {
    throw new Error('Nenhum campo para atualizar');
  }

  const resultado = await queryWithParams(
    `UPDATE politica
     SET ${campos.join(', ')}
     OUTPUT INSERTED.id, INSERTED.politica_cancelamento, INSERTED.horario_check_in, INSERTED.horario_check_out, INSERTED.carencia_minutos
     WHERE id = @politicaId`,
    params
  );

  return normalizarPolitica(resultado.recordset[0]);
}

export async function deletarPoliticaDoHotel({ hotelId }) {
  const hotel = await queryWithParams(
    `SELECT TOP 1 id, politica_id FROM hotel WHERE id = @hotelId`,
    { hotelId }
  );

  if (hotel.recordset.length === 0) {
    throw new Error('Hotel não encontrado');
  }

  const politicaId = hotel.recordset[0].politica_id;

  if (!politicaId) {
    throw new Error('Hotel não possui política cadastrada');
  }

  await queryWithParams(
    `UPDATE hotel SET politica_id = NULL WHERE id = @hotelId`,
    { hotelId }
  );

  await queryWithParams(
    `DELETE FROM politica WHERE id = @politicaId`,
    { politicaId }
  );

  return { mensagem: 'Política removida com sucesso' };
}

export async function listarRefeicoesDoHotel({ hotelId }) {
  const hotel = await queryWithParams(
    `SELECT TOP 1 id FROM hotel WHERE id = @hotelId`,
    { hotelId }
  );

  if (hotel.recordset.length === 0) {
    throw new Error('Hotel não encontrado');
  }

  const resultado = await queryWithParams(
    `SELECT id, hotel_id, nome, horario_inicio, horario_fim, habilitada
     FROM hotel_refeicao
     WHERE hotel_id = @hotelId
     ORDER BY nome`,
    { hotelId }
  );

  return resultado.recordset.map(normalizarRefeicao);
}

export async function criarRefeicaoDoHotel({ hotelId, nome, horarioInicio = null, horarioFim = null, habilitada = true }) {
  const hotel = await queryWithParams(
    `SELECT TOP 1 id FROM hotel WHERE id = @hotelId`,
    { hotelId }
  );

  if (hotel.recordset.length === 0) {
    throw new Error('Hotel não encontrado');
  }

  const duplicada = await queryWithParams(
    `SELECT TOP 1 id
     FROM hotel_refeicao
     WHERE hotel_id = @hotelId AND nome = @nome`,
    { hotelId, nome }
  );

  if (duplicada.recordset.length > 0) {
    throw new Error('Já existe uma refeição com este nome para o hotel');
  }

  const resultado = await queryWithParams(
    `INSERT INTO hotel_refeicao (hotel_id, nome, horario_inicio, horario_fim, habilitada)
     OUTPUT INSERTED.id, INSERTED.hotel_id, INSERTED.nome, INSERTED.horario_inicio, INSERTED.horario_fim, INSERTED.habilitada
     VALUES (@hotelId, @nome, @horarioInicio, @horarioFim, @habilitada)`,
    { hotelId, nome, horarioInicio, horarioFim, habilitada: habilitada ? 1 : 0 }
  );

  return normalizarRefeicao(resultado.recordset[0]);
}

export async function atualizarRefeicaoDoHotel({ hotelId, refeicaoId, nome, horarioInicio, horarioFim, habilitada }) {
  const refeicao = await queryWithParams(
    `SELECT TOP 1 id
     FROM hotel_refeicao
     WHERE id = @refeicaoId AND hotel_id = @hotelId`,
    { hotelId, refeicaoId }
  );

  if (refeicao.recordset.length === 0) {
    throw new Error('Refeição não encontrada');
  }

  const campos = [];
  const params = { refeicaoId, hotelId };

  if (nome !== undefined) {
    const duplicada = await queryWithParams(
      `SELECT TOP 1 id
       FROM hotel_refeicao
       WHERE hotel_id = @hotelId AND nome = @nome AND id <> @refeicaoId`,
      { hotelId, nome, refeicaoId }
    );

    if (duplicada.recordset.length > 0) {
      throw new Error('Já existe uma refeição com este nome para o hotel');
    }

    campos.push('nome = @nome');
    params.nome = nome;
  }

  if (horarioInicio !== undefined) {
    campos.push('horario_inicio = @horarioInicio');
    params.horarioInicio = horarioInicio;
  }

  if (horarioFim !== undefined) {
    campos.push('horario_fim = @horarioFim');
    params.horarioFim = horarioFim;
  }

  if (habilitada !== undefined) {
    campos.push('habilitada = @habilitada');
    params.habilitada = habilitada ? 1 : 0;
  }

  if (campos.length === 0) {
    throw new Error('Nenhum campo para atualizar');
  }

  const resultado = await queryWithParams(
    `UPDATE hotel_refeicao
     SET ${campos.join(', ')}, updated_at = SYSUTCDATETIME()
     OUTPUT INSERTED.id, INSERTED.hotel_id, INSERTED.nome, INSERTED.horario_inicio, INSERTED.horario_fim, INSERTED.habilitada
     WHERE id = @refeicaoId AND hotel_id = @hotelId`,
    params
  );

  return normalizarRefeicao(resultado.recordset[0]);
}

export async function deletarRefeicaoDoHotel({ hotelId, refeicaoId }) {
  const resultado = await queryWithParams(
    `DELETE FROM hotel_refeicao
     OUTPUT DELETED.id, DELETED.nome
     WHERE id = @refeicaoId AND hotel_id = @hotelId`,
    { hotelId, refeicaoId }
  );

  if (resultado.recordset.length === 0) {
    throw new Error('Refeição não encontrada');
  }

  return resultado.recordset[0];
}

export async function marcarPresencaHospedeNaRefeicao({ hotelId, refeicaoId, hospedeId, reservaId, presente = true, data = null }) {
  const dataPresenca = data || new Date();

  const refeicao = await queryWithParams(
    `SELECT TOP 1 id, nome
     FROM hotel_refeicao
     WHERE id = @refeicaoId AND hotel_id = @hotelId`,
    { hotelId, refeicaoId }
  );

  if (refeicao.recordset.length === 0) {
    throw new Error('Refeição não encontrada');
  }

  const hospede = await queryWithParams(
    `SELECT TOP 1 id
     FROM hospede
     WHERE id = @hospedeId AND hotel_id = @hotelId`,
    { hospedeId, hotelId }
  );

  if (hospede.recordset.length === 0) {
    throw new Error('Hóspede não encontrado');
  }

  const reserva = await queryWithParams(
    `SELECT TOP 1 r.id
     FROM reserva r
     INNER JOIN hospede h ON h.id = r.hospede_id
     WHERE r.id = @reservaId
       AND r.hospede_id = @hospedeId
       AND h.hotel_id = @hotelId`,
    { reservaId, hospedeId, hotelId }
  );

  if (reserva.recordset.length === 0) {
    throw new Error('Reserva não encontrada para este hóspede no hotel');
  }

  // A FK de pedido_consumo aponta para a tabela refeicao.
  // Garante que a refeição exista nela antes do insert.
  const refeicaoBase = await queryWithParams(
    `SELECT TOP 1 id
     FROM refeicao
     WHERE id = @refeicaoId`,
    { refeicaoId }
  );

  if (refeicaoBase.recordset.length === 0) {
    await queryWithParams(
      `INSERT INTO refeicao (id, nome)
       VALUES (@refeicaoId, @nome)`,
      {
        refeicaoId,
        nome: refeicao.recordset[0].nome,
      }
    );
  }

  const duplicado = await queryWithParams(
    `SELECT TOP 1 pc.id
     FROM pedido_consumo pc
     INNER JOIN hospede h ON h.id = pc.hospede_id
     WHERE pc.hospede_id = @hospedeId
       AND pc.refeicao_id = @refeicaoId
       AND pc.reserva_id = @reservaId
       AND CONVERT(date, pc.[data]) = CONVERT(date, @data)
       AND h.hotel_id = @hotelId`,
    { hospedeId, refeicaoId, reservaId, hotelId, data: dataPresenca }
  );

  if (duplicado.recordset.length > 0) {
    throw new Error('Presença já registrada para esta refeição nessa estadia e data');
  }

  const resultado = await queryWithParams(
    `INSERT INTO pedido_consumo (hospede_id, refeicao_id, reserva_id, presente, data)
     OUTPUT INSERTED.id, INSERTED.hospede_id, INSERTED.refeicao_id, INSERTED.reserva_id, INSERTED.presente, INSERTED.data
     VALUES (@hospedeId, @refeicaoId, @reservaId, @presente, @data)`,
    {
      hospedeId,
      refeicaoId,
      reservaId,
      presente: presente ? 1 : 0,
      data: dataPresenca,
    }
  );

  const registro = resultado.recordset[0];
  return {
    ...registro,
    presente: !!registro.presente,
  };
}

export async function obterPoliciesTimingDoHotel({ hotelId }) {
  const hotel = await obterHotelPorId({ id: hotelId });
  const politica = await obterPoliticaDoHotel({ hotelId });
  const refeicoes = await listarRefeicoesDoHotel({ hotelId });

  return {
    hotel: {
      id: hotel.id,
      nome: hotel.nome,
      moeda_local: hotel.moeda_local,
      endereco: hotel.endereco,
    },
    politica,
    refeicoes,
  };
}

export async function salvarPoliciesTimingDoHotel({ hotelId, politica, refeicoes }) {
  if (politica !== undefined) {
    const atual = await obterPoliticaDoHotel({ hotelId });

    if (!atual) {
      await criarPoliticaParaHotel({
        hotelId,
        politicaCancelamento: politica?.politica_cancelamento ?? null,
        horarioCheckIn: politica?.horario_check_in ?? null,
        horarioCheckOut: politica?.horario_check_out ?? null,
        carenciaMinutos: politica?.carencia_minutos ?? null,
      });
    } else {
      await atualizarPoliticaDoHotel({
        hotelId,
        politicaCancelamento: politica?.politica_cancelamento,
        horarioCheckIn: politica?.horario_check_in,
        horarioCheckOut: politica?.horario_check_out,
        carenciaMinutos: politica?.carencia_minutos,
      });
    }
  }

  if (Array.isArray(refeicoes)) {
    await queryWithParams(
      `DELETE FROM hotel_refeicao WHERE hotel_id = @hotelId`,
      { hotelId }
    );

    for (const item of refeicoes) {
      if (!item?.nome) {
        continue;
      }

      await queryWithParams(
        `INSERT INTO hotel_refeicao (hotel_id, nome, horario_inicio, horario_fim, habilitada)
         VALUES (@hotelId, @nome, @horarioInicio, @horarioFim, @habilitada)`,
        {
          hotelId,
          nome: item.nome,
          horarioInicio: item.horario_inicio ?? null,
          horarioFim: item.horario_fim ?? null,
          habilitada: item.habilitada === undefined ? 1 : (item.habilitada ? 1 : 0),
        }
      );
    }
  }

  return obterPoliciesTimingDoHotel({ hotelId });
}

const DEFAULT_CARD_ENCODER_CONFIG = {
  hotelId: 'master',
  waitMs: 5000,
};

export async function obterIntegracaoCardEncoderDoHotel({ hotelId }) {
  const hotel = await queryWithParams(
    `SELECT TOP 1 id FROM hotel WHERE id = @hotelId`,
    { hotelId }
  );

  if (hotel.recordset.length === 0) {
    throw new Error('Hotel não encontrado');
  }

  const resultado = await queryWithParams(
    `SELECT TOP 1
        hotel_id,
        encoder_hotel_id,
        wait_ms,
        atualizado_em,
        criado_em
     FROM hotel_integracao_card_encoder
     WHERE hotel_id = @hotelId`,
    { hotelId }
  );

  if (resultado.recordset.length === 0) {
    return {
      hotelId: DEFAULT_CARD_ENCODER_CONFIG.hotelId,
      waitMs: DEFAULT_CARD_ENCODER_CONFIG.waitMs,
      origem: 'default',
    };
  }

  const item = resultado.recordset[0];
  return {
    hotelId: String(item.encoder_hotel_id || DEFAULT_CARD_ENCODER_CONFIG.hotelId).trim() || DEFAULT_CARD_ENCODER_CONFIG.hotelId,
    waitMs: Number(item.wait_ms) || DEFAULT_CARD_ENCODER_CONFIG.waitMs,
    origem: 'database',
    atualizadoEm: item.atualizado_em,
    criadoEm: item.criado_em,
  };
}

export async function salvarIntegracaoCardEncoderDoHotel({ hotelId, encoderHotelId, waitMs }) {
  const hotel = await queryWithParams(
    `SELECT TOP 1 id FROM hotel WHERE id = @hotelId`,
    { hotelId }
  );

  if (hotel.recordset.length === 0) {
    throw new Error('Hotel não encontrado');
  }

  const hotelIdIntegracao = String(encoderHotelId || '').trim();
  const waitMsNormalizado = Number(waitMs);

  if (!hotelIdIntegracao) {
    throw new Error('hotelId é obrigatório');
  }

  if (!Number.isFinite(waitMsNormalizado) || waitMsNormalizado <= 0) {
    throw new Error('waitMs deve ser um número maior que zero');
  }

  await queryWithParams(
    `MERGE hotel_integracao_card_encoder AS target
     USING (SELECT @hotelId AS hotel_id) AS source
     ON target.hotel_id = source.hotel_id
     WHEN MATCHED THEN
       UPDATE SET
         encoder_hotel_id = @encoderHotelId,
         wait_ms = @waitMs,
         atualizado_em = SYSUTCDATETIME()
     WHEN NOT MATCHED THEN
       INSERT (hotel_id, encoder_hotel_id, wait_ms)
       VALUES (@hotelId, @encoderHotelId, @waitMs);`,
    {
      hotelId,
      encoderHotelId: hotelIdIntegracao,
      waitMs: Math.round(waitMsNormalizado),
    }
  );

  return obterIntegracaoCardEncoderDoHotel({ hotelId });
}
