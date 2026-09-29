// Due dates are stored as local calendar days (YYYY-MM-DD) in the workspace's timezone
const timezone = process.env.APP_TIMEZONE || 'Asia/Kolkata';

const dateKeyInZone = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

// Pure calendar arithmetic on YYYY-MM-DD keys (no timezone involved)
const addToDateKey = (key, unit) => {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (unit === 'daily') date.setUTCDate(date.getUTCDate() + 1);
  if (unit === 'weekly') date.setUTCDate(date.getUTCDate() + 7);
  if (unit === 'monthly') {
    // Clamp to the last day of the target month (Jan 31 → Feb 28/29)
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay));
  }
  return date.toISOString().slice(0, 10);
};

module.exports = { timezone, dateKeyInZone, addToDateKey };
