const alunoModel = require('../../models');

async function listPagamentos(req, res) {
  try {
    const { aluno_id, vencendo_em, page = '1', limit = '20' } = req.query;
    const result = await alunoModel.findAllPagamentos({
      aluno_id: aluno_id || null,
      vencendo_em: vencendo_em ? parseInt(vencendo_em, 10) : null,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
    return res.json(result);
  } catch (err) {
    console.error('[admin/listPagamentos]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function listPagamentosAluno(req, res) {
  try {
    const aluno = await alunoModel.findById(req.params.id);
    if (!aluno) return res.status(404).json({ message: 'Aluno não encontrado.' });
    return res.json(await alunoModel.findPagamentos(req.params.id));
  } catch (err) {
    console.error('[admin/listPagamentosAluno]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createPagamento(req, res) {
  try {
    const aluno = await alunoModel.findById(req.params.id);
    if (!aluno) return res.status(404).json({ message: 'Aluno não encontrado.' });
    const pag = await alunoModel.createPagamento(req.params.id, req.body, req.user.id);
    return res.status(201).json(pag);
  } catch (err) {
    console.error('[admin/createPagamento]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = { listPagamentos, listPagamentosAluno, createPagamento };
