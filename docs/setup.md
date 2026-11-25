# Setup, source by source

Create each variable in Vercel under **Settings > Environment Variables**, marked as **Secret**, in Production. After adding or changing a variable, deploy again (git push or Redeploy): Vercel only reads new variables on the next deploy.

## 1. Google sign-in

1. In the [Google Cloud Console](https://console.cloud.google.com), create a project.
2. **Google Auth Platform > Branding:** app name, your e-mail, home page, privacy policy link (`/privacy`, included) and your domain under Authorised domains.
3. **Audience:** External. Add your e-mail as a test user, or publish the app (needed so the YouTube token does not expire every 7 days).
4. **Clients > Create client > Web application.** Under Authorised redirect URIs add:
   * `https://YOUR-DOMAIN/api/portal/auth/callback`
   * `https://YOUR-DOMAIN/api/portal/auth/youtube-callback` (if you use YouTube)
   * the same two with `http://localhost:3000` to test locally
5. Create `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PORTAL_ALLOWED_EMAIL` and `PORTAL_SESSION_SECRET` (generate it with `openssl rand -hex 32`).

## 2. Google Analytics 4

1. In the same Cloud project, enable the **Google Analytics Data API**.
2. **IAM > Service accounts > Create.** Then under Keys, create a JSON key.
3. In Analytics, **Admin > Account access management:** add the service account e-mail as a **Viewer**.
4. Paste the whole JSON into `GA4_SERVICE_ACCOUNT_JSON`.
5. In `sites.js`, set each site's `propertyId` (number) and `measurementId` (G-…).

To split organic from ads, use UTMs on your ad links (Meta adds them automatically).

## 3. Stripe

1. **Developers > API keys > Create restricted key.** Read access to Charges, Checkout Sessions and Balance.
2. Paste it into `STRIPE_PORTAL_KEY` and set `PORTAL_CURRENCY` (for example `usd`).
3. In `sites.js > products`, link each product to its Payment Links (`plink_…`). Set `fromAds: true` on products you sell with ads.

## 4. Meta Ads and Instagram

1. In [Meta for Developers](https://developers.facebook.com), create a Business app with the **Marketing API** use case. For Instagram, also add **Instagram API** with the `instagram_basic` and `instagram_manage_insights` permissions.
2. In Business Manager, **Settings > System users > Add.** Give it access to the ad account (view performance), the Page and the app.
3. **Generate token:** pick the app, expiry "Never" and the permissions `ads_read`, `pages_show_list`, `pages_read_engagement`, `instagram_basic`, `instagram_manage_insights`.
4. Paste the same token into `META_ACCESS_TOKEN` and `INSTAGRAM_ACCESS_TOKEN`.
5. In `sites.js`, add the ad account number and the Instagram account ID.

## 5. YouTube

1. In Cloud, enable **YouTube Data API v3** and **YouTube Analytics API**.
2. Check that the `/api/portal/auth/youtube-callback` redirect is on the OAuth client (step 1.4).
3. With the portal live and signed in, open `/api/portal/auth/youtube` and pick the account that **owns the channel**. If it has brand accounts, pick the one with the right channel.
4. Copy the token shown into `YOUTUBE_REFRESH_TOKEN`.

## 6. Kit (newsletter and lists)

1. **Kit > Settings > Developer > API keys:** create a v4 key.
2. Paste it into `KIT_API_KEY`.
3. The newsletter shows up under Social. To show a landing page's list, set `kitList` to part of the form or tag name. If it does not match, the portal shows the available names at the top.

## 7. RevenueCat (app subscriptions)

1. **RevenueCat > Project settings > API keys > New secret key.** Pick version **V2** and give it read access to Charts & Metrics (`charts_metrics:overview:read`). For several projects, also give it read access to Projects.
2. Paste it into `REVENUECAT_API_KEY`.
3. Optional: set `REVENUECAT_PROJECT_ID` to show only one project. Without it, every project the key can see shows up on the Revenue page.

Values come in `PORTAL_CURRENCY`. Revenue and new customers cover the last 28 days, as in the RevenueCat overview.
