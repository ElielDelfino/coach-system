const alunoModel = require('../../models');

async function listCardio(req, res) {
  try {
    const { tipo, intensidade, ativo = 'true' } = req.query;
    return res.json(await alunoModel.findCardio({ tipo, intensidade, ativo: ativo !== 'false' }));
  } catch (err) {
    req.log.error({ err }, 'admin/listCardio');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createCardio(req, res) {
  try {
    return res.status(201).json(await alunoModel.createCardio(req.body));
  } catch (err) {
    req.log.error({ err }, 'admin/createCardio');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getCardio(req, res) {
  try {
    const c = await alunoModel.findCardioById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Cardio não encontrado.' });
    return res.json(c);
  } catch (err) {
    req.log.error({ err }, 'admin/getCardio');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function updateCardio(req, res) {
  try {
    const rows = await alunoModel.updateCardio(req.params.id, req.body);
    if (!rows) return res.status(404).json({ message: 'Cardio não encontrado.' });
    return res.json({ message: 'Cardio atualizado com sucesso.' });
  } catch (err) {
    req.log.error({ err }, 'admin/updateCardio');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function desativarCardio(req, res) {
  try {
    const rows = await alunoModel.setCardioAtivo(req.params.id, false);
    if (!rows) return res.status(404).json({ message: 'Cardio não encontrado.' });
    return res.json({ message: 'Cardio desativado.' });
  } catch (err) {
    req.log.error({ err }, 'admin/desativarCardio');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = { listCardio, createCardio, getCardio, updateCardio, desativarCardio };
