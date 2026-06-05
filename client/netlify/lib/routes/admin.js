const router = require('express').Router();
const multer = require('multer');
const ctrl = require('../controllers/adminController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.use(auth, admin);

// In-memory uploads — serverless functions have no persistent disk; PDFs are
// forwarded to Netlify Blobs by the controller.
const uploadPdf = multer({ storage: multer.memoryStorage() });

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
