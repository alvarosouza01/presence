// Fonte: Google Analytics 4 (visitas, páginas, origens e conversões de cada site).
// Variável: GA4_SERVICE_ACCOUNT_JSON = conteúdo inteiro do arquivo JSON da conta de
// serviço (ex.: portal-ga4@seu-projeto.iam.gserviceaccount.com), que tem acesso de
// "Leitor" na conta do Analytics. A propriedade de cada site vem de sites.js.

const crypto = require('crypto');
const { ultimosDias } = require('../util');

const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://analyticsdata.googleapis.com/v1beta/properties/';

function credenciais() {
  let raw = String(process.env.GA4_SERVICE_ACCOUNT_JSON || '').trim();
  if (raw && raw[0] !== '{') raw = Buffer.from(raw, 'base64').toString('utf8'); // aceita JSON em base64 também
  const c = JSON.parse(raw);
  if (!c.client_email || !c.private_key) throw new Error('GA4_SERVICE_ACCOUNT_JSON sem client_email/private_key');
  c.private_key = c.private_key.replace(/\\n/g, '\n');
  return c;
}

// Troca um JWT assinado com a chave da conta de serviço por um access token.
async function accessToken(c) {
  const agora = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const corpo = b64({ alg: 'RS256', typ: 'JWT' }) + '.' +
    b64({ iss: c.client_email, scope: SCOPE, aud: TOKEN_URL, iat: agora, exp: agora + 3600 });
  const assinatura = crypto.createSign('RSA-SHA256').update(corpo).sign(c.private_key, 'base64url');

  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: corpo + '.' + assinatura })
  });
  if (!r.ok) throw new Error('GA4 token ' + r.status);
  return (await r.json()).access_token;
}

async function batch(token, propertyId, requests) {
  const r = await fetch(API + propertyId + ':batchRunReports', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests })
  });
  if (!r.ok) {
    let msg = String(r.status);
    try { msg += ' ' + ((await r.json()).error || {}).status; } catch (e) { /* ignora */ }
    throw new Error('GA4 propriedade ' + propertyId + ': ' + msg);
  }
  return (await r.json()).reports || [];
}

// Canais do GA4 que contam como tráfego pago (anúncios).
const CANAIS_PAGOS = ['Paid Social', 'Paid Search', 'Paid Video', 'Paid Shopping', 'Paid Other', 'Display', 'Cross-network', 'Audio'];
const ehPago = (canal) => CANAIS_PAGOS.indexOf(canal) >= 0;

const linhas = (rep) => (rep && rep.rows) || [];
const dim = (row, i) => row.dimensionValues[i || 0].value;
const met = (row, i) => Number(row.metricValues[i || 0].value) || 0;

async function coletarSite(token, site, dias) {
  const ontem = { startDate: 'yesterday', endDate: 'yesterday' };
  const requests = [
    { // 1. usuários ativos por dia, 14 dias
      dateRanges: [{ startDate: '14daysAgo', endDate: 'yesterday' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }]
    },
    { // 2. páginas mais vistas ontem
      dateRanges: [ontem],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 8
    },
    { // 3. origem das sessões ontem
      dateRanges: [ontem],
      dimensions: [{ name: 'sessionSourceMedium' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 8
    }
  ];
  if (site.conversao && site.conversao.evento) {
    requests.push({ // 4. evento de conversão, ontem e anteontem
      dateRanges: [{ startDate: '2daysAgo', endDate: 'yesterday' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: site.conversao.evento } } }
    });
  }

  // Segundo lote: orgânico x anúncios e páginas que recebem tráfego pago.
  const requests2 = [
    { // 5. sessões por dia e canal, 14 dias
      dateRanges: [{ startDate: '14daysAgo', endDate: 'yesterday' }],
      dimensions: [{ name: 'date' }, { name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      limit: 1000
    },
    { // 6. páginas de entrada do tráfego pago, 7 dias
      dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
      dimensions: [{ name: 'landingPage' }, { name: 'sessionCampaignName' }, { name: 'sessionSource' }],
      metrics: [{ name: 'sessions' }, { name: 'keyEvents' }],
      dimensionFilter: { filter: { fieldName: 'sessionDefaultChannelGroup', inListFilter: { values: CANAIS_PAGOS } } },
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 15
    },
    { // 7. países, 7 dias
      dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 8
    }
  ];
  const landings = site.landings || [];
  if (landings.length) {
    requests2.push({ // 8. visitas e eventos das landing pages, 30 dias
      dateRanges: [{ startDate: '30daysAgo', endDate: 'yesterday' }],
      dimensions: [{ name: 'pagePath' }, { name: 'eventName' }],
      metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
      dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['page_view'].concat([...new Set(landings.map((l) => l.evento))]) } } },
      limit: 500
    });
  }

  const [reps, reps2] = await Promise.all([
    batch(token, site.ga4.propertyId, requests),
    batch(token, site.ga4.propertyId, requests2).catch(() => null)
  ]);

  const porDia = {};
  linhas(reps[0]).forEach((r) => { porDia[dim(r)] = met(r); });
  const serie = dias.map((d) => porDia[d.replace(/-/g, '')] || 0);

  const out = {
    visitas: { dias, ontem: serie[serie.length - 1] || 0, anterior: serie[serie.length - 2] || 0, serie },
    paginas: linhas(reps[1]).map((r) => [dim(r), met(r)]),
    origens: linhas(reps[2]).map((r) => [dim(r), met(r)])
  };

  if (reps2) {
    const idx = {};
    dias.forEach((d, i) => { idx[d.replace(/-/g, '')] = i; });
    const org = dias.map(() => 0), pago = dias.map(() => 0);
    linhas(reps2[0]).forEach((r) => {
      const i = idx[dim(r, 0)];
      if (i == null) return;
      (ehPago(dim(r, 1)) ? pago : org)[i] += met(r);
    });
    out.visitas.organico = { ontem: org[org.length - 1], anterior: org[org.length - 2], serie: org };
    out.visitas.ads = { ontem: pago[pago.length - 1], anterior: pago[pago.length - 2], serie: pago };
    out.paises = linhas(reps2[2]).map((r) => [dim(r) || '(desconhecido)', met(r)]);
    if (landings.length && reps2[3]) {
      const norm = (p) => String(p || '').replace(/\.html$/, '').replace(/\/$/, '') || '/';
      out.landings = landings.map((l) => {
        const pags = l.paginas.map(norm);
        let visitas = 0, pessoas = 0, conversoes = 0;
        linhas(reps2[3]).forEach((r) => {
          const p = norm(dim(r, 0));
          if (pags.indexOf(p) < 0) return;
          if (dim(r, 1) === 'page_view' && p === norm(l.caminho)) { visitas += met(r, 0); pessoas += met(r, 1); }
          if (dim(r, 1) === l.evento) conversoes += met(r, 0);
        });
        return { nome: l.nome, caminho: l.caminho, produto: l.produto || null, campanhas: l.campanhas || [], visitas30d: visitas, pessoas30d: pessoas, conversoes30d: conversoes, rotulo: l.rotulo };
      });
    }
    // Junta linhas da mesma página e campanha. A Meta às vezes envia o nome da campanha
    // com "+" no lugar de espaço (ou codificado), e o GA4 conta como campanha diferente.
    const limpa = (t) => { let x = String(t || '').replace(/\+/g, ' '); try { x = decodeURIComponent(x); } catch (e) { /* mantém */ } return x.replace(/\s+/g, ' ').trim(); };
    const juntas = {};
    linhas(reps2[1]).forEach((r) => {
      const pagina = dim(r, 0) || '(sem página)';
      const camp = dim(r, 1) && dim(r, 1) !== '(not set)' ? limpa(dim(r, 1)) : null;
      const k = pagina + '|' + (camp || '').toLowerCase();
      const o = juntas[k] = juntas[k] || { pagina, campanha: camp, origens: [], sessoes: 0, conversoes: 0 };
      if (o.origens.indexOf(dim(r, 2)) < 0) o.origens.push(dim(r, 2));
      o.sessoes += met(r, 0); o.conversoes += met(r, 1);
    });
    out.paginasAds = Object.values(juntas).sort((a, b) => b.sessoes - a.sessoes)
      .map((o) => ({ pagina: o.pagina, campanha: o.campanha, origem: o.origens.join(', '), sessoes: o.sessoes, conversoes: o.conversoes }));
  }

  if (requests.length === 4) {
    const conv = {};
    linhas(reps[3]).forEach((r) => { conv[dim(r)] = met(r); });
    const [d2, d1] = dias.slice(-2).map((d) => d.replace(/-/g, ''));
    out.conversao = { rotulo: site.conversao.rotulo, ontem: conv[d1] || 0, anterior: conv[d2] || 0 };
  }
  return out;
}

module.exports = {
  id: 'ga4',
  nome: 'Google Analytics 4',
  envs: ['GA4_SERVICE_ACCOUNT_JSON'],
  isConfigured: () => Boolean(process.env.GA4_SERVICE_ACCOUNT_JSON),

  async collect({ registry, hoje }) {
    const token = await accessToken(credenciais());
    const dias = ultimosDias(hoje, 14);
    const alvos = registry.sites.filter((s) => s.ga4 && s.ga4.propertyId);

    const res = await Promise.allSettled(alvos.map((s) => coletarSite(token, s, dias)));
    const sites = {};
    const falhas = [];
    res.forEach((r, i) => {
      if (r.status === 'fulfilled') sites[alvos[i].slug] = r.value;
      else falhas.push(alvos[i].nome + ': ' + (r.reason && r.reason.message));
    });
    if (!Object.keys(sites).length && falhas.length) throw new Error(falhas[0]);
    return { sites, avisos: falhas };
  }
};
