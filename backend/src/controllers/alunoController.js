const alunoModel = require('../models/aluno');

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
  getPerfil, getMedidas, getFotos, getPagamentos,
  listProtocolos, getProtocolo, getRefeicoes, getTreinos, getSuplementacao,
};
