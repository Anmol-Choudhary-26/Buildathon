const test = require('node:test');
const assert = require('node:assert/strict');
process.env.PII_ENCRYPTION_KEY = 'test-only-pii-encryption-secret-at-least-32-characters';
process.env.PII_LOOKUP_KEY = 'test-only-lookup-secret-at-least-32-characters';
const User = require('../models/User');
const { emailLookup } = require('../utils/piiCrypto');
const { hashPassword, verifyPassword } = require('../utils/password');
const { listingProximity, distanceKm, estimatedRoadKm } = require('../utils/proximity');

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

test('map data exposes a broad neighborhood zone, never the supplied address', () => {
  const proximity = listingProximity({ _id: 'listing-123', location: 'HSR Layout, 27th Main, house 18' });
  assert.equal(proximity.label, 'Near HSR Layout');
  assert.equal(proximity.radiusMeters, 500);
  assert.doesNotMatch(JSON.stringify(proximity), /27th|house|18/i);
});

test('distance filter uses geographic distance in kilometres', () => {
  const distance = distanceKm({ latitude: 12.9716, longitude: 77.5946 }, { latitude: 12.9784, longitude: 77.6408 });
  assert.ok(distance > 4 && distance < 6);
});

test('road estimate is greater than straight-line distance', () => {
  assert.equal(estimatedRoadKm(5), 6.6);
});
