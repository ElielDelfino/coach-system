const pool = require('../config/db');

async function findSuplementacao(protocolo_id) {
  const { rows } = await pool.query(
    `SELECT id, nome_suplemento, dose, horario, observacao, ordem
     FROM suplementacao WHERE protocolo_id = $1 ORDER BY ordem`,
    [protocolo_id]
  );
  return rows;
}

async function createSuplemento(protocolo_id, d) {
  const { rows } = await pool.query(
    `INSERT INTO suplementacao (protocolo_id, nome_suplemento, dose, horario, observacao, ordem)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, nome_suplemento`,
    [protocolo_id, d.nome_suplemento, d.dose, d.horario || null,
     d.observacao || null, d.ordem ?? 0]
  );
  return rows[0];
}

async function updateSuplemento(id, d) {
  const allowed = ['nome_suplemento','dose','horario','observacao','ordem'];
  const keys = allowed.filter((k) => d[k] !== undefined);
  if (!keys.length) return 0;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rowCount } = await pool.query(
    `UPDATE suplementacao SET ${sets} WHERE id = $1`, [id, ...keys.map((k) => d[k])]
  );
  return rowCount;
}

async function deleteSuplemento(id) {
  const { rowCount } = await pool.query(`DELETE FROM suplementacao WHERE id = $1`, [id]);
  return rowCount;
}

module.exports = { findSuplementacao, createSuplemento, updateSuplemento, deleteSuplemento };
