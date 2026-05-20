const pool = require('../config/db');
const { agruparFotosPorData } = require('./_shared');

async function findFotos(aluno_id) {
  const { rows } = await pool.query(
    `SELECT id, url, posicao, data_foto, s3_key, enviada_por, created_at
     FROM aluno_fotos WHERE aluno_id = $1 ORDER BY data_foto DESC, created_at DESC`,
    [aluno_id]
  );
  return agruparFotosPorData(rows);
}

async function createFoto(aluno_id, { url, posicao, data_foto, s3_key, enviada_por }) {
  const { rows } = await pool.query(
    `INSERT INTO aluno_fotos (aluno_id, url, posicao, data_foto, s3_key, enviada_por)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, url, posicao, data_foto, s3_key, created_at`,
    [aluno_id, url, posicao,
     data_foto || new Date().toISOString().slice(0, 10),
     s3_key || null,
     enviada_por || null]
  );
  return rows[0];
}

async function deleteFoto(fotoId, aluno_id) {
  const { rows } = await pool.query(
    `DELETE FROM aluno_fotos WHERE id = $1 AND aluno_id = $2
     RETURNING s3_key`,
    [fotoId, aluno_id]
  );
  if (!rows.length) return { rowCount: 0, s3_key: null };
  return { rowCount: 1, s3_key: rows[0].s3_key };
}

module.exports = { findFotos, createFoto, deleteFoto };
