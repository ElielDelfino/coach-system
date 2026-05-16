const router = require('express').Router();
const authController = require('../controllers/authController');
const auth = require('../middlewares/auth');

router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', auth, authController.logout);

module.exports = router;
