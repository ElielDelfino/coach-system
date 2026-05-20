const router = require('express').Router();
const authController = require('../controllers/authController');
const auth = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const authSchemas = require('../schemas/auth');

router.post('/login', validate(authSchemas.login), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', auth, authController.logout);

module.exports = router;
