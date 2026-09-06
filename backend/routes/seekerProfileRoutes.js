const router = require('express').Router();
const c = require('../controllers/seekerProfileController');
const { requireAuth, hasRole } = require('../middleware/auth');
router.use(requireAuth, hasRole('Seeker', 'Both'));
router.get('/', c.get);
router.put('/', c.upsert);
module.exports = router;
