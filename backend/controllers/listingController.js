const Listing = require('../models/Listing');
const ConnectionRequest = require('../models/ConnectionRequest');
const { listingProximity, distanceKm, estimatedRoadKm, knownAreaLocation } = require('../utils/proximity');
const { configured: cloudinaryConfigured, credentials: cloudinaryCredentials, getCloudinary } = require('../utils/cloudinary');
const crypto = require('crypto');

exports.list = async (req, res, next) => {
  try {
    const listings = await Listing.find({ status: 'Available' }).populate('hostId', 'professionTitle workRoutine hobbyMatrix spotifyData').sort({ createdAt: -1 }).lean();
    const mine = new Map((await ConnectionRequest.find({ seekerId: req.user._id, listingId: { $in: listings.map(x => x._id) } }).select('listingId status').lean()).map(x => [String(x.listingId), { _id: x._id, status: x.status }]));
    let responseListings = listings.map(({ hostId, location, ...listing }) => ({
      ...listing,
      host: hostId,
      proximity: listingProximity({ ...listing, location }),
      myRequest: mine.get(String(listing._id)) || null
    }));
    const lat = Number(req.query.lat), lng = Number(req.query.lng), radiusKm = Number(req.query.radiusKm);
    if ([req.query.lat, req.query.lng, req.query.radiusKm].some(value => value !== undefined)) {
      if (![lat, lng, radiusKm].every(Number.isFinite) || radiusKm < 1 || radiusKm > 50) return res.status(400).json({ message: 'Use valid latitude, longitude and a radius from 1 to 50 km.' });
      const origin = { latitude: lat, longitude: lng };
      responseListings = responseListings.map(listing => {
        const directDistance = Number(distanceKm(origin, listing.proximity).toFixed(1));
        return { ...listing, distanceKm: directDistance, estimatedRoadKm: estimatedRoadKm(directDistance) };
      }).filter(listing => listing.distanceKm <= radiusKm).sort((a, b) => a.distanceKm - b.distanceKm);
    }
    const nearest = req.query.lat !== undefined && responseListings[0] ? { id: responseListings[0]._id, label: responseListings[0].proximity.label, distanceKm: responseListings[0].distanceKm, estimatedRoadKm: responseListings[0].estimatedRoadKm } : null;
    res.json({ listings: responseListings, nearest });
  } catch (error) { next(error); }
};
exports.create = async (req, res, next) => {
  try {
    const listing = await Listing.create({ ...req.body, hostId: req.user._id });
    res.status(201).json({ listing: { ...listing.toObject(), proximity: listingProximity(listing) } });
  } catch (error) { next(error); }
};
exports.mine = async (req, res, next) => {
  try {
    const listings = await Listing.find({ hostId: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ listings });
  } catch (error) { next(error); }
};

const sameId = (a, b) => String(a) === String(b);
const editableFields = ['location', 'duration', 'costs', 'propertyRules', 'description', 'availableFrom', 'status'];
exports.update = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Property not found.' });
    if (!sameId(listing.hostId, req.user._id)) return res.status(403).json({ message: 'Only the property poster can update this listing.' });
    for (const field of editableFields) if (req.body[field] !== undefined) listing[field] = req.body[field];
    await listing.save();
    res.json({ listing });
  } catch (error) { next(error); }
};
exports.remove = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id).select('hostId media');
    if (!listing) return res.status(404).json({ message: 'Property not found.' });
    if (!sameId(listing.hostId, req.user._id)) return res.status(403).json({ message: 'Only the property poster can delete this listing.' });
    const cloudinary = getCloudinary();
    if (cloudinary) await Promise.all(listing.media.map(asset => cloudinary.uploader.destroy(asset.publicId, { resource_type: asset.type, invalidate: true }).catch(() => null)));
    await Promise.all([listing.deleteOne(), ConnectionRequest.deleteMany({ listingId: listing._id })]);
    res.status(204).end();
  } catch (error) { next(error); }
};
const allowedMedia = new Map([
  ['image/jpeg', 'image'], ['image/png', 'image'], ['image/webp', 'image'], ['video/mp4', 'video'], ['video/webm', 'video']
]);
const maxMediaBytes = 100 * 1024 * 1024;

exports.signMediaUploads = async (req, res, next) => {
  try {
    const cloudinary = getCloudinary();
    if (!cloudinary || !cloudinaryConfigured()) return res.status(503).json({ message: 'Cloudinary media storage is not configured.' });
    const cloudConfig = cloudinaryCredentials();
    const listing = await Listing.findById(req.params.id).select('hostId media');
    if (!listing) return res.status(404).json({ message: 'Property not found.' });
    if (!sameId(listing.hostId, req.user._id)) return res.status(403).json({ message: 'Only the property poster can add media.' });
    const files = Array.isArray(req.body.files) ? req.body.files : [];
    if (!files.length || files.length > 8 || listing.media.length + files.length > 8) return res.status(400).json({ message: 'Choose up to 8 total JPG, PNG, WebP, MP4, or WebM files.' });
    const timestamp = Math.floor(Date.now() / 1000);
    const uploads = files.map(file => {
      const type = allowedMedia.get(file?.type);
      if (!type || !Number.isFinite(file.size) || file.size < 1 || file.size > maxMediaBytes) throw new Error('Each media file must be an approved format and no larger than 100 MB.');
      const publicId = `blr-home-hunt/${req.user._id}/${listing._id}/${crypto.randomUUID()}`;
      const signature = cloudinary.utils.api_sign_request({ public_id: publicId, timestamp }, cloudConfig.apiSecret);
      return { publicId, type, timestamp, signature, apiKey: cloudConfig.apiKey, cloudName: cloudConfig.cloudName };
    });
    res.json({ uploads });
  } catch (error) { next(error); }
};

exports.completeMediaUploads = async (req, res, next) => {
  try {
    const cloudinary = getCloudinary();
    if (!cloudinary) return res.status(503).json({ message: 'Cloudinary media storage is not configured.' });
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Property not found.' });
    if (!sameId(listing.hostId, req.user._id)) return res.status(403).json({ message: 'Only the property poster can add media.' });
    const media = Array.isArray(req.body.media) ? req.body.media : [];
    const prefix = `blr-home-hunt/${req.user._id}/${listing._id}/`;
    if (!media.length || media.length > 8 || listing.media.length + media.length > 8 || media.some(asset => !asset?.publicId?.startsWith(prefix) || !['image', 'video'].includes(asset.type))) return res.status(400).json({ message: 'Invalid media upload confirmation.' });
    const verified = await Promise.all(media.map(async asset => {
      const resource = await cloudinary.api.resource(asset.publicId, { resource_type: asset.type });
      return { publicId: resource.public_id, secureUrl: resource.secure_url, type: resource.resource_type };
    }));
    listing.media.push(...verified);
    await listing.save();
    res.status(201).json({ media: listing.media });
  } catch (error) { next(error); }
};

const geocodeCache = new Map();
exports.geocode = async (req, res, next) => {
  try {
    const query = String(req.query.query || '').trim();
    if (query.length < 3 || query.length > 200) return res.status(400).json({ message: 'Enter a location with 3 to 200 characters.' });
    const key = query.toLowerCase(), cached = geocodeCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return res.json({ location: cached.location });
    const knownArea = knownAreaLocation(query);
    if (knownArea) { geocodeCache.set(key, { location: knownArea, expiresAt: Date.now() + 86400000 }); return res.json({ location: knownArea }); }
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(`${query}, Bengaluru, India`)}`, { headers: { 'User-Agent': process.env.GEOCODER_USER_AGENT || 'BLRHomeHunt/1.0 contact@example.com', Accept: 'application/json' } });
    if (!response.ok) return res.status(502).json({ message: 'Location lookup is temporarily unavailable. Try a Bengaluru area such as Whitefield or Koramangala.' });
    const [result] = await response.json();
    if (!result) return res.status(404).json({ message: 'Location not found. Try a Bengaluru landmark or area.' });
    const location = { label: result.display_name, latitude: Number(result.lat), longitude: Number(result.lon) };
    geocodeCache.set(key, { location, expiresAt: Date.now() + 86400000 });
    res.json({ location });
  } catch (error) { next(error); }
};
