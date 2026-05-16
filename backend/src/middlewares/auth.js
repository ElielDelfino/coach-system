const jwt = require('jsonwebtoken');
const redis = require('../config/redis');

async function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token de acesso ausente.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const blacklisted = await redis.exists(`blacklist:${token}`);
    if (blacklisted) {
      return res.status(401).json({ message: 'Token inválido ou expirado.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userBlacklisted = await redis.exists(`blacklist:user:${decoded.id}`);
    if (userBlacklisted) {
      return res.status(401).json({ message: 'Conta desativada.' });
    }

    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
}

module.exports = auth;
