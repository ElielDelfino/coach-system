const alunoModel = require('../../models');
const { deletarArquivo } = require('../../services/storage');

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
    const result = await alunoModel.deleteFoto(fotoId, alunoId);
    if (!result.rowCount) return res.status(404).json({ message: 'Foto não encontrada.' });
    if (result.s3_key) await deletarArquivo(result.s3_key);
    return res.json({ message: 'Foto removida com sucesso.' });
  } catch (err) {
    console.error('[admin/deleteFoto]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

async function liberarFotos(req, res) {
  try {
    const aluno = await alunoModel.findById(req.params.id);
    if (!aluno) return res.status(404).json({ message: 'Aluno não encontrado.' });
    const { liberado } = req.body;
    await alunoModel.setEnvioFotosLiberado(req.params.id, liberado);
    return res.json({
      message: liberado ? 'Envio de fotos liberado.' : 'Envio de fotos bloqueado.',
      envio_fotos_liberado: liberado,
    });
  } catch (err) {
    console.error('[admin/liberarFotos]', err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
  }
}

module.exports = { listFotos, deleteFoto, liberarFotos };
