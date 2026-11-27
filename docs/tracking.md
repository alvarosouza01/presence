# Tracking where each sale came from

Presence shows the source of every Stripe sale (ad, organic, direct, recurring) and the return per campaign. For that, your landing pages send the visit's UTM to Stripe as `client_reference_id`, in the format `source__medium__campaign__content`. Payment Links accept this parameter in the URL, so no backend is needed.

## 1. Add this script to each landing page

Put it before `</body>`. It keeps the last known UTM for 30 days, so a buyer who clicked an ad and came back later directly still counts for the ad. Mark your Stripe buttons with `data-checkout`.

```html
<a href="https://buy.stripe.com/your-link" data-checkout>Buy</a>

<script>
  (function () {
    var KEY = 'presence_origin';
    var q = new URLSearchParams(location.search);
    var s = q.get('utm_source') || (q.get('fbclid') ? 'meta' : null);
    if (s) {
      try {
        localStorage.setItem(KEY, JSON.stringify({
          s: s, m: q.get('utm_medium') || (q.get('fbclid') ? 'paid' : null),
          c: q.get('utm_campaign'), t: q.get('utm_content'), at: Date.now()
        }));
      } catch (e) {}
    }
    function origin() {
      var clean = function (v) { return String(v || '-').replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 45); };
      var o = null;
      try { o = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
      if (o && Date.now() - o.at > 30 * 864e5) o = null;
      if (!o) return 'direct__-__-__-';
      return [o.s, o.m, o.c, o.t].map(clean).join('__');
    }
    document.querySelectorAll('[data-checkout]').forEach(function (a) {
      a.addEventListener('click', function () {
        var url = new URL(a.href);
        url.searchParams.set('client_reference_id', origin());
        a.href = url.toString();
      });
    });
  })();
</script>
```

## 2. Use UTMs on your links

* **Meta ads:** in each ad, under URL parameters:
  `utm_source=meta&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}`
* **Organic links:** for example `?utm_source=instagram&utm_medium=organic&utm_campaign=launch`, or `utm_source=newsletter&utm_medium=email`.

A sale counts as an ad when its medium is `paid`, `cpc`, `ads` or similar.

## 3. Link campaigns to products

In `sites.js`, each landing page lists words in `campaigns` and the `product` it sells. A Meta campaign whose name contains one of those words is linked to that product in **Return per campaign**.

How revenue is assigned to a campaign:

* **tracked:** sales whose origin carries the campaign name.
* **by product:** an untracked product with `fromAds: true` and a single campaign gets all its revenue.
* **estimated:** an untracked product with several campaigns has its revenue split by spend.

Products without `fromAds` only count the sales that actually came from ads, so organic sales never inflate the ROI.

## Corrections and tests

* `testEmails` in `sites.js`: purchases made with these e-mails are ignored everywhere.
* `manualOrigins`: fix a sale's origin by hand, by its Stripe `payment_intent`.
* `adPayments`: what you paid Meta, to see the out-of-pocket ROI and the balance left at Meta.
