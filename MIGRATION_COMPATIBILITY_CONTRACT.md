# Migration Compatibility Contract

## 1. Scopo

Questo documento definisce i contratti da preservare durante una migrazione graduale verso Next.js.

La strategia consigliata e creare una `next-app/` parallela, senza migrare subito in root e senza riscrivere tutto in una volta. Ogni step di migrazione deve mantenere compatibili checkout, Supabase, Cloudflare Pages Functions, asset, CSP e UX esistente.

## 2. Endpoint/API da preservare

Endpoint attuali da mantenere compatibili:

- `/api/contact/create`
- `/api/checkout/create`
- `/api/checkout/capture`
- `/api/checkout/stripe/verify`
- `/api/stripe/webhook`

Il flusso reale prioritario attuale e `/api/checkout/create` con `paymentMode: "in-shop"`.

PayPal e Stripe esistono nel codice come supporti opzionali/futuri, ma non devono diventare parte del flusso attivo durante la migrazione senza un task esplicito.

## 3. Env Var Pubbliche/Private

Config pubblica client attuale:

- Supabase URL pubblico.
- Supabase anon key pubblica.

Env private/server da preservare:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PUBLIC_SITE_URL`
- `APP_ENV`

Env future opzionali per PayPal:

- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_ENV`

Env future opzionali per Stripe:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Regola critica: `SUPABASE_SERVICE_ROLE_KEY` e ogni secret server-side non devono mai finire in client config, React component, browser bundle, pagina statica o output pubblico.

## 4. Asset Path Critici

Asset da preservare:

- `Img/`
- immagini prodotti;
- immagini cuts/showcase;
- immagini brand/logo;
- immagini wallpaper e contenuti visuali esistenti.

In Next.js usare una compatibilita equivalente, per esempio `public/Img/...`, mantenendo path visuali e riferimenti coerenti con l'app attuale. Non rompere URL, alt text, preview social o immagini usate dal catalogo.

## 5. Payment Modes

Payment mode attivo:

- `in-shop`

Payment mode futuri/opzionali:

- `paypal`
- `stripe`

Regola: non riattivare PayPal o Stripe durante la migrazione senza una richiesta esplicita e senza env provider, test sandbox, idempotenza e stock behavior verificati.

## 6. Order Status Da Preservare

Status da mantenere compatibili:

- `draft`
- `prenotato`
- `pending-payment`
- `pagato`
- `annullato`

Preservare anche eventuali alias o fallback gia gestiti dai domain helpers. La migrazione non deve cambiare significato operativo degli status.

## 7. Checkout Payload Invariant

Il frontend deve inviare solo questa shape:

```js
{
  customer: {
    fullName,
    email,
    phone
  },
  fulfillment,
  shippingAddress,
  items,
  paymentMode
}
```

Regole:

- `items` contiene solo oggetti `{ productId, quantity }`.
- `shippingAddress` esiste solo quando il fulfillment richiede spedizione.
- Il frontend non invia mai prezzi, total, subtotal, shipping, status, productName o lineTotal.
- Il server resta fonte di verita per prezzi, stock, subtotal, shipping, total, status, order rows e inventory behavior.

## 8. Routing/UX Attuale Da Mappare

Il progetto attuale usa hash routing e sezioni/pagine nello stesso documento HTML. La migrazione deve mappare con attenzione:

- home;
- shop;
- checkout;
- admin;
- success/ordine completato;
- contact/support;
- privacy policy;
- cookie policy;
- eventuali alias hash gia presenti.

Admin deve essere migrato tardi, dopo aver stabilizzato layout pubblico, catalogo e checkout. Admin contiene auth, Supabase, storage, mutazioni e workflow operativi piu rischiosi.

## 9. CSS/CSP/Headers

Preservare `_headers` o un equivalente del target hosting:

- CSP;
- frame policy;
- referrer policy;
- permissions policy;
- HSTS;
- cache headers per HTML, JS, CSS e asset.

Non allargare CSP senza motivo documentato. Se Next.js richiede script, style o connect source aggiuntivi, ogni modifica deve essere esplicita e verificata.

Il CSS globale puo essere copiato inizialmente per ridurre regressioni visive. La separazione in CSS modules o component styles puo avvenire dopo, in step piccoli e confrontabili.

## 10. Checklist Manuale Regressione

Prima di considerare valido uno step di migrazione, verificare:

- homepage;
- shop/catalogo;
- categorie;
- carrello;
- checkout `in-shop`;
- creazione ordine Supabase;
- admin ordini/prodotti/leads;
- contact form;
- cookie consent;
- headers/CSP.

## 11. Go/No-Go Per Creare `next-app/`

Go:

- test locali passano;
- branch dedicato creato;
- questo contratto esiste nel repo;
- `in-shop` resta il solo metodo pagamento attivo;
- working tree pulito o modifiche attese e documentate.

No-go:

- working tree sporco con modifiche non comprese;
- PayPal/Stripe risultano riattivati per errore;
- endpoint `/api/*` non sono stati mappati;
- env private/server non sono separate chiaramente da config pubblica;
- asset path `Img/` non hanno una strategia di compatibilita;
- checkout/admin non hanno criteri manuali di regressione.
