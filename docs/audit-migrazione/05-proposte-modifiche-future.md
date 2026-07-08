# Proposte modifiche future

Le proposte seguenti sono solo raccomandazioni per una fase successiva. Nessuna modifica e stata applicata.

## 1. Riallineare routing e CTA

- Problema: alcune CTA Next usano ancora `/#fresh-cut` e `/#showcase`, mentre le pagine equivalenti sono `/taglio-fresco` e `/showcase`.
- File coinvolti: `destinazione/next-prod/lib/static-content.ts`, componenti home che consumano tali dati.
- Motivo: evitare link a anchor inesistenti o comportamento ambiguo.
- Impatto: navigazione piu coerente.
- Rischio: basso, se si decide ufficialmente route dedicate.
- Priorita: alta.
- Ordine consigliato: 1.

## 2. Copiare o riallineare asset mancanti

- Problema: molte immagini referenziate in Next non esistono in `public/Img`.
- File coinvolti: `destinazione/next-prod/public/Img`, `destinazione/next-prod/lib/static-content.ts`.
- Motivo: prevenire immagini rotte e recuperare fedelta visuale.
- Impatto: alto su shop/home/showcase.
- Rischio: basso per copia asset, medio se si cambiano riferimenti contenuto.
- Priorita: alta.
- Ordine consigliato: 2.

## 3. Riallineare catalogo statico fallback

- Problema: sorgente ha 8 prodotti; Next fallback ha 3 teaser e include Sea salt spray non presente.
- File coinvolti: `sorgente/js/data.js`, `destinazione/next-prod/lib/static-content.ts`, `components/shop-product-grid.tsx`.
- Motivo: fallback coerente quando Supabase non risponde.
- Impatto: alto per shop/checkout.
- Rischio: medio, per mapping prezzi/stock/immagini.
- Priorita: alta.
- Ordine consigliato: 3.

## 4. Ripristinare feature shop mancanti

- Problema: mancano sort prezzo/disponibilita, toggle immagine e add-to-cart drawer.
- File coinvolti: `components/shop-catalog.tsx`, `components/shop-product-grid.tsx`, eventuale nuovo carrello globale.
- Motivo: parita funzionale con vanilla.
- Impatto: alto.
- Rischio: medio/alto per stato client e UX.
- Priorita: alta.
- Ordine consigliato: 4.

## 5. Decidere modello carrello/checkout definitivo

- Problema: checkout Next e simulato e localStorage-only; sorgente puo scrivere ordini/Supabase.
- File coinvolti: `components/checkout-in-shop.tsx`, `app/checkout/page.tsx`, API checkout legacy/Next, `lib/server`.
- Motivo: definire se l'ordine deve essere reale, in-shop, PayPal, Stripe o solo lead.
- Impatto: molto alto.
- Rischio: alto, per pagamenti, dati personali e ordini.
- Priorita: alta.
- Ordine consigliato: 5.

## 6. Migrare admin operativo o rimuovere aspettativa gestionale

- Problema: vanilla ha admin completo; Next e read-only.
- File coinvolti: `app/admin/page.tsx`, `components/admin-*`, API admin, Supabase.
- Motivo: evitare falsa equivalenza e completare gestione prodotti/ordini/lead.
- Impatto: molto alto.
- Rischio: alto, per auth, permessi e scritture dati.
- Priorita: alta.
- Ordine consigliato: 6.

## 7. Migrare fresh cut/showcase dinamici

- Problema: Next usa contenuti statici, vanilla usa tagli pubblicati da admin e filtro mese.
- File coinvolti: `app/taglio-fresco/page.tsx`, `app/showcase/page.tsx`, `components/home-editorial-sections.tsx`, Supabase schema.
- Motivo: recuperare comportamento editoriale dinamico.
- Impatto: medio/alto.
- Rischio: medio, dipende da storage immagini e schema dati.
- Priorita: media.
- Ordine consigliato: 7.

## 8. Implementare cookie consent globale

- Problema: cookie banner/modal vanilla non risultano migrati.
- File coinvolti: `app/layout.tsx`, nuovo componente client cookie consent, `app/cookie/page.tsx`.
- Motivo: compliance e parita UX.
- Impatto: medio/alto.
- Rischio: medio, per privacy/legal e caricamento script futuri.
- Priorita: alta prima del deploy pubblico.
- Ordine consigliato: 8.

## 9. Portare header/footer a layout condiviso coerente

- Problema: header importato manualmente in ogni page; footer con inline styles.
- File coinvolti: `app/layout.tsx`, `components/site-header.tsx`, `components/site-footer.tsx`, `app/globals.css`.
- Motivo: ridurre rischio route senza header e centralizzare stile.
- Impatto: medio.
- Rischio: medio, per layout e spacing globale.
- Priorita: media.
- Ordine consigliato: 9.

## 10. Ripristinare manifest, robots e metadata completi

- Problema: `manifest.webmanifest` e `robots.txt` non risultano in `next-prod/public`.
- File coinvolti: `destinazione/next-prod/public/`, `app/layout.tsx`.
- Motivo: SEO/PWA/deploy parity.
- Impatto: medio.
- Rischio: basso.
- Priorita: media.
- Ordine consigliato: 10.

## 11. Chiarire API layer definitivo

- Problema: coesistono API Next in `next-prod/app/api` e funzioni Cloudflare in `destinazione/functions/api`.
- File coinvolti: `destinazione/functions/api/**`, `destinazione/next-prod/app/api/**`, `wrangler.jsonc`, deployment docs.
- Motivo: evitare doppio backend, endpoint non usati o divergenze sicurezza.
- Impatto: alto.
- Rischio: alto se ci sono endpoint production attivi.
- Priorita: alta.
- Ordine consigliato: 11.

## 12. Verificare toolchain

- Problema: lint non parte senza `eslint`; test falliscono per `spawn EPERM`; build non eseguita in questa fase.
- File coinvolti: `package.json`, `package-lock.json`, `tests/**`, ambiente locale/CI.
- Motivo: serve una baseline verificabile prima di modifiche funzionali.
- Impatto: alto.
- Rischio: basso/medio.
- Priorita: alta.
- Ordine consigliato: 12.
