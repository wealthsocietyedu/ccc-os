// server/middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ccc-os-dev-secret-change-in-production';

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    req.userTier = payload.tier || 'starter';
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const signToken = (userId, tier = 'starter') => {
  return jwt.sign({ userId, tier }, JWT_SECRET, { expiresIn: '30d' });
};

module.exports = { authenticate, signToken };
