const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');

let serviceAccount;

try {
  // Check if credentials are provided via environment variable (for Render/Vercel deployment)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Fallback to local file for development
    serviceAccount = require('./serviceAccountKey.json');
  }

  initializeApp({ credential: cert(serviceAccount) });
  console.log("✅ Firebase Admin initialized successfully.");
} catch (error) {
  console.error("❌ Firebase Admin Initialization Error:", error.message);
  console.error("Ensure FIREBASE_SERVICE_ACCOUNT env var is set or serviceAccountKey.json exists.");
}

// Lazy getters so a failed init surfaces as a per-request error instead of crashing at require time
module.exports = {
  auth: () => getAuth(),
  db: () => getFirestore(),
  FieldValue,
  Timestamp,
};
