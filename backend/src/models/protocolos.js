const pool = require('../config/db');

async function findProtocolos(aluno_id) {
  const { rows } = await pool.query(
    `SELECT id, nome, objetivo, fase, data_inicio, data_fim, ativo, finalizado,
            modulo_alimentar, modulo_treino, modulo_cardio, modulo_suplementacao,
            meta_agua_litros
     FROM protocolos WHERE aluno_id = $1 ORDER BY created_at DESC`,
    [aluno_id]
  );
  return rows;
}

async function findProtocoloById(id) {
  const { rows } = await pool.query(
    `SELECT * FROM protocolos WHERE id = $1`, [id]
  );
  return rows[0] || null;
}

async function createProtocolo(aluno_id, d) {
  const { rows } = await pool.query(
    `INSERT INTO protocolos
       (aluno_id, nome, objetivo, fase, data_inicio, data_fim,
        modulo_alimentar, modulo_treino, modulo_cardio, modulo_suplementacao, observacoes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id, nome, created_at`,
    [aluno_id, d.nome, d.objetivo || null, d.fase || null,
     d.data_inicio || null, d.data_fim || null,
     d.modulo_alimentar || false, d.modulo_treino || false,
     d.modulo_cardio || false, d.modulo_suplementacao || false,
     d.observacoes || null]
  );
  return rows[0];
}

async function updateProtocolo(id, d) {
  const allowed = ['nome','objetivo','fase','data_inicio','data_fim',
    'modulo_alimentar','modulo_treino','modulo_cardio','modulo_suplementacao','observacoes',
    'meta_agua_litros','ativo','finalizado'];
  const keys = allowed.filter((k) => d[k] !== undefined);
  if (!keys.length) return 0;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rowCount } = await pool.query(
    `UPDATE protocolos SET ${sets} WHERE id = $1`, [id, ...keys.map((k) => d[k])]
  );
  return rowCount;
}

async function setProtocoloAtivo(id, ativo) {
  const { rowCount } = await pool.query(
    `UPDATE protocolos SET ativo = $2 WHERE id = $1`, [id, ativo]
  );
  return rowCount;
}

async function deleteProtocolo(id) {
  const { rowCount } = await pool.query(
    `DELETE FROM protocolos WHERE id = $1`, [id]
  );
  return rowCount;
}

module.exports = {
  findProtocolos, findProtocoloById, createProtocolo, updateProtocolo,
  setProtocoloAtivo, deleteProtocolo,
};
