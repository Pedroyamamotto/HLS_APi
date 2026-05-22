import { autentificarLisensa } from '../../services/lisensaService.js';

export async function authLisensa(req, res) {
	try {
		const numeroLicensa = req.body.numero_licenca ?? req.body.numeroLicensa ?? req.body.NumeroLicensa;
		const chave = req.body.chave ?? req.body.Chave;

		if (!numeroLicensa || !chave) {
			return res.status(400).json({
				erro: 'Faltam campos obrigatórios',
				campos: ['numero_licenca', 'chave'],
			});
		}

		const resultado = await autentificarLisensa({ numeroLicensa, chave });

		return res.status(200).json({
			sucesso: true,
			mensagem: 'Lisensa autenticada com sucesso',
			hotel: resultado.hotelNome,
			dados: resultado,
		});
	} catch (erro) {
		console.error('Erro ao autenticar lisensa:', erro?.message || erro);
		if (
			erro?.message?.includes('inválida') ||
			erro?.message?.includes('expirada') ||
			erro?.message?.includes('ativa')
		) {
			return res.status(401).json({ erro: erro.message });
		}
		return res.status(500).json({ erro: 'Erro ao autenticar lisensa' });
	}
}
