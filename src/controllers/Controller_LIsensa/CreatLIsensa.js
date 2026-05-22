import { criarLisensa } from '../../services/lisensaService.js';

export async function createLisensa(req, res) {
	try {
		const validade = req.body.validade ?? req.body.Validade;
		const chave = req.body.chave ?? req.body.Chave;
		const empresaNome = req.body.empresa_nome ?? req.body.empresaNome ?? req.body.EmpresaNome;
		const status = req.body.status ?? req.body.Status ?? 'ativo';
		const numeroLicensa = req.body.numero_licenca ?? req.body.numeroLicensa ?? req.body.NumeroLicensa;
		const ativa = req.body.ativa ?? req.body.Ativa ?? true;
		const assinaturaId = req.body.assinatura_id ?? req.body.assinaturaId ?? req.body.AssinaturaId ?? null;

		if (!validade || !chave || !empresaNome || !status || !numeroLicensa) {
			return res.status(400).json({
				erro: 'Faltam campos obrigatórios',
				campos: ['validade', 'chave', 'empresa_nome', 'status', 'numero_licenca'],
			});
		}

		const resultado = await criarLisensa({
			validade,
			chave,
			empresaNome,
			status,
			numeroLicensa,
			ativa: ativa === true || ativa === 1 || ativa === '1' || ativa === 'true',
			assinaturaId,
		});

		return res.status(201).json({ sucesso: true, dados: resultado });
	} catch (erro) {
		console.error('Erro ao criar lisensa:', erro?.message || erro);
		if (
			erro?.message?.includes('Número de lisensa já cadastrado') ||
			erro?.message?.includes('Chave de lisensa já cadastrada')
		) {
			return res.status(409).json({ erro: erro.message });
		}

		if (erro?.message?.toLowerCase().includes('unique')) {
			return res.status(409).json({ erro: 'Chave ou número de lisensa já cadastrado' });
		}
		return res.status(500).json({ erro: 'Erro ao criar lisensa' });
	}
}
