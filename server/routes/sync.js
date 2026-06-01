const router = require('express').Router();
const multer = require('multer');
const ctrl = require('../controllers/syncController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const upload = multer({ dest: '/tmp/csv-uploads/' });

router.post('/csv', auth, admin, upload.single('csv'), ctrl.syncCSV);

module.exports = router;
