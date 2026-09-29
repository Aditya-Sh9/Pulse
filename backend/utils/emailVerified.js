// Email/password accounts must confirm their address; other providers (Google) are verified by the IdP
module.exports = function isEmailVerified(decodedToken) {
  return decodedToken.email_verified === true || decodedToken.firebase?.sign_in_provider !== 'password';
};
