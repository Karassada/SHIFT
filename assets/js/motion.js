/* ==========================================================================
   SHIFT — scroll motion
   Reveals, column displacement, and counters.
   One rAF ticker drives everything that depends on scroll position, and it
   only runs while something is actually on screen.
   ========================================================================== */

(function () {
  "use strict";

  var reduced = window.SHIFT_CONFIG.reducedMotion;

  /* ------------------------------------------------------------------------
     Reveal on enter.
     Children of a [data-reveal-group] get their stagger index assigned here so
     the markup stays clean.
     ------------------------------------------------------------------------ */
  document.querySelectorAll("[data-reveal-group]").forEach(function (group) {
    var kids = group.querySelectorAll(":scope > *");
    Array.prototype.forEach.call(kids, function (kid, i) {
      if (!kid.style.getPropertyValue("--i")) kid.style.setProperty("--i", i);
      if (!kid.hasAttribute("data-reveal")) kid.setAttribute("data-reveal", "");
    });
  });

  /* Headline lines each get their own index inside the clipped row. */
  document.querySelectorAll(".reveal-lines").forEach(function (block) {
    Array.prototype.forEach.call(block.children, function (row, i) {
      var inner = row.firstElementChild;
      if (inner) inner.style.setProperty("--i", i);
    });
  });

  var revealTargets = document.querySelectorAll("[data-reveal], .reveal-lines");

  if (reduced || !("IntersectionObserver" in window)) {
    revealTargets.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });

    revealTargets.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------------
     Counters. Figures roll up once, when their block arrives.
     ------------------------------------------------------------------------ */
  function runCounter(el) {
    var to = parseFloat(el.dataset.count);
    if (isNaN(to)) return;
    var suffix = el.dataset.countSuffix || "";
    var decimals = (el.dataset.count.split(".")[1] || "").length;

    if (reduced) { el.textContent = to.toFixed(decimals) + suffix; return; }

    var dur = 1100;
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      /* Ease out — fast off the mark, settling into the final figure. */
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (to * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    if (!("IntersectionObserver" in window)) {
      counters.forEach(runCounter);
    } else {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          runCounter(entry.target);
          cio.unobserve(entry.target);
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { cio.observe(el); });
    }
  }

  /* ------------------------------------------------------------------------
     Scroll-driven displacement.
     `--p` runs from 1 (element still below the fold) through 0 (centred) to
     -1 (above), so columns converge into alignment as a section arrives.
     The machinery has its own ticker in machinery.js.
     ------------------------------------------------------------------------ */
  if (reduced) return;

  var shifters = Array.prototype.slice.call(document.querySelectorAll("[data-shift]"));
  var active = new Set();

  if (shifters.length && "IntersectionObserver" in window) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) active.add(entry.target);
        else active.delete(entry.target);
      });
      request();
    }, { rootMargin: "20% 0px 20% 0px" });
    shifters.forEach(function (el) {
      el.style.setProperty("--shift-amp", (el.dataset.shift || 64) + "px");
      sio.observe(el);
    });
  } else {
    shifters.forEach(function (el) {
      el.style.setProperty("--shift-amp", (el.dataset.shift || 64) + "px");
      active.add(el);
    });
  }

  var ticking = false;

  function frame() {
    ticking = false;
    var vh = window.innerHeight;

    active.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var centre = r.top + r.height / 2;
      /* 1 at the bottom edge, 0 at the middle, -1 at the top edge. */
      var p = (centre - vh / 2) / (vh / 2 + r.height / 2);
      el.style.setProperty("--p", Math.max(-1.2, Math.min(1.2, p)).toFixed(4));
    });
  }

  function request() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  }

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request, { passive: true });
  request();
})();
