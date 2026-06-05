const router = require('express').Router();
const auth = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/login', auth.login);
router.post('/change-password', auth.changePassword);
router.post('/update-password', authMiddleware, auth.updatePassword);
router.post('/logout', authMiddleware, auth.logout);
router.get('/me', authMiddleware, auth.me);

module.exports = router;
