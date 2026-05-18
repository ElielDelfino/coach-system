const bcrypt = require('bcryptjs');
const alunoModel = require('../models/aluno');
const redis = require('../config/redis');
const { gerarPDFProtocolo } = require('../services/pdf');
const { enviarProtocoloPorEmail } = require('../services/email');

// ─── alunos ───────────────────────────────────────────────────────────────────

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
    if (!nome || !email || !senha) {
      return res.status(400).json({ message: 'Nome, e-mail e senha são obrigatórios.' });
    }
    if (senha.length < 8) {
      return res.status(400).json({ message: 'A senha deve ter no mínimo 8 caracteres.' });
    }

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
    const { senha } = req.body || {};
    if (!senha || typeof senha !== 'string') {
      return res.status(400).json({ message: 'Senha é obrigatória.' });
    }
    if (senha.length < 8) {
      return res.status(400).json({ message: 'A senha deve ter no mínimo 8 caracteres.' });
    }

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

// ─── medidas ──────────────────────────────────────────────────────────────────

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
    const { data_medicao } = req.body;
    if (!data_medicao) return res.status(400).json({ message: 'data_medicao é obrigatória.' });
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

// ─── fotos ────────────────────────────────────────────────────────────────────

async function listFotos(req, res) {
  try {
    const aluno = await alunoModel.findById(req.params.id);
    if (!aluno) return res.status(404).json({ message: 'Aluno não encontrado.' });
    return res.json(await alunoModel.findFotos(req.params.id));
  } catch (err) {
    console.error('[admin/listFotos]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function deleteFoto(req, res) {
  try {
    const { alunoId, fotoId } = req.params;
    const rows = await alunoModel.deleteFoto(fotoId, alunoId);
    if (!rows) return res.status(404).json({ message: 'Foto não encontrada.' });
    return res.json({ message: 'Foto removida com sucesso.' });
  } catch (err) {
    console.error('[admin/deleteFoto]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

// ─── pagamentos ───────────────────────────────────────────────────────────────

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
    const { valor, data_pagamento, metodo, vencimento } = req.body;
    if (!valor || !data_pagamento || !metodo || !vencimento) {
      return res.status(400).json({ message: 'valor, data_pagamento, metodo e vencimento são obrigatórios.' });
    }
    if (Number(valor) <= 0) return res.status(400).json({ message: 'Valor deve ser positivo.' });
    const METODOS = ['dinheiro','pix','cartao_credito','cartao_debito','transferencia'];
    if (!METODOS.includes(metodo)) {
      return res.status(400).json({ message: `metodo inválido. Use: ${METODOS.join(', ')}` });
    }
    const aluno = await alunoModel.findById(req.params.id);
    if (!aluno) return res.status(404).json({ message: 'Aluno não encontrado.' });
    const pag = await alunoModel.createPagamento(req.params.id, req.body, req.user.id);
    return res.status(201).json(pag);
  } catch (err) {
    console.error('[admin/createPagamento]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

// ─── faturas ──────────────────────────────────────────────────────────────────

async function listFaturasAluno(req, res) {
  try {
    const aluno = await alunoModel.findById(req.params.id);
    if (!aluno) return res.status(404).json({ message: 'Aluno não encontrado.' });
    return res.json(await alunoModel.findFaturasByAluno(req.params.id));
  } catch (err) {
    console.error('[admin/listFaturasAluno]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createFatura(req, res) {
  try {
    const { valor, data_vencimento, observacoes, desconto_tipo, desconto_valor } = req.body;
    if (!valor || !data_vencimento) {
      return res.status(400).json({ message: 'valor e data_vencimento são obrigatórios.' });
    }
    if (Number(valor) <= 0) {
      return res.status(400).json({ message: 'valor deve ser positivo.' });
    }
    const TIPOS_DESCONTO = ['valor', 'percentual'];
    if (desconto_tipo && !TIPOS_DESCONTO.includes(desconto_tipo)) {
      return res.status(400).json({ message: 'desconto_tipo deve ser "valor" ou "percentual".' });
    }
    if (desconto_valor !== undefined && desconto_valor !== null && Number(desconto_valor) < 0) {
      return res.status(400).json({ message: 'desconto_valor deve ser maior ou igual a zero.' });
    }
    const aluno = await alunoModel.findById(req.params.id);
    if (!aluno) return res.status(404).json({ message: 'Aluno não encontrado.' });
    const fatura = await alunoModel.createFatura(
      req.params.id, { valor, data_vencimento, observacoes, desconto_tipo, desconto_valor }, req.user.id
    );
    return res.status(201).json(fatura);
  } catch (err) {
    console.error('[admin/createFatura]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function updateFatura(req, res) {
  try {
    const { valor, desconto_tipo, desconto_valor } = req.body;
    if (valor !== undefined && Number(valor) <= 0) {
      return res.status(400).json({ message: 'valor deve ser positivo.' });
    }
    const TIPOS_DESCONTO = ['valor', 'percentual'];
    if (desconto_tipo !== undefined && desconto_tipo !== null && !TIPOS_DESCONTO.includes(desconto_tipo)) {
      return res.status(400).json({ message: 'desconto_tipo deve ser "valor", "percentual" ou null.' });
    }
    if (desconto_valor !== undefined && desconto_valor !== null && Number(desconto_valor) < 0) {
      return res.status(400).json({ message: 'desconto_valor deve ser maior ou igual a zero.' });
    }
    const result = await alunoModel.updateFatura(req.params.id, req.body);
    if (result.notFound) return res.status(404).json({ message: 'Fatura não encontrada.' });
    if (result.jaPago) return res.status(400).json({ message: 'Fatura já baixada não pode ser editada.' });
    return res.json({ message: 'Fatura atualizada.', fatura: result.fatura });
  } catch (err) {
    console.error('[admin/updateFatura]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function darBaixaFatura(req, res) {
  try {
    const { data_baixa, metodo_baixa, observacoes } = req.body;
    if (!data_baixa || !metodo_baixa) {
      return res.status(400).json({ message: 'data_baixa e metodo_baixa são obrigatórios.' });
    }
    const METODOS = ['dinheiro','pix','cartao_credito','cartao_debito','transferencia'];
    if (!METODOS.includes(metodo_baixa)) {
      return res.status(400).json({ message: `metodo_baixa inválido. Use: ${METODOS.join(', ')}` });
    }
    const result = await alunoModel.darBaixaFatura(req.params.id, { data_baixa, metodo_baixa, observacoes });
    if (result.notFound) return res.status(404).json({ message: 'Fatura não encontrada.' });
    if (result.jaPago) return res.status(400).json({ message: 'Fatura já está paga.' });
    return res.json(result.fatura);
  } catch (err) {
    console.error('[admin/darBaixaFatura]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function deleteFatura(req, res) {
  try {
    const result = await alunoModel.deleteFatura(req.params.id);
    if (result.notFound) return res.status(404).json({ message: 'Fatura não encontrada.' });
    if (result.jaPago) return res.status(400).json({ message: 'Não é possível remover fatura já paga.' });
    return res.json({ message: 'Fatura removida.' });
  } catch (err) {
    console.error('[admin/deleteFatura]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

// ─── exercicios ───────────────────────────────────────────────────────────────

async function listExercicios(req, res) {
  try {
    const { grupo_muscular, nivel, ativo = 'true', busca } = req.query;
    return res.json(await alunoModel.findExercicios({
      grupo_muscular, nivel, busca, ativo: ativo !== 'false',
    }));
  } catch (err) {
    console.error('[admin/listExercicios]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createExercicio(req, res) {
  try {
    const { nome, grupo_muscular } = req.body;
    if (!nome || !grupo_muscular) {
      return res.status(400).json({ message: 'nome e grupo_muscular são obrigatórios.' });
    }
    return res.status(201).json(await alunoModel.createExercicio(req.body));
  } catch (err) {
    console.error('[admin/createExercicio]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getExercicio(req, res) {
  try {
    const ex = await alunoModel.findExercicioById(req.params.id);
    if (!ex) return res.status(404).json({ message: 'Exercício não encontrado.' });
    return res.json(ex);
  } catch (err) {
    console.error('[admin/getExercicio]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function updateExercicio(req, res) {
  try {
    const rows = await alunoModel.updateExercicio(req.params.id, req.body);
    if (!rows) return res.status(404).json({ message: 'Exercício não encontrado.' });
    return res.json({ message: 'Exercício atualizado com sucesso.' });
  } catch (err) {
    console.error('[admin/updateExercicio]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function ativarExercicio(req, res) {
  try {
    const rows = await alunoModel.setExercicioAtivo(req.params.id, true);
    if (!rows) return res.status(404).json({ message: 'Exercício não encontrado.' });
    return res.json({ message: 'Exercício ativado.' });
  } catch (err) {
    console.error('[admin/ativarExercicio]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function desativarExercicio(req, res) {
  try {
    const rows = await alunoModel.setExercicioAtivo(req.params.id, false);
    if (!rows) return res.status(404).json({ message: 'Exercício não encontrado.' });
    return res.json({ message: 'Exercício desativado.' });
  } catch (err) {
    console.error('[admin/desativarExercicio]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

// ─── alimentos ────────────────────────────────────────────────────────────────

async function listAlimentos(req, res) {
  try {
    const { categoria, ativo = 'true', busca } = req.query;
    return res.json(await alunoModel.findAlimentos({ categoria, busca, ativo: ativo !== 'false' }));
  } catch (err) {
    console.error('[admin/listAlimentos]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createAlimento(req, res) {
  try {
    const { nome, unidade, calorias, proteinas, carboidratos, gorduras } = req.body;
    if (!nome || !unidade || calorias == null || proteinas == null || carboidratos == null || gorduras == null) {
      return res.status(400).json({ message: 'nome, unidade, calorias, proteinas, carboidratos e gorduras são obrigatórios.' });
    }
    return res.status(201).json(await alunoModel.createAlimento(req.body));
  } catch (err) {
    if (err.code === '23514') return res.status(400).json({ message: 'Valor de unidade inválido.' });
    console.error('[admin/createAlimento]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getAlimento(req, res) {
  try {
    const al = await alunoModel.findAlimentoById(req.params.id);
    if (!al) return res.status(404).json({ message: 'Alimento não encontrado.' });
    return res.json(al);
  } catch (err) {
    console.error('[admin/getAlimento]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function updateAlimento(req, res) {
  try {
    const rows = await alunoModel.updateAlimento(req.params.id, req.body);
    if (!rows) return res.status(404).json({ message: 'Alimento não encontrado.' });
    return res.json({ message: 'Alimento atualizado com sucesso.' });
  } catch (err) {
    console.error('[admin/updateAlimento]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function ativarAlimento(req, res) {
  try {
    const rows = await alunoModel.setAlimentoAtivo(req.params.id, true);
    if (!rows) return res.status(404).json({ message: 'Alimento não encontrado.' });
    return res.json({ message: 'Alimento ativado.' });
  } catch (err) {
    console.error('[admin/ativarAlimento]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function desativarAlimento(req, res) {
  try {
    const rows = await alunoModel.setAlimentoAtivo(req.params.id, false);
    if (!rows) return res.status(404).json({ message: 'Alimento não encontrado.' });
    return res.json({ message: 'Alimento desativado.' });
  } catch (err) {
    console.error('[admin/desativarAlimento]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

// ─── cardio ───────────────────────────────────────────────────────────────────

async function listCardio(req, res) {
  try {
    const { tipo, intensidade, ativo = 'true' } = req.query;
    return res.json(await alunoModel.findCardio({ tipo, intensidade, ativo: ativo !== 'false' }));
  } catch (err) {
    console.error('[admin/listCardio]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createCardio(req, res) {
  try {
    if (!req.body.tipo) return res.status(400).json({ message: 'tipo é obrigatório.' });
    return res.status(201).json(await alunoModel.createCardio(req.body));
  } catch (err) {
    console.error('[admin/createCardio]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getCardio(req, res) {
  try {
    const c = await alunoModel.findCardioById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Cardio não encontrado.' });
    return res.json(c);
  } catch (err) {
    console.error('[admin/getCardio]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function updateCardio(req, res) {
  try {
    const rows = await alunoModel.updateCardio(req.params.id, req.body);
    if (!rows) return res.status(404).json({ message: 'Cardio não encontrado.' });
    return res.json({ message: 'Cardio atualizado com sucesso.' });
  } catch (err) {
    console.error('[admin/updateCardio]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function desativarCardio(req, res) {
  try {
    const rows = await alunoModel.setCardioAtivo(req.params.id, false);
    if (!rows) return res.status(404).json({ message: 'Cardio não encontrado.' });
    return res.json({ message: 'Cardio desativado.' });
  } catch (err) {
    console.error('[admin/desativarCardio]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

// ─── protocolos ───────────────────────────────────────────────────────────────

async function listProtocolos(req, res) {
  try {
    const aluno = await alunoModel.findById(req.params.id);
    if (!aluno) return res.status(404).json({ message: 'Aluno não encontrado.' });
    return res.json(await alunoModel.findProtocolos(req.params.id));
  } catch (err) {
    console.error('[admin/listProtocolos]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createProtocolo(req, res) {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ message: 'nome é obrigatório.' });
    const { data_inicio, data_fim } = req.body;
    if (data_inicio && data_fim && new Date(data_fim) < new Date(data_inicio)) {
      return res.status(400).json({ message: 'data_fim não pode ser anterior a data_inicio.' });
    }
    const aluno = await alunoModel.findById(req.params.id);
    if (!aluno) return res.status(404).json({ message: 'Aluno não encontrado.' });
    return res.status(201).json(await alunoModel.createProtocolo(req.params.id, req.body));
  } catch (err) {
    console.error('[admin/createProtocolo]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getProtocolo(req, res) {
  try {
    const p = await alunoModel.findProtocoloById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    return res.json(p);
  } catch (err) {
    console.error('[admin/getProtocolo]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function updateProtocolo(req, res) {
  try {
    const rows = await alunoModel.updateProtocolo(req.params.id, req.body);
    if (!rows) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    return res.json({ message: 'Protocolo atualizado com sucesso.' });
  } catch (err) {
    console.error('[admin/updateProtocolo]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function ativarProtocolo(req, res) {
  try {
    const rows = await alunoModel.setProtocoloAtivo(req.params.id, true);
    if (!rows) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    return res.json({ message: 'Protocolo ativado.' });
  } catch (err) {
    console.error('[admin/ativarProtocolo]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function desativarProtocolo(req, res) {
  try {
    const rows = await alunoModel.setProtocoloAtivo(req.params.id, false);
    if (!rows) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    return res.json({ message: 'Protocolo desativado.' });
  } catch (err) {
    console.error('[admin/desativarProtocolo]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

// ─── refeicoes ────────────────────────────────────────────────────────────────

async function listRefeicoes(req, res) {
  try {
    const p = await alunoModel.findProtocoloById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    return res.json(await alunoModel.findRefeicoes(req.params.id));
  } catch (err) {
    console.error('[admin/listRefeicoes]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createRefeicao(req, res) {
  try {
    const { numero_refeicao, nome } = req.body;
    if (!numero_refeicao || !nome) {
      return res.status(400).json({ message: 'numero_refeicao e nome são obrigatórios.' });
    }
    const p = await alunoModel.findProtocoloById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    return res.status(201).json(await alunoModel.createRefeicao(req.params.id, req.body));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Já existe uma refeição com este número neste protocolo.' });
    }
    console.error('[admin/createRefeicao]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function duplicarRefeicao(req, res) {
  try {
    const { numero_refeicao_destino } = req.body;
    if (!numero_refeicao_destino) {
      return res.status(400).json({ message: 'numero_refeicao_destino é obrigatório.' });
    }
    const nova = await alunoModel.duplicarRefeicao(req.params.id, numero_refeicao_destino);
    return res.status(201).json(nova);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return res.status(404).json({ message: 'Refeição não encontrada.' });
    if (err.code === 'CONFLICT') {
      return res.status(400).json({ message: 'Já existe uma refeição com esse número neste protocolo.' });
    }
    console.error('[admin/duplicarRefeicao]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function updateRefeicao(req, res) {
  try {
    const rows = await alunoModel.updateRefeicao(req.params.id, req.body);
    if (!rows) return res.status(404).json({ message: 'Refeição não encontrada.' });
    return res.json({ message: 'Refeição atualizada.' });
  } catch (err) {
    console.error('[admin/updateRefeicao]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function deleteRefeicao(req, res) {
  try {
    const rows = await alunoModel.deleteRefeicao(req.params.id);
    if (!rows) return res.status(404).json({ message: 'Refeição não encontrada.' });
    return res.json({ message: 'Refeição removida.' });
  } catch (err) {
    console.error('[admin/deleteRefeicao]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

// ─── refeicao_itens ───────────────────────────────────────────────────────────

async function createRefeicaoItem(req, res) {
  try {
    const { alimento_id, quantidade_g, ordem, observacoes } = req.body;
    if (!alimento_id || !quantidade_g) {
      return res.status(400).json({ message: 'alimento_id e quantidade_g são obrigatórios.' });
    }
    const item = await alunoModel.createRefeicaoItem(
      req.params.id, alimento_id, quantidade_g, ordem, observacoes
    );
    return res.status(201).json(item);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return res.status(404).json({ message: 'Alimento não encontrado.' });
    if (err.code === '23503') return res.status(404).json({ message: 'Refeição ou alimento não encontrado.' });
    console.error('[admin/createRefeicaoItem]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function updateRefeicaoItem(req, res) {
  try {
    const rows = await alunoModel.updateRefeicaoItem(req.params.itemId, req.body);
    if (!rows) return res.status(404).json({ message: 'Item não encontrado.' });
    return res.json({ message: 'Item atualizado.' });
  } catch (err) {
    console.error('[admin/updateRefeicaoItem]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function deleteRefeicaoItem(req, res) {
  try {
    const rows = await alunoModel.deleteRefeicaoItem(req.params.itemId);
    if (!rows) return res.status(404).json({ message: 'Item não encontrado.' });
    return res.json({ message: 'Item removido.' });
  } catch (err) {
    console.error('[admin/deleteRefeicaoItem]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function reordenarItens(req, res) {
  try {
    const { ordem } = req.body;
    if (!Array.isArray(ordem) || !ordem.length) {
      return res.status(400).json({ message: 'ordem deve ser um array não vazio.' });
    }
    await alunoModel.reordenarItens(req.params.refeicaoId, ordem);
    return res.json({ message: 'Itens reordenados.' });
  } catch (err) {
    console.error('[admin/reordenarItens]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

// ─── substitutos ──────────────────────────────────────────────────────────────

async function createSubstituto(req, res) {
  try {
    const { alimento_id, quantidade_g } = req.body;
    if (!alimento_id || !quantidade_g) {
      return res.status(400).json({ message: 'alimento_id e quantidade_g são obrigatórios.' });
    }
    const sub = await alunoModel.createSubstituto(req.params.itemId, alimento_id, quantidade_g);
    return res.status(201).json(sub);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Substituto já cadastrado para este item.' });
    if (err.code === '23503') return res.status(404).json({ message: 'Item ou alimento não encontrado.' });
    console.error('[admin/createSubstituto]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function deleteSubstituto(req, res) {
  try {
    const rows = await alunoModel.deleteSubstituto(req.params.substitutoId);
    if (!rows) return res.status(404).json({ message: 'Substituto não encontrado.' });
    return res.json({ message: 'Substituto removido.' });
  } catch (err) {
    console.error('[admin/deleteSubstituto]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

// ─── treinos ──────────────────────────────────────────────────────────────────

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
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ message: 'nome é obrigatório.' });
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

// ─── treino_exercicios ────────────────────────────────────────────────────────

async function createTreinoExercicio(req, res) {
  try {
    const { tipo } = req.body;
    if (!['exercicio','cardio'].includes(tipo)) {
      return res.status(400).json({ message: 'tipo deve ser "exercicio" ou "cardio".' });
    }
    if (tipo === 'exercicio' && !req.body.exercicio_id) {
      return res.status(400).json({ message: 'exercicio_id é obrigatório para tipo "exercicio".' });
    }
    if (tipo === 'cardio' && !req.body.cardio_id) {
      return res.status(400).json({ message: 'cardio_id é obrigatório para tipo "cardio".' });
    }
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
    const { ordem } = req.body;
    if (!Array.isArray(ordem) || !ordem.length) {
      return res.status(400).json({ message: 'ordem deve ser um array não vazio.' });
    }
    await alunoModel.reordenarTreinoExercicios(req.params.treinoId, ordem);
    return res.json({ message: 'Exercícios reordenados.' });
  } catch (err) {
    console.error('[admin/reordenarTreinoExercicios]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

// ─── suplementacao ────────────────────────────────────────────────────────────

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
    const { nome_suplemento, dose } = req.body;
    if (!nome_suplemento || !dose) {
      return res.status(400).json({ message: 'nome_suplemento e dose são obrigatórios.' });
    }
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

// ─── PDF: download direto e envio por email ───────────────────────────────────

function slugProtocolo(nome) {
  return String(nome || 'protocolo')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'protocolo';
}

async function baixarProtocoloPdf(req, res) {
  const { id } = req.params;
  try {
    const protocolo = await alunoModel.findProtocoloById(id);
    if (!protocolo) return res.status(404).json({ message: 'Protocolo não encontrado.' });

    const aluno = await alunoModel.findById(protocolo.aluno_id);
    if (!aluno) return res.status(404).json({ message: 'Aluno do protocolo não encontrado.' });

    const [refeicoes, treinos, suplementacao, medidas] = await Promise.all([
      protocolo.modulo_alimentar      ? alunoModel.findRefeicoes(id)      : Promise.resolve([]),
      protocolo.modulo_treino         ? alunoModel.findTreinos(id)        : Promise.resolve([]),
      protocolo.modulo_suplementacao  ? alunoModel.findSuplementacao(id)  : Promise.resolve([]),
      alunoModel.findMedidas(protocolo.aluno_id),
    ]);

    const medidaFisica = (medidas && medidas.length) ? medidas[0] : null;
    const pdfBuffer = await gerarPDFProtocolo({
      aluno, protocolo, refeicoes, treinos, suplementacao, medidaFisica,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="protocolo-${slugProtocolo(protocolo.nome)}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('[admin/baixarProtocoloPdf]', err);
    return res.status(500).json({ message: 'Erro ao gerar o PDF. Tente novamente.' });
  }
}

async function enviarProtocoloPdf(req, res) {
  const { id } = req.params;
  try {
    const protocolo = await alunoModel.findProtocoloById(id);
    if (!protocolo) return res.status(404).json({ message: 'Protocolo não encontrado.' });

    const aluno = await alunoModel.findById(protocolo.aluno_id);
    if (!aluno) return res.status(404).json({ message: 'Aluno do protocolo não encontrado.' });
    if (!aluno.email) return res.status(400).json({ message: 'Aluno sem email cadastrado.' });

    const [refeicoes, treinos, suplementacao, medidas] = await Promise.all([
      protocolo.modulo_alimentar      ? alunoModel.findRefeicoes(id)      : Promise.resolve([]),
      protocolo.modulo_treino         ? alunoModel.findTreinos(id)        : Promise.resolve([]),
      protocolo.modulo_suplementacao  ? alunoModel.findSuplementacao(id)  : Promise.resolve([]),
      alunoModel.findMedidas(protocolo.aluno_id),
    ]);

    const medidaFisica = (medidas && medidas.length) ? medidas[0] : null;

    let pdfBuffer;
    try {
      pdfBuffer = await gerarPDFProtocolo({
        aluno, protocolo, refeicoes, treinos, suplementacao, medidaFisica,
      });
    } catch (err) {
      console.error('[admin/enviarProtocoloPdf/puppeteer]', err);
      return res.status(500).json({ message: `Falha ao gerar PDF: ${err.message}` });
    }

    try {
      await enviarProtocoloPorEmail({
        emailDestinatario: aluno.email,
        nomeAluno: aluno.nome,
        nomeProtocolo: protocolo.nome,
        pdfBuffer,
      });
    } catch (err) {
      console.error('[admin/enviarProtocoloPdf/resend]', err.message);
      const isConfig = err.message && err.message.includes('não configurad');
      return res.status(500).json({
        message: isConfig ? err.message : 'Erro ao enviar o PDF. Tente novamente.',
      });
    }

    return res.json({ message: `Protocolo enviado para ${aluno.email}` });
  } catch (err) {
    console.error('[admin/enviarProtocoloPdf]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = {
  listAlunos, createAluno, getAluno, updateAluno, ativarAluno, desativarAluno,
  redefinirSenhaAluno,
  listMedidas, createMedida, getMedida, updateMedida, deleteMedida,
  listFotos, deleteFoto,
  listPagamentos, listPagamentosAluno, createPagamento,
  listFaturasAluno, createFatura, updateFatura, darBaixaFatura, deleteFatura,
  listExercicios, createExercicio, getExercicio, updateExercicio, ativarExercicio, desativarExercicio,
  listAlimentos, createAlimento, getAlimento, updateAlimento, ativarAlimento, desativarAlimento,
  listCardio, createCardio, getCardio, updateCardio, desativarCardio,
  listProtocolos, createProtocolo, getProtocolo, updateProtocolo, ativarProtocolo, desativarProtocolo,
  listRefeicoes, createRefeicao, duplicarRefeicao, updateRefeicao, deleteRefeicao,
  createRefeicaoItem, updateRefeicaoItem, deleteRefeicaoItem, reordenarItens,
  createSubstituto, deleteSubstituto,
  listTreinos, createTreino, updateTreino, deleteTreino,
  createTreinoExercicio, updateTreinoExercicio, deleteTreinoExercicio, reordenarTreinoExercicios,
  listSuplementacao, createSuplemento, updateSuplemento, deleteSuplemento,
  enviarProtocoloPdf, baixarProtocoloPdf,
};
