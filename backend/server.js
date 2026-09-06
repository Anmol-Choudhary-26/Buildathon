require('dotenv').config();
const app = require('./app');
const { connectDatabase } = require('./db');
connectDatabase().then(() => app.listen(process.env.PORT || 5000, () => console.log('VibeMatch API running'))).catch(err => { console.error(err); process.exit(1); });
