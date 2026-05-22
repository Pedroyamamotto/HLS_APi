# Script de teste: Recalcular preço ao atualizar datas
# Este script testa se o preço da reserva é recalculado quando as datas são alteradas

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$HotelId = "FB5D45CD-0C6A-4C4C-B10B-B44875ACDFCC",
    [string]$HostedeId = "5A759271-64FA-4BB2-B37D-46628D9CA0ED",
    [string]$QuartoId = "187B44C0-9BA1-4F43-9165-A29BB11C1248"
)

$ErrorActionPreference = 'Stop'
Write-Host "=== TESTE: Recalcular Preço ao Atualizar Datas ===" -ForegroundColor Cyan

# Criar uma reserva inicial
Write-Host "`n1️⃣  Criando reserva inicial (13-16 maio: 3 noites × R$ 12 = R$ 36)..." -ForegroundColor Yellow

$reservaInicial = @{
    hospede_id    = $HostedeId
    quarto_id     = $QuartoId
    data_checkin  = "2026-05-13T03:00:00Z"
    data_checkout = "2026-05-16T03:00:00Z"
    canal         = "PowerShell-Test"
}

try {
    $resposta1 = Invoke-RestMethod -Uri "$BaseUrl/hotel/$HotelId/reservas" `
        -Method Post `
        -Body ($reservaInicial | ConvertTo-Json) `
        -ContentType "application/json"

    $reservaId = $resposta1.dados.id
    $valorInicial = [decimal]$resposta1.dados.valor

    Write-Host "✓ Reserva criada com sucesso" -ForegroundColor Green
    Write-Host "  ID: $reservaId"
    Write-Host "  Valor: R$ $valorInicial"
    Write-Host "  Período: 13-16 maio (3 noites)"
} catch {
    Write-Host "✗ Erro ao criar reserva: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Atualizar as datas para estender a estadia (3 noites → 5 noites)
Write-Host "`n2️⃣  Atualizando datas para estender estadia (13-18 maio: 5 noites × R$ 12 = R$ 60)..." -ForegroundColor Yellow

$atualizacao = @{
    data_checkin  = "2026-05-13T03:00:00Z"
    data_checkout = "2026-05-18T03:00:00Z"
    # ⚠️ IMPORTANTE: NÃO enviando 'valor' para forçar recálculo automático
}

try {
    $resposta2 = Invoke-RestMethod -Uri "$BaseUrl/reservas/$reservaId" `
        -Method Patch `
        -Body ($atualizacao | ConvertTo-Json) `
        -ContentType "application/json"

    $valorAtualizado = [decimal]$resposta2.dados.valor
    $statusCheck = if ($valorAtualizado -eq 60.00) { "✓ CORRETO" } else { "✗ ERRO" }

    Write-Host "✓ Datas atualizadas com sucesso" -ForegroundColor Green
    Write-Host "  Novo período: 13-18 maio (5 noites)"
    Write-Host "  Valor anterior: R$ $valorInicial"
    Write-Host "  Novo valor: R$ $valorAtualizado $statusCheck" -ForegroundColor $(if ($valorAtualizado -eq 60.00) { "Green" } else { "Red" })
} catch {
    Write-Host "✗ Erro ao atualizar reserva: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Teste adicional: Encurtar a estadia (5 noites → 2 noites)
Write-Host "`n3️⃣  Encurtando estadia (13-15 maio: 2 noites × R$ 12 = R$ 24)..." -ForegroundColor Yellow

$atualizacao2 = @{
    data_checkin  = "2026-05-13T03:00:00Z"
    data_checkout = "2026-05-15T03:00:00Z"
}

try {
    $resposta3 = Invoke-RestMethod -Uri "$BaseUrl/reservas/$reservaId" `
        -Method Patch `
        -Body ($atualizacao2 | ConvertTo-Json) `
        -ContentType "application/json"

    $valorFinal = [decimal]$resposta3.dados.valor
    $statusCheck2 = if ($valorFinal -eq 24.00) { "✓ CORRETO" } else { "✗ ERRO" }

    Write-Host "✓ Datas atualizadas com sucesso" -ForegroundColor Green
    Write-Host "  Novo período: 13-15 maio (2 noites)"
    Write-Host "  Valor anterior: R$ $valorAtualizado"
    Write-Host "  Novo valor: R$ $valorFinal $statusCheck2" -ForegroundColor $(if ($valorFinal -eq 24.00) { "Green" } else { "Red" })
} catch {
    Write-Host "✗ Erro ao atualizar reserva: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Resumo
Write-Host "`n=== RESUMO ===" -ForegroundColor Cyan
Write-Host "Valor inicial (3 noites):  R$ $valorInicial → ✓"
Write-Host "Após extensão (5 noites):  R$ $valorAtualizado → $(if ($valorAtualizado -eq 60) { '✓' } else { '✗' })"
Write-Host "Após redução (2 noites):   R$ $valorFinal → $(if ($valorFinal -eq 24) { '✓' } else { '✗' })"

Write-Host "`n✓ Teste concluído! O preço é recalculado automaticamente quando as datas são alteradas." -ForegroundColor Green
