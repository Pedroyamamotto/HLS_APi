-- Migration: 001_create_hotel_schema (PostgreSQL/MySQL)

-- ===== 🔐 Usuários e autenticação =====

CREATE TABLE UsuarioAuth (
    id UUID PRIMARY KEY,
    status BOOLEAN,
    ultimo_login TIMESTAMP,
    criado_em TIMESTAMP DEFAULT NOW(),
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL
);

CREATE TABLE Usuario (
    id UUID PRIMARY KEY,
    usuario_auth_id UUID REFERENCES UsuarioAuth(id) ON DELETE SET NULL,
    assinatura_id UUID,
    status BOOLEAN DEFAULT TRUE,
    nome VARCHAR(150) NOT NULL,
    numero VARCHAR(50)
);

CREATE TABLE Sessao (
    id UUID PRIMARY KEY,
    usuario_auth_id UUID NOT NULL REFERENCES UsuarioAuth(id) ON DELETE CASCADE,
    expira_em TIMESTAMP NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL
);

CREATE TABLE LogAuth (
    id UUID PRIMARY KEY,
    usuario_auth_id UUID NOT NULL REFERENCES UsuarioAuth(id) ON DELETE CASCADE,
    data TIMESTAMP DEFAULT NOW(),
    acao VARCHAR(100) NOT NULL,
    ip VARCHAR(45)
);

CREATE TABLE CodigoVerificacao (
    id UUID PRIMARY KEY,
    usuario_auth_id UUID NOT NULL REFERENCES UsuarioAuth(id) ON DELETE CASCADE,
    expira_em TIMESTAMP NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    tipo VARCHAR(20) NOT NULL
);

-- ===== 🔑 Permissões =====

CREATE TABLE Role (
    id UUID PRIMARY KEY,
    nome VARCHAR(150) UNIQUE NOT NULL
);

CREATE TABLE Permissao (
    id UUID PRIMARY KEY,
    nome VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE RolePermissao (
    id UUID PRIMARY KEY,
    role_id UUID NOT NULL REFERENCES Role(id) ON DELETE CASCADE,
    permissao_id UUID NOT NULL REFERENCES Permissao(id) ON DELETE CASCADE,
    UNIQUE(role_id, permissao_id)
);

-- ===== 🏨 Hotel e estrutura =====

CREATE TABLE Assinatura (
    id UUID PRIMARY KEY,
    data_vencimento DATE NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    valor_mensal DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL
);

CREATE TABLE Licenca (
    id UUID PRIMARY KEY,
    validade DATE NOT NULL,
    chave VARCHAR(100) UNIQUE NOT NULL,
    empresa_nome VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL
);

CREATE TABLE Politica (
    id UUID PRIMARY KEY,
    politica_cancelamento TEXT,
    horario_checkin TIME,
    horario_checkout TIME,
    carencia_minutos INTEGER
);

CREATE TABLE Hotel (
    id UUID PRIMARY KEY,
    assinatura_id UUID REFERENCES Assinatura(id) ON DELETE SET NULL,
    politica_id UUID REFERENCES Politica(id) ON DELETE SET NULL,
    nome VARCHAR(150) NOT NULL,
    moeda_local VARCHAR(10) NOT NULL,
    endereco VARCHAR(255)
);

CREATE TABLE Restricao (
    id UUID PRIMARY KEY,
    hotel_id UUID NOT NULL REFERENCES Hotel(id) ON DELETE CASCADE,
    inicio TIME,
    fim TIME,
    nome VARCHAR(50) NOT NULL,
    observacao VARCHAR(255)
);

CREATE TABLE Transacao (
    id UUID PRIMARY KEY,
    hotel_id UUID REFERENCES Hotel(id) ON DELETE SET NULL,
    data TIMESTAMP DEFAULT NOW(),
    tipo VARCHAR(20) NOT NULL,
    fornecedor VARCHAR(100),
    documento VARCHAR(50),
    categoria VARCHAR(50),
    descricao TEXT,
    valor DECIMAL(10,2) NOT NULL
);

CREATE TABLE Andar (
    id UUID PRIMARY KEY,
    hotel_id UUID NOT NULL REFERENCES Hotel(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    nome VARCHAR(50)
);

CREATE TABLE CategoriaQuarto (
    id UUID PRIMARY KEY,
    hotel_id UUID NOT NULL REFERENCES Hotel(id) ON DELETE CASCADE,
    descricao TEXT,
    capacidade SMALLINT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    preco_diaria DECIMAL(10,2) NOT NULL
);

CREATE TABLE Arquivo (
    id UUID PRIMARY KEY,
    hotel_id UUID NOT NULL REFERENCES Hotel(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL
);

CREATE TABLE Quarto (
    id UUID PRIMARY KEY,
    andar_id UUID NOT NULL REFERENCES Andar(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES CategoriaQuarto(id) ON DELETE CASCADE,
    descricao TEXT,
    capacidade SMALLINT NOT NULL,
    quantidade_camas SMALLINT,
    numero VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL
);

-- ===== 👤 Hóspedes =====

CREATE TABLE Hospede (
    id UUID PRIMARY KEY,
    data_nascimento DATE,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(50),
    cpf VARCHAR(14),
    passaporte VARCHAR(20),
    nacionalidade VARCHAR(50),
    endereco VARCHAR(255)
);

CREATE TABLE Dependente (
    id UUID PRIMARY KEY,
    hospede_id UUID NOT NULL REFERENCES Hospede(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    documento VARCHAR(100)
);

-- ===== 📅 Reservas e estadia =====

CREATE TABLE Reserva (
    id UUID PRIMARY KEY,
    hospede_id UUID NOT NULL REFERENCES Hospede(id) ON DELETE RESTRICT,
    quarto_id UUID NOT NULL REFERENCES Quarto(id) ON DELETE RESTRICT,
    data_checkin TIMESTAMP NOT NULL,
    data_checkout TIMESTAMP NOT NULL,
    qtd_adultos SMALLINT NOT NULL,
    qtd_criancas SMALLINT DEFAULT 0,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL,
    canal VARCHAR(50)
);

CREATE TABLE Estadia (
    id UUID PRIMARY KEY,
    reserva_id UUID NOT NULL REFERENCES Reserva(id) ON DELETE CASCADE,
    checkin_real TIMESTAMP,
    checkout_real TIMESTAMP,
    status VARCHAR(20) NOT NULL
);

CREATE TABLE HistoricoReserva (
    id UUID PRIMARY KEY,
    reserva_id UUID NOT NULL REFERENCES Reserva(id) ON DELETE CASCADE,
    data TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50) NOT NULL
);

-- ===== 🔐 Acesso =====

CREATE TABLE CredencialAcesso (
    id UUID PRIMARY KEY,
    reserva_id UUID REFERENCES Reserva(id) ON DELETE CASCADE,
    hospede_id UUID REFERENCES Hospede(id) ON DELETE CASCADE,
    dispositivo_id UUID,
    validade_inicio TIMESTAMP NOT NULL,
    validade_fim TIMESTAMP NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    codigo VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE LogAcesso (
    id UUID PRIMARY KEY,
    credencial_id UUID NOT NULL REFERENCES CredencialAcesso(id) ON DELETE CASCADE,
    dispositivo_id UUID,
    data_hora TIMESTAMP DEFAULT NOW(),
    resultado VARCHAR(50) NOT NULL
);

CREATE TABLE OrdemLimpeza (
    id UUID PRIMARY KEY,
    quarto_id UUID NOT NULL REFERENCES Quarto(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES UsuarioAuth(id) ON DELETE SET NULL,
    data_inicio TIMESTAMP NOT NULL,
    data_fim TIMESTAMP,
    status VARCHAR(20) NOT NULL
);

CREATE TABLE Checklist (
    id UUID PRIMARY KEY,
    ordem_id UUID NOT NULL REFERENCES OrdemLimpeza(id) ON DELETE CASCADE,
    concluido BOOLEAN DEFAULT FALSE,
    tipo VARCHAR(20) NOT NULL,
    item VARCHAR(150) NOT NULL
);

-- ===== 🍽️ Consumo e faturamento =====

CREATE TABLE Refeicao (
    id UUID PRIMARY KEY,
    nome VARCHAR(30) UNIQUE NOT NULL
);

CREATE TABLE PedidoConsumo (
    id UUID PRIMARY KEY,
    hospede_id UUID NOT NULL REFERENCES Hospede(id) ON DELETE CASCADE,
    refeicao_id UUID NOT NULL REFERENCES Refeicao(id) ON DELETE CASCADE,
    reserva_id UUID REFERENCES Reserva(id) ON DELETE CASCADE,
    presente BOOLEAN DEFAULT FALSE,
    data TIMESTAMP DEFAULT NOW()
);

CREATE TABLE Produto (
    id UUID PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    categoria VARCHAR(150),
    preco_custo DECIMAL(10,2) NOT NULL,
    preco_venda DECIMAL(10,2) NOT NULL
);

CREATE TABLE Consumo (
    id UUID PRIMARY KEY,
    estadia_id UUID NOT NULL REFERENCES Estadia(id) ON DELETE CASCADE,
    data TIMESTAMP DEFAULT NOW(),
    valor_total DECIMAL(10,2) DEFAULT 0
);

CREATE TABLE ItemConsumo (
    id UUID PRIMARY KEY,
    consumo_id UUID NOT NULL REFERENCES Consumo(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES Produto(id) ON DELETE RESTRICT,
    data TIMESTAMP DEFAULT NOW(),
    valor_total DECIMAL(10,2) NOT NULL
);

CREATE TABLE Fatura (
    id UUID PRIMARY KEY,
    estadia_id UUID NOT NULL REFERENCES Estadia(id) ON DELETE CASCADE,
    valor_total DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL
);

CREATE TABLE Pagamento (
    id UUID PRIMARY KEY,
    fatura_id UUID NOT NULL REFERENCES Fatura(id) ON DELETE CASCADE,
    data_pagamento TIMESTAMP DEFAULT NOW(),
    valor DECIMAL(10,2) NOT NULL,
    metodo VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL
);
