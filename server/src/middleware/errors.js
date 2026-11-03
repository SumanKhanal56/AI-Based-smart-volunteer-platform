// This middleware returns clear API error responses.
// Return a clear message when an API route does not exist.
export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Convert unexpected server errors into a safe JSON response.
export function errorHandler(err, req, res, next) {
  if (err.code === 11000) return res.status(409).json({ message: 'That record already exists.' });
  if (err.name === 'CastError') return res.status(400).json({ message: 'One of the supplied identifiers is invalid.' });
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((item) => item.message).join(' ');
    return res.status(400).json({ message });
  }
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Something went wrong on the server.' });
}
