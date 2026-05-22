-- Migration: adiciona role_id ao usuario e semeia roles/permissoes para Security Matrix
-- Execute uma vez no banco MSSQL

-- 1. Adicionar role_id na tabela usuario (se ainda nao existe)
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[usuario]') AND name = 'role_id'
)
BEGIN
  ALTER TABLE [usuario] ADD role_id UNIQUEIDENTIFIER NULL;
  ALTER TABLE [usuario] ADD CONSTRAINT FK_usuario_role
    FOREIGN KEY (role_id) REFERENCES [role](id) ON DELETE SET NULL;
  PRINT 'Coluna role_id adicionada ao usuario';
END
ELSE
  PRINT 'Coluna role_id ja existe';

-- 2. Inserir roles padrao (idempotente)
IF NOT EXISTS (SELECT 1 FROM [role] WHERE nome = 'Administrador')
  INSERT INTO [role] (id, nome) VALUES (NEWID(), 'Administrador');

IF NOT EXISTS (SELECT 1 FROM [role] WHERE nome = 'Recepcao')
  INSERT INTO [role] (id, nome) VALUES (NEWID(), 'Recepcao');

IF NOT EXISTS (SELECT 1 FROM [role] WHERE nome = 'Manutencao')
  INSERT INTO [role] (id, nome) VALUES (NEWID(), 'Manutencao');

-- 3. Inserir permissoes padrao (idempotente)
DECLARE @perms TABLE (nome NVARCHAR(150));
INSERT INTO @perms VALUES
  ('ver_reservas'),
  ('criar_editar_reservas'),
  ('cancelar_reservas'),
  ('ver_hospedes'),
  ('editar_hospedes'),
  ('ver_quartos'),
  ('gerenciar_quartos'),
  ('ver_governanca'),
  ('gerenciar_tarefas'),
  ('ver_consumo'),
  ('lancar_consumo'),
  ('ver_contabilidade'),
  ('editar_lancamentos');

INSERT INTO permissao (id, nome)
SELECT NEWID(), p.nome FROM @perms p
WHERE NOT EXISTS (SELECT 1 FROM permissao WHERE nome = p.nome);

-- 4. Semear role_permissao para Administrador (todas as permissoes)
INSERT INTO role_permissao (id, role_id, permissao_id)
SELECT NEWID(), r.id, p.id
FROM [role] r
CROSS JOIN permissao p
WHERE r.nome = 'Administrador'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissao rp
    WHERE rp.role_id = r.id AND rp.permissao_id = p.id
  );

-- 5. Semear role_permissao para Recepcao
DECLARE @recepcaoPerms TABLE (nome NVARCHAR(150));
INSERT INTO @recepcaoPerms VALUES
  ('ver_reservas'), ('criar_editar_reservas'),
  ('ver_hospedes'), ('editar_hospedes'),
  ('ver_quartos'), ('ver_consumo'), ('lancar_consumo');

INSERT INTO role_permissao (id, role_id, permissao_id)
SELECT NEWID(), r.id, p.id
FROM [role] r
JOIN permissao p ON p.nome IN (
  'ver_reservas', 'criar_editar_reservas',
  'ver_hospedes', 'editar_hospedes',
  'ver_quartos', 'ver_consumo', 'lancar_consumo'
)
WHERE r.nome = 'Recepcao'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissao rp
    WHERE rp.role_id = r.id AND rp.permissao_id = p.id
  );

-- 6. Semear role_permissao para Manutencao
INSERT INTO role_permissao (id, role_id, permissao_id)
SELECT NEWID(), r.id, p.id
FROM [role] r
JOIN permissao p ON p.nome IN (
  'ver_quartos', 'gerenciar_quartos',
  'ver_governanca', 'gerenciar_tarefas'
)
WHERE r.nome = 'Manutencao'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissao rp
    WHERE rp.role_id = r.id AND rp.permissao_id = p.id
  );

PRINT 'Migration fix_usuario_role_permissions concluida';
