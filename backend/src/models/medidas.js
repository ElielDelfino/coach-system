const pool = require('../config/db');

async function findMedidas(aluno_id) {
  const { rows } = await pool.query(
    `SELECT id, data_medicao, peso_kg, altura_cm, percentual_gordura, peso_magro_kg,
            peso_gordo_kg, cintura_cm, quadril_cm, torax_cm, abdomen_cm,
            braco_dir_cm, braco_esq_cm, antebraco_dir_cm, antebraco_esq_cm,
            coxa_dir_cm, coxa_esq_cm, panturrilha_dir_cm, panturrilha_esq_cm,
            observacoes, created_at
     FROM aluno_medidas
     WHERE aluno_id = $1
     ORDER BY data_medicao DESC`,
    [aluno_id]
  );
  return rows;
}

async function createMedida(aluno_id, d) {
  const { rows } = await pool.query(
    `INSERT INTO aluno_medidas
       (aluno_id, data_medicao, peso_kg, altura_cm, percentual_gordura, peso_magro_kg,
        peso_gordo_kg, cintura_cm, quadril_cm, torax_cm, abdomen_cm,
        braco_dir_cm, braco_esq_cm, antebraco_dir_cm, antebraco_esq_cm,
        coxa_dir_cm, coxa_esq_cm, panturrilha_dir_cm, panturrilha_esq_cm, observacoes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     RETURNING id, data_medicao, created_at`,
    [aluno_id, d.data_medicao, d.peso_kg || null, d.altura_cm || null,
     d.percentual_gordura || null, d.peso_magro_kg || null, d.peso_gordo_kg || null,
     d.cintura_cm || null, d.quadril_cm || null, d.torax_cm || null,
     d.abdomen_cm || null,
     d.braco_dir_cm || null, d.braco_esq_cm || null, d.antebraco_dir_cm || null,
     d.antebraco_esq_cm || null, d.coxa_dir_cm || null, d.coxa_esq_cm || null,
     d.panturrilha_dir_cm || null, d.panturrilha_esq_cm || null, d.observacoes || null]
  );
  return rows[0];
}

async function updateMedida(medidaId, aluno_id, d) {
  const allowed = ['data_medicao','peso_kg','altura_cm','percentual_gordura','peso_magro_kg',
    'peso_gordo_kg','cintura_cm','quadril_cm','torax_cm','abdomen_cm',
    'braco_dir_cm','braco_esq_cm','antebraco_dir_cm','antebraco_esq_cm',
    'coxa_dir_cm','coxa_esq_cm','panturrilha_dir_cm','panturrilha_esq_cm','observacoes'];
  const keys = allowed.filter((k) => d[k] !== undefined);
  if (!keys.length) return 0;
  const sets = keys.map((k, i) => `${k} = $${i + 3}`).join(', ');
  const vals = keys.map((k) => (d[k] === '' ? null : d[k]));
  const { rowCount } = await pool.query(
    `UPDATE aluno_medidas SET ${sets} WHERE id = $1 AND aluno_id = $2`,
    [medidaId, aluno_id, ...vals]
  );
  return rowCount;
}

async function deleteMedida(medidaId, aluno_id) {
  const { rowCount } = await pool.query(
    `DELETE FROM aluno_medidas WHERE id = $1 AND aluno_id = $2`,
    [medidaId, aluno_id]
  );
  return rowCount;
}

async function findMedidaById(medidaId, aluno_id) {
  const { rows } = await pool.query(
    `SELECT * FROM aluno_medidas WHERE id = $1 AND aluno_id = $2`,
    [medidaId, aluno_id]
  );
  return rows[0] || null;
}

module.exports = { findMedidas, createMedida, updateMedida, deleteMedida, findMedidaById };
