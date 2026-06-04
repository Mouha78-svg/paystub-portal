const router = require('express').Router();
const multer = require('multer');
const ctrl = require('../controllers/adminController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.use(auth, admin);

const uploadPdf = multer({ dest: '/tmp/pdf-uploads/' });

router.get('/users', ctrl.getUsers);
router.post('/users', ctrl.createUser);
router.put('/users/:matricule', ctrl.updateUser);
router.delete('/users/:matricule', ctrl.deleteUser);
router.post('/users/:matricule/reset-password', ctrl.resetPassword);

// Payslip management
router.get('/users/:matricule/payslips', ctrl.getPayslips);
router.post('/users/:matricule/payslips', uploadPdf.single('pdf'), ctrl.addPayslip);
router.put('/payslips/:id', uploadPdf.single('pdf'), ctrl.updatePayslip);
router.delete('/payslips/:id', ctrl.deletePayslip);

module.exports = router;
