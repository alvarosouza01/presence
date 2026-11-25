/* Portal · minha presença online
   Uma página só, com rotas por hash:
     #/              overview geral
     #/faturamento   Stripe e gasto em anúncios
     #/site/<slug>   tráfego, conversões, anúncios e criativos de um site
   Os dados vêm de /api/portal/data (precisa de login). Sem sessão, mostra o login.
   No preview local sem a API, cai para /portal/data-exemplo.js. */

(function () {
  "use strict";

  var D = null;
  var app = document.getElementById("app");
  var nav = document.getElementById("nav");
  var sidefoot = document.getElementById("sidefoot");

  // ---------- Formatação ----------
  var nf = new Intl.NumberFormat("pt-BR");
  var brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  var brl0 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  var pct = function (v) { return v.toFixed(2).replace(".", ",") + "%"; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
  var MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  function diaMes(iso) { var p = String(iso).split("-"); return p[2] + "/" + p[1]; }
  function imgTag(url) { return url ? '<img class="cover" src="' + esc(url) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">' : ""; }
  // Agrupa uma série diária em semanas (começando na segunda) ou meses.
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
    var MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    return {
      valores: chaves.map(function (k) { return Math.round(soma[k] * 100) / 100; }),
      rotulos: chaves.map(function (k) { return modo === "mes" ? MES[+k.slice(5, 7) - 1] + "/" + k.slice(2, 4) : diaMes(k); })
    };
  }
  // Gráfico de receita com visão por dia, semana e mês.
  var MODOS = { dia: ["Dia", 30], semana: ["Semana", 12], mes: ["Mês", 6] };
  function receitaChart(modo, h) {
    var f = D.faturamento;
    var dias = f.dias180 && f.dias180.length ? f.dias180 : null;
    var vals = dias ? f.diario180 : f.diario;
    if (!dias) { modo = "dia"; }
    var g = dias ? agrupar(dias, vals, modo, MODOS[modo][1]) : { valores: vals, rotulos: null };
    return bars(g.valores, { h: h || 130, tom: "green", label: "Receita por " + MODOS[modo][0].toLowerCase(), fmt: brl.format, rotulos: g.rotulos, from: "30 dias atrás", to: "ontem" });
  }
  function receitaWidget(id, h) {
    return '<div class="seg-wrap"><div class="seg" role="tablist" data-alvo="' + id + '" data-h="' + (h || 130) + '">' + Object.keys(MODOS).map(function (m) {
      return '<button type="button" role="tab" data-modo="' + m + '" aria-selected="' + (m === "dia") + '">' + MODOS[m][0] + "</button>";
    }).join("") + '</div><div id="' + id + '">' + receitaChart("dia", h) + "</div></div>";
  }
  function datasDe(dias) { return (dias || []).map(diaMes); }

  function dataCurta(iso) { var d = new Date(iso + "T12:00:00"); return d.getDate() + " " + MESES[d.getMonth()]; }
  function diasDesde(iso) { var ms = new Date(D.atualizadoEm) - new Date(iso + "T00:00:00"); return Math.max(1, Math.floor(ms / 864e5)); }

  function delta(now, before) {
    if (!before && !now) return '<span class="delta flat">sem variação</span>';
    if (!before) return '<span class="delta up">novo</span>';
    var p = Math.round(((now - before) / before) * 100);
    if (p === 0) return '<span class="delta flat">0%</span>';
    return '<span class="delta ' + (p > 0 ? "up" : "down") + '">' + (p > 0 ? "↑ +" : "↓ ") + p + "% vs. dia anterior</span>";
  }

  // ---------- Gráficos em SVG ----------
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
    if (!values || !values.length) return '<p class="empty mono">Sem dados no período</p>';
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
    if (!rows || !rows.length) return '<p class="empty mono">Sem dados</p>';
    var max = Math.max.apply(null, rows.map(function (r) { return r[1]; })) || 1;
    return rows.map(function (r, i) {
      return '<div class="bar-row c' + (i % 5) + '"><span class="label">' + esc(r[0]) + '</span><span class="val">' + fmt(r[1]) +
        '</span><div class="track"><div class="fill" style="width:' + (r[1] / max) * 100 + '%"></div></div></div>';
    }).join("");
  }

  // ---------- Pedaços comuns ----------
  function head(title, sub, meta) {
    return (D.demo ? '<div class="demo-flag mono">Dados de exemplo · visual para aprovação</div>' : "") +
      '<header class="head reveal"><div><h1>' + title + "</h1>" + (sub ? '<p class="sub">' + sub + "</p>" : "") + "</div>" +
      '<div class="meta mono">' + (meta || "") + "</div></header>" + avisoFontes();
  }
  var NOMES_FONTE = { stripe: "Stripe", ga4: "GA4", meta: "Meta Ads", youtube: "YouTube", instagram: "Instagram", kit: "Kit" };
  function avisoFontes() {
    if (D.demo || !D.fontes) return "";
    var off = Object.keys(D.fontes).filter(function (k) { return !D.fontes[k]; });
    var err = Object.keys(D.erros || {});
    var avisos = (D.avisos || []).map(function (t) { return '<span class="pill bad" title="' + esc(t) + '">' + esc(t.split(":")[0]) + " com erro</span>"; });
    if (!off.length && !avisos.length) return "";
    return '<div class="fontes-off mono reveal">' + avisos.join(" ") + " " + off.map(function (k) {
      return '<span class="pill' + (err.indexOf(k) >= 0 ? " bad" : "") + '">' + (NOMES_FONTE[k] || k) + (err.indexOf(k) >= 0 ? " com erro" : " não conectado") + "</span>";
    }).join(" ") + "</div>";
  }

  function section(idx, title, right, body) {
    return '<section class="section reveal"><div class="section-head"><h2><span class="idx">' + idx + "</span>" + title +
      '</h2><span class="mono">' + (right || "") + "</span></div>" + body + "</section>";
  }
  function kpi(label, value, extra) {
    return '<div class="kpi reveal"><div class="mono">' + label + '</div><div class="num">' + value + "</div>" + (extra || "") + "</div>";
  }
  // Orgânico x anúncios (sessões do GA4). Sites sem o dado mostram "–".
  function canal(s, tipo) { return (s.visitas && s.visitas[tipo]) || null; }
  function celCanal(s, tipo) {
    var c = canal(s, tipo);
    if (!c) return '<span class="muted">–</span>';
    return nf.format(c.ontem) + "<br>" + delta(c.ontem, c.anterior).replace(" vs. dia anterior", "");
  }
  function tabelaPaginasAds(lista, compacta) {
    if (!lista || !lista.length) return '<p class="empty mono">Nenhuma visita vinda de anúncios nos últimos 7 dias</p>';
    // Versão para dentro dos cards: lista empilhada, sem colunas que estouram a largura.
    if (compacta) return '<ul class="plist">' + lista.map(function (p) {
      return '<li><div class="plist-main"><span class="path">' + esc(p.pagina) + '</span><small>' + (p.campanha ? esc(p.campanha) : "sem UTM") + (p.origem ? " · " + esc(p.origem) : "") + "</small></div>" +
        '<div class="plist-num"><strong>' + nf.format(p.sessoes) + '</strong><small>' + (p.conversoes ? nf.format(p.conversoes) + " conv." : "sessões") + "</small></div></li>";
    }).join("") + "</ul>";
    return '<table class="table pages-ads"><thead><tr><th>Página</th><th>Campanha</th>' + (compacta ? "" : '<th class="hide-sm">Origem</th>') +
      '<th class="r">Sessões</th><th class="r">Conversões</th></tr></thead><tbody>' +
      lista.map(function (p) {
        return '<tr><td class="mono pg">' + esc(p.pagina) + "</td><td>" + (p.campanha ? esc(p.campanha) : '<span class="muted">sem UTM</span>') + "</td>" +
          (compacta ? "" : '<td class="muted hide-sm">' + esc(p.origem) + "</td>") +
          '<td class="r numcell">' + nf.format(p.sessoes) + '</td><td class="r numcell">' + nf.format(p.conversoes) + "</td></tr>";
      }).join("") + "</tbody></table>";
  }

  function duasSeries(org, ads) {
    var max = Math.max.apply(null, org.map(function (v, i) { return v + ads[i]; }).concat([1]));
    var cols = org.map(function (v, i) {
      var a = ads[i];
      return '<div class="stk" title="' + nf.format(v) + " orgânicas · " + nf.format(a) + ' de anúncios"><i class="a" style="height:' + (a / max * 100) + '%"></i><i class="o" style="height:' + (v / max * 100) + '%"></i></div>';
    }).join("");
    return '<div class="stack">' + cols + '</div><div class="stack-leg mono"><span><i class="o"></i>Orgânico ' + nf.format(sum(org)) + '</span><span><i class="a"></i>Anúncios ' + nf.format(sum(ads)) + '</span><span class="muted">14 dias atrás → ontem</span></div>';
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

  // ---------- Telas ----------
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
      '<div class="scard-spark"><span class="mono">Visitas, 14 dias</span>' + spark(s.visitas.serie, 300, 46) + "</div>" +
      '<div class="smetrics">' +
      m("Visitas ontem", nf.format(s.visitas.ontem), delta(s.visitas.ontem, s.visitas.anterior).replace(" vs. dia anterior", "")) +
      m("Receita 30d", s.receita30d ? brl0.format(s.receita30d) : "–") +
      m("Orgânico", org ? nf.format(org.ontem) : "–", '<span class="bar-mini"><i style="width:' + (org && (org.ontem + (ad ? ad.ontem : 0)) ? Math.round(org.ontem / (org.ontem + ad.ontem) * 100) : 0) + '%"></i></span>') +
      m("Anúncios", ad ? nf.format(ad.ontem) : "–", '<span class="bar-mini ads"><i style="width:' + (ad && (org.ontem + ad.ontem) ? Math.round(ad.ontem / (org.ontem + ad.ontem) * 100) : 0) + '%"></i></span>') +
      "</div>" +
      (c ? '<p class="sfoot mono">' + nf.format(c.ontem) + " " + esc(c.rotulo).toLowerCase() + " ontem</p>" : "") +
      (pa.length ? '<details class="sdrop"><summary class="mono">' + pa.length + " página(s) recebendo anúncios</summary>" + tabelaPaginasAds(pa, true) + "</details>" : "") +
      "</article>";
  }

  function overview() {
    var t = totais(), f = D.faturamento;
    var temGasto = f.gastoAds30d != null;
    var rAds = f.receitaAds30d != null ? f.receitaAds30d : null;
    var rOrg = f.receitaOrganica30d != null ? f.receitaOrganica30d : t.receita;
    var roi = temGasto && f.gastoAds30d > 0 && rAds != null ? (rAds / f.gastoAds30d).toFixed(1).replace(".", ",") + "×" : "–";
    var html = head("Sua presença <em>online</em>", "Todos os sites, anúncios e vendas num lugar só.",
      "Período: " + esc(D.periodo) + "<br>Atualizado " + new Date(D.atualizadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }));

    html += '<div class="kpis k5">' +
      kpi("Visitas ontem", nf.format(t.vOntem), t.orgOntem != null ? '<span class="delta flat">' + nf.format(t.orgOntem) + " orgânicas · " + nf.format(t.adsOntem) + " de anúncios</span>" : delta(t.vOntem, t.vAnt)) +
      kpi("Receita orgânica", brl0.format(rOrg), '<span class="delta flat">assinaturas e vendas sem anúncio, 30d</span>') +
      kpi("Receita via anúncios", rAds != null ? brl0.format(rAds) : "–", '<span class="delta flat">produtos anunciados, 30d</span>') +
      kpi("Gasto em anúncios", temGasto ? brl0.format(f.gastoAds30d) : "–", '<span class="delta flat">Meta, 30 dias</span>') +
      kpi("Retorno dos anúncios", roi, '<span class="delta flat">receita via anúncios ÷ gasto</span>') +
      "</div>";

    html += section("01", "Sites", D.sites.length + " sites · clique para abrir", '<div class="scards">' + D.sites.map(cardSite).join("") + "</div>");
    html += section("02", "Redes", '<a href="#/redes">ver redes →</a>', cartoesRedes());

    var camps = [];
    D.sites.forEach(function (s) { s.ads.campanhas.forEach(function (c) { camps.push([s, c]); }); });
    var rodando = camps.filter(function (p) { return p[1].status === "ativa"; }).length;
    var campRows = camps.map(function (p) {
      var s = p[0], c = p[1];
      return '<tr class="link" data-href="#/site/' + s.slug + '"><td><div class="site-name">' + esc(c.nome) + "<small>" + esc(s.nome) + " · desde " + dataCurta(c.desde) + "</small></div></td>" +
        '<td class="r numcell">' + brl.format(c.gasto) + '</td><td class="r numcell hide-sm">' + nf.format(c.resultados) + " " + esc(c.rotuloResultado) +
        '</td><td class="r numcell hide-sm">' + (c.resultados ? brl.format(c.gasto / c.resultados) : "–") + '</td><td class="r">' + statusPill(c.status) + "</td></tr>";
    }).join("");
    html += section("03", "Campanhas", "Meta Ads · " + rodando + " rodando",
      camps.length ? '<table class="table"><thead><tr><th>Campanha</th><th class="r">Gasto 30d</th><th class="r hide-sm">Resultados</th><th class="r hide-sm">Custo por resultado</th><th class="r">Status</th></tr></thead><tbody>' + campRows + "</tbody></table>"
        : '<div class="ads-off"><span class="big">Nenhuma campanha.</span></div>');

    html += '<div class="grid-2">' +
      section("04", "Receita", '<a href="#/faturamento">ver faturamento →</a>', receitaWidget("rec-ov", 120)) +
      section("05", "De onde vêm as pessoas", "países, 7 dias, todos os sites", '<div class="boxed">' + barList(paisesAgregados()) + "</div>") + "</div>";
    return html;
  }

  function statusPill(s) {
    if (s === "ativa") return '<span class="pill live">Ativa</span>';
    if (s === "pausada") return '<span class="pill">Pausada</span>';
    if (s === "sem_entrega") return '<span class="pill bad">Ativa, sem entrega</span>';
    return '<span class="pill">' + esc(s) + "</span>";
  }

  // ---------- Redes ----------
  var nk = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
  function redes() { return D.redes || { youtube: null, instagram: [] }; }

  function cartaoRede(nome, conta, total, rotulo, novos, perdidos, periodo, href, cor) {
    var saldo = novos != null && perdidos != null ? novos - perdidos : null;
    return '<a class="rede reveal r-' + cor + '" href="' + href + '"><div class="rede-top"><span class="mono">' + nome + '</span><span class="muted">' + esc(conta) + "</span></div>" +
      '<div class="num">' + (total != null ? nf.format(total) : "–") + ' <small>' + rotulo + "</small></div>" +
      '<div class="rede-mov mono"><span class="delta up">↑ ' + nf.format(novos || 0) + "</span>" +
      (perdidos != null ? ' <span class="delta down">↓ ' + nf.format(perdidos) + "</span>" : "") +
      (saldo != null ? ' <span class="delta ' + (saldo >= 0 ? "up" : "down") + '">saldo ' + (saldo >= 0 ? "+" : "") + nf.format(saldo) + "</span>" : "") +
      ' <span class="muted">' + periodo + "</span></div></a>";
  }
  function semConexao(nome, acao) {
    return '<div class="rede off reveal"><div class="rede-top"><span class="mono">' + nome + '</span></div><p class="muted">Não conectado.</p>' + (acao || "") + "</div>";
  }
  function cartoesRedes() {
    var r = redes(), out = "";
    var yt = r.youtube;
    out += yt ? cartaoRede("YouTube", yt.canal, yt.inscritos, "inscritos", yt.novos28, yt.perdidos28, "28 dias", "#/redes/youtube", "yt")
      : semConexao("YouTube", '<a class="mini-btn" href="/api/portal/auth/youtube">Autorizar canal</a>');
    var igs = r.instagram || [];
    out += igs.length ? igs.map(function (ig) { return cartaoRede("Instagram", ig.usuario, ig.seguidores, "seguidores", ig.novos30, ig.perdidos30, "30 dias", "#/redes/instagram", "ig"); }).join("")
      : semConexao("Instagram");
    var nl = r.newsletter;
    out += nl ? cartaoRede("Newsletter", esc(nl.nome), nl.inscritos, "inscritos", nl.novos30d, null, "30 dias", "#/redes/newsletter", "nl") : "";
    out += '<div class="rede off reveal r-li"><div class="rede-top"><span class="mono">LinkedIn</span></div><p class="muted">Em breve, pela exportação semanal.</p></div>';
    return '<div class="redes">' + out + "</div>";
  }

  function paginaRedes(aba) {
    var r = redes();
    var yt = r.youtube, igs = r.instagram || [];
    var nl = r.newsletter;
    aba = ["instagram", "newsletter", "linkedin"].indexOf(aba) >= 0 ? aba : "youtube";
    var html = head("Redes", "Seguidores, inscritos e o que você publicou.", "YouTube · Instagram · LinkedIn");

    var tab = function (id, nome, valor, rotulo) {
      return '<a class="rtab t-' + id + '" href="#/redes/' + id + '"' + (aba === id ? ' aria-current="page"' : "") + '>' +
        '<span class="rtab-top"><span class="rtab-sw"></span>' + nome + '</span>' +
        '<span class="rtab-num">' + (valor != null ? nf.format(valor) : "–") + '</span><span class="rtab-lbl mono">' + rotulo + "</span></a>";
    };
    html += '<nav class="rtabs reveal" aria-label="Redes">' +
      tab("youtube", "YouTube", yt ? yt.inscritos : null, yt ? "inscritos" : "não conectado") +
      tab("instagram", "Instagram", igs.length ? sum(igs.map(function (i) { return i.seguidores; })) : null, igs.length ? "seguidores" : "não conectado") +
      tab("newsletter", nl ? esc(nl.nome) : "Newsletter", nl ? nl.inscritos : null, nl ? "inscritos" : "não conectado") +
      tab("linkedin", "LinkedIn", null, "em breve") + "</nav>";

    if (aba === "newsletter") {
      if (!nl) return html + '<div class="ads-off reveal"><span class="big">Não conectado.</span><span>Coloque a chave do Kit em KIT_API_KEY e ative redes.newsletter em sites.js.</span></div>';
      html += '<div class="kpis">' +
        kpi("Inscritos", nf.format(nl.inscritos), '<span class="delta flat">ativos no Kit</span>') +
        kpi("Novos, 30 dias", "+" + nf.format(nl.novos30d), delta(nl.novos30d, nl.novosAnterior30d).replace("vs. dia anterior", "vs. 30 dias anteriores")) +
        kpi("Novos, 7 dias", "+" + nf.format(nl.novos7d), '<span class="delta flat">última semana</span>') +
        kpi("Último envio", nl.envios.length && nl.envios[0].abertura != null ? pct(nl.envios[0].abertura) : "–", '<span class="delta flat">taxa de abertura</span>') + "</div>";
      html += section("01", "Últimos envios", "Kit", nl.envios.length ? '<table class="table"><thead><tr><th>Assunto</th><th class="hide-sm">Data</th><th class="r hide-sm">Enviados</th><th class="r">Abertura</th><th class="r">Cliques</th><th class="r hide-sm">Saíram</th></tr></thead><tbody>' +
        nl.envios.map(function (e) {
          return '<tr><td><span class="site-name">' + esc(e.assunto) + '</span></td><td class="mono muted hide-sm">' + dataCurta(e.data) + '</td><td class="r numcell hide-sm">' + (e.enviados != null ? nf.format(e.enviados) : "–") +
            '</td><td class="r numcell">' + (e.abertura != null ? pct(e.abertura) : "–") + '</td><td class="r numcell">' + (e.cliques != null ? pct(e.cliques) : "–") + '</td><td class="r numcell hide-sm">' + (e.descadastros != null ? nf.format(e.descadastros) : "–") + "</td></tr>";
        }).join("") + "</tbody></table>" : '<p class="empty mono">Nenhum envio encontrado</p>');
      return html;
    }

    if (aba === "youtube") {
      if (!yt) return html + '<div class="ads-off reveal"><span class="big">Não conectado.</span><span>Autorize o portal a ler o seu canal (só leitura). <a class="mini-btn" href="/api/portal/auth/youtube">Autorizar canal</a></span></div>';
      html += '<div class="kpis">' +
        kpi("Inscritos", nf.format(yt.inscritos), '<span class="delta flat">' + esc(yt.canal) + "</span>") +
        kpi("Novos, 28 dias", "+" + nf.format(yt.novos28), '<span class="delta down">↓ ' + nf.format(yt.perdidos28) + " perdidos</span>") +
        kpi("Views, 28 dias", nk.format(yt.views28), '<span class="delta flat">' + nk.format(yt.viewsTotal) + " no total</span>") +
        kpi("Vídeos", nf.format(yt.videos), '<a class="delta flat" href="' + esc(yt.url) + '" target="_blank" rel="noopener">abrir canal ↗</a>') + "</div>";
      html += section("01", "Inscritos ganhos por dia", yt.analyticsOk ? "28 dias · o YouTube atualiza com 2 a 3 dias de atraso" : "Analytics indisponível",
        bars(yt.serie.ganhos, { h: 110, tom: "yt", rotulos: datasDe(yt.dias), label: "Inscritos ganhos por dia", fmt: function (v) { return "+" + v; }, from: "28 dias atrás", to: "ontem" }));
      html += section("02", "Últimos vídeos", "", (yt.ultimosVideos || []).length ? '<table class="table"><thead><tr><th>Vídeo</th><th class="hide-sm">Publicado</th><th class="r">Views</th><th class="r hide-sm">Likes</th><th class="r hide-sm">Comentários</th></tr></thead><tbody>' +
        yt.ultimosVideos.map(function (v) {
          return '<tr class="link" data-href="' + esc(v.url) + '"><td><div class="vid">' + (v.thumb ? '<img src="' + esc(v.thumb) + '" alt="" loading="lazy">' : '<span class="vid-ph"></span>') + '<span class="site-name">' + esc(v.titulo) + "</span></div></td>" +
            '<td class="mono muted hide-sm">' + dataCurta(v.data) + '</td><td class="r numcell">' + nf.format(v.views) + '</td><td class="r numcell hide-sm">' + nf.format(v.likes) + '</td><td class="r numcell hide-sm">' + nf.format(v.comentarios) + "</td></tr>";
        }).join("") + "</tbody></table>" : '<p class="empty mono">Sem vídeos</p>');
      return html;
    }

    if (aba === "linkedin") {
      return html + '<div class="ads-off reveal"><span class="big">Em breve.</span><span>O LinkedIn não libera estatísticas de perfil pessoal por API. O plano é ler a exportação semanal de estatísticas de criador.</span></div>';
    }

    if (!igs.length) return html + '<div class="ads-off reveal"><span class="big">Não conectado.</span><span>Falta o token de leitura do Instagram na Vercel.</span></div>';
    igs.forEach(function (ig, n) {
      html += '<div class="kpis">' +
        kpi("Seguidores", nf.format(ig.seguidores), '<a class="delta flat" href="' + esc(ig.url) + '" target="_blank" rel="noopener">' + esc(ig.usuario) + " ↗</a>") +
        kpi("Novos, 30 dias", "+" + nf.format(ig.novos30 || 0), ig.perdidos30 != null ? '<span class="delta down">↓ ' + nf.format(ig.perdidos30) + " deixaram de seguir</span>" : '<span class="delta flat">perdidos indisponível</span>') +
        kpi("Alcance ontem", ig.alcanceOntem != null ? nf.format(ig.alcanceOntem) : "–", '<span class="delta flat">contas alcançadas</span>') +
        kpi("Visitas ao perfil", ig.visitasPerfilOntem != null ? nf.format(ig.visitasPerfilOntem) : "–", '<span class="delta flat">ontem</span>') + "</div>";
      html += section(String(n * 2 + 1).padStart(2, "0"), "Novos seguidores por dia · " + esc(ig.usuario), "30 dias",
        bars(ig.serieNovos, { h: 110, tom: "ig", rotulos: datasDe(ig.dias), label: "Novos seguidores por dia", fmt: function (v) { return "+" + v; }, from: "30 dias atrás", to: "ontem" }));
      html += section(String(n * 2 + 2).padStart(2, "0"), "Últimos posts", nf.format(ig.posts) + " no total",
        (ig.ultimosPosts || []).length ? '<div class="creatives">' + ig.ultimosPosts.map(function (p, i) {
          return '<a class="creative" href="' + esc(p.url) + '" target="_blank" rel="noopener"><div class="thumb" style="--h:' + (300 + i * 23) % 360 + "" + '">' + imgTag(p.thumb) +
            '<span class="fmt mono">' + esc(p.tipo) + '</span><span class="headline">' + (p.thumb ? "" : esc(p.legenda.slice(0, 60))) + "</span></div>" +
            '<div class="body"><p>' + esc(p.legenda) + '</p><div class="cstats"><div><span>' + nf.format(p.curtidas) + '</span><span class="mono">curtidas</span></div><div><span>' +
            (p.novosSeguidores != null ? "+" + nf.format(p.novosSeguidores) : "–") + '</span><span class="mono">seguidores</span></div><div><span>' +
            (p.alcance != null ? nk.format(p.alcance) : nf.format(p.comentarios)) + '</span><span class="mono">' + (p.alcance != null ? "alcance" : "coment.") + '</span></div></div><p class="mono muted cdate">' + dataCurta(p.data) + '</p></div></a>';
        }).join("") + "</div>" : '<p class="empty mono">Sem posts</p>');
    });
    return html;
  }

  function faturamento() {
    var f = D.faturamento, total = f.receita30d != null ? f.receita30d : sum(f.diario);
    var ant = f.receitaAnterior30d;
    var orgAnt = ant != null && f.receitaAdsAnterior30d != null ? ant - f.receitaAdsAnterior30d : null;
    var cmp = function (a, b) { return b != null ? delta(a, b).replace("vs. dia anterior", "vs. 30 dias anteriores") : ""; };
    var html = head("Faturamento", "Tudo o que entrou pelo Stripe, e quanto custou trazer.", "Stripe<br>Valores em BRL, já sem reembolsos");
    html += '<div class="ledger section reveal"><div>' +
      '<div class="mono muted">Últimos 30 dias</div><div class="big-figure"><em>R$</em>' + nf.format(Math.round(total)) + "</div>" +
      (ant != null ? '<div style="margin-top:.4rem">' + cmp(total, ant) + ' <span class="mono muted">antes: ' + brl0.format(ant) + "</span></div>" : "") +
      '<div style="margin-top:1.6rem">' + receitaWidget("rec-fat", 150) + "</div></div>" +
      "<div><div class=\"mono muted\" style=\"margin-bottom:.4rem\">Por produto, 30 dias</div>" + barList(f.porProduto.map(function (p) { return [p.nome + " · " + p.qtd + "×", p.valor]; }), brl.format) + "</div></div>";

    html += '<div class="kpis">' +
      kpi("Receita orgânica", f.receitaOrganica30d != null ? brl0.format(f.receitaOrganica30d) : "–", cmp(f.receitaOrganica30d || 0, orgAnt)) +
      kpi("Receita via anúncios", f.receitaAds30d != null ? brl0.format(f.receitaAds30d) : "–", cmp(f.receitaAds30d || 0, f.receitaAdsAnterior30d)) +
      kpi("Gasto em anúncios", f.gastoAds30d != null ? brl.format(f.gastoAds30d) : "–", '<span class="delta flat">Meta, 30 dias</span>') +
      kpi("A liberar no Stripe", brl.format(f.aCaminho), '<span class="delta flat">vendas pagas aguardando liberação' + (f.disponivel != null ? ", disponível " + brl.format(f.disponivel) : "") + "</span>") +
      "</div>";
    html += '<p class="mono muted" style="margin:-2rem 0 3rem">Reembolsos 30d: ' + brl.format(f.reembolsos30d) + " · Cobranças falhadas: " + nf.format(f.falhas30d) + "</p>";

    var outras = Object.keys(f.outrasMoedas || {});
    if (outras.length) html += '<p class="mono muted" style="margin:-2rem 0 3rem">Fora do total em BRL: ' + outras.map(function (m) {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: m.toUpperCase() }).format(f.outrasMoedas[m]);
    }).join(" · ") + "</p>";
    var rows = f.recentes.map(function (r) {
      var cls = r.status === "pago" ? "ok" : (r.status === "falhou" ? "bad" : "");
      var vf = r.moeda && r.moeda !== "brl" ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: r.moeda.toUpperCase() }).format(r.valor) : brl.format(r.valor);
      var dt = /^\d{4}-\d{2}-\d{2}$/.test(r.data) ? dataCurta(r.data) : r.data;
      return '<tr><td class="mono muted">' + esc(dt) + "</td><td>" + esc(r.produto) + '</td><td class="r numcell">' + vf +
        '</td><td class="r"><span class="pill ' + cls + '">' + esc(r.status) + "</span></td></tr>";
    }).join("");
    html += section("01", "Movimentações recentes", "", '<table class="table"><thead><tr><th>Data</th><th>Produto</th><th class="r">Valor</th><th class="r">Status</th></tr></thead><tbody>' + rows + "</tbody></table>");
    return html;
  }

  function kitHtml(k) {
    if (!k) return "";
    return '<div class="kitbox"><div class="mono">Na lista do Kit</div><div class="kitnums"><strong>' + nf.format(k.total) + '</strong><span class="delta up">↑ ' + nf.format(k.novos30d) +
      ' em 30d</span><span class="delta flat">' + nf.format(k.novos7d) + " em 7d</span></div>" +
      (k.recentes.length ? '<details class="sdrop"><summary class="mono">Últimas inscrições</summary><table class="table"><tbody>' + k.recentes.map(function (r) {
        return '<tr><td>' + esc(r.nome || "–") + '</td><td class="muted">' + esc(r.email) + '</td><td class="mono muted r">' + diaMes(r.data) + "</td></tr>";
      }).join("") + "</tbody></table></details>" : "") + '<p class="mono muted" style="font-size:.6rem">' + esc(k.origem) + "</p></div>";
  }

  function landingsHtml(s) {
    var vendas = {};
    (D.faturamento.porProduto || []).forEach(function (p) { vendas[p.nome] = p; });
    var cards = s.landings.map(function (l) {
      var camps = (s.ads.campanhas || []).filter(function (c) { var n = c.nome.toLowerCase(); return (l.campanhas || []).some(function (t) { return n.indexOf(t) >= 0; }); });
      var ativa = camps.filter(function (c) { return c.status === "ativa"; })[0];
      var v = l.produto ? vendas[l.produto] : null;
      var taxa = l.pessoas30d ? (l.conversoes30d / l.pessoas30d * 100).toFixed(1).replace(".", ",") + "%" : "–";
      return '<article class="lcard"><header><div><b>' + esc(l.nome) + '</b><small class="mono">' + esc(l.caminho) + "</small></div>" +
        (ativa ? '<span class="pill live">Anúncio rodando</span>' : (camps.length ? '<span class="pill">Anúncio pausado</span>' : '<span class="pill">Sem anúncio</span>')) + "</header>" +
        '<div class="smetrics">' +
        '<div class="sm"><span class="mono">Visitas</span><strong>' + nf.format(l.visitas30d) + "</strong></div>" +
        '<div class="sm"><span class="mono">' + esc(l.rotulo) + "</span><strong>" + nf.format(l.conversoes30d) + "</strong></div>" +
        '<div class="sm"><span class="mono">Conversão</span><strong>' + taxa + "</strong></div>" +
        '<div class="sm"><span class="mono">Vendas</span><strong>' + (v ? v.qtd + " · " + brl0.format(v.valor) : (l.produto ? "0" : "–")) + "</strong></div></div>" +
        (ativa ? '<p class="sfoot mono">' + esc(ativa.nome) + " · " + brl0.format(ativa.gasto) + " em 30d</p>" : "") +
        kitHtml(s.kit && s.kit[l.nome]) + "</article>";
    }).join("");
    return '<div class="lcards">' + cards + '<article class="lcard novo"><b>Nova landing</b><p class="muted">Adicione em sites.js, em landings, e ela aparece aqui.</p></article></div>';
  }

  function site(slug) {
    var s = D.sites.filter(function (x) { return x.slug === slug; })[0];
    if (!s) return head("Site não encontrado", "", "");
    var html = head(esc(s.nome), esc(s.papel) + ' · <a href="https://' + esc(s.dominio) + '" target="_blank" rel="noopener">' + esc(s.dominio) + " ↗</a>",
      "GA4 " + esc(s.ga) + "<br>" + (s.ads.ativo ? '<span style="color:var(--red)">● Anúncios rodando</span>' : "Sem anúncios ativos"));

    html += '<div class="kpis">' +
      kpi("Visitas ontem", nf.format(s.visitas.ontem), delta(s.visitas.ontem, s.visitas.anterior)) +
      (canal(s, "organico") ? kpi("Orgânico ontem", nf.format(s.visitas.organico.ontem), '<span class="delta flat">' + nf.format(sum(s.visitas.organico.serie)) + " em 14 dias</span>") +
        kpi("Anúncios ontem", nf.format(s.visitas.ads.ontem), '<span class="delta flat">' + nf.format(sum(s.visitas.ads.serie)) + " em 14 dias</span>")
        : kpi("Visitas 14 dias", nf.format(sum(s.visitas.serie)), spark(s.visitas.serie, 140, 26))) +
      kpi(s.conversao ? esc(s.conversao.rotulo) : "Conversões", s.conversao ? nf.format(s.conversao.ontem) : "–", s.conversao ? delta(s.conversao.ontem, s.conversao.anterior) : '<span class="delta flat">nenhuma configurada</span>') +
      kpi("Receita 30 dias", s.receita30d ? brl0.format(s.receita30d) : "–", '<span class="delta flat">Stripe</span>') +
      "</div>";

    html += '<div class="grid-2">' +
      section("01", "Páginas mais vistas", "ontem", barList(s.paginas)) +
      section("02", "De onde vieram", "sessões, ontem", '<div class="boxed">' + barList(s.origens) + "</div>") + "</div>";
    if ((s.landings || []).length) html += section("03", "Landing pages", "30 dias", landingsHtml(s));
    if ((s.paises || []).length) html += section("04", "Países", "pessoas, 7 dias", '<div class="boxed">' + barList(s.paises) + "</div>");

    if (canal(s, "organico")) {
      html += section("03", "Orgânico x anúncios", "sessões por dia, 14 dias", duasSeries(s.visitas.organico.serie, s.visitas.ads.serie));
    }
    html += section(canal(s, "organico") ? "04" : "03", "Páginas recebendo anúncios", "GA4 · 7 dias", tabelaPaginasAds(s.paginasAds, false));

    var ads = s.ads;
    if (!ads.ativo && !ads.campanhas.length) {
      html += section("05", "Anúncios", ads.conta ? esc(ads.conta) : "",
        '<div class="ads-off"><span class="big">Sem anúncios.</span><span>Nenhuma campanha ligada a este site' + (ads.conta ? " na conta " + esc(ads.conta) : "") + ".</span></div>");
      return html;
    }

    var campHtml = ads.campanhas.map(function (c) {
      var top = c.criativos.slice().sort(function (a, b) { return b.resultados - a.resultados; })[0];
      var cards = c.criativos.map(function (cr) {
        var isTop = c.criativos.length > 1 && cr === top;
        return '<article class="creative' + (isTop ? " top" : "") + '">' +
          '<div class="thumb" style="--h:' + (cr.tom || 0) + "" + '">' + imgTag(cr.imagem) + '<span class="fmt mono">' + esc(cr.formato) + '</span><span class="headline">' + esc(cr.titulo) + "</span></div>" +
          '<div class="body"><span class="name">' + (isTop ? '<span class="rank mono">Melhor · </span>' : "") + esc(cr.nome) + "</span><p>" + esc(cr.texto) + "</p>" +
          '<div class="cstats"><div><span>' + brl0.format(cr.gasto) + '</span><span class="mono">gasto</span></div><div><span>' + pct(cr.ctr) +
          '</span><span class="mono">ctr</span></div><div><span>' + nf.format(cr.resultados) + '</span><span class="mono">' + esc(c.rotuloResultado) + "</span></div></div></div></article>";
      }).join("");

      return '<div class="camp reveal"><div class="camp-head"><div><h3>' + esc(c.nome) + '</h3><div class="mono">' + esc(c.objetivo) + " · desde " + dataCurta(c.desde) +
        " · " + diasDesde(c.desde) + " dias" + (c.orcamentoDia ? " · " + brl0.format(c.orcamentoDia) + "/dia" : "") + "</div></div>" + statusPill(c.status) + "</div>" +
        '<div class="camp-stats">' +
        "<div><span class=\"mono\">Gasto</span><strong>" + brl0.format(c.gasto) + "</strong></div>" +
        "<div><span class=\"mono\">Alcance</span><strong>" + nf.format(c.alcance) + "</strong></div>" +
        "<div><span class=\"mono\">Cliques</span><strong>" + nf.format(c.cliques) + "</strong></div>" +
        "<div><span class=\"mono\">CTR</span><strong>" + pct(c.ctr) + "</strong></div>" +
        "<div><span class=\"mono\">CPC</span><strong>" + brl.format(c.cpc) + "</strong></div>" +
        "<div><span class=\"mono\">" + esc(c.rotuloResultado) + "</span><strong>" + nf.format(c.resultados) + "</strong></div></div>" +
        '<div class="section-head"><h2 style="font-size:.9rem">Gasto por dia</h2><span class="mono">últimos ' + c.serieGasto.length + " dias</span></div>" +
        bars(c.serieGasto, { h: 70, tom: "amber", label: "Gasto diário", fmt: brl.format, from: diasDesde(c.desde) < c.serieGasto.length ? dataCurta(c.desde) : c.serieGasto.length + " dias atrás", to: "ontem" }) +
        (c.criativos.length ? '<div class="section-head" style="margin-top:1.8rem"><h2 style="font-size:.9rem">Criativos</h2><span class="mono">' + c.criativos.length + " anúncio(s)</span></div>" +
        '<div class="creatives">' + cards + "</div>" : "") + "</div>";
    }).join("");

    html += section("05", "Anúncios", esc(ads.conta) + " · " + (ads.rodando != null ? ads.rodando : ads.campanhas.filter(function (c) { return c.status === "ativa"; }).length) + " rodando de " + ads.campanhas.length, campHtml);
    return html;
  }

  // ---------- Navegação ----------
  function renderNav(route) {
    var link = function (href, label, dot) {
      return '<a href="' + href + '"' + (route === href ? ' aria-current="page"' : "") + "><span>" + label + "</span>" + (dot || "") + "</a>";
    };
    nav.innerHTML =
      '<div class="nav-group"><span class="mono">Visão geral</span>' + link("#/", "Overview") + link("#/faturamento", "Faturamento") + link("#/redes", "Redes") + "</div>" +
      '<div class="nav-group"><span class="mono">Sites</span>' +
      D.sites.map(function (s) { return link("#/site/" + s.slug, esc(s.nome), '<span class="dot' + (s.ads.ativo ? " live" : "") + '" title="' + (s.ads.ativo ? "Anúncios rodando" : "Sem anúncios") + '"></span>'); }).join("") +
      "</div>";
    sidefoot.innerHTML = (D.demo ? "Modo exemplo<br>" : "") + (D.usuario ? esc(D.usuario) + "<br>" : "") +
      (D.usuario ? '<a href="/api/portal/auth/logout">Sair</a>' : "GA4 · Meta · Stripe");
  }

  function route() {
    var h = location.hash || "#/";
    var html;
    if (h.indexOf("#/site/") === 0) html = site(h.slice(7));
    else if (h === "#/faturamento") html = faturamento();
    else if (h.indexOf("#/redes") === 0) { html = paginaRedes(h.split("/")[2]); h = "#/redes"; }
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
    window.addEventListener("hashchange", route);
    route();
  }

  // ---------- Login ----------
  var ERROS = {
    acesso: "Essa conta Google não tem acesso a este portal.",
    cancelado: "Login cancelado.",
    sessao: "A sessão de login expirou. Tente de novo.",
    google: "O Google não confirmou o login. Tente de novo."
  };
  function login() {
    document.body.classList.add("is-login");
    var erro = new URLSearchParams(location.search).get("erro");
    app.innerHTML = '<section class="login reveal"><span class="brand-mark big" aria-hidden="true"></span>' +
      "<h1>Portal<em>.</em></h1><p class=\"muted\">Área privada.</p>" +
      (erro && ERROS[erro] ? '<p class="login-err mono">' + ERROS[erro] + "</p>" : "") +
      '<a class="btn" href="/api/portal/auth/login">Entrar com Google</a></section>';
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
      app.innerHTML = '<p class="mono muted">Não foi possível carregar o portal. Recarregue a página.</p>';
    });
})();
