const Listing = require('../models/Listing');
const ConnectionRequest = require('../models/ConnectionRequest');

exports.list = async (req, res, next) => {
  try {
    const listings = await Listing.find({ status: 'Available' }).populate('hostId', 'professionTitle workRoutine hobbyMatrix spotifyData').sort({ createdAt: -1 }).lean();
    const mine = new Map((await ConnectionRequest.find({ seekerId: req.user._id, listingId: { $in: listings.map(x => x._id) } }).select('listingId status').lean()).map(x => [String(x.listingId), { _id: x._id, status: x.status }]));
    res.json({ listings: listings.map(({ hostId, ...listing }) => ({ ...listing, host: hostId, myRequest: mine.get(String(listing._id)) || null })) });
  } catch (error) { next(error); }
};
exports.create = async (req, res, next) => {
  try {
    const listing = await Listing.create({ ...req.body, hostId: req.user._id });
    res.status(201).json({ listing });
  } catch (error) { next(error); }
};
exports.mine = async (req, res, next) => {
  try { res.json({ listings: await Listing.find({ hostId: req.user._id }).sort({ createdAt: -1 }) }); } catch (error) { next(error); }
};
