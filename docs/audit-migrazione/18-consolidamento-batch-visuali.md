# 18 - Consolidamento batch visuali

Data: 2026-07-07

## 1. Branch finale usato

Branch richiesto:

- `codex/next-prod-only`

Stato reale:

- non raggiungibile in questa workspace;
- impossibile eseguire `git branch --show-current`, `git status`, `git switch` o `git commit`.

Motivo tecnico:

- `C:\Users\boulahfajadir\Desktop\Pro\.git` esiste come directory ma contiene `0` file;
- non sono presenti `HEAD`, `config` o altri metadata Git;
- `git` restituisce: `fatal: not a git repository (or any of the parent directories): .git`.

Conclusione:

- il consolidamento documentale e le verifiche sono stati completati;
- il commit non e' eseguibile finche il repository Git non viene ripristinato o rimontato correttamente.

## 2. Riepilogo batch applicati

### Batch 1

- riallineamento CTA statiche a route dedicate;
- fallback catalogo reso coerente con il vanilla;
- nuovi asset prodotto e wallpaper copiati;
- `manifest.webmanifest` e `robots.txt` copiati nel `public`.

Riferimenti:

- `docs/audit-migrazione/11-primo-batch-fix-report.md`
- `docs/audit-migrazione/12-verifica-post-batch-1.md`

### Batch 2A

- caricamento font vanilla con `next/font/google`;
- token CSS normalizzati;
- bottoni globali riallineati;
- header parity minima;
- riduzione altezza header mobile;
- fix warning Autoprefixer `start/end`.

Riferimento:

- `docs/audit-migrazione/14-batch-2a-visual-base-report.md`

### Batch 2B

- background paper-like piu vicino al vanilla;
- hero homepage piu full-bleed;
- banner homepage riallineati;
- product grid/card rese piu scure e dense via CSS;
- fresh cut, showcase e footer migliorati;
- responsive base consolidato.

Riferimento:

- `docs/audit-migrazione/15-batch-2b-visual-sections-report.md`

### Batch 2C

- H1 hero portato a due righe vanilla;
- texture `BACKGROUND SLIDE-opt.webp` copiata in `public`;
- product card aggiornate con wrapper `.product-media`;
- dual media packshot/lifestyle predisposto via CSS e markup;
- rifiniture finali CSS hero/card.

Riferimento:

- `docs/audit-migrazione/17-batch-2c-hero-card-report.md`

## 3. File modificati complessivi

File applicativi principali coinvolti dai batch:

- `destinazione/next-prod/app/layout.tsx`
- `destinazione/next-prod/app/globals.css`
- `destinazione/next-prod/components/hero-section.tsx`
- `destinazione/next-prod/components/shop-product-grid.tsx`
- `destinazione/next-prod/components/shop-catalog.tsx`
- `destinazione/next-prod/lib/static-content.ts`

File pubblici principali coinvolti:

- `destinazione/next-prod/public/Img/Design/BACKGROUND SLIDE-opt.webp`
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

Documentazione batch:

- `docs/audit-migrazione/11-primo-batch-fix-report.md`
- `docs/audit-migrazione/12-verifica-post-batch-1.md`
- `docs/audit-migrazione/14-batch-2a-visual-base-report.md`
- `docs/audit-migrazione/15-batch-2b-visual-sections-report.md`
- `docs/audit-migrazione/17-batch-2c-hero-card-report.md`
- `docs/audit-migrazione/18-consolidamento-batch-visuali.md`

Nota:

- il diff Git e `git diff --stat` non sono disponibili per il problema sul repository descritto sopra.

## 4. Asset copiati

Asset copiati dai batch:

- `sorgente/Img/Design/BACKGROUND SLIDE-opt.webp` -> `destinazione/next-prod/public/Img/Design/BACKGROUND SLIDE-opt.webp`
- `sorgente/Img/wallpaper/2-opt.webp` -> `destinazione/next-prod/public/Img/wallpaper/2-opt.webp`
- asset prodotto vanilla principali in `destinazione/next-prod/public/Img/products/`
- `sorgente/manifest.webmanifest` -> `destinazione/next-prod/public/manifest.webmanifest`
- `sorgente/robots.txt` -> `destinazione/next-prod/public/robots.txt`

## 5. Verifiche finali

Cartella:

- `destinazione/next-prod`

Comandi eseguiti il 2026-07-07:

```bash
npm run lint
npm test
npm run typecheck
npm run build
npm run typecheck
```

Esiti:

- `npm run lint`: OK, `0` errori, `9` warning `@next/next/no-img-element`
- `npm test`: OK, `9/9` test passati
- primo `npm run typecheck`: fallito per file mancanti in `.next/types/**/*.ts`
- `npm run build`: OK, build completata e tipizzazioni `.next` rigenerate
- secondo `npm run typecheck`: OK

Interpretazione:

- il fallimento iniziale di `typecheck` era dovuto all'ordine di esecuzione e alla dipendenza da `.next/types`;
- dopo `build`, il progetto torna type-safe.

## 6. Miglioramenti ottenuti

- navigazione pubblica allineata alle route Next principali;
- fallback catalogo piu fedele al vanilla;
- font, token, bottoni e header visivamente piu coerenti;
- hero homepage molto piu vicina alla resa vanilla;
- product card rese piu scure, piu editoriali e con dual media predisposto;
- texture background vanilla riportata nel progetto Next;
- responsive mobile stabilizzato senza regressioni evidenti;
- build e test passano nello stato attuale del workspace.

## 7. Problemi rimasti

1. impossibile eseguire branch/switch/commit per repository Git non valido nella workspace corrente;
2. warning `<img>` ancora presenti: `9` totali;
3. `typecheck` dipende dai file generati in `.next/types`, quindi puo fallire se eseguito prima della build;
4. hover dual-media delle product card predisposto, ma non confermato dal browser in-app automatico;
5. product card non replicano ancora badge/toggle/add-to-cart vanilla;
6. `app/globals.css` resta stratificato con override successivi.

## 8. Rischi residui

- senza repository Git valido non e' possibile garantire branch lineage, commit history o diff affidabile;
- il warning `<img>` resta aperto fino a un batch dedicato `next/image`;
- il coupling di `typecheck` con `.next/types` puo generare falsi negativi nei check manuali se l'ordine dei comandi non e' gestito;
- il comportamento hover reale delle product card va ancora confermato con un browser che esponga `:hover` nativo o con verifica manuale.

## 9. Cosa non e' stato toccato

- checkout;
- carrello e logiche sensibili di acquisto;
- admin;
- Supabase;
- Cloudflare;
- API;
- deploy;
- env variables;
- route;
- dati catalogo live.

## 10. Prossimo batch consigliato

1. ripristinare o rimontare il repository Git corretto;
2. eseguire `git switch codex/next-prod-only`;
3. ripetere `git status` e `git diff --stat`;
4. creare il commit:
   - `Align Next prod migration visual parity`
5. in un batch successivo separato:
   - verificare hover card manualmente;
   - valutare badge/stock visuale;
   - pianificare `next/image`;
   - ridurre la stratificazione di `app/globals.css`.

## 11. Messaggio commit previsto

Messaggio previsto:

```text
Align Next prod migration visual parity
```
