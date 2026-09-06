const { createClient } = require('@supabase/supabase-js');

const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'property-media';
let client;

function getStorage() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  if (!client) client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return client.storage.from(bucket);
}

async function uploadMedia(path, file) {
  const storage = getStorage();
  if (!storage) throw new Error('Supabase Storage is not configured.');
  const { error } = await storage.upload(path, file.buffer, { contentType: file.mimetype, cacheControl: '3600', upsert: false });
  if (error) throw new Error(`Media upload failed: ${error.message}`);
}

async function signedUrl(path) {
  const storage = getStorage();
  if (!storage || !path) return null;
  const { data, error } = await storage.createSignedUrl(path, 60 * 60);
  if (error) throw new Error(`Could not prepare media: ${error.message}`);
  return data.signedUrl;
}

async function removeMedia(paths) {
  const storage = getStorage();
  if (!storage || !paths.length) return;
  const { error } = await storage.remove(paths);
  if (error) throw new Error(`Could not remove property media: ${error.message}`);
}

module.exports = { bucket, getStorage, uploadMedia, signedUrl, removeMedia };
