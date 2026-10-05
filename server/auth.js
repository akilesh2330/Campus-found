import jwt from 'jsonwebtoken';
import { User } from './models.js';

export function issueToken(user) {
  return jwt.sign(
    { sub: String(user._id) },
    process.env.JWT_SECRET,
    { expiresIn: '12h', issuer: 'campus-found' },
  );
}

export function safeUser(user) {
  if (!user) return null;
  return {
    _id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    department: user.department,
    role: user.role,
    profileImage: user.profileImage || '',
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

export async function authRequired(req, res, next) {
  const token = req.get('x-session-token') || req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'campus-found' });
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) return res.status(401).json({ message: 'This account is unavailable. Please contact campus support.' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
}

export async function optionalAuth(req, _res, next) {
  const token = req.get('x-session-token') || req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'campus-found' });
    const user = await User.findById(payload.sub);
    if (user?.isActive) req.user = user;
  } catch {
    // Public pages remain available when a stale session token is present.
  }
  return next();
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Administrator access is required.' });
  return next();
}
