const router = require('express').Router();
const ctrl = require('../controllers/payslipController');
const auth = require('../middleware/auth');

router.get('/', auth, ctrl.getAll);
router.get('/years', auth, ctrl.getYears);
router.get('/download/:id', auth, ctrl.download);
router.get('/:matricule', auth, ctrl.getByMatricule);
router.get('/:matricule/:annee/:mois', auth, ctrl.getOne);

module.exports = router;
