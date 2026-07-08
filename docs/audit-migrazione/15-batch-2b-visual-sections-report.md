# Batch 2B - Visual sections parity

## 1. Modifiche applicate

Questo batch ha applicato un riallineamento visuale conservativo, limitato a CSS globale, per avvicinare la resa Next.js alle sezioni vanilla senza cambiare componenti, route, dati o logiche.

Interventi principali:

- background globale piu vicino al paper/texture vanilla;
- hero homepage piu full-bleed, con overlay e pannello rosso editoriale;
- banner/sezioni editoriali homepage piu compatti e fotografici;
- griglia prodotti e product card piu scure, squadrate e dense;
- fresh cut piu simile alla sezione vanilla dark/red;
- showcase piu editoriale, con card scure e griglia piu coerente;
- footer piu compatto, scuro e tipograficamente vicino al vanilla;
- piccoli adattamenti responsive su desktop, tablet e mobile.

Non sono stati modificati file TSX, asset, dati catalogo, route, checkout, admin, API, Supabase, Cloudflare o configurazioni.

## 2. File modificati

| File | Tipo modifica | Note |
|---|---|---|
| `destinazione/next-prod/app/globals.css` | CSS globale | Aggiunto blocco finale `Batch 2B: section-level vanilla visual parity`. |
| `docs/audit-migrazione/15-batch-2b-visual-sections-report.md` | Documentazione | Report di batch e verifica. |

## 3. Sezioni riallineate

| Sezione | Stato dopo Batch 2B | Note |
|---|---|---|
| Homepage hero | Migliorata | Ora usa resa full-width, overlay, wallpaper e pannello rosso piu vicino al vanilla. |
| Banner editoriali homepage | Migliorati | Layout desktop a 5 colonne, tile scure/fotografiche e hover minimo. |
| Product grid | Migliorata | Desktop a 4 colonne, card scure e piu squadrate. |
| Product card | Migliorata | Packshot piu leggibile, fondo scuro, bordo sottile, CTA piu coerenti. |
| Fresh cut homepage | Migliorata | Sezione dark/red con wallpaper e griglia editoriale. |
| Fresh cut route | Migliorata | Pagina dedicata mantiene contenuto ma assume look piu coerente. |
| Showcase homepage | Migliorata | Card scure e griglia editoriale. |
| Showcase route | Migliorata | Griglia a 3 colonne desktop, 1 colonna mobile. |
| Footer | Migliorato | Sfondo nero, spacing piu compatto, tipografia display. |

## 4. Modifiche background

Il vanilla usa un forte linguaggio visivo basato su sfondi paper/texture e wallpaper fotografici. In Next la texture `BACKGROUND SLIDE-opt.webp` citata nei report non risulta presente in `destinazione/next-prod/public/Img/Design/`; in questa fase non sono stati copiati asset perche il batch vietava modifiche ad asset e immagini.

Soluzione applicata:

- `body` e `.page-shell` usano un fallback CSS paper-like con gradienti leggeri;
- il colore base resta caldo/off-white;
- le sezioni scure usano overlay e wallpaper gia presenti in `public/Img/wallpaper/`.

DA VERIFICARE: in un batch futuro si puo decidere se migrare l'asset texture vanilla nel `public/` Next, ma non e stato fatto in Batch 2B.

## 5. Modifiche hero

La `.hero` homepage e stata resa piu vicina al vanilla:

- larghezza effettiva full-bleed;
- altezza desktop aumentata e resa piu immersiva;
- background fotografico da `/Img/wallpaper/1-opt.webp`;
- overlay scuro tramite pseudo-elemento;
- headline piu grande, compressa e display;
- pannello rosso laterale/basso piu editoriale;
- rimozione dell'effetto card/pannello troppo web-app.

Breakpoint verificati:

| Breakpoint | Dimensione hero rilevata | Esito |
|---|---:|---|
| 1440px | circa `1425 x 840` | OK |
| 1280px | circa `1265 x 781` | OK |
| 768px | circa `753 x 685` | OK |
| 390px | circa `375 x 576` | OK |

## 6. Modifiche banner

Le tile `.section-banners` sono state riallineate:

- desktop a 5 colonne;
- gap minimo da layout vanilla;
- sfondo nero;
- immagini wallpaper via CSS;
- overlay scuro;
- titoli display uppercase;
- hover con leggero movimento e contrasto.

Su mobile le tile passano a una colonna per evitare compressioni e overflow.

## 7. Modifiche product card

La griglia e le card prodotto sono state rese piu vicine al linguaggio vanilla:

- `.product-grid` a 4 colonne su desktop;
- card scure, squadrate, con bordo sottile;
- immagini prodotto centrate in area packshot;
- titolo in font display;
- prezzo evidenziato;
- CTA integrate senza cambiare logica o markup.

Non sono stati modificati:

- dati catalogo;
- ordinamenti;
- fetch;
- fallback catalog;
- logiche carrello;
- localStorage;
- checkout.

## 8. Modifiche fresh cut

Sono stati aggiornati via CSS:

- `#fresh-cut.section`;
- `.fresh-cut-section`;
- `.fresh-cut-section--route`.

Risultato:

- sfondo dark/red;
- wallpaper coerente;
- spacing piu ampio;
- layout editoriale desktop;
- contenuto leggibile su mobile;
- media box scura con bordo sottile.

La route `/taglio-fresco` non e stata riscritta: il batch ha agito solo sulla resa.

## 9. Modifiche showcase

Sono stati aggiornati:

- `#showcase.section`;
- `.showcase-section`;
- `.showcase-grid`;
- card showcase.

Risultato:

- homepage e route dedicate piu coerenti tra loro;
- griglia 3 colonne desktop;
- card scure e piu editoriali;
- responsive a una colonna su tablet/mobile stretto.

La route `/showcase` resta semanticamente una pagina ridisegnata rispetto alla sezione vanilla, ma ora e meno distante visivamente.

## 10. Modifiche footer

Il footer e stato avvicinato al vanilla:

- background nero;
- padding ridotto;
- layout piu compatto;
- tipografia display per link/testi principali;
- testo secondario piu leggibile;
- gestione responsive senza overflow.

Altezze rilevate:

| Breakpoint | Altezza footer rilevata | Esito |
|---|---:|---|
| 1440px | circa `128px` | OK |
| 1280px | circa `128px` | OK |
| 768px | circa `157px` | OK |
| 390px | circa `215px` | OK, piu alto per wrapping mobile. |

## 11. Modifiche responsive

Sono stati aggiunti override conservativi:

- sotto `1180px`: griglie prodotti/banner/showcase ridotte;
- sotto `780px`: layout a una colonna, padding sezione ridotto, hero verticale;
- sotto `430px`: hero e product card compattate.

Verifica browser:

| Breakpoint | Esito generale |
|---|---|
| 1440px | OK, layout desktop coerente e senza overflow. |
| 1280px | OK, layout desktop/laptop coerente e senza overflow. |
| 768px | OK, contenuti leggibili, header stabile, griglie a una colonna dove necessario. |
| 390px | OK, nessun overflow rilevato, header piu compatto rispetto al pre-Batch 2A. |

## 12. Risultati lint/test/typecheck/build

Comandi eseguiti da `destinazione/next-prod`:

| Comando | Esito | Note |
|---|---|---|
| `npm run lint` | OK | Restano 8 warning `@next/next/no-img-element` gia noti. |
| `npm test` | OK | 9 test passati. |
| `npm run typecheck` | OK | Nessun errore TypeScript. |
| `npm run build` | OK | Build completata. Restano gli stessi warning su `<img>`. Nessun warning Autoprefixer `start/end` rilevato. |

Warning lint/build rimasti:

- `app/showcase/page.tsx`;
- `app/taglio-fresco/page.tsx`;
- `components/checkout-in-shop.tsx`;
- `components/home-editorial-sections.tsx`;
- `components/shop-product-grid.tsx`;
- `components/site-header.tsx`.

Questi warning non sono stati corretti perche il batch vietava introduzione di `next/image` e modifiche non necessarie ai componenti.

## 13. Risultati browser route per route

Dev server avviato su `http://127.0.0.1:3000`.

Route controllate ai breakpoint `1440`, `1280`, `768`, `390`.

| Route | Caricamento | Console error | Immagini rotte | Overflow | Note |
|---|---|---:|---:|---:|---|
| `/` | OK | 0 | 0 | No | Hero, banner, product grid, fresh cut, showcase e footer verificati. |
| `/shop` | OK | 0 | 0 | No | Product grid/card coerenti; dati e ordinamenti non modificati. |
| `/taglio-fresco` | OK | 0 | 0 | No | Page banner e sezione fresh cut piu vicini al vanilla. |
| `/showcase` | OK | 0 | 0 | No | Page banner e griglia showcase verificati. |
| `/contact` | OK | 0 | 0 | No | Nessuna regressione evidente su route statica. |
| `/privacy` | OK | 0 | 0 | No | Nessuna regressione evidente su route legale. |
| `/cookie` | OK | 0 | 0 | No | Nessuna regressione evidente su route legale. |

Metriche header osservate:

| Breakpoint | Altezza header circa | Esito |
|---|---:|---|
| 1440px | `151px` | OK |
| 1280px | `151px` | OK |
| 768px | `213px` | OK |
| 390px | `189px` | OK, inferiore ai circa `301px` rilevati prima del Batch 2A. |

## 14. Problemi rimasti

Problemi ancora presenti o non affrontati volutamente:

1. La texture vanilla `BACKGROUND SLIDE-opt.webp` non risulta disponibile in `public/Img/Design/`.
2. Product card migliorate via CSS, ma non ancora riallineate completamente alla struttura vanilla se il markup resta diverso.
3. Hero homepage piu vicino al vanilla, ma non identico: il contenuto React e il markup non replicano esattamente la composizione originale.
4. Banner e sezioni editoriali usano wallpaper CSS coerenti, ma non una mappatura asset uno-a-uno con vanilla.
5. Restano warning `<img>` in lint/build, non risolti per vincolo esplicito su `next/image`.
6. Route `/contact`, `/privacy`, `/cookie` sono state controllate per regressioni visuali generali, non riallineate in profondita al vanilla.
7. Non e stata fatta una verifica pixel-perfect contro screenshot vanilla affiancati in questa fase.

## 15. Cosa resta per Batch 2C

Batch 2C consigliato, sempre conservativo:

1. Decidere se migrare la texture paper vanilla mancante in `public/Img/Design/` e usarla nei background globali.
2. Rifinire la hero homepage solo a livello layout/markup se la parity richiesta diventa piu stretta.
3. Riallineare product card con intervento minimo su markup, senza cambiare dati o logiche.
4. Mappare gli asset sezione per sezione tra vanilla e Next per ridurre differenze fotografiche.
5. Raffinare responsive tablet tra `768px` e `1180px`, dove alcune griglie passano rapidamente da multi-colonna a colonna singola.
6. Valutare una fase separata per warning `<img>` e `next/image`, solo quando sara consentito.

Nessun intervento di Batch 2B ha toccato checkout, admin, Supabase, Cloudflare, API, deploy, dati catalogo, route, asset o logiche applicative.
