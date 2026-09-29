// Email/password accounts must confirm their address; other providers (Google) are verified by the IdP
// The seeded admin account uses a placeholder address with no inbox, so it is exempt
const EXEMPT_EMAILS = ['admin@gmail.com'];

module.exports = function isEmailVerified(decodedToken) {
  return decodedToken.email_verified === true || EXEMPT_EMAILS.includes(decodedToken.email) ||decodedToken.firebase?.sign_in_provider !== 'password';
};
