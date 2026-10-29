// action.js — livello ACTION della SPA (pattern MAV).
// Un unico oggetto `Action`, suddiviso per rotta. Sono le intenzioni dell'utente: leggono dal
// Model, rendono con la View, gestiscono gli errori. Ogni `render(params)` monta la View della
// rotta in #app (via app.js) e poi collega gli eventi. I pulsanti generati dinamicamente usano
// data-action + delega (MAV.delegate), quindi niente onclick inline né funzioni globali.

// Etichette del selettore date per il noleggio auto: termini "da agenzia" (ritiro/riconsegna)
// invece di quelli da pernottamento (check-in/check-out), e conteggio in giorni anziché notti.
const ETICHETTE_NOLEGGIO = {
    inizio: "Ritiro",
    fine: "Riconsegna",
    hintInizio: "Seleziona la data di ritiro",
    hintFine: "Ora seleziona la data di riconsegna",
    contaLabel: (n) => `${n} giorn${n === 1 ? "o" : "i"} di noleggio`,
};

// Filtro testuale puro condiviso dal pannello admin (case-insensitive su più campi).
function filtraTesto(lista, query, ...campi) {
    const q = query.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter(item => campi.some(estrai => (estrai(item) || "").toLowerCase().includes(q)));
}

const Action = {

    // ==== rotta "/" (catalogo alloggi) ====
    catalog: {
        render() {
            MAV.mount("app", View.catalog.page());
            document.getElementById("searchBtn").addEventListener("click", () => Action.catalog.cerca());
            Model.catalog.state.datePicker = montaSelettoreDate({ container: document.getElementById("fDateRange") });
            MAV.onLeave(distruggiPickerAttivo);
            Action.catalog.statistiche();
            Action.catalog.wireChips();
            Action.catalog.cerca();
        },
        async cerca() {
            const grid = document.getElementById("grid");
            const resultsBar = document.getElementById("resultsBar");
            resultsBar.hidden = true;
            MAV.mount(grid, View.catalog.skeletons());
            try {
                const sel = Model.catalog.state.datePicker ? Model.catalog.state.datePicker.getSelezione() : {};
                const params = {
                    citta: document.getElementById("f-citta").value.trim(),
                    ospiti: document.getElementById("f-ospiti").value,
                    prezzoMax: document.getElementById("f-prezzo").value,
                    checkin: sel.checkin || "",
                    checkout: sel.checkout || "",
                };
                const alloggi = await Model.catalog.cerca(params);
                MAV.mount(grid, View.catalog.griglia(alloggi, { loggato: !!getToken(), wishlistIds: Model.catalog.state.wishlistIds }));
                wireHeartButtons(grid);
                resultsBar.hidden = false;
                document.getElementById("resultsCount").innerHTML = View.catalog.conteggio(alloggi.length, params.citta);
            } catch (e) {
                MAV.mount(grid, `<p class="msg error">${e.message}</p>`);
            }
        },
        async statistiche() {
            const el = document.getElementById("heroStats");
            if (!el) return;
            try { el.innerHTML = View.catalog.statistiche(await Model.catalog.statistiche()); }
            catch { /* silenzioso: non è un'informazione critica */ }
        },
        wireChips() {
            const chips = document.getElementById("cityChips");
            if (!chips) return;
            chips.querySelectorAll("button[data-citta]").forEach(btn => {
                btn.addEventListener("click", () => {
                    document.getElementById("f-citta").value = btn.dataset.citta;
                    chips.querySelectorAll("button").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    Action.catalog.cerca();
                });
            });
        },
    },

    // ==== rotta "/alloggio" ====
    alloggio: {
        async render(params) {
            MAV.mount("app", View.alloggio.page());
            MAV.onLeave(distruggiPickerAttivo);
            try {
                const a = await Model.alloggio.get(params.id);
                document.title = "SpaceB&B · " + a.titolo;
                MAV.mount("detail", View.alloggio.dettaglio(a));
                MAV.delegate("detail", Action.alloggio);   // thumbnail galleria + pulsanti dei box
                const user = getUser();
                if (user && a.hostId === user.id) Action.alloggio.mostraOwnerBox(a);
                else Action.alloggio.mostraBookBox(a, params);
                Action.alloggio.caricaRecensioni(a.id);
                Action.alloggio.caricaAttivita(a.citta);
                initScrollReveal();
            } catch (e) {
                MAV.mount("detail", `<p class="msg error">${e.message}</p>`);
            }
        },

        thumb(el) {
            document.querySelector(".detail-cover").style.backgroundImage = `url('${el.dataset.url}')`;
            document.querySelectorAll(".gallery-strip .thumb").forEach(t => t.classList.remove("active"));
            el.classList.add("active");
        },

        mostraOwnerBox(a) { MAV.mount("bookBox", View.alloggio.ownerBox(a)); },

        async mostraBookBox(a, params = {}) {
            if (!a.attivo) { MAV.mount("bookBox", View.alloggio.bookBoxNonDisponibile()); return; }
            if (!getToken()) { MAV.mount("bookBox", View.alloggio.bookBoxLogin()); return; }
            let bloccate = [];
            try {
                const [wishlist, occupate] = await Promise.all([Model.alloggio.wishlist(), Model.alloggio.dateOccupate(a.id)]);
                Model.alloggio.state.salvato = wishlist.some(w => w.alloggioId === a.id);
                bloccate = occupate;
            } catch { /* box resta comunque utilizzabile */ }
            MAV.mount("bookBox", View.alloggio.bookBoxGuest(a, Model.alloggio.state.salvato));
            Model.alloggio.state.picker = montaSelettoreDate({
                container: document.getElementById("dateRangeHost"),
                datebloccate: bloccate,
                iniziale: { checkin: params.checkin, checkout: params.checkout },
                onChange: (sel) => Action.alloggio.aggiornaRiepilogo(a, sel),
            });
            // Con date arrivate dalla pagina di un pacchetto il riepilogo va allineato subito:
            // onChange scatta solo sui click dell'utente.
            Action.alloggio.aggiornaRiepilogo(a, Model.alloggio.state.picker.getSelezione());
        },

        aggiornaRiepilogo(a, { checkin, checkout }) {
            const summary = document.getElementById("bookSummary");
            const btn = document.getElementById("prenotaBtn");
            if (!checkin || !checkout) {
                summary.hidden = true;
                btn.disabled = true; btn.textContent = "Seleziona le date";
                return;
            }
            const notti = dpNotti(checkin, checkout);
            summary.hidden = false;
            summary.innerHTML = View.alloggio.riepilogo(a, notti, notti * Number(a.prezzoNotte));
            btn.disabled = false; btn.textContent = "Prenota";
        },

        async prenota() {
            const a = Model.alloggio.state.alloggio;
            const msg = document.getElementById("bookMsg");
            const { checkin, checkout } = Model.alloggio.state.picker.getSelezione();
            if (!checkin || !checkout) {
                msg.innerHTML = `<p class="msg error">Seleziona le date di check-in e check-out.</p>`;
                return;
            }
            const btn = document.getElementById("prenotaBtn");
            btn.disabled = true; btn.textContent = "Prenotazione in corso…";
            try {
                const p = await Model.alloggio.prenota({
                    alloggioId: a.id,
                    dataCheckin: checkin,
                    dataCheckout: checkout,
                    numOspiti: Number(document.getElementById("ospiti").value),
                });
                msg.innerHTML = `<p class="msg ok">Prenotazione creata (#${p.id}) · totale € ${View.alloggio.notte(p.prezzoTotale)} · stato ${p.stato}.</p>`;
                btn.textContent = "Prenotato";
            } catch (e) {
                msg.innerHTML = `<p class="msg error">${e.message}</p>`;
                btn.disabled = false; btn.textContent = "Prenota";
            }
        },

        // Aggiorna solo il bottone preferiti, lasciando intatte date e ospiti già scelti dal guest.
        async wish(el) {
            const a = Model.alloggio.state.alloggio;
            const msg = document.getElementById("bookMsg");
            const aggiungi = !Model.alloggio.state.salvato;
            try {
                if (aggiungi) await Model.alloggio.aggiungiWishlist(a.id);
                else await Model.alloggio.rimuoviWishlist(a.id);
                Model.alloggio.state.salvato = aggiungi;
                msg.innerHTML = `<p class="msg ok">${aggiungi ? "Aggiunto ai" : "Rimosso dai"} preferiti.</p>`;
                el.textContent = View.alloggio.wishLabel(aggiungi);
            } catch (e) {
                msg.innerHTML = `<p class="msg error">${e.message}</p>`;
            }
        },

        modifica() { MAV.navigate("/host?edit=" + Model.alloggio.state.alloggio.id); },

        async disattiva() {
            if (!confirm("Disattivare questo alloggio? Non sarà più visibile nelle ricerche.")) return;
            const msg = document.getElementById("bookMsg");
            try { await Model.alloggio.disattiva(Model.alloggio.state.alloggio.id); MAV.navigate("/host"); }
            catch (e) { msg.innerHTML = `<p class="msg error">${e.message}</p>`; }
        },

        async riattiva() {
            const msg = document.getElementById("bookMsg");
            try { await Model.alloggio.riattiva(Model.alloggio.state.alloggio.id); MAV.navigate("/host"); }
            catch (e) { msg.innerHTML = `<p class="msg error">${e.message}</p>`; }
        },

        async caricaRecensioni(id) {
            try { MAV.mount("recensioni", View.alloggio.recensioni(await Model.alloggio.recensioni(id))); }
            catch (e) { MAV.mount("recensioni", `<p class="msg error">${e.message}</p>`); }
        },

        // "Cosa fare a [città]": dalla guida "Scopri la città" (backend), non più da dati statici.
        async caricaAttivita(citta) {
            const root = document.getElementById("attivitaCitta");
            if (!root) return;
            try { MAV.mount(root, View.alloggio.attivita(await Model.alloggio.punti(citta), citta)); }
            catch (e) { MAV.mount(root, `<li class="msg error">${e.message}</li>`); }
        },

        // RF-06: gestione periodi di indisponibilità (modale con calendario).
        async disponibilita() {
            const a = Model.alloggio.state.alloggio;
            const overlay = apriModal(View.alloggio.dispModal(a), { labelledBy: "dispModalTitle", wide: true });
            MAV.delegate(overlay, Action.alloggio);
            const aggiungiBtn = document.getElementById("dispAggiungiBtn");
            const [bloccate] = await Promise.all([
                Model.alloggio.dateOccupate(a.id).catch(() => []),
                Action.alloggio.caricaDisponibilita(a.id),
            ]);
            Model.alloggio.state.picker = montaSelettoreDate({
                container: document.getElementById("dispDateRange"),
                datebloccate: bloccate,
                onChange: ({ checkin, checkout }) => {
                    aggiungiBtn.disabled = !(checkin && checkout);
                    aggiungiBtn.textContent = (checkin && checkout) ? "Aggiungi periodo" : "Seleziona le date";
                },
            });
        },

        async caricaDisponibilita(id) {
            const lista = document.getElementById("dispLista");
            if (!lista) return;
            try { MAV.mount(lista, View.alloggio.dispLista(await Model.alloggio.disponibilita(id))); }
            catch (e) { MAV.mount(lista, `<p class="msg error">${e.message}</p>`); }
        },

        async aggiungiPeriodo() {
            const a = Model.alloggio.state.alloggio;
            const msg = document.getElementById("dispMsg");
            const aggiungiBtn = document.getElementById("dispAggiungiBtn");
            const { checkin, checkout } = Model.alloggio.state.picker.getSelezione();
            if (!checkin || !checkout) return;
            try {
                await Model.alloggio.aggiungiDisponibilita(a.id, { dataInizio: checkin, dataFine: checkout });
                msg.innerHTML = "";
                Model.alloggio.state.picker.reset();
                aggiungiBtn.disabled = true;
                aggiungiBtn.textContent = "Seleziona le date";
                const [nuoveBloccate] = await Promise.all([
                    Model.alloggio.dateOccupate(a.id).catch(() => []),
                    Action.alloggio.caricaDisponibilita(a.id),
                ]);
                Model.alloggio.state.picker.setDateBloccate(nuoveBloccate);
            } catch (err) {
                msg.innerHTML = `<p class="msg error">${err.message}</p>`;
            }
        },

        async rimuoviPeriodo(el) {
            const a = Model.alloggio.state.alloggio;
            try {
                await Model.alloggio.rimuoviDisponibilita(a.id, Number(el.dataset.id));
                const [nuoveBloccate] = await Promise.all([
                    Model.alloggio.dateOccupate(a.id).catch(() => []),
                    Action.alloggio.caricaDisponibilita(a.id),
                ]);
                Model.alloggio.state.picker.setDateBloccate(nuoveBloccate);
            } catch (err) {
                document.getElementById("dispMsg").innerHTML = `<p class="msg error">${err.message}</p>`;
            }
        },
    },

    // ==== rotta "/noleggio" (catalogo veicoli) ====
    noleggio: {
        render() {
            MAV.mount("app", View.noleggio.page());
            document.getElementById("searchBtn").addEventListener("click", () => Action.noleggio.cerca());
            Model.noleggio.state.datePicker = montaSelettoreDate({
                container: document.getElementById("vDateRange"),
                etichette: ETICHETTE_NOLEGGIO,
            });
            MAV.onLeave(distruggiPickerAttivo);
            Action.noleggio.cerca();
        },
        async cerca() {
            const grid = document.getElementById("grid");
            const resultsBar = document.getElementById("resultsBar");
            resultsBar.hidden = true;
            MAV.mount(grid, View.noleggio.skeletons());
            try {
                const sel = Model.noleggio.state.datePicker ? Model.noleggio.state.datePicker.getSelezione() : {};
                const params = {
                    citta: document.getElementById("v-citta").value.trim(),
                    tipo: document.getElementById("v-tipo").value,
                    cambio: document.getElementById("v-cambio").value,
                    dataRitiro: sel.checkin || "",
                    dataRiconsegna: sel.checkout || "",
                };
                const veicoli = await Model.noleggio.cerca(params);
                MAV.mount(grid, View.noleggio.griglia(veicoli));
                resultsBar.hidden = false;
                document.getElementById("resultsCount").innerHTML = View.noleggio.conteggio(veicoli.length, params.citta);
            } catch (e) {
                MAV.mount(grid, `<p class="msg error">${e.message}</p>`);
            }
        },
    },

    // ==== rotta "/veicolo" ====
    veicolo: {
        async render(params) {
            MAV.mount("app", View.veicolo.page());
            MAV.onLeave(distruggiPickerAttivo);
            try {
                const v = await Model.veicolo.get(params.id);
                document.title = `SpaceB&B · ${v.marca} ${v.modello}`;
                MAV.mount("detail", View.veicolo.dettaglio(v));
                const user = getUser();
                if (user && v.hostId === user.id) Action.veicolo.mostraOwnerBox(v);
                else Action.veicolo.mostraBookBox(v);
                initScrollReveal();
            } catch (e) {
                MAV.mount("detail", `<p class="msg error">${e.message}</p>`);
            }
        },
        mostraOwnerBox(v) { MAV.delegate(MAV.mount("bookBox", View.veicolo.ownerBox(v)), Action.veicolo); },
        async mostraBookBox(v) {
            if (!getToken()) { MAV.mount("bookBox", View.veicolo.bookBoxLogin()); return; }
            let bloccate = [];
            try { bloccate = await Model.veicolo.dateOccupate(v.id); } catch { /* box resta comunque utilizzabile */ }
            MAV.delegate(MAV.mount("bookBox", View.veicolo.bookBoxGuest(v)), Action.veicolo);
            Model.veicolo.state.picker = montaSelettoreDate({
                container: document.getElementById("dateRangeVeicolo"),
                datebloccate: bloccate,
                etichette: ETICHETTE_NOLEGGIO,
                onChange: (sel) => Action.veicolo.aggiornaRiepilogo(v, sel),
            });
        },
        aggiornaRiepilogo(v, { checkin, checkout }) {
            const summary = document.getElementById("bookSummary");
            const btn = document.getElementById("prenotaBtn");
            if (!checkin || !checkout) {
                summary.hidden = true;
                btn.disabled = true; btn.textContent = "Seleziona le date";
                return;
            }
            const giorni = dpNotti(checkin, checkout);
            summary.hidden = false;
            summary.innerHTML = View.veicolo.riepilogo(v, giorni, giorni * Number(v.prezzoGiorno));
            btn.disabled = false; btn.textContent = "Prenota noleggio";
        },
        async prenota() {
            const v = Model.veicolo.state.veicolo;
            const msg = document.getElementById("bookMsg");
            const { checkin, checkout } = Model.veicolo.state.picker.getSelezione();
            if (!checkin || !checkout) {
                msg.innerHTML = `<p class="msg error">Seleziona le date di ritiro e riconsegna.</p>`;
                return;
            }
            const btn = document.getElementById("prenotaBtn");
            btn.disabled = true; btn.textContent = "Prenotazione in corso…";
            try {
                const p = await Model.veicolo.prenota({ veicoloId: v.id, dataRitiro: checkin, dataRiconsegna: checkout });
                msg.innerHTML = `<p class="msg ok">Noleggio richiesto (#${p.id}) · totale € ${View.veicolo.euro(p.prezzoTotale)} · stato ${p.stato}.</p>`;
                btn.textContent = "Richiesto";
            } catch (e) {
                msg.innerHTML = `<p class="msg error">${e.message}</p>`;
                btn.disabled = false; btn.textContent = "Prenota noleggio";
            }
        },
        async disattiva() {
            if (!confirm("Disattivare questo veicolo? Non sarà più visibile nelle ricerche.")) return;
            const msg = document.getElementById("bookMsg");
            try { await Model.veicolo.disattiva(Model.veicolo.state.veicolo.id); MAV.navigate("/host"); }
            catch (e) { msg.innerHTML = `<p class="msg error">${e.message}</p>`; }
        },
    },

    // ==== rotta "/esperienze" (catalogo) ====
    esperienze: {
        render() {
            MAV.mount("app", View.esperienze.page());
            document.getElementById("searchBtn").addEventListener("click", () => Action.esperienze.cerca());
            Action.esperienze.cerca();
        },
        async cerca() {
            const grid = document.getElementById("grid");
            const resultsBar = document.getElementById("resultsBar");
            resultsBar.hidden = true;
            MAV.mount(grid, View.esperienze.skeletons());
            try {
                const params = {
                    citta: document.getElementById("e-citta").value.trim(),
                    categoria: document.getElementById("e-categoria").value,
                };
                const esperienze = await Model.esperienze.cerca(params);
                MAV.mount(grid, View.esperienze.griglia(esperienze));
                resultsBar.hidden = false;
                document.getElementById("resultsCount").innerHTML = View.esperienze.conteggio(esperienze.length, params.citta);
            } catch (e) {
                MAV.mount(grid, `<p class="msg error">${e.message}</p>`);
            }
        },
    },

    // ==== rotta "/esperienza" ====
    esperienza: {
        async render(params) {
            MAV.mount("app", View.esperienza.page());
            try {
                const e = await Model.esperienza.get(params.id);
                document.title = `SpaceB&B · ${e.titolo}`;
                MAV.mount("detail", View.esperienza.dettaglio(e));
                const user = getUser();
                if (user && e.hostId === user.id) Action.esperienza.mostraOwnerBox(e);
                else Action.esperienza.mostraBookBox(e);
                initScrollReveal();
            } catch (err) {
                MAV.mount("detail", `<p class="msg error">${err.message}</p>`);
            }
        },
        mostraOwnerBox(e) { MAV.delegate(MAV.mount("bookBox", View.esperienza.ownerBox(e)), Action.esperienza); },
        mostraBookBox(e) {
            if (!getToken()) { MAV.mount("bookBox", View.esperienza.bookBoxLogin()); return; }
            if (e.postiDisponibili <= 0) { MAV.mount("bookBox", View.esperienza.bookBoxPieno(e)); return; }
            MAV.delegate(MAV.mount("bookBox", View.esperienza.bookBoxGuest(e)), Action.esperienza);
            const input = document.getElementById("partecipanti");
            input.addEventListener("input", () => Action.esperienza.aggiornaRiepilogo(e));
            Action.esperienza.aggiornaRiepilogo(e);
        },
        aggiornaRiepilogo(e) {
            const n = Math.max(1, Number(document.getElementById("partecipanti").value) || 1);
            document.getElementById("bookSummary").innerHTML = View.esperienza.riepilogo(e, n, n * Number(e.prezzoPersona));
        },
        async prenota() {
            const e = Model.esperienza.state.esperienza;
            const msg = document.getElementById("bookMsg");
            const numPartecipanti = Number(document.getElementById("partecipanti").value);
            if (!numPartecipanti || numPartecipanti < 1) {
                msg.innerHTML = `<p class="msg error">Inserisci un numero di partecipanti valido.</p>`;
                return;
            }
            const btn = document.querySelector('[data-action="prenota"]');
            btn.disabled = true; btn.textContent = "Prenotazione in corso…";
            try {
                const p = await Model.esperienza.prenota({ esperienzaId: e.id, numPartecipanti });
                msg.innerHTML = `<p class="msg ok">Prenotazione creata (#${p.id}) · totale € ${View.esperienza.euro(p.prezzoTotale)} · stato ${p.stato}.</p>`;
                btn.textContent = "Prenotato";
            } catch (err) {
                msg.innerHTML = `<p class="msg error">${err.message}</p>`;
                btn.disabled = false; btn.textContent = "Prenota";
            }
        },
        async disattiva() {
            if (!confirm("Disattivare questa esperienza? Non sarà più visibile nelle ricerche.")) return;
            const msg = document.getElementById("bookMsg");
            try { await Model.esperienza.disattiva(Model.esperienza.state.esperienza.id); MAV.navigate("/host"); }
            catch (err) { msg.innerHTML = `<p class="msg error">${err.message}</p>`; }
        },
    },

    // ==== rotta "/scopri" (guida "Scopri la città") ====
    scopri: {
        async render(params) {
            MAV.mount("app", View.scopri.page());
            const rail = document.getElementById("cityRail");
            const box = document.getElementById("puntiInteresse");
            MAV.delegate(rail, Action.scopri);
            try {
                const cittaTutte = await Model.scopri.cittaDisponibili();
                if (!cittaTutte.length) {
                    rail.hidden = true;
                    MAV.mount(box, `<p class="meta">Nessuna città disponibile al momento.</p>`);
                    return;
                }
                Model.scopri.state.cittaTutte = cittaTutte;
                const nomi = cittaTutte.map(c => c.citta);
                Model.scopri.state.citta = nomi.includes(params.citta) ? params.citta : nomi[0];
                Action.scopri.renderRail();
                Action.scopri.caricaPunti();
            } catch (e) {
                MAV.mount(box, `<p class="msg error">${e.message}</p>`);
            }
        },
        renderRail() {
            MAV.mount("cityRail", View.scopri.cityRail(Model.scopri.state.cittaTutte, Model.scopri.state.citta));
        },
        seleziona(el) {
            Model.scopri.state.citta = el.dataset.citta;
            Action.scopri.renderRail();
            Action.scopri.caricaPunti();
        },
        async caricaPunti() {
            const box = document.getElementById("puntiInteresse");
            const cittaSommario = Model.scopri.state.cittaTutte.find(c => c.citta === Model.scopri.state.citta);
            MAV.mount("cityHero", View.scopri.hero(cittaSommario));
            MAV.mount(box, `<p class="meta">Caricamento…</p>`);
            try {
                MAV.mount(box, View.scopri.griglia(await Model.scopri.punti(Model.scopri.state.citta), Model.scopri.state.citta));
            } catch (e) {
                MAV.mount(box, `<p class="msg error">${e.message}</p>`);
            }
        },
    },

    // ==== rotta "/suggeriti" (proposte di vacanza) ====
    suggeriti: {
        async render() {
            MAV.mount("app", View.suggeriti.page());
            const grid = MAV.mount("grid", View.suggeriti.skeletons());
            try {
                MAV.mount(grid, View.suggeriti.griglia(await Model.suggeriti.tutti()));
            } catch (e) {
                MAV.mount(grid, `<p class="msg error">${e.message}</p>`);
            }
        },
    },

    // ==== rotta "/pacchetto" (una proposta di "Suggeriti", resa prenotabile) ====
    pacchetto: {
        async render(params) {
            MAV.mount("app", View.pacchetto.page());
            MAV.onLeave(distruggiPickerAttivo);
            const body = document.getElementById("pkgBody");
            try {
                const p = await Model.pacchetto.get(params.id);
                Object.assign(Model.pacchetto.state, { pacchetto: p, checkin: null, checkout: null });
                document.title = "SpaceB&B · " + p.titolo;
                MAV.mount("pkgHero", View.pacchetto.hero(p));
                MAV.mount(body, View.pacchetto.corpo(p));
                Model.pacchetto.state.picker = montaSelettoreDate({
                    container: document.getElementById("pkgDateRange"),
                    etichette: {
                        inizio: "Arrivo", fine: "Partenza",
                        hintInizio: "Seleziona il giorno di arrivo",
                        hintFine: "Ora seleziona il giorno di partenza",
                    },
                    onChange: (sel) => Action.pacchetto.cambiaDate(sel),
                });
                Action.pacchetto.caricaAlloggi();
                Action.pacchetto.caricaEsperienze();
            } catch (e) {
                MAV.mount(body, `<p class="msg error">${e.message}</p>`);
            }
        },

        cambiaDate({ checkin, checkout }) {
            Object.assign(Model.pacchetto.state, { checkin, checkout });
            const p = Model.pacchetto.state.pacchetto;
            const hint = document.getElementById("pkgDateHint");
            if (checkin && checkout) {
                const n = dpNotti(checkin, checkout);
                hint.textContent = n === p.durataNotti
                    ? `${View.pacchetto.notti(n)}, esattamente la durata proposta.`
                    : `${View.pacchetto.notti(n)} selezionate; la proposta ne suggerisce ${View.pacchetto.notti(p.durataNotti)}.`;
            } else {
                hint.textContent = `Scegli le date del viaggio: mostriamo solo gli alloggi liberi e le esperienze in programma. La proposta è pensata per ${View.pacchetto.notti(p.durataNotti)}.`;
            }
            Action.pacchetto.caricaAlloggi();
            Action.pacchetto.caricaEsperienze();
        },

        async caricaAlloggi() {
            const box = document.getElementById("pkgAlloggi");
            const { pacchetto: p, checkin, checkout } = Model.pacchetto.state;
            const conDate = !!(checkin && checkout);
            MAV.mount(box, View.suggeriti.skeletons(3));
            try {
                MAV.mount(box, View.pacchetto.grigliaAlloggi(
                    await Model.pacchetto.alloggi(p.citta, checkin, checkout), conDate));
            } catch (e) {
                MAV.mount(box, `<p class="msg error">${e.message}</p>`);
            }
        },

        async caricaEsperienze() {
            const box = document.getElementById("pkgEsperienze");
            const { pacchetto: p, checkin, checkout } = Model.pacchetto.state;
            const conDate = !!(checkin && checkout);
            MAV.mount(box, View.suggeriti.skeletons(3));
            try {
                let list = await Model.pacchetto.esperienze(p.citta);
                // Un'esperienza ha data e ora fisse (non un intervallo): con delle date scelte
                // teniamo solo quelle che ci ricadono dentro, checkout escluso come per le notti.
                if (conDate) list = list.filter(e => {
                    const giorno = String(e.dataOra).slice(0, 10);
                    return giorno >= checkin && giorno < checkout;
                });
                MAV.mount(box, View.pacchetto.grigliaEsperienze(list, conDate));
            } catch (e) {
                MAV.mount(box, `<p class="msg error">${e.message}</p>`);
            }
        },
    },

    // ==== rotta "/preferiti" (wishlist) ====
    wishlist: {
        async render() {
            MAV.mount("app", View.wishlist.page());
            const grid = MAV.mount("grid", View.wishlist.skeletons());
            try {
                const alloggi = await Model.wishlist.preferiti();
                MAV.mount(grid, View.wishlist.griglia(alloggi));
                wireHeartButtons(grid, (id, nowFavorite) => { if (!nowFavorite) Action.wishlist.rimuoviCard(grid, id); });
            } catch (e) {
                MAV.mount(grid, `<p class="msg error">${e.message}</p>`);
            }
        },
        rimuoviCard(grid, id) {
            const card = grid.querySelector(`.stay-card__heart[data-alloggio-id="${id}"]`).closest(".stay-card");
            card.style.transition = "opacity .3s ease";
            card.style.opacity = "0";
            setTimeout(() => {
                card.remove();
                if (!grid.querySelector(".stay-card")) MAV.mount(grid, emptyHtml(View.wishlist.VUOTO));
            }, 300);
        },
    },

    // ==== rotta "/prenotazioni" ====
    prenotazioni: {
        render() {
            MAV.mount("app", View.prenotazioni.page());
            MAV.delegate("mie", Action.prenotazioni);
            MAV.delegate("mieiNoleggi", Action.prenotazioni);
            MAV.delegate("mieEsperienze", Action.prenotazioni);
            Action.prenotazioni.carica();
            Action.prenotazioni.caricaNoleggi();
            Action.prenotazioni.caricaEsperienze();
        },
        async carica() {
            try { MAV.mount("mie", View.prenotazioni.tabella(await Model.prenotazioni.mie())); }
            catch (e) { MAV.mount("mie", `<tr><td colspan="6" class="msg error">${e.message}</td></tr>`); }
        },
        async caricaNoleggi() {
            try { MAV.mount("mieiNoleggi", View.prenotazioni.tabellaNoleggi(await Model.prenotazioni.mieiNoleggi())); }
            catch (e) { MAV.mount("mieiNoleggi", `<tr><td colspan="5" class="msg error">${e.message}</td></tr>`); }
        },
        async caricaEsperienze() {
            try { MAV.mount("mieEsperienze", View.prenotazioni.tabellaEsperienze(await Model.prenotazioni.mieEsperienze())); }
            catch (e) { MAV.mount("mieEsperienze", `<tr><td colspan="6" class="msg error">${e.message}</td></tr>`); }
        },
        async annulla(el) {
            try { await Model.prenotazioni.annulla(Number(el.dataset.id)); Action.prenotazioni.carica(); }
            catch (e) { alert(e.message); }
        },
        async annullaNoleggio(el) {
            try { await Model.prenotazioni.annullaNoleggio(Number(el.dataset.id)); Action.prenotazioni.caricaNoleggi(); }
            catch (e) { alert(e.message); }
        },
        async annullaEsperienza(el) {
            try { await Model.prenotazioni.annullaEsperienza(Number(el.dataset.id)); Action.prenotazioni.caricaEsperienze(); }
            catch (e) { alert(e.message); }
        },

        // ---- Recensione (modale) ----
        recensisci(el) {
            const prenotazioneId = Number(el.dataset.id);
            apriModal(View.prenotazioni.modaleRecensione(el.dataset.titolo), { labelledBy: "recModalTitle" });

            let rating = 0;
            const stars = Array.from(document.querySelectorAll("#starPicker button"));
            const paint = (upTo) => stars.forEach(s => s.classList.toggle("hovered", Number(s.dataset.val) <= upTo));
            stars.forEach(s => {
                s.addEventListener("mouseenter", () => paint(Number(s.dataset.val)));
                s.addEventListener("mouseleave", () => paint(rating));
                s.addEventListener("click", () => {
                    rating = Number(s.dataset.val);
                    stars.forEach(x => x.classList.toggle("active", Number(x.dataset.val) <= rating));
                    paint(rating);
                });
            });

            document.getElementById("recForm").addEventListener("submit", async (e) => {
                e.preventDefault();
                const msg = document.getElementById("recMsg");
                if (!rating) { msg.innerHTML = `<p class="msg error">Seleziona un voto da 1 a 5 stelle.</p>`; return; }
                const btn = e.target.querySelector("button[type=submit]");
                btn.disabled = true; btn.textContent = "Invio…";
                try {
                    await Model.prenotazioni.creaRecensione({ prenotazioneId, rating, commento: document.getElementById("r-commento").value });
                    msg.innerHTML = `<p class="msg ok">Grazie per la recensione!</p>`;
                    btn.remove();
                    Action.prenotazioni.carica();
                    setTimeout(chiudiModal, 1100);
                } catch (err) {
                    msg.innerHTML = `<p class="msg error">${err.message}</p>`;
                    btn.disabled = false; btn.textContent = "Invia recensione";
                }
            });
        },

        // ---- Spese di viaggio (modale) ----
        spese(el) {
            Model.prenotazioni.state.spesePrenId = Number(el.dataset.id);
            const overlay = apriModal(View.prenotazioni.modaleSpese(el.dataset.titolo), { labelledBy: "speseModalTitle" });
            MAV.delegate(overlay, Action.prenotazioni);
            Action.prenotazioni.caricaSpese();

            document.getElementById("speseForm").addEventListener("submit", async (e) => {
                e.preventDefault();
                const msg = document.getElementById("speseMsg");
                const importo = Number(document.getElementById("sp-importo").value);
                if (!importo || importo <= 0) { msg.innerHTML = `<p class="msg error">Inserisci un importo valido.</p>`; return; }
                try {
                    await Model.prenotazioni.aggiungiSpesa(Model.prenotazioni.state.spesePrenId, {
                        categoria: document.getElementById("sp-categoria").value,
                        importo,
                        descrizione: document.getElementById("sp-descrizione").value,
                    });
                    msg.innerHTML = "";
                    document.getElementById("sp-importo").value = "";
                    document.getElementById("sp-descrizione").value = "";
                    Action.prenotazioni.caricaSpese();
                } catch (err) {
                    msg.innerHTML = `<p class="msg error">${err.message}</p>`;
                }
            });
        },
        async caricaSpese() {
            const root = document.getElementById("speseLista");
            if (!root) return;
            try {
                const { spese, totale } = await Model.prenotazioni.spese(Model.prenotazioni.state.spesePrenId);
                MAV.mount(root, View.prenotazioni.tabellaSpese(spese));
                document.getElementById("speseTotale").textContent = `Totale: € ${Number(totale).toFixed(2)}`;
            } catch (e) {
                MAV.mount(root, `<p class="msg error">${e.message}</p>`);
            }
        },
        async eliminaSpesa(el) {
            try {
                await Model.prenotazioni.eliminaSpesa(Model.prenotazioni.state.spesePrenId, Number(el.dataset.id));
                Action.prenotazioni.caricaSpese();
            } catch (e) {
                document.getElementById("speseMsg").innerHTML = `<p class="msg error">${e.message}</p>`;
            }
        },
    },

    // ==== rotta "/profilo" ====
    profilo: {
        EDITABILI: ["p-nome", "p-cognome", "p-telefono"],
        render() {
            MAV.mount("app", View.profilo.page());
            document.getElementById("modificaBtn").addEventListener("click", () => Action.profilo.impostaModalita(true));
            document.getElementById("annullaBtn").addEventListener("click", () => Action.profilo.annulla());
            document.getElementById("datiForm").addEventListener("submit", (e) => Action.profilo.salvaDati(e));
            document.getElementById("pwdForm").addEventListener("submit", (e) => Action.profilo.cambiaPassword(e));
            Action.profilo.carica();
        },
        async carica() {
            try { Action.profilo.popolaCampi(await Model.profilo.get()); }
            catch (e) { document.getElementById("datiMsg").innerHTML = `<p class="msg error">${e.message}</p>`; }
        },
        popolaCampi(p) {
            document.getElementById("p-email").value = p.email;
            document.getElementById("p-registrato").value = View.profilo.dataRegistrazione(p.dataRegistrazione);
            document.getElementById("p-nome").value = p.nome;
            document.getElementById("p-cognome").value = p.cognome;
            document.getElementById("p-telefono").value = p.telefono || "";
        },
        impostaModalita(editabile) {
            Action.profilo.EDITABILI.forEach(id => document.getElementById(id).disabled = !editabile);
            document.getElementById("modificaBtn").hidden = editabile;
            document.getElementById("datiBtn").hidden = !editabile;
            document.getElementById("annullaBtn").hidden = !editabile;
            if (editabile) document.getElementById("p-nome").focus();
        },
        annulla() {
            Action.profilo.popolaCampi(Model.profilo.state.ultimoProfilo);
            document.getElementById("datiMsg").innerHTML = "";
            Action.profilo.impostaModalita(false);
        },
        async salvaDati(e) {
            e.preventDefault();
            const msg = document.getElementById("datiMsg");
            const btn = document.getElementById("datiBtn");
            const original = btn.textContent;
            btn.disabled = true; btn.textContent = "Salvataggio in corso…";
            try {
                const p = await Model.profilo.aggiorna({
                    nome: document.getElementById("p-nome").value,
                    cognome: document.getElementById("p-cognome").value,
                    telefono: document.getElementById("p-telefono").value,
                });
                updateSessionNome(p.nome);
                renderNav();
                Action.profilo.impostaModalita(false);
                msg.innerHTML = `<p class="msg ok">Dati aggiornati.</p>`;
            } catch (err) {
                msg.innerHTML = `<p class="msg error">${err.message}</p>`;
            } finally {
                btn.disabled = false; btn.textContent = original;
            }
        },
        async cambiaPassword(e) {
            e.preventDefault();
            const msg = document.getElementById("pwdMsg");
            const btn = document.getElementById("pwdBtn");
            const original = btn.textContent;
            btn.disabled = true; btn.textContent = "Aggiornamento in corso…";
            try {
                await Model.profilo.cambiaPassword({
                    passwordAttuale: document.getElementById("p-pwd-attuale").value,
                    nuovaPassword: document.getElementById("p-pwd-nuova").value,
                });
                e.target.reset();
                msg.innerHTML = `<p class="msg ok">Password aggiornata.</p>`;
            } catch (err) {
                msg.innerHTML = `<p class="msg error">${err.message}</p>`;
            } finally {
                btn.disabled = false; btn.textContent = original;
            }
        },
    },

    // ==== rotta "/host" (Area host) ====
    host: {
        TAB: {},

        async render(params) {
            // Cosa gestisce l'utente decide quali sezioni mostrare. Un'agenzia partner gestisce solo
            // veicoli e/o esperienze e non ha nulla a che fare con gli alloggi: niente tab alloggi.
            const [alloggi, veicoli, esperienze] = await Promise.all([
                Model.host.mieiAlloggi().catch(() => []),
                Model.host.mieiVeicoli().catch(() => []),
                Model.host.mieEsperienze().catch(() => []),
            ]);
            const haVeicoli = veicoli.length > 0;
            const haEsperienze = esperienze.length > 0;
            const eAgenzia = alloggi.length === 0 && (haVeicoli || haEsperienze);
            // Gli utenti normali (anche senza alloggi) devono poter pubblicare il primo annuncio.
            const flags = { alloggi: !eAgenzia, noleggi: haVeicoli, esperienze: haEsperienze };

            MAV.mount("app", View.host.page(flags));

            // Mappa {tab: idPannello} dei soli pannelli renderizzati (per wireTabs/attivaTab).
            const TAB = {};
            if (flags.alloggi) { TAB.alloggi = "tabAlloggi"; TAB.pubblica = "tabPubblica"; TAB.prenotazioni = "tabPrenotazioni"; }
            if (flags.noleggi) TAB.noleggi = "tabNoleggi";
            if (flags.esperienze) TAB.esperienze = "tabEsperienze";
            Action.host.TAB = TAB;
            wireTabs(TAB);

            if (flags.alloggi) {
                MAV.delegate("c-servizi", Action.host);
                MAV.delegate("c-foto-esistenti", Action.host);
                MAV.delegate("ricevute", Action.host);
                document.getElementById("creaBtn").addEventListener("click", () => Action.host.crea());
                document.getElementById("annullaModificaBtn").addEventListener("click", () => Action.host.annullaModifica());
                await Action.host.caricaServizi();
                Action.host.caricaMiei();
                Action.host.caricaRicevute();
            }
            if (flags.noleggi) { MAV.delegate("noleggiRicevuti", Action.host); Action.host.caricaNoleggiRicevuti(); }
            if (flags.esperienze) { MAV.delegate("esperienzeRicevute", Action.host); Action.host.caricaEsperienzeRicevute(); }

            // Attiva "I miei alloggi" di default per chi ha già pubblicato qualcosa (la gestione conta
            // più della pubblicazione); un host alle prime armi, senza alloggi, atterra invece sul form
            // di pubblicazione perché "I miei alloggi" sarebbe vuoto. Per le agenzie partner (niente tab
            // alloggi) resta il primo tab disponibile tra noleggi/esperienze.
            let primoTab = Object.keys(TAB)[0];
            if (flags.alloggi && alloggi.length === 0) primoTab = "pubblica";
            if (primoTab) attivaTab(primoTab, TAB);

            if (flags.alloggi && params.edit) Action.host.modifica(Number(params.edit));
        },

        // ---- Servizi (chip) ----
        async caricaServizi() {
            try {
                Model.host.state.serviziDisponibili = await Model.host.servizi();
                Action.host.renderServiziChips();
            } catch { /* ignore */ }
        },
        renderServiziChips() {
            MAV.mount("c-servizi", View.host.serviziChips(Model.host.state.serviziDisponibili, Model.host.state.serviziSelezionati));
        },
        toggleServizio(el) {
            const id = Number(el.dataset.id);
            const sel = Model.host.state.serviziSelezionati;
            if (sel.has(id)) sel.delete(id); else sel.add(id);
            el.classList.toggle("active");
        },

        // ---- Foto già caricate ----
        renderFotoEsistenti() {
            document.getElementById("c-foto-esistenti-wrap").hidden = Model.host.state.fotoEsistenti.length === 0;
            MAV.mount("c-foto-esistenti", View.host.fotoEsistenti(Model.host.state.fotoEsistenti));
        },
        async rimuoviFoto(el) {
            if (!Model.host.state.editingId || !confirm("Rimuovere questa foto?")) return;
            const fotoId = Number(el.dataset.id);
            try {
                await Model.host.rimuoviFoto(Model.host.state.editingId, fotoId);
                Model.host.state.fotoEsistenti = Model.host.state.fotoEsistenti.filter(f => f.id !== fotoId);
                Action.host.renderFotoEsistenti();
            } catch (e) {
                document.getElementById("creaMsg").innerHTML = `<p class="msg error">${e.message}</p>`;
            }
        },

        // ---- Form alloggio (pubblica/modifica) ----
        leggiForm() {
            return {
                titolo: document.getElementById("c-titolo").value,
                descrizione: document.getElementById("c-descr").value,
                tipologia: document.getElementById("c-tipologia").value,
                indirizzo: document.getElementById("c-indirizzo").value,
                citta: document.getElementById("c-citta").value,
                paese: "Italia",
                cap: document.getElementById("c-cap").value,
                prezzoNotte: Number(document.getElementById("c-prezzo").value),
                numOspitiMax: Number(document.getElementById("c-ospiti").value),
                numCamere: Number(document.getElementById("c-camere").value),
                numBagni: Number(document.getElementById("c-bagni").value),
                serviziIds: Array.from(Model.host.state.serviziSelezionati),
            };
        },
        salvaFotoNuove(alloggioId) {
            const urls = document.getElementById("c-foto").value.split("\n").map(s => s.trim()).filter(Boolean);
            return Promise.all(urls.map(url => Model.host.aggiungiFoto(alloggioId, { url, didascalia: "", copertina: false })));
        },
        async salvaFotoCaricate(alloggioId) {
            const input = document.getElementById("c-foto-file");
            await Promise.all(Array.from(input.files || []).map(file => Model.host.caricaFoto(alloggioId, file)));
            input.value = "";
        },

        async crea() {
            const msg = document.getElementById("creaMsg");
            const btn = document.getElementById("creaBtn");
            const original = btn.textContent;
            const editingId = Model.host.state.editingId;
            btn.disabled = true; btn.textContent = editingId ? "Salvataggio…" : "Pubblicazione…";
            try {
                if (editingId) {
                    await Model.host.aggiornaAlloggio(editingId, Action.host.leggiForm());
                    await Promise.all([Action.host.salvaFotoNuove(editingId), Action.host.salvaFotoCaricate(editingId)]);
                    msg.innerHTML = `<p class="msg ok">Modifiche salvate.</p>`;
                    Action.host.annullaModifica();
                } else {
                    const creato = await Model.host.creaAlloggio(Action.host.leggiForm());
                    await Promise.all([Action.host.salvaFotoNuove(creato.id), Action.host.salvaFotoCaricate(creato.id)]);
                    msg.innerHTML = `<p class="msg ok">Alloggio pubblicato.</p>`;
                    document.getElementById("c-foto").value = "";
                }
                Action.host.caricaMiei();
                renderNav();
            } catch (e) {
                msg.innerHTML = `<p class="msg error">${e.message}</p>`;
            } finally {
                btn.disabled = false; btn.textContent = Model.host.state.editingId ? "Salva modifiche" : original;
            }
        },

        async modifica(id) {
            try {
                const a = await Model.host.alloggio(id);
                document.getElementById("c-titolo").value = a.titolo;
                document.getElementById("c-tipologia").value = a.tipologia;
                document.getElementById("c-descr").value = a.descrizione || "";
                document.getElementById("c-indirizzo").value = a.indirizzo || "";
                document.getElementById("c-citta").value = a.citta;
                document.getElementById("c-cap").value = a.cap || "";
                document.getElementById("c-prezzo").value = a.prezzoNotte;
                document.getElementById("c-ospiti").value = a.numOspitiMax;
                document.getElementById("c-camere").value = a.numCamere || 0;
                document.getElementById("c-bagni").value = a.numBagni || 0;
                Model.host.state.serviziSelezionati = new Set(a.servizi.map(s => s.id));
                Action.host.renderServiziChips();
                Model.host.state.fotoEsistenti = a.foto || [];
                Action.host.renderFotoEsistenti();
                document.getElementById("c-foto").value = "";

                Model.host.state.editingId = id;
                document.getElementById("formTitle").textContent = "Modifica alloggio";
                document.getElementById("creaBtn").textContent = "Salva modifiche";
                document.getElementById("annullaModificaBtn").hidden = false;
                document.getElementById("creaMsg").innerHTML = "";
                attivaTab("pubblica", Action.host.TAB);
                document.getElementById("formTitle").scrollIntoView({ behavior: "smooth", block: "start" });
            } catch (e) {
                alert(e.message);
            }
        },

        annullaModifica() {
            Model.host.state.editingId = null;
            ["c-titolo", "c-descr", "c-indirizzo", "c-citta", "c-cap", "c-prezzo"].forEach(id => document.getElementById(id).value = "");
            document.getElementById("c-ospiti").value = 2;
            document.getElementById("c-camere").value = 1;
            document.getElementById("c-bagni").value = 1;
            document.getElementById("c-tipologia").value = "INTERO";
            Model.host.state.serviziSelezionati = new Set();
            Action.host.renderServiziChips();
            document.getElementById("c-foto").value = "";
            document.getElementById("c-foto-file").value = "";
            Model.host.state.fotoEsistenti = [];
            Action.host.renderFotoEsistenti();
            document.getElementById("formTitle").textContent = "Pubblica un nuovo alloggio";
            document.getElementById("creaBtn").textContent = "Pubblica";
            document.getElementById("annullaModificaBtn").hidden = true;
        },

        // ---- Liste (I miei ...) ----
        async caricaMiei() {
            try { MAV.mount("miei", View.host.griglia(await Model.host.mieiAlloggi(), View.host.alloggioCard, "Non hai ancora pubblicato nessun alloggio.<br>Usa il modulo qui sopra per pubblicare il primo.")); }
            catch (e) { MAV.mount("miei", `<p class="msg error">${e.message}</p>`); }
        },
        // ---- Tabelle ricevute ----
        async caricaRicevute() {
            try { MAV.mount("ricevute", View.host.tabellaRicevute(await Model.host.ricevuteAlloggi())); }
            catch (e) { MAV.mount("ricevute", `<tr><td colspan="5" class="msg error">${e.message}</td></tr>`); }
        },
        async caricaNoleggiRicevuti() {
            try {
                const [veicoli, prenotazioni] = await Promise.all([Model.host.mieiVeicoli(), Model.host.ricevutiNoleggi()]);
                MAV.mount("noleggiRicevuti", View.host.veicoliRaggruppati(veicoli, prenotazioni));
            } catch (e) { MAV.mount("noleggiRicevuti", `<p class="msg error">${e.message}</p>`); }
        },
        async caricaEsperienzeRicevute() {
            try {
                const [esperienze, prenotazioni] = await Promise.all([Model.host.mieEsperienze(), Model.host.ricevuteEsperienze()]);
                MAV.mount("esperienzeRicevute", View.host.esperienzeRaggruppate(esperienze, prenotazioni));
            } catch (e) { MAV.mount("esperienzeRicevute", `<p class="msg error">${e.message}</p>`); }
        },

        // ---- Cambi di stato (pulsanti delegati nelle tabelle) ----
        confermaAlloggio(el) { Action.host._modera(() => Model.host.confermaAlloggio(Number(el.dataset.id)), Action.host.caricaRicevute); },
        rifiutaAlloggio(el) { Action.host._modera(() => Model.host.rifiutaAlloggio(Number(el.dataset.id)), Action.host.caricaRicevute, "Rifiutare questa prenotazione? Il guest verrà avvisato che l'host non l'ha accettata."); },
        confermaNoleggio(el) { Action.host._modera(() => Model.host.confermaNoleggio(Number(el.dataset.id)), Action.host.caricaNoleggiRicevuti); },
        rifiutaNoleggio(el) { Action.host._modera(() => Model.host.rifiutaNoleggio(Number(el.dataset.id)), Action.host.caricaNoleggiRicevuti, "Rifiutare questo noleggio? Il cliente verrà avvisato che la richiesta non è stata accettata."); },
        confermaEsperienza(el) { Action.host._modera(() => Model.host.confermaEsperienza(Number(el.dataset.id)), Action.host.caricaEsperienzeRicevute); },
        rifiutaEsperienza(el) { Action.host._modera(() => Model.host.rifiutaEsperienza(Number(el.dataset.id)), Action.host.caricaEsperienzeRicevute, "Rifiutare questa prenotazione? Il cliente verrà avvisato che la richiesta non è stata accettata."); },

        async _modera(apiCall, ricarica, messaggioConferma) {
            if (messaggioConferma && !confirm(messaggioConferma)) return;
            try { await apiCall(); ricarica(); }
            catch (e) { alert(e.message); }
        },
    },

    // ==== rotta "/admin" (pannello Amministratore) ====
    admin: {
        TAB: {
            alloggi: "tabAlloggi", recensioni: "tabRecensioni", utenti: "tabUtenti",
            veicoli: "tabVeicoliAdmin", esperienze: "tabEsperienzeAdmin", puntiInteresse: "tabPuntiInteresse",
        },

        render() {
            MAV.mount("app", View.admin.page());
            wireTabs(Action.admin.TAB);
            ["alloggiAdmin", "recensioniAdmin", "utentiAdmin", "veicoliAdmin", "esperienzeAdmin", "puntiInteresseAdmin"]
                .forEach(id => MAV.delegate(id, Action.admin));
            document.getElementById("searchAlloggi").addEventListener("input", () => Action.admin.renderAlloggi());
            document.getElementById("searchRecensioni").addEventListener("input", () => Action.admin.renderRecensioni());
            document.getElementById("searchUtenti").addEventListener("input", () => Action.admin.renderUtenti());
            document.getElementById("searchVeicoli").addEventListener("input", () => Action.admin.renderVeicoli());
            document.getElementById("searchEsperienze").addEventListener("input", () => Action.admin.renderEsperienze());
            document.getElementById("searchPuntiInteresse").addEventListener("input", () => Action.admin.renderPunti());
            document.getElementById("creaPiBtn").addEventListener("click", () => Action.admin.creaPunto());

            Action.admin.carica(Model.admin.caricaAlloggi, "alloggi", Action.admin.renderAlloggi, "alloggiAdmin");
            Action.admin.carica(Model.admin.caricaRecensioni, "recensioni", Action.admin.renderRecensioni, "recensioniAdmin");
            Action.admin.carica(Model.admin.caricaUtenti, "utenti", Action.admin.renderUtenti, "utentiAdmin");
            Action.admin.carica(Model.admin.caricaVeicoli, "veicoli", Action.admin.renderVeicoli, "veicoliAdmin");
            Action.admin.carica(Model.admin.caricaEsperienze, "esperienze", Action.admin.renderEsperienze, "esperienzeAdmin");
            Action.admin.carica(() => Model.admin.caricaPunti(), "punti", Action.admin.renderPunti, "puntiInteresseAdmin");
        },

        async carica(fetchFn, chiave, render, tbodyId) {
            try {
                Model.admin.state[chiave] = await fetchFn.call(Model.admin);
                render();
            } catch (e) {
                MAV.mount(tbodyId, `<tr><td colspan="6" class="msg error">${e.message}</td></tr>`);
            }
        },

        renderAlloggi() {
            const q = document.getElementById("searchAlloggi").value;
            MAV.mount("alloggiAdmin", View.admin.tabellaAlloggi(filtraTesto(Model.admin.state.alloggi, q, a => a.titolo, a => a.hostNome, a => a.citta), Model.admin.state.alloggi.length));
        },
        renderRecensioni() {
            const q = document.getElementById("searchRecensioni").value;
            MAV.mount("recensioniAdmin", View.admin.tabellaRecensioni(filtraTesto(Model.admin.state.recensioni, q, r => r.autoreNome, r => r.commento), Model.admin.state.recensioni.length));
        },
        renderUtenti() {
            const q = document.getElementById("searchUtenti").value;
            MAV.mount("utentiAdmin", View.admin.tabellaUtenti(filtraTesto(Model.admin.state.utenti, q, u => u.nome, u => u.cognome, u => u.email), Model.admin.state.utenti.length, getUser().id));
        },
        renderVeicoli() {
            const q = document.getElementById("searchVeicoli").value;
            MAV.mount("veicoliAdmin", View.admin.tabellaVeicoli(filtraTesto(Model.admin.state.veicoli, q, v => v.marca, v => v.modello, v => v.hostNome, v => v.citta), Model.admin.state.veicoli.length));
        },
        renderEsperienze() {
            const q = document.getElementById("searchEsperienze").value;
            MAV.mount("esperienzeAdmin", View.admin.tabellaEsperienze(filtraTesto(Model.admin.state.esperienze, q, e => e.titolo, e => e.hostNome, e => e.citta), Model.admin.state.esperienze.length));
        },
        renderPunti() {
            const q = document.getElementById("searchPuntiInteresse").value;
            MAV.mount("puntiInteresseAdmin", View.admin.tabellaPunti(filtraTesto(Model.admin.state.punti, q, p => p.citta, p => p.nome), Model.admin.state.punti.length));
        },

        // ---- Moderazione (pulsanti delegati) ----
        disattivaAlloggio(el) { Action.admin._modera(() => Model.admin.disattivaAlloggio(Number(el.dataset.id)), Action.admin.ricaricaAlloggi, "Disattivare questo alloggio? Non sarà più visibile nelle ricerche."); },
        riattivaAlloggio(el) { Action.admin._modera(() => Model.admin.riattivaAlloggio(Number(el.dataset.id)), Action.admin.ricaricaAlloggi); },
        eliminaRecensione(el) { Action.admin._modera(() => Model.admin.eliminaRecensione(Number(el.dataset.id)), Action.admin.ricaricaRecensioni, "Eliminare questa recensione?"); },
        sospendiUtente(el) { Action.admin._modera(() => Model.admin.sospendiUtente(Number(el.dataset.id)), Action.admin.ricaricaUtenti, "Sospendere questo utente? Non potrà più accedere finché non viene riattivato."); },
        riattivaUtente(el) { Action.admin._modera(() => Model.admin.riattivaUtente(Number(el.dataset.id)), Action.admin.ricaricaUtenti); },
        disattivaVeicolo(el) { Action.admin._modera(() => Model.admin.disattivaVeicolo(Number(el.dataset.id)), Action.admin.ricaricaVeicoli, "Disattivare questo veicolo? Non sarà più visibile nelle ricerche."); },
        riattivaVeicolo(el) { Action.admin._modera(() => Model.admin.riattivaVeicolo(Number(el.dataset.id)), Action.admin.ricaricaVeicoli); },
        disattivaEsperienza(el) { Action.admin._modera(() => Model.admin.disattivaEsperienza(Number(el.dataset.id)), Action.admin.ricaricaEsperienze, "Disattivare questa esperienza? Non sarà più visibile nelle ricerche."); },
        riattivaEsperienza(el) { Action.admin._modera(() => Model.admin.riattivaEsperienza(Number(el.dataset.id)), Action.admin.ricaricaEsperienze); },
        eliminaPunto(el) { Action.admin._modera(() => Model.admin.eliminaPunto(Number(el.dataset.id)), Action.admin.ricaricaPunti, "Eliminare questo punto di interesse?"); },

        ricaricaAlloggi() { return Action.admin.carica(Model.admin.caricaAlloggi, "alloggi", Action.admin.renderAlloggi, "alloggiAdmin"); },
        ricaricaRecensioni() { return Action.admin.carica(Model.admin.caricaRecensioni, "recensioni", Action.admin.renderRecensioni, "recensioniAdmin"); },
        ricaricaUtenti() { return Action.admin.carica(Model.admin.caricaUtenti, "utenti", Action.admin.renderUtenti, "utentiAdmin"); },
        ricaricaVeicoli() { return Action.admin.carica(Model.admin.caricaVeicoli, "veicoli", Action.admin.renderVeicoli, "veicoliAdmin"); },
        ricaricaEsperienze() { return Action.admin.carica(Model.admin.caricaEsperienze, "esperienze", Action.admin.renderEsperienze, "esperienzeAdmin"); },
        ricaricaPunti() { return Action.admin.carica(() => Model.admin.caricaPunti(), "punti", Action.admin.renderPunti, "puntiInteresseAdmin"); },

        async _modera(apiCall, ricarica, messaggioConferma) {
            if (messaggioConferma && !confirm(messaggioConferma)) return;
            try { await apiCall(); ricarica(); }
            catch (e) { alert(e.message); }
        },

        async creaPunto() {
            const msg = document.getElementById("piMsg");
            const btn = document.getElementById("creaPiBtn");
            btn.disabled = true;
            try {
                await Model.admin.creaPunto({
                    citta: document.getElementById("pi-citta").value,
                    nome: document.getElementById("pi-nome").value,
                    categoria: document.getElementById("pi-categoria").value,
                    indirizzo: document.getElementById("pi-indirizzo").value,
                    descrizione: document.getElementById("pi-descrizione").value,
                    immagineUrl: document.getElementById("pi-foto").value || null,
                });
                msg.innerHTML = `<p class="msg ok">Punto di interesse aggiunto.</p>`;
                ["pi-citta", "pi-nome", "pi-indirizzo", "pi-descrizione", "pi-foto"].forEach(id => document.getElementById(id).value = "");
                Action.admin.ricaricaPunti();
            } catch (e) {
                msg.innerHTML = `<p class="msg error">${e.message}</p>`;
            } finally {
                btn.disabled = false;
            }
        },
    },

    // ==== rotte "/login" e "/register" ====
    login: {
        render() {
            MAV.mount("app", View.login.page());
            document.getElementById("loginForm").addEventListener("submit", (e) => Action.login.submit(e));
        },
        async submit(e) {
            e.preventDefault();
            const msg = document.getElementById("msg");
            const btn = document.getElementById("loginBtn");
            const original = btn.textContent;
            btn.disabled = true; btn.textContent = "Accesso in corso…";
            try {
                const data = await Model.login.login({
                    email: document.getElementById("email").value,
                    password: document.getElementById("password").value,
                });
                setSession(data);
                // Un'agenzia partner non ha una home da esplorare: va dritta alla sua area di gestione.
                MAV.navigate(isPartner() ? "/host" : "/");
            } catch (err) {
                msg.innerHTML = `<p class="msg error">${err.message}</p>`;
                btn.disabled = false; btn.textContent = original;
            }
        },
    },
    register: {
        render() {
            MAV.mount("app", View.register.page());
            document.getElementById("registerForm").addEventListener("submit", (e) => Action.register.submit(e));
        },
        async submit(e) {
            e.preventDefault();
            const msg = document.getElementById("msg");
            const btn = document.getElementById("regBtn");
            const original = btn.textContent;
            btn.disabled = true; btn.textContent = "Creazione in corso…";
            try {
                const data = await Model.register.registra({
                    nome: document.getElementById("nome").value,
                    cognome: document.getElementById("cognome").value,
                    email: document.getElementById("email").value,
                    telefono: document.getElementById("telefono").value,
                    password: document.getElementById("password").value,
                });
                setSession(data);
                MAV.navigate("/");
            } catch (err) {
                msg.innerHTML = `<p class="msg error">${err.message}</p>`;
                btn.disabled = false; btn.textContent = original;
            }
        },
    },
};
