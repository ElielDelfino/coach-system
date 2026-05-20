const pool = require('../config/db');

async function findCardio({ tipo, intensidade, ativo = true }) {
  const params = [];
  const conditions = [`c.ativo = $${params.push(ativo)}`];
  if (tipo) conditions.push(`c.tipo ILIKE $${params.push(`%${tipo}%`)}`);
  if (intensidade) conditions.push(`c.intensidade = $${params.push(intensidade)}`);

  const where = `WHERE ${conditions.join(' AND ')}`;
  const { rows } = await pool.query(
    `SELECT id, tipo, intensidade, duracao_min, gasto_calorico_estimado,
            inclinacao, velocidade, ativo
     FROM cardio AS c ${where} ORDER BY c.tipo`,
    params
  );
  return { data: rows, total: rows.length };
}

async function findCardioById(id) {
  const { rows } = await pool.query(`SELECT * FROM cardio WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function createCardio(d) {
  const { rows } = await pool.query(
    `INSERT INTO cardio (tipo, intensidade, duracao_min, gasto_calorico_estimado, inclinacao, velocidade, observacoes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, tipo, created_at`,
    [d.tipo, d.intensidade || null, d.duracao_min || null,
     d.gasto_calorico_estimado || null, d.inclinacao || null,
     d.velocidade || null, d.observacoes || null]
  );
  return rows[0];
}

async function updateCardio(id, d) {
  const allowed = ['tipo','intensidade','duracao_min','gasto_calorico_estimado','inclinacao','velocidade','observacoes'];
  const keys = allowed.filter((k) => d[k] !== undefined);
  if (!keys.length) return 0;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rowCount } = await pool.query(
    `UPDATE cardio SET ${sets} WHERE id = $1`, [id, ...keys.map((k) => d[k])]
  );
  return rowCount;
}

async function setCardioAtivo(id, ativo) {
  const { rowCount } = await pool.query(
    `UPDATE cardio SET ativo = $2 WHERE id = $1`, [id, ativo]
  );
  return rowCount;
}

module.exports = { findCardio, findCardioById, createCardio, updateCardio, setCardioAtivo };
