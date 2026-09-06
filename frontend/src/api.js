export function notifyError(message) {
  window.dispatchEvent(new CustomEvent('vibematch:error', { detail: message }));
}

export async function api(path, { token, silent = false, ...options } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: 'include',
      headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
    });
  } catch (_) {
    const error = new Error('Unable to reach BLR Home Hunt. Check your connection and try again.');
    error.notified = true; if (!silent) notifyError(error.message); throw error;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(data.message || 'Request failed. Please try again.'); error.notified = true; if (!silent) notifyError(error.message); throw error; }
  return data;
}
