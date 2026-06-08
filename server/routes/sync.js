const router = require('express').Router();
const multer = require('multer');
const ctrl = require('../controllers/syncController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const upload = multer({ dest: '/tmp/csv-uploads/' });
const uploadZip = multer({ dest: '/tmp/zip-uploads/' });
const uploadPdfs = multer({ dest: '/tmp/pdf-sync-uploads/' });

router.post('/csv', auth, admin, upload.single('csv'), ctrl.syncCSV);
router.post('/zip', auth, admin, uploadZip.single('zip'), ctrl.syncZIP);
router.post('/pdfs', auth, admin, uploadPdfs.array('pdfs', 100), ctrl.syncPDFs);

module.exports = router;
