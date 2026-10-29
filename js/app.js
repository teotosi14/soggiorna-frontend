// app.js — punto di ingresso della SPA (pattern MAV).
// Collega i tre livelli: registra ogni rotta nel router (mav.js) mappandola alla `render` della
// sua Action, poi avvia il router. Model, View e Action sono già definiti (model.js/view.js/action.js);
// qui si dichiara solo "quale rotta usa quale render" e le eventuali guardie (auth, adminOnly).

// Rotte pubbliche
MAV.route("/",            { title: "Esplora",              render: () => Action.catalog.render() });
MAV.route("/alloggio",    {                                render: (p) => Action.alloggio.render(p) });
MAV.route("/noleggio",    { title: "Noleggio auto",        render: () => Action.noleggio.render() });
MAV.route("/veicolo",     {                                render: (p) => Action.veicolo.render(p) });
MAV.route("/esperienze",  { title: "Esperienze",           render: () => Action.esperienze.render() });
MAV.route("/esperienza",  {                                render: (p) => Action.esperienza.render(p) });
MAV.route("/scopri",      { title: "Scopri la città",      render: (p) => Action.scopri.render(p) });
MAV.route("/suggeriti",   { title: "Suggeriti",            render: () => Action.suggeriti.render() });
MAV.route("/pacchetto",   {                                render: (p) => Action.pacchetto.render(p) });
MAV.route("/login",       { title: "Accedi",   mainClass: "auth-layout", render: () => Action.login.render() });
MAV.route("/register",    { title: "Registrati", mainClass: "auth-layout", render: () => Action.register.render() });

// Rotte protette (il router reindirizza a #/login se non autenticato)
MAV.route("/preferiti",    { title: "Preferiti",            auth: true, render: () => Action.wishlist.render() });
MAV.route("/prenotazioni", { title: "Le mie prenotazioni",  auth: true, render: () => Action.prenotazioni.render() });
MAV.route("/profilo",      { title: "Il tuo profilo",       auth: true, partnerOk: true, render: () => Action.profilo.render() });
MAV.route("/host",         { title: "Area host",            auth: true, partnerOk: true, render: (p) => Action.host.render(p) });
MAV.route("/admin",        { title: "Amministrazione",      auth: true, adminOnly: true, render: () => Action.admin.render() });

document.addEventListener("DOMContentLoaded", () => {
    // Skip-link accessibile senza toccare l'hash (che è il router): sposta il focus su #app.
    document.getElementById("skipLink").addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("app").focus();
    });
    MAV.start();
});
