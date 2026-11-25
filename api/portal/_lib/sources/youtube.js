// Fonte: YouTube (seu canal).
// Usa o mesmo cliente OAuth do login (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) e um
// refresh token do dono do canal, gerado uma vez em /api/portal/auth/youtube e guardado
// em YOUTUBE_REFRESH_TOKEN. Escopos: youtube.readonly e yt-analytics.readonly.

const { ultimosDias } = require('../util');

async function accessToken() {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('YouTube token ' + (j.error || r.status));
  return j.access_token;
}

async function get(url, token) {
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('YouTube ' + r.status + ' ' + ((j.error && j.error.message) || ''));
  return j;
}

const num = (v) => Number(v) || 0;

module.exports = {
  id: 'youtube',
  nome: 'YouTube',
  envs: ['YOUTUBE_REFRESH_TOKEN', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  isConfigured: () => Boolean(process.env.YOUTUBE_REFRESH_TOKEN && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),

  async collect({ hoje }) {
    const token = await accessToken();
    const dias = ultimosDias(hoje, 28);

    const ch = await get('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true', token);
    const canal = (ch.items || [])[0];
    if (!canal) throw new Error('YouTube: nenhum canal nesta conta Google');
    const st = canal.statistics || {};

    // Ganhos, perdidos e views por dia (o Analytics costuma ter 2 a 3 dias de atraso).
    const serie = { ganhos: dias.map(() => 0), perdidos: dias.map(() => 0), views: dias.map(() => 0), minutos: dias.map(() => 0) };
    let analyticsOk = true;
    try {
      const rep = await get('https://youtubeanalytics.googleapis.com/v2/reports?' + new URLSearchParams({
        ids: 'channel==MINE', startDate: dias[0], endDate: dias[dias.length - 1],
        metrics: 'subscribersGained,subscribersLost,views,estimatedMinutesWatched', dimensions: 'day', sort: 'day'
      }), token);
      (rep.rows || []).forEach((row) => {
        const i = dias.indexOf(row[0]);
        if (i < 0) return;
        serie.ganhos[i] = num(row[1]); serie.perdidos[i] = num(row[2]);
        serie.views[i] = num(row[3]); serie.minutos[i] = num(row[4]);
      });
    } catch (e) { analyticsOk = false; }

    // Últimos vídeos publicados, com estatísticas.
    let videos = [];
    const uploads = canal.contentDetails && canal.contentDetails.relatedPlaylists && canal.contentDetails.relatedPlaylists.uploads;
    if (uploads) {
      const pl = await get('https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=6&playlistId=' + uploads, token);
      const ids = (pl.items || []).map((i) => i.contentDetails.videoId).filter(Boolean);
      if (ids.length) {
        const vs = await get('https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=' + ids.join(','), token);
        videos = (vs.items || []).map((v) => ({
          titulo: v.snippet.title,
          data: String(v.snippet.publishedAt || '').slice(0, 10),
          views: num(v.statistics.viewCount), likes: num(v.statistics.likeCount), comentarios: num(v.statistics.commentCount),
          thumb: ((v.snippet.thumbnails || {}).medium || (v.snippet.thumbnails || {}).default || {}).url || null,
          url: 'https://www.youtube.com/watch?v=' + v.id
        }));
      }
    }

    const soma = (a) => a.reduce((x, y) => x + y, 0);
    return {
      redes: {
        youtube: {
          canal: canal.snippet.title,
          url: 'https://www.youtube.com/channel/' + canal.id,
          inscritos: num(st.subscriberCount),
          viewsTotal: num(st.viewCount),
          videos: num(st.videoCount),
          dias,
          serie,
          novos28: soma(serie.ganhos), perdidos28: soma(serie.perdidos), views28: soma(serie.views),
          analyticsOk,
          ultimosVideos: videos
        }
      }
    };
  }
};
