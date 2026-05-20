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
    console.error('[auth/login]', err);
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

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    return res.json({ accessToken });
  } catch (err) {
    console.error('[auth/refresh]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function logout(req, res) {
  try {
    const token = req.token;
    if (token) {
      const decoded = jwt.decode(token);
      const ttl = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 3600;
      if (ttl > 0) await redis.set(`blacklist:${token}`, '1', 'EX', ttl);
    }

    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'Strict' });
    return res.json({ message: 'Sessão encerrada com sucesso.' });
  } catch (err) {
    console.error('[auth/logout]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = { login, refresh, logout };
