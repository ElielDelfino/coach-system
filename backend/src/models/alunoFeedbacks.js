const pool = require('../config/db');

async function upsertFeedback(aluno_id, semana_inicio, dados) {
  const {
    texto,
    peso_kg = null,
    percentual_gordura = null,
    cintura_cm = null,
    humor = null,
    energia = null,
    dificuldade = null,
  } = dados;

  const { rows } = await pool.query(
    `INSERT INTO aluno_feedbacks
      (aluno_id, semana_inicio, texto, peso_kg, percentual_gordura, cintura_cm, humor, energia, dificuldade)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (aluno_id, semana_inicio)
     DO UPDATE SET
       texto              = EXCLUDED.texto,
       peso_kg            = EXCLUDED.peso_kg,
       percentual_gordura = EXCLUDED.percentual_gordura,
       cintura_cm         = EXCLUDED.cintura_cm,
       humor              = EXCLUDED.humor,
       energia            = EXCLUDED.energia,
       dificuldade        = EXCLUDED.dificuldade,
       lido_pelo_coach    = false,
       lido_em            = NULL
     RETURNING *`,
    [aluno_id, semana_inicio, texto, peso_kg, percentual_gordura, cintura_cm, humor, energia, dificuldade]
  );
  return rows[0];
}

async function listarFeedbacksAluno(aluno_id, limit = 10) {
  const { rows } = await pool.query(
    `SELECT * FROM aluno_feedbacks
      WHERE aluno_id = $1
      ORDER BY semana_inicio DESC
      LIMIT $2`,
    [aluno_id, limit]
  );
  return rows;
}

async function listarFeedbacksAdmin(aluno_id, limit = 50) {
  const { rows } = await pool.query(
    `SELECT * FROM aluno_feedbacks
      WHERE aluno_id = $1
      ORDER BY semana_inicio DESC
      LIMIT $2`,
    [aluno_id, limit]
  );
  return rows;
}

async function marcarFeedbackLido(feedback_id) {
  const { rowCount, rows } = await pool.query(
    `UPDATE aluno_feedbacks
        SET lido_pelo_coach = true,
            lido_em         = NOW()
      WHERE id = $1
      RETURNING *`,
    [feedback_id]
  );
  return rowCount ? rows[0] : null;
}

async function contarNaoLidos() {
  const { rows } = await pool.query(
    `SELECT aluno_id, COUNT(*)::int AS total
       FROM aluno_feedbacks
      WHERE lido_pelo_coach = false
      GROUP BY aluno_id`
  );
  return rows;
}

async function contarNaoLidosTotal() {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total
       FROM aluno_feedbacks
      WHERE lido_pelo_coach = false`
  );
  return rows[0]?.total || 0;
}

module.exports = {
  upsertFeedback,
  listarFeedbacksAluno,
  listarFeedbacksAdmin,
  marcarFeedbackLido,
  contarFeedbacksNaoLidos: contarNaoLidos,
  contarFeedbacksNaoLidosTotal: contarNaoLidosTotal,
};
