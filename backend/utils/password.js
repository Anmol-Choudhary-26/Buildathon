const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 10) throw new Error('Password must be at least 10 characters.');
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}
async function verifyPassword(password, encoded) {
  const [algorithm, salt, expected] = String(encoded).split('$');
  if (algorithm !== 'scrypt' || !salt || !expected) return false;
  const actual = await scrypt(password, Buffer.from(salt, 'base64url'), 64);
  return crypto.timingSafeEqual(actual, Buffer.from(expected, 'base64url'));
}
module.exports = { hashPassword, verifyPassword };
