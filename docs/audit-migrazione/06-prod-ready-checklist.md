# Production-ready checklist

## Routing

- [ ] Decidere ufficialmente se usare route dedicate o anchor hash.
- [ ] Correggere CTA `/#fresh-cut` e `/#showcase` se non esistono anchor reali.
- [ ] Verificare tutte le route con refresh diretto.
- [ ] Verificare 404/not-found se previsto.
- [ ] Allineare nav header, footer e CTA interne.

## UI/layout

- [ ] Confrontare visualmente home vanilla vs Next.
- [ ] Verificare header su desktop/mobile.
- [ ] Decidere se reintrodurre comportamento header scroll.
- [ ] Eliminare o centralizzare inline styles nel footer.
- [ ] Verificare card prodotto con asset reali e fallback.
- [ ] Verificare checkout e admin su mobile.

## Contenuti

- [ ] Riallineare testi hero e banner.
- [ ] Riallineare catalogo fallback agli 8 prodotti sorgente.
- [ ] Rimuovere o giustificare Sea salt spray.
- [ ] Completare privacy policy con dati societari reali.
- [ ] Completare cookie policy con strumenti effettivi.
- [ ] Decidere copy definitivo per checkout simulato/reale.

## Asset

- [ ] Copiare asset mancanti da `sorgente/Img` a `next-prod/public/Img`.
- [ ] Verificare ogni riferimento `/Img/...` in `static-content.ts`.
- [ ] Verificare immagini Supabase se usate.
- [ ] Aggiungere manifest e robots in `public` se richiesti.
- [ ] Verificare dimensioni e peso immagini production.

## Responsive

- [ ] Testare 360px, 390px, 768px, 1024px, desktop wide.
- [ ] Verificare product grid e checkout form.
- [ ] Verificare admin panels.
- [ ] Verificare modali/overlay futuri.
- [ ] Verificare che testi bottoni non vadano fuori container.

## Form

- [ ] Testare form contatto in mode `live`, `preview`, `disabled`.
- [ ] Verificare endpoint `POST /api/contact/create`.
- [ ] Verificare sanitizzazione, honeypot e rate limit.
- [ ] Verificare messaggi errore per campo.
- [ ] Decidere se checkout crea ordini reali o solo riepilogo locale.
- [ ] Collegare checkout a API se richiesto.

## SEO

- [ ] Definire metadata per ogni route.
- [ ] Aggiungere Open Graph coerente.
- [ ] Aggiungere canonical se necessario.
- [ ] Aggiungere robots.txt.
- [ ] Aggiungere manifest web app se richiesto.
- [ ] Verificare title/description finali.

## Accessibilita

- [ ] Verificare heading hierarchy per ogni route.
- [ ] Verificare label form e messaggi errore.
- [ ] Verificare focus visibile.
- [ ] Verificare navigazione tastiera.
- [ ] Verificare contrasto colori.
- [ ] Verificare alt immagini prodotto/showcase.
- [ ] Verificare modal future con focus trap.

## Performance

- [ ] Eseguire `npm run build` in fase autorizzata.
- [ ] Verificare immagini mancanti/404.
- [ ] Usare `next/image` o strategia immagini se utile.
- [ ] Valutare caching Cloudflare/OpenNext.
- [ ] Verificare bundle client dei componenti `use client`.

## Test

- [ ] Eseguire `npm install` se necessario.
- [ ] Eseguire `npm run lint`.
- [ ] Eseguire `npm test`.
- [ ] Eseguire `npm run typecheck`.
- [ ] Eseguire `npm run build`.
- [ ] Aggiungere test per routing CTA, form contatto, checkout e catalogo.

## Pulizia repository

- [ ] Decidere destino dei file legacy in `destinazione/`.
- [ ] Chiarire rapporto tra `functions/api` e `next-prod/app/api`.
- [ ] Rimuovere in futuro file duplicati solo dopo verifica deploy.
- [ ] Aggiornare README e documenti migrazione.
- [ ] Verificare che `node_modules`, `.next` e artefatti non siano versionati.

## Deploy

- [ ] Verificare `wrangler.jsonc`.
- [ ] Verificare OpenNext config.
- [ ] Configurare env pubbliche e private.
- [ ] Verificare segreti admin/Supabase.
- [ ] Verificare endpoint Cloudflare usati davvero.
- [ ] Eseguire smoke test post-deploy.
