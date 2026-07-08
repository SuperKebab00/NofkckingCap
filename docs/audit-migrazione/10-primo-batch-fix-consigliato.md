# Primo batch fix consigliato

Questo primo batch e conservativo. Include solo interventi statici o locali che migliorano equivalenza vanilla -> Next senza database, deploy, Supabase, Cloudflare o logiche sensibili.

## Criteri di inclusione

Incluso solo cio che:

- migliora equivalenza vanilla -> Next;
- non richiede database;
- non richiede deploy;
- non richiede Supabase;
- non richiede Cloudflare;
- non cambia logiche sensibili;
- e verificabile in locale con ricerche, lint o controllo visivo.

## Modifica 1: correggere CTA hash verso route dedicate

- File esatti:
  - `destinazione/next-prod/lib/static-content.ts`
- Modifica prevista:
  - sostituire riferimenti `/#fresh-cut` con `/taglio-fresco`;
  - sostituire riferimenti `/#showcase` con `/showcase`.
- Motivo:
  - Next ha route dedicate e non garantisce anchor reali in homepage;
  - riduce link ambigui senza toccare componenti o logiche.
- Verifica:
  - `rg "/#fresh-cut|/#showcase" destinazione/next-prod`
  - controllo manuale dei link home in locale.
- Rischio:
  - basso, se la decisione e usare route dedicate;
  - rollback semplice ripristinando le stringhe precedenti.

## Modifica 2: copiare asset mancanti gia referenziati

- File esatti:
  - da `sorgente/Img/wallpaper/2-opt.webp`
  - a `destinazione/next-prod/public/Img/wallpaper/2-opt.webp`
  - da `sorgente/Img/products/black-wax-lifestyle-opt.webp`
  - a `destinazione/next-prod/public/Img/products/black-wax-lifestyle-opt.webp`
  - da `sorgente/Img/products/clay-pomade-lifestyle-opt.webp`
  - a `destinazione/next-prod/public/Img/products/clay-pomade-lifestyle-opt.webp`
- Modifica prevista:
  - copiare i file mantenendo nomi e path.
- Motivo:
  - questi asset sono gia referenziati da `lib/static-content.ts`;
  - previene immagini rotte senza cambiare codice.
- Verifica:
  - `Test-Path destinazione\\next-prod\\public\\Img\\wallpaper\\2-opt.webp`
  - `Test-Path destinazione\\next-prod\\public\\Img\\products\\black-wax-lifestyle-opt.webp`
  - `Test-Path destinazione\\next-prod\\public\\Img\\products\\clay-pomade-lifestyle-opt.webp`
- Rischio:
  - basso;
  - non altera runtime se non risolvendo asset mancanti.

## Modifica 3: sostituire Sea salt spray nel fallback

- File esatti:
  - `destinazione/next-prod/lib/static-content.ts`
- Modifica prevista:
  - rimuovere o sostituire l'oggetto `Sea salt spray` in `productTeasers`;
  - usare un prodotto realmente presente in `sorgente/js/data.js`, ad esempio `Aftershave` o `Dust Wax`.
- Motivo:
  - Sea salt spray non risulta nel catalogo vanilla e referenzia asset inesistenti;
  - aumenta coerenza del fallback locale.
- Verifica:
  - `rg "sea-salt|Sea salt" destinazione/next-prod`
  - confronto con prodotti in `sorgente/js/data.js`.
- Rischio:
  - basso/medio;
  - cambia contenuto visibile ma rimuove un placeholder non coerente.

## Modifica 4: completare progressivamente asset prodotto vanilla

- File esatti:
  - `destinazione/next-prod/public/Img/products/aftershave-packshot-opt.webp`
  - `destinazione/next-prod/public/Img/products/aftershave-lifestyle-opt.webp`
  - `destinazione/next-prod/public/Img/products/dust-wax-packshot-opt.webp`
  - `destinazione/next-prod/public/Img/products/dust-wax-lifestyle-opt.webp`
  - `destinazione/next-prod/public/Img/products/fade-dlc-packshot-opt.webp`
  - `destinazione/next-prod/public/Img/products/fade-dlc-lifestyle-opt.webp`
  - `destinazione/next-prod/public/Img/products/fade-gold-packshot-opt.webp`
  - `destinazione/next-prod/public/Img/products/fade-gold-lifestyle-opt.webp`
- Modifica prevista:
  - copiare i file omonimi da `sorgente/Img/products/`.
- Motivo:
  - prepara riallineamento catalogo senza toccare logiche;
  - riduce gap visuale tra vanilla e Next.
- Verifica:
  - `Get-ChildItem destinazione\\next-prod\\public\\Img\\products | Select-Object Name,Length`
- Rischio:
  - basso;
  - aumenta dimensione asset ma non cambia codice.

## Modifica 5: riallineare `productTeasers` ai prodotti vanilla principali

- File esatti:
  - `destinazione/next-prod/lib/static-content.ts`
- Modifica prevista:
  - portare `productTeasers` da 3 teaser incoerenti a un fallback coerente con i prodotti vanilla principali;
  - includere almeno `Aftershave`, `Black Wax`, `Clay Pomade`, `Dust Wax`, `Fade DLC + Shallow DLC`, `Fade Gold + Slim Deep Gold`;
  - lasciare `Faper DLC` e `No Cap Comb Kit` con fallback immagine se non hanno asset reali nel sorgente.
- Motivo:
  - migliora comportamento locale quando Supabase non e configurato;
  - non richiede backend.
- Verifica:
  - `rg "Aftershave|Black Wax|Clay Pomade|Dust Wax|Fade DLC|Fade Gold|Sea salt" destinazione/next-prod/lib/static-content.ts`
  - controllo visivo `/shop` in locale.
- Rischio:
  - medio;
  - modifica contenuti fallback, ma non logiche sensibili.

## Modifica 6: aggiungere ordinamenti shop vanilla

- File esatti:
  - `destinazione/next-prod/components/shop-catalog.tsx`
- Modifica prevista:
  - estendere `SortMode` con `price-asc`, `price-desc`, `available`, `low-stock`;
  - aggiungere le opzioni alla select;
  - applicare sort/filter solo su dati gia presenti nel client.
- Motivo:
  - ripristina una funzione vanilla utile e locale;
  - non richiede API o database.
- Verifica:
  - `npm run lint`
  - controllo manuale filtri su `/shop`.
- Rischio:
  - basso/medio;
  - possibile edge case se `price` o `stock` sono `null`, da gestire con fallback conservativi.

## Modifica 7: ripristinare manifest e robots in Next public

- File esatti:
  - da `sorgente/manifest.webmanifest`
  - a `destinazione/next-prod/public/manifest.webmanifest`
  - da `sorgente/robots.txt`
  - a `destinazione/next-prod/public/robots.txt`
- Modifica prevista:
  - copiare file statici nel public Next.
- Motivo:
  - recupera elementi SEO/PWA presenti nel vanilla;
  - non cambia codice applicativo.
- Verifica:
  - `Get-ChildItem destinazione\\next-prod\\public | Select-Object Name`
  - in locale, verificare `/manifest.webmanifest` e `/robots.txt` dopo dev server.
- Rischio:
  - basso;
  - eventuale adattamento del contenuto puo essere fatto in un secondo batch.

## Modifiche escluse dal primo batch

- Checkout reale o integrazione PayPal/Stripe.
- Admin operativo e scritture Supabase.
- Cookie consent globale.
- Rimozione file legacy.
- Consolidamento API Cloudflare/Next.
- Refactor layout globale header/footer.
- Uso di `next/image`.
- Build production se non autorizzata a generare artefatti.

## Verifica consigliata del primo batch

Ordine consigliato:

1. `rg "/#fresh-cut|/#showcase|sea-salt|Sea salt" destinazione/next-prod`
2. `Get-ChildItem destinazione\\next-prod\\public\\Img -Recurse | Select-Object FullName`
3. `npm run lint`
4. `npm test`
5. controllo manuale locale di `/`, `/shop`, `/taglio-fresco`, `/showcase`.

Nota: se `npm run lint` continua a fallire per assenza dipendenze, documentare l'esito e non compensare con modifiche casuali.
