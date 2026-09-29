const admin = require('../config/firebase-config');

// Resolve a display name + initial for audit entries from the trusted user record,
// so clients cannot attribute actions to someone else.
exports.getActor = async (decodedToken) => {
  let name = decodedToken.name;
  if (!name) {
    try {
      const snap = await admin.db().collection('users').doc(decodedToken.uid).get();
      name = snap.exists ? snap.data().name : undefined;
    } catch {
      // fall through to email
    }
  }
  name = name || decodedToken.email || 'User';
  return { uid: decodedToken.uid, name, avatar: name.charAt(0).toUpperCase() };
};

exports.escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
