const Listing = require('../models/Listing');
const ConnectionRequest = require('../models/ConnectionRequest');
const { listingProximity, distanceKm, estimatedRoadKm, knownAreaLocation } = require('../utils/proximity');
const { getStorage, createSignedUpload, signedUrl, removeMedia } = require('../utils/supabaseStorage');
const crypto = require('crypto');
const path = require('path');

async function withMediaUrls(listing) {
  const item = listing.toObject ? listing.toObject() : listing;
  const media = await Promise.all((item.media || []).map(async asset => ({
    ...asset,
    // Legacy local media remains viewable in local development. New files use
    // private, one-hour Supabase signed URLs.
    url: asset.storagePath ? await signedUrl(asset.storagePath) : asset.url
  })));
  return { ...item, media };
}

exports.list = async (req, res, next) => {
  try {
    const listings = await Listing.find({ status: 'Available' }).populate('hostId', 'professionTitle workRoutine hobbyMatrix spotifyData').sort({ createdAt: -1 }).lean();
    const mine = new Map((await ConnectionRequest.find({ seekerId: req.user._id, listingId: { $in: listings.map(x => x._id) } }).select('listingId status').lean()).map(x => [String(x.listingId), { _id: x._id, status: x.status }]));
    let responseListings = (await Promise.all(listings.map(withMediaUrls))).map(({ hostId, location, ...listing }) => ({
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
    res.json({ listings: await Promise.all(listings.map(withMediaUrls)) });
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
    res.json({ listing: await withMediaUrls(listing) });
  } catch (error) { next(error); }
};
exports.remove = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id).select('hostId media');
    if (!listing) return res.status(404).json({ message: 'Property not found.' });
    if (!sameId(listing.hostId, req.user._id)) return res.status(403).json({ message: 'Only the property poster can delete this listing.' });
    await Promise.all([removeMedia(listing.media.map(asset => asset.storagePath).filter(Boolean)), listing.deleteOne(), ConnectionRequest.deleteMany({ listingId: listing._id })]);
    res.status(204).end();
  } catch (error) { next(error); }
};
const allowedMedia = new Map([
  ['image/jpeg', { extension: '.jpg', type: 'image' }], ['image/png', { extension: '.png', type: 'image' }],
  ['image/webp', { extension: '.webp', type: 'image' }], ['video/mp4', { extension: '.mp4', type: 'video' }],
  ['video/webm', { extension: '.webm', type: 'video' }]
]);
const maxMediaBytes = 30 * 1024 * 1024;

exports.signMediaUploads = async (req, res, next) => {
  try {
    if (!getStorage()) return res.status(503).json({ message: 'Media storage is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.' });
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Property not found.' });
    if (!sameId(listing.hostId, req.user._id)) return res.status(403).json({ message: 'Only the property poster can add media.' });
    const files = Array.isArray(req.body.files) ? req.body.files : [];
    if (!files.length || files.length > 8 || listing.media.length + files.length > 8) return res.status(400).json({ message: 'Choose up to 8 total JPG, PNG, WebP, MP4, or WebM files.' });
    const uploads = await Promise.all(files.map(async file => {
      const details = allowedMedia.get(file?.type);
      if (!details || !Number.isFinite(file.size) || file.size < 1 || file.size > maxMediaBytes) throw new Error('Each media file must be an approved format and no larger than 30 MB.');
      const suppliedExtension = path.extname(String(file.name || '')).toLowerCase();
      const extension = suppliedExtension === details.extension ? suppliedExtension : details.extension;
      const storagePath = `hosts/${req.user._id}/listings/${listing._id}/${crypto.randomUUID()}${extension}`;
      const signed = await createSignedUpload(storagePath);
      return { ...signed, type: details.type, contentType: file.type };
    }));
    res.json({ uploads });
  } catch (error) { next(error); }
};

exports.completeMediaUploads = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Property not found.' });
    if (!sameId(listing.hostId, req.user._id)) return res.status(403).json({ message: 'Only the property poster can add media.' });
    const media = Array.isArray(req.body.media) ? req.body.media : [];
    const prefix = `hosts/${req.user._id}/listings/${listing._id}/`;
    if (!media.length || media.length > 8 || listing.media.length + media.length > 8 || media.some(asset => !asset?.storagePath?.startsWith(prefix) || !['image', 'video'].includes(asset.type))) return res.status(400).json({ message: 'Invalid media upload confirmation.' });
    listing.media.push(...media.map(({ storagePath, type }) => ({ storagePath, type })));
    await listing.save();
    const response = await withMediaUrls(listing);
    res.status(201).json({ media: response.media });
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
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(`${query}, Bengaluru, India`)}`, { headers: { 'User-Agent': process.env.GEOCODER_USER_AGENT || 'BengaluruVibeMatch/1.0 contact@example.com', Accept: 'application/json' } });
    if (!response.ok) return res.status(502).json({ message: 'Location lookup is temporarily unavailable. Try a Bengaluru area such as Whitefield or Koramangala.' });
    const [result] = await response.json();
    if (!result) return res.status(404).json({ message: 'Location not found. Try a Bengaluru landmark or area.' });
    const location = { label: result.display_name, latitude: Number(result.lat), longitude: Number(result.lon) };
    geocodeCache.set(key, { location, expiresAt: Date.now() + 86400000 });
    res.json({ location });
  } catch (error) { next(error); }
};
