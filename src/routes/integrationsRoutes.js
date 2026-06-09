import express from "express";
import * as controller from "../controllers/controller_Integrations/controller_Integrations.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Integrações
|--------------------------------------------------------------------------
*/

router.get("/:hotel_id", controller.listarIntegracoes);

router.post("/credenciais", controller.salvarCredenciais);
router.post("/classic-code/token", controller.gerarTokenClassicCode);
router.post("/classic-code/test-connection", controller.testarConexaoClassicCode);

/*
|--------------------------------------------------------------------------
| Fechaduras
|--------------------------------------------------------------------------
*/

router.post("/fechaduras", controller.salvarFechadura);

router.post(
  "/fechaduras/vincular-quarto",
  controller.vincularFechaduraQuarto
);

router.post(
  "/fechaduras/desvincular-quarto",
  controller.desvincularFechaduraQuarto
);

router.post(
  "/fechaduras/limpar-mapeamentos",
  controller.limparMapeamentosHotel
);

/*
|--------------------------------------------------------------------------
| Senhas locais
|--------------------------------------------------------------------------
*/

router.post(
  "/senhas/reserva",
  controller.salvarSenhaReserva
);

/*
|--------------------------------------------------------------------------
| Classic Code / TTLock
|--------------------------------------------------------------------------
*/

/*
| Sincronização
*/
router.post(
  "/classic-code/sync-locks",
  controller.sincronizarFechaduras
);

router.get(
  "/classic-code/sync-history",
  controller.historicoSincronizacao
);

/*
| Fechaduras
*/
router.get(
  "/classic-code/locks",
  controller.listarFechadurasBanco
);

router.get(
  "/classic-code/locks/:lockId/battery",
  controller.consultarBateriaFechadura
);

router.get(
  "/classic-code/locks/:lockId",
  controller.detalharFechadura
);

router.post(
  "/classic-code/locks/:lockId/unlock",
  controller.abrirPorta
);

router.post(
  "/classic-code/locks/:lockId/lock",
  controller.travarPorta
);

/*
| Senhas
*/
router.post(
  "/classic-code/passwords/create",
  controller.criarSenhaReserva
);

router.post(
  "/classic-code/passwords/delete",
  controller.invalidarSenhaReserva
);

router.get(
  "/classic-code/passwords",
  controller.listarSenhasBanco
);

router.get(
  "/classic-code/passwords/api/:lockId",
  controller.listarSenhasApi
);

/*
| eKeys
*/
router.get(
  "/classic-code/ekeys",
  controller.listarEkeysApi
);

router.post(
  "/classic-code/ekeys/send",
  controller.enviarEkeyApi
);

router.post(
  "/classic-code/ekeys/delete",
  controller.revogarEkeyApi
);

router.post(
  "/classic-code/ekeys/change-period",
  controller.alterarPeriodoEkeyApi
);

/*
| Cartões
*/
router.get(
  "/classic-code/cards",
  controller.listarCartoesApi
);

router.post(
  "/classic-code/cards/add",
  controller.adicionarCartaoApi
);

router.post(
  "/classic-code/cards/delete",
  controller.revogarCartaoApi
);

router.post(
  "/classic-code/cards/change-period",
  controller.alterarPeriodoCartaoApi
);

/*
| Registros de acesso
*/
router.get(
  "/classic-code/records",
  controller.listarRegistrosAcesso
);

export default router;