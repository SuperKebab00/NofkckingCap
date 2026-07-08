# Report primo batch fix conservativo

## 1. Modifiche applicate

Sono state applicate solo le modifiche consentite dal primo batch conservativo.

- Corrette CTA statiche da anchor hash a route dedicate:
  - `/#fresh-cut` -> `/taglio-fresco`
  - `/#showcase` -> `/showcase`
- Rimosso il fallback `Sea salt spray`, non coerente con il catalogo vanilla.
- Riallineato `productTeasers` a un set fallback piu fedele al vanilla:
  - `Aftershave`
  - `Black Wax`
  - `Clay Pomade`
  - `Dust Wax`
  - `Fade DLC + Shallow DLC`
  - `Fade Gold + Slim Deep Gold`
- Aggiunti prezzi e stock fallback ai teaser statici, usando i valori presenti in `sorgente/js/data.js`.
- Aggiunti ordinamenti client-side nello shop:
  - prezzo crescente;
  - prezzo decrescente;
  - solo disponibili;
  - ultimi pezzi / low stock.
- Copiati gli asset prodotto e wallpaper richiesti dal sorgente a `next-prod/public`.
- Copiati `manifest.webmanifest` e `robots.txt` nel `public` Next.

## 2. File modificati

File codice/dati statici:

- `destinazione/next-prod/lib/static-content.ts`
- `destinazione/next-prod/components/shop-catalog.tsx`

File statici aggiunti/coperti in `public`:

- `destinazione/next-prod/public/Img/wallpaper/2-opt.webp`
- `destinazione/next-prod/public/Img/products/aftershave-packshot-opt.webp`
- `destinazione/next-prod/public/Img/products/aftershave-lifestyle-opt.webp`
- `destinazione/next-prod/public/Img/products/black-wax-lifestyle-opt.webp`
- `destinazione/next-prod/public/Img/products/clay-pomade-lifestyle-opt.webp`
- `destinazione/next-prod/public/Img/products/dust-wax-packshot-opt.webp`
- `destinazione/next-prod/public/Img/products/dust-wax-lifestyle-opt.webp`
- `destinazione/next-prod/public/Img/products/fade-dlc-packshot-opt.webp`
- `destinazione/next-prod/public/Img/products/fade-dlc-lifestyle-opt.webp`
- `destinazione/next-prod/public/Img/products/fade-gold-packshot-opt.webp`
- `destinazione/next-prod/public/Img/products/fade-gold-lifestyle-opt.webp`
- `destinazione/next-prod/public/manifest.webmanifest`
- `destinazione/next-prod/public/robots.txt`

Report creato:

- `docs/audit-migrazione/11-primo-batch-fix-report.md`

## 3. Asset copiati

Asset gia referenziati:

- `sorgente/Img/wallpaper/2-opt.webp` -> `destinazione/next-prod/public/Img/wallpaper/2-opt.webp`
- `sorgente/Img/products/black-wax-lifestyle-opt.webp` -> `destinazione/next-prod/public/Img/products/black-wax-lifestyle-opt.webp`
- `sorgente/Img/products/clay-pomade-lifestyle-opt.webp` -> `destinazione/next-prod/public/Img/products/clay-pomade-lifestyle-opt.webp`

Asset prodotto vanilla principali:

- `aftershave-packshot-opt.webp`
- `aftershave-lifestyle-opt.webp`
- `dust-wax-packshot-opt.webp`
- `dust-wax-lifestyle-opt.webp`
- `fade-dlc-packshot-opt.webp`
- `fade-dlc-lifestyle-opt.webp`
- `fade-gold-packshot-opt.webp`
- `fade-gold-lifestyle-opt.webp`

Asset SEO/PWA:

- `manifest.webmanifest`
- `robots.txt`

## 4. Asset non trovati nel sorgente

Nessuno tra gli asset richiesti dal primo batch.

Verifica sorgente eseguita sugli 8 asset prodotto principali:

- `aftershave-packshot-opt.webp`: presente.
- `aftershave-lifestyle-opt.webp`: presente.
- `dust-wax-packshot-opt.webp`: presente.
- `dust-wax-lifestyle-opt.webp`: presente.
- `fade-dlc-packshot-opt.webp`: presente.
- `fade-dlc-lifestyle-opt.webp`: presente.
- `fade-gold-packshot-opt.webp`: presente.
- `fade-gold-lifestyle-opt.webp`: presente.

## 5. Risultato verifiche `rg`

Comando:

```powershell
rg "/#fresh-cut|/#showcase|sea-salt|Sea salt" destinazione\next-prod
```

Risultato:

- Nessun match residuo.
- Il comando ha restituito exit code `1`, coerente con "nessun risultato" per `rg`.

Verifiche aggiuntive:

```powershell
rg "Aftershave|Black Wax|Clay Pomade|Dust Wax|Fade DLC|Fade Gold|Sea salt|sea-salt" destinazione\next-prod\lib\static-content.ts
```

Risultato:

- Presenti i 6 prodotti vanilla principali richiesti.
- Nessun riferimento a `Sea salt` o `sea-salt`.

```powershell
rg "price-asc|price-desc|available|low-stock" destinazione\next-prod\components\shop-catalog.tsx
```

Risultato:

- Presenti le nuove modalita di ordinamento/filtro locale.

## 6. Risultato lint/test

### `npm run lint`

Comando eseguito da `destinazione/next-prod`:

```powershell
npm run lint
```

Risultato:

```text
"eslint" non e riconosciuto come comando interno o esterno,
un programma eseguibile o un file batch.
```

Motivo:

- `destinazione/next-prod/node_modules` non e presente.
- Non sono state installate dipendenze, perche il primo batch vieta nuove installazioni.

### `npm test`

Comando eseguito da `destinazione/next-prod`:

```powershell
npm test
```

Risultato:

- 9 test avviati dal runner Node.
- Tutti falliscono immediatamente con `Error: spawn EPERM`.

Interpretazione:

- Il fallimento e coerente con un blocco di permessi/ambiente gia rilevato nell'audit.
- Non indica necessariamente regressioni funzionali introdotte dal batch.
- Non sono state fatte modifiche ai test o al codice per aggirare il problema.

## 7. Verifica manuale/browser

Non eseguita in questa fase.

Motivo:

- `node_modules` non e presente in `destinazione/next-prod`.
- Avviare il dev server richiederebbe dipendenze installate.
- Non sono state installate dipendenze per rispettare il perimetro del primo batch.

Route da verificare appena l'ambiente locale e pronto:

- `/`
- `/shop`
- `/taglio-fresco`
- `/showcase`

## 8. Rischi residui

- `ShopCatalog` filtra categorie confrontando `product.category` con `category.value`; il fallback usa categorie semplici (`Hair`, `Styling`, `Tools`) che funzionano con lo slug corrente, ma i dati live Supabase vanno verificati separatamente.
- Gli ordinamenti per disponibilita e low stock dipendono da `stock`; se Supabase non espone stock o `showStock` resta `false`, il filtro resta comunque locale ma potrebbe non comunicare stock all'utente.
- `productTeasers` ora include prezzi, ma il rendering prezzo dipende da `ShopProductGrid`; non e stata modificata la logica checkout.
- Faper DLC e No Cap Comb Kit restano fuori dal primo batch perche non hanno asset reali dedicati nel sorgente.
- Lint, test e browser check restano da rieseguire in un ambiente con dipendenze e permessi adeguati.

## 9. Consiglio per secondo batch

Secondo batch consigliato:

1. Installare/verificare dipendenze in ambiente autorizzato e rieseguire `npm run lint`, `npm test`, `npm run typecheck`.
2. Eseguire controllo browser locale su `/`, `/shop`, `/taglio-fresco`, `/showcase`.
3. Valutare se includere `Faper DLC + Slim Deep DLC` e `No Cap Comb Kit` con fallback immagine esistente o attendere asset reali.
4. Correggere eventuali problemi visuali delle card prodotto emersi dal controllo browser.
5. Solo dopo questi controlli, pianificare cookie consent globale o riallineamento carrello/checkout in un batch separato.

## 10. Conferme di perimetro

Non sono stati toccati:

- checkout reale;
- PayPal;
- Stripe;
- Supabase;
- Cloudflare;
- deploy config;
- variabili ambiente;
- admin;
- file legacy;
- layout globale;
- `next/image`;
- `package.json`;
- `package-lock.json`.
