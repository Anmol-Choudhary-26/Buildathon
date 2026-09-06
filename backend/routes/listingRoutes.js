const router = require('express').Router();
const c = require('../controllers/listingController');
const { requireAuth, hasRole } = require('../middleware/auth');
router.use(requireAuth);
router.get('/', c.list);
router.get('/mine', hasRole('Host', 'Both'), c.mine);
router.post('/', hasRole('Host', 'Both'), c.create);
module.exports = router;
