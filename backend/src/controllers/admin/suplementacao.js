const alunoModel = require('../../models');

async function listSuplementacao(req, res) {
  try {
    const p = await alunoModel.findProtocoloById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    return res.json(await alunoModel.findSuplementacao(req.params.id));
  } catch (err) {
    req.log.error({ err }, 'admin/listSuplementacao');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createSuplemento(req, res) {
  try {
    const p = await alunoModel.findProtocoloById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    return res.status(201).json(await alunoModel.createSuplemento(req.params.id, req.body));
  } catch (err) {
    req.log.error({ err }, 'admin/createSuplemento');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function updateSuplemento(req, res) {
  try {
    const rows = await alunoModel.updateSuplemento(req.params.id, req.body);
    if (!rows) return res.status(404).json({ message: 'Suplemento não encontrado.' });
    return res.json({ message: 'Suplemento atualizado.' });
  } catch (err) {
    req.log.error({ err }, 'admin/updateSuplemento');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function deleteSuplemento(req, res) {
  try {
    const rows = await alunoModel.deleteSuplemento(req.params.id);
    if (!rows) return res.status(404).json({ message: 'Suplemento não encontrado.' });
    return res.json({ message: 'Suplemento removido.' });
  } catch (err) {
    req.log.error({ err }, 'admin/deleteSuplemento');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = { listSuplementacao, createSuplemento, updateSuplemento, deleteSuplemento };
