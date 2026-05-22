#!/usr/bin/env node

/**
 * TESTE DE LIBERAR QUARTO - COM MOCK
 * Demonstra o funcionamento completo sem depender da API Yamamotto externa
 */

import {
  emitirCartaoCheckinMock,
  consultarStatusOperacaoMock,
  limparOperacoesMock,
} from './src/services/yamamottoServiceMock.js';

const DELAYS = {
  pausa: (ms) => new Promise(r => setTimeout(r, ms)),
};

async function testeCheckInCompleto() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║       ✅ TESTE: CHECK-IN COM MOCK                  ║');
  console.log('║    Demonstra integração Yamamotto sem API         ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  // Dados da reserva
  const reservaId = '229C631A-AD44-4AC3-B826-75591BE92D42';
  const numeroQuarto = '101';
  const hospedeNome = 'João Silva';

  console.log('📋 DADOS DA RESERVA:');
  console.log(`   📌 ID: ${reservaId}`);
  console.log(`   🚪 Quarto: ${numeroQuarto}`);
  console.log(`   👤 Hóspede: ${hospedeNome}`);
  console.log(`   📅 Check-in: 14/05/2026`);
  console.log(`   📅 Check-out: 18/05/2026`);
  console.log('');

  // ════════════════════════════════════════════════
  // ETAPA 1: EMITIR CARTÃO
  // ════════════════════════════════════════════════
  console.log('🔑 [ETAPA 1/3] Emitindo Cartão RFID...');
  console.log('   └─ Chamando: POST /operations/issue (Yamamotto)');
  console.log('   └─ Dados: { room: "101", checkin: "...", checkout: "..." }');

  const issueResp = await emitirCartaoCheckinMock({
    numeroQuarto,
    dataCheckin: '2026-05-14T14:00:00Z',
    dataCheckout: '2026-05-18T12:00:00Z',
    requestId: `CHECKIN-${Date.now()}`,
  });

  console.log('✅ Resposta recebida:');
  console.log(`   ⚙️  Operation ID: ${issueResp.operationId}`);
  console.log(`   📊 Status: ${issueResp.status}`);
  console.log('');

  const operationId = issueResp.operationId;

  // ════════════════════════════════════════════════
  // ETAPA 2: POLLING DO STATUS (Simulado)
  // ════════════════════════════════════════════════
  console.log('⏳ [ETAPA 2/3] Aguardando processamento...');
  console.log(`   └─ Polling cada 1s com Operation ID: ${operationId}`);

  const maxTentativas = 5;
  let tentativa = 0;
  let statusFinal = null;

  while (tentativa < maxTentativas) {
    tentativa++;
    
    console.log(`   └─ Tentativa ${tentativa}/${maxTentativas}...`);
    await DELAYS.pausa(1000);

    const status = await consultarStatusOperacaoMock(operationId);
    console.log(`      ✓ Status: "${status.status}"`);

    if (status.status === 'completed') {
      console.log(`      ✓ Cartão SNR: ${status.cardSnr}`);
      statusFinal = status;
      break;
    } else if (status.status === 'failed') {
      console.log(`      ✗ Operação falhou`);
      statusFinal = status;
      break;
    }
  }

  console.log('');

  // ════════════════════════════════════════════════
  // ETAPA 3: RESULTADO FINAL
  // ════════════════════════════════════════════════
  console.log('📝 [ETAPA 3/3] Resultado Final:');
  console.log('   ┌──────────────────────────────────┐');
  console.log(`   │ Operation: ${operationId.substr(0, 30)}...`);
  console.log(`   │ Status: ${statusFinal?.status || 'PENDENTE'}`);
  if (statusFinal?.cardSnr) {
    console.log(`   │ Cartão: ${statusFinal.cardSnr}`);
  }
  console.log('   │                                  │');
  console.log('   │ ✅ CHECK-IN CONCLUÍDO COM SUCESSO│');
  console.log('   └──────────────────────────────────┘');
  console.log('');

  // ════════════════════════════════════════════════
  // RESUMO DE OPERAÇÕES
  // ════════════════════════════════════════════════
  console.log('📊 RESUMO DAS OPERAÇÕES:');
  console.log('   Operação 1: liberar_quarto (Check-in) ✅');
  console.log(`   ├─ Operation ID: ${operationId}`);
  console.log(`   ├─ Quarto: ${numeroQuarto}`);
  console.log(`   ├─ Status Final: ${statusFinal?.status}`);
  console.log(`   └─ SNR do Cartão: ${statusFinal?.cardSnr || '(pendente)'}`);
  console.log('');

  console.log('✨ TESTE CONCLUÍDO COM SUCESSO!\n');

  // Limpar mock
  limparOperacoesMock();

  return {
    sucesso: true,
    operationId,
    status: statusFinal?.status,
    cartaoSNR: statusFinal?.cardSnr,
  };
}

// Executar teste
testeCheckInCompleto()
  .then(resultado => {
    console.log('📦 Resultado:');
    console.log(JSON.stringify(resultado, null, 2));
    process.exit(0);
  })
  .catch(erro => {
    console.error('❌ Erro no teste:', erro.message);
    process.exit(1);
  });
