# Visual Audit Vanilla vs Next

## Scope

Fonte vanilla: `sorgente/`

Migrazione Next: `destinazione/next-prod/`

Obiettivo di questa fase:

1. audit grafico completo sezione per sezione;
2. fix applicati progressivamente per sezione, iniziando da `/shop`;
3. nessuna modifica a CRUD, API, Supabase, Cloudflare, checkout reale, admin operativo, route path o dati catalogo.

## File vanilla analizzati

- `sorgente/index.html`
- `sorgente/styles.css`
- `sorgente/app.js`
- `sorgente/js/data.js`
- `sorgente/js/render.js`
- `sorgente/js/product-art.js`
- asset:
  - `sorgente/Img/Design/NO CAP LOGO_1.png`
  - `sorgente/Img/Design/BACKGROUND SLIDE-opt.webp`
  - `sorgente/Img/wallpaper/*.webp`
  - `sorgente/Img/products/*-packshot-opt.webp`
  - `sorgente/Img/products/*-lifestyle-opt.webp`

Nota: `sorgente/script.js` non esiste. Il comportamento vanilla principale e in `sorgente/app.js`; dati e prodotti sono in `sorgente/js/data.js`; rendering card/shop e in `sorgente/js/render.js`.

## File Next analizzati

- `destinazione/next-prod/app/page.tsx`
- `destinazione/next-prod/app/shop/page.tsx`
- `destinazione/next-prod/app/taglio-fresco/page.tsx`
- `destinazione/next-prod/app/showcase/page.tsx`
- `destinazione/next-prod/app/checkout/page.tsx`
- `destinazione/next-prod/app/admin/page.tsx`
- `destinazione/next-prod/app/contact/page.tsx`
- `destinazione/next-prod/app/privacy/page.tsx`
- `destinazione/next-prod/app/cookie/page.tsx`
- `destinazione/next-prod/components/site-header.tsx`
- `destinazione/next-prod/components/site-footer.tsx`
- `destinazione/next-prod/components/shop-catalog.tsx`
- `destinazione/next-prod/components/shop-product-grid.tsx`
- `destinazione/next-prod/components/hero-section.tsx`
- `destinazione/next-prod/components/home-section-banners.tsx`
- `destinazione/next-prod/components/checkout-in-shop.tsx`
- `destinazione/next-prod/components/admin-*`
- `destinazione/next-prod/lib/static-content.ts`
- `destinazione/next-prod/app/globals.css`

## Sintesi generale

La versione vanilla e una single page con viste hash, ma graficamente ogni sezione ha una struttura molto netta:

- header bianco sticky;
- hero scuro con immagine reale e pannello rosso;
- shop con `page-banner`, `category-bar`, `shop-section`, filtri compatti e card prodotto scure;
- fresh cut con immagine dominante e pannello testo;
- showcase con card immagine grandi;
- contact/checkout/admin/legal con shell scure o pannelli coerenti.

La versione Next attuale ha gia recuperato font, colori e molti asset, ma alcune pagine mantengono pattern piu "Next dashboard": pannelli extra, status badge, blocchi descrittivi, spazi verticali ampi e sezioni informative che nel vanilla non esistono.

## Audit sezione per sezione

| Sezione/pagina | Vanilla coinvolto | Next coinvolto | Differenze grafiche | Cosa modificare | Priorita |
| --- | --- | --- | --- | --- | --- |
| Header/navbar | `index.html`, `styles.css` `.site-header`, `.main-nav` | `components/site-header.tsx`, `app/globals.css` | Abbastanza vicino: logo e nav ci sono. Next mantiene route reali e carrello. Mobile da verificare ancora con browser reale. | Rifinitura mobile e stato active route in batch dedicato. | MEDIUM |
| Home hero | `index.html` `#home`, `.hero` | `components/hero-section.tsx`, `app/page.tsx`, `app/globals.css` | Next e molto vicino come mood: immagine, headline due righe, pannello rosso. | Micro-fix responsive e altezza hero dopo review mobile. | LOW |
| Banner home | `.section-banners`, `.section-banner-*` | `components/home-section-banners.tsx`, CSS globale | Next riprende il pattern, ma essendo route-based deve restare solo navigazione. | Lasciare come ingresso alle pagine, non trasformarlo in sezioni complete. | LOW |
| Shop/catalogo | `index.html` `#shop`, `.page-banner`, `.category-bar`, `.shop-section`, `.shop-tools`, `.product-grid`, `.product-card` | `app/shop/page.tsx`, `components/shop-catalog.tsx`, `components/shop-product-grid.tsx`, `app/globals.css` | Next era troppo diverso: hero custom, categorie in panel, status badge, heading "sola lettura", controlli in card, card piu grandi e meno compatte. | Fix applicato in questa fase solo su Shop. | HIGH |
| Fresh Cut | `#fresh-cut`, `.fresh-cut-section` | `app/taglio-fresco/page.tsx`, CSS | Next mantiene pagina dedicata e visual coerente, ma non e ancora pixel-close al vanilla. | Batch futuro: rifinire immagine, pannello testo, spacing. | MEDIUM |
| Showcase | `#showcase`, `.page-banner--showcase`, `.showcase-grid`, `.showcase-card` | `app/showcase/page.tsx`, CSS | Struttura simile ma contenuti statici Next e card leggermente diverse. | Batch futuro: allineare card body, date/badge e altezza immagini. | MEDIUM |
| Contact | `#support`, `.contact-section`, `.contact-form` | `app/contact/page.tsx`, `components/contact-form.tsx` | Next piu form/app-like con inline style residui. | Batch futuro: spostare inline style e allineare a contact vanilla. | MEDIUM |
| Checkout | `#checkout`, `.checkout-layout`, `.checkout-form`, `.checkout-summary`, `.checkout-success`, cart drawer, `createOrder()` | `app/checkout/page.tsx`, `components/checkout-in-shop.tsx`, `app/globals.css` | Vanilla ha form checkout semplice con carrello gia preparato, riepilogo ordine e conferma locale; Next pre-fix caricava prodotti da Supabase e includeva mini catalogo/quick add nella pagina checkout. | Fix applicato: checkout statico/localStorage, niente Supabase/API runtime, layout vanilla-like. | HIGH |
| Admin | `#admin`, `.inventory-shell`, `.admin-login`, `.admin-tabs`, `.inventory-summary`, `.inventory-table`, `.admin-*` | `app/admin/page.tsx`, `components/admin-*`, `app/globals.css` | Vanilla ha una vera area admin scura/compatta con login, tab, KPI, tabelle e pannelli gestione. Next resta read-only/status, ma ora e stato riallineato graficamente con shell scura, pannelli compatti, metriche e tabella in stile inventory. | Fix applicato solo styling/layout, senza CRUD, API, auth o dati. | HIGH |
| Privacy/Cookie | `#privacy`, `#cookie`, `.legal-page`, `.legal-card` | `app/privacy/page.tsx`, `app/cookie/page.tsx` | Coerenza sufficiente, Next route dedicate. | Piccole rifiniture tipografiche. | LOW |
| Footer | `.site-legal` | `components/site-footer.tsx`, CSS | Footer Next e coerente ma non identico. In Shop serve meno spazio verticale e piu aderenza al vanilla. | Batch futuro generale. Per Shop ridotto impatto tramite fine pagina piu compatta. | LOW |

## Shop - differenze rilevate prima del fix

### Header/navbar

- Vanilla: header bianco sticky, nav centrale, link a sezioni hash.
- Next: header bianco simile, link route reali.
- Differenza accettabile: la struttura Next deve restare route-based.

### Hero prodotti

- Vanilla: `.page-banner.page-banner--shop`, immagine `Img/wallpaper/2-opt.webp`, overlay nero, pannello rosso diagonale a destra, h1 grande italic.
- Next: `.page-hero.page-hero--shop` con status badge e composizione piu recente.
- Fix: sostituita la hero Shop con `page-banner page-banner--shop`, titolo `Prodotti No Cap`, testo vanilla-like.

### Titolo sezione

- Vanilla: nella sezione prodotti appare `Catalogo professionale`.
- Next: `Prodotti consultabili in sola lettura`.
- Fix: titolo riportato a `Catalogo professionale`.

### Categorie

- Vanilla: `category-bar` orizzontale, link/pill testuali sobri.
- Next: categorie dentro `panel`, molto invasive.
- Fix: categorie spostate dentro `category-bar` compatta, senza panel.

### Filtri e sort

- Vanilla: `shop-tools` con due controlli: Cerca e Ordina, compatti, fuori da card decorative.
- Next: controlli dentro `spotlight-card`, con testo e stato extra.
- Fix: markup ShopCatalog trasformato in `shop-tools` vanilla-like.

### Griglia prodotti

- Vanilla: `repeat(4, 1fr)`, gap `12px`, card min-height circa `310px`.
- Next: card piu grandi e stili sovrapposti da batch precedenti.
- Fix: CSS scoped sotto `.route-shell--shop` per griglia compatta e card piu vicine alla vanilla.

### Card prodotto

- Vanilla: card scura, bordo chiaro, inset nero, media 168px, categoria rossa, badge piccolo, titolo Barlow Condensed uppercase, descrizione breve, prezzo, stock badge e CTA.
- Next: card con dual media gia presente, ma piu grande e con CTA "Vedi risultato" come link checkout.
- Fix: card shop resa piu compatta, media e tipografia riallineate, CTA secondaria ridotta a toggle visuale testuale non invasivo.

### Footer e spazi verticali

- Vanilla: shop section termina vicino alla griglia; footer legale segue senza grandi blocchi extra.
- Next: sezioni di stato e cross-link erano troppo presenti.
- Fix: rimossi panel/cross-link extra e ridotti spazi verticali nella Shop.

### Responsive

- Vanilla: 2 colonne sotto 1180px, 1 colonna sotto 780px, category-bar scrollabile.
- Next: gia aveva responsive, ma non sempre scoped.
- Fix: override Shop scoped per 1180px, 780px e 430px.

## SHOP - DIFFERENZE E FIX APPLICATI

File modificati:

- `destinazione/next-prod/app/shop/page.tsx`
- `destinazione/next-prod/components/shop-catalog.tsx`
- `destinazione/next-prod/components/shop-product-grid.tsx`
- `destinazione/next-prod/app/globals.css`
- `VISUAL_AUDIT_VANILLA_VS_NEXT.md`

Fix applicati:

- hero Shop riportata a pattern vanilla `page-banner page-banner--shop`;
- rimosse status card/panel categorie dalla pagina Shop;
- categorie rese `category-bar` compatta;
- titolo sezione riportato a `Catalogo professionale`;
- strumenti ricerca/sort resi `shop-tools`;
- griglia e card Shop riallineate a vanilla con CSS scoped;
- card prodotto rese piu compatte, scure, squadrate, con media dominante;
- ridotti spazi verticali e blocchi descrittivi non presenti nel vanilla;
- mantenuta `/shop` come route autonoma;
- nessuna modifica a dati catalogo, API, Supabase, checkout reale o route path.

## CONTACT - DIFFERENZE E FIX APPLICATI

### Differenze trovate

- Vanilla: la sezione Contatti vive in `sorgente/index.html` come `#support`, con `page-banner page-banner--support`, titolo `No Cap Barbershop`, intro breve e layout `contact-section` a due colonne.
- Vanilla: il pannello sinistro usa `contact-details`, headline `Vignola, MO`, telefono e indirizzo come link grandi e leggibili.
- Vanilla: il form usa `contact-form`, heading `Scrivici`, campi squadrati scuri, label semplici, consenso privacy e doppia CTA WhatsApp/invio.
- Next pre-fix: `/contact` usava `page-hero--contact`, status badge, CTA verso Shop/Checkout, card `spotlight-card` e form con diversi inline style.
- Next pre-fix: la pagina risultava piu app-like e meno vicina al blocco vanilla `#support`, soprattutto per hero, struttura a pannelli, spacing, input e bottoni.

### File modificati

- `destinazione/next-prod/app/contact/page.tsx`
- `destinazione/next-prod/components/contact-form.tsx`
- `destinazione/next-prod/app/globals.css`
- `VISUAL_AUDIT_VANILLA_VS_NEXT.md`

### Fix applicati

- Hero Contact riallineata al pattern vanilla `page-banner page-banner--support`.
- Titolo e intro riportati vicino al vanilla: `No Cap Barbershop` e testo breve di contatto.
- Corpo pagina convertito a `contact-section`, con pannello negozio `contact-details`.
- Telefono e indirizzo portati a link `contact-line`, come nel vanilla.
- Form portato a `contact-form`, con heading `Contattaci / Scrivici`, label vanilla-like, input/textarea scuri e squadrati.
- Rimossi gli inline style principali dal markup del form e sostituiti con classi CSS dedicate.
- Aggiunte classi visuali `contact-form__grid`, `contact-context`, `contact-form__actions`, `contact-honeypot` e `contact-form__message`.
- CSS aggiunto solo sotto `.route-shell--contact`, per evitare regressioni sulla Shop gia sistemata.
- Nessuna modifica a endpoint, fetch, payload, validazione, stato React, invio reale del form o logica business.

### Cosa resta da rifinire

- Review visuale manuale su mobile/tablet per micro-spaziatura tra header, banner e form.
- Eventuale micro-allineamento del footer quando si fara un batch footer/header dedicato.
- Possibile riduzione della copy informativa Next se si vuole una parita ancora piu stretta con il vanilla.

### Rischio regressioni

Basso: le modifiche sono limitate alla route `/contact` e il CSS nuovo e scoped sotto `.route-shell--contact`. La pagina Shop non e stata modificata in questo batch.

## ADMIN - DIFFERENZE E FIX APPLICATI

### Esistenza admin vanilla

Admin vanilla esiste in `sorgente/index.html` come sezione `#admin`, con classi principali `admin-page`, `inventory-shell`, `admin-login`, `admin-content`, `admin-tabs`, `admin-block`, `inventory-summary`, `inventory-table`, `admin-cut-form` e pannelli ordini/richieste/gestione.

I file vanilla rilevanti sono:

- `sorgente/index.html`
- `sorgente/styles.css`
- `sorgente/app.js`
- `sorgente/js/render.js`
- `sorgente/js/repository.js`

Nota: la versione vanilla contiene logiche admin operative, auth/sessione, gestione tab, ordini, richieste, prodotti e inventario. In questa fase sono state usate solo come riferimento grafico, non come funzionalita da migrare.

### Differenze rilevate

- Vanilla: area scura, compatta, dentro `inventory-shell`, con bordo rosso superiore e pannelli densi.
- Vanilla: login admin e dashboard condividono campi scuri, bottoni squadrati, tab uppercase e KPI `inventory-summary`.
- Vanilla: tabelle `inventory-table` con righe compatte e header Barlow Condensed.
- Next pre-fix: `/admin` era una pagina read-only/status con `hero-panel`, `missing-panel`, `status-card`, molte griglie definite inline e look piu dashboard generica.
- Next pre-fix: diversi componenti admin avevano inline style per griglie, heading, form, metriche e tabelle.
- Differenza funzionale mantenuta: Next non implementa CRUD completo, gestione ordini/lead o dashboard operativa come il vanilla. Resta volutamente read-only/status.

### File modificati

- `destinazione/next-prod/app/admin/page.tsx`
- `destinazione/next-prod/components/admin-readonly-dashboard.tsx`
- `destinazione/next-prod/components/admin-auth-status-panel.tsx`
- `destinazione/next-prod/components/admin-login-panel.tsx`
- `destinazione/next-prod/components/admin-products-summary-panel.tsx`
- `destinazione/next-prod/components/admin-migration-panel.tsx`
- `destinazione/next-prod/components/admin-future-actions.tsx`
- `destinazione/next-prod/app/globals.css`
- `VISUAL_AUDIT_VANILLA_VS_NEXT.md`

### Fix applicati

- Hero admin convertita in `admin-hero`, piu vicina alla shell vanilla `inventory-shell`.
- Layout centrale `/admin` uniformato a larghezza `1200px`, fondo scuro, texture e accento rosso.
- Pannelli `missing-panel` e `status-card` resi piu compatti, squadrati, scuri e coerenti con vanilla.
- Metriche/KPI rese piu simili a `inventory-summary`, con numeri grandi in font display rosso.
- Tabelle riepilogo prodotti convertite a classi `admin-table-wrap` e `admin-table`, ispirate a `inventory-table`.
- Form login minimo riallineato a campi admin scuri e bottoni/badge coerenti.
- Griglie e heading admin spostati da inline style a classi CSS scoped sotto `.route-shell--admin`.
- Responsive admin migliorato con griglie a colonna singola sotto tablet/mobile.

### Cosa NON e stato toccato

- Nessun CRUD admin.
- Nessuna API nuova o modificata.
- Nessuna modifica a Supabase.
- Nessuna modifica ad auth reale o mock.
- Nessuna modifica a dati, permessi, endpoint, helper admin o logiche di business.
- Nessun cambio route.

### Rischio regressioni

Basso/medio: il cambio e visuale e scoped sotto `.route-shell--admin`, ma alcuni componenti admin hanno markup di classe aggiornato. Il comportamento operativo resta invariato perche funzioni, props, fetch, login flow e helper non sono stati modificati.

### Cosa resta da rifinire

- Review visuale manuale di `/admin` a 1440px, 768px e 390px.
- Eventuale futuro batch per rendere la dashboard Next piu vicina alla struttura tab vanilla, solo se verra richiesto senza attivare CRUD.
- Eventuale cleanup ulteriore di copy/status panel, mantenendo chiaro che l'area e read-only.

## CHECKOUT - AUDIT FUNZIONALE E GRAFICO

### Comportamento checkout vanilla

- Il checkout vanilla esiste in `sorgente/index.html` come sezione `#checkout`.
- La pagina usa `page-banner page-banner--shop`, titolo `Conferma ordine`, form `checkout-form`, layout `checkout-layout`, riepilogo `checkout-summary` e stato finale `checkout-success`.
- Il carrello vanilla viene gestito fuori dalla pagina checkout tramite drawer `cart-drawer`, pulsanti `data-add-to-cart`, `data-remove-cart`, `data-checkout` e funzioni in `sorgente/app.js` / `sorgente/js/render.js`.
- Il carrello vanilla viene letto/salvato con `getCart()`, `saveCart()`, `clearCart()` in `sorgente/js/repository.js`.
- La chiave localStorage vanilla del carrello e `no-cap-cart-v2`; la chiave ordini e `no-cap-orders-v1`.
- Il checkout vanilla valida nome, email, telefono e, se selezionata, spedizione con indirizzo/citta/CAP.
- `buildOrderPayload()` costruisce ordine locale con `orderNumber`, customer, fulfillment, items, subtotal, shipping, total, status `in-attesa`, paymentMode.
- `submitCheckout()` crea ordine, svuota carrello, mostra `checkout-success`, aggiorna riepilogo e consente copia/scaricamento JSON.
- Vanilla ha opzione pagamento `in-shop` e `paypal`; PayPal e una modalita registrata sull'ordine, non un redirect provider nel codice analizzato.

### Dati, localStorage, Supabase/API vanilla

- Vanilla usa dati statici in `sorgente/js/data.js` come fallback per prodotti e inventario.
- Vanilla usa localStorage per carrello e ordini tramite `loadJson()` / `saveJson()`.
- Importante: `sorgente/js/config.js` ha `DATA_PROVIDER: "supabase"` e `CHECKOUT_MODE: "paypal"`.
- `sorgente/js/repository.js` contiene chiamate Supabase globali. In particolare `createOrder()` puo inserire in `orders` e `order_items` se Supabase e disponibile, poi salva comunque in localStorage.
- Per questa fase Next e stato allineato al flusso semplice/localStorage richiesto: runtime `/checkout` non dipende da Supabase/API e non aggiunge pagamenti reali.

### Comportamento Next prima del fix

- `app/checkout/page.tsx` era `async` e chiamava `getPublicProducts()` da `lib/supabase-public`.
- Il checkout riceveva prodotti pubblici Supabase, con fallback a `productTeasers`.
- `components/checkout-in-shop.tsx` mostrava una mini area catalogo dentro `/checkout`: select prodotto, lista prodotti, quick add e card prodotto.
- Il componente salvava carrello e ordini in localStorage, ma includeva anche `PaymentMode = "in-shop" | "paypal" | "stripe"`.
- Era presente un placeholder Stripe disabilitato e un modal PayPal placeholder.
- La pagina risultava piu ampia e diversa dal vanilla: non solo conferma carrello, ma anche mini shop interno.

### Chiamate Supabase/API trovate nel checkout Next pre-fix

- `app/checkout/page.tsx` importava `getPublicProducts` da `../../lib/supabase-public`.
- `CheckoutPage()` eseguiva `await getPublicProducts()`, quindi `/checkout` dipendeva da una lettura pubblica Supabase/server-side.
- Non sono state trovate fetch/API operative dirette in `components/checkout-in-shop.tsx`.
- Non sono state trovate chiamate Stripe/PayPal reali; erano presenti solo stati/modalita placeholder.

## CHECKOUT - DIFFERENZE E FIX APPLICATI

### File modificati

- `destinazione/next-prod/app/checkout/page.tsx`
- `destinazione/next-prod/components/checkout-in-shop.tsx`
- `destinazione/next-prod/app/globals.css`
- `VISUAL_AUDIT_VANILLA_VS_NEXT.md`

### Fix funzionali applicati

- Rimosso import e uso di `getPublicProducts()` da `/checkout`.
- `/checkout` non e piu una route server async che legge Supabase per popolare il checkout.
- Il componente checkout usa solo prodotti statici passati da `productTeasers`.
- Il query param `/checkout?product=...` viene letto client-side e, se il prodotto esiste nel fallback statico, aggiunge quel prodotto al carrello localStorage.
- Il carrello resta localStorage-only con chiave Next esistente `no-cap-next-cart-v1`.
- Gli ordini confermati restano localStorage-only con chiave `no-cap-next-orders-v1`.
- Rimossa la mini area catalogo/quick add dalla pagina checkout.
- Rimosso `stripe` dal tipo `PaymentMode` e dalla UI checkout.
- Rimosso modal PayPal placeholder: PayPal resta solo come valore informativo registrato localmente sull'ordine, senza redirect/provider.
- Nessun submit ordine verso backend/API/Supabase dal runtime `/checkout`.

### Fix grafici applicati

- Hero checkout riallineata a vanilla con `page-banner page-banner--checkout`, titolo `Conferma ordine` e testo breve.
- Layout riportato a `checkout-layout`: form principale + riepilogo ordine.
- Form riportato a blocchi `checkout-block`: dati cliente, ritiro/spedizione, pagamento.
- Riepilogo ordine separato in `checkout-summary`, con stato carrello vuoto come nel vanilla.
- Stato finale `checkout-success` riallineato al vanilla con numero ordine, riepilogo, totale, link shop/home, copia riepilogo e download JSON.
- CSS scoped sotto `.route-shell--checkout` per non impattare Shop, Contact o Admin.
- Responsive checkout semplificato a colonna singola sotto tablet/mobile.

### Cosa resta solo nello Shop

- Scelta/catalogo prodotti come esperienza principale.
- Card prodotto e CTA prodotto.
- Disponibilita/stock visuale.
- Navigazione verso `/checkout?product=...`.
- Nessun provider pagamento reale e stato aggiunto a `/checkout`.

### Rischio regressioni

Medio: il comportamento `/checkout` e stato semplificato e reso localStorage-only. Questo elimina la dipendenza Supabase dalla route checkout, ma cambia il pre-fix Next che leggeva prodotti live pubblici. Shop, Contact e Admin non sono stati toccati in questo batch.

### Cosa resta da rifinire

- Decidere in futuro se allineare le chiavi localStorage Next a quelle vanilla (`no-cap-cart-v2` / `no-cap-orders-v1`) oppure mantenerle namespace Next.
- Eventuale review visuale mobile/tablet di form e riepilogo.
- Eventuale integrazione futura vera degli ordini solo con task dedicato backend/protezioni, non in questo batch.

## Verifiche

Eseguite da `destinazione/next-prod`:

- `npm run lint`: PASS, con 7 warning noti `@next/next/no-img-element`.
- `npm run typecheck`: PASS.
- `npm test`: PASS, 9 test superati.
- `npm run build`: PASS, con gli stessi 7 warning `<img>`.

I warning `<img>` non sono stati corretti in questa fase per rispettare il vincolo di non allargare il batch a `next/image`.

## Cosa resta da fare fuori Shop

- Fresh Cut: riallineare layout/pannello/media al vanilla.
- Showcase: rifinire card e page banner.
- Contact: rimuovere inline style e allineare form al vanilla.
- Checkout: riallineato a flusso localStorage/statico vanilla-like, senza runtime Supabase/API.
- Admin: styling-only applicato, mantenendo read-only/status.
- Header mobile: audit visuale manuale.
- Eventuale batch `next/image`: separato, per evitare regressioni layout.
