// Utilitários de data no fuso do portal (PORTAL_TZ, padrão America/Sao_Paulo).

const TZ = process.env.PORTAL_TZ || 'America/Sao_Paulo';

// 'YYYY-MM-DD' no fuso do portal para um timestamp em ms.
function diaLocal(ms) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}

// Lista de N dias terminando ONTEM, em ordem crescente.
function ultimosDias(hoje, n) {
  const out = [];
  for (let i = n; i >= 1; i--) out.push(diaLocal(hoje.getTime() - i * 864e5));
  return out;
}

module.exports = { TZ, diaLocal, ultimosDias };
