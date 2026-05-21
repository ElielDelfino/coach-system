const router = require('express').Router();
const alunoController = require('../controllers/alunoController');
const { uploadFotoAluno } = require('../middlewares/upload');
const { validate } = require('../middlewares/validate');
const sessoesSchemas = require('../schemas/treinoSessoes');

router.get('/perfil', alunoController.getPerfil);
router.get('/evolucao', alunoController.getEvolucao);
router.get('/medidas', alunoController.getMedidas);
router.get('/fotos', alunoController.getFotos);
router.post('/fotos', uploadFotoAluno, alunoController.createFoto);
router.get('/pagamentos', alunoController.getPagamentos);
router.get('/faturas', alunoController.getFaturas);
router.get('/protocolos', alunoController.listProtocolos);
router.get('/protocolos/:id', alunoController.getProtocolo);
router.get('/protocolos/:id/pdf', alunoController.baixarProtocoloPdf);
router.get('/protocolos/:id/refeicoes', alunoController.getRefeicoes);
router.get('/protocolos/:id/treinos', alunoController.getTreinos);
router.get('/protocolos/:id/suplementacao', alunoController.getSuplementacao);

router.post ('/treinos/:treinoId/sessoes',          alunoController.iniciarSessaoTreino);
router.patch('/treinos/sessoes/:sessaoId/concluir', validate(sessoesSchemas.concluirSessao), alunoController.concluirSessaoTreino);
router.get  ('/progresso-semanal',                  alunoController.getProgressoSemanal);
router.get  ('/proximo-treino',                     alunoController.getProximoTreino);

module.exports = router;
