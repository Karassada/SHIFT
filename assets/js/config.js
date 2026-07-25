/* ==========================================================================
   SHIFT — site configuration
   Everything an editor might need to change without touching logic.
   ========================================================================== */

window.SHIFT_CONFIG = {
  /* Contact form.
     Leave `formEndpoint` empty and the form falls back to opening the
     visitor's mail client with the message pre-filled, so contact works from
     day one on plain static hosting. Set it to a Formspree / Basin / Web3Forms
     POST URL to receive submissions as email without leaving the page. */
  formEndpoint: "",
  contactEmail: "admin@shiftgk.com",

  /* Stop the machinery and the page wipe for anyone who asks for calm. */
  reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
};
