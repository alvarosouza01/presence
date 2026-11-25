# Minha presença online

Um portal privado que junta, numa tela só, tudo o que acontece na sua vida online: visitas dos seus sites, vendas, anúncios, redes sociais e newsletter.

*A private dashboard for your whole online presence: sites, sales, ads, social and newsletter. Static front end plus serverless functions on Vercel, no dependencies, no database.*


## O que ele mostra

* **Visão geral:** visitas de ontem de cada site (orgânico x anúncios), receita orgânica, receita via anúncios, gasto e retorno dos anúncios.
* **Cada site:** páginas mais vistas, origem das visitas, países, landing pages com conversão e campanhas com criativos.
* **Faturamento:** receita por dia, semana ou mês, comparação com os 30 dias anteriores, vendas por produto e saldo a liberar no Stripe.
* **Redes:** YouTube (inscritos, vídeos), Instagram (seguidores, posts, seguidores por post) e newsletter do Kit (inscritos, aberturas).

Cada fonte é opcional: o portal liga só o que tiver chave configurada. Sem nenhuma, ele abre com dados de exemplo para você ver o visual.

| Fonte | O que traz | Variável |
|---|---|---|
| Google Analytics 4 | visitas, páginas, origens, países, conversões | `GA4_SERVICE_ACCOUNT_JSON` |
| Stripe | vendas, produtos, reembolsos, saldo | `STRIPE_PORTAL_KEY` |
| Meta Ads | campanhas, gasto, resultados, criativos | `META_ACCESS_TOKEN` |
| Instagram | seguidores, alcance, posts | `INSTAGRAM_ACCESS_TOKEN` |
| YouTube | inscritos, views, vídeos | `YOUTUBE_REFRESH_TOKEN` |
| Kit | newsletter e listas das landing pages | `KIT_API_KEY` |

## Começar em 10 minutos

1. **Use este repositório como template** (botão "Use this template" no GitHub) ou faça um fork.
2. **Importe na Vercel:** New Project, escolha o repositório. Não precisa de build.
3. **Configure o login com Google** (passo a passo em [docs/setup.md](docs/setup.md#1-login-com-google)) e crie as 4 variáveis de login.
4. **Edite `api/portal/_lib/sites.js`** com seus sites, produtos e redes. É o único arquivo de configuração.
5. **Ligue as fontes que quiser**, uma de cada vez, seguindo [docs/setup.md](docs/setup.md).
6. Abra `seudominio.com/portal`.

Para ver localmente: `npx vercel dev` e abra `http://localhost:3000/portal/`. Sem fontes configuradas, aparecem os dados de exemplo.

## Segurança

* Só os e-mails em `PORTAL_ALLOWED_EMAIL` entram. A sessão fica num cookie assinado, HttpOnly.
* Todas as chaves pedidas são **só de leitura**. Nenhuma fica no código: vão nas variáveis da Vercel.
* O portal não aparece no Google (`noindex` e `robots.txt`).
* Nunca faça commit de `.env`. O `.gitignore` já ignora.

## Plugar algo novo

* **Site, produto ou landing page:** edite `sites.js`.
* **Fonte nova** (Search Console, App Store, TikTok…): crie `api/portal/_lib/sources/<nome>.js` com o contrato descrito em [docs/arquitetura.md](docs/arquitetura.md) e adicione em `build.js`.

## Licença

MIT. Feito por [Álvaro Souza](https://www.alvarosouza.com).
