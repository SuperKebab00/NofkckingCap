# No Cap Barber Shop (Demo Statico)

Demo e-commerce statico, pronta per Cloudflare Pages, con fallback locale completo (`localStorage`/`sessionStorage`).

## Avvio locale

```bash
python3 -m http.server 5173
```

oppure:

```bash
npx serve .
```

Apri: `http://localhost:5173` (o la porta indicata).

## Deploy Cloudflare Pages

1. Push del repository su GitHub/GitLab.
2. Crea progetto in Cloudflare Pages.
3. Build command: vuoto.
4. Output directory: `/`.
5. Deploy.

## Modalità demo

- Dati prodotti/stock/cart/ordini/lead/tagli salvati localmente.
- Checkout è dimostrativo (nessun pagamento reale).
- Login admin demo locale (non sicuro).

## Configurazione

File: `js/config.js`

- `DATA_PROVIDER = "local"`: usa solo locale.
- `DATA_PROVIDER = "supabase"`: tenta Supabase, fallback locale se non configurato.
- `SUPABASE_URL` e `SUPABASE_ANON_KEY`: solo chiavi pubbliche.

Non inserire mai service role key nel frontend.

## Collegamento futuro Supabase

1. Crea progetto Supabase.
2. Imposta in `js/config.js`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `DATA_PROVIDER = "supabase"`
3. Abilita bucket Storage:
   - `products`
   - `cuts`
4. Configura RLS e policy per admin/auth.

## Parti pronte per produzione (base)

- Data layer async (`js/repository.js`)
- Config centralizzata (`js/config.js`)
- Client Supabase opzionale (`js/supabase-client.js`)
- Checkout flow con oggetto ordine
- Lead capture con consenso privacy
- Banner cookie + preferenze consenso (necessari / analytics / marketing)

## Cookie & privacy per produzione

1. Aggiorna testi legali in `#privacy` e `#cookie` con:
   - titolare trattamento
   - base giuridica
   - tempi conservazione
   - fornitori terzi reali
2. Configura in `js/config.js`:
   - `COOKIE_POLICY_VERSION` (incrementa a ogni update policy)
   - `COOKIE_CONSENT_MAX_AGE_DAYS` (es. 180)
   - `LEGAL_PRIVACY_EMAIL`
3. Carica script analytics/marketing solo dopo consenso (`window.NoCapConsent.canUse("analytics" | "marketing")`).
4. Mantieni bloccati i cookie non necessari finché non arriva opt-in.
5. Verifica conformità GDPR/ePrivacy con consulente legale prima del go-live.

## Da completare per produzione reale

1. Autenticazione admin vera con Supabase Auth.
2. API serverless (Edge Functions / Pages Functions) per ordini e lead.
3. Pagamenti Stripe Checkout.
4. Email transazionali (Resend/Brevo/serverless).
5. Logging/error tracking e test E2E.
