async function getSupabaseIdentity(token) {
  const baseUrl = process.env.SUPABASE_URL;
  const apiKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!baseUrl || !apiKey) return null;
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/auth/v1/user`, { headers: { apikey: apiKey, Authorization: `Bearer ${token}` } });
  if (!response.ok) return null;
  return response.json();
}
module.exports = { getSupabaseIdentity };
