const crypto = require('crypto');

// Neighborhood centroids only. Exact addresses/coordinates are never stored or exposed.
const BENGALURU_AREAS = [
  ['hsr layout', 12.9116, 77.6389], ['indiranagar', 12.9784, 77.6408],
  ['whitefield', 12.9698, 77.7499], ['koramangala', 12.9352, 77.6245],
  ['bellandur', 12.9304, 77.6784], ['marathahalli', 12.9591, 77.6974],
  ['electronic city', 12.8456, 77.6603], ['jayanagar', 12.9299, 77.5825],
  ['jp nagar', 12.9077, 77.5850], ['hebbal', 13.0358, 77.5970],
  ['yelahanka', 13.1007, 77.5963], ['mg road', 12.9756, 77.6065],
  ['btm layout', 12.9166, 77.6101], ['sarjapur', 12.9008, 77.6825],
  ['mahadevapura', 12.9915, 77.6950], ['hoodi', 12.9920, 77.7164],
  ['kr puram', 13.0072, 77.6950], ['kalyan nagar', 13.0221, 77.6406],
  ['hennur', 13.0356, 77.6417], ['rt nagar', 13.0227, 77.5960],
  ['sahakar nagar', 13.0620, 77.5818], ['malleshwaram', 13.0035, 77.5700],
  ['rajajinagar', 12.9910, 77.5550], ['vijayanagar', 12.9719, 77.5370],
  ['basavanagudi', 12.9428, 77.5750], ['banashankari', 12.9255, 77.5468],
  ['bannerghatta road', 12.9067, 77.6024], ['kanakapura road', 12.8914, 77.5638],
  ['begur', 12.8787, 77.6317], ['kudlu gate', 12.8917, 77.6402],
  ['singasandra', 12.8797, 77.6475], ['domlur', 12.9609, 77.6387],
  ['ulsoor', 12.9815, 77.6220], ['frazer town', 13.0031, 77.6161],
  ['yemalur', 12.9494, 77.6880], ['rr nagar', 12.9275, 77.5206], ['kengeri', 12.9077, 77.4836]
];
const PLACE_ALIASES = [['embassy tech village', 'bellandur'], ['rmz ecospace', 'bellandur'], ['manyata tech park', 'hebbal'], ['bagmane tech park', 'indiranagar'], ['itpl', 'whitefield'], ['prestige tech park', 'marathahalli'], ['electronic city phase 1', 'electronic city']];

function listingProximity(listing) {
  const location = String(listing.location || '').toLowerCase();
  const area = BENGALURU_AREAS.find(([name]) => location.includes(name));
  const [name, baseLat, baseLng] = area || ['Bengaluru', 12.9716, 77.5946];
  // A deterministic 0.8–1.7 km offset means a refresh cannot triangulate the property.
  const bytes = crypto.createHash('sha256').update(String(listing._id)).digest();
  const angle = (bytes[0] / 255) * Math.PI * 2;
  const distanceKm = 0.8 + (bytes[1] / 255) * 0.9;
  const latitude = baseLat + (Math.cos(angle) * distanceKm) / 111;
  const longitude = baseLng + (Math.sin(angle) * distanceKm) / (111 * Math.cos(baseLat * Math.PI / 180));
  const displayName = name === 'hsr layout' ? 'HSR Layout' : name.replace(/\b\w/g, c => c.toUpperCase());
  return { label: `Near ${displayName}`, latitude, longitude, radiusMeters: 500 };
}
function knownAreaLocation(query) {
  const normalized = String(query || '').toLowerCase();
  const alias = PLACE_ALIASES.find(([name]) => normalized.includes(name));
  const area = BENGALURU_AREAS.find(([name]) => normalized.includes(name) || (alias && name === alias[1]));
  if (!area) return null;
  const [name, latitude, longitude] = area;
  const displayName = name === 'hsr layout' ? 'HSR Layout' : name.replace(/\b\w/g, c => c.toUpperCase());
  return { label: `${displayName}, Bengaluru`, latitude, longitude };
}
function distanceKm(a, b) {
  const radians = value => value * Math.PI / 180;
  const earthRadiusKm = 6371;
  const dLat = radians(b.latitude - a.latitude), dLng = radians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
// Privacy-safe travel approximation for a dense urban road network; this is not navigation.
const estimatedRoadKm = straightLineKm => Number((straightLineKm * 1.32).toFixed(1));
module.exports = { listingProximity, distanceKm, estimatedRoadKm, knownAreaLocation };
