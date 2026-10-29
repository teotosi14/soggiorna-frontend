# SpaceB&B - Frontend

Frontend di **SpaceB&B**, una piattaforma di affitti brevi tra privati (sul modello di Airbnb) con noleggio auto, esperienze locali e guida alle città.
Progetto congiunto per gli esami di Ingegneria del Software, Basi di Dati e Ingegneria dei Sistemi Web (Università degli Studi di Ferrara).

Autori: Matteo Tosi (195958), Tommaso Pizzolato (196187)

Il backend è in un repository separato: (https://github.com/teotosi14/soggiorna-backend)

## Tecnologie

- HTML5, CSS3 e JavaScript (senza framework e senza build)
- Chiamate alle API REST con `fetch`

## Come avviarlo

Il frontend ha bisogno del backend in esecuzione su `http://localhost:8080` (vedi il repository del backend).

È un sito statico: va servito con un piccolo server (aprire i file con `file://` causa problemi di CORS).

```bash
python -m http.server 5500
```

Poi apri `http://localhost:5500`. In VS Code va bene anche l'estensione **Live Server**.

## Utenti di prova

Password: `password`

- `host@example.com`: ha già alloggi pubblicati
- `guest@example.com`: per provare ricerca e prenotazioni

## Cosa c'è dentro

- **Catalogo e ricerca** di alloggi con filtri (città, date, ospiti, prezzo)
- **Dettaglio alloggio** con foto, servizi, recensioni e prenotazione
- **Login e registrazione**, profilo e cambio password
- **Area host**: annunci, foto, disponibilità, prenotazioni ricevute
- **Le mie prenotazioni**, recensioni e spese di viaggio
- **Preferiti**
- **Noleggio auto** ed **Esplora esperienze**
- **Scopri la città** e **Suggeriti**
- **Pannello admin**

## Struttura

```
css/   stili (design system condiviso)
js/    api.js (chiamate al backend), auth.js (sessione), catalog.js, alloggio.js, ...
*.html pagine del sito
```

## Autenticazione

Dopo il login il token JWT viene salvato in `localStorage` e `api.js` lo allega a ogni richiesta protetta. Se il token scade, l'utente torna alla pagina di login.

## Usabilità

Layout responsive, caricamento a scheletro, messaggi di errore chiari, stati vuoti e pagine riservate protette.
