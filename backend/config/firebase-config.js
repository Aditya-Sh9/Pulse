const admin = require('firebase-admin');

let serviceAccount;

try {
  // Check if credentials are provided via environment variable (for Render/Vercel deployment)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Fallback to local file for development
    serviceAccount = require('./serviceAccountKey.json');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("✅ Firebase Admin initialized successfully.");
} catch (error) {
  console.error("❌ Firebase Admin Initialization Error:", error.message);
  console.error("Ensure FIREBASE_SERVICE_ACCOUNT env var is set or serviceAccountKey.json exists.");
}

module.exports = admin;