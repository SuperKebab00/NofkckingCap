# Verifica post-batch 1

## 1. Stato installazione dipendenze

Cartella verificata:

- `destinazione/next-prod`

Stato iniziale:

- `node_modules`: assente.

Comando eseguito:

```powershell
npm ci
```

Primo esito:

- Fallito per `EPERM` sul cache npm in `C:\Users\boulahfajadir\AppData\Local\npm-cache`.
- Errore principale: `operation not permitted, open ... npm-cache\_cacache\tmp`.

Secondo esito:

- `npm ci` rilanciato fuori sandbox.
- Installazione completata.
- Pacchetti installati: 594.
- Audit npm: 2 vulnerabilita moderate.
- Warning install script pending per alcuni pacchetti (`esbuild`, `sharp`, `unrs-resolver`, `workerd`).

Non sono stati modificati manualmente `package.json` o `package-lock.json`.

## 2. Risultato `npm run lint`

Comando:

```powershell
npm run lint
```

Esito:

- Completato con exit code `0`.
- Nessun errore.
- 8 warning `@next/next/no-img-element`.

Warning rilevati:

- `app/showcase/page.tsx`
- `app/taglio-fresco/page.tsx`
- `components/checkout-in-shop.tsx`
- `components/home-editorial-sections.tsx`
- `components/shop-product-grid.tsx`
- `components/site-header.tsx`

Interpretazione:

- Nessuna regressione bloccante da lint.
- I warning erano attesi rispetto alla scelta gia documentata di non introdurre `next/image` nel primo batch.

## 3. Risultato `npm test`

Comando sandbox:

```powershell
npm test
```

Primo esito:

- Fallito con `spawn EPERM` su tutti i 9 test.
- Stesso blocco ambientale gia visto prima dell'installazione dipendenze.

Comando rilanciato fuori sandbox:

```powershell
npm test
```

Esito finale:

- Passato.
- 9 test eseguiti.
- 9 passati.
- 0 falliti.

Test passati:

- `tests/admin-auth-check.test.mjs`
- `tests/admin-guard.test.mjs`
- `tests/admin-jwks-auth.test.mjs`
- `tests/admin-login.test.mjs`
- `tests/admin-products-summary.test.mjs`
- `tests/admin-status.test.mjs`
- `tests/contact-form.test.mjs`
- `tests/public-flow.test.mjs`
- `tests/supabase-public.test.mjs`

Interpretazione:

- L'errore `spawn EPERM` era ambientale/sandbox.
- Il primo batch non ha introdotto regressioni rilevate dai test esistenti.

## 4. Risultato `npm run typecheck`

Comando:

```powershell
npm run typecheck
```

Esito:

- Passato.
- `tsc --noEmit` completato senza errori.

## 5. Risultato `npm run build`

Comando:

```powershell
npm run build
```

Esito:

- Passato.
- Next.js `15.5.19`.
- Build production compilata con successo.
- Route statiche e dinamiche generate correttamente.

Warning durante build:

- Gli stessi warning lint `@next/next/no-img-element`.
- Warning Autoprefixer in `app/globals.css`:
  - riga 95: `start` ha supporto misto, suggerito `flex-start`.
  - riga 415: `end` ha supporto misto, suggerito `flex-end`.
  - riga 597: `end` ha supporto misto, suggerito `flex-end`.
  - riga 642: `end` ha supporto misto, suggerito `flex-end`.

Interpretazione:

- Build production valida.
- Warning non bloccanti, da trattare in un batch dedicato a performance/CSS.

## 6. Risultato verifica browser route per route

Dev server:

- Avviato con `npm run dev -- --hostname 127.0.0.1 --port 3000`.
- Primo avvio in sandbox fallito con `spawn EPERM`.
- Avvio fuori sandbox riuscito.
- Verifica eseguita su `http://127.0.0.1:3000`.
- Dev server fermato al termine della verifica.

### `/`

- Pagina carica: si.
- Header visibile: si.
- Footer visibile: si.
- Errori console: nessuno.
- Immagini rotte: nessuna.
- Note immagini: alcune immagini lazy risultavano ancora pending durante il controllo, non rotte.
- Link principali: presenti.
- CTA dedicate:
  - `Taglio del giorno` -> `/taglio-fresco`
  - banner Fresh cut -> `/taglio-fresco`
  - banner Showcase -> `/showcase`
  - `Vedi showcase mensile` -> `/showcase`
- Prodotti fallback visibili nella home:
  - `Aftershave`
  - `Black Wax`
  - `Clay Pomade`
  - `Dust Wax`
  - `Fade DLC + Shallow DLC`
  - `Fade Gold + Slim Deep Gold`

### `/shop`

- Pagina carica: si.
- Header visibile: si.
- Footer visibile: si.
- Errori console: nessuno.
- Immagini rotte: nessuna.
- Note immagini: alcune immagini lazy risultavano pending durante il controllo, non rotte.
- Catalogo fallback coerente: si, mostra i 6 prodotti vanilla principali del primo batch.
- Ordinamenti presenti:
  - `In evidenza`
  - `Nome A-Z`
  - `Nome Z-A`
  - `Prezzo crescente`
  - `Prezzo decrescente`
  - `Solo disponibili`
  - `Ultimi pezzi`
- Ordinamenti verificati:
  - `price-asc`: selezionabile, ordine coerente per prezzo crescente.
  - `price-desc`: selezionabile, ordine coerente per prezzo decrescente.
  - `available`: selezionabile, mostra prodotti disponibili.
  - `low-stock`: selezionabile, mostra `Dust Wax` come ultimo pezzo coerente con stock `2`.

### `/taglio-fresco`

- Pagina carica: si.
- Header visibile: si.
- Footer visibile: si.
- Errori console: nessuno.
- Immagini rotte: nessuna.
- CTA principali:
  - `Vedi showcase` -> `/showcase`
  - `Prenota informazioni` -> `/contact`

### `/showcase`

- Pagina carica: si.
- Header visibile: si.
- Footer visibile: si.
- Errori console: nessuno.
- Immagini rotte: nessuna.
- CTA principali:
  - `Contattaci` -> `/contact`
  - `Vedi prodotti` -> `/shop`

### `/contact`

- Pagina carica: si.
- Header visibile: si.
- Footer visibile: si.
- Errori console: nessuno.
- Immagini rotte: nessuna.
- Link principali:
  - `Torna allo shop` -> `/shop`
  - `Vai al checkout in shop` -> `/checkout`

### `/checkout`

- Pagina carica: si.
- Header visibile: si.
- Footer visibile: si.
- Errori console: nessuno.
- Immagini rotte: nessuna.
- Nota: controllo solo di caricamento, come richiesto. Checkout non modificato e non testato come flusso funzionale.

### `/privacy`

- Pagina carica: si.
- Header visibile: si.
- Footer visibile: si.
- Errori console: nessuno.
- Immagini rotte: nessuna.

### `/cookie`

- Pagina carica: si.
- Header visibile: si.
- Footer visibile: si.
- Errori console: nessuno.
- Immagini rotte: nessuna.

### `/admin`

- Pagina carica: si.
- Header visibile: si.
- Footer visibile: si.
- Errori console: nessuno.
- Immagini rotte: nessuna.
- Nota: controllo solo di caricamento/read-only. Admin non modificato e non testato come flusso operativo.

## 7. Errori console

Risultato browser:

- Nessun errore console rilevato sulle route verificate.

## 8. Immagini rotte

Risultato browser:

- Nessuna immagine rotta rilevata.

Note:

- Su `/` e `/shop` alcune immagini risultavano pending nel momento del controllo per caricamento lazy, ma non erano rotte.

## 9. Regressioni trovate

Nessuna regressione bloccante trovata.

Esiti positivi:

- Lint passa con warning.
- Test passano fuori sandbox.
- Typecheck passa.
- Build passa.
- Tutte le route richieste caricano.
- Nessun errore console.
- Nessuna immagine rotta evidente.
- CTA fresh cut/showcase puntano a route dedicate.
- Ordinamenti shop nuovi presenti e selezionabili.

## 10. Fix consigliati per il prossimo batch

1. Gestire warning `@next/next/no-img-element` in un batch dedicato, valutando `next/image` solo se accettato dal perimetro.
2. Correggere warning Autoprefixer in `app/globals.css` sostituendo `start/end` con `flex-start/flex-end` dove opportuno.
3. Aggiungere verifica automatica per i link statici `/#fresh-cut`, `/#showcase`, `sea-salt`.
4. Aggiungere test sul fallback catalogo e sugli ordinamenti shop.
5. Valutare se includere `Faper DLC + Slim Deep DLC` e `No Cap Comb Kit` con fallback immagine esistente o attendere asset dedicati.
6. Eseguire un controllo responsive mirato su mobile/tablet prima di toccare checkout o admin.
7. Pianificare cookie consent globale in un batch separato, senza mescolarlo a checkout/admin.

## 11. Conferme di perimetro

Durante questa fase non sono stati modificati:

- codice applicativo;
- checkout;
- admin;
- Supabase;
- Cloudflare;
- env variables;
- deploy config;
- route;
- componenti;
- CSS.

Sono stati generati artefatti consentiti dalla fase di verifica:

- `node_modules` tramite `npm ci`;
- artefatti build Next tramite `npm run build`.
