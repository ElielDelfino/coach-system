const alunoModel = require('../models/aluno');
const pool = require('../config/db');
const { gerarPDFProtocolo } = require('../services/pdf');

const POSICOES_FOTO = ['frente', 'costas', 'lado_dir', 'lado_esq'];

async function getPerfil(req, res) {
  try {
    const perfil = await alunoModel.findPerfil(req.user.id);
    if (!perfil) return res.status(404).json({ message: 'Perfil não encontrado.' });
    return res.json(perfil);
  } catch (err) {
    console.error('[aluno/getPerfil]', err);
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
    console.error('[aluno/getEvolucao]', err);
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
    console.error('[aluno/getMedidas]', err);
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
    console.error('[aluno/getFotos]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createFoto(req, res) {
  try {
    const aluno_id = req.user.aluno_id;
    if (!aluno_id) return res.status(403).json({ message: 'Acesso negado.' });
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
    console.error('[aluno/createFoto]', err);
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
    console.error('[aluno/baixarProtocoloPdf]', err);
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
    console.error('[aluno/getPagamentos]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getFaturas(req, res) {
  try {
    const faturas = await alunoModel.findFaturasByAlunoUserId(req.user.id);
    return res.json(faturas);
  } catch (err) {
    console.error('[aluno/getFaturas]', err);
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
    console.error('[aluno/listProtocolos]', err);
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
    console.error('[aluno/getProtocolo]', err);
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
    console.error('[aluno/getRefeicoes]', err);
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
    console.error('[aluno/getTreinos]', err);
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
    console.error('[aluno/getSuplementacao]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = {
  getPerfil, getMedidas, getFotos, createFoto, getPagamentos, getFaturas,
  listProtocolos, getProtocolo, getRefeicoes, getTreinos, getSuplementacao,
  baixarProtocoloPdf, getEvolucao,
};
