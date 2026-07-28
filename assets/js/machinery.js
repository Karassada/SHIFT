/* ==========================================================================
   SHIFT — the background system

   Two rails pinned to the sides of the window, and one board behind the
   hero. That is all of it. An earlier version drew a machine in every
   section and drove them from the scroll position, which meant dozens of
   SVG attribute writes per frame and a clip window dragged across six
   hundred rectangles — smooth on a phone only because most of it was
   hidden there, and visibly rough on a desktop where several were on
   screen at once.

   Nothing here is driven by scroll. Every moving part is a CSS animation on
   a property the compositor can handle on its own: transform for the
   current travelling down a rail, opacity for the lamps. The page can be
   scrolled as fast as you like and none of this costs a frame.
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

  /* The lamp gradient — one per drawing, referenced by every LED in it. */
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

  /* An indicator lamp: bright core inside a soft halo, blinking in CSS. */
  function led(x, y, gid, core, dur, delay) {
    var g = el("g", { class: "mc-lamp mc-blink", fill: "currentColor", stroke: "none" });
    g.style.animationDuration = dur + "s";
    g.style.animationDelay = delay + "s";
    add(g, [
      el("circle", { cx: x, cy: y, r: core * 4.6, fill: "url(#" + gid + ")" }),
      el("circle", { cx: x, cy: y, r: core })
    ]);
    return g;
  }

  function via(x, y, r) {
    return add(el("g", { fill: "none", stroke: "currentColor" }), [
      el("circle", { cx: x, cy: y, r: r, "stroke-width": 1.6 }),
      el("circle", { cx: x, cy: y, r: r * 0.36, "stroke-width": 1 })
    ]);
  }

  /* ======================================================================
     The edge rails
     ====================================================================== */
  function buildRail(side) {
    var host = document.createElement("div");
    host.className = "railbus railbus--" + side;
    host.setAttribute("aria-hidden", "true");

    var W = 60, H = Math.max(window.innerHeight, 640);
    var svg = el("svg", {
      viewBox: "0 0 " + W + " " + H, width: W, height: H,
      preserveAspectRatio: "xMidYMin meet", fill: "none"
    });
    var G = lampDefs(svg, "rl" + side + (uid++));

    var frame = grp("mc-frame", { "stroke-width": 1 });
    frame.appendChild(el("path", { d: "M 3 0 L 3 " + H, "stroke-dasharray": "2 7" }));
    svg.appendChild(frame);

    var BUS = [16, 32];
    var lines = grp("mc-line", { "stroke-width": 1.8, "stroke-linecap": "square" });
    BUS.forEach(function (x) {
      lines.appendChild(el("path", { d: "M " + x + " -4 L " + x + " " + (H + 4) }));
    });

    /* Branches jogging out to a via, alternating side and bus — the reason a
       real board never looks regular. */
    var MOD = 176, n = 0;
    for (var y = 100; y < H - 40; y += MOD, n++) {
      var from = BUS[n % 2], to = n % 2 ? 52 : 6;
      lines.appendChild(el("path", { d: "M " + from + " " + y + " L " + from + " " + (y + 22) + " L " + to + " " + (y + 22) }));
      lines.appendChild(via(to, y + 22, 4.5));
    }
    svg.appendChild(lines);

    /* Packages docked to the bus at wider intervals. */
    var chips = grp("mc-line", { "stroke-width": 1.5 });
    for (var cy = 200; cy < H - 90; cy += MOD * 2) {
      chips.appendChild(el("rect", { x: 11, y: cy, width: 26, height: 40, rx: 3 }));
      chips.appendChild(el("rect", { x: 16, y: cy + 7, width: 16, height: 26, rx: 1.5, "stroke-width": 1, "stroke-dasharray": "3 4" }));
      for (var pin = 0; pin < 3; pin++) {
        chips.appendChild(el("path", { d: "M 7 " + (cy + 9 + pin * 12) + " L 11 " + (cy + 9 + pin * 12), "stroke-width": 2.2 }));
        chips.appendChild(el("path", { d: "M 37 " + (cy + 9 + pin * 12) + " L 41 " + (cy + 9 + pin * 12), "stroke-width": 2.2 }));
      }
    }
    svg.appendChild(chips);

    /* Current: a short lit segment travelling the length of the bus.
       A transform the compositor can run on its own, rather than a
       stroke-dashoffset the browser has to repaint every frame. */
    var travel = H + 200;
    [[BUS[0], 9.5, 0], [BUS[1], 14.5, 4.2]].forEach(function (cfg) {
      var g = el("g", { class: "rail-pulse" });
      g.style.setProperty("--travel", travel + "px");
      g.style.animationDuration = cfg[1] + "s";
      g.style.animationDelay = "-" + cfg[2] + "s";
      var d = "M " + cfg[0] + " -150 L " + cfg[0] + " -48";
      add(g, [
        el("path", { d: d, class: "mc-glow", "stroke-width": 8, "stroke-linecap": "round", fill: "none", stroke: "currentColor" }),
        el("path", { d: d, class: "mc-signal", "stroke-width": 2.2, "stroke-linecap": "round", fill: "none", stroke: "currentColor" })
      ]);
      svg.appendChild(g);
    });

    var k = 0;
    for (var ly = 142; ly < H - 40; ly += MOD, k++) {
      svg.appendChild(led(k % 2 ? 46 : 44, ly, G, 2.5, 4.6 + (k % 3) * 1.7, k * 0.53));
    }

    host.appendChild(svg);
    return host;
  }

  /* ======================================================================
     The board behind the hero
     ====================================================================== */
  function buildBoard(host) {
    var svg = el("svg", { viewBox: "0 0 480 340", fill: "none" });
    var G = lampDefs(svg, "bd" + (uid++));

    var frame = grp("mc-frame", { "stroke-width": 1.3 });
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
    var lines = grp("mc-line", { "stroke-width": 1.9 });
    TRACES.forEach(function (d) { lines.appendChild(el("path", { d: d, "stroke-linecap": "square" })); });
    ["M 66 118 L 116 118 L 116 96 L 176 96",
     "M 84 300 L 168 300 L 168 322",
     "M 300 322 L 380 322 L 380 300"].forEach(function (d) {
      lines.appendChild(el("path", { d: d, "stroke-linecap": "square", "stroke-width": 1.3 }));
    });
    [[66, 62], [84, 258], [438, 74], [300, 288], [66, 118], [176, 96], [168, 322]]
      .forEach(function (v) { lines.appendChild(via(v[0], v[1], 6.5)); });
    [[110, 176], [444, 194]].forEach(function (r) {
      lines.appendChild(el("rect", { x: r[0], y: r[1], width: 16, height: 16, rx: 2, "stroke-width": 1.5 }));
    });
    svg.appendChild(lines);

    var chip = grp("mc-line", { "stroke-width": 1.9 });
    chip.appendChild(el("rect", { x: 250, y: 112, width: 136, height: 110, rx: 4 }));
    chip.appendChild(el("path", { d: "M 250 128 A 10 10 0 0 0 250 148", "stroke-width": 1.4 }));
    for (var i = 0; i < 4; i++) {
      var y = 132 + i * 26;
      chip.appendChild(el("path", { d: "M 244 " + y + " L 250 " + y, "stroke-width": 2.8 }));
      chip.appendChild(el("path", { d: "M 386 " + (y + 10) + " L 392 " + (y + 10), "stroke-width": 2.8 }));
    }
    chip.appendChild(el("rect", { x: 272, y: 134, width: 92, height: 66, rx: 2, "stroke-width": 1, "stroke-dasharray": "4 5" }));
    svg.appendChild(chip);

    /* Two traces carry current. Two, not six — the point is a board that is
       quietly powered, not one that is busy. */
    [[TRACES[0], 11, 0], [TRACES[3], 16, 5]].forEach(function (cfg) {
      var g = el("g", { fill: "none", stroke: "currentColor" });
      g.style.animationDuration = cfg[1] + "s";
      g.style.animationDelay = "-" + cfg[2] + "s";
      add(g, [
        el("path", { d: cfg[0], class: "mc-glow board-flow", "stroke-width": 7, "stroke-linecap": "round", "stroke-dasharray": "16 304" }),
        el("path", { d: cfg[0], class: "mc-signal board-flow", "stroke-width": 2.2, "stroke-linecap": "round", "stroke-dasharray": "16 304" })
      ]);
      g.querySelectorAll("path").forEach(function (p) {
        p.style.animationDuration = cfg[1] + "s";
        p.style.animationDelay = "-" + cfg[2] + "s";
      });
      svg.appendChild(g);
    });

    [[206, 306, 5.2, 0], [258, 306, 6.8, 1.1], [310, 306, 4.4, 2.3], [368, 128, 7.5, 0.6]]
      .forEach(function (l) { svg.appendChild(led(l[0], l[1], G, 3, l[2], l[3])); });

    host.appendChild(svg);
  }

  /* ======================================================================
     Mount
     ====================================================================== */
  var board = document.querySelector('[data-machine="circuit"]');
  if (board) buildBoard(board);

  var rails = [];
  function mountRails() {
    rails.forEach(function (h) { h.remove(); });
    rails = [buildRail("left"), buildRail("right")];
    rails.forEach(function (h) { document.body.appendChild(h); });
  }
  mountRails();

  /* Rebuild only when the height genuinely changed — mobile browsers fire
     resize constantly as the URL bar hides. */
  var timer = null, lastH = window.innerHeight;
  window.addEventListener("resize", function () {
    if (Math.abs(window.innerHeight - lastH) < 140) return;
    lastH = window.innerHeight;
    window.clearTimeout(timer);
    timer = window.setTimeout(mountRails, 220);
  }, { passive: true });
})();
