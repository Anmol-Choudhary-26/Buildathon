const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getSupabaseIdentity } = require('../utils/supabaseAuth');

async function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ message: 'Authentication required.' });
    const identity = await getSupabaseIdentity(token);
    const payload = identity ? { sub: identity.id } : jwt.verify(token, process.env.JWT_SECRET);
    const user = identity ? await User.findOne({ authProviderId: payload.sub }) : await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'User no longer exists.' });
    req.user = user;
    next();
  } catch (_) { return res.status(401).json({ message: 'Invalid or expired token.' }); }
}
const hasRole = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Insufficient role.' });
module.exports = { requireAuth, hasRole };
