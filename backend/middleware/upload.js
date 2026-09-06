const multer = require('multer');

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const videoTypes = new Set(['video/mp4', 'video/webm']);
const upload = multer({
  // Files are streamed from memory to Supabase Storage and never written to
  // the application server, which also works on Vercel's ephemeral runtime.
  storage: multer.memoryStorage(),
  limits: { files: 8, fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, done) => done(null, imageTypes.has(file.mimetype) || videoTypes.has(file.mimetype))
});
const mediaType = mimetype => imageTypes.has(mimetype) ? 'image' : 'video';
module.exports = { upload, mediaType };
