param(
  [string]$RequestId = "REQ-CHECKOUT-$(Get-Date -UFormat %s)",
  [string]$Room = 'Quarto 101',
  [string]$HotelId = 'FB5D45CD-0C6A-4C4C-B10B-B44875ACDFCC',
  [int]$WaitMs = 3000,
  [int]$Quantity = 1
)

# Teste de checkout Yamamotto - tenta variações de payload automaticamente
function Read-EnvValue($path, $key) {
  if (-Not (Test-Path $path)) { return $null }
  $line = Get-Content $path | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
  if (-not $line) { return $null }
  $val = ($line -split '=',2)[1].Trim()
  return $val -replace '^"|"$',''
}

$envFile = Join-Path (Get-Location) '.env'
$integrationKey = Read-EnvValue $envFile 'YAMAMOTTO_INTEGRATION_KEY'
if (-not $integrationKey) {
  Write-Host 'YAMAMOTTO_INTEGRATION_KEY não encontrada em .env. Forneça a chave manualmente.' -ForegroundColor Yellow
  $integrationKey = Read-Host 'x-api-key (insira a chave)'
}

Write-Host "Usando x-api-key: $($integrationKey.Substring(0,[Math]::Min(10,$integrationKey.Length)))..."

function Try-Post($body) {
  try {
    $json = $body | ConvertTo-Json -Depth 6
    Write-Host "Tentando payload:\n$json" -ForegroundColor Cyan
    $resp = Invoke-RestMethod -Uri 'https://api-v2.yama.ia.br/operations/checkout' -Method Post -Headers @{ 'Content-Type'='application/json'; 'x-api-key'=$integrationKey } -Body $json -ErrorAction Stop
    Write-Host "Sucesso: $(ConvertTo-Json $resp -Depth 5)" -ForegroundColor Green
    return $true
  } catch {
    $err = $_.Exception.Response
    if ($err) {
      try { $text = (New-Object System.IO.StreamReader($err.GetResponseStream())).ReadToEnd() } catch { $text = $_.Exception.Message }
      Write-Host "Erro HTTP: $text" -ForegroundColor Red
    } else {
      Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    }
    return $false
  }
}

# Variações de payload para tentar (evita problemas de case/wrapper)
$payloads = @()

# 1) wrapper 'request' com PascalCase keys
$payloads += @{ request = @{ RequestId = $RequestId; Room = $Room; WaitMs = $WaitMs; HotelId = $HotelId; Quantity = $Quantity } }

# 2) wrapper 'request' com camelCase keys
$payloads += @{ request = @{ requestId = $RequestId; room = $Room; waitMs = $WaitMs; hotelId = $HotelId; quantity = $Quantity } }

# 3) wrapper 'Request' (capitalized) com PascalCase
$payloads += @{ Request = @{ RequestId = $RequestId; Room = $Room; WaitMs = $WaitMs; HotelId = $HotelId; Quantity = $Quantity } }

# 4) top-level PascalCase (no wrapper)
$payloads += @{ RequestId = $RequestId; Room = $Room; WaitMs = $WaitMs; HotelId = $HotelId; Quantity = $Quantity }

# 5) top-level camelCase
$payloads += @{ requestId = $RequestId; room = $Room; waitMs = $WaitMs; hotelId = $HotelId; quantity = $Quantity }

foreach ($p in $payloads) {
  if (Try-Post $p) { Write-Host 'Request enviada com sucesso.' -ForegroundColor Green; break }
  else { Write-Host 'Tentativa falhou. Testando próxima variação...' -ForegroundColor Yellow }
}

Write-Host 'Fim do script.'
