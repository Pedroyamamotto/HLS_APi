import { deletarLisensa } from '../../services/lisensaService.js';

export async function deleteLisensa(req, res) {
	try {
		const { id } = req.params;

		if (!id) {
			return res.status(400).json({ erro: 'Id da lisensa é obrigatório' });
		}

		const resultado = await deletarLisensa({ id });

		return res.status(200).json({
			sucesso: true,
			dados: resultado,
			mensagem: 'Lisensa deletada com sucesso',
		});
	} catch (erro) {
		console.error('Erro ao deletar lisensa:', erro?.message || erro);
		if (erro?.message?.includes('não encontrada')) {
			return res.status(404).json({ erro: erro.message });
		}
		return res.status(500).json({ erro: 'Erro ao deletar lisensa' });
	}
}
