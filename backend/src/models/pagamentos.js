const pool = require('../config/db');

async function findAllPagamentos({ aluno_id, vencendo_em, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const filterParams = [];
  const conditions = [];

  if (aluno_id) {
    filterParams.push(aluno_id);
    conditions.push(`p.aluno_id = $${filterParams.length}`);
  }
  if (vencendo_em) {
    filterParams.push(vencendo_em);
    conditions.push(`p.vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + ($${filterParams.length} || ' days')::interval`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataParams = [...filterParams, limit, offset];
  const limitIdx = dataParams.length - 1;
  const offsetIdx = dataParams.length;

  const dataQ = `
    SELECT p.id, p.aluno_id, a.nome AS nome_aluno, p.valor, p.data_pagamento,
           p.metodo, p.vencimento, p.registrado_por, p.observacoes, p.created_at
    FROM pagamentos p
    JOIN alunos a ON a.id = p.aluno_id
    ${where}
    ORDER BY p.created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const countQ = `
    SELECT COUNT(*) AS total
    FROM pagamentos p
    JOIN alunos a ON a.id = p.aluno_id
    ${where}
  `;

  const [d, c] = await Promise.all([
    pool.query(dataQ, dataParams),
    pool.query(countQ, filterParams),
  ]);
  return { data: d.rows, total: Number(c.rows[0].total), page, limit };
}

async function findPagamentos(aluno_id) {
  const { rows } = await pool.query(
    `SELECT id, valor, data_pagamento, metodo, vencimento, observacoes, created_at
     FROM pagamentos WHERE aluno_id = $1 ORDER BY data_pagamento DESC`,
    [aluno_id]
  );
  return rows;
}

async function createPagamento(aluno_id, { valor, data_pagamento, metodo, vencimento, observacoes }, registrado_por) {
  const { rows } = await pool.query(
    `INSERT INTO pagamentos (aluno_id, registrado_por, valor, data_pagamento, metodo, vencimento, observacoes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, valor, data_pagamento, vencimento, created_at`,
    [aluno_id, registrado_por, valor, data_pagamento, metodo, vencimento, observacoes || null]
  );
  return rows[0];
}

module.exports = { findAllPagamentos, findPagamentos, createPagamento };
