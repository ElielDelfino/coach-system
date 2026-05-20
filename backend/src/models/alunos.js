const pool = require('../config/db');
const { STATUS_SQL } = require('./_shared');

async function findAll({ ativo = true, busca = null, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const params = [ativo, limit, offset];
  let where = 'WHERE a.ativo = $1';

  if (busca) {
    where += ` AND (a.nome ILIKE $4 OR u.email ILIKE $4)`;
    params.push(`%${busca}%`);
  }

  const dataQ = `
    SELECT a.id, a.user_id, a.nome, u.email, a.telefone, a.ativo, a.created_at,
           a.dias_tolerancia, a.periodicidade_dias,
           ${STATUS_SQL} AS status
    FROM alunos a
    JOIN users u ON u.id = a.user_id
    ${where}
    ORDER BY a.nome
    LIMIT $2 OFFSET $3
  `;

  const countQ = `
    SELECT COUNT(*) AS total
    FROM alunos a
    JOIN users u ON u.id = a.user_id
    ${where}
  `;

  const [dataRes, countRes] = await Promise.all([
    pool.query(dataQ, params),
    pool.query(countQ, busca ? [ativo, `%${busca}%`] : [ativo]),
  ]);

  return { data: dataRes.rows, total: Number(countRes.rows[0].total), page, limit };
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT a.id, a.user_id, a.nome, u.email, a.telefone, a.data_nascimento, a.sexo,
            a.objetivo, a.restricoes, a.lesoes, a.observacoes, a.ativo,
            a.dias_tolerancia, a.periodicidade_dias,
            a.envio_fotos_liberado,
            a.created_at, a.updated_at,
            ${STATUS_SQL} AS status,
            (SELECT to_jsonb(am.*)
             FROM aluno_medidas am
             WHERE am.aluno_id = a.id
             ORDER BY am.data_medicao DESC
             LIMIT 1
            ) AS ultima_medicao
     FROM alunos a
     JOIN users u ON u.id = a.user_id
     WHERE a.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function create({ nome, email, senha_hash, telefone, data_nascimento, sexo, objetivo, restricoes, lesoes, dias_tolerancia, periodicidade_dias }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const uRes = await client.query(
      `INSERT INTO users (email, nome, senha_hash, role) VALUES ($1, $2, $3, 'aluno')
       RETURNING id, email, created_at`,
      [email, nome, senha_hash]
    );
    const u = uRes.rows[0];
    const aRes = await client.query(
      `INSERT INTO alunos (user_id, nome, telefone, data_nascimento, sexo, objetivo, restricoes, lesoes,
                           dias_tolerancia, periodicidade_dias)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, created_at, dias_tolerancia, periodicidade_dias`,
      [u.id, nome, telefone || null, data_nascimento || null, sexo || null,
       objetivo || null, restricoes || null, lesoes || null,
       dias_tolerancia ?? 7, periodicidade_dias ?? 30]
    );
    const a = aRes.rows[0];
    await client.query('COMMIT');
    return {
      id: a.id, user_id: u.id, nome, email: u.email, created_at: a.created_at,
      dias_tolerancia: a.dias_tolerancia, periodicidade_dias: a.periodicidade_dias,
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function update(id, fields) {
  const allowed = ['nome', 'telefone', 'data_nascimento', 'sexo', 'objetivo', 'restricoes', 'lesoes', 'observacoes', 'dias_tolerancia', 'periodicidade_dias'];
  const keys = allowed.filter((k) => fields[k] !== undefined);
  if (keys.length === 0) return;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const vals = keys.map((k) => fields[k]);
  const { rowCount } = await pool.query(
    `UPDATE alunos SET ${sets} WHERE id = $1`,
    [id, ...vals]
  );
  return rowCount;
}

async function updateSenhaByAlunoId(aluno_id, senha_hash) {
  const { rowCount } = await pool.query(
    `UPDATE users
        SET senha_hash = $2
      WHERE id = (SELECT user_id FROM alunos WHERE id = $1)`,
    [aluno_id, senha_hash]
  );
  return rowCount;
}

async function ativar(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      `UPDATE alunos SET ativo = true WHERE id = $1 RETURNING user_id`,
      [id]
    );
    if (!res.rows[0]) { await client.query('ROLLBACK'); return null; }
    const { user_id } = res.rows[0];
    await client.query(`UPDATE users SET ativo = true WHERE id = $1`, [user_id]);
    await client.query('COMMIT');
    return user_id;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function desativar(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      `UPDATE alunos SET ativo = false WHERE id = $1 RETURNING user_id`,
      [id]
    );
    if (!res.rows[0]) { await client.query('ROLLBACK'); return null; }
    const { user_id } = res.rows[0];
    await client.query(`UPDATE users SET ativo = false WHERE id = $1`, [user_id]);
    await client.query('COMMIT');
    return user_id;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function findPerfil(user_id) {
  const { rows } = await pool.query(
    `SELECT a.id, a.nome, u.email, a.telefone, a.data_nascimento, a.sexo,
            a.objetivo, a.restricoes, a.lesoes, a.ativo,
            a.dias_tolerancia, a.periodicidade_dias,
            a.envio_fotos_liberado,
            ${STATUS_SQL} AS status
     FROM alunos a
     JOIN users u ON u.id = a.user_id
     WHERE a.user_id = $1`,
    [user_id]
  );
  return rows[0] || null;
}

async function setEnvioFotosLiberado(aluno_id, liberado) {
  const { rowCount } = await pool.query(
    `UPDATE alunos SET envio_fotos_liberado = $2 WHERE id = $1`,
    [aluno_id, !!liberado]
  );
  return rowCount;
}

module.exports = {
  findAll, findById, create, update, ativar, desativar,
  findPerfil, setEnvioFotosLiberado, updateSenhaByAlunoId,
};
