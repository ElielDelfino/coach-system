const bcrypt = require('bcryptjs');
const pool = require('./db');
const { BOOT_LOCK_KEY } = require('./migrate');
const logger = require('./logger');

async function seed() {
  const client = await pool.connect();
  let locked = false;
  try {
    await client.query('SELECT pg_advisory_lock($1)', [BOOT_LOCK_KEY]);
    locked = true;

    const { rows } = await client.query(
      `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
    );

    if (rows.length > 0) {
      logger.info('seed: admin already exists');
      return;
    }

    const email = process.env.ADMIN_EMAIL;
    const senha = process.env.ADMIN_PASSWORD;
    if (!email || !senha) {
      logger.warn('seed: ADMIN_EMAIL ou ADMIN_PASSWORD não definidos — admin não criado');
      return;
    }

    const senhaHash = await bcrypt.hash(senha, 12);
    await client.query(
      `INSERT INTO users (email, nome, senha_hash, role, ativo)
       VALUES ($1, $2, $3, 'admin', true)`,
      [email, 'Administrador', senhaHash]
    );

    logger.info({ email }, 'seed: default admin created');
  } finally {
    if (locked) {
      try {
        await client.query('SELECT pg_advisory_unlock($1)', [BOOT_LOCK_KEY]);
      } catch (err) {
        logger.error({ err }, 'seed: failed to release advisory lock');
      }
    }
    client.release();
  }
}

module.exports = seed;
