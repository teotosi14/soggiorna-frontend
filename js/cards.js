// Rendering condiviso delle card annuncio (usato da catalog.js e wishlist.js).
const PIN_ICON = `<svg class="icon" viewBox="0 0 24 24"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.4"/></svg>`;
const SEARCH_ICON = `<svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`;
const EMPTY_ICON = `<svg class="icon" viewBox="0 0 24 24"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"/><path d="M9.5 9.5 14.5 14.5M14.5 9.5 9.5 14.5" opacity=".5"/></svg>`;
const HEART_ICON = `<svg class="icon" viewBox="0 0 24 24" stroke-width="2"><path d="M12 20.5s-7.5-4.6-10-9.3C.5 7.8 2.3 4.5 5.8 4c2-.3 3.9.6 5 2.2A6 6 0 0 1 15.8 4c3.5.5 5.3 3.8 3.8 7.2-2.5 4.7-10 9.3-10 9.3Z"/></svg>`;

function tipologiaLabel(t) {
    return (t || "").replace("_", " ").toLowerCase().replace(/^./, c => c.toUpperCase());
}

/** @param {object} [opts] - { showHeart, isFavorite } per il pulsante preferiti sulla card. */
function cardHtml(a, index, opts = {}) {
    const photoUrl = (a.foto && a.foto.length) ? a.foto[0].url : placeholderPhoto(a.id);
    const heartBtn = opts.showHeart ? `
        <button type="button" class="stay-card__heart${opts.isFavorite ? " active" : ""}"
                data-alloggio-id="${a.id}" aria-pressed="${opts.isFavorite ? "true" : "false"}"
                aria-label="${opts.isFavorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}">
          ${HEART_ICON}
        </button>` : "";
    return `
      <a class="stay-card" href="#/alloggio?id=${a.id}" style="--stagger:${index}"
         aria-label="${a.titolo} — ${a.citta}, ${tipologiaLabel(a.tipologia)}, fino a ${a.numOspitiMax} ospiti, € ${Number(a.prezzoNotte).toFixed(0)} a notte">
        <div class="stay-card__media">
          <img src="${photoUrl}" alt="${a.titolo}" loading="lazy" style="view-transition-name:vt-cover-${a.id}">
          <span class="stay-card__chip">${tipologiaLabel(a.tipologia)}</span>
          ${heartBtn}
        </div>
        <div class="stay-card__body">
          <div class="stay-card__row">
            <h3 style="view-transition-name:vt-title-${a.id}">${a.titolo}</h3>
            <p class="stay-card__price">€ ${Number(a.prezzoNotte).toFixed(0)}<span>/ notte</span></p>
          </div>
          <p class="stay-card__meta">${PIN_ICON} ${a.citta} · fino a ${a.numOspitiMax} ospiti</p>
        </div>
      </a>`;
}

function skeletonHtml() {
    return `<div class="stay-card skeleton" aria-hidden="true">
        <div class="stay-card__media"></div>
        <div class="stay-card__body">
          <div class="sk-line w60"></div>
          <div class="sk-line w40"></div>
          <div class="sk-line w30"></div>
        </div>
      </div>`;
}

function emptyHtml(message) {
    return `<div class="empty-state">${EMPTY_ICON}<p>${message || "Nessun alloggio trovato."}</p></div>`;
}

/** Collega i pulsanti cuore di una griglia gia' renderizzata: click -> aggiungi/rimuovi dai preferiti.
 *  @param {HTMLElement} root - contenitore che include le .stay-card
 *  @param {(alloggioId:number, nowFavorite:boolean)=>void} [onChange] - richiamata dopo la chiamata API riuscita
 */
function wireHeartButtons(root, onChange) {
    root.querySelectorAll(".stay-card__heart").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.preventDefault(); e.stopPropagation();
            const id = btn.dataset.alloggioId;
            const isFav = btn.classList.contains("active");
            btn.disabled = true;
            try {
                if (isFav) await api.rimuoviWishlist(id);
                else await api.aggiungiWishlist(id);
                btn.classList.toggle("active", !isFav);
                btn.setAttribute("aria-pressed", String(!isFav));
                btn.setAttribute("aria-label", !isFav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti");
                if (onChange) onChange(Number(id), !isFav);
            } catch (err) { /* utente non loggato o errore di rete: nessuna azione visibile */ }
            btn.disabled = false;
        });
    });
}
