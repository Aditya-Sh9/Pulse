const admin = require('../config/firebase-config');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check if the Authorization header exists and starts with "Bearer "
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided. Unauthorized.' });
  }

  // Extract the token string
  const token = authHeader.split(' ')[1];

  try {
    // Verify the token using Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Attach the decoded user information to the request object
    // This allows subsequent routes to know exactly who made the request
    req.user = decodedToken;
    
    // Move to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return res.status(403).json({ message: 'Invalid or expired token. Unauthorized.' });
  }
};

module.exports = verifyToken;