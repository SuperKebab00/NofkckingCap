# Mappa progetto sorgente vanilla

## Panoramica

`sorgente/` e una single page application vanilla per No Cap Barber Shop. Tutte le pagine pubbliche e admin sono definite in `index.html` come sezioni `<section class="page-view" data-page="...">`, attivate tramite hash URL (`#home`, `#shop`, `#fresh-cut`, ecc.) e gestite da `app.js`.

Il sito combina e-commerce prodotti barber, showcase tagli, form contatto, checkout, area gestore, privacy/cookie policy, carrello drawer e consenso cookie.

## Struttura directory

| Path | Tipo | Descrizione |
|---|---|---|
| `sorgente/index.html` | HTML | Documento SPA con header, sezioni pagina, footer, drawer carrello, banner/modal cookie, toast. |
| `sorgente/styles.css` | CSS | Stili globali completi per layout, responsive, shop, admin, checkout, cookie, animazioni. |
| `sorgente/app.js` | JS module | Orchestrazione stato, routing hash, eventi, checkout, admin, cookie consent, rendering. |
| `sorgente/js/config.js` | JS module | Config runtime: Supabase, admin mode, cookie policy, hosting target, checkout mode. |
| `sorgente/js/data.js` | JS module | Catalogo statico prodotti, chiavi localStorage, fresh cut default. |
| `sorgente/js/repository.js` | JS module | Repository dati con fallback localStorage e integrazione Supabase. |
| `sorgente/js/render.js` | JS module | Rendering DOM per prodotti, carrello, checkout, fresh cut, showcase, inventario. |
| `sorgente/js/product-art.js` | JS module | Fallback SVG/data URI per prodotti senza immagine. |
| `sorgente/js/supabase-client.js` | JS module | Lazy import client Supabase da CDN. |
| `sorgente/js/storage.js` | JS module | Helper localStorage. |
| `sorgente/js/utils.js` | JS module | Formattazione valuta/date, escape HTML, file to data URL. |
| `sorgente/Img/Design/` | Asset | Logo e background design. |
| `sorgente/Img/products/` | Asset | Packshot/lifestyle prodotti reali. |
| `sorgente/Img/wallpaper/` | Asset | Immagini hero, fresh cut, showcase. |
| `sorgente/manifest.webmanifest` | PWA | Manifest base. |
| `sorgente/robots.txt` | SEO | Robots base. |
| `sorgente/_headers` | Deploy | Header Cloudflare/static hosting. |

## Pagine e sezioni in `index.html`

### `#home`

Scopo: homepage editoriale/e-commerce.

Sezioni:

- Header globale con logo, nav e trigger carrello.
- Hero con testo "Fresh gear. Zero cap.", CTA verso `#shop` e `#fresh-cut`.
- Section banners verso shop, categorie, fresh cut e showcase.

CSS/JS:

- Usa `styles.css`.
- Usa `app.js` per routing, header scroll, click su banner categoria.

Asset:

- Logo `Img/Design/NO CAP LOGO_1.png`.
- Preload `Img/wallpaper/1-opt.webp`.

Link interni:

- `#home`, `#shop`, `#fresh-cut`, `#showcase`, `#support`.

Comportamenti:

- Header elevato/nascosto su scroll mobile.
- Banner categoria con `data-category-link` che imposta il filtro shop.

### `#shop`

Scopo: catalogo prodotti pubblico con filtri, ricerca e ordinamento.

Sezioni:

- Banner shop.
- `category-bar` renderizzata dinamicamente.
- Tool ricerca `data-product-search`.
- Select ordinamento `data-product-sort`.
- Griglia prodotti `data-product-grid`.

CSS/JS:

- `renderProducts()` in `js/render.js`.
- Stato categoria/ricerca/sort in `app.js`.
- Dati da `js/data.js` o Supabase tramite `js/repository.js`.

Asset:

- Packshot/lifestyle in `Img/products/`.
- Fallback SVG/data URI da `js/product-art.js` per prodotti senza immagini.

Logiche:

- Filtra per categoria.
- Cerca su nome/label/descrizione.
- Ordina per consigliati, prezzo crescente/decrescente, disponibili, ultimi pezzi.
- Toggle packshot/risultato con `data-toggle-product-image`.
- Aggiunta carrello con `data-add-to-cart`.

### `#fresh-cut`

Scopo: evidenziare il taglio fresco del giorno.

Sezioni:

- Immagine grande `data-cut-image`.
- Titolo e descrizione dinamici `data-cut-title`, `data-cut-description`.
- CTA verso `#showcase`.

Asset:

- Default `Img/wallpaper/5-opt.webp`.
- Immagini uploadate dal gestore possono diventare base64 o URL Supabase.

Logiche:

- `renderFreshCut()` aggiorna immagine/testi.
- Admin puo pubblicare nuovo taglio tramite form in area gestione.

### `#showcase`

Scopo: mostrare i tagli caricati nel mese corrente.

Sezioni:

- Banner con mese corrente `data-current-month`.
- Griglia `data-showcase-grid`.

Logiche:

- `renderShowcase()` filtra `monthlyCuts` sul mese corrente.
- Stato vuoto se nessun taglio del mese.

### `#support`

Scopo: pagina contatti con dettagli negozio e form lead.

Sezioni:

- Banner contatti.
- Dettagli: telefono e Google Maps.
- Form con email, telefono, oggetto, messaggio, privacy.
- Link WhatsApp.

Logiche:

- Validazione email/telefono/messaggio/privacy in `validateContactForm()`.
- Creazione lead tramite `createLead()` in `repository.js`.
- Errori per campo tramite `data-contact-error-for`.

Integrazioni:

- `tel:+393208839692`.
- Google Maps search URL.
- WhatsApp `https://wa.me/393208839692`.

### `#privacy`

Scopo: informativa privacy placeholder da completare legalmente.

Note:

- Contiene titolare, dati raccolti, finalita, base giuridica, conservazione, diritti, contatto privacy.
- Esplicita nota: documento da completare con consulente legale.

### `#cookie`

Scopo: cookie policy e accesso preferenze.

Logiche:

- Bottone `data-open-consent` apre modal preferenze.
- Cookie tecnici, analytics, marketing.

### `#checkout`

Scopo: checkout ordine.

Sezioni:

- Form cliente: nome, email, telefono.
- Ritiro/spedizione con campi spedizione condizionali.
- Pagamento in sede o PayPal.
- Bottone conferma ordine.
- Success state con numero ordine, riepilogo, copia riepilogo e download JSON.

Logiche:

- Validazione in `validateCheckout()`.
- Payload in `buildOrderPayload()`.
- Persistenza ordine con `createOrder()`.
- Shipping pari a 6 EUR se fulfillment `shipping`.
- Modalita `paypal` registrata nel payload ma senza SDK PayPal reale nel file analizzato.
- Copia riepilogo via `navigator.clipboard`.
- Download JSON ordine via Blob.

### `#admin`

Scopo: area gestore completa.

Sezioni:

- Login gestore con email/password.
- Tab `DATI`, `GESTIONE`, `ORDINI`, `RICHIESTE`.
- KPI prodotti, lead, ordini, valore inventario.
- Gestione lead con azioni "Fatta" ed "Elimina".
- Gestione ordini con cambio stato e dettaglio.
- Fresh cut manager con upload immagine.
- Product manager con nuovo/modifica/rimuovi prodotto, immagini packshot/lifestyle.
- Site editor per titolo/copy/categorie shop.
- Inventario con incremento/decremento, restock, summary.

Logiche:

- `CONFIG.ADMIN_MODE` supporta `supabase-auth` e `local`.
- Sessione in `sessionStorage` con chiave `no-cap-admin-session-v2`.
- Accesso Supabase Auth tramite `getSupabaseClient()`.
- Mutazioni prodotti/categorie/ordini/lead tramite repository.

## Header, footer, overlay

Header:

- `.site-header` con logo, nav hash, manager toggle nascosto e cart trigger.
- Scroll behavior mobile in `syncHeaderOnScroll()`.

Footer:

- `.site-legal` con link privacy, cookie e preferenze cookie.

Overlay:

- `cart-drawer`: drawer carrello con totale e CTA checkout.
- `cookie-consent`: banner consenso.
- `cookie-modal`: preferenze analytics/marketing.
- `toast`: messaggi stato.

## Dati statici hardcoded

In `js/data.js`:

- 8 prodotti: `aftershave`, `black-wax`, `clay-pomade`, `dust-wax`, `fade-dlc`, `fade-gold`, `faper-dlc`, `comb-kit`.
- Categorie: `hair`, `styling`, `tools`, `accessories`.
- Prezzi, stock, restock, badge, colori, shape.
- Fresh cut default `Skin fade crop`.

In `index.html`:

- Copie hero, banner sezioni, contatti, legal.

In `js/config.js`:

- Supabase URL e anon key pubblica.
- `DATA_PROVIDER: "supabase"`.
- `ADMIN_MODE: "supabase-auth"`.
- `CHECKOUT_MODE: "paypal"`.
- Cookie policy version/max age.

## Dipendenze esterne CDN/integrate

- Google Fonts: Barlow Condensed e Inter in `index.html`.
- Supabase JS via import dinamico CDN in `js/supabase-client.js`.
- Google Maps link esterno.
- WhatsApp link esterno.

Non risultano script analytics/marketing caricati direttamente; il consenso imposta dataset e `window.NoCapConsent`, ma non carica provider esterni nel codice analizzato.

## Comportamento generale

Il sito vanilla e un'app client-side completa con stato persistito in localStorage/sessionStorage e opzionale backend Supabase. La UX principale e a sezioni scrollate/hash, non route server-side. Le parti piu ricche sono shop, checkout e admin, tutte dipendenti da molte query `data-*` e rendering DOM imperativo.
