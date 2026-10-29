// mav.js — micro-runtime MAV (Model-Action-View) + router SPA (hash-based).
//
// L'app è una Single Page Application: un solo index.html (la "shell") con un contenitore
// <main id="app">. Ogni pagina è una ROTTA che monta la propria View dentro #app, senza mai
// ricaricare il documento. Ogni modulo-pagina è un IIFE che dichiara i tre livelli MAV e
// registra la sua rotta con MAV.route():
//   Model   — stato della pagina + accesso ai dati. È l'UNICO livello che chiama `api`.
//   View    — funzioni pure: dati -> stringa HTML (incluso il markup statico della pagina).
//   Actions — intenzioni dell'utente: leggono dal Model, rendono con la View, gestiscono errori.
//
// Le librerie condivise mantengono i loro ruoli: api.js è infrastruttura Model; cards.js/
// modal.js/daterange.js sono componenti View; ui.js e auth.js sono View/servizi condivisi.
const MAV = {

    // ---- Helper di rendering ----

    // Inietta HTML in un contenitore (id stringa o elemento) e restituisce l'elemento.
    mount(target, html) {
        const el = typeof target === "string" ? document.getElementById(target) : target;
        if (el) el.innerHTML = html;
        return el;
    },

    // Delega un solo listener sul contenitore: al click (o altro evento) su un elemento con
    // data-action="nome", chiama actions[nome](el, event). Toglie gli onclick inline e i cicli
    // querySelectorAll(...).forEach(addEventListener); la delega sopravvive ai re-render interni.
    delegate(container, actions, eventType = "click") {
        const root = typeof container === "string" ? document.getElementById(container) : container;
        if (!root || root._mavDelegated) return root;
        root.addEventListener(eventType, (e) => {
            const el = e.target.closest("[data-action]");
            if (!el || !root.contains(el)) return;
            const fn = actions[el.dataset.action];
            if (fn) { e.preventDefault(); fn(el, e); }
        });
        root._mavDelegated = true;
        return root;
    },

    // ---- Router SPA (hash-based) ----
    // Hash e non History API: il sito è servito staticamente (Live Server, python -m http.server),
    // quindi un refresh su /alloggio darebbe 404 senza rewrite lato server; con "#/alloggio" no.
    _routes: {},
    _cleanups: [],

    // Registra una rotta. path es. "/", "/alloggio". opts: { auth?, adminOnly?, title?, render(params) }.
    route(path, opts) { this._routes[path] = opts; },

    // Registra una pulizia da eseguire prima della prossima navigazione (distruggere un date-picker,
    // rimuovere un listener globale...). La lista viene azzerata a ogni render.
    onLeave(fn) { this._cleanups.push(fn); },

    // Naviga a una rotta (accetta "/x" o "#/x"): cambia l'hash, il resto lo fa hashchange.
    navigate(path) { location.hash = path.charAt(0) === "#" ? path : "#" + path; },

    // "#/alloggio?id=1" -> { path: "/alloggio", params: { id: "1" } }
    current() {
        const raw = decodeURI(location.hash.slice(1)) || "/";
        const q = raw.indexOf("?");
        const path = q === -1 ? raw : raw.slice(0, q);
        const query = q === -1 ? "" : raw.slice(q + 1);
        return { path: path || "/", params: Object.fromEntries(new URLSearchParams(query)) };
    },

    async _run() {
        // Pulizia della rotta precedente, poi chiusura di eventuali modali aperti.
        this._cleanups.forEach(fn => { try { fn(); } catch { /* best-effort */ } });
        this._cleanups = [];
        if (typeof chiudiModal === "function") chiudiModal();

        const { path, params } = this.current();
        const route = this._routes[path] || this._routes["/"];

        // Guardie di rotta: autenticazione e ruolo admin. replaceState non sporca la cronologia
        // né fa scattare hashchange, quindi si ri-esegue _run() a mano una sola volta.
        if (route.auth && !getToken()) { history.replaceState(null, "", "#/login"); return this._run(); }
        if (route.adminOnly && !isAdmin()) { history.replaceState(null, "", "#/"); return this._run(); }
        // Le agenzie partner vedono solo la propria area di gestione (rotte marcate partnerOk).
        if (isPartner() && !route.partnerOk) { history.replaceState(null, "", "#/host"); return this._run(); }

        document.title = route.title ? "SpaceB&B · " + route.title : "SpaceB&B";
        // Alcune rotte usano un contenitore diverso da `.container` (es. login/register a tutta
        // larghezza): il router imposta la classe di #app, il resto degli attributi resta invariato.
        document.getElementById("app").className = route.mainClass || "container";
        if (typeof renderNav === "function") renderNav();
        window.scrollTo(0, 0);
        try {
            await route.render(params);
        } catch (e) {
            this.mount("app", `<p class="msg error">${e.message}</p>`);
        }
        if (typeof initScrollReveal === "function") initScrollReveal();
    },

    // Avvia il router: ascolta i cambi di hash e rende la rotta iniziale.
    start() {
        window.addEventListener("hashchange", () => this._run());
        if (!location.hash) history.replaceState(null, "", "#/");
        this._run();
    },
};
