/* =========================================================
   Brand to Revenue — configuración del sitio
   Este es el ÚNICO archivo que hay que editar para activar
   la medición y la captura de leads en todas las páginas.
   Mientras un valor esté vacío, esa función queda apagada
   y el sitio sigue funcionando normal.
   ========================================================= */
window.B2R_CONFIG = {
  // Google Analytics 4 → Admin → Flujos de datos → "ID de medición" (ej: "G-ABC123XYZ")
  GA4_ID: "",

  // Meta Business Manager → Administrador de eventos → ID del píxel (ej: "123456789012345")
  META_PIXEL_ID: "",

  // Endpoint que recibe los leads del playbook y del test (ej: Formspree "https://formspree.io/f/abcdwxyz")
  LEAD_ENDPOINT: "",

  // Agenda del diagnóstico gratis de 30 minutos
  CALENDLY: "https://calendly.com/brandtorevenue-ldsl/30min",

  // WhatsApp sin "+" ni espacios
  WHATSAPP: "50762440096",

  // Dominio principal (sin "/" al final)
  SITE: "https://www.brandtorevenue.agency"
};
