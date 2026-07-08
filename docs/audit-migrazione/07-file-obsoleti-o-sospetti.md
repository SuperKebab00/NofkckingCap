# File obsoleti o sospetti

Questo elenco documenta file da verificare in futuro. Nessun file e stato eliminato.

| Path | Motivo del sospetto | Evidenza | Rischio rimozione | Verifica consigliata |
|---|---|---|---|---|
| `destinazione/index.html` | Possibile residuo vanilla nella destinazione. | Il progetto Next effettivo sta in `destinazione/next-prod/`; esiste anche HTML root. | Alto | Verificare se Cloudflare serve root legacy o Next. |
| `destinazione/app.js` | Possibile copia legacy della SPA. | `next-prod` ha componenti React; root contiene ancora app vanilla. | Alto | Verificare deploy target e riferimenti in docs/script. |
| `destinazione/styles.css` | CSS legacy duplicato. | Next usa `next-prod/app/globals.css`. | Alto | Verificare se usato da `destinazione/index.html` in deploy legacy. |
| `destinazione/js/**` | Moduli legacy vanilla. | Next usa `next-prod/lib` e `components`; root contiene `js/config.js`, `render.js`, ecc. | Alto | Verificare se root legacy e ancora mantenuta come fallback. |
| `destinazione/manifest.webmanifest` | Manifest fuori da `next-prod/public`. | Next-prod non mostra manifest equivalente in public. | Medio | Decidere se copiarlo in `next-prod/public` o tenerlo solo per legacy. |
| `destinazione/_headers` | Header deploy fuori `next-prod`. | Potrebbe non applicarsi al build OpenNext. | Medio | Verificare configurazione Cloudflare finale. |
| `destinazione/functions/api/**` | API parallele a Next API route. | Esistono route API Next in `next-prod/app/api/**` e funzioni Cloudflare root. | Alto | Definire unico layer API usato in produzione. |
| `destinazione/functions/api/checkout/create.js` | Checkout backend legacy non collegato chiaramente a Next. | Next checkout salva localStorage e non chiama questa route. | Alto | Cercare fetch runtime/deploy verso `/api/checkout/create`. |
| `destinazione/functions/api/checkout/capture.js` | Possibile payment flow legacy. | Next PayPal e placeholder senza transazione. | Alto | Verificare se PayPal reale e stato dismesso o rinviato. |
| `destinazione/functions/api/stripe/webhook.js` | Stripe webhook potenzialmente non usato. | Next checkout mostra Stripe disabilitato. | Alto | Verificare provider pagamento futuro prima di rimuovere. |
| `destinazione/functions/api/checkout/stripe/verify.js` | Verifica Stripe potenzialmente non usata. | Nessun richiamo rilevato nel checkout Next. | Alto | Verificare endpoint production/logs. |
| `destinazione/NEXT_MIGRATION_MAP.md` | Documento migrazione precedente potenzialmente superato. | Nuovo audit rileva stato attuale. | Basso | Confrontare e consolidare. |
| `destinazione/ADMIN_MIGRATION_PLAN.md` | Piano admin precedente potenzialmente da aggiornare. | Admin Next e read-only, vanilla e operativo. | Basso | Allineare con decisione admin futura. |
| `destinazione/MIGRATION_COMPATIBILITY_CONTRACT.md` | Contratto compatibilita da verificare. | Stato attuale mostra divergenze importanti. | Basso | Validare contro matrice `03-matrice-migrazione.md`. |
| `destinazione/DATABASE.md` | Potrebbe descrivere schema non interamente usato da Next. | Next usa Supabase REST pubblico e API admin, checkout localStorage. | Medio | Confrontare schema con `lib/supabase-public.ts` e API server. |
| `destinazione/sql/admin_users_proposed.sql` | Script proposto, non necessariamente applicato. | Nome `proposed`. | Medio | Verificare se e stato applicato in ambiente Supabase. |
| `destinazione/next-prod/lib/static-content.ts` `productTeasers` Sea salt spray | Contenuto non coerente col sorgente. | `sea-salt-spray-*` non esiste in sorgente ne in public. | Medio | Decidere se prodotto nuovo voluto o placeholder da rimuovere/sostituire. |
| `destinazione/next-prod/public/Img/products/black-wax-packshot-opt.webp` e `clay-pomade-packshot-opt.webp` | Asset parziali. | Solo 2 immagini prodotto presenti contro molte del sorgente. | Alto | Non rimuovere; completare set asset. |
| `destinazione/next-prod/components/admin-future-actions.tsx` | Componente esplicitamente futuro. | Nome e contenuto indicano azioni future/non operative. | Basso | Verificare se utile come roadmap UI o da sostituire con funzioni reali. |
| `destinazione/next-prod/components/admin-migration-panel.tsx` | Componente di stato migrazione, non feature finale. | Usato in `/admin` come pannello migrazione. | Basso | Decidere se tenerlo in produzione o spostarlo in area interna. |
| `destinazione/next-prod/app/globals.css` `.placeholders` | Classi placeholder potenzialmente residue. | `rg` trova `.placeholders` nel CSS. | Medio | Cercare uso effettivo e decidere se parte della UI corrente. |
| `destinazione/next-prod/tests/*.test.mjs` | Test presenti ma non verificati nel sandbox. | `npm test` fallisce con `spawn EPERM`. | Basso | Rieseguire in ambiente con permessi normali prima di modificare. |
