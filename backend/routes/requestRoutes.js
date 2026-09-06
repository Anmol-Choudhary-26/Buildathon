const router = require('express').Router();
const c = require('../controllers/requestController');
const { requireAuth, hasRole } = require('../middleware/auth');
router.use(requireAuth);
router.post('/', hasRole('Seeker', 'Both'), c.createRequest);
router.get('/host', hasRole('Host', 'Both'), c.hostRequests);
router.patch('/:id/respond', hasRole('Host', 'Both'), c.respond);
router.get('/:id/contact', c.revealContact);
module.exports = router;
