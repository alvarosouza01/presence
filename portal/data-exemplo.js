/* EXAMPLE data. Nothing here is real.
   Used (1) by the API when no source is configured and
   (2) in a local preview without the API. Same shape as /api/portal/data. */

(function () {
  // Builds an N-day series ending yesterday, with a deterministic trend and noise.
  function serie(n, base, amp, seed) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var x = Math.sin((i + seed) * 1.7) * 0.5 + Math.cos((i + seed) * 0.6) * 0.5;
      out.push(Math.max(0, Math.round(base + amp * x + i * (amp / n))));
    }
    return out;
  }

  // Rescales a series so it adds up to a total.
  function escala(a, total) {
    var s = a.reduce(function (x, y) { return x + y; }, 0) || 1;
    return a.map(function (v) { return Math.round((v / s) * total * 100) / 100; });
  }

  var data = {
    demo: true,
    atualizadoEm: "2026-11-24T06:42:00+01:00",
    periodo: "Yesterday",

    faturamento: {
      apps: [{ nome: 'My iOS app', mrr: 1240, receita28d: 1385, assinaturas: 212, trials: 34, novos28d: 486, ativos28d: 3120 }],
      moeda: "USD",
      diario: escala(serie(30, 60, 70, 3), 1106.6), // last 30 days (sum = total by product)
      porProduto: [
        { nome: "Mentoring (subscription)", valor: 400, qtd: 2 },
        { nome: "Ebook", valor: 159.6, qtd: 4, viaAnuncios: true },
        { nome: "Mentoring", valor: 398, qtd: 2 },
        { nome: "Portfolio review", valor: 149, qtd: 1 }
      ],
      hoje: { valor: 97, qtd: 1 },
      recentes: [
        { data: "Today", hoje: true, produto: "Mentoring", valor: 97, status: "paid", origem: { tipo: "ads", rotulo: "Ad · meta", campanha: "EBOOK---Sales---Test-1" } },
        { data: "23 Nov", produto: "Ebook", valor: 39.9, status: "refunded", origem: { tipo: "organico", rotulo: "Organic · newsletter", campanha: "launch" } },
        { data: "22 Nov", produto: "Mentoring", valor: 199, status: "paid", origem: { tipo: "organico", rotulo: "Organic · instagram", campanha: null } },
        { data: "20 Nov", produto: "Ebook", valor: 39.9, status: "paid", origem: { tipo: "ads", rotulo: "Ad · meta", campanha: "EBOOK---Sales---Test-1" } },
        { data: "18 Nov", produto: "Portfolio review", valor: 149, status: "paid", origem: { tipo: "direto", rotulo: "Direct" } },
        { data: "16 Nov", produto: "Mentoring (subscription)", valor: 200, status: "paid", origem: { tipo: "recorrente", rotulo: "Recurring" } },
        { data: "15 Nov", produto: "Mentoring (subscription)", valor: 200, status: "failed", origem: { tipo: "recorrente", rotulo: "Recurring" } },
        { data: "11 Nov", produto: "Ebook", valor: 39.9, status: "paid", origem: { tipo: "sem", rotulo: "Not tracked" } }
      ],
      investimentoMeta: { desde: "2026-11-01", investido: 400, gasto: 312.4, saldo: 87.6, pagamentos: [
        { data: "2026-11-01", valor: 250, nota: "Card" }, { data: "2026-11-18", valor: 150, nota: "Card" }] },
      aCaminho: 419.2,
      falhas30d: 3,
      reembolsos30d: 39.9,
      gastoAds30d: 312.4
    },

    redes: {
      youtube: {
        canal: "My channel", url: "https://www.youtube.com/",
        inscritos: 12840, viewsTotal: 486200, videos: 74,
        dias: [], serie: { ganhos: serie(28, 14, 9, 2), perdidos: serie(28, 3, 2, 6), views: serie(28, 900, 500, 4), minutos: [] },
        novos28: 402, perdidos28: 88, views28: 26120, analyticsOk: true,
        ultimosVideos: [
          { titulo: "5 common mistakes", data: "2026-11-20", views: 3820, likes: 311, comentarios: 46, thumb: null, url: "#" },
          { titulo: "How I review a portfolio in 30 seconds", data: "2026-11-12", views: 2210, likes: 180, comentarios: 22, thumb: null, url: "#" },
          { titulo: "How I built my portfolio", data: "2026-11-03", views: 6110, likes: 540, comentarios: 81, thumb: null, url: "#" }
        ]
      },
      instagram: [{
        usuario: "@yourprofile", nome: "Your Name", url: "https://www.instagram.com/", foto: null,
        seguidores: 23410, seguindo: 610, posts: 412, dias: [], serieNovos: serie(30, 22, 15, 8),
        novos30: 684, perdidos30: 141, alcanceOntem: 9120, visitasPerfilOntem: 388,
        ultimosPosts: [
          { tipo: "Carousel", legenda: "5 mistakes that make your portfolio generic", data: "2026-11-22", curtidas: 1240, comentarios: 63, thumb: null, url: "#" },
          { tipo: "Reels", legenda: "Before and after: a portfolio rebuilt in a weekend", data: "2026-11-19", curtidas: 2810, comentarios: 142, thumb: null, url: "#" },
          { tipo: "Photo", legenda: "Behind the scenes", data: "2026-11-15", curtidas: 690, comentarios: 18, thumb: null, url: "#" }
        ]
      }]
    },

    sites: [
      {
        slug: "mysite",
        nome: "mysite.com",
        dominio: "www.mysite.com",
        papel: "Portfolio, course and ebook",
        ga: "G-XXXXXXXXXX",
        visitas: { ontem: 9, anterior: 6, serie: serie(14, 9, 7, 1) },
        conversao: { rotulo: "Waitlist sign-ups", ontem: 2, anterior: 1 },
        paginas: [["/", 3], ["/course", 2], ["/contact.html", 1], ["/project-1", 1], ["/about", 1], ["/work.html", 1]],
        origens: [["(direct) / (none)", 4], ["instagram / organic", 2], ["myapp.com / referral", 1], ["google / organic", 1]],
        receita30d: 708.6,
        ads: {
          ativo: true,
          conta: "My account",
          campanhas: [
            {
              nome: "EBOOK | Sales | Test 1",
              status: "ativa",
              objetivo: "Sales",
              desde: "2026-11-23",
              orcamentoDia: 30,
              gasto: 212.4, impressoes: 18430, alcance: 11920, cliques: 402,
              ctr: 2.18, cpc: 0.53, resultados: 31, rotuloResultado: "purchases",
              serieGasto: serie(2, 28, 3, 4),
              criativos: [
                { nome: "Video 30s | portfolio that looks the same", formato: "Reels 9:16", titulo: "Does your portfolio look like everyone else's?", texto: "I rebuilt mine in a weekend.", gasto: 98.2, ctr: 2.9, resultados: 17, tom: 8 },
                { nome: "Carousel | before and after", formato: "Carousel 4:5", titulo: "Before: a site builder. After: your own code.", texto: "Same designer, different result.", gasto: 71.5, ctr: 1.9, resultados: 9, tom: 210 },
                { nome: "Static | waitlist", formato: "Feed 1:1", titulo: "Join the list", texto: "Limited seats.", gasto: 42.7, ctr: 1.4, resultados: 5, tom: 30 }
              ]
            },
            {
              nome: "Ebook | Sales | Retargeting",
              status: "pausada",
              objetivo: "Sales",
              desde: "2026-10-28",
              orcamentoDia: 10,
              gasto: 100, impressoes: 6210, alcance: 2840, cliques: 96,
              ctr: 1.55, cpc: 1.04, resultados: 3, rotuloResultado: "purchases",
              serieGasto: serie(12, 9, 4, 9),
              criativos: [
                { nome: "Static | ebook cover", formato: "Feed 4:5", titulo: "6 chapters to break into UX", texto: "$39. Instant access.", gasto: 100, ctr: 1.55, resultados: 3, tom: 350 }
              ]
            }
          ]
        }
      },
      {
        slug: "mentoria",
        nome: "Mentoring",
        dominio: "www.mentoring.com",
        papel: "Paid portfolio reviews",
        ga: "G-XXXXXXXXXX",
        visitas: { ontem: 14, anterior: 3, serie: serie(14, 6, 6, 5) },
        conversao: { rotulo: "Checkouts started", ontem: 2, anterior: 0 },
        paginas: [["/", 9], ["/br", 4], ["/thanks", 1]],
        origens: [["(direct) / (none)", 7], ["linkedin / social", 4], ["google / organic", 3]],
        receita30d: 398,
        ads: { ativo: false, conta: "New account", campanhas: [] }
      },
      {
        slug: "app",
        nome: "myapp.com",
        dominio: "myapp.com",
        papel: "App landing page",
        ga: "G-XXXXXXXXXX",
        visitas: { ontem: 5, anterior: 4, serie: serie(14, 4, 3, 2) },
        conversao: null,
        paginas: [["/", 4], ["/stack.html", 1]],
        origens: [["(direct) / (none)", 3], ["mysite.com / referral", 2]],
        receita30d: 0,
        ads: { ativo: false, conta: null, campanhas: [] }
      },
      {
        slug: "blog",
        nome: "Blog",
        dominio: "blog.mysite.com",
        papel: "Personal blog",
        ga: "G-XXXXXXXXXX",
        visitas: { ontem: 41, anterior: 37, serie: serie(14, 35, 12, 7) },
        conversao: null,
        paginas: [["/", 18], ["/pokemon/pikachu", 6], ["/pokemon/charizard", 5], ["/pokemon/mew", 3]],
        origens: [["google / organic", 22], ["(direct) / (none)", 12], ["reddit / referral", 7]],
        receita30d: 0,
        ads: { ativo: false, conta: null, campanhas: [] }
      },
      {
        slug: "store",
        nome: "store.com",
        dominio: "store.com",
        papel: "Online store",
        ga: "G-XXXXXXXXXX",
        visitas: { ontem: 12, anterior: 15, serie: serie(14, 13, 5, 11) },
        conversao: { rotulo: "App Store clicks", ontem: 3, anterior: 5 },
        paginas: [["/", 10], ["/privacy.html", 1], ["/support.html", 1]],
        origens: [["(direct) / (none)", 6], ["instagram / organic", 4], ["google / organic", 2]],
        receita30d: 0,
        ads: { ativo: false, conta: null, campanhas: [] }
      }
    ]
  };

  // Organic vs ads: splits each site's visits (sites with ads get ~35% paid).
  var paginasAds = {
    mysite: [
      { pagina: "/ebook", campanha: "EBOOK | Sales | Test 1", origem: "ig", sessoes: 46, conversoes: 3 },
      { pagina: "/ebook", campanha: "EBOOK | Sales | Test 1", origem: "facebook", sessoes: 21, conversoes: 1 },
      { pagina: "/", campanha: null, origem: "facebook", sessoes: 4, conversoes: 0 }
    ]
  };
  data.sites.forEach(function (s) {
    var parte = s.ads.ativo ? 0.35 : 0;
    var n = s.visitas.serie.length;
    s.visitas.serie[n - 1] = s.visitas.ontem; s.visitas.serie[n - 2] = s.visitas.anterior;
    var ads = s.visitas.serie.map(function (v, i) { return i >= n - 2 || i > 6 ? Math.round(v * parte) : 0; });
    var org = s.visitas.serie.map(function (v, i) { return v - ads[i]; });
    s.visitas.organico = { ontem: org[n - 1], anterior: org[n - 2], serie: org };
    s.visitas.ads = { ontem: ads[n - 1], anterior: ads[n - 2], serie: ads };
    s.paginasAds = paginasAds[s.slug] || [];
  });

  // Long revenue series, countries and landing pages.
  (function () {
    var f = data.faturamento, hoje = new Date(), d180 = [];
    for (var i = 180; i >= 1; i--) { var dt = new Date(hoje.getTime() - i * 864e5); d180.push(dt.toISOString().slice(0, 10)); }
    f.dias180 = d180;
    f.diario180 = serie(150, 18, 16, 3).concat(f.diario);
    f.receita30d = f.diario.reduce(function (a, b) { return a + b; }, 0);
    f.receitaAnterior30d = Math.round(f.receita30d * 0.82);
    f.receitaAds30d = 119.7; f.receitaAdsAnterior30d = 39.9;
    f.receitaOrganica30d = f.receita30d - f.receitaAds30d;
    f.disponivel = 0;
    var paises = [["Brazil", 61], ["Portugal", 9], ["Switzerland", 6], ["United States", 4], ["Spain", 3]];
    data.sites.forEach(function (s, k) {
      s.visitas.dias = d180.slice(-s.visitas.serie.length);
      s.paises = paises.map(function (p) { return [p[0], Math.max(1, Math.round(p[1] / (k + 1)))]; });
    });
    data.sites[0].landings = [
      { nome: "Course", caminho: "/course", produto: null, campanhas: ["course"], visitas30d: 412, pessoas30d: 350, conversoes30d: 38, rotulo: "Sign-ups" },
      { nome: "Ebook", caminho: "/ebook", produto: "Ebook", campanhas: ["ebook", "e-book", "ebook"], visitas30d: 690, pessoas30d: 588, conversoes30d: 21, rotulo: "Checkouts started" }
    ];
    data.redes.newsletter = { nome: "Newsletter", url: null, inscritos: 5240, novos30d: 212, novosAnterior30d: 180, novos7d: 41,
      envios: [{ assunto: "3 portfolios that get hired", data: "2026-11-20", enviados: 5180, abertura: 41.2, cliques: 3.8, descadastros: 6 },
               { assunto: "What I look at in 30 seconds", data: "2026-11-13", enviados: 5120, abertura: 38.7, cliques: 2.9, descadastros: 9 }] };
    (data.redes.instagram || []).forEach(function (ig) { ig.ultimosPosts.forEach(function (p, i) { p.novosSeguidores = [12, 31, 4][i] || 0; p.alcance = [8200, 19400, 3100][i] || 0; }); });
  })();

  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else window.PORTAL_DEMO = data;
})();
