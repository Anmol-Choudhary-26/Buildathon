const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

function key() {
  const secret = process.env.PII_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error('PII_ENCRYPTION_KEY must be set to a high-entropy secret (32+ characters).');
  }
  return crypto.createHash('sha256').update(secret, 'utf8').digest();
}

function encrypt(value) {
  if (value === undefined || value === null || value === '') return value;
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Versioned, self-contained payload: version.iv.authTag.ciphertext (all base64url).
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
}

function decrypt(payload) {
  if (!payload) return payload;
  const [version, ivText, tagText, ciphertextText] = String(payload).split('.');
  if (version !== 'v1' || !ivText || !tagText || !ciphertextText) throw new Error('Invalid encrypted PII payload.');
  const decipher = crypto.createDecipheriv(ALGORITHM, key(), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextText, 'base64url')), decipher.final()]).toString('utf8');
}

// Enables login without storing a searchable plaintext email. This is one-way,
// keyed and intentionally separate from the ciphertext.
function emailLookup(email) {
  const lookupKey = process.env.PII_LOOKUP_KEY || process.env.PII_ENCRYPTION_KEY;
  if (!lookupKey) throw new Error('PII_LOOKUP_KEY or PII_ENCRYPTION_KEY must be set.');
  return crypto.createHmac('sha256', lookupKey).update(String(email).trim().toLowerCase()).digest('hex');
}

module.exports = { encrypt, decrypt, emailLookup };
