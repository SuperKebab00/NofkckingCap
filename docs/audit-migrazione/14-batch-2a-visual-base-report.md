# 14 - Batch 2A visual base report

Data: 2026-07-06

Scope: secondo batch conservativo per visual parity di base tra vanilla `sorgente/` e Next.js `destinazione/next-prod/`.

## 1. Modifiche applicate

Sono state applicate solo modifiche globali a basso/medio rischio:

- caricamento font vanilla con `next/font/google`;
- normalizzazione token colore/font;
- bottoni globali piu vicini al vanilla;
- header chiaro e tipografia nav piu vicina al vanilla;
- riduzione altezza header mobile;
- correzione warning Autoprefixer su valori `start/end`.

Non sono stati rifatti hero, product card, checkout, admin, API o logiche dati.

## 2. File modificati

File applicativi modificati:

- `destinazione/next-prod/app/layout.tsx`
- `destinazione/next-prod/app/globals.css`

File documentazione creato:

- `docs/audit-migrazione/14-batch-2a-visual-base-report.md`

`components/site-header.tsx` non e' stato modificato: la parity minima header e' stata risolta via CSS.

## 3. Font caricati e metodo usato

Metodo usato:

- `next/font/google` in `destinazione/next-prod/app/layout.tsx`.

Font caricati:

- `Inter` con pesi `400`, `500`, `600`, `700`;
- `Barlow Condensed` con pesi `500`, `600`, `700`, `800`, `900`.

Variabili esposte:

- `--font-body`;
- `--font-display`.

Applicazione:

- `<body>` riceve le classi variabili generate da Next font;
- `body` usa `var(--font-body), Inter, Arial, sans-serif`;
- titoli, nav, CTA, eyebrow, badge e titoli card usano `var(--font-display), "Barlow Condensed", Impact, sans-serif`.

Verifica browser:

- body renderizzato con `Inter, "Inter Fallback", Inter, Arial, sans-serif`;
- `h1`, nav e bottoni renderizzati con `"Barlow Condensed", "Barlow Condensed Fallback"`;
- font caricati correttamente su `/`, `/shop`, `/taglio-fresco`, `/showcase`.

## 4. Token CSS normalizzati

In `app/globals.css` e' stato aggiunto un blocco finale conservativo con token vanilla:

| Token | Valore |
|---|---|
| `--red` | `#d40f19` |
| `--red-dark` | `#980912` |
| `--ink` | `#090909` |
| `--coal` | `#141414` |
| `--soft-black` | `#1c1c1c` |
| `--paper` | `#f7f5f1` |
| `--paper-warm` | `#ede8df` |
| `--muted` | `#77736c` |
| `--line` | `rgb(10 10 10 / 16%)` |
| `--white` | `#ffffff` |

Mapping mantenuto per compatibilita con il CSS esistente:

- `--nc-red: var(--red)`;
- `--nc-red-dark: var(--red-dark)`;
- `--nc-black: var(--ink)`;
- `--nc-ink: var(--ink)`;
- `--nc-paper: var(--paper)`;
- `--nc-muted: var(--muted)`.

Nota: il background globale scuro finale di Next non e' stato cambiato in questo batch, per evitare un cambio tema piu ampio. Resta una differenza visuale da valutare nel batch 2B.

## 5. Modifiche bottoni

Classi aggiornate via CSS:

- `.primary-button`;
- `.outline-button`;
- `.ghost-button`.

Nuova resa base:

- font display `Barlow Condensed`;
- uppercase;
- peso `800`;
- letter-spacing `0.08em`;
- altezza desktop circa `44px`;
- padding orizzontale `24px`;
- radius `0`;
- primary rosso vanilla `#d40f19` con testo bianco;
- outline/ghost squadrati e coerenti con la resa vanilla.

Verifica browser:

| Route | Breakpoint | Primary height | Radius | Colore | Font |
|---|---:|---:|---:|---|---|
| `/` | 1440 | 44px | 0px | rosso `rgb(212, 15, 25)`, testo bianco | Barlow Condensed |
| `/` | 390 | 40px | 0px | rosso `rgb(212, 15, 25)`, testo bianco | Barlow Condensed |
| `/shop` | 1440/768/390 | ok | 0px | coerente | Barlow Condensed |
| `/taglio-fresco` | 1440/768/390 | ok | 0px | coerente | Barlow Condensed |
| `/showcase` | 1440/768/390 | ok | 0px | coerente | Barlow Condensed |

## 6. Modifiche header

Interventi CSS:

- header riportato a sfondo chiaro `rgba(255,255,255,.94)`;
- layout finale in grid `220px minmax(0,1fr) auto`;
- padding laterale vicino al vanilla con `7vw`;
- logo portato a `min(160px, 42vw)` desktop;
- nav con `Barlow Condensed`;
- nav senza pill scure desktop;
- letter-spacing nav `0.08em`;
- testo nav nero, hover rosso vanilla;
- route e link invariati.

Verifica browser:

| Route | 1440px header | 768px header | 390px header |
|---|---:|---:|---:|
| `/` | 151px | 213px | 189px |
| `/shop` | 151px | 213px | 189px |
| `/taglio-fresco` | 151px | 213px | 189px |
| `/showcase` | 151px | 213px | 189px |

Risultato:

- desktop molto piu vicino al vanilla;
- mobile ridotto rispetto ai circa `301px` misurati nel report 13;
- mobile ora anche piu basso del vanilla campionato a circa `219px`;
- nav resta usabile via overflow orizzontale.

## 7. Fix responsive mobile

Interventi CSS:

- breakpoint `max-width: 860px`:
  - header sticky in grid;
  - padding `10px 16px`;
  - logo ridotto a `min(138px, 38vw)`;
  - nav a riga orizzontale scrollabile;
  - nav non pill, radius `0`;
  - colore nav nero su sfondo chiaro.
- breakpoint `max-width: 560px`:
  - padding header `8px 14px`;
  - logo `min(128px, 36vw)`;
  - nav item altezza `38px`;
  - CTA mobile altezza `40px`.

Risultato browser:

- viewport 390px senza overflow orizzontale su tutte le route verificate;
- header 390px: `189px`;
- prima del batch il report 13 indicava circa `301px`;
- nessuna immagine rotta;
- nessun errore console.

## 8. Fix Autoprefixer

Sostituzioni applicate in `app/globals.css` solo su contesti di alignment:

- `align-items: end` -> `align-items: flex-end`;
- `align-items: start` -> `align-items: flex-start`;
- `justify-content: end` -> `justify-content: flex-end`;
- `justify-content: start` -> `justify-content: flex-start`;
- `justify-self: end` -> `justify-self: flex-end`.

Risultato:

- `npm run build` non mostra piu warning Autoprefixer su `start/end`;
- restano solo i warning `@next/next/no-img-element` gia noti e fuori perimetro.

## 9. Risultati lint/test/typecheck/build

### `npm run lint`

Esito:

- passato con exit code `0`;
- restano 8 warning `@next/next/no-img-element`.

Warning rimasti:

- `app/showcase/page.tsx`;
- `app/taglio-fresco/page.tsx`;
- `components/checkout-in-shop.tsx`;
- `components/home-editorial-sections.tsx`;
- `components/shop-product-grid.tsx`;
- `components/site-header.tsx`.

Nota: non sono stati corretti perche il batch vieta di introdurre `next/image`.

### `npm test`

Esito:

- passato;
- 9 test passati;
- 0 falliti.

Test:

- `admin-auth-check`;
- `admin-guard`;
- `admin-jwks-auth`;
- `admin-login`;
- `admin-products-summary`;
- `admin-status`;
- `contact-form`;
- `public-flow`;
- `supabase-public`.

### `npm run typecheck`

Esito:

- passato;
- `tsc --noEmit` senza errori.

### `npm run build`

Esito:

- passato;
- Next.js `15.5.19`;
- build production compilata e pagine generate;
- nessun warning Autoprefixer `start/end`;
- restano gli 8 warning `@next/next/no-img-element`.

## 10. Risultati controllo browser

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

- `1440x900`;
- `768x1024`;
- `390x844`.

Risultato sintetico:

| Route | Font ok | Header ok | Bottoni ok | Console error | Immagini rotte | Overflow |
|---|---|---|---|---:|---:|---:|
| `/` | si | si | si | 0 | 0 | no |
| `/shop` | si | si | si | 0 | 0 | no |
| `/taglio-fresco` | si | si | si | 0 | 0 | no |
| `/showcase` | si | si | si | 0 | 0 | no |

Metriche confermate:

- body font: `Inter`;
- H1/nav/CTA: `Barlow Condensed`;
- header desktop: sfondo chiaro e nav nera;
- nav desktop: `15.04px`, letter-spacing `1.2032px`;
- CTA desktop: altezza `44px`, radius `0`, rosso `rgb(212,15,25)`, testo bianco;
- header mobile 390px: `189px`.

## 11. Differenze visuali ancora rimaste

Rimangono differenze importanti, volutamente non trattate in questo batch:

1. **Hero home**: ancora containerizzata/ridisegnata rispetto al full-bleed vanilla.
2. **Body background**: Next resta su fondo globale scuro; vanilla usa paper caldo con texture.
3. **Product card**: non e' stata rifatta in questo batch; restano differenze strutturali e di comportamento.
4. **Shop UX**: route dedicata Next diversa dalla sezione hash vanilla.
5. **Fresh cut e Showcase**: restano pagine ridisegnate, non copie visuali delle sezioni embedded.
6. **Cascata CSS duplicata**: il blocco finale risolve la parity di base, ma `app/globals.css` resta stratificato e andrebbe razionalizzato con calma.
7. **Warning `<img>`**: ancora presenti, volutamente non risolti perche `next/image` e' escluso dal batch.

## 12. Consiglio per batch 2B

Batch 2B consigliato, mantenendo rischio controllato:

1. decidere se riportare il body globale al paper/texture vanilla o limitare il paper ad alcune sezioni;
2. riallineare la hero home full-bleed senza cambiare contenuti o CTA;
3. riallineare section banners tablet/mobile;
4. applicare una parity CSS minima alle product card senza toccare checkout e senza cambiare dati;
5. consolidare gradualmente `app/globals.css` riducendo duplicazioni, ma solo dopo snapshot visuali;
6. rimandare `next/image`, checkout, admin, Supabase, Cloudflare e cookie consent a batch separati.

## 13. Conferme di perimetro

Non sono stati modificati:

- checkout;
- admin;
- Supabase;
- Cloudflare;
- API;
- env variables;
- deploy;
- dati catalogo;
- route;
- `package.json`;
- `package-lock.json`;
- componenti fuori dal perimetro.

Non sono stati eseguiti commit o push.
