const admin = require('../config/firebase-config');
const isEmailVerified = require('../utils/emailVerified');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check if the Authorization header exists and starts with "Bearer "
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided. Unauthorized.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();

  let decoded;
  try {
    // checkRevoked rejects tokens of removed/disabled accounts instead of honouring them until expiry
    decoded = await admin.auth().verifyIdToken(token, true);
  } catch (error) {
    console.error('Auth token rejected:', error.code || error.message);
    return res.status(401).json({ message: 'Invalid or expired token. Unauthorized.' });
  }

  if (!isEmailVerified(decoded)) {
    return res.status(403).json({ code: 'email-unverified', message: 'Please confirm your email address first.' });
  }

  req.user = decoded;
  next();
};

module.exports = verifyToken;
