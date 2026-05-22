import { editarLisensa } from '../../services/lisensaService.js';

export async function editLisensa(req, res) {
	try {
		const { id } = req.params;

		if (!id) {
			return res.status(400).json({ erro: 'Id da lisensa é obrigatório' });
		}

		const resultado = await editarLisensa({
			id,
			validade: req.body.validade ?? req.body.Validade,
			chave: req.body.chave ?? req.body.Chave,
			empresaNome: req.body.empresa_nome ?? req.body.empresaNome ?? req.body.EmpresaNome,
			status: req.body.status ?? req.body.Status,
			numeroLicensa: req.body.numero_licenca ?? req.body.numeroLicensa ?? req.body.NumeroLicensa,
			ativa: req.body.ativa ?? req.body.Ativa,
			assinaturaId: req.body.assinatura_id ?? req.body.assinaturaId ?? req.body.AssinaturaId,
		});

		return res.status(200).json({ sucesso: true, dados: resultado });
	} catch (erro) {
		console.error('Erro ao editar lisensa:', erro?.message || erro);
		if (erro?.message?.includes('Nenhum campo')) {
			return res.status(400).json({ erro: erro.message });
		}
		if (erro?.message?.includes('não encontrada')) {
			return res.status(404).json({ erro: erro.message });
		}
		return res.status(500).json({ erro: 'Erro ao editar lisensa' });
	}
}
