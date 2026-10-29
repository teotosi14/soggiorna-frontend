// Menu mobile e animazioni di comparsa allo scroll, condivisi da tutte le pagine.

function initNavToggle() {
    const btn = document.getElementById("navToggle");
    const nav = document.getElementById("nav");
    if (!btn || !nav) return;

    const close = () => { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); };
    const open = () => { nav.classList.add("open"); btn.setAttribute("aria-expanded", "true"); };

    btn.addEventListener("click", () => nav.classList.contains("open") ? close() : open());
    document.addEventListener("click", (e) => {
        if (nav.classList.contains("open") && !nav.contains(e.target) && !btn.contains(e.target)) close();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    // renderNav() (auth.js) rigenera il contenuto di #nav: la delega sul contenitore
    // sopravvive al re-render, un listener sui singoli <a> andrebbe perso.
    nav.addEventListener("click", (e) => { if (e.target.tagName === "A") close(); });
}

// Comportamento comune alle pagine organizzate a tab (.tab-btn con data-tab + pannelli
// mostrati/nascosti): riusato da host.js e admin.js, che passano la propria mappa
// {nomeTab: idPannello}.
function wireTabs(pannelli) {
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => attivaTab(btn.dataset.tab, pannelli));
    });
}

function attivaTab(tab, pannelli) {
    document.querySelectorAll(".tab-btn").forEach(b => {
        const attivo = b.dataset.tab === tab;
        b.classList.toggle("active", attivo);
        b.setAttribute("aria-selected", String(attivo));
    });
    Object.entries(pannelli).forEach(([nomeTab, id]) => {
        document.getElementById(id).hidden = nomeTab !== tab;
    });
}

function initScrollReveal() {
    const items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
        items.forEach(el => el.classList.add("is-visible"));
        return;
    }
    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    items.forEach(el => io.observe(el));
}

document.addEventListener("DOMContentLoaded", () => {
    initNavToggle();
    initScrollReveal();
});
