const app = require('../backend/app');
const { connectDatabase } = require('../backend/db');

// Vercel reuses warm function instances; the connection helper caches MongoDB safely.
module.exports = async (req, res) => {
  try { await connectDatabase(); return app(req, res); }
  catch (error) { console.error('Database connection failed', error); return res.status(503).json({ message: 'Database temporarily unavailable.' }); }
};
