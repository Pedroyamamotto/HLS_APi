param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [Parameter(Mandatory = $false)]
  [string]$Region = "us-central1",

  [Parameter(Mandatory = $false)]
  [string]$Service = "hls-api",

  [Parameter(Mandatory = $false)]
  [string]$SmtpHost,

  [Parameter(Mandatory = $false)]
  [string]$SmtpPort = "587",

  [Parameter(Mandatory = $false)]
  [bool]$SmtpSecure = $false,

  [Parameter(Mandatory = $false)]
  [string]$SmtpUser,

  [Parameter(Mandatory = $false)]
  [string]$SmtpPassword,

  [Parameter(Mandatory = $false)]
  [string]$SmtpFrom
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

if ($SmtpHost) {
  $smtpVars = @(
    "SMTP_HOST=$SmtpHost",
    "SMTP_PORT=$SmtpPort",
    "SMTP_SECURE=$($SmtpSecure.ToString().ToLower())"
  )

  if ($SmtpUser) { $smtpVars += "SMTP_USER=$SmtpUser" }
  if ($SmtpPassword) { $smtpVars += "SMTP_PASSWORD=$SmtpPassword" }
  if ($SmtpFrom) { $smtpVars += "SMTP_FROM=$SmtpFrom" }

  Write-Host "Atualizando variaveis SMTP no Cloud Run..."
  gcloud run services update $Service --region $Region --update-env-vars ($smtpVars -join ',')

  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao atualizar variaveis SMTP no Cloud Run"
  }

  Write-Host "Variaveis SMTP atualizadas no Cloud Run."
}