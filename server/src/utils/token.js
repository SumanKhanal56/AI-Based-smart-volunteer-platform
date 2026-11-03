// This helper creates secure login tokens.
import jwt from 'jsonwebtoken';

// Create the JWT token used to keep a user signed in.
export function createToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'development-secret-change-me', { expiresIn: '7d' });
}
