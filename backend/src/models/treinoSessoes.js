const pool = require('../config/db');

async function iniciarSessao(aluno_id, treino_id) {
  const { rows } = await pool.query(
    `INSERT INTO treino_sessoes (aluno_id, treino_id)
     VALUES ($1, $2)
     RETURNING id, iniciado_em`,
    [aluno_id, treino_id]
  );
  return rows[0];
}

async function concluirSessao(id, aluno_id, { duracao_seg, exercicios, observacao }) {
  const { rowCount, rows } = await pool.query(
    `UPDATE treino_sessoes
        SET concluido_em = NOW(),
            duracao_seg  = $3,
            exercicios   = $4::jsonb,
            observacao   = $5
      WHERE id = $1 AND aluno_id = $2
      RETURNING id, treino_id, iniciado_em, concluido_em, duracao_seg`,
    [id, aluno_id, duracao_seg ?? null, JSON.stringify(exercicios ?? []), observacao ?? null]
  );
  return rowCount ? rows[0] : null;
}

async function ultimaSessaoConcluida(aluno_id) {
  const { rows } = await pool.query(
    `SELECT id, treino_id, concluido_em
       FROM treino_sessoes
      WHERE aluno_id = $1 AND concluido_em IS NOT NULL
      ORDER BY concluido_em DESC
      LIMIT 1`,
    [aluno_id]
  );
  return rows[0] || null;
}

async function sessoesNaSemana(aluno_id) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total
       FROM treino_sessoes
      WHERE aluno_id = $1
        AND concluido_em IS NOT NULL
        AND concluido_em >= date_trunc('week', NOW())`,
    [aluno_id]
  );
  return rows[0]?.total || 0;
}

module.exports = {
  iniciarSessao,
  concluirSessao,
  ultimaSessaoConcluida,
  sessoesNaSemana,
};
