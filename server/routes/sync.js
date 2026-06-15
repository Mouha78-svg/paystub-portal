const router = require('express').Router();
const multer = require('multer');
const ctrl = require('../controllers/syncController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const upload = multer({ dest: '/tmp/csv-uploads/' });
const uploadZip = multer({ dest: '/tmp/zip-uploads/' });
const uploadPdfs = multer({ dest: '/tmp/pdf-sync-uploads/' });
const uploadBulletin = multer({ dest: '/tmp/bulletin-uploads/', limits: { fileSize: 200 * 1024 * 1024 } });

router.post('/csv', auth, admin, upload.single('csv'), ctrl.syncCSV);
router.post('/zip', auth, admin, uploadZip.single('zip'), ctrl.syncZIP);
router.post('/pdfs', auth, admin, uploadPdfs.array('pdfs', 100), ctrl.syncPDFs);
router.post('/bulletin-pdf', auth, admin, uploadBulletin.single('bulletin'), ctrl.syncBulletinPDF);
router.get('/bulletin-pdf/job/:jobId', auth, admin, ctrl.getBulletinJobStatus);

module.exports = router;
