# PROD-ready CRUD audit

## 1. Executive summary

Il progetto e in uno stato ibrido:

- `sorgente/` vanilla contiene una single page con logiche CRUD quasi complete lato browser: prodotti, inventario, categorie shop, ordini, lead, upload immagini, admin auth e gestione stati.
- Il vanilla e configurato per Supabase (`DATA_PROVIDER: "supabase"`) ma mantiene fallback localStorage per molti flussi.
- `destinazione/next-prod/` e piu prudente: Shop legge dati pubblici Supabase se disponibili, Contact scrive su API/Supabase, Admin ha CRUD progressivi, Checkout ora crea ordini tramite API server-side e mantiene localStorage solo come cart/history locale.
- Il Next attuale non ha ancora CRUD admin prod-ready: non esistono API di create/update/delete prodotto, ordine, categoria o contenuto shop.
- La parte piu vicina a prod-ready e Contact: validazione client/server, honeypot, rate limit locale, Turnstile opzionale, scrittura server-side su `leads`.
- La parte piu rischiosa e admin/auth/data writes: ci sono service-role server helper e login client Supabase, ma l'area resta read-only e non ha ancora una strategia completa di RLS, audit, autorizzazione per write e idempotenza.

Gia prod-ready o quasi:

- API `POST /api/contact/create`, con validazioni, rate limit, honeypot e Supabase server-side.
- Letture pubbliche Shop da Supabase REST con anon key e fallback statico.
- Verifica admin JWT server-side contro JWKS Supabase e tabella `admin_users`, almeno come check.

Mock/local/static:

- Checkout Next: carrello localStorage, prodotti statici `productTeasers`, creazione ordine via `POST /api/orders/create`.
- Cart count Next: localStorage.
- Admin Next: read-only/status, pannelli "future actions", nessun CRUD.
- Molte sezioni editoriali/home/showcase/fresh cut: statiche o preview.

Rischioso/non pronto:

- Vanilla espone Supabase anon key e fa anche write dal browser; richiede RLS molto rigorosa per non essere pericoloso.
- Next usa `SUPABASE_SERVICE_ROLE_KEY` via helper server: corretto solo server-side, ma qualsiasi futura API write deve essere protetta con auth admin reale, rate limit e validazioni schema.
- Admin login client chiama Supabase Auth password grant e poi `/api/admin/auth/check`; non persiste una sessione robusta server-side.
- Mancano schema/migration SQL, policy RLS documentate e test end-to-end per CRUD.

## 2. Mappa flussi dati vanilla

### Products

- File: `sorgente/js/data.js`, `sorgente/js/repository.js`, `sorgente/js/render.js`, `sorgente/app.js`.
- Lettura: `getProducts()` prova Supabase `products` se `DATA_PROVIDER === "supabase"`, poi fallback localStorage `no-cap-products-v1`, poi array statico `products`.
- Scrittura/update: `saveProducts()` fa `upsert` su `products` se Supabase disponibile e salva sempre localStorage.
- Delete: `deleteSelectedProduct()` filtra l'array prodotti, aggiorna inventario/carrello, poi `saveProducts()` e `saveInventory()`.
- Stato: parzialmente prod, ma client-side e dipendente da RLS.

### Cart

- File: `sorgente/js/repository.js`, `sorgente/js/render.js`, `sorgente/app.js`.
- Storage: localStorage key `no-cap-cart-v2`.
- Lettura/scrittura: `getCart()`, `saveCart()`, `clearCart()`.
- Nessun Supabase.
- Stato: local-only, adatto a cart anonimo.

### Checkout

- File: `sorgente/index.html`, `sorgente/app.js`, `sorgente/js/render.js`, `sorgente/js/repository.js`.
- Form: `data-checkout-form`, campi customer, fulfillment, shipping, paymentMode.
- Validazione: `validateCheckout()`.
- Payload: `buildOrderPayload()`.
- Submit: `submitCheckout()` chiama `createOrder()`, `clearCart()`, aggiorna `state.orders`, mostra success.
- Supabase: `createOrder()` puo inserire in `orders` e `order_items` se Supabase disponibile; salva comunque localStorage `no-cap-orders-v1`.
- Stato: parzialmente prod, ma write client-side verso Supabase richiede RLS forte.

### Orders

- File: `sorgente/js/repository.js`, `sorgente/app.js`, `sorgente/js/render.js`.
- Lettura: `getOrders()` da localStorage.
- Create: `createOrder()` Supabase `orders`/`order_items` + localStorage.
- Update: `updateOrderStatus()` Supabase `orders.update()` + localStorage.
- Delete: non evidente per ordini.
- Stato: parziale; manca separazione server-side e autorizzazione admin robusta nel vanilla.

### Contact

- File: `sorgente/index.html`, `sorgente/app.js`, `sorgente/js/repository.js`.
- Form: `data-contact-form`.
- Validazione: `validateContactForm()`.
- Create: `createLead()` inserisce su Supabase `leads` se disponibile e salva localStorage `no-cap-leads-v1`.
- Delete/gestione lead: `deleteLead()` elimina da Supabase `leads` e localStorage; usato lato admin.
- Stato: parziale/prod-like, ma client-side write/delete richiede RLS e auth.

### Admin

- File: `sorgente/index.html`, `sorgente/styles.css`, `sorgente/app.js`, `sorgente/js/render.js`, `sorgente/js/repository.js`.
- Pannelli: dati, gestione, ordini, richieste.
- Prodotti: create/update/delete client-side.
- Inventario: restock/adjust.
- Categorie: create/update/delete shop categories.
- Tagli/contenuti: update featured/monthly cuts.
- Leads/orders: read/update/delete in UI.
- Stato: funzionale nel vanilla, ma non prod-ready senza backend/RLS/auth severi.

### Auth/Admin access

- File: `sorgente/js/config.js`, `sorgente/app.js`, `sorgente/js/supabase-client.js`.
- Mode: `ADMIN_MODE: "supabase-auth"`.
- Login: `sb.auth.signInWithPassword()`.
- Sessione: Supabase auth state; fallback local usa sessionStorage key `no-cap-admin-session-v2`.
- Accesso: UI client-side nasconde/mostra admin; non e sufficiente come protezione dati se RLS non blocca.

### Payments

- File: `sorgente/js/config.js`, `sorgente/index.html`, `sorgente/app.js`.
- Config: `CHECKOUT_MODE: "paypal"`.
- UI: radio `in-shop` e `paypal`.
- Comportamento: PayPal viene registrato come `paymentMode`; non e stato trovato redirect/provider reale.
- Stato: placeholder/non operativo.

## 3. Mappa flussi dati Next

### Products

- Route/componenti: `app/shop/page.tsx`, `components/shop-catalog.tsx`, `components/shop-product-grid.tsx`, `components/live-shop-sections.tsx`.
- Lib: `lib/supabase-public.ts`, `lib/static-content.ts`, `lib/shop-content.ts`.
- Lettura pubblica: `getPublicProducts()` da Supabase REST table `products` con anon key; fallback `productTeasers`.
- Categorie: `getPublicShopCategories()` table `shop_categories`; fallback derivato dai prodotti.
- Sezioni live: `getPublicShopSections()`, `getPublicShopSectionItems()`.
- Scrittura/update/delete: assenti in Next pubblico.
- Stato: lettura pubblica parziale, fallback statico robusto, CRUD mancante.

### Cart

- Componenti: `components/cart-count.tsx`, `components/checkout-in-shop.tsx`.
- Storage: localStorage key `no-cap-next-cart-v1`.
- Lettura: cart count e checkout.
- Scrittura: checkout puo scrivere/svuotare carrello locale; Shop attuale naviga a `/checkout?product=...`.
- API/Supabase: assenti.
- Stato: local-only.

### Checkout

- Route/componenti: `app/checkout/page.tsx`, `components/checkout-in-shop.tsx`.
- Dati: prodotti statici da `productTeasers`.
- Query: `?product=...` popolata client-side nel carrello locale se il prodotto esiste.
- Storage: `no-cap-next-cart-v1`, `no-cap-next-orders-v1`.
- API/Supabase: `components/checkout-in-shop.tsx` chiama `createPublicOrder()` che invia `POST /api/orders/create`.
- Pagamenti: `in-shop`/`paypal` come valore informativo; no Stripe, no redirect PayPal.
- Stato: checkout collegato alla API Orders server-side; cart e history restano localStorage.

### Orders

- API create introdotta nello Step 5: `POST /api/orders/create`.
- API admin introdotte nello Step 5: `GET /api/admin/orders`, `GET /api/admin/orders/[id]`, `PATCH /api/admin/orders/[id]`.
- `components/checkout-in-shop.tsx` salva ancora copia locale in `no-cap-next-orders-v1`, ma dopo Step 6 la conferma ordine avviene tramite `POST /api/orders/create`.
- Admin Next UI non legge ancora ordini reali; sono disponibili solo API server-side.
- Stato: API prod-ready iniziali presenti, UI ancora mock/local.

### Contact

- Route/componenti: `app/contact/page.tsx`, `components/contact-form.tsx`.
- Lib client: `lib/contact-form.ts`, `lib/public-flow.ts`.
- API: `POST /api/contact/create`.
- Server: `lib/server/contact-create.ts`.
- Scrittura: Supabase REST `leads` via service role.
- Validazioni: client e server; email, phone, subject, message, privacy, honeypot.
- Protezioni: rate limit in-memory, Turnstile opzionale se `TURNSTILE_SECRET_KEY`.
- Stato: il flusso piu vicino a prod-ready.

### Admin

- Route/componenti: `app/admin/page.tsx`, `components/admin-*`.
- Server helpers: `lib/admin-status.ts`, `lib/admin-products-summary.ts`, `lib/admin-auth-check.ts`.
- Client auth helper: `lib/admin-login.ts`.
- API route: `/api/admin/status`, `/api/admin/products/summary`, `/api/admin/auth/check`.
- Letture Supabase:
  - public products/categories via anon helper in page admin.
  - server `products`, `shop_categories`, `admin_users` via service role.
- Writes: disabilitati.
- Stato: read-only/status, non CRUD.

### Auth/Admin access

- Client: `signInAdminWithPassword()` chiama Supabase Auth `/auth/v1/token?grant_type=password` con anon key.
- Verifica: `verifyAdminAccessToken()` chiama `/api/admin/auth/check`.
- Server: `verifyAdminJwt()` valida JWT con JWKS e controlla `admin_users`.
- API token: `/api/admin/status` e `/api/admin/products/summary` richiedono `ADMIN_API_TOKEN` se chiamate come route; la pagina server usa direttamente helper interni.
- Stato: base di auth presente, ma non ancora sessione admin completa per CRUD.

### Payments

- Next non ha Stripe/PayPal operativo.
- Checkout registra solo `paymentMode` locale.
- Stato: non implementato, correttamente non prod.

## 4. Differenze Vanilla vs Next

| Area | Comportamento vanilla | Comportamento Next | Gap | Priorita |
| --- | --- | --- | --- | --- |
| Products | Client legge/scrive Supabase + localStorage fallback | Public read Supabase + fallback statico, no write | Manca API/admin CRUD server-side | HIGH |
| Cart | localStorage `no-cap-cart-v2` | localStorage `no-cap-next-cart-v1` | Chiavi diverse, Shop non replica esattamente drawer vanilla | MEDIUM |
| Checkout | Crea ordine via `createOrder()` Supabase/localStorage | localStorage-only | Manca API orders prod-ready | HIGH |
| Orders | Create/update via Supabase/localStorage | Nessuna API orders; admin non legge ordini | Ordini non prod | HIGH |
| Contact | Client createLead Supabase/localStorage | API server POST `leads` | Next migliore, ma manca eventuale admin gestione lead | MEDIUM |
| Admin | UI completa CRUD client-side | Read-only/status | Mancano write protette | HIGH |
| Auth | Supabase Auth client + UI gate | Supabase Auth + server JWT check/admin_users | Serve sessione/guard CRUD integrata | HIGH |
| Payments | PayPal mode placeholder | PayPal mode locale placeholder | Nessun pagamento reale, va lasciato cosi per ora | LOW |

## 5. Supabase audit

### File che usano Supabase - vanilla

- `sorgente/js/config.js`: URL/anon key e provider.
- `sorgente/js/supabase-client.js`: dynamic import Supabase client da CDN.
- `sorgente/js/repository.js`: CRUD prodotti, ordini, lead, upload, categorie, sezioni.
- `sorgente/app.js`: login/logout Supabase Auth e invocazione repository.

### File che usano Supabase - Next

- `lib/supabase-public.ts`: public REST con anon key.
- `app/shop/page.tsx`: products/categories.
- `components/live-shop-sections.tsx`: shop sections/items.
- `app/admin/page.tsx`: public products/categories + server admin helpers.
- `lib/server/api-core.ts`: `supabaseRequest()` service role.
- `lib/server/contact-create.ts`: insert `leads`.
- `lib/server/admin-auth.ts`: read `admin_users`.
- `lib/server/admin-status.ts`: count `products`, `shop_categories`.
- `lib/server/admin-products-summary.ts`: read `products`.
- `lib/admin-login.ts`: Supabase Auth password grant client-side.

### Funzioni che leggono dati

- Vanilla: `getProducts`, `getInventory`, `getOrders`, `getLeads`, `getSiteSections`.
- Next public: `getPublicProducts`, `getPublicShopCategories`, `getPublicShopSections`, `getPublicShopSectionItems`.
- Next server/admin: `readAdminStatus`, `readAdminProductsSummary`, `readAdminUser`, `listAdminOrders`, `getAdminOrder`.

### Funzioni che scrivono dati

- Vanilla: `saveProducts`, `saveInventory`, `createOrder`, `updateOrderStatus`, `createLead`, `deleteLead`, `uploadImage`, `saveSiteSections`.
- Next: `handleContactCreate` scrive `leads`.
- Next Step 2/4: write admin per `products`, `shop_categories`, `shop_sections`, `shop_section_items`.
- Next Step 5: `createOrder` scrive `orders` e `order_items`; `updateAdminOrderStatus` aggiorna `orders.status`/`notes`.

### Tabelle coinvolte o probabili

- `products`
- `orders`
- `order_items`
- `leads`
- `shop_categories`
- `shop_sections`
- `shop_section_items`
- `admin_users`
- Storage bucket: `products`

### Env variable richieste

- Public browser/server-render: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_CONTACT_FORM_MODE`.
- Server-only: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWKS_URL`, `ADMIN_API_TOKEN`, `TURNSTILE_SECRET_KEY`, `APP_ENV`.
- Nota: `.env.example` documenta quasi tutto tranne `TURNSTILE_SECRET_KEY` e `APP_ENV`, che sono usate da codice server.

### Client-side vs server-side

- Client-side Next:
  - `admin-login.ts` chiama Supabase Auth con anon key.
  - `contact-form.tsx` chiama `/api/contact/create`.
  - localStorage cart/checkout.
- Server-side Next:
  - route handlers API.
  - public Supabase REST durante render server.
  - admin helpers con service role.
- Vanilla:
  - molte operazioni Supabase avvengono nel browser con anon key.

### Rischi di sicurezza

- Service role deve restare solo server-side; ogni nuova API write deve importare solo helper `server-only`.
- API admin future non possono basarsi solo su `ADMIN_API_TOKEN`; serve admin JWT/sessione o doppio controllo.
- Public anon reads richiedono RLS `SELECT` limitata a `is_active = true`.
- Vanilla-style client writes non sono prod-ready se non accompagnate da policy RLS molto restrittive.
- Rate limit in-memory non e distribuito; su Cloudflare/edge potrebbe non essere affidabile come unico controllo.
- Contact insert con service role bypassa RLS: serve validazione forte, spam protection e logging.
- Upload immagini richiede limiti dimensione/tipo, storage policy, content scanning opzionale e naming robusto.

### Dove serve RLS

- `products`: public select solo active; admin write solo utenti admin.
- `shop_categories`, `shop_sections`, `shop_section_items`: public select solo active; admin write solo admin.
- `orders`, `order_items`: insert pubblico solo tramite server API o RLS controllata; select/update solo admin.
- `leads`: insert pubblico solo tramite server API o RLS controllata; select/delete/update solo admin.
- `admin_users`: select solo service role/admin verification; mai public.
- Storage `products`: public read, upload/update/delete solo admin.

## 6. API audit

| Route | Metodo | Input | Output | Validazioni | Rischi | Mock/reale |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/contact/create` | POST | JSON email, phone, subject, message, privacy, website/company honeypot, optional Turnstile | `{ ok: true }` o `{ error }` | Content-Type JSON, max 32KB, rate limit 5/min/IP, Turnstile opzionale, email/phone/message/privacy | Rate limit in-memory, service role insert, Turnstile non documentato in env example | Reale, scrive `leads` |
| `/api/admin/auth/check` | GET | Bearer JWT Supabase | `{ admin, authenticated }` o error | JWT via JWKS, issuer, `admin_users.is_admin=true` | Richiede config completa; nessuna session cookie | Reale check |
| `/api/admin/status` | GET | Bearer `ADMIN_API_TOKEN` | catalog counts, mode read-only | metodo, token statico | Token statico, no user context; page usa helper diretto | Reale read-only |
| `/api/admin/products/summary` | GET | Bearer `ADMIN_API_TOKEN` | products summary | metodo, token statico | Token statico, no pagination/filters, service role read | Reale read-only |

Validazioni mancanti o da rafforzare:

- Schema Zod condiviso per payload API.
- CORS/Origin policy esplicita per API pubbliche.
- Audit logging per admin/API.
- Rate limit persistente/distribuito.
- Pagination e limiti su admin products summary.
- CSRF/session strategy se si passa a cookie admin.

## 7. LocalStorage/mock/static audit

### Vanilla localStorage

- `no-cap-cart-v2`: carrello.
- `no-cap-orders-v1`: ordini fallback.
- `no-cap-leads-v1`: leads fallback.
- `no-cap-products-v1`: prodotti fallback.
- `no-cap-inventory-v1`: inventario fallback.
- `no-cap-featured-cut-v1`, `no-cap-monthly-cuts-v1`: contenuti tagli.
- `no-cap-site-sections-v1`: sezioni shop/categorie fallback.
- Cookie consent key via `CONSENT_STORAGE_KEY`.

### Next localStorage

- `no-cap-next-cart-v1`: cart count/checkout.
- `no-cap-next-orders-v1`: ordini checkout locali.

### Static/mock Next

- `lib/static-content.ts`: nav, hero, sezioni home, `productTeasers`, shop content, story.
- Checkout: static products + localStorage.
- Admin future panels: placeholder/read-only.
- Showcase/fresh cut/home editorial: static o semi-static.

### Cosa mantenere localStorage

- Cart anonimo.
- Preferenze UI/cookie, se non serve account.
- Draft temporanei non critici.

### Cosa spostare su Supabase/API

- Orders e order_items.
- Leads lifecycle admin.
- Products CRUD.
- Inventory/stock.
- Shop categories/sections.
- Admin audit log.
- Upload immagini metadata/storage.

### Cosa e solo demo/mock

- Checkout order localStorage.
- Admin future actions.
- Admin CRUD non implementato.
- Payment mode PayPal/Stripe placeholder.

## 8. Piano prod-ready consigliato

### Step 1: schema dati Supabase

- Definire migration SQL per `products`, `shop_categories`, `shop_sections`, `shop_section_items`, `orders`, `order_items`, `leads`, `admin_users`, eventuale `admin_audit_log`.
- Definire indici su `is_active`, `created_at`, `category`, `order_id`, `user_id`.
- Definire enum/status coerenti: order status, payment mode, fulfillment.
- Criterio accettazione: schema applicabile in ambiente vuoto, seed minimo caricato, test query base.

### Step 2: API products

- Creare API server-side admin per create/update/delete products.
- Validare payload con Zod.
- Proteggere con admin JWT check e/o sessione server.
- Gestire upload immagini separatamente.
- Criterio accettazione: Admin puo creare/update/delete prodotto in test, Shop legge solo active.

### Step 3: API orders

- Creare `POST /api/orders/create` per checkout.
- Salvare `orders` e `order_items` server-side.
- Idempotency key per evitare doppi ordini.
- Non integrare pagamenti reali.
- Criterio accettazione: checkout crea ordine persistente senza service role nel client.

### Step 4: API contact

- Consolidare API contact gia esistente.
- Aggiungere `TURNSTILE_SECRET_KEY` a `.env.example`.
- Aggiungere admin read/update/delete leads.
- Criterio accettazione: contact insert, admin list/read, stato lead aggiornabile.

### Step 5: Admin read/write

- Sostituire pannelli read-only con moduli CRUD progressivi.
- Prima prodotti/categorie, poi ordini/leads, poi sezioni.
- Aggiungere optimistic UI solo dopo API solide.
- Criterio accettazione: ogni write passa da API server protetta e aggiorna Supabase.

### Step 6: auth/admin protection

- Decidere strategia: Supabase Auth client + server verification per ogni API, oppure session cookie server.
- Proteggere `/admin` non solo UI: redirect/login gate e verifica server.
- Criterio accettazione: utente non admin non puo leggere/write API admin.

### Step 7: RLS/security

- Attivare RLS su tutte le tabelle.
- Public anon select solo su dati pubblici active.
- No anon write diretto salvo policy molto specifiche; preferire server API.
- Service role solo server-side.
- Criterio accettazione: test manuali/SQL dimostrano accesso negato a ruoli non autorizzati.

### Step 8: checkout/order hardening

- Allineare localStorage cart key se desiderato.
- Validare stock lato server.
- Bloccare ordine con cart vuoto/prezzi alterati client-side.
- Salvare prezzo snapshot in order_items.
- Criterio accettazione: manipolare localStorage non altera prezzo finale server-side.

### Step 9: deploy/env verification

- Validare env names in Cloudflare/Next.
- Aggiungere health check admin/API.
- Eseguire build, test, smoke route.
- Criterio accettazione: deploy preview legge public data, contact scrive lead, admin check fallisce/success correttamente.

## 9. Tabella priorita

| Area | Problema | File coinvolti | Rischio | Fix consigliato | Priorita |
| --- | --- | --- | --- | --- | --- |
| Orders | API server create/admin presenti, ma checkout UI e admin UI non sono ancora collegate | `components/checkout-in-shop.tsx`, `lib/server/orders-create.ts`, `lib/server/admin-orders-crud.ts` | Alto | Collegare gradualmente checkout alla API e poi UI admin orders | HIGH |
| Products CRUD | Admin Next read-only | `components/admin-*`, nuove API products | Alto | CRUD server-side protetto | HIGH |
| Auth admin | Login/check non e sessione completa | `lib/admin-login.ts`, `lib/server/admin-auth.ts`, `/admin` | Alto | Session strategy e guard API/page | HIGH |
| RLS | Policy non documentate | Supabase schema esterno | Alto | Migration + policy RLS testate | HIGH |
| Contact | API buona ma Turnstile/env incompleto | `lib/server/contact-create.ts`, `.env.example` | Medio | Documentare env, rate limit persistente | MEDIUM |
| Public products | Reads anon fallback statico | `lib/supabase-public.ts`, `app/shop/page.tsx` | Medio | RLS select active + cache strategy | MEDIUM |
| Cart | Chiavi diverse vanilla/Next | `components/cart-count.tsx`, `components/checkout-in-shop.tsx` | Basso | Decidere naming e migrazione | LOW |
| Payments | Placeholder | checkout/source config | Medio se attivato male | Non attivare finche orders non solidi | LOW |
| Upload | Vanilla upload client/storage | `sorgente/js/repository.js`, futura API | Alto | API upload admin server/protected | MEDIUM |
| Admin API token | Token statico per read-only API | `lib/server/admin-status.ts`, `admin-products-summary.ts` | Medio | Usare admin JWT/sessione per API admin | HIGH |

## 10. Cosa NON fare subito

- Non integrare Stripe/PayPal reali prima di avere orders server-side, idempotenza e sicurezza.
- Non portare pari pari il CRUD vanilla client-side in Next.
- Non esporre `SUPABASE_SERVICE_ROLE_KEY` al client.
- Non aggiungere nuove dipendenze prima di definire schema/API.
- Non fare refactor largo di tutta la UI admin insieme al backend.
- Non cancellare fallback statici finche Supabase non e stabile.
- Non usare localStorage come fonte finale per ordini/leads/prodotti.
- Non creare API write senza RLS, admin auth, validazione payload e test.

## Step 2 - Products CRUD API

Sono state introdotte API server-side admin per il CRUD prodotti senza collegarle alla UI Admin.

### API create

- `GET /api/admin/products`: lista prodotti admin, inclusi attivi/disattivati e campi gestionali.
- `POST /api/admin/products`: crea prodotto.
- `GET /api/admin/products/[id]`: dettaglio prodotto per UUID.
- `PATCH /api/admin/products/[id]`: aggiorna prodotto.
- `DELETE /api/admin/products/[id]`: soft delete; imposta `is_active = false` e `status = "archived"`.

Non e stato implementato hard delete.

### Auth richiesta

Tutte le nuove API products richiedono `Authorization: Bearer <Supabase access token>`.

Il token viene verificato server-side con:

- JWKS Supabase tramite `SUPABASE_JWKS_URL`;
- issuer Supabase derivato da `SUPABASE_URL`;
- controllo DB-backed su `admin_users.user_id`/`auth_user_id` e `is_admin = true`.

Le nuove API CRUD non usano `ADMIN_API_TOKEN` per autorizzare le write.

### Payload accettato

`POST /api/admin/products` accetta almeno:

- `name` obbligatorio;
- `slug` opzionale, generato da `name` se mancante;
- `description`;
- `category`;
- `category_id`;
- `price`;
- `stock_quantity`;
- `image_url`;
- `packshot_url`;
- `lifestyle_url`;
- `badge`;
- `status`;
- `is_active`;
- `sort_order`;
- `sku`;
- `code`;
- `label`;
- `restock`;
- `colors`;
- `shape`;
- `metadata`.

`PATCH /api/admin/products/[id]` accetta gli stessi campi in forma parziale, ma rifiuta payload vuoti.

### Validazioni

- `name`: obbligatorio e normalizzato con trim.
- `slug`: formato sicuro lowercase/kebab-case; generato da `name` se assente.
- `price`: numero `>= 0`.
- `stock_quantity`: intero `>= 0`, scritto nel DB come `stock` per compatibilita con la colonna generata `stock_quantity`.
- `category_id`: UUID valido o null.
- `image_url`, `packshot_url`, `lifestyle_url`: path locale `/...` o URL `http/https`.
- `status`: solo `active`, `draft`, `archived`, `sold_out`.
- `is_active`: boolean.
- `sort_order`: intero.

### Errori previsti

- `401`: token admin mancante o non valido.
- `403`: utente autenticato ma non admin.
- `400`: payload non valido o JSON non valido.
- `404`: prodotto non trovato.
- `409`: slug, sku o code duplicato.
- `500`: errore Supabase/server con messaggio sicuro.

### File modificati

- `destinazione/next-prod/lib/server/admin-products-crud.ts`
- `destinazione/next-prod/app/api/admin/products/route.ts`
- `destinazione/next-prod/app/api/admin/products/[id]/route.ts`
- `destinazione/next-prod/tests/admin-products-crud.test.mjs`
- `destinazione/next-prod/supabase/README.md`
- `PROD_READY_CRUD_AUDIT.md`

### Audit log

Le write tentano di registrare:

- `product.create`
- `product.update`
- `product.soft_delete`

La scrittura avviene su `admin_audit_log` con `entity_type = "product"` e `admin_auth_user_id` dentro `payload`. `admin_user_id` resta nullable per evitare una query extra e per mantenere compatibile lo schema Step 1. Se il log fallisce, l'operazione prodotto non viene annullata ma l'errore viene loggato fuori produzione.

### Cosa resta da collegare nella UI Admin

- Form creazione prodotto.
- Form modifica prodotto.
- Azione soft delete.
- Stato loading/error client-side.
- Refresh lista prodotti dopo write.
- Upload immagini protetto.
- Gestione categorie e sezioni shop.

### Verifiche Step 2

- `git diff --stat`: eseguito. Il diff include anche modifiche precedenti non committate; i nuovi file Step 2 sono non tracciati finche non verranno aggiunti a Git.
- `npm run lint`: PASS con 7 warning gia noti `@next/next/no-img-element`.
- `npm run typecheck`: PASS.
- `npm test`: PASS, 10 test superati. Aggiunto `admin-products-crud.test.mjs`.
- `npm run build`: PASS. Build completata e nuove route dinamiche rilevate: `/api/admin/products` e `/api/admin/products/[id]`.

## Step 3 - Admin Products UI CRUD

La UI Admin e stata collegata progressivamente alle API Products CRUD introdotte nello Step 2. Il collegamento resta limitato al modulo prodotti.

### Componenti creati/modificati

- Creato `destinazione/next-prod/components/admin-products-crud-panel.tsx`.
- Creato `destinazione/next-prod/lib/admin-products-client.ts`.
- Creato `destinazione/next-prod/tests/admin-products-client.test.mjs`.
- Aggiornato `destinazione/next-prod/components/admin-login-panel.tsx`.
- Aggiornato `destinazione/next-prod/lib/admin-login.ts`.
- Aggiornato `destinazione/next-prod/app/admin/page.tsx`.
- Aggiornato CSS scoped admin in `destinazione/next-prod/app/globals.css`.

### Gestione Bearer JWT

- Il login admin continua a usare `signInAdminWithPassword()` e `verifyAdminAccessToken()`.
- Dopo verifica admin positiva, `AdminLoginPanel` salva il Supabase access token in `sessionStorage` con chiave `no-cap-admin-access-token-v1`.
- Il pannello Products CRUD ascolta l'evento client `no-cap-admin-auth-changed` e legge solo quel token.
- Le chiamate CRUD inviano `Authorization: Bearer <supabase access token>`.
- Il service role non viene mai esposto al client.
- `ADMIN_API_TOKEN` non viene usato dal CRUD products.
- Se il token manca, il pannello non chiama le API e mostra lo stato "Login richiesto".

### API usate dalla UI

- `GET /api/admin/products`
- `POST /api/admin/products`
- `PATCH /api/admin/products/[id]`
- `DELETE /api/admin/products/[id]`

### Campi CRUD disponibili

- `name`
- `slug`
- `description`
- `category`
- `price`
- `stock_quantity`
- `image_url`
- `badge`
- `status`
- `is_active`
- `sort_order`

### Operazioni disponibili da UI

- Lista prodotti admin con stato loading/errore/vuoto.
- Creazione prodotto.
- Edit prodotto selezionato.
- Aggiornamento prodotto.
- Soft delete/disattivazione prodotto.
- Refresh lista dopo create/update/delete.

### Limitazioni rimaste

- Nessun upload immagini admin.
- Nessuna gestione categorie CRUD.
- Nessun collegamento Orders/Leads.
- Nessuna session cookie server-side; il token admin e client-side/sessionStorage.
- Nessuna verifica browser con Supabase reale in questa fase.
- La lista pubblica Shop non viene forzatamente revalidata dopo write; resta da decidere cache/revalidation strategy.

### Verifiche Step 3

- `git diff --stat`: eseguito. Il diff include anche modifiche precedenti non committate.
- `npm run lint`: PASS con 7 warning gia noti `@next/next/no-img-element`.
- `npm run typecheck`: PASS. Un primo run in parallelo con `next build` aveva fallito per `.next/types` mancanti durante rigenerazione; rilanciato da solo dopo build e passato.
- `npm test`: PASS, 11 test superati. Aggiunto `admin-products-client.test.mjs`.
- `npm run build`: PASS.

### Cosa non e stato collegato

- Shop pubblico non modificato.
- Checkout non modificato.
- Contact non modificato.
- Orders CRUD non implementato.
- Leads CRUD non implementato.
- Payments non implementati.

## Step 4 - Shop Structure CRUD

Sono state introdotte API e UI admin per la struttura shop: categorie, sezioni e section items base. Il lavoro resta confinato a `shop_categories`, `shop_sections`, `shop_section_items` e area Admin.

### API create

Categorie:

- `GET /api/admin/shop-categories`
- `POST /api/admin/shop-categories`
- `GET /api/admin/shop-categories/[id]`
- `PATCH /api/admin/shop-categories/[id]`
- `DELETE /api/admin/shop-categories/[id]`

Sezioni:

- `GET /api/admin/shop-sections`
- `POST /api/admin/shop-sections`
- `GET /api/admin/shop-sections/[id]`
- `PATCH /api/admin/shop-sections/[id]`
- `DELETE /api/admin/shop-sections/[id]`

Section items:

- `GET /api/admin/shop-sections/[id]/items`
- `POST /api/admin/shop-sections/[id]/items`
- `PATCH /api/admin/shop-section-items/[id]`
- `DELETE /api/admin/shop-section-items/[id]`

`DELETE` e un soft delete: imposta `is_active = false`.

### Auth richiesta

- Tutte le API richiedono `Authorization: Bearer <Supabase access token>`.
- La verifica admin riusa `verifyAdminJwt()` e `requireAdminFromRequest()`.
- Nessuna API write usa `ADMIN_API_TOKEN`.
- Il service role resta server-side tramite `supabaseRequest()`.

### Campi gestiti

Categorie:

- `label`
- `value`/`slug`
- `description`
- `is_active`
- `sort_order`

Sezioni:

- `title`
- `key`/`slug`
- `subtitle`
- `body`
- `settings`
- `layout`/`type` dentro `settings`
- `is_active`
- `sort_order`

Section items:

- `section_key`
- `item_key`
- `title`
- `label`
- `href`
- `image_url`
- `content`
- `is_active`
- `sort_order`

### UI Admin collegata

Creato `AdminShopStructurePanel` in `/admin`:

- lista categorie;
- create/edit/disattiva categoria;
- lista sezioni;
- create/edit/disattiva sezione;
- refresh dati;
- loading/error/empty states;
- uso del token admin gia salvato in `sessionStorage` dallo Step 3.

Gli item di sezione hanno API e helper server, ma non una UI completa dedicata in questo step per evitare complessita eccessiva.

### Audit log

Best-effort su `admin_audit_log`:

- `shop_category.create`
- `shop_category.update`
- `shop_category.soft_delete`
- `shop_section.create`
- `shop_section.update`
- `shop_section.soft_delete`
- `shop_section_item.create`
- `shop_section_item.update`
- `shop_section_item.soft_delete`

### File creati/modificati

- `destinazione/next-prod/lib/server/admin-shop-structure-crud.ts`
- `destinazione/next-prod/lib/admin-shop-structure-client.ts`
- `destinazione/next-prod/components/admin-shop-structure-panel.tsx`
- `destinazione/next-prod/app/api/admin/shop-categories/**`
- `destinazione/next-prod/app/api/admin/shop-sections/**`
- `destinazione/next-prod/app/api/admin/shop-section-items/**`
- `destinazione/next-prod/app/admin/page.tsx`
- `destinazione/next-prod/tests/admin-shop-structure-client.test.mjs`
- `destinazione/next-prod/tests/admin-shop-structure-crud.test.mjs`
- `destinazione/next-prod/supabase/README.md`
- `PROD_READY_CRUD_AUDIT.md`

### Verifiche Step 4

- `git diff --stat`: eseguito. Il diff include anche modifiche precedenti non committate.
- `npm run lint`: PASS con 7 warning gia noti `@next/next/no-img-element`.
- `npm run typecheck`: PASS. Un primo run in parallelo con `next build` aveva fallito per `.next/types` mancanti durante rigenerazione; rilanciato da solo dopo build e passato.
- `npm test`: PASS, 13 test superati.
- `npm run build`: PASS. Nuove route dinamiche rilevate per `shop-categories`, `shop-sections` e `shop-section-items`.

### Cosa resta fuori

- Upload immagini.
- Orders CRUD.
- Leads CRUD.
- Payments.
- UI completa per `shop_section_items`.
- Cache/revalidation del pubblico dopo write.

## Step 5 - Orders API server-side

Sono state introdotte API server-side per creare ordini pubblici e per leggere/aggiornare ordini lato Admin. Lo step non collega ancora il checkout Next alla nuova API e non aggiunge UI Admin Orders: resta confinato a server helper, route API, test e documentazione.

### API create pubblica

Endpoint:

- `POST /api/orders/create`

Helper:

- `destinazione/next-prod/lib/server/orders-create.ts`

Comportamento:

- valida payload cliente, fulfillment, payment mode e righe ordine con Zod;
- accetta `fulfillment` `pickup`, `shipping` e normalizza `delivery` a `shipping`;
- accetta `payment_mode`/`paymentMode` `in-shop`, `in_shop` e `paypal`;
- legge i prodotti attivi da Supabase lato server;
- risolve i prodotti tramite `id`, `slug`, `sku` o `code`;
- ignora prezzi client-side e calcola `unit_price`, `line_total`, `subtotal`, `shipping` e `total` lato server;
- applica shipping fisso `6` quando fulfillment e `shipping`;
- verifica stock prima dell'insert e risponde `409` se insufficiente;
- crea `orders` con `status = "in-attesa"` e `source = "next-api"`;
- crea `order_items` con snapshot nome/SKU/prezzo;
- tenta audit log best-effort `order.create` in `admin_audit_log`;
- usa `parseGuardedJson()` con rate limit locale e Turnstile se `TURNSTILE_SECRET_KEY` e configurata.

Status rilevanti:

- `201`: ordine creato;
- `400`: payload invalido;
- `404`: prodotto non trovato/non attivo;
- `409`: stock insufficiente o conflitto ordine;
- `429`: rate limit;
- `500/503`: errore configurazione/Supabase.

### API Admin Orders

Endpoint:

- `GET /api/admin/orders`
- `GET /api/admin/orders/[id]`
- `PATCH /api/admin/orders/[id]`

Helper:

- `destinazione/next-prod/lib/server/admin-orders-crud.ts`

Auth:

- richiede `Authorization: Bearer <Supabase access token>`;
- riusa `requireAdminFromRequest()` e `verifyAdminJwt()`;
- non usa `ADMIN_API_TOKEN`;
- non espone `SUPABASE_SERVICE_ROLE_KEY` al client.

Funzioni:

- lista ordini con `page`, `pageSize`, `status`, `search`;
- dettaglio ordine con righe `order_items`;
- aggiornamento stato/notes con stati consentiti:
  - `in-attesa`
  - `in-lavorazione`
  - `pronto`
  - `spedito`
  - `completato`
  - `annullato`
- audit log best-effort `order.status_update`.

### File creati/modificati

- `destinazione/next-prod/lib/server/orders-create.ts`
- `destinazione/next-prod/lib/server/admin-orders-crud.ts`
- `destinazione/next-prod/app/api/orders/create/route.ts`
- `destinazione/next-prod/app/api/admin/orders/route.ts`
- `destinazione/next-prod/app/api/admin/orders/[id]/route.ts`
- `destinazione/next-prod/tests/orders-create.test.mjs`
- `destinazione/next-prod/tests/admin-orders-crud.test.mjs`
- `destinazione/next-prod/supabase/README.md`
- `PROD_READY_CRUD_AUDIT.md`

### Cosa non e stato collegato

- `components/checkout-in-shop.tsx` resta localStorage-only.
- Nessun bottone checkout chiama `POST /api/orders/create`.
- Nessuna UI Admin Orders e stata aggiunta.
- Nessun pagamento reale e stato introdotto.
- Nessuna modifica a Shop pubblico, Contact, Products CRUD UI, categorie/sezioni shop.
- Nessuna idempotency key persistente: resta da implementare prima di collegare checkout reale.
- Nessun decremento stock automatico: la API verifica stock ma non aggiorna inventario.

### Rischi residui

- Rate limit locale non e distribuito: su Cloudflare/edge/serverless serve storage persistente o provider-level throttling.
- `POST /api/orders/create` legge tutti i prodotti attivi per risolvere id/slug; va ottimizzato con query mirate se il catalogo cresce.
- Mancano idempotency key e gestione retry: rischio doppio ordine se il client ripete la richiesta dopo timeout.
- Stock verificato ma non decrementato transazionalmente: serve RPC/Postgres transaction per inventory hardening.
- Audit log pubblico order create e best-effort: non blocca l'ordine se fallisce.

### Verifiche Step 5

- `npm test -- --test-name-pattern="Orders|orders"`: PASS, 15 test eseguiti dal runner con filtro nome/fixture, inclusi `orders-create` e `admin-orders-crud`.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS con 7 warning preesistenti `@next/next/no-img-element`; due warning introdotti nello Step 5 sono stati rimossi.
- `npm test`: PASS, 15 test file superati.
- `npm run build`: PASS. Build Next completata e nuove route rilevate:
  - `/api/orders/create`
  - `/api/admin/orders`
  - `/api/admin/orders/[id]`
- `git diff --stat`: eseguito. Il diff resta ampio per modifiche precedenti non committate; lo Step 5 aggiunge solo moduli Orders/API/test/report.
- `node tests/admin-status.test.mjs`: PASS, eseguito dopo il test completo per rigenerare gli artefatti temporanei tracciati sotto `tests/.tmp-ts-modules` cancellati dal loader.

### Prossimo step consigliato

Step 6 dovrebbe essere una scelta controllata tra:

- collegare Checkout a `POST /api/orders/create` mantenendo fallback localStorage e senza pagamenti reali;
- oppure creare UI Admin Orders read/update status sopra le API admin appena introdotte.

Prima del collegamento checkout e consigliato aggiungere idempotency key e una strategia inventory/stock transazionale.

## Step 6 - Checkout connected to Orders API

Il checkout Next e stato collegato alla API Orders pubblica introdotta nello Step 5. Lo step resta limitato a `/checkout`, helper client, test e documentazione: non aggiunge UI Admin Orders e non introduce pagamenti reali.

### Cosa e stato collegato

- `components/checkout-in-shop.tsx` importa `createPublicOrder()` da `lib/orders-client.ts`.
- Il submit del form checkout ora chiama `POST /api/orders/create`.
- La conferma ordine usa `order_number` restituito dal server.
- Il bottone submit mostra loading `Creazione ordine...` e viene disabilitato durante la richiesta.
- Gli errori API vengono mostrati nel messaggio checkout senza salvare un ordine confermato localmente.

### Payload inviato

Il checkout invia alla API:

```json
{
  "customer": {
    "fullName": "Nome cliente",
    "email": "cliente@example.com",
    "phone": "+393331234567"
  },
  "fulfillment": "pickup",
  "paymentMode": "in-shop",
  "items": [
    {
      "product_id": "product-slug-or-uuid",
      "quantity": 1
    }
  ]
}
```

Se `fulfillment` e `shipping`, viene aggiunto:

```json
{
  "shippingAddress": {
    "address": "Via Roma 1",
    "city": "Napoli",
    "zip": "80100"
  }
}
```

Il checkout non invia il prezzo come fonte affidabile. Anche se in futuro un campo prezzo arrivasse dal client, la API Step 5 lo ignora e ricalcola usando `products.price` lato server.

### Cosa resta localStorage

- `no-cap-next-cart-v1`: resta il draft carrello locale.
- `no-cap-next-orders-v1`: resta una copia locale/history dopo successo API.
- Se la API fallisce, il checkout non scrive un ordine confermato in `no-cap-next-orders-v1`.
- Il carrello viene svuotato solo dopo risposta positiva della API.

### Cosa e reale/server-side

- Creazione ordine prod-ready iniziale: `orders` e `order_items` vengono scritti da `POST /api/orders/create`.
- `order_number`, `subtotal`, `shipping`, `total`, `status`, `id` arrivano dalla risposta server.
- La UI mostra `order_number` server nella schermata di successo.

### Pagamenti

- `paymentMode` resta informativo.
- `in-shop` significa pagamento in sede.
- `paypal` viene registrato come preferenza informativa sull'ordine.
- Nessun redirect PayPal.
- Nessun modal/provider PayPal.
- Nessuno Stripe.
- Nessun pagamento online reale.

### File creati/modificati

- `destinazione/next-prod/lib/orders-client.ts`
- `destinazione/next-prod/components/checkout-in-shop.tsx`
- `destinazione/next-prod/tests/orders-client.test.mjs`
- `PROD_READY_CRUD_AUDIT.md`

### Test Step 6

- `orders-client.test.mjs` verifica:
  - chiamata a `/api/orders/create`;
  - `Content-Type: application/json`;
  - gestione successo con `order_number`;
  - gestione errori `400`, `404`, `409`, `429`, `500`;
  - assenza di import Supabase/server/helper server nel checkout;
  - assenza di provider Stripe/PayPal nel checkout.

### Verifiche Step 6

- `npm run typecheck`: PASS.
- `npm test`: PASS, 16 test file superati.
- `npm run lint`: PASS con 7 warning preesistenti `@next/next/no-img-element`.
- `npm run build`: PASS. Build Next completata; `/checkout` ora pesa circa `4.05 kB` e continua a vedere `/api/orders/create` come route dinamica disponibile.

### Limiti rimasti

- Nessuna idempotency key persistente: resta rischio doppio ordine su retry dopo timeout.
- Nessun decremento stock transazionale: la API verifica stock ma non aggiorna inventario.
- Rate limit ancora locale, non distribuito.
- UI Admin Orders non collegata.
- Nessun pagamento reale, per scelta.

### Prossimo step consigliato

Step 7 consigliato: introdurre idempotency key + hardening ordine/stock prima di aggiungere Admin Orders UI o pagamenti. In alternativa, se si vuole visibilita operativa prima dell'hardening, collegare una UI Admin Orders read/status update usando le API Step 5.

## Step 7 - Admin Orders UI

La UI Admin e stata collegata alle API Orders create nello Step 5. Lo step resta limitato alla visualizzazione e all'aggiornamento stato ordini: non modifica checkout, shop pubblico, products CRUD, categorie/sezioni, contact o pagamenti.

### Cosa e stato collegato

- `AdminOrdersPanel` dentro `/admin`.
- Helper client `lib/admin-orders-client.ts`.
- Lettura lista ordini tramite `GET /api/admin/orders`.
- Lettura dettaglio ordine tramite `GET /api/admin/orders/[id]`.
- Aggiornamento stato/notes tramite `PATCH /api/admin/orders/[id]`.
- Refresh lista dopo update stato.

### API usate

- `GET /api/admin/orders?page=1&pageSize=50&status=<status>&search=<query>`
- `GET /api/admin/orders/<order-id>`
- `PATCH /api/admin/orders/<order-id>`

Tutte le chiamate inviano:

```http
Authorization: Bearer <supabase-admin-access-token>
```

Il pannello usa il token gia salvato da `AdminLoginPanel` in `sessionStorage` con key `no-cap-admin-access-token-v1`. Nessuna chiamata Admin Orders usa `ADMIN_API_TOKEN`, service role client-side o Supabase diretto dal browser.

### Cosa vede admin

Lista ordini:

- `order_number`
- `customer_name`
- `customer_email`
- `customer_phone` quando presente
- `status`
- `fulfillment`/`fulfillment_mode`
- `payment_mode`
- `total`
- `created_at`

Dettaglio ordine:

- dati cliente;
- modalita ritiro/spedizione;
- payment mode solo informativo;
- note interne;
- righe ordine `order_items`;
- nome prodotto snapshot/fallback;
- SKU snapshot;
- quantity;
- unit price snapshot/fallback;
- total price snapshot/fallback.

### Status modificabili

Gli status sono quelli coerenti con schema/API Step 5:

- `in-attesa`
- `in-lavorazione`
- `pronto`
- `spedito`
- `completato`
- `annullato`

### Pagamenti

- `payment_mode` resta solo informativo.
- Nessun Stripe.
- Nessun PayPal provider.
- Nessun redirect/modal pagamento.
- Nessun flusso pagamento reale.

### File creati/modificati

- `destinazione/next-prod/lib/admin-orders-client.ts`
- `destinazione/next-prod/components/admin-orders-panel.tsx`
- `destinazione/next-prod/app/admin/page.tsx`
- `destinazione/next-prod/app/globals.css`
- `destinazione/next-prod/tests/admin-orders-client.test.mjs`
- `PROD_READY_CRUD_AUDIT.md`

### Test Step 7

- `admin-orders-client.test.mjs` verifica:
  - Authorization Bearer sulle richieste;
  - list orders con filtri;
  - get order con id encoded;
  - PATCH stato ordine;
  - gestione errori `400`, `401`, `403`, `404`, `409`, `500`;
  - assenza di Supabase diretto/service role/helper server nel helper/pannello;
  - assenza di provider Stripe/PayPal.

### Verifiche Step 7

- `npm run typecheck`: PASS.
- `npm test`: PASS, 17 test file superati.
- `npm run lint`: PASS con 7 warning preesistenti `@next/next/no-img-element`.
- `npm run build`: PASS. Build Next completata; `/admin` sale a circa `7.62 kB` e le route `/api/admin/orders` e `/api/admin/orders/[id]` restano dinamiche disponibili.

### Cosa resta da fare

- Idempotency key per `POST /api/orders/create`.
- Stock decrement transazionale/RPC.
- Rate limit distribuito/persistente.
- Eventuale UI admin per ricerca/paginazione avanzata.
- Eventuale export ordini.
- Pagamenti reali ancora esplicitamente fuori scope.

## Step 8 - Order hardening

Lo Step 8 introduce hardening per la creazione ordine: idempotency key, payload hash e creazione ordine atomica via RPC SQL. La migration e stata creata ma non applicata/testata contro un DB Supabase reale in questa sessione.

### Migration creata

- `destinazione/next-prod/supabase/migrations/002_orders_idempotency_stock.sql`

La migration:

- aggiunge `orders.idempotency_key text`;
- aggiunge `orders.payload_hash text`;
- crea indice unique parziale `orders_idempotency_key_unique_idx`;
- crea RPC `public.create_order_with_items(p_payload jsonb, p_idempotency_key text, p_payload_hash text)`;
- revoca execute public sulla RPC;
- concede execute a `service_role`.

### Come funziona idempotency key

- Il checkout genera una key per tentativo ordine con `createOrderIdempotencyKey()`.
- La key viene inviata nel payload a `POST /api/orders/create` come `idempotency_key`.
- `lib/server/orders-create.ts` normalizza il payload e calcola `payload_hash` server-side.
- La RPC controlla `orders.idempotency_key`:
  - stessa key + stesso hash: restituisce ordine esistente;
  - stessa key + hash diverso: errore `CLIENT: Idempotency conflict.`;
  - key nuova: crea ordine.

### Stock decrement transazionale

La RPC:

- legge ogni prodotto attivo con `for update`;
- verifica stock sufficiente;
- decrementa `products.stock`;
- calcola prezzi e totali server-side;
- crea `orders`;
- crea `order_items`;
- restituisce ordine con items.

Questo sostituisce il precedente check stock + insert separato lato API e riduce il rischio race condition.

### API aggiornata

- `POST /api/orders/create` continua a essere l'unico endpoint pubblico di creazione ordine.
- La route ora chiama `rpc/create_order_with_items` tramite `supabaseRequest()`.
- Prezzi client-side ancora ignorati.
- Pagamenti ancora solo informativi (`in-shop`/`paypal`).

### Errori gestiti

- `400`: payload invalido/idempotency key mancante;
- `404`: prodotto non trovato/non attivo;
- `409`: stock insufficiente o idempotency conflict;
- `429`: rate limit locale esistente;
- `500`: errore sicuro.

### File Step 8

- `destinazione/next-prod/supabase/migrations/002_orders_idempotency_stock.sql`
- `destinazione/next-prod/lib/server/orders-create.ts`
- `destinazione/next-prod/lib/orders-client.ts`
- `destinazione/next-prod/components/checkout-in-shop.tsx`
- `destinazione/next-prod/tests/orders-create.test.mjs`
- `destinazione/next-prod/tests/orders-client.test.mjs`

### Limiti rimasti Step 8

- Migration/RPC non applicata a un DB reale in questa sessione.
- Rate limit ancora locale/non distribuito.
- Mancano test integrati con Supabase reale su concorrenza effettiva.
- Pagamenti reali volutamente OFF.

## Step 9 - Admin Leads UI

Lo Step 9 aggiunge API admin, helper server/client e pannello UI per gestire i lead arrivati dal form Contact.

### API create

- `GET /api/admin/leads`
- `GET /api/admin/leads/[id]`
- `PATCH /api/admin/leads/[id]`
- `DELETE /api/admin/leads/[id]`

Tutte richiedono `Authorization: Bearer <Supabase access token>` e riusano verifica admin server-side. `DELETE` e soft archive: imposta `status = "closed"`, non cancella righe.

### Helper creati

Server:

- `destinazione/next-prod/lib/server/admin-leads-crud.ts`

Client:

- `destinazione/next-prod/lib/admin-leads-client.ts`

UI:

- `destinazione/next-prod/components/admin-leads-panel.tsx`

### Status lead gestiti

Coerenti con il vincolo schema `leads_status_valid`:

- `new`
- `open`
- `contacted`
- `closed`
- `spam`

### Cosa vede admin

- lista lead;
- email;
- telefono;
- oggetto;
- messaggio;
- privacy accepted;
- source;
- status;
- created_at;
- dettaglio selezionato;
- update status;
- archiviazione a `closed`.

### Audit log

Best-effort in `admin_audit_log`:

- `lead.status_update`
- `lead.archive`

### File Step 9

- `destinazione/next-prod/lib/server/admin-leads-crud.ts`
- `destinazione/next-prod/app/api/admin/leads/route.ts`
- `destinazione/next-prod/app/api/admin/leads/[id]/route.ts`
- `destinazione/next-prod/lib/admin-leads-client.ts`
- `destinazione/next-prod/components/admin-leads-panel.tsx`
- `destinazione/next-prod/app/admin/page.tsx`
- `destinazione/next-prod/app/globals.css`
- `destinazione/next-prod/tests/admin-leads-client.test.mjs`
- `destinazione/next-prod/tests/admin-leads-crud.test.mjs`

### Verifiche Step 8/9

- `npm run typecheck`: PASS.
- `npm test`: PASS, 19 test file superati.
- `git diff --stat`: eseguito. Il diff resta ampio per modifiche precedenti non committate; Step 8/9 aggiungono migration, Orders hardening, Leads API/UI/test/docs.
- `npm run lint`: PASS con 7 warning preesistenti `@next/next/no-img-element`.
- `npm run build`: PASS. Build Next completata; nuove route rilevate:
  - `/api/admin/leads`
  - `/api/admin/leads/[id]`

### Cosa resta da fare dopo

- Applicare migration `002_orders_idempotency_stock.sql` su Supabase dev/staging e testare concorrenza reale.
- Valutare update di `contact-create.ts`: lo schema `leads.id` e UUID, mentre il writer attuale invia un id stringa legacy `lead-...`; va verificato su DB reale.
- Hardening rate limit distribuito.
- Eventuale export ordini/leads.
- Pagamenti reali ancora fuori scope.

## Step 10 - Schema/API consistency

Lo Step 10 corregge il mismatch noto tra Contact writer e schema prod-ready: `public.leads.id` e UUID con default `gen_random_uuid()`, mentre il writer precedente inviava un id legacy `lead-...`.

### Fix Lead UUID

File corretto:

- `destinazione/next-prod/lib/server/contact-create.ts`

Modifica:

- rimosso invio `id: lead-...`;
- rimosso invio manuale `created_at`;
- il DB genera `leads.id` UUID;
- il DB genera `created_at`;
- restano invariati validazioni, honeypot, rate limit, Turnstile opzionale e scrittura server-side.

Payload Contact compatibile con schema:

- `email`
- `phone`
- `subject`
- `message`
- `privacy_accepted`
- `source`

### Admin Leads UUID

Admin Leads tratta `id` come stringa opaca UUID:

- `GET /api/admin/leads/[id]`
- `PATCH /api/admin/leads/[id]`
- `DELETE /api/admin/leads/[id]`

I test Step 10 usano UUID reali invece di id legacy `lead-...`.

### Schema/API consistency check

Entita controllate:

| Entita | Esito |
| --- | --- |
| `products` | Write admin usa `stock`, non scrive generated `stock_quantity`; status coerenti `active/draft/archived/sold_out`. |
| `shop_categories` | Write usa colonne esistenti `value`, `label`, `description`, `is_active`, `sort_order`. |
| `shop_sections` | Write usa colonne esistenti `key`, `title`, `subtitle`, `body`, `settings`, `is_active`, `sort_order`. |
| `shop_section_items` | Write usa colonne esistenti `section_id`, `section_key`, `item_key`, `title`, `label`, `href`, `image_url`, `content`, `is_active`, `sort_order`. |
| `orders` | RPC scrive colonne reali incluse `idempotency_key`/`payload_hash`; non scrive generated `fulfillment_mode`. |
| `order_items` | RPC scrive `product_name`, `unit_price`, `line_total`; non scrive generated snapshot. |
| `leads` | Contact create lascia UUID/default al DB; Admin Leads usa status schema `new/open/contacted/closed/spam`. |
| `admin_users` | Auth check legge `user_id` generated, non lo scrive. |
| `admin_audit_log` | Helper scrivono `action`, `entity_type`, `entity_id`, `payload`; `id`/`created_at` restano default. |

### Mismatch trovati

- `contact-create.ts` inviava `id: lead-...` contro schema `uuid`.
- `contact-create.ts` inviava `created_at`, campo gia gestito dal DB.

### Mismatch corretti

- Rimosso id legacy dal payload lead.
- Rimosso `created_at` manuale dal payload lead.
- Aggiornati test admin leads per usare UUID.
- Aggiunto test schema/API consistency.

### Test Step 10

- `contact-create.test.mjs`: verifica che `POST /api/contact/create` non invii `id` ne `created_at`.
- `admin-leads-client.test.mjs`: usa UUID reali.
- `admin-leads-crud.test.mjs`: usa UUID reali.
- `schema-api-consistency.test.mjs`: controlli statici su schema/API e generated columns.

### Resta da testare su Supabase reale

- Applicare `001_prod_ready_schema.sql` + `002_orders_idempotency_stock.sql`.
- Eseguire insert reale contact lead.
- Verificare Admin Leads con UUID reali dal DB.
- Verificare RPC orders su concorrenza reale.

## Verifiche tecniche

Da eseguire/completare in questa fase:

- `git status`: eseguito, working tree con modifiche precedenti non committate e nuovi report/documenti.
- `git diff --stat`: eseguito, diff ampio dovuto ai batch UI precedenti.
- `npm run lint`: PASS. Esito positivo con 7 warning `@next/next/no-img-element` gia noti su `app/showcase/page.tsx`, `app/taglio-fresco/page.tsx`, `components/home-editorial-sections.tsx`, `components/shop-product-grid.tsx`, `components/site-header.tsx`.
- `npm run typecheck`: PASS. TypeScript completato senza errori.
- `npm test`: PASS. 9 test superati: admin auth/check/guard, admin login/status/products summary, contact form, public flow, Supabase public helpers.
- `npm run build`: PASS. Build Next completata; permangono gli stessi 7 warning `@next/next/no-img-element`.

## Final prod-ready stabilization

Questa fase chiude il ciclo locale di stabilizzazione prod-ready senza aggiungere feature nuove e senza attivare pagamenti reali.

### Cosa e stato verificato

- Working tree e diff: controllati con `git status` e `git diff --stat`.
- Env richieste: confrontate tra codice e `.env.example`.
- Migration Supabase: controllate staticamente in ordine `001_prod_ready_schema.sql` poi `002_orders_idempotency_stock.sql`.
- Seed: presente in `supabase/seed.sql` e coerente con `shop_categories`, `products`, `shop_sections`, `shop_section_items`.
- API e schema: controlli statici/test su products, shop structure, orders, leads, admin users e audit log.
- Build locale Next: completata correttamente.
- Pagamenti: Stripe/PayPal provider non implementati; `payment_mode` resta informativo.

### Cosa e stato testato realmente in locale

- `npm run lint`: PASS con 7 warning noti `@next/next/no-img-element`.
- `npm run typecheck`: PASS.
- `npm test`: PASS, 21 test file superati.
- `npm run build`: PASS.

### Cosa non e stato possibile testare

- Migration applicate su Supabase dev/staging: non eseguite perche la CLI `supabase` non e installata in questo ambiente.
- Smoke test reali su DB dev/staging: non eseguiti perche non e presente `.env.local` o altra configurazione reale, solo `.env.example`.
- Supabase advisors: non eseguiti per assenza CLI/MCP autenticato.

### Env richieste

Public:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CONTACT_FORM_MODE`

Server-only:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWKS_URL`
- `ADMIN_API_TOKEN`
- `TURNSTILE_SECRET_KEY`
- `APP_ENV`

### Migration da applicare

Ordine consigliato:

1. `supabase/migrations/001_prod_ready_schema.sql`
2. `supabase/migrations/002_orders_idempotency_stock.sql`
3. `supabase/seed.sql`

Dopo apply su staging:

- creare almeno un record `admin_users` collegato a un utente Supabase Auth reale;
- verificare Data API/RLS;
- eseguire Supabase advisors;
- testare RPC `create_order_with_items` con idempotency, conflict e stock insufficiente.

### Flussi prod-ready disponibili

- Products CRUD admin-side via API protette da Bearer JWT Supabase.
- Shop categories/sections/items CRUD admin-side via API protette.
- Orders create pubblico via `POST /api/orders/create`, con RPC, idempotency e stock decrement.
- Admin Orders list/detail/status update.
- Contact lead create server-side.
- Admin Leads list/detail/status/archive con UUID.
- Audit log best-effort sulle write admin.

### Limiti rimasti

- Nessun smoke test reale Supabase ancora eseguito in questo ambiente.
- Rate limit distribuito non implementato.
- Pagamenti reali non implementati.
- Upload/storage immagini prodotti fuori scope.
- Export ordini/leads fuori scope.

### Pagamenti OFF

Stripe e PayPal provider restano disattivati/non implementati. Il valore `payment_mode` supporta `in-shop` e `paypal` solo come informazione di ordine; non apre redirect, modal o pagamento reale.

### Prossimo step dopo deploy/staging

1. Applicare migration e seed su Supabase dev/staging.
2. Configurare env reali server-side e public.
3. Creare admin user in `admin_users`.
4. Eseguire smoke test manuale completo: Contact, Admin Leads, Products CRUD, Shop Structure CRUD, Checkout Orders, Admin Orders.
5. Eseguire advisors/security review Supabase.
