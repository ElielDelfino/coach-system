const pool = require('../config/db');

async function createTreinoExercicio(treino_id, d) {
  const { rows } = await pool.query(
    `INSERT INTO treino_exercicios
       (treino_id, tipo, exercicio_id, cardio_id, series, repeticoes,
        descanso_seg, observacao, ordem, grupo_superset)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id, tipo, ordem`,
    [treino_id, d.tipo,
     d.tipo === 'exercicio' ? d.exercicio_id : null,
     d.tipo === 'cardio' ? d.cardio_id : null,
     d.series || null, d.repeticoes || null, d.descanso_seg || null,
     d.observacao || null, d.ordem ?? 0, d.grupo_superset || null]
  );
  return rows[0];
}

async function updateTreinoExercicio(itemId, d) {
  const allowed = ['series','repeticoes','descanso_seg','observacao','ordem','grupo_superset'];
  const keys = allowed.filter((k) => d[k] !== undefined);
  if (!keys.length) return 0;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rowCount } = await pool.query(
    `UPDATE treino_exercicios SET ${sets} WHERE id = $1`,
    [itemId, ...keys.map((k) => d[k])]
  );
  return rowCount;
}

async function deleteTreinoExercicio(itemId) {
  const { rowCount } = await pool.query(
    `DELETE FROM treino_exercicios WHERE id = $1`, [itemId]
  );
  return rowCount;
}

async function reordenarTreinoExercicios(treinoId, ordemArray) {
  const ids = ordemArray.map((o) => o.id);
  const ordens = ordemArray.map((o) => o.ordem);
  await pool.query(
    `UPDATE treino_exercicios AS t
     SET ordem = v.ordem
     FROM unnest($1::uuid[], $2::int[]) AS v(id, ordem)
     WHERE t.id = v.id AND t.treino_id = $3`,
    [ids, ordens, treinoId]
  );
}

module.exports = {
  createTreinoExercicio, updateTreinoExercicio, deleteTreinoExercicio, reordenarTreinoExercicios,
};
