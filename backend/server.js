require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const migrate = require('./src/config/migrate');
const auth = require('./src/middlewares/auth');
const authorize = require('./src/middlewares/authorize');

const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin');
const alunoRoutes = require('./src/routes/aluno');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

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
  app.listen(PORT, () => console.log(`[server] rodando na porta ${PORT}`));
}

start().catch((err) => {
  console.error('[server] Falha ao iniciar:', err.message);
  process.exit(1);
});
