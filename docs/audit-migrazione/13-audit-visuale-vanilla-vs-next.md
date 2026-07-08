# 13 - Audit visuale vanilla vs Next.js

Data audit: 2026-07-06

Scope: confronto visuale tra `sorgente/` vanilla HTML/CSS/JS e `destinazione/next-prod/` Next.js dopo il primo batch conservativo.

Modalita: sola analisi. Nessun codice applicativo, CSS, asset, route, checkout, admin, Supabase o Cloudflare e' stato modificato.

## 1. Sintesi generale

La migrazione Next.js e' funzionalmente piu ordinata e le route principali esistono, ma la resa visuale non e' ancora allineata al vanilla. Le cause principali sono:

1. **Font non caricati in Next.js**: il vanilla importa Google Fonts da `sorgente/index.html`, mentre Next.js non importa `Barlow Condensed` e `Inter` in `app/layout.tsx` ne via `next/font`. In browser Next risolve molti testi su `Inter, ui-sans-serif, system-ui...`, quindi il display font del vanilla non viene effettivamente replicato.
2. **Cascata CSS duplicata in `app/globals.css`**: il file Next contiene una prima area "prod-ready visual parity overrides" vicina al vanilla e una seconda area successiva che sovrascrive header, body, hero, bottoni, sezioni e card. La seconda area e' quella che vince nel rendering.
3. **Tema globale diverso**: vanilla usa fondo chiaro paper con texture `Img/Design/BACKGROUND SLIDE-opt.webp`; Next usa fondo nero con radial gradient rosso.
4. **Header diverso**: vanilla ha header chiaro, griglia, logo grande e nav testuale; Next ha header scuro, flex, logo piu piccolo e nav a pill.
5. **Hero diversa**: vanilla e' full-width/full-bleed con pannello rosso laterale; Next su home usa container max `1120px`, media card e layout piu da dashboard/editoriale.
6. **Product card diverse**: vanilla usa card scure, squadrate, con accenti rossi e doppia immagine/hover; Next usa card chiare, arrotondate, a due colonne, senza lo stesso trattamento dual-media.
7. **Fresh cut e showcase sono redesign**: le route `/taglio-fresco` e `/showcase` sono equivalenze contenutistiche parziali, non riproduzioni visuali delle sezioni embedded vanilla.
8. **Responsive non allineato**: vanilla usa breakpoint `1180px`, `780px`, `430px`; Next usa breakpoint e regole sovrapposte diverse. Su mobile Next crea un header molto alto e pill nav, mentre vanilla usa nav orizzontale scrollabile e look piu compatto.

Comandi/controlli eseguiti:

```bash
python -m http.server 8080 --bind 127.0.0.1
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Campionamento browser:

- Vanilla: `http://127.0.0.1:8080/`, `/#shop`, `/#fresh-cut`, `/#showcase`
- Next: `http://127.0.0.1:3000/`, `/shop`, `/taglio-fresco`, `/showcase`
- Viewport: `1440x900`, `1280x900`, `768x1024`, `390x844`

## 2. Tabella differenze font

| Elemento | Vanilla | File vanilla | Next.js renderizzato | File Next.js | Stato | Note |
|---|---|---|---|---|---|---|
| Import font | Google Fonts: `Barlow Condensed` 500-900 + `Inter` 400-700 | `sorgente/index.html:14-16` | Nessun import Google Fonts/`next/font`; solo `app/globals.css` | `destinazione/next-prod/app/layout.tsx:1-19`, `app/globals.css:1-11` | DIVERSO | In browser Next usa `Inter, ui-sans-serif, system-ui...`; `Barlow Condensed` non risulta caricato dalla app. |
| Variabili font | `--font-display: "Barlow Condensed", Impact, sans-serif`; `--font-body: "Inter", Arial, sans-serif` | `sorgente/styles.css:1-14` | `--font-display` usato in alcune regole ma non definito in modo affidabile nella root finale; root iniziale imposta direttamente font-family Inter/system | `app/globals.css:1-11`, `app/globals.css:342-350` | PARZIALE | Diverse regole Next chiamano `var(--font-display)`, ma la resa effettiva su header/bottoni/card campionati e' system/Inter. |
| Body | `Inter, Arial, sans-serif`, 16px | `sorgente/styles.css:29-37` | `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | `app/globals.css:1-11`, `app/globals.css:1212-1225` | DIVERSO | Fallback piu ampio e tema body diverso. |
| Nav | `Barlow Condensed`, uppercase, peso 800, letter-spacing `0.08em`; desktop testo semplice, mobile pill rosse/soft | `styles.css:105-160`, `styles.css:2403-2437` | System/Inter, uppercase, peso 800, letter-spacing `0.04em`, pill con bordo sempre visibili | `components/site-header.tsx:8-31`, `app/globals.css:1234-1285` | DIVERSO | Campione desktop 1440: vanilla `15.04px`, letter-spacing `1.2032px`; Next `13.12px`, letter-spacing `0.5248px`. |
| H1 hero home | `Barlow Condensed`, italic, 900, `clamp(4.8rem, 12vw, 11.8rem)`, line-height `0.78` | `styles.css:292-303` | System/Inter, italic, 900, `clamp(4rem, 11vw, 9.4rem)`, line-height `0.82` | `components/hero-section.tsx:8-31`, `app/globals.css:1330-1344` | DIVERSO | A 1440px: vanilla H1 `172.8px`, Next H1 `144px`; Next e' meno alto e piu stretto. |
| Eyebrow | `Barlow Condensed`, rosso, uppercase, letter-spacing `0.08em`/varianti | `styles.css:111-119`, `styles.css:463` | System/Inter, rosso, uppercase, letter-spacing `0.14em` | `app/globals.css:1311-1318` | DIVERSO | Next ha tracking maggiore sugli eyebrow ma font non display. |
| Bottoni | `Barlow Condensed`, 16px, peso 800, letter-spacing `1.28px`, altezza 44px desktop, squadrati | `styles.css:358-383` | System/Inter, 13.12px, peso 800, letter-spacing `0.5248px`, altezza 40px, pill `999px` | `app/globals.css:1265-1285`, `app/globals.css:1378-1386` | DIVERSO | Differenza molto visibile su CTA e nav. |
| Titolo product card | `Barlow Condensed`, uppercase, peso 800, letter-spacing circa `0.05em`, bianco | `styles.css:1115-1124` | System/Inter su home/shop renderizzato, italic, 32px, colore in parte ereditato da blocco precedente | `components/shop-product-grid.tsx:60-84`, `app/globals.css:904-910`, `app/globals.css:1461-1491` | POTENZIALE BUG | La cascata mescola card chiara finale e titolo definito da blocco card scuro precedente. |

## 3. Tabella differenze colori

| Elemento | Vanilla | Next.js | File responsabili | Stato | Note |
|---|---|---|---|---|---|
| Rosso primario | `--red: #d40f19` | `--nc-red: #d31519` | `sorgente/styles.css:1-14`, `app/globals.css:342-350` | DIVERSO | Differenza minima ma reale; va normalizzata se si cerca parity. |
| Rosso scuro | `--red-dark: #980912` | `--nc-red-dark: #9d1013` | stessi file | DIVERSO | Visibile su gradienti rossi. |
| Fondo globale | Paper chiaro con texture: `linear-gradient(...), url("Img/Design/BACKGROUND SLIDE-opt.webp")` | Nero con radial gradient rosso: `radial-gradient(...), #090909` | `styles.css:29-37`, `app/globals.css:1212-1225` | DIVERSO | E' una delle cause principali del cambio di atmosfera. |
| Header | Bianco `rgba(255,255,255,.94)`, testo nero | Nero traslucido `rgb(9 9 9 / 88%)`, testo nav chiaro | `styles.css:79-94`, `app/globals.css:1234-1253` | DIVERSO | La prima regola Next a `app/globals.css:360-382` era piu fedele, ma viene sovrascritta. |
| Hero | Immagine wallpaper 1 + overlay nero + pannello rosso | Home Next ha immagine wallpaper 1 ma in container; route banner usano overlay nero su immagini dedicate | `styles.css:250-356`, `app/globals.css:1292-1426`, `app/globals.css:720-776` | PARZIALE | Asset simile, composizione diversa. |
| CTA primaria | Rosso `#d40f19` con testo bianco | Rosso `#d31519` con testo nero | `styles.css:371-376`, `app/globals.css:1378-1381` | DIVERSO | Il contrasto e il feeling cambiano molto. |
| CTA outline | Trasparente/bordo bianco su hero, squadrata | Pill con bordo bianco alpha, testo `#f7f3ed` | `styles.css:358-383`, `app/globals.css:1383-1386` | DIVERSO | Coerente con redesign Next, non con vanilla. |
| Card prodotto | Scura `#101010/#111`, testo bianco, bordo alpha/nero, shadow inset | Chiara `#f7f3ed`, testo nero, bordo nero, radius 8px | `styles.css:990-1182`, `app/globals.css:869-955`, `app/globals.css:1455-1491` | DIVERSO / POTENZIALE BUG | In Next esistono due definizioni concorrenti: una scura e una chiara. La chiara vince su layout/background. |
| Footer | Nero pieno, padding 7vw, testo bianco alpha | Nero pieno, contenuto inline style max `1120px`, testo chiaro | `styles.css` footer area, `components/site-footer.tsx:3-34`, `app/globals.css` | PARZIALE | Colore simile, spacing e struttura diversi. |
| Badge/status | Vanilla usa badge rossi/neri e stock badge integrati nella card | Next usa `status-badge`, `ghost-button`, pill e note admin-like | `styles.css`, `app/shop/page.tsx:87-156`, `components/shop-catalog.tsx:124-268` | DIVERSO | Su shop Next il linguaggio visivo e' piu gestionale. |

## 4. Tabella differenze layout/spacing

| Area | Vanilla | Next.js | Evidenza browser | Stato | Note |
|---|---|---|---|---|---|
| Container globale | Molte sezioni full-width con padding `7vw` | `.hero,.section { width: min(1120px, calc(100% - 36px)); margin: 0 auto; }` | Home Next desktop hero width `1120px`; vanilla hero width `1425px` su viewport 1440 | DIVERSO | Next restringe il layout anche dove vanilla era full-bleed. |
| Header desktop | Grid `220px 1fr auto`, padding laterale `7vw`, min-height 70/effettivo 161px con logo | Flex, padding `18px clamp(18px,4vw,52px)`, logo 86px, altezza campionata 142px | Vanilla desktop header 161px; Next desktop 142px | DIVERSO | Vanilla logo grande e nav centrale; Next header compatto scuro. |
| Header mobile | Grid, logo grande, nav scrollabile, altezza campionata 219px | Flex wrap, nav pill, altezza campionata 301px | 390px: vanilla 219px; Next 301px | POTENZIALE BUG | L'header Next consuma molto primo viewport. |
| Hero desktop home | Full-width, altezza campionata 836px a 1440, grid con pannello laterale | Container 1120px, altezza 822px, due colonne content/media | Entrambe alte, ma Next e' incorniciata e meno full-bleed | DIVERSO | Anche se l'asset e' simile, composizione non e' equivalente. |
| Hero mobile home | Full-width 375px, altezza 523px dopo header | Container 347px, altezza 585px dopo header piu alto | 390px: Next parte piu in basso e ha larghezza ridotta | DIVERSO | Percezione mobile piu pesante in Next. |
| Section banners | 5 colonne desktop full-width, gap 1px, padding `7vw`; mobile 1 colonna | Next mantiene 5 item ma con padding/struttura diversa; su tablet 2 colonne | Desktop Next width 1425 e 5 colonne; tablet Next 2 colonne, vanilla tablet 1 colonna | PARZIALE | La griglia e' simile solo su desktop. |
| Shop grid | Vanilla sezione `#shop` embedded, 4 colonne desktop, 1 colonna mobile, card scure | Next `/shop` usa route, panel, filtri, `ShopCatalog`, `ShopProductGrid`; grid 2 colonne desktop nelle sezioni principali | Home Next product grid desktop 2 colonne; vanilla shop 4 colonne | DIVERSO | Il catalogo Next e' stato ricostruito, non copiato. |
| Product card | Card blocco verticale scura con media sopra e footer CTA | Card grid due colonne, immagine 160px, testo a destra, background chiaro | Desktop Next card 552x361, grid `160px 330px`; vanilla card scura verticale | DIVERSO | Va deciso se riallineare a vanilla o mantenere redesign. |
| Fresh cut | Sezione full-width scura/rossa con media e contenuto integrati | Route `/taglio-fresco` con `page-banner` e `fresh-cut-section--route` | Next route usa page banner dedicato, non sezione home identica | PARZIALE | Contenuto simile, layout di route diverso. |
| Showcase | Griglia embedded a 3 colonne vanilla, sezione mese corrente | Route `/showcase`, page banner + griglia 4 colonne desktop | Next desktop showcase grid 4 colonne; vanilla grid 3 colonne | DIVERSO | Next cambia densita e gerarchia. |

## 5. Confronto homepage

### Vanilla `sorgente/index.html` + `sorgente/styles.css`

La home vanilla e' una single page con:

- header chiaro sticky;
- hero full-bleed su `Img/wallpaper/1-opt.webp`;
- headline enorme `Fresh gear.Zero cap.`;
- pannello rosso laterale con `NC`;
- CTA squadrate rosso/outline;
- `section-banners` a 5 tile full-width;
- sezioni interne collegate via hash: `#shop`, `#fresh-cut`, `#showcase`, `#support`, `#privacy`, `#cookie`, `#admin`;
- card prodotto scure e compatte;
- footer nero.

File principali:

- `sorgente/index.html`
- `sorgente/styles.css`
- `sorgente/script.js`

### Next `/`

La home Next usa:

- `app/page.tsx`
- `components/site-header.tsx`
- `components/hero-section.tsx`
- `components/home-section-banners.tsx`
- `components/shop-teaser.tsx`
- `components/live-shop-sections.tsx`
- `components/home-editorial-sections.tsx`
- `components/home-public-highlights.tsx`
- `components/brand-story.tsx`
- `components/site-footer.tsx`
- `app/globals.css`

Differenze principali:

| Sezione | Stato visuale | Differenza |
|---|---|---|
| Header | DIVERSO | Vanilla chiaro/grid/logo grande; Next scuro/flex/logo 86px/pill nav. |
| Hero | PARZIALE | Asset e testi simili, ma Next e' containerizzata e ha media-card; vanilla e' full-bleed con pannello rosso laterale. |
| CTA | DIVERSO | Vanilla bottoni squadrati con display font e testo bianco; Next pill system-font con testo nero sulla primaria. |
| Section banners | PARZIALE | Next ha gli stessi concetti e link route corretti, ma responsive e spacing diversi. |
| Shop teaser/prodotti | DIVERSO | Next mostra prodotti in home come teaser a due colonne; vanilla shop e' sezione/hash con griglia 4 colonne e card scure. |
| Fresh cut | PARZIALE | Next include sezione editoriale con CTA route; non replica esattamente il blocco vanilla. |
| Showcase | PARZIALE | Next usa card/spotlight e route dedicata; vanilla e' sezione dinamica embedded. |
| Banner/footer | PARZIALE | Footer colore simile, ma struttura e padding diversi. |

Nota: la home Next contiene piu blocchi editoriali rispetto alla home vanilla originale. Non e' solo una migrazione visuale, ma un redesign con sezioni aggiuntive.

## 6. Confronto shop

### Vanilla shop

Nel vanilla lo shop e' una sezione `#shop` della single page:

- griglia prodotti embedded;
- filtri/categorie legati allo stato JS;
- card prodotto scura;
- doppia immagine prodotto/lifestyle con hover o stato risultato;
- badge categoria/stock;
- prezzo e CTA nel footer card;
- nav hash interna.

CSS principali:

- `sorgente/styles.css:990-1182` per product card;
- `sorgente/styles.css` aree product grid/shop;
- `sorgente/script.js` per filtro, catalogo, carrello e interazioni.

### Next `/shop`

La route Next usa:

- `app/shop/page.tsx`
- `components/shop-catalog.tsx`
- `components/shop-product-grid.tsx`
- `components/live-shop-sections.tsx`
- `lib/static-content.ts`
- `app/globals.css`

Differenze visuali:

| Elemento | Stato | Note |
|---|---|---|
| Route dedicata | DIVERSO | Next usa `/shop`, non `#shop`. Funzionalmente ok dopo batch, ma UX cambia. |
| Page hero | DIVERSO | Next ha `page-hero`/panel, vanilla entra nella sezione shop della SPA. |
| Filtri/ordinamenti | PARZIALE | Gli ordinamenti conservativi sono presenti; l'aspetto e' piu form/panel che shop visuale vanilla. |
| Griglia | DIVERSO | Vanilla desktop punta a 4 colonne; Next usa layout piu largo/2 colonne in molte aree renderizzate. |
| Card | DIVERSO | Vanilla scura verticale; Next chiara a due colonne. |
| Immagini prodotto | PARZIALE | Asset copiati e visibili; manca il comportamento dual-media/lifestyle equivalente. |
| Prezzo/stock/badge | PARZIALE | Dati fallback coerenti dopo batch; resa badge e stock diversa. |
| Hover | NON MIGRATO / DIVERSO | Vanilla ha transizioni card/media; Next non replica la doppia immagine e la stessa intensita hover. |

DA VERIFICARE: durante il campionamento del vanilla alcuni stati hash hanno restituito un'immagine con `src` vuoto in DOM, ma non risultava visivamente rotta nei controlli route gia documentati in `12-verifica-post-batch-1.md`. Potrebbe essere un placeholder nascosto/gestito da JS vanilla, non un errore visivo reale.

## 7. Confronto Fresh cut e Showcase

### Fresh cut

Vanilla:

- sezione `#fresh-cut`;
- background scuro/rosso con `Img/wallpaper/5-opt.webp`;
- layout editoriale full-width;
- media, stamp, titolo, descrizione e CTA;
- contenuti aggiornabili tramite logica JS/admin locale.

Next:

- route `/taglio-fresco`;
- `app/taglio-fresco/page.tsx`;
- `page-banner page-banner--fresh`;
- `fresh-cut-section fresh-cut-section--route`;
- CTA verso `/showcase` e `/contact`.

Stato: **PARZIALE / DIVERSO**.

Motivo: il contenuto e l'intenzione sono migrati, ma la pagina e' una route ridisegnata con page banner dedicato. Non e' una replica pixel/layout della sezione embedded vanilla.

### Showcase

Vanilla:

- sezione `#showcase`;
- griglia `showcase-grid` a 3 colonne desktop;
- contenuto mese corrente;
- card scure/visuali coerenti con il resto della SPA.

Next:

- route `/showcase`;
- `app/showcase/page.tsx`;
- `page-banner page-banner--showcase`;
- `showcase-section`;
- `showcase-grid`;
- CTA verso `/contact` e `/shop`.

Stato: **DIVERSO**.

Motivo: la route Next e' piu simile a una pagina portfolio autonoma. A 1440px il campionamento mostra griglia Next a 4 colonne (`292px` circa ciascuna), mentre vanilla usa 3 colonne nella sezione originale.

## 8. Confronto responsive

| Breakpoint | Vanilla | Next.js | Stato | Note |
|---|---|---|---|---|
| Desktop 1440px | Header chiaro 161px, hero full-width 1425px x 836px, H1 172.8px, banners 5 colonne | Header scuro 142px, hero home container 1120px x 822px, H1 144px, card shop 2 colonne | DIVERSO | La home Next sembra piu stretta e meno poster-like. |
| Laptop 1280px | Header chiaro 161px, hero full-width 1265px x 656px, banners 5 colonne | Header scuro 142px, hero container, sezioni max 1120px | DIVERSO | Il passaggio da full-width a container e' evidente. |
| Tablet 768px | Header chiaro alto 219px, nav scrollabile, hero 753px x 540px, banners 1 colonna | Header scuro alto 253px, nav pill wrap, hero 717px x 591px, banners 2 colonne | DIVERSO / POTENZIALE BUG | Next occupa piu spazio di header e cambia densita banner. |
| Mobile 390px | Header chiaro 219px, hero full-width 375px x 523px, H1 62.4px, banners 1 colonna | Header scuro 301px, hero 347px x 585px, H1 circa 78px, nav pill | POTENZIALE BUG | L'header Next e' molto alto; il primo contenuto utile slitta sotto. |

CSS responsive rilevante:

- Vanilla:
  - `sorgente/styles.css:2322` breakpoint `max-width: 1180px`
  - `sorgente/styles.css:2362` breakpoint `max-width: 780px`
  - `sorgente/styles.css:2704` breakpoint `max-width: 430px`
- Next:
  - `app/globals.css:1118-1194` prima serie responsive
  - `app/globals.css:1618-1669` seconda serie responsive finale

La presenza di due serie responsive in Next aumenta il rischio di effetti non intenzionali: alcune regole "parity" iniziali sono sovrascritte da regole finali piu generiche.

## 9. CSS/componenti responsabili delle differenze

### Vanilla

| File | Responsabilita visuale |
|---|---|
| `sorgente/index.html:14-19` | Import Google Fonts e stylesheet principale. |
| `sorgente/styles.css:1-14` | Token colore/font originali. |
| `sorgente/styles.css:29-37` | Body paper/texture e font body. |
| `sorgente/styles.css:79-160` | Header, nav, logo, stato active. |
| `sorgente/styles.css:250-356` | Hero full-bleed, pannello rosso, tipografia display. |
| `sorgente/styles.css:358-383` | Bottoni squadrati, hover, CTA. |
| `sorgente/styles.css:503-680` | Section banners e tile visuali. |
| `sorgente/styles.css:681-855` | Fresh cut section. |
| `sorgente/styles.css:856-950` | Showcase grid/card. |
| `sorgente/styles.css:990-1182` | Product card, media, hover/dual image, CTA. |
| `sorgente/styles.css:2322-2728` | Breakpoint responsive principali. |

### Next.js

| File | Responsabilita visuale |
|---|---|
| `destinazione/next-prod/app/layout.tsx:1-19` | Layout root; non carica font dedicati. |
| `destinazione/next-prod/app/globals.css:1-11` | Root iniziale scura con font system. |
| `destinazione/next-prod/app/globals.css:342-350` | Token `--nc-*` parziali. |
| `destinazione/next-prod/app/globals.css:360-955` | Prima serie di regole visual parity, piu vicina al vanilla. |
| `destinazione/next-prod/app/globals.css:1212-1669` | Seconda serie finale che sovrascrive body/header/hero/button/section/product card/responsive. |
| `destinazione/next-prod/components/site-header.tsx:8-31` | Struttura header e nav route. |
| `destinazione/next-prod/components/hero-section.tsx:3-36` | Markup hero home, pannello e CTA. |
| `destinazione/next-prod/components/home-section-banners.tsx:3-47` | Tile home e link route dedicate. |
| `destinazione/next-prod/components/home-editorial-sections.tsx:8-66` | Fresh cut/showcase embedded in home, con molti inline style. |
| `destinazione/next-prod/app/shop/page.tsx:87-156` | Hero/panel shop e status badge. |
| `destinazione/next-prod/components/shop-catalog.tsx:124-268` | Filtri, form, categorie, empty states; diversi inline style. |
| `destinazione/next-prod/components/shop-product-grid.tsx:60-84` | Markup product card Next. |
| `destinazione/next-prod/app/taglio-fresco/page.tsx:16-49` | Route Fresh Cut ridisegnata. |
| `destinazione/next-prod/app/showcase/page.tsx:38-80` | Route Showcase ridisegnata. |
| `destinazione/next-prod/components/site-footer.tsx:3-34` | Footer con inline style. |

## 10. Priorita di intervento

| Priorita | Intervento | Motivo | Rischio |
|---|---|---|---|
| P0 | Decidere la sorgente di verita visuale: vanilla parity o redesign Next | Senza questa decisione ogni fix rischia di confliggere con il redesign esistente | Medio |
| P0 | Caricare font `Barlow Condensed` e `Inter` in Next | E' il mismatch piu visibile e meno invasivo | Basso |
| P0 | Razionalizzare variabili CSS colori/font senza cambiare componenti | Riduce drift cromatico e tipografico | Basso/Medio |
| P1 | Rimuovere o isolare la doppia cascata in `app/globals.css` in una fase successiva | Oggi regole iniziali e finali si contraddicono | Medio |
| P1 | Allineare bottoni globali a vanilla | CTA, nav e product card cambiano molto per font, radius, colore testo | Basso |
| P1 | Allineare header desktop/mobile | Header Next e' scuro e su mobile troppo alto rispetto al vanilla | Medio |
| P1 | Allineare hero home | Full-width/pannello rosso vs container/media-card e' differenza primaria | Medio |
| P2 | Allineare product card shop | Molto impattante ma tocca card/catalogo e hover | Medio |
| P2 | Allineare section banners responsive | Tablet/mobile differiscono nei breakpoint | Basso/Medio |
| P2 | Allineare fresh cut/showcase route o dichiararle redesign | Serve scelta UX: pagine dedicate fedeli o pagine editoriali nuove | Medio |

## 11. Primo batch visuale consigliato

Batch conservativo proposto per una fase successiva. Non applicato in questa fase.

### 1. Caricamento font in Next

- File: `destinazione/next-prod/app/layout.tsx`
- File: `destinazione/next-prod/app/globals.css`
- Modifica proposta: introdurre `next/font/google` oppure import controllato equivalente per `Barlow Condensed` e `Inter`; collegare class/variabili CSS a `--font-display` e `--font-body`.
- Perche: e' il fix piu ad alto impatto e basso rischio per avvicinare headline, nav, CTA e card.
- Verifica: browser computed style su `h1`, `.main-nav a`, `.primary-button`, `.product-card h3`.
- Rischio: basso.

### 2. Normalizzazione token CSS

- File: `destinazione/next-prod/app/globals.css`
- Modifica proposta: allineare token base a vanilla:
  - `--red: #d40f19` oppure mapping chiaro da `--nc-red`;
  - `--red-dark: #980912`;
  - `--ink`, `--paper`, `--font-display`, `--font-body`.
- Perche: riduce differenze cromatiche e rende piu leggibile la cascata.
- Verifica: computed color su CTA, eyebrow, body.
- Rischio: basso.

### 3. Bottoni globali

- File: `destinazione/next-prod/app/globals.css`
- Modifica proposta: rendere `.primary-button`, `.outline-button`, `.ghost-button` piu vicini al vanilla: display font, altezza 44px, padding `0 24px`, radius `0`, testo primary bianco, letter-spacing `0.08em`.
- Perche: CTA e nav sono ripetute ovunque e danno subito identita vanilla.
- Verifica: home `/`, `/shop`, `/taglio-fresco`, `/showcase`.
- Rischio: basso/medio per impatto diffuso.

### 4. Spacing globale sezioni

- File: `destinazione/next-prod/app/globals.css`
- Modifica proposta: per home valutare sezioni full-width o padding `7vw` dove vanilla lo richiede; non toccare checkout/admin.
- Perche: il container `1120px` rende la home meno full-bleed.
- Verifica: viewport 1440/1280/768/390 su `/`.
- Rischio: medio.

### 5. Header parity minima

- File: `destinazione/next-prod/app/globals.css`
- File: `destinazione/next-prod/components/site-header.tsx` solo se necessario in fase futura
- Modifica proposta: portare header verso sfondo chiaro, logo piu grande, nav display font; limitare altezza mobile.
- Perche: e' una delle differenze piu evidenti sopra la piega.
- Verifica: altezza header a 1440, 768, 390; nav senza overflow incoerente.
- Rischio: medio.

### 6. Product card visuale minima

- File: `destinazione/next-prod/app/globals.css`
- File: `destinazione/next-prod/components/shop-product-grid.tsx` solo se necessario in fase futura
- Modifica proposta: prima solo CSS: dark card, testo bianco, radius 0, font display sui titoli, CTA coerenti. Rimandare dual-image/hover complesso.
- Perche: migliora subito equivalenza shop senza toccare checkout, API o dati.
- Verifica: `/shop` e home product teaser.
- Rischio: medio.

### 7. Piccoli fix responsive

- File: `destinazione/next-prod/app/globals.css`
- Modifica proposta: ridurre altezza header mobile, controllare griglia banner tablet/mobile, mantenere testo dentro container.
- Perche: a 390px Next ha header campionato a 301px contro 219px vanilla.
- Verifica: 390x844 e 768x1024 su `/`, `/shop`, `/taglio-fresco`, `/showcase`.
- Rischio: basso/medio.

## Esclusioni esplicite dal batch visuale

Non includere nel primo batch visuale:

- checkout;
- admin;
- Supabase;
- Cloudflare;
- API;
- cookie consent;
- refactor pesanti;
- migrazione a `next/image`;
- cancellazione o rinomina file;
- modifiche dati sensibili.

## Conclusione operativa

La migrazione e' navigabile e il primo batch ha migliorato equivalenza di link/catalogo, ma la visual parity non e' ancora raggiunta. Il disallineamento non dipende da un singolo bug: deriva da una combinazione di font mancanti, tema globale differente, cascata CSS duplicata e componenti Next ridisegnati. Il prossimo passo consigliato e' un batch visuale conservativo che parta da font, token, bottoni e header prima di toccare card prodotto e layout hero.
