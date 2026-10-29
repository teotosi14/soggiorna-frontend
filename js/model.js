// model.js — livello MODEL della SPA (pattern MAV).
// Un unico oggetto `Model`, suddiviso per rotta. È l'UNICO livello che chiama `api`:
// tiene lo stato di pagina e incapsula l'accesso ai dati. View e Action non parlano mai
// direttamente col backend, passano sempre da qui.
const Model = {

    // ---- rotta "/" (catalogo alloggi) ----
    catalog: {
        state: { wishlistIds: new Set(), datePicker: null },

        async caricaWishlistIds() {
            if (!getToken()) { this.state.wishlistIds = new Set(); return; }
            try {
                const mia = await api.wishlist();
                this.state.wishlistIds = new Set(mia.map(w => w.alloggioId));
            } catch { this.state.wishlistIds = new Set(); }
        },
        // Ricerca alloggi + wishlist in parallelo; esclude i propri alloggi (gestiti in Area host).
        async cerca(params) {
            const [tutti] = await Promise.all([api.cercaAlloggi(params), this.caricaWishlistIds()]);
            const user = getUser();
            return user ? tutti.filter(a => a.hostId !== user.id) : tutti;
        },
        async statistiche() {
            const tutti = await api.cercaAlloggi({});
            return { alloggi: tutti.length, citta: new Set(tutti.map(a => a.citta)).size };
        },
    },

    // ---- rotta "/alloggio" ----
    alloggio: {
        state: { alloggio: null, picker: null, salvato: false },
        get(id) { return api.alloggio(id).then(a => (this.state.alloggio = a)); },
        dateOccupate(id) { return api.dateOccupate(id); },
        wishlist() { return api.wishlist(); },
        recensioni(id) { return api.recensioniAlloggio(id); },
        punti(citta) { return api.puntiInteresse(citta); },
        disponibilita(id) { return api.disponibilita(id); },
        aggiungiDisponibilita(id, body) { return api.aggiungiDisponibilita(id, body); },
        rimuoviDisponibilita(id, dispId) { return api.rimuoviDisponibilita(id, dispId); },
        prenota(body) { return api.prenota(body); },
        aggiungiWishlist(id) { return api.aggiungiWishlist(id); },
        rimuoviWishlist(id) { return api.rimuoviWishlist(id); },
        disattiva(id) { return api.disattivaAlloggio(id); },
        riattiva(id) { return api.riattivaAlloggio(id); },
    },

    // ---- rotta "/noleggio" (catalogo veicoli) ----
    noleggio: {
        state: { datePicker: null },
        cerca(params) { return api.cercaVeicoli(params); },
    },

    // ---- rotta "/veicolo" ----
    veicolo: {
        state: { veicolo: null, picker: null },
        get(id) { return api.veicolo(id).then(v => (this.state.veicolo = v)); },
        dateOccupate(id) { return api.veicoloDateOccupate(id); },
        disattiva(id) { return api.disattivaVeicolo(id); },
        prenota(payload) { return api.prenotaVeicolo(payload); },
    },

    // ---- rotta "/esperienze" (catalogo) ----
    esperienze: {
        cerca(params) { return api.cercaEsperienze(params); },
    },

    // ---- rotta "/esperienza" ----
    esperienza: {
        state: { esperienza: null },
        get(id) { return api.esperienza(id).then(e => (this.state.esperienza = e)); },
        disattiva(id) { return api.disattivaEsperienza(id); },
        prenota(payload) { return api.prenotaEsperienza(payload); },
    },

    // ---- rotta "/scopri" (guida "Scopri la città") ----
    scopri: {
        state: { citta: null, cittaTutte: [] },
        cittaDisponibili() { return api.cittaConPuntiInteresse(); },
        punti(citta) { return api.puntiInteresse(citta); },
    },

    // ---- rotta "/suggeriti" (proposte di vacanza) ----
    suggeriti: {
        tutti() { return api.pacchettiSuggeriti(); },
    },

    // ---- rotta "/pacchetto" (dettaglio prenotabile di una proposta) ----
    // Il pacchetto non ha FK verso alloggi/esperienze (e' contenuto editoriale): il legame e'
    // la citta', quindi il "contenuto" della proposta si ricava interrogando i due domini
    // prenotabili su quella destinazione.
    pacchetto: {
        state: { pacchetto: null, checkin: null, checkout: null, picker: null },
        get(id) { return api.pacchetto(id); },
        alloggi(citta, checkin, checkout) { return api.cercaAlloggi({ citta, checkin, checkout }); },
        esperienze(citta) { return api.cercaEsperienze({ citta }); },
    },

    // ---- rotta "/preferiti" (wishlist) ----
    wishlist: {
        async preferiti() {
            const mia = await api.wishlist();
            if (!mia.length) return [];
            return Promise.all(mia.map(w => api.alloggio(w.alloggioId)));
        },
    },

    // ---- rotta "/prenotazioni" ----
    prenotazioni: {
        state: { spesePrenId: null },
        mie() { return api.miePrenotazioni(); },
        mieiNoleggi() { return api.mieiNoleggi(); },
        mieEsperienze() { return api.miePrenotazioniEsperienze(); },
        annulla(id) { return api.annullaPrenotazione(id); },
        annullaNoleggio(id) { return api.annullaNoleggio(id); },
        annullaEsperienza(id) { return api.annullaPrenotazioneEsperienza(id); },
        creaRecensione(body) { return api.creaRecensione(body); },
        spese(prenId) { return api.speseDiPrenotazione(prenId); },
        aggiungiSpesa(prenId, body) { return api.aggiungiSpesa(prenId, body); },
        eliminaSpesa(prenId, spesaId) { return api.eliminaSpesa(prenId, spesaId); },
    },

    // ---- rotta "/profilo" ----
    profilo: {
        state: { ultimoProfilo: null },
        get() { return api.profilo().then(p => (this.state.ultimoProfilo = p)); },
        aggiorna(body) { return api.aggiornaProfilo(body).then(p => (this.state.ultimoProfilo = p)); },
        cambiaPassword(body) { return api.cambiaPassword(body); },
    },

    // ---- rotta "/host" (Area host) ----
    host: {
        state: { editingId: null, serviziDisponibili: [], serviziSelezionati: new Set(), fotoEsistenti: [] },

        servizi() { return api.servizi(); },
        mieiAlloggi() { return api.mieiAlloggi(); },
        mieiVeicoli() { return api.mieiVeicoli(); },
        mieEsperienze() { return api.mieEsperienze(); },
        ricevuteAlloggi() { return api.prenotazioniRicevute(); },
        ricevutiNoleggi() { return api.noleggiRicevuti(); },
        ricevuteEsperienze() { return api.esperienzePrenotazioniRicevute(); },

        alloggio(id) { return api.alloggio(id); },
        creaAlloggio(body) { return api.creaAlloggio(body); },
        aggiornaAlloggio(id, body) { return api.aggiornaAlloggio(id, body); },
        aggiungiFoto(id, body) { return api.aggiungiFoto(id, body); },
        caricaFoto(id, file) { return api.caricaFoto(id, file); },
        rimuoviFoto(id, fotoId) { return api.rimuoviFoto(id, fotoId); },

        confermaAlloggio(id) { return api.confermaPrenotazione(id); },
        rifiutaAlloggio(id) { return api.rifiutaPrenotazione(id); },
        confermaNoleggio(id) { return api.confermaNoleggio(id); },
        rifiutaNoleggio(id) { return api.rifiutaNoleggio(id); },
        confermaEsperienza(id) { return api.confermaPrenotazioneEsperienza(id); },
        rifiutaEsperienza(id) { return api.rifiutaPrenotazioneEsperienza(id); },
    },

    // ---- rotta "/admin" (pannello Amministratore) ----
    admin: {
        state: { alloggi: [], recensioni: [], utenti: [], veicoli: [], esperienze: [], punti: [] },

        caricaAlloggi() { return api.adminAlloggi(); },
        caricaRecensioni() { return api.adminRecensioni(); },
        caricaUtenti() { return api.adminUtenti(); },
        caricaVeicoli() { return api.adminVeicoli(); },
        caricaEsperienze() { return api.adminEsperienze(); },
        // Non esiste un elenco totale pubblico: si aggregano i punti di tutte le città.
        async caricaPunti() {
            const citta = await api.cittaConPuntiInteresse();
            const perCitta = await Promise.all(citta.map(c => api.puntiInteresse(c.citta)));
            return perCitta.flat();
        },

        disattivaAlloggio(id) { return api.adminDisattivaAlloggio(id); },
        riattivaAlloggio(id) { return api.adminRiattivaAlloggio(id); },
        eliminaRecensione(id) { return api.adminEliminaRecensione(id); },
        sospendiUtente(id) { return api.adminSospendiUtente(id); },
        riattivaUtente(id) { return api.adminRiattivaUtente(id); },
        disattivaVeicolo(id) { return api.adminDisattivaVeicolo(id); },
        riattivaVeicolo(id) { return api.adminRiattivaVeicolo(id); },
        disattivaEsperienza(id) { return api.adminDisattivaEsperienza(id); },
        riattivaEsperienza(id) { return api.adminRiattivaEsperienza(id); },
        creaPunto(body) { return api.adminCreaPuntoInteresse(body); },
        eliminaPunto(id) { return api.adminEliminaPuntoInteresse(id); },
    },

    // ---- rotte "/login" e "/register" ----
    login: {
        login(body) { return api.login(body); },
    },
    register: {
        registra(body) { return api.register(body); },
    },
};
