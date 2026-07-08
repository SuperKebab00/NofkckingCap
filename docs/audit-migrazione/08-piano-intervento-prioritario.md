# Piano intervento prioritario

Questo piano trasforma l'audit in un ordine operativo per completare la migrazione vanilla HTML/CSS/JS -> Next.js production-ready. Non applica modifiche: definisce priorita, rischi e criteri di accettazione.

## 1. Critici per equivalenza con il vanilla

### 1.1 Definire target di fedelta vanilla

- Problema rilevato: la destinazione Next non e una replica completa della SPA vanilla; alcune parti sono riprogettate, statiche o read-only.
- File coinvolti: `docs/audit-migrazione/03-matrice-migrazione.md`, `destinazione/next-prod/app/page.tsx`, `destinazione/next-prod/lib/static-content.ts`, `destinazione/next-prod/components/*`.
- Dipendenza da altri interventi: nessuna.
- Rischio: medio, perche orienta tutte le decisioni successive.
- Priorita: P0.
- Stima complessita: media.
- Criterio di accettazione: esiste una decisione esplicita per ogni macro-area: replicare vanilla, mantenere redesign Next, oppure migrare in modo ibrido documentato.

### 1.2 Riallineare contenuti statici principali

- Problema rilevato: hero, banner, fresh cut, showcase e catalogo fallback contengono differenze testuali e contenuti non presenti nel sorgente.
- File coinvolti: `destinazione/next-prod/lib/static-content.ts`, `destinazione/next-prod/app/taglio-fresco/page.tsx`, `destinazione/next-prod/app/showcase/page.tsx`.
- Dipendenza da altri interventi: 1.1.
- Rischio: basso.
- Priorita: P1.
- Stima complessita: media.
- Criterio di accettazione: i contenuti statici Next non introducono prodotti o sezioni non presenti nel vanilla, salvo differenze dichiarate.

### 1.3 Ripristinare equivalenza delle sezioni pubbliche

- Problema rilevato: `#fresh-cut` e `#showcase` erano dinamiche nel vanilla, mentre in Next sono statiche.
- File coinvolti: `destinazione/next-prod/app/taglio-fresco/page.tsx`, `destinazione/next-prod/app/showcase/page.tsx`, `destinazione/next-prod/components/home-editorial-sections.tsx`.
- Dipendenza da altri interventi: 1.1, 4.1, 6.2 se si decide gestione admin dinamica.
- Rischio: medio.
- Priorita: P2.
- Stima complessita: alta se collegato a dati/admin, media se solo fallback statico fedele.
- Criterio di accettazione: fresh cut e showcase hanno contenuti coerenti con il vanilla e una strategia chiara per dati statici o dinamici.

## 2. Critici per navigazione e route

### 2.1 Correggere CTA hash incoerenti

- Problema rilevato: alcuni link in Next puntano a `/#fresh-cut` e `/#showcase`, ma le destinazioni equivalenti sono route dedicate.
- File coinvolti: `destinazione/next-prod/lib/static-content.ts`, eventuali componenti che consumano `heroContent` e `homeSectionBanners`.
- Dipendenza da altri interventi: decisione route dedicate vs anchor hash.
- Rischio: basso.
- Priorita: P0.
- Stima complessita: bassa.
- Criterio di accettazione: ogni CTA porta a una route o anchor realmente esistente e verificabile.

### 2.2 Verificare navigazione principale

- Problema rilevato: vanilla usa hash SPA; Next usa route. La conversione e valida, ma va resa coerente in header, footer e CTA.
- File coinvolti: `destinazione/next-prod/components/site-header.tsx`, `destinazione/next-prod/components/site-footer.tsx`, `destinazione/next-prod/lib/static-content.ts`.
- Dipendenza da altri interventi: 2.1.
- Rischio: basso.
- Priorita: P1.
- Stima complessita: bassa.
- Criterio di accettazione: header, footer e CTA condividono la stessa mappa route.

### 2.3 Validare route con refresh diretto

- Problema rilevato: le route esistono, ma non e stata eseguita build/verifica browser.
- File coinvolti: `destinazione/next-prod/app/**/page.tsx`, `destinazione/next-prod/next.config.ts`, `destinazione/next-prod/wrangler.jsonc`.
- Dipendenza da altri interventi: toolchain installata e ambiente locale.
- Rischio: medio.
- Priorita: P2.
- Stima complessita: media.
- Criterio di accettazione: `/`, `/shop`, `/taglio-fresco`, `/showcase`, `/contact`, `/checkout`, `/privacy`, `/cookie`, `/admin` rispondono con refresh diretto in locale.

## 3. Critici per UI/layout

### 3.1 Completare asset visivi mancanti

- Problema rilevato: molte immagini referenziate o presenti nel vanilla mancano in `next-prod/public/Img`.
- File coinvolti: `sorgente/Img/**`, `destinazione/next-prod/public/Img/**`, `destinazione/next-prod/lib/static-content.ts`.
- Dipendenza da altri interventi: nessuna per copia asset; 4.1 per catalogo.
- Rischio: basso se si copia senza rinominare.
- Priorita: P0.
- Stima complessita: bassa.
- Criterio di accettazione: nessun riferimento statico `/Img/...` punta a file assenti in `public`.

### 3.2 Riallineare card prodotto

- Problema rilevato: le card Next non replicano badge, stock, prezzo, toggle packshot/lifestyle e semantica "Aggiungi" del vanilla.
- File coinvolti: `destinazione/next-prod/components/shop-product-grid.tsx`, `destinazione/next-prod/components/shop-catalog.tsx`, `destinazione/next-prod/app/globals.css`.
- Dipendenza da altri interventi: 3.1, 4.1.
- Rischio: medio.
- Priorita: P1.
- Stima complessita: media.
- Criterio di accettazione: una card Next mostra dati e stati principali presenti nel vanilla, oppure documenta esplicitamente le differenze volute.

### 3.3 Centralizzare header/footer e stili inline

- Problema rilevato: header importato manualmente in ogni page; footer usa inline styles.
- File coinvolti: `destinazione/next-prod/app/layout.tsx`, `destinazione/next-prod/components/site-header.tsx`, `destinazione/next-prod/components/site-footer.tsx`, `destinazione/next-prod/app/globals.css`.
- Dipendenza da altri interventi: 2.2.
- Rischio: medio, perche puo cambiare spacing globale.
- Priorita: P2.
- Stima complessita: media.
- Criterio di accettazione: layout condiviso coerente, senza regressioni visibili sulle route principali.

## 4. Critici per dati/catalogo

### 4.1 Riallineare catalogo fallback agli 8 prodotti vanilla

- Problema rilevato: `productTeasers` contiene 3 prodotti e include Sea salt spray, non presente nel sorgente.
- File coinvolti: `sorgente/js/data.js`, `destinazione/next-prod/lib/static-content.ts`, `destinazione/next-prod/components/shop-product-grid.tsx`.
- Dipendenza da altri interventi: 3.1.
- Rischio: medio.
- Priorita: P0.
- Stima complessita: media.
- Criterio di accettazione: in assenza di Supabase, Next mostra un catalogo coerente con gli 8 prodotti vanilla o una lista ridotta dichiarata.

### 4.2 Allineare filtri e ordinamenti shop

- Problema rilevato: Next non include ordinamento per prezzo, disponibili e ultimi pezzi.
- File coinvolti: `destinazione/next-prod/components/shop-catalog.tsx`.
- Dipendenza da altri interventi: 4.1.
- Rischio: basso/medio.
- Priorita: P1.
- Stima complessita: media.
- Criterio di accettazione: il catalogo Next supporta almeno i criteri vanilla: consigliati, prezzo crescente, prezzo decrescente, solo disponibili, ultimi pezzi.

### 4.3 Definire mapping Supabase pubblico

- Problema rilevato: Next legge prodotti/categorie/sezioni da Supabase REST, ma fallback e schema devono restare compatibili.
- File coinvolti: `destinazione/next-prod/lib/supabase-public.ts`, `destinazione/DATABASE.md`, `destinazione/sql/admin_users_proposed.sql`.
- Dipendenza da altri interventi: 4.1.
- Rischio: medio/alto per ambiente reale.
- Priorita: P2.
- Stima complessita: media.
- Criterio di accettazione: campi prodotto, categorie e sezioni hanno mapping documentato e testato con fallback locale.

## 5. Critici per checkout

### 5.1 Decidere modello checkout definitivo

- Problema rilevato: vanilla crea ordini tramite repository/Supabase opzionale; Next usa checkout simulato localStorage.
- File coinvolti: `destinazione/next-prod/app/checkout/page.tsx`, `destinazione/next-prod/components/checkout-in-shop.tsx`, `destinazione/functions/api/checkout/**`, `destinazione/next-prod/app/api/**`.
- Dipendenza da altri interventi: 1.1, 4.1.
- Rischio: alto.
- Priorita: P0.
- Stima complessita: alta.
- Criterio di accettazione: e definito se il checkout deve essere solo riepilogo in-shop, ordine reale, PayPal, Stripe o lead.

### 5.2 Riallineare carrello e storage

- Problema rilevato: vanilla usa drawer e `no-cap-cart-v2`; Next usa `no-cap-next-cart-v1` nel checkout.
- File coinvolti: `destinazione/next-prod/components/cart-count.tsx`, `destinazione/next-prod/components/checkout-in-shop.tsx`, eventuale nuovo componente drawer.
- Dipendenza da altri interventi: 5.1.
- Rischio: medio/alto.
- Priorita: P1.
- Stima complessita: alta se si reintroduce drawer, media se si mantiene checkout route.
- Criterio di accettazione: aggiunta, conteggio, modifica quantita e svuotamento carrello sono coerenti tra header, shop e checkout.

### 5.3 Ripristinare riepilogo ordine e azioni utility

- Problema rilevato: Next non replica copia riepilogo e download JSON ordine.
- File coinvolti: `destinazione/next-prod/components/checkout-in-shop.tsx`.
- Dipendenza da altri interventi: 5.1, 5.2.
- Rischio: basso.
- Priorita: P3.
- Stima complessita: bassa/media.
- Criterio di accettazione: dopo ordine locale o reale, l'utente vede numero ordine, riepilogo, copia e download se richiesti.

## 6. Critici per admin

### 6.1 Definire perimetro admin production

- Problema rilevato: vanilla contiene admin completo; Next e read-only/status.
- File coinvolti: `destinazione/next-prod/app/admin/page.tsx`, `destinazione/next-prod/components/admin-*`, `destinazione/functions/api/admin/**`, `destinazione/next-prod/app/api/admin/**`.
- Dipendenza da altri interventi: 1.1, 11 API layer in `05-proposte-modifiche-future.md`.
- Rischio: alto.
- Priorita: P0.
- Stima complessita: alta.
- Criterio di accettazione: e stabilito se admin Next deve gestire prodotti, categorie, tagli, ordini e lead o solo leggere stato.

### 6.2 Migrare gestione prodotti/categorie/fresh cut

- Problema rilevato: CRUD prodotti, editor categorie e fresh cut manager non sono migrati.
- File coinvolti: `destinazione/next-prod/app/admin/page.tsx`, nuovi o esistenti `components/admin-*`, API admin, Supabase.
- Dipendenza da altri interventi: 6.1, 4.3.
- Rischio: alto.
- Priorita: P1.
- Stima complessita: alta.
- Criterio di accettazione: admin Next permette le stesse operazioni principali del vanilla con autorizzazione server-side.

### 6.3 Migrare ordini e lead admin

- Problema rilevato: Next non ha tabelle operative ordini/lead con azioni.
- File coinvolti: `destinazione/next-prod/app/admin/page.tsx`, `destinazione/next-prod/components/admin-*`, API admin.
- Dipendenza da altri interventi: 5.1, 6.1.
- Rischio: alto.
- Priorita: P2.
- Stima complessita: alta.
- Criterio di accettazione: admin puo leggere lead/ordini e compiere le azioni vanilla equivalenti.

## 7. Critici per cookie/privacy

### 7.1 Implementare cookie consent globale

- Problema rilevato: banner e modal preferenze cookie del vanilla non risultano migrati.
- File coinvolti: `destinazione/next-prod/app/layout.tsx`, nuovo componente cookie consent, `destinazione/next-prod/app/cookie/page.tsx`, `destinazione/next-prod/app/globals.css`.
- Dipendenza da altri interventi: nessuna, salvo review legale.
- Rischio: medio.
- Priorita: P0 per production pubblica.
- Stima complessita: media.
- Criterio di accettazione: consenso necessario/analytics/marketing viene salvato, riaperto e rispettato come nel vanilla.

### 7.2 Completare contenuti legal

- Problema rilevato: privacy e cookie policy sono placeholder da completare.
- File coinvolti: `destinazione/next-prod/app/privacy/page.tsx`, `destinazione/next-prod/app/cookie/page.tsx`.
- Dipendenza da altri interventi: review legale esterna.
- Rischio: medio.
- Priorita: P1.
- Stima complessita: bassa per inserimento testo, alta per validazione legale.
- Criterio di accettazione: policy contengono dati societari, finalita, basi giuridiche, retention, cookie effettivi e contatti.

### 7.3 Ripristinare manifest e robots

- Problema rilevato: manifest e robots presenti nel sorgente non risultano in `next-prod/public`.
- File coinvolti: `sorgente/manifest.webmanifest`, `sorgente/robots.txt`, `destinazione/next-prod/public/`.
- Dipendenza da altri interventi: decisione SEO/PWA.
- Rischio: basso.
- Priorita: P2.
- Stima complessita: bassa.
- Criterio di accettazione: `/manifest.webmanifest` e `/robots.txt` rispondono nel progetto Next se richiesti.

## 8. Pulizia tecnica

### 8.1 Chiarire cartella `destinazione/` legacy

- Problema rilevato: esistono `destinazione/index.html`, `app.js`, `styles.css`, `js/**` oltre a `next-prod/`.
- File coinvolti: `destinazione/index.html`, `destinazione/app.js`, `destinazione/styles.css`, `destinazione/js/**`, documentazione deploy.
- Dipendenza da altri interventi: verifica deploy target.
- Rischio: alto se rimossi senza sapere cosa serve in produzione.
- Priorita: P1.
- Stima complessita: media.
- Criterio di accettazione: e documentato se la root legacy e fallback, archivio o codice ancora servito.

### 8.2 Chiarire API layer definitivo

- Problema rilevato: coesistono API Next e funzioni Cloudflare root.
- File coinvolti: `destinazione/functions/api/**`, `destinazione/next-prod/app/api/**`, `destinazione/next-prod/wrangler.jsonc`, `destinazione/next-prod/open-next.config.ts`.
- Dipendenza da altri interventi: 5.1, 6.1.
- Rischio: alto.
- Priorita: P0.
- Stima complessita: alta.
- Criterio di accettazione: ogni endpoint production ha un solo owner documentato.

### 8.3 Consolidare documenti di migrazione preesistenti

- Problema rilevato: documenti in `destinazione/` possono essere superati o discordanti.
- File coinvolti: `destinazione/NEXT_MIGRATION_MAP.md`, `destinazione/ADMIN_MIGRATION_PLAN.md`, `destinazione/MIGRATION_COMPATIBILITY_CONTRACT.md`, `docs/audit-migrazione/**`.
- Dipendenza da altri interventi: completamento piano.
- Rischio: basso.
- Priorita: P3.
- Stima complessita: bassa.
- Criterio di accettazione: una sola fonte di verita aggiornata guida la migrazione.

## 9. Test/build/lint

### 9.1 Ripristinare ambiente dipendenze

- Problema rilevato: `npm run lint` non trova `eslint`; i test falliscono con `spawn EPERM` nel sandbox.
- File coinvolti: `destinazione/next-prod/package.json`, `destinazione/next-prod/package-lock.json`, ambiente locale.
- Dipendenza da altri interventi: permesso di installare/verificare dipendenze.
- Rischio: basso.
- Priorita: P0.
- Stima complessita: bassa/media.
- Criterio di accettazione: `npm run lint`, `npm test`, `npm run typecheck` partono in ambiente locale normale.

### 9.2 Eseguire build Next

- Problema rilevato: build non eseguita in audit per non generare artefatti.
- File coinvolti: intero `destinazione/next-prod`.
- Dipendenza da altri interventi: 9.1.
- Rischio: medio.
- Priorita: P1.
- Stima complessita: bassa se dipendenze ok, media se emergono errori.
- Criterio di accettazione: `npm run build` completa senza errori.

### 9.3 Aggiungere test di regressione migrazione

- Problema rilevato: non risultano test specifici su equivalenza route, asset e catalogo fallback.
- File coinvolti: `destinazione/next-prod/tests/**`.
- Dipendenza da altri interventi: 2.1, 3.1, 4.1.
- Rischio: basso/medio.
- Priorita: P2.
- Stima complessita: media.
- Criterio di accettazione: test automatici coprono almeno route map, riferimenti asset statici, catalogo fallback e contact form.

## 10. Migliorie non bloccanti

### 10.1 Migliorare accessibilita interazioni

- Problema rilevato: drawer, modal cookie e PayPal placeholder richiedono focus management se implementati.
- File coinvolti: componenti UI futuri, `components/checkout-in-shop.tsx`, cookie consent.
- Dipendenza da altri interventi: 5.2, 7.1.
- Rischio: medio.
- Priorita: P3.
- Stima complessita: media.
- Criterio di accettazione: modali/drawer hanno focus trap, Escape, aria coerenti.

### 10.2 Valutare `next/image`

- Problema rilevato: le immagini sono renderizzate con `<img>`.
- File coinvolti: componenti hero, shop, showcase, fresh cut.
- Dipendenza da altri interventi: 3.1.
- Rischio: medio per layout.
- Priorita: P4.
- Stima complessita: media.
- Criterio di accettazione: miglioramento performance senza regressioni layout.

### 10.3 Migliorare messaggi UX

- Problema rilevato: Next usa messaggi inline e placeholder; vanilla usa toast globale.
- File coinvolti: `components/contact-form.tsx`, `components/checkout-in-shop.tsx`, eventuale toast provider.
- Dipendenza da altri interventi: decisione UX.
- Rischio: basso/medio.
- Priorita: P4.
- Stima complessita: media.
- Criterio di accettazione: feedback utente coerenti su form, checkout e admin.
