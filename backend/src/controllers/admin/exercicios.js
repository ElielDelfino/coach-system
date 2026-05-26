const alunoModel = require('../../models');
const { deletarArquivo, extrairVideoIdYoutube } = require('../../services/storage');

async function listExercicios(req, res) {
  try {
    const { grupo_muscular, nivel, ativo = 'true', busca, limit, offset } = req.query;
    const lim = Math.min(Math.max(parseInt(limit) || 200, 1), 500);
    const off = Math.max(parseInt(offset) || 0, 0);
    return res.json(await alunoModel.findExercicios({
      grupo_muscular, nivel, busca, ativo: ativo !== 'false', limit: lim, offset: off,
    }));
  } catch (err) {
    req.log.error({ err }, 'admin/listExercicios');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createExercicio(req, res) {
  try {
    const { video_youtube_url } = req.body;
    const body = { ...req.body };
    if (video_youtube_url) {
      const videoId = extrairVideoIdYoutube(video_youtube_url);
      if (!videoId) return res.status(400).json({ message: 'URL do YouTube inválida.' });
      body.video_tipo = 'youtube';
    }
    return res.status(201).json(await alunoModel.createExercicio(body));
  } catch (err) {
    req.log.error({ err }, 'admin/createExercicio');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getExercicio(req, res) {
  try {
    const ex = await alunoModel.findExercicioById(req.params.id);
    if (!ex) return res.status(404).json({ message: 'Exercício não encontrado.' });
    return res.json(ex);
  } catch (err) {
    req.log.error({ err }, 'admin/getExercicio');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function updateExercicio(req, res) {
  try {
    const body = { ...req.body };
    if (body.video_youtube_url !== undefined && body.video_youtube_url !== null && body.video_youtube_url !== '') {
      const videoId = extrairVideoIdYoutube(body.video_youtube_url);
      if (!videoId) return res.status(400).json({ message: 'URL do YouTube inválida.' });
      body.video_tipo = 'youtube';
      body.video_url = null;
    }
    const rows = await alunoModel.updateExercicio(req.params.id, body);
    if (!rows) return res.status(404).json({ message: 'Exercício não encontrado.' });
    return res.json({ message: 'Exercício atualizado com sucesso.' });
  } catch (err) {
    req.log.error({ err }, 'admin/updateExercicio');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function uploadThumbExercicio(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: 'Arquivo thumbnail é obrigatório.' });
    const result = await alunoModel.trocarExercicioThumbnail(req.params.id, {
      thumbnail_url: req.file.location,
      thumbnail_s3_key: req.file.key,
    });
    if (!result.found) {
      await deletarArquivo(req.file.key);
      return res.status(404).json({ message: 'Exercício não encontrado.' });
    }
    if (result.old_key) await deletarArquivo(result.old_key);
    return res.json({
      message: 'Thumbnail atualizada.',
      thumbnail_url: req.file.location,
      thumbnail_s3_key: req.file.key,
    });
  } catch (err) {
    req.log.error({ err }, 'admin/uploadThumbExercicio');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function uploadVideoExercicio(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: 'Arquivo vídeo é obrigatório.' });
    const result = await alunoModel.trocarExercicioVideo(req.params.id, {
      video_url: req.file.location,
      video_s3_key: req.file.key,
    });
    if (!result.found) {
      await deletarArquivo(req.file.key);
      return res.status(404).json({ message: 'Exercício não encontrado.' });
    }
    if (result.old_key) await deletarArquivo(result.old_key);
    return res.json({
      message: 'Vídeo atualizado.',
      video_url: req.file.location,
      video_s3_key: req.file.key,
      video_tipo: 's3',
    });
  } catch (err) {
    req.log.error({ err }, 'admin/uploadVideoExercicio');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function ativarExercicio(req, res) {
  try {
    const rows = await alunoModel.setExercicioAtivo(req.params.id, true);
    if (!rows) return res.status(404).json({ message: 'Exercício não encontrado.' });
    return res.json({ message: 'Exercício ativado.' });
  } catch (err) {
    req.log.error({ err }, 'admin/ativarExercicio');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function desativarExercicio(req, res) {
  try {
    const rows = await alunoModel.setExercicioAtivo(req.params.id, false);
    if (!rows) return res.status(404).json({ message: 'Exercício não encontrado.' });
    return res.json({ message: 'Exercício desativado.' });
  } catch (err) {
    req.log.error({ err }, 'admin/desativarExercicio');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = {
  listExercicios, createExercicio, getExercicio, updateExercicio,
  uploadThumbExercicio, uploadVideoExercicio,
  ativarExercicio, desativarExercicio,
};
