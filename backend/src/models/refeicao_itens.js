const pool = require('../config/db');
const { calcMacros } = require('./_shared');

async function createRefeicaoItem(refeicao_id, alimento_id, quantidade_g, ordem = 0, observacoes = null) {
  const alRes = await pool.query(`SELECT * FROM alimentos WHERE id = $1`, [alimento_id]);
  if (!alRes.rows[0]) throw Object.assign(new Error('alimento_not_found'), { code: 'NOT_FOUND' });
  const macros = calcMacros(alRes.rows[0], quantidade_g);

  const { rows } = await pool.query(
    `INSERT INTO refeicao_itens
       (refeicao_id, alimento_id, quantidade_g, kcal_calculado, carb_calculado,
        prot_calculado, gord_calculado, ordem, observacoes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, alimento_id, quantidade_g, kcal_calculado, carb_calculado,
               prot_calculado, gord_calculado`,
    [refeicao_id, alimento_id, quantidade_g, macros.kcal_calculado,
     macros.carb_calculado, macros.prot_calculado, macros.gord_calculado,
     ordem, observacoes]
  );
  return rows[0];
}

async function updateRefeicaoItem(itemId, { quantidade_g, ordem, observacoes }) {
  const itemRes = await pool.query(
    `SELECT ri.*, al.calorias, al.proteinas, al.carboidratos, al.gorduras, al.quantidade_base
     FROM refeicao_itens ri JOIN alimentos al ON al.id = ri.alimento_id WHERE ri.id = $1`,
    [itemId]
  );
  if (!itemRes.rows[0]) return 0;

  const item = itemRes.rows[0];
  const novaQtd = quantidade_g !== undefined ? quantidade_g : Number(item.quantidade_g);
  const macros = calcMacros(item, novaQtd);

  const fields = { quantidade_g: novaQtd, ...macros };
  if (ordem !== undefined) fields.ordem = ordem;
  if (observacoes !== undefined) fields.observacoes = observacoes;

  const keys = Object.keys(fields);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rowCount } = await pool.query(
    `UPDATE refeicao_itens SET ${sets} WHERE id = $1`,
    [itemId, ...keys.map((k) => fields[k])]
  );
  return rowCount;
}

async function deleteRefeicaoItem(itemId) {
  const { rowCount } = await pool.query(`DELETE FROM refeicao_itens WHERE id = $1`, [itemId]);
  return rowCount;
}

async function reordenarItens(refeicaoId, ordemArray) {
  const ids = ordemArray.map((o) => o.id);
  const ordens = ordemArray.map((o) => o.ordem);
  await pool.query(
    `UPDATE refeicao_itens AS t
     SET ordem = v.ordem
     FROM unnest($1::uuid[], $2::int[]) AS v(id, ordem)
     WHERE t.id = v.id AND t.refeicao_id = $3`,
    [ids, ordens, refeicaoId]
  );
}

module.exports = {
  createRefeicaoItem, updateRefeicaoItem, deleteRefeicaoItem, reordenarItens,
};
