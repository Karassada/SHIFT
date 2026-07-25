/* ==========================================================================
   SHIFT — language switch
   Both languages ship in the HTML; this only flips which set is displayed and
   keeps <html lang> honest for screen readers and search engines.
   The initial value is applied by an inline script in <head> so there is no
   flash of the wrong language.
   ========================================================================== */

(function () {
  "use strict";

  var STORE = "shift-lang";
  var root = document.documentElement;

  function apply(lang) {
    root.setAttribute("data-lang", lang);
    root.setAttribute("lang", lang);

    document.querySelectorAll("[data-lang-btn]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.dataset.langBtn === lang));
    });

    /* Page title and description live in both languages on the <title> tag. */
    var t = document.querySelector("[data-title-ja]");
    if (t) {
      document.title = lang === "en"
        ? t.getAttribute("data-title-en")
        : t.getAttribute("data-title-ja");
    }

    try { localStorage.setItem(STORE, lang); } catch (e) { /* private mode */ }

    /* Layout-dependent pieces (the nav rail block) must re-measure. */
    window.dispatchEvent(new CustomEvent("shift:langchange", { detail: { lang: lang } }));
  }

  document.querySelectorAll("[data-lang-btn]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      apply(btn.dataset.langBtn);
    });
  });

  /* Sync the buttons with whatever the inline head script decided. */
  apply(root.getAttribute("data-lang") === "en" ? "en" : "ja");
})();
