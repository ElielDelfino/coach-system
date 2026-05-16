const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AS existe
    `);

    if (!rows[0].existe) {
      const sql = fs.readFileSync(
        path.join(__dirname, '../../docs/schema.sql'),
        'utf-8'
      );
      await client.query(sql);
      console.log('[migrate] Schema aplicado com sucesso.');
    } else {
      // Migrações idempotentes — aplica sempre
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS nome TEXT`);
      await client.query(`
        ALTER TABLE alunos
          ADD COLUMN IF NOT EXISTS peso_atual_kg      NUMERIC(5,2),
          ADD COLUMN IF NOT EXISTS altura_cm          NUMERIC(5,2),
          ADD COLUMN IF NOT EXISTS percentual_gordura NUMERIC(5,2),
          ADD COLUMN IF NOT EXISTS peso_magro_kg      NUMERIC(5,2),
          ADD COLUMN IF NOT EXISTS peso_gordo_kg      NUMERIC(5,2)
      `);
      console.log('[migrate] Migrações incrementais aplicadas.');
    }
  } finally {
    client.release();
  }
}

module.exports = migrate;
