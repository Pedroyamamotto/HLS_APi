CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS role (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS permissao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS role_permissao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
    permissao_id UUID NOT NULL REFERENCES permissao(id) ON DELETE CASCADE,
    UNIQUE (role_id, permissao_id)
);

CREATE TABLE IF NOT EXISTS usuario_auth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_login TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    email VARCHAR(255) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS sessao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_auth_id UUID NOT NULL REFERENCES usuario_auth(id) ON DELETE CASCADE,
    expira_em TIMESTAMP NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS codigo_verificacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_auth_id UUID NOT NULL REFERENCES usuario_auth(id) ON DELETE CASCADE,
    expira_em TIMESTAMP NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    tipo VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS log_auth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_auth_id UUID NOT NULL REFERENCES usuario_auth(id) ON DELETE CASCADE,
    data TIMESTAMP NOT NULL DEFAULT NOW(),
    acao VARCHAR(100) NOT NULL,
    ip VARCHAR(45)
);

CREATE TABLE IF NOT EXISTS assinatura (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_vencimento DATE NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    valor_mensal DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS licenca (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    validade DATE NOT NULL,
    chave VARCHAR(100) NOT NULL UNIQUE,
    empresa_nome VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS politica (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    politica_cancelamento TEXT,
    horario_check_in TIME,
    horario_check_out TIME,
    carencia_minutos INTEGER
);

CREATE TABLE IF NOT EXISTS hotel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assinatura_id UUID REFERENCES assinatura(id) ON DELETE SET NULL,
    politica_id UUID REFERENCES politica(id) ON DELETE SET NULL,
    nome VARCHAR(150) NOT NULL,
    moeda_local VARCHAR(10) NOT NULL,
    endereco VARCHAR(255),
    foto_url TEXT
);

CREATE TABLE IF NOT EXISTS usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_auth_id UUID REFERENCES usuario_auth(id) ON DELETE SET NULL,
    assinatura_id UUID REFERENCES assinatura(id) ON DELETE SET NULL,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    numero VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS restricao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotel(id) ON DELETE CASCADE,
    inicio TIME,
    fim TIME,
    nome VARCHAR(50) NOT NULL,
    observacao VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS transacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES hotel(id) ON DELETE SET NULL,
    data TIMESTAMP NOT NULL DEFAULT NOW(),
    tipo VARCHAR(20) NOT NULL,
    fornecedor VARCHAR(100),
    documento VARCHAR(20),
    categoria VARCHAR(50),
    descricao TEXT,
    valor DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS hospede (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_nascimento DATE,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(20),
    cpf VARCHAR(11),
    passaporte VARCHAR(20),
    nacionalidade VARCHAR(50),
    endereco VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS dependente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospede_id UUID NOT NULL REFERENCES hospede(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    documento VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS andar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotel(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    nome VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS categoria_quarto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotel(id) ON DELETE CASCADE,
    descricao TEXT,
    capacidade SMALLINT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    preco_diaria DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS arquivo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotel(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    nome VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS quarto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    andar_id UUID NOT NULL REFERENCES andar(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES categoria_quarto(id) ON DELETE CASCADE,
    descricao TEXT,
    capacidade SMALLINT NOT NULL,
    quantidade_camas SMALLINT,
    numero VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS reserva (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospede_id UUID NOT NULL REFERENCES hospede(id) ON DELETE RESTRICT,
    quarto_id UUID NOT NULL REFERENCES quarto(id) ON DELETE RESTRICT,
    data_checkin TIMESTAMP NOT NULL,
    data_checkout TIMESTAMP NOT NULL,
    qtd_adultos SMALLINT NOT NULL,
    qtd_criancas SMALLINT NOT NULL DEFAULT 0,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL,
    canal VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS historico_reserva (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id UUID NOT NULL REFERENCES reserva(id) ON DELETE CASCADE,
    data TIMESTAMP NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS estadia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id UUID NOT NULL REFERENCES reserva(id) ON DELETE CASCADE,
    checkin_real TIMESTAMP,
    checkout_real TIMESTAMP,
    status VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS credencial_acesso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id UUID REFERENCES reserva(id) ON DELETE CASCADE,
    hospede_id UUID REFERENCES hospede(id) ON DELETE CASCADE,
    dispositivo_id UUID,
    validade_inicio TIMESTAMP NOT NULL,
    validade_fim TIMESTAMP NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    codigo VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS log_acesso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credencial_id UUID NOT NULL REFERENCES credencial_acesso(id) ON DELETE CASCADE,
    dispositivo_id UUID,
    data_hora TIMESTAMP NOT NULL DEFAULT NOW(),
    resultado VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS ordem_limpeza (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quarto_id UUID NOT NULL REFERENCES quarto(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuario_auth(id) ON DELETE SET NULL,
    data_inicio TIMESTAMP NOT NULL,
    data_fim TIMESTAMP,
    status VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ordem_id UUID NOT NULL REFERENCES ordem_limpeza(id) ON DELETE CASCADE,
    concluido BOOLEAN NOT NULL DEFAULT FALSE,
    tipo VARCHAR(20) NOT NULL,
    item VARCHAR(150) NOT NULL
);

CREATE TABLE IF NOT EXISTS refeicao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS pedido_consumo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospede_id UUID NOT NULL REFERENCES hospede(id) ON DELETE CASCADE,
    refeicao_id UUID NOT NULL REFERENCES refeicao(id) ON DELETE CASCADE,
    reserva_id UUID REFERENCES reserva(id) ON DELETE CASCADE,
    presente BOOLEAN NOT NULL DEFAULT FALSE,
    data TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS produto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL,
    categoria VARCHAR(150),
    preco_custo DECIMAL(10,2) NOT NULL,
    preco_venda DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS consumo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estadia_id UUID NOT NULL REFERENCES estadia(id) ON DELETE CASCADE,
    data TIMESTAMP NOT NULL DEFAULT NOW(),
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS item_consumo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumo_id UUID NOT NULL REFERENCES consumo(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES produto(id) ON DELETE RESTRICT,
    data TIMESTAMP NOT NULL DEFAULT NOW(),
    valor_total DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS fatura (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estadia_id UUID NOT NULL REFERENCES estadia(id) ON DELETE CASCADE,
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS pagamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fatura_id UUID NOT NULL REFERENCES fatura(id) ON DELETE CASCADE,
    data_pagamento TIMESTAMP NOT NULL DEFAULT NOW(),
    valor DECIMAL(10,2) NOT NULL,
    metodo VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL
);
