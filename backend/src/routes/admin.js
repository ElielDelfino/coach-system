const router = require('express').Router();

const dashboard      = require('../controllers/admin/dashboard');
const alunos         = require('../controllers/admin/alunos');
const medidas        = require('../controllers/admin/medidas');
const fotos          = require('../controllers/admin/fotos');
const pagamentos     = require('../controllers/admin/pagamentos');
const faturas        = require('../controllers/admin/faturas');
const exercicios     = require('../controllers/admin/exercicios');
const alimentos      = require('../controllers/admin/alimentos');
const cardio         = require('../controllers/admin/cardio');
const protocolos     = require('../controllers/admin/protocolos');
const refeicoes      = require('../controllers/admin/refeicoes');
const treinos        = require('../controllers/admin/treinos');
const suplementacao  = require('../controllers/admin/suplementacao');

const { uploadThumbExerc, uploadVideoExerc, uploadFotoAlimento } = require('../middlewares/upload');
const { validate } = require('../middlewares/validate');

const alunoSchemas        = require('../schemas/alunos');
const medidaSchemas       = require('../schemas/medidas');
const fotoSchemas         = require('../schemas/fotos');
const pagamentoSchemas    = require('../schemas/pagamentos');
const faturaSchemas       = require('../schemas/faturas');
const exercicioSchemas    = require('../schemas/exercicios');
const alimentoSchemas     = require('../schemas/alimentos');
const cardioSchemas       = require('../schemas/cardio');
const protocoloSchemas    = require('../schemas/protocolos');
const refeicaoSchemas     = require('../schemas/refeicoes');
const treinoSchemas       = require('../schemas/treinos');
const suplementoSchemas   = require('../schemas/suplementacao');

// ─── dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard/evolucao', dashboard.dashboardEvolucao);
router.get('/dashboard/resumo',   dashboard.dashboardResumo);

// ─── alunos ───────────────────────────────────────────────────────────────────
router.get   ('/alunos',                 alunos.listAlunos);
router.post  ('/alunos',                 validate(alunoSchemas.createAluno),    alunos.createAluno);
router.get   ('/alunos/:id',             alunos.getAluno);
router.put   ('/alunos/:id',             validate(alunoSchemas.updateAluno),    alunos.updateAluno);
router.patch ('/alunos/:id/ativar',      alunos.ativarAluno);
router.patch ('/alunos/:id/desativar',   alunos.desativarAluno);
router.patch ('/alunos/:id/senha',       validate(alunoSchemas.redefinirSenha), alunos.redefinirSenhaAluno);

// ─── medidas ──────────────────────────────────────────────────────────────────
router.get   ('/alunos/:id/medidas',                  medidas.listMedidas);
router.post  ('/alunos/:id/medidas',                  validate(medidaSchemas.createMedida), medidas.createMedida);
router.get   ('/alunos/:id/medidas/:medidaId',        medidas.getMedida);
router.put   ('/alunos/:id/medidas/:medidaId',        validate(medidaSchemas.updateMedida), medidas.updateMedida);
router.delete('/alunos/:id/medidas/:medidaId',        medidas.deleteMedida);

// ─── fotos ────────────────────────────────────────────────────────────────────
router.get   ('/alunos/:id/fotos',                 fotos.listFotos);
router.patch ('/alunos/:id/liberar-fotos',         validate(fotoSchemas.liberarFotos), fotos.liberarFotos);
router.delete('/alunos/:alunoId/fotos/:fotoId',    fotos.deleteFoto);

// ─── pagamentos ───────────────────────────────────────────────────────────────
router.get ('/pagamentos',                   pagamentos.listPagamentos);
router.get ('/alunos/:id/pagamentos',        pagamentos.listPagamentosAluno);
router.post('/alunos/:id/pagamentos',        validate(pagamentoSchemas.createPagamento), pagamentos.createPagamento);

// ─── faturas ──────────────────────────────────────────────────────────────────
router.get   ('/alunos/:id/faturas',  faturas.listFaturasAluno);
router.post  ('/alunos/:id/faturas',  validate(faturaSchemas.createFatura),    faturas.createFatura);
router.put   ('/faturas/:id',         validate(faturaSchemas.updateFatura),    faturas.updateFatura);
router.patch ('/faturas/:id/baixa',   validate(faturaSchemas.darBaixaFatura),  faturas.darBaixaFatura);
router.delete('/faturas/:id',         faturas.deleteFatura);

// ─── exercicios ───────────────────────────────────────────────────────────────
router.get   ('/exercicios',                 exercicios.listExercicios);
router.post  ('/exercicios',                 validate(exercicioSchemas.createExercicio), exercicios.createExercicio);
router.get   ('/exercicios/:id',             exercicios.getExercicio);
router.put   ('/exercicios/:id',             validate(exercicioSchemas.updateExercicio), exercicios.updateExercicio);
router.put   ('/exercicios/:id/thumbnail',   uploadThumbExerc, exercicios.uploadThumbExercicio);
router.put   ('/exercicios/:id/video',       uploadVideoExerc, exercicios.uploadVideoExercicio);
router.patch ('/exercicios/:id/ativar',      exercicios.ativarExercicio);
router.patch ('/exercicios/:id/desativar',   exercicios.desativarExercicio);

// ─── alimentos ────────────────────────────────────────────────────────────────
router.get   ('/alimentos',                 alimentos.listAlimentos);
router.post  ('/alimentos',                 validate(alimentoSchemas.createAlimento), alimentos.createAlimento);
router.get   ('/alimentos/:id',             alimentos.getAlimento);
router.put   ('/alimentos/:id',             validate(alimentoSchemas.updateAlimento), alimentos.updateAlimento);
router.put   ('/alimentos/:id/foto',        uploadFotoAlimento, alimentos.uploadFotoAlimento);
router.patch ('/alimentos/:id/ativar',      alimentos.ativarAlimento);
router.patch ('/alimentos/:id/desativar',   alimentos.desativarAlimento);

// ─── cardio ───────────────────────────────────────────────────────────────────
router.get   ('/cardio',                  cardio.listCardio);
router.post  ('/cardio',                  validate(cardioSchemas.createCardio), cardio.createCardio);
router.get   ('/cardio/:id',              cardio.getCardio);
router.put   ('/cardio/:id',              validate(cardioSchemas.updateCardio), cardio.updateCardio);
router.patch ('/cardio/:id/desativar',    cardio.desativarCardio);

// ─── protocolos ───────────────────────────────────────────────────────────────
router.get   ('/alunos/:id/protocolos',        protocolos.listProtocolos);
router.post  ('/alunos/:id/protocolos',        validate(protocoloSchemas.createProtocolo), protocolos.createProtocolo);
router.get   ('/protocolos/:id',               protocolos.getProtocolo);
router.put   ('/protocolos/:id',               validate(protocoloSchemas.updateProtocolo), protocolos.updateProtocolo);
router.delete('/protocolos/:id',               protocolos.deleteProtocolo);
router.patch ('/protocolos/:id/ativar',        protocolos.ativarProtocolo);
router.patch ('/protocolos/:id/desativar',     protocolos.desativarProtocolo);
router.get   ('/protocolos/:id/pdf',           protocolos.baixarProtocoloPdf);
router.post  ('/protocolos/:id/enviar-pdf',    protocolos.enviarProtocoloPdf);

// ─── refeicoes ────────────────────────────────────────────────────────────────
router.get   ('/protocolos/:id/refeicoes',     refeicoes.listRefeicoes);
router.post  ('/protocolos/:id/refeicoes',     validate(refeicaoSchemas.createRefeicao),     refeicoes.createRefeicao);
router.post  ('/refeicoes/:id/duplicar',       validate(refeicaoSchemas.duplicarRefeicao),   refeicoes.duplicarRefeicao);
router.put   ('/refeicoes/:id',                validate(refeicaoSchemas.updateRefeicao),     refeicoes.updateRefeicao);
router.delete('/refeicoes/:id',                refeicoes.deleteRefeicao);
router.post  ('/refeicoes/:id/itens',          validate(refeicaoSchemas.createRefeicaoItem), refeicoes.createRefeicaoItem);
// reordenar DEVE vir antes de /:itemId para não conflitar com método PATCH
router.patch ('/refeicoes/:refeicaoId/itens/reordenar',                        validate(refeicaoSchemas.reordenarItens),     refeicoes.reordenarItens);
router.put   ('/refeicoes/:refeicaoId/itens/:itemId',                          validate(refeicaoSchemas.updateRefeicaoItem), refeicoes.updateRefeicaoItem);
router.delete('/refeicoes/:refeicaoId/itens/:itemId',                          refeicoes.deleteRefeicaoItem);
router.post  ('/refeicoes/:refeicaoId/itens/:itemId/substitutos',              validate(refeicaoSchemas.createSubstituto),   refeicoes.createSubstituto);
router.delete('/refeicoes/:refeicaoId/itens/:itemId/substitutos/:substitutoId', refeicoes.deleteSubstituto);

// ─── treinos ──────────────────────────────────────────────────────────────────
router.get   ('/protocolos/:id/treinos',     treinos.listTreinos);
router.post  ('/protocolos/:id/treinos',     validate(treinoSchemas.createTreino),     treinos.createTreino);
router.put   ('/treinos/:id',                validate(treinoSchemas.updateTreino),     treinos.updateTreino);
router.delete('/treinos/:id',                treinos.deleteTreino);
router.post  ('/treinos/:id/duplicar',       validate(treinoSchemas.duplicarTreino),   treinos.duplicarTreino);
router.post  ('/treinos/:id/exercicios',     validate(treinoSchemas.createTreinoExercicio), treinos.createTreinoExercicio);
// reordenar DEVE vir antes de /:itemId para não conflitar com método PATCH
router.patch ('/treinos/:treinoId/exercicios/reordenar',  validate(treinoSchemas.reordenarTreinoExercicios), treinos.reordenarTreinoExercicios);
router.put   ('/treinos/:treinoId/exercicios/:itemId',    validate(treinoSchemas.updateTreinoExercicio),    treinos.updateTreinoExercicio);
router.delete('/treinos/:treinoId/exercicios/:itemId',    treinos.deleteTreinoExercicio);

// ─── suplementacao ────────────────────────────────────────────────────────────
router.get   ('/protocolos/:id/suplementacao',  suplementacao.listSuplementacao);
router.post  ('/protocolos/:id/suplementacao',  validate(suplementoSchemas.createSuplemento), suplementacao.createSuplemento);
router.put   ('/suplementacao/:id',             validate(suplementoSchemas.updateSuplemento), suplementacao.updateSuplemento);
router.delete('/suplementacao/:id',             suplementacao.deleteSuplemento);

module.exports = router;
