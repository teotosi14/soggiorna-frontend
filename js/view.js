// view.js — livello VIEW della SPA (pattern MAV).
// Un unico oggetto `View`, suddiviso per rotta. Funzioni pure: ricevono dati e restituiscono
// stringhe HTML (incluso il markup statico di ogni pagina, in `View.<rotta>.page()`). Nessuna
// chiamata ad `api`, nessun effetto collaterale. Usa i componenti View condivisi globali
// (cards.js: cardHtml/skeletonHtml/emptyHtml/PIN_ICON/tipologiaLabel/wireHeartButtons; api.js: placeholderPhoto).
const View = {

    // ==== rotta "/" (catalogo alloggi) ====
    catalog: {
        page() {
            return `
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Soggiorni selezionati</p>
          <h1>Trova il tuo prossimo <em>soggiorno</em></h1>
          <p class="tagline">Case, stanze e appartamenti unici, scelti città per città, pronti ad accoglierti.</p>
          <div class="search-bar">
            <label for="f-citta" class="sr-only">Città</label>
            <input id="f-citta" placeholder="Città (es. Ferrara)">
            <div id="fDateRange" aria-label="Date del soggiorno"></div>
            <label for="f-ospiti" class="sr-only">Ospiti</label>
            <input id="f-ospiti" type="number" min="1" placeholder="Ospiti">
            <label for="f-prezzo" class="sr-only">Prezzo massimo a notte</label>
            <input id="f-prezzo" type="number" min="0" placeholder="Prezzo max">
            <button class="btn" id="searchBtn">
              <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              Cerca
            </button>
          </div>
          <div class="city-chips" id="cityChips" aria-label="Città popolari">
            <span class="city-chips__label">Popolari:</span>
            <button type="button" data-citta="Roma">Roma</button>
            <button type="button" data-citta="Firenze">Firenze</button>
            <button type="button" data-citta="Venezia">Venezia</button>
            <button type="button" data-citta="Napoli">Napoli</button>
            <button type="button" data-citta="Positano">Positano</button>
            <button type="button" data-citta="Matera">Matera</button>
          </div>
          <p class="hero-stats" id="heroStats"></p>
        </div>
        <div class="hero-visual" aria-hidden="true">
          <img src="https://images.unsplash.com/photo-1583844056361-4418a8f2a985?w=700&q=70&auto=format&fit=crop" alt="">
          <img src="https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=500&q=70&auto=format&fit=crop" alt="">
        </div>
      </section>

      <section class="trust-strip" data-reveal>
        <div class="trust-item">
          <span class="trust-icon"><svg class="icon" viewBox="0 0 24 24"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg></span>
          <div><h3>Recensioni verificate</h3><p>Solo da ospiti che hanno davvero soggiornato.</p></div>
        </div>
        <div class="trust-item">
          <span class="trust-icon"><svg class="icon" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg></span>
          <div><h3>Niente doppie prenotazioni</h3><p>Le date si bloccano automaticamente per ogni alloggio.</p></div>
        </div>
        <div class="trust-item">
          <span class="trust-icon"><svg class="icon" viewBox="0 0 24 24"><path d="M12 3 4 6v6c0 4.5 3.2 7.6 8 9 4.8-1.4 8-4.5 8-9V6l-8-3Z"/></svg></span>
          <div><h3>Pagamento alla conferma</h3><p>Registrato solo quando l'host accetta la prenotazione.</p></div>
        </div>
        <div class="trust-item">
          <span class="trust-icon"><svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5 14.5 14.5M14.5 9.5 9.5 14.5"/></svg></span>
          <div><h3>Cancellazione flessibile</h3><p>Annulla una prenotazione dalla tua area personale.</p></div>
        </div>
      </section>

      <div class="results-bar" id="resultsBar" hidden><p class="count" id="resultsCount"></p></div>
      <div class="grid" id="grid" aria-live="polite"></div>`;
        },
        skeletons(n = 6) { return Array.from({ length: n }).map(skeletonHtml).join(""); },
        griglia(alloggi, { loggato, wishlistIds }) {
            return alloggi.length
                ? alloggi.map((a, i) => cardHtml(a, i, { showHeart: loggato, isFavorite: wishlistIds.has(a.id) })).join("")
                : emptyHtml("Nessun alloggio trovato per questa ricerca.<br>Prova a modificare città, ospiti o prezzo massimo.");
        },
        conteggio(n, citta) { return n ? `<strong>${n}</strong> alloggi disponibili${citta ? ` a ${citta}` : ""}` : ""; },
        statistiche({ alloggi, citta }) { return `<strong>${alloggi}</strong> alloggi in <strong>${citta}</strong> città in tutta Italia`; },
    },

    // ==== rotta "/alloggio" ====
    alloggio: {
        PIN_ICON: `<svg class="icon" viewBox="0 0 24 24"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.4"/></svg>`,
        notte(v) { return Number(v).toFixed(2); },
        tipologiaLabel(t) { return (t || "").replace("_", " ").toLowerCase().replace(/^./, c => c.toUpperCase()); },

        page() { return `<div id="detail"></div>`; },

        gallery(a, coverUrl) {
            if (!a.foto || a.foto.length < 2) return "";
            return `<div class="gallery-strip">${a.foto.map((f, i) => `
                <button class="thumb${f.url === coverUrl ? " active" : ""}" data-action="thumb" data-url="${f.url}" aria-label="Foto ${i + 1} di ${a.titolo}">
                  <img src="${f.url}" alt="" loading="lazy">
                </button>`).join("")}</div>`;
        },

        dettaglio(a) {
            const servizi = a.servizi.map(s => `<span>${s.nome}</span>`).join("");
            const photoUrl = (a.foto && a.foto.length) ? a.foto[0].url : placeholderPhoto(a.id);
            return `
          <div class="detail-layout">
            <div class="detail-main">
              <div class="detail-cover" style="background-image:url('${photoUrl}');view-transition-name:vt-cover-${a.id}"></div>
              ${View.alloggio.gallery(a, photoUrl)}
              <h1 data-reveal style="view-transition-name:vt-title-${a.id}">${a.titolo}</h1>
              <p class="meta">${View.alloggio.PIN_ICON} ${a.citta}${a.indirizzo ? " · " + a.indirizzo : ""} · ${View.alloggio.tipologiaLabel(a.tipologia)}</p>
              <p data-reveal>${a.descrizione || ""}</p>
              <p><strong>€ ${View.alloggio.notte(a.prezzoNotte)}</strong> / notte · fino a ${a.numOspitiMax} ospiti
                 · ${a.numCamere || "?"} camere · ${a.numBagni || "?"} bagni</p>
              <div class="chips">${servizi}</div>
              <div class="host-card" data-reveal>
                <span class="host-avatar" aria-hidden="true">${(a.hostNome || "?").charAt(0).toUpperCase()}</span>
                <div>
                  <p class="host-label">Ospitato da</p>
                  <p class="host-name">${a.hostNome || "Host"}</p>
                </div>
              </div>
              <h2 class="section-title" data-reveal>Cosa fare a ${a.citta}</h2>
              <ul class="activity-list" data-reveal id="attivitaCitta"><li class="meta">Caricamento…</li></ul>
              <h2 class="section-title" data-reveal>Recensioni</h2>
              <div id="recensioni" aria-live="polite">Caricamento…</div>
            </div>
            <aside class="detail-side"><div id="bookBox"></div></aside>
          </div>`;
        },

        ownerBox(a) {
            return `
      <div class="book-box">
        <p class="book-box__price"><strong>€ ${View.alloggio.notte(a.prezzoNotte)}</strong><span> / notte</span></p>
        <p class="meta">Questo è un tuo annuncio${a.attivo ? "" : " (disattivato)"}.</p>
        <button class="btn" data-action="modifica" style="width:100%;margin-top:16px">Modifica</button>
        <button class="btn secondary" data-action="disponibilita" style="width:100%;margin-top:10px">Disponibilità</button>
        ${a.attivo
            ? `<button class="btn secondary" data-action="disattiva" style="width:100%;margin-top:10px">Disattiva</button>`
            : `<button class="btn secondary" data-action="riattiva" style="width:100%;margin-top:10px">Riattiva</button>`}
        <div id="bookMsg" aria-live="polite"></div>
      </div>`;
        },

        bookBoxLogin() { return `<p class="msg">Per prenotare o salvare, <a href="#/login">accedi</a>.</p>`; },

        bookBoxNonDisponibile() { return `<div class="book-box"><p class="msg">Questo alloggio non è più disponibile.</p></div>`; },

        bookBoxGuest(a, salvato) {
            return `
      <div class="book-box">
        <p class="book-box__price"><strong>€ ${View.alloggio.notte(a.prezzoNotte)}</strong><span> / notte</span></p>
        <label>Date del soggiorno</label>
        <div id="dateRangeHost"></div>
        <label for="ospiti" style="margin-top:14px">Ospiti</label>
        <input type="number" id="ospiti" min="1" max="${a.numOspitiMax}" value="1">
        <p class="meta" style="margin:6px 0 0">Fino a ${a.numOspitiMax} ospiti</p>
        <div class="book-box__summary" id="bookSummary" hidden></div>
        <button class="btn" id="prenotaBtn" data-action="prenota" style="width:100%;margin-top:16px" disabled>Seleziona le date</button>
        <button class="btn secondary" id="wishBtn" data-action="wish" style="width:100%;margin-top:10px">${View.alloggio.wishLabel(salvato)}</button>
        <div id="bookMsg" aria-live="polite"></div>
      </div>`;
        },

        wishLabel(salvato) { return salvato ? "♥ Rimuovi dai preferiti" : "♡ Salva nei preferiti"; },

        riepilogo(a, notti, totale) {
            return `
          <div class="book-box__summary-row"><span>€ ${View.alloggio.notte(a.prezzoNotte)} × ${notti} nott${notti === 1 ? "e" : "i"}</span><span>€ ${View.alloggio.notte(totale)}</span></div>
          <div class="book-box__summary-row book-box__summary-total"><span>Totale</span><span>€ ${View.alloggio.notte(totale)}</span></div>`;
        },

        attivita(punti, citta) {
            return punti.length
                ? punti.slice(0, 6).map(p => `<li>${View.alloggio.PIN_ICON} ${p.nome}</li>`).join("")
                    + `<li class="meta"><a href="#/scopri?citta=${encodeURIComponent(citta)}">Scopri di più su ${citta} →</a></li>`
                : `<li class="meta">Nessun suggerimento disponibile per ${citta} al momento.</li>`;
        },

        recensioni(rec) {
            return rec.length
                ? rec.map(r => `<div class="card review-card">
                      <span class="stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span>
                      — ${r.autoreNome} <span class="review-meta">(${r.data})</span>
                      <p style="margin:6px 0 0">${r.commento || ""}</p></div>`).join("")
                : "<p class='meta'>Ancora nessuna recensione.</p>";
        },

        dispModal(a) {
            return `
      <h2 id="dispModalTitle">Disponibilità di "${a.titolo}"</h2>
      <p class="meta">Blocca periodi in cui l'alloggio non è prenotabile: verranno esclusi anche dalla ricerca per date.</p>
      <div id="dispMsg" aria-live="polite"></div>
      <div id="dispLista" class="foto-gallery" style="margin:14px 0"></div>
      <div class="form" style="max-width:none">
        <label>Nuovo periodo da bloccare</label>
        <div id="dispDateRange"></div>
        <button class="btn" type="button" id="dispAggiungiBtn" data-action="aggiungiPeriodo" style="margin-top:14px" disabled>Seleziona le date</button>
      </div>`;
        },

        dispLista(periodi) {
            return periodi.length
                ? periodi.map(d => `
                    <div class="foto-gallery__item foto-gallery__item--text">
                      <span>${d.dataInizio} → ${d.dataFine}</span>
                      <button type="button" class="foto-gallery__remove" data-action="rimuoviPeriodo" data-id="${d.id}" aria-label="Rimuovi periodo">×</button>
                    </div>`).join("")
                : `<p class="meta">Nessun periodo bloccato.</p>`;
        },
    },

    // ==== rotta "/noleggio" (catalogo veicoli) ====
    noleggio: {
        page() {
            return `
      <h1>Noleggio auto</h1>
      <p class="meta">Hai bisogno di un'auto durante il tuo viaggio? La nostra agenzia partner mette a disposizione una flotta assicurata e sempre revisionata, pronta al ritiro nella tua città.</p>
      <div class="search-bar" style="margin:20px 0">
        <label for="v-citta" class="sr-only">Città</label>
        <input id="v-citta" placeholder="Città (es. Roma)">
        <label for="v-tipo" class="sr-only">Tipo</label>
        <select id="v-tipo">
          <option value="">Tutti i tipi</option>
          <option value="UTILITARIA">Utilitaria</option>
          <option value="BERLINA">Berlina</option>
          <option value="SUV">SUV</option>
          <option value="MONOVOLUME">Monovolume</option>
          <option value="CABRIO">Cabrio</option>
          <option value="FURGONE">Furgone</option>
        </select>
        <label for="v-cambio" class="sr-only">Cambio</label>
        <select id="v-cambio">
          <option value="">Cambio (tutti)</option>
          <option value="MANUALE">Manuale</option>
          <option value="AUTOMATICO">Automatico</option>
        </select>
        <div id="vDateRange" aria-label="Date del noleggio"></div>
        <button class="btn" id="searchBtn">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          Cerca
        </button>
      </div>
      <div class="results-bar" id="resultsBar" hidden><p class="count" id="resultsCount"></p></div>
      <div class="grid" id="grid" aria-live="polite"></div>`;
        },
        tipoLabel(t) { return (t || "").toLowerCase().replace(/^./, c => c.toUpperCase()); },
        skeletons(n = 6) { return Array.from({ length: n }).map(skeletonHtml).join(""); },
        card(v, index) {
            const img = v.immagineUrl || placeholderPhoto(v.id);
            return `
      <a class="stay-card" href="#/veicolo?id=${v.id}" style="--stagger:${index}">
        <div class="stay-card__media">
          <img src="${img}" alt="${v.marca} ${v.modello}" loading="lazy">
          <span class="stay-card__chip">${View.noleggio.tipoLabel(v.tipo)}</span>
        </div>
        <div class="stay-card__body">
          <div class="stay-card__row">
            <h3>${v.marca} ${v.modello}</h3>
            <p class="stay-card__price">€ ${Number(v.prezzoGiorno).toFixed(0)}<span>/ giorno</span></p>
          </div>
          <p class="stay-card__meta">${PIN_ICON} ${v.citta} · ${v.posti} posti · ${v.cambio === "AUTOMATICO" ? "Automatico" : "Manuale"}</p>
        </div>
      </a>`;
        },
        griglia(veicoli) {
            return veicoli.length
                ? veicoli.map((v, i) => View.noleggio.card(v, i)).join("")
                : emptyHtml("Nessun veicolo trovato per questa ricerca.<br>Prova a modificare città, tipo o date.");
        },
        conteggio(n, citta) { return n ? `<strong>${n}</strong> veicoli disponibili${citta ? ` a ${citta}` : ""}` : ""; },
    },

    // ==== rotta "/veicolo" ====
    veicolo: {
        PIN_ICON: `<svg class="icon" viewBox="0 0 24 24"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.4"/></svg>`,
        euro(v) { return Number(v).toFixed(2); },
        tipoLabel(t) { return (t || "").toLowerCase().replace(/^./, c => c.toUpperCase()); },

        page() { return `<div id="detail"></div>`; },

        dettaglio(v) {
            const img = v.immagineUrl || placeholderPhoto(v.id);
            return `
          <div class="detail-layout">
            <div class="detail-main">
              <div class="detail-cover" style="background-image:url('${img}')"></div>
              <h1 data-reveal>${v.marca} ${v.modello}</h1>
              <p class="meta">${View.veicolo.PIN_ICON} ${v.citta} · ${View.veicolo.tipoLabel(v.tipo)} · ${v.anno}</p>
              <p><strong>€ ${View.veicolo.euro(v.prezzoGiorno)}</strong> / giorno · ${v.posti} posti · cambio ${v.cambio === "AUTOMATICO" ? "automatico" : "manuale"}</p>
              <div class="host-card" data-reveal>
                <span class="host-avatar" aria-hidden="true">${(v.hostNome || "?").charAt(0).toUpperCase()}</span>
                <div>
                  <p class="host-label">Agenzia partner</p>
                  <p class="host-name">${v.hostNome || "Agenzia"}</p>
                </div>
              </div>
            </div>
            <aside class="detail-side"><div id="bookBox"></div></aside>
          </div>`;
        },

        ownerBox(v) {
            return `
      <div class="book-box">
        <p class="book-box__price"><strong>€ ${View.veicolo.euro(v.prezzoGiorno)}</strong><span> / giorno</span></p>
        <p class="meta">Questo è un tuo veicolo${v.attivo ? "" : " (disattivato)"}.</p>
        ${v.attivo ? `<button class="btn secondary" data-action="disattiva" style="width:100%;margin-top:10px">Disattiva</button>` : ""}
        <div id="bookMsg" aria-live="polite"></div>
      </div>`;
        },

        bookBoxLogin() { return `<p class="msg">Per noleggiare, <a href="#/login">accedi</a>.</p>`; },

        bookBoxGuest(v) {
            return `
      <div class="book-box">
        <p class="book-box__price"><strong>€ ${View.veicolo.euro(v.prezzoGiorno)}</strong><span> / giorno</span></p>
        <label>Date del noleggio</label>
        <div id="dateRangeVeicolo"></div>
        <div class="book-box__summary" id="bookSummary" hidden></div>
        <button class="btn" id="prenotaBtn" data-action="prenota" style="width:100%;margin-top:16px" disabled>Seleziona le date</button>
        <div id="bookMsg" aria-live="polite"></div>
      </div>`;
        },

        riepilogo(v, giorni, totale) {
            return `
          <div class="book-box__summary-row"><span>€ ${View.veicolo.euro(v.prezzoGiorno)} × ${giorni} giorn${giorni === 1 ? "o" : "i"}</span><span>€ ${View.veicolo.euro(totale)}</span></div>
          <div class="book-box__summary-row book-box__summary-total"><span>Totale</span><span>€ ${View.veicolo.euro(totale)}</span></div>`;
        },
    },

    // ==== rotta "/esperienze" (catalogo) ====
    esperienze: {
        TICKET_ICON: `<svg class="icon" viewBox="0 0 24 24"><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z"/></svg>`,
        page() {
            return `
      <h1>Esplora esperienze</h1>
      <p class="meta">Tour, corsi, degustazioni ed escursioni organizzati dai nostri partner locali.</p>
      <div class="search-bar" style="margin:20px 0">
        <label for="e-citta" class="sr-only">Città</label>
        <input id="e-citta" placeholder="Città (es. Firenze)">
        <label for="e-categoria" class="sr-only">Categoria</label>
        <select id="e-categoria">
          <option value="">Tutte le categorie</option>
          <option value="TOUR">Tour</option>
          <option value="CORSO">Corso</option>
          <option value="DEGUSTAZIONE">Degustazione</option>
          <option value="ESCURSIONE">Escursione</option>
          <option value="SPORT">Sport</option>
          <option value="ALTRO">Altro</option>
        </select>
        <button class="btn" id="searchBtn">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          Cerca
        </button>
      </div>
      <div class="results-bar" id="resultsBar" hidden><p class="count" id="resultsCount"></p></div>
      <div class="grid" id="grid" aria-live="polite"></div>`;
        },
        categoriaLabel(c) { return (c || "").toLowerCase().replace(/^./, ch => ch.toUpperCase()); },
        dataOra(iso) {
            const d = new Date(iso);
            return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" }) + " · "
                 + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
        },
        skeletons(n = 6) { return Array.from({ length: n }).map(skeletonHtml).join(""); },
        card(e, index) {
            const img = e.immagineUrl || placeholderPhoto(e.id);
            return `
      <a class="stay-card" href="#/esperienza?id=${e.id}" style="--stagger:${index}">
        <div class="stay-card__media">
          <img src="${img}" alt="${e.titolo}" loading="lazy">
          <span class="stay-card__chip">${View.esperienze.categoriaLabel(e.categoria)}</span>
          ${e.postiDisponibili <= 0 ? `<span class="badge-soldout stay-card__soldout">SOLD OUT</span>` : ""}
        </div>
        <div class="stay-card__body">
          <div class="stay-card__row">
            <h3>${e.titolo}</h3>
            <p class="stay-card__price">€ ${Number(e.prezzoPersona).toFixed(0)}<span>/ persona</span></p>
          </div>
          <p class="stay-card__meta">${PIN_ICON} ${e.citta} · ${View.esperienze.dataOra(e.dataOra)}</p>
          <p class="stay-card__meta">${View.esperienze.TICKET_ICON} ${e.postiDisponibili <= 0 ? "Al completo" : `${e.postiDisponibili} post${e.postiDisponibili === 1 ? "o" : "i"} disponibil${e.postiDisponibili === 1 ? "e" : "i"}`}</p>
        </div>
      </a>`;
        },
        griglia(esperienze) {
            return esperienze.length
                ? esperienze.map((e, i) => View.esperienze.card(e, i)).join("")
                : emptyHtml("Nessuna esperienza trovata per questa ricerca.<br>Prova a modificare città o categoria.");
        },
        conteggio(n, citta) { return n ? `<strong>${n}</strong> esperienze disponibili${citta ? ` a ${citta}` : ""}` : ""; },
    },

    // ==== rotta "/esperienza" ====
    esperienza: {
        PIN_ICON: `<svg class="icon" viewBox="0 0 24 24"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.4"/></svg>`,
        CLOCK_ICON: `<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
        euro(v) { return Number(v).toFixed(2); },
        categoriaLabel(c) { return (c || "").toLowerCase().replace(/^./, ch => ch.toUpperCase()); },
        dataOra(iso) {
            const d = new Date(iso);
            return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + " alle "
                 + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
        },

        page() { return `<div id="detail"></div>`; },

        dettaglio(e) {
            const img = e.immagineUrl || placeholderPhoto(e.id);
            return `
          <div class="detail-layout">
            <div class="detail-main">
              <div class="detail-cover" style="background-image:url('${img}')"></div>
              <h1 data-reveal>${e.titolo}</h1>
              <p class="meta">${View.esperienza.PIN_ICON} ${e.citta} · ${View.esperienza.categoriaLabel(e.categoria)}</p>
              <p class="meta">${View.esperienza.CLOCK_ICON} ${View.esperienza.dataOra(e.dataOra)} · durata ${e.durataOre}h</p>
              <p data-reveal>${e.descrizione || ""}</p>
              <p><strong>€ ${View.esperienza.euro(e.prezzoPersona)}</strong> / persona · ${e.postiDisponibili} di ${e.postiMax} posti disponibili</p>
              <div class="host-card" data-reveal>
                <span class="host-avatar" aria-hidden="true">${(e.hostNome || "?").charAt(0).toUpperCase()}</span>
                <div>
                  <p class="host-label">Organizzata da</p>
                  <p class="host-name">${e.hostNome || "Host"}</p>
                </div>
              </div>
            </div>
            <aside class="detail-side"><div id="bookBox"></div></aside>
          </div>`;
        },

        ownerBox(e) {
            return `
      <div class="book-box">
        <p class="book-box__price"><strong>€ ${View.esperienza.euro(e.prezzoPersona)}</strong><span> / persona</span></p>
        <p class="meta">Questa è una tua esperienza${e.attivo ? "" : " (disattivata)"}.</p>
        ${e.attivo ? `<button class="btn secondary" data-action="disattiva" style="width:100%;margin-top:10px">Disattiva</button>` : ""}
        <div id="bookMsg" aria-live="polite"></div>
      </div>`;
        },

        bookBoxLogin() { return `<p class="msg">Per prenotare, <a href="#/login">accedi</a>.</p>`; },

        bookBoxPieno(e) {
            return `
          <div class="book-box book-box--soldout">
            <p class="book-box__price"><strong>€ ${View.esperienza.euro(e.prezzoPersona)}</strong><span> / persona</span></p>
            <p class="badge-soldout badge-soldout--lg">SOLD OUT</p>
            <p class="meta" style="text-align:center;margin-top:8px">Esperienza al completo: nessun posto disponibile.</p>
          </div>`;
        },

        bookBoxGuest(e) {
            return `
      <div class="book-box">
        <p class="book-box__price"><strong>€ ${View.esperienza.euro(e.prezzoPersona)}</strong><span> / persona</span></p>
        <label for="partecipanti">Numero di partecipanti</label>
        <input type="number" id="partecipanti" min="1" max="${e.postiDisponibili}" value="1">
        <p class="meta" style="margin:6px 0 0">${e.postiDisponibili} posti disponibili</p>
        <div class="book-box__summary" id="bookSummary"></div>
        <button class="btn" data-action="prenota" style="width:100%;margin-top:16px">Prenota</button>
        <div id="bookMsg" aria-live="polite"></div>
      </div>`;
        },

        riepilogo(e, n, totale) {
            return `
          <div class="book-box__summary-row"><span>€ ${View.esperienza.euro(e.prezzoPersona)} × ${n} partecipant${n === 1 ? "e" : "i"}</span><span>€ ${View.esperienza.euro(totale)}</span></div>
          <div class="book-box__summary-row book-box__summary-total"><span>Totale</span><span>€ ${View.esperienza.euro(totale)}</span></div>`;
        },
    },

    // ==== rotta "/scopri" (guida "Scopri la città") ====
    scopri: {
        PIN_ICON: `<svg class="icon" viewBox="0 0 24 24"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.4"/></svg>`,
        CATEGORIA_LABEL: {
            MONUMENTO: "Monumento", RISTORANTE: "Ristorante", EVENTO: "Evento",
            NEGOZIO: "Negozio", NATURA: "Natura", ALTRO: "Altro",
        },
        // Una riga di presentazione per città, per l'intestazione della città selezionata.
        CITTA_BLURB: {
            Ferrara: "La città delle biciclette e del Rinascimento estense, tra mura intatte e atmosfere sospese.",
            Firenze: "La culla del Rinascimento: arte, cupole e vicoli da attraversare a piedi in ogni stagione.",
            "Greve in Chianti": "Il cuore del Chianti, tra vigneti, cantine storiche e borghi di pietra.",
            Roma: "Duemila anni di storia in ogni angolo, dalla Roma imperiale a quella dei quartieri più vivi.",
            Venezia: "Una città sull'acqua unica al mondo, da scoprire tra calli, canali e isole della laguna.",
            Napoli: "Autentica e vulcanica, tra centro storico UNESCO, pizza leggendaria e il Golfo sullo sfondo.",
            Positano: "Terrazze colorate a picco sul mare: il cuore della Costiera Amalfitana.",
            Milano: "Moda, design e vita notturna, con un centro storico che sorprende chi non se lo aspetta.",
            Palermo: "Mercati rumorosi, mosaici bizantini e una storia di conquiste scritta in ogni pietra.",
            Cagliari: "Spiagge urbane, quartieri storici in collina e panorami sul golfo più bello di Sardegna.",
            Torino: "Eleganza sabauda, portici infiniti e la migliore tradizione di cioccolato d'Italia.",
            Riomaggiore: "Il primo dei borghi delle Cinque Terre, sospeso tra vigne terrazzate e mare cristallino.",
            Lecce: "La \"Firenze del Sud\", capitale di un barocco scolpito nella pietra dorata locale.",
            Bologna: "La Dotta, la Grassa, la Rossa: università, cibo e portici UNESCO a perdita d'occhio.",
            Verona: "Romantica per definizione, tra l'Arena, Giulietta e le rive dell'Adige.",
            Siena: "Medievale nell'anima, con la piazza più scenografica d'Italia e le colline del Chianti intorno.",
            Taormina: "Balcone naturale sullo Ionio, con l'Etna sullo sfondo e la Sicilia più elegante ai piedi.",
            Genova: "La Superba: caruggi, mare e uno dei centri storici medievali più grandi d'Europa.",
            Matera: "Città della roccia, tra i Sassi patrimonio UNESCO e un paesaggio che sembra fuori dal tempo.",
        },
        page() {
            return `
      <h1>Scopri la città</h1>
      <p class="meta">Una guida curata su cosa fare e vedere nelle città in cui trovi i nostri alloggi.</p>
      <div class="city-rail" id="cityRail" aria-label="Scegli una città"></div>
      <div id="cityHero"></div>
      <div id="puntiInteresse" aria-live="polite"></div>`;
        },
        cityRail(cittaTutte, selezionata) {
            return cittaTutte.map((c, i) => `
      <button type="button" class="city-rail__item${c.citta === selezionata ? " active" : ""}"
              data-action="seleziona" data-citta="${c.citta}" style="--stagger:${i}"
              aria-pressed="${c.citta === selezionata ? "true" : "false"}">
        <img src="${c.immagineUrl || placeholderPhoto(i)}" alt="${c.citta}" loading="lazy">
        <span>${c.citta}</span>
      </button>`).join("");
        },
        hero(cittaSommario) {
            if (!cittaSommario) return "";
            const blurb = View.scopri.CITTA_BLURB[cittaSommario.citta] || "Una guida curata su cosa fare e vedere in città.";
            return `
      <div class="city-hero">
        <img src="${cittaSommario.immagineUrl || placeholderPhoto(cittaSommario.numeroPunti)}" alt="">
        <div class="city-hero__scrim"></div>
        <div class="city-hero__content">
          <h2>${cittaSommario.citta}</h2>
          <p>${blurb}</p>
          <span class="city-hero__count">${cittaSommario.numeroPunti} cose da fare</span>
        </div>
      </div>`;
        },
        cardPunto(p, index) {
            const img = p.immagineUrl || placeholderPhoto(p.id);
            return `
      <div class="info-card" style="--stagger:${index}">
        <div class="info-card__media">
          <img src="${img}" alt="${p.nome}" loading="lazy">
          <span class="info-card__chip">${View.scopri.CATEGORIA_LABEL[p.categoria] || p.categoria}</span>
        </div>
        <div class="info-card__body">
          <h3 class="info-card__title">${p.nome}</h3>
          ${p.indirizzo ? `<p class="info-card__meta">${View.scopri.PIN_ICON} ${p.indirizzo}</p>` : ""}
          ${p.descrizione ? `<p class="info-card__desc">${p.descrizione}</p>` : ""}
        </div>
      </div>`;
        },
        griglia(punti, citta) {
            return punti.length
                ? `<div class="grid">${punti.map((p, i) => View.scopri.cardPunto(p, i)).join("")}</div>`
                : `<p class="meta">Nessun punto di interesse per ${citta} al momento.</p>`;
        },
    },

    // ==== rotta "/suggeriti" (proposte di vacanza) ====
    suggeriti: {
        CATEGORIA_LABEL: {
            CITTA_ARTE: "Città d'arte", MARE: "Mare", ROMANTICO: "Romantico", RELAX: "Relax",
            AVVENTURA: "Avventura", ENOGASTRONOMIA: "Enogastronomia", FAMIGLIA: "Famiglia",
        },
        page() {
            return `
      <h1>Suggeriti per te</h1>
      <p class="meta">Idee di vacanza curate dal nostro team: destinazioni, durata e prezzo indicativo per iniziare a sognare il prossimo viaggio.</p>
      <div class="grid" id="grid" aria-live="polite" style="margin-top:20px"></div>`;
        },
        skeletons(n = 6) { return Array.from({ length: n }).map(skeletonHtml).join(""); },
        card(p, index) {
            const img = p.immagineUrl || placeholderPhoto(p.id);
            const notti = p.durataNotti === 1 ? "1 notte" : `${p.durataNotti} notti`;
            return `
      <div class="info-card" style="--stagger:${index}">
        <div class="info-card__media">
          <img src="${img}" alt="${p.titolo}" loading="lazy">
          <span class="info-card__chip">${View.suggeriti.CATEGORIA_LABEL[p.categoria] || p.categoria}</span>
        </div>
        <div class="info-card__body">
          <div class="info-card__row">
            <h3 class="info-card__title">${p.titolo}</h3>
            <p class="info-card__price">€ ${Number(p.prezzoIndicativo).toFixed(0)}<span> / pacchetto</span></p>
          </div>
          <p class="info-card__meta">${PIN_ICON} ${p.citta} · ${notti}</p>
          <p class="info-card__subtitle">${p.sottotitolo}</p>
          <p class="info-card__desc">${p.descrizione || ""}</p>
          <p class="info-card__footer"><a class="btn small" href="#/pacchetto?id=${p.id}">Vedi il viaggio e prenota</a></p>
        </div>
      </div>`;
        },
        griglia(pacchetti) {
            return pacchetti.length
                ? pacchetti.map((p, i) => View.suggeriti.card(p, i)).join("")
                : emptyHtml("Nessuna proposta disponibile al momento.");
        },
    },

    // ==== rotta "/pacchetto" (una proposta di "Suggeriti", resa prenotabile) ====
    // PACCHETTO_VACANZA non ha chiavi esterne verso alloggi/esperienze: è contenuto editoriale
    // legato a una città. Questa pagina usa quella città per mostrare ciò che in quella
    // destinazione si può davvero prenotare, con le date scelte qui propagate al box di
    // prenotazione del singolo alloggio.
    pacchetto: {
        page() {
            return `
      <p class="meta"><a href="#/suggeriti">&larr; Tutte le proposte</a></p>
      <div id="pkgHero"></div>
      <div id="pkgBody"></div>`;
        },
        notti(n) { return n === 1 ? "1 notte" : `${n} notti`; },
        hero(p) {
            const img = p.immagineUrl || placeholderPhoto(p.id);
            return `
      <div class="city-hero">
        <img src="${img}" alt="${p.titolo}">
        <div class="city-hero__scrim"></div>
        <div class="city-hero__content">
          <h2>${p.titolo}</h2>
          <p>${p.sottotitolo}</p>
          <span class="city-hero__count">${p.citta} · ${View.pacchetto.notti(p.durataNotti)} · prezzo indicativo € ${Number(p.prezzoIndicativo).toFixed(0)}</span>
        </div>
      </div>`;
        },
        corpo(p) {
            return `
      ${p.descrizione ? `<p class="pkg-desc">${p.descrizione}</p>` : ""}
      <div class="pkg-datebar">
        <div id="pkgDateRange" aria-label="Date del viaggio"></div>
        <p class="meta" id="pkgDateHint">Scegli le date del viaggio: mostriamo solo gli alloggi liberi e le esperienze in programma. La proposta è pensata per ${View.pacchetto.notti(p.durataNotti)}.</p>
      </div>

      <h2 class="pkg-section">Dove dormire a ${p.citta}</h2>
      <div class="grid" id="pkgAlloggi" aria-live="polite"></div>

      <h2 class="pkg-section">Cosa fare a ${p.citta}</h2>
      <div class="grid" id="pkgEsperienze" aria-live="polite"></div>`;
        },
        // Le date scelte viaggiano nella query string, così il box di prenotazione dell'alloggio
        // si apre già compilato invece di farle riselezionare.
        queryDate() {
            const { checkin, checkout } = Model.pacchetto.state;
            return (checkin && checkout) ? `&checkin=${checkin}&checkout=${checkout}` : "";
        },
        cardAlloggio(a, index) {
            const img = (a.foto && a.foto.length) ? a.foto[0].url : placeholderPhoto(a.id);
            return `
      <div class="info-card" style="--stagger:${index}">
        <div class="info-card__media">
          <img src="${img}" alt="${a.titolo}" loading="lazy">
          <span class="info-card__chip">${tipologiaLabel(a.tipologia)}</span>
        </div>
        <div class="info-card__body">
          <div class="info-card__row">
            <h3 class="info-card__title">${a.titolo}</h3>
            <p class="info-card__price">€ ${Number(a.prezzoNotte).toFixed(0)}<span>/ notte</span></p>
          </div>
          <p class="info-card__meta">${PIN_ICON} ${a.citta} · fino a ${a.numOspitiMax} ospiti</p>
          ${a.descrizione ? `<p class="info-card__desc">${a.descrizione}</p>` : ""}
          <p class="info-card__footer">
            <a class="btn small" href="#/alloggio?id=${a.id}${View.pacchetto.queryDate()}">Vedi e prenota</a>
          </p>
        </div>
      </div>`;
        },
        cardEsperienza(e, index) {
            const img = e.immagineUrl || placeholderPhoto(e.id);
            const esaurita = e.postiDisponibili <= 0;
            return `
      <div class="info-card" style="--stagger:${index}">
        <div class="info-card__media">
          <img src="${img}" alt="${e.titolo}" loading="lazy">
          <span class="info-card__chip">${View.esperienze.categoriaLabel(e.categoria)}</span>
          ${esaurita ? `<span class="badge-soldout stay-card__soldout">SOLD OUT</span>` : ""}
        </div>
        <div class="info-card__body">
          <div class="info-card__row">
            <h3 class="info-card__title">${e.titolo}</h3>
            <p class="info-card__price">€ ${Number(e.prezzoPersona).toFixed(0)}<span>/ persona</span></p>
          </div>
          <p class="info-card__meta">${View.esperienze.TICKET_ICON} ${View.esperienze.dataOra(e.dataOra)} · ${e.durataOre}h · ${esaurita ? "esaurita" : `${e.postiDisponibili} posti liberi`}</p>
          ${e.descrizione ? `<p class="info-card__desc">${e.descrizione}</p>` : ""}
          <p class="info-card__footer">
            <a class="btn small${esaurita ? " secondary" : ""}" href="#/esperienza?id=${e.id}">${esaurita ? "Vedi dettagli" : "Vedi e prenota"}</a>
          </p>
        </div>
      </div>`;
        },
        grigliaAlloggi(list, conDate) {
            if (list.length) return list.map((a, i) => View.pacchetto.cardAlloggio(a, i)).join("");
            return emptyHtml(conDate
                ? "Nessun alloggio libero in queste date. Prova a cambiarle."
                : "Nessun alloggio disponibile in questa destinazione.");
        },
        grigliaEsperienze(list, conDate) {
            if (list.length) return list.map((e, i) => View.pacchetto.cardEsperienza(e, i)).join("");
            return emptyHtml(conDate
                ? "Nessuna esperienza in programma nelle date scelte."
                : "Nessuna esperienza in programma in questa destinazione.");
        },
    },

    // ==== rotta "/preferiti" (wishlist) ====
    wishlist: {
        VUOTO: "Non hai ancora salvato nessun alloggio.<br>Esplora il catalogo e clicca sul cuore per aggiungerlo qui.",
        page() { return `<h1>I tuoi preferiti</h1><div class="grid" id="grid" aria-live="polite"></div>`; },
        skeletons(n = 3) { return Array.from({ length: n }).map(skeletonHtml).join(""); },
        griglia(alloggi) {
            return alloggi.length
                ? alloggi.map((a, i) => cardHtml(a, i, { showHeart: true, isFavorite: true })).join("")
                : emptyHtml(View.wishlist.VUOTO);
        },
    },

    // ==== rotta "/prenotazioni" ====
    prenotazioni: {
        STAR_ICON: `<svg class="icon" viewBox="0 0 24 24"><path d="M12 2.5l3 6.5 7 .9-5.1 4.8 1.4 6.9L12 17.9 5.7 21.6l1.4-6.9L2 9.9l7-.9Z"/></svg>`,
        CATEGORIE_SPESA: { TRASPORTI: "Trasporti", CIBO: "Cibo", ATTIVITA: "Attività", SHOPPING: "Shopping", ALTRO: "Altro" },

        page() {
            return `
      <h1>Le mie prenotazioni</h1>

      <h2 class="section-title" data-reveal>Soggiorni</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Alloggio</th><th>Date</th><th>Ospiti</th><th>Totale</th><th>Stato</th><th></th></tr></thead>
          <tbody id="mie" aria-live="polite"></tbody>
        </table>
      </div>

      <h2 class="section-title" data-reveal style="margin-top:36px">Auto noleggiate</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Veicolo</th><th>Ritiro → Riconsegna</th><th>Totale</th><th>Stato</th><th></th></tr></thead>
          <tbody id="mieiNoleggi" aria-live="polite"></tbody>
        </table>
      </div>

      <h2 class="section-title" data-reveal style="margin-top:36px">Esperienze prenotate</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Esperienza</th><th>Data</th><th>Partecipanti</th><th>Totale</th><th>Stato</th><th></th></tr></thead>
          <tbody id="mieEsperienze" aria-live="polite"></tbody>
        </table>
      </div>`;
        },

        tabella(list) {
            return list.length
                ? list.map(p => `<tr>
                     <td data-label="Alloggio"><a href="#/alloggio?id=${p.alloggioId}">${p.alloggioTitolo}</a></td>
                     <td data-label="Date">${p.dataCheckin} → ${p.dataCheckout}</td>
                     <td data-label="Ospiti">${p.numOspiti}</td>
                     <td data-label="Totale">€ ${Number(p.prezzoTotale).toFixed(2)}</td>
                     <td data-label="Stato"><span class="badge ${p.stato}">${p.stato}</span>${p.motivoAnnullamento ? `<br><span class="meta">${p.motivoAnnullamento}</span>` : ""}</td>
                     <td>${View.prenotazioni.azioni(p)}</td></tr>`).join("")
                : `<tr><td colspan="6" class="meta">Nessuna prenotazione.</td></tr>`;
        },

        // Tabelle "lato cliente": le auto che ho noleggiato e le esperienze che ho prenotato.
        // L'utente non pubblica auto/esperienze: qui le vede soltanto e può annullare quelle ancora aperte.
        tabellaNoleggi(list) {
            return list.length
                ? list.map(p => `<tr>
                     <td data-label="Veicolo"><a href="#/veicolo?id=${p.veicoloId}">${p.veicoloMarca} ${p.veicoloModello}</a></td>
                     <td data-label="Ritiro → Riconsegna">${p.dataRitiro} → ${p.dataRiconsegna}</td>
                     <td data-label="Totale">€ ${Number(p.prezzoTotale).toFixed(2)}</td>
                     <td data-label="Stato"><span class="badge ${p.stato}">${p.stato}</span></td>
                     <td>${["IN_ATTESA", "CONFERMATA"].includes(p.stato) ? `<button class="btn small secondary" data-action="annullaNoleggio" data-id="${p.id}">Annulla</button>` : ""}</td>
                   </tr>`).join("")
                : `<tr><td colspan="5" class="meta">Non hai noleggiato ancora nessuna auto.</td></tr>`;
        },

        tabellaEsperienze(list) {
            return list.length
                ? list.map(p => `<tr>
                     <td data-label="Esperienza"><a href="#/esperienza?id=${p.esperienzaId}">${p.esperienzaTitolo}</a></td>
                     <td data-label="Data">${new Date(p.esperienzaDataOra).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                     <td data-label="Partecipanti">${p.numPartecipanti}</td>
                     <td data-label="Totale">€ ${Number(p.prezzoTotale).toFixed(2)}</td>
                     <td data-label="Stato"><span class="badge ${p.stato}">${p.stato}</span></td>
                     <td>${["IN_ATTESA", "CONFERMATA"].includes(p.stato) ? `<button class="btn small secondary" data-action="annullaEsperienza" data-id="${p.id}">Annulla</button>` : ""}</td>
                   </tr>`).join("")
                : `<tr><td colspan="6" class="meta">Non hai prenotato ancora nessuna esperienza.</td></tr>`;
        },

        azioni(p) {
            const parti = [];
            if (["IN_ATTESA", "CONFERMATA"].includes(p.stato))
                parti.push(`<button class="btn small secondary" data-action="annulla" data-id="${p.id}">Annulla</button>`);
            if (["CONFERMATA", "COMPLETATA"].includes(p.stato))
                parti.push(`<button class="btn small secondary" data-action="spese" data-id="${p.id}" data-titolo="${p.alloggioTitolo}">Spese</button>`);
            if (p.stato === "COMPLETATA" && !p.recensito)
                parti.push(`<button class="btn small" data-action="recensisci" data-id="${p.id}" data-titolo="${p.alloggioTitolo}">Recensisci</button>`);
            if (p.stato === "COMPLETATA" && p.recensito)
                parti.push(`<span class="meta">Recensito</span>`);
            return parti.join(" ");
        },

        modaleRecensione(titolo) {
            return `
      <h2 id="recModalTitle">Recensisci "${titolo}"</h2>
      <form id="recForm" class="form">
        <div id="recMsg" aria-live="polite"></div>
        <label>Voto</label>
        <div class="star-picker" id="starPicker">
          ${[1, 2, 3, 4, 5].map(n => `<button type="button" data-val="${n}" aria-label="${n} stelle">${View.prenotazioni.STAR_ICON}</button>`).join("")}
        </div>
        <label for="r-commento">Commento (facoltativo)</label>
        <textarea id="r-commento" rows="4" placeholder="Com'è andato il soggiorno?"></textarea>
        <button class="btn" type="submit" style="margin-top:18px">Invia recensione</button>
      </form>`;
        },

        modaleSpese(titolo) {
            return `
      <h2 id="speseModalTitle">Spese per "${titolo}"</h2>
      <div id="speseMsg" aria-live="polite"></div>
      <div id="speseLista" class="table-wrap" style="margin:14px 0"></div>
      <p id="speseTotale" class="meta" style="font-weight:600"></p>
      <form id="speseForm" class="form" style="max-width:none;margin-top:10px">
        <div class="form-grid">
          <div><label for="sp-categoria">Categoria</label>
            <select id="sp-categoria">${Object.entries(View.prenotazioni.CATEGORIE_SPESA).map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select>
          </div>
          <div><label for="sp-importo">Importo (€)</label><input id="sp-importo" type="number" min="0" step="0.01"></div>
          <div class="full"><label for="sp-descrizione">Descrizione (facoltativa)</label><input id="sp-descrizione" placeholder="Es. Cena in centro"></div>
          <div class="full"><button class="btn" type="submit">Aggiungi spesa</button></div>
        </div>
      </form>`;
        },

        tabellaSpese(spese) {
            return spese.length
                ? `<table><thead><tr><th>Categoria</th><th>Descrizione</th><th>Importo</th><th></th></tr></thead>
                     <tbody>${spese.map(s => `<tr>
                       <td data-label="Categoria">${View.prenotazioni.CATEGORIE_SPESA[s.categoria] || s.categoria}</td>
                       <td data-label="Descrizione">${s.descrizione || ""}</td>
                       <td data-label="Importo">€ ${Number(s.importo).toFixed(2)}</td>
                       <td><button class="btn small secondary" data-action="eliminaSpesa" data-id="${s.id}">Elimina</button></td>
                     </tr>`).join("")}</tbody></table>`
                : `<p class="meta">Nessuna spesa registrata.</p>`;
        },
    },

    // ==== rotta "/profilo" ====
    profilo: {
        dataRegistrazione(iso) { return new Date(iso).toLocaleDateString("it-IT"); },
        page() {
            return `
      <h1>Il tuo profilo</h1>

      <h2 class="section-title" data-reveal>Dati personali</h2>
      <div class="form" style="max-width:none;margin:0 0 2rem">
        <div id="datiMsg" aria-live="polite"></div>
        <form id="datiForm" novalidate>
          <div class="form-grid">
            <div><label for="p-email">Email</label><input id="p-email" type="email" disabled></div>
            <div><label for="p-registrato">Registrato dal</label><input id="p-registrato" disabled></div>
            <div><label for="p-nome">Nome</label><input id="p-nome" autocomplete="given-name" disabled required></div>
            <div><label for="p-cognome">Cognome</label><input id="p-cognome" autocomplete="family-name" disabled required></div>
            <div><label for="p-telefono">Telefono</label><input id="p-telefono" type="tel" autocomplete="tel" disabled></div>
            <div class="full">
              <button class="btn" id="modificaBtn" type="button">Modifica</button>
              <button class="btn" id="datiBtn" type="submit" hidden>Salva modifiche</button>
              <button class="btn secondary" id="annullaBtn" type="button" hidden>Annulla</button>
            </div>
          </div>
        </form>
      </div>

      <h2 class="section-title" data-reveal>Cambia password</h2>
      <div class="form" style="max-width:none;margin:0">
        <div id="pwdMsg" aria-live="polite"></div>
        <form id="pwdForm" novalidate>
          <div class="form-grid">
            <div><label for="p-pwd-attuale">Password attuale</label><input id="p-pwd-attuale" type="password" autocomplete="current-password" required></div>
            <div><label for="p-pwd-nuova">Nuova password</label><input id="p-pwd-nuova" type="password" autocomplete="new-password" placeholder="almeno 6 caratteri" minlength="6" required></div>
            <div class="full">
              <button class="btn" id="pwdBtn" type="submit">Aggiorna password</button>
            </div>
          </div>
        </form>
      </div>`;
        },
    },

    // ==== rotta "/host" (Area host / Area partner) ====
    host: {
        // Le sezioni mostrate dipendono da cosa gestisce l'utente: gli host pubblicano alloggi,
        // i partner (agenzie) gestiscono solo noleggi e/o esperienze e non vedono i tab alloggi.
        // flags = { alloggi, noleggi, esperienze }; i pannelli partono tutti "hidden", il primo
        // tab presente viene attivato via JS (Action.host.render).
        SEZIONE_ALLOGGI: `
      <section id="tabPubblica" class="tab-panel" role="tabpanel" hidden>
        <h2 class="section-title" data-reveal id="formTitle">Pubblica un nuovo alloggio</h2>
        <div class="form" style="max-width:none;margin:0">
          <div id="creaMsg" aria-live="polite"></div>
          <div class="form-grid">
            <div><label for="c-titolo">Titolo</label><input id="c-titolo"></div>
            <div><label for="c-tipologia">Tipologia</label>
              <select id="c-tipologia">
                <option value="INTERO">Intero</option>
                <option value="STANZA_PRIVATA">Stanza privata</option>
                <option value="STANZA_CONDIVISA">Stanza condivisa</option>
              </select>
            </div>
            <div class="full"><label for="c-descr">Descrizione</label><textarea id="c-descr" rows="3"></textarea></div>
            <div><label for="c-indirizzo">Indirizzo</label><input id="c-indirizzo"></div>
            <div><label for="c-citta">Città</label><input id="c-citta"></div>
            <div><label for="c-cap">CAP</label><input id="c-cap"></div>
            <div><label for="c-prezzo">Prezzo a notte (€)</label><input id="c-prezzo" type="number" min="0"></div>
            <div><label for="c-ospiti">Ospiti max</label><input id="c-ospiti" type="number" min="1" value="2"></div>
            <div><label for="c-camere">Camere</label><input id="c-camere" type="number" min="0" value="1"></div>
            <div><label for="c-bagni">Bagni</label><input id="c-bagni" type="number" min="0" value="1"></div>
            <div class="full"><label id="c-servizi-label">Servizi</label>
              <div id="c-servizi" class="chip-select" role="group" aria-labelledby="c-servizi-label"></div>
            </div>
            <div class="full" id="c-foto-esistenti-wrap" hidden>
              <label>Foto già caricate</label>
              <div id="c-foto-esistenti" class="foto-gallery"></div>
            </div>
            <div class="full"><label for="c-foto-file">Carica foto dal computer</label>
              <input type="file" id="c-foto-file" accept="image/jpeg,image/png,image/webp,image/gif" multiple>
            </div>
            <div class="full"><label for="c-foto">Oppure aggiungi altre foto tramite URL (una per riga)</label>
              <textarea id="c-foto" rows="3" placeholder="https://esempio.com/foto1.jpg"></textarea>
            </div>
            <div class="full">
              <button class="btn" id="creaBtn">Pubblica</button>
              <button class="btn secondary" id="annullaModificaBtn" hidden type="button">Annulla modifica</button>
            </div>
          </div>
        </div>
      </section>

      <section id="tabAlloggi" class="tab-panel" role="tabpanel" hidden>
        <h2 class="section-title" data-reveal>I miei alloggi</h2>
        <div class="grid" id="miei" aria-live="polite"></div>
      </section>

      <section id="tabPrenotazioni" class="tab-panel" role="tabpanel" hidden>
        <h2 class="section-title" data-reveal>Prenotazioni ricevute</h2>
        <div class="table-wrap">
        <table><thead><tr><th>Alloggio</th><th>Date</th><th>Totale</th><th>Stato</th><th></th></tr></thead>
          <tbody id="ricevute"></tbody></table>
        </div>
      </section>`,

        SEZIONE_NOLEGGI: `
      <section id="tabNoleggi" class="tab-panel" role="tabpanel" hidden>
        <h2 class="section-title" data-reveal>Noleggi ricevuti</h2>
        <div id="noleggiRicevuti" aria-live="polite"></div>
      </section>`,

        SEZIONE_ESPERIENZE: `
      <section id="tabEsperienze" class="tab-panel" role="tabpanel" hidden>
        <h2 class="section-title" data-reveal>Esperienze ricevute</h2>
        <div id="esperienzeRicevute" aria-live="polite"></div>
      </section>`,

        page(flags) {
            flags = flags || { alloggi: true, noleggi: false, esperienze: false };
            const tab = (nome, controls, label) =>
                `<button class="tab-btn" data-tab="${nome}" role="tab" aria-selected="false" aria-controls="${controls}">${label}</button>`;
            const tabs = [];
            const panels = [];
            if (flags.alloggi) {
                tabs.push(tab("alloggi", "tabAlloggi", "I miei alloggi"));
                tabs.push(tab("pubblica", "tabPubblica", "Pubblica alloggio"));
                tabs.push(tab("prenotazioni", "tabPrenotazioni", "Prenotazioni ricevute"));
                panels.push(View.host.SEZIONE_ALLOGGI);
            }
            if (flags.noleggi) {
                tabs.push(tab("noleggi", "tabNoleggi", "Noleggi ricevuti"));
                panels.push(View.host.SEZIONE_NOLEGGI);
            }
            if (flags.esperienze) {
                tabs.push(tab("esperienze", "tabEsperienze", "Esperienze ricevute"));
                panels.push(View.host.SEZIONE_ESPERIENZE);
            }
            const partner = !flags.alloggi;
            const titolo = partner ? "Gestione prenotazioni" : "Area host";
            const sottotitolo = partner
                ? "Accetta o rifiuta le richieste di prenotazione dei tuoi clienti."
                : "Pubblica i tuoi alloggi e gestisci le prenotazioni che ricevi.";
            // Con una sola sezione la barra dei tab è superflua: si mostra direttamente il pannello.
            const barraTab = tabs.length > 1
                ? `<div class="tabs" role="tablist" aria-label="Sezioni">\n        ${tabs.join("\n        ")}\n      </div>`
                : "";
            return `
      <h1>${titolo}</h1>
      <p class="meta" style="margin:-4px 0 18px">${sottotitolo}</p>
      ${barraTab}
      ${panels.join("\n")}`;
        },

        serviziChips(servizi, selezionati) {
            return servizi.map(s => `
        <button type="button" class="${selezionati.has(s.id) ? "active" : ""}" data-action="toggleServizio" data-id="${s.id}">${s.nome}</button>
    `).join("");
        },

        fotoEsistenti(foto) {
            return foto.map(f => `
        <div class="foto-gallery__item foto-gallery__item--photo">
          <img src="${f.url}" alt="${f.didascalia || ""}" loading="lazy">
          ${f.copertina ? `<span class="foto-gallery__cover-badge">Copertina</span>` : ""}
          <button type="button" class="foto-gallery__remove" data-action="rimuoviFoto" data-id="${f.id}" aria-label="Rimuovi foto">×</button>
        </div>`).join("");
        },

        alloggioCard(a, index) {
            const photoUrl = (a.foto && a.foto.length) ? a.foto[0].url : placeholderPhoto(a.id);
            return `
      <div class="stay-card host-card-item" style="--stagger:${index}">
        <a href="#/alloggio?id=${a.id}">
          <div class="stay-card__media">
            <img src="${photoUrl}" alt="${a.titolo}" loading="lazy">
            <span class="stay-card__chip">${tipologiaLabel(a.tipologia)}</span>
            ${!a.attivo ? '<span class="host-card-item__status">Disattivato</span>' : ""}
          </div>
          <div class="stay-card__body">
            <div class="stay-card__row">
              <h3>${a.titolo}</h3>
              <p class="stay-card__price">€ ${Number(a.prezzoNotte).toFixed(0)}<span>/ notte</span></p>
            </div>
            <p class="stay-card__meta">${PIN_ICON} ${a.citta}</p>
          </div>
        </a>
      </div>`;
        },

        griglia(items, renderCard, vuotoMsg) {
            return items.length ? items.map((it, i) => renderCard(it, i)).join("") : emptyHtml(vuotoMsg);
        },

        azioniAttesa(id, azioneConf, azioneRif) {
            return `<button class="btn small" data-action="${azioneConf}" data-id="${id}">Conferma</button>
                    <button class="btn small secondary" data-action="${azioneRif}" data-id="${id}">Rifiuta</button>`;
        },

        tabellaRicevute(list) {
            return list.length
                ? list.map(p => `<tr>
                     <td data-label="Alloggio">${p.alloggioTitolo}</td>
                     <td data-label="Date">${p.dataCheckin} → ${p.dataCheckout}</td>
                     <td data-label="Totale">€ ${Number(p.prezzoTotale).toFixed(2)}</td>
                     <td data-label="Stato"><span class="badge ${p.stato}">${p.stato}</span></td>
                     <td>${p.stato === "IN_ATTESA" ? View.host.azioniAttesa(p.id, "confermaAlloggio", "rifiutaAlloggio") : ""}</td>
                   </tr>`).join("")
                : `<tr><td colspan="5" class="meta">Nessuna prenotazione ricevuta.</td></tr>`;
        },

        // Noleggi raggruppati per veicolo: compaiono solo i veicoli con almeno una prenotazione;
        // ognuno mostra foto, dati e i periodi in cui l'auto è gia' occupata (prenotazioni confermate).
        // `veicoli` (mieiVeicoli) arricchisce con foto/citta'/prezzo; `prenotazioni` è la lista ricevuta.
        veicoliRaggruppati(veicoli, prenotazioni) {
            const perId = new Map((veicoli || []).map(v => [v.id, v]));
            const gruppi = new Map();
            (prenotazioni || []).forEach(p => {
                if (!gruppi.has(p.veicoloId)) gruppi.set(p.veicoloId, []);
                gruppi.get(p.veicoloId).push(p);
            });
            if (gruppi.size === 0) return `<p class="meta">Nessun noleggio ricevuto.</p>`;
            const primaData = (id) => gruppi.get(id).map(p => p.dataRitiro).sort()[0];
            const ids = [...gruppi.keys()].sort((a, b) => new Date(primaData(a)) - new Date(primaData(b)));
            return ids.map(id => View.host.gruppoVeicolo(perId.get(id), gruppi.get(id))).join("");
        },

        gruppoVeicolo(v, prenotazioni) {
            const primo = prenotazioni[0];
            const titolo = v ? `${v.marca} ${v.modello}` : `${primo.veicoloMarca} ${primo.veicoloModello}`;
            const img = (v && v.immagineUrl) || placeholderPhoto(v ? v.id : primo.veicoloId);
            const fmt = (d) => new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
            const inAttesa = prenotazioni.filter(p => p.stato === "IN_ATTESA").length;
            // L'auto è indisponibile nei periodi già confermati (VR-17): li mostriamo nell'intestazione.
            const occupati = prenotazioni.filter(p => p.stato === "CONFERMATA")
                .sort((a, b) => (a.dataRitiro < b.dataRitiro ? -1 : 1))
                .map(p => `${fmt(p.dataRitiro)} → ${fmt(p.dataRiconsegna)}`);
            const stato = occupati.length
                ? `<span class="meta">Non disponibile: ${occupati.join(" · ")}</span>`
                : `<span class="meta">Nessun periodo confermato</span>`;
            const meta = v ? `${v.citta} · ${v.anno} · € ${Number(v.prezzoGiorno).toFixed(0)}/giorno` : "";
            const righe = prenotazioni.map(p => `<tr>
                     <td data-label="Periodo">${fmt(p.dataRitiro)} → ${fmt(p.dataRiconsegna)}</td>
                     <td data-label="Totale">€ ${Number(p.prezzoTotale).toFixed(2)}</td>
                     <td data-label="Stato"><span class="badge ${p.stato}">${p.stato}</span></td>
                     <td>${p.stato === "IN_ATTESA" ? View.host.azioniAttesa(p.id, "confermaNoleggio", "rifiutaNoleggio") : ""}</td>
                   </tr>`).join("");
            return `
      <div class="book-group">
        <div class="book-group__head">
          <img class="book-group__img" src="${img}" alt="${titolo}" loading="lazy">
          <div class="book-group__info">
            <h3>${titolo}${v && v.attivo === false ? ` <span class="meta">(disattivato)</span>` : ""}</h3>
            <p class="meta">${meta}</p>
            <p class="book-group__stato">${stato}${inAttesa ? ` <span class="meta">·</span> <strong>${inAttesa} da gestire</strong>` : ""}</p>
          </div>
        </div>
        <div class="table-wrap">
          <table><thead><tr><th>Periodo</th><th>Totale</th><th>Stato</th><th></th></tr></thead>
            <tbody>${righe}</tbody></table>
        </div>
      </div>`;
        },

        // Prenotazioni esperienze raggruppate per esperienza: compaiono solo le esperienze che hanno
        // almeno una prenotazione; ognuna mostra foto, capienza e l'elenco delle sue richieste.
        // `esperienze` (mieEsperienze) arricchisce con foto/posti; `prenotazioni` è la lista ricevuta.
        esperienzeRaggruppate(esperienze, prenotazioni) {
            const perId = new Map((esperienze || []).map(e => [e.id, e]));
            const gruppi = new Map();
            (prenotazioni || []).forEach(p => {
                if (!gruppi.has(p.esperienzaId)) gruppi.set(p.esperienzaId, []);
                gruppi.get(p.esperienzaId).push(p);
            });
            if (gruppi.size === 0) return `<p class="meta">Nessuna prenotazione di esperienza ricevuta.</p>`;
            const dataDi = (id) => (perId.get(id) || {}).dataOra || gruppi.get(id)[0].esperienzaDataOra;
            const ids = [...gruppi.keys()].sort((a, b) => new Date(dataDi(a)) - new Date(dataDi(b)));
            return ids.map(id => View.host.gruppoEsperienza(perId.get(id), gruppi.get(id))).join("");
        },

        gruppoEsperienza(esp, prenotazioni) {
            const primo = prenotazioni[0];
            const titolo = esp ? esp.titolo : primo.esperienzaTitolo;
            const dataOra = esp ? esp.dataOra : primo.esperienzaDataOra;
            const img = (esp && esp.immagineUrl) || placeholderPhoto(esp ? esp.id : primo.esperienzaId);
            const dataFmt = new Date(dataOra).toLocaleString("it-IT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
            const inAttesa = prenotazioni.filter(p => p.stato === "IN_ATTESA").length;
            const capienza = esp
                ? (esp.postiDisponibili <= 0
                    ? `<span class="badge-soldout">SOLD OUT</span>`
                    : `<span class="meta">${esp.postiDisponibili} di ${esp.postiMax} posti disponibili</span>`)
                : "";
            const righe = prenotazioni.map(p => `<tr>
                     <td data-label="Partecipanti">${p.numPartecipanti}</td>
                     <td data-label="Totale">€ ${Number(p.prezzoTotale).toFixed(2)}</td>
                     <td data-label="Stato"><span class="badge ${p.stato}">${p.stato}</span></td>
                     <td>${p.stato === "IN_ATTESA" ? View.host.azioniAttesa(p.id, "confermaEsperienza", "rifiutaEsperienza") : ""}</td>
                   </tr>`).join("");
            return `
      <div class="book-group">
        <div class="book-group__head">
          <img class="book-group__img" src="${img}" alt="${titolo}" loading="lazy">
          <div class="book-group__info">
            <h3>${titolo}${esp && esp.attivo === false ? ` <span class="meta">(disattivata)</span>` : ""}</h3>
            <p class="meta">${esp ? esp.citta + " · " : ""}${dataFmt}</p>
            <p class="book-group__stato">${capienza}${inAttesa ? ` <span class="meta">·</span> <strong>${inAttesa} da gestire</strong>` : ""}</p>
          </div>
        </div>
        <div class="table-wrap">
          <table><thead><tr><th>Partecipanti</th><th>Totale</th><th>Stato</th><th></th></tr></thead>
            <tbody>${righe}</tbody></table>
        </div>
      </div>`;
        },

    },

    // ==== rotta "/admin" (pannello Amministratore) ====
    admin: {
        page() {
            return `
      <h1>Amministrazione</h1>
      <p class="meta">Moderazione dei contenuti pubblicati dagli utenti.</p>

      <div class="tabs" role="tablist" aria-label="Sezioni amministrazione">
        <button class="tab-btn active" data-tab="alloggi" role="tab" aria-selected="true" aria-controls="tabAlloggi">Alloggi</button>
        <button class="tab-btn" data-tab="recensioni" role="tab" aria-selected="false" aria-controls="tabRecensioni">Recensioni</button>
        <button class="tab-btn" data-tab="utenti" role="tab" aria-selected="false" aria-controls="tabUtenti">Utenti</button>
        <button class="tab-btn" data-tab="veicoli" role="tab" aria-selected="false" aria-controls="tabVeicoliAdmin">Veicoli</button>
        <button class="tab-btn" data-tab="esperienze" role="tab" aria-selected="false" aria-controls="tabEsperienzeAdmin">Esperienze</button>
        <button class="tab-btn" data-tab="puntiInteresse" role="tab" aria-selected="false" aria-controls="tabPuntiInteresse">Scopri la città</button>
      </div>

      <section id="tabAlloggi" class="tab-panel" role="tabpanel">
        <h2 class="section-title" data-reveal>Tutti gli alloggi</h2>
        <div class="admin-search"><input type="search" id="searchAlloggi" placeholder="Cerca per titolo, host o città…"></div>
        <div class="table-wrap">
          <table><thead><tr><th>Alloggio</th><th>Host</th><th>Città</th><th>Stato</th><th></th></tr></thead>
            <tbody id="alloggiAdmin"></tbody></table>
        </div>
      </section>

      <section id="tabRecensioni" class="tab-panel" role="tabpanel" hidden>
        <h2 class="section-title" data-reveal>Tutte le recensioni</h2>
        <div class="admin-search"><input type="search" id="searchRecensioni" placeholder="Cerca per autore o commento…"></div>
        <div class="table-wrap">
          <table><thead><tr><th>Autore</th><th>Voto</th><th>Commento</th><th>Data</th><th></th></tr></thead>
            <tbody id="recensioniAdmin"></tbody></table>
        </div>
      </section>

      <section id="tabUtenti" class="tab-panel" role="tabpanel" hidden>
        <h2 class="section-title" data-reveal>Utenti registrati</h2>
        <div class="admin-search"><input type="search" id="searchUtenti" placeholder="Cerca per nome o email…"></div>
        <div class="table-wrap">
          <table><thead><tr><th>Nome</th><th>Email</th><th>Ruolo</th><th>Stato</th><th></th></tr></thead>
            <tbody id="utentiAdmin"></tbody></table>
        </div>
      </section>

      <section id="tabVeicoliAdmin" class="tab-panel" role="tabpanel" hidden>
        <h2 class="section-title" data-reveal>Tutti i veicoli a noleggio</h2>
        <div class="admin-search"><input type="search" id="searchVeicoli" placeholder="Cerca per marca, modello o città…"></div>
        <div class="table-wrap">
          <table><thead><tr><th>Veicolo</th><th>Host</th><th>Città</th><th>Stato</th><th></th></tr></thead>
            <tbody id="veicoliAdmin"></tbody></table>
        </div>
      </section>

      <section id="tabEsperienzeAdmin" class="tab-panel" role="tabpanel" hidden>
        <h2 class="section-title" data-reveal>Tutte le esperienze</h2>
        <div class="admin-search"><input type="search" id="searchEsperienze" placeholder="Cerca per titolo, host o città…"></div>
        <div class="table-wrap">
          <table><thead><tr><th>Esperienza</th><th>Host</th><th>Città</th><th>Stato</th><th></th></tr></thead>
            <tbody id="esperienzeAdmin"></tbody></table>
        </div>
      </section>

      <section id="tabPuntiInteresse" class="tab-panel" role="tabpanel" hidden>
        <h2 class="section-title" data-reveal>Guida "Scopri la città"</h2>
        <div class="form" style="max-width:none;margin:0 0 24px">
          <div id="piMsg" aria-live="polite"></div>
          <div class="form-grid">
            <div><label for="pi-citta">Città</label><input id="pi-citta"></div>
            <div><label for="pi-nome">Nome</label><input id="pi-nome"></div>
            <div><label for="pi-categoria">Categoria</label>
              <select id="pi-categoria">
                <option value="MONUMENTO">Monumento</option>
                <option value="RISTORANTE">Ristorante</option>
                <option value="EVENTO">Evento</option>
                <option value="NEGOZIO">Negozio</option>
                <option value="NATURA">Natura</option>
                <option value="ALTRO">Altro</option>
              </select>
            </div>
            <div><label for="pi-indirizzo">Indirizzo (facoltativo)</label><input id="pi-indirizzo"></div>
            <div class="full"><label for="pi-descrizione">Descrizione (facoltativa)</label><textarea id="pi-descrizione" rows="2"></textarea></div>
            <div class="full"><label for="pi-foto">Immagine (URL, facoltativo)</label><input id="pi-foto"></div>
            <div class="full"><button class="btn" id="creaPiBtn">Aggiungi punto di interesse</button></div>
          </div>
        </div>
        <div class="admin-search"><input type="search" id="searchPuntiInteresse" placeholder="Cerca per città o nome…"></div>
        <div class="table-wrap">
          <table><thead><tr><th>Città</th><th>Nome</th><th>Categoria</th><th></th></tr></thead>
            <tbody id="puntiInteresseAdmin"></tbody></table>
        </div>
      </section>`;
        },

        statoBadge(attivo, testoOn, testoOff) {
            return `<span class="badge ${attivo ? "CONFERMATA" : "ANNULLATA"}">${attivo ? testoOn : testoOff}</span>`;
        },
        toggleAzione(attivo, id, azOff, azOn, labelOff = "Disattiva", labelOn = "Riattiva") {
            return attivo
                ? `<button class="btn small secondary" data-action="${azOff}" data-id="${id}">${labelOff}</button>`
                : `<button class="btn small" data-action="${azOn}" data-id="${id}">${labelOn}</button>`;
        },

        tabellaAlloggi(lista, totale) {
            return lista.length ? lista.map(a => `
        <tr>
          <td data-label="Alloggio"><a href="#/alloggio?id=${a.id}">${a.titolo}</a></td>
          <td data-label="Host">${a.hostNome || ""}</td>
          <td data-label="Città">${a.citta}</td>
          <td data-label="Stato">${View.admin.statoBadge(a.attivo, "Attivo", "Disattivato")}</td>
          <td>${View.admin.toggleAzione(a.attivo, a.id, "disattivaAlloggio", "riattivaAlloggio")}</td>
        </tr>`).join("")
            : `<tr><td colspan="5" class="meta">${totale ? "Nessun risultato." : "Nessun alloggio pubblicato."}</td></tr>`;
        },

        tabellaRecensioni(lista, totale) {
            return lista.length ? lista.map(r => `
        <tr>
          <td data-label="Autore">${r.autoreNome}</td>
          <td data-label="Voto">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</td>
          <td data-label="Commento">${r.commento || ""}</td>
          <td data-label="Data">${r.data}</td>
          <td><button class="btn small secondary" data-action="eliminaRecensione" data-id="${r.id}">Elimina</button></td>
        </tr>`).join("")
            : `<tr><td colspan="5" class="meta">${totale ? "Nessun risultato." : "Nessuna recensione pubblicata."}</td></tr>`;
        },

        tabellaUtenti(lista, totale, meId) {
            return lista.length ? lista.map(u => `
        <tr>
          <td data-label="Nome">${u.nome} ${u.cognome}</td>
          <td data-label="Email">${u.email}</td>
          <td data-label="Ruolo">${u.ruolo === "ADMIN" ? "Amministratore" : "Utente"}</td>
          <td data-label="Stato">${View.admin.statoBadge(u.attivo, "Attivo", "Sospeso")}</td>
          <td>${u.id === meId ? "" : View.admin.toggleAzione(u.attivo, u.id, "sospendiUtente", "riattivaUtente", "Sospendi", "Riattiva")}</td>
        </tr>`).join("")
            : `<tr><td colspan="5" class="meta">${totale ? "Nessun risultato." : "Nessun utente registrato."}</td></tr>`;
        },

        tabellaVeicoli(lista, totale) {
            return lista.length ? lista.map(v => `
        <tr>
          <td data-label="Veicolo"><a href="#/veicolo?id=${v.id}">${v.marca} ${v.modello}</a></td>
          <td data-label="Host">${v.hostNome || ""}</td>
          <td data-label="Città">${v.citta}</td>
          <td data-label="Stato">${View.admin.statoBadge(v.attivo, "Attivo", "Disattivato")}</td>
          <td>${View.admin.toggleAzione(v.attivo, v.id, "disattivaVeicolo", "riattivaVeicolo")}</td>
        </tr>`).join("")
            : `<tr><td colspan="5" class="meta">${totale ? "Nessun risultato." : "Nessun veicolo pubblicato."}</td></tr>`;
        },

        tabellaEsperienze(lista, totale) {
            return lista.length ? lista.map(e => `
        <tr>
          <td data-label="Esperienza"><a href="#/esperienza?id=${e.id}">${e.titolo}</a></td>
          <td data-label="Host">${e.hostNome || ""}</td>
          <td data-label="Città">${e.citta}</td>
          <td data-label="Stato">${View.admin.statoBadge(e.attivo, "Attiva", "Disattivata")}</td>
          <td>${View.admin.toggleAzione(e.attivo, e.id, "disattivaEsperienza", "riattivaEsperienza")}</td>
        </tr>`).join("")
            : `<tr><td colspan="5" class="meta">${totale ? "Nessun risultato." : "Nessuna esperienza pubblicata."}</td></tr>`;
        },

        tabellaPunti(lista, totale) {
            return lista.length ? lista.map(p => `
        <tr>
          <td data-label="Città">${p.citta}</td>
          <td data-label="Nome">${p.nome}</td>
          <td data-label="Categoria">${p.categoria}</td>
          <td><button class="btn small secondary" data-action="eliminaPunto" data-id="${p.id}">Elimina</button></td>
        </tr>`).join("")
            : `<tr><td colspan="4" class="meta">${totale ? "Nessun risultato." : "Nessun punto di interesse."}</td></tr>`;
        },
    },

    // ==== rotte "/login" e "/register" ====
    login: {
        page() {
            return `
      <div class="auth-visual" style="background-image:url('https://images.unsplash.com/photo-1583844056361-4418a8f2a985?w=1000&q=70&auto=format&fit=crop')" aria-hidden="true">
        <p class="auth-visual__quote">Case, stanze e appartamenti unici,<br>scelti città per città.</p>
      </div>
      <div class="auth-panel">
        <form class="form" id="loginForm" novalidate>
          <h2>Bentornato</h2>
          <div id="msg" aria-live="polite"></div>
          <label for="email">Email</label><input id="email" type="email" autocomplete="email" placeholder="guest@example.com" required>
          <label for="password">Password</label><input id="password" type="password" autocomplete="current-password" placeholder="password" required>
          <button class="btn" id="loginBtn" type="submit">Accedi</button>
          <p class="hint">Non hai un account? <a href="#/register">Registrati</a></p>
        </form>
      </div>`;
        },
    },
    register: {
        page() {
            return `
      <div class="auth-visual" style="background-image:url('https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1000&q=70&auto=format&fit=crop')" aria-hidden="true">
        <p class="auth-visual__quote">Prenota il tuo prossimo viaggio, o pubblica il tuo primo alloggio.</p>
      </div>
      <div class="auth-panel">
        <form class="form" id="registerForm" novalidate>
          <h2>Crea il tuo account</h2>
          <div id="msg" aria-live="polite"></div>
          <label for="nome">Nome</label><input id="nome" autocomplete="given-name" required>
          <label for="cognome">Cognome</label><input id="cognome" autocomplete="family-name" required>
          <label for="email">Email</label><input id="email" type="email" autocomplete="email" required>
          <label for="telefono">Telefono</label><input id="telefono" type="tel" autocomplete="tel">
          <label for="password">Password</label><input id="password" type="password" autocomplete="new-password" placeholder="almeno 6 caratteri" minlength="6" required>
          <button class="btn" id="regBtn" type="submit">Crea account</button>
          <p class="hint">Hai già un account? <a href="#/login">Accedi</a></p>
        </form>
      </div>`;
        },
    },
};
