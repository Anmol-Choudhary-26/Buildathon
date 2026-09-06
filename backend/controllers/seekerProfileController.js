const SeekerProfile = require('../models/SeekerProfile');
exports.get = async (req, res, next) => { try { res.json({ profile: await SeekerProfile.findOne({ userId: req.user._id }) }); } catch (error) { next(error); } };
exports.upsert = async (req, res, next) => { try { const profile = await SeekerProfile.findOneAndUpdate({ userId: req.user._id }, { $set: req.body }, { new: true, upsert: true, runValidators: true }); res.json({ profile }); } catch (error) { next(error); } };
