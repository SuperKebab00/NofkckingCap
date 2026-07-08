# Roadmap fix step-by-step

Roadmap eseguibile in micro-step. Ogni step e piccolo, verificabile e reversibile. Parte dagli interventi statici piu sicuri e ad alto valore.

## Step 1

- Obiettivo: creare baseline di verifica dei riferimenti statici.
- File da modificare: nessuno.
- Cosa modificare: nulla; eseguire solo ricerca dei riferimenti `/Img/`, `/#fresh-cut`, `/#showcase`.
- Cosa NON modificare: codice, asset, config.
- Comando di verifica consigliato: `rg "/Img/|/#fresh-cut|/#showcase" destinazione/next-prod`
- Risultato atteso: elenco completo dei riferimenti da trattare nei primi fix.
- Rollback consigliato: non necessario.

## Step 2

- Obiettivo: correggere CTA statiche verso fresh cut/showcase usando route dedicate.
- File da modificare: `destinazione/next-prod/lib/static-content.ts`.
- Cosa modificare: sostituire `/#fresh-cut` con `/taglio-fresco` e `/#showcase` con `/showcase` nei dati statici, se la decisione e route dedicate.
- Cosa NON modificare: componenti, CSS, route, logiche checkout/admin.
- Comando di verifica consigliato: `rg "/#fresh-cut|/#showcase" destinazione/next-prod`
- Risultato atteso: nessun riferimento residuo a CTA hash non supportate.
- Rollback consigliato: ripristinare solo le stringhe href precedenti in `static-content.ts`.

## Step 3

- Obiettivo: copiare asset sorgente mancanti gia referenziati da Next.
- File da modificare: `destinazione/next-prod/public/Img/**`.
- Cosa modificare: copiare da `sorgente/Img` almeno `wallpaper/2-opt.webp`, `products/black-wax-lifestyle-opt.webp`, `products/clay-pomade-lifestyle-opt.webp`.
- Cosa NON modificare: nomi file, contenuti immagine, import componenti.
- Comando di verifica consigliato: `Get-ChildItem destinazione\\next-prod\\public\\Img -Recurse | Select-Object FullName`
- Risultato atteso: i file referenziati da `static-content.ts` esistono in `public`.
- Rollback consigliato: rimuovere solo i file copiati in questo step, se necessario e autorizzato nella fase fix.

## Step 4

- Obiettivo: rimuovere o sostituire riferimenti statici a Sea salt spray.
- File da modificare: `destinazione/next-prod/lib/static-content.ts`.
- Cosa modificare: sostituire il teaser Sea salt spray con un prodotto presente nel vanilla, preferibilmente `Aftershave`, `Dust Wax`, `Fade DLC`, `Fade Gold`, `Faper DLC` o `No Cap Comb Kit`.
- Cosa NON modificare: componenti shop, API, Supabase.
- Comando di verifica consigliato: `rg "sea-salt|Sea salt" destinazione/next-prod`
- Risultato atteso: nessun prodotto fallback non presente nel vanilla, salvo decisione esplicita.
- Rollback consigliato: ripristinare l'oggetto `productTeasers` precedente.

## Step 5

- Obiettivo: estendere fallback catalogo in modo conservativo.
- File da modificare: `destinazione/next-prod/lib/static-content.ts`.
- Cosa modificare: aggiungere progressivamente prodotti vanilla mancanti a `productTeasers`, usando immagini esistenti o appena copiate e `checkoutHref`/`contactHref` coerenti.
- Cosa NON modificare: `lib/supabase-public.ts`, API, checkout logic.
- Comando di verifica consigliato: `rg "productTeasers|aftershave|dust-wax|fade-dlc|fade-gold|comb-kit|faper-dlc" destinazione/next-prod/lib/static-content.ts`
- Risultato atteso: fallback statico piu vicino agli 8 prodotti del vanilla.
- Rollback consigliato: rimuovere gli oggetti prodotto aggiunti in questo step.

## Step 6

- Obiettivo: copiare il resto degli asset prodotto vanilla necessari al fallback.
- File da modificare: `destinazione/next-prod/public/Img/products/**`.
- Cosa modificare: copiare packshot/lifestyle mancanti dal sorgente mantenendo path e nomi.
- Cosa NON modificare: immagini originali in `sorgente/`, riferimenti Supabase, config.
- Comando di verifica consigliato: `Get-ChildItem destinazione\\next-prod\\public\\Img\\products | Select-Object Name,Length`
- Risultato atteso: set immagini prodotto Next allineato al sorgente.
- Rollback consigliato: rimuovere solo gli asset copiati nello step se causano problemi, con conferma esplicita.

## Step 7

- Obiettivo: aggiungere sort shop mancanti ma non sensibili.
- File da modificare: `destinazione/next-prod/components/shop-catalog.tsx`.
- Cosa modificare: estendere `SortMode` e select con prezzo crescente, prezzo decrescente, solo disponibili, ultimi pezzi.
- Cosa NON modificare: card prodotto, checkout, Supabase fetch, API.
- Comando di verifica consigliato: `npm run lint`
- Risultato atteso: la UI shop offre i criteri presenti nel vanilla e filtra/sorta localmente.
- Rollback consigliato: ripristinare `SortMode`, select e blocco sort precedenti.

## Step 8

- Obiettivo: correggere CTA "Vedi risultato" se non implementa un risultato.
- File da modificare: `destinazione/next-prod/components/shop-product-grid.tsx`.
- Cosa modificare: rendere il testo coerente con il comportamento effettivo, oppure preparare supporto a lifestyle image senza toccare checkout.
- Cosa NON modificare: carrello, localStorage, API.
- Comando di verifica consigliato: `rg "Vedi risultato|Aggiungi" destinazione/next-prod/components/shop-product-grid.tsx`
- Risultato atteso: nessun bottone promette una funzione non implementata.
- Rollback consigliato: ripristinare etichette precedenti.

## Step 9

- Obiettivo: ripristinare `manifest.webmanifest` e `robots.txt` nel contesto Next.
- File da modificare: `destinazione/next-prod/public/manifest.webmanifest`, `destinazione/next-prod/public/robots.txt`.
- Cosa modificare: copiare i file da `sorgente/` adattando solo se strettamente necessario per Next.
- Cosa NON modificare: `next.config.ts`, deploy config, `_headers`.
- Comando di verifica consigliato: `Get-ChildItem destinazione\\next-prod\\public | Select-Object Name`
- Risultato atteso: manifest e robots disponibili in `public`.
- Rollback consigliato: rimuovere i due file copiati se la strategia SEO/PWA cambia.

## Step 10

- Obiettivo: documentare la decisione su cartella legacy e API parallele prima di cancellare qualsiasi cosa.
- File da modificare: solo documentazione, ad esempio aggiornare `docs/audit-migrazione/07-file-obsoleti-o-sospetti.md` o creare nota nuova.
- Cosa modificare: annotare owner, stato e uso di `destinazione/` root legacy e `functions/api`.
- Cosa NON modificare: file legacy, API, config.
- Comando di verifica consigliato: `rg "functions/api|destinazione/index.html|next-prod/app/api" docs/audit-migrazione`
- Risultato atteso: nessun file sospetto viene rimosso senza decisione.
- Rollback consigliato: revert della sola nota documentale.

## Step 11

- Obiettivo: preparare verifica toolchain.
- File da modificare: nessuno.
- Cosa modificare: nulla; verificare presenza `node_modules` e binari npm.
- Cosa NON modificare: package, lockfile, codice.
- Comando di verifica consigliato: `npm run lint`
- Risultato atteso: se dipendenze installate, lint parte; se no, errore documentato.
- Rollback consigliato: non necessario.

## Step 12

- Obiettivo: eseguire test in ambiente con permessi adeguati.
- File da modificare: nessuno.
- Cosa modificare: nulla; rieseguire test fuori dal blocco `spawn EPERM`.
- Cosa NON modificare: test o codice per farli passare.
- Comando di verifica consigliato: `npm test`
- Risultato atteso: test eseguiti realmente, con pass/fail funzionale.
- Rollback consigliato: non necessario.

## Step 13

- Obiettivo: eseguire build solo quando autorizzato a generare artefatti.
- File da modificare: nessuno intenzionalmente, ma la build genera `.next`.
- Cosa modificare: nulla a mano.
- Cosa NON modificare: codice durante la diagnosi build.
- Comando di verifica consigliato: `npm run build`
- Risultato atteso: build completa oppure errori concreti da documentare.
- Rollback consigliato: eliminare artefatti build solo se autorizzato e fuori da questa fase documentale.

## Step 14

- Obiettivo: decidere modello checkout.
- File da modificare: documentazione o issue tecnica, non codice.
- Cosa modificare: scrivere decisione tra riepilogo in-shop, ordine reale, PayPal, Stripe, lead.
- Cosa NON modificare: `CheckoutInShop`, API checkout, Cloudflare.
- Comando di verifica consigliato: `rg "checkout" docs/audit-migrazione`
- Risultato atteso: perimetro checkout chiaro prima di toccare logiche sensibili.
- Rollback consigliato: aggiornare la decisione documentale.

## Step 15

- Obiettivo: decidere perimetro admin.
- File da modificare: documentazione o issue tecnica, non codice.
- Cosa modificare: stabilire se admin Next deve essere read-only o gestionale.
- Cosa NON modificare: API admin, Supabase auth, componenti admin.
- Comando di verifica consigliato: `rg "admin" docs/audit-migrazione`
- Risultato atteso: perimetro admin chiaro prima di implementare scritture.
- Rollback consigliato: aggiornare la decisione documentale.

## Step 16

- Obiettivo: implementare cookie consent globale.
- File da modificare: `destinazione/next-prod/app/layout.tsx`, nuovo componente client, `destinazione/next-prod/app/globals.css`.
- Cosa modificare: reintrodurre banner/modal con storage e categorie, dopo review legale.
- Cosa NON modificare: policy legale senza contenuti approvati, script marketing non definiti.
- Comando di verifica consigliato: `npm run lint`
- Risultato atteso: banner appare solo quando serve, preferenze salvate e riapribili.
- Rollback consigliato: rimuovere componente dal layout e ripristinare file CSS toccati.

## Step 17

- Obiettivo: migrare carrello/drawer o confermare checkout-route-only.
- File da modificare: `components/shop-product-grid.tsx`, `components/cart-count.tsx`, `components/checkout-in-shop.tsx`, eventuale nuovo drawer.
- Cosa modificare: solo dopo decisione checkout, rendere coerenti add-to-cart, count e checkout.
- Cosa NON modificare: pagamenti reali, API admin.
- Comando di verifica consigliato: test manuale locale shop -> carrello -> checkout.
- Risultato atteso: percorso acquisto coerente e reversibile.
- Rollback consigliato: ripristinare componenti shop/cart/checkout precedenti.

## Step 18

- Obiettivo: migrare admin operativo.
- File da modificare: `app/admin/page.tsx`, `components/admin-*`, API server/admin.
- Cosa modificare: introdurre una funzione per volta: prodotti, categorie, fresh cut, ordini, lead.
- Cosa NON modificare: tutte le funzioni admin in un unico batch.
- Comando di verifica consigliato: test mirati per API/admin e verifica manuale auth.
- Risultato atteso: ogni capability admin e protetta, testata e reversibile.
- Rollback consigliato: disattivare il singolo pannello/endpoint aggiunto, non l'intera admin.

## Step 19

- Obiettivo: consolidare API layer.
- File da modificare: solo dopo decisione deploy, eventualmente docs/config/API.
- Cosa modificare: scegliere owner unico tra `next-prod/app/api` e `destinazione/functions/api`.
- Cosa NON modificare: cancellare endpoint legacy senza verifica logs/deploy.
- Comando di verifica consigliato: ricerca endpoint e smoke test locale/deploy.
- Risultato atteso: nessun endpoint duplicato ambiguo.
- Rollback consigliato: mantenere endpoint legacy disattivati ma non rimossi finche non validato.

## Step 20

- Obiettivo: eseguire revisione production-ready completa.
- File da modificare: dipende dai risultati.
- Cosa modificare: solo correzioni puntuali emerse da build/test/browser.
- Cosa NON modificare: refactor non collegati.
- Comando di verifica consigliato: `npm run lint`, `npm test`, `npm run typecheck`, `npm run build`.
- Risultato atteso: baseline production-ready con gap residui documentati.
- Rollback consigliato: revert per singolo commit/batch nella futura fase di implementazione.
