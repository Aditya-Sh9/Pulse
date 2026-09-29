// FRONTEND_URL may hold one origin or a comma-separated list (e.g. prod + preview deploys)
module.exports = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);
