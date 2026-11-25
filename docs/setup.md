# Configuração, fonte por fonte

Crie cada variável na Vercel em **Settings > Environment Variables**, marcada como **Secret**, em Production. Depois de criar ou mudar uma variável, faça um deploy novo (git push ou Redeploy): a Vercel só lê variáveis novas no deploy seguinte.

## 1. Login com Google

1. No [Google Cloud Console](https://console.cloud.google.com), crie um projeto.
2. **Google Auth Platform > Branding:** nome do app, seu e-mail, home page, link de privacidade (`/privacidade`, já incluído) e o seu domínio em Authorised domains.
3. **Audience:** External. Adicione seu e-mail como test user, ou publique o app (necessário para o YouTube não expirar a cada 7 dias).
4. **Clients > Create client > Web application.** Em Authorised redirect URIs:
   * `https://SEU-DOMINIO/api/portal/auth/callback`
   * `https://SEU-DOMINIO/api/portal/auth/youtube-callback` (se for usar YouTube)
   * as mesmas com `http://localhost:3000` para testar localmente
5. Crie `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PORTAL_ALLOWED_EMAIL` e `PORTAL_SESSION_SECRET` (gere com `openssl rand -hex 32`).

## 2. Google Analytics 4

1. No mesmo projeto do Cloud, ative a **Google Analytics Data API**.
2. **IAM > Service accounts > Create.** Depois, em Keys, crie uma chave JSON.
3. No Analytics, **Admin > Gerenciamento de acesso à conta**: adicione o e-mail da conta de serviço como **Leitor**.
4. Cole o conteúdo inteiro do JSON em `GA4_SERVICE_ACCOUNT_JSON`.
5. Em `sites.js`, coloque o `propertyId` (número) e o `measurementId` (G-…) de cada site.

Para separar orgânico de anúncios, use UTMs nos links dos anúncios (a Meta já marca automaticamente).

## 3. Stripe

1. **Developers > API keys > Create restricted key.** Permissão de leitura em Charges, Checkout Sessions e Balance.
2. Cole em `STRIPE_PORTAL_KEY`.
3. Em `sites.js > produtos`, ligue cada produto aos Payment Links dele (`plink_…`). Marque `viaAnuncios: true` nos produtos vendidos com anúncio.

## 4. Meta Ads e Instagram

1. No [Meta for Developers](https://developers.facebook.com), crie um app do tipo Business com o caso de uso **Marketing API**. Para Instagram, adicione também **Instagram API** com as permissões `instagram_basic` e `instagram_manage_insights`.
2. No Business Manager, **Configurações > Usuários do sistema > Adicionar.** Dê acesso à conta de anúncio (ver desempenho), à Página e ao app.
3. **Gerar token:** escolha o app, validade "Nunca" e as permissões `ads_read`, `pages_show_list`, `pages_read_engagement`, `instagram_basic`, `instagram_manage_insights`.
4. Cole o mesmo token em `META_ACCESS_TOKEN` e `INSTAGRAM_ACCESS_TOKEN`.
5. Em `sites.js`, coloque o número da conta de anúncio e o ID da conta do Instagram.

## 5. YouTube

1. No Cloud, ative **YouTube Data API v3** e **YouTube Analytics API**.
2. Confira o redirect `/api/portal/auth/youtube-callback` no client OAuth (passo 1.4).
3. Com o portal no ar e logado, abra `/api/portal/auth/youtube` e escolha a conta **dona do canal**. Se ela tiver contas de marca, escolha a que tem o canal certo.
4. Copie o token mostrado para `YOUTUBE_REFRESH_TOKEN`.

## 6. Kit (newsletter e listas)

1. **Kit > Settings > Developer > API keys:** crie uma chave v4.
2. Cole em `KIT_API_KEY`.
3. A newsletter aparece em Redes. Para mostrar a lista de uma landing page, coloque em `kit:` um trecho do nome do formulário ou tag. Se o nome não bater, o portal mostra no topo os nomes disponíveis.
