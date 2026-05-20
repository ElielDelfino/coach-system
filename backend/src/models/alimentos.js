const pool = require('../config/db');

async function findAlimentos({ categoria, ativo = true, busca }) {
  const params = [];
  const conditions = [`al.ativo = $${params.push(ativo)}`];
  if (categoria) conditions.push(`al.categoria ILIKE $${params.push(`%${categoria}%`)}`);
  if (busca) conditions.push(`al.nome ILIKE $${params.push(`%${busca}%`)}`);

  const where = `WHERE ${conditions.join(' AND ')}`;
  const { rows } = await pool.query(
    `SELECT id, nome, categoria, quantidade_base, unidade, calorias,
            proteinas, carboidratos, gorduras, foto_url, ativo
     FROM alimentos AS al ${where} ORDER BY al.nome`,
    params
  );
  return { data: rows, total: rows.length };
}

async function findAlimentoById(id) {
  const { rows } = await pool.query(`SELECT * FROM alimentos WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function createAlimento(d) {
  const { rows } = await pool.query(
    `INSERT INTO alimentos
       (nome, categoria, quantidade_base, unidade, calorias, proteinas,
        carboidratos, gorduras, fibra, sodio, foto_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id, nome, created_at`,
    [d.nome, d.categoria || null, d.quantidade_base || 100, d.unidade,
     d.calorias, d.proteinas, d.carboidratos, d.gorduras,
     d.fibra || null, d.sodio || null, d.foto_url || null]
  );
  return rows[0];
}

async function updateAlimento(id, d) {
  const allowed = ['nome','categoria','quantidade_base','unidade','calorias',
    'proteinas','carboidratos','gorduras','fibra','sodio','foto_url','foto_s3_key'];
  const keys = allowed.filter((k) => d[k] !== undefined);
  if (!keys.length) return 0;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rowCount } = await pool.query(
    `UPDATE alimentos SET ${sets} WHERE id = $1`, [id, ...keys.map((k) => d[k])]
  );
  return rowCount;
}

async function trocarAlimentoFoto(id, { foto_url, foto_s3_key }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cur = await client.query(
      `SELECT foto_s3_key FROM alimentos WHERE id = $1 FOR UPDATE`, [id]
    );
    if (!cur.rows[0]) { await client.query('ROLLBACK'); return { found: false }; }
    const oldKey = cur.rows[0].foto_s3_key;
    await client.query(
      `UPDATE alimentos SET foto_url = $2, foto_s3_key = $3 WHERE id = $1`,
      [id, foto_url, foto_s3_key]
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

async function setAlimentoAtivo(id, ativo) {
  const { rowCount } = await pool.query(
    `UPDATE alimentos SET ativo = $2 WHERE id = $1`, [id, ativo]
  );
  return rowCount;
}

module.exports = {
  findAlimentos, findAlimentoById, createAlimento, updateAlimento, setAlimentoAtivo,
  trocarAlimentoFoto,
};
