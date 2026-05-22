# Script de teste: Validar correção de valor de reserva
# Este script testa os 3 cenários de correção de valor

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$HotelId = "FB5D45CD-0C6A-4C4C-B10B-B44875ACDFCC",
    [string]$HostedeId = "5A759271-64FA-4BB2-B37D-46628D9CA0ED",
    [string]$QuartoId = "187B44C0-9BA1-4F43-9165-A29BB11C1248",
    [switch]$Verbose
)

$ErrorActionPreference = 'Stop'
Write-Host "=== TESTE DE CORREÇÃO: Valor de Reserva ===" -ForegroundColor Cyan

# Datas de teste (3 noites: 13-16 maio)
$dataCheckin = "2026-05-13T03:00:00Z"
$dataCheckout = "2026-05-16T03:00:00Z"

# Preço esperado: 3 noites × R$ 12 = R$ 36
$valorEsperado = 36.00
$canal = "PowerShell-Test"

# Função para testar criação de reserva
function Test-CriarReserva {
    param(
        [string]$Descricao,
        [nullable[decimal]]$ValorEnviado,
        [decimal]$ValorEsperado
    )
    
    Write-Host "`n--- Teste: $Descricao ---" -ForegroundColor Yellow
    Write-Host "Valor enviado: $(if ($ValorEnviado) { "R$ $ValorEnviado" } else { "(nenhum - calcular automaticamente)" })"
    Write-Host "Valor esperado no banco: R$ $ValorEsperado"
    
    $body = @{
        hospede_id    = $HostedeId
        quarto_id     = $QuartoId
        data_checkin  = $dataCheckin
        data_checkout = $dataCheckout
        qtd_adultos   = 1
        qtd_criancas  = 0
        canal         = $canal
    }
    
    if ($ValorEnviado) {
        $body.valor = $ValorEnviado
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl/hotel/$HotelId/reservas" `
            -Method Post `
            -Body ($body | ConvertTo-Json) `
            -ContentType "application/json"
        
        if ($response.sucesso -and $response.dados) {
            $valorObtido = [decimal]$response.dados.valor
            $statusCheck = if ($valorObtido -eq $ValorEsperado) { "✓ CORRETO" } else { "✗ ERRO" }
            
            Write-Host "Resultado: R$ $valorObtido $statusCheck" -ForegroundColor $(if ($valorObtido -eq $ValorEsperado) { "Green" } else { "Red" })
            Write-Host "ID da reserva: $($response.dados.id)"
            
            return @{
                Sucesso = ($valorObtido -eq $ValorEsperado)
                ValorObtido = $valorObtido
                ReservaId = $response.dados.id
            }
        } else {
            Write-Host "Erro: Resposta inválida" -ForegroundColor Red
            Write-Host $response
            return $null
        }
    } catch {
        Write-Host "Exceção ao criar reserva:" -ForegroundColor Red
        Write-Host $_.Exception.Message
        return $null
    }
}

# TESTE 1: Sem valor (deve calcular automaticamente)
$teste1 = Test-CriarReserva -Descricao "SEM valor (calcular automaticamente)" `
    -ValorEnviado $null `
    -ValorEsperado $valorEsperado

# TESTE 2: Com valor errado (3,60 - deve corrigir para 36)
$teste2 = Test-CriarReserva -Descricao "COM valor ERRADO 3,60 (deve corrigir ×10)" `
    -ValorEnviado 3.60 `
    -ValorEsperado $valorEsperado

# TESTE 3: Com valor correto (36 - deve manter como está)
$teste3 = Test-CriarReserva -Descricao "COM valor CORRETO 36,00 (deve manter)" `
    -ValorEnviado 36.00 `
    -ValorEsperado $valorEsperado

# Resumo
Write-Host "`n=== RESUMO ===" -ForegroundColor Cyan
$testes = @($teste1, $teste2, $teste3)
$sucessos = @($testes | Where-Object { $_ -and $_.Sucesso }).Count
$total = @($testes | Where-Object { $_ }).Count

Write-Host "Testes bem-sucedidos: $sucessos/$total"

if ($sucessos -eq $total) {
    Write-Host "✓ TODOS OS TESTES PASSARAM!" -ForegroundColor Green
} else {
    Write-Host "✗ ALGUNS TESTES FALHARAM" -ForegroundColor Red
}

# Se verbose, mostrar detalhes adicionais
if ($Verbose) {
    Write-Host "`n=== VERIFICAÇÃO ADICIONAL ===" -ForegroundColor Cyan
    Write-Host "Consultando reservas criadas..."
    
    try {
        $reservas = Invoke-RestMethod -Uri "$BaseUrl/hotel/$HotelId/reservas" -Method Get
        $minhas = $reservas.dados | Where-Object { $_.hospede_id -eq $HostedeId }
        
        Write-Host "Total de reservas deste hóspede: $($minhas.Count)"
        $minhas | Select-Object -Last 3 | Format-Table codigo, valor, status -AutoSize
    } catch {
        Write-Host "Erro ao buscar reservas: $($_.Exception.Message)"
    }
}

Write-Host "`nTeste concluído." -ForegroundColor Cyan
