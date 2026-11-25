// Fonte: Instagram (contas profissionais ligadas ao Business Manager).
// Variável: INSTAGRAM_ACCESS_TOKEN = token do usuário do sistema "portal-leitura" com
// instagram_basic, instagram_manage_insights, pages_show_list e pages_read_engagement
// (pode ser o mesmo valor do META_ACCESS_TOKEN, se ele tiver essas permissões).
// As contas vêm de sites.js (redes.instagram).

const { ultimosDias } = require('../util');

const BASE = () => 'https://graph.facebook.com/' + (process.env.META_API_VERSION || 'v23.0') + '/';

async function get(path, params) {
  const url = BASE() + path + '?' + new URLSearchParams(Object.assign({ access_token: process.env.INSTAGRAM_ACCESS_TOKEN }, params)).toString();
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error('Instagram ' + ((j.error && (j.error.code + ' ' + j.error.message)) || r.status));
  return j;
}
async function talvez(p) { try { return await p; } catch (e) { return null; } }

const num = (v) => Number(v) || 0;
const unix = (iso) => Math.floor(new Date(iso + 'T00:00:00Z').getTime() / 1000);

async function coletarConta(conta, hoje) {
  const dias = ultimosDias(hoje, 30);
  const since = unix(dias[0]);
  const until = unix(dias[dias.length - 1]) + 86400;
  const ontem = dias[dias.length - 1];

  const perfil = await get(conta.id, { fields: 'username,name,followers_count,follows_count,media_count,profile_picture_url' });

  const [novosDia, segueDeixa, ontemIns, midia] = await Promise.all([
    // Novos seguidores por dia (a Meta só fornece para contas com 100+ seguidores).
    talvez(get(conta.id + '/insights', { metric: 'follower_count', period: 'day', since: String(since), until: String(until) })),
    // Seguiram e deixaram de seguir no período (total).
    talvez(get(conta.id + '/insights', { metric: 'follows_and_unfollows', period: 'day', metric_type: 'total_value', breakdown: 'follow_type', since: String(since), until: String(until) })),
    // Alcance e visitas ao perfil de ontem.
    talvez(get(conta.id + '/insights', { metric: 'reach,profile_views', period: 'day', metric_type: 'total_value', since: String(unix(ontem)), until: String(unix(ontem) + 86400) })),
    // Últimos posts.
    talvez(get(conta.id + '/media', { fields: 'id,caption,media_type,media_product_type,thumbnail_url,media_url,permalink,timestamp,like_count,comments_count', limit: '9' }))
  ]);

  const serieNovos = dias.map(() => 0);
  ((novosDia && novosDia.data && novosDia.data[0] && novosDia.data[0].values) || []).forEach((v) => {
    const d = String(v.end_time || '').slice(0, 10);
    // end_time marca o fim do dia: o valor pertence ao dia anterior.
    const dia = new Date(new Date(d + 'T00:00:00Z').getTime() - 864e5).toISOString().slice(0, 10);
    const i = dias.indexOf(dia);
    if (i >= 0) serieNovos[i] = num(v.value);
  });

  let seguiram = null, deixaram = null;
  const fu = segueDeixa && segueDeixa.data && segueDeixa.data[0] && segueDeixa.data[0].total_value;
  if (fu && fu.breakdowns && fu.breakdowns[0]) {
    fu.breakdowns[0].results.forEach((r) => {
      const tipo = (r.dimension_values || [])[0];
      if (tipo === 'FOLLOWER') seguiram = num(r.value);
      if (tipo === 'NON_FOLLOWER') deixaram = num(r.value);
    });
  }

  const totalDe = (nome) => {
    const m = ontemIns && ontemIns.data && ontemIns.data.find((x) => x.name === nome);
    return m && m.total_value ? num(m.total_value.value) : null;
  };

  // Por post: alcance e quantas pessoas começaram a seguir a partir dele (a Meta só
  // fornece "follows" para posts do feed e reels; stories e posts antigos podem vir vazios).
  const lista = (midia && midia.data) || [];
  const insPost = await Promise.all(lista.map((m) => talvez(get(m.id + '/insights', { metric: 'reach,follows' }))));
  const valorDe = (ins, nome) => {
    const x = ins && ins.data && ins.data.find((d) => d.name === nome);
    return x ? num((x.values && x.values[0] && x.values[0].value) != null ? x.values[0].value : (x.total_value && x.total_value.value)) : null;
  };
  const posts = lista.map((m, i) => ({
    alcance: valorDe(insPost[i], 'reach'),
    novosSeguidores: valorDe(insPost[i], 'follows'),
    tipo: m.media_product_type === 'REELS' ? 'Reels' : (m.media_type === 'CAROUSEL_ALBUM' ? 'Carrossel' : (m.media_type === 'VIDEO' ? 'Vídeo' : 'Foto')),
    legenda: String(m.caption || '').slice(0, 140),
    data: String(m.timestamp || '').slice(0, 10),
    curtidas: num(m.like_count), comentarios: num(m.comments_count),
    thumb: m.thumbnail_url || m.media_url || null,
    url: m.permalink
  }));

  const somaNovos = serieNovos.reduce((a, b) => a + b, 0);
  return {
    usuario: '@' + perfil.username,
    nome: perfil.name || perfil.username,
    url: 'https://www.instagram.com/' + perfil.username + '/',
    foto: perfil.profile_picture_url || null,
    seguidores: num(perfil.followers_count),
    seguindo: num(perfil.follows_count),
    posts: num(perfil.media_count),
    dias,
    serieNovos,
    novos30: seguiram != null ? seguiram : somaNovos,
    perdidos30: deixaram,
    alcanceOntem: totalDe('reach'),
    visitasPerfilOntem: totalDe('profile_views'),
    ultimosPosts: posts
  };
}

module.exports = {
  id: 'instagram',
  nome: 'Instagram',
  envs: ['INSTAGRAM_ACCESS_TOKEN'],
  isConfigured: () => Boolean(process.env.INSTAGRAM_ACCESS_TOKEN),

  async collect({ registry, hoje }) {
    const contas = (registry.redes && registry.redes.instagram) || [];
    const res = await Promise.allSettled(contas.map((c) => coletarConta(c, hoje)));
    const ok = [], avisos = [];
    res.forEach((r, i) => {
      if (r.status === 'fulfilled') ok.push(r.value);
      else avisos.push('Instagram ' + contas[i].usuario + ': ' + (r.reason && r.reason.message));
    });
    if (!ok.length && avisos.length) throw new Error(avisos[0]);
    return { redes: { instagram: ok }, avisos };
  }
};
