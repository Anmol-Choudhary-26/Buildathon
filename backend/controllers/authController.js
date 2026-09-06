const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { emailLookup } = require('../utils/piiCrypto');
const { hashPassword, verifyPassword } = require('../utils/password');
const { getSupabaseIdentity } = require('../utils/supabaseAuth');

const safeUser = user => ({ id: user._id, role: user.role, professionTitle: user.professionTitle, workRoutine: user.workRoutine, hobbyMatrix: user.hobbyMatrix });
const tokenFor = user => jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });

exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role, workRoutine, professionTitle, hobbyMatrix, spotifyData } = req.body;
    if (![name, email, phone, password, role].every(Boolean)) return res.status(400).json({ message: 'Name, email, phone, password and role are required.' });
    const user = await User.createWithPII({ name, email, phone, passwordHash: await hashPassword(password), role, workRoutine, professionTitle, hobbyMatrix, spotifyData });
    res.status(201).json({ token: tokenFor(user), user: safeUser(user) });
  } catch (error) { if (error?.code === 11000) return res.status(409).json({ message: 'An account with that email already exists.' }); if (/Password must/.test(error.message)) return res.status(400).json({ message: error.message }); next(error); }
};
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ emailLookupHash: emailLookup(email) }).select('+passwordHash');
    if (!user || !(await verifyPassword(password || '', user.passwordHash))) return res.status(401).json({ message: 'Invalid email or password.' });
    res.json({ token: tokenFor(user), user: safeUser(user) });
  } catch (error) { next(error); }
};
exports.me = (req, res) => res.json({ user: safeUser(req.user) });

// Called after Supabase signs the browser in. Email comes from the verified Auth user,
// never from a client-provided field; name/phone are encrypted in MongoDB.
exports.bootstrapSupabaseUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const identity = await getSupabaseIdentity(token);
    if (!identity?.id || !identity.email) return res.status(401).json({ message: 'Valid Supabase access token required.' });
    let user = await User.findOne({ authProviderId: identity.id });
    if (!user) {
      const { name, phone, role, workRoutine, professionTitle, hobbyMatrix = [] } = req.body;
      if (![name, phone, role].every(Boolean)) return res.status(400).json({ message: 'Name, phone and role are required for a new profile.' });
      user = await User.createWithPII({ name, email: identity.email, phone, role, workRoutine, professionTitle, hobbyMatrix, authProviderId: identity.id });
    }
    res.json({ user: safeUser(user) });
  } catch (error) { if (error?.code === 11000) return res.status(409).json({ message: 'This email is already linked to another account.' }); next(error); }
};
