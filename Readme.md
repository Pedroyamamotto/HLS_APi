# HLS API - Dev local e Produção no Cloud Run

## Execução local (Windows com SQL Server Trusted Connection)

1. Copie `.env.example` para `.env`.
2. Preencha `MSSQL_HOST`, `MSSQL_PORT` e `MSSQL_DATABASE`.
3. Deixe `MSSQL_USER` e `MSSQL_PASSWORD` vazios.
4. Defina `MSSQL_INTEGRATED_AUTH=true`.
5. Execute:

```powershell
npm.cmd install
npm.cmd start
```

## Produção (Cloud Run com SQL Authentication)

No Cloud Run (Linux), use usuário e senha SQL Server:

- `MSSQL_USER`
- `MSSQL_PASSWORD`
- `MSSQL_HOST`
- `MSSQL_PORT`
- `MSSQL_DATABASE`

Para envio de e-mail em produção, configure também:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`

### Deploy com pipeline (Cloud Build)

```powershell
gcloud config set project SEU_PROJECT_ID
gcloud builds submit --config cloudbuild.yaml
```

### Deploy via script PowerShell

```powershell
./scripts/deploy_cloud_run.ps1 -ProjectId SEU_PROJECT_ID -Region us-central1 -Service hls-api
```

### Configurar variáveis no serviço Cloud Run

```powershell
gcloud run services update hls-api \
  --region us-central1 \
  --set-env-vars NODE_ENV=production,MSSQL_HOST=SEU_HOST,MSSQL_PORT=1433,MSSQL_DATABASE=hls_api,MSSQL_USER=SEU_USER,MSSQL_PASSWORD=SUA_SENHA,MSSQL_TRUST_SERVER_CERT=true,SMTP_HOST=smtp.gmail.com,SMTP_PORT=587,SMTP_SECURE=false,SMTP_USER=SEU_EMAIL,SMTP_PASSWORD=SENHA_DE_APP,SMTP_FROM="HLS API <no-reply@seudominio.com>"
```

## URL atual do serviço

- `https://hls-api-990709313938.us-central1.run.app`
