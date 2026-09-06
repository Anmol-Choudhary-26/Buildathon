require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
function databaseUri() {
  if (!process.env.MONGODB_DIRECT_HOSTS) return process.env.MONGODB_URI;
  const input = process.env.MONGODB_URI;
  const scheme = input.startsWith('mongodb+srv://') ? 'mongodb+srv://' : 'mongodb://';
  const at = input.lastIndexOf('@');
  const credentials = input.slice(scheme.length, at);
  const separator = credentials.indexOf(':');
  if (at < 0 || separator < 1) throw new Error('MONGODB_URI must include a username and password.');
  const username = encodeURIComponent(credentials.slice(0, separator));
  const password = encodeURIComponent(credentials.slice(separator + 1));
  return `mongodb://${username}:${password}@${process.env.MONGODB_DIRECT_HOSTS}/BlrHunts?tls=true&authSource=admin&replicaSet=${encodeURIComponent(process.env.MONGODB_REPLICA_SET)}&retryWrites=true&w=majority&appName=Cluster0`;
}
mongoose.connect(databaseUri(), {
  dbName: 'BlrHunts',
  serverApi: { version: '1', strict: true, deprecationErrors: true }
}).then(() => app.listen(process.env.PORT || 5000, () => console.log('VibeMatch API running'))).catch(err => { console.error(err); process.exit(1); });
