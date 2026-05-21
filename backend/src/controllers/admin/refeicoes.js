const alunoModel = require('../../models');

async function listRefeicoes(req, res) {
  try {
    const p = await alunoModel.findProtocoloById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    return res.json(await alunoModel.findRefeicoes(req.params.id));
  } catch (err) {
    req.log.error({ err }, 'admin/listRefeicoes');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createRefeicao(req, res) {
  try {
    const p = await alunoModel.findProtocoloById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    return res.status(201).json(await alunoModel.createRefeicao(req.params.id, req.body));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Já existe uma refeição com este número neste protocolo.' });
    }
    req.log.error({ err }, 'admin/createRefeicao');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function duplicarRefeicao(req, res) {
  try {
    const { numero_refeicao_destino } = req.body;
    const nova = await alunoModel.duplicarRefeicao(req.params.id, numero_refeicao_destino);
    return res.status(201).json(nova);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return res.status(404).json({ message: 'Refeição não encontrada.' });
    if (err.code === 'CONFLICT') {
      return res.status(400).json({ message: 'Já existe uma refeição com esse número neste protocolo.' });
    }
    req.log.error({ err }, 'admin/duplicarRefeicao');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function updateRefeicao(req, res) {
  try {
    const rows = await alunoModel.updateRefeicao(req.params.id, req.body);
    if (!rows) return res.status(404).json({ message: 'Refeição não encontrada.' });
    return res.json({ message: 'Refeição atualizada.' });
  } catch (err) {
    req.log.error({ err }, 'admin/updateRefeicao');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function deleteRefeicao(req, res) {
  try {
    const rows = await alunoModel.deleteRefeicao(req.params.id);
    if (!rows) return res.status(404).json({ message: 'Refeição não encontrada.' });
    return res.json({ message: 'Refeição removida.' });
  } catch (err) {
    req.log.error({ err }, 'admin/deleteRefeicao');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createRefeicaoItem(req, res) {
  try {
    const { alimento_id, quantidade_g, ordem, observacoes } = req.body;
    const item = await alunoModel.createRefeicaoItem(
      req.params.id, alimento_id, quantidade_g, ordem, observacoes
    );
    return res.status(201).json(item);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return res.status(404).json({ message: 'Alimento não encontrado.' });
    if (err.code === '23503') return res.status(404).json({ message: 'Refeição ou alimento não encontrado.' });
    req.log.error({ err }, 'admin/createRefeicaoItem');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function updateRefeicaoItem(req, res) {
  try {
    const rows = await alunoModel.updateRefeicaoItem(req.params.itemId, req.body);
    if (!rows) return res.status(404).json({ message: 'Item não encontrado.' });
    return res.json({ message: 'Item atualizado.' });
  } catch (err) {
    req.log.error({ err }, 'admin/updateRefeicaoItem');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function deleteRefeicaoItem(req, res) {
  try {
    const rows = await alunoModel.deleteRefeicaoItem(req.params.itemId);
    if (!rows) return res.status(404).json({ message: 'Item não encontrado.' });
    return res.json({ message: 'Item removido.' });
  } catch (err) {
    req.log.error({ err }, 'admin/deleteRefeicaoItem');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function reordenarItens(req, res) {
  try {
    await alunoModel.reordenarItens(req.params.refeicaoId, req.body.ordem);
    return res.json({ message: 'Itens reordenados.' });
  } catch (err) {
    req.log.error({ err }, 'admin/reordenarItens');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createSubstituto(req, res) {
  try {
    const { alimento_id, quantidade_g } = req.body;
    const sub = await alunoModel.createSubstituto(req.params.itemId, alimento_id, quantidade_g);
    return res.status(201).json(sub);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Substituto já cadastrado para este item.' });
    if (err.code === '23503') return res.status(404).json({ message: 'Item ou alimento não encontrado.' });
    req.log.error({ err }, 'admin/createSubstituto');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function deleteSubstituto(req, res) {
  try {
    const rows = await alunoModel.deleteSubstituto(req.params.substitutoId);
    if (!rows) return res.status(404).json({ message: 'Substituto não encontrado.' });
    return res.json({ message: 'Substituto removido.' });
  } catch (err) {
    req.log.error({ err }, 'admin/deleteSubstituto');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = {
  listRefeicoes, createRefeicao, duplicarRefeicao, updateRefeicao, deleteRefeicao,
  createRefeicaoItem, updateRefeicaoItem, deleteRefeicaoItem, reordenarItens,
  createSubstituto, deleteSubstituto,
};
