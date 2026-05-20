const pool = require('../config/db');

// findRefeicoes agrega itens e substitutos para o front (operação de leitura cross-tabela
// cujo ponto de entrada é a refeição). duplicarRefeicao copia em cascata refeição → itens →
// substitutos numa transação. As operações de mutação avulsa em itens vivem em
// `refeicao_itens.js`, e em substitutos em `substitutos.js`.

async function findRefeicoes(protocolo_id) {
  const refRes = await pool.query(
    `SELECT id, numero_refeicao, nome, ordem, horario_sugerido
     FROM refeicoes WHERE protocolo_id = $1 ORDER BY ordem, numero_refeicao`,
    [protocolo_id]
  );
  if (!refRes.rows.length) return [];

  const refIds = refRes.rows.map((r) => r.id);

  const itemRes = await pool.query(
    `SELECT ri.id, ri.refeicao_id, ri.alimento_id, al.nome AS nome_alimento,
            ri.quantidade_g, ri.kcal_calculado, ri.prot_calculado,
            ri.carb_calculado, ri.gord_calculado, ri.ordem, ri.observacoes
     FROM refeicao_itens ri
     JOIN alimentos al ON al.id = ri.alimento_id
     WHERE ri.refeicao_id = ANY($1::uuid[])
     ORDER BY ri.ordem`,
    [refIds]
  );

  const itemIds = itemRes.rows.map((r) => r.id);
  let substRows = [];
  if (itemIds.length) {
    const substRes = await pool.query(
      `SELECT s.id, s.refeicao_item_id, s.alimento_id, al.nome AS nome_alimento, s.quantidade_g
       FROM refeicao_item_substitutos s
       JOIN alimentos al ON al.id = s.alimento_id
       WHERE s.refeicao_item_id = ANY($1::uuid[])`,
      [itemIds]
    );
    substRows = substRes.rows;
  }

  const substByItem = {};
  for (const s of substRows) {
    if (!substByItem[s.refeicao_item_id]) substByItem[s.refeicao_item_id] = [];
    substByItem[s.refeicao_item_id].push({
      id: s.id, alimento_id: s.alimento_id, nome_alimento: s.nome_alimento, quantidade_g: s.quantidade_g,
    });
  }

  const itemsByRef = {};
  for (const item of itemRes.rows) {
    if (!itemsByRef[item.refeicao_id]) itemsByRef[item.refeicao_id] = [];
    itemsByRef[item.refeicao_id].push({ ...item, substitutos: substByItem[item.id] || [] });
  }

  return refRes.rows.map((ref) => {
    const itens = itemsByRef[ref.id] || [];
    return {
      ...ref,
      total_kcal: Math.round(itens.reduce((s, i) => s + Number(i.kcal_calculado || 0), 0) * 10) / 10,
      total_prot: Math.round(itens.reduce((s, i) => s + Number(i.prot_calculado || 0), 0) * 10) / 10,
      total_carb: Math.round(itens.reduce((s, i) => s + Number(i.carb_calculado || 0), 0) * 10) / 10,
      total_gord: Math.round(itens.reduce((s, i) => s + Number(i.gord_calculado || 0), 0) * 10) / 10,
      itens,
    };
  });
}

async function findRefeicaoById(id) {
  const { rows } = await pool.query(
    `SELECT id, protocolo_id, numero_refeicao, nome FROM refeicoes WHERE id = $1`, [id]
  );
  return rows[0] || null;
}

async function createRefeicao(protocolo_id, { numero_refeicao, nome, ordem = 0, horario_sugerido }) {
  const { rows } = await pool.query(
    `INSERT INTO refeicoes (protocolo_id, numero_refeicao, nome, ordem, horario_sugerido)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, numero_refeicao, nome`,
    [protocolo_id, numero_refeicao, nome, ordem, horario_sugerido || null]
  );
  return rows[0];
}

async function duplicarRefeicao(id, numero_refeicao_destino) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const refRes = await client.query(
      `SELECT * FROM refeicoes WHERE id = $1`, [id]
    );
    if (!refRes.rows[0]) throw Object.assign(new Error('not_found'), { code: 'NOT_FOUND' });
    const original = refRes.rows[0];

    const dupCheck = await client.query(
      `SELECT id FROM refeicoes WHERE protocolo_id = $1 AND numero_refeicao = $2`,
      [original.protocolo_id, numero_refeicao_destino]
    );
    if (dupCheck.rows[0]) throw Object.assign(new Error('conflict'), { code: 'CONFLICT' });

    const novaRef = await client.query(
      `INSERT INTO refeicoes (protocolo_id, numero_refeicao, nome, ordem, horario_sugerido)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, numero_refeicao, nome, created_at`,
      [original.protocolo_id, numero_refeicao_destino, original.nome,
       original.ordem, original.horario_sugerido]
    );
    const novaRefId = novaRef.rows[0].id;

    const itensRes = await client.query(
      `SELECT * FROM refeicao_itens WHERE refeicao_id = $1 ORDER BY ordem`, [id]
    );

    for (const item of itensRes.rows) {
      const novoItem = await client.query(
        `INSERT INTO refeicao_itens
           (refeicao_id, alimento_id, quantidade_g, kcal_calculado, carb_calculado,
            prot_calculado, gord_calculado, ordem, observacoes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id`,
        [novaRefId, item.alimento_id, item.quantidade_g, item.kcal_calculado,
         item.carb_calculado, item.prot_calculado, item.gord_calculado,
         item.ordem, item.observacoes]
      );
      const novoItemId = novoItem.rows[0].id;

      const substsRes = await client.query(
        `SELECT * FROM refeicao_item_substitutos WHERE refeicao_item_id = $1`, [item.id]
      );
      for (const s of substsRes.rows) {
        await client.query(
          `INSERT INTO refeicao_item_substitutos (refeicao_item_id, alimento_id, quantidade_g)
           VALUES ($1,$2,$3)`,
          [novoItemId, s.alimento_id, s.quantidade_g]
        );
      }
    }

    await client.query('COMMIT');
    return novaRef.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function updateRefeicao(id, { nome, ordem, horario_sugerido }) {
  const fields = {};
  if (nome !== undefined) fields.nome = nome;
  if (ordem !== undefined) fields.ordem = ordem;
  if (horario_sugerido !== undefined) fields.horario_sugerido = horario_sugerido;
  const keys = Object.keys(fields);
  if (!keys.length) return 0;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rowCount } = await pool.query(
    `UPDATE refeicoes SET ${sets} WHERE id = $1`, [id, ...keys.map((k) => fields[k])]
  );
  return rowCount;
}

async function deleteRefeicao(id) {
  const { rowCount } = await pool.query(`DELETE FROM refeicoes WHERE id = $1`, [id]);
  return rowCount;
}

module.exports = {
  findRefeicoes, findRefeicaoById, createRefeicao, duplicarRefeicao,
  updateRefeicao, deleteRefeicao,
};
