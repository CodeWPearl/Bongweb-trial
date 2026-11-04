/*
  Bongweb "grow" section: a living tree that grows as you scroll.

  It opens underground on a glowing seed with golden roots. A shoot of light breaks the surface,
  the trunk twists upward with cyan veins of light, and each branch carries one part of the studio
  as a clay island. The crown fills in, then the camera pulls back to show the whole tree.

  Everything except the islands is drawn on a canvas. Islands are images in a DOM layer
  (.grow-world) that moves with the same camera, so they stay crisp and clickable.
  Add ?grow=7.5 to the URL to pin the story at a point (for testing).
*/
(function () {
  "use strict";
  var section = document.getElementById("grow");
  if (!section) return;
  var stage = section.querySelector(".grow-stage");
  var canvas = section.querySelector(".grow-canvas");
  var world = section.querySelector(".grow-world");
  var ctx = canvas.getContext("2d");
  var reduceMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  var groups = window.BONGWEB_GROUPS || [];
  var services = window.BONGWEB_SERVICES || [];

  var STOPS = [
    { id: "build", img: "assets/clay/build.webp", alt: "Clay builders at a desk, one typing code, one carrying a block to a glowing website panel" },
    { id: "brand", img: "assets/clay/brand.webp", alt: "Clay designers pinning photos and colour swatches to a board" },
    { id: "content", img: "assets/clay/content.webp", alt: "A clay camera operator filming a creator beside a ring light" },
    { id: "growth", img: "assets/clay/growth.webp", alt: "Clay paper planes flying up past a rising bar chart" },
    { id: "checked", img: "assets/clay/checked.webp", alt: "A clay reviewer reading a long scroll through a magnifying glass while another stamps approval" },
  ];
  var CHECKED = {
    name: "Checked", promise: "Nothing ships unchecked.",
    items: ["Senior review on every piece", "One-page scope", "Fixed price", "A date we keep", "Handover note"],
  };
  var SIDE = [1, -1, 1, -1, 1];
  var PI = Math.PI, STEP = 2.5;

  /* ---------- helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function backOut(t) { if (t <= 0) return 0; if (t >= 1) return 1; var c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function angDiff(target, a) { var d = target - a; while (d > PI) d -= 2 * PI; while (d < -PI) d += 2 * PI; return d; }
  function makeCanvas(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function cyan(a) { return "rgba(56,224,240," + a + ")"; }
  function cyanCore(a) { return "rgba(206,255,255," + a + ")"; }
  function gold(a) { return "rgba(255,156,60," + a + ")"; }
  function goldCore(a) { return "rgba(255,232,178," + a + ")"; }

  /* ---------- sprites ---------- */
  function barkSprite(light, mid, dark) {
    var s = 96, c = makeCanvas(s, s), x = c.getContext("2d");
    var g = x.createRadialGradient(s * 0.34, s * 0.3, s * 0.02, s * 0.5, s * 0.5, s * 0.5);
    g.addColorStop(0, light); g.addColorStop(0.55, mid); g.addColorStop(1, dark);
    x.fillStyle = g; x.beginPath(); x.arc(s / 2, s / 2, s / 2 - 1, 0, PI * 2); x.fill();
    x.globalCompositeOperation = "source-atop";       // teal rim light from the glow around the tree
    var r = x.createRadialGradient(s * 0.98, s * 0.6, 0, s * 0.98, s * 0.6, s * 0.48);
    r.addColorStop(0, "rgba(70,200,210,0.26)"); r.addColorStop(1, "rgba(70,200,210,0)");
    x.fillStyle = r; x.fillRect(0, 0, s, s);
    return c;
  }
  function glowSprite(core, mid) {
    var s = 64, c = makeCanvas(s, s), x = c.getContext("2d");
    var g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, core); g.addColorStop(0.22, mid); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    return c;
  }
  function foliageSprite(seed) {
    var s = 256, c = makeCanvas(s, s), x = c.getContext("2d"), r = rng(seed);
    var cols = ["#111816", "#161f1c", "#1c2724", "#24312d", "#2d3b36"];
    var lobes = [];
    for (var i = 0; i < 7; i++) { var a = r() * PI * 2, d = r() * s * 0.17; lobes.push({ x: s / 2 + Math.cos(a) * d, y: s / 2 + Math.sin(a) * d * 0.8, r: s * (0.15 + r() * 0.12) }); }
    function leaf(px, py, rx, ry, col) { x.save(); x.translate(px, py); x.rotate(r() * PI); x.fillStyle = col; x.beginPath(); x.ellipse(0, 0, rx, ry, 0, 0, PI * 2); x.fill(); x.restore(); }
    for (i = 0; i < 1500; i++) {
      var L = lobes[Math.floor(r() * lobes.length)], ang = r() * PI * 2, dist = Math.sqrt(r()) * L.r;
      var px = L.x + Math.cos(ang) * dist, py = L.y + Math.sin(ang) * dist;
      var top = 1 - py / s;
      leaf(px, py, 2.6 + r() * 3.8, 1.3 + r() * 2, cols[clamp(Math.floor(top * 3.4 + r() * 1.8), 0, 4)]);
    }
    for (i = 0; i < 34; i++) {   // leaves catching the cyan glow from below
      L = lobes[Math.floor(r() * lobes.length)]; ang = PI * 0.12 + r() * PI * 0.76; dist = L.r * (0.75 + r() * 0.25);
      leaf(L.x + Math.cos(ang) * dist, L.y + Math.sin(ang) * dist, 2 + r() * 2.6, 1 + r() * 1.2, r() < 0.5 ? "rgba(60,150,156,.38)" : "rgba(110,205,210,.2)");
    }
    for (i = 0; i < 30; i++) {   // and a little cold sky light on top
      L = lobes[Math.floor(r() * lobes.length)]; ang = -PI * 0.88 + r() * PI * 0.76; dist = L.r * (0.7 + r() * 0.3);
      leaf(L.x + Math.cos(ang) * dist, L.y + Math.sin(ang) * dist, 2 + r() * 2.4, 1 + r() * 1.1, "rgba(150,172,176,.2)");
    }
    return c;
  }
  var SPR = {
    back: barkSprite("#2f2924", "#1b1714", "#090807"),
    mid: barkSprite("#463d35", "#27211d", "#0d0b0a"),
    front: barkSprite("#5b5046", "#302923", "#100d0b"),
  };
  SPR.limb = (function () {
    var s = 128, c = makeCanvas(s, s), x = c.getContext("2d");
    var g = x.createRadialGradient(s * 0.4, s * 0.36, s * 0.04, s * 0.5, s * 0.5, s * 0.5);
    g.addColorStop(0, "#4a3f36"); g.addColorStop(0.62, "#2a231e"); g.addColorStop(0.9, "#171310"); g.addColorStop(1, "#0d0a09");
    x.fillStyle = g; x.beginPath(); x.arc(s / 2, s / 2, s / 2 - 1, 0, PI * 2); x.fill();
    x.globalCompositeOperation = "source-atop";
    var r = x.createRadialGradient(s * 0.62, s * 0.92, 0, s * 0.62, s * 0.92, s * 0.42);
    r.addColorStop(0, "rgba(70,200,210,0.22)"); r.addColorStop(1, "rgba(70,200,210,0)");
    x.fillStyle = r; x.fillRect(0, 0, s, s);
    return c;
  })();
  SPR.trunk = (function () {
    var s = 128, c = makeCanvas(s, s), x = c.getContext("2d");
    var g = x.createLinearGradient(0, 0, s, 0);
    g.addColorStop(0, "#0a0807"); g.addColorStop(0.16, "#2a231e"); g.addColorStop(0.34, "#4c4137"); g.addColorStop(0.52, "#2e2621");
    g.addColorStop(0.8, "#130f0d"); g.addColorStop(0.95, "#1c3a3c"); g.addColorStop(1, "#0a0807");
    x.fillStyle = g; x.beginPath(); x.arc(s / 2, s / 2, s / 2 - 1, 0, PI * 2); x.fill();
    return c;
  })();
  var GLOW_CYAN = glowSprite("rgba(220,255,255,1)", "rgba(70,225,240,0.45)");
  var GLOW_GOLD = glowSprite("rgba(255,240,200,1)", "rgba(255,165,70,0.45)");
  var FOL = [foliageSprite(3), foliageSprite(7), foliageSprite(11), foliageSprite(19)];
  var grain = (function () {
    var c = makeCanvas(160, 160), x = c.getContext("2d"), d = x.createImageData(160, 160), r = rng(5);
    for (var i = 0; i < d.data.length; i += 4) { var v = 90 + r() * 165; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0);
    return ctx.createPattern(c, "repeat");
  })();

  /* ---------- geometry (rebuilt on resize) ---------- */
  var W = 0, H = 0, DPR = 1, mobile = false, S = 1, OFF = 300, IW = 420;
  var BY = [], TOP_Y = -3500, CANOPY_Y = -3750, SEED_Y = 230, ROOT_BOTTOM = 800, CROWN_TOP = -4300, CROWN_RX = 800, CROWN_RY = 380;
  var BARK = [], trunk = [], limbs = [], islandLimbs = [], clumps = [], roots = [], flares = [], stones = [], blades = [], motes = [], fogs = [];

  function cxAt(y) {
    if (y >= 0) return Math.sin(y / S * 0.012) * 4 * S;
    var u = -y / S;
    return S * (Math.sin(u * 0.0016) * 55 + Math.sin(u * 0.0041 + 1.3) * 22 - Math.sin(1.3) * 22);
  }
  function twistAt(y) { var u = -y / S; return u * 0.0034 + Math.sin(u * 0.0011) * 0.8; }
  function baseR(y) {
    var p = clamp(-y / -TOP_Y, 0, 1);
    return S * (15 + 56 * Math.pow(1 - p, 1.3)) + 58 * S * Math.exp(-Math.pow((y + 15 * S) / (85 * S), 2));
  }
  function fullR(y) { return y <= 0 ? baseR(y) : lerp(baseR(0), 9 * S, Math.pow(clamp(y / SEED_Y, 0, 1), 0.35)); }

  function resample(pts, step) {
    var out = [pts[0]], acc = 0;
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], d = Math.hypot(b.x - a.x, b.y - a.y);
      if (!d) continue;
      acc += d;
      while (acc >= step) { acc -= step; var t = 1 - acc / d; out.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }); }
    }
    var last = pts[pts.length - 1];
    if (out.length < 2 || Math.hypot(out[out.length - 1].x - last.x, out[out.length - 1].y - last.y) > step * 0.3) out.push({ x: last.x, y: last.y });
    return out;
  }
  function walk(x, y, a, len, rnd, o) {
    var pts = [{ x: x, y: y }], st = 4 * S, n = Math.max(2, Math.round(len / st)), a0 = a;
    for (var i = 0; i < n; i++) {
      a += (rnd() - 0.5) * (o.gnarl || 0.28);
      if (o.up) a += angDiff(-PI / 2, a) * o.up;
      if (o.down) a += angDiff(PI / 2, a) * o.down;
      if (o.keep) a += angDiff(a0, a) * o.keep;
      x += Math.cos(a) * st; y += Math.sin(a) * st;
      pts.push({ x: x, y: y });
    }
    return resample(pts, STEP * S);
  }
  function bez(P0, P1, P2, P3, jit, seed) {
    var pts = [];
    for (var i = 0; i <= 90; i++) {
      var t = i / 90, mt = 1 - t;
      var x = mt * mt * mt * P0.x + 3 * mt * mt * t * P1.x + 3 * mt * t * t * P2.x + t * t * t * P3.x;
      var y = mt * mt * mt * P0.y + 3 * mt * mt * t * P1.y + 3 * mt * t * t * P2.y + t * t * t * P3.y;
      var dx = 3 * mt * mt * (P1.x - P0.x) + 6 * mt * t * (P2.x - P1.x) + 3 * t * t * (P3.x - P2.x);
      var dy = 3 * mt * mt * (P1.y - P0.y) + 6 * mt * t * (P2.y - P1.y) + 3 * t * t * (P3.y - P2.y);
      var l = Math.hypot(dx, dy) || 1, w = Math.sin(t * PI) * jit * (Math.sin(t * 9 + seed) * 0.7 + Math.sin(t * 23 + seed * 2) * 0.3);
      pts.push({ x: x - dy / l * w, y: y + dx / l * w });
    }
    return resample(pts, STEP * S);
  }
  function bbox(o) {
    var a = 1e9, b = -1e9, c = 1e9, d = -1e9;
    o.pts.forEach(function (p) { if (p.x < a) a = p.x; if (p.x > b) b = p.x; if (p.y < c) c = p.y; if (p.y > d) d = p.y; });
    var m = (o.r0 || o.w || 4) + 4;
    o.minX = a - m; o.maxX = b + m; o.minY = c - m; o.maxY = d + m;
  }

  function branch(pts, r0, r1, src, depth, vein) {
    var b = { pts: pts, len: (pts.length - 1) * STEP * S, r0: r0, r1: r1, src: src, depth: depth, g: 0, vein: vein };
    bbox(b); limbs.push(b);
    return b;
  }
  function addLeaves(b, rnd, cfg, k) {
    var e = b.pts[b.pts.length - 1];
    clumps.push({ x: e.x, y: e.y - 8 * S, s: S * cfg.leaf * (0.62 + rnd() * 0.5) * k, rot: (rnd() - 0.5) * 0.5, flip: rnd() < 0.5, v: Math.floor(rnd() * FOL.length), b: b, at: 0.72, back: rnd() < 0.3 });
  }
  function sprout(b, depth, rnd, cfg) {
    var n = cfg.kids[depth] || 0;
    for (var k = 0; k < n; k++) {
      var t = 0.25 + (k + 0.2 + rnd() * 0.6) * (0.68 / n);
      var i = Math.floor(t * (b.pts.length - 1)), p = b.pts[i], q = b.pts[Math.min(i + 4, b.pts.length - 1)];
      var dir = Math.atan2(q.y - p.y, q.x - p.x), sd = k % 2 ? 1 : -1;
      var a = dir + sd * (0.5 + rnd() * 0.45);
      a += angDiff(-PI / 2, a) * cfg.upBias;
      var r0 = lerp(b.r0, b.r1, t) * 0.66;
      if (r0 < 0.9 * S) continue;
      var L = Math.max(40 * S, b.len * (1 - t) * (0.55 + rnd() * 0.3) * cfg.lenK);
      var c = branch(walk(p.x, p.y, a, L, rnd, { gnarl: 0.32, up: 0.015 }), r0, Math.max(0.7 * S, r0 * 0.3), { type: "child", parent: b, t: t }, depth + 1, b.vein && depth < 1);
      if (depth + 1 < cfg.maxDepth) sprout(c, depth + 1, rnd, cfg);
      else addLeaves(c, rnd, cfg, 1);
      if (depth + 1 === cfg.maxDepth - 1) addLeaves(c, rnd, cfg, 0.75);
    }
  }

  function build() {
    mobile = W < 720;
    S = mobile ? 0.7 : 1;
    OFF = mobile ? Math.max(70, W * 0.2) : Math.min(420, W * 0.3);
    IW = mobile ? Math.min(262, W * 0.66) : Math.min(450, W * 0.34);
    BY = [-480, -1000, -1520, -2040, -2560].map(function (v) { return v * S; });
    TOP_Y = -3150 * S; SEED_Y = 230 * S;
    CROWN_RX = mobile ? W * 1.15 : Math.min(1450, W * 1.1);
    CROWN_RY = 600 * S;
    CANOPY_Y = TOP_Y - 200 * S;
    CROWN_TOP = CANOPY_Y - CROWN_RY - 140 * S;
    ROOT_BOTTOM = SEED_Y + 600 * S;

    trunk = [];
    for (var y = SEED_Y; y >= TOP_Y; y -= STEP * S) trunk.push({ x: cxAt(y), y: y, tw: twistAt(y) });
    BARK = []; var bk = rng(1234);
    for (var bi = 0; bi < trunk.length; bi += 3) for (var bm = 0; bm < 3; bm++) BARK.push({ i: bi, a: bk() * PI * 2, L: (6 + bk() * 18) * S, light: bk() < 0.28 });

    limbs = []; islandLimbs = []; clumps = [];
    var ISL = { kids: mobile ? [3, 2, 2] : [4, 3, 2], maxDepth: 3, upBias: 0.28, lenK: 1, leaf: 1 };
    var DECO = { kids: [3, 2], maxDepth: 2, upBias: 0.3, lenK: 1, leaf: 1.1 };
    var CROWN = { kids: mobile ? [3, 3, 2] : [4, 3, 2], maxDepth: 3, upBias: 0.2, lenK: 0.9, leaf: 1.25 };

    // a few broken stubs low on the trunk
    [[-360, -1], [-470, 1]].forEach(function (s, k) {
      var y0 = s[0] * S, r = rng(50 + k), R = fullR(y0);
      branch(walk(cxAt(y0) + s[1] * R * 0.3, y0, s[1] > 0 ? -0.4 : PI + 0.4, 70 * S, r, { gnarl: 0.15 }), R * 0.32, R * 0.24, { type: "trunk", y: y0 }, 0, false);
    });

    // the five island limbs
    BY.forEach(function (by, i) {
      var s = SIDE[i], r = rng(100 + i), R = fullR(by);
      var P0 = { x: cxAt(by) + s * R * 0.3, y: by };
      var P3 = { x: s * OFF, y: by - 150 * S };
      var P1 = { x: P0.x + s * OFF * 0.38, y: by - 10 * S };
      var P2 = { x: P3.x - s * OFF * 0.22, y: P3.y + 75 * S };
      var b = branch(bez(P0, P1, P2, P3, 14 * S, i * 3.1), R * 0.52, 10 * S, { type: "island", i: i }, 0, true);
      b.end = P3;
      islandLimbs[i] = b;
      sprout(b, 0, r, ISL);
      var ti = Math.floor(b.pts.length * 0.9), pe = b.pts[ti];
      var ext = branch(walk(pe.x, pe.y, s > 0 ? -0.2 : PI + 0.2, (380 + r() * 120) * S, r, { gnarl: 0.3, up: 0.008 }), 9 * S, 1.2 * S, { type: "child", parent: b, t: 0.9 }, 1, false);
      sprout(ext, 1, r, { kids: [0, 4, 3], maxDepth: 3, upBias: 0.22, lenK: 1, leaf: 1.1 });
      addLeaves(ext, r, ISL, 1.15);
    });

    // smaller limbs between the stops, on the other side
    BY.forEach(function (by, i) {
      var y0 = by - 290 * S, s = -SIDE[i], r = rng(200 + i), R = fullR(y0);
      if (y0 < TOP_Y + 200 * S) return;
      var b = branch(walk(cxAt(y0) + s * R * 0.3, y0, s > 0 ? -0.45 : PI + 0.45, (400 + r() * 180) * S, r, { gnarl: 0.3, up: 0.015 }), R * 0.45, 6 * S, { type: "trunk", y: y0 }, 0, false);
      sprout(b, 0, r, DECO);
      addLeaves(b, r, DECO, 1.1);
    });

    // the crown
    var cr = rng(300), nC = mobile ? 6 : 8;
    for (var k = 0; k < nC; k++) {
      var f = k / (nC - 1);
      var y0 = TOP_Y + 300 * S * Math.abs(f - 0.5) * 2;
      var a = -PI / 2 + (f - 0.5) * 2.4 + (cr() - 0.5) * 0.2;
      var L = (480 + Math.abs(f - 0.5) * 2 * 640 + cr() * 140) * (CROWN_RX / 1250) * (mobile ? 1.4 : 1);
      var R = fullR(y0);
      var b = branch(walk(cxAt(y0), y0, a, L, cr, { gnarl: 0.22, up: 0.006, keep: 0.05 }), R * 0.62, 5 * S, { type: "crown", delay: Math.abs(f - 0.5) * 0.3 }, 0, true);
      sprout(b, 0, cr, CROWN);
      addLeaves(b, cr, CROWN, 1.3);
    }
    var cf = rng(700);
    for (var i = 0; i < (mobile ? 54 : 110); i++) {
      var an = cf() * PI * 2, d = Math.sqrt(cf());
      clumps.push({ x: Math.cos(an) * CROWN_RX * 0.88 * d, y: CANOPY_Y + Math.sin(an) * CROWN_RY * 0.8 * d - (1 - d) * 40 * S, s: S * (1.15 + cf() * 0.65), rot: (cf() - 0.5) * 0.5, flip: cf() < 0.5, v: Math.floor(cf() * FOL.length), crown: true, delay: d * 0.45 + cf() * 0.12, back: d > 0.55 && cf() < 0.5 });
    }

    // roots: thick flares at the base, then a glowing network underground
    roots = []; flares = [];
    var rr = rng(400);
    function bolt(x, y, a, len, w, depth, delay, dur) {
      var pts = [{ x: x, y: y }], a0 = a, st = 7 * S, n = Math.max(3, Math.round(len / st)), kids = [];
      var me = { pts: pts, w: w, delay: delay, dur: dur, depth: depth };
      roots.push(me);
      for (var i = 0; i < n; i++) {
        a += (rr() - 0.5) * 0.9; a += angDiff(a0, a) * 0.3;
        x += Math.cos(a) * st; y += Math.sin(a) * st;
        if (y < 10 * S) { y = 10 * S; a = Math.cos(a) > 0 ? 0.2 : PI - 0.2; }
        pts.push({ x: x, y: y });
        if (depth < 4 && i > 2 && rr() < 0.11 - depth * 0.015) kids.push({ i: i, x: x, y: y, a: a + (rr() < 0.5 ? -1 : 1) * (0.45 + rr() * 0.6) });
      }
      bbox(me);
      kids.forEach(function (c) { bolt(c.x, c.y, c.a, len * (0.35 + rr() * 0.3) * (1 - c.i / n * 0.5), w * 0.62, depth + 1, delay + dur * (c.i / n), dur * 0.8); });
    }
    bolt(0, SEED_Y + 30 * S, PI / 2, 520 * S, 3.2 * S, 0, 0, 0.45);
    var nL = mobile ? 6 : 9;
    for (k = 0; k < nL; k++) {
      var side = k % 2 ? 1 : -1, ff = Math.floor(k / 2) / 4;
      bolt(side * 10 * S, SEED_Y + (10 + ff * 40) * S, side > 0 ? 0.12 + ff * 0.9 : PI - 0.12 - ff * 0.9, (520 + rr() * 320) * S * (mobile ? 0.8 : 1), 2.6 * S, 0, 0.04 + k * 0.03, 0.5);
    }
    var fr = rng(500);
    for (k = 0; k < 6; k++) {
      var sd = k % 2 ? 1 : -1, m = Math.floor(k / 2);
      var ang = sd > 0 ? 0.22 + m * 0.28 : PI - 0.22 - m * 0.28;
      var pts = walk(sd * fullR(0) * (0.35 + m * 0.08), (-10 + m * 8) * S, ang, (180 + m * 90 + fr() * 60) * S, fr, { gnarl: 0.2, keep: 0.08, down: 0.01 });
      var fl = { pts: pts, r0: (30 - m * 5) * S, r1: 5 * S }; bbox(fl); flares.push(fl);
      var e = pts[pts.length - 1];
      bolt(e.x, Math.max(e.y, 12 * S) + 4 * S, ang, (300 + fr() * 200) * S, 2.2 * S, 1, 0.25 + m * 0.08, 0.5);
    }

    stones = []; var sr = rng(800);
    for (i = 0; i < 46; i++) stones.push({ x: (sr() - 0.5) * 3200 * S, y: (40 + sr() * 560) * S, rx: (5 + sr() * 14) * S, ry: (3 + sr() * 7) * S });
    blades = []; var br = rng(900);
    for (var x = -1800 * S; x < 1800 * S; x += (8 + br() * 14) * S) blades.push({ x: x, h: (8 + br() * 22) * S, lean: (br() - 0.5) * 0.5, front: br() < 0.35 });
    motes = []; var mr = rng(950);
    for (i = 0; i < (mobile ? 45 : 85); i++) motes.push({ x: mr() * W, y: mr() * H, v: 6 + mr() * 18, s: 0.6 + mr() * 1.6, ph: mr() * 6.28, depth: 0.3 + mr() * 0.6 });
    fogs = []; var fo = rng(990);
    for (i = 0; i < (mobile ? 6 : 10); i++) fogs.push({ x: (fo() - 0.5) * 2400 * S, y: -fo() * (-CROWN_TOP), r: (500 + fo() * 700) * S, sp: 0.5 + fo(), a: 0.035 + fo() * 0.045 });

    placeIslands();
    timeline = buildTimeline();
    section.style.height = (totalUnits * (mobile ? 46 : 40) + 100) + "vh";
  }

  /* ---------- islands (DOM) ---------- */
  var islandEls = [];
  function makeIslands() {
    STOPS.forEach(function (s, i) {
      var el = document.createElement("div");
      el.className = "isl " + (SIDE[i] > 0 ? "isl-right" : "isl-left");
      var g = groups.filter(function (x) { return x.id === s.id; })[0];
      var name = g ? g.name : CHECKED.name, promise = g ? g.promise : CHECKED.promise;
      var items = g
        ? services.filter(function (x) { return x.group === s.id && x.status !== "hide"; }).map(function (x) { return { t: x.name, soon: x.status === "coming-soon" }; })
        : CHECKED.items.map(function (t) { return { t: t }; });

      var art = document.createElement("div"); art.className = "isl-art";
      var glow = document.createElement("div"); glow.className = "isl-glow"; art.appendChild(glow);
      var bob = document.createElement("div"); bob.className = "isl-bob"; bob.style.animationDelay = (-i * 1.1) + "s";
      var img = document.createElement("img"); img.src = s.img; img.alt = s.alt; img.decoding = "async";
      img.onerror = function () { art.classList.add("is-missing"); };
      bob.appendChild(img); art.appendChild(bob);
      var puff = document.createElement("div"); puff.className = "isl-puff";
      for (var k = 0; k < 8; k++) { var p = document.createElement("span"); p.style.setProperty("--a", (k / 8) * 360 + "deg"); puff.appendChild(p); }
      art.appendChild(puff);

      var card = document.createElement("div"); card.className = "isl-card";
      card.innerHTML = "<p class='isl-kicker'>Branch " + (i + 1) + " of 5</p><h3></h3><p class='isl-promise'></p><ul class='chips'></ul>";
      card.querySelector("h3").textContent = name;
      card.querySelector(".isl-promise").textContent = promise;
      var ul = card.querySelector(".chips");
      items.forEach(function (it, k) {
        var li = document.createElement("li");
        li.className = "chip" + (it.soon ? " chip-soon" : "");
        li.style.transitionDelay = (0.25 + k * 0.06) + "s";
        li.textContent = it.t;
        if (it.soon) { var tag = document.createElement("small"); tag.textContent = "soon"; li.appendChild(tag); }
        ul.appendChild(li);
      });
      var cta = document.createElement("a");
      cta.className = "isl-cta";
      cta.href = g ? "#group-" + s.id : "#how";
      cta.textContent = g ? "See " + name + " services" : "How we work";
      card.appendChild(cta);

      el.appendChild(art); el.appendChild(card);
      world.appendChild(el);
      islandEls.push({ el: el, art: art, card: card });
    });
  }
  function placeIslands() {
    islandEls.forEach(function (o, i) {
      var b = islandLimbs[i], by = BY[i];
      o.art.style.left = b.end.x + "px";
      o.art.style.top = (b.end.y + 26 * S) + "px";
      o.art.style.width = IW + "px";
      if (mobile) {
        o.card.style.left = (b.end.x * 0.55) + "px";
        o.card.style.top = (b.end.y + 40) + "px";
      } else {
        o.card.style.left = (cxAt(by) - SIDE[i] * (fullR(by) * 0.9 + 40)) + "px";
        o.card.style.top = (b.end.y - IW * 0.48) + "px";
      }
    });
  }

  /* ---------- scroll timeline ---------- */
  var timeline = [], totalUnits = 0;
  function buildTimeline() {
    var segs = [{ k: "roots", d: 1.5 }, { k: "shoot", d: 1.2 }];
    BY.forEach(function (_, i) { segs.push({ k: "travel", i: i, d: 0.9 }, { k: "branch", i: i, d: 0.8 }, { k: "hold", i: i, d: 1.0 }); });
    segs.push({ k: "top", d: 0.9 }, { k: "bloom", d: 1.2 }, { k: "reveal", d: 1.4 }, { k: "end", d: 0.8 });
    var at = 0;
    segs.forEach(function (s) { s.a = at; at += s.d; });
    totalUnits = at;
    return segs;
  }
  function islandFocus(i, h) {
    var b = islandLimbs[i], s = SIDE[i];
    var fy = mobile ? b.end.y + 64 : b.end.y - IW * 0.33, fx = mobile ? b.end.x * 0.55 : s * OFF * 0.12, z = 1;
    var amp = mobile ? 0.3 : 1;
    // a different camera move on each branch while you read it
    if (i === 0) z += h * 0.08 * amp;                                   // push in
    if (i === 1) fx += lerp(-40, 40, h) * -s * amp;                     // pan across
    if (i === 2) fy += lerp(40, -50, h) * amp;                          // crane up
    if (i === 3) { fx += Math.sin(h * PI) * 30 * s * amp; z += Math.sin(h * PI) * 0.05 * amp; } // arc
    if (i === 4) { z -= h * 0.08 * amp; fy -= h * 30 * amp; }           // pull back
    return { x: fx, y: fy, z: z };
  }
  function crownFocus() {
    var z = Math.min(H * 0.82 / (2 * CROWN_RY + 360 * S), W * 0.92 / (2 * CROWN_RX + 200 * S));
    return { x: 0, y: CANOPY_Y + 40 * S, z: z };
  }
  function revealFocus() {
    var top = CROWN_TOP, bot = 200 * S, z;
    if (mobile) { z = Math.min(H * 0.6 / (bot - top), W * 0.98 / (2 * CROWN_RX + 120 * S)); return { x: 0, y: (top + bot) / 2 + 0.17 * H / z, z: z }; }
    z = Math.min(H * 0.92 / (bot - top), W * 0.5 / (2 * CROWN_RX + 160 * S));
    return { x: -W * 0.16 / z, y: (top + bot) / 2, z: z };
  }
  function mixF(a, b, w) { return { x: lerp(a.x, b.x, w), y: lerp(a.y, b.y, w), z: lerp(a.z, b.z, w) }; }

  function stateAt(u) {
    var st = { rootG: 1, tip: TOP_Y, br: [1, 1, 1, 1, 1], canopy: 1, hero: 0, end: 0, active: -1, focus: null };
    var tz = mobile ? 0.85 : 0.9;
    var startF = mobile ? { x: 0, y: SEED_Y - H * 0.32 / 0.9, z: 0.9 } : { x: -W * 0.18, y: SEED_Y + H * 0.05, z: 1 };
    var rootsEnd = { x: 0, y: SEED_Y + 120 * S, z: mobile ? 0.8 : 0.85 };
    for (var n = 0; n < timeline.length; n++) {
      var s = timeline[n];
      if (u < s.a) break;
      var f = clamp((u - s.a) / s.d, 0, 1);
      st.active = -1;
      if (s.k === "roots") {
        st.rootG = lerp(0.3, 1, f); st.tip = SEED_Y; st.br = [0, 0, 0, 0, 0]; st.canopy = 0;
        st.hero = 1 - clamp((f - 0.35) / 0.4, 0, 1);
        st.focus = mixF(startF, rootsEnd, ease(clamp((f - 0.25) / 0.75, 0, 1)));
      } else if (s.k === "shoot") {
        st.hero = 0; st.canopy = 0; st.br = [0, 0, 0, 0, 0];
        st.tip = lerp(SEED_Y, -220 * S, ease(f));
        st.focus = mixF(rootsEnd, { x: 0, y: st.tip + H * 0.06 / tz, z: tz }, ease(Math.min(1, f * 1.4)));
      } else if (s.k === "travel" || s.k === "top") {
        var from = s.k === "top" ? BY[4] - 260 * S : s.i === 0 ? -220 * S : BY[s.i - 1] - 260 * S;
        var to = s.k === "top" ? TOP_Y : BY[s.i] - 260 * S;
        st.tip = lerp(from, to, ease(f)); st.canopy = 0;
        var tf = { x: 0, y: st.tip + H * 0.12 / tz, z: tz };
        if (s.k === "travel" && s.i > 0 && f < 0.35) tf = mixF(islandFocus(s.i - 1, 1), tf, ease(f / 0.35));
        if (s.k === "top" && f < 0.35) tf = mixF(islandFocus(4, 1), tf, ease(f / 0.35));
        st.focus = tf;
        if (s.k === "travel") for (var j = s.i; j < 5; j++) st.br[j] = 0;
      } else if (s.k === "branch") {
        st.tip = BY[s.i] - 260 * S; st.canopy = 0;
        st.br[s.i] = ease(f);
        for (j = s.i + 1; j < 5; j++) st.br[j] = 0;
        st.focus = mixF({ x: 0, y: st.tip + H * 0.12 / tz, z: tz }, islandFocus(s.i, 0), ease(f));
        st.active = f > 0.85 ? s.i : -1;
      } else if (s.k === "hold") {
        st.tip = BY[s.i] - 260 * S; st.canopy = 0;
        for (j = s.i + 1; j < 5; j++) st.br[j] = 0;
        st.focus = islandFocus(s.i, ease(f));
        st.active = s.i;
      } else if (s.k === "bloom") {
        st.tip = TOP_Y; st.canopy = f;
        st.focus = mixF({ x: 0, y: TOP_Y + H * 0.12 / tz, z: tz }, crownFocus(), ease(Math.min(1, f * 1.3)));
      } else if (s.k === "reveal") {
        st.tip = TOP_Y; st.canopy = 1; st.rev = f;
        st.focus = mixF(crownFocus(), revealFocus(), ease(f));
        st.end = clamp((f - 0.7) / 0.3, 0, 1);
      } else if (s.k === "end") {
        st.tip = TOP_Y; st.canopy = 1; st.end = 1; st.rev = 1;
        var rf = revealFocus(); rf.z *= 1 - f * 0.03;
        st.focus = rf;
      }
    }
    return st;
  }

  /* ---------- camera + drawing ---------- */
  var cam = { x: 0, y: 0, z: 1 };
  var yTopW = 0, yBotW = 0, xLW = 0, xRW = 0;
  function SX(x) { return (x - cam.x) * cam.z + W / 2; }
  function SY(y) { return (y - cam.y) * cam.z + H / 2; }
  function culled(o) { return o.maxY < yTopW || o.minY > yBotW || o.maxX < xLW || o.minX > xRW; }

  function grownOf(st) { return clamp((SEED_Y - st.tip) / (SEED_Y - TOP_Y), 0, 1); }
  function trunkR(y, st, gk) { return fullR(y) * gk * clamp(0.3 + (y - st.tip) / (70 * S), 0.3, 1) * (1 + 0.05 * Math.sin(y * 0.05 / S + 1) + 0.035 * Math.sin(y * 0.13 / S)); }
  function grooveA(k, p) { return k * 2 * PI / 5 + p.tw + 0.3 * Math.sin(p.y * 0.004 / S + k); }
  function grooveGap(k, y) { return Math.sin(y * 0.045 / S + k * 2.1) + 0.7 * Math.sin(y * 0.017 / S + k * 1.3) < -0.55; }

  function tube(pts, n, rFn, img, gap) {
    var z = cam.z, lx = -1e9, ly = -1e9, gp = gap || 0.32;
    for (var i = 0; i < n; i++) {
      var p = pts[i], R = rFn(i) * z;
      if (R < 0.5) continue;
      var X = SX(p.x), Y = SY(p.y);
      if (X < -R || X > W + R || Y < -R || Y > H + R) { lx = -1e9; continue; }
      var dx = X - lx, dy = Y - ly, need = Math.max(1.1, R * gp);
      if (dx * dx + dy * dy < need * need && i !== n - 1) continue;
      ctx.drawImage(img, X - R, Y - R, R * 2, R * 2);
      lx = X; ly = Y;
    }
  }
  function strokeGlow(w, I, col, core, flow) {
    ctx.strokeStyle = col(0.05 * I); ctx.lineWidth = w * 8; ctx.stroke();
    ctx.strokeStyle = col(0.15 * I); ctx.lineWidth = w * 3; ctx.stroke();
    ctx.strokeStyle = core(Math.min(1, 0.85 * I)); ctx.lineWidth = w; ctx.stroke();
    if (flow && !reduceMotion) {
      ctx.setLineDash(flow[0]); ctx.lineDashOffset = flow[1];
      ctx.strokeStyle = col(0.2); ctx.lineWidth = w * 5; ctx.stroke();
      ctx.strokeStyle = core(0.55); ctx.lineWidth = w * 1.3; ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawSky(t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#04090c"); g.addColorStop(0.55, "#08131a"); g.addColorStop(1, "#0e1d1f");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (SY(0) < 0) return;
    ctx.globalCompositeOperation = "screen";
    var ox = W * 0.92, oy = -H * 0.35, len = (W + H) * 1.25, k = W / 1280 + 0.4;
    for (var i = 0; i < 6; i++) {
      var ang = 2.0 + i * 0.1 + (reduceMotion ? 0 : Math.sin(t * 0.06 + i * 1.3) * 0.025);
      var a = 0.04 + 0.03 * (reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * 0.22 + i * 1.7));
      var dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx, w1 = (70 + i * 26) * k;
      var gr = ctx.createLinearGradient(ox, oy, ox + dx * len * 0.85, oy + dy * len * 0.85);
      gr.addColorStop(0, "rgba(175,220,222," + a + ")"); gr.addColorStop(1, "rgba(175,220,222,0)");
      ctx.fillStyle = gr; ctx.beginPath();
      ctx.moveTo(ox + nx * 4, oy + ny * 4); ctx.lineTo(ox - nx * 4, oy - ny * 4);
      ctx.lineTo(ox + dx * len - nx * w1, oy + dy * len - ny * w1); ctx.lineTo(ox + dx * len + nx * w1, oy + dy * len + ny * w1);
      ctx.closePath(); ctx.fill();
    }
    var z = Math.max(cam.z, 0.35);
    fogs.forEach(function (f) {
      var X = SX(f.x + (reduceMotion ? 0 : Math.sin(t * 0.03 * f.sp + f.x) * 260 * S)), Y = SY(f.y), R = f.r * z;
      if (Y < -R || Y > H + R || X < -R || X > W + R) return;
      var fg = ctx.createRadialGradient(X, Y, 0, X, Y, R);
      fg.addColorStop(0, "rgba(118,158,164," + f.a + ")"); fg.addColorStop(1, "rgba(118,158,164,0)");
      ctx.fillStyle = fg; ctx.fillRect(X - R, Y - R, R * 2, R * 2);
    });
    ctx.globalCompositeOperation = "source-over";
  }

  function drawSoil() {
    var top = SY(0);
    if (top > H) return;
    var z = cam.z, y0 = Math.max(top, 0);
    var g = ctx.createLinearGradient(0, top, 0, top + 700 * S * z);
    g.addColorStop(0, "#16110e"); g.addColorStop(1, "#080605");
    ctx.fillStyle = g; ctx.fillRect(0, y0, W, H - y0);
    [80, 240, 440].forEach(function (d, i) {
      var Y = SY(d * S);
      if (Y > H + 30 || Y < -30) return;
      ctx.fillStyle = "rgba(70,52,40,0.16)";
      ctx.beginPath();
      for (var X = 0; X <= W + 30; X += 30) { var wx = (X - W / 2) / z + cam.x; ctx.lineTo(X, Y + Math.sin(wx * 0.008 / S + i) * 9 * z); }
      for (X = W + 30; X >= 0; X -= 30) { wx = (X - W / 2) / z + cam.x; ctx.lineTo(X, Y + (18 + Math.sin(wx * 0.02 / S + i * 3) * 7) * z); }
      ctx.closePath(); ctx.fill();
    });
    stones.forEach(function (s) {
      var X = SX(s.x), Y = SY(s.y), rx = s.rx * z, ry = s.ry * z;
      if (X < -rx || X > W + rx || Y < -ry || Y > H + ry || rx < 0.8) return;
      ctx.fillStyle = "#1b1815"; ctx.beginPath(); ctx.ellipse(X, Y, rx, ry, 0, 0, PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.beginPath(); ctx.ellipse(X - rx * 0.2, Y - ry * 0.35, rx * 0.6, ry * 0.4, 0, 0, PI * 2); ctx.fill();
    });
  }

  function drawRoots(st, t) {
    if (SY(0) > H) return;
    var z = cam.z;
    ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (var k = 0; k < roots.length; k++) {
      var r = roots[k], f = clamp((st.rootG - r.delay) / r.dur, 0, 1);
      if (f <= 0 || culled(r)) continue;
      var n = Math.max(2, Math.floor(r.pts.length * f));
      ctx.beginPath();
      for (var i = 0; i < n; i++) { var p = r.pts[i]; if (i) ctx.lineTo(SX(p.x), SY(p.y)); else ctx.moveTo(SX(p.x), SY(p.y)); }
      var I = 0.75 + 0.25 * (reduceMotion ? 1 : Math.sin(t * 1.5 + r.delay * 9));
      strokeGlow(Math.max(0.5, r.w * z), I, gold, goldCore, r.depth <= 1 ? [[5 * z + 2, 110 * z + 36], reduceMotion ? 0 : t * 55] : null);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function drawGround(t, front) {
    var Y0 = SY(0);
    if (Y0 < -80 || Y0 > H + 80) return;
    var z = cam.z;
    if (!front) {
      ctx.fillStyle = "#0a0c0b";
      ctx.beginPath(); ctx.moveTo(0, Y0 + 14 * z);
      for (var X = 0; X <= W + 12; X += 12) { var wx = (X - W / 2) / z + cam.x; ctx.lineTo(X, Y0 - (5 + Math.sin(wx * 0.03 / S) * 3 + Math.sin(wx * 0.11 / S) * 1.5) * S * z); }
      ctx.lineTo(W, Y0 + 14 * z); ctx.closePath(); ctx.fill();
    }
    var xL = cam.x - W / 2 / z - 40, xR = cam.x + W / 2 / z + 40;
    ctx.lineCap = "round"; ctx.strokeStyle = front ? "#070a09" : "#0d1413"; ctx.lineWidth = Math.max(1, 2.2 * S * z);
    ctx.beginPath();
    for (var i = 0; i < blades.length; i++) {
      var b = blades[i];
      if (b.front !== !!front || b.x < xL || b.x > xR) continue;
      var sway = reduceMotion ? 0 : Math.sin(t * 1.2 + b.x * 0.02) * 0.15;
      var bx = SX(b.x), by = Y0 - 3 * z + (front ? 6 * z : 0);
      ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx, by - b.h * z * 0.5, SX(b.x + (b.lean + sway) * b.h), by - b.h * z);
    }
    ctx.stroke();
    if (front) {
      var m = ctx.createLinearGradient(0, Y0 - 300 * S * z, 0, Y0 + 30 * z);
      m.addColorStop(0, "rgba(110,155,160,0)"); m.addColorStop(1, "rgba(110,155,160,0.16)");
      ctx.globalCompositeOperation = "screen"; ctx.fillStyle = m; ctx.fillRect(0, Y0 - 300 * S * z, W, 330 * S * z);
      ctx.globalCompositeOperation = "source-over";
    }
  }

  function updateLimbs(st) {
    for (var i = 0; i < limbs.length; i++) {
      var b = limbs[i], s = b.src;
      if (s.type === "island") b.g = st.br[s.i];
      else if (s.type === "trunk") b.g = clamp((s.y - st.tip - 40 * S) / (260 * S), 0, 1);
      else if (s.type === "crown") b.g = clamp((st.canopy - s.delay) / 0.55, 0, 1);
      else b.g = clamp((s.parent.g - s.t) / Math.max(0.06, 1 - s.t), 0, 1);
    }
  }
  function drawLimbs() {
    var z = cam.z;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (var i = 0; i < limbs.length; i++) {
      var b = limbs[i];
      if (b.g <= 0 || culled(b)) continue;
      var N = b.pts.length, n = Math.max(2, Math.floor(N * b.g));
      if (b.r0 * z < 1.6) {
        ctx.beginPath();
        for (var j = 0; j < n; j += 2) { var p = b.pts[j]; if (j) ctx.lineTo(SX(p.x), SY(p.y)); else ctx.moveTo(SX(p.x), SY(p.y)); }
        var e = b.pts[n - 1]; ctx.lineTo(SX(e.x), SY(e.y));
        ctx.strokeStyle = "#1a1613"; ctx.lineWidth = Math.max(0.6, (b.r0 + b.r1) * z); ctx.stroke();
        continue;
      }
      var tipK = 12 + 6 / Math.max(z, 0.2);
      tube(b.pts, n, function (j) { return lerp(b.r0, b.r1, j / N) * clamp(0.45 + (n - j) / tipK, 0.45, 1); }, SPR.limb, 0.18);
    }
  }
  function drawFlares(gk) {
    var k = clamp((gk - 0.2) / 0.6, 0, 1);
    if (k <= 0) return;
    flares.forEach(function (fl) {
      if (culled(fl)) return;
      var n = Math.floor(fl.pts.length * clamp(k * 1.3, 0, 1));
      tube(fl.pts, n, function (i) { return lerp(fl.r0, fl.r1, i / fl.pts.length) * k; }, SPR.limb, 0.18);
    });
  }

  function trunkRange(st) {
    var n = 0; while (n < trunk.length && trunk[n].y >= st.tip) n++;
    if (n < 2) return null;
    var i0 = 0, i1 = n, yb = yBotW + 300 * S, yt = yTopW - 300 * S;
    while (i0 < n && trunk[i0].y > yb) i0++;
    while (i1 > i0 && trunk[i1 - 1].y < yt) i1--;
    return i1 - i0 < 1 ? null : [i0, i1];
  }
  function drawTrunk(st, gk, rg) {
    var z = cam.z, i0 = rg[0], i1 = rg[1], i, k, p, R, X, Y, on;
    var lx = -1e9, ly = -1e9;
    for (i = i0; i < i1; i++) {   // the body: one smooth, side-lit cylinder
      p = trunk[i]; var RR = trunkR(p.y, st, gk) * z;
      X = SX(p.x); Y = SY(p.y);
      if (RR < 0.5 || Y < -RR || Y > H + RR) continue;
      var dx = X - lx, dy = Y - ly, need = Math.max(1, RR * 0.2);
      if (dx * dx + dy * dy < need * need) continue;
      ctx.drawImage(SPR.trunk, X - RR, Y - RR, RR * 2, RR * 2); lx = X; ly = Y;
    }
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    // deep spiral grooves, each with a pale ridge beside it
    for (var pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      for (k = 0; k < 5; k++) {
        on = false;
        for (i = i0; i < i1; i += 2) {
          p = trunk[i]; R = trunkR(p.y, st, gk);
          var a = grooveA(k, p) - (pass ? 0.17 : 0);
          if (R * z < 3 || Math.cos(a) < 0.1 || grooveGap(k, p.y)) { on = false; continue; }
          X = SX(p.x + R * 0.96 * Math.sin(a)); Y = SY(p.y);
          if (Y < -10 || Y > H + 10) { on = false; continue; }
          if (!on) { ctx.moveTo(X, Y); on = true; } else ctx.lineTo(X, Y);
        }
      }
      ctx.strokeStyle = pass ? "rgba(255,238,220,0.075)" : "rgba(0,0,0,0.55)";
      ctx.lineWidth = Math.max(0.8, (pass ? 1.6 : 3.2) * S * z * Math.max(0.35, gk));
      ctx.stroke();
    }
    // rough bark: short cracks and pale flecks that wrap with the twist
    var b0 = Math.floor(i0 / 3) * 3;
    for (var pass2 = 0; pass2 < 2; pass2++) {
      ctx.beginPath();
      for (var bi = b0; bi < BARK.length; bi++) {
        var mk = BARK[bi];
        if (mk.i >= i1) break;
        if (mk.i < i0 || mk.light !== !!pass2) continue;
        p = trunk[mk.i]; R = trunkR(p.y, st, gk);
        if (R * z < 5) continue;
        var a2 = mk.a + p.tw;
        if (Math.cos(a2) < 0.15) continue;
        Y = SY(p.y);
        if (Y < -30 || Y > H + 30) continue;
        ctx.moveTo(SX(p.x + R * 0.95 * Math.sin(a2)), Y);
        ctx.lineTo(SX(p.x + R * 0.95 * Math.sin(a2 + mk.L * 0.0034 / S)), SY(p.y - mk.L));
      }
      ctx.strokeStyle = pass2 ? "rgba(255,236,214,0.08)" : "rgba(0,0,0,0.42)";
      ctx.lineWidth = Math.max(0.6, (pass2 ? 1 : 1.6) * S * z);
      ctx.stroke();
    }
  }

  function drawTrunkVeins(st, gk, t, rg) {
    var z = cam.z, i0 = rg[0], i1 = rg[1], grown = grownOf(st);
    ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round"; ctx.lineJoin = "round";
    var I = 0.9 + (st.active >= 0 ? 0.25 : 0);
    var w = Math.max(0.7, 1.6 * S * z * (0.6 + gk * 0.6));
    [0, 2, 3].forEach(function (k) {
      ctx.beginPath(); var on = false, count = 0;
      for (var i = i0; i < i1; i += 2) {
        var p = trunk[i];
        if (p.y > 0) { on = false; continue; }
        var g = grooveA(k, p), m = Math.sin(p.y / S * 0.011 + k * 1.7) + 0.6 * Math.sin(p.y / S * 0.029 + k * 0.9);
        if (Math.cos(g) < 0.15 || m < -0.1 || grooveGap(k, p.y)) { on = false; continue; }
        var R = trunkR(p.y, st, gk), X = SX(p.x + R * 0.94 * Math.sin(g)), Y = SY(p.y);
        if (!on) { ctx.moveTo(X, Y); on = true; } else ctx.lineTo(X, Y);
        count++;
      }
      if (count) strokeGlow(w, I, cyan, cyanCore, [[6 * z + 2, 170 * z + 50], reduceMotion ? 0 : -t * 90 * Math.max(z, 0.3)]);
    });
    // a young shoot is pure light
    var young = clamp(1 - grown / 0.22, 0, 1);
    if (young > 0) {
      ctx.beginPath();
      for (var j = i0; j < i1; j += 2) { var q = trunk[j]; if (j === i0) ctx.moveTo(SX(q.x), SY(q.y)); else ctx.lineTo(SX(q.x), SY(q.y)); }
      strokeGlow(Math.max(1, 3.2 * S * z), 1.4 * young, cyan, cyanCore, [[8 * z + 3, 80 * z + 26], reduceMotion ? 0 : -t * 120]);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function drawLimbVeins(st, t) {
    var z = cam.z;
    ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (var i = 0; i < limbs.length; i++) {
      var b = limbs[i];
      if (!b.vein || b.g <= 0 || culled(b)) continue;
      var N = b.pts.length, n = Math.floor(N * b.g);
      if (n < 3) continue;
      var top = b.src.type === "island" ? b : b.src.parent;
      var act = top && top.src && top.src.type === "island" && st.active === top.src.i ? 1 : 0;
      ctx.beginPath();
      for (var j = 0; j < n; j += 2) {
        var p = b.pts[j], q = b.pts[Math.min(j + 2, N - 1)], dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy) || 1;
        var r = lerp(b.r0, b.r1, j / N) * 0.35, nx = dy / l, ny = -dx / l;
        if (ny > 0) { nx = -nx; ny = -ny; }
        var X = SX(p.x + nx * r), Y = SY(p.y + ny * r);
        if (j) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
      }
      strokeGlow(Math.max(0.6, (b.depth === 0 ? 1.5 : 1) * S * z), 0.7 + act * 0.8, cyan, cyanCore, [[5 * z + 2, 120 * z + 40], reduceMotion ? 0 : -t * (60 + act * 60) * Math.max(z, 0.3)]);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function clumpGrowth(c, st) {
    if (c.crown) return backOut(clamp((st.canopy - c.delay) / 0.4, 0, 1));
    return backOut(clamp((c.b.g - c.at) / (1 - c.at), 0, 1));
  }
  function drawClumps(st, t, back) {
    var z = cam.z;
    if (!back) {   // cyan light bleeding through the leaves
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.16;
      for (var i = 0; i < clumps.length; i += 2) {
        var c = clumps[i], k = clumpGrowth(c, st);
        if (k <= 0 || c.back) continue;
        var R = c.s * 85 * z * k, X = SX(c.x), Y = SY(c.y + 30 * S);
        if (X < -R || X > W + R || Y < -R || Y > H + R) continue;
        ctx.drawImage(GLOW_CYAN, X - R, Y - R, R * 2, R * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    }
    for (i = 0; i < clumps.length; i++) {
      c = clumps[i];
      if (!!c.back !== back) continue;
      k = clumpGrowth(c, st);
      if (k <= 0) continue;
      R = c.s * 100 * z * k; X = SX(c.x); Y = SY(c.y);
      if (R < 1 || X < -R || X > W + R || Y < -R || Y > H + R) continue;
      var rot = c.rot + (reduceMotion ? 0 : Math.sin(t * 0.8 + c.x * 0.01) * 0.03), co = Math.cos(rot), si = Math.sin(rot), fx = c.flip ? -1 : 1;
      ctx.setTransform(co * fx * DPR, si * fx * DPR, -si * DPR, co * DPR, X * DPR, Y * DPR);
      ctx.drawImage(FOL[c.v], -R, -R, R * 2, R * 2);
    }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function drawSeed(st, t) {
    var X = SX(0), Y = SY(SEED_Y), z = cam.z;
    if (Y < -300 || Y > H + 300) return;
    var open = clamp((SEED_Y - st.tip) / (60 * S), 0, 1), pulse = reduceMotion ? 1 : 0.8 + Math.sin(t * 2) * 0.2;
    ctx.globalCompositeOperation = "lighter";
    var R = 150 * S * z * (1 + open * 0.4);
    ctx.globalAlpha = 0.55 * pulse * (1 - open * 0.5);
    ctx.drawImage(GLOW_GOLD, X - R, Y - R, R * 2, R * 2);
    if (open > 0) {
      ctx.globalAlpha = (1 - clamp((SEED_Y - st.tip - 60 * S) / (400 * S), 0, 1)) * 0.9;
      var R2 = 230 * S * z;
      ctx.drawImage(GLOW_CYAN, X - R2, Y - R2 - 20 * S * z, R2 * 2, R2 * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    [-1, 1].forEach(function (sd) {
      ctx.save();
      ctx.translate(X + sd * open * 16 * S * z, Y + open * 6 * S * z); ctx.rotate(sd * open * 0.6); ctx.scale(z * S, z * S);
      var g = ctx.createRadialGradient(-8, -12, 2, 0, 0, 36);
      g.addColorStop(0, "#5a4434"); g.addColorStop(0.6, "#2a1f18"); g.addColorStop(1, "#0d0907");
      ctx.fillStyle = g; ctx.beginPath();
      ctx.ellipse(0, 0, 24, 32, 0, sd < 0 ? PI / 2 : -PI / 2, sd < 0 ? PI * 1.5 : PI / 2); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "rgba(255,200,120,.85)"; ctx.lineWidth = 1.6; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(sd * 2, -26); ctx.lineTo(sd * 8, -12); ctx.lineTo(sd * 4, 0); ctx.lineTo(sd * 10, 12); ctx.lineTo(sd * 5, 24); ctx.stroke();
      ctx.restore();
    });
  }

  function drawBud(st, t) {
    if (st.canopy > 0.05 || st.tip > SEED_Y - 15 * S) return;
    var X = SX(cxAt(st.tip)), Y = SY(st.tip), R = (60 + (reduceMotion ? 0 : 10 * Math.sin(t * 3))) * S * Math.max(cam.z, 0.4);
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.9;
    ctx.drawImage(GLOW_CYAN, X - R, Y - R, R * 2, R * 2);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }

  var lastCam = null;
  function drawMotes(dt, t) {
    var dX = lastCam ? (cam.x - lastCam.x) * cam.z : 0, dY = lastCam ? (cam.y - lastCam.y) * cam.z : 0;
    lastCam = { x: cam.x, y: cam.y };
    var Yg = SY(0);
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      if (!reduceMotion) { m.y -= m.v * dt; m.x += Math.sin(t * 0.6 + m.ph) * 5 * dt; }
      m.x -= dX * m.depth; m.y -= dY * m.depth;
      if (m.y < -20) m.y += H + 40; if (m.y > H + 20) m.y -= H + 40;
      if (m.x < -20) m.x += W + 40; if (m.x > W + 20) m.x -= W + 40;
      var below = m.y > Yg, R = (below ? 5 : 6) * m.s;
      ctx.globalAlpha = 0.25 + 0.35 * (reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.8 + m.ph));
      ctx.drawImage(below ? GLOW_GOLD : GLOW_CYAN, m.x - R, m.y - R, R * 2, R * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }

  function post() {
    var v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.78);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.06; ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = grain; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }

  function draw(st, t, dt) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var z = cam.z;
    yTopW = cam.y - H / 2 / z - 60 * S; yBotW = cam.y + H / 2 / z + 60 * S;
    xLW = cam.x - W / 2 / z - 60 * S; xRW = cam.x + W / 2 / z + 60 * S;
    var gk = lerp(0.09, 1, Math.pow(grownOf(st), 0.5));
    updateLimbs(st);
    drawSky(t);
    drawSoil();
    drawRoots(st, t);
    drawGround(t, false);
    drawClumps(st, t, true);
    drawLimbs();
    drawFlares(gk);
    var rg = trunkRange(st);
    if (rg) drawTrunk(st, gk, rg);
    drawSeed(st, t);
    drawGround(t, true);
    if (rg) drawTrunkVeins(st, gk, t, rg);
    drawLimbVeins(st, t);
    drawClumps(st, t, false);
    drawBud(st, t);
    drawMotes(dt, t);
    post();
  }

  /* ---------- wiring ---------- */
  var heroEl = section.querySelector(".grow-hero");
  var endEl = section.querySelector(".grow-end");
  var hintEl = section.querySelector(".grow-hint");
  var meter = section.querySelector(".grow-meter span");
  var target = 0, current = 0, shown = [];

  function readScroll() {
    var rect = section.getBoundingClientRect();
    var total = section.offsetHeight - window.innerHeight;
    var p = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
    target = p * totalUnits;
    if (meter) meter.style.transform = "scaleY(" + p + ")";
  }
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    if (!W || !H) return;
    DPR = Math.min(window.devicePixelRatio || 1, W < 720 ? 1.5 : 2);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    build();
    readScroll();
  }

  var visible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) {
      visible = e[0].isIntersecting;
      document.body.classList.toggle("in-grow", visible);
    }).observe(section);
  }

  var last = performance.now(), t = 0, first = true, headerDark = null, headerEl = document.querySelector(".site-header");
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min((now - last) / 1000, 0.05); last = now;
    if ((!visible && !first) || !W) return;
    if (!reduceMotion) t += dt;
    current = reduceMotion || first ? target : current + (target - current) * (1 - Math.exp(-dt * 6));
    var st = stateAt(current);
    var k = reduceMotion || first ? 1 : 1 - Math.exp(-dt * 4.5);
    cam.x += (st.focus.x - cam.x) * k; cam.y += (st.focus.y - cam.y) * k; cam.z += (st.focus.z - cam.z) * k;
    first = false;

    draw(st, t, dt);
    var rect = section.getBoundingClientRect();
    var hh = headerEl ? headerEl.offsetHeight : 68;
    var top = rect.top <= hh + 1 && rect.bottom > hh;
    if (top !== headerDark) { headerDark = top; document.body.classList.toggle("grow-top", top); }
    world.style.transform = "translate(" + W / 2 + "px," + H / 2 + "px) scale(" + cam.z + ") translate(" + -cam.x + "px," + -cam.y + "px)";

    islandEls.forEach(function (o, i) {
      var on = st.br[i] >= 0.97;
      if (on !== !!shown[i]) { shown[i] = on; o.el.classList.toggle("is-shown", on); }
      o.el.classList.toggle("is-active", st.active === i);
    });
    heroEl.style.opacity = st.hero;
    heroEl.style.transform = "translateY(" + (1 - st.hero) * -30 + "px)";
    heroEl.style.visibility = st.hero < 0.02 ? "hidden" : "visible";
    endEl.classList.toggle("is-shown", st.end > 0.3);
    section.classList.toggle("is-reveal", (st.rev || 0) > 0.2);
    if (hintEl) hintEl.classList.toggle("is-hidden", current > 0.25);
  }

  makeIslands();
  stage.addEventListener("pointermove", function (e) {   // islands tilt gently toward the mouse
    if (reduceMotion || e.pointerType !== "mouse") return;
    var r = stage.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
    world.style.setProperty("--ry", (nx * 12).toFixed(2) + "deg");
    world.style.setProperty("--rx", (-ny * 8).toFixed(2) + "deg");
  });
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", function () { readScroll(); }, { passive: true });
  var pin = parseFloat(new URLSearchParams(location.search).get("grow"));
  if (!isNaN(pin)) readScroll = function () { target = pin; };
  resize();
  requestAnimationFrame(frame);
})();
