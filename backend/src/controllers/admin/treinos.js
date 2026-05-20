const alunoModel = require('../../models');

async function listTreinos(req, res) {
  try {
    const p = await alunoModel.findProtocoloById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    return res.json(await alunoModel.findTreinos(req.params.id));
  } catch (err) {
    console.error('[admin/listTreinos]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createTreino(req, res) {
  try {
    const p = await alunoModel.findProtocoloById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    return res.status(201).json(await alunoModel.createTreino(req.params.id, req.body));
  } catch (err) {
    console.error('[admin/createTreino]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function updateTreino(req, res) {
  try {
    const rows = await alunoModel.updateTreino(req.params.id, req.body);
    if (!rows) return res.status(404).json({ message: 'Treino não encontrado.' });
    return res.json({ message: 'Treino atualizado.' });
  } catch (err) {
    console.error('[admin/updateTreino]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function deleteTreino(req, res) {
  try {
    const rows = await alunoModel.deleteTreino(req.params.id);
    if (!rows) return res.status(404).json({ message: 'Treino não encontrado.' });
    return res.json({ message: 'Treino removido.' });
  } catch (err) {
    console.error('[admin/deleteTreino]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function duplicarTreino(req, res) {
  try {
    const novo = await alunoModel.duplicarTreino(req.params.id, req.body || {});
    return res.status(201).json(novo);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return res.status(404).json({ message: 'Treino não encontrado.' });
    console.error('[admin/duplicarTreino]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createTreinoExercicio(req, res) {
  try {
    return res.status(201).json(await alunoModel.createTreinoExercicio(req.params.id, req.body));
  } catch (err) {
    if (err.code === '23503') return res.status(404).json({ message: 'Treino, exercício ou cardio não encontrado.' });
    console.error('[admin/createTreinoExercicio]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function updateTreinoExercicio(req, res) {
  try {
    const rows = await alunoModel.updateTreinoExercicio(req.params.itemId, req.body);
    if (!rows) return res.status(404).json({ message: 'Item de treino não encontrado.' });
    return res.json({ message: 'Item de treino atualizado.' });
  } catch (err) {
    console.error('[admin/updateTreinoExercicio]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function deleteTreinoExercicio(req, res) {
  try {
    const rows = await alunoModel.deleteTreinoExercicio(req.params.itemId);
    if (!rows) return res.status(404).json({ message: 'Item de treino não encontrado.' });
    return res.json({ message: 'Item de treino removido.' });
  } catch (err) {
    console.error('[admin/deleteTreinoExercicio]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function reordenarTreinoExercicios(req, res) {
  try {
    await alunoModel.reordenarTreinoExercicios(req.params.treinoId, req.body.ordem);
    return res.json({ message: 'Exercícios reordenados.' });
  } catch (err) {
    console.error('[admin/reordenarTreinoExercicios]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = {
  listTreinos, createTreino, updateTreino, deleteTreino, duplicarTreino,
  createTreinoExercicio, updateTreinoExercicio, deleteTreinoExercicio,
  reordenarTreinoExercicios,
};
