const bcrypt = require('bcryptjs');
const alunoModel = require('../../models');
const redis = require('../../config/redis');

async function listAlunos(req, res) {
  try {
    const { ativo = 'true', busca, page = '1', limit = '20' } = req.query;
    const result = await alunoModel.findAll({
      ativo: ativo === 'true',
      busca: busca || null,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
    return res.json(result);
  } catch (err) {
    console.error('[admin/listAlunos]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createAluno(req, res) {
  try {
    const {
      nome, email, senha, telefone, data_nascimento, sexo, objetivo, restricoes, lesoes,
      dias_tolerancia, periodicidade_dias,
    } = req.body;

    const senha_hash = await bcrypt.hash(senha, 12);
    const aluno = await alunoModel.create({
      nome, email, senha_hash, telefone, data_nascimento, sexo, objetivo, restricoes, lesoes,
      dias_tolerancia, periodicidade_dias,
    });
    return res.status(201).json(aluno);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'E-mail já cadastrado.' });
    }
    console.error('[admin/createAluno]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getAluno(req, res) {
  try {
    const aluno = await alunoModel.findById(req.params.id);
    if (!aluno) return res.status(404).json({ message: 'Aluno não encontrado.' });
    return res.json(aluno);
  } catch (err) {
    console.error('[admin/getAluno]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function updateAluno(req, res) {
  try {
    const rows = await alunoModel.update(req.params.id, req.body);
    if (rows === 0) return res.status(404).json({ message: 'Aluno não encontrado.' });
    return res.json({ message: 'Aluno atualizado com sucesso.' });
  } catch (err) {
    console.error('[admin/updateAluno]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function ativarAluno(req, res) {
  try {
    const userId = await alunoModel.ativar(req.params.id);
    if (!userId) return res.status(404).json({ message: 'Aluno não encontrado.' });
    await redis.del(`blacklist:user:${userId}`);
    return res.json({ message: 'Aluno ativado com sucesso.' });
  } catch (err) {
    console.error('[admin/ativarAluno]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function desativarAluno(req, res) {
  try {
    const userId = await alunoModel.desativar(req.params.id);
    if (!userId) return res.status(404).json({ message: 'Aluno não encontrado.' });
    await redis.set(`blacklist:user:${userId}`, '1', 'EX', 7 * 24 * 3600);
    return res.json({ message: 'Aluno desativado com sucesso.' });
  } catch (err) {
    console.error('[admin/desativarAluno]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function redefinirSenhaAluno(req, res) {
  try {
    const { senha } = req.body;

    const aluno = await alunoModel.findById(req.params.id);
    if (!aluno) return res.status(404).json({ message: 'Aluno não encontrado.' });

    const senha_hash = await bcrypt.hash(senha, 12);
    const updated = await alunoModel.updateSenhaByAlunoId(req.params.id, senha_hash);
    if (!updated) return res.status(404).json({ message: 'Aluno não encontrado.' });

    return res.json({ message: 'Senha redefinida com sucesso.' });
  } catch (err) {
    console.error('[admin/redefinirSenhaAluno]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = {
  listAlunos, createAluno, getAluno, updateAluno,
  ativarAluno, desativarAluno, redefinirSenhaAluno,
};
