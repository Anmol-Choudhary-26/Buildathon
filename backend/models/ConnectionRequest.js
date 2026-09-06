const mongoose = require('mongoose');
const connectionRequestSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  seekerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  introNote: { type: String, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' }
}, { timestamps: { createdAt: true, updatedAt: true } });
connectionRequestSchema.index({ listingId: 1, seekerId: 1 }, { unique: true });
module.exports = mongoose.model('ConnectionRequest', connectionRequestSchema);
