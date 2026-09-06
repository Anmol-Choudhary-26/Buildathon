const mongoose = require('mongoose');
const seekerProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  targetLocations: { type: [String], default: [] },
  maxBudget: Number,
  moveInTimeline: Date,
  shortTermAcceptable: { type: Boolean, default: false },
  bio: String
}, { timestamps: true });
module.exports = mongoose.model('SeekerProfile', seekerProfileSchema);
