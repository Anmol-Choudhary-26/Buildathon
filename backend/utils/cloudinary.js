const { v2: cloudinary } = require('cloudinary');

function credentials() {
  if (process.env.CLOUDINARY_URL) {
    const url = new URL(process.env.CLOUDINARY_URL);
    if (url.protocol === 'cloudinary:' && url.username && url.password && url.hostname) {
      return { cloudName: url.hostname, apiKey: decodeURIComponent(url.username), apiSecret: decodeURIComponent(url.password) };
    }
  }
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    return { cloudName: process.env.CLOUDINARY_CLOUD_NAME, apiKey: process.env.CLOUDINARY_API_KEY, apiSecret: process.env.CLOUDINARY_API_SECRET };
  }
  return null;
}

function getCloudinary() {
  const config = credentials();
  if (!config) return null;
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true
  });
  return cloudinary;
}

module.exports = { configured: () => Boolean(credentials()), credentials, getCloudinary };
