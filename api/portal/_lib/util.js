// Date helpers in the portal time zone (PORTAL_TZ, default UTC).

const TZ = process.env.PORTAL_TZ || 'UTC';

// Timestamp in ms to 'YYYY-MM-DD' in the portal time zone.
function diaLocal(ms) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}

// List of N days ending YESTERDAY, oldest first.
function ultimosDias(hoje, n) {
  const out = [];
  for (let i = n; i >= 1; i--) out.push(diaLocal(hoje.getTime() - i * 864e5));
  return out;
}

module.exports = { TZ, diaLocal, ultimosDias };
