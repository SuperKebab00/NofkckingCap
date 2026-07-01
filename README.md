# No Cap Barber Shop

Frontend statico ecommerce per barber shop con Supabase e Cloudflare Pages Functions. Il flusso prioritario attuale e' `in-shop`; PayPal e Stripe sono presenti nel codice come supporti opzionali/futuri, ma non vanno considerati attivi o production-ready finche' provider ed env non sono configurati.

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

## Database e script SQL

Lo schema Supabase reale attuale e il modello RLS sono documentati in `DATABASE.md`. Considera quel file la fonte documentale corrente per tabelle, colonne, letture pubbliche, inserimenti backend-only e modello admin.

La cartella `sql/` non fa parte del working tree attuale. Se trovi riferimenti a `sql/` in note o task precedenti, trattali come script operativi esterni/storici da lanciare manualmente su Supabase, non come una cartella richiesta da questo repo nello stato corrente.

Non aggiungere migrations o script SQL al repo senza una richiesta esplicita e senza prima verificare lo schema reale contro `DATABASE.md`.

Eventuali miglioramenti futuri, come `admin_users`, eventi webhook/idempotenza o stock reservation, sono da considerare proposte documentate e non parte garantita dello schema attuale.

## Pagamenti

Stato attuale: `in-shop` e' il flusso principale. PayPal e Stripe richiedono configurazione provider, env server-side e test sandbox prima dell'attivazione reale.

Stripe:

- configura il webhook verso `/api/stripe/webhook`;
- usa `STRIPE_WEBHOOK_SECRET`;
- considera il webhook firmato fonte primaria dello stato pagamento;
- la verify client-side serve solo a riconciliare UX dopo il redirect.
- il codice webhook puo' usare `payment_events` per idempotenza, ma questa tabella non fa parte dello schema reale documentato in `DATABASE.md`.

PayPal:

- la capture avviene server-side;
- `PayPal-Request-Id` usa l'order id PayPal per ridurre duplicati;
- per produzione aggiungi webhook PayPal o riconciliazione operativa giornaliera.

Prima di vendere online con pagamento immediato, verifica in sandbox provider, idempotenza webhook/capture e comportamento stock sul progetto Supabase reale.

## Stock e reservation

Il backend verifica stock durante la canonicalizzazione ordine e ricalcola prezzi, subtotal, shipping, total e status lato server.

La mutazione o reservation stock dipende dal comportamento reale del database Supabase, inclusi eventuali trigger collegati a `orders.inventory_reserved`. Questa logica non e' completamente descritta nel repo attuale. Prima di abilitare pagamenti online immediati, verifica e documenta i trigger stock o una strategia equivalente di reservation.

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
- PayPal/Stripe sono abilitati solo dopo env provider, sandbox test e idempotenza verificata.
- Stripe webhook firma correttamente e riceve `checkout.session.completed`, con tabella/event store idempotenza verificato se usato.
- PayPal e' in `live` solo dopo test sandbox e procedura webhook/riconciliazione.
- Trigger/reservation stock sono verificati sul DB reale prima di accettare pagamenti online immediati.
- Turnstile è configurato per contact e checkout, oppure il rischio spam è accettato.
- Lo schema e le RLS corrispondono a quanto documentato in `DATABASE.md`.
- Le policy admin/storage sono verificate sul progetto Supabase reale.
- Eventuali script SQL operativi esterni sono stati applicati manualmente e documentati.
- Test manuale: contatto, checkout in sede, checkout PayPal, checkout Stripe, ordine duplicato/webhook duplicato.
- Privacy Policy, Cookie Policy, ragione sociale e contatti legali sono completati.
