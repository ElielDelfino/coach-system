const pool = require('../config/db');

async function createSubstituto(refeicao_item_id, alimento_id, quantidade_g) {
  const { rows } = await pool.query(
    `INSERT INTO refeicao_item_substitutos (refeicao_item_id, alimento_id, quantidade_g)
     VALUES ($1,$2,$3) RETURNING id, alimento_id, quantidade_g`,
    [refeicao_item_id, alimento_id, quantidade_g]
  );
  return rows[0];
}

async function deleteSubstituto(substitutoId) {
  const { rowCount } = await pool.query(
    `DELETE FROM refeicao_item_substitutos WHERE id = $1`, [substitutoId]
  );
  return rowCount;
}

module.exports = { createSubstituto, deleteSubstituto };
