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

// Feedback management — specific routes before /:id
router.get('/feedback/unread-count', ctrl.getUnreadFeedbackCount);
router.post('/feedback/mark-all-read', ctrl.markAllFeedbackRead);
router.get('/feedback', ctrl.getAllUserFeedback);
router.get('/users/:matricule/feedback', ctrl.getFeedback);
router.post('/users/:matricule/feedback', ctrl.addFeedback);
router.delete('/feedback/:id', ctrl.deleteFeedback);

// Broadcast management
router.get('/broadcasts', ctrl.getBroadcasts);
router.post('/broadcasts', ctrl.createBroadcast);
router.delete('/broadcasts/:id', ctrl.deleteBroadcast);

// Payslip management
router.get('/users/:matricule/payslips', ctrl.getPayslips);
router.post('/users/:matricule/payslips', uploadPdf.single('pdf'), ctrl.addPayslip);
router.put('/payslips/:id', uploadPdf.single('pdf'), ctrl.updatePayslip);
router.delete('/payslips/:id', ctrl.deletePayslip);
router.get('/payslips/:id/download', ctrl.downloadPayslip);

module.exports = router;
