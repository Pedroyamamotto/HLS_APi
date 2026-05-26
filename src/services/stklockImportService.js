import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';
import fsSync from 'fs';
import MDBReader from 'mdb-reader';
import { getDatabase, queryWithParams } from '../utils/database.js';

const MDB_PASSWORD = process.env.STKLOCK_MDB_PASSWORD || 'TGLock130118';
const STKLOCK_EXPORTER_JAR = process.env.STKLOCK_EXPORTER_JAR || path.resolve('tools', 'stklock-exporter.jar');

const jobs = new Map();

export async function createImportJob({ hotelId, filePath, originalName }) {
  const id = crypto.randomUUID();

  const job = {
    id,
    hotelId,
    filePath,
    originalName,
    status: 'queued',
    progress: 0,
    message: 'Arquivo recebido',
    error: null,
    result: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  jobs.set(id, job);
  return job;
}

export async function getImportJob(jobId) {
  const job = jobs.get(jobId);

  if (!job) {
    throw new Error('Importacao nao encontrada');
  }

  return job;
}

function updateJob(jobId, data) {
  const current = jobs.get(jobId);
  if (!current) return;

  jobs.set(jobId, {
    ...current,
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function processStklockImport(jobId) {
  const job = await getImportJob(jobId);
  let extractedJsonPath;

  try {
    updateJob(jobId, {
      status: 'extracting',
      progress: 15,
      message: 'Lendo banco STKLock',
    });

    extractedJsonPath = await extractMdbToJson(job.filePath);

    updateJob(jobId, {
      status: 'importing',
      progress: 45,
      message: 'Importando estrutura do hotel',
    });

    const rawData = JSON.parse(await fs.readFile(extractedJsonPath, 'utf8'));

    updateJob(jobId, {
      status: 'validating',
      progress: 35,
      message: 'Validando dados do backup',
    });

    const result = await importToCurrentSchema({
      hotelId: job.hotelId,
      rawData,
    });

    updateJob(jobId, {
      status: 'done',
      progress: 100,
      message: 'Importacao concluida',
      result,
      error: null,
    });
  } catch (error) {
    updateJob(jobId, {
      status: 'error',
      progress: 100,
      message: 'Erro na importacao',
      error: error.message,
    });
  } finally {
    await cleanupFile(job.filePath);
    if (extractedJsonPath) {
      await cleanupFile(extractedJsonPath);
    }
  }
}

async function cleanupFile(filePath) {
  if (!filePath) return;

  try {
    await fs.rm(filePath, { force: true });
  } catch {
    // Ignora cleanup.
  }
}

async function extractMdbToJson(filePath) {
  await fs.mkdir(path.resolve('tmp', 'imports'), { recursive: true });

  const outputPath = path.resolve('tmp', 'imports', `stklock_${Date.now()}_${crypto.randomUUID()}.json`);

  try {
    await fs.access(STKLOCK_EXPORTER_JAR);
    await extractWithJar(filePath, outputPath);
    return outputPath;
  } catch {
    await extractWithNodeMdbReader(filePath, outputPath);
    return outputPath;
  }
}

async function extractWithJar(filePath, outputPath) {

  await new Promise((resolve, reject) => {
    const child = spawn('java', ['-jar', STKLOCK_EXPORTER_JAR, filePath, outputPath, MDB_PASSWORD], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    let stderr = '';

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || 'Falha ao extrair MDB'));
        return;
      }

      resolve();
    });
  });
}

function safeReadTable(reader, tableName) {
  try {
    return reader.getTable(tableName).getData();
  } catch {
    return [];
  }
}

function normalizeGuestName(value) {
  const text = String(value || '').trim();
  return text || null;
}

async function extractWithNodeMdbReader(filePath, outputPath) {
  const buffer = fsSync.readFileSync(filePath);
  const reader = new MDBReader(buffer);

  const roomTypeRows = safeReadTable(reader, 'RoomType');
  const roomInfoRows = safeReadTable(reader, 'RoomInfo');
  const makeCardRows = safeReadTable(reader, 'MakeCardRecord');
  const cardUsersRows = safeReadTable(reader, 'CardUsersInfo');

  const rooms = roomInfoRows.map((row) => ({
    RoomNo: String(row.RoomName || row.RoomCode || row.LockNo || row.Id || '').trim(),
    RoomType: String(row.RoomType || '').trim() || null,
    Capacity: Number(row.MaxCardCount || 2),
    Name: row.RoomName || row.RoomCode || null,
    LockNo: row.LockNo || null,
  })).filter((row) => row.RoomNo);

  const usersMap = new Map();
  for (const row of cardUsersRows) {
    const legacyId = String(row.UserID || row.ID || row.Id || '').trim();
    const nome = normalizeGuestName(row.UserName || row.Name || row.GuestName);
    const documento = String(row.IDCode || row.Document || row.CPF || '').trim() || null;

    const key = legacyId || documento || nome;
    if (!key || !nome) continue;

    usersMap.set(key, {
      ID: legacyId || key,
      Name: nome,
      Document: documento,
      Email: null,
      Phone: null,
    });
  }

  for (const row of makeCardRows) {
    const isGuest = String(row.CardType || '').toLowerCase().includes('guest');
    if (!isGuest) continue;

    const legacyId = String(row.UserID || '').trim();
    const nome = normalizeGuestName(row.UserName);
    const documento = String(row.IDCode || '').trim() || null;
    const key = legacyId || documento || nome;

    if (!key || !nome) continue;

    if (!usersMap.has(key)) {
      usersMap.set(key, {
        ID: legacyId || key,
        Name: nome,
        Document: documento,
        Email: null,
        Phone: null,
      });
    }
  }

  const reservations = makeCardRows
    .filter((row) => String(row.CardType || '').toLowerCase().includes('guest'))
    .map((row, index) => ({
      Code: String(row.BillNo || row.CardCode || `STK-${Date.now()}-${index}`),
      GuestID: String(row.UserID || row.IDCode || row.UserName || '').trim() || null,
      RoomNo: String(row.RoomName || row.RoomCode || '').trim() || null,
      CheckIn: row.CheckInDate || row.MakeCardDate || null,
      CheckOut: row.CheckOutDate || row.DisableDate || null,
      Status: row.ReturnCardDate ? 'finalizada' : 'ativa',
      Password: row.CardCode || null,
    }));

  const exportPayload = {
    source: 'node-mdb-reader',
    passwordHint: MDB_PASSWORD,
    RoomType: roomTypeRows,
    Rooms: rooms,
    Guests: [...usersMap.values()],
    Reservations: reservations,
  };

  await fs.writeFile(outputPath, JSON.stringify(exportPayload), 'utf8');
}

async function importToCurrentSchema({ hotelId, rawData }) {
  const roomTypes = extractRoomTypes(rawData);
  if (!roomTypes.length) {
    throw new Error('Nenhum RoomType encontrado no backup STKLock. Importacao cancelada antes de salvar no banco.');
  }

  if (!isGuid(hotelId)) {
    throw new Error('hotelId invalido para importacao');
  }

  await assertHotelExists(hotelId);

  const result = {
    roomTypes: roomTypes,
    roomTypesEncontrados: roomTypes.length,
    andares: 0,
    categorias: 0,
    quartos: 0,
    hospedes: 0,
    reservas: 0,
    estadias: 0,
    credenciais: 0,
  };

  const quartosAntigos = normalizeRooms(rawData);
  const hospedesAntigos = normalizeGuests(rawData);
  const reservasAntigas = normalizeReservations(rawData);

  const defaultAndarId = await upsertAndar(hotelId, 1, 'Andar 1');
  result.andares += 1;

  const defaultCategoriaId = await upsertCategoria(hotelId, {
    nome: 'Padrao',
    capacidade: 2,
    preco_diaria: 0,
    descricao: 'Categoria criada automaticamente pela importacao STKLock',
  });
  result.categorias += 1;

  const quartoMap = new Map();
  for (const quarto of quartosAntigos) {
    const quartoId = await upsertQuarto({
      hotelId,
      andarId: defaultAndarId,
      categoriaId: defaultCategoriaId,
      numero: quarto.numero,
      capacidade: quarto.capacidade || 2,
      descricao: quarto.descricao || null,
    });

    quartoMap.set(String(quarto.numero), quartoId);
    result.quartos += 1;
  }

  const hospedeMap = new Map();
  for (const hospede of hospedesAntigos) {
    const hospedeId = await upsertHospede(hospede);
    const keys = [hospede.legacyId, hospede.documento, hospede.email, hospede.nome]
      .filter(Boolean)
      .map((value) => String(value));

    for (const key of keys) {
      hospedeMap.set(key, hospedeId);
    }

    result.hospedes += 1;
  }

  for (const reserva of reservasAntigas) {
    const hospedeId =
      hospedeMap.get(String(reserva.hospedeLegacyId || '')) ||
      hospedeMap.get(String(reserva.documento || '')) ||
      firstMapValue(hospedeMap);

    const quartoId = quartoMap.get(String(reserva.numeroQuarto || ''));

    if (!hospedeId || !quartoId) {
      continue;
    }

    const reservaId = await createReserva({
      hospedeId,
      quartoId,
      checkin: reserva.checkin,
      checkout: reserva.checkout,
      codigo: reserva.codigo,
      status: normalizeReservaStatus(reserva.status),
    });

    result.reservas += 1;

    const estadiaCriada = await createEstadia(reservaId, normalizeEstadiaStatus(reserva.status));
    if (estadiaCriada) {
      result.estadias += 1;
    }

    if (reserva.codigoAcesso) {
      const credencialCriada = await createCredencial({
        reservaId,
        hospedeId,
        codigo: reserva.codigoAcesso,
        inicio: reserva.checkin,
        fim: reserva.checkout,
        tipo: 'senha',
      });

      if (credencialCriada) {
        result.credenciais += 1;
      }
    }
  }

  return result;
}

async function assertHotelExists(hotelId) {
  const result = await queryWithParams(
    `SELECT TOP 1 id
     FROM hotel
     WHERE id = @hotelId`,
    { hotelId }
  );

  if (!result.recordset.length) {
    throw new Error('Hotel nao encontrado para o hotelId informado');
  }
}

function firstMapValue(map) {
  return map.values().next().value;
}

function normalizeDate(value, fallback = new Date()) {
  const parsed = value ? new Date(value) : fallback;
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed;
}

function isGuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function normalizeReservaStatus(status) {
  const value = String(status || '').trim().toLowerCase();

  if (!value) return 'confirmada';
  if (value.includes('cancel')) return 'cancelada';
  if (value.includes('checkin') || value.includes('ativa') || value.includes('active')) return 'ativa';
  if (value.includes('checkout') || value.includes('final')) return 'finalizada';

  return 'confirmada';
}

function normalizeEstadiaStatus(status) {
  const value = normalizeReservaStatus(status);
  if (value === 'finalizada') return 'encerrada';
  if (value === 'cancelada') return 'cancelada';
  return 'ativa';
}

export function extractRoomTypes(rawData) {
  const fromTopLevel =
    rawData?.RoomType ||
    rawData?.RoomTypes ||
    rawData?.roomType ||
    rawData?.roomTypes ||
    rawData?.TiposQuarto ||
    rawData?.tipo_quarto ||
    [];

  const roomRows = rawData?.Rooms || rawData?.Quartos || rawData?.locks || rawData?.Locks || [];
  const values = [];

  if (Array.isArray(fromTopLevel)) {
    for (const item of fromTopLevel) {
      if (typeof item === 'string' || typeof item === 'number') {
        values.push(String(item));
        continue;
      }

      if (item && typeof item === 'object') {
        values.push(
          String(
            item.Name ||
              item.Nome ||
              item.RoomType ||
              item.RoomTypeName ||
              item.Type ||
              item.Descricao ||
              item.ID ||
              item.Id ||
              ''
          )
        );
      }
    }
  } else if (fromTopLevel && typeof fromTopLevel === 'object') {
    values.push(String(fromTopLevel.Name || fromTopLevel.Nome || fromTopLevel.RoomType || fromTopLevel.ID || ''));
  } else if (typeof fromTopLevel === 'string' || typeof fromTopLevel === 'number') {
    values.push(String(fromTopLevel));
  }

  for (const row of roomRows) {
    values.push(
      String(
        row?.RoomType ||
          row?.RoomTypeName ||
          row?.Type ||
          row?.Tipo ||
          row?.Categoria ||
          row?.Category ||
          ''
      )
    );
  }

  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeRooms(rawData) {
  const rows = rawData?.Rooms || rawData?.Quartos || rawData?.locks || rawData?.Locks || [];
  const map = new Map();

  for (const row of rows) {
    const numero =
      row?.RoomNo ||
      row?.room_no ||
      row?.Numero ||
      row?.NumeroQuarto ||
      row?.roomNumber ||
      row?.RoomNumber;

    if (!numero) continue;

    map.set(String(numero), {
      numero: String(numero),
      capacidade: Number(row?.Capacity || row?.capacidade || 2),
      descricao: row?.Name || row?.Descricao || null,
    });
  }

  return [...map.values()];
}

function normalizeGuests(rawData) {
  const rows = rawData?.Guests || rawData?.Hospedes || rawData?.CardUsers || [];

  return rows.map((row, index) => ({
    legacyId: row?.ID || row?.Id || row?.UserID || row?.UserId || `legacy-${index}`,
    nome: row?.Name || row?.Nome || row?.GuestName || `Hospede importado ${index + 1}`,
    email: row?.Email || null,
    telefone: row?.Phone || row?.Telefone || null,
    documento: row?.Document || row?.Documento || row?.CPF || row?.IDCard || null,
  }));
}

function normalizeReservations(rawData) {
  const rows = rawData?.Reservations || rawData?.Reservas || rawData?.Cards || [];

  return rows.map((row, index) => {
    const now = new Date();
    const fallbackCheckout = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return {
      codigo: String(row?.Code || row?.Codigo || `STK-${Date.now()}-${index}`),
      hospedeLegacyId: row?.GuestID || row?.HospedeID || row?.UserID || row?.UserId || null,
      documento: row?.Document || row?.Documento || row?.CPF || null,
      numeroQuarto: row?.RoomNo || row?.NumeroQuarto || row?.RoomNumber || null,
      checkin: normalizeDate(row?.CheckIn || row?.StartTime, now).toISOString(),
      checkout: normalizeDate(row?.CheckOut || row?.EndTime, fallbackCheckout).toISOString(),
      status: row?.Status || 'confirmada',
      codigoAcesso: row?.Password || row?.Senha || row?.CardNo || null,
    };
  });
}

async function upsertAndar(hotelId, numero, nome) {
  const result = await queryWithParams(
    `DECLARE @id UNIQUEIDENTIFIER;

     SELECT TOP 1 @id = id
     FROM andar
     WHERE hotel_id = @hotelId
       AND numero = @numero;

     IF @id IS NULL
     BEGIN
       SET @id = NEWID();

       INSERT INTO andar (id, hotel_id, numero, nome)
       VALUES (@id, @hotelId, @numero, @nome);
     END

     SELECT @id AS id;`,
    {
      hotelId,
      numero: Number(numero),
      nome,
    }
  );

  return result.recordset[0].id;
}

async function upsertCategoria(hotelId, categoria) {
  const result = await queryWithParams(
    `DECLARE @id UNIQUEIDENTIFIER;

     SELECT TOP 1 @id = id
     FROM categoria_quarto
     WHERE hotel_id = @hotelId
       AND LOWER(nome) = LOWER(@nome);

     IF @id IS NULL
     BEGIN
       SET @id = NEWID();

       INSERT INTO categoria_quarto
         (id, hotel_id, nome, descricao, capacidade, preco_diaria)
       VALUES
         (@id, @hotelId, @nome, @descricao, @capacidade, @preco);
     END

     SELECT @id AS id;`,
    {
      hotelId,
      nome: categoria.nome,
      descricao: categoria.descricao,
      capacidade: Number(categoria.capacidade || 2),
      preco: Number(categoria.preco_diaria || 0),
    }
  );

  return result.recordset[0].id;
}

async function upsertQuarto({ hotelId, andarId, categoriaId, numero, capacidade, descricao }) {
  const result = await queryWithParams(
    `DECLARE @id UNIQUEIDENTIFIER;

     SELECT TOP 1 @id = q.id
     FROM quarto q
     INNER JOIN andar a ON a.id = q.andar_id
     WHERE a.hotel_id = @hotelId
       AND q.numero = @numero;

     IF @id IS NULL
     BEGIN
       SET @id = NEWID();

       INSERT INTO quarto
         (id, andar_id, categoria_id, numero, capacidade, quantidade_camas, descricao, status)
       VALUES
         (@id, @andarId, @categoriaId, @numero, @capacidade, 1, @descricao, 'disponivel');
     END

     SELECT @id AS id;`,
    {
      hotelId,
      andarId,
      categoriaId,
      numero: String(numero),
      capacidade: Number(capacidade || 2),
      descricao,
    }
  );

  return result.recordset[0].id;
}

async function upsertHospede(hospede) {
  const result = await queryWithParams(
    `DECLARE @id UNIQUEIDENTIFIER;

     SELECT TOP 1 @id = id
     FROM hospede
     WHERE (@cpf IS NOT NULL AND cpf = @cpf)
        OR (@email IS NOT NULL AND email = @email);

     IF @id IS NULL
     BEGIN
       SET @id = NEWID();

       INSERT INTO hospede
         (id, nome, email, telefone, cpf)
       VALUES
         (@id, @nome, @email, @telefone, @cpf);
     END

     SELECT @id AS id;`,
    {
      nome: hospede.nome,
      email: hospede.email,
      telefone: hospede.telefone,
      cpf: hospede.documento,
    }
  );

  return result.recordset[0].id;
}

async function createReserva(reserva) {
  const checkin = normalizeDate(reserva.checkin, new Date());
  const checkoutFallback = new Date(checkin.getTime() + 24 * 60 * 60 * 1000);
  const checkout = normalizeDate(reserva.checkout, checkoutFallback);

  const result = await queryWithParams(
    `IF EXISTS (SELECT 1 FROM reserva WHERE codigo = @codigo)
     BEGIN
       SELECT TOP 1 id
       FROM reserva
       WHERE codigo = @codigo;
       RETURN;
     END

     DECLARE @id UNIQUEIDENTIFIER = NEWID();

     INSERT INTO reserva
       (id, hospede_id, quarto_id, data_checkin, data_checkout, qtd_adultos, qtd_criancas, codigo, status, canal)
     VALUES
       (@id, @hospedeId, @quartoId, @checkin, @checkout, 1, 0, @codigo, @status, 'STKLock');

     SELECT @id AS id;`,
    {
      hospedeId: reserva.hospedeId,
      quartoId: reserva.quartoId,
      checkin,
      checkout,
      codigo: reserva.codigo,
      status: reserva.status || 'confirmada',
    }
  );

  return result.recordset[0].id;
}

async function createEstadia(reservaId, status) {
  const result = await queryWithParams(
    `IF EXISTS (SELECT 1 FROM estadia WHERE reserva_id = @reservaId)
     BEGIN
       SELECT CAST(0 AS BIT) AS created;
       RETURN;
     END

     INSERT INTO estadia (id, reserva_id, status)
     VALUES (NEWID(), @reservaId, @status);

     SELECT CAST(1 AS BIT) AS created;`,
    {
      reservaId,
      status,
    }
  );

  return Boolean(result.recordset?.[0]?.created);
}

async function createCredencial(credencial) {
  const inicio = normalizeDate(credencial.inicio, new Date());
  const fimFallback = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
  const fim = normalizeDate(credencial.fim, fimFallback);

  const result = await queryWithParams(
    `IF EXISTS (SELECT 1 FROM credencial_acesso WHERE codigo = @codigo)
     BEGIN
       SELECT CAST(0 AS BIT) AS created;
       RETURN;
     END

     INSERT INTO credencial_acesso
       (id, reserva_id, hospede_id, validade_inicio, validade_fim, tipo, codigo)
     VALUES
       (NEWID(), @reservaId, @hospedeId, @inicio, @fim, @tipo, @codigo);

     SELECT CAST(1 AS BIT) AS created;`,
    {
      reservaId: credencial.reservaId,
      hospedeId: credencial.hospedeId,
      inicio,
      fim,
      tipo: credencial.tipo,
      codigo: String(credencial.codigo),
    }
  );

  return Boolean(result.recordset?.[0]?.created);
}

export async function getStklockImportHealthcheck() {
  const pool = await getDatabase();
  return Boolean(pool?.connected);
}
