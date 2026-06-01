import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import swaggerUi from 'swagger-ui-express';
import { router } from './routes.js';
import swaggerDefinition from '../swagger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Configurar CORS para refletir a origem e permitir credenciais (cookies)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/pages', express.static(path.join(__dirname, '..', 'public', 'pages')));

// Documentação Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDefinition));

// Usar as rotas
app.use('/', router);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Erro:', err.message);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

let startPromise = null;

async function startServer(port = process.env.PORT || 3000) {
  if (httpServer.listening) {
    return httpServer;
  }

  if (!startPromise) {
    startPromise = new Promise((resolve, reject) => {
      const onListening = () => {
        httpServer.off('error', onError);
        resolve(httpServer);
      };

      const onError = (error) => {
        httpServer.off('listening', onListening);
        startPromise = null;
        reject(error);
      };

      httpServer.once('listening', onListening);
      httpServer.once('error', onError);
      httpServer.listen(port, () => {
        console.log(`Servidor rodando em http://localhost:${port}`);
      });
    });
  }

  return startPromise;
}

async function stopServer() {
  if (!httpServer.listening) {
    return;
  }

  await new Promise((resolve, reject) => {
    httpServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  startPromise = null;
}

const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  startServer().catch((error) => {
    console.error('Falha ao iniciar o servidor:', error);
    process.exitCode = 1;
  });

  const shutdown = async () => {
    try {
      await stopServer();
    } catch (error) {
      console.error('Falha ao encerrar o servidor:', error);
    }
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

export { app, io, httpServer, startServer, stopServer };


