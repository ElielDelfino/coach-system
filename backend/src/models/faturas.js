const pool = require('../config/db');
const { calcValorFinal, recalcFaturaStatus } = require('./_shared');

async function findFaturasByAluno(aluno_id) {
  const { rows } = await pool.query(
    `SELECT id, valor, data_vencimento, data_baixa, metodo_baixa, status, observacoes,
            desconto_tipo, desconto_valor, created_at
     FROM faturas WHERE aluno_id = $1 ORDER BY data_vencimento DESC`,
    [aluno_id]
  );
  return rows.map(recalcFaturaStatus);
}

async function findFaturasByAlunoUserId(user_id) {
  const { rows } = await pool.query(
    `SELECT f.id, f.valor, f.data_vencimento, f.status, f.data_baixa,
            f.desconto_tipo, f.desconto_valor
     FROM faturas f
     JOIN alunos a ON a.id = f.aluno_id
     WHERE a.user_id = $1
     ORDER BY f.data_vencimento DESC`,
    [user_id]
  );
  return rows.map(recalcFaturaStatus);
}

async function createFatura(aluno_id, { valor, data_vencimento, observacoes, desconto_tipo, desconto_valor }, registrado_por) {
  const { rows } = await pool.query(
    `INSERT INTO faturas (aluno_id, valor, data_vencimento, observacoes, registrado_por, status, desconto_tipo, desconto_valor)
     VALUES ($1,$2,$3,$4,$5,'pendente',$6,$7)
     RETURNING id, valor, data_vencimento, status, observacoes, desconto_tipo, desconto_valor, created_at`,
    [aluno_id, valor, data_vencimento, observacoes || null, registrado_por,
     desconto_tipo || null, desconto_valor != null ? desconto_valor : null]
  );
  const f = rows[0];
  return { ...f, valor_final: calcValorFinal(f) };
}

async function findFaturaById(id) {
  const { rows } = await pool.query(
    `SELECT f.id, f.aluno_id, a.user_id, f.valor, f.data_vencimento, f.data_baixa,
            f.metodo_baixa, f.status, f.observacoes, f.desconto_tipo, f.desconto_valor
     FROM faturas f
     JOIN alunos a ON a.id = f.aluno_id
     WHERE f.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function updateFatura(id, body) {
  const fatura = await findFaturaById(id);
  if (!fatura) return { notFound: true };

  const params = [id];
  const fields = [];
  function addField(col, val) {
    params.push(val);
    fields.push(`${col} = $${params.length}`);
  }

  if ('valor' in body)           addField('valor', body.valor);
  if ('data_vencimento' in body) addField('data_vencimento', body.data_vencimento);
  if ('observacoes' in body)     addField('observacoes', body.observacoes ?? null);
  if ('desconto_tipo' in body)   addField('desconto_tipo', body.desconto_tipo ?? null);
  if ('desconto_valor' in body)  addField('desconto_valor', body.desconto_valor ?? null);

  if (fatura.status === 'pago') {
    addField('status', 'pago');
  } else {
    const effectiveVenc = ('data_vencimento' in body ? body.data_vencimento : null) || fatura.data_vencimento;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    addField('status', new Date(effectiveVenc) >= hoje ? 'pendente' : 'vencido');
  }

  const { rows } = await pool.query(
    `UPDATE faturas SET ${fields.join(', ')} WHERE id = $1
     RETURNING id, valor, data_vencimento, data_baixa, metodo_baixa, status, observacoes,
               desconto_tipo, desconto_valor`,
    params
  );
  const updated = rows[0];
  return { fatura: { ...updated, valor_final: calcValorFinal(updated) }, user_id: fatura.user_id };
}

async function darBaixaFatura(id, { data_baixa, metodo_baixa, observacoes }) {
  const fatura = await findFaturaById(id);
  if (!fatura) return { notFound: true };
  if (fatura.status === 'pago') return { jaPago: true };

  const fields = ['status = $2', 'data_baixa = $3', 'metodo_baixa = $4'];
  const params = [id, 'pago', data_baixa, metodo_baixa];
  if (observacoes !== undefined) {
    params.push(observacoes);
    fields.push(`observacoes = $${params.length}`);
  }

  const { rows } = await pool.query(
    `UPDATE faturas SET ${fields.join(', ')} WHERE id = $1
     RETURNING id, valor, data_vencimento, data_baixa, metodo_baixa, status, observacoes,
               desconto_tipo, desconto_valor`,
    params
  );
  const updated = rows[0];
  return { fatura: { ...updated, valor_final: calcValorFinal(updated) }, user_id: fatura.user_id };
}

async function deleteFatura(id) {
  const fatura = await findFaturaById(id);
  if (!fatura) return { notFound: true };

  await pool.query(`DELETE FROM faturas WHERE id = $1`, [id]);
  return { ok: true, user_id: fatura.user_id };
}

module.exports = {
  findFaturasByAluno, findFaturasByAlunoUserId, createFatura, findFaturaById,
  updateFatura, darBaixaFatura, deleteFatura,
};
