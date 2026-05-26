const pool = require('../config/db');
const { extrairVideoIdYoutube, urlEmbedYoutube } = require('../services/storage');

// ─── exercícios ────────────────────────────────────────────────────────────────

function decorarExercicio(row) {
  if (!row) return row;
  const videoId = extrairVideoIdYoutube(row.video_youtube_url);
  return {
    ...row,
    video_embed_url: videoId ? urlEmbedYoutube(videoId) : null,
  };
}

// ─── refeições ─────────────────────────────────────────────────────────────────

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

// ─── alunos / status financeiro ────────────────────────────────────────────────

// SQL CASE que deriva o status do aluno a partir de `alunos a` + tabela `faturas`.
// Usa em alunos.findAll / findById / findPerfil. Sempre alias da tabela alunos como `a`.
const STATUS_SQL = `
  CASE
    WHEN a.ativo = false THEN 'inativo'
    WHEN NOT EXISTS (SELECT 1 FROM faturas WHERE aluno_id = a.id) THEN 'neutro'
    WHEN EXISTS (
      SELECT 1 FROM faturas
      WHERE aluno_id = a.id
      AND status = 'pendente'
      AND data_vencimento + (a.dias_tolerancia || ' days')::interval < NOW()
    ) THEN 'inadimplente'
    ELSE 'em_dia'
  END
`;

// ─── fotos ─────────────────────────────────────────────────────────────────────

function toIsoDate(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  try { return new Date(d).toISOString().slice(0, 10); } catch { return String(d); }
}

function agruparFotosPorData(rows) {
  const grupos = new Map();
  for (const r of rows) {
    const key = toIsoDate(r.data_foto);
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push({ id: r.id, url: r.url, posicao: r.posicao });
  }
  return Array.from(grupos.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([data, fotos]) => ({ data, fotos }));
}

// ─── faturas ───────────────────────────────────────────────────────────────────

function calcValorFinal(f) {
  const valor = Number(f.valor);
  if (!f.desconto_tipo || f.desconto_valor == null) return valor;
  if (f.desconto_tipo === 'valor')      return Math.max(0, valor - Number(f.desconto_valor));
  if (f.desconto_tipo === 'percentual') return Math.max(0, valor * (1 - Number(f.desconto_valor) / 100));
  return valor;
}

function recalcFaturaStatus(f) {
  const out = { ...f, valor_final: calcValorFinal(f) };
  if (f.status === 'pago') return out;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (new Date(f.data_vencimento) < hoje) return { ...out, status: 'vencido' };
  return out;
}

// ─── audit trail ───────────────────────────────────────────────────────────────

async function logAudit(clientOrPool, { usuario_id, acao, tabela, registro_id, dados, ip }) {
  try {
    await clientOrPool.query(
      `INSERT INTO audit_log (usuario_id, acao, tabela, registro_id, dados, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [usuario_id || null, acao, tabela, registro_id || null,
       dados ? JSON.stringify(dados) : null, ip || null]
    );
  } catch {
    // Audit nunca derruba a operação principal
  }
}

module.exports = {
  decorarExercicio,
  calcMacros,
  STATUS_SQL,
  toIsoDate,
  agruparFotosPorData,
  calcValorFinal,
  recalcFaturaStatus,
  logAudit,
};
