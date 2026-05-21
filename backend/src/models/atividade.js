const pool = require('../config/db');

// Retorna o streak: número de dias consecutivos com pelo menos 1 atividade
// (treino concluído OU pelo menos 1 check-in de refeição), terminando em hoje ou ontem.
async function calcularStreak(aluno_id) {
  const { rows } = await pool.query(
    `WITH dias_ativos AS (
       SELECT DISTINCT concluido_em::date AS dia
         FROM treino_sessoes
        WHERE aluno_id = $1 AND concluido_em IS NOT NULL
       UNION
       SELECT DISTINCT data AS dia
         FROM refeicao_checkins
        WHERE aluno_id = $1
     )
     SELECT dia FROM dias_ativos
      WHERE dia >= CURRENT_DATE - INTERVAL '180 days'
      ORDER BY dia DESC`,
    [aluno_id]
  );

  if (!rows.length) return { atual: 0, recorde: 0, ultimo_dia: null };

  // Calcula streak atual: dias consecutivos terminando em hoje OU ontem (tolerância 1 dia)
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);

  const datas = rows.map((r) => {
    const d = new Date(r.dia);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const ultimoDia = datas[0];
  let atual = 0;
  if (ultimoDia.getTime() === hoje.getTime() || ultimoDia.getTime() === ontem.getTime()) {
    atual = 1;
    let cursor = ultimoDia;
    for (let i = 1; i < datas.length; i++) {
      const esperado = new Date(cursor);
      esperado.setDate(cursor.getDate() - 1);
      if (datas[i].getTime() === esperado.getTime()) {
        atual += 1;
        cursor = datas[i];
      } else {
        break;
      }
    }
  }

  // Recorde: maior sequência consecutiva no histórico
  let recorde = datas.length ? 1 : 0;
  let seq = 1;
  for (let i = 1; i < datas.length; i++) {
    const prev = datas[i - 1];
    const cur = datas[i];
    const diff = (prev - cur) / 86400000;
    if (diff === 1) {
      seq += 1;
      if (seq > recorde) recorde = seq;
    } else {
      seq = 1;
    }
  }

  return {
    atual,
    recorde,
    ultimo_dia: ultimoDia.toISOString().slice(0, 10),
  };
}

// Retorna atividade agregada por dia nos últimos N dias (default 84 = 12 semanas).
// Cada linha: { data, treinos_concluidos, refeicoes_feitas, score }
async function atividadeDiaria(aluno_id, dias = 84) {
  const { rows } = await pool.query(
    `WITH calendario AS (
       SELECT generate_series(
         (CURRENT_DATE - ($2::int - 1) * INTERVAL '1 day')::date,
         CURRENT_DATE::date,
         INTERVAL '1 day'
       )::date AS data
     ),
     treinos AS (
       SELECT concluido_em::date AS data, COUNT(*)::int AS total
         FROM treino_sessoes
        WHERE aluno_id = $1
          AND concluido_em IS NOT NULL
          AND concluido_em >= CURRENT_DATE - ($2::int - 1) * INTERVAL '1 day'
        GROUP BY 1
     ),
     refs AS (
       SELECT data, COUNT(*)::int AS total
         FROM refeicao_checkins
        WHERE aluno_id = $1
          AND data >= CURRENT_DATE - ($2::int - 1) * INTERVAL '1 day'
        GROUP BY 1
     )
     SELECT c.data,
            COALESCE(t.total, 0) AS treinos_concluidos,
            COALESCE(r.total, 0) AS refeicoes_feitas
       FROM calendario c
       LEFT JOIN treinos t ON t.data = c.data
       LEFT JOIN refs    r ON r.data = c.data
      ORDER BY c.data ASC`,
    [aluno_id, dias]
  );
  return rows.map((row) => ({
    data: row.data instanceof Date ? row.data.toISOString().slice(0, 10) : String(row.data),
    treinos_concluidos: row.treinos_concluidos,
    refeicoes_feitas: row.refeicoes_feitas,
  }));
}

module.exports = { calcularStreak, atividadeDiaria };
