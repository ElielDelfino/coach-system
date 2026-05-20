require('dotenv').config();
require('./src/config/env'); // valida env vars — derruba o boot se faltar algo crítico

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const migrate = require('./src/config/migrate');
const seed = require('./src/config/seed');
const auth = require('./src/middlewares/auth');
const authorize = require('./src/middlewares/authorize');

const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin');
const alunoRoutes = require('./src/routes/aluno');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
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

app.use((err, req, res, _next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ message: 'Erro interno do servidor.' });
});

async function start() {
  await migrate();
  await seed();
  app.listen(PORT, () => console.log(`[server] rodando na porta ${PORT}`));
}

start().catch((err) => {
  console.error('[server] Falha ao iniciar:', err.message);
  process.exit(1);
});
