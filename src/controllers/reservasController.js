import {
  criarReserva,
  obterReservaPorId,
  listarReservas,
  listarReservasPorHotel,
  atualizarReserva,
  deletarReserva,
  listarReservasPorHospede,
  atualizarStatusReserva,
} from '../services/reservasService.js';

// helpers
function naoEncontrado(erro) {
  return erro?.message?.toLowerCase().includes('nao encontrad') || erro?.message?.toLowerCase().includes('não encontrad');
}

function erroNenhumCampo(erro) {
  return erro?.message?.includes('Nenhum campo');
}

function erroConflitoReserva(erro) {
  return erro?.message?.toLowerCase().includes('já está reservado');
}

function erroStatusInvalido(erro) {
  return erro?.message?.toLowerCase().includes('status inválido');
}

// Listar todas as reservas
export async function listReservas(req, res) {
  try {
    const dados = await listarReservas();
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao listar reservas:', erro?.message);
    return res.status(500).json({ erro: 'Erro ao listar reservas' });
  }
}

// Listar reservas por hotel
export async function listReservasByHotel(req, res) {
  try {
    const { hotelId } = req.params;
    const dados = await listarReservasPorHotel({ hotelId });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao listar reservas do hotel:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao listar reservas do hotel' });
  }
}

// Obter uma reserva específica
export async function getReserva(req, res) {
  try {
    const dados = await obterReservaPorId({ id: req.params.id });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao buscar reserva:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao buscar reserva' });
  }
}

// Criar nova reserva
export async function createReserva(req, res) {
  try {
    const hotelId = req.params.hotelId;
    const hospedeId = req.body.hospede_id ?? req.body.hospedeId;
    const quartoId = req.body.quarto_id ?? req.body.quartoId;
    const dataCheckin = req.body.data_checkin ?? req.body.dataCheckin ?? req.body.checkin;
    const dataCheckout = req.body.data_checkout ?? req.body.dataCheckout ?? req.body.checkout;
    const valor = req.body.valor ?? req.body.value;
    const qtdAdultos = req.body.qtd_adultos ?? req.body.qtdAdultos ?? 1;
    const qtdCriancas = req.body.qtd_criancas ?? req.body.qtdCriancas ?? 0;
    const canal = req.body.canal ?? req.body.channel ?? 'website';

    // Validações
    if (!hotelId || !hospedeId || !quartoId || !dataCheckin || !dataCheckout || !valor) {
      return res.status(400).json({
        erro: 'Campos obrigatórios: hotelId, hospede_id, quarto_id, data_checkin, data_checkout, valor',
      });
    }

    const dados = await criarReserva({
      hotelId,
      hospedeId,
      quartoId,
      dataCheckin,
      dataCheckout,
      valor,
      qtdAdultos,
      qtdCriancas,
      canal,
      status: 'confirmada',
    });

    return res.status(201).json({ sucesso: true, dados, mensagem: 'Reserva criada com sucesso' });
  } catch (erro) {
    console.error('Erro ao criar reserva:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao criar reserva' });
  }
}

// Atualizar reserva
export async function updateReserva(req, res) {
  try {
    const dados = await atualizarReserva({
      id: req.params.id,
      hotelId: req.body.hotelId ?? req.body.hotel_id,
      hospedeId: req.body.hospede_id ?? req.body.hospedeId,
      quartoId: req.body.quarto_id ?? req.body.quartoId,
      dataCheckin: req.body.data_checkin ?? req.body.dataCheckin,
      dataCheckout: req.body.data_checkout ?? req.body.dataCheckout,
      valor: req.body.valor ?? req.body.value,
      qtdAdultos: req.body.qtd_adultos ?? req.body.qtdAdultos,
      qtdCriancas: req.body.qtd_criancas ?? req.body.qtdCriancas,
      status: req.body.status,
      canal: req.body.canal ?? req.body.channel,
    });

    return res.status(200).json({ sucesso: true, dados, mensagem: 'Reserva atualizada com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar reserva:', erro?.message);
    if (erroNenhumCampo(erro)) return res.status(400).json({ erro: erro.message });
    if (erroConflitoReserva(erro)) return res.status(409).json({ erro: erro.message });
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao atualizar reserva' });
  }
}

// Deletar reserva
export async function deleteReserva(req, res) {
  try {
    const dados = await deletarReserva({ id: req.params.id });
    return res.status(200).json({ sucesso: true, dados, mensagem: 'Reserva deletada com sucesso' });
  } catch (erro) {
    console.error('Erro ao deletar reserva:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao deletar reserva' });
  }
}

// Listar reservas por hóspede
export async function getReservasByGuest(req, res) {
  try {
    const { hospedeId } = req.params;
    const dados = await listarReservasPorHospede({ hospedeId });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao listar reservas do hóspede:', erro?.message);
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao listar reservas do hóspede' });
  }
}

// Atualizar status da reserva
export async function updateReservaStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ erro: 'Campo obrigatório: status' });
    }

    const dados = await atualizarStatusReserva({ id, status });

    return res.status(200).json({ sucesso: true, dados, mensagem: 'Status da reserva atualizado com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar status da reserva:', erro?.message);
    if (erroStatusInvalido(erro)) return res.status(400).json({ erro: erro.message });
    if (naoEncontrado(erro)) return res.status(404).json({ erro: erro.message });
    return res.status(500).json({ erro: 'Erro ao atualizar status da reserva' });
  }
}
