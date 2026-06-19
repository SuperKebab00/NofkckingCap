# No Cap Barber Shop

Frontend statico ecommerce per barber shop con Supabase, Cloudflare Pages Functions, PayPal e Stripe opzionali.

## Avvio locale

Per sola UI statica:

```bash
python -m http.server 5173
```

Per test reale con Pages Functions:

```bash
npx wrangler pages dev . --local
```

Copia `.dev.vars.example` in `.dev.vars` e inserisci solo valori locali. `.dev.vars` non deve mai essere committato.

## Variabili ambiente

Frontend-safe:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `PUBLIC_SITE_URL`
- `PUBLIC_STRIPE_PUBLISHABLE_KEY` se usato
- `PUBLIC_PAYPAL_CLIENT_ID` se usato

Server-side Cloudflare only:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_ENV` (`sandbox` o `live`)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `TURNSTILE_SECRET_KEY` opzionale
- `APP_ENV=production` in produzione
- `RATE_LIMIT_KV` opzionale come binding KV per rate limit condiviso

Non inserire mai service role key, Stripe secret, PayPal secret o webhook secret in `index.html`, `app.js`, `js/*`, `_headers` o file pubblici.

## Sicurezza API

Le Functions pubbliche accettano solo `POST` JSON con payload limitato, rate limit best-effort, errori client-safe e Turnstile opzionale:

- `/api/contact/create`
- `/api/checkout/create`
- `/api/checkout/capture`
- `/api/checkout/stripe/verify`
- `/api/stripe/webhook`

Il checkout server-side ricalcola prodotti, prezzi, stock, spedizione, totale e status da Supabase. Il client invia solo dati cliente, fulfillment, payment mode, product id e quantity.

## SQL e ordine migration

Applica in questo ordine:

1. `sql/2026-06-18-seed-products-catalog.sql` se parti da DB vuoto.
2. `sql/2026-06-18-order-status-normalization.sql`
3. `sql/2026-06-18-order-status-stock-flow.sql`
4. `sql/2026-06-18-admin-policies-template.sql`
5. `sql/2026-06-18-close-public-order-lead-inserts.sql` solo dopo deploy Functions funzionante.
6. `sql/2026-06-19-security-hardening.sql`

Dopo la migration di hardening, inserisci gli admin:

```sql
insert into public.admin_users (user_id, role)
values ('UUID_AUTH_USER_ADMIN', 'owner')
on conflict (user_id) do update set role = excluded.role;
```

La migration `2026-06-19-security-hardening.sql` aggiunge `admin_users`, ID pagamento, tabella idempotenza `payment_events`, reservation expiry sugli ordini online e funzione `expire_stock_reservations()`.

Esegui periodicamente:

```sql
select public.expire_stock_reservations();
```

Puoi schedularla con Supabase cron o con un job Cloudflare protetto.

## Pagamenti

Stripe:

- configura il webhook verso `/api/stripe/webhook`;
- usa `STRIPE_WEBHOOK_SECRET`;
- considera il webhook firmato fonte primaria dello stato pagamento;
- la verify client-side serve solo a riconciliare UX dopo il redirect.

PayPal:

- la capture avviene server-side;
- `PayPal-Request-Id` usa l'order id PayPal per ridurre duplicati;
- per produzione aggiungi webhook PayPal o riconciliazione operativa giornaliera.

## Delivery zip pulito

Genera un pacchetto senza `.git`, `.wrangler`, `.dev.vars`, log e zip precedenti:

```powershell
.\scripts\make-delivery-zip.ps1
```

Output: `delivery/no-cap-clean.zip`.

## Smoke test

```bash
node tests/security-smoke-tests.mjs
```

Controlla ignore file, placeholder env e uso degli helper sicuri nelle Functions.

## Checklist rotazione secret

Esegui questa checklist se un secret è stato esposto o copiato in un file pubblico:

- ruota `SUPABASE_SERVICE_ROLE_KEY`;
- ruota `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`;
- ruota `PAYPAL_CLIENT_SECRET`;
- ruota `TURNSTILE_SECRET_KEY` se configurata;
- invalida eventuali token locali in `.dev.vars`;
- controlla deploy history e zip consegnati;
- ridistribuisci Cloudflare Pages con i nuovi secret.

## Checklist pre go-live

- `.dev.vars`, `.env`, `.wrangler`, `.git`, log e zip non sono nel pacchetto.
- Cloudflare env contiene solo secret server-side.
- `APP_ENV=production` è impostato in Cloudflare.
- Stripe webhook firma correttamente e riceve `checkout.session.completed`.
- PayPal è in `live` solo dopo test sandbox.
- Turnstile è configurato per contact e checkout, oppure il rischio spam è accettato.
- `admin_users` contiene solo account autorizzati.
- RLS e storage policy sono applicate.
- `expire_stock_reservations()` è schedulata.
- Test manuale: contatto, checkout in sede, checkout PayPal, checkout Stripe, ordine duplicato/webhook duplicato.
- Privacy Policy, Cookie Policy, ragione sociale e contatti legali sono completati.
