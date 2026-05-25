# No Cap Barber Shop

Esperienza frontend premium per shop prodotti, gestione catalogo, taglio del giorno e showcase mensile.

## Avvio rapido

1. Apri `index.html` direttamente nel browser.
2. In alternativa, avvia un server statico dalla cartella del progetto:

```powershell
python -m http.server 4173
```

Poi visita `http://localhost:4173`.

## Cosa include

- Catalogo prodotti responsive con card scure in stile No Cap.
- Pagine client-side distinte per home, shop, taglio fresco, showcase e supporto.
- Taglio fresco visibile al cliente, con caricamento foto/nome/descrizione solo dal drawer admin.
- Showcase pubblico filtrato automaticamente sui tagli del mese corrente.
- Hover immagine prodotto con transizione verso seconda vista.
- Carrello laterale con micro-interazioni.
- Giacenze persistenti in `localStorage`.
- Modalita gestore nascosta in drawer admin con decremento, incremento, rifornimento e ripristino.
