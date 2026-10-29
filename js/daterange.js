// Selettore di date a calendario, riutilizzato dal box di prenotazione nel dettaglio alloggio
// (con date non disponibili in evidenza), dalla ricerca in homepage e dal noleggio auto. Le
// etichette sono personalizzabili (vedi `etichette`): il soggiorno usa Check-in/Check-out,
// il noleggio Ritiro/Riconsegna.
const DP_MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
                 "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const DP_GIORNI = ["L","M","M","G","V","S","D"];

function dpPad2(n) { return String(n).padStart(2, "0"); }
function dpIso(year, month, day) { return `${year}-${dpPad2(month + 1)}-${dpPad2(day)}`; }
function dpOggiIso() {
    const n = new Date();
    return dpIso(n.getFullYear(), n.getMonth(), n.getDate());
}
function dpGiorniInMese(year, month) { return new Date(year, month + 1, 0).getDate(); }
function dpPrimoOffset(year, month) {
    // getDay(): 0=domenica..6=sabato; vogliamo settimane che iniziano di lunedi'.
    return (new Date(year, month, 1).getDay() + 6) % 7;
}
function dpNotti(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }

/**
 * @param container elemento in cui montare il selettore
 * @param datebloccate array di {dataInizio, dataFine} (dataFine esclusa, stesso criterio del backend)
 * @param minIso data minima selezionabile (default: oggi)
 * @param onChange callback({checkin, checkout})
 * @param iniziale selezione di partenza opzionale {checkin, checkout}, applicata solo se
 *        compatibile con minIso e con le date bloccate (altrimenti ignorata).
 * @param etichette testi personalizzabili: {inizio, fine, hintInizio, hintFine, contaLabel(n)}.
 *        Default pensati per il soggiorno (Check-in/Check-out); il noleggio auto passa
 *        Ritiro/Riconsegna, così i termini "da camera" non compaiono nel contesto veicoli.
 */
function creaSelettoreDate({ container, datebloccate = [], minIso = null, onChange = () => {}, etichette = {}, iniziale = null }) {
    const L = {
        inizio: "Check-in",
        fine: "Check-out",
        hintInizio: "Seleziona la data di check-in",
        hintFine: "Ora seleziona la data di check-out",
        contaLabel: (n) => `${n} nott${n === 1 ? "e" : "i"} selezionate`,
        ...etichette,
    };
    const min = minIso || dpOggiIso();
    const oggi = new Date();
    let viewYear = oggi.getFullYear();
    let viewMonth = oggi.getMonth();
    let checkin = null;
    let checkout = null;

    function bloccata(iso) {
        return datebloccate.some(b => iso >= b.dataInizio && iso < b.dataFine);
    }
    // Un giorno bloccato ricade nell'intervallo [aIso, bIso)? Stessa condizione di sovrapposizione
    // usata dal backend (VR-02/VR-11), cosi' il calendario non propone mai un intervallo che poi
    // il server rifiuterebbe.
    function rangeNonValido(aIso, bIso) {
        return datebloccate.some(b => b.dataInizio < bIso && b.dataFine > aIso);
    }
    // Bugfix: un giorno va disabilitato in modo diverso a seconda che si stia scegliendo il
    // check-in o il check-out. Come CHECK-IN, un giorno bloccato non è mai selezionabile
    // (occuperebbe quella notte). Come CHECK-OUT invece il primo giorno di un blocco è
    // perfettamente valido (non occupa alcuna notte, coerente con bloccata() usata da sola
    // sopra) — prima veniva disabilitato comunque, rendendo non prenotabile un pernottamento
    // che il backend avrebbe accettato.
    function nonSelezionabile(iso) {
        if (iso < min) return true;
        if (!checkin || checkout) return bloccata(iso);
        return iso <= checkin || rangeNonValido(checkin, iso);
    }

    // Selezione di partenza (es. le date scelte nella pagina di un pacchetto e passate in query
    // string): si applica solo se supera gli stessi controlli di una selezione fatta a mano,
    // così un link con date ormai occupate o passate non porta a uno stato non prenotabile.
    if (iniziale && iniziale.checkin && iniziale.checkout
        && iniziale.checkin >= min && iniziale.checkout > iniziale.checkin
        && !bloccata(iniziale.checkin) && !rangeNonValido(iniziale.checkin, iniziale.checkout)) {
        checkin = iniziale.checkin;
        checkout = iniziale.checkout;
        const [y, m] = checkin.split("-").map(Number);
        viewYear = y; viewMonth = m - 1;
    }

    container.innerHTML = `
      <div class="date-picker">
        <button type="button" class="date-picker__trigger" id="dpTrigger">
          <span class="date-picker__field">
            <span class="date-picker__label">${L.inizio}</span>
            <span class="date-picker__value" id="dpCheckinLabel">Aggiungi data</span>
          </span>
          <span class="date-picker__sep" aria-hidden="true"></span>
          <span class="date-picker__field">
            <span class="date-picker__label">${L.fine}</span>
            <span class="date-picker__value" id="dpCheckoutLabel">Aggiungi data</span>
          </span>
        </button>
        <div class="date-picker__panel" id="dpPanel" hidden>
          <div class="date-picker__months" id="dpMonths"></div>
          <div class="date-picker__footer">
            <p class="date-picker__hint meta" id="dpHint"></p>
            <button type="button" class="date-picker__clear" id="dpClear">Cancella date</button>
          </div>
        </div>
      </div>`;

    const root = container.querySelector(".date-picker");
    const trigger = container.querySelector("#dpTrigger");
    const panel = container.querySelector("#dpPanel");
    const monthsBox = container.querySelector("#dpMonths");
    const hint = container.querySelector("#dpHint");
    const checkinLabel = container.querySelector("#dpCheckinLabel");
    const checkoutLabel = container.querySelector("#dpCheckoutLabel");

    function formatta(iso) {
        if (!iso) return "Aggiungi data";
        const [y, m, d] = iso.split("-").map(Number);
        return `${d} ${DP_MESI[m - 1].slice(0, 3)} ${y}`;
    }

    function renderMese(year, month) {
        const nGiorni = dpGiorniInMese(year, month);
        const offset = dpPrimoOffset(year, month);
        let celle = "";
        for (let i = 0; i < offset; i++) celle += `<span class="date-picker__day date-picker__day--empty"></span>`;
        for (let day = 1; day <= nGiorni; day++) {
            const iso = dpIso(year, month, day);
            const disabilitato = nonSelezionabile(iso);
            const selezionato = iso === checkin || iso === checkout;
            const inRange = checkin && checkout && iso > checkin && iso < checkout;
            const classi = ["date-picker__day"];
            if (disabilitato) classi.push("date-picker__day--disabled");
            if (selezionato) classi.push("date-picker__day--selected");
            if (inRange) classi.push("date-picker__day--range");
            if (iso === dpOggiIso()) classi.push("date-picker__day--today");
            celle += `<button type="button" class="${classi.join(" ")}" data-date="${iso}"
                        ${disabilitato ? "disabled" : ""} aria-label="${day} ${DP_MESI[month]} ${year}${disabilitato ? " (non disponibile)" : ""}">${day}</button>`;
        }
        return `
          <div class="date-picker__month">
            <p class="date-picker__month-name">${DP_MESI[month]} ${year}</p>
            <div class="date-picker__weekdays">${DP_GIORNI.map(g => `<span>${g}</span>`).join("")}</div>
            <div class="date-picker__days">${celle}</div>
          </div>`;
    }

    function render() {
        const secondo = viewMonth === 11 ? [viewYear + 1, 0] : [viewYear, viewMonth + 1];
        monthsBox.innerHTML = `
          <button type="button" class="date-picker__nav date-picker__nav--prev" id="dpPrev" aria-label="Mese precedente">
            <svg class="icon" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>
          </button>
          ${renderMese(viewYear, viewMonth)}
          ${renderMese(secondo[0], secondo[1])}
          <button type="button" class="date-picker__nav date-picker__nav--next" id="dpNext" aria-label="Mese successivo">
            <svg class="icon" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
          </button>`;

        const oggiYM = oggi.getFullYear() * 12 + oggi.getMonth();
        const viewYM = viewYear * 12 + viewMonth;
        const prevBtn = monthsBox.querySelector("#dpPrev");
        prevBtn.disabled = viewYM <= oggiYM;
        prevBtn.addEventListener("click", () => spostaMese(-1));
        monthsBox.querySelector("#dpNext").addEventListener("click", () => spostaMese(1));

        monthsBox.querySelectorAll(".date-picker__day:not(.date-picker__day--empty):not([disabled])").forEach(btn => {
            btn.addEventListener("click", () => seleziona(btn.dataset.date));
        });

        checkinLabel.textContent = formatta(checkin);
        checkoutLabel.textContent = formatta(checkout);
        trigger.classList.toggle("date-picker__trigger--filled", !!(checkin || checkout));
        if (!checkin) {
            hint.textContent = L.hintInizio;
        } else if (!checkout) {
            hint.textContent = L.hintFine;
        } else {
            hint.textContent = L.contaLabel(dpNotti(checkin, checkout));
        }
    }

    function spostaMese(dir) {
        viewMonth += dir;
        if (viewMonth < 0) { viewMonth = 11; viewYear--; }
        if (viewMonth > 11) { viewMonth = 0; viewYear++; }
        render();
    }

    function seleziona(iso) {
        if (!checkin || checkout) {
            checkin = iso; checkout = null;
        } else if (iso <= checkin || rangeNonValido(checkin, iso)) {
            checkin = iso; checkout = null;
        } else {
            checkout = iso;
        }
        render();
        onChange({ checkin, checkout });
        if (checkin && checkout) setTimeout(chiudi, 300);
    }

    // Il pannello e' position:absolute sotto il trigger: se il trigger sta in fondo a un contenitore
    // con scroll (es. il modale Disponibilita', piu' alto di 640px con calendario a due mesi), aprendo
    // il pannello questo puo' finire sotto la "piega" senza che nulla lo porti in vista da solo.
    function apri() {
        panel.hidden = false;
        trigger.classList.add("date-picker__trigger--active");
        requestAnimationFrame(() => panel.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    }
    function chiudi() { panel.hidden = true; trigger.classList.remove("date-picker__trigger--active"); }

    trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        panel.hidden ? apri() : chiudi();
    });
    // Listener su document (chiusura al click fuori / Esc): rimossi da destroy() quando il
    // chiamante ricrea il selettore (es. riapertura del modale disponibilità), per non
    // accumularne uno nuovo ad ogni apertura.
    // composedPath(), non e.target: selezionare un giorno chiama render(), che rigenera
    // monthsBox.innerHTML e quindi stacca dal DOM il bottone appena cliccato *prima* che questo
    // click finisca di risalire fino a document. A quel punto root.contains(e.target) darebbe
    // sempre false (il nodo non e' piu' nell'albero) e il pannello si richiuderebbe subito dopo
    // ogni singola selezione, come se il calendario "non rispondesse". composedPath() cattura il
    // percorso al momento del dispatch, prima di qualunque mutazione del DOM.
    const onDocClick = (e) => {
        const path = e.composedPath ? e.composedPath() : [e.target];
        if (!path.includes(root)) chiudi();
    };
    const onDocKeydown = (e) => { if (e.key === "Escape") chiudi(); };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onDocKeydown);
    container.querySelector("#dpClear").addEventListener("click", (e) => {
        e.stopPropagation();
        checkin = null; checkout = null;
        render();
        onChange({ checkin, checkout });
    });

    render();

    return {
        getSelezione: () => ({ checkin, checkout }),
        reset: () => { checkin = null; checkout = null; render(); },
        setDateBloccate: (nuove) => { datebloccate = nuove; render(); },
        destroy: () => {
            document.removeEventListener("click", onDocClick);
            document.removeEventListener("keydown", onDocKeydown);
        },
    };
}

// Gestione del "selettore attivo" a livello di SPA: un solo picker per volta. montaSelettoreDate
// distrugge il precedente prima di crearne uno nuovo; distruggiPickerAttivo() va chiamata in
// MAV.onLeave dalle rotte che montano un picker, così i suoi listener su document non restano appesi.
let _pickerAttivo = null;
function montaSelettoreDate(opts) {
    _pickerAttivo?.destroy();
    _pickerAttivo = creaSelettoreDate(opts);
    return _pickerAttivo;
}
function distruggiPickerAttivo() {
    _pickerAttivo?.destroy();
    _pickerAttivo = null;
}
