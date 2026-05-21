const alunoModel = require('../../models');
const { deletarArquivo } = require('../../services/storage');

async function listAlimentos(req, res) {
  try {
    const { categoria, ativo = 'true', busca } = req.query;
    return res.json(await alunoModel.findAlimentos({ categoria, busca, ativo: ativo !== 'false' }));
  } catch (err) {
    req.log.error({ err }, 'admin/listAlimentos');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createAlimento(req, res) {
  try {
    return res.status(201).json(await alunoModel.createAlimento(req.body));
  } catch (err) {
    req.log.error({ err }, 'admin/createAlimento');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getAlimento(req, res) {
  try {
    const al = await alunoModel.findAlimentoById(req.params.id);
    if (!al) return res.status(404).json({ message: 'Alimento não encontrado.' });
    return res.json(al);
  } catch (err) {
    req.log.error({ err }, 'admin/getAlimento');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function updateAlimento(req, res) {
  try {
    const rows = await alunoModel.updateAlimento(req.params.id, req.body);
    if (!rows) return res.status(404).json({ message: 'Alimento não encontrado.' });
    return res.json({ message: 'Alimento atualizado com sucesso.' });
  } catch (err) {
    req.log.error({ err }, 'admin/updateAlimento');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function uploadFotoAlimento(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: 'Arquivo foto é obrigatório.' });
    const result = await alunoModel.trocarAlimentoFoto(req.params.id, {
      foto_url: req.file.location,
      foto_s3_key: req.file.key,
    });
    if (!result.found) {
      await deletarArquivo(req.file.key);
      return res.status(404).json({ message: 'Alimento não encontrado.' });
    }
    if (result.old_key) await deletarArquivo(result.old_key);
    return res.json({
      message: 'Foto atualizada.',
      foto_url: req.file.location,
      foto_s3_key: req.file.key,
    });
  } catch (err) {
    req.log.error({ err }, 'admin/uploadFotoAlimento');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function ativarAlimento(req, res) {
  try {
    const rows = await alunoModel.setAlimentoAtivo(req.params.id, true);
    if (!rows) return res.status(404).json({ message: 'Alimento não encontrado.' });
    return res.json({ message: 'Alimento ativado.' });
  } catch (err) {
    req.log.error({ err }, 'admin/ativarAlimento');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function desativarAlimento(req, res) {
  try {
    const rows = await alunoModel.setAlimentoAtivo(req.params.id, false);
    if (!rows) return res.status(404).json({ message: 'Alimento não encontrado.' });
    return res.json({ message: 'Alimento desativado.' });
  } catch (err) {
    req.log.error({ err }, 'admin/desativarAlimento');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = {
  listAlimentos, createAlimento, getAlimento, updateAlimento,
  uploadFotoAlimento, ativarAlimento, desativarAlimento,
};
