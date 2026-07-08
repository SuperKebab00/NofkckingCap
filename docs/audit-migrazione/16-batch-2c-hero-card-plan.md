# Batch 2C - Piano hero e product card

Data: 2026-07-06

Scope: analisi e proposta tecnica per micro-modifiche visuali future su hero homepage, product card e texture background. Nessuna modifica applicata in questa fase.

## 1. Sintesi dello stato dopo Batch 2B

Dopo i batch 2A e 2B la migrazione Next.js e' molto piu vicina al vanilla sul piano globale:

- font `Inter` e `Barlow Condensed` caricati con `next/font/google`;
- token colore principali riallineati;
- header chiaro e piu vicino al vanilla;
- bottoni globali piu squadrati e display;
- background globale riportato verso paper/off-white;
- hero homepage resa full-bleed via CSS;
- product grid/card rese scure e piu squadrate via CSS;
- fresh cut, showcase e footer migliorati via CSS.

Restano pero differenze dovute soprattutto al markup:

- la hero Next usa classi simili al vanilla, ma il testo H1 e spezzato in quattro righe invece di due;
- la product card vanilla ha un wrapper `.product-media` con due immagini, badge dedicato, footer stock/CTA e bottone toggle risultato;
- la product card Next usa una singola immagine diretta nel card, meta compatta e due link CTA verso checkout;
- la texture `BACKGROUND SLIDE-opt.webp` esiste nel vanilla ma non nel `public` Next.

Il Batch 2C consigliato deve quindi essere chirurgico: piccolo CSS correlato, eventuale copia texture e micro-markup visuale solo dove il CSS non puo replicare la struttura vanilla.

## 2. Differenze residue hero

### Vanilla

File:

- `sorgente/index.html`
- `sorgente/styles.css`

Markup vanilla:

```html
<div class="hero" aria-label="No Cap Barber Shop">
  <div class="hero__side-text">NO CAP BARBER SHOP</div>
  <div class="hero__content">
    <p class="eyebrow">Shop essentials</p>
    <h1 id="hero-title">Fresh gear.<br><span>Zero cap.</span></h1>
    <p class="hero__copy" data-hero-copy>...</p>
    <div class="hero__actions">
      <a class="primary-button" href="#shop">Vedi prodotti</a>
      <a class="outline-button" href="#fresh-cut">Taglio del giorno</a>
    </div>
  </div>
  <div class="hero__panel" aria-hidden="true">
    <span>Fresh cuts. Zero cap.</span>
    <strong>NC</strong>
  </div>
</div>
```

CSS vanilla rilevante:

- `.hero`: full-bleed, grid `1fr minmax(180px, 18vw)`, background `Img/wallpaper/1-opt.webp`;
- `.hero::before`: overlay radiale;
- `.hero__content`: max `800px`, padding `7vw`;
- `.hero h1`: `clamp(4.8rem, 12vw, 11.8rem)`, italic, line-height `0.78`;
- `.hero__panel`: pannello rosso laterale con `clip-path`;
- responsive `780px` e `430px`: hero a una colonna, panel assoluto in basso.

### Next

File:

- `destinazione/next-prod/components/hero-section.tsx`
- `destinazione/next-prod/app/globals.css`

Markup Next:

```tsx
<section className="hero" aria-label="No Cap Barber Shop">
  <div className="hero__side-text">NO CAP BARBER SHOP</div>
  <div className="hero__content">
    <p className="eyebrow">Shop essentials</p>
    <h1>
      FRESH
      <br />
      GEAR.
      <br />
      <span>ZERO</span>
      <br />
      <span>CAP.</span>
    </h1>
    ...
  </div>
  <div className="hero__panel" aria-hidden="true">...</div>
</section>
```

CSS Next dopo Batch 2B:

- `.hero`: full-width, grid simile al vanilla, background `/Img/wallpaper/1-opt.webp`;
- `.hero::after`: overlay radiale;
- `.hero__content`: max `800px`, padding simile;
- `.hero h1`: dimensioni e line-height allineate;
- `.hero__panel`: pannello rosso laterale;
- responsive `1180px`, `780px`, `430px`.

### Differenze ancora visibili

| Area | Differenza | Causa | Come intervenire |
|---|---|---|---|
| H1 | Vanilla ha due righe: `Fresh gear.` + `Zero cap.`; Next ha quattro righe: `FRESH`, `GEAR.`, `ZERO`, `CAP.` | Markup Next contiene quattro `<br />` | Micro-modifica markup consigliata. |
| Casing testo | Vanilla testo originale capitalizzato; Next uppercase testuale | CSS gia forza uppercase, ma il contenuto e diverso | Micro-modifica contenuto markup, non route/logica. |
| CTA href | Vanilla usa hash `#shop`, `#fresh-cut`; Next usa route `/shop`, `/taglio-fresco` | Scelta migrazione route dedicata | Meglio non cambiare ora. |
| Texture globale | Vanilla body usa `BACKGROUND SLIDE-opt.webp`; Next usa fallback CSS paper | Asset mancante nel `public` Next | Eventuale copia asset nel batch, se consentita. |
| Pannello rosso | Molto vicino dopo 2B, ma non identico al vanilla mobile | CSS responsive sovrapposto | Rifinitura CSS a basso rischio. |
| Media/card hero | Next non ha piu media-card visibile dopo 2B; struttura attuale e vicina al vanilla | Risolto via CSS | Non toccare ora. |

## 3. Differenze residue product card

### Vanilla

File:

- `sorgente/js/render.js`
- `sorgente/styles.css`
- `sorgente/app.js`

Markup generato dal vanilla:

```html
<article class="product-card ...">
  <div class="product-media">
    <img src="...packshot..." alt="... packshot prodotto">
    <img src="...lifestyle..." alt="... risultato sui capelli">
  </div>
  <div class="product-card__body">
    <div class="product-card__category">...</div>
    <div class="product-badge" data-level="ok">...</div>
    <h3>...</h3>
    <p class="product-card__copy">...</p>
    <div class="product-card__price">...</div>
    <div class="product-card__footer">
      <span class="stock-badge" data-level="low">...</span>
      <button class="primary-button" data-add-to-cart="...">Aggiungi</button>
    </div>
    <button class="product-media-toggle" data-toggle-product-image="...">Vedi risultato</button>
  </div>
</article>
```

Comportamento vanilla:

- hover/focus mostra la seconda immagine lifestyle;
- bottone `.product-media-toggle` alterna stato `.is-showing-result`;
- stock badge e sold-out agiscono sullo stato visivo;
- CTA `Aggiungi` e' un button collegato al carrello vanilla.

### Next

File:

- `destinazione/next-prod/components/shop-product-grid.tsx`
- `destinazione/next-prod/lib/static-content.ts`
- `destinazione/next-prod/app/globals.css`

Markup Next attuale:

```tsx
<article className="product-card">
  <img src={product.image || "/Img/products/black-wax-packshot-opt.webp"} ... />
  <div className="product-card__meta">
    <span>{product.category}</span>
    {showStock ? <small>{stockLabel(product.stock)}</small> : null}
  </div>
  <h3>{product.name}</h3>
  <p>{product.description}</p>
  <strong className="product-card__price">{formatPrice(product.price)}</strong>
  <div className="product-card__actions">
    <Link className="primary-button" href={...}>Aggiungi</Link>
    <Link className="outline-button" href={...}>Vedi risultato</Link>
  </div>
</article>
```

Dati Next disponibili:

- `productTeasers` contiene `image`, `packshotUrl`, `lifestyleUrl`, `checkoutHref`, `contactHref`, `price`, `stock`;
- il tipo locale `ShopProductCard` oggi non espone `packshotUrl` e `lifestyleUrl`, anche se i dati statici li hanno;
- `ShopProductGrid` usa `product.image`, quindi non puo renderizzare il dual-media vanilla senza micro-modifica TypeScript/markup.

### Differenze ancora visibili

| Area | Differenza | Causa | Come intervenire |
|---|---|---|---|
| Media | Vanilla usa `.product-media` con due immagini; Next una immagine diretta | Markup diverso | Micro-modifica markup consigliata. |
| Hover risultato | Vanilla transiziona packshot/lifestyle; Next scala solo packshot | Manca seconda immagine | Richiede markup + CSS. |
| Toggle risultato | Vanilla ha button stato locale; Next ha link `Vedi risultato` verso checkout/contact flow | Logica diversa e potenzialmente checkout/cart | Da evitare in Batch 2C. |
| Stock badge | Vanilla usa `.stock-badge` in footer; Next mostra `small` dentro meta solo se `showStock` | Markup diverso | Possibile micro-classe solo visuale, senza logica. |
| Product badge | Vanilla ha `.product-badge`; Next non ha badge equivalente | Dati badge non presenti nello stesso modo | Evitare se richiede dati nuovi. |
| CTA | Vanilla button add-to-cart; Next link a checkout | Flusso migrato diverso | Non cambiare in Batch 2C. |
| Sold-out | Vanilla applica `.is-sold-out`; Next non applica classe sold-out | Stato checkout/catalogo diverso | Evitare per non alterare flow. |

## 4. Asset mancanti o utili

| Asset | Sorgente vanilla | Destinazione Next | Stato | Proposta |
|---|---|---|---|---|
| `BACKGROUND SLIDE-opt.webp` | `sorgente/Img/Design/BACKGROUND SLIDE-opt.webp` | Non presente in `destinazione/next-prod/public/Img/Design/` | MANCANTE IN NEXT | Copiarlo in un batch successivo e usarlo nel background globale. |
| `NO CAP LOGO_1.png` | Presente | Presente | OK | Nessuna azione. |
| Wallpaper hero `1-opt.webp` | Presente | Presente | OK | Nessuna azione. |
| Product packshot | Presenti | Presenti | OK | Gia usati. |
| Product lifestyle | Presenti | Presenti e referenziati in `productTeasers` | PARZIALE | Usarli nel markup card solo se si aggiunge `.product-media`. |

Nota operativa: la copia della texture sarebbe un cambiamento asset, quindi deve essere esplicitamente consentita nel Batch 2C. Non e' stata fatta ora.

## 5. Interventi ancora possibili solo CSS

| Intervento | File | Rischio | Note |
|---|---|---|---|
| Rifinire posizione/peso overlay hero | `app/globals.css` | Basso | Si puo avvicinare ulteriormente il contrasto vanilla senza markup. |
| Rifinire pannello rosso mobile | `app/globals.css` | Basso | Agire su width/min-height/clip-path sotto `780px` e `430px`. |
| Ridurre differenze hero copy/CTA spacing | `app/globals.css` | Basso | Padding e margin gia vicini, solo ritocchi. |
| Migliorare card packshot area con immagine singola | `app/globals.css` | Basso/Medio | Gia fatto in 2B; oltre questo il limite e il markup. |
| Rifinire card footer/actions | `app/globals.css` | Medio | Si puo rendere le CTA piu simili, ma il flusso link resta diverso dal button vanilla. |
| Migliorare responsive product card | `app/globals.css` | Basso | Altezza immagine e padding sotto `430px`. |
| Applicare texture se copiata | `app/globals.css` | Basso | Richiede prima copia asset. |

## 6. Micro-modifiche markup consigliate

### 6.1 Hero H1 a due righe

File:

- `destinazione/next-prod/components/hero-section.tsx`

Modifica proposta:

- sostituire il contenuto H1 a quattro righe con la struttura equivalente vanilla:

```tsx
<h1>
  Fresh gear.
  <br />
  <span>Zero cap.</span>
</h1>
```

Motivo:

- e' la differenza markup piu piccola e visibile;
- non cambia route, dati, link o logiche;
- riduce il mismatch tra screenshot vanilla e Next.

Rischio: basso.

Criterio di accettazione:

- a 1440px e 1280px l'H1 deve apparire come poster a due righe;
- a 390px deve restare leggibile senza overflow.

### 6.2 Product media wrapper con packshot/lifestyle

File:

- `destinazione/next-prod/components/shop-product-grid.tsx`
- `destinazione/next-prod/app/globals.css`

Modifica proposta:

- estendere il tipo `ShopProductCard` con campi opzionali `packshotUrl?: string | null` e `lifestyleUrl?: string | null`;
- sostituire l'immagine diretta con:

```tsx
<div className="product-media">
  <img src={product.packshotUrl || product.image || "...fallback..."} ... />
  <img src={product.lifestyleUrl || product.packshotUrl || product.image || "...fallback..."} ... />
</div>
```

Motivo:

- `productTeasers` contiene gia `packshotUrl` e `lifestyleUrl`;
- non richiede nuovi dati;
- permette di riusare CSS vanilla-like per hover/focus;
- non cambia checkoutHref, contactHref, prezzo, stock o fallback catalog.

Rischio: medio.

Punto delicato:

- non aggiungere toggle JS/React in Batch 2C;
- non cambiare il link `Vedi risultato`;
- limitarsi a hover/focus CSS.

Criterio di accettazione:

- `/shop` e home product grid mostrano packshot visibile di default;
- hover desktop mostra immagine lifestyle se presente;
- mobile non deve nascondere il packshot o creare flicker;
- nessun link checkout deve cambiare.

### 6.3 Stock badge solo visuale

File:

- `destinazione/next-prod/components/shop-product-grid.tsx`

Modifica possibile ma non prioritaria:

- sostituire `<small>{stockLabel(...)}</small>` con `<small className="stock-badge">...</small>` oppure aggiungere classe senza cambiare contenuto.

Rischio: basso/medio.

Nota:

- utile solo se si vuole avvicinare il footer card al vanilla;
- meglio farlo dopo il wrapper media, per evitare troppe modifiche nello stesso batch.

## 7. Modifiche da evitare

| Modifica | Motivo |
|---|---|
| Cambiare CTA `Aggiungi` da `Link` a `button` | Potrebbe impattare checkout/cart e flusso pubblico. |
| Implementare toggle risultato React | Aggiunge stato/interazione non necessaria e aumenta rischio regressione. |
| Modificare `buildShopCheckoutHref` | Fuori perimetro, tocca flow checkout. |
| Cambiare dati catalogo o fallback product | Vietato dal perimetro e non necessario. |
| Introdurre `next/image` | Warning noto, ma puo alterare layout/dimensioni immagini; meglio batch dedicato. |
| Refactor globale di `app/globals.css` | Utile in futuro, ma troppo ampio per Batch 2C. |
| Cambiare route `/shop`, `/taglio-fresco`, `/showcase` | Fuori perimetro. |
| Toccare checkout, admin, Supabase, Cloudflare, API | Esplicitamente escluso. |
| Cancellare o rinominare file | Esplicitamente escluso. |

## 8. Rischio per ogni modifica

| Modifica proposta | Rischio | Impatto | Motivazione |
|---|---|---|---|
| Hero H1 a due righe | Basso | Alto visuale | Cambia solo testo/line break nel componente hero. |
| Rifinitura CSS hero panel/mobile | Basso | Medio | Solo CSS, nessuna logica. |
| Copia texture `BACKGROUND SLIDE-opt.webp` | Basso | Medio | Asset piccolo gia presente nel vanilla; rischio solo path/cache. |
| Uso texture nel background globale | Basso/Medio | Medio | Potrebbe cambiare contrasto di sezioni chiare; verificare legal/contact. |
| Product media wrapper dual image | Medio | Alto visuale | Cambia markup card e immagini renderizzate; dati gia disponibili. |
| Hover dual image CSS | Medio | Medio | Desktop ok, mobile va disattivato o neutralizzato come nel vanilla. |
| Stock badge class visuale | Basso/Medio | Basso | Potrebbe cambiare spacing card; non tocca dati. |
| `next/image` | Medio/Alto | Medio | Non consigliato nel Batch 2C per rischio layout. |

## 9. Ordine consigliato di implementazione

1. Copiare `sorgente/Img/Design/BACKGROUND SLIDE-opt.webp` in `destinazione/next-prod/public/Img/Design/BACKGROUND SLIDE-opt.webp`, solo se il Batch 2C autorizza esplicitamente asset copy.
2. Aggiornare `app/globals.css` per usare la texture nel background globale, mantenendo fallback CSS.
3. Modificare H1 in `components/hero-section.tsx` da quattro righe a due righe vanilla.
4. Verificare `/` a 1440, 1280, 768, 390 prima di toccare le card.
5. Estendere `ShopProductCard` con `packshotUrl` e `lifestyleUrl` opzionali.
6. Inserire wrapper `.product-media` in `ShopProductGrid`, usando fallback conservativi.
7. Aggiornare CSS correlato per `.product-media` e hover dual image, evitando toggle React.
8. Verificare `/shop` e home product grid a 1440, 1280, 768, 390.
9. Solo se tutto stabile, valutare classe visuale per stock badge.
10. Eseguire lint, test, typecheck, build e controllo browser.

## 10. Checklist verifica browser

Route minime:

- `/`
- `/shop`
- `/taglio-fresco`
- `/showcase`

Breakpoint:

- `1440x900`
- `1280x900`
- `768x1024`
- `390x844`

Checklist generale:

- hero homepage carica senza immagini rotte;
- H1 hero appare su due righe e non overflowa;
- pannello rosso resta visibile e non copre CTA;
- CTA hero puntano ancora a `/shop` e `/taglio-fresco`;
- background paper/texture non riduce leggibilita;
- product grid resta a 4 colonne desktop e 1 colonna mobile dove previsto;
- packshot prodotto visibile di default;
- hover desktop mostra lifestyle senza layout shift evidente;
- mobile non dipende da hover per vedere un'immagine utile;
- CTA card mantengono href checkout esistenti;
- stock/prezzo/nome/descrizione restano coerenti;
- console error `0`;
- immagini rotte `0`;
- overflow orizzontale assente;
- header/footer non regressi.

Comandi consigliati:

```bash
npm run lint
npm test
npm run typecheck
npm run build
npm run dev -- --hostname 127.0.0.1 --port 3000
```

## 11. Prompt consigliato per applicare Batch 2C

```text
Leggi prima:

* docs/audit-migrazione/16-batch-2c-hero-card-plan.md

Ora applica il Batch 2C conservativo per hero e product card.

Obiettivo:
Avvicinare hero homepage e product card Next.js al vanilla con interventi minimi e verificabili.

Puoi modificare solo:

* destinazione/next-prod/components/hero-section.tsx
* destinazione/next-prod/components/shop-product-grid.tsx
* destinazione/next-prod/app/globals.css
* eventualmente copiare sorgente/Img/Design/BACKGROUND SLIDE-opt.webp in destinazione/next-prod/public/Img/Design/BACKGROUND SLIDE-opt.webp
* docs/audit-migrazione/17-batch-2c-hero-card-report.md

Interventi consentiti:

1. Portare l'H1 hero a due righe come vanilla: Fresh gear. / Zero cap.
2. Se autorizzato, copiare la texture background vanilla e usarla nel CSS con fallback.
3. Aggiungere wrapper product-media con packshot/lifestyle usando campi gia presenti nei dati statici.
4. Aggiungere solo CSS correlato a hero/product-media/product-card.
5. Non cambiare checkoutHref, buildShopCheckoutHref, dati catalogo, route, API o logiche sensibili.

Non devi:

* modificare checkout;
* modificare admin;
* modificare Supabase;
* modificare Cloudflare;
* modificare API;
* modificare dati catalogo;
* modificare route;
* implementare cookie consent;
* introdurre next/image;
* aggiungere toggle React per il risultato;
* cancellare file;
* fare commit/push/deploy.

Verifiche:

* npm run lint
* npm test
* npm run typecheck
* npm run build
* browser check su /, /shop, /taglio-fresco, /showcase a 1440, 1280, 768, 390

Crea il report:

docs/audit-migrazione/17-batch-2c-hero-card-report.md

Nel report indica modifiche, file toccati, risultati verifiche, regressioni trovate e cosa resta fuori per batch successivi.
```

## Conclusione operativa

Batch 2C dovrebbe restare limitato a hero, product card, CSS correlato ed eventuale copia della texture vanilla. La modifica piu sicura e ad alto impatto e' l'H1 hero a due righe. La modifica piu utile ma piu delicata e' il wrapper `.product-media` con packshot/lifestyle, perche richiede markup ma puo usare dati gia presenti senza toccare catalogo o checkout.

Non conviene includere `next/image` in Batch 2C: i warning `<img>` sono noti, ma una migrazione immagini puo cambiare layout, sizing, loading e necessita di un batch dedicato con screenshot comparativi.
