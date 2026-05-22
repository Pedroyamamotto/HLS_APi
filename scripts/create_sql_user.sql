-- Criar usuário SQL Server para a API
-- Execute como admin no SQL Server

-- 1. Criar o login SQL (em master)
USE master;
IF NOT EXISTS (SELECT * FROM sys.sql_logins WHERE name = 'hls_api_user')
BEGIN
    CREATE LOGIN hls_api_user WITH PASSWORD = 'HLSApi@2026!Seguro';
    PRINT 'Login hls_api_user criado com sucesso.';
END
ELSE
BEGIN
    PRINT 'Login hls_api_user já existe.';
END

-- 2. Criar usuário no banco hls_api
USE hls_api;
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'hls_api_user')
BEGIN
    CREATE USER hls_api_user FOR LOGIN hls_api_user;
    PRINT 'Usuário hls_api_user criado no banco hls_api.';
END
ELSE
BEGIN
    PRINT 'Usuário hls_api_user já existe no banco hls_api.';
END

-- 3. Conceder permissões necessárias
ALTER ROLE db_datareader ADD MEMBER hls_api_user;
ALTER ROLE db_datawriter ADD MEMBER hls_api_user;
ALTER ROLE db_ddladmin ADD MEMBER hls_api_user;

GRANT EXECUTE ON SCHEMA::dbo TO hls_api_user;

PRINT 'Permissões concedidas com sucesso.';
PRINT '';
PRINT '=== INFORMAÇÕES DE CONEXÃO ===';
PRINT 'Usuário: hls_api_user';
PRINT 'Senha: HLSApi@2026!Seguro';
PRINT 'Host: localhost';
PRINT 'Porta: 1433';
PRINT 'Banco: hls_api';
PRINT '==============================';
