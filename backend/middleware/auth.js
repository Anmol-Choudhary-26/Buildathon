const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function requireAuth(req, res, next) {
  try {
    const cookieToken = req.headers.cookie?.split(';').map(item => item.trim()).find(item => item.startsWith('vibematch_session='))?.slice('vibematch_session='.length);
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || cookieToken;
    if (!token) return res.status(401).json({ message: 'Authentication required.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'User no longer exists.' });
    req.user = user;
    next();
  } catch (_) { return res.status(401).json({ message: 'Invalid or expired token.' }); }
}
const hasRole = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Insufficient role.' });
module.exports = { requireAuth, hasRole };
