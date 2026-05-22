param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [Parameter(Mandatory = $false)]
  [string]$Region = "us-central1",

  [Parameter(Mandatory = $false)]
  [string]$Service = "hls-api"
)

$ErrorActionPreference = "Stop"

Write-Host "Definindo projeto: $ProjectId"
gcloud config set project $ProjectId | Out-Null

Write-Host "Executando Cloud Build e deploy no Cloud Run..."
gcloud builds submit --config cloudbuild.yaml --substitutions _SERVICE=$Service,_REGION=$Region

if ($LASTEXITCODE -ne 0) {
  throw "Falha no deploy Cloud Run"
}

Write-Host "Deploy finalizado. URL do servico:"
gcloud run services describe $Service --region $Region --format "value(status.url)"