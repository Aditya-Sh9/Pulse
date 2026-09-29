const admin = require('../config/firebase-config');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check if the Authorization header exists and starts with "Bearer "
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided. Unauthorized.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();

  try {
    // checkRevoked rejects tokens of removed/disabled accounts instead of honouring them until expiry
    req.user = await admin.auth().verifyIdToken(token, true);
    next();
  } catch (error) {
    console.error('Auth token rejected:', error.code || error.message);
    return res.status(401).json({ message: 'Invalid or expired token. Unauthorized.' });
  }
};

module.exports = verifyToken;
