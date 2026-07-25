/* ==========================================================================
   SHIFT — machinery
   The background is a working machine, not a decoration. Every part is drawn
   from its real geometry and driven by scroll position.

   Each machine is a self-contained assembly: it sits on a bedplate, turns in
   pillow-block bearings, and is bolted to a frame, with its drive shaft
   running off the edge of the drawing toward the line shaft that turns them
   all. One assembly per section, and sections clip, so no two machines ever
   pile up on each other.

   Geometry, not guesswork:
   - Gears have trapezoidal teeth and a pitch radius of m*N/2, so any two
     sharing a module mesh. Centres sit at exactly r1+r2 and counter-rotate at
     -N1/N2, which keeps the teeth in step.
   - The rack travels its pinion's arc length, x = theta*r. No slip.
   - The piston is solved from the slider-crank equation, so it lingers at the
     ends of its stroke instead of gliding.
   - The belt runs along the true external tangents between its two pulleys.

   All line work, all inert, and all of it stops for prefers-reduced-motion.
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
  function add(parent, children) {
    children.forEach(function (c) { parent.appendChild(c); });
    return parent;
  }

  /* ======================================================================
     Parts
     ====================================================================== */

  /* A gear outline. `m` is the module — the tooth size. */
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

    add(spin, [
      el("path", { d: gearOutline(teeth, m), "stroke-width": sw }),
      el("circle", { r: (r * 0.74).toFixed(1), "stroke-width": 1 }),
      el("circle", { r: (r * 0.19).toFixed(1), "stroke-width": sw })
    ]);

    var spokes = opts.spokes || 5;
    for (var s = 0; s < spokes; s++) {
      var a = s * TAU / spokes;
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

  function spinTo(g, deg) {
    g.spin.setAttribute("transform", "rotate(" + deg.toFixed(2) + ")");
  }

  /* A pillow-block bearing: what a real shaft actually turns in. */
  function bearing(cx, cy, s) {
    return add(el("g", { "stroke-width": 1.3, class: "mc-frame" }), [
      el("path", {
        d: "M " + (cx - s) + " " + (cy + s * 0.95) +
           " L " + (cx - s) + " " + (cy - s * 0.1) +
           " A " + (s * 0.62) + " " + (s * 0.62) + " 0 0 1 " + (cx + s) + " " + (cy - s * 0.1) +
           " L " + (cx + s) + " " + (cy + s * 0.95) + " Z"
      }),
      el("circle", { cx: cx, cy: cy, r: (s * 0.34).toFixed(1) }),
      el("circle", { cx: cx - s * 0.62, cy: cy + s * 0.62, r: s * 0.1 }),
      el("circle", { cx: cx + s * 0.62, cy: cy + s * 0.62, r: s * 0.1 })
    ]);
  }

  /* A bedplate, with the hatching that means "fixed to the ground". */
  function bedplate(x, y, w) {
    var g = el("g", { "stroke-width": 1.2, class: "mc-frame" });
    g.appendChild(el("path", { d: "M " + x + " " + y + " L " + (x + w) + " " + y }));
    for (var i = 6; i < w; i += 13) {
      g.appendChild(el("path", {
        d: "M " + (x + i) + " " + y + " L " + (x + i - 9) + " " + (y + 9),
        "stroke-width": 0.9
      }));
    }
    return g;
  }

  /* The shaft leaving the drawing toward the line shaft driving everything. */
  function driveShaft(x1, y1, x2, y2) {
    return add(el("g", { class: "mc-frame", "stroke-width": 1.1 }), [
      el("path", { d: "M " + x1 + " " + y1 + " L " + x2 + " " + y2, "stroke-dasharray": "7 5" }),
      el("circle", { cx: x2, cy: y2, r: 3.5, "stroke-width": 1.4 })
    ]);
  }

  /* ======================================================================
     Assemblies. Each returns { svg, update(p) } with p as 0..1 progress.
     ====================================================================== */
  var BUILD = {};

  /* --- Three-stage reduction gearbox ------------------------------------ */
  BUILD.geartrain = function () {
    var m = 6.5;
    var svg = el("svg", { viewBox: "0 0 470 330", fill: "none", stroke: "currentColor" });

    var A = gear(152, 168, 30, m, { spokes: 6 });
    /* Each next centre at exactly r1 + r2, so the teeth engage. */
    var a1 = -24 * Math.PI / 180, d1 = A.r + m * 20 / 2;
    var B = gear(A.cx + Math.cos(a1) * d1, A.cy + Math.sin(a1) * d1, 20, m, { spokes: 5 });
    var a2 = 38 * Math.PI / 180, d2 = B.r + m * 13 / 2;
    var C = gear(B.cx + Math.cos(a2) * d2, B.cy + Math.sin(a2) * d2, 13, m, { spokes: 4 });

    /* Casing, centre lines and mounting bolts — the gearbox it lives in. */
    var frame = el("g", { class: "mc-frame", "stroke-width": 1.2 });
    frame.appendChild(el("rect", { x: 34, y: 14, width: 412, height: 268, rx: 6 }));
    [[46, 26], [434, 26], [46, 270], [434, 270]].forEach(function (p) {
      frame.appendChild(el("circle", { cx: p[0], cy: p[1], r: 4 }));
    });
    frame.appendChild(el("path", {
      d: "M " + A.cx + " " + A.cy + " L " + B.cx.toFixed(1) + " " + B.cy.toFixed(1) +
         " L " + C.cx.toFixed(1) + " " + C.cy.toFixed(1),
      "stroke-dasharray": "9 4 2 4", "stroke-width": 0.9
    }));
    svg.appendChild(frame);
    svg.appendChild(bedplate(34, 282, 412));
    svg.appendChild(driveShaft(A.cx, A.cy, 34, A.cy));

    add(svg, [A.node, B.node, C.node]);
    add(svg, [bearing(A.cx, A.cy, 15), bearing(B.cx, B.cy, 12), bearing(C.cx, C.cy, 10)]);

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

  /* --- Rack and pinion on a linear slide -------------------------------- */
  BUILD.rack = function () {
    var m = 7, teeth = 18;
    var svg = el("svg", { viewBox: "0 0 470 250", fill: "none", stroke: "currentColor" });
    var P = gear(235, 92, teeth, m, { spokes: 4 });
    var r = P.r, pitchY = 92 + r;

    var frame = el("g", { class: "mc-frame", "stroke-width": 1.2 });
    /* The slide the rack runs in. */
    frame.appendChild(el("rect", { x: 24, y: pitchY + m * 2.2, width: 422, height: 20, rx: 2 }));
    svg.appendChild(frame);
    svg.appendChild(bedplate(24, pitchY + m * 2.2 + 20, 422));
    svg.appendChild(driveShaft(P.cx, P.cy, 446, P.cy));

    /* The rack. Teeth point up and share the pinion's module. */
    var pitch = Math.PI * m, span = 960, n = Math.ceil(span / pitch);
    var d = "M " + (-span / 2) + " " + (pitchY + m * 1.2);
    for (var i = 0; i < n; i++) {
      var x = -span / 2 + i * pitch;
      d += " L " + (x + pitch * 0.18).toFixed(1) + " " + (pitchY + m * 1.2) +
           " L " + (x + pitch * 0.32).toFixed(1) + " " + (pitchY - m) +
           " L " + (x + pitch * 0.68).toFixed(1) + " " + (pitchY - m) +
           " L " + (x + pitch * 0.82).toFixed(1) + " " + (pitchY + m * 1.2);
    }
    d += " L " + (span / 2) + " " + (pitchY + m * 1.2);

    var slide = el("g", {});
    slide.appendChild(el("path", { d: d, "stroke-width": 1.6 }));
    var wrap = el("g", { transform: "translate(235 0)" });
    wrap.appendChild(slide);
    svg.appendChild(wrap);

    svg.appendChild(P.node);
    svg.appendChild(bearing(P.cx, P.cy, 14));

    return {
      svg: svg,
      update: function (p) {
        var deg = p * 620;
        spinTo(P, deg);
        /* Rolling without slipping: the rack moves exactly the arc length. */
        slide.setAttribute("transform",
          "translate(" + (-(deg * Math.PI / 180) * r).toFixed(2) + " 0)");
      }
    };
  };

  /* --- Slider-crank: flywheel, connecting rod, piston, cylinder --------- */
  BUILD.piston = function () {
    var svg = el("svg", { viewBox: "0 0 480 270", fill: "none", stroke: "currentColor" });
    var cx = 112, cy = 128, crank = 52, rod = 178, bore = 44, wall = 250;

    var frame = el("g", { class: "mc-frame", "stroke-width": 1.3 });
    /* Cylinder, with a flange where it bolts to the crankcase. */
    frame.appendChild(el("path", {
      d: "M " + wall + " " + (cy - bore) + " L 452 " + (cy - bore) +
         " M " + wall + " " + (cy + bore) + " L 452 " + (cy + bore) +
         " M 452 " + (cy - bore) + " L 452 " + (cy + bore)
    }));
    frame.appendChild(el("path", {
      d: "M " + wall + " " + (cy - bore - 12) + " L " + wall + " " + (cy + bore + 12),
      "stroke-width": 1.6
    }));
    [cy - bore - 6, cy + bore + 6].forEach(function (y) {
      frame.appendChild(el("circle", { cx: wall, cy: y, r: 3.2 }));
    });
    frame.appendChild(el("circle", { cx: cx, cy: cy, r: crank, "stroke-dasharray": "4 6", "stroke-width": 0.9 }));
    svg.appendChild(frame);
    svg.appendChild(bedplate(40, 216, 200));
    svg.appendChild(driveShaft(cx, cy, 40, cy));

    var fly = gear(cx, cy, 22, 5.4, { spokes: 4, sw: 1.4 });
    svg.appendChild(fly.node);
    svg.appendChild(bearing(cx, cy, 16));

    var conrod = el("path", { "stroke-width": 2.2 });
    var pin = el("circle", { r: 6, "stroke-width": 1.5 });
    var head = el("g", { "stroke-width": 2 });
    add(head, [
      el("rect", { x: -26, y: -bore + 5, width: 52, height: (bore - 5) * 2, rx: 3 }),
      el("path", {
        d: "M -15 " + (-bore + 14) + " L -15 " + (bore - 14) +
           " M 5 " + (-bore + 14) + " L 5 " + (bore - 14),
        "stroke-width": 1
      })
    ]);
    add(svg, [conrod, head, pin]);

    return {
      svg: svg,
      update: function (p) {
        var th = p * 6.4 * Math.PI;
        spinTo(fly, th * 180 / Math.PI);
        var px = cx + Math.cos(th) * crank, py = cy + Math.sin(th) * crank;
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
    var svg = el("svg", { viewBox: "0 0 460 265", fill: "none", stroke: "currentColor" });
    var c1 = { x: 112, y: 122, r: 68 }, c2 = { x: 342, y: 122, r: 38 };
    var d = c2.x - c1.x, beta = Math.acos((c1.r - c2.r) / d);

    function tp(c, sign) {
      return { x: c.x + Math.cos(sign * beta) * c.r, y: c.y + Math.sin(sign * beta) * c.r };
    }
    var a1 = tp(c1, -1), a2 = tp(c2, -1), b1 = tp(c1, 1), b2 = tp(c2, 1);

    svg.appendChild(bedplate(46, 226, 350));
    add(svg, [
      driveShaft(c1.x, c1.y, 46, c1.y),
      el("path", {
        d: "M " + c1.x + " " + c1.y + " L " + c1.x + " 226 M " + c2.x + " " + c2.y + " L " + c2.x + " 226",
        class: "mc-frame", "stroke-width": 1.2
      })
    ]);

    /* The belt, along the true external tangents. */
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
    add(svg, [p1.node, p2.node, bearing(c1.x, c1.y, 15), bearing(c2.x, c2.y, 11)]);

    return {
      svg: svg,
      update: function (p) {
        var t = p * 700;
        spinTo(p1, t);
        /* A belt couples them by surface speed, so the ratio is by radius. */
        spinTo(p2, t * c1.r / c2.r);
        belt.setAttribute("stroke-dashoffset", (-t * 0.9).toFixed(1));
      }
    };
  };

  /* --- Centrifugal governor -------------------------------------------- */
  /* The arms swing out, and because the lower links are the same length as
     the upper ones the sleeve rises by exactly 2L*cos(a). It is the oldest
     self-regulating machine there is, which is the point. */
  BUILD.governor = function () {
    var svg = el("svg", { viewBox: "0 0 220 280", fill: "none", stroke: "currentColor" });
    var x = 110, top = 62, L = 66, ball = 13;

    svg.appendChild(add(el("g", { class: "mc-frame", "stroke-width": 1.2 }), [
      el("path", { d: "M " + x + " 28 L " + x + " 236" }),
      el("path", { d: "M 62 236 L 158 236" }),
      el("circle", { cx: x, cy: top, r: 4 })
    ]));
    svg.appendChild(bedplate(58, 236, 104));

    var spin = gear(x, 246, 16, 4.6, { spokes: 4, sw: 1.2 });
    svg.appendChild(spin.node);

    var armL = el("path", { "stroke-width": 2 });
    var armR = el("path", { "stroke-width": 2 });
    var linkL = el("path", { "stroke-width": 1.4 });
    var linkR = el("path", { "stroke-width": 1.4 });
    var ballL = el("circle", { r: ball, "stroke-width": 1.8 });
    var ballR = el("circle", { r: ball, "stroke-width": 1.8 });
    var sleeve = el("rect", { x: x - 13, width: 26, height: 16, rx: 2, "stroke-width": 1.6 });
    add(svg, [armL, armR, linkL, linkR, sleeve, ballL, ballR]);

    return {
      svg: svg,
      update: function (p) {
        spinTo(spin, p * 1400);
        /* Opens and closes twice as the section passes. */
        var a = (16 + 30 * (0.5 - 0.5 * Math.cos(p * 4 * Math.PI))) * Math.PI / 180;
        var dx = Math.sin(a) * L, dy = Math.cos(a) * L;
        var sy = top + 2 * dy;
        [[armL, ballL, linkL, -1], [armR, ballR, linkR, 1]].forEach(function (s) {
          var bx = x + s[3] * dx, by = top + dy;
          s[0].setAttribute("d", "M " + x + " " + top + " L " + bx.toFixed(1) + " " + by.toFixed(1));
          s[1].setAttribute("cx", bx.toFixed(1));
          s[1].setAttribute("cy", by.toFixed(1));
          s[2].setAttribute("d", "M " + bx.toFixed(1) + " " + by.toFixed(1) + " L " + x + " " + sy.toFixed(1));
        });
        sleeve.setAttribute("y", (sy - 8).toFixed(1));
      }
    };
  };

  /* --- Eccentric cam and roller follower -------------------------------- */
  BUILD.cam = function () {
    var svg = el("svg", { viewBox: "0 0 240 270", fill: "none", stroke: "currentColor" });
    var sx = 108, sy = 168, R = 52, ecc = 22, roll = 14;

    svg.appendChild(add(el("g", { class: "mc-frame", "stroke-width": 1.2 }), [
      el("path", { d: "M " + (sx - 16) + " 30 L " + (sx - 16) + " 74 M " + (sx + 16) + " 30 L " + (sx + 16) + " 74" }),
      el("circle", { cx: sx, cy: sy, r: 3.5 })
    ]));
    svg.appendChild(bedplate(44, 236, 150));
    svg.appendChild(driveShaft(sx, sy, 194, sy));

    var cam = el("circle", { r: R, "stroke-width": 1.8 });
    var camHub = el("circle", { r: 6, "stroke-width": 1.2 });
    var roller = el("circle", { r: roll, "stroke-width": 1.6 });
    var rod = el("path", { "stroke-width": 2.2 });
    add(svg, [cam, camHub, rod, roller]);
    svg.appendChild(bearing(sx, sy, 14));

    return {
      svg: svg,
      update: function (p) {
        var th = p * 5 * Math.PI;
        var cxx = sx + Math.cos(th) * ecc, cyy = sy + Math.sin(th) * ecc;
        cam.setAttribute("cx", cxx.toFixed(1));
        cam.setAttribute("cy", cyy.toFixed(1));
        camHub.setAttribute("cx", cxx.toFixed(1));
        camHub.setAttribute("cy", cyy.toFixed(1));
        /* The roller sits on the axis, so its height follows from the cam
           centre being off it: dy = sqrt((R+r)^2 - dx^2). */
        var dx = cxx - sx;
        var ry = cyy - Math.sqrt((R + roll) * (R + roll) - dx * dx);
        roller.setAttribute("cx", sx);
        roller.setAttribute("cy", ry.toFixed(1));
        rod.setAttribute("d", "M " + sx + " " + ry.toFixed(1) + " L " + sx + " 34");
      }
    };
  };

  /* --- Ratchet and pawl ------------------------------------------------- */
  /* Turns one way and locks the other — the reason a shift stays shifted. */
  BUILD.ratchet = function () {
    var svg = el("svg", { viewBox: "0 0 240 240", fill: "none", stroke: "currentColor" });
    var cx = 110, cy = 118, r = 74, N = 16, step = TAU / N;

    /* Teeth drawn about the origin so the whole wheel is one rotate(). */
    var d = "M " + xy(r, 0);
    for (var i = 0; i < N; i++) {
      var a = i * step;
      d += " L " + xy(r * 0.78, a + step * 0.62) + " L " + xy(r, a + step);
    }

    var wheel = el("g", {});
    add(wheel, [
      el("path", { d: d + " Z", "stroke-width": 1.6 }),
      el("circle", { r: 20, "stroke-width": 1.3 }),
      el("circle", { r: 5, "stroke-width": 1.2 })
    ]);
    var hub = el("g", { transform: "translate(" + cx + " " + cy + ")" });
    hub.appendChild(wheel);

    svg.appendChild(bedplate(38, 212, 156));
    svg.appendChild(driveShaft(cx, cy, 38, cy));
    svg.appendChild(hub);
    svg.appendChild(bearing(cx, cy, 14));

    /* The pawl: pivoted above and to the right, tip resting on the teeth. */
    var pawl = el("g", { "stroke-width": 1.9 });
    add(pawl, [
      el("path", { d: "M 204 44 L 132 92" }),
      el("circle", { cx: 204, cy: 44, r: 4.5, "stroke-width": 1.3 }),
      el("path", { d: "M 204 44 L 214 30", class: "mc-frame", "stroke-width": 1.2 })
    ]);
    svg.appendChild(pawl);

    return {
      svg: svg,
      update: function (p) {
        var deg = p * 540;
        spinTo({ spin: wheel }, deg);
        /* Rides up the back of a tooth, then drops off its end. */
        var frac = ((deg / (360 / N)) % 1 + 1) % 1;
        pawl.setAttribute("transform", "rotate(" + (-7 + 9 * frac).toFixed(2) + " 204 44)");
      }
    };
  };

  /* ======================================================================
     Mount and drive
     ====================================================================== */
  var machines = [];

  document.querySelectorAll("[data-machine]").forEach(function (host) {
    var build = BUILD[host.dataset.machine];
    if (!build) return;
    var m = build();
    host.appendChild(m.svg);
    machines.push({ host: host, update: m.update, on: true });
  });

  if (!machines.length) return;

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        machines.forEach(function (m) { if (m.host === e.target) m.on = e.isIntersecting; });
      });
      request();
    }, { rootMargin: "35% 0px 35% 0px" });
    machines.forEach(function (m) { io.observe(m.host); });
  }

  var ticking = false;

  function frame() {
    ticking = false;
    var vh = window.innerHeight;
    machines.forEach(function (m) {
      if (!m.on) return;
      var r = m.host.getBoundingClientRect();
      /* 0 as the assembly enters from the bottom, 1 as it leaves the top. */
      var p = 1 - (r.top + r.height) / (vh + r.height);
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
  request();
})();
