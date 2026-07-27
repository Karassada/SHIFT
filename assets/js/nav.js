/* ==========================================================================
   SHIFT — navigation
   The header rail, the mobile menu, and the page-to-page wipe.
   ========================================================================== */

(function () {
  "use strict";

  var reduced = window.SHIFT_CONFIG.reducedMotion;
  var root = document.documentElement;

  /* ------------------------------------------------------------------------
     Header condenses once the page has moved.
     ------------------------------------------------------------------------ */
  var header = document.querySelector("[data-header]");
  if (header) {
    var stuck = false;
    var onScroll = function () {
      var next = window.scrollY > 24;
      if (next !== stuck) {
        stuck = next;
        header.classList.toggle("is-stuck", stuck);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------------------------------
     The rail block.
     It sits behind the tabs and physically travels to whichever one is
     current. Hovering pushes it most of the way toward the hovered tab so the
     shift is previewed before you commit to it; leaving snaps it home.
     ------------------------------------------------------------------------ */
  var rail = document.querySelector("[data-rail]");
  if (rail) {
    var block = rail.querySelector(".rail__block");
    var chev = rail.querySelector(".rail__chev");
    var links = Array.prototype.slice.call(rail.querySelectorAll(".rail__link"));
    var current = rail.querySelector('.rail__link[aria-current="page"]') || links[0];

    function place(el, preview) {
      if (!el || !block) return;
      var x = el.offsetLeft;
      var w = el.offsetWidth;
      if (preview && current) {
        /* Sit 70% of the way there — a shift in progress, not a commitment. */
        var cx = current.offsetLeft;
        var cw = current.offsetWidth;
        x = cx + (x - cx) * 0.7;
        w = cw + (w - cw) * 0.7;
      }
      block.style.setProperty("--block-x", x + "px");
      block.style.setProperty("--block-w", w + "px");
      if (chev) chev.style.setProperty("--chev-x", (x - 12) + "px");
    }

    function home() { place(current, false); }

    links.forEach(function (link) {
      link.addEventListener("mouseenter", function () {
        if (link !== current) place(link, true);
      });
      link.addEventListener("focus", function () {
        if (link !== current) place(link, true);
      });
    });
    rail.addEventListener("mouseleave", home);
    rail.addEventListener("focusout", function (e) {
      if (!rail.contains(e.relatedTarget)) home();
    });

    /* Measure once the real fonts are in — swapped metrics move the tabs. */
    function measure() { home(); rail.classList.add("is-ready"); }
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    window.addEventListener("resize", home, { passive: true });
    window.addEventListener("shift:langchange", function () {
      /* Japanese and English labels are different widths. */
      requestAnimationFrame(measure);
    });
  }

  /* ------------------------------------------------------------------------
     Mobile menu
     ------------------------------------------------------------------------ */
  var burger = document.querySelector("[data-burger]");
  var menu = document.querySelector("[data-menu-panel]");
  if (burger && menu) {
    var lastFocus = null;

    function setMenu(open) {
      root.setAttribute("data-menu", open ? "open" : "closed");
      burger.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
      if (open) {
        lastFocus = document.activeElement;
        var first = menu.querySelector("a, button");
        if (first) first.focus({ preventScroll: true });
      } else if (lastFocus) {
        lastFocus.focus({ preventScroll: true });
      }
    }

    burger.addEventListener("click", function () {
      setMenu(root.getAttribute("data-menu") !== "open");
    });

    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && root.getAttribute("data-menu") === "open") setMenu(false);
    });

    /* A resize past the desktop breakpoint must not leave the body locked. */
    window.matchMedia("(min-width: 62em)").addEventListener("change", function (e) {
      if (e.matches && root.getAttribute("data-menu") === "open") setMenu(false);
    });

    setMenu(false);
  }

  /* ------------------------------------------------------------------------
     Page wipe.
     Panels sweep down to cover before leaving, and clear upward on arrival —
     but only when the visitor came from inside the site, so a first or
     external visit is never hidden behind a curtain.
     ------------------------------------------------------------------------ */
  var FLAG = "shift-wipe";
  /* Six panels at a 30ms stagger over a 440ms sweep: the screen is covered a
     shade before 600ms, so navigation fires at 560ms. */
  var OUT_MS = 560;

  function isInternal(a) {
    if (!a || !a.href) return false;
    if (a.target && a.target !== "_self") return false;
    if (a.hasAttribute("download")) return false;
    if (a.origin !== window.location.origin) return false;
    /* Same page, or a pure hash jump — let the browser handle it. */
    var url = new URL(a.href);
    if (url.pathname === window.location.pathname && url.hash) return false;
    if (url.href === window.location.href) return false;
    return /^https?:$/.test(url.protocol);
  }

  if (!reduced && document.querySelector(".wipe")) {
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      var a = e.target.closest("a");
      if (!isInternal(a)) return;

      e.preventDefault();
      try { sessionStorage.setItem(FLAG, "1"); } catch (err) { /* ignore */ }
      root.setAttribute("data-wipe", "out");
      var href = a.href;
      window.setTimeout(function () { window.location.href = href; }, OUT_MS);

      /* If the navigation never happens — offline, a blocked request, the
         user cancelling — the panels would stay drawn over the page and
         there would be no way back. Uncover after a few seconds. */
      window.setTimeout(function () {
        if (root.getAttribute("data-wipe") === "out") root.removeAttribute("data-wipe");
      }, 6000);
    });

    /* Arrival */
    var arrived = false;
    try { arrived = sessionStorage.getItem(FLAG) === "1"; } catch (err) { /* ignore */ }
    if (arrived) {
      try { sessionStorage.removeItem(FLAG); } catch (err) { /* ignore */ }
      root.setAttribute("data-wipe", "in");
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          root.setAttribute("data-wipe", "in-run");
          window.setTimeout(function () { root.removeAttribute("data-wipe"); }, 900);
        });
      });
    }

    /* Coming back via the bfcache must never restore a covered screen. */
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) {
        root.removeAttribute("data-wipe");
        document.body.style.overflow = "";
      }
    });
  }
})();
