// This middleware protects routes and checks account roles.
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Check the JWT token and attach the logged-in user to the request.
export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'development-secret-change-me');
    const user = await User.findById(payload.id);
    if (!user || !user.active) return res.status(401).json({ message: 'Account is unavailable.' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Your session is invalid or has expired.' });
  }
}

// Read the user when a token exists, but still allow public access.
export async function optionalProtect(req, _res, next) {
  req.user = null;
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next();

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'development-secret-change-me');
    const user = await User.findById(payload.id);
    if (user?.active) req.user = user;
  } catch {
    // Invalid tokens do not give access to personal data.
  }
  return next();
}
// Allow only the account roles listed on a protected route.
export function allow(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'You do not have permission for this action.' });
    next();
  };
}
