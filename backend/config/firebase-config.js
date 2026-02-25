const admin = require('firebase-admin');

// Ensure you have downloaded your serviceAccountKey.json from Firebase Console
// and placed it inside the backend/config/ folder.
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;