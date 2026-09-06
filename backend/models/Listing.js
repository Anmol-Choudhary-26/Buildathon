const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  location: { type: String, required: true, trim: true },
  duration: { type: String, enum: ['Long-term (11+ months)', 'Short-term (1-6 months)', 'Flexible'], required: true },
  costs: { rent: { type: Number, required: true }, deposit: Number, maintenance: { type: Number, default: 0 }, maidFee: { type: Number, default: 0 }, wifiSplit: { type: Number, default: 0 } },
  propertyRules: { petFriendly: { type: Boolean, default: false }, gatedSociety: { type: Boolean, default: false } },
  description: { type: String, trim: true, maxlength: 2000 },
  availableFrom: { type: Date, required: true, default: Date.now },
  media: { type: [{ publicId: { type: String, required: true }, secureUrl: { type: String, required: true }, type: { type: String, enum: ['image', 'video'], required: true } }], default: [] },
  status: { type: String, enum: ['Available', 'Filled'], default: 'Available' }
}, { timestamps: true });
module.exports = mongoose.model('Listing', listingSchema);
