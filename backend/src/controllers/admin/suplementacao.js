const alunoModel = require('../../models');

async function listSuplementacao(req, res) {
  try {
    const p = await alunoModel.findProtocoloById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    return res.json(await alunoModel.findSuplementacao(req.params.id));
  } catch (err) {
    console.error('[admin/listSuplementacao]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createSuplemento(req, res) {
  try {
    const p = await alunoModel.findProtocoloById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    return res.status(201).json(await alunoModel.createSuplemento(req.params.id, req.body));
  } catch (err) {
    console.error('[admin/createSuplemento]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function updateSuplemento(req, res) {
  try {
    const rows = await alunoModel.updateSuplemento(req.params.id, req.body);
    if (!rows) return res.status(404).json({ message: 'Suplemento não encontrado.' });
    return res.json({ message: 'Suplemento atualizado.' });
  } catch (err) {
    console.error('[admin/updateSuplemento]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function deleteSuplemento(req, res) {
  try {
    const rows = await alunoModel.deleteSuplemento(req.params.id);
    if (!rows) return res.status(404).json({ message: 'Suplemento não encontrado.' });
    return res.json({ message: 'Suplemento removido.' });
  } catch (err) {
    console.error('[admin/deleteSuplemento]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = { listSuplementacao, createSuplemento, updateSuplemento, deleteSuplemento };
