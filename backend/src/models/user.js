const pool = require('../config/db');

async function findByEmail(email) {
  const { rows } = await pool.query(
    `SELECT id, email, nome, senha_hash, role, ativo FROM users WHERE email = $1`,
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, email, nome, role, ativo FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

module.exports = { findByEmail, findById };
