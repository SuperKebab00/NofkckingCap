# Gap report

## Pagine

- `#home` -> `/`: migrazione parziale. La home Next non e una trasposizione esatta: aggiunge `BrandStory`, `HomePublicHighlights`, `LiveShopSections` e usa sezioni editoriali statiche. DA VERIFICARE se la differenza e voluta.
- `#shop` -> `/shop`: migrazione parziale. Mancano comportamento carrello drawer, toggle immagini prodotto e ordinamenti prezzo/disponibilita.
- `#fresh-cut` -> `/taglio-fresco`: migrazione parziale. La sorgente e dinamica da admin; Next e statica.
- `#showcase` -> `/showcase`: migrazione parziale. La sorgente mostra i tagli caricati nel mese corrente; Next mostra array statico `showcaseItems`.
- `#checkout` -> `/checkout`: diverso. Next esplicita flusso simulato/localStorage; sorgente crea ordine via repository con possibile Supabase.
- `#admin` -> `/admin`: non migrato per funzioni operative. Next e read-only/status, non gestionale.

## Route

- Route Next principali presenti: `/`, `/shop`, `/taglio-fresco`, `/showcase`, `/contact`, `/checkout`, `/privacy`, `/cookie`, `/admin`.
- Link potenzialmente incoerenti: in `lib/static-content.ts` alcune CTA puntano a `/#fresh-cut` e `/#showcase`, ma le sezioni Next equivalenti sono route dedicate `/taglio-fresco` e `/showcase`. La ricerca `rg 'href="/#|href="#'` non ha trovato literal TSX diretti, perche i valori sono nei dati statici.
- La navigazione principale usa route Next, non hash. Questo e coerente con App Router ma rompe la semantica SPA originale.

## Sezioni

- Hero: parziale, contenuto simile ma CTA secondaria non allineata.
- Section banners: parziale, alcune destinazioni route/query, altre hash.
- Fresh cut in home: diverso/statico in `HomeEditorialSections`; non collegato al dato `featuredCut`.
- Showcase in home e route: diverso/statico.
- Brand story/highlights: presenti in Next ma non direttamente equivalenti a sezioni vanilla.
- Cookie banner/modal: mancante come sezione globale/interattiva.
- Cart drawer: mancante.
- Toast globale: mancante.

## Componenti

- `ShopCatalog`: implementa ricerca/filtro/sort ma non tutti i sort vanilla.
- `ShopProductGrid`: non replica toggle packshot/lifestyle; entrambi i bottoni portano al checkout se manca href specifico.
- `CheckoutInShop`: funziona come simulazione, ma non come checkout backend equivalente.
- `AdminReadonlyDashboard` e pannelli admin: utili per stato migrazione ma non sostituiscono admin vanilla.
- `SiteFooter`: usa inline styles, diverso dal resto dell'impostazione CSS centralizzata.

## CSS/stile

- Next usa `app/globals.css`; sorgente usa `styles.css`.
- `destinazione/styles.css` e `destinazione/app.js` fuori `next-prod` sembrano residui/copia legacy.
- Il footer Next usa inline styles, rendendo piu difficile mantenere coerenza con `globals.css`.
- DA VERIFICARE visualmente: responsive header e comportamento scroll mobile, perche la logica JS vanilla non risulta migrata.

## Asset

Asset mancanti in `destinazione/next-prod/public/Img` rispetto al sorgente:

- `Img/Design/BACKGROUND SLIDE-opt.webp`
- `Img/wallpaper/2-opt.webp`
- `Img/products/aftershave-packshot-opt.webp`
- `Img/products/aftershave-lifestyle-opt.webp`
- `Img/products/black-wax-lifestyle-opt.webp`
- `Img/products/clay-pomade-lifestyle-opt.webp`
- `Img/products/dust-wax-packshot-opt.webp`
- `Img/products/dust-wax-lifestyle-opt.webp`
- `Img/products/fade-dlc-packshot-opt.webp`
- `Img/products/fade-dlc-lifestyle-opt.webp`
- `Img/products/fade-gold-packshot-opt.webp`
- `Img/products/fade-gold-lifestyle-opt.webp`

Riferimenti sospetti:

- `lib/static-content.ts` usa `/Img/wallpaper/2-opt.webp`, assente in `public`.
- `lib/static-content.ts` usa `/Img/products/black-wax-lifestyle-opt.webp`, assente in `public`.
- `lib/static-content.ts` usa `/Img/products/clay-pomade-lifestyle-opt.webp`, assente in `public`.
- `lib/static-content.ts` usa `/Img/products/sea-salt-spray-packshot-opt.webp` e `sea-salt-spray-lifestyle-opt.webp`, assenti sia in sorgente sia in Next.

## JS/logiche

Non migrate o ridotte:

- Routing hash e attivazione `.page-view`.
- Header elevato/nascosto su scroll mobile.
- Drawer carrello con focus management/Escape.
- Cookie consent con scadenza, versioning e categorie analytics/marketing.
- Admin CRUD prodotti.
- Admin upload immagini prodotto/fresh cut.
- Admin editor sezioni/categorie.
- Admin gestione ordini e lead.
- Inventory controls.
- Download/copia ordine.
- Product-art fallback SVG basato su shape/colori.

## Form/API

- Form contatti Next presente e migliorato con honeypot, ma invio dipende da `NEXT_PUBLIC_CONTACT_FORM_MODE` e API server/env.
- Checkout Next non invia ordine a API/backend; salva ordini simulati in localStorage con chiave `no-cap-next-orders-v1`.
- API Next presenti: contact create, admin status, admin products summary, admin auth check.
- API Cloudflare legacy presenti in `destinazione/functions/api/`, inclusi checkout create/capture/stripe verify/webhook. DA VERIFICARE quale layer sia usato in deploy finale.

## Responsive

DA VERIFICARE con browser/screenshot in fase successiva:

- Header mobile: manca logica scroll vanilla.
- Product cards: asset mancanti possono cambiare layout/altezza.
- Checkout Next: layout complesso con griglie e modal PayPal placeholder.
- Admin Next: molte card/status panel; verificare su viewport mobile.

## SEO/accessibilita

- Next route hanno `metadata` base, miglioramento rispetto a SPA hash.
- Mancano manifest/robots in `next-prod/public` rispetto a sorgente.
- Cookie preferences non disponibili globalmente: possibile gap privacy/compliance.
- Header `data-elevated="false"` statico: non problema SEO, ma possibile stato ARIA/UX non coerente.
- Shop card: bottone "Aggiungi" e "Vedi risultato" possono portare allo stesso flusso, etichetta potenzialmente fuorviante.

## Pulizia progetto

- `destinazione/` contiene legacy root (`index.html`, `app.js`, `styles.css`, `js/`) oltre a `next-prod/`.
- `destinazione/functions/api/` duplica/parallela API Next.
- Documenti di migrazione multipli in `destinazione/` (`NEXT_MIGRATION_MAP.md`, `ADMIN_MIGRATION_PLAN.md`, `MIGRATION_COMPATIBILITY_CONTRACT.md`) possono essere utili ma vanno allineati con lo stato attuale.
- `productTeasers` contiene Sea salt spray, non presente nel catalogo sorgente.

## Build/test/lint

- `npm test`: non verificato funzionalmente. Tutti i test falliscono subito con `spawn EPERM` nel sandbox.
- `npm run lint`: non verificato. `eslint` non riconosciuto, probabile assenza di `node_modules`.
- `npm run build`: non eseguito per rispettare vincolo di non generare file di build in questa fase.
