/* ==========================================================================
   SHIFT — scroll motion
   Reveals, column displacement, and counters.

   Reveals are driven by a plain scroll pass over getBoundingClientRect, not
   by IntersectionObserver. IO is the tidier API, but when it fails to fire —
   and it does, in some embedded and older renderers — every element it was
   watching stays at opacity 0 and the page renders blank. Measuring
   positions directly always works, costs microseconds for a few dozen
   elements, and cannot leave content hidden.

   Two further guards: the hidden state only exists under .js-anim (set by the
   inline script in <head>), and a timer reveals anything still hidden after
   three seconds no matter what.
   ========================================================================== */

(function () {
  "use strict";

  var reduced = window.SHIFT_CONFIG.reducedMotion;

  /* ------------------------------------------------------------------------
     Stagger indices, so the markup stays clean.
     ------------------------------------------------------------------------ */
  document.querySelectorAll("[data-reveal-group]").forEach(function (group) {
    Array.prototype.forEach.call(group.querySelectorAll(":scope > *"), function (kid, i) {
      if (!kid.style.getPropertyValue("--i")) kid.style.setProperty("--i", i);
      if (!kid.hasAttribute("data-reveal")) kid.setAttribute("data-reveal", "");
    });
  });

  document.querySelectorAll(".reveal-lines").forEach(function (block) {
    Array.prototype.forEach.call(block.children, function (row, i) {
      var inner = row.firstElementChild;
      if (inner) inner.style.setProperty("--i", i);
    });
  });

  /* ------------------------------------------------------------------------
     Reveal
     ------------------------------------------------------------------------ */
  var pending = Array.prototype.slice.call(
    document.querySelectorAll("[data-reveal], .reveal-lines")
  );

  /* Reveal by writing inline styles as well as the class. The class alone is
     tidier, but some renderers fail to recompute style when a class changes,
     which leaves the element at opacity 0 for good. An inline style is the
     one thing every engine honours, and the transition still comes from the
     stylesheet, so the movement is unchanged. */
  function show(el) {
    el.classList.add("is-in");
    if (el.hasAttribute("data-reveal")) {
      el.style.opacity = "1";
      el.style.transform = "translate3d(0, 0, 0)";
    }
    if (el.classList.contains("reveal-lines")) {
      Array.prototype.forEach.call(el.children, function (row) {
        var inner = row.firstElementChild;
        if (inner) inner.style.transform = "translateY(0)";
      });
    }
  }

  function revealPass() {
    var vh = window.innerHeight;
    for (var i = pending.length - 1; i >= 0; i--) {
      var r = pending[i].getBoundingClientRect();
      /* On screen, or already scrolled past. */
      if ((r.top < vh * 0.92 && r.bottom > -1) || r.bottom <= 0) {
        show(pending[i]);
        pending.splice(i, 1);
      }
    }
  }

  if (reduced) {
    pending.forEach(show);
    pending.length = 0;
  } else {
    /* Last resort: anything that ought to be on screen after three seconds
       gets shown regardless, with its transition switched off first.
       A page opened in a background tab has no animation clock at all — no
       frames, no transitions advancing — so a reveal that relies on a
       transition finishing would stay stuck at opacity 0. Removing the
       transition makes it snap to visible instead of never arriving.
       Elements further down the page still animate normally. */
    window.setTimeout(function () {
      var vh = window.innerHeight;
      for (var i = pending.length - 1; i >= 0; i--) {
        if (pending[i].getBoundingClientRect().top < vh) {
          pending[i].style.transition = "none";
          show(pending[i]);
          pending.splice(i, 1);
        }
      }
    }, 3000);
  }

  /* ------------------------------------------------------------------------
     Counters — same approach, no observer.
     ------------------------------------------------------------------------ */
  var counters = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));

  function runCounter(el) {
    var to = parseFloat(el.dataset.count);
    if (isNaN(to)) return;
    var suffix = el.dataset.countSuffix || "";
    var decimals = (el.dataset.count.split(".")[1] || "").length;

    if (reduced) { el.textContent = to.toFixed(decimals) + suffix; return; }

    var dur = 1100, start = null;
    (function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = (to * (1 - Math.pow(1 - p, 3))).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  }

  function counterPass() {
    var vh = window.innerHeight;
    for (var i = counters.length - 1; i >= 0; i--) {
      var r = counters[i].getBoundingClientRect();
      if (r.top < vh * 0.85 && r.bottom > 0) {
        runCounter(counters[i]);
        counters.splice(i, 1);
      }
    }
  }

  /* ------------------------------------------------------------------------
     Column displacement.
     `--p` runs from 1 (below the fold) through 0 (centred) to -1 (above), so
     columns converge into alignment as a section arrives.
     The machinery has its own ticker in machinery.js.
     ------------------------------------------------------------------------ */
  var shifters = Array.prototype.slice.call(document.querySelectorAll("[data-shift]"));
  shifters.forEach(function (el) {
    el.style.setProperty("--shift-amp", (el.dataset.shift || 64) + "px");
  });

  var ticking = false;

  function frame() {
    ticking = false;
    var vh = window.innerHeight;

    if (!reduced && pending.length) revealPass();
    if (counters.length) counterPass();

    if (reduced) return;
    for (var i = 0; i < shifters.length; i++) {
      var el = shifters[i];
      var r = el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) continue;   /* far off screen */
      var centre = r.top + r.height / 2;
      var p = (centre - vh / 2) / (vh / 2 + r.height / 2);
      el.style.setProperty("--p", Math.max(-1.2, Math.min(1.2, p)).toFixed(4));
    }
  }

  function request() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  }

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request, { passive: true });
  window.addEventListener("load", request);
  /* A page loaded in a background tab gets no frames at all. Catch up the
     moment it is actually looked at, rather than waiting for a scroll. */
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) request();
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(request);

  request();
  /* A second pass once layout has settled, in case fonts or images moved
     anything after the first. */
  window.setTimeout(request, 120);
  window.setTimeout(request, 500);
})();
