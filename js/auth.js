// Navigazione (nav) della SPA: costruita in base alla sessione, con link a rotte hash (#/...).
// renderNav() viene richiamata dal router a ogni cambio rotta (per aggiornare la voce attiva)
// e dopo login/logout/modifica profilo.
function renderNav() {
    const nav = document.getElementById("nav");
    if (!nav) return;
    const user = getUser();
    if (user) {
        // Le agenzie partner hanno una UI ridotta: solo l'area di gestione, niente esplora/prenota/wishlist.
        const links = isPartner()
            ? `<a href="#/host">Gestione prenotazioni</a>`
            : `<a href="#/">Esplora</a>
            <a href="#/noleggio">Noleggio auto</a>
            <a href="#/esperienze">Esperienze</a>
            <a href="#/scopri">Scopri la città</a>
            <a href="#/suggeriti">Suggeriti</a>
            <a href="#/preferiti">Preferiti</a>
            <a href="#/prenotazioni">Prenotazioni</a>`;
        nav.innerHTML = `
            ${links}
            <div class="user-menu" id="userMenu">
                <button type="button" class="user-menu__trigger" id="userMenuTrigger" aria-haspopup="true" aria-expanded="false" aria-controls="userMenuDropdown">
                    ${user.nome}
                    <svg class="icon user-menu__chevron" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
                </button>
                <div class="user-menu__dropdown" id="userMenuDropdown" role="menu" hidden>
                    <a href="#/profilo" role="menuitem">Profilo</a>
                    ${isAdmin() ? `<a href="#/admin" role="menuitem">Amministrazione</a>` : ""}
                    <a href="#" id="logoutLink" role="menuitem">Esci</a>
                </div>
            </div>`;
        document.getElementById("logoutLink").addEventListener("click", (e) => {
            e.preventDefault();
            clearSession();
            // Ricarica la home "da guest": se siamo già su "/" l'hash non cambia, quindi si forza _run().
            if (MAV.current().path === "/") MAV._run(); else MAV.navigate("/");
        });
        wireUserMenu();
        if (!isPartner()) mostraVoceHostSeApplicabile(nav);
    } else {
        nav.innerHTML = `
            <a href="#/">Esplora</a>
            <a href="#/noleggio">Noleggio auto</a>
            <a href="#/esperienze">Esperienze</a>
            <a href="#/scopri">Scopri la città</a>
            <a href="#/suggeriti">Suggeriti</a>
            <a href="#/login">Accedi</a>
            <a href="#/register">Registrati</a>`;
    }
    evidenziaVoceCorrente(nav);
}

// Estrae il path di rotta da un href hash ("#/noleggio" -> "/noleggio", "#/" -> "/").
function pathDaHref(href) {
    if (!href || href.charAt(0) !== "#") return null;
    const raw = href.slice(1);
    const q = raw.indexOf("?");
    return (q === -1 ? raw : raw.slice(0, q)) || "/";
}

function evidenziaVoceCorrente(nav) {
    const current = MAV.current().path;
    let activeInDropdown = false;
    nav.querySelectorAll("a[href]").forEach(a => {
        const target = pathDaHref(a.getAttribute("href"));
        const isActive = target !== null && target === current;
        a.classList.toggle("active", isActive);
        if (isActive && a.closest(".user-menu__dropdown")) activeInDropdown = true;
    });
    const trigger = document.getElementById("userMenuTrigger");
    if (trigger) trigger.classList.toggle("active", activeInDropdown);
}

// Apertura/chiusura del menu utente a tendina (Profilo/Esci): click sul trigger, click fuori,
// Esc o selezione di una voce lo richiudono.
function wireUserMenu() {
    const menu = document.getElementById("userMenu");
    const trigger = document.getElementById("userMenuTrigger");
    const dropdown = document.getElementById("userMenuDropdown");
    if (!menu || !trigger || !dropdown) return;

    const close = () => { dropdown.hidden = true; trigger.setAttribute("aria-expanded", "false"); };
    const open = () => { dropdown.hidden = false; trigger.setAttribute("aria-expanded", "true"); };

    trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.hidden ? open() : close();
    });
    document.addEventListener("click", (e) => { if (!menu.contains(e.target)) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    dropdown.addEventListener("click", (e) => { if (e.target.tagName === "A") close(); });
}

// La voce "Host" compare per chi gestisce almeno un alloggio, un veicolo o un'esperienza (es. le
// agenzie partner): chi non lo è ancora raggiunge comunque l'Area host dal footer ("Diventa host").
async function mostraVoceHostSeApplicabile(nav) {
    try {
        const [alloggi, veicoli, esperienze] = await Promise.all([
            api.mieiAlloggi().catch(() => []),
            api.mieiVeicoli().catch(() => []),
            api.mieEsperienze().catch(() => []),
        ]);
        const eHost = (alloggi && alloggi.length) || (veicoli && veicoli.length) || (esperienze && esperienze.length);
        if (!eHost) return;
        if (document.getElementById("hostNavLink")) return;
        const link = document.createElement("a");
        link.href = "#/host";
        link.id = "hostNavLink";
        link.textContent = "Host";
        nav.insertBefore(link, document.getElementById("userMenu"));
        evidenziaVoceCorrente(nav);
    } catch { /* nessun alloggio o errore: nav resta senza voce Host */ }
}

// Guardia usata dalle rotte protette (in aggiunta al flag `auth` del router): reindirizza al login.
function requireAuth() {
    if (!getToken()) { MAV.navigate("/login"); return false; }
    return true;
}
