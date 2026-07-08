# Batch 2C - Hero/card visual micro-markup report

Data: 2026-07-06

Scope: micro-interventi visuali su hero homepage, product card, texture background e CSS correlato. Nessuna modifica a checkout, carrello, admin, Supabase, Cloudflare, API, route, deploy o dati catalogo.

## 1. Modifiche applicate

Sono state applicate modifiche conservative e mirate:

- H1 della hero homepage portato a due righe, come nel vanilla;
- texture vanilla `BACKGROUND SLIDE-opt.webp` copiata nel `public` Next;
- background globale aggiornato per usare la texture con fallback;
- product card aggiornate con wrapper `.product-media`;
- card prodotto ora renderizzano packshot e lifestyle quando disponibili;
- CSS card aggiornato per supportare dual media, hover/focus e responsive;
- nessuna modifica a href, checkout, prezzo, stock, dati o route.

## 2. File modificati

| File | Tipo modifica |
|---|---|
| `destinazione/next-prod/components/hero-section.tsx` | Micro-markup H1 hero. |
| `destinazione/next-prod/components/shop-product-grid.tsx` | Micro-markup product media e campi opzionali gia presenti nei dati. |
| `destinazione/next-prod/app/globals.css` | CSS correlato a texture, hero e product card. |
| `docs/audit-migrazione/17-batch-2c-hero-card-report.md` | Report del batch. |

## 3. Asset copiati o non trovati

Asset copiato:

| Da | A | Esito |
|---|---|---|
| `sorgente/Img/Design/BACKGROUND SLIDE-opt.webp` | `destinazione/next-prod/public/Img/Design/BACKGROUND SLIDE-opt.webp` | Copiato. |

Verifica dimensione:

- sorgente: `13868` byte;
- destinazione: `13868` byte.

Non sono stati copiati altri asset.

## 4. Modifiche hero

File:

- `destinazione/next-prod/components/hero-section.tsx`;
- `destinazione/next-prod/app/globals.css`.

Modifiche:

- H1 semplificato da quattro righe a due span:
  - `Fresh gear.`
  - `Zero cap.`
- CTA invariate:
  - `/shop`;
  - `/taglio-fresco`.
- side text, eyebrow, copy e pannello `NC` invariati nei contenuti.
- CSS hero rifinito:
  - overlay leggermente piu leggibile;
  - headline piu poster-like;
  - span H1 forzati a `display: block`;
  - pannello rosso rifinito;
  - responsive mobile corretto per evitare overflow.

## 5. Modifiche product card

File:

- `destinazione/next-prod/components/shop-product-grid.tsx`;
- `destinazione/next-prod/app/globals.css`.

Modifiche markup:

- aggiunti campi opzionali al tipo locale:
  - `packshotUrl?: string | null`;
  - `lifestyleUrl?: string | null`.
- introdotto wrapper:

```tsx
<div className="product-media" data-has-lifestyle={hasLifestyle}>
  ...
</div>
```

- immagine principale:
  - `product.packshotUrl || product.image || fallback`;
- immagine secondaria:
  - `product.lifestyleUrl || packshotImage`;
- fallback sicuro:
  - `/Img/products/black-wax-packshot-opt.webp`.

Non sono stati modificati:

- `checkoutHref`;
- `buildShopCheckoutHref`;
- `price`;
- `stock`;
- dati catalogo;
- logiche cart/checkout;
- onClick;
- localStorage;
- API.

## 6. Modifiche CSS

Blocco CSS aggiunto in fondo a `app/globals.css`:

- `Batch 2C: hero/card micro-markup visual parity`.

Interventi:

- `body` e `.page-shell` usano ora anche:
  - `/Img/Design/BACKGROUND SLIDE-opt.webp`;
  - fallback colore/gradienti gia presenti;
- `.hero h1` ora gestisce due righe block;
- `.hero__panel` rifinito;
- `.product-card` resa piu coerente con struttura verticale vanilla;
- `.product-media` introdotta come area dominante immagine;
- packshot visibile di default;
- lifestyle nascosta di default;
- hover/focus CSS predisposti per transizione packshot/lifestyle;
- immagini media con `pointer-events: none` per non intercettare il puntatore;
- responsive aggiornato a `780px` e `430px`.

## 7. Risultato lint

Comando:

```bash
npm run lint
```

Esito:

- passato con exit code `0`;
- 0 errori;
- 9 warning `@next/next/no-img-element`.

Nota:

- i warning erano gia noti;
- il numero sale da 8 a 9 perche `shop-product-grid.tsx` ora renderizza due `<img>` nella product card;
- `next/image` era esplicitamente escluso dal Batch 2C.

## 8. Risultato test

Comando:

```bash
npm test
```

Esito:

- passato;
- 9 test passati;
- 0 falliti.

Suite:

- `admin-auth-check`;
- `admin-guard`;
- `admin-jwks-auth`;
- `admin-login`;
- `admin-products-summary`;
- `admin-status`;
- `contact-form`;
- `public-flow`;
- `supabase-public`.

## 9. Risultato typecheck

Comando:

```bash
npm run typecheck
```

Esito:

- passato;
- `tsc --noEmit` senza errori.

## 10. Risultato build

Comando:

```bash
npm run build
```

Esito:

- passato;
- compilazione production completata;
- 16 pagine generate;
- nessun errore build;
- restano 9 warning `@next/next/no-img-element`.

## 11. Risultato browser check

Dev server:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Route verificate:

- `/`;
- `/shop`;
- `/taglio-fresco`;
- `/showcase`.

Breakpoint:

- `1440px`;
- `1280px`;
- `768px`;
- `390px`.

Sintesi:

| Controllo | Esito |
|---|---|
| Route caricano | OK |
| Console error | 0 su tutte le route/breakpoint campionati |
| Immagini rotte | 0 su tutte le route/breakpoint campionati |
| Overflow orizzontale | Assente |
| Texture background | Presente nel computed background |
| Hero H1 | 2 span block, testo su due righe |
| Product media | Presente su `/` e `/shop`, 6 card con 2 immagini ciascuna |
| Header mobile | 390px: circa `189px`, non peggiorato rispetto a Batch 2A/2B |

Metriche principali:

| Breakpoint | Route | Hero | H1 | Header | Product grid |
|---:|---|---|---|---|---|
| 1440 | `/` | `1425 x 840` | 2 righe, `598 x 539` | `151px` | 4 colonne |
| 1280 | `/` | `1265 x 661` | 2 righe, `621 x 359` | `151px` | 4 colonne |
| 768 | `/` | `753 x 600` | 2 righe, `449 x 255` | `213px` | 1 colonna |
| 390 | `/` | `375 x 520` | 2 righe, `259 x 155` | `189px` | 1 colonna |

Product media:

- packshot default caricato, `naturalWidth: 1200`;
- lifestyle caricato, `naturalWidth: 1200`;
- opacity default:
  - packshot `1`;
  - lifestyle `0`.

Hover:

- CSS hover/focus per dual media e' presente;
- il browser in-app non ha marcato `:hover` durante il movimento mouse automatizzato, anche dopo aver verificato che il puntatore cade su `.product-media`;
- `elementFromPoint` conferma `.product-media`;
- immagini hanno `pointer-events: none`;
- DA VERIFICARE manualmente o con un runner browser che esponga hover nativo: la transizione visuale packshot/lifestyle.

## 12. Problemi rimasti

1. Restano warning `<img>`: 9 warning totali. Non risolti per vincolo esplicito su `next/image`.
2. Hover dual-media predisposto via CSS, ma non confermato dal browser in-app per limite dello stato `:hover` nell'automazione.
3. Product card ancora non replica completamente:
   - badge prodotto vanilla;
   - bottone toggle risultato;
   - button add-to-cart vanilla.
4. CTA card restano link verso checkout, volutamente non trasformate in button/cart.
5. Route `/shop` resta una route dedicata, non la sezione hash vanilla.
6. `app/globals.css` resta stratificato con override progressivi; non e' stato refactorizzato.

## 13. Cosa consigli per il prossimo batch

Batch successivo consigliato:

1. verifica manuale o screenshot comparativa del hover product card;
2. eventuale micro-fix del dual-media hover se il test manuale non conferma la transizione;
3. valutare badge prodotto/stock solo come micro-markup visuale, senza cambiare dati;
4. separare un batch dedicato a `next/image`, se si vogliono eliminare i warning;
5. pianificare un refactor controllato della cascata CSS solo dopo screenshot baseline.

Conferma perimetro:

- checkout non modificato;
- carrello non modificato;
- admin non modificato;
- Supabase non modificato;
- Cloudflare non modificato;
- API non modificate;
- route non modificate;
- deploy non eseguito;
- dati catalogo non modificati.
