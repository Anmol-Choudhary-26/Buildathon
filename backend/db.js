const mongoose = require('mongoose');

let connectionPromise;
function databaseUri() {
  if (!process.env.MONGODB_DIRECT_HOSTS) return process.env.MONGODB_URI;
  const input = process.env.MONGODB_URI;
  const scheme = input.startsWith('mongodb+srv://') ? 'mongodb+srv://' : 'mongodb://';
  const at = input.lastIndexOf('@'), credentials = input.slice(scheme.length, at), separator = credentials.indexOf(':');
  if (at < 0 || separator < 1) throw new Error('MONGODB_URI must include a username and password.');
  return `mongodb://${encodeURIComponent(credentials.slice(0, separator))}:${encodeURIComponent(credentials.slice(separator + 1))}@${process.env.MONGODB_DIRECT_HOSTS}/BlrHunts?tls=true&authSource=admin&replicaSet=${encodeURIComponent(process.env.MONGODB_REPLICA_SET)}&retryWrites=true&w=majority&appName=Cluster0`;
}
function connectDatabase() {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose.connection);
  connectionPromise ||= mongoose.connect(databaseUri(), { dbName: 'BlrHunts', serverApi: { version: '1', strict: true, deprecationErrors: true } });
  return connectionPromise;
}
module.exports = { connectDatabase };
