// This helper sends frontend requests to the Express API.
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Send a request to Express and include the login token when available.
export async function api(path, options = {}) {
  // Read the saved JWT so protected backend routes know who is making the request.
  const token = localStorage.getItem('volunterr_token');
  let response;
  try {
    // fetch sends the request; objects are converted to JSON for Express.
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      },
      body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body
    });
  } catch {
    throw new Error('The Volunteer Nepal server is offline. Start the complete project with “npm run dev” and try again.');
  }
  // Convert the JSON response into a JavaScript object.
  const data = await response.json().catch(() => ({}));
  // Turn unsuccessful HTTP responses into errors that components can display.
  if (!response.ok) throw new Error(data.message || 'Unable to complete the request.');
  return data;
}

// Convert a saved date into a clear date for the interface.
export function formatDate(value, style = 'medium') {
  if (!value) return 'Date to be confirmed';
  return new Intl.DateTimeFormat('en-GB', style === 'long'
    ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    : { day: 'numeric', month: 'short', year: 'numeric' }
  ).format(new Date(value));
}

// Convert comma-separated text into a clean array of tags.
export function splitTags(value) {
  if (Array.isArray(value)) return value;
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}
