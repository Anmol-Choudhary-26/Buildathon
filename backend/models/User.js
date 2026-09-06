const mongoose = require('mongoose');
const { encrypt, decrypt, emailLookup } = require('../utils/piiCrypto');

const userSchema = new mongoose.Schema({
  encryptedName: { type: String, required: true, select: false },
  encryptedEmail: { type: String, required: true, select: false },
  encryptedPhone: { type: String, required: true, select: false },
  emailLookupHash: { type: String, required: true, unique: true, select: false },
  passwordHash: { type: String, select: false },
  authProviderId: { type: String, unique: true, sparse: true, select: false },
  role: { type: String, enum: ['Host', 'Seeker', 'Both'], required: true },
  workRoutine: { type: String, enum: ['Fully Remote', 'Hybrid', 'Office Commute'] },
  professionTitle: String,
  hobbyMatrix: { type: [String], default: [] },
  spotifyData: { topGenres: { type: [String], default: [] } }
}, { timestamps: true, strict: 'throw' });

// Plaintext is never a schema path. Controllers may use these virtuals only while creating/updating.
for (const [plain, encrypted] of [['name', 'encryptedName'], ['email', 'encryptedEmail'], ['phone', 'encryptedPhone']]) {
  userSchema.virtual(plain).set(function setPii(value) {
    if (value) (this.$locals.plainPii ||= {})[encrypted] = value;
  });
}

// Encryption happens before persistence; plaintext only exists in this in-memory request lifecycle.
userSchema.pre('validate', function encryptPii(next) {
  for (const [field, value] of Object.entries(this.$locals.plainPii || {})) this[field] = encrypt(value);
  delete this.$locals.plainPii;
  next();
});

userSchema.methods.getContact = function getContact() {
  return { name: decrypt(this.encryptedName), email: decrypt(this.encryptedEmail), phone: decrypt(this.encryptedPhone) };
};

userSchema.statics.createWithPII = function createWithPII({ name, email, phone, ...profile }) {
  return this.create({ ...profile, name, email, phone, emailLookupHash: emailLookup(email) });
};

module.exports = mongoose.model('User', userSchema);
