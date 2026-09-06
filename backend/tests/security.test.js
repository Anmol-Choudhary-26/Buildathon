const test = require('node:test');
const assert = require('node:assert/strict');
process.env.PII_ENCRYPTION_KEY = 'test-only-pii-encryption-secret-at-least-32-characters';
process.env.PII_LOOKUP_KEY = 'test-only-lookup-secret-at-least-32-characters';
const User = require('../models/User');
const { emailLookup } = require('../utils/piiCrypto');
const { hashPassword, verifyPassword } = require('../utils/password');

test('PII virtuals encrypt before validation and decrypt only through getContact', async () => {
  const user = new User({ name: 'Asha Rao', email: 'asha@example.com', phone: '+919900001111', passwordHash: 'placeholder', emailLookupHash: emailLookup('asha@example.com'), role: 'Seeker' });
  await user.validate();
  assert.match(user.encryptedEmail, /^v1\./);
  assert.doesNotMatch(user.encryptedEmail, /asha@example\.com/);
  assert.deepEqual(user.getContact(), { name: 'Asha Rao', email: 'asha@example.com', phone: '+919900001111' });
});

test('email lookup is normalized and passwords use a one-way verifier', async () => {
  assert.equal(emailLookup(' Asha@Example.COM '), emailLookup('asha@example.com'));
  const passwordHash = await hashPassword('a-long-test-password');
  assert.ok(await verifyPassword('a-long-test-password', passwordHash));
  assert.equal(await verifyPassword('wrong-password', passwordHash), false);
});
