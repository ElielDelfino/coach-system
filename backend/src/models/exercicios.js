const pool = require('../config/db');
const { decorarExercicio } = require('./_shared');

async function findExercicios({ grupo_muscular, nivel, ativo = true, busca, limit = 200, offset = 0 }) {
  const params = [];
  const conditions = [`e.ativo = $${params.push(ativo)}`];
  if (grupo_muscular) conditions.push(`e.grupo_muscular ILIKE $${params.push(`%${grupo_muscular}%`)}`);
  if (nivel) conditions.push(`e.nivel = $${params.push(nivel)}`);
  if (busca) conditions.push(`e.nome ILIKE $${params.push(`%${busca}%`)}`);

  const where = `WHERE ${conditions.join(' AND ')}`;
  const filterParams = [...params];

  const dataParams = [...filterParams, limit, offset];
  const limitIdx  = dataParams.length - 1;
  const offsetIdx = dataParams.length;

  const [{ rows }, { rows: countRows }] = await Promise.all([
    pool.query(
      `SELECT id, nome, grupo_muscular, equipamento, nivel,
              thumbnail_url, video_url, video_tipo, video_youtube_url, ativo
       FROM exercicios AS e ${where} ORDER BY e.nome
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      dataParams
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM exercicios AS e ${where}`, filterParams),
  ]);

  return { data: rows.map(decorarExercicio), total: countRows[0].total, limit, offset };
}

async function findExercicioById(id) {
  const { rows } = await pool.query(
    `SELECT * FROM exercicios WHERE id = $1`, [id]
  );
  return decorarExercicio(rows[0] || null);
}

async function createExercicio(d) {
  const { rows } = await pool.query(
    `INSERT INTO exercicios
       (nome, grupo_muscular, equipamento, nivel, video_url, thumbnail_url,
        observacoes_tecnicas, execucao_correta, execucao_errada,
        descanso_padrao_seg, series_recomendadas, repeticoes_recomendadas,
        cadencia, exercicio_substituto_id, video_youtube_url, video_tipo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING id, nome, created_at`,
    [d.nome, d.grupo_muscular, d.equipamento || null, d.nivel || null,
     d.video_url || null, d.thumbnail_url || null, d.observacoes_tecnicas || null,
     d.execucao_correta || null, d.execucao_errada || null,
     d.descanso_padrao_seg || null, d.series_recomendadas || null,
     d.repeticoes_recomendadas || null, d.cadencia || null,
     d.exercicio_substituto_id || null,
     d.video_youtube_url || null, d.video_tipo || null]
  );
  return rows[0];
}

async function updateExercicio(id, d) {
  const allowed = ['nome','grupo_muscular','equipamento','nivel','video_url','thumbnail_url',
    'observacoes_tecnicas','execucao_correta','execucao_errada','descanso_padrao_seg',
    'series_recomendadas','repeticoes_recomendadas','cadencia','exercicio_substituto_id',
    'video_youtube_url','video_tipo','thumbnail_s3_key','video_s3_key'];
  const keys = allowed.filter((k) => d[k] !== undefined);
  if (!keys.length) return 0;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rowCount } = await pool.query(
    `UPDATE exercicios SET ${sets} WHERE id = $1`, [id, ...keys.map((k) => d[k])]
  );
  return rowCount;
}

// Lê o key antigo (FOR UPDATE), substitui pelo novo e devolve o antigo
// para que o controller delete o arquivo no S3.
async function trocarExercicioThumbnail(id, { thumbnail_url, thumbnail_s3_key }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cur = await client.query(
      `SELECT thumbnail_s3_key FROM exercicios WHERE id = $1 FOR UPDATE`, [id]
    );
    if (!cur.rows[0]) { await client.query('ROLLBACK'); return { found: false }; }
    const oldKey = cur.rows[0].thumbnail_s3_key;
    await client.query(
      `UPDATE exercicios SET thumbnail_url = $2, thumbnail_s3_key = $3 WHERE id = $1`,
      [id, thumbnail_url, thumbnail_s3_key]
    );
    await client.query('COMMIT');
    return { found: true, old_key: oldKey };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function trocarExercicioVideo(id, { video_url, video_s3_key }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cur = await client.query(
      `SELECT video_s3_key FROM exercicios WHERE id = $1 FOR UPDATE`, [id]
    );
    if (!cur.rows[0]) { await client.query('ROLLBACK'); return { found: false }; }
    const oldKey = cur.rows[0].video_s3_key;
    await client.query(
      `UPDATE exercicios
       SET video_url = $2, video_s3_key = $3,
           video_tipo = 's3', video_youtube_url = NULL
       WHERE id = $1`,
      [id, video_url, video_s3_key]
    );
    await client.query('COMMIT');
    return { found: true, old_key: oldKey };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function setExercicioAtivo(id, ativo) {
  const { rowCount } = await pool.query(
    `UPDATE exercicios SET ativo = $2 WHERE id = $1`, [id, ativo]
  );
  return rowCount;
}

module.exports = {
  findExercicios, findExercicioById, createExercicio, updateExercicio, setExercicioAtivo,
  trocarExercicioThumbnail, trocarExercicioVideo,
};
