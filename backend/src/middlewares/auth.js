const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const pool = require('../config/db');

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

    if (decoded.role === 'aluno') {
      const { rows } = await pool.query(`
        SELECT
          a.ativo,
          a.dias_tolerancia,
          EXISTS (
            SELECT 1 FROM faturas
            WHERE aluno_id = a.id
            AND status = 'pendente'
            AND data_vencimento + (a.dias_tolerancia || ' days')::interval < NOW()
          ) as inadimplente
        FROM alunos a WHERE a.user_id = $1
      `, [decoded.id]);

      const aluno = rows[0];
      if (!aluno || !aluno.ativo) {
        return res.status(403).json({ message: 'Conta inativa.', code: 'INATIVO' });
      }
      if (aluno.inadimplente) {
        return res.status(403).json({
          message: 'Acesso bloqueado por inadimplência. Entre em contato com seu professor.',
          code: 'INADIMPLENTE'
        });
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
}

module.exports = auth;
