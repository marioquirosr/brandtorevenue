/* Brand to Revenue — medición, UTMs, leads y UI compartida.
   Requiere config.js cargado antes. No editar: la configuración vive en config.js */
(function () {
  "use strict";
  var C = window.B2R_CONFIG || {};
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

  /* ---------- Almacenamiento seguro ---------- */
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key) || "null");
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }

  /* ---------- UTMs: primer y último toque ---------- */
  var params = new URLSearchParams(location.search);
  var incoming = {};
  UTM_KEYS.forEach(function (k) { if (params.get(k)) incoming[k] = params.get(k); });
  if (Object.keys(incoming).length) {
    if (!store("b2r_first_touch")) store("b2r_first_touch", incoming);
    store("b2r_last_touch", incoming);
  }
  function attribution() {
    return { first_touch: store("b2r_first_touch") || {}, last_touch: store("b2r_last_touch") || {} };
  }

  /* ---------- Etiquetas de medición (solo si hay IDs) ---------- */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  if (C.GA4_ID) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(C.GA4_ID);
    document.head.appendChild(s);
    gtag("js", new Date());
    gtag("config", C.GA4_ID);
  }
  if (C.META_PIXEL_ID) {
    /* Código base oficial del Meta Pixel */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", C.META_PIXEL_ID);
    window.fbq("track", "PageView");
  }

  /* Eventos estándar de Meta que corresponden a eventos propios */
  var META_STD = { lead: "Lead", schedule_click: "Schedule", test_complete: "CompleteRegistration" };

  function track(name, data) {
    data = data || {};
    if (C.GA4_ID) gtag("event", name, data);
    if (C.META_PIXEL_ID && window.fbq) {
      if (META_STD[name]) window.fbq("track", META_STD[name], data);
      else window.fbq("trackCustom", name, data);
    }
  }

  /* ---------- Links a Calendly con UTMs ---------- */
  function calendlyUrl(content, extra) {
    var u = new URL(C.CALENDLY || "https://calendly.com/brandtorevenue-ldsl/30min");
    var last = store("b2r_last_touch") || {};
    var page = (location.pathname.replace(/\/$/, "").split("/").pop() || "home").replace(".html", "") || "home";
    u.searchParams.set("utm_source", last.utm_source || "web");
    u.searchParams.set("utm_medium", last.utm_medium || page);
    u.searchParams.set("utm_campaign", last.utm_campaign || "diagnostico-gratis");
    u.searchParams.set("utm_content", content || "cta");
    if (extra) Object.keys(extra).forEach(function (k) { if (extra[k]) u.searchParams.set(k, extra[k]); });
    return u.toString();
  }

  function decorateLinks(root) {
    (root || document).querySelectorAll('a[href*="calendly.com"]').forEach(function (a) {
      if (a.dataset.b2rDone) return;
      a.href = calendlyUrl(a.dataset.cta || "cta");
      a.dataset.b2rDone = "1";
    });
  }

  /* ---------- Envío de leads ---------- */
  function sendLead(payload) {
    payload = Object.assign({ pagina: location.pathname, fecha: new Date().toISOString() }, payload, attribution());
    track("lead", { form: payload.formulario || "", nivel: payload.nivel || "", segmento: payload.segmento || "" });
    if (!C.LEAD_ENDPOINT) return Promise.resolve(false);
    return fetch(C.LEAD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.ok; }).catch(function () { return false; });
  }

  /* ---------- Clicks medidos ---------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a, button") : null;
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (href.indexOf("calendly.com") > -1) track("schedule_click", { cta: a.dataset.cta || "cta" });
    else if (href.indexOf("wa.me") > -1 || href.indexOf("wa.link") > -1) track("whatsapp_click", { cta: a.dataset.cta || "whatsapp" });
    else if (href.indexOf("test.html") > -1) track("test_cta_click", { cta: a.dataset.cta || "test" });
  });

  /* ---------- Menú móvil ---------- */
  function initNav() {
    var btn = document.querySelector(".nav-toggle");
    var menu = document.getElementById("nav-menu");
    if (!btn || !menu) return;
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      menu.classList.toggle("is-open", !open);
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        btn.setAttribute("aria-expanded", "false");
        menu.classList.remove("is-open");
      });
    });
  }

  /* ---------- WhatsApp flotante: aparece después del hero ---------- */
  function initFloat() {
    var fab = document.querySelector(".wa-float");
    var hero = document.querySelector(".hero, .cover");
    if (!fab) return;
    if (!hero || !("IntersectionObserver" in window)) { fab.classList.add("is-visible"); return; }
    new IntersectionObserver(function (entries) {
      fab.classList.toggle("is-visible", !entries[0].isIntersecting);
    }, { threshold: 0.05 }).observe(hero);
  }

  /* ---------- Modal del playbook ---------- */
  function initPlaybook() {
    var modal = document.getElementById("playbook-modal");
    if (!modal) return;
    var form = modal.querySelector("form");
    var formView = modal.querySelector("[data-view=form]");
    var doneView = modal.querySelector("[data-view=done]");
    var lastFocus = null;

    function open(e) {
      if (e) e.preventDefault();
      lastFocus = document.activeElement;
      formView.hidden = false; doneView.hidden = true;
      modal.hidden = false;
      document.body.classList.add("modal-open");
      var first = modal.querySelector("input:not([type=hidden]):not([tabindex='-1'])");
      if (first) first.focus();
      track("playbook_open", {});
    }
    function close() {
      modal.hidden = true;
      document.body.classList.remove("modal-open");
      if (lastFocus) lastFocus.focus();
    }
    document.querySelectorAll("[data-playbook]").forEach(function (el) { el.addEventListener("click", open); });
    modal.querySelectorAll("[data-close]").forEach(function (el) { el.addEventListener("click", close); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) close(); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.website && form.website.value) return; /* honeypot */
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      sendLead({
        formulario: "playbook",
        nombre: form.nombre.value.trim(),
        email: form.email.value.trim(),
        rol: form.rol.value
      }).then(function () {
        btn.disabled = false;
        formView.hidden = true; doneView.hidden = false;
        var dl = doneView.querySelector("a[download]");
        if (dl) dl.focus();
      });
    });
  }

  function init() { decorateLinks(); initNav(); initFloat(); initPlaybook(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  /* API para el test */
  window.B2R = { track: track, sendLead: sendLead, calendlyUrl: calendlyUrl, decorateLinks: decorateLinks };
})();
