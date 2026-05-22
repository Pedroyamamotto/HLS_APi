# ========================================
# CONFIGURADOR DE CREDENCIAIS CARDOPS
# ========================================

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Configurador - Integração HLS API + CardOps           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Acesse sua aplicação CardOps Agent e copie os seguintes dados:" -ForegroundColor Yellow
Write-Host "   1. Agent API (ex: agent_prod_2026_xxxxx)" -ForegroundColor Cyan
Write-Host "   2. Integration (ex: desbravador_prod_2026_xxxxx)" -ForegroundColor Cyan
Write-Host "   3. Agent ID (ex: AGENT-YAMA_DEV)" -ForegroundColor Cyan
Write-Host ""

# Ler as credenciais
$agentApi = Read-Host "🔑 Cole aqui a 'Agent API'"
$integrationKey = Read-Host "🔑 Cole aqui a 'Integration'"
$agentId = Read-Host "🔑 Cole aqui o 'Agent ID'"

Write-Host ""
Write-Host "✅ Salvando configurações no .env..." -ForegroundColor Yellow

# Ler o arquivo .env
$envFile = "C:\Users\pedra\HLS_APi\.env"
$envContent = Get-Content $envFile -Raw

# Atualizar as credenciais
$envContent = $envContent -replace `
  'YAMAMOTTO_API_KEY=agent_prod_2026_xxxxxxxxxx', `
  "YAMAMOTTO_API_KEY=$agentApi"

$envContent = $envContent -replace `
  'YAMAMOTTO_INTEGRATION_KEY=desbravador_prod_2026_xxxxxxxxxx', `
  "YAMAMOTTO_INTEGRATION_KEY=$integrationKey"

$envContent = $envContent -replace `
  'YAMAMOTTO_AGENT_ID=AGENT-YAMA_DEV', `
  "YAMAMOTTO_AGENT_ID=$agentId"

# Salvar o arquivo
Set-Content $envFile $envContent

Write-Host "✅ Credenciais salvas com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Resumo das configurações:" -ForegroundColor Cyan
Write-Host "   Agent API: $($agentApi.Substring(0, 20))..." -ForegroundColor Cyan
Write-Host "   Integration: $($integrationKey.Substring(0, 20))..." -ForegroundColor Cyan
Write-Host "   Agent ID: $agentId" -ForegroundColor Cyan
Write-Host ""

Write-Host "🚀 Agora execute:" -ForegroundColor Green
Write-Host "   npm.cmd start" -ForegroundColor Yellow
Write-Host ""
Write-Host "Depois teste com:" -ForegroundColor Green
Write-Host "   .\scripts\test_liberar_quarto.ps1" -ForegroundColor Yellow
Write-Host ""

Write-Host "📞 Quando fizer check-in, o CardOps Agent no seu PC **emitirá um som**!" -ForegroundColor Green
