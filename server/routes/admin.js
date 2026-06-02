const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.use(auth, admin);

router.get('/users', ctrl.getUsers);
router.post('/users', ctrl.createUser);
router.put('/users/:matricule', ctrl.updateUser);
router.delete('/users/:matricule', ctrl.deleteUser);
router.post('/users/:matricule/reset-password', ctrl.resetPassword);

module.exports = router;
