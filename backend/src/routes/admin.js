const router = require('express').Router();
const c = require('../controllers/adminController');
const { uploadThumbExerc, uploadVideoExerc, uploadFotoAlimento } = require('../middlewares/upload');

// ─── dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard/evolucao', c.dashboardEvolucao);
router.get('/dashboard/resumo', c.dashboardResumo);

// ─── alunos ───────────────────────────────────────────────────────────────────
router.get('/alunos', c.listAlunos);
router.post('/alunos', c.createAluno);
router.get('/alunos/:id', c.getAluno);
router.put('/alunos/:id', c.updateAluno);
router.patch('/alunos/:id/ativar', c.ativarAluno);
router.patch('/alunos/:id/desativar', c.desativarAluno);
router.patch('/alunos/:id/senha', c.redefinirSenhaAluno);
router.get('/alunos/:id/medidas', c.listMedidas);
router.post('/alunos/:id/medidas', c.createMedida);
router.get('/alunos/:id/medidas/:medidaId', c.getMedida);
router.put('/alunos/:id/medidas/:medidaId', c.updateMedida);
router.delete('/alunos/:id/medidas/:medidaId', c.deleteMedida);
router.get('/alunos/:id/fotos', c.listFotos);
router.patch('/alunos/:id/liberar-fotos', c.liberarFotos);
router.delete('/alunos/:alunoId/fotos/:fotoId', c.deleteFoto);
router.get('/alunos/:id/pagamentos', c.listPagamentosAluno);
router.post('/alunos/:id/pagamentos', c.createPagamento);
router.get('/alunos/:id/faturas', c.listFaturasAluno);
router.post('/alunos/:id/faturas', c.createFatura);
router.get('/alunos/:id/protocolos', c.listProtocolos);
router.post('/alunos/:id/protocolos', c.createProtocolo);

// ─── pagamentos ───────────────────────────────────────────────────────────────
router.get('/pagamentos', c.listPagamentos);

// ─── faturas ──────────────────────────────────────────────────────────────────
router.put('/faturas/:id', c.updateFatura);
router.patch('/faturas/:id/baixa', c.darBaixaFatura);
router.delete('/faturas/:id', c.deleteFatura);

// ─── exercicios ───────────────────────────────────────────────────────────────
router.get('/exercicios', c.listExercicios);
router.post('/exercicios', c.createExercicio);
router.get('/exercicios/:id', c.getExercicio);
router.put('/exercicios/:id', c.updateExercicio);
router.put('/exercicios/:id/thumbnail', uploadThumbExerc, c.uploadThumbExercicio);
router.put('/exercicios/:id/video', uploadVideoExerc, c.uploadVideoExercicio);
router.patch('/exercicios/:id/ativar', c.ativarExercicio);
router.patch('/exercicios/:id/desativar', c.desativarExercicio);

// ─── alimentos ────────────────────────────────────────────────────────────────
router.get('/alimentos', c.listAlimentos);
router.post('/alimentos', c.createAlimento);
router.get('/alimentos/:id', c.getAlimento);
router.put('/alimentos/:id', c.updateAlimento);
router.put('/alimentos/:id/foto', uploadFotoAlimento, c.uploadFotoAlimento);
router.patch('/alimentos/:id/ativar', c.ativarAlimento);
router.patch('/alimentos/:id/desativar', c.desativarAlimento);

// ─── cardio ───────────────────────────────────────────────────────────────────
router.get('/cardio', c.listCardio);
router.post('/cardio', c.createCardio);
router.get('/cardio/:id', c.getCardio);
router.put('/cardio/:id', c.updateCardio);
router.patch('/cardio/:id/desativar', c.desativarCardio);

// ─── protocolos ───────────────────────────────────────────────────────────────
router.get('/protocolos/:id', c.getProtocolo);
router.put('/protocolos/:id', c.updateProtocolo);
router.delete('/protocolos/:id', c.deleteProtocolo);
router.patch('/protocolos/:id/ativar', c.ativarProtocolo);
router.patch('/protocolos/:id/desativar', c.desativarProtocolo);
router.get('/protocolos/:id/refeicoes', c.listRefeicoes);
router.post('/protocolos/:id/refeicoes', c.createRefeicao);
router.get('/protocolos/:id/treinos', c.listTreinos);
router.post('/protocolos/:id/treinos', c.createTreino);
router.get('/protocolos/:id/suplementacao', c.listSuplementacao);
router.post('/protocolos/:id/suplementacao', c.createSuplemento);
router.get('/protocolos/:id/pdf', c.baixarProtocoloPdf);
router.post('/protocolos/:id/enviar-pdf', c.enviarProtocoloPdf);

// ─── refeicoes ────────────────────────────────────────────────────────────────
router.post('/refeicoes/:id/duplicar', c.duplicarRefeicao);
router.put('/refeicoes/:id', c.updateRefeicao);
router.delete('/refeicoes/:id', c.deleteRefeicao);
router.post('/refeicoes/:id/itens', c.createRefeicaoItem);
// reordenar DEVE vir antes de /:itemId para não conflitar com método PATCH
router.patch('/refeicoes/:refeicaoId/itens/reordenar', c.reordenarItens);
router.put('/refeicoes/:refeicaoId/itens/:itemId', c.updateRefeicaoItem);
router.delete('/refeicoes/:refeicaoId/itens/:itemId', c.deleteRefeicaoItem);
router.post('/refeicoes/:refeicaoId/itens/:itemId/substitutos', c.createSubstituto);
router.delete('/refeicoes/:refeicaoId/itens/:itemId/substitutos/:substitutoId', c.deleteSubstituto);

// ─── treinos ──────────────────────────────────────────────────────────────────
router.put('/treinos/:id', c.updateTreino);
router.delete('/treinos/:id', c.deleteTreino);
router.post('/treinos/:id/duplicar', c.duplicarTreino);
router.post('/treinos/:id/exercicios', c.createTreinoExercicio);
// reordenar DEVE vir antes de /:itemId para não conflitar com método PATCH
router.patch('/treinos/:treinoId/exercicios/reordenar', c.reordenarTreinoExercicios);
router.put('/treinos/:treinoId/exercicios/:itemId', c.updateTreinoExercicio);
router.delete('/treinos/:treinoId/exercicios/:itemId', c.deleteTreinoExercicio);

// ─── suplementacao ────────────────────────────────────────────────────────────
router.put('/suplementacao/:id', c.updateSuplemento);
router.delete('/suplementacao/:id', c.deleteSuplemento);

module.exports = router;
