const router = require('express').Router();
const auth = require('../controllers/authController');
const registration = require('../controllers/registrationController');
const authMiddleware = require('../middleware/auth');

router.post('/login', auth.login);
router.post('/forgot-password', auth.forgotPassword);
router.post('/change-password', auth.changePassword);
router.post('/update-password', authMiddleware, auth.updatePassword);
router.post('/logout', authMiddleware, auth.logout);
router.get('/me', authMiddleware, auth.me);

router.post('/register', registration.register);
router.post('/verify-registration', registration.verifyRegistration);

module.exports = router;
