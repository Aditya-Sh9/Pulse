const admin = require('../config/firebase-config');

const isAdmin = async (req, res, next) => {
  // req.user is populated by the verifyToken middleware that runs just before this
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ message: 'Unauthorized. No user found in request.' });
  }

  try {
    // Fetch the user's document from Firestore
    const userDoc = await admin.firestore().collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found in database.' });
    }

    const userData = userDoc.data();

    // The Bouncer Check
    if (userData.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden. Action requires admin privileges.' });
    }

    // User is an admin, allow the request to proceed
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ message: 'Internal server error while checking permissions.' });
  }
};

module.exports = isAdmin;