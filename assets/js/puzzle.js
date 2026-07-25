/* ==========================================================================
   SHIFT — the board
   A sliding-tile puzzle with one free cell. It arrives scrambled and then
   solves itself into a chevron pointing the way the page reads: right on
   desktop, down on a phone. Disturb it by clicking a tile and it reorganises
   itself back into order a few seconds later.

   That is the company's argument, made mechanical: things move into a better
   arrangement, one shift at a time.
   ========================================================================== */

(function () {
  "use strict";

  var board = document.querySelector("[data-board]");
  if (!board) return;

  var reduced = window.SHIFT_CONFIG.reducedMotion;

  var CELLS = 12;
  var GAP_HOME = 11;          /* the free cell in the solved arrangement */
  var TILE_COUNT = CELLS - 1; /* 11 tiles, DOM order = solved position    */

  /* The chevron, described as solved positions, per board geometry. */
  var ARROWS = {
    "4x3": [2, 4, 5, 6, 7, 10],  /* pointing right  */
    "3x4": [1, 4, 6, 7, 8, 10]   /* pointing down   */
  };

  var tiles = Array.prototype.slice.call(board.querySelectorAll(".tile"));
  var slot = board.querySelector(".slot");
  if (tiles.length !== TILE_COUNT) return;

  var cols = 4, rows = 3;
  var pos = [];        /* pos[tileIndex] = current cell */
  var gap = GAP_HOME;
  var history = [];    /* tiles moved since solved, newest last */
  var idleTimer = null;
  var solving = false;

  /* ---------------------------------------------------------------------- */

  function readGeometry() {
    var cs = getComputedStyle(board);
    var c = parseInt(cs.getPropertyValue("--cols"), 10);
    var r = parseInt(cs.getPropertyValue("--rows"), 10);
    return { cols: c > 0 ? c : 4, rows: r > 0 ? r : 3 };
  }

  function paintArrow() {
    var set = ARROWS[cols + "x" + rows] || [];
    tiles.forEach(function (tile, i) {
      tile.classList.toggle("tile--accent", set.indexOf(i) !== -1);
    });
  }

  function render() {
    tiles.forEach(function (tile, i) {
      tile.style.setProperty("--tx", pos[i] % cols);
      tile.style.setProperty("--ty", Math.floor(pos[i] / cols));
    });
    if (slot) {
      slot.style.setProperty("--tx", gap % cols);
      slot.style.setProperty("--ty", Math.floor(gap / cols));
    }
    markMovable();
  }

  function neighbours(cell) {
    var r = Math.floor(cell / cols);
    var c = cell % cols;
    var out = [];
    if (r > 0)        out.push(cell - cols);
    if (r < rows - 1) out.push(cell + cols);
    if (c > 0)        out.push(cell - 1);
    if (c < cols - 1) out.push(cell + 1);
    return out;
  }

  function tileAt(cell) {
    for (var i = 0; i < pos.length; i++) if (pos[i] === cell) return i;
    return -1;
  }

  function markMovable() {
    var movable = neighbours(gap).map(tileAt);
    tiles.forEach(function (tile, i) {
      tile.classList.toggle("can-move", movable.indexOf(i) !== -1);
    });
  }

  /* Move a tile into the free cell. Returns false if it is not adjacent. */
  function move(tileIndex, record) {
    if (tileIndex < 0) return false;
    if (neighbours(gap).indexOf(pos[tileIndex]) === -1) return false;
    var from = pos[tileIndex];
    pos[tileIndex] = gap;
    gap = from;
    if (record !== false) history.push(tileIndex);
    render();
    return true;
  }

  function reset() {
    pos = [];
    for (var i = 0; i < TILE_COUNT; i++) pos.push(i);
    gap = GAP_HOME;
    history = [];
  }

  /* Scrambling by legal moves only — the board is always solvable, because
     the solution is simply the moves played backwards. */
  function scramble(count) {
    var last = -1;
    for (var n = 0; n < count; n++) {
      var options = neighbours(gap).map(tileAt).filter(function (t) {
        return t !== -1 && t !== last;   /* don't immediately undo */
      });
      if (!options.length) continue;
      var pick = options[Math.floor(Math.random() * options.length)];
      last = pick;
      move(pick, true);
    }
  }

  function solve(stepMs, done) {
    if (solving) return;
    if (!history.length) { if (done) done(); return; }
    solving = true;
    (function step() {
      var t = history.pop();
      move(t, false);
      if (history.length) {
        window.setTimeout(step, stepMs);
      } else {
        solving = false;
        board.classList.add("is-solved");
        if (done) done();
      }
    })();
  }

  function scheduleTidy() {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(function () { solve(190); }, 5200);
  }

  /* ---------------------------------------------------------------------- */

  var geo = readGeometry();
  cols = geo.cols; rows = geo.rows;
  reset();
  paintArrow();

  if (reduced) {
    /* Solved, still, and complete. Nothing to watch. */
    render();
    board.classList.add("is-ready", "is-settled", "is-solved");
    return;
  }

  /* Tiles carry a stagger index for the entrance. */
  tiles.forEach(function (tile, i) { tile.style.setProperty("--i", i); });

  scramble(9);
  render();

  /* Let the entrance stagger play, then take the board apart into order. */
  requestAnimationFrame(function () {
    board.classList.add("is-ready");
    window.setTimeout(function () {
      board.classList.add("is-settled");
      solve(200);
    }, 900);
  });

  board.addEventListener("click", function (e) {
    var tile = e.target.closest(".tile");
    if (!tile || solving) return;
    var i = tiles.indexOf(tile);
    if (move(i, true)) {
      board.classList.remove("is-solved");
      scheduleTidy();
    }
  });

  /* A change of orientation changes what the cells mean — rebuild in place. */
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      var next = readGeometry();
      if (next.cols === cols && next.rows === rows) return;
      cols = next.cols; rows = next.rows;
      solving = false;
      window.clearTimeout(idleTimer);
      reset();
      paintArrow();
      render();
      board.classList.add("is-solved");
    }, 180);
  }, { passive: true });
})();
