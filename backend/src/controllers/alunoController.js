const alunoModel = require('../models');
const pool = require('../config/db');
const redis = require('../config/redis');
const { gerarPDFProtocolo } = require('../services/pdf');

function chaveProgresso(aluno_id) {
  const agora = new Date();
  const ano = agora.getUTCFullYear();
  // Semana ISO aproximada (suficiente para invalidação local — não precisa ser exata).
  const inicioAno = new Date(Date.UTC(ano, 0, 1));
  const diasDoAno = Math.floor((agora - inicioAno) / 86400000);
  const semana = Math.ceil((diasDoAno + inicioAno.getUTCDay() + 1) / 7);
  return `progresso:${aluno_id}:${ano}-${semana}`;
}

const POSICOES_FOTO = ['frente', 'costas', 'lado_dir', 'lado_esq'];

async function getPerfil(req, res) {
  try {
    const perfil = await alunoModel.findPerfil(req.user.id);
    if (!perfil) return res.status(404).json({ message: 'Perfil não encontrado.' });
    return res.json(perfil);
  } catch (err) {
    req.log.error({ err }, 'aluno/getPerfil');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getEvolucao(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });
    const { rows } = await pool.query(
      `SELECT
         TO_CHAR(DATE(data_medicao), 'YYYY-MM-DD') AS data,
         peso_kg, percentual_gordura, peso_magro_kg, peso_gordo_kg,
         cintura_cm, quadril_cm,
         braco_dir_cm, braco_esq_cm,
         coxa_dir_cm, coxa_esq_cm
       FROM aluno_medidas
       WHERE aluno_id = $1
       ORDER BY data_medicao ASC`,
      [aluno_id]
    );
    const num = (v) => (v == null ? null : Number(v));
    const evolucao = rows.map((r) => ({
      data: r.data,
      peso_kg: num(r.peso_kg),
      percentual_gordura: num(r.percentual_gordura),
      peso_magro_kg: num(r.peso_magro_kg),
      peso_gordo_kg: num(r.peso_gordo_kg),
      cintura_cm: num(r.cintura_cm),
      quadril_cm: num(r.quadril_cm),
      braco_dir_cm: num(r.braco_dir_cm),
      braco_esq_cm: num(r.braco_esq_cm),
      coxa_dir_cm: num(r.coxa_dir_cm),
      coxa_esq_cm: num(r.coxa_esq_cm),
    }));
    return res.json({ evolucao });
  } catch (err) {
    req.log.error({ err }, 'aluno/getEvolucao');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getMedidas(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });
    const medidas = await alunoModel.findMedidas(aluno_id);
    return res.json(medidas);
  } catch (err) {
    req.log.error({ err }, 'aluno/getMedidas');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getFotos(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });
    const fotos = await alunoModel.findFotos(aluno_id);
    return res.json(fotos);
  } catch (err) {
    req.log.error({ err }, 'aluno/getFotos');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createFoto(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });

    const liberado = await pool.query(
      `SELECT envio_fotos_liberado FROM alunos WHERE id = $1`,
      [aluno_id]
    );
    if (!liberado.rows[0]?.envio_fotos_liberado) {
      return res.status(403).json({ message: 'Envio de fotos não liberado pelo professor.' });
    }

    const { posicao } = req.body || {};
    if (!req.file) {
      return res.status(400).json({ message: 'Arquivo foto é obrigatório.' });
    }
    if (!posicao) {
      return res.status(400).json({ message: 'posicao é obrigatória.' });
    }
    if (!POSICOES_FOTO.includes(posicao)) {
      return res.status(400).json({ message: `posicao deve ser um de: ${POSICOES_FOTO.join(', ')}` });
    }
    const foto = await alunoModel.createFoto(aluno_id, {
      url: req.file.location,
      s3_key: req.file.key,
      posicao,
      data_foto: new Date().toISOString().slice(0, 10),
      enviada_por: req.user.id,
    });
    return res.status(201).json(foto);
  } catch (err) {
    req.log.error({ err }, 'aluno/createFoto');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function baixarProtocoloPdf(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });

    const protocolo = await alunoModel.findProtocoloById(req.params.id);
    if (!protocolo) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    if (protocolo.aluno_id !== aluno_id) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }

    const aluno = await alunoModel.findById(aluno_id);
    if (!aluno) return res.status(404).json({ message: 'Aluno não encontrado.' });

    const [refeicoes, treinos, suplementacao, medidas] = await Promise.all([
      protocolo.modulo_alimentar      ? alunoModel.findRefeicoes(req.params.id)     : Promise.resolve([]),
      protocolo.modulo_treino         ? alunoModel.findTreinos(req.params.id)       : Promise.resolve([]),
      protocolo.modulo_suplementacao  ? alunoModel.findSuplementacao(req.params.id) : Promise.resolve([]),
      alunoModel.findMedidas(aluno_id),
    ]);

    const medidaFisica = (medidas && medidas.length) ? medidas[0] : null;
    const pdfBuffer = await gerarPDFProtocolo({
      aluno, protocolo, refeicoes, treinos, suplementacao, medidaFisica,
    });

    const safeName = String(protocolo.nome || 'protocolo')
      .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'protocolo';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="protocolo-${safeName}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    return res.end(pdfBuffer, 'binary');
  } catch (err) {
    req.log.error({ err }, 'aluno/baixarProtocoloPdf');
    return res.status(500).json({ message: 'Erro ao gerar o PDF. Tente novamente.' });
  }
}

async function getPagamentos(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });
    const pagamentos = await alunoModel.findPagamentos(aluno_id);
    return res.json(pagamentos);
  } catch (err) {
    req.log.error({ err }, 'aluno/getPagamentos');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getFaturas(req, res) {
  try {
    const faturas = await alunoModel.findFaturasByAlunoUserId(req.user.id);
    return res.json(faturas);
  } catch (err) {
    req.log.error({ err }, 'aluno/getFaturas');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function listProtocolos(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });
    const protocolos = await alunoModel.findProtocolos(aluno_id);
    return res.json(protocolos);
  } catch (err) {
    req.log.error({ err }, 'aluno/listProtocolos');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getProtocolo(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });
    const protocolo = await alunoModel.findProtocoloById(req.params.id);
    if (!protocolo) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    if (protocolo.aluno_id !== aluno_id) return res.status(403).json({ message: 'Acesso negado.' });
    return res.json(protocolo);
  } catch (err) {
    req.log.error({ err }, 'aluno/getProtocolo');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getRefeicoes(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });
    const protocolo = await alunoModel.findProtocoloById(req.params.id);
    if (!protocolo) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    if (protocolo.aluno_id !== aluno_id) return res.status(403).json({ message: 'Acesso negado.' });
    const refeicoes = await alunoModel.findRefeicoes(req.params.id);
    return res.json(refeicoes);
  } catch (err) {
    req.log.error({ err }, 'aluno/getRefeicoes');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getTreinos(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });
    const protocolo = await alunoModel.findProtocoloById(req.params.id);
    if (!protocolo) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    if (protocolo.aluno_id !== aluno_id) return res.status(403).json({ message: 'Acesso negado.' });
    const treinos = await alunoModel.findTreinos(req.params.id);
    return res.json(treinos);
  } catch (err) {
    req.log.error({ err }, 'aluno/getTreinos');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getSuplementacao(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });
    const protocolo = await alunoModel.findProtocoloById(req.params.id);
    if (!protocolo) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    if (protocolo.aluno_id !== aluno_id) return res.status(403).json({ message: 'Acesso negado.' });
    const sups = await alunoModel.findSuplementacao(req.params.id);
    return res.json(sups);
  } catch (err) {
    req.log.error({ err }, 'aluno/getSuplementacao');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function iniciarSessaoTreino(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });

    const { treinoId } = req.params;

    // Garante que o treino pertence a um protocolo do aluno
    const { rows } = await pool.query(
      `SELECT t.id
         FROM treinos t
         JOIN protocolos p ON p.id = t.protocolo_id
        WHERE t.id = $1 AND p.aluno_id = $2`,
      [treinoId, aluno_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Treino não encontrado.' });

    const sessao = await alunoModel.iniciarSessao(aluno_id, treinoId);
    return res.status(201).json(sessao);
  } catch (err) {
    req.log.error({ err }, 'aluno/iniciarSessaoTreino');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function concluirSessaoTreino(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });

    const { sessaoId } = req.params;
    const sessao = await alunoModel.concluirSessao(sessaoId, aluno_id, req.body);
    if (!sessao) return res.status(404).json({ message: 'Sessão não encontrada.' });

    try { await redis.del(chaveProgresso(aluno_id)); } catch (e) {
      req.log.warn({ err: e }, 'aluno/concluirSessaoTreino: falha ao invalidar cache');
    }
    return res.json(sessao);
  } catch (err) {
    req.log.error({ err }, 'aluno/concluirSessaoTreino');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getProximoTreino(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });

    const { rows: protRows } = await pool.query(
      `SELECT id FROM protocolos WHERE aluno_id = $1 AND ativo = true LIMIT 1`,
      [aluno_id]
    );
    if (!protRows.length) return res.json({ protocolo_id: null, treino: null });
    const protocoloId = protRows[0].id;

    const treinos = await alunoModel.findTreinos(protocoloId);
    if (!treinos.length) return res.json({ protocolo_id: protocoloId, treino: null });

    const ultima = await alunoModel.ultimaSessaoConcluida(aluno_id);
    if (!ultima) {
      return res.json({ protocolo_id: protocoloId, treino: treinos[0] });
    }
    const idx = treinos.findIndex((t) => t.id === ultima.treino_id);
    const proximo = idx === -1 ? treinos[0] : treinos[(idx + 1) % treinos.length];
    return res.json({ protocolo_id: protocoloId, treino: proximo });
  } catch (err) {
    req.log.error({ err }, 'aluno/getProximoTreino');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getProgressoSemanal(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });

    const key = chaveProgresso(aluno_id);
    try {
      const cached = await redis.get(key);
      if (cached) return res.json(JSON.parse(cached));
    } catch (e) {
      req.log.warn({ err: e }, 'aluno/getProgressoSemanal: falha ao ler cache');
    }

    // Semana corrente (segunda → domingo)
    const inicioRes = await pool.query(`SELECT date_trunc('week', NOW())::date AS inicio`);
    const inicio = inicioRes.rows[0].inicio;
    const fimRes = await pool.query(`SELECT ($1::date + INTERVAL '6 days')::date AS fim`, [inicio]);
    const fim = fimRes.rows[0].fim;

    const [protRes, treinosFeitosRes, medidasRes, fotosRes, refeicoesCheckinRes] = await Promise.all([
      pool.query(
        `SELECT id FROM protocolos WHERE aluno_id = $1 AND ativo = true LIMIT 1`,
        [aluno_id]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS feitos
           FROM treino_sessoes
          WHERE aluno_id = $1
            AND concluido_em IS NOT NULL
            AND concluido_em >= date_trunc('week', NOW())`,
        [aluno_id]
      ),
      pool.query(
        `SELECT MAX(data_medicao) AS ultima FROM aluno_medidas WHERE aluno_id = $1`,
        [aluno_id]
      ),
      pool.query(
        `SELECT MAX(data_foto) AS ultima FROM aluno_fotos WHERE aluno_id = $1`,
        [aluno_id]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS feitos
           FROM refeicao_checkins
          WHERE aluno_id = $1
            AND data >= date_trunc('week', NOW())::date`,
        [aluno_id]
      ),
    ]);

    let meta = 0;
    let metaRefeicoes = 0;
    if (protRes.rows[0]) {
      const { rows } = await pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM treinos   WHERE protocolo_id = $1) AS total_treinos,
           (SELECT COUNT(*)::int FROM refeicoes WHERE protocolo_id = $1) AS total_refeicoes`,
        [protRes.rows[0].id]
      );
      meta = rows[0]?.total_treinos || 0;
      metaRefeicoes = rows[0]?.total_refeicoes || 0;
    }

    const feitos = treinosFeitosRes.rows[0]?.feitos || 0;
    const pctTreinos = meta > 0 ? Math.min(100, Math.round((feitos / meta) * 100)) : 0;

    const refeicoesFeitas = refeicoesCheckinRes.rows[0]?.feitos || 0;
    const metaRefeicoesSemana = metaRefeicoes * 7;
    const pctRefeicoes = metaRefeicoesSemana > 0
      ? Math.min(100, Math.round((refeicoesFeitas / metaRefeicoesSemana) * 100))
      : 0;

    const diasDesde = (d) => {
      if (!d) return null;
      const ms = Date.now() - new Date(d).getTime();
      return Math.max(0, Math.floor(ms / 86400000));
    };
    const medidasUltima = medidasRes.rows[0]?.ultima || null;
    const fotosUltima = fotosRes.rows[0]?.ultima || null;
    const medidasDias = diasDesde(medidasUltima);
    const fotosDias = diasDesde(fotosUltima);
    const medidasOk = medidasDias !== null && medidasDias < 14;
    const fotosOk = fotosDias !== null && fotosDias < 14;

    const score = Math.round(
      0.45 * pctTreinos +
      0.30 * pctRefeicoes +
      0.125 * (medidasOk ? 100 : 0) +
      0.125 * (fotosOk ? 100 : 0)
    );

    const payload = {
      semana: {
        inicio: inicio instanceof Date ? inicio.toISOString().slice(0, 10) : String(inicio),
        fim:    fim instanceof Date    ? fim.toISOString().slice(0, 10)    : String(fim),
      },
      treinos: { feitos, meta, percentual: pctTreinos },
      refeicoes: {
        feitas: refeicoesFeitas,
        meta_semanal: metaRefeicoesSemana,
        percentual: pctRefeicoes,
      },
      medidas: {
        atualizado_em: medidasUltima,
        dias_desde: medidasDias,
        ok: medidasOk,
      },
      fotos: {
        ultimo_envio: fotosUltima,
        dias_desde: fotosDias,
        ok: fotosOk,
      },
      score_geral: score,
    };

    try { await redis.set(key, JSON.stringify(payload), 'EX', 300); } catch (e) {
      req.log.warn({ err: e }, 'aluno/getProgressoSemanal: falha ao gravar cache');
    }
    return res.json(payload);
  } catch (err) {
    req.log.error({ err }, 'aluno/getProgressoSemanal');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function registrarCheckinRefeicao(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });

    const { refeicaoId } = req.params;
    const data = req.body?.data || new Date().toISOString().slice(0, 10);

    // Garante que a refeição pertence a um protocolo do aluno
    const { rows } = await pool.query(
      `SELECT r.id
         FROM refeicoes r
         JOIN protocolos p ON p.id = r.protocolo_id
        WHERE r.id = $1 AND p.aluno_id = $2`,
      [refeicaoId, aluno_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Refeição não encontrada.' });

    const checkin = await alunoModel.registrarCheckinRefeicao(aluno_id, refeicaoId, data);
    try { await redis.del(chaveProgresso(aluno_id)); } catch (e) {
      req.log.warn({ err: e }, 'aluno/registrarCheckinRefeicao: falha ao invalidar cache');
    }
    return res.status(201).json(checkin);
  } catch (err) {
    req.log.error({ err }, 'aluno/registrarCheckinRefeicao');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function removerCheckinRefeicao(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });

    const { refeicaoId } = req.params;
    const data = req.query?.data || new Date().toISOString().slice(0, 10);

    const removido = await alunoModel.removerCheckinRefeicao(aluno_id, refeicaoId, data);
    if (!removido) return res.status(404).json({ message: 'Check-in não encontrado.' });

    try { await redis.del(chaveProgresso(aluno_id)); } catch (e) {
      req.log.warn({ err: e }, 'aluno/removerCheckinRefeicao: falha ao invalidar cache');
    }
    return res.status(204).end();
  } catch (err) {
    req.log.error({ err }, 'aluno/removerCheckinRefeicao');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function listarCheckinsRefeicaoDia(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });

    const data = req.query?.data || new Date().toISOString().slice(0, 10);
    const ids = await alunoModel.listarCheckinsDia(aluno_id, data);
    return res.json({ data, refeicao_ids: ids });
  } catch (err) {
    req.log.error({ err }, 'aluno/listarCheckinsRefeicaoDia');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getStreak(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });
    const streak = await alunoModel.calcularStreak(aluno_id);
    return res.json(streak);
  } catch (err) {
    req.log.error({ err }, 'aluno/getStreak');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getAtividadeDiaria(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });
    const dias = Math.min(Math.max(parseInt(req.query?.dias, 10) || 84, 7), 365);
    const atividade = await alunoModel.atividadeDiaria(aluno_id, dias);
    return res.json({ dias, atividade });
  } catch (err) {
    req.log.error({ err }, 'aluno/getAtividadeDiaria');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

function semanaInicio(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diaSemana = d.getDay();
  const diff = diaSemana === 0 ? -6 : 1 - diaSemana; // segunda-feira como início
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

async function enviarFeedbackSemanal(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });

    const semana = semanaInicio();
    const feedback = await alunoModel.upsertFeedback(aluno_id, semana, req.body);
    return res.status(201).json(feedback);
  } catch (err) {
    req.log.error({ err }, 'aluno/enviarFeedbackSemanal');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function listarMeusFeedbacks(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });
    const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || 10, 1), 100);
    const feedbacks = await alunoModel.listarFeedbacksAluno(aluno_id, limit);
    return res.json(feedbacks);
  } catch (err) {
    req.log.error({ err }, 'aluno/listarMeusFeedbacks');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = {
  getPerfil, getMedidas, getFotos, createFoto, getPagamentos, getFaturas,
  listProtocolos, getProtocolo, getRefeicoes, getTreinos, getSuplementacao,
  baixarProtocoloPdf, getEvolucao,
  iniciarSessaoTreino, concluirSessaoTreino, getProximoTreino, getProgressoSemanal,
  registrarCheckinRefeicao, removerCheckinRefeicao, listarCheckinsRefeicaoDia,
  getStreak, getAtividadeDiaria, enviarFeedbackSemanal, listarMeusFeedbacks,
};
