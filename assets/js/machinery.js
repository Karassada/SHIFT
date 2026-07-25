/* ==========================================================================
   SHIFT — machinery
   The background is a working machine, not a decoration. Every part is drawn
   from its real geometry and driven by scroll position:

   - Gears have proper trapezoidal teeth, a pitch radius set by tooth count,
     spokes, a hub and a bolt circle. Meshing gears sit exactly r1+r2 apart
     and counter-rotate at the true ratio, so the teeth stay in step.
   - The rack travels exactly as far as its pinion rolls (x = theta * r), so
     it never appears to slip.
   - The piston is solved from the actual slider-crank equation, which is why
     it lingers at the ends of its stroke instead of moving sinusoidally.
   - The belt runs along the real external tangents between its two pulleys.

   All of it is line work. Nothing here is interactive, and it all stops for
   prefers-reduced-motion.
   ========================================================================== */

(function () {
  "use strict";

  if (window.SHIFT_CONFIG.reducedMotion) return;

  var NS = "http://www.w3.org/2000/svg";
  var TAU = Math.PI * 2;

  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function xy(r, a) {
    return (Math.cos(a) * r).toFixed(2) + " " + (Math.sin(a) * r).toFixed(2);
  }

  /* ------------------------------------------------------------------------
     A gear outline. `m` is the module — the tooth size. Pitch radius is
     m*N/2, so two gears sharing a module always mesh.
     ------------------------------------------------------------------------ */
  function gearOutline(N, m) {
    var r = m * N / 2, ra = r + m, rd = r - 1.15 * m;
    var step = TAU / N;
    var d = "M " + xy(rd, 0);
    for (var i = 0; i < N; i++) {
      var a = i * step;
      d += " L " + xy(ra, a + step * 0.18) +
           " L " + xy(ra, a + step * 0.32) +
           " L " + xy(rd, a + step * 0.50) +
           " A " + rd.toFixed(2) + " " + rd.toFixed(2) + " 0 0 1 " + xy(rd, a + step);
    }
    return d + " Z";
  }

  function gear(cx, cy, teeth, m, opts) {
    opts = opts || {};
    var r = m * teeth / 2;
    var g = el("g", { transform: "translate(" + cx + " " + cy + ")" });
    var spin = el("g", {});
    var sw = opts.sw || 1.5;

    spin.appendChild(el("path", { d: gearOutline(teeth, m), "stroke-width": sw }));
    spin.appendChild(el("circle", { r: (r * 0.74).toFixed(1), "stroke-width": 1 }));
    spin.appendChild(el("circle", { r: (r * 0.19).toFixed(1), "stroke-width": sw }));

    var spokes = opts.spokes || 5;
    for (var s = 0; s < spokes; s++) {
      var a = s * TAU / spokes + (opts.phase || 0);
      spin.appendChild(el("line", {
        x1: (Math.cos(a) * r * 0.21).toFixed(1), y1: (Math.sin(a) * r * 0.21).toFixed(1),
        x2: (Math.cos(a) * r * 0.72).toFixed(1), y2: (Math.sin(a) * r * 0.72).toFixed(1),
        "stroke-width": 1.2
      }));
      var b = a + Math.PI / spokes;
      spin.appendChild(el("circle", {
        cx: (Math.cos(b) * r * 0.47).toFixed(1), cy: (Math.sin(b) * r * 0.47).toFixed(1),
        r: (r * 0.055).toFixed(1), "stroke-width": 1
      }));
    }

    g.appendChild(spin);
    return { node: g, spin: spin, r: r, teeth: teeth, cx: cx, cy: cy };
  }

  function spinTo(g, deg) { g.spin.setAttribute("transform", "rotate(" + deg.toFixed(2) + ")"); }

  /* ======================================================================
     Machines. Each returns { svg, update(p) } where p is 0..1 progress.
     ====================================================================== */
  var BUILD = {};

  /* --- A three-stage gear train ---------------------------------------- */
  BUILD.geartrain = function () {
    var m = 6.5;
    var svg = el("svg", { viewBox: "0 0 430 320", fill: "none", stroke: "currentColor" });

    var A = gear(150, 168, 30, m, { spokes: 6 });

    /* Each next centre sits at exactly r1 + r2 from the last, so the teeth
       actually engage instead of merely overlapping. */
    var ang1 = -24 * Math.PI / 180, d1 = A.r + (m * 20 / 2);
    var B = gear(A.cx + Math.cos(ang1) * d1, A.cy + Math.sin(ang1) * d1, 20, m, { spokes: 5 });

    var ang2 = 38 * Math.PI / 180, d2 = B.r + (m * 13 / 2);
    var C = gear(B.cx + Math.cos(ang2) * d2, B.cy + Math.sin(ang2) * d2, 13, m, { spokes: 4 });

    /* The centre lines, as they'd appear on the drawing this is imitating. */
    var plate = el("g", { "stroke-width": 1, opacity: "0.5", "stroke-dasharray": "5 5" });
    plate.appendChild(el("path", { d: "M " + A.cx + " " + A.cy + " L " + B.cx.toFixed(1) + " " + B.cy.toFixed(1) + " L " + C.cx.toFixed(1) + " " + C.cy.toFixed(1) }));
    svg.appendChild(plate);

    svg.appendChild(A.node); svg.appendChild(B.node); svg.appendChild(C.node);

    return {
      svg: svg,
      update: function (p) {
        var t = p * 900;
        spinTo(A, t);
        spinTo(B, -t * A.teeth / B.teeth);
        spinTo(C, t * A.teeth / C.teeth);
      }
    };
  };

  /* --- Rack and pinion -------------------------------------------------- */
  BUILD.rack = function () {
    var m = 7, teeth = 18;
    var svg = el("svg", { viewBox: "0 0 460 230", fill: "none", stroke: "currentColor" });
    var P = gear(230, 96, teeth, m, { spokes: 4 });
    var r = P.r;
    var pitchY = 96 + r;

    /* The rack's teeth point up and share the pinion's module. */
    var pitch = Math.PI * m;
    var span = 900, n = Math.ceil(span / pitch);
    var d = "M " + (-span / 2) + " " + (pitchY + m * 1.15);
    for (var i = 0; i < n; i++) {
      var x = -span / 2 + i * pitch;
      d += " L " + (x + pitch * 0.18).toFixed(1) + " " + (pitchY + m * 1.15) +
           " L " + (x + pitch * 0.32).toFixed(1) + " " + (pitchY - m) +
           " L " + (x + pitch * 0.68).toFixed(1) + " " + (pitchY - m) +
           " L " + (x + pitch * 0.82).toFixed(1) + " " + (pitchY + m * 1.15);
    }
    d += " L " + (span / 2) + " " + (pitchY + m * 1.15);

    var slide = el("g", {});
    slide.appendChild(el("path", { d: d, "stroke-width": 1.5 }));
    slide.appendChild(el("path", { d: "M " + (-span / 2) + " " + (pitchY + m * 3.4) + " L " + (span / 2) + " " + (pitchY + m * 3.4), "stroke-width": 1 }));
    var wrap = el("g", { transform: "translate(230 0)" });
    wrap.appendChild(slide);
    svg.appendChild(wrap);
    svg.appendChild(P.node);

    return {
      svg: svg,
      update: function (p) {
        var deg = p * 620;
        spinTo(P, deg);
        /* Rolling without slipping: the rack moves exactly the arc length. */
        var travel = (deg * Math.PI / 180) * r;
        slide.setAttribute("transform", "translate(" + (-travel).toFixed(2) + " 0)");
      }
    };
  };

  /* --- Slider-crank: crank, connecting rod, piston ---------------------- */
  BUILD.piston = function () {
    var svg = el("svg", { viewBox: "0 0 460 260", fill: "none", stroke: "currentColor" });
    var cx = 110, cy = 130, crank = 52, rod = 175, bore = 46;

    var frame = el("g", { "stroke-width": 1, opacity: "0.6" });
    frame.appendChild(el("path", { d: "M 250 " + (cy - bore) + " L 440 " + (cy - bore) + " M 250 " + (cy + bore) + " L 440 " + (cy + bore) }));
    frame.appendChild(el("path", { d: "M 440 " + (cy - bore) + " L 440 " + (cy + bore), "stroke-width": 1.5 }));
    frame.appendChild(el("circle", { cx: cx, cy: cy, r: crank, "stroke-dasharray": "4 6" }));
    svg.appendChild(frame);

    var housing = gear(cx, cy, 22, 5.4, { spokes: 4, sw: 1.4 });
    svg.appendChild(housing.node);

    var conrod = el("path", { "stroke-width": 2 });
    var pin = el("circle", { r: 6, "stroke-width": 1.5 });
    var head = el("g", { "stroke-width": 2 });
    var headRect = el("rect", { x: -26, y: -bore + 6, width: 52, height: (bore - 6) * 2, rx: 3 });
    head.appendChild(headRect);
    head.appendChild(el("path", { d: "M -14 " + (-bore + 16) + " L -14 " + (bore - 16) + " M 6 " + (-bore + 16) + " L 6 " + (bore - 16), "stroke-width": 1 }));
    svg.appendChild(conrod); svg.appendChild(head); svg.appendChild(pin);

    return {
      svg: svg,
      update: function (p) {
        var th = p * 6.4 * Math.PI;
        spinTo(housing, th * 180 / Math.PI);
        var px = cx + Math.cos(th) * crank;
        var py = cy + Math.sin(th) * crank;
        /* Slider-crank: x = r cos t + sqrt(L^2 - (r sin t)^2) */
        var s = Math.sin(th) * crank;
        var hx = cx + Math.cos(th) * crank + Math.sqrt(rod * rod - s * s);
        conrod.setAttribute("d", "M " + px.toFixed(1) + " " + py.toFixed(1) + " L " + hx.toFixed(1) + " " + cy);
        pin.setAttribute("cx", px.toFixed(1));
        pin.setAttribute("cy", py.toFixed(1));
        head.setAttribute("transform", "translate(" + hx.toFixed(1) + " " + cy + ")");
      }
    };
  };

  /* --- Belt drive over two pulleys -------------------------------------- */
  BUILD.pulley = function () {
    var svg = el("svg", { viewBox: "0 0 440 250", fill: "none", stroke: "currentColor" });
    var c1 = { x: 105, y: 125, r: 68 }, c2 = { x: 335, y: 125, r: 38 };
    var d = c2.x - c1.x;
    var beta = Math.acos((c1.r - c2.r) / d);

    function tp(c, sign) {
      return { x: c.x + Math.cos(sign * beta) * c.r, y: c.y + Math.sin(sign * beta) * c.r };
    }
    var a1 = tp(c1, -1), a2 = tp(c2, -1), b1 = tp(c1, 1), b2 = tp(c2, 1);

    var belt = el("path", {
      d: "M " + a1.x.toFixed(1) + " " + a1.y.toFixed(1) +
         " L " + a2.x.toFixed(1) + " " + a2.y.toFixed(1) +
         " A " + c2.r + " " + c2.r + " 0 0 1 " + b2.x.toFixed(1) + " " + b2.y.toFixed(1) +
         " L " + b1.x.toFixed(1) + " " + b1.y.toFixed(1) +
         " A " + c1.r + " " + c1.r + " 0 1 1 " + a1.x.toFixed(1) + " " + a1.y.toFixed(1),
      "stroke-width": 3, "stroke-dasharray": "9 7"
    });
    svg.appendChild(belt);

    var p1 = gear(c1.x, c1.y, 24, 5.2, { spokes: 6, sw: 1.3 });
    var p2 = gear(c2.x, c2.y, 14, 5.0, { spokes: 4, sw: 1.3 });
    svg.appendChild(p1.node); svg.appendChild(p2.node);

    return {
      svg: svg,
      update: function (p) {
        var t = p * 700;
        spinTo(p1, t);
        /* A belt links them by surface speed, so the ratio is by radius. */
        spinTo(p2, t * c1.r / c2.r);
        belt.setAttribute("stroke-dashoffset", (-t * 0.9).toFixed(1));
      }
    };
  };

  /* ======================================================================
     Mount every [data-machine], then drive them from scroll.
     ====================================================================== */
  var machines = [];

  document.querySelectorAll("[data-machine]").forEach(function (host) {
    var build = BUILD[host.dataset.machine];
    if (!build) return;
    var m = build();
    host.appendChild(m.svg);
    machines.push({ host: host, update: m.update, fixed: host.hasAttribute("data-machine-fixed"), on: false });
  });

  if (!machines.length) return;

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        machines.forEach(function (m) { if (m.host === e.target) m.on = e.isIntersecting; });
      });
      request();
    }, { rootMargin: "30% 0px 30% 0px" });
    machines.forEach(function (m) { io.observe(m.host); });
  } else {
    machines.forEach(function (m) { m.on = true; });
  }

  var ticking = false;

  function frame() {
    ticking = false;
    var vh = window.innerHeight;
    var doc = document.documentElement;
    var max = doc.scrollHeight - vh;
    var page = max > 0 ? window.scrollY / max : 0;

    machines.forEach(function (m) {
      if (!m.on && !m.fixed) return;
      var p;
      if (m.fixed) {
        p = page;
      } else {
        var r = m.host.getBoundingClientRect();
        /* 0 as the machine enters from the bottom, 1 as it leaves the top. */
        p = 1 - (r.top + r.height) / (vh + r.height);
      }
      m.update(Math.max(-0.15, Math.min(1.15, p)));
    });
  }

  function request() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  }

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request, { passive: true });
  machines.forEach(function (m) { m.on = true; });
  request();
})();
