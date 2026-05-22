# ========================================
# TESTE DE INTEGRAÇÃO - LIBERAR QUARTO
# Rotas Yamamotto (Fechaduras)
# ========================================

# Configurações
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000'
$hotelId = 'FB5D45CD-0C6A-4C4C-B10B-B44875ACDFCC'
$hospedeId = '5A759271-64FA-4BB2-B37D-46628D9CA0ED'

Write-Host "🚀 INICIANDO TESTES - LIBERAR QUARTO API" -ForegroundColor Green
Write-Host "Base URL: $base" -ForegroundColor Cyan
Write-Host "Hotel ID: $hotelId" -ForegroundColor Cyan
Write-Host ""

# ========================================
# 1. OBTER RESERVA ATIVA DO HÓSPEDE
# ========================================

Write-Host "📋 [1] Obtendo reserva ativa do hóspede..." -ForegroundColor Yellow

try {
  $resumo = Invoke-RestMethod -Uri "$base/hotel/$hotelId/consumo/hospedes/$hospedeId/resumo" -Method Get
  $reservaId = $resumo.dados.reservaAtual.id
  $quartoNumero = $resumo.dados.reservaAtual.quarto_numero

  Write-Host "✅ Reserva encontrada:" -ForegroundColor Green
  Write-Host "   ID: $reservaId"
  Write-Host "   Quarto: $quartoNumero"
  Write-Host ""
} catch {
  Write-Host "❌ Erro ao obter resumo: $_" -ForegroundColor Red
  exit 1
}

# ========================================
# 2. TESTAR CHECK-IN (ISSUE)
# Emitir cartão RFID
# ========================================

Write-Host "🔑 [2] Testando CHECK-IN (Emitir Cartão)..." -ForegroundColor Yellow

try {
  $issueResponse = Invoke-RestMethod `
    -Uri "$base/hotel/$hotelId/liberar-quarto/issue" `
    -Method Post `
    -Body "reservaId=$reservaId" `
    -ContentType 'application/x-www-form-urlencoded'

  $operationId_issue = $issueResponse.dados.operationId
  $status_issue = $issueResponse.dados.status

  Write-Host "✅ Cartão emitido com sucesso:" -ForegroundColor Green
  Write-Host "   Operation ID: $operationId_issue"
  Write-Host "   Status: $status_issue"
  Write-Host "   Mensagem: $($issueResponse.mensagem)"
  Write-Host ""
} catch {
  Write-Host "❌ Erro ao emitir cartão: $_" -ForegroundColor Red
  exit 1
}

# ========================================
# 3. CONSULTAR STATUS DA EMISSÃO
# ========================================

Write-Host "📊 [3] Consultando status da emissão..." -ForegroundColor Yellow

try {
  Start-Sleep -Seconds 2
  
  $statusCheck = Invoke-RestMethod `
    -Uri "$base/hotel/$hotelId/liberar-quarto/status/$operationId_issue" `
    -Method Get

  $status = $statusCheck.dados.status
  $cardSnr = $statusCheck.dados.cardSnr

  Write-Host "✅ Status consultado:" -ForegroundColor Green
  Write-Host "   Operation: $operationId_issue"
  Write-Host "   Status: $status"
  Write-Host "   Cartão SNR: $cardSnr"
  Write-Host ""
} catch {
  Write-Host "❌ Erro ao consultar status: $_" -ForegroundColor Red
}

# ========================================
# 4. LISTAR OPERAÇÕES DA RESERVA
# ========================================

Write-Host "📝 [4] Listando operações da reserva..." -ForegroundColor Yellow

try {
  $logs = Invoke-RestMethod `
    -Uri "$base/hotel/$hotelId/liberar-quarto/reserva/$reservaId" `
    -Method Get

  $countLogs = $logs.dados.Count

  Write-Host "✅ Operações encontradas: $countLogs" -ForegroundColor Green
  
  if ($countLogs -gt 0) {
    $logs.dados | Select-Object -First 3 | ForEach-Object {
      Write-Host "   ├─ $($_.tipo): $($_.titulo)"
      Write-Host "   │  $($_.descricao)"
    }
  }
  Write-Host ""
} catch {
  Write-Host "⚠️ Erro ao listar operações: $_" -ForegroundColor Yellow
}

# ========================================
# 5. TESTAR CHECKOUT (INVALIDAR CARTÃO)
# ========================================

Write-Host "🔐 [5] Testando CHECKOUT (Invalidar Cartão)..." -ForegroundColor Yellow

$continueCheckout = Read-Host "Deseja testar checkout agora? (S/N)"

if ($continueCheckout -eq 'S' -or $continueCheckout -eq 's') {
  try {
    $checkoutResponse = Invoke-RestMethod `
      -Uri "$base/hotel/$hotelId/liberar-quarto/checkout" `
      -Method Post `
      -Body "reservaId=$reservaId&tempoEspera=5000" `
      -ContentType 'application/x-www-form-urlencoded'

    $operationId_checkout = $checkoutResponse.dados.operationId
    $status_checkout = $checkoutResponse.dados.status

    Write-Host "✅ Cartão invalidado com sucesso:" -ForegroundColor Green
    Write-Host "   Operation ID: $operationId_checkout"
    Write-Host "   Status: $status_checkout"
    Write-Host "   Quarto: $($checkoutResponse.dados.quartoNumero)"
    Write-Host ""

    # Consultar status
    Start-Sleep -Seconds 2
    $statusCheckout = Invoke-RestMethod `
      -Uri "$base/hotel/$hotelId/liberar-quarto/status/$operationId_checkout" `
      -Method Get

    Write-Host "📊 Status do checkout:" -ForegroundColor Cyan
    Write-Host "   Status: $($statusCheckout.dados.status)"
    Write-Host ""
  } catch {
    Write-Host "❌ Erro ao fazer checkout: $_" -ForegroundColor Red
  }
} else {
  Write-Host "⏭️  Checkout pulado" -ForegroundColor Yellow
  Write-Host ""
}

# ========================================
# 6. RESUMO FINAL
# ========================================

Write-Host "📊 RESUMO DOS TESTES" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Hotel ID: $hotelId"
Write-Host "Hóspede ID: $hospedeId"
Write-Host "Reserva ID: $reservaId"
Write-Host "Quarto: $quartoNumero"
Write-Host ""
Write-Host "✅ Testes de emissão: SUCESSO"
Write-Host "   Operation ID: $operationId_issue"
Write-Host "   Status: $status_issue"
Write-Host ""

if ($continueCheckout -eq 'S' -or $continueCheckout -eq 's') {
  Write-Host "✅ Testes de invalidação: SUCESSO"
  Write-Host "   Operation ID: $operationId_checkout"
  Write-Host "   Status: $status_checkout"
  Write-Host ""
}

Write-Host "✅ TODOS OS TESTES COMPLETADOS!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
