/* ==========================================================================
   SHIFT — the background system
   Technical line work behind the content, driven by scroll position.

   The subject is what the company actually works on: circuit traces, a data
   matrix, a network of connected nodes, a processing pipeline, storage
   layers, a signal trace, a dependency tree. Same discipline as a drawing —
   real geometry, right angles, nothing decorative floating loose — and the
   accent colour is reserved for the parts that are *moving*: the signal on
   the trace, the packet in the pipeline, the cells currently being written.

   Everything is deterministic from a single 0..1 progress value, so it reads
   the same on the way back up as on the way down, and it all stops for
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
  function add(parent, kids) { kids.forEach(function (k) { parent.appendChild(k); }); return parent; }
  function grp(cls, attrs) { attrs = attrs || {}; attrs.class = cls; attrs.fill = attrs.fill || "none"; attrs.stroke = "currentColor"; return el("g", attrs); }

  /* A dashed copy of a trace, offset along its own length, reads as a signal
     travelling down the wire. No path measurement needed — the dash pattern
     does the work. */
  function signal(d, period, width) {
    return el("path", {
      d: d, "stroke-width": width || 2.6, "stroke-linecap": "round",
      "stroke-dasharray": "14 " + (period - 14), "stroke-dashoffset": 0
    });
  }
  function runSignal(node, period, p, speed, phase) {
    node.setAttribute("stroke-dashoffset",
      (-(((p * speed + (phase || 0)) % 1) * period)).toFixed(2));
  }

  function via(x, y) {
    return add(el("g", { fill: "none", stroke: "currentColor" }), [
      el("circle", { cx: x, cy: y, r: 7, "stroke-width": 2 }),
      el("circle", { cx: x, cy: y, r: 2.6, "stroke-width": 1.4 })
    ]);
  }

  var BUILD = {};

  /* --- Circuit board: the hero piece ------------------------------------ */
  BUILD.circuit = function () {
    var svg = el("svg", { viewBox: "0 0 480 340", fill: "none" });
    var ID = "c" + (uid++);

    /* Board outline and mounting holes. */
    var frame = grp("mc-frame", { "stroke-width": 1.4 });
    add(frame, [
      el("rect", { x: 14, y: 14, width: 452, height: 312, rx: 6 }),
      el("rect", { x: 28, y: 28, width: 424, height: 284, rx: 3, "stroke-dasharray": "3 6", "stroke-width": 1 })
    ]);
    [[34, 34], [446, 34], [34, 306], [446, 306]].forEach(function (c) {
      frame.appendChild(el("circle", { cx: c[0], cy: c[1], r: 5 }));
    });
    svg.appendChild(frame);

    /* The traces. Right angles only, the way a board is actually routed. */
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
    /* A few unrouted traces, for density. */
    ["M 66 118 L 116 118 L 116 96 L 176 96",
     "M 84 300 L 168 300 L 168 322",
     "M 300 322 L 380 322 L 380 300"].forEach(function (d) {
      lines.appendChild(el("path", { d: d, "stroke-linecap": "square", "stroke-width": 1.4 }));
    });
    svg.appendChild(lines);

    /* Vias and pads. */
    var pads = grp("mc-line", { "stroke-width": 1.6 });
    [[66, 62], [84, 258], [438, 74], [300, 288], [66, 118], [176, 96], [168, 322]].forEach(function (v) {
      pads.appendChild(via(v[0], v[1]));
    });
    [[110, 176, 16, 16], [444, 194, 16, 16]].forEach(function (r) {
      pads.appendChild(el("rect", { x: r[0], y: r[1], width: r[2], height: r[3], rx: 2 }));
    });
    svg.appendChild(pads);

    /* The package in the middle, with its pins and orientation notch. */
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

    /* The signals. */
    var sigG = grp("mc-signal", {});
    var sigs = TRACES.map(function (d, n) {
      var s = signal(d, 300);
      sigG.appendChild(s);
      return s;
    });
    svg.appendChild(sigG);

    return {
      svg: svg,
      update: function (p) {
        sigs.forEach(function (s, n) { runSignal(s, 300, p, 3 + n * 0.4, n * 0.17); });
      }
    };
  };

  /* --- Data matrix: cells filling as the write head passes -------------- */
  BUILD.matrix = function () {
    var COLS = 26, ROWS = 8, C = 15, G = 4;
    var W = COLS * (C + G) - G, H = ROWS * (C + G) - G;
    var svg = el("svg", { viewBox: "0 0 " + (W + 40) + " " + (H + 56), fill: "none" });
    var ID = "m" + (uid++);

    var cells = function (attrs) {
      var g = el("g", attrs);
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          g.appendChild(el("rect", {
            x: 20 + c * (C + G), y: 28 + r * (C + G), width: C, height: C, rx: 1.5
          }));
        }
      }
      return g;
    };

    /* Outlines always; the filled copy is revealed only inside a moving
       window, so a band of cells reads as currently being written. */
    var outline = cells({ class: "mc-line", fill: "none", stroke: "currentColor", "stroke-width": 1.2 });
    svg.appendChild(outline);

    var clip = el("clipPath", { id: ID });
    var win = el("rect", { x: -140, y: 0, width: 130, height: H + 56 });
    clip.appendChild(win);
    svg.appendChild(add(el("defs", {}), [clip]));

    var filled = cells({ class: "mc-signal", fill: "currentColor", stroke: "none" });
    var clipped = el("g", { "clip-path": "url(#" + ID + ")" });
    clipped.appendChild(filled);
    svg.appendChild(clipped);

    /* Column ruler and the head itself. */
    var frame = grp("mc-frame", { "stroke-width": 1.2 });
    add(frame, [
      el("path", { d: "M 20 18 L " + (20 + W) + " 18" }),
      el("path", { d: "M 20 " + (H + 38) + " L " + (20 + W) + " " + (H + 38) })
    ]);
    for (var c2 = 0; c2 <= COLS; c2 += 2) {
      frame.appendChild(el("path", { d: "M " + (20 + c2 * (C + G)) + " 18 L " + (20 + c2 * (C + G)) + " 12" }));
    }
    svg.appendChild(frame);

    var head = grp("mc-signal", { "stroke-width": 2 });
    var headLine = el("path", { d: "M 0 12 L 0 " + (H + 44) });
    var headTip = el("path", { d: "M -6 6 L 6 6 L 0 16 Z", fill: "currentColor", stroke: "none" });
    add(head, [headLine, headTip]);
    svg.appendChild(head);

    return {
      svg: svg,
      update: function (p) {
        var x = -140 + p * (W + 180);
        win.setAttribute("x", x.toFixed(1));
        head.setAttribute("transform", "translate(" + (x + 130).toFixed(1) + " 0)");
      }
    };
  };

  /* --- Network: nodes, links, packets ----------------------------------- */
  BUILD.network = function () {
    var svg = el("svg", { viewBox: "0 0 470 310", fill: "none" });
    var N = [[62, 158], [148, 74], [148, 244], [244, 126], [244, 216],
             [340, 62], [340, 166], [340, 262], [424, 158]];
    var E = [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4], [3, 5], [3, 6],
             [4, 6], [4, 7], [5, 8], [6, 8], [7, 8]];

    var frame = grp("mc-frame", { "stroke-width": 1 });
    frame.appendChild(el("rect", { x: 16, y: 16, width: 438, height: 278, rx: 4, "stroke-dasharray": "3 6" }));
    svg.appendChild(frame);

    var links = grp("mc-line", { "stroke-width": 1.6 });
    var paths = E.map(function (e) {
      var a = N[e[0]], b = N[e[1]];
      var d = "M " + a[0] + " " + a[1] + " L " + b[0] + " " + b[1];
      links.appendChild(el("path", { d: d }));
      return d;
    });
    svg.appendChild(links);

    var sigG = grp("mc-signal", {});
    var sigs = paths.map(function (d) { var s = signal(d, 160, 3.4); sigG.appendChild(s); return s; });
    svg.appendChild(sigG);

    var nodes = grp("mc-line", { "stroke-width": 2 });
    var rings = N.map(function (n, i) {
      nodes.appendChild(el("circle", { cx: n[0], cy: n[1], r: i === 0 || i === 8 ? 15 : 11 }));
      nodes.appendChild(el("circle", { cx: n[0], cy: n[1], r: 3.4, fill: "currentColor", stroke: "none" }));
      var ring = el("circle", { cx: n[0], cy: n[1], r: 11, "stroke-width": 1.6, class: "mc-signal" });
      return ring;
    });
    svg.appendChild(nodes);
    var ringG = el("g", { fill: "none", stroke: "currentColor" });
    rings.forEach(function (r) { ringG.appendChild(r); });
    svg.appendChild(ringG);

    return {
      svg: svg,
      update: function (p) {
        sigs.forEach(function (s, n) { runSignal(s, 160, p, 4 + (n % 3), n * 0.11); });
        /* Each node breathes on its own phase, so the graph looks alive
           rather than synchronised. */
        rings.forEach(function (r, i) {
          var ph = (p * 2 + i * 0.13) % 1;
          r.setAttribute("r", (11 + ph * 13).toFixed(1));
          r.setAttribute("stroke-opacity", (1 - ph).toFixed(3));
        });
      }
    };
  };

  /* --- Pipeline: a job moving through stages ---------------------------- */
  BUILD.pipeline = function () {
    var svg = el("svg", { viewBox: "0 0 470 250", fill: "none" });
    var X = [40, 152, 264, 376], Y = 76, W = 66, H = 76;

    var frame = grp("mc-frame", { "stroke-width": 1.2 });
    var stages = grp("mc-line", { "stroke-width": 1.8 });
    X.forEach(function (x, i) {
      stages.appendChild(el("rect", { x: x, y: Y, width: W, height: H, rx: 3 }));
      for (var r = 0; r < 3; r++) {
        stages.appendChild(el("path", {
          d: "M " + (x + 12) + " " + (Y + 20 + r * 18) + " L " + (x + W - 12 - (r === 2 ? 16 : 0)) + " " + (Y + 20 + r * 18),
          "stroke-width": 1
        }));
      }
      if (i < X.length - 1) {
        var mx = x + W, nx = X[i + 1];
        frame.appendChild(el("path", { d: "M " + mx + " " + (Y + H / 2) + " L " + (nx - 10) + " " + (Y + H / 2) }));
        frame.appendChild(el("path", { d: "M " + (nx - 14) + " " + (Y + H / 2 - 5) + " L " + (nx - 2) + " " + (Y + H / 2) + " L " + (nx - 14) + " " + (Y + H / 2 + 5) }));
      }
    });
    svg.appendChild(frame);
    svg.appendChild(stages);

    /* Progress rail. */
    var rail = grp("mc-frame", { "stroke-width": 3 });
    rail.appendChild(el("path", { d: "M 40 196 L 442 196", "stroke-linecap": "round" }));
    svg.appendChild(rail);
    var fill = grp("mc-signal", { "stroke-width": 3 });
    var fillLine = el("path", { d: "M 40 196 L 40 196", "stroke-linecap": "round" });
    fill.appendChild(fillLine);
    svg.appendChild(fill);

    var packet = grp("mc-signal", { "stroke-width": 2 });
    add(packet, [
      el("rect", { x: -11, y: -11, width: 22, height: 22, rx: 2, fill: "currentColor", "fill-opacity": 0.5 }),
      el("path", { d: "M -4 0 L 4 0 M 0 -4 L 0 4", "stroke-width": 1.6 })
    ]);
    svg.appendChild(packet);

    return {
      svg: svg,
      update: function (p) {
        var x = 40 + p * 402;
        packet.setAttribute("transform", "translate(" + x.toFixed(1) + " " + (Y + H / 2) + ")");
        fillLine.setAttribute("d", "M 40 196 L " + Math.max(40.1, x).toFixed(1) + " 196");
      }
    };
  };

  /* --- Storage: layers written from the bottom up ----------------------- */
  BUILD.stack = function () {
    var svg = el("svg", { viewBox: "0 0 220 290", fill: "none" });
    var LAYERS = 7, LH = 26, LW = 150, X = 35, TOP = 40;

    var frame = grp("mc-frame", { "stroke-width": 1.2 });
    add(frame, [
      el("path", { d: "M 22 " + (TOP - 12) + " L 22 " + (TOP + LAYERS * LH + 12) }),
      el("path", { d: "M 198 " + (TOP - 12) + " L 198 " + (TOP + LAYERS * LH + 12) })
    ]);
    svg.appendChild(frame);

    var plates = grp("mc-line", { "stroke-width": 1.6 });
    var fills = [];
    for (var i = 0; i < LAYERS; i++) {
      var y = TOP + i * LH;
      plates.appendChild(el("rect", { x: X, y: y, width: LW, height: LH - 5, rx: 2 }));
      plates.appendChild(el("path", { d: "M " + (X + 10) + " " + (y + 10) + " L " + (X + 42) + " " + (y + 10), "stroke-width": 1 }));
      var f = el("rect", { x: X, y: y, width: LW, height: LH - 5, rx: 2, fill: "currentColor", stroke: "none", "fill-opacity": 0 });
      fills.push(f);
    }
    svg.appendChild(plates);
    var fillG = grp("mc-signal", {});
    fills.forEach(function (f) { fillG.appendChild(f); });
    svg.appendChild(fillG);

    var headG = grp("mc-signal", { "stroke-width": 2 });
    var head = el("path", { d: "M " + (X - 20) + " 0 L " + (X - 6) + " 0 M " + (X - 11) + " -5 L " + (X - 6) + " 0 L " + (X - 11) + " 5" });
    headG.appendChild(head);
    svg.appendChild(headG);

    return {
      svg: svg,
      update: function (p) {
        /* Fills bottom-up, one layer at a time, with the head alongside. */
        var t = p * LAYERS;
        fills.forEach(function (f, i) {
          var idx = LAYERS - 1 - i;                 /* bottom layer first */
          var v = Math.max(0, Math.min(1, t - idx));
          f.setAttribute("fill-opacity", (v * 0.55).toFixed(3));
        });
        var active = Math.min(LAYERS - 1, Math.floor(t));
        headG.setAttribute("transform",
          "translate(0 " + (TOP + (LAYERS - 1 - active) * LH + (LH - 5) / 2).toFixed(1) + ")");
      }
    };
  };

  /* --- Signal trace on a scope ------------------------------------------ */
  BUILD.pulse = function () {
    var svg = el("svg", { viewBox: "0 0 250 250", fill: "none" });
    var ID = "s" + (uid++);
    var X = 24, Y = 52, W = 202, H = 132;

    var frame = grp("mc-frame", { "stroke-width": 1.2 });
    frame.appendChild(el("rect", { x: X, y: Y, width: W, height: H, rx: 3 }));
    for (var g = 1; g < 4; g++) frame.appendChild(el("path", { d: "M " + X + " " + (Y + g * H / 4) + " L " + (X + W) + " " + (Y + g * H / 4), "stroke-width": 0.8, "stroke-dasharray": "2 5" }));
    for (var v = 1; v < 6; v++) frame.appendChild(el("path", { d: "M " + (X + v * W / 6) + " " + Y + " L " + (X + v * W / 6) + " " + (Y + H), "stroke-width": 0.8, "stroke-dasharray": "2 5" }));
    svg.appendChild(frame);

    /* A square-ish wave repeated well past the window, then scrolled. */
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
    var moving = grp("mc-signal", { "stroke-width": 2.4, "stroke-linejoin": "round" });
    moving.appendChild(el("path", { d: d }));
    wrap.appendChild(moving);
    svg.appendChild(wrap);

    var read = grp("mc-line", { "stroke-width": 1.4 });
    read.appendChild(el("path", { d: "M " + X + " " + (Y + H + 22) + " L " + (X + 54) + " " + (Y + H + 22) }));
    read.appendChild(el("path", { d: "M " + (X + 66) + " " + (Y + H + 22) + " L " + (X + 104) + " " + (Y + H + 22) }));
    svg.appendChild(read);

    return {
      svg: svg,
      update: function (p) {
        moving.setAttribute("transform", "translate(" + ((p * 5 * step * 3) % (step * 3)).toFixed(1) + " 0)");
      }
    };
  };

  /* --- Dependency tree, drawing itself in ------------------------------- */
  BUILD.tree = function () {
    var svg = el("svg", { viewBox: "0 0 250 250", fill: "none" });
    var ROOT = [40, 34];
    var ITEMS = [
      { x: 74, y: 72,  kids: [[108, 100], [108, 128]] },
      { x: 74, y: 164, kids: [[108, 192], [108, 220]] }
    ];

    var frame = grp("mc-frame", { "stroke-width": 1 });
    frame.appendChild(el("path", { d: "M 22 24 L 22 232", "stroke-dasharray": "3 5" }));
    svg.appendChild(frame);

    var edges = [];
    ITEMS.forEach(function (it) {
      edges.push("M " + ROOT[0] + " " + (ROOT[1] + 8) + " L " + ROOT[0] + " " + it.y + " L " + it.x + " " + it.y);
      it.kids.forEach(function (k) {
        edges.push("M " + it.x + " " + (it.y + 8) + " L " + it.x + " " + k[1] + " L " + k[0] + " " + k[1]);
      });
    });

    var lineG = grp("mc-line", { "stroke-width": 2 });
    var drawn = edges.map(function (d) {
      var pth = el("path", { d: d, "stroke-dasharray": 200, "stroke-dashoffset": 200 });
      lineG.appendChild(pth);
      return pth;
    });
    svg.appendChild(lineG);

    function chip(x, y, w, cls) {
      var g = grp(cls, { "stroke-width": 1.6 });
      g.appendChild(el("rect", { x: x, y: y - 8, width: w, height: 17, rx: 2 }));
      g.appendChild(el("path", { d: "M " + (x + 6) + " " + (y + 0.5) + " L " + (x + w - 8) + " " + (y + 0.5), "stroke-width": 1 }));
      return g;
    }

    var nodes = [chip(ROOT[0] - 12, ROOT[1], 62, "mc-line")];
    ITEMS.forEach(function (it) {
      nodes.push(chip(it.x, it.y, 54, "mc-line"));
      it.kids.forEach(function (k) { nodes.push(chip(k[0], k[1], 46, "mc-line")); });
    });
    nodes.forEach(function (n) { svg.appendChild(n); });

    var cursorG = grp("mc-signal", { "stroke-width": 2 });
    cursorG.appendChild(el("rect", { x: 0, y: -9, width: 3, height: 18, fill: "currentColor", stroke: "none" }));
    svg.appendChild(cursorG);

    return {
      svg: svg,
      update: function (p) {
        var t = ((p * 1.4) % 1) * drawn.length;
        drawn.forEach(function (pt, i) {
          pt.setAttribute("stroke-dashoffset", (200 * (1 - Math.max(0, Math.min(1, t - i)))).toFixed(1));
        });
        var active = Math.min(nodes.length - 1, Math.floor(t));
        var box = nodes[active].firstChild;
        cursorG.setAttribute("transform", "translate(" +
          (parseFloat(box.getAttribute("x")) + parseFloat(box.getAttribute("width")) + 6) + " " +
          (parseFloat(box.getAttribute("y")) + 8.5) + ")");
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
      /* 0 as it enters from the bottom, 1 as it leaves the top. */
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
