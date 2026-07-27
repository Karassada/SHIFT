/* ==========================================================================
   SHIFT — the background system
   Technical line work behind the content, driven by scroll position.

   The subject is what the company actually works on: a routed board, a data
   matrix, a server cluster, a network, a pipeline, storage layers, a signal
   trace, a folder tree. Same discipline as an engineering drawing — real
   geometry, right angles, nothing floating loose — but wired: current runs
   down the traces, indicator lamps blink, cells light as they are written.

   Glow is drawn, not filtered. A wide faint copy of a stroke under a bright
   thin one reads as bloom for a fraction of the cost of feGaussianBlur, and
   a radial gradient behind a lamp reads as an LED. Both survive being
   animated every frame on a phone, which a filter chain does not.

   Everything is deterministic from a single 0..1 progress value, so it reads
   the same going back up as coming down, and it all stops for
   prefers-reduced-motion.
   ========================================================================== */

(function () {
  "use strict";

  if (window.SHIFT_CONFIG.reducedMotion) return;

  var NS = "http://www.w3.org/2000/svg";
  var uid = 0;

  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function add(p, kids) { kids.forEach(function (k) { p.appendChild(k); }); return p; }
  function grp(cls, attrs) {
    attrs = attrs || {};
    attrs.class = cls;
    attrs.fill = attrs.fill || "none";
    attrs.stroke = "currentColor";
    return el("g", attrs);
  }

  /* The lamp gradient. One per drawing, referenced by every LED in it. */
  function lampDefs(svg, id) {
    var g = el("radialGradient", { id: id });
    add(g, [
      el("stop", { offset: "0%", "stop-color": "currentColor", "stop-opacity": "0.85" }),
      el("stop", { offset: "45%", "stop-color": "currentColor", "stop-opacity": "0.25" }),
      el("stop", { offset: "100%", "stop-color": "currentColor", "stop-opacity": "0" })
    ]);
    svg.appendChild(add(el("defs", {}), [g]));
    return id;
  }

  /* An indicator lamp: a bright core inside a soft halo. */
  function led(x, y, gid, core) {
    core = core || 3.4;
    var g = el("g", { class: "mc-lamp", fill: "currentColor", stroke: "none" });
    add(g, [
      el("circle", { cx: x, cy: y, r: core * 4.6, fill: "url(#" + gid + ")" }),
      el("circle", { cx: x, cy: y, r: core })
    ]);
    return g;
  }

  /* Current running down a wire: a wide faint pass under a bright thin one,
     both offset along the path by the same amount. */
  function current(d, period) {
    var dash = "18 " + (period - 18);
    return {
      glow: el("path", { d: d, class: "mc-glow", "stroke-width": 11, "stroke-linecap": "round", "stroke-dasharray": dash }),
      core: el("path", { d: d, class: "mc-signal", "stroke-width": 2.6, "stroke-linecap": "round", "stroke-dasharray": dash })
    };
  }
  function runCurrent(c, period, p, speed, phase) {
    var o = (-(((p * speed + (phase || 0)) % 1) * period)).toFixed(2);
    c.glow.setAttribute("stroke-dashoffset", o);
    c.core.setAttribute("stroke-dashoffset", o);
  }

  /* Deterministic blink. Hard edges read as machine status, not decoration. */
  function blink(p, rate, phase, duty) {
    return ((p * rate + phase) % 1 + 1) % 1 < (duty || 0.5) ? 1 : 0.12;
  }

  function via(x, y) {
    return add(el("g", { fill: "none", stroke: "currentColor" }), [
      el("circle", { cx: x, cy: y, r: 7, "stroke-width": 2 }),
      el("circle", { cx: x, cy: y, r: 2.6, "stroke-width": 1.4 })
    ]);
  }

  var BUILD = {};

  /* --- Routed board, with current and status lamps ---------------------- */
  BUILD.circuit = function () {
    var svg = el("svg", { viewBox: "0 0 480 340", fill: "none" });
    var G = lampDefs(svg, "lamp" + (uid++));

    var frame = grp("mc-frame", { "stroke-width": 1.4 });
    add(frame, [
      el("rect", { x: 14, y: 14, width: 452, height: 312, rx: 6 }),
      el("rect", { x: 28, y: 28, width: 424, height: 284, rx: 3, "stroke-dasharray": "3 6", "stroke-width": 1 })
    ]);
    [[34, 34], [446, 34], [34, 306], [446, 306]].forEach(function (c) {
      frame.appendChild(el("circle", { cx: c[0], cy: c[1], r: 5 }));
    });
    svg.appendChild(frame);

    var TRACES = [
      "M 250 132 L 150 132 L 150 62 L 66 62",
      "M 250 158 L 196 158 L 196 258 L 84 258",
      "M 386 142 L 438 142 L 438 74",
      "M 386 172 L 416 172 L 416 288 L 300 288",
      "M 250 184 L 118 184",
      "M 386 202 L 452 202"
    ];
    var lines = grp("mc-line", { "stroke-width": 2 });
    TRACES.forEach(function (d) { lines.appendChild(el("path", { d: d, "stroke-linecap": "square" })); });
    ["M 66 118 L 116 118 L 116 96 L 176 96",
     "M 84 300 L 168 300 L 168 322",
     "M 300 322 L 380 322 L 380 300"].forEach(function (d) {
      lines.appendChild(el("path", { d: d, "stroke-linecap": "square", "stroke-width": 1.4 }));
    });
    svg.appendChild(lines);

    var pads = grp("mc-line", { "stroke-width": 1.6 });
    [[66, 62], [84, 258], [438, 74], [300, 288], [66, 118], [176, 96], [168, 322]]
      .forEach(function (v) { pads.appendChild(via(v[0], v[1])); });
    [[110, 176], [444, 194]].forEach(function (r) {
      pads.appendChild(el("rect", { x: r[0], y: r[1], width: 16, height: 16, rx: 2 }));
    });
    svg.appendChild(pads);

    var chip = grp("mc-line", { "stroke-width": 2 });
    chip.appendChild(el("rect", { x: 250, y: 112, width: 136, height: 110, rx: 4 }));
    chip.appendChild(el("path", { d: "M 250 128 A 10 10 0 0 0 250 148", "stroke-width": 1.5 }));
    for (var i = 0; i < 4; i++) {
      var y = 132 + i * 26;
      chip.appendChild(el("path", { d: "M 244 " + y + " L 250 " + y, "stroke-width": 3 }));
      chip.appendChild(el("path", { d: "M 386 " + (y + 10) + " L 392 " + (y + 10), "stroke-width": 3 }));
    }
    chip.appendChild(el("rect", { x: 272, y: 134, width: 92, height: 66, rx: 2, "stroke-width": 1, "stroke-dasharray": "4 5" }));
    svg.appendChild(chip);

    var glowG = grp("mc-glow", {});
    var coreG = grp("mc-signal", {});
    var cur = TRACES.map(function (d) {
      var c = current(d, 300);
      glowG.appendChild(c.glow); coreG.appendChild(c.core);
      return c;
    });
    add(svg, [glowG, coreG]);

    /* Status bank along the bottom edge, and one lamp on the package. */
    var lamps = [];
    for (var n = 0; n < 6; n++) {
      var l = led(206 + n * 26, 306, G, 3.2);
      lamps.push(l); svg.appendChild(l);
    }
    var die = led(368, 128, G, 3.6);
    lamps.push(die); svg.appendChild(die);

    return {
      svg: svg,
      update: function (p) {
        cur.forEach(function (c, n) { runCurrent(c, 300, p, 3 + n * 0.4, n * 0.17); });
        lamps.forEach(function (l, n) {
          l.setAttribute("opacity", blink(p, 6 + n * 1.7, n * 0.21, n === 6 ? 0.7 : 0.45));
        });
      }
    };
  };

  /* --- Data matrix, written by a head that leaves a glow ---------------- */
  BUILD.matrix = function () {
    var COLS = 26, ROWS = 8, C = 15, G = 4;
    var W = COLS * (C + G) - G, H = ROWS * (C + G) - G;
    var svg = el("svg", { viewBox: "0 0 " + (W + 40) + " " + (H + 56), fill: "none" });
    var ID = "m" + (uid++);
    var LG = lampDefs(svg, "lamp" + ID);

    function cells(attrs) {
      var g = el("g", attrs);
      for (var r = 0; r < ROWS; r++)
        for (var c = 0; c < COLS; c++)
          g.appendChild(el("rect", { x: 20 + c * (C + G), y: 28 + r * (C + G), width: C, height: C, rx: 1.5 }));
      return g;
    }

    svg.appendChild(cells({ class: "mc-line", fill: "none", stroke: "currentColor", "stroke-width": 1.2 }));

    var clip = el("clipPath", { id: ID });
    var win = el("rect", { x: -150, y: 0, width: 140, height: H + 56 });
    clip.appendChild(win);
    svg.appendChild(add(el("defs", {}), [clip]));

    var clipped = el("g", { "clip-path": "url(#" + ID + ")" });
    clipped.appendChild(cells({ class: "mc-glow", fill: "currentColor", stroke: "none" }));
    clipped.appendChild(cells({ class: "mc-signal", fill: "currentColor", stroke: "none" }));
    svg.appendChild(clipped);

    var frame = grp("mc-frame", { "stroke-width": 1.2 });
    add(frame, [
      el("path", { d: "M 20 18 L " + (20 + W) + " 18" }),
      el("path", { d: "M 20 " + (H + 38) + " L " + (20 + W) + " " + (H + 38) })
    ]);
    for (var c2 = 0; c2 <= COLS; c2 += 2)
      frame.appendChild(el("path", { d: "M " + (20 + c2 * (C + G)) + " 18 L " + (20 + c2 * (C + G)) + " 12" }));
    svg.appendChild(frame);

    var head = grp("mc-signal", { "stroke-width": 2 });
    add(head, [
      el("path", { d: "M 0 12 L 0 " + (H + 44), class: "mc-glow", "stroke-width": 9 }),
      el("path", { d: "M 0 12 L 0 " + (H + 44) }),
      el("path", { d: "M -6 6 L 6 6 L 0 16 Z", fill: "currentColor", stroke: "none" })
    ]);
    svg.appendChild(head);
    var lamp = led(0, H + 50, LG, 3.4);
    svg.appendChild(lamp);

    return {
      svg: svg,
      update: function (p) {
        var x = -150 + p * (W + 190);
        win.setAttribute("x", x.toFixed(1));
        var hx = (x + 140).toFixed(1);
        head.setAttribute("transform", "translate(" + hx + " 0)");
        lamp.setAttribute("transform", "translate(" + hx + " 0)");
        lamp.setAttribute("opacity", blink(p, 22, 0, 0.5));
      }
    };
  };

  /* --- Server cluster: racks of units, each with its own status --------- */
  BUILD.cluster = function () {
    var svg = el("svg", { viewBox: "0 0 470 300", fill: "none" });
    var G = lampDefs(svg, "lamp" + (uid++));
    var RACKS = 3, UNITS = 6, RW = 124, UH = 30, X0 = 22, Y0 = 46, GAPX = 26;

    var frame = grp("mc-frame", { "stroke-width": 1.2 });
    var body = grp("mc-line", { "stroke-width": 1.6 });
    var lamps = [], bars = [];

    for (var r = 0; r < RACKS; r++) {
      var rx = X0 + r * (RW + GAPX);
      frame.appendChild(el("rect", { x: rx - 8, y: Y0 - 14, width: RW + 16, height: UNITS * UH + 26, rx: 4 }));
      frame.appendChild(el("path", { d: "M " + (rx + RW / 2) + " " + (Y0 - 14) + " L " + (rx + RW / 2) + " 26" }));
      for (var u = 0; u < UNITS; u++) {
        var uy = Y0 + u * UH;
        body.appendChild(el("rect", { x: rx, y: uy, width: RW, height: UH - 7, rx: 2 }));
        /* vents */
        for (var v = 0; v < 5; v++)
          body.appendChild(el("path", { d: "M " + (rx + 58 + v * 9) + " " + (uy + 7) + " L " + (rx + 58 + v * 9) + " " + (uy + UH - 14), "stroke-width": 1 }));
        var l = led(rx + 13, uy + (UH - 7) / 2, G, 2.8);
        lamps.push(l);
        var bar = el("rect", { x: rx + 24, y: uy + 8, width: 0, height: 6, rx: 1, class: "mc-signal", fill: "currentColor", stroke: "none" });
        bars.push(bar);
      }
    }
    /* spine linking the racks */
    frame.appendChild(el("path", { d: "M " + (X0 + RW / 2) + " 26 L " + (X0 + 2 * (RW + GAPX) + RW / 2) + " 26" }));
    svg.appendChild(frame);
    svg.appendChild(body);
    var barG = el("g", {});
    bars.forEach(function (b) { barG.appendChild(b); });
    svg.appendChild(barG);
    lamps.forEach(function (l) { svg.appendChild(l); });

    return {
      svg: svg,
      update: function (p) {
        lamps.forEach(function (l, i) {
          l.setAttribute("opacity", blink(p, 5 + (i % 7) * 2.3, i * 0.09, 0.4));
        });
        bars.forEach(function (b, i) {
          var ph = ((p * (2 + (i % 5) * 0.7) + i * 0.13) % 1 + 1) % 1;
          b.setAttribute("width", (6 + ph * 62).toFixed(1));
          b.setAttribute("fill-opacity", (0.25 + (1 - ph) * 0.75).toFixed(3));
        });
      }
    };
  };

  /* --- Network: nodes, links, packets ----------------------------------- */
  BUILD.network = function () {
    var svg = el("svg", { viewBox: "0 0 470 310", fill: "none" });
    var G = lampDefs(svg, "lamp" + (uid++));
    var N = [[62, 158], [148, 74], [148, 244], [244, 126], [244, 216],
             [340, 62], [340, 166], [340, 262], [424, 158]];
    var E = [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4], [3, 5], [3, 6],
             [4, 6], [4, 7], [5, 8], [6, 8], [7, 8]];

    var frame = grp("mc-frame", { "stroke-width": 1 });
    frame.appendChild(el("rect", { x: 16, y: 16, width: 438, height: 278, rx: 4, "stroke-dasharray": "3 6" }));
    svg.appendChild(frame);

    var links = grp("mc-line", { "stroke-width": 1.6 });
    var ds = E.map(function (e) {
      var a = N[e[0]], b = N[e[1]];
      var d = "M " + a[0] + " " + a[1] + " L " + b[0] + " " + b[1];
      links.appendChild(el("path", { d: d }));
      return d;
    });
    svg.appendChild(links);

    var glowG = grp("mc-glow", {}), coreG = grp("mc-signal", {});
    var cur = ds.map(function (d) {
      var c = current(d, 150);
      c.glow.setAttribute("stroke-width", 9);
      c.core.setAttribute("stroke-width", 3.2);
      glowG.appendChild(c.glow); coreG.appendChild(c.core);
      return c;
    });
    add(svg, [glowG, coreG]);

    var nodes = grp("mc-line", { "stroke-width": 2 });
    N.forEach(function (n, i) {
      nodes.appendChild(el("circle", { cx: n[0], cy: n[1], r: i === 0 || i === 8 ? 15 : 11 }));
    });
    svg.appendChild(nodes);

    var ringG = grp("mc-signal", { "stroke-width": 1.6 });
    var rings = N.map(function (n) {
      var r = el("circle", { cx: n[0], cy: n[1], r: 11 });
      ringG.appendChild(r); return r;
    });
    svg.appendChild(ringG);
    var lamps = N.map(function (n) { var l = led(n[0], n[1], G, 3); svg.appendChild(l); return l; });

    return {
      svg: svg,
      update: function (p) {
        cur.forEach(function (c, n) { runCurrent(c, 150, p, 4 + (n % 3), n * 0.11); });
        rings.forEach(function (r, i) {
          var ph = ((p * 2 + i * 0.13) % 1 + 1) % 1;
          r.setAttribute("r", (11 + ph * 14).toFixed(1));
          r.setAttribute("stroke-opacity", (1 - ph).toFixed(3));
        });
        lamps.forEach(function (l, i) { l.setAttribute("opacity", blink(p, 7 + i * 1.3, i * 0.17, 0.55)); });
      }
    };
  };

  /* --- Pipeline: a job moving through stages, each lighting as it lands - */
  BUILD.pipeline = function () {
    var svg = el("svg", { viewBox: "0 0 470 250", fill: "none" });
    var G = lampDefs(svg, "lamp" + (uid++));
    var X = [40, 152, 264, 376], Y = 76, W = 66, H = 76;

    var frame = grp("mc-frame", { "stroke-width": 1.2 });
    var stages = grp("mc-line", { "stroke-width": 1.8 });
    var lamps = [];
    X.forEach(function (x, i) {
      stages.appendChild(el("rect", { x: x, y: Y, width: W, height: H, rx: 3 }));
      for (var r = 0; r < 3; r++)
        stages.appendChild(el("path", {
          d: "M " + (x + 12) + " " + (Y + 22 + r * 17) + " L " + (x + W - 12 - (r === 2 ? 16 : 0)) + " " + (Y + 22 + r * 17),
          "stroke-width": 1
        }));
      var l = led(x + W - 12, Y + 10, G, 3);
      lamps.push(l);
      if (i < X.length - 1) {
        var mx = x + W, nx = X[i + 1];
        frame.appendChild(el("path", { d: "M " + mx + " " + (Y + H / 2) + " L " + (nx - 10) + " " + (Y + H / 2) }));
        frame.appendChild(el("path", { d: "M " + (nx - 14) + " " + (Y + H / 2 - 5) + " L " + (nx - 2) + " " + (Y + H / 2) + " L " + (nx - 14) + " " + (Y + H / 2 + 5) }));
      }
    });
    svg.appendChild(frame);
    svg.appendChild(stages);

    var rail = grp("mc-frame", { "stroke-width": 3 });
    rail.appendChild(el("path", { d: "M 40 196 L 442 196", "stroke-linecap": "round" }));
    svg.appendChild(rail);
    var fillGlow = el("path", { d: "M 40 196 L 40 196", class: "mc-glow", "stroke-width": 10, "stroke-linecap": "round" });
    var fillCore = el("path", { d: "M 40 196 L 40 196", class: "mc-signal", "stroke-width": 3, "stroke-linecap": "round" });
    add(svg, [add(el("g", { fill: "none", stroke: "currentColor" }), [fillGlow, fillCore])]);

    var packet = grp("mc-signal", { "stroke-width": 2 });
    add(packet, [
      el("circle", { r: 22, class: "mc-glow", fill: "currentColor", stroke: "none" }),
      el("rect", { x: -11, y: -11, width: 22, height: 22, rx: 2, fill: "currentColor", "fill-opacity": 0.55 }),
      el("path", { d: "M -4 0 L 4 0 M 0 -4 L 0 4", "stroke-width": 1.6 })
    ]);
    svg.appendChild(packet);
    lamps.forEach(function (l) { svg.appendChild(l); });

    return {
      svg: svg,
      update: function (p) {
        var x = 40 + p * 402;
        packet.setAttribute("transform", "translate(" + x.toFixed(1) + " " + (Y + H / 2) + ")");
        var d = "M 40 196 L " + Math.max(40.1, x).toFixed(1) + " 196";
        fillGlow.setAttribute("d", d); fillCore.setAttribute("d", d);
        /* A stage lamp holds steady once the job has passed it. */
        lamps.forEach(function (l, i) {
          l.setAttribute("opacity", x > X[i] + W / 2 ? 1 : blink(p, 9, i * 0.3, 0.25));
        });
      }
    };
  };

  /* --- Storage layers, written bottom-up -------------------------------- */
  BUILD.stack = function () {
    var svg = el("svg", { viewBox: "0 0 220 290", fill: "none" });
    var G = lampDefs(svg, "lamp" + (uid++));
    var LAYERS = 7, LH = 26, LW = 150, X = 35, TOP = 40;

    var frame = grp("mc-frame", { "stroke-width": 1.2 });
    add(frame, [
      el("path", { d: "M 22 " + (TOP - 12) + " L 22 " + (TOP + LAYERS * LH + 12) }),
      el("path", { d: "M 198 " + (TOP - 12) + " L 198 " + (TOP + LAYERS * LH + 12) })
    ]);
    svg.appendChild(frame);

    var plates = grp("mc-line", { "stroke-width": 1.6 });
    var fills = [], lamps = [];
    for (var i = 0; i < LAYERS; i++) {
      var y = TOP + i * LH;
      plates.appendChild(el("rect", { x: X, y: y, width: LW, height: LH - 5, rx: 2 }));
      plates.appendChild(el("path", { d: "M " + (X + 30) + " " + (y + 10) + " L " + (X + 66) + " " + (y + 10), "stroke-width": 1 }));
      fills.push(el("rect", { x: X, y: y, width: LW, height: LH - 5, rx: 2, fill: "currentColor", stroke: "none", "fill-opacity": 0 }));
      lamps.push(led(X + 14, y + (LH - 5) / 2, G, 2.8));
    }
    svg.appendChild(plates);
    var fg = grp("mc-signal", {});
    fills.forEach(function (f) { fg.appendChild(f); });
    svg.appendChild(fg);
    lamps.forEach(function (l) { svg.appendChild(l); });

    return {
      svg: svg,
      update: function (p) {
        var t = p * LAYERS;
        fills.forEach(function (f, i) {
          var idx = LAYERS - 1 - i;
          f.setAttribute("fill-opacity", (Math.max(0, Math.min(1, t - idx)) * 0.5).toFixed(3));
        });
        lamps.forEach(function (l, i) {
          var idx = LAYERS - 1 - i;
          l.setAttribute("opacity", t > idx + 1 ? 0.9 : (t > idx ? blink(p, 26, i * 0.2, 0.5) : 0.1));
        });
      }
    };
  };

  /* --- Signal on a scope ------------------------------------------------ */
  BUILD.pulse = function () {
    var svg = el("svg", { viewBox: "0 0 250 250", fill: "none" });
    var ID = "s" + (uid++);
    var G = lampDefs(svg, "lamp" + ID);
    var X = 24, Y = 52, W = 202, H = 132;

    var frame = grp("mc-frame", { "stroke-width": 1.2 });
    frame.appendChild(el("rect", { x: X, y: Y, width: W, height: H, rx: 3 }));
    for (var g = 1; g < 4; g++) frame.appendChild(el("path", { d: "M " + X + " " + (Y + g * H / 4) + " L " + (X + W) + " " + (Y + g * H / 4), "stroke-width": 0.8, "stroke-dasharray": "2 5" }));
    for (var v = 1; v < 6; v++) frame.appendChild(el("path", { d: "M " + (X + v * W / 6) + " " + Y + " L " + (X + v * W / 6) + " " + (Y + H), "stroke-width": 0.8, "stroke-dasharray": "2 5" }));
    svg.appendChild(frame);

    var mid = Y + H / 2, hi = Y + 24, lo = Y + H - 24, step = 34, d = "M -240 " + mid;
    for (var i = 0; i < 20; i++) {
      var x0 = -240 + i * step;
      var top = i % 3 === 0 ? hi : (i % 3 === 1 ? lo : mid);
      d += " L " + (x0 + 6) + " " + top + " L " + (x0 + step - 6) + " " + top + " L " + (x0 + step) + " " + mid;
    }

    var clip = el("clipPath", { id: ID });
    clip.appendChild(el("rect", { x: X, y: Y, width: W, height: H }));
    svg.appendChild(add(el("defs", {}), [clip]));

    var wrap = el("g", { "clip-path": "url(#" + ID + ")" });
    var moving = el("g", { fill: "none", stroke: "currentColor" });
    add(moving, [
      el("path", { d: d, class: "mc-glow", "stroke-width": 9, "stroke-linejoin": "round" }),
      el("path", { d: d, class: "mc-signal", "stroke-width": 2.4, "stroke-linejoin": "round" })
    ]);
    wrap.appendChild(moving);
    svg.appendChild(wrap);

    var read = grp("mc-line", { "stroke-width": 1.4 });
    read.appendChild(el("path", { d: "M " + X + " " + (Y + H + 22) + " L " + (X + 54) + " " + (Y + H + 22) }));
    read.appendChild(el("path", { d: "M " + (X + 66) + " " + (Y + H + 22) + " L " + (X + 104) + " " + (Y + H + 22) }));
    svg.appendChild(read);
    var lamp = led(X + W - 12, Y - 14, G, 3.2);
    svg.appendChild(lamp);

    return {
      svg: svg,
      update: function (p) {
        moving.setAttribute("transform", "translate(" + ((p * 5 * step * 3) % (step * 3)).toFixed(1) + " 0)");
        lamp.setAttribute("opacity", blink(p, 14, 0, 0.5));
      }
    };
  };

  /* --- Folder tree, opening as it is walked ----------------------------- */
  BUILD.folders = function () {
    var svg = el("svg", { viewBox: "0 0 250 260", fill: "none" });
    var G = lampDefs(svg, "lamp" + (uid++));

    /* x, y, width, depth — a real directory listing shape. */
    var ITEMS = [
      { x: 30, y: 30, w: 84, root: true },
      { x: 62, y: 74, w: 72 },
      { x: 94, y: 112, w: 62, leaf: true },
      { x: 94, y: 148, w: 62, leaf: true },
      { x: 62, y: 188, w: 72 },
      { x: 94, y: 226, w: 62, leaf: true }
    ];

    var frame = grp("mc-frame", { "stroke-width": 1 });
    var lineG = grp("mc-line", { "stroke-width": 1.8 });
    var edges = [];

    /* Elbow connectors from each parent down to its children. */
    [[0, 1], [1, 2], [1, 3], [0, 4], [4, 5]].forEach(function (e) {
      var a = ITEMS[e[0]], b = ITEMS[e[1]];
      var d = "M " + (a.x + 10) + " " + (a.y + 14) + " L " + (a.x + 10) + " " + (b.y + 9) + " L " + b.x + " " + (b.y + 9);
      var pth = el("path", { d: d, "stroke-dasharray": 260, "stroke-dashoffset": 260 });
      lineG.appendChild(pth);
      edges.push(pth);
    });
    svg.appendChild(frame);
    svg.appendChild(lineG);

    /* A folder: back plate with a raised tab, or a plain sheet for a leaf. */
    function folder(it) {
      var g = grp("mc-line", { "stroke-width": 1.8 });
      if (it.leaf) {
        g.appendChild(el("path", {
          d: "M " + it.x + " " + it.y + " L " + (it.x + it.w - 12) + " " + it.y +
             " L " + (it.x + it.w) + " " + (it.y + 12) + " L " + (it.x + it.w) + " " + (it.y + 22) +
             " L " + it.x + " " + (it.y + 22) + " Z"
        }));
        g.appendChild(el("path", { d: "M " + (it.x + it.w - 12) + " " + it.y + " L " + (it.x + it.w - 12) + " " + (it.y + 12) + " L " + (it.x + it.w) + " " + (it.y + 12), "stroke-width": 1 }));
      } else {
        g.appendChild(el("path", {
          d: "M " + it.x + " " + (it.y + 4) + " L " + (it.x + 22) + " " + (it.y + 4) +
             " L " + (it.x + 28) + " " + (it.y - 3) + " L " + (it.x + it.w) + " " + (it.y - 3) +
             " L " + (it.x + it.w) + " " + (it.y + 22) + " L " + it.x + " " + (it.y + 22) + " Z"
        }));
        g.appendChild(el("path", { d: "M " + (it.x + 8) + " " + (it.y + 13) + " L " + (it.x + it.w - 12) + " " + (it.y + 13), "stroke-width": 1 }));
      }
      return g;
    }

    var lamps = [];
    ITEMS.forEach(function (it) {
      svg.appendChild(folder(it));
      var l = led(it.x + it.w + 12, it.y + 9, G, 2.6);
      lamps.push(l);
      svg.appendChild(l);
    });

    var cursor = grp("mc-signal", {});
    add(cursor, [
      el("circle", { r: 13, class: "mc-glow", fill: "currentColor", stroke: "none" }),
      el("rect", { x: -1.5, y: -9, width: 3, height: 18, fill: "currentColor", stroke: "none" })
    ]);
    svg.appendChild(cursor);

    return {
      svg: svg,
      update: function (p) {
        var t = (((p * 1.3) % 1) + 1) % 1 * ITEMS.length;
        edges.forEach(function (e, i) {
          e.setAttribute("stroke-dashoffset", (260 * (1 - Math.max(0, Math.min(1, t - i)))).toFixed(1));
        });
        var active = Math.min(ITEMS.length - 1, Math.floor(t));
        lamps.forEach(function (l, i) {
          l.setAttribute("opacity", i < active ? 0.75 : (i === active ? blink(p, 20, 0, 0.55) : 0.08));
        });
        var it = ITEMS[active];
        cursor.setAttribute("transform", "translate(" + (it.x + it.w + 12) + " " + (it.y + 9) + ")");
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
      var p = 1 - (r.top + r.height) / (vh + r.height);
      m.update(Math.max(0, Math.min(1, p)));
    });
  }

  function request() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  }

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request, { passive: true });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) request(); });
  request();
})();
