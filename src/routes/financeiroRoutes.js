import express from 'express';
import multer from 'multer';
import {
  deleteGestaoLiquidezFinanceira,
  getFaturamentoExtrasFinanceiro,
  getFaturamentoQuartosFinanceiro,
  getGestaoLiquidezArquivoFinanceira,
  getGestaoLiquidezFinanceira,
  getLucroLiquidoFinanceiro,
  getOcupacaoMediaFinanceira,
  getReceitaTotalFinanceira,
  getRevparFinanceiro,
  getTransacoesFinanceiras,
  patchGestaoLiquidezFinanceira,
  postGestaoLiquidezFinanceira,
} from '../controllers/Controller_Financeiro/financeiroController.js';

const router = express.Router({ mergeParams: true });
const upload = multer();
const uploadArquivo = upload.fields([
  { name: 'arquivo', maxCount: 1 },
  { name: 'file', maxCount: 1 },
  { name: 'anexo', maxCount: 1 },
]);

router.get('/transacoes', getTransacoesFinanceiras);
router.get('/receitatotal', getReceitaTotalFinanceira);
router.get('/revpar', getRevparFinanceiro);
router.get('/ocupacaomedia', getOcupacaoMediaFinanceira);
router.get('/lucroliquido', getLucroLiquidoFinanceiro);
router.get('/faturamento-quartos', getFaturamentoQuartosFinanceiro);
router.get('/gestao-liquidez', getGestaoLiquidezFinanceira);
router.get('/gestao-liquidez/:transacaoId/arquivo', getGestaoLiquidezArquivoFinanceira);
router.post('/gestao-liquidez', uploadArquivo, postGestaoLiquidezFinanceira);
router.patch('/gestao-liquidez/:transacaoId', uploadArquivo, patchGestaoLiquidezFinanceira);
router.delete('/gestao-liquidez/:transacaoId', deleteGestaoLiquidezFinanceira);
router.get('/faturamento-extras', getFaturamentoExtrasFinanceiro);

export default router;