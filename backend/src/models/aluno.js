const pool = require('../config/db');

// ─── helpers ──────────────────────────────────────────────────────────────────

function calcMacros(alimento, quantidade_g) {
  const f = quantidade_g / Number(alimento.quantidade_base);
  const r = (v) => Math.round(Number(v) * f * 10) / 10;
  return {
    kcal_calculado: r(alimento.calorias),
    carb_calculado: r(alimento.carboidratos),
    prot_calculado: r(alimento.proteinas),
    gord_calculado: r(alimento.gorduras),
  };
}

function statusAluno(ativo, vencimento) {
  if (!ativo) return 'inativo';
  const venc = vencimento ? new Date(vencimento) : null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (!venc || venc < hoje) return 'inadimplente';
  return 'ativo';
}

// ─── alunos ───────────────────────────────────────────────────────────────────

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
           MAX(p.vencimento) AS vencimento_plano
    FROM alunos a
    JOIN users u ON u.id = a.user_id
    LEFT JOIN pagamentos p ON p.aluno_id = a.id
    ${where}
    GROUP BY a.id, a.user_id, a.nome, u.email, a.telefone, a.ativo, a.created_at
    ORDER BY a.nome
    LIMIT $2 OFFSET $3
  `;

  const countQ = `
    SELECT COUNT(DISTINCT a.id) AS total
    FROM alunos a
    JOIN users u ON u.id = a.user_id
    ${where}
  `;

  const [dataRes, countRes] = await Promise.all([
    pool.query(dataQ, params),
    pool.query(countQ, busca ? [ativo, `%${busca}%`] : [ativo]),
  ]);

  const data = dataRes.rows.map((r) => ({
    ...r,
    status: statusAluno(r.ativo, r.vencimento_plano),
  }));

  return { data, total: Number(countRes.rows[0].total), page, limit };
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT a.id, a.user_id, a.nome, u.email, a.telefone, a.data_nascimento, a.sexo,
            a.objetivo, a.restricoes, a.lesoes, a.observacoes, a.ativo,
            a.created_at, a.updated_at,
            MAX(p.vencimento) AS vencimento_plano,
            (SELECT json_build_object(
               'data_medicao', am.data_medicao,
               'peso_kg', am.peso_kg,
               'percentual_gordura', am.percentual_gordura,
               'peso_magro_kg', am.peso_magro_kg,
               'peso_gordo_kg', am.peso_gordo_kg
             )
             FROM aluno_medidas am
             WHERE am.aluno_id = a.id
             ORDER BY am.data_medicao DESC
             LIMIT 1
            ) AS ultima_medicao
     FROM alunos a
     JOIN users u ON u.id = a.user_id
     LEFT JOIN pagamentos p ON p.aluno_id = a.id
     WHERE a.id = $1
     GROUP BY a.id, a.user_id, a.nome, u.email, a.telefone, a.data_nascimento, a.sexo,
              a.objetivo, a.restricoes, a.lesoes, a.observacoes, a.ativo, a.created_at, a.updated_at`,
    [id]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return { ...r, status: statusAluno(r.ativo, r.vencimento_plano) };
}

async function create({ nome, email, senha_hash, telefone, data_nascimento, sexo, objetivo, restricoes, lesoes }) {
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
      `INSERT INTO alunos (user_id, nome, telefone, data_nascimento, sexo, objetivo, restricoes, lesoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, created_at`,
      [u.id, nome, telefone || null, data_nascimento || null, sexo || null,
       objetivo || null, restricoes || null, lesoes || null]
    );
    const a = aRes.rows[0];
    await client.query('COMMIT');
    return { id: a.id, user_id: u.id, nome, email: u.email, created_at: a.created_at };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function update(id, fields) {
  const allowed = ['nome', 'telefone', 'data_nascimento', 'sexo', 'objetivo', 'restricoes', 'lesoes', 'observacoes'];
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

// ─── aluno_medidas ────────────────────────────────────────────────────────────

async function findMedidas(aluno_id) {
  const { rows } = await pool.query(
    `SELECT id, data_medicao, peso_kg, altura_cm, percentual_gordura, peso_magro_kg,
            peso_gordo_kg, cintura_cm, quadril_cm, torax_cm, braco_dir_cm, braco_esq_cm,
            antebraco_dir_cm, antebraco_esq_cm, coxa_dir_cm, coxa_esq_cm,
            panturrilha_dir_cm, panturrilha_esq_cm, observacoes, created_at
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
        peso_gordo_kg, cintura_cm, quadril_cm, torax_cm, braco_dir_cm, braco_esq_cm,
        antebraco_dir_cm, antebraco_esq_cm, coxa_dir_cm, coxa_esq_cm,
        panturrilha_dir_cm, panturrilha_esq_cm, observacoes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING id, data_medicao, created_at`,
    [aluno_id, d.data_medicao, d.peso_kg || null, d.altura_cm || null,
     d.percentual_gordura || null, d.peso_magro_kg || null, d.peso_gordo_kg || null,
     d.cintura_cm || null, d.quadril_cm || null, d.torax_cm || null,
     d.braco_dir_cm || null, d.braco_esq_cm || null, d.antebraco_dir_cm || null,
     d.antebraco_esq_cm || null, d.coxa_dir_cm || null, d.coxa_esq_cm || null,
     d.panturrilha_dir_cm || null, d.panturrilha_esq_cm || null, d.observacoes || null]
  );
  return rows[0];
}

// ─── aluno_fotos ──────────────────────────────────────────────────────────────

async function findFotos(aluno_id) {
  const { rows } = await pool.query(
    `SELECT id, url, posicao, data_foto, created_at
     FROM aluno_fotos WHERE aluno_id = $1 ORDER BY data_foto DESC`,
    [aluno_id]
  );
  return rows;
}

async function createFoto(aluno_id, { url, posicao, data_foto }) {
  const { rows } = await pool.query(
    `INSERT INTO aluno_fotos (aluno_id, url, posicao, data_foto)
     VALUES ($1,$2,$3,$4) RETURNING id, url, posicao, data_foto`,
    [aluno_id, url, posicao, data_foto || new Date().toISOString().slice(0, 10)]
  );
  return rows[0];
}

async function deleteFoto(fotoId, aluno_id) {
  const { rowCount } = await pool.query(
    `DELETE FROM aluno_fotos WHERE id = $1 AND aluno_id = $2`,
    [fotoId, aluno_id]
  );
  return rowCount;
}

// ─── pagamentos ───────────────────────────────────────────────────────────────

async function findAllPagamentos({ aluno_id, vencendo_em, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const params = [limit, offset];
  const conditions = [];

  if (aluno_id) { params.push(aluno_id); conditions.push(`p.aluno_id = $${params.length}`); }
  if (vencendo_em) {
    params.push(vencendo_em);
    conditions.push(`p.vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + ($${params.length} || ' days')::interval`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQ = `
    SELECT p.id, p.aluno_id, a.nome AS nome_aluno, p.valor, p.data_pagamento,
           p.metodo, p.vencimento, p.registrado_por, p.observacoes, p.created_at
    FROM pagamentos p
    JOIN alunos a ON a.id = p.aluno_id
    ${where}
    ORDER BY p.created_at DESC
    LIMIT $1 OFFSET $2
  `;
  const countQ = `SELECT COUNT(*) AS total FROM pagamentos p JOIN alunos a ON a.id = p.aluno_id ${where}`;
  const countParams = conditions.length ? params.slice(2) : [];

  const [d, c] = await Promise.all([
    pool.query(dataQ, params),
    pool.query(countQ, countParams),
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

// ─── exercicios ───────────────────────────────────────────────────────────────

async function findExercicios({ grupo_muscular, nivel, ativo = true, busca }) {
  const params = [];
  const conditions = [`e.ativo = $${params.push(ativo)}`];
  if (grupo_muscular) conditions.push(`e.grupo_muscular ILIKE $${params.push(`%${grupo_muscular}%`)}`);
  if (nivel) conditions.push(`e.nivel = $${params.push(nivel)}`);
  if (busca) conditions.push(`e.nome ILIKE $${params.push(`%${busca}%`)}`);

  const where = `WHERE ${conditions.join(' AND ')}`;
  const { rows } = await pool.query(
    `SELECT id, nome, grupo_muscular, equipamento, nivel, thumbnail_url, ativo
     FROM exercicios AS e ${where} ORDER BY e.nome`,
    params
  );
  return { data: rows, total: rows.length };
}

async function findExercicioById(id) {
  const { rows } = await pool.query(
    `SELECT * FROM exercicios WHERE id = $1`, [id]
  );
  return rows[0] || null;
}

async function createExercicio(d) {
  const { rows } = await pool.query(
    `INSERT INTO exercicios
       (nome, grupo_muscular, equipamento, nivel, video_url, thumbnail_url,
        observacoes_tecnicas, execucao_correta, execucao_errada,
        descanso_padrao_seg, series_recomendadas, repeticoes_recomendadas,
        cadencia, exercicio_substituto_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING id, nome, created_at`,
    [d.nome, d.grupo_muscular, d.equipamento || null, d.nivel || null,
     d.video_url || null, d.thumbnail_url || null, d.observacoes_tecnicas || null,
     d.execucao_correta || null, d.execucao_errada || null,
     d.descanso_padrao_seg || null, d.series_recomendadas || null,
     d.repeticoes_recomendadas || null, d.cadencia || null,
     d.exercicio_substituto_id || null]
  );
  return rows[0];
}

async function updateExercicio(id, d) {
  const allowed = ['nome','grupo_muscular','equipamento','nivel','video_url','thumbnail_url',
    'observacoes_tecnicas','execucao_correta','execucao_errada','descanso_padrao_seg',
    'series_recomendadas','repeticoes_recomendadas','cadencia','exercicio_substituto_id'];
  const keys = allowed.filter((k) => d[k] !== undefined);
  if (!keys.length) return 0;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rowCount } = await pool.query(
    `UPDATE exercicios SET ${sets} WHERE id = $1`, [id, ...keys.map((k) => d[k])]
  );
  return rowCount;
}

async function setExercicioAtivo(id, ativo) {
  const { rowCount } = await pool.query(
    `UPDATE exercicios SET ativo = $2 WHERE id = $1`, [id, ativo]
  );
  return rowCount;
}

// ─── alimentos ────────────────────────────────────────────────────────────────

async function findAlimentos({ categoria, ativo = true, busca }) {
  const params = [];
  const conditions = [`al.ativo = $${params.push(ativo)}`];
  if (categoria) conditions.push(`al.categoria ILIKE $${params.push(`%${categoria}%`)}`);
  if (busca) conditions.push(`al.nome ILIKE $${params.push(`%${busca}%`)}`);

  const where = `WHERE ${conditions.join(' AND ')}`;
  const { rows } = await pool.query(
    `SELECT id, nome, categoria, quantidade_base, unidade, calorias,
            proteinas, carboidratos, gorduras, ativo
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
    'proteinas','carboidratos','gorduras','fibra','sodio','foto_url'];
  const keys = allowed.filter((k) => d[k] !== undefined);
  if (!keys.length) return 0;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rowCount } = await pool.query(
    `UPDATE alimentos SET ${sets} WHERE id = $1`, [id, ...keys.map((k) => d[k])]
  );
  return rowCount;
}

async function setAlimentoAtivo(id, ativo) {
  const { rowCount } = await pool.query(
    `UPDATE alimentos SET ativo = $2 WHERE id = $1`, [id, ativo]
  );
  return rowCount;
}

// ─── cardio ───────────────────────────────────────────────────────────────────

async function findCardio({ tipo, intensidade, ativo = true }) {
  const params = [];
  const conditions = [`c.ativo = $${params.push(ativo)}`];
  if (tipo) conditions.push(`c.tipo ILIKE $${params.push(`%${tipo}%`)}`);
  if (intensidade) conditions.push(`c.intensidade = $${params.push(intensidade)}`);

  const where = `WHERE ${conditions.join(' AND ')}`;
  const { rows } = await pool.query(
    `SELECT id, tipo, intensidade, duracao_min, gasto_calorico_estimado,
            inclinacao, velocidade, ativo
     FROM cardio AS c ${where} ORDER BY c.tipo`,
    params
  );
  return { data: rows, total: rows.length };
}

async function findCardioById(id) {
  const { rows } = await pool.query(`SELECT * FROM cardio WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function createCardio(d) {
  const { rows } = await pool.query(
    `INSERT INTO cardio (tipo, intensidade, duracao_min, gasto_calorico_estimado, inclinacao, velocidade, observacoes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, tipo, created_at`,
    [d.tipo, d.intensidade || null, d.duracao_min || null,
     d.gasto_calorico_estimado || null, d.inclinacao || null,
     d.velocidade || null, d.observacoes || null]
  );
  return rows[0];
}

async function updateCardio(id, d) {
  const allowed = ['tipo','intensidade','duracao_min','gasto_calorico_estimado','inclinacao','velocidade','observacoes'];
  const keys = allowed.filter((k) => d[k] !== undefined);
  if (!keys.length) return 0;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rowCount } = await pool.query(
    `UPDATE cardio SET ${sets} WHERE id = $1`, [id, ...keys.map((k) => d[k])]
  );
  return rowCount;
}

async function setCardioAtivo(id, ativo) {
  const { rowCount } = await pool.query(
    `UPDATE cardio SET ativo = $2 WHERE id = $1`, [id, ativo]
  );
  return rowCount;
}

// ─── protocolos ───────────────────────────────────────────────────────────────

async function findProtocolos(aluno_id) {
  const { rows } = await pool.query(
    `SELECT id, nome, objetivo, fase, data_inicio, data_fim, ativo,
            modulo_alimentar, modulo_treino, modulo_cardio, modulo_suplementacao
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
    'modulo_alimentar','modulo_treino','modulo_cardio','modulo_suplementacao','observacoes'];
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

// ─── refeicoes ────────────────────────────────────────────────────────────────

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
    substByItem[s.refeicao_item_id].push({ id: s.id, alimento_id: s.alimento_id, nome_alimento: s.nome_alimento, quantidade_g: s.quantidade_g });
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

// ─── refeicao_itens ───────────────────────────────────────────────────────────

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

// ─── refeicao_item_substitutos ────────────────────────────────────────────────

async function createSubstituto(refeicao_item_id, alimento_id, quantidade_g) {
  const { rows } = await pool.query(
    `INSERT INTO refeicao_item_substitutos (refeicao_item_id, alimento_id, quantidade_g)
     VALUES ($1,$2,$3) RETURNING id, alimento_id, quantidade_g`,
    [refeicao_item_id, alimento_id, quantidade_g]
  );
  return rows[0];
}

async function deleteSubstituto(substitutoId) {
  const { rowCount } = await pool.query(
    `DELETE FROM refeicao_item_substitutos WHERE id = $1`, [substitutoId]
  );
  return rowCount;
}

// ─── treinos ──────────────────────────────────────────────────────────────────

async function findTreinos(protocolo_id) {
  const trRes = await pool.query(
    `SELECT id, nome, ordem FROM treinos WHERE protocolo_id = $1 ORDER BY ordem`,
    [protocolo_id]
  );
  if (!trRes.rows.length) return [];

  const trIds = trRes.rows.map((t) => t.id);
  const exRes = await pool.query(
    `SELECT te.id, te.treino_id, te.tipo, te.exercicio_id, te.cardio_id,
            COALESCE(e.nome, c.tipo) AS nome_exercicio,
            te.series, te.repeticoes, te.descanso_seg, te.observacao,
            te.ordem, te.grupo_superset
     FROM treino_exercicios te
     LEFT JOIN exercicios e ON e.id = te.exercicio_id
     LEFT JOIN cardio c ON c.id = te.cardio_id
     WHERE te.treino_id = ANY($1::uuid[])
     ORDER BY te.ordem`,
    [trIds]
  );

  const exByTreino = {};
  for (const ex of exRes.rows) {
    if (!exByTreino[ex.treino_id]) exByTreino[ex.treino_id] = [];
    exByTreino[ex.treino_id].push(ex);
  }

  return trRes.rows.map((t) => ({ ...t, exercicios: exByTreino[t.id] || [] }));
}

async function createTreino(protocolo_id, { nome, ordem = 0 }) {
  const { rows } = await pool.query(
    `INSERT INTO treinos (protocolo_id, nome, ordem) VALUES ($1,$2,$3)
     RETURNING id, nome, created_at`,
    [protocolo_id, nome, ordem]
  );
  return rows[0];
}

async function updateTreino(id, { nome, ordem }) {
  const fields = {};
  if (nome !== undefined) fields.nome = nome;
  if (ordem !== undefined) fields.ordem = ordem;
  const keys = Object.keys(fields);
  if (!keys.length) return 0;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rowCount } = await pool.query(
    `UPDATE treinos SET ${sets} WHERE id = $1`, [id, ...keys.map((k) => fields[k])]
  );
  return rowCount;
}

async function deleteTreino(id) {
  const { rowCount } = await pool.query(`DELETE FROM treinos WHERE id = $1`, [id]);
  return rowCount;
}

// ─── treino_exercicios ────────────────────────────────────────────────────────

async function createTreinoExercicio(treino_id, d) {
  const { rows } = await pool.query(
    `INSERT INTO treino_exercicios
       (treino_id, tipo, exercicio_id, cardio_id, series, repeticoes,
        descanso_seg, observacao, ordem, grupo_superset)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id, tipo, ordem`,
    [treino_id, d.tipo,
     d.tipo === 'exercicio' ? d.exercicio_id : null,
     d.tipo === 'cardio' ? d.cardio_id : null,
     d.series || null, d.repeticoes || null, d.descanso_seg || null,
     d.observacao || null, d.ordem ?? 0, d.grupo_superset || null]
  );
  return rows[0];
}

async function updateTreinoExercicio(itemId, d) {
  const allowed = ['series','repeticoes','descanso_seg','observacao','ordem','grupo_superset'];
  const keys = allowed.filter((k) => d[k] !== undefined);
  if (!keys.length) return 0;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rowCount } = await pool.query(
    `UPDATE treino_exercicios SET ${sets} WHERE id = $1`,
    [itemId, ...keys.map((k) => d[k])]
  );
  return rowCount;
}

async function deleteTreinoExercicio(itemId) {
  const { rowCount } = await pool.query(
    `DELETE FROM treino_exercicios WHERE id = $1`, [itemId]
  );
  return rowCount;
}

async function reordenarTreinoExercicios(treinoId, ordemArray) {
  const ids = ordemArray.map((o) => o.id);
  const ordens = ordemArray.map((o) => o.ordem);
  await pool.query(
    `UPDATE treino_exercicios AS t
     SET ordem = v.ordem
     FROM unnest($1::uuid[], $2::int[]) AS v(id, ordem)
     WHERE t.id = v.id AND t.treino_id = $3`,
    [ids, ordens, treinoId]
  );
}

// ─── suplementacao ────────────────────────────────────────────────────────────

async function findSuplementacao(protocolo_id) {
  const { rows } = await pool.query(
    `SELECT id, nome_suplemento, dose, horario, observacao, ordem
     FROM suplementacao WHERE protocolo_id = $1 ORDER BY ordem`,
    [protocolo_id]
  );
  return rows;
}

async function createSuplemento(protocolo_id, d) {
  const { rows } = await pool.query(
    `INSERT INTO suplementacao (protocolo_id, nome_suplemento, dose, horario, observacao, ordem)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, nome_suplemento`,
    [protocolo_id, d.nome_suplemento, d.dose, d.horario || null,
     d.observacao || null, d.ordem ?? 0]
  );
  return rows[0];
}

async function updateSuplemento(id, d) {
  const allowed = ['nome_suplemento','dose','horario','observacao','ordem'];
  const keys = allowed.filter((k) => d[k] !== undefined);
  if (!keys.length) return 0;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rowCount } = await pool.query(
    `UPDATE suplementacao SET ${sets} WHERE id = $1`, [id, ...keys.map((k) => d[k])]
  );
  return rowCount;
}

async function deleteSuplemento(id) {
  const { rowCount } = await pool.query(`DELETE FROM suplementacao WHERE id = $1`, [id]);
  return rowCount;
}

// ─── aluno self-service ───────────────────────────────────────────────────────

async function findPerfil(user_id) {
  const { rows } = await pool.query(
    `SELECT a.id, a.nome, u.email, a.telefone, a.data_nascimento, a.sexo,
            a.objetivo, a.restricoes, a.lesoes, a.ativo,
            MAX(p.vencimento) AS vencimento_plano
     FROM alunos a
     JOIN users u ON u.id = a.user_id
     LEFT JOIN pagamentos p ON p.aluno_id = a.id
     WHERE a.user_id = $1
     GROUP BY a.id, a.nome, u.email, a.telefone, a.data_nascimento, a.sexo,
              a.objetivo, a.restricoes, a.lesoes, a.ativo`,
    [user_id]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return { ...r, status: statusAluno(r.ativo, r.vencimento_plano) };
}

module.exports = {
  // alunos
  findAll, findById, create, update, ativar, desativar, findPerfil,
  // medidas
  findMedidas, createMedida,
  // fotos
  findFotos, createFoto, deleteFoto,
  // pagamentos
  findAllPagamentos, findPagamentos, createPagamento,
  // exercicios
  findExercicios, findExercicioById, createExercicio, updateExercicio, setExercicioAtivo,
  // alimentos
  findAlimentos, findAlimentoById, createAlimento, updateAlimento, setAlimentoAtivo,
  // cardio
  findCardio, findCardioById, createCardio, updateCardio, setCardioAtivo,
  // protocolos
  findProtocolos, findProtocoloById, createProtocolo, updateProtocolo, setProtocoloAtivo,
  // refeicoes
  findRefeicoes, findRefeicaoById, createRefeicao, duplicarRefeicao,
  updateRefeicao, deleteRefeicao,
  // refeicao_itens
  createRefeicaoItem, updateRefeicaoItem, deleteRefeicaoItem, reordenarItens,
  // substitutos
  createSubstituto, deleteSubstituto,
  // treinos
  findTreinos, createTreino, updateTreino, deleteTreino,
  // treino_exercicios
  createTreinoExercicio, updateTreinoExercicio, deleteTreinoExercicio, reordenarTreinoExercicios,
  // suplementacao
  findSuplementacao, createSuplemento, updateSuplemento, deleteSuplemento,
};
