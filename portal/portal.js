/* Portal · my online presence
   One page with hash routes:
     #/              overview
     #/revenue       Stripe and ad spend
     #/social        YouTube, Instagram, newsletter
     #/site/<slug>   traffic, conversions, ads and creatives for one site
   Data comes from /api/portal/data (login required). Without a session it shows the login screen.
   In a local preview without the API it falls back to /portal/data-exemplo.js. */

(function () {
  "use strict";

  var D = null;
  var app = document.getElementById("app");
  var nav = document.getElementById("nav");
  var sidefoot = document.getElementById("sidefoot");

  // ---------- Formatting ----------
  var LOCALE = "en-US";
  var nf = new Intl.NumberFormat(LOCALE);
  // Currency formatters are rebuilt in start() with the currency the API reports.
  var brl = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "USD" });
  var brl0 = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  var pct = function (v) { return v.toFixed(1) + "%"; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
  var MESES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function diaMes(iso) { var p = String(iso).split("-"); return MESES[+p[1] - 1] + " " + (+p[2]); }
  function imgTag(url) { return url ? '<img class="cover" src="' + esc(url) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">' : ""; }
  // Groups a daily series into weeks (starting Monday) or months.
  function agrupar(dias, vals, modo, n) {
    var chaves = [], soma = {};
    dias.forEach(function (d, i) {
      var k = d;
      if (modo === "semana") { var dt = new Date(d + "T12:00:00Z"); var w = (dt.getUTCDay() + 6) % 7; dt.setUTCDate(dt.getUTCDate() - w); k = dt.toISOString().slice(0, 10); }
      if (modo === "mes") k = d.slice(0, 7);
      if (!(k in soma)) { soma[k] = 0; chaves.push(k); }
      soma[k] += vals[i] || 0;
    });
    chaves = chaves.slice(-n);
    var MES = MESES;
    return {
      valores: chaves.map(function (k) { return Math.round(soma[k] * 100) / 100; }),
      rotulos: chaves.map(function (k) { return modo === "mes" ? MES[+k.slice(5, 7) - 1] + "/" + k.slice(2, 4) : diaMes(k); })
    };
  }
  // Revenue chart with day, week and month views.
  var MODOS = { dia: ["Day", 30], semana: ["Week", 12], mes: ["Month", 6] };
  function receitaChart(modo, h) {
    var f = D.faturamento;
    var dias = f.dias180 && f.dias180.length ? f.dias180 : null;
    var vals = dias ? f.diario180 : f.diario;
    if (!dias) { modo = "dia"; }
    var g = dias ? agrupar(dias, vals, modo, MODOS[modo][1]) : { valores: vals, rotulos: null };
    return bars(g.valores, { h: h || 130, tom: "green", label: "Revenue per " + MODOS[modo][0].toLowerCase(), fmt: brl.format, rotulos: g.rotulos, from: "30 days ago", to: "yesterday" });
  }
  function receitaWidget(id, h) {
    return '<div class="seg-wrap"><div class="seg" role="tablist" data-alvo="' + id + '" data-h="' + (h || 130) + '">' + Object.keys(MODOS).map(function (m) {
      return '<button type="button" role="tab" data-modo="' + m + '" aria-selected="' + (m === "dia") + '">' + MODOS[m][0] + "</button>";
    }).join("") + '</div><div id="' + id + '">' + receitaChart("dia", h) + "</div></div>";
  }
  function datasDe(dias) { return (dias || []).map(diaMes); }

  function dataCurta(iso) { var d = new Date(iso + "T12:00:00"); return MESES[d.getMonth()] + " " + d.getDate(); }
  function diasDesde(iso) { var ms = new Date(D.atualizadoEm) - new Date(iso + "T00:00:00"); return Math.max(1, Math.floor(ms / 864e5)); }

  function delta(now, before) {
    if (!before && !now) return '<span class="delta flat">no change</span>';
    if (!before) return '<span class="delta up">novo</span>';
    var p = Math.round(((now - before) / before) * 100);
    if (p === 0) return '<span class="delta flat">0%</span>';
    return '<span class="delta ' + (p > 0 ? "up" : "down") + '">' + (p > 0 ? "↑ +" : "↓ ") + p + "% vs. day before</span>";
  }

  // ---------- SVG charts ----------
  function spark(values, w, h) {
    w = w || 120; h = h || 32;
    if (!values || values.length < 2) return "";
    var max = Math.max.apply(null, values) || 1, n = values.length - 1;
    var pts = values.map(function (v, i) { return [(i / n) * w, h - 3 - (v / max) * (h - 6)]; });
    var line = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
    var last = pts[pts.length - 1];
    var meio = Math.floor(values.length / 2);
    var med = function (a) { return a.reduce(function (x, y) { return x + y; }, 0) / Math.max(1, a.length); };
    var tend = med(values.slice(meio)) >= med(values.slice(0, meio)) ? "up" : "down";
    return '<svg class="spark ' + tend + '" preserveAspectRatio="none" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '" aria-hidden="true">' +
      '<path class="area" d="' + line + " L" + w + " " + h + " L0 " + h + ' Z"/>' +
      '<path class="line" d="' + line + '"/>' +
      '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="2.5"/></svg>';
  }

  function bars(values, opts) {
    opts = opts || {};
    if (!values || !values.length) return '<p class="empty mono">No data for this period</p>';
    var w = 720, h = opts.h || 180, pad = 18, n = values.length;
    var max = Math.max.apply(null, values) || 1;
    var bw = (w - pad) / n;
    var out = '<svg class="bars' + (opts.tom ? " tom-" + opts.tom : "") + '" viewBox="0 0 ' + w + " " + (h + 18) + '" role="img" aria-label="' + esc(opts.label || "") + '">';
    [0.5, 1].forEach(function (f) { var y = h - f * (h - 8); out += '<line x1="0" x2="' + w + '" y1="' + y + '" y2="' + y + '"/>'; });
    values.forEach(function (v, i) {
      var bh = Math.max(1, (v / max) * (h - 8));
      out += '<rect class="' + (i === n - 1 ? "last" : "") + '" x="' + (i * bw + 1).toFixed(1) + '" y="' + (h - bh).toFixed(1) +
        '" width="' + Math.max(1, bw - 3).toFixed(1) + '" height="' + bh.toFixed(1) + '"><title>' + (opts.fmt ? opts.fmt(v) : v) + "</title></rect>";
    });
    if (opts.rotulos && opts.rotulos.length === n) {
      var passo = Math.max(1, Math.ceil(n / 7));
      opts.rotulos.forEach(function (r, i) {
        if (i % passo !== 0 && i !== n - 1) return;
        if (i !== n - 1 && n - 1 - i < passo) return;
        out += '<text x="' + (i * bw + bw / 2).toFixed(1) + '" y="' + (h + 14) + '" text-anchor="middle">' + esc(r) + "</text>";
      });
    } else {
      out += '<text x="0" y="' + (h + 14) + '">' + esc(opts.from || "") + '</text><text x="' + w + '" y="' + (h + 14) + '" text-anchor="end">' + esc(opts.to || "") + "</text>";
    }
    return out + "</svg>";
  }

  function barList(rows, fmt) {
    fmt = fmt || nf.format;
    if (!rows || !rows.length) return '<p class="empty mono">No data</p>';
    var max = Math.max.apply(null, rows.map(function (r) { return r[1]; })) || 1;
    return rows.map(function (r, i) {
      return '<div class="bar-row c' + (i % 5) + '"><span class="label">' + esc(r[0]) + '</span><span class="val">' + fmt(r[1]) +
        '</span><div class="track"><div class="fill" style="width:' + (r[1] / max) * 100 + '%"></div></div></div>';
    }).join("");
  }

  // ---------- Shared pieces ----------
  function head(title, sub, meta) {
    return (D.demo ? '<div class="demo-flag mono">Example data</div>' : "") +
      '<header class="head reveal"><div><h1>' + title + "</h1>" + (sub ? '<p class="sub">' + sub + "</p>" : "") + "</div>" +
      '<div class="meta mono">' + (meta || "") + "</div></header>" + avisoFontes();
  }
  var NOMES_FONTE = { stripe: "Stripe", ga4: "GA4", meta: "Meta Ads", youtube: "YouTube", instagram: "Instagram", kit: "Kit" };
  function avisoFontes() {
    if (D.demo || !D.fontes) return "";
    var off = Object.keys(D.fontes).filter(function (k) { return !D.fontes[k]; });
    var err = Object.keys(D.erros || {});
    var avisos = (D.avisos || []).map(function (t) { return '<span class="pill bad" title="' + esc(t) + '">' + esc(t.split(":")[0]) + " error</span>"; });
    if (!off.length && !avisos.length) return "";
    return '<div class="fontes-off mono reveal">' + avisos.join(" ") + " " + off.map(function (k) {
      return '<span class="pill' + (err.indexOf(k) >= 0 ? " bad" : "") + '">' + (NOMES_FONTE[k] || k) + (err.indexOf(k) >= 0 ? " error" : " not connected") + "</span>";
    }).join(" ") + "</div>";
  }

  function section(idx, title, right, body) {
    return '<section class="section reveal"><div class="section-head"><h2><span class="idx">' + idx + "</span>" + title +
      '</h2><span class="mono">' + (right || "") + "</span></div>" + body + "</section>";
  }
  function kpi(label, value, extra) {
    return '<div class="kpi reveal"><div class="mono">' + label + '</div><div class="num">' + value + "</div>" + (extra || "") + "</div>";
  }
  // Organic vs ads (GA4 sessions). Sites without the data show "–".
  function canal(s, tipo) { return (s.visitas && s.visitas[tipo]) || null; }
  function celCanal(s, tipo) {
    var c = canal(s, tipo);
    if (!c) return '<span class="muted">–</span>';
    return nf.format(c.ontem) + "<br>" + delta(c.ontem, c.anterior).replace(" vs. day before", "");
  }
  function tabelaPaginasAds(lista, compacta) {
    if (!lista || !lista.length) return '<p class="empty mono">Nenhuma visita vinda from ads nos last 7 days</p>';
    // Compact version inside cards: a stacked list, no columns that overflow.
    if (compacta) return '<ul class="plist">' + lista.map(function (p) {
      return '<li><div class="plist-main"><span class="path">' + esc(p.pagina) + '</span><small>' + (p.campanha ? esc(p.campanha) : "no UTM") + (p.origem ? " · " + esc(p.origem) : "") + "</small></div>" +
        '<div class="plist-num"><strong>' + nf.format(p.sessoes) + '</strong><small>' + (p.conversoes ? nf.format(p.conversoes) + " conv." : "sessions") + "</small></div></li>";
    }).join("") + "</ul>";
    return '<table class="table pages-ads"><thead><tr><th>Page</th><th>Campaign</th>' + (compacta ? "" : '<th class="hide-sm">Source</th>') +
      '<th class="r">Sessions</th><th class="r">Conversions</th></tr></thead><tbody>' +
      lista.map(function (p) {
        return '<tr><td class="mono pg">' + esc(p.pagina) + "</td><td>" + (p.campanha ? esc(p.campanha) : '<span class="muted">no UTM</span>') + "</td>" +
          (compacta ? "" : '<td class="muted hide-sm">' + esc(p.origem) + "</td>") +
          '<td class="r numcell">' + nf.format(p.sessoes) + '</td><td class="r numcell">' + nf.format(p.conversoes) + "</td></tr>";
      }).join("") + "</tbody></table>";
  }

  function duasSeries(org, ads) {
    var max = Math.max.apply(null, org.map(function (v, i) { return v + ads[i]; }).concat([1]));
    var cols = org.map(function (v, i) {
      var a = ads[i];
      return '<div class="stk" title="' + nf.format(v) + " organic · " + nf.format(a) + ' from ads"><i class="a" style="height:' + (a / max * 100) + '%"></i><i class="o" style="height:' + (v / max * 100) + '%"></i></div>';
    }).join("");
    return '<div class="stack">' + cols + '</div><div class="stack-leg mono"><span><i class="o"></i>Organic ' + nf.format(sum(org)) + '</span><span><i class="a"></i>Ads ' + nf.format(sum(ads)) + '</span><span class="muted">14 days ago → yesterday</span></div>';
  }

  function totais() {
    var vOntem = sum(D.sites.map(function (s) { return s.visitas.ontem; }));
    var vAnt = sum(D.sites.map(function (s) { return s.visitas.anterior; }));
    var receita = sum(D.faturamento.diario);
    var ativos = D.sites.filter(function (s) { return s.ads.ativo; }).length;
    var org = D.sites.map(function (s) { return canal(s, "organico"); }).filter(Boolean);
    var ads = D.sites.map(function (s) { return canal(s, "ads"); }).filter(Boolean);
    return { vOntem: vOntem, vAnt: vAnt, receita: receita, ativos: ativos,
      orgOntem: org.length ? sum(org.map(function (c) { return c.ontem; })) : null,
      adsOntem: ads.length ? sum(ads.map(function (c) { return c.ontem; })) : null };
  }

  // ---------- Screens ----------
  function paisesAgregados() {
    var soma = {};
    D.sites.forEach(function (s) { (s.paises || []).forEach(function (p) { soma[p[0]] = (soma[p[0]] || 0) + p[1]; }); });
    return Object.keys(soma).map(function (k) { return [k, soma[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
  }

  function cardSite(s, si) {
    var c = s.conversao, org = canal(s, "organico"), ad = canal(s, "ads"), pa = s.paginasAds || [];
    var m = function (rot, val, extra) { return '<div class="sm"><span class="mono">' + rot + '</span><strong>' + val + "</strong>" + (extra || "") + "</div>"; };
    return '<article class="scard reveal" data-href="#/site/' + s.slug + '" style="--c:var(--s' + (si % 5) + ')">' +
      '<header><div><span class="sw"></span><b>' + esc(s.nome) + '</b><small>' + esc(s.papel) + "</small></div>" +
      (s.ads.ativo ? '<span class="pill live">Ads</span>' : "") + "</header>" +
      '<div class="scard-spark"><span class="mono">Visits, 14 days</span>' + spark(s.visitas.serie, 300, 46) + "</div>" +
      '<div class="smetrics">' +
      m("Visits yesterday", nf.format(s.visitas.ontem), delta(s.visitas.ontem, s.visitas.anterior).replace(" vs. day before", "")) +
      m("Revenue 30d", s.receita30d ? brl0.format(s.receita30d) : "–") +
      m("Organic", org ? nf.format(org.ontem) : "–", '<span class="bar-mini"><i style="width:' + (org && (org.ontem + (ad ? ad.ontem : 0)) ? Math.round(org.ontem / (org.ontem + ad.ontem) * 100) : 0) + '%"></i></span>') +
      m("Ads", ad ? nf.format(ad.ontem) : "–", '<span class="bar-mini ads"><i style="width:' + (ad && (org.ontem + ad.ontem) ? Math.round(ad.ontem / (org.ontem + ad.ontem) * 100) : 0) + '%"></i></span>') +
      "</div>" +
      (c ? '<p class="sfoot mono">' + nf.format(c.ontem) + " " + esc(c.rotulo).toLowerCase() + " yesterday</p>" : "") +
      (pa.length ? '<details class="sdrop"><summary class="mono">' + pa.length + " page(s) getting ad traffic</summary>" + tabelaPaginasAds(pa, true) + "</details>" : "") +
      "</article>";
  }

  function overview() {
    var t = totais(), f = D.faturamento;
    var temGasto = f.gastoAds30d != null;
    var rAds = f.receitaAds30d != null ? f.receitaAds30d : null;
    var rOrg = f.receitaOrganica30d != null ? f.receitaOrganica30d : t.receita;
    var roi = temGasto && f.gastoAds30d > 0 && rAds != null ? (rAds / f.gastoAds30d).toFixed(1) + "×" : "–";
    var html = head("Your online <em>presence</em>", "Every site, ad and sale in one place.",
      "Period: " + esc(D.periodo) + "<br>Updated " + new Date(D.atualizadoEm).toLocaleString(LOCALE, { dateStyle: "short", timeStyle: "short" }));

    html += '<div class="kpis k5">' +
      kpi("Visits yesterday", nf.format(t.vOntem), t.orgOntem != null ? '<span class="delta flat">' + nf.format(t.orgOntem) + " organic · " + nf.format(t.adsOntem) + " from ads</span>" : delta(t.vOntem, t.vAnt)) +
      kpi("Organic revenue", brl0.format(rOrg), '<span class="delta flat">subscriptions and non-ad sales, 30d</span>') +
      kpi("Revenue from ads", rAds != null ? brl0.format(rAds) : "–", '<span class="delta flat">advertised products, 30d</span>') +
      kpi("Ad spend", temGasto ? brl0.format(f.gastoAds30d) : "–", '<span class="delta flat">Meta, 30 days</span>') +
      kpi("Return on ad spend", roi, '<span class="delta flat">revenue from ads ÷ spend</span>') +
      "</div>";

    html += section("01", "Sites", D.sites.length + " sites · click to open", '<div class="scards">' + D.sites.map(cardSite).join("") + "</div>");
    html += section("02", "Social", '<a href="#/social">see social →</a>', cartoesRedes());

    var camps = [];
    D.sites.forEach(function (s) { s.ads.campanhas.forEach(function (c) { camps.push([s, c]); }); });
    var rodando = camps.filter(function (p) { return p[1].status === "ativa"; }).length;
    var campRows = camps.map(function (p) {
      var s = p[0], c = p[1];
      return '<tr class="link" data-href="#/site/' + s.slug + '"><td><div class="site-name">' + esc(c.nome) + "<small>" + esc(s.nome) + " · since " + dataCurta(c.desde) + "</small></div></td>" +
        '<td class="r numcell">' + brl.format(c.gasto) + '</td><td class="r numcell hide-sm">' + nf.format(c.resultados) + " " + esc(c.rotuloResultado) +
        '</td><td class="r numcell hide-sm">' + (c.resultados ? brl.format(c.gasto / c.resultados) : "–") + '</td><td class="r">' + statusPill(c.status) + "</td></tr>";
    }).join("");
    html += section("03", "Campaigns", "Meta Ads · " + rodando + " running",
      camps.length ? '<table class="table"><thead><tr><th>Campaign</th><th class="r">Spend 30d</th><th class="r hide-sm">Results</th><th class="r hide-sm">Cost per result</th><th class="r">Status</th></tr></thead><tbody>' + campRows + "</tbody></table>"
        : '<div class="ads-off"><span class="big">No campaigns.</span></div>');

    html += '<div class="grid-2">' +
      section("04", "Revenue", '<a href="#/revenue">see revenue →</a>', receitaWidget("rec-ov", 120)) +
      section("05", "Where people come from", "countries, 7 days, all sites", '<div class="boxed">' + barList(paisesAgregados()) + "</div>") + "</div>";
    return html;
  }

  function statusPill(s) {
    if (s === "ativa") return '<span class="pill live">Active</span>';
    if (s === "pausada") return '<span class="pill">Paused</span>';
    if (s === "sem_entrega") return '<span class="pill bad">Active, not delivering</span>';
    return '<span class="pill">' + esc(s) + "</span>";
  }

  // ---------- Social ----------
  var nk = new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 });
  function redes() { return D.redes || { youtube: null, instagram: [] }; }

  function cartaoRede(nome, conta, total, rotulo, novos, perdidos, periodo, href, cor) {
    var saldo = novos != null && perdidos != null ? novos - perdidos : null;
    return '<a class="rede reveal r-' + cor + '" href="' + href + '"><div class="rede-top"><span class="mono">' + nome + '</span><span class="muted">' + esc(conta) + "</span></div>" +
      '<div class="num">' + (total != null ? nf.format(total) : "–") + ' <small>' + rotulo + "</small></div>" +
      '<div class="rede-mov mono"><span class="delta up">↑ ' + nf.format(novos || 0) + "</span>" +
      (perdidos != null ? ' <span class="delta down">↓ ' + nf.format(perdidos) + "</span>" : "") +
      (saldo != null ? ' <span class="delta ' + (saldo >= 0 ? "up" : "down") + '">net ' + (saldo >= 0 ? "+" : "") + nf.format(saldo) + "</span>" : "") +
      ' <span class="muted">' + periodo + "</span></div></a>";
  }
  function semConexao(nome, acao) {
    return '<div class="rede off reveal"><div class="rede-top"><span class="mono">' + nome + '</span></div><p class="muted">Not connected.</p>' + (acao || "") + "</div>";
  }
  function cartoesRedes() {
    var r = redes(), out = "";
    var yt = r.youtube;
    out += yt ? cartaoRede("YouTube", yt.canal, yt.inscritos, "subscribers", yt.novos28, yt.perdidos28, "28 days", "#/social/youtube", "yt")
      : semConexao("YouTube", '<a class="mini-btn" href="/api/portal/auth/youtube">Connect channel</a>');
    var igs = r.instagram || [];
    out += igs.length ? igs.map(function (ig) { return cartaoRede("Instagram", ig.usuario, ig.seguidores, "followers", ig.novos30, ig.perdidos30, "30 days", "#/social/instagram", "ig"); }).join("")
      : semConexao("Instagram");
    var nl = r.newsletter;
    out += nl ? cartaoRede("Newsletter", esc(nl.nome), nl.inscritos, "subscribers", nl.novos30d, null, "30 days", "#/social/newsletter", "nl") : "";
    out += '<div class="rede off reveal r-li"><div class="rede-top"><span class="mono">LinkedIn</span></div><p class="muted">Coming soon, from the weekly export.</p></div>';
    return '<div class="redes">' + out + "</div>";
  }

  function paginaRedes(aba) {
    var r = redes();
    var yt = r.youtube, igs = r.instagram || [];
    var nl = r.newsletter;
    aba = ["instagram", "newsletter", "linkedin"].indexOf(aba) >= 0 ? aba : "youtube";
    var html = head("Social", "Followers, subscribers and what you published.", "YouTube · Instagram · Newsletter");

    var tab = function (id, nome, valor, rotulo) {
      return '<a class="rtab t-' + id + '" href="#/social/' + id + '"' + (aba === id ? ' aria-current="page"' : "") + '>' +
        '<span class="rtab-top"><span class="rtab-sw"></span>' + nome + '</span>' +
        '<span class="rtab-num">' + (valor != null ? nf.format(valor) : "–") + '</span><span class="rtab-lbl mono">' + rotulo + "</span></a>";
    };
    html += '<nav class="rtabs reveal" aria-label="Social">' +
      tab("youtube", "YouTube", yt ? yt.inscritos : null, yt ? "subscribers" : "not connected") +
      tab("instagram", "Instagram", igs.length ? sum(igs.map(function (i) { return i.seguidores; })) : null, igs.length ? "followers" : "not connected") +
      tab("newsletter", nl ? esc(nl.nome) : "Newsletter", nl ? nl.inscritos : null, nl ? "subscribers" : "not connected") +
      tab("linkedin", "LinkedIn", null, "coming soon") + "</nav>";

    if (aba === "newsletter") {
      if (!nl) return html + '<div class="ads-off reveal"><span class="big">Not connected.</span><span>Add your Kit key to KIT_API_KEY and set social.newsletter in sites.js.</span></div>';
      html += '<div class="kpis">' +
        kpi("Subscribers", nf.format(nl.inscritos), '<span class="delta flat">active in Kit</span>') +
        kpi("New, 30 days", "+" + nf.format(nl.novos30d), delta(nl.novos30d, nl.novosAnterior30d).replace("vs. day before", "vs. previous 30 days")) +
        kpi("New, 7 days", "+" + nf.format(nl.novos7d), '<span class="delta flat">last week</span>') +
        kpi("Last send", nl.envios.length && nl.envios[0].abertura != null ? pct(nl.envios[0].abertura) : "–", '<span class="delta flat">open rate</span>') + "</div>";
      html += section("01", "Latest sends", "Kit", nl.envios.length ? '<table class="table"><thead><tr><th>Subject</th><th class="hide-sm">Date</th><th class="r hide-sm">Sent</th><th class="r">Opens</th><th class="r">Clicks</th><th class="r hide-sm">Unsubs</th></tr></thead><tbody>' +
        nl.envios.map(function (e) {
          return '<tr><td><span class="site-name">' + esc(e.assunto) + '</span></td><td class="mono muted hide-sm">' + dataCurta(e.data) + '</td><td class="r numcell hide-sm">' + (e.enviados != null ? nf.format(e.enviados) : "–") +
            '</td><td class="r numcell">' + (e.abertura != null ? pct(e.abertura) : "–") + '</td><td class="r numcell">' + (e.cliques != null ? pct(e.cliques) : "–") + '</td><td class="r numcell hide-sm">' + (e.descadastros != null ? nf.format(e.descadastros) : "–") + "</td></tr>";
        }).join("") + "</tbody></table>" : '<p class="empty mono">No sends found</p>');
      return html;
    }

    if (aba === "youtube") {
      if (!yt) return html + '<div class="ads-off reveal"><span class="big">Not connected.</span><span>Let the portal read your channel (read only). <a class="mini-btn" href="/api/portal/auth/youtube">Connect channel</a></span></div>';
      html += '<div class="kpis">' +
        kpi("Subscribers", nf.format(yt.inscritos), '<span class="delta flat">' + esc(yt.canal) + "</span>") +
        kpi("New, 28 days", "+" + nf.format(yt.novos28), '<span class="delta down">↓ ' + nf.format(yt.perdidos28) + " lost</span>") +
        kpi("Views, 28 days", nk.format(yt.views28), '<span class="delta flat">' + nk.format(yt.viewsTotal) + " total</span>") +
        kpi("Videos", nf.format(yt.videos), '<a class="delta flat" href="' + esc(yt.url) + '" target="_blank" rel="noopener">open channel ↗</a>') + "</div>";
      html += section("01", "Subscribers gained per day", yt.analyticsOk ? "28 days · YouTube updates with a 2 to 3 day delay" : "Analytics unavailable",
        bars(yt.serie.ganhos, { h: 110, tom: "yt", rotulos: datasDe(yt.dias), label: "Subscribers gained per day", fmt: function (v) { return "+" + v; }, from: "28 days ago", to: "yesterday" }));
      html += section("02", "Latest videos", "", (yt.ultimosVideos || []).length ? '<table class="table"><thead><tr><th>Video</th><th class="hide-sm">Published</th><th class="r">Views</th><th class="r hide-sm">Likes</th><th class="r hide-sm">Comments</th></tr></thead><tbody>' +
        yt.ultimosVideos.map(function (v) {
          return '<tr class="link" data-href="' + esc(v.url) + '"><td><div class="vid">' + (v.thumb ? '<img src="' + esc(v.thumb) + '" alt="" loading="lazy">' : '<span class="vid-ph"></span>') + '<span class="site-name">' + esc(v.titulo) + "</span></div></td>" +
            '<td class="mono muted hide-sm">' + dataCurta(v.data) + '</td><td class="r numcell">' + nf.format(v.views) + '</td><td class="r numcell hide-sm">' + nf.format(v.likes) + '</td><td class="r numcell hide-sm">' + nf.format(v.comentarios) + "</td></tr>";
        }).join("") + "</tbody></table>" : '<p class="empty mono">No videos</p>');
      return html;
    }

    if (aba === "linkedin") {
      return html + '<div class="ads-off reveal"><span class="big">Coming soon.</span><span>LinkedIn does not offer personal profile stats through its API. The plan is to read the weekly creator analytics export.</span></div>';
    }

    if (!igs.length) return html + '<div class="ads-off reveal"><span class="big">Not connected.</span><span>Add a read-only Instagram token to INSTAGRAM_ACCESS_TOKEN.</span></div>';
    igs.forEach(function (ig, n) {
      html += '<div class="kpis">' +
        kpi("Followers", nf.format(ig.seguidores), '<a class="delta flat" href="' + esc(ig.url) + '" target="_blank" rel="noopener">' + esc(ig.usuario) + " ↗</a>") +
        kpi("New, 30 days", "+" + nf.format(ig.novos30 || 0), ig.perdidos30 != null ? '<span class="delta down">↓ ' + nf.format(ig.perdidos30) + " unfollowed</span>" : '<span class="delta flat">unfollows unavailable</span>') +
        kpi("Reach yesterday", ig.alcanceOntem != null ? nf.format(ig.alcanceOntem) : "–", '<span class="delta flat">accounts reached</span>') +
        kpi("Profile visits", ig.visitasPerfilOntem != null ? nf.format(ig.visitasPerfilOntem) : "–", '<span class="delta flat">yesterday</span>') + "</div>";
      html += section(String(n * 2 + 1).padStart(2, "0"), "New followers per day · " + esc(ig.usuario), "30 days",
        bars(ig.serieNovos, { h: 110, tom: "ig", rotulos: datasDe(ig.dias), label: "New followers per day", fmt: function (v) { return "+" + v; }, from: "30 days ago", to: "yesterday" }));
      html += section(String(n * 2 + 2).padStart(2, "0"), "Latest posts", nf.format(ig.posts) + " total",
        (ig.ultimosPosts || []).length ? '<div class="creatives">' + ig.ultimosPosts.map(function (p, i) {
          return '<a class="creative" href="' + esc(p.url) + '" target="_blank" rel="noopener"><div class="thumb" style="--h:' + (300 + i * 23) % 360 + "" + '">' + imgTag(p.thumb) +
            '<span class="fmt mono">' + esc(p.tipo) + '</span><span class="headline">' + (p.thumb ? "" : esc(p.legenda.slice(0, 60))) + "</span></div>" +
            '<div class="body"><p>' + esc(p.legenda) + '</p><div class="cstats"><div><span>' + nf.format(p.curtidas) + '</span><span class="mono">likes</span></div><div><span>' +
            (p.novosSeguidores != null ? "+" + nf.format(p.novosSeguidores) : "–") + '</span><span class="mono">followers</span></div><div><span>' +
            (p.alcance != null ? nk.format(p.alcance) : nf.format(p.comentarios)) + '</span><span class="mono">' + (p.alcance != null ? "reach" : "comments") + '</span></div></div><p class="mono muted cdate">' + dataCurta(p.data) + '</p></div></a>';
        }).join("") + "</div>" : '<p class="empty mono">No posts</p>');
    });
    return html;
  }

  function faturamento() {
    var f = D.faturamento, total = f.receita30d != null ? f.receita30d : sum(f.diario);
    var ant = f.receitaAnterior30d;
    var orgAnt = ant != null && f.receitaAdsAnterior30d != null ? ant - f.receitaAdsAnterior30d : null;
    var cmp = function (a, b) { return b != null ? delta(a, b).replace("vs. day before", "vs. previous 30 days") : ""; };
    var html = head("Revenue", "Everything that came in through Stripe, and what it cost to bring in.", "Stripe<br>Net of refunds");
    html += '<div class="ledger section reveal"><div>' +
      '<div class="mono muted">Last 30 days</div><div class="big-figure">' + brl0.format(Math.round(total)) + "</div>" +
      (f.hoje ? '<div class="mono" style="margin:.2rem 0 .4rem">Today so far: <strong>' + brl.format(f.hoje.valor) + "</strong> · " + nf.format(f.hoje.qtd) + (f.hoje.qtd === 1 ? " sale" : " sales") + "</div>" : "") +
      (ant != null ? '<div style="margin-top:.4rem">' + cmp(total, ant) + ' <span class="mono muted">before: ' + brl0.format(ant) + "</span></div>" : "") +
      '<div style="margin-top:1.6rem">' + receitaWidget("rec-fat", 150) + "</div></div>" +
      "<div><div class=\"mono muted\" style=\"margin-bottom:.4rem\">By product, 30 days</div>" + barList(f.porProduto.map(function (p) { return [p.nome + " · " + p.qtd + "×", p.valor]; }), brl.format) + "</div></div>";

    var roiF = f.gastoAds30d > 0 && f.receitaAds30d != null ? f.receitaAds30d / f.gastoAds30d : null;
    var roiTxt = roiF == null ? "–" : roiF.toFixed(1) + "×";
    var roiNota = roiF == null ? "no ad spend" : (roiF >= 1 ? "profit of " + brl0.format(f.receitaAds30d - f.gastoAds30d) : "loss of " + brl0.format(f.gastoAds30d - f.receitaAds30d));
    html += '<div class="kpis k5">' +
      kpi("Organic revenue", f.receitaOrganica30d != null ? brl0.format(f.receitaOrganica30d) : "–", cmp(f.receitaOrganica30d || 0, orgAnt)) +
      kpi("Revenue from ads", f.receitaAds30d != null ? brl0.format(f.receitaAds30d) : "–", cmp(f.receitaAds30d || 0, f.receitaAdsAnterior30d)) +
      kpi("ROI", roiTxt, '<span class="delta ' + (roiF == null ? "flat" : roiF >= 1 ? "up" : "down") + '">' + roiNota + "</span>") +
      kpi("Ad spend", f.gastoAds30d != null ? brl.format(f.gastoAds30d) : "–", '<span class="delta flat">Meta, 30 days</span>') +
      kpi("Pending in Stripe", brl.format(f.aCaminho), '<span class="delta flat">paid sales not yet available' + (f.disponivel != null ? ", available " + brl.format(f.disponivel) : "") + "</span>") +
      "</div>";
    html += '<p class="mono muted" style="margin:-2rem 0 3rem">Refunds 30d: ' + brl.format(f.reembolsos30d) + " · Failed charges: " + nf.format(f.falhas30d) + "</p>";
    html += roiCampanhas(f);
    html += investidoMeta(f);

    var outras = Object.keys(f.outrasMoedas || {});
    if (outras.length) html += '<p class="mono muted" style="margin:-2rem 0 3rem">Not in the total: ' + outras.map(function (m) {
      return new Intl.NumberFormat(LOCALE, { style: "currency", currency: m.toUpperCase() }).format(f.outrasMoedas[m]);
    }).join(" · ") + "</p>";
    (f.apps || []).forEach(function (a) {
      html += section("RC", "App subscriptions · " + esc(a.nome), "RevenueCat", '<div class="kpis k5">' +
        kpi("MRR", a.mrr != null ? brl0.format(a.mrr) : "–", '<span class="delta flat">monthly recurring</span>') +
        kpi("Revenue", a.receita28d != null ? brl0.format(a.receita28d) : "–", '<span class="delta flat">last 28 days</span>') +
        kpi("Active subscriptions", a.assinaturas != null ? nf.format(a.assinaturas) : "–", "") +
        kpi("Active trials", a.trials != null ? nf.format(a.trials) : "–", "") +
        kpi("New customers", a.novos28d != null ? nf.format(a.novos28d) : "–", '<span class="delta flat">last 28 days</span>') + "</div>");
    });
    var CLS_ORIG = { ads: "bad", organico: "ok", direto: "", recorrente: "", sem: "" };
    var rows = f.recentes.map(function (r) {
      var cls = r.status === "paid" ? "ok" : (r.status === "failed" ? "bad" : "");
      var vf = r.moeda && r.moeda !== (D.faturamento.moeda || "").toLowerCase() ? new Intl.NumberFormat(LOCALE, { style: "currency", currency: r.moeda.toUpperCase() }).format(r.valor) : brl.format(r.valor);
      var dt = r.hoje ? "Today" : (/^\d{4}-\d{2}-\d{2}$/.test(r.data) ? dataCurta(r.data) : r.data);
      var o = r.origem || { tipo: "sem", rotulo: "Not tracked" };
      return '<tr data-prod="' + esc(r.produto) + '"><td class="mono muted">' + esc(dt) + "</td><td>" + esc(r.produto) +
        '</td><td><span class="pill ' + (CLS_ORIG[o.tipo] || "") + '">' + esc(o.rotulo) + "</span>" + (o.campanha ? '<small class="mono muted" style="display:block;margin-top:.3rem">' + esc(o.campanha) + "</small>" : "") +
        '</td><td class="r numcell">' + vf + '</td><td class="r"><span class="pill ' + cls + '">' + esc(r.status) + "</span></td></tr>";
    }).join("");
    var prods = [];
    f.recentes.forEach(function (r) { if (prods.indexOf(r.produto) < 0) prods.push(r.produto); });
    var filtro = '<select class="movfiltro" onchange="window.__filtraMov(this.value)"><option value="">All products</option>' +
      prods.map(function (p) { return "<option>" + esc(p) + "</option>"; }).join("") + "</select>";
    html += section("01", "Recent activity", filtro, '<table class="table" id="movs"><thead><tr><th>Date</th><th>Product</th><th>Source</th><th class="r">Amount</th><th class="r">Status</th></tr></thead><tbody>' + rows + "</tbody></table>");
    return html;
  }

  window.__filtraMov = function (v) {
    document.querySelectorAll("#movs tbody tr").forEach(function (tr) { tr.style.display = !v || tr.getAttribute("data-prod") === v ? "" : "none"; });
  };

  // ROI per campaign. Tracked revenue: sales whose origin carries the campaign name.
  // Products not flagged fromAds only count sales that came from ads (ad sales without a campaign
  // name are split across the product's campaigns by spend). Untracked products flagged fromAds:
  // the product's revenue is split across its campaigns by spend (estimated).
  function roiCampanhas(f) {
    var chave = function (t) { return String(t || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30); };
    var linhas = [];
    D.sites.forEach(function (s) {
      (s.ads.campanhas || []).forEach(function (c) {
        if (!(c.gasto > 0) && c.status !== "ativa" && c.status !== "sem_entrega" && c.status !== "in review") return;
        var n = c.nome.toLowerCase();
        var l = (s.landings || []).find(function (x) { return (x.campanhas || []).some(function (t) { return n.indexOf(String(t).toLowerCase()) >= 0; }); });
        linhas.push({ nome: c.nome, gasto: c.gasto, produto: l && l.produto ? l.produto : null, k: chave(c.nome) });
      });
    });
    if (!linhas.length) return "";
    linhas.forEach(function (x) {
      var vendas = f.recentes.filter(function (r) { return r.status === "paid" && r.origem && r.origem.tipo === "ads" && r.origem.campanha && x.k && chave(r.origem.campanha).indexOf(x.k.slice(0, 20)) === 0; });
      if (vendas.length) { x.receita = vendas.reduce(function (a, r) { return a + r.valor; }, 0); x.base = "tracked"; x.qtd = vendas.length; }
    });
    linhas.forEach(function (x) {
      if (x.base || !x.produto) return;
      var prodX = (f.porProduto || []).find(function (p) { return p.nome === x.produto; });
      if (prodX && prodX.viaAnuncios) return;
      var usadas = linhas.filter(function (y) { return y.base === "tracked"; }).map(function (y) { return y.k.slice(0, 20); });
      var soltas = f.recentes.filter(function (r) {
        return r.status === "paid" && r.produto === x.produto && r.origem && r.origem.tipo === "ads" &&
          !(r.origem.campanha && usadas.some(function (u) { return u && chave(r.origem.campanha).indexOf(u) === 0; }));
      });
      var irmasA = linhas.filter(function (y) { return !y.base && y.produto === x.produto; });
      var gastoA = irmasA.reduce(function (a, y) { return a + y.gasto; }, 0);
      var total = soltas.reduce(function (a, r) { return a + r.valor; }, 0);
      irmasA.forEach(function (y) { var parte = gastoA > 0 ? y.gasto / gastoA : 1 / irmasA.length; y.receita = total * parte; y.qtd = soltas.length * parte; y.aprox = irmasA.length > 1 && soltas.length > 0; y.base = "tracked"; });
    });
    linhas.forEach(function (x) {
      if (x.base || !x.produto) return;
      var irmas = linhas.filter(function (y) { return !y.base && y.produto === x.produto; });
      var gastoP = irmas.reduce(function (a, y) { return a + y.gasto; }, 0);
      var prod = (f.porProduto || []).find(function (p) { return p.nome === x.produto; });
      // Revenue already assigned to tracked campaigns of the same product is not counted twice.
      var jaR = 0, jaQ = 0;
      linhas.forEach(function (y) { if (y.base === "tracked" && y.produto === x.produto) { jaR += y.receita || 0; jaQ += y.qtd || 0; } });
      var restoR = prod ? Math.max(0, prod.valor - jaR) : 0, restoQ = prod ? Math.max(0, prod.qtd - jaQ) : 0;
      x.receita = gastoP > 0 ? restoR * x.gasto / gastoP : 0;
      x.qtd = gastoP > 0 ? restoQ * x.gasto / gastoP : 0; x.aprox = irmas.length > 1;
      x.base = irmas.length > 1 ? "estimated" : "by product";
    });
    var rows = linhas.sort(function (a, b) { return b.gasto - a.gasto; }).map(function (x) {
      var r = x.receita || 0, roi = x.gasto > 0 ? r / x.gasto : null;
      return "<tr><td>" + esc(x.nome) + '<small class="mono muted" style="display:block;margin-top:.3rem">' + esc(x.produto || "no product linked") + " · " + esc(x.base || "no revenue") + "</small></td>" +
        '<td class="r numcell">' + (x.aprox ? "~" : "") + nf.format(Math.round(x.qtd || 0)) + '</td><td class="r numcell">' + brl.format(x.gasto) + '</td><td class="r numcell">' + brl.format(r) +
        '</td><td class="r">' + (roi == null ? '<span class="delta flat">no spend yet</span>' : '<span class="delta ' + (roi >= 1 ? "up" : "down") + '">' + roi.toFixed(1) + "×</span>") + "</td></tr>";
    }).join("");
    return section("ROI", "Return per campaign", "30 days", '<table class="table"><thead><tr><th>Campaign</th><th class="r">Sales</th><th class="r">Spend</th><th class="r">Revenue</th><th class="r">ROI</th></tr></thead><tbody>' + rows + "</tbody></table>");
  }

  // Invested in ads: what left your bank account (list in sites.js), what campaigns spent, what is left.
  function investidoMeta(f) {
    var m = f.investimentoMeta;
    if (!m) return "";
    var roiB = m.investido > 0 && f.receitaAds30d != null ? f.receitaAds30d / m.investido : null;
    var lista = m.pagamentos.map(function (p) {
      return '<li><div class="plist-main"><span class="who">' + brl.format(p.valor) + "</span>" + (p.nota ? "<small>" + esc(p.nota) + "</small>" : "") +
        '</div><div class="plist-num"><small>' + (p.data ? dataCurta(p.data) : "no date") + "</small></div></li>";
    }).join("");
    return section("$", "Invested in Meta ads", "since " + dataCurta(m.desde),
      '<div class="kpis">' +
      kpi("Invested", brl.format(m.investido), '<span class="delta flat">left your account, ' + nf.format(m.pagamentos.length) + " payment(s)</span>") +
      kpi("Spent by campaigns", brl.format(m.gasto), '<span class="delta flat">before taxes, since ' + dataCurta(m.desde) + "</span>") +
      kpi("Balance at Meta", brl.format(m.saldo), '<span class="delta flat">approximate, still to spend</span>') +
      kpi("Out-of-pocket ROI", roiB == null ? "–" : roiB.toFixed(2) + "×", '<span class="delta ' + (roiB == null ? "flat" : roiB >= 1 ? "up" : "down") + '">revenue from ads ÷ invested</span>') +
      "</div>" + (lista ? '<ul class="plist" style="margin-top:1rem">' + lista + "</ul>" : ""));
  }

  function kitHtml(k) {
    if (!k) return "";
    return '<div class="kitbox"><div class="mono">On the Kit list</div><div class="kitnums"><strong>' + nf.format(k.total) + '</strong><span class="delta up">↑ ' + nf.format(k.novos30d) +
      ' in 30d</span><span class="delta flat">' + nf.format(k.novos7d) + " in 7d</span></div>" +
      (k.recentes.length ? '<details class="sdrop"><summary class="mono">Latest sign-ups</summary><ul class="plist">' + k.recentes.map(function (r) {
        return '<li><div class="plist-main"><span class="who">' + esc(r.nome || r.email) + "</span>" + (r.nome ? "<small>" + esc(r.email) + "</small>" : "") + '</div><div class="plist-num"><small>' + diaMes(r.data) + "</small></div></li>";
      }).join("") + "</ul></details>" : "") + '<p class="mono muted" style="font-size:.6rem">' + esc(k.origem) + "</p></div>";
  }

  function landingsHtml(s) {
    var vendas = {};
    (D.faturamento.porProduto || []).forEach(function (p) { vendas[p.nome] = p; });
    var cards = s.landings.map(function (l) {
      var camps = (s.ads.campanhas || []).filter(function (c) { var n = c.nome.toLowerCase(); return (l.campanhas || []).some(function (t) { return n.indexOf(t) >= 0; }); });
      var ativa = camps.filter(function (c) { return c.status === "ativa"; })[0];
      var v = l.produto ? vendas[l.produto] : null;
      var taxa = l.pessoas30d ? (l.conversoes30d / l.pessoas30d * 100).toFixed(1) + "%" : "–";
      return '<article class="lcard"><header><div><b>' + esc(l.nome) + '</b><small class="mono">' + esc(l.caminho) + "</small></div>" +
        (ativa ? '<span class="pill live">Ad running</span>' : (camps.length ? '<span class="pill">Ad paused</span>' : '<span class="pill">No ad</span>')) + "</header>" +
        '<div class="smetrics">' +
        '<div class="sm"><span class="mono">Visits</span><strong>' + nf.format(l.visitas30d) + "</strong></div>" +
        '<div class="sm"><span class="mono">' + esc(l.rotulo) + "</span><strong>" + nf.format(l.conversoes30d) + "</strong></div>" +
        '<div class="sm"><span class="mono">Conversion</span><strong>' + taxa + "</strong></div>" +
        '<div class="sm"><span class="mono">Sales</span><strong>' + (v ? v.qtd + " · " + brl0.format(v.valor) : (l.produto ? "0" : "–")) + "</strong></div></div>" +
        (ativa ? '<p class="sfoot mono">' + esc(ativa.nome) + " · " + brl0.format(ativa.gasto) + " in 30d</p>" : "") +
        kitHtml(s.kit && s.kit[l.nome]) + "</article>";
    }).join("");
    return '<div class="lcards">' + cards + '<article class="lcard novo"><b>New landing page</b><p class="muted">Add it to landingPages in sites.js and it shows up here.</p></article></div>';
  }

  function site(slug) {
    var s = D.sites.filter(function (x) { return x.slug === slug; })[0];
    if (!s) return head("Site not found", "", "");
    var html = head(esc(s.nome), esc(s.papel) + ' · <a href="https://' + esc(s.dominio) + '" target="_blank" rel="noopener">' + esc(s.dominio) + " ↗</a>",
      "GA4 " + esc(s.ga) + "<br>" + (s.ads.ativo ? '<span style="color:var(--red)">● Ads running</span>' : "No active ads"));

    html += '<div class="kpis">' +
      kpi("Visits yesterday", nf.format(s.visitas.ontem), delta(s.visitas.ontem, s.visitas.anterior)) +
      (canal(s, "organico") ? kpi("Organic yesterday", nf.format(s.visitas.organico.ontem), '<span class="delta flat">' + nf.format(sum(s.visitas.organico.serie)) + " in 14 days</span>") +
        kpi("From ads yesterday", nf.format(s.visitas.ads.ontem), '<span class="delta flat">' + nf.format(sum(s.visitas.ads.serie)) + " in 14 days</span>")
        : kpi("Visits, 14 days", nf.format(sum(s.visitas.serie)), spark(s.visitas.serie, 140, 26))) +
      kpi(s.conversao ? esc(s.conversao.rotulo) : "Conversions", s.conversao ? nf.format(s.conversao.ontem) : "–", s.conversao ? delta(s.conversao.ontem, s.conversao.anterior) : '<span class="delta flat">none configured</span>') +
      kpi("Revenue, 30 days", s.receita30d ? brl0.format(s.receita30d) : "–", '<span class="delta flat">Stripe</span>') +
      "</div>";

    html += '<div class="grid-2">' +
      section("01", "Top pages", "yesterday", barList(s.paginas)) +
      section("02", "Traffic sources", "sessions, yesterday", '<div class="boxed">' + barList(s.origens) + "</div>") + "</div>";
    if ((s.landings || []).length) html += section("03", "Landing pages", "30 days", landingsHtml(s));
    if ((s.paises || []).length) html += section("04", "Countries", "people, 7 days", '<div class="boxed">' + barList(s.paises) + "</div>");

    if (canal(s, "organico")) {
      html += section("03", "Organic vs ads", "sessions per day, 14 days", duasSeries(s.visitas.organico.serie, s.visitas.ads.serie));
    }
    html += section(canal(s, "organico") ? "04" : "03", "Pages getting ad traffic", "GA4 · 7 days", tabelaPaginasAds(s.paginasAds, false));

    var ads = s.ads;
    if (!ads.ativo && !ads.campanhas.length) {
      html += section("05", "Ads", ads.conta ? esc(ads.conta) : "",
        '<div class="ads-off"><span class="big">No ads.</span><span>No campaigns linked to this site' + (ads.conta ? " in account " + esc(ads.conta) : "") + ".</span></div>");
      return html;
    }

    var campHtml = ads.campanhas.map(function (c) {
      var top = c.criativos.slice().sort(function (a, b) { return b.resultados - a.resultados; })[0];
      var cards = c.criativos.map(function (cr) {
        var isTop = c.criativos.length > 1 && cr === top;
        return '<article class="creative' + (isTop ? " top" : "") + '">' +
          '<div class="thumb" style="--h:' + (cr.tom || 0) + "" + '">' + imgTag(cr.imagem) + '<span class="fmt mono">' + esc(cr.formato) + '</span><span class="headline">' + esc(cr.titulo) + "</span></div>" +
          '<div class="body"><span class="name">' + (isTop ? '<span class="rank mono">Best · </span>' : "") + esc(cr.nome) + "</span><p>" + esc(cr.texto) + "</p>" +
          '<div class="cstats"><div><span>' + brl0.format(cr.gasto) + '</span><span class="mono">spend</span></div><div><span>' + pct(cr.ctr) +
          '</span><span class="mono">ctr</span></div><div><span>' + nf.format(cr.resultados) + '</span><span class="mono">' + esc(c.rotuloResultado) + "</span></div></div></div></article>";
      }).join("");

      return '<div class="camp reveal"><div class="camp-head"><div><h3>' + esc(c.nome) + '</h3><div class="mono">' + esc(c.objetivo) + " · since " + dataCurta(c.desde) +
        " · " + diasDesde(c.desde) + " days" + (c.orcamentoDia ? " · " + brl0.format(c.orcamentoDia) + "/day" : "") + "</div></div>" + statusPill(c.status) + "</div>" +
        '<div class="camp-stats">' +
        "<div><span class=\"mono\">Spend</span><strong>" + brl0.format(c.gasto) + "</strong></div>" +
        "<div><span class=\"mono\">Reach</span><strong>" + nf.format(c.alcance) + "</strong></div>" +
        "<div><span class=\"mono\">Clicks</span><strong>" + nf.format(c.cliques) + "</strong></div>" +
        "<div><span class=\"mono\">CTR</span><strong>" + pct(c.ctr) + "</strong></div>" +
        "<div><span class=\"mono\">CPC</span><strong>" + brl.format(c.cpc) + "</strong></div>" +
        "<div><span class=\"mono\">" + esc(c.rotuloResultado) + "</span><strong>" + nf.format(c.resultados) + "</strong></div></div>" +
        '<div class="section-head"><h2 style="font-size:.9rem">Spend per day</h2><span class="mono">last ' + c.serieGasto.length + " days</span></div>" +
        bars(c.serieGasto, { h: 70, tom: "amber", label: "Daily spend", fmt: brl.format, from: diasDesde(c.desde) < c.serieGasto.length ? dataCurta(c.desde) : c.serieGasto.length + " days ago", to: "yesterday" }) +
        (c.criativos.length ? '<div class="section-head" style="margin-top:1.8rem"><h2 style="font-size:.9rem">Creatives</h2><span class="mono">' + c.criativos.length + " ad(s)</span></div>" +
        '<div class="creatives">' + cards + "</div>" : "") + "</div>";
    }).join("");

    html += section("05", "Ads", esc(ads.conta) + " · " + (ads.rodando != null ? ads.rodando : ads.campanhas.filter(function (c) { return c.status === "ativa"; }).length) + " running of " + ads.campanhas.length, campHtml);
    return html;
  }

  // ---------- Navigation ----------
  function renderNav(route) {
    var link = function (href, label, dot) {
      return '<a href="' + href + '"' + (route === href ? ' aria-current="page"' : "") + "><span>" + label + "</span>" + (dot || "") + "</a>";
    };
    nav.innerHTML =
      '<div class="nav-group"><span class="mono">Overview</span>' + link("#/", "Overview") + link("#/revenue", "Revenue") + link("#/social", "Social") + "</div>" +
      '<div class="nav-group"><span class="mono">Sites</span>' +
      D.sites.map(function (s) { return link("#/site/" + s.slug, esc(s.nome), '<span class="dot' + (s.ads.ativo ? " live" : "") + '" title="' + (s.ads.ativo ? "Ads running" : "No ads") + '"></span>'); }).join("") +
      "</div>";
    sidefoot.innerHTML = (D.demo ? "Example mode<br>" : "") + (D.usuario ? esc(D.usuario) + "<br>" : "") +
      (D.usuario ? '<a href="/api/portal/auth/logout">Sign out</a>' : "GA4 · Meta · Stripe");
  }

  function route() {
    var h = location.hash || "#/";
    var html;
    if (h.indexOf("#/site/") === 0) html = site(h.slice(7));
    else if (h === "#/revenue") html = faturamento();
    else if (h.indexOf("#/social") === 0) { html = paginaRedes(h.split("/")[2]); h = "#/social"; }
    else { h = "#/"; html = overview(); }
    renderNav(h);
    app.innerHTML = html;
    app.querySelectorAll(".scard[data-href]").forEach(function (el) {
      el.addEventListener("click", function (e) { if (e.target.closest("details, a, button")) return; location.hash = el.getAttribute("data-href"); });
    });
    app.querySelectorAll(".seg").forEach(function (seg) {
      seg.addEventListener("click", function (e) {
        var b = e.target.closest("button[data-modo]"); if (!b) return;
        seg.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
        document.getElementById(seg.getAttribute("data-alvo")).innerHTML = receitaChart(b.getAttribute("data-modo"), +seg.getAttribute("data-h"));
      });
    });
    app.querySelectorAll("tr[data-href]").forEach(function (tr) {
      tr.addEventListener("click", function (e) {
        if (e.target.closest("a")) return;
        var btn = e.target.closest(".drop-btn");
        if (btn) {
          var row = document.getElementById(btn.getAttribute("aria-controls"));
          var abrir = btn.getAttribute("aria-expanded") !== "true";
          btn.setAttribute("aria-expanded", String(abrir));
          row.hidden = !abrir;
          return;
        }
        var href = tr.getAttribute("data-href");
        if (href.charAt(0) === "#") location.hash = href; else window.open(href, "_blank", "noopener");
      });
    });
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  }

  function start(data) {
    D = data;
    var cur = (D.faturamento && D.faturamento.moeda) || "USD";
    brl = new Intl.NumberFormat(LOCALE, { style: "currency", currency: cur });
    brl0 = new Intl.NumberFormat(LOCALE, { style: "currency", currency: cur, maximumFractionDigits: 0 });
    window.addEventListener("hashchange", route);
    route();
  }

  // ---------- Login ----------
  var ERROS = {
    acesso: "This Google account has no access to this portal.",
    cancelado: "Login cancelled.",
    sessao: "The login session expired. Try again.",
    google: "Google did not confirm the login. Try again."
  };
  function login() {
    document.body.classList.add("is-login");
    var erro = new URLSearchParams(location.search).get("erro");
    app.innerHTML = '<section class="login reveal"><span class="brand-mark big" aria-hidden="true"></span>' +
      "<h1>Presence<em>.</em></h1><p class=\"muted\">Private area.</p>" +
      (erro && ERROS[erro] ? '<p class="login-err mono">' + ERROS[erro] + "</p>" : "") +
      '<a class="btn" href="/api/portal/auth/login">Sign in with Google</a></section>';
  }

  function carregarExemplo() {
    var sc = document.createElement("script");
    sc.src = "/portal/data-exemplo.js";
    sc.onload = function () { start(window.PORTAL_DEMO); };
    document.head.appendChild(sc);
  }

  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  fetch("/api/portal/data", { credentials: "same-origin", headers: { Accept: "application/json" } })
    .then(function (r) {
      if (r.status === 401) return login();
      if (!r.ok) throw new Error(String(r.status));
      return r.json().then(function (d) {
        if (location.search) history.replaceState(null, "", location.pathname + location.hash);
        start(d);
      });
    })
    .catch(function () {
      if (local) return carregarExemplo();
      app.innerHTML = '<p class="mono muted">Could not load the portal. Reload the page.</p>';
    });
})();
