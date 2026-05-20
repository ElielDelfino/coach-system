const alunoModel = require('../../models');

async function listMedidas(req, res) {
  try {
    const aluno = await alunoModel.findById(req.params.id);
    if (!aluno) return res.status(404).json({ message: 'Aluno não encontrado.' });
    const medidas = await alunoModel.findMedidas(req.params.id);
    return res.json(medidas);
  } catch (err) {
    console.error('[admin/listMedidas]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createMedida(req, res) {
  try {
    const aluno = await alunoModel.findById(req.params.id);
    if (!aluno) return res.status(404).json({ message: 'Aluno não encontrado.' });
    const medida = await alunoModel.createMedida(req.params.id, req.body);
    return res.status(201).json(medida);
  } catch (err) {
    console.error('[admin/createMedida]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getMedida(req, res) {
  try {
    const medida = await alunoModel.findMedidaById(req.params.medidaId, req.params.id);
    if (!medida) return res.status(404).json({ message: 'Medição não encontrada.' });
    return res.json(medida);
  } catch (err) {
    console.error('[admin/getMedida]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function updateMedida(req, res) {
  try {
    const rows = await alunoModel.updateMedida(req.params.medidaId, req.params.id, req.body);
    if (!rows) return res.status(404).json({ message: 'Medição não encontrada.' });
    return res.json({ message: 'Medição atualizada.' });
  } catch (err) {
    console.error('[admin/updateMedida]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function deleteMedida(req, res) {
  try {
    const rows = await alunoModel.deleteMedida(req.params.medidaId, req.params.id);
    if (!rows) return res.status(404).json({ message: 'Medição não encontrada.' });
    return res.json({ message: 'Medição removida.' });
  } catch (err) {
    console.error('[admin/deleteMedida]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = { listMedidas, createMedida, getMedida, updateMedida, deleteMedida };
