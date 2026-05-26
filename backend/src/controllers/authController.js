const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user');
const redis = require('../config/redis');
const pool = require('../config/db');

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'Strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function login(req, res) {
  try {
    const { email, senha } = req.body;

    const user = await userModel.findByEmail(email);
    if (!user) return res.status(401).json({ message: 'Credenciais inválidas.' });
    if (!user.ativo) return res.status(403).json({ message: 'Conta desativada.' });

    const senhaOk = await bcrypt.compare(senha, user.senha_hash);
    if (!senhaOk) return res.status(401).json({ message: 'Credenciais inválidas.' });

    const payload = { id: user.id, email: user.email, role: user.role };

    if (user.role === 'aluno') {
      const { rows } = await pool.query(
        `SELECT id FROM alunos WHERE user_id = $1`, [user.id]
      );
      if (rows[0]) payload.aluno_id = rows[0].id;
    }

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
    return res.json({ accessToken, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    req.log.error({ err }, 'auth/login');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function refresh(req, res) {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: 'Refresh token ausente.' });

    const blacklisted = await redis.exists(`blacklist:${token}`);
    if (blacklisted) return res.status(401).json({ message: 'Token inválido.' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: 'Refresh token inválido ou expirado.' });
    }

    const userBlacklisted = await redis.exists(`blacklist:user:${decoded.id}`);
    if (userBlacklisted) return res.status(401).json({ message: 'Conta desativada.' });

    const payload = { id: decoded.id, email: decoded.email, role: decoded.role };
    if (decoded.aluno_id) payload.aluno_id = decoded.aluno_id;

    const accessToken  = jwt.sign(payload, process.env.JWT_SECRET,         { expiresIn: '1h' });
    const newRefresh   = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Rotação: invalida o refresh token usado para que não possa ser reutilizado
    const oldTtl = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 7 * 24 * 3600;
    if (oldTtl > 0) await redis.set(`blacklist:${token}`, '1', 'EX', oldTtl);

    res.cookie('refreshToken', newRefresh, COOKIE_OPTS);
    return res.json({ accessToken });
  } catch (err) {
    req.log.error({ err }, 'auth/refresh');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function logout(req, res) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const ops = [];

    // Invalida access token pelo tempo restante até expirar
    const accessToken = req.token;
    if (accessToken) {
      const decoded = jwt.decode(accessToken);
      const ttl = decoded?.exp ? decoded.exp - now : 3600;
      if (ttl > 0) ops.push(redis.set(`blacklist:${accessToken}`, '1', 'EX', ttl));
    }

    // Invalida refresh token pelo tempo restante (7d máx)
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const ttl = decoded.exp ? decoded.exp - now : 7 * 24 * 3600;
        if (ttl > 0) ops.push(redis.set(`blacklist:${refreshToken}`, '1', 'EX', ttl));
      } catch {
        // token já expirado ou inválido — não precisa invalidar
      }
    }

    await Promise.all(ops);

    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'Strict' });
    return res.json({ message: 'Sessão encerrada com sucesso.' });
  } catch (err) {
    req.log.error({ err }, 'auth/logout');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = { login, refresh, logout };
