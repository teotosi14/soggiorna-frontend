// Modale generico riutilizzabile (recensioni, gestione foto...).
let modalPrevFocus = null;

function apriModal(innerHtml, { labelledBy, wide } = {}) {
    chiudiModal();
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "modalOverlay";
    overlay.innerHTML = `
      <div class="modal${wide ? " modal--wide" : ""}" role="dialog" aria-modal="true" ${labelledBy ? `aria-labelledby="${labelledBy}"` : ""}>
        <button type="button" class="modal-close" aria-label="Chiudi">
          <svg class="icon" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
        <div class="modal-body">${innerHtml}</div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    modalPrevFocus = document.activeElement;

    overlay.addEventListener("click", (e) => { if (e.target === overlay) chiudiModal(); });
    overlay.querySelector(".modal-close").addEventListener("click", chiudiModal);
    document.addEventListener("keydown", modalEscListener);

    const firstField = overlay.querySelector("input, textarea, select, button:not(.modal-close)");
    if (firstField) firstField.focus();
    return overlay;
}

function modalEscListener(e) {
    if (e.key === "Escape") chiudiModal();
}

function chiudiModal() {
    const overlay = document.getElementById("modalOverlay");
    if (!overlay) return;
    overlay.remove();
    document.body.style.overflow = "";
    document.removeEventListener("keydown", modalEscListener);
    if (modalPrevFocus) modalPrevFocus.focus();
}
