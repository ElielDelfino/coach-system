const alunoModel = require('../../models');
const redis = require('../../config/redis');

async function listFaturasAluno(req, res) {
  try {
    const aluno = await alunoModel.findById(req.params.id);
    if (!aluno) return res.status(404).json({ message: 'Aluno não encontrado.' });
    return res.json(await alunoModel.findFaturasByAluno(req.params.id));
  } catch (err) {
    req.log.error({ err }, 'admin/listFaturasAluno');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createFatura(req, res) {
  try {
    const aluno = await alunoModel.findById(req.params.id);
    if (!aluno) return res.status(404).json({ message: 'Aluno não encontrado.' });
    const fatura = await alunoModel.createFatura(req.params.id, req.body, req.user.id);
    await redis.del(`aluno_status:${aluno.user_id}`);
    return res.status(201).json(fatura);
  } catch (err) {
    req.log.error({ err }, 'admin/createFatura');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function updateFatura(req, res) {
  try {
    const result = await alunoModel.updateFatura(req.params.id, req.body);
    if (result.notFound) return res.status(404).json({ message: 'Fatura não encontrada.' });
    await redis.del(`aluno_status:${result.user_id}`);
    return res.json({ message: 'Fatura atualizada.', fatura: result.fatura });
  } catch (err) {
    req.log.error({ err }, 'admin/updateFatura');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function darBaixaFatura(req, res) {
  try {
    const result = await alunoModel.darBaixaFatura(req.params.id, req.body);
    if (result.notFound) return res.status(404).json({ message: 'Fatura não encontrada.' });
    if (result.jaPago) return res.status(400).json({ message: 'Fatura já está paga.' });
    await redis.del(`aluno_status:${result.user_id}`);
    return res.json(result.fatura);
  } catch (err) {
    req.log.error({ err }, 'admin/darBaixaFatura');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function deleteFatura(req, res) {
  try {
    const result = await alunoModel.deleteFatura(req.params.id);
    if (result.notFound) return res.status(404).json({ message: 'Fatura não encontrada.' });
    await redis.del(`aluno_status:${result.user_id}`);
    return res.json({ message: 'Fatura removida.' });
  } catch (err) {
    req.log.error({ err }, 'admin/deleteFatura');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = { listFaturasAluno, createFatura, updateFatura, darBaixaFatura, deleteFatura };
