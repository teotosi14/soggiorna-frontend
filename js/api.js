// Wrapper per le chiamate REST al backend Spring Boot.
const API_BASE = "http://localhost:8080/api";

// Foto indicative per gli alloggi che non hanno ancora foto proprie caricate
// (es. appena creati da un host, prima di aggiungere scatti reali).
// Solo interni neutri, senza elementi architettonici che possano contraddire
// la citta'/tipologia dell'alloggio. Scelta deterministica in base all'id,
// cosi' lo stesso alloggio mostra sempre la stessa immagine.
const PLACEHOLDER_PHOTOS = [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&q=65&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=65&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=65&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&q=65&auto=format&fit=crop",
];
function placeholderPhoto(alloggioId) {
    const idx = Number(alloggioId) % PLACEHOLDER_PHOTOS.length;
    return PLACEHOLDER_PHOTOS[Math.abs(idx) || 0];
}

function getToken()  { return localStorage.getItem("soggiorna_token"); }
function getUser()   { try { return JSON.parse(localStorage.getItem("soggiorna_user")); } catch { return null; } }
function isAdmin()   { const u = getUser(); return !!u && u.ruolo === "ADMIN"; }
// Agenzia partner (noleggio/esperienze): UI ridotta alla sola area di gestione prenotazioni.
function isPartner() { const u = getUser(); return !!u && u.ruolo === "PARTNER"; }
function setSession(data) {
    localStorage.setItem("soggiorna_token", data.token);
    localStorage.setItem("soggiorna_user", JSON.stringify({ id: data.userId, email: data.email, nome: data.nome, ruolo: data.ruolo }));
}
function clearSession() {
    localStorage.removeItem("soggiorna_token");
    localStorage.removeItem("soggiorna_user");
}
function updateSessionNome(nome) {
    const user = getUser();
    if (!user) return;
    user.nome = nome;
    localStorage.setItem("soggiorna_user", JSON.stringify(user));
}

async function apiFetch(path, { method = "GET", body = null, auth = false } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth) {
        const t = getToken();
        if (t) headers["Authorization"] = "Bearer " + t;
    }
    const res = await fetch(API_BASE + path, {
        method, headers, body: body ? JSON.stringify(body) : null,
    });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) {
        // Un 401/403 su una chiamata autenticata SENZA messaggio applicativo viene da Spring
        // Security stesso (token mancante/scaduto/non valido), non da una regola di business del
        // backend (quella arriva sempre con un messaggio, vedi GlobalExceptionHandler): la sessione
        // non e' piu' valida, si torna al login invece di mostrare un "Errore 403" criptico.
        if (auth && (res.status === 401 || res.status === 403) && !(data && data.message)) {
            clearSession();
            MAV.navigate("/login");
            throw new Error("Sessione scaduta: effettua di nuovo l'accesso.");
        }
        throw new Error(data && data.message ? data.message : "Errore " + res.status);
    }
    return data;
}

// Upload multipart (foto): niente header Content-Type esplicito, lo imposta il browser col boundary corretto.
async function apiUpload(path, formData) {
    const headers = {};
    const t = getToken();
    if (t) headers["Authorization"] = "Bearer " + t;
    const res = await fetch(API_BASE + path, { method: "POST", headers, body: formData });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(data && data.message ? data.message : "Errore " + res.status);
    }
    return data;
}

const api = {
    register: (b) => apiFetch("/auth/register", { method: "POST", body: b }),
    login:    (b) => apiFetch("/auth/login",    { method: "POST", body: b }),

    cercaAlloggi: (params) => {
        const q = new URLSearchParams();
        if (params.citta)     q.set("citta", params.citta);
        if (params.ospiti)    q.set("ospiti", params.ospiti);
        if (params.prezzoMax) q.set("prezzoMax", params.prezzoMax);
        if (params.checkin)   q.set("checkin", params.checkin);
        if (params.checkout)  q.set("checkout", params.checkout);
        return apiFetch("/alloggi?" + q.toString());
    },
    alloggio:      (id) => apiFetch("/alloggi/" + id),
    mieiAlloggi:   ()   => apiFetch("/alloggi/miei", { auth: true }),
    creaAlloggio:  (b)  => apiFetch("/alloggi", { method: "POST", body: b, auth: true }),
    aggiornaAlloggio:  (id, b) => apiFetch("/alloggi/" + id, { method: "PUT", body: b, auth: true }),
    disattivaAlloggio: (id)    => apiFetch("/alloggi/" + id, { method: "DELETE", auth: true }),
    riattivaAlloggio: (id)     => apiFetch("/alloggi/" + id + "/riattiva", { method: "PUT", auth: true }),
    aggiungiFoto:  (id, b) => apiFetch("/alloggi/" + id + "/foto", { method: "POST", body: b, auth: true }),
    caricaFoto:    (id, file) => {
        const form = new FormData();
        form.append("file", file);
        return apiUpload("/alloggi/" + id + "/foto/upload", form);
    },
    rimuoviFoto:   (id, fotoId) => apiFetch("/alloggi/" + id + "/foto/" + fotoId, { method: "DELETE", auth: true }),
    servizi:       ()   => apiFetch("/servizi"),

    disponibilita:        (id)    => apiFetch("/alloggi/" + id + "/disponibilita"),
    aggiungiDisponibilita:(id, b) => apiFetch("/alloggi/" + id + "/disponibilita", { method: "POST", body: b, auth: true }),
    rimuoviDisponibilita: (id, dispId) => apiFetch("/alloggi/" + id + "/disponibilita/" + dispId, { method: "DELETE", auth: true }),
    dateOccupate:         (id)    => apiFetch("/alloggi/" + id + "/date-occupate"),

    prenota:        (b)  => apiFetch("/prenotazioni", { method: "POST", body: b, auth: true }),
    miePrenotazioni:()   => apiFetch("/prenotazioni/mie", { auth: true }),
    prenotazioniRicevute: () => apiFetch("/prenotazioni/ricevute", { auth: true }),
    confermaPrenotazione: (id) => apiFetch("/prenotazioni/" + id + "/conferma", { method: "PUT", auth: true }),
    rifiutaPrenotazione:  (id) => apiFetch("/prenotazioni/" + id + "/rifiuta",  { method: "PUT", auth: true }),
    annullaPrenotazione:  (id) => apiFetch("/prenotazioni/" + id + "/annulla",  { method: "PUT", auth: true }),

    recensioniAlloggio: (id) => apiFetch("/recensioni/alloggio/" + id),
    creaRecensione:     (b)  => apiFetch("/recensioni", { method: "POST", body: b, auth: true }),

    wishlist:        ()   => apiFetch("/wishlist", { auth: true }),
    aggiungiWishlist:(id) => apiFetch("/wishlist/" + id, { method: "POST", auth: true }),
    rimuoviWishlist: (id) => apiFetch("/wishlist/" + id, { method: "DELETE", auth: true }),

    profilo:          ()  => apiFetch("/utenti/me", { auth: true }),
    aggiornaProfilo:  (b) => apiFetch("/utenti/me", { method: "PUT", body: b, auth: true }),
    cambiaPassword:   (b) => apiFetch("/utenti/me/password", { method: "PUT", body: b, auth: true }),

    // Pannello Amministratore: catalogo servizi, moderazione alloggi/recensioni, gestione utenti.
    adminCreaServizio:     (b)  => apiFetch("/admin/servizi", { method: "POST", body: b, auth: true }),
    adminRinominaServizio: (id, b) => apiFetch("/admin/servizi/" + id, { method: "PUT", body: b, auth: true }),
    adminEliminaServizio:  (id) => apiFetch("/admin/servizi/" + id, { method: "DELETE", auth: true }),

    adminAlloggi:          ()   => apiFetch("/admin/alloggi", { auth: true }),
    adminDisattivaAlloggio:(id) => apiFetch("/admin/alloggi/" + id + "/disattiva", { method: "PUT", auth: true }),
    adminRiattivaAlloggio: (id) => apiFetch("/admin/alloggi/" + id + "/riattiva",  { method: "PUT", auth: true }),

    adminRecensioni:       ()   => apiFetch("/admin/recensioni", { auth: true }),
    adminEliminaRecensione:(id) => apiFetch("/admin/recensioni/" + id, { method: "DELETE", auth: true }),

    adminUtenti:           ()   => apiFetch("/admin/utenti", { auth: true }),
    adminSospendiUtente:   (id) => apiFetch("/admin/utenti/" + id + "/sospendi", { method: "PUT", auth: true }),
    adminRiattivaUtente:   (id) => apiFetch("/admin/utenti/" + id + "/riattiva", { method: "PUT", auth: true }),

    // ---- Noleggio auto ----
    cercaVeicoli: (params) => {
        const q = new URLSearchParams();
        if (params.citta)         q.set("citta", params.citta);
        if (params.tipo)          q.set("tipo", params.tipo);
        if (params.cambio)        q.set("cambio", params.cambio);
        if (params.dataRitiro)    q.set("dataRitiro", params.dataRitiro);
        if (params.dataRiconsegna) q.set("dataRiconsegna", params.dataRiconsegna);
        return apiFetch("/veicoli?" + q.toString());
    },
    veicolo:            (id) => apiFetch("/veicoli/" + id),
    veicoloDateOccupate:(id) => apiFetch("/veicoli/" + id + "/date-occupate"),
    mieiVeicoli:         ()  => apiFetch("/veicoli/miei", { auth: true }),
    creaVeicolo:         (b) => apiFetch("/veicoli", { method: "POST", body: b, auth: true }),
    aggiornaVeicolo:     (id, b) => apiFetch("/veicoli/" + id, { method: "PUT", body: b, auth: true }),
    disattivaVeicolo:    (id) => apiFetch("/veicoli/" + id, { method: "DELETE", auth: true }),

    prenotaVeicolo:            (b)  => apiFetch("/prenotazioni-veicoli", { method: "POST", body: b, auth: true }),
    mieiNoleggi:               ()   => apiFetch("/prenotazioni-veicoli/mie", { auth: true }),
    noleggiRicevuti:           ()   => apiFetch("/prenotazioni-veicoli/ricevute", { auth: true }),
    confermaNoleggio:          (id) => apiFetch("/prenotazioni-veicoli/" + id + "/conferma", { method: "PUT", auth: true }),
    rifiutaNoleggio:           (id) => apiFetch("/prenotazioni-veicoli/" + id + "/rifiuta",  { method: "PUT", auth: true }),
    annullaNoleggio:           (id) => apiFetch("/prenotazioni-veicoli/" + id + "/annulla",  { method: "PUT", auth: true }),

    // ---- Esplora esperienze ----
    cercaEsperienze: (params) => {
        const q = new URLSearchParams();
        if (params.citta)     q.set("citta", params.citta);
        if (params.categoria) q.set("categoria", params.categoria);
        return apiFetch("/esperienze?" + q.toString());
    },
    esperienza:         (id) => apiFetch("/esperienze/" + id),
    mieEsperienze:      ()   => apiFetch("/esperienze/mie", { auth: true }),
    creaEsperienza:     (b)  => apiFetch("/esperienze", { method: "POST", body: b, auth: true }),
    aggiornaEsperienza: (id, b) => apiFetch("/esperienze/" + id, { method: "PUT", body: b, auth: true }),
    disattivaEsperienza:(id) => apiFetch("/esperienze/" + id, { method: "DELETE", auth: true }),

    prenotaEsperienza:         (b)  => apiFetch("/prenotazioni-esperienze", { method: "POST", body: b, auth: true }),
    miePrenotazioniEsperienze:()   => apiFetch("/prenotazioni-esperienze/mie", { auth: true }),
    esperienzePrenotazioniRicevute: () => apiFetch("/prenotazioni-esperienze/ricevute", { auth: true }),
    confermaPrenotazioneEsperienza: (id) => apiFetch("/prenotazioni-esperienze/" + id + "/conferma", { method: "PUT", auth: true }),
    rifiutaPrenotazioneEsperienza:  (id) => apiFetch("/prenotazioni-esperienze/" + id + "/rifiuta",  { method: "PUT", auth: true }),
    annullaPrenotazioneEsperienza:  (id) => apiFetch("/prenotazioni-esperienze/" + id + "/annulla",  { method: "PUT", auth: true }),

    // ---- Spese di viaggio (annidate sotto una prenotazione di alloggio) ----
    speseDiPrenotazione: (prenotazioneId)      => apiFetch("/prenotazioni/" + prenotazioneId + "/spese", { auth: true }),
    aggiungiSpesa:       (prenotazioneId, b)   => apiFetch("/prenotazioni/" + prenotazioneId + "/spese", { method: "POST", body: b, auth: true }),
    eliminaSpesa:        (prenotazioneId, id)  => apiFetch("/prenotazioni/" + prenotazioneId + "/spese/" + id, { method: "DELETE", auth: true }),

    // ---- Scopri la città ----
    cittaConPuntiInteresse: ()      => apiFetch("/punti-interesse/citta"),
    puntiInteresse:         (citta) => apiFetch("/punti-interesse?citta=" + encodeURIComponent(citta)),

    // ---- Suggeriti (proposte di vacanza) ----
    pacchettiSuggeriti: () => apiFetch("/pacchetti"),
    pacchetto:          (id) => apiFetch("/pacchetti/" + id),

    adminVeicoli:           ()   => apiFetch("/admin/veicoli", { auth: true }),
    adminDisattivaVeicolo:  (id) => apiFetch("/admin/veicoli/" + id + "/disattiva", { method: "PUT", auth: true }),
    adminRiattivaVeicolo:   (id) => apiFetch("/admin/veicoli/" + id + "/riattiva",  { method: "PUT", auth: true }),

    adminEsperienze:         ()   => apiFetch("/admin/esperienze", { auth: true }),
    adminDisattivaEsperienza:(id) => apiFetch("/admin/esperienze/" + id + "/disattiva", { method: "PUT", auth: true }),
    adminRiattivaEsperienza: (id) => apiFetch("/admin/esperienze/" + id + "/riattiva",  { method: "PUT", auth: true }),

    adminCreaPuntoInteresse:     (b)     => apiFetch("/admin/punti-interesse", { method: "POST", body: b, auth: true }),
    adminAggiornaPuntoInteresse: (id, b) => apiFetch("/admin/punti-interesse/" + id, { method: "PUT", body: b, auth: true }),
    adminEliminaPuntoInteresse:  (id)    => apiFetch("/admin/punti-interesse/" + id, { method: "DELETE", auth: true }),
};
