require('dotenv').config();
require('./src/config/env'); // valida env vars — derruba o boot se faltar algo crítico

// Sentry deve ser inicializado antes de qualquer outro import
const Sentry = require('./src/config/sentry');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http');
const { randomUUID } = require('crypto');

const logger = require('./src/config/logger');

const migrate = require('./src/config/migrate');
const seed = require('./src/config/seed');
const seedAlimentos = require('./src/config/seedAlimentos');
const auth = require('./src/middlewares/auth');
const authorize = require('./src/middlewares/authorize');

const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin');
const alunoRoutes = require('./src/routes/aluno');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(
  pinoHttp({
    logger,
    genReqId: () => randomUUID(),
    customLogLevel: (_req, res) => {
      if (res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  })
);

// CSP da API: responde só JSON — nenhum recurso externo deve ser carregado
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas requisições. Aguarde antes de tentar novamente.' },
});

app.use('/api/auth/login', loginLimiter);
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/admin', auth, authorize('admin'), adminRoutes);
app.use('/api/aluno', auth, authorize('aluno'), alunoRoutes);

app.use((req, res) => res.status(404).json({ message: 'Rota não encontrada.' }));

// Sentry captura exceções não tratadas antes do handler genérico
Sentry.setupExpressErrorHandler(app);

app.use((err, req, res, _next) => {
  req.log.error({ err }, 'unhandled error');
  res.status(500).json({ message: 'Erro interno do servidor.' });
});

async function start() {
  await migrate();
  await seed();
  await seedAlimentos();
  app.listen(PORT, () => logger.info({ port: PORT }, 'server running'));
}

start().catch((err) => {
  logger.error({ err }, 'server failed to start');
  process.exit(1);
});
