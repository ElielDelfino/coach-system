const pool = require('../config/db');

async function registrarCheckinRefeicao(aluno_id, refeicao_id, data) {
  const { rows } = await pool.query(
    `INSERT INTO refeicao_checkins (aluno_id, refeicao_id, data)
     VALUES ($1, $2, $3)
     ON CONFLICT (aluno_id, refeicao_id, data) DO NOTHING
     RETURNING id, aluno_id, refeicao_id, data, created_at`,
    [aluno_id, refeicao_id, data]
  );
  if (rows[0]) return rows[0];
  const existente = await pool.query(
    `SELECT id, aluno_id, refeicao_id, data, created_at
       FROM refeicao_checkins
      WHERE aluno_id = $1 AND refeicao_id = $2 AND data = $3`,
    [aluno_id, refeicao_id, data]
  );
  return existente.rows[0] || null;
}

async function removerCheckinRefeicao(aluno_id, refeicao_id, data) {
  const { rowCount } = await pool.query(
    `DELETE FROM refeicao_checkins
      WHERE aluno_id = $1 AND refeicao_id = $2 AND data = $3`,
    [aluno_id, refeicao_id, data]
  );
  return rowCount > 0;
}

async function listarCheckinsDia(aluno_id, data) {
  const { rows } = await pool.query(
    `SELECT refeicao_id
       FROM refeicao_checkins
      WHERE aluno_id = $1 AND data = $2`,
    [aluno_id, data]
  );
  return rows.map((r) => r.refeicao_id);
}

async function checkinsNaSemana(aluno_id) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total
       FROM refeicao_checkins
      WHERE aluno_id = $1
        AND data >= date_trunc('week', NOW())::date`,
    [aluno_id]
  );
  return rows[0]?.total || 0;
}

module.exports = {
  registrarCheckinRefeicao,
  removerCheckinRefeicao,
  listarCheckinsDia,
  checkinsNaSemana,
};
