# Mappa progetto destinazione Next.js

## Panoramica

Il progetto Next.js effettivo si trova in `destinazione/next-prod/`. La cartella `destinazione/` contiene anche una copia legacy vanilla-like (`index.html`, `app.js`, `styles.css`, `js/`) e funzioni Cloudflare in `functions/api/`.

`destinazione/next-prod/` usa Next.js App Router con TypeScript, React e CSS globale in `app/globals.css`.

## Versione e stack

Da `destinazione/next-prod/package.json`:

- `next`: `^15.3.4`
- `react`: `^19.1.0`
- `react-dom`: `^19.1.0`
- `typescript`: `^5.8.3`
- `@supabase/supabase-js`: `^2.50.0`
- `jose`: `^6.2.3`
- `@opennextjs/cloudflare`: `^1.0.1`
- `wrangler`: `^4.20.0`

Script:

- `dev`: `next dev`
- `lint`: `eslint .`
- `build`: `next build`
- `build:cloudflare`: `opennextjs-cloudflare build`
- `deploy`: `opennextjs-cloudflare deploy`
- `preview:cloudflare`: `opennextjs-cloudflare build && wrangler dev`
- `typecheck`: `tsc --noEmit`
- `test`: `node --test --test-concurrency=1 tests/*.test.mjs`

## Router usato

Usa App Router:

- `app/layout.tsx`
- `app/page.tsx`
- route directory con `page.tsx`
- API route in `app/api/**/route.ts`

Non risultano `pages/` o Pages Router nel progetto `next-prod`.

## Route pubbliche

| Route | File | Scopo | Stato migrazione apparente |
|---|---|---|---|
| `/` | `app/page.tsx` | Home con hero, banner, teaser shop, sezioni editoriali, highlights. | PARZIALE/DIVERSO |
| `/shop` | `app/shop/page.tsx` | Catalogo pubblico con Supabase/fallback, categorie, ricerca/sort. | PARZIALE |
| `/taglio-fresco` | `app/taglio-fresco/page.tsx` | Pagina fresh cut dedicata. | PARZIALE/DIVERSO |
| `/showcase` | `app/showcase/page.tsx` | Showcase mensile statico. | PARZIALE/DIVERSO |
| `/contact` | `app/contact/page.tsx` | Contatti, telefono/mappa, form React. | PARZIALE |
| `/checkout` | `app/checkout/page.tsx` | Checkout in-shop simulato/localStorage. | PARZIALE/DIVERSO |
| `/privacy` | `app/privacy/page.tsx` | Privacy policy. | PARZIALE |
| `/cookie` | `app/cookie/page.tsx` | Cookie policy. | PARZIALE |
| `/admin` | `app/admin/page.tsx` | Admin overview read-only. | PARZIALE/NON MIGRATO per funzioni gestionali |

## Layout

`app/layout.tsx`:

- Metadata globale: title "No Cap Barbershop", description e-commerce/admin.
- Import `./globals.css`.
- Renderizza `children` e `SiteFooter` globale.

Nota tecnica:

- `SiteHeader` non e nel layout globale: viene importato in ogni page. Questo replica l'header sulle route principali ma crea rischio di inconsistenza se una nuova route dimentica l'import.

## Componenti

| Componente | File | Uso rilevato | Note |
|---|---|---|---|
| `SiteHeader` | `components/site-header.tsx` | Tutte le page principali | Header con nav route, logo, link checkout. |
| `SiteFooter` | `components/site-footer.tsx` | Layout globale | Footer con inline styles e link legali/admin. |
| `HeroSection` | `components/hero-section.tsx` | Home | Hero basato su `static-content`. |
| `HomeSectionBanners` | `components/home-section-banners.tsx` | Home | Banners route/query, non hash puri. |
| `ShopTeaser` | `components/shop-teaser.tsx` | Home | Teaser prodotti. |
| `HomeEditorialSections` | `components/home-editorial-sections.tsx` | Home | Ricostruisce fresh cut/showcase in home con contenuti statici. |
| `LiveShopSections` | `components/live-shop-sections.tsx` | Home, Shop | Legge sezioni Supabase pubbliche. |
| `BrandStory` | `components/brand-story.tsx` | Home | Sezione brand/contatti aggiuntiva. |
| `HomePublicHighlights` | `components/home-public-highlights.tsx` | Home | Highlights pubblici. |
| `ShopCatalog` | `components/shop-catalog.tsx` | `/shop` | Client component con ricerca, filtro categoria e sort nome. |
| `ShopProductGrid` | `components/shop-product-grid.tsx` | Shop, teaser | Card prodotto; CTA "Aggiungi" porta al checkout, non apre drawer. |
| `ContactForm` | `components/contact-form.tsx` | `/contact` | Client form con validazione e POST API. |
| `CheckoutInShop` | `components/checkout-in-shop.tsx` | `/checkout` | Checkout simulato localStorage, PayPal placeholder. |
| `CartCount` | `components/cart-count.tsx` | Header | Conteggio carrello Next localStorage. |
| `AdminReadonlyDashboard` | `components/admin-readonly-dashboard.tsx` | `/admin` | Pannello stato read-only. |
| `AdminAuthStatusPanel` | `components/admin-auth-status-panel.tsx` | `/admin` | Stato auth admin. |
| `AdminLoginPanel` | `components/admin-login-panel.tsx` | `/admin` | Login panel. |
| `AdminProductsSummaryPanel` | `components/admin-products-summary-panel.tsx` | `/admin` | Sintesi prodotti admin. |
| `AdminMigrationPanel` | `components/admin-migration-panel.tsx` | `/admin` | Stato migrazione. |
| `AdminFutureActions` | `components/admin-future-actions.tsx` | `/admin` | Azioni future/non operative. |

## Dati e librerie interne

| File | Scopo |
|---|---|
| `lib/static-content.ts` | Nav, hero, banner, teaser prodotti fallback, copy statico. |
| `lib/supabase-public.ts` | Fetch REST Supabase pubblico per prodotti, categorie, sezioni shop. |
| `lib/shop-content.ts` | Normalizzazione sicura contenuti shop sections. |
| `lib/public-flow.ts` | Copy e helper per flussi shop/contact/checkout. |
| `lib/contact-form.ts` | Validazione e payload form contatti. |
| `lib/server/contact-create.ts` | Handler server contatti. |
| `lib/server/api-core.ts` | Helper API server/env/errori. |
| `lib/admin-status.ts`, `lib/admin-products-summary.ts`, `lib/admin-auth-check.ts` | Client server-side verso endpoint admin/fallback. |
| `lib/server/admin-*` | Core server per API admin. |

## API route Next

| Route | File | Stato |
|---|---|---|
| `POST /api/contact/create` | `app/api/contact/create/route.ts` | Presente, delega a `handleContactCreate`. |
| `GET /api/admin/status` | `app/api/admin/status/route.ts` | Presente. |
| `GET /api/admin/products/summary` | `app/api/admin/products/summary/route.ts` | Presente. |
| `GET /api/admin/auth/check` | `app/api/admin/auth/check/route.ts` | Presente. |

Nota: in `destinazione/functions/api/` esistono anche API Cloudflare legacy/parallele per checkout, contact, admin e Stripe webhook. Questo crea doppio livello API da verificare.

## CSS

- `destinazione/next-prod/app/globals.css`: CSS globale Next.
- `destinazione/styles.css`: CSS legacy fuori da `next-prod`, probabilmente copia o residuo del vanilla.

La destinazione Next non usa CSS modules nonostante il README dica "CSS modules through the global `app/globals.css`": in pratica e CSS globale.

## Asset pubblici

Presenti in `destinazione/next-prod/public/Img`:

- `Design/NO CAP LOGO_1.png`
- `products/black-wax-packshot-opt.webp`
- `products/clay-pomade-packshot-opt.webp`
- `wallpaper/1-opt.webp`
- `wallpaper/3-opt.webp`
- `wallpaper/4-opt.webp`
- `wallpaper/5-opt.webp`
- `wallpaper/6-opt.webp`

Mancano rispetto a `sorgente/`:

- `Img/Design/BACKGROUND SLIDE-opt.webp`
- `Img/wallpaper/2-opt.webp`
- `aftershave-packshot/lifestyle`
- `black-wax-lifestyle`
- `clay-pomade-lifestyle`
- `dust-wax-packshot/lifestyle`
- `fade-dlc-packshot/lifestyle`
- `fade-gold-packshot/lifestyle`

Impatto:

- `lib/static-content.ts` referenzia `sea-salt-spray-packshot-opt.webp` e `sea-salt-spray-lifestyle-opt.webp`, non presenti nel sorgente ne in `public`.
- `productTeasers` referenzia `black-wax-lifestyle` e `clay-pomade-lifestyle`, non presenti in `public`.

## Test e controlli eseguiti

Comandi tentati da `destinazione/next-prod/`:

- `npm test`: fallisce prima dell'esecuzione logica dei test con `spawn EPERM` su tutti i 9 file test. Stato: DA VERIFICARE fuori sandbox o con permessi adeguati.
- `npm run lint`: fallisce con `"eslint" non e riconosciuto come comando interno o esterno`, coerente con dipendenze non installate/local bin assente. Stato: DA VERIFICARE dopo `npm install`.

Build non eseguita:

- `npm run build` non e stato eseguito perche creerebbe artefatti `.next` dentro `destinazione/next-prod/`, mentre questa fase permette solo file `.md` sotto `docs/audit-migrazione/`.

## Stato generale migrazione

La migrazione Next e funzionale come scheletro applicativo e route pubbliche, ma e parziale rispetto al comportamento vanilla. Le route sono state separate e molte feature sono state semplificate: checkout simulato, admin read-only, catalogo fallback ridotto, cookie consent non globale, showcase/fresh cut statici.
