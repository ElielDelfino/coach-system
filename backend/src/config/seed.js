const bcrypt = require('bcryptjs');
const pool = require('./db');

async function seed() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
    );

    if (rows.length > 0) {
      console.log('[seed] Admin já existe.');
      return;
    }

    const senhaHash = await bcrypt.hash('Coach@2025', 12);
    await client.query(
      `INSERT INTO users (email, nome, senha_hash, role, ativo)
       VALUES ($1, $2, $3, 'admin', true)`,
      ['admin@coach.com', 'Administrador', senhaHash]
    );

    console.log('[seed] Admin padrão criado.');
  } finally {
    client.release();
  }
}

module.exports = seed;
