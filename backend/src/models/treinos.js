const pool = require('../config/db');
const { decorarExercicio } = require('./_shared');

// findTreinos agrega treino_exercicios para o front (leitura cross-tabela cujo ponto
// de entrada é o treino). duplicarTreino copia em cascata treino → exercícios numa
// transação. As operações de mutação avulsa em treino_exercicios vivem em
// `treino_exercicios.js`.

async function findTreinos(protocolo_id) {
  const trRes = await pool.query(
    `SELECT id, nome, ordem FROM treinos WHERE protocolo_id = $1 ORDER BY ordem`,
    [protocolo_id]
  );
  if (!trRes.rows.length) return [];

  const trIds = trRes.rows.map((t) => t.id);
  const exRes = await pool.query(
    `SELECT te.id, te.treino_id, te.tipo, te.exercicio_id, te.cardio_id,
            COALESCE(e.nome, c.tipo) AS nome_exercicio,
            te.series, te.repeticoes, te.descanso_seg, te.observacao,
            te.ordem, te.grupo_superset,
            e.video_url, e.video_tipo, e.video_youtube_url,
            e.observacoes_tecnicas, e.execucao_correta, e.execucao_errada
     FROM treino_exercicios te
     LEFT JOIN exercicios e ON e.id = te.exercicio_id
     LEFT JOIN cardio c ON c.id = te.cardio_id
     WHERE te.treino_id = ANY($1::uuid[])
     ORDER BY te.ordem`,
    [trIds]
  );

  const exByTreino = {};
  for (const ex of exRes.rows) {
    if (!exByTreino[ex.treino_id]) exByTreino[ex.treino_id] = [];
    exByTreino[ex.treino_id].push(decorarExercicio(ex));
  }

  return trRes.rows.map((t) => ({ ...t, exercicios: exByTreino[t.id] || [] }));
}

async function createTreino(protocolo_id, { nome, ordem = 0 }) {
  const { rows } = await pool.query(
    `INSERT INTO treinos (protocolo_id, nome, ordem) VALUES ($1,$2,$3)
     RETURNING id, nome, created_at`,
    [protocolo_id, nome, ordem]
  );
  return rows[0];
}

async function updateTreino(id, { nome, ordem }) {
  const fields = {};
  if (nome !== undefined) fields.nome = nome;
  if (ordem !== undefined) fields.ordem = ordem;
  const keys = Object.keys(fields);
  if (!keys.length) return 0;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rowCount } = await pool.query(
    `UPDATE treinos SET ${sets} WHERE id = $1`, [id, ...keys.map((k) => fields[k])]
  );
  return rowCount;
}

async function deleteTreino(id) {
  const { rowCount } = await pool.query(`DELETE FROM treinos WHERE id = $1`, [id]);
  return rowCount;
}

async function duplicarTreino(id, { nome: nomeDestino } = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const trRes = await client.query(`SELECT * FROM treinos WHERE id = $1`, [id]);
    if (!trRes.rows[0]) throw Object.assign(new Error('not_found'), { code: 'NOT_FOUND' });
    const original = trRes.rows[0];

    const { rows: maxRows } = await client.query(
      `SELECT COALESCE(MAX(ordem), -1) + 1 AS proxima FROM treinos WHERE protocolo_id = $1`,
      [original.protocolo_id]
    );
    const novaOrdem = maxRows[0].proxima;

    const novoNome = (nomeDestino && nomeDestino.trim()) || `${original.nome} (cópia)`;

    const novoTr = await client.query(
      `INSERT INTO treinos (protocolo_id, nome, ordem)
       VALUES ($1, $2, $3) RETURNING id, nome, ordem, created_at`,
      [original.protocolo_id, novoNome, novaOrdem]
    );
    const novoTreinoId = novoTr.rows[0].id;

    const exRes = await client.query(
      `SELECT * FROM treino_exercicios WHERE treino_id = $1 ORDER BY ordem`, [id]
    );
    for (const ex of exRes.rows) {
      await client.query(
        `INSERT INTO treino_exercicios
           (treino_id, tipo, exercicio_id, cardio_id, series, repeticoes,
            descanso_seg, observacao, ordem, grupo_superset)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [novoTreinoId, ex.tipo, ex.exercicio_id, ex.cardio_id,
         ex.series, ex.repeticoes, ex.descanso_seg, ex.observacao,
         ex.ordem, ex.grupo_superset]
      );
    }

    await client.query('COMMIT');
    return novoTr.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = {
  findTreinos, createTreino, updateTreino, deleteTreino, duplicarTreino,
};
