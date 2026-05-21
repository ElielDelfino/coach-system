const alunoModel = require('../../models');
const { gerarPDFProtocolo } = require('../../services/pdf');
const { enviarProtocoloPorEmail } = require('../../services/email');

function slugProtocolo(nome) {
  return String(nome || 'protocolo')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'protocolo';
}

async function listProtocolos(req, res) {
  try {
    const aluno = await alunoModel.findById(req.params.id);
    if (!aluno) return res.status(404).json({ message: 'Aluno não encontrado.' });
    return res.json(await alunoModel.findProtocolos(req.params.id));
  } catch (err) {
    req.log.error({ err }, 'admin/listProtocolos');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function createProtocolo(req, res) {
  try {
    const aluno = await alunoModel.findById(req.params.id);
    if (!aluno) return res.status(404).json({ message: 'Aluno não encontrado.' });
    return res.status(201).json(await alunoModel.createProtocolo(req.params.id, req.body));
  } catch (err) {
    req.log.error({ err }, 'admin/createProtocolo');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function getProtocolo(req, res) {
  try {
    const p = await alunoModel.findProtocoloById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    return res.json(p);
  } catch (err) {
    req.log.error({ err }, 'admin/getProtocolo');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function updateProtocolo(req, res) {
  try {
    const rows = await alunoModel.updateProtocolo(req.params.id, req.body);
    if (!rows) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    return res.json({ message: 'Protocolo atualizado com sucesso.' });
  } catch (err) {
    req.log.error({ err }, 'admin/updateProtocolo');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function ativarProtocolo(req, res) {
  try {
    const rows = await alunoModel.setProtocoloAtivo(req.params.id, true);
    if (!rows) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    return res.json({ message: 'Protocolo ativado.' });
  } catch (err) {
    req.log.error({ err }, 'admin/ativarProtocolo');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function desativarProtocolo(req, res) {
  try {
    const rows = await alunoModel.setProtocoloAtivo(req.params.id, false);
    if (!rows) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    return res.json({ message: 'Protocolo desativado.' });
  } catch (err) {
    req.log.error({ err }, 'admin/desativarProtocolo');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function deleteProtocolo(req, res) {
  try {
    const rows = await alunoModel.deleteProtocolo(req.params.id);
    if (!rows) return res.status(404).json({ message: 'Protocolo não encontrado.' });
    return res.json({ message: 'Protocolo removido.' });
  } catch (err) {
    req.log.error({ err }, 'admin/deleteProtocolo');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
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
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    return res.end(pdfBuffer, 'binary');
  } catch (err) {
    req.log.error({ err }, 'admin/baixarProtocoloPdf');
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
      req.log.error({ err }, 'admin/enviarProtocoloPdf/puppeteer');
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
      req.log.error({ err }, 'admin/enviarProtocoloPdf/resend');
      const isConfig = err.message && err.message.includes('não configurad');
      return res.status(500).json({
        message: isConfig ? err.message : 'Erro ao enviar o PDF. Tente novamente.',
      });
    }

    return res.json({ message: `Protocolo enviado para ${aluno.email}` });
  } catch (err) {
    req.log.error({ err }, 'admin/enviarProtocoloPdf');
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = {
  listProtocolos, createProtocolo, getProtocolo, updateProtocolo,
  ativarProtocolo, desativarProtocolo, deleteProtocolo,
  baixarProtocoloPdf, enviarProtocoloPdf,
};
