import {
  listarLogsPorQuarto,
  listarLogsPorReserva,
} from '../../services/reservaLogsService.js';

export async function getLogsReserva(req, res) {
  try {
    const { hotelId, reservaId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);

    const dados = await listarLogsPorReserva({ hotelId, reservaId, limit });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao listar logs da reserva:', erro?.message);
    return res.status(500).json({ erro: 'Erro ao listar logs da reserva' });
  }
}

export async function getLogsQuarto(req, res) {
  try {
    const { hotelId, quartoId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);

    const dados = await listarLogsPorQuarto({ hotelId, quartoId, limit });
    return res.status(200).json({ sucesso: true, dados });
  } catch (erro) {
    console.error('Erro ao listar logs do quarto:', erro?.message);
    return res.status(500).json({ erro: 'Erro ao listar logs do quarto' });
  }
}
