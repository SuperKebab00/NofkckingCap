# Audit migrazione No Cap Barber Shop

## Scopo

Questo audit documenta lo stato della migrazione dal progetto vanilla `sorgente/` al progetto Next.js in `destinazione/next-prod/`.

La fase e solo tecnica/documentale: nessun codice applicativo e stato modificato, corretto o rifattorizzato.

## Struttura analizzata

- `sorgente/`: sito vanilla HTML/CSS/JS in single page application con navigazione hash.
- `destinazione/`: cartella di migrazione che contiene file legacy, funzioni Cloudflare/API e il progetto Next.js effettivo.
- `destinazione/next-prod/`: applicazione Next.js App Router con route dedicate, componenti React, API route, test e configurazione Cloudflare/OpenNext.

## File generati

- `00-README.md`: indice e sintesi dell'audit.
- `01-sorgente-vanilla-map.md`: mappa tecnica del progetto vanilla.
- `02-destinazione-next-map.md`: mappa tecnica del progetto Next.js.
- `03-matrice-migrazione.md`: matrice sorgente -> destinazione.
- `04-gap-report.md`: gap, problemi, differenze e sospetti.
- `05-proposte-modifiche-future.md`: interventi consigliati per una fase successiva.
- `06-prod-ready-checklist.md`: checklist operativa production-ready.
- `07-file-obsoleti-o-sospetti.md`: file duplicati, placeholder o potenzialmente obsoleti.

## Risultato sintetico

La migrazione Next.js e avviata e copre le route principali pubbliche: home, shop, taglio fresco, showcase, contatti, checkout, privacy, cookie e admin. La struttura Next usa App Router, componenti React e alcune API route.

La migrazione non e una replica completa della SPA vanilla. Molte logiche del sorgente sono state ridotte, rese read-only o trasformate in placeholder: carrello drawer, checkout con ordine persistente/integrato, gestione admin completa, editor prodotti/tagli/sezioni, consenso cookie interattivo, aggiornamento dinamico dello showcase mensile e parte degli asset prodotto non risultano completamente migrati.

## Problemi principali

- Catalogo Next fallback incompleto: include solo 3 teaser statici contro 8 prodotti vanilla.
- Asset pubblici Next incompleti: mancano molte immagini prodotto e `wallpaper/2-opt.webp`.
- Checkout Next e simulato/localStorage e non equivalente al flusso vanilla/Supabase.
- Admin Next e esplicitamente read-only, mentre il vanilla contiene gestione prodotti, tagli, ordini e lead.
- Home Next contiene componenti editoriali aggiuntivi e link/stati non perfettamente equivalenti alla navigazione hash originale.
- Cookie banner/modal del sorgente non risultano migrati come interazione globale Next.
- Test e lint non sono verificati: `npm test` fallisce per `spawn EPERM` nel sandbox; `npm run lint` non trova `eslint` locale.

## Prossimi step consigliati

1. Decidere se la migrazione deve essere fedele al vanilla o una riprogettazione con route dedicate.
2. Migrare asset mancanti in `destinazione/next-prod/public/Img`.
3. Riallineare catalogo, checkout, carrello e admin rispetto alle funzionalita vanilla.
4. Correggere link hash rimasti o ricreare le sezioni con anchor reali.
5. Installare/verificare dipendenze e rieseguire lint, test e build in una fase autorizzata.
6. Completare documenti legali, SEO, manifest e cookie consent prima del deploy.
