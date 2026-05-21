const pool = require('../../config/db');

async function dashboardEvolucao(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT
         TO_CHAR(DATE(data_medicao), 'YYYY-MM-DD') AS data,
         ROUND(AVG(peso_kg)::numeric, 1)            AS media_peso_kg,
         ROUND(AVG(percentual_gordura)::numeric, 1) AS media_percentual_gordura,
         COUNT(DISTINCT aluno_id)                   AS total_alunos_medidos
       FROM aluno_medidas
       WHERE data_medicao >= NOW() - INTERVAL '90 days'
       GROUP BY DATE(data_medicao)
       ORDER BY DATE(data_medicao) ASC`
    );
    const evolucao = rows.map((r) => ({
      data: r.data,
      media_peso_kg: r.media_peso_kg == null ? null : Number(r.media_peso_kg),
      media_percentual_gordura:
        r.media_percentual_gordura == null ? null : Number(r.media_percentual_gordura),
      total_alunos_medidos: Number(r.total_alunos_medidos),
    }));
    return res.json({ evolucao });
  } catch (err) {
    req.log.error({ err }, 'admin/dashboardEvolucao');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function dashboardResumo(req, res) {
  try {
    const totaisQ = pool.query(
      `SELECT
         COUNT(*)                                        AS total_alunos,
         COUNT(*) FILTER (WHERE ativo = true)            AS total_ativos_flag,
         COUNT(*) FILTER (WHERE ativo = false)           AS total_inativos
       FROM alunos`
    );

    const statusQ = pool.query(
      `SELECT
         COUNT(*) FILTER (
           WHERE a.ativo = true
             AND EXISTS (SELECT 1 FROM faturas WHERE aluno_id = a.id)
             AND NOT EXISTS (
               SELECT 1 FROM faturas
               WHERE aluno_id = a.id
                 AND status = 'pendente'
                 AND data_vencimento + (a.dias_tolerancia || ' days')::interval < NOW()
             )
         ) AS ativos,
         COUNT(*) FILTER (
           WHERE a.ativo = true
             AND EXISTS (
               SELECT 1 FROM faturas
               WHERE aluno_id = a.id
                 AND status = 'pendente'
                 AND data_vencimento + (a.dias_tolerancia || ' days')::interval < NOW()
             )
         ) AS inadimplentes,
         COUNT(*) FILTER (
           WHERE a.ativo = true
             AND NOT EXISTS (SELECT 1 FROM faturas WHERE aluno_id = a.id)
         ) AS neutros
       FROM alunos a`
    );

    const receitaQ = pool.query(
      `SELECT
         COALESCE(SUM(
           CASE
             WHEN desconto_tipo = 'valor'      THEN GREATEST(0, valor - COALESCE(desconto_valor, 0))
             WHEN desconto_tipo = 'percentual' THEN GREATEST(0, valor * (1 - COALESCE(desconto_valor, 0) / 100))
             ELSE valor
           END
         ), 0) AS receita_mes
       FROM faturas
       WHERE status = 'pago'
         AND data_baixa >= DATE_TRUNC('month', NOW())
         AND data_baixa <  DATE_TRUNC('month', NOW()) + INTERVAL '1 month'`
    );

    const aReceberQ = pool.query(
      `SELECT
         COALESCE(SUM(
           CASE
             WHEN desconto_tipo = 'valor'      THEN GREATEST(0, valor - COALESCE(desconto_valor, 0))
             WHEN desconto_tipo = 'percentual' THEN GREATEST(0, valor * (1 - COALESCE(desconto_valor, 0) / 100))
             ELSE valor
           END
         ), 0) AS a_receber_mes
       FROM faturas
       WHERE status = 'pendente'
         AND data_vencimento >= DATE_TRUNC('month', NOW())
         AND data_vencimento <  DATE_TRUNC('month', NOW()) + INTERVAL '1 month'`
    );

    const semMedicaoQ = pool.query(
      `SELECT COUNT(*) AS sem_medicao_30d
       FROM alunos a
       WHERE a.ativo = true
         AND NOT EXISTS (
           SELECT 1 FROM aluno_medidas m
           WHERE m.aluno_id = a.id
             AND m.data_medicao >= NOW() - INTERVAL '30 days'
         )`
    );

    const [totais, statusR, receita, aReceber, semMedicao] = await Promise.all([
      totaisQ, statusQ, receitaQ, aReceberQ, semMedicaoQ,
    ]);

    return res.json({
      total_alunos:           Number(totais.rows[0].total_alunos),
      ativos:                 Number(statusR.rows[0].ativos),
      inadimplentes:          Number(statusR.rows[0].inadimplentes),
      neutros:                Number(statusR.rows[0].neutros),
      receita_mes:            Number(receita.rows[0].receita_mes),
      a_receber_mes:          Number(aReceber.rows[0].a_receber_mes),
      alunos_sem_medicao_30d: Number(semMedicao.rows[0].sem_medicao_30d),
    });
  } catch (err) {
    req.log.error({ err }, 'admin/dashboardResumo');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = { dashboardEvolucao, dashboardResumo };
