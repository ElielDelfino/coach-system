const router = require('express').Router();
const alunoController = require('../controllers/alunoController');

router.get('/perfil', alunoController.getPerfil);
router.get('/medidas', alunoController.getMedidas);
router.get('/fotos', alunoController.getFotos);
router.get('/pagamentos', alunoController.getPagamentos);
router.get('/protocolos', alunoController.listProtocolos);
router.get('/protocolos/:id', alunoController.getProtocolo);
router.get('/protocolos/:id/refeicoes', alunoController.getRefeicoes);
router.get('/protocolos/:id/treinos', alunoController.getTreinos);
router.get('/protocolos/:id/suplementacao', alunoController.getSuplementacao);

module.exports = router;
