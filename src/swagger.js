const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'HLS API',
    version: '0.1.0',
    description:
      'API do sistema HLS — gerenciamento de licenças, hotéis e autenticação de usuários.',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Servidor local de desenvolvimento',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token retornado pelo endpoint de login ou verificação.',
      },
    },
    schemas: {
      Erro: {
        type: 'object',
        properties: {
          sucesso: { type: 'boolean', example: false },
          mensagem: { type: 'string', example: 'Descrição do erro.' },
        },
      },
      Usuario: {
        type: 'object',
        properties: {
          Id: { type: 'integer', example: 1 },
          NomeCompleto: { type: 'string', example: 'João Silva' },
          Email: { type: 'string', format: 'email', example: 'joao@example.com' },
          NumeroTelefone: { type: 'string', example: '11999990001' },
          Tipo_Usuario: { type: 'string', example: 'normal' },
          NumeroLicenca: { type: 'string', example: 'HLS-TEST-0001' },
          ChaveLicensa: { type: 'string', example: 'abc123' },
          AssinaturaId: { type: 'integer', example: 1 },
        },
      },
      Licensa: {
        type: 'object',
        properties: {
          NumeroLicensa: { type: 'string', example: 'HLS-TEST-0001' },
          ChaveLicensa: { type: 'string', example: 'abc123' },
          EmpresaNome: { type: 'string', example: 'Hotel Exemplo Ltda' },
          StatusLicensa: { type: 'string', example: 'ativa' },
        },
      },
      Hotel: {
        type: 'object',
        properties: {
          Id: { type: 'integer', example: 1 },
          NomeHotel: { type: 'string', example: 'Grand Hotel' },
          Endereco: { type: 'string', example: 'Rua das Flores, 100' },
          MoedaLocal: { type: 'string', example: 'BRL' },
          AssinaturaId: { type: 'integer', example: 1 },
          PoliticaId: { type: 'integer', example: 2, nullable: true },
        },
      },
      Politica: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          politica_cancelamento: { type: 'string', example: 'Cancelamento gratuito até 48h antes.' },
          horario_check_in: { type: 'string', example: '14:00' },
          horario_check_out: { type: 'string', example: '12:00' },
          carencia_minutos: { type: 'integer', example: 30 },
        },
      },
      Hospede: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          hotel_id: { type: 'string', example: 'E85D7F95-8DA3-4AB6-81DD-4C5A2B2A0B71' },
          nome: { type: 'string', example: 'Beatriz Helena Costa' },
          email: { type: 'string', format: 'email', nullable: true, example: 'beatriz@email.com' },
          telefone: { type: 'string', nullable: true, example: '551100000000' },
          cpf: { type: 'string', nullable: true, example: '100.013.579-01' },
          passaporte: { type: 'string', nullable: true, example: 'AB1234567' },
          nacionalidade: { type: 'string', nullable: true, example: 'Brasileiro' },
          endereco: { type: 'string', nullable: true, example: 'Rua Exemplo, 10' },
          data_nascimento: { type: 'string', format: 'date', nullable: true, example: '1990-11-27' },
        },
      },
      Dependente: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          hospede_id: { type: 'integer', example: 1 },
          nome: { type: 'string', example: 'Lucas Schuller Martins' },
          documento: { type: 'string', nullable: true, example: '442.331.009-44' },
        },
      },
      UsuarioHotel: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'A1B2C3D4-E5F6-4ABC-8DEF-012345678901' },
          hotel_id: { type: 'string', format: 'uuid', example: 'FB5D45CD-0C6A-4C4C-B10B-B44875ACDFCC' },
          usuario_id: { type: 'integer', example: 1 },
          nome_completo: { type: 'string', example: 'João Silva' },
          email: { type: 'string', format: 'email', example: 'joao@example.com' },
          telefone: { type: 'string', example: '11999990001' },
          role_id: { type: 'integer', example: 1 },
          nome_role: { type: 'string', example: 'Administrador' },
          ativo: { type: 'boolean', example: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      Refeicao: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'B2C3D4E5-F6A7-4ABC-8DEF-123456789012' },
          hotel_id: { type: 'string', format: 'uuid', example: 'FB5D45CD-0C6A-4C4C-B10B-B44875ACDFCC' },
          nome: { type: 'string', example: 'Café da Manhã' },
          horario_inicio: { type: 'string', example: '07:00' },
          horario_fim: { type: 'string', example: '10:00' },
          habilitada: { type: 'boolean', example: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      Permissao: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          nome: { type: 'string', example: 'Ver Hóspedes' },
          descricao: { type: 'string', example: 'Permissão para visualizar hóspedes do hotel' },
        },
      },
      Role: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          nome: { type: 'string', example: 'Administrador' },
          descricao: { type: 'string', example: 'Acesso total ao sistema' },
        },
      },
      SecurityMatrix: {
        type: 'object',
        properties: {
          permissoes: { type: 'array', items: { $ref: '#/components/schemas/Permissao' } },
          roles: { type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, nome: { type: 'string' }, permissoes: { type: 'array', items: { type: 'integer' } } } } },
        },
      },
      PoliciesTiming: {
        type: 'object',
        properties: {
          politica: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, politica_cancelamento: { type: 'string' }, horario_check_in: { type: 'string' }, horario_check_out: { type: 'string' }, carencia_minutos: { type: 'integer' } } },
          refeicoes: { type: 'array', items: { $ref: '#/components/schemas/Refeicao' } },
        },
      },
      Andar: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'F61AD248-F9A8-4CBF-A816-5C9F2D0C3207' },
          hotel_id: { type: 'string', format: 'uuid', example: 'FB5D45CD-0C6A-4C4C-B10B-B44875ACDFCC' },
          numero: { type: 'integer', example: 1 },
          nome: { type: 'string', nullable: true, example: 'Primeiro Pavimento' },
          total_quartos: { type: 'integer', example: 12 },
        },
      },
      CategoriaQuarto: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'BE61B752-E74E-465D-822B-E00609B9D739' },
          hotel_id: { type: 'string', format: 'uuid', example: 'FB5D45CD-0C6A-4C4C-B10B-B44875ACDFCC' },
          nome: { type: 'string', example: 'Deluxe' },
          descricao: { type: 'string', nullable: true, example: 'Premium confort' },
          capacidade: { type: 'integer', example: 2 },
          preco_diaria: { type: 'number', format: 'float', example: 199.9 },
          total_quartos: { type: 'integer', example: 8 },
        },
      },
      Quarto: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'AC1DAB34-4DD5-4BEA-9905-8556A2E861FD' },
          numero: { type: 'string', example: '101' },
          descricao: { type: 'string', nullable: true, example: 'Cama king e vista mar' },
          capacidade: { type: 'integer', example: 2 },
          quantidade_camas: { type: 'integer', nullable: true, example: 1 },
          status: { type: 'string', example: 'livre' },
          andar_id: { type: 'string', format: 'uuid' },
          andar_numero: { type: 'integer', example: 1 },
          andar_nome: { type: 'string', nullable: true, example: 'Primeiro Pavimento' },
          categoria_id: { type: 'string', format: 'uuid' },
          categoria_nome: { type: 'string', example: 'Deluxe' },
          categoria_descricao: { type: 'string', nullable: true, example: 'Premium confort' },
          preco_diaria: { type: 'number', format: 'float', example: 199.9 },
        },
      },
      ArquiteturaHotel: {
        type: 'object',
        properties: {
          metricas: {
            type: 'object',
            properties: {
              total_andares: { type: 'integer', example: 1 },
              total_quartos: { type: 'integer', example: 12 },
              quartos_ativos: { type: 'integer', example: 10 },
              quartos_manutencao: { type: 'integer', example: 2 },
              capacidade_total: { type: 'integer', example: 24 },
            },
          },
          andares: {
            type: 'array',
            items: {
              allOf: [
                { $ref: '#/components/schemas/Andar' },
                {
                  type: 'object',
                  properties: {
                    quartos: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Quarto' },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },
  },
  paths: {
    // ─────────────────────────────────────────────────────────────────────────
    // AUTH
    // ─────────────────────────────────────────────────────────────────────────
    '/auth/register': {
      post: {
        tags: ['Autenticação'],
        summary: 'Registrar novo usuário',
        description:
          'Cria uma conta, vincula à licença informada e envia e-mail de verificação.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['NomeCompleto', 'Email', 'Senha', 'NumeroDeLicenca'],
                properties: {
                  NomeCompleto: { type: 'string', example: 'João Silva' },
                  Email: { type: 'string', format: 'email', example: 'joao@example.com' },
                  Senha: { type: 'string', format: 'password', example: 'senha123' },
                  NumeroDeLicenca: { type: 'string', example: 'HLS-TEST-0001' },
                  NumeroTelefone: { type: 'string', example: '11999990001' },
                  Tipo_Usuario: {
                    type: 'string',
                    enum: ['normal', 'admin'],
                    default: 'normal',
                  },
                },
              },
            },
            'application/json': {
              schema: {
                type: 'object',
                required: ['NomeCompleto', 'Email', 'Senha', 'NumeroDeLicenca'],
                properties: {
                  NomeCompleto: { type: 'string', example: 'João Silva' },
                  Email: { type: 'string', format: 'email', example: 'joao@example.com' },
                  Senha: { type: 'string', format: 'password', example: 'senha123' },
                  NumeroDeLicenca: { type: 'string', example: 'HLS-TEST-0001' },
                  NumeroTelefone: { type: 'string', example: '11999990001' },
                  Tipo_Usuario: { type: 'string', enum: ['normal', 'admin'], default: 'normal' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Usuário criado com sucesso. Aguardando verificação de e-mail.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sucesso: { type: 'boolean', example: true },
                    mensagem: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { description: 'Dados inválidos ou obrigatórios ausentes.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Licença não encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'E-mail já cadastrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/auth/login': {
      post: {
        tags: ['Autenticação'],
        summary: 'Login',
        description: 'Autentica o usuário e retorna um token Bearer + dados de licença.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['Email', 'Senha'],
                properties: {
                  Email: { type: 'string', format: 'email', example: 'joao@example.com' },
                  Senha: { type: 'string', format: 'password', example: 'senha123' },
                },
              },
            },
            'application/json': {
              schema: {
                type: 'object',
                required: ['Email', 'Senha'],
                properties: {
                  Email: { type: 'string', format: 'email', example: 'joao@example.com' },
                  Senha: { type: 'string', format: 'password', example: 'senha123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login efetuado com sucesso.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sucesso: { type: 'boolean', example: true },
                    token: { type: 'string', example: 'Bearer eyJ...' },
                    usuario: { $ref: '#/components/schemas/Usuario' },
                    licensa: { $ref: '#/components/schemas/Licensa' },
                    dataExpiracao: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          401: { description: 'Credenciais inválidas ou conta não verificada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Usuário não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/auth/verificacao': {
      post: {
        tags: ['Autenticação'],
        summary: 'Verificar código de e-mail',
        description: 'Valida o código de 6 dígitos enviado por e-mail após o registro.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['Email', 'code'],
                properties: {
                  Email: { type: 'string', format: 'email', example: 'joao@example.com' },
                  code: { type: 'string', example: '123456' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Conta verificada com sucesso. Retorna token.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, token: { type: 'string' }, usuario: { $ref: '#/components/schemas/Usuario' }, licensa: { $ref: '#/components/schemas/Licensa' } } } } } },
          400: { description: 'Código inválido ou expirado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/auth/reenviar-codigo': {
      post: {
        tags: ['Autenticação'],
        summary: 'Reenviar código de verificação',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['Email'],
                properties: { Email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Código reenviado.' },
          404: { description: 'Usuário não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/auth/logout': {
      post: {
        tags: ['Autenticação'],
        summary: 'Logout',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Sessão encerrada.' },
          401: { description: 'Token inválido.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/auth/usuario': {
      patch: {
        tags: ['Autenticação'],
        summary: 'Atualizar dados do usuário',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  NomeCompleto: { type: 'string' },
                  NumeroTelefone: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Dados atualizados.' },
          401: { description: 'Não autorizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      delete: {
        tags: ['Autenticação'],
        summary: 'Excluir conta do usuário',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Conta excluída.' },
          401: { description: 'Não autorizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/auth/senha': {
      patch: {
        tags: ['Autenticação'],
        summary: 'Alterar senha',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['SenhaAtual', 'NovaSenha'],
                properties: {
                  SenhaAtual: { type: 'string', format: 'password' },
                  NovaSenha: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Senha alterada com sucesso.' },
          401: { description: 'Senha atual incorreta.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/auth/recuperar-senha': {
      post: {
        tags: ['Autenticação'],
        summary: 'Solicitar recuperação de senha',
        description: 'Envia um código de recuperação para o e-mail informado.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['Email'],
                properties: { Email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Código enviado por e-mail.' },
          404: { description: 'Usuário não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/auth/redefinir-senha': {
      post: {
        tags: ['Autenticação'],
        summary: 'Redefinir senha com código',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['Email', 'Code', 'NovaSenha'],
                properties: {
                  Email: { type: 'string', format: 'email' },
                  Code: { type: 'string', example: '123456' },
                  NovaSenha: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Senha redefinida com sucesso.' },
          400: { description: 'Código inválido ou expirado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // LICENÇAS
    // ─────────────────────────────────────────────────────────────────────────
    '/lisensa': {
      post: {
        tags: ['Licenças'],
        summary: 'Criar licença',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['numero_licenca', 'chave', 'empresa_nome', 'validade', 'status'],
                properties: {
                  numero_licenca: { type: 'string', example: 'HLS-TEST-0001' },
                  chave: { type: 'string', example: 'abc123' },
                  empresa_nome: { type: 'string', example: 'Hotel Exemplo Ltda' },
                  validade: { type: 'string', format: 'date', example: '2026-12-31' },
                  status: { type: 'string', enum: ['ativa', 'inativa', 'suspensa'], example: 'ativa' },
                  ativa: { type: 'integer', enum: [0, 1], default: 1 },
                  assinatura_id: { type: 'integer', example: 1 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Licença criada.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, lisensa: { $ref: '#/components/schemas/Licensa' } } } } } },
          409: { description: 'Número de licença ou chave já existe.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/lisensa/autenticar': {
      post: {
        tags: ['Licenças'],
        summary: 'Autenticar licença',
        description: 'Valida número e chave da licença. Retorna o nome do hotel vinculado.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['numero_licenca', 'chave'],
                properties: {
                  numero_licenca: { type: 'string', example: 'HLS-TEST-0001' },
                  chave: { type: 'string', example: 'abc123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Licença autenticada.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sucesso: { type: 'boolean', example: true },
                    mensagem: { type: 'string' },
                    hotelNome: { type: 'string', example: 'Grand Hotel' },
                    numeroLicenca: { type: 'string', example: 'HLS-TEST-0001' },
                    validade: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          401: { description: 'Licença inválida, inativa ou expirada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Licença não encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/lisensa/vincular-hotel': {
      post: {
        tags: ['Licenças'],
        summary: 'Vincular hotel a uma licença',
        description:
          'Cria a assinatura (se necessário) e vincula o hotel à licença informada.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['numero_licenca', 'nome_hotel'],
                properties: {
                  numero_licenca: { type: 'string', example: 'HLS-TEST-0001' },
                  nome_hotel: { type: 'string', example: 'Grand Hotel' },
                  moeda_local: { type: 'string', example: 'BRL' },
                  endereco: { type: 'string', example: 'Rua das Flores, 100' },
                  data_vencimento_assinatura: { type: 'string', format: 'date', example: '2026-12-31' },
                  tipo_assinatura: { type: 'string', example: 'mensal' },
                  valor_mensal: { type: 'number', example: 299.9 },
                  status_assinatura: { type: 'string', example: 'ativa' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Hotel vinculado com sucesso.' },
          404: { description: 'Licença não encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/lisensa/{id}': {
      patch: {
        tags: ['Licenças'],
        summary: 'Editar licença',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'ID da licença' }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  numero_licenca: { type: 'string' },
                  chave: { type: 'string' },
                  empresa_nome: { type: 'string' },
                  validade: { type: 'string', format: 'date' },
                  status: { type: 'string' },
                  ativa: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Licença atualizada.' },
          404: { description: 'Licença não encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      delete: {
        tags: ['Licenças'],
        summary: 'Deletar licença',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Licença deletada.' },
          404: { description: 'Licença não encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/lisensa/{numeroLicensa}': {
      get: {
        tags: ['Licenças'],
        summary: 'Obter detalhes de uma licença',
        parameters: [{ name: 'numeroLicensa', in: 'path', required: true, schema: { type: 'string' }, example: 'HLS-TEST-0001' }],
        responses: {
          200: { description: 'Detalhes da licença.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Licensa' } } } },
          404: { description: 'Licença não encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/lisensa/{numeroLicensa}/hoteis': {
      get: {
        tags: ['Licenças'],
        summary: 'Listar hotéis de uma licença',
        description: 'Retorna todos os hotéis vinculados à licença. Usado na tela de seleção de hotel.',
        parameters: [{ name: 'numeroLicensa', in: 'path', required: true, schema: { type: 'string' }, example: 'HLS-TEST-0001' }],
        responses: {
          200: {
            description: 'Lista de hotéis.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sucesso: { type: 'boolean' },
                    hoteis: { type: 'array', items: { $ref: '#/components/schemas/Hotel' } },
                  },
                },
              },
            },
          },
          404: { description: 'Licença não encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // HOTÉIS
    // ─────────────────────────────────────────────────────────────────────────
    '/hoteis': {
      get: {
        tags: ['Hotéis'],
        summary: 'Listar todos os hotéis',
        responses: {
          200: { description: 'Lista de hotéis.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Hotel' } } } } },
        },
      },
      post: {
        tags: ['Hotéis'],
        summary: 'Criar hotel',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['nome', 'moeda_local'],
                properties: {
                  nome: { type: 'string', example: 'Grand Hotel' },
                  moeda_local: { type: 'string', example: 'BRL' },
                  endereco: { type: 'string', example: 'Rua das Flores, 100' },
                  assinatura_id: { type: 'integer', example: 1 },
                  politica_id: { type: 'integer', example: 2, description: 'ID de uma política já existente para vincular ao hotel' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Hotel criado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Hotel' } } } },
        },
      },
    },

    '/hoteis/{id}': {
      get: {
        tags: ['Hotéis'],
        summary: 'Obter hotel por ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Hotel encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Hotel' } } } },
          404: { description: 'Hotel não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      patch: {
        tags: ['Hotéis'],
        summary: 'Atualizar hotel',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  NomeHotel: { type: 'string' },
                  Endereco: { type: 'string' },
                  MoedaLocal: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Hotel atualizado.' },
          404: { description: 'Hotel não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      delete: {
        tags: ['Hotéis'],
        summary: 'Deletar hotel',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Hotel deletado.' },
          404: { description: 'Hotel não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/hoteis/{id}/vincular-lisensa': {
      post: {
        tags: ['Hotéis'],
        summary: 'Vincular licença a um hotel',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'ID do hotel' }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['numero_licenca'],
                properties: {
                  numero_licenca: { type: 'string', example: 'HLS-TEST-0001' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Licença vinculada ao hotel.' },
          404: { description: 'Hotel ou licença não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/hoteis/{id}/politica': {
      get: {
        tags: ['Política do Hotel'],
        summary: 'Obter política do hotel',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'ID do hotel' }],
        responses: {
          200: { description: 'Política encontrada.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/Politica' } } } } } },
          404: { description: 'Hotel ou política não encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      post: {
        tags: ['Política do Hotel'],
        summary: 'Criar política para o hotel',
        description: 'Cria uma nova política e vincula ao hotel via `politica_id`. Retorna erro 409 se o hotel já possui política.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'ID do hotel' }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  politica_cancelamento: { type: 'string', example: 'Cancelamento gratuito até 48h antes.' },
                  horario_check_in: { type: 'string', example: '14:00' },
                  horario_check_out: { type: 'string', example: '12:00' },
                  carencia_minutos: { type: 'integer', example: 30 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Política criada.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/Politica' } } } } } },
          404: { description: 'Hotel não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'Hotel já possui política.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      patch: {
        tags: ['Política do Hotel'],
        summary: 'Atualizar política do hotel',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'ID do hotel' }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  politica_cancelamento: { type: 'string' },
                  horario_check_in: { type: 'string', example: '14:00' },
                  horario_check_out: { type: 'string', example: '12:00' },
                  carencia_minutos: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Política atualizada.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/Politica' } } } } } },
          400: { description: 'Nenhum campo enviado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Hotel ou política não encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      delete: {
        tags: ['Política do Hotel'],
        summary: 'Deletar política do hotel',
        description: 'Remove a política e desvincula o `politica_id` do hotel.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'ID do hotel' }],
        responses: {
          200: { description: 'Política removida.' },
          404: { description: 'Hotel ou política não encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // HOSPEDES
    // ─────────────────────────────────────────────────────────────────────────
    '/hotel/{hotelId}/hospedes': {
      get: {
        tags: ['Hóspedes'],
        summary: 'Listar hóspedes',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'nome', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'email', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'documento', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: {
            description: 'Lista paginada de hóspedes.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sucesso: { type: 'boolean' },
                    dados: { type: 'array', items: { $ref: '#/components/schemas/Hospede' } },
                    paginacao: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                        totalPages: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Hóspedes'],
        summary: 'Criar hóspede',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['nome'],
                properties: {
                  nome: { type: 'string', example: 'Beatriz Helena Costa' },
                  email: { type: 'string', format: 'email' },
                  telefone: { type: 'string' },
                  cpf: { type: 'string' },
                  passaporte: { type: 'string' },
                  documento: { type: 'string', description: 'Atalho para preencher o CPF (se enviado)' },
                  nacionalidade: { type: 'string' },
                  endereco: { type: 'string' },
                  data_nascimento: { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Hóspede criado.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/Hospede' } } } } } },
          400: { description: 'Dados inválidos.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'CPF/passaporte já cadastrado para outro hóspede.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/hotel/{hotelId}/hospedes/{id}': {
      get: {
        tags: ['Hóspedes'],
        summary: 'Obter hóspede por id',
        description: 'Retorna os dados do hóspede e sua lista de dependentes.',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Hóspede encontrado.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sucesso: { type: 'boolean' },
                    dados: {
                      allOf: [
                        { $ref: '#/components/schemas/Hospede' },
                        {
                          type: 'object',
                          properties: {
                            dependentes: { type: 'array', items: { $ref: '#/components/schemas/Dependente' } },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
          404: { description: 'Hóspede não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      patch: {
        tags: ['Hóspedes'],
        summary: 'Atualizar hóspede',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  nome: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  telefone: { type: 'string' },
                  cpf: { type: 'string' },
                  passaporte: { type: 'string' },
                  documento: { type: 'string' },
                  nacionalidade: { type: 'string' },
                  endereco: { type: 'string' },
                  data_nascimento: { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Hóspede atualizado.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/Hospede' } } } } } },
          400: { description: 'Nenhum campo para atualizar.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'CPF/passaporte já cadastrado para outro hóspede.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Hóspede não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      delete: {
        tags: ['Hóspedes'],
        summary: 'Remover hóspede',
        description: 'Remove o hóspede e seus dependentes.',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Hóspede removido.' },
          404: { description: 'Hóspede não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/hotel/{hotelId}/hospedes/{id}/dependentes': {
      get: {
        tags: ['Dependentes'],
        summary: 'Listar dependentes de um hóspede',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Dependentes listados.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { type: 'array', items: { $ref: '#/components/schemas/Dependente' } } } } } } },
          404: { description: 'Hóspede não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      post: {
        tags: ['Dependentes'],
        summary: 'Criar dependente para hóspede',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['nome'],
                properties: {
                  nome: { type: 'string', example: 'Lucas Schuller Martins' },
                  documento: { type: 'string', example: '442.331.009-44' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Dependente criado.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/Dependente' } } } } } },
          400: { description: 'Dados inválidos.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'Documento já cadastrado para outro dependente do mesmo hóspede.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Hóspede não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/hotel/{hotelId}/hospedes/{id}/dependentes/{dependenteId}': {
      patch: {
        tags: ['Dependentes'],
        summary: 'Atualizar dependente',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'dependenteId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  nome: { type: 'string' },
                  documento: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Dependente atualizado.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/Dependente' } } } } } },
          400: { description: 'Nenhum campo para atualizar.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'Documento já cadastrado para outro dependente do mesmo hóspede.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Dependente não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      delete: {
        tags: ['Dependentes'],
        summary: 'Remover dependente',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'dependenteId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Dependente removido.' },
          404: { description: 'Dependente não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // USUÁRIOS DO HOTEL
    // ─────────────────────────────────────────────────────────────────────────
    '/hotel/{hotelId}/users': {
      get: {
        tags: ['Usuários do Hotel'],
        summary: 'Listar usuários do hotel',
        parameters: [{ name: 'hotelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Lista de usuários do hotel.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { type: 'object', properties: { total: { type: 'integer' }, ativos: { type: 'integer' }, usuarios: { type: 'array', items: { $ref: '#/components/schemas/UsuarioHotel' } } } } } } } } },
          404: { description: 'Hotel não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          401: { description: 'Não autorizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/hotel/{hotelId}/users/{userId}': {
      get: {
        tags: ['Usuários do Hotel'],
        summary: 'Obter usuário do hotel por ID',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Usuário encontrado.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/UsuarioHotel' } } } } } },
          404: { description: 'Usuário não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          401: { description: 'Não autorizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      patch: {
        tags: ['Usuários do Hotel'],
        summary: 'Atualizar usuário do hotel',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  role_id: { type: 'integer', example: 2 },
                  ativo: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Usuário atualizado.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/UsuarioHotel' } } } } } },
          400: { description: 'Dados inválidos.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Usuário não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          401: { description: 'Não autorizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      delete: {
        tags: ['Usuários do Hotel'],
        summary: 'Remover usuário do hotel',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Usuário removido.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, mensagem: { type: 'string' } } } } } },
          404: { description: 'Usuário não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          401: { description: 'Não autorizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/hotel/{hotelId}/users/security-matrix': {
      get: {
        tags: ['Segurança - Matrix'],
        summary: 'Obter security matrix do hotel',
        parameters: [{ name: 'hotelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Security matrix encontrada.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/SecurityMatrix' } } } } } },
          401: { description: 'Não autorizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/hotel/{hotelId}/users/security-matrix/roles/{roleId}': {
      patch: {
        tags: ['Segurança - Matrix'],
        summary: 'Atualizar permissões de uma role',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'roleId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['permissao_ids'],
                properties: {
                  permissao_ids: { type: 'array', items: { type: 'integer' }, example: [1, 2, 3] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Permissões da role atualizadas.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/SecurityMatrix' } } } } } },
          400: { description: 'Dados inválidos.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Role não encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          401: { description: 'Não autorizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // REFEIÇÕES DO HOTEL
    // ─────────────────────────────────────────────────────────────────────────
    '/hoteis/{id}/refeicoes': {
      get: {
        tags: ['Refeições do Hotel'],
        summary: 'Listar refeições do hotel',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID do hotel' }],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Lista de refeições.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { type: 'array', items: { $ref: '#/components/schemas/Refeicao' } } } } } } },
          401: { description: 'Não autorizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      post: {
        tags: ['Refeições do Hotel'],
        summary: 'Criar refeição',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID do hotel' }],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nome', 'horario_inicio', 'horario_fim'],
                properties: {
                  nome: { type: 'string', example: 'Café da Manhã' },
                  horario_inicio: { type: 'string', example: '07:00' },
                  horario_fim: { type: 'string', example: '10:00' },
                  habilitada: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Refeição criada.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/Refeicao' } } } } } },
          400: { description: 'Dados inválidos.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'Refeição com esse nome já existe para este hotel.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          401: { description: 'Não autorizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/hoteis/{id}/refeicoes/{refeicaoId}': {
      patch: {
        tags: ['Refeições do Hotel'],
        summary: 'Atualizar refeição',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID do hotel' },
          { name: 'refeicaoId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID da refeição' },
        ],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nome: { type: 'string', example: 'Café da Manhã' },
                  horario_inicio: { type: 'string', example: '07:00' },
                  horario_fim: { type: 'string', example: '10:00' },
                  habilitada: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Refeição atualizada.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/Refeicao' } } } } } },
          400: { description: 'Dados inválidos.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Refeição não encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          401: { description: 'Não autorizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      delete: {
        tags: ['Refeições do Hotel'],
        summary: 'Deletar refeição',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID do hotel' },
          { name: 'refeicaoId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID da refeição' },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Refeição deletada.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, mensagem: { type: 'string' } } } } } },
          404: { description: 'Refeição não encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          401: { description: 'Não autorizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // POLÍTICAS E HORÁRIOS DO HOTEL
    // ─────────────────────────────────────────────────────────────────────────
    '/hoteis/{id}/policies-timing': {
      get: {
        tags: ['Políticas e Horários'],
        summary: 'Obter políticas e horários do hotel',
        description: 'Retorna política de cancelamento e todas as refeições do hotel.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID do hotel' }],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Políticas e horários encontrados.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/PoliciesTiming' } } } } } },
          401: { description: 'Não autorizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      put: {
        tags: ['Políticas e Horários'],
        summary: 'Atualizar políticas e horários do hotel',
        description: 'Salva a política de cancelamento e todas as refeições do hotel atomicamente.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'ID do hotel' }],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['politica', 'refeicoes'],
                properties: {
                  politica: {
                    type: 'object',
                    properties: {
                      politica_cancelamento: { type: 'string', example: 'Cancelamento gratuito até 48h antes.' },
                      horario_check_in: { type: 'string', example: '14:00' },
                      horario_check_out: { type: 'string', example: '12:00' },
                      carencia_minutos: { type: 'integer', example: 60 },
                    },
                  },
                  refeicoes: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['nome', 'horario_inicio', 'horario_fim'],
                      properties: {
                        nome: { type: 'string', example: 'Café da Manhã' },
                        horario_inicio: { type: 'string', example: '07:00' },
                        horario_fim: { type: 'string', example: '10:00' },
                        habilitada: { type: 'boolean', example: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Políticas e horários atualizados.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/PoliciesTiming' } } } } } },
          400: { description: 'Dados inválidos.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          401: { description: 'Não autorizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ESTRUTURA DO HOTEL (ANDARES, CATEGORIAS E QUARTOS)
    // ─────────────────────────────────────────────────────────────────────────
    '/hotel/{hotelId}/arquitetura': {
      get: {
        tags: ['Estrutura do Hotel'],
        summary: 'Obter arquitetura do hotel',
        description: 'Retorna métricas e a hierarquia de andares com seus quartos para renderização da tela de arquitetura.',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Arquitetura retornada com sucesso.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sucesso: { type: 'boolean', example: true },
                    dados: { $ref: '#/components/schemas/ArquiteturaHotel' },
                  },
                },
              },
            },
          },
          404: { description: 'Hotel não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/hotel/{hotelId}/andares': {
      get: {
        tags: ['Estrutura do Hotel'],
        summary: 'Listar andares do hotel',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Lista de andares.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { type: 'array', items: { $ref: '#/components/schemas/Andar' } } } } } } },
          404: { description: 'Hotel não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      post: {
        tags: ['Estrutura do Hotel'],
        summary: 'Criar andar',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['numero'],
                properties: {
                  numero: { type: 'integer', example: 1 },
                  nome: { type: 'string', example: 'Primeiro Pavimento' },
                },
              },
            },
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['numero'],
                properties: {
                  numero: { type: 'integer', example: 1 },
                  nome: { type: 'string', example: 'Primeiro Pavimento' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Andar criado.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/Andar' } } } } } },
          400: { description: 'Campo obrigatório ausente.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Hotel não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'Já existe andar com este número.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/hotel/{hotelId}/andares/{andarId}': {
      get: {
        tags: ['Estrutura do Hotel'],
        summary: 'Obter andar por ID',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'andarId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Andar encontrado.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/Andar' } } } } } },
          404: { description: 'Hotel ou andar não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      patch: {
        tags: ['Estrutura do Hotel'],
        summary: 'Atualizar andar',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'andarId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  numero: { type: 'integer', example: 2 },
                  nome: { type: 'string', example: 'Segundo Pavimento' },
                },
              },
            },
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  numero: { type: 'integer', example: 2 },
                  nome: { type: 'string', example: 'Segundo Pavimento' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Andar atualizado.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/Andar' } } } } } },
          400: { description: 'Nenhum campo para atualizar.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Hotel ou andar não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'Já existe andar com este número.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      delete: {
        tags: ['Estrutura do Hotel'],
        summary: 'Remover andar',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'andarId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Andar removido.' },
          404: { description: 'Hotel ou andar não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'Andar possui quartos vinculados.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/hotel/{hotelId}/categorias-quarto': {
      get: {
        tags: ['Estrutura do Hotel'],
        summary: 'Listar categorias de quarto do hotel',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Lista de categorias.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { type: 'array', items: { $ref: '#/components/schemas/CategoriaQuarto' } } } } } } },
          404: { description: 'Hotel não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      post: {
        tags: ['Estrutura do Hotel'],
        summary: 'Criar categoria de quarto',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nome', 'capacidade', 'preco_diaria'],
                properties: {
                  nome: { type: 'string', example: 'Deluxe' },
                  descricao: { type: 'string', example: 'Premium confort' },
                  capacidade: { type: 'integer', example: 2 },
                  preco_diaria: { type: 'number', format: 'float', example: 199.9 },
                },
              },
            },
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['nome', 'capacidade', 'preco_diaria'],
                properties: {
                  nome: { type: 'string', example: 'Deluxe' },
                  descricao: { type: 'string', example: 'Premium confort' },
                  capacidade: { type: 'integer', example: 2 },
                  preco_diaria: { type: 'number', format: 'float', example: 199.9 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Categoria criada.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/CategoriaQuarto' } } } } } },
          400: { description: 'Dados obrigatórios ausentes.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Hotel não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'Já existe categoria com este nome.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/hotel/{hotelId}/categorias-quarto/{categoriaId}': {
      get: {
        tags: ['Estrutura do Hotel'],
        summary: 'Obter categoria de quarto por ID',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'categoriaId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Categoria encontrada.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/CategoriaQuarto' } } } } } },
          404: { description: 'Hotel ou categoria não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      patch: {
        tags: ['Estrutura do Hotel'],
        summary: 'Atualizar categoria de quarto',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'categoriaId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nome: { type: 'string', example: 'Standard' },
                  descricao: { type: 'string', example: 'Executivo basic' },
                  capacidade: { type: 'integer', example: 2 },
                  preco_diaria: { type: 'number', format: 'float', example: 149.9 },
                },
              },
            },
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  nome: { type: 'string', example: 'Standard' },
                  descricao: { type: 'string', example: 'Executivo basic' },
                  capacidade: { type: 'integer', example: 2 },
                  preco_diaria: { type: 'number', format: 'float', example: 149.9 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Categoria atualizada.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/CategoriaQuarto' } } } } } },
          400: { description: 'Nenhum campo para atualizar.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Hotel ou categoria não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'Já existe categoria com este nome.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      delete: {
        tags: ['Estrutura do Hotel'],
        summary: 'Remover categoria de quarto',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'categoriaId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Categoria removida.' },
          404: { description: 'Hotel ou categoria não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'Categoria possui quartos vinculados.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/hotel/{hotelId}/quartos': {
      get: {
        tags: ['Estrutura do Hotel'],
        summary: 'Listar quartos do hotel',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'andar_id', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
          { name: 'categoria_id', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
          { name: 'status', in: 'query', required: false, schema: { type: 'string', example: 'livre' } },
        ],
        responses: {
          200: { description: 'Lista de quartos.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { type: 'array', items: { $ref: '#/components/schemas/Quarto' } } } } } } },
          404: { description: 'Hotel não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      post: {
        tags: ['Estrutura do Hotel'],
        summary: 'Criar quarto',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['andar_id', 'categoria_id', 'numero'],
                properties: {
                  andar_id: { type: 'string', format: 'uuid' },
                  categoria_id: { type: 'string', format: 'uuid' },
                  numero: { type: 'string', example: '101' },
                  descricao: { type: 'string', example: 'Cama king e vista mar' },
                  capacidade: { type: 'integer', example: 2, description: 'Opcional. Se ausente, usa capacidade da categoria.' },
                  quantidade_camas: { type: 'integer', example: 1 },
                  status: { type: 'string', example: 'livre' },
                },
              },
            },
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['andar_id', 'categoria_id', 'numero'],
                properties: {
                  andar_id: { type: 'string', format: 'uuid' },
                  categoria_id: { type: 'string', format: 'uuid' },
                  numero: { type: 'string', example: '101' },
                  descricao: { type: 'string', example: 'Cama king e vista mar' },
                  capacidade: { type: 'integer', example: 2, description: 'Opcional. Se ausente, usa capacidade da categoria.' },
                  quantidade_camas: { type: 'integer', example: 1 },
                  status: { type: 'string', example: 'livre' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Quarto criado.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/Quarto' } } } } } },
          400: { description: 'Dados obrigatórios ausentes.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Hotel, andar ou categoria não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'Já existe quarto com este número no hotel.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    '/hotel/{hotelId}/quartos/{quartoId}': {
      get: {
        tags: ['Estrutura do Hotel'],
        summary: 'Obter quarto por ID',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'quartoId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Quarto encontrado.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/Quarto' } } } } } },
          404: { description: 'Hotel ou quarto não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      patch: {
        tags: ['Estrutura do Hotel'],
        summary: 'Atualizar quarto',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'quartoId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  andar_id: { type: 'string', format: 'uuid' },
                  categoria_id: { type: 'string', format: 'uuid' },
                  numero: { type: 'string', example: '102' },
                  descricao: { type: 'string', example: 'Twin Beds e vista lateral' },
                  capacidade: { type: 'integer', example: 2 },
                  quantidade_camas: { type: 'integer', nullable: true, example: 2 },
                  status: { type: 'string', example: 'ocupado' },
                },
              },
            },
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  andar_id: { type: 'string', format: 'uuid' },
                  categoria_id: { type: 'string', format: 'uuid' },
                  numero: { type: 'string', example: '102' },
                  descricao: { type: 'string', example: 'Twin Beds e vista lateral' },
                  capacidade: { type: 'integer', example: 2 },
                  quantidade_camas: { type: 'integer', nullable: true, example: 2 },
                  status: { type: 'string', example: 'ocupado' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Quarto atualizado.', content: { 'application/json': { schema: { type: 'object', properties: { sucesso: { type: 'boolean' }, dados: { $ref: '#/components/schemas/Quarto' } } } } } },
          400: { description: 'Nenhum campo para atualizar.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Hotel, quarto, andar ou categoria não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'Já existe quarto com este número no hotel.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      delete: {
        tags: ['Estrutura do Hotel'],
        summary: 'Remover quarto',
        parameters: [
          { name: 'hotelId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'quartoId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Quarto removido.' },
          404: { description: 'Hotel ou quarto não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // HEALTH
    // ─────────────────────────────────────────────────────────────────────────
    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Health check',
        description: 'Verifica se a API está no ar.',
        responses: {
          200: { description: 'API operacional.', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } } },
        },
      },
    },
  },
};

export default swaggerDefinition;
