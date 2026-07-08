# 19 - Route composition and style report

## 1. Diff concettuale vanilla vs Next

Nel vanilla `sorgente/index.html` il sito e una single page con navigazione ad hash:

- `#home`: hero, banner e accesso alle sezioni;
- `#shop`: catalogo completo con ricerca, ordinamento e griglia prodotti;
- `#fresh-cut`: sezione completa del taglio del giorno;
- `#showcase`: gallery mensile completa;
- `#support`: contatti e form;
- `#checkout`, `#admin`, `#privacy`, `#cookie`: viste interne nello stesso documento.

In Next.js la struttura corretta deve essere route-based:

- `/`: landing compatta;
- `/shop`: catalogo completo;
- `/taglio-fresco`: fresh cut completo;
- `/showcase`: showcase completo;
- `/checkout`: checkout pubblico stilizzato;
- `/admin`: overview admin/read-only stilizzata;
- `/contact`, `/privacy`, `/cookie`: pagine dedicate.

Il problema principale era che la home Next tendeva a somigliare ancora alla single page vanilla, con troppe sezioni complete visibili in sequenza.

## 2. Cosa e stato rimosso/ridotto dalla home

- Rimossa dalla home la resa completa di `LiveShopSections`.
- Ridotta la presenza shop a una preview di 3 prodotti.
- Ridotte Fresh Cut e Showcase a teaser grafici con CTA verso route dedicate.
- Evitata la duplicazione completa di shop, fresh cut e showcase nella landing.
- Checkout, admin, privacy e cookie non vengono mostrati nella home.

## 3. Cosa resta come teaser nella home

La home ora contiene:

- hero principale No Cap;
- banner rapidi verso shop, styling, tools, fresh cut, showcase;
- mini anteprima shop;
- mini anteprima Fresh Cut;
- mini anteprima Showcase;
- brand/story;
- highlights pubblici brevi.

Questi elementi sono pensati come ingressi alle route, non come sezioni complete.

## 4. Route responsabili delle sezioni complete

| Sezione | Route responsabile | Stato |
| --- | --- | --- |
| Hero e navigazione landing | `/` | Teaser/landing |
| Catalogo prodotti | `/shop` | Sezione completa |
| Fresh Cut | `/taglio-fresco` | Sezione completa |
| Showcase | `/showcase` | Sezione completa |
| Checkout pubblico | `/checkout` | Pagina dedicata, styling only |
| Admin overview | `/admin` | Pagina dedicata, read-only/styling |
| Contatti | `/contact` | Pagina dedicata |
| Privacy | `/privacy` | Pagina dedicata |
| Cookie | `/cookie` | Pagina dedicata |

## 5. Modifiche styling homepage

- `app/page.tsx`: home composta come landing, senza sezioni complete duplicate.
- `components/shop-teaser.tsx`: trasformato in preview shop breve con CTA.
- `components/home-editorial-sections.tsx`: Fresh Cut e Showcase resi teaser, con link alle route dedicate.
- `components/home-public-highlights.tsx`: highlights resi piu compatti e coerenti.
- `app/globals.css`: aggiunte classi `page-shell--landing`, `route-preview`, `route-teaser-grid`, `route-pillars`.

## 6. Modifiche styling shop

- `app/shop/page.tsx`: pagina focalizzata su catalogo, categorie e cross-link leggeri.
- Rimossa la duplicazione di sezioni editoriali complete sotto lo shop.
- Mantenuti catalogo, categorie, fallback statico e dati esistenti.
- Nessuna modifica a Supabase, dati prodotto o logica catalogo.

## 7. Modifiche styling fresh cut

- `app/taglio-fresco/page.tsx`: pagina resa autonoma con `route-shell--fresh`.
- Aggiunti cross-link verso Showcase e Contatti.
- La pagina contiene il visual Fresh Cut completo, non una semplice preview.

## 8. Modifiche styling showcase

- `app/showcase/page.tsx`: pagina resa autonoma con `route-shell--showcase`.
- Aggiunti cross-link verso Shop e Fresh Cut.
- Showcase resta focalizzato su immagini/card, senza catalogo completo duplicato.

## 9. Modifiche styling checkout

- `app/checkout/page.tsx`: shell e hero coerenti con le altre route.
- CTA principale della hero resa `primary-button`.
- `components/checkout-in-shop.tsx`: non modificata nella logica.
- Nessuna modifica a localStorage, carrello, pagamenti, validazioni o flusso ordine.

## 10. Modifiche styling admin

- `app/admin/page.tsx`: pagina resa `route-shell--admin`, con hero e `admin-hub`.
- I pannelli admin restano read-only/status.
- Nessun CRUD, login nuovo, scrittura Supabase o API admin nuova.

## 11. Modifiche responsive

- Aggiunte regole responsive per `1180px`, `780px`, `430px`.
- Le preview home si impilano su mobile.
- Cross-link e CTA passano a layout verticale quando serve.
- Header e contenuti principali non mostrano overflow orizzontale nel controllo DevTools a `1440px`.

## 12. File modificati

- `destinazione/next-prod/app/page.tsx`
- `destinazione/next-prod/app/shop/page.tsx`
- `destinazione/next-prod/app/taglio-fresco/page.tsx`
- `destinazione/next-prod/app/showcase/page.tsx`
- `destinazione/next-prod/app/checkout/page.tsx`
- `destinazione/next-prod/app/admin/page.tsx`
- `destinazione/next-prod/app/contact/page.tsx`
- `destinazione/next-prod/app/privacy/page.tsx`
- `destinazione/next-prod/app/cookie/page.tsx`
- `destinazione/next-prod/components/home-editorial-sections.tsx`
- `destinazione/next-prod/components/home-public-highlights.tsx`
- `destinazione/next-prod/components/live-shop-sections.tsx`
- `destinazione/next-prod/components/shop-teaser.tsx`
- `destinazione/next-prod/app/globals.css`
- `docs/audit-migrazione/19-route-composition-and-style-report.md`

## 13. Verifiche eseguite

Da `destinazione/next-prod`:

```bash
npm run lint
npm test
npm run typecheck
npm run build
```

Esiti:

- `npm run lint`: PASS con 9 warning `@next/next/no-img-element`.
- `npm test`: PASS, 9 test superati.
- `npm run typecheck`: PASS.
- `npm run build`: PASS.

Dev server:

- avvio normale iniziale fallito con `spawn EPERM`;
- avvio con permessi elevati riuscito su `http://127.0.0.1:3000`;
- una vecchia istanza stale ha prodotto un runtime error `Cannot find module './873.js'`, risolto riavviando il server e liberando la porta.

Route controllate via HTTP locale:

| Route | Status | Header | Footer | Main | Immagini rotte |
| --- | --- | --- | --- | --- | --- |
| `/` | 200 | Si | Si | Si | 0 |
| `/shop` | 200 | Si | Si | Si | 0 |
| `/taglio-fresco` | 200 | Si | Si | Si | 0 |
| `/showcase` | 200 | Si | Si | Si | 0 |
| `/checkout` | 200 | Si | Si | Si | 0 |
| `/admin` | 200 | Si | Si | Si | 0 |
| `/contact` | 200 | Si | Si | Si | 0 |
| `/privacy` | 200 | Si | Si | Si | 0 |
| `/cookie` | 200 | Si | Si | Si | 0 |

Controllo Chrome DevTools headless a `1440px`:

- nessun errore console JS sulle route controllate;
- `header`, `main`, `footer` presenti;
- `overflowX: false`;
- immagini DOM non rotte;
- screenshot homepage pulito generato dopo riavvio server.

## 14. Problemi rimasti

1. Restano 9 warning su `<img>`, non corretti per rispettare il vincolo di non introdurre `next/image` in questo batch.
2. Le verifiche browser complete su `1280px`, `768px`, `390px` sono state tentate, ma una passata Chrome headless si e bloccata. Il controllo DevTools affidabile e stato completato a `1440px`; i breakpoint minori richiedono una passata manuale o Playwright dedicato in un batch separato.
3. Alcuni componenti admin e form usano ancora `style={{ ... }}` inline; non sono stati refactorati per non allargare il perimetro.
4. Checkout resta simulato/localStorage come da vincoli, non checkout reale.

## 15. Prossimo batch consigliato

Batch successivo consigliato:

1. verifica manuale/mobile completa a `1280`, `768`, `390`;
2. pulizia progressiva degli inline style in admin/contact/shop-catalog;
3. batch dedicato e controllato per decidere se migrare immagini a `next/image`;
4. rifinitura mobile di admin e checkout dopo review visuale reale;
5. eventuale report separato su accessibilita e focus states.

## 16. Conferma perimetro

In questa fase sono stati toccati solo UI, layout, stile e composizione visuale delle pagine.

Non sono stati modificati:

- CRUD admin;
- scritture Supabase;
- Cloudflare;
- API;
- env variables;
- deploy config;
- checkout reale;
- pagamenti reali;
- dati catalogo;
- route path esistenti.
