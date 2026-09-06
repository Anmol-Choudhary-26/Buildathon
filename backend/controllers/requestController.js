const ConnectionRequest = require('../models/ConnectionRequest');
const Listing = require('../models/Listing');
const SeekerProfile = require('../models/SeekerProfile');
const User = require('../models/User');

const sameId = (a, b) => String(a) === String(b);

exports.createRequest = async (req, res, next) => {
  try {
    const { listingId, introNote } = req.body;
    const listing = await Listing.findById(listingId).select('hostId status');
    if (!listing || listing.status !== 'Available') return res.status(404).json({ message: 'Available listing not found.' });
    if (sameId(listing.hostId, req.user._id)) return res.status(400).json({ message: 'Hosts cannot apply to their own listing.' });
    const application = await ConnectionRequest.create({ listingId: listing._id, seekerId: req.user._id, hostId: listing.hostId, introNote });
    res.status(201).json({ request: application });
  } catch (error) { if (error?.code === 11000) return res.status(409).json({ message: 'You already applied to this listing.' }); next(error); }
};

exports.hostRequests = async (req, res, next) => {
  try {
    const requests = await ConnectionRequest.find({ hostId: req.user._id })
      .populate('listingId', 'location duration costs status')
      .populate('seekerId', 'professionTitle workRoutine hobbyMatrix spotifyData')
      .sort({ createdAt: -1 }).lean();
    const profileByUser = new Map((await SeekerProfile.find({ userId: { $in: requests.map(r => r.seekerId._id) } }).lean()).map(p => [String(p.userId), p]));
    res.json({ requests: requests.map(r => ({ ...r, seekerProfile: profileByUser.get(String(r.seekerId._id)) || null })) });
  } catch (error) { next(error); }
};

exports.respond = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Accepted', 'Rejected'].includes(status)) return res.status(400).json({ message: 'Status must be Accepted or Rejected.' });
    const request = await ConnectionRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found.' });
    if (!sameId(request.hostId, req.user._id)) return res.status(403).json({ message: 'Only the listing host may respond.' });
    if (request.status !== 'Pending') return res.status(409).json({ message: 'This request has already been decided.' });
    request.status = status; await request.save();
    res.json({ request });
  } catch (error) { next(error); }
};

exports.revealContact = async (req, res, next) => {
  try {
    const request = await ConnectionRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found.' });
    if (request.status !== 'Accepted') return res.status(403).json({ message: 'Contact is unlocked only after acceptance.' });
    const isSeeker = sameId(request.seekerId, req.user._id), isHost = sameId(request.hostId, req.user._id);
    if (!isSeeker && !isHost) return res.status(403).json({ message: 'You are not part of this connection.' });
    const counterpart = await User.findById(isSeeker ? request.hostId : request.seekerId).select('+encryptedName +encryptedEmail +encryptedPhone');
    if (!counterpart) return res.status(404).json({ message: 'Counterpart not found.' });
    res.json({ contact: counterpart.getContact() });
  } catch (error) { next(error); }
};
