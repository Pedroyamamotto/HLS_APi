import {
	listarHoteisDaLisensa,
	obterDetalhesLisensa,
	vincularHotelNaLisensa,
} from '../../services/lisensaService.js';

export async function getLisensaDetails(req, res) {
	try {
		const numeroLicensa = req.params.numeroLicensa ?? req.query.numero_licenca ?? req.query.numeroLicensa;

		if (!numeroLicensa) {
			return res.status(400).json({ erro: 'numero_licenca é obrigatório' });
		}

		const dados = await obterDetalhesLisensa({ numeroLicensa });
		return res.status(200).json({ sucesso: true, dados });
	} catch (erro) {
		console.error('Erro ao consultar lisensa:', erro?.message || erro);
		if (erro?.message?.includes('não encontrada')) {
			return res.status(404).json({ erro: erro.message });
		}
		return res.status(500).json({ erro: 'Erro ao consultar lisensa' });
	}
}

export async function bindHotelToLisensa(req, res) {
	try {
		const numeroLicensa = req.body.numero_licenca ?? req.body.numeroLicensa ?? req.body.NumeroLicensa;
		const nomeHotel = req.body.nome_hotel ?? req.body.nomeHotel ?? req.body.nome;
		const moedaLocal = req.body.moeda_local ?? req.body.moedaLocal ?? 'BRL';
		const endereco = req.body.endereco ?? req.body.Endereco ?? null;
		const dataVencimentoAssinatura = req.body.data_vencimento_assinatura ?? req.body.dataVencimentoAssinatura;
		const tipoAssinatura = req.body.tipo_assinatura ?? req.body.tipoAssinatura ?? 'Premium';
		const valorMensal = req.body.valor_mensal ?? req.body.valorMensal ?? 0;
		const statusAssinatura = req.body.status_assinatura ?? req.body.statusAssinatura ?? 'ativo';

		if (!numeroLicensa || !nomeHotel) {
			return res.status(400).json({
				erro: 'Faltam campos obrigatórios',
				campos: ['numero_licenca', 'nome_hotel'],
			});
		}

		const dados = await vincularHotelNaLisensa({
			numeroLicensa,
			nomeHotel,
			moedaLocal,
			endereco,
			dataVencimentoAssinatura,
			tipoAssinatura,
			valorMensal,
			statusAssinatura,
		});

		return res.status(200).json({
			sucesso: true,
			mensagem: 'Hotel vinculado à lisensa com sucesso',
			dados,
		});
	} catch (erro) {
		console.error('Erro ao vincular hotel na lisensa:', erro?.message || erro);
		if (erro?.message?.includes('não encontrada')) {
			return res.status(404).json({ erro: erro.message });
		}
		return res.status(500).json({ erro: 'Erro ao vincular hotel na lisensa' });
	}
}

export async function getHotelsByLisensa(req, res) {
	try {
		const numeroLicensa = req.params.numeroLicensa ?? req.query.numero_licenca ?? req.query.numeroLicensa;

		if (!numeroLicensa) {
			return res.status(400).json({
				erro: 'numero_licenca é obrigatório',
			});
		}

		const dados = await listarHoteisDaLisensa({ numeroLicensa });

		return res.status(200).json({
			sucesso: true,
			dados,
			total: dados.hoteis.length,
		});
	} catch (erro) {
		console.error('Erro ao listar hotéis da lisensa:', erro?.message || erro);
		if (erro?.message?.includes('não encontrada')) {
			return res.status(404).json({ erro: erro.message });
		}
		return res.status(500).json({ erro: 'Erro ao listar hotéis da lisensa' });
	}
}
