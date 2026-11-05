/*
  Bongweb landing page: a real tree that grows as you scroll.

  1. Underground, a bean germinates: its root pushes down, side roots spread, a pale hook rises.
  2. The seedling breaks the turf and grows up; the camera follows it.
  3. The tree grows from the ground: trunk first, then limbs, then leaves, while the camera pulls back.
  4. The camera visits five branches. Each holds one part of the studio as a clay island.
  5. The camera pulls back to the whole tree and the WhatsApp call to action.

  Everything is photographic (assets/photo, assets/germ; measurements in data/scene.js).
  Growth uses "grow maps": greyscale images that say how far each pixel is from where growth
  starts, measured along the plant itself. A small WebGL shader shows only the pixels the growth
  has reached, so roots, stem, limbs and leaves extend along their real shapes.
  Add ?grow=7.5 to the URL to pin the story at a point (for testing).
*/
(function () {
  "use strict";
  var section = document.getElementById("grow");
  var SCENE = window.BONGWEB_SCENE;
  if (!section || !SCENE) return;
  var stage = section.querySelector(".grow-stage");
  var canvas = section.querySelector(".grow-canvas");
  var world = section.querySelector(".grow-world");
  var ctx = canvas.getContext("2d");
  var reduceMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var groups = window.BONGWEB_GROUPS || [];
  var services = window.BONGWEB_SERVICES || [];
  var wa = window.bongwebWa || function () { return "#"; };
  var GERM = SCENE.germ, SEED = SCENE.seedling, SAPS = SCENE.saplings || [];

  var STOPS = [
    { id: "build", img: "assets/clay/frames/build-a.webp",  alt: "Clay builders at a desk, one typing code, one carrying a block to a glowing website panel" },
    { id: "brand", img: "assets/clay/frames/brand-a.webp",  alt: "Clay designers pinning photos and colour swatches to a board" },
    { id: "content", img: "assets/clay/frames/content-a.webp",  alt: "A clay camera operator filming a creator beside a ring light" },
    { id: "growth", img: "assets/clay/frames/growth-a.webp",  alt: "Clay paper planes flying up past a rising bar chart" },
    { id: "checked", img: "assets/clay/frames/checked-a.webp",  alt: "A clay reviewer reading a long scroll through a magnifying glass while another stamps approval" },
  ];
  var CHECKED = {
    name: "Checked", promise: "Nothing ships unchecked.",
    items: ["Senior review on every piece", "One-page scope", "Fixed price", "A date we keep", "Handover note"],
  };
  var PI = Math.PI;

  /* ---------- helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function makeCanvas(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function mixF(a, b, w) { return { x: lerp(a.x, b.x, w), y: lerp(a.y, b.y, w), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), w)) }; }
  function load(src) { return new Promise(function (res) { if (!src) return res(null); var i = new Image(); i.decoding = "async"; i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; }); }

  /* ---------- growth reveal: shows only the pixels a grow map has reached ---------- */
  function Revealer(img, map, softness) {
    var c = makeCanvas(img.width, img.height), last = -1, gl = null;
    this.canvas = c;
    try { gl = c.getContext("webgl", { premultipliedAlpha: true, preserveDrawingBuffer: true, alpha: true }); } catch (e) { gl = null; }
    var ok = false;
    if (gl && map) {
      try {
        var sh = function (type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
        var prog = gl.createProgram();
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, "attribute vec2 p;varying vec2 uv;void main(){uv=vec2(p.x*0.5+0.5,0.5-p.y*0.5);gl_Position=vec4(p,0.0,1.0);}"));
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER,
          "precision mediump float;varying vec2 uv;uniform sampler2D img;uniform sampler2D map;uniform float T;uniform float soft;" +
          "void main(){vec4 c=texture2D(img,uv);float d=texture2D(map,uv).r;float a=1.0-smoothstep(T-soft,T,d);" +
          "float edge=smoothstep(T-soft*5.0,T-soft,d)*a;c.rgb+=edge*0.08*c.a;gl_FragColor=c*a;}"));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("shader");
        gl.useProgram(prog);
        var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        var loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        [[img, true], [map, false]].forEach(function (pair, unit) {
          var tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tx);
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, pair[1]);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pair[0]);
        });
        gl.uniform1i(gl.getUniformLocation(prog, "img"), 0); gl.uniform1i(gl.getUniformLocation(prog, "map"), 1);
        var soft = softness || 0.025;
        gl.uniform1f(gl.getUniformLocation(prog, "soft"), soft);
        var uT = gl.getUniformLocation(prog, "T");
        gl.viewport(0, 0, c.width, c.height); gl.clearColor(0, 0, 0, 0);
        this.render = function (T) {
          if (Math.abs(T - last) < 1e-4) return; last = T;
          gl.clear(gl.COLOR_BUFFER_BIT); gl.uniform1f(uT, T * (1 + 2 * soft) - soft); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        };
        ok = gl.getError() === gl.NO_ERROR;
      } catch (e) { ok = false; }
    }
    if (!ok) {   // fallback without WebGL: fade in
      var c2 = makeCanvas(img.width, img.height), x = c2.getContext("2d");
      this.canvas = c2;
      this.render = function (T) { if (Math.abs(T - last) < 1e-3) return; last = T; x.clearRect(0, 0, c2.width, c2.height); x.globalAlpha = clamp(T * 1.4, 0, 1); x.drawImage(img, 0, 0); };
    }
  }

  /* ---------- island motion: each clay scene is one picture whose parts are gently bent over time ----------
     c: centre, r: radius of the moving part, p: pivot (all as fractions of the picture)
     rot: swing in radians, dx/dy: travel (fraction of the picture), glow: brightening, f: beats per second */
  var RIGS = {
    build: [
      { c: [0.22, 0.31], r: [0.11, 0.10], p: [0.22, 0.41], rot: 0.05, f: 0.5 },                        // boy looks up and down
      { c: [0.27, 0.51], r: [0.085, 0.05], p: [0.27, 0.51], dy: 0.006, f: 4.5, wave: "type" },           // hands typing
      { c: [0.79, 0.33], r: [0.17, 0.18], p: [0.82, 0.53], rot: 0.035, dy: 0.005, f: 0.8, wave: "walk" },  // girl walking
      { c: [0.71, 0.30], r: [0.085, 0.075], p: [0.71, 0.30], dx: -0.006, dy: -0.012, f: 0.4, wave: "lift" }, // block lifted to the panel
      { c: [0.47, 0.22], r: [0.32, 0.22], glow: 0.05, f: 0.35, wave: "pulse" },                         // the website glows
      { c: [0.36, 0.45], r: [0.07, 0.06], glow: 0.09, f: 2.6, wave: "pulse" },                          // code on the laptop
    ],
    brand: [
      { c: [0.33, 0.12], r: [0.10, 0.085], p: [0.28, 0.17], rot: 0.08, f: 0.55, wave: "press" },        // arm pressing the photo onto the board
      { c: [0.18, 0.10], r: [0.10, 0.09], p: [0.20, 0.18], rot: 0.04, f: 0.45 },                         // boy's head
      { c: [0.73, 0.40], r: [0.11, 0.09], p: [0.75, 0.47], rot: 0.09, f: 0.75 },                         // swatch fan
      { c: [0.83, 0.24], r: [0.11, 0.11], p: [0.83, 0.34], rot: 0.05, f: 0.4 },                          // girl's head
    ],
    content: [
      { c: [0.56, 0.31], r: [0.09, 0.08], p: [0.62, 0.38], rot: 0.10, f: 0.55 },                         // product hand
      { c: [0.66, 0.22], r: [0.14, 0.14], p: [0.66, 0.35], rot: 0.045, f: 0.85, wave: "talk" },          // talking
      { c: [0.72, 0.37], r: [0.06, 0.05], p: [0.69, 0.40], rot: 0.13, f: 1.0 },                          // free hand gesturing
      { c: [0.16, 0.36], r: [0.15, 0.20], p: [0.17, 0.63], rot: 0.025, f: 0.35 },                        // operator leans in
      { c: [0.31, 0.10], r: [0.08, 0.09], glow: 0.11, f: 0.6, wave: "pulse" },                           // ring light
      { c: [0.32, 0.32], r: [0.02, 0.02], glow: 0.35, f: 1.0, wave: "blink" },                           // REC dot
    ],
    growth: [
      { c: [0.31, 0.33], r: [0.10, 0.09], p: [0.25, 0.41], rot: 0.18, f: 0.4, wave: "throw" },          // throwing arm
      { c: [0.17, 0.33], r: [0.10, 0.10], p: [0.18, 0.43], rot: 0.05, f: 0.55 },                         // boy's head
      { c: [0.77, 0.35], r: [0.075, 0.055], p: [0.82, 0.38], rot: 0.08, f: 0.75 },                      // pointing arm
      { c: [0.88, 0.32], r: [0.09, 0.09], p: [0.88, 0.41], rot: 0.05, f: 0.5 },                          // girl's head
      { c: [0.52, 0.11], r: [0.09, 0.08], dx: 0.012, dy: -0.009, f: 0.35, wave: "glide" },              // paper planes gliding
      { c: [0.68, 0.04], r: [0.07, 0.05], dx: 0.012, dy: -0.006, f: 0.35, ph: 0.4, wave: "glide" },
      { c: [0.60, 0.55], r: [0.08, 0.06], dy: -0.008, f: 0.6 },                                          // letters bobbing
    ],
    checked: [
      { c: [0.63, 0.29], r: [0.065, 0.075], p: [0.63, 0.29], dy: -0.032, f: 0.55, wave: "stamp" },      // the stamp thumps down
      { c: [0.72, 0.34], r: [0.075, 0.045], glow: 0.16, f: 0.55, wave: "hit" },                         // the tick flashes on each stamp
      { c: [0.63, 0.16], r: [0.11, 0.11], p: [0.63, 0.26], rot: 0.04, f: 0.5 },                          // girl's head
      { c: [0.32, 0.31], r: [0.10, 0.10], p: [0.32, 0.31], dx: 0.006, dy: 0.018, f: 0.3 },              // magnifying glass scanning
      { c: [0.20, 0.20], r: [0.13, 0.13], p: [0.22, 0.33], rot: 0.03, f: 0.3, ph: 0.6 },                // boy's head follows it
      { c: [0.80, 0.24], r: [0.05, 0.045], glow: 0.08, f: 0.5, wave: "pulse" },                          // desk lamp
    ],
  };
  function wave(kind, f, t, ph) {
    var x = t * f + (ph || 0), p = x - Math.floor(x), s2 = Math.sin(2 * PI * x);
    switch (kind) {
      case "type": return Math.sin(2 * PI * x) * 0.6 + Math.sin(2 * PI * x * 1.73 + 1) * 0.4;
      case "walk": return Math.sin(2 * PI * x);
      case "lift": return 0.5 - 0.5 * Math.cos(2 * PI * x);
      case "press": return p < 0.5 ? smooth(p / 0.5) : 1 - smooth((p - 0.5) / 0.5);
      case "talk": return Math.sin(2 * PI * x) * (0.6 + 0.4 * Math.sin(2 * PI * x * 0.37));
      case "pulse": return 0.5 + 0.5 * s2;
      case "blink": return p < 0.55 ? 1 : 0;
      case "throw":   // wind back slowly, whip forward, settle
        if (p < 0.55) return -smooth(p / 0.55);
        if (p < 0.66) return lerp(-1, 0.7, smooth((p - 0.55) / 0.11));
        return 0.7 * (1 - smooth((p - 0.66) / 0.34));
      case "glide": return smooth(p < 0.5 ? p * 2 : 2 - p * 2) * 2 - 1;
      case "stamp":   // up, quick drop, hold, slow rise
        if (p < 0.35) return 1;
        if (p < 0.43) return 1 - smooth((p - 0.35) / 0.08);
        if (p < 0.55) return 0;
        return smooth((p - 0.55) / 0.4);
      case "hit": return p > 0.43 && p < 0.75 ? 1 - smooth((p - 0.43) / 0.32) : 0;
      default: return s2;
    }
  }
  var MAXP = 8;
  var ANIM_VS = "attribute vec2 p;varying vec2 uv;void main(){uv=vec2(p.x*0.5+0.5,0.5-p.y*0.5);gl_Position=vec4(p,0.0,1.0);}";
  var ANIM_FS = "precision mediump float;varying vec2 uv;uniform sampler2D img;uniform vec4 uC[8];uniform vec4 uP[8];uniform vec4 uM[8];uniform float asp;" +
    "void main(){vec2 q=uv;float glow=0.0;" +
    "for(int i=0;i<8;i++){vec4 C=uC[i];if(C.z<=0.0)continue;vec2 d=(uv-C.xy)/C.zw;float w=1.0-smoothstep(0.5,1.0,length(d));if(w<=0.0)continue;" +
    "vec4 P=uP[i];vec4 M=uM[i];vec2 s=vec2((q.x-P.x)*asp,q.y-P.y);float a=-M.x*w;float cs=cos(a);float sn=sin(a);" +
    "s=vec2(cs*s.x-sn*s.y,sn*s.x+cs*s.y);q=vec2(s.x/asp+P.x,s.y+P.y)-M.yz*w;glow+=M.w*w;}" +
    "vec4 col=texture2D(img,q);col.rgb+=glow*col.a;gl_FragColor=col;}";
  function Animator(img, parts) {   // draws one island picture with its parts moving
    var c = makeCanvas(img.naturalWidth, img.naturalHeight), gl = null;
    try { gl = c.getContext("webgl", { premultipliedAlpha: true, alpha: true }); } catch (e) { gl = null; }
    if (!gl) return null;
    try {
      var sh = function (type, src) { var o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; };
      var prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, ANIM_VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, ANIM_FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
      gl.useProgram(prog);
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      var tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.uniform1i(gl.getUniformLocation(prog, "img"), 0);
      gl.uniform1f(gl.getUniformLocation(prog, "asp"), img.naturalWidth / img.naturalHeight);
      var uC = gl.getUniformLocation(prog, "uC"), uP = gl.getUniformLocation(prog, "uP"), uM = gl.getUniformLocation(prog, "uM");
      var C = new Float32Array(MAXP * 4), P = new Float32Array(MAXP * 4), M = new Float32Array(MAXP * 4);
      parts.slice(0, MAXP).forEach(function (q, i) {
        C[i * 4] = q.c[0]; C[i * 4 + 1] = q.c[1]; C[i * 4 + 2] = q.r[0]; C[i * 4 + 3] = q.r[1];
        var pv = q.p || q.c; P[i * 4] = pv[0]; P[i * 4 + 1] = pv[1];
      });
      gl.uniform4fv(uC, C); gl.uniform4fv(uP, P);
      gl.viewport(0, 0, c.width, c.height); gl.clearColor(0, 0, 0, 0);
      if (gl.getError() !== gl.NO_ERROR) return null;
      return {
        canvas: c,
        draw: function (t) {
          parts.slice(0, MAXP).forEach(function (q, i) {
            var v = wave(q.wave, q.f, t, q.ph);
            M[i * 4] = (q.rot || 0) * v; M[i * 4 + 1] = (q.dx || 0) * v; M[i * 4 + 2] = (q.dy || 0) * v;
            M[i * 4 + 3] = (q.glow || 0) * (q.wave === "pulse" || q.wave === "blink" || q.wave === "hit" ? v : Math.abs(v));
          });
          gl.uniform4fv(uM, M);
          gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        },
      };
    } catch (e) { return null; }
  }

  /* ---------- sprites ---------- */
  var MOTE = (function () {
    var s = 32, c = makeCanvas(s, s), x = c.getContext("2d");
    var g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,252,235,1)"); g.addColorStop(0.3, "rgba(255,245,210,.55)"); g.addColorStop(1, "rgba(255,245,210,0)");
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    return c;
  })();

  /* ---------- layout (rebuilt on resize) ---------- */
  var W = 0, H = 0, DPR = 1, mobile = false;
  var IMG = {}, REV = {}, ready = false;
  var GY = 0, TH = 600, IW = 170, GK = 1, BEANY = 300, SEEDH = 130;
  var motes = [], leaves = [], birds = [];

  function wx(px) { return px - SCENE.base[0]; }
  function wy(py) { return py - SCENE.base[1]; }

  function build() {
    mobile = W < 720;
    GY = wy(SCENE.ground);
    TH = SCENE.ground - SCENE.crownTop;
    IW = SCENE.w * (mobile ? 0.12 : 0.088);
    GK = GERM ? GERM.k : 1;
    BEANY = GERM ? GY + GERM.bean[1] * GK : GY + 20;
    SEEDH = SEED ? SEED.h : 70;

    motes = []; var mr = rng(950);
    for (var i = 0; i < (mobile ? 30 : 60); i++) motes.push({ x: mr() * W, y: mr() * H, v: 4 + mr() * 12, s: 0.5 + mr() * 1.4, ph: mr() * 6.28, depth: 0.2 + mr() * 0.6 });
    leaves = []; var lr = rng(960);
    for (i = 0; i < (mobile ? 6 : 10); i++) leaves.push({ x: lr() * W, y: lr() * H, v: 18 + lr() * 22, s: 4 + lr() * 4, ph: lr() * 6.28, spin: 0.8 + lr() * 1.6, hue: lr() });
    birds = []; var br = rng(970);
    for (i = 0; i < 5; i++) birds.push({ x: br() * W, y: H * (0.1 + br() * 0.25), v: 22 + br() * 18, s: 5 + br() * 4, ph: br() * 6.28 });

    placeIslands();
    timeline = buildTimeline();
    section.style.height = (totalUnits * (mobile ? 46 : 40) + 100) + "vh";
  }

  /* ---------- islands + cards (DOM) ---------- */
  var islandEls = [], cardsEl = null;
  function makeIslands() {
    cardsEl = document.createElement("div");
    cardsEl.className = "grow-cards";
    stage.appendChild(cardsEl);
    STOPS.forEach(function (s, i) {
      var g = groups.filter(function (x) { return x.id === s.id; })[0];
      var name = g ? g.name : CHECKED.name, promise = g ? g.promise : CHECKED.promise;
      var items = g
        ? services.filter(function (x) { return x.group === s.id && x.status !== "hide"; })
        : CHECKED.items.map(function (t) { return { name: t, fixed: true }; });

      var el = document.createElement("div"); el.className = "isl";
      var art = document.createElement("div"); art.className = "isl-art";
      var glow = document.createElement("div"); glow.className = "isl-glow"; art.appendChild(glow);
      var bob = document.createElement("div"); bob.className = "isl-bob"; bob.style.animationDelay = (-i * 1.1) + "s";
      var frames = document.createElement("div"); frames.className = "isl-frames";
      var img = document.createElement("img"); img.src = s.img; img.alt = s.alt; img.decoding = "async"; img.className = "fa";
      frames.appendChild(img);
      (s.frames || []).forEach(function (src, k) {   // extra poses, played as stop-motion
        var f = document.createElement("img"); f.src = src; f.alt = ""; f.decoding = "async"; f.className = k ? "fc" : "fb";
        f.onerror = function () { frames.classList.add("no-motion"); };
        frames.appendChild(f);
      });
      if (!(s.frames || []).length) frames.classList.add("no-motion");
      bob.appendChild(frames); art.appendChild(bob);
      var puff = document.createElement("div"); puff.className = "isl-puff";
      for (var k = 0; k < 8; k++) { var p = document.createElement("span"); p.style.setProperty("--a", (k / 8) * 360 + "deg"); puff.appendChild(p); }
      art.appendChild(puff);
      el.appendChild(art);
      world.appendChild(el);

      var card = document.createElement("article"); card.className = "isl-card";
      card.innerHTML = "<p class='isl-kicker'>Branch " + (i + 1) + " of 5</p><h3></h3><p class='isl-promise'></p><ul class='chips'></ul>";
      card.querySelector("h3").textContent = name;
      card.querySelector(".isl-promise").textContent = promise;
      var ul = card.querySelector(".chips");
      items.forEach(function (it, k) {
        var li = document.createElement("li"), soon = it.status === "coming-soon", chip;
        if (it.fixed) { chip = document.createElement("span"); }
        else {
          chip = document.createElement("a");
          chip.href = wa(soon ? "Hi Bongweb, please tell me when " + it.name + " is available." : "Hi Bongweb, I'm interested in " + it.name + ".");
          chip.target = "_blank"; chip.rel = "noopener";
          if (it.gets) chip.title = it.gets;
        }
        chip.className = "chip" + (soon ? " chip-soon" : "");
        chip.style.transitionDelay = (0.2 + k * 0.05) + "s";
        chip.textContent = it.name;
        if (soon) { var tag = document.createElement("small"); tag.textContent = "soon"; chip.appendChild(tag); }
        li.appendChild(chip); ul.appendChild(li);
      });
      var cta = document.createElement("a");
      cta.className = "isl-cta";
      cta.href = wa(g ? "Hi Bongweb, I'd like help with " + name.toLowerCase() + "." : "Hi Bongweb, I'd like a one-page scope for my project.");
      cta.target = "_blank"; cta.rel = "noopener";
      cta.textContent = g ? "Ask about " + name : "Get a one-page scope";
      card.appendChild(cta);
      if (cardOnLeft(i)) card.classList.add("on-left");
      cardsEl.appendChild(card);
      var entry = { el: el, art: art, card: card, img: img, anim: null };
      islandEls.push(entry);
      var startAnim = function () {
        if (entry.anim || reduceMotion || !RIGS[s.id]) return;
        var a = Animator(img, RIGS[s.id]);
        if (!a) return;
        a.canvas.className = "isl-anim"; a.canvas.setAttribute("aria-hidden", "true");
        frames.appendChild(a.canvas); frames.classList.add("anim-on");
        entry.anim = a; a.draw(0);
      };
      if (img.complete && img.naturalWidth) startAnim(); else img.addEventListener("load", startAnim);
    });
  }
  function islandPos(i) { var a = SCENE.stops[i]; return { x: wx(a[0]), y: wy(a[1]) }; }
  function cardOnLeft(i) { return SCENE.stops[i][0] > SCENE.base[0]; }
  function placeIslands() {
    islandEls.forEach(function (o, i) {
      var p = islandPos(i);
      o.art.style.left = p.x + "px"; o.art.style.top = p.y + "px"; o.art.style.width = IW + "px";
    });
  }

  /* ---------- scroll timeline ---------- */
  var timeline = [], totalUnits = 0;
  function buildTimeline() {
    var segs = [{ k: "roots", d: 2.4 }, { k: "emerge", d: 1.8 }, { k: "grow", d: 3.8 }];
    STOPS.forEach(function (_, i) { segs.push({ k: "travel", i: i, d: 0.9 }, { k: "hold", i: i, d: 1.2 }); });
    segs.push({ k: "reveal", d: 1.3 }, { k: "end", d: 0.8 });
    var at = 0;
    segs.forEach(function (s) { s.a = at; at += s.d; });
    totalUnits = at;
    return segs;
  }
  // world rectangles for the germination photo and its roots
  function germRect() { return { x: -GERM.bean[0] * GK, y: GY, w: GERM.w * GK, h: GERM.h * GK }; }
  function rootsBox() { var b = GERM.box; return { x: (b[0] - GERM.bean[0]) * GK, y: GY + b[1] * GK, w: b[2] * GK, h: b[3] * GK }; }
  function hookX() { return (GERM.hookX - GERM.bean[0]) * GK; }
  function zCover() { var g = germRect(); return Math.max(W / g.w, H / g.h) * 1.03; }
  function inGerm(f) {   // keep the camera inside the germination photo while underground
    var g = germRect(), hw = W / 2 / f.z, hh = H / 2 / f.z;
    f.x = clamp(f.x, g.x + hw, g.x + g.w - hw); f.y = clamp(f.y, g.y + hh, g.y + g.h - hh);
    return f;
  }
  function camBean() { return inGerm({ x: 0, y: BEANY + 1, z: Math.max(zCover(), Math.min(1.7 / GK, H * 0.36 / (GERM.beanH * GK))) }); }
  function camRoots() {
    var b = rootsBox(), z = Math.max(zCover(), Math.min(1.5 / GK, H * 0.86 / b.h));
    return inGerm({ x: b.x + b.w / 2, y: b.y + b.h * 0.5, z: z });
  }
  function camHook() { return inGerm({ x: hookX(), y: GY, z: Math.max(zCover(), 1.25 / GK) }); }
  function zSeed() { return H * (mobile ? 0.5 : 0.62) / SEEDH; }
  function camEmerge(f) {   // ground stays near the bottom of the screen while the camera pulls back
    var z = Math.exp(lerp(Math.log(camHook().z), Math.log(zSeed()), ease(f)));
    return { x: lerp(hookX(), 0, ease(f)), y: GY - H * 0.36 / z, z: z };
  }
  // heights (landscape px) of each growth stage, and how the stages hand over
  function growStages(f) {
    var hs = [SEEDH].concat(SAPS.map(function (p) { return p.h; })).concat([TH]);
    var n = hs.length - 1, pos = f * n, i = Math.min(n - 1, Math.floor(pos)), u = pos - i;
    var h = Math.exp(lerp(Math.log(hs[i]), Math.log(hs[i + 1]), smooth(u)));     // the plant keeps growing
    var out = { h: h, seedA: 0, seedScale: 1, saps: [], treeA: 0, s: 1, T: 1 };
    function fadeIn(k) { return smooth(clamp((pos - (k - 0.55)) / 0.4, 0, 1)); }    // stage k takes over around pos = k - 0.35
    var w = [];
    for (var k = 0; k <= n; k++) w.push(k === 0 ? 1 : fadeIn(k));
    for (k = 0; k < n; k++) w[k] = w[k] * (1 - w[k + 1]);
    out.seedA = w[0]; out.seedScale = h / SEEDH;
    for (k = 0; k < SAPS.length; k++) out.saps.push({ a: w[k + 1], sc: h / SAPS[k].h });
    out.treeA = w[n]; out.s = clamp(h / TH, 0.05, 1);
    out.T = lerp(0.62, 1, smooth(clamp((pos - (n - 0.6)) / 0.6, 0, 1)));
    return out;
  }
  function camPlant(h) { return { x: 0, y: GY - h * 0.5, z: clamp(H * (mobile ? 0.5 : 0.64) / h, 0.2, zSeed()) }; }
  function treeVisible(s, T) { return TH * s * clamp(0.16 + T * 0.95, 0.16, 1); }
  function camTree(s, T) {
    var vh = treeVisible(s, T);
    return { x: 0, y: GY - vh * 0.5, z: clamp(H * (mobile ? 0.5 : 0.64) / vh, 0.2, zSeed()) };
  }
  var cardBox = [];
  function measureCards() { cardBox = islandEls.map(function (o) { return { w: o.card.offsetWidth, h: o.card.offsetHeight }; }); }
  function stacked() { return W < 760; }   // narrow screens: the card sits below the island
  function islandAspect(i) { var im = islandEls[i] && islandEls[i].img; return im && im.naturalWidth ? im.naturalHeight / im.naturalWidth : 1.06; }
  function freeRect(i) {
    if (!cardBox.length) measureCards();
    var head = 72, gap = 24, cb = cardBox[i] || { w: 360, h: 420 }, side = Math.max(20, (W - 1180) / 2);
    if (stacked()) return { x0: 12, x1: W - 12, y0: head + 10, y1: H - cb.h - 16 - gap };
    if (cardOnLeft(i)) return { x0: side + cb.w + gap, x1: W - gap, y0: head + gap, y1: H - gap };
    return { x0: gap, x1: W - side - cb.w - gap, y0: head + gap, y1: H - gap };
  }
  function islandFocus(i, h) {
    var p = islandPos(i), r = freeRect(i), asp = islandAspect(i);
    var fw = Math.max(90, r.x1 - r.x0), fh = Math.max(90, r.y1 - r.y0);
    var z = Math.min(fw * 0.84 / IW, fh * 0.84 / (IW * asp), mobile ? 1.7 : 1.9);
    z *= 1 + 0.035 * Math.sin(h * PI);                                     // a slow push in and out
    var cx = p.x, cy = p.y - IW * asp * 0.5;                               // centre of the island
    var drift = (h - 0.5) * Math.min(22, fw * 0.04) * (i % 2 ? 1 : -1);    // small drift that stays clear of the card
    var sx = (r.x0 + r.x1) / 2 + drift, sy = (r.y0 + r.y1) / 2;
    return { x: cx - (sx - W / 2) / z, y: cy - (sy - H / 2) / z, z: z };
  }
  function revealFocus() {   // the whole tree and its islands, centred below the header
    var top = -TH + GY;
    for (var i = 0; i < STOPS.length; i++) top = Math.min(top, islandPos(i).y - IW * 1.1);
    top -= 16;
    var bot = GY + (mobile ? 160 : 120), cx = wx((SCENE.crownLeft + SCENE.crownRight) / 2), head = 72, z;
    if (mobile) z = Math.min((H - head - 24) / (bot - top), W * 1.08 / (SCENE.crownRight - SCENE.crownLeft + IW));
    else z = Math.max(W / SCENE.w * 1.005, Math.min((H - head) / (bot - top), W * 0.98 / (SCENE.crownRight - SCENE.crownLeft + IW * 1.25), 1.1));
    return { x: cx, y: (top + bot) / 2 - (head / 2) / z, z: z };
  }
  function keepInPhoto(f) {   // never show past the edges of the photo
    f.z = Math.max(f.z, W / SCENE.w * 1.002);
    var half = W / 2 / f.z, L = wx(0), R = wx(SCENE.w);
    f.x = R - L > half * 2 ? clamp(f.x, L + half, R - half) : (L + R) / 2;
    return f;   // above the photo the sky continues in the same deep blue, so no limit upward
  }

  function stateAt(u) {
    var st = { rootT: 1, seedT: 1, seedA: 0, seedScale: 1, saps: [], germA: 0, treeA: 1, treeT: 1, s: 1, end: 0, active: -1, shown: [1, 1, 1, 1, 1], focus: null, backOn: false };
    for (var n = 0; n < timeline.length; n++) {
      var s = timeline[n];
      if (u < s.a) break;
      var f = clamp((u - s.a) / s.d, 0, 1);
      st.active = -1;
      st.backOn = s.k === "roots" || s.k === "emerge" || s.k === "grow";
      if (s.k === "roots") {
        st.rootT = lerp(0.06, 1, smooth(f)); st.seedT = 0; st.seedA = 0; st.germA = 1; st.treeT = 0; st.s = 0; st.shown = [0, 0, 0, 0, 0];
        st.focus = f < 0.62 ? mixF(camBean(), camRoots(), ease(f / 0.62)) : mixF(camRoots(), camHook(), ease((f - 0.62) / 0.38));
      } else if (s.k === "emerge") {
        st.seedT = smooth(clamp((f - 0.04) / 0.92, 0, 1)); st.seedA = 1; st.treeT = 0; st.s = 0; st.shown = [0, 0, 0, 0, 0];
        st.germA = 1;
        st.focus = f < 0.12 ? mixF(camHook(), camEmerge(0), ease(f / 0.12)) : camEmerge((f - 0.12) / 0.88);
      } else if (s.k === "grow") {
        st.germA = 1 - smooth(clamp(f / 0.12, 0, 1)); st.shown = [0, 0, 0, 0, 0]; st.seedT = 1;
        var g = growStages(f);
        st.seedA = g.seedA; st.seedScale = g.seedScale; st.saps = g.saps; st.treeA = g.treeA; st.s = g.s; st.treeT = g.T;
        var tf = camPlant(g.h);
        st.focus = f < 0.12 ? mixF(camEmerge(1), tf, ease(f / 0.12)) : tf;
      } else if (s.k === "travel") {
        for (var j = s.i; j < 5; j++) st.shown[j] = 0;
        st.focus = mixF(s.i === 0 ? camTree(1, 1) : islandFocus(s.i - 1, 1), islandFocus(s.i, 0), ease(f));
        if (f > 0.7) st.shown[s.i] = 1;
      } else if (s.k === "hold") {
        for (j = s.i + 1; j < 5; j++) st.shown[j] = 0;
        st.focus = islandFocus(s.i, ease(f));
        st.active = s.i;
      } else if (s.k === "reveal") {
        st.focus = mixF(islandFocus(4, 1), revealFocus(), ease(f));
        st.end = clamp((f - 0.7) / 0.3, 0, 1);
      } else if (s.k === "end") {
        var rf = revealFocus(); rf.z *= 1 - f * 0.02; st.focus = rf; st.end = 1;
      }
    }
    return st;
  }

  /* ---------- camera + drawing ---------- */
  var cam = { x: 0, y: 0, z: 1 };
  function SX(x) { return (x - cam.x) * cam.z + W / 2; }
  function SY(y) { return (y - cam.y) * cam.z + H / 2; }
  function photo(img, sx, sy, sw, sh, x, y, w, h, alpha) {
    if (!img || alpha <= 0.002) return;
    var X = SX(x), Y = SY(y), Wd = w * cam.z, Hd = h * cam.z;
    if (X > W || Y > H || X + Wd < 0 || Y + Hd < 0) return;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, sx, sy, sw, sh, X, Y, Wd, Hd);
    ctx.globalAlpha = 1;
  }
  function full(img, x, y, w, h, alpha) { if (img) photo(img, 0, 0, img.width, img.height, x, y, w, h, alpha); }

  function drawScene(st) {
    var z = cam.z, w = SCENE.w, gl = SCENE.ground, ext = SCENE.skyExt || 0;
    var g = ctx.createLinearGradient(0, SY(wy(-ext)), 0, SY(GY));
    g.addColorStop(0, SCENE.skyTop); g.addColorStop(1, SCENE.skyLow);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var blur = clamp((z - 1.6) / 1.4, 0, 1);
    var rowsP = ext + gl + 30;
    var backA = st.backOn && IMG.macro ? clamp((z - 1.6) / 1.0, 0, 1) : 0;
    if (backA < 1) {
      if (blur < 1 && IMG.plate) photo(IMG.plate, 0, 0, w, rowsP, wx(0), wy(-ext), w, rowsP, 1);
      if (IMG.plateBlur) { var pb = IMG.plateBlur.width / w; photo(IMG.plateBlur, 0, 0, w * pb, rowsP * pb, wx(0), wy(-ext), w, rowsP, blur < 1 ? blur : 1); }
    }
    if (backA > 0) {   // screen-space photo, its meadow pinned to the ground line, easing out a little as the camera pulls back
      var im = IMG.macro, gLine = SY(GY), gl0 = SCENE.macro.grassLine;
      var sc = Math.max(W / im.width, gLine / (gl0 * im.height), (H - gLine) / ((1 - gl0) * im.height)) * 1.02;
      sc *= 1 + 0.12 * clamp(Math.log(z / 1.6) / Math.log(12), 0, 1);
      var dw = im.width * sc, dh = im.height * sc;
      ctx.globalAlpha = backA;
      ctx.drawImage(im, W / 2 - dw / 2, gLine - gl0 * dh, dw, dh);
      ctx.globalAlpha = 1;
    }
    var top = SY(GY);
    if (top >= H) return;
    var soilA = 1 - backA;   // while the close-up photo shows, its own meadow fills the bottom
    var sh = IMG.soil ? w * IMG.soil.height / IMG.soil.width : w * 0.5625;
    if (soilA > 0) {
      ctx.globalAlpha = soilA; ctx.fillStyle = SCENE.soilDeep; ctx.fillRect(0, Math.max(0, top + 20), W, H); ctx.globalAlpha = 1;
      if (blur < 1) full(IMG.soil, wx(0), GY, w, sh, soilA);
      full(IMG.soilBlur, wx(0), GY, w, sh, soilA * (blur < 1 ? blur : 1));
    }
    var gr = germRect(), zc = W / (gr.w * 5);
    var germA = st.germA * clamp((z - zc * 1.03) / (zc * 0.6), 0, 1);   // real close-up ground until it no longer fills the screen
    if (germA > 0 && IMG.germ) {
      if (IMG.soil) for (var side = -2; side <= 2; side++) {   // plain soil either side, alternately mirrored
        if (!side) continue;
        var X0 = SX(gr.x + side * gr.w), Y0 = SY(gr.y), Wd = gr.w * z, Hd = gr.h * z;
        if (X0 + Wd < 0 || X0 > W) continue;
        ctx.save(); ctx.globalAlpha = germA; ctx.translate(X0 + Wd / 2, Y0); ctx.scale(side % 2 ? -1 : 1, 1);
        ctx.drawImage(IMG.soil, -Wd / 2, 0, Wd, Hd); ctx.restore();
      }
      full(IMG.germ, gr.x, gr.y, gr.w, gr.h, germA);
      if (REV.roots) {
        REV.roots.render(st.rootT);
        var b = rootsBox();
        full(REV.roots.canvas, b.x, b.y, b.w, b.h, germA);
      }
    }
    var fy = SY(GY + sh);
    if (soilA > 0 && fy < H + 240 * z) {
      var fg = ctx.createLinearGradient(0, fy - 200 * z, 0, fy);
      fg.addColorStop(0, "rgba(35,22,13,0)"); fg.addColorStop(1, SCENE.soilDeep);
      ctx.fillStyle = fg; ctx.fillRect(0, fy - 200 * z, W, 200 * z + 2);
    }
  }

  function drawPlant(img, aspect, baseX, h, alpha, sway) {
    if (!img || alpha <= 0.003) return;
    ctx.save();
    ctx.translate(SX(0), SY(GY + h * 0.02));
    ctx.rotate(sway);
    ctx.globalAlpha = alpha;
    var Hd = h * cam.z, Wd = Hd * aspect;
    ctx.drawImage(img, -Wd * baseX, -Hd, Wd, Hd);
    ctx.restore();
  }
  function drawSaplings(st, t) {
    for (var k = 0; k < SAPS.length; k++) {
      var p = SAPS[k], v = st.saps[k];
      if (!v || v.a <= 0.003) continue;
      drawPlant(IMG["sap" + k], p.aspect, p.baseX, p.h * v.sc, v.a, reduceMotion ? 0 : Math.sin(t * 0.9 + k) * 0.006);
    }
  }
  function drawSeedling(st, t) {
    if (st.seedA <= 0 || !REV.seed || !SEED) return;
    REV.seed.render(st.seedT);
    var h = SEEDH * lerp(0.86, 1, st.seedT) * (st.seedScale || 1), w = h * SEED.aspect;
    var sway = reduceMotion ? 0 : Math.sin(t * 1.2) * 0.012;
    ctx.save();
    ctx.translate(SX(0), SY(GY + h * 0.03));
    ctx.rotate(sway);
    ctx.globalAlpha = st.seedA;
    var Wd = w * cam.z, Hd = h * cam.z;
    ctx.drawImage(REV.seed.canvas, -Wd * SEED.baseX, -Hd, Wd, Hd);
    ctx.restore();
  }

  function drawTree(st) {
    if (st.s <= 0 || !REV.tree || st.treeA <= 0.003) return;
    REV.tree.render(st.treeT);
    var s = st.s, c = SCENE.cut;
    full(REV.tree.canvas, wx(c[0]) * s, GY + (wy(c[1]) - GY) * s, c[2] * s, c[3] * s, st.treeA);
  }

  var lastCam = null;
  function drawAir(dt, t, st) {
    var dX = lastCam ? (cam.x - lastCam.x) * cam.z : 0, dY = lastCam ? (cam.y - lastCam.y) * cam.z : 0;
    lastCam = { x: cam.x, y: cam.y };
    var ground = SY(GY), i;
    for (i = 0; i < motes.length; i++) {   // pollen in the sunlight
      var m = motes[i];
      if (!reduceMotion) { m.y -= m.v * dt; m.x += Math.sin(t * 0.5 + m.ph) * 8 * dt; }
      m.x -= dX * m.depth; m.y -= dY * m.depth;
      if (m.y < -20) m.y += H + 40; if (m.y > H + 20) m.y -= H + 40;
      if (m.x < -20) m.x += W + 40; if (m.x > W + 20) m.x -= W + 40;
      if (m.y > ground) continue;
      var R = 4 * m.s;
      ctx.globalAlpha = 0.3 + 0.35 * (reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.6 + m.ph));
      ctx.drawImage(MOTE, m.x - R, m.y - R, R * 2, R * 2);
    }
    ctx.globalAlpha = 1;
    if (st.treeT < 0.9 || reduceMotion) return;
    for (i = 0; i < leaves.length; i++) {   // a few leaves falling from the crown
      var l = leaves[i];
      l.y += l.v * dt - dY * 0.6; l.x += Math.sin(t * 1.2 + l.ph) * 22 * dt - dX * 0.6;
      if (l.y > H + 20) { l.y = -20; l.x = Math.random() * W; }
      if (l.y < -40) l.y += H + 60;
      if (l.x < -30) l.x += W + 60; if (l.x > W + 30) l.x -= W + 60;
      if (l.y > ground) continue;
      ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(Math.sin(t * l.spin + l.ph) * 1.2); ctx.scale(1, 0.55 + 0.45 * Math.cos(t * l.spin * 1.7 + l.ph));
      ctx.fillStyle = l.hue < 0.5 ? "#7fae3c" : "#a3c955";
      ctx.beginPath(); ctx.ellipse(0, 0, l.s, l.s * 0.5, 0, 0, PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = "rgba(34,42,54,0.7)"; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 1.4;
    for (i = 0; i < birds.length; i++) {   // birds crossing the sky
      var b = birds[i];
      b.x += b.v * dt - dX * 0.3; b.y -= dY * 0.3;
      if (b.x > W + 40) { b.x = -40; b.y = H * (0.08 + Math.random() * 0.25); }
      if (b.y < -20 || b.y > Math.min(H, ground)) continue;
      var flap = Math.sin(t * 8 + b.ph) * b.s * 0.5;
      ctx.beginPath(); ctx.moveTo(b.x - b.s, b.y - flap); ctx.quadraticCurveTo(b.x - b.s * 0.4, b.y - flap * 0.2, b.x, b.y); ctx.quadraticCurveTo(b.x + b.s * 0.4, b.y - flap * 0.2, b.x + b.s, b.y - flap); ctx.stroke();
    }
  }

  function draw(st, t, dt) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    drawScene(st);
    drawSeedling(st, t);
    drawSaplings(st, t);
    drawTree(st);
    drawAir(dt, t, st);
  }

  /* ---------- wiring ---------- */
  var endEl = section.querySelector(".grow-end");
  var hintEl = section.querySelector(".grow-hint");
  var target = 0, current = 0, shown = [];

  function readScroll() {
    var rect = section.getBoundingClientRect();
    var total = section.offsetHeight - window.innerHeight;
    var p = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
    target = p * totalUnits;
  }
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    if (!W || !H) return;
    DPR = Math.min(window.devicePixelRatio || 1, W < 720 ? 1.5 : 2);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    build();
    measureCards();
    readScroll();
  }

  var visible = true;
  if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(section);

  var last = performance.now(), t = 0, first = true;
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min((now - last) / 1000, 0.05); last = now;
    if ((!visible && !first) || !W || !ready) return;
    if (!reduceMotion) t += dt;
    current = reduceMotion || first ? target : current + (target - current) * (1 - Math.exp(-dt * 6));
    var st = stateAt(current);
    if (st.s > 0 || st.seedT > 0.5) keepInPhoto(st.focus);
    var k = reduceMotion || first ? 1 : 1 - Math.exp(-dt * 4.5);
    cam.x += (st.focus.x - cam.x) * k; cam.y += (st.focus.y - cam.y) * k;
    cam.z = Math.exp(Math.log(cam.z) + (Math.log(st.focus.z) - Math.log(cam.z)) * k);   // zoom eases in log space
    first = false;

    draw(st, t, dt);
    world.style.transform = "translate(" + W / 2 + "px," + H / 2 + "px) scale(" + cam.z + ") translate(" + -cam.x + "px," + -cam.y + "px)";

    islandEls.forEach(function (o, i) {
      var on = !!st.shown[i];
      if (o.anim && on && !(st.active >= 0 && st.active !== i)) o.anim.draw(t);   // animate only the islands you can see
      if (on !== !!shown[i]) { shown[i] = on; o.el.classList.toggle("is-shown", on); }
      o.card.classList.toggle("is-active", st.active === i);
      o.el.classList.toggle("is-dim", st.active >= 0 && st.active !== i);   // only the branch you're on, so nothing hides behind a card
    });
    if (endEl) endEl.classList.toggle("is-shown", st.end > 0.3);
    if (hintEl) hintEl.classList.toggle("is-hidden", current > 0.2);
  }

  makeIslands();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureCards);
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
  var srcs = [SCENE.plate, SCENE.plateBlur, SCENE.tree, SCENE.treeGrow, SCENE.soil, SCENE.soilBlur,
    GERM && GERM.base, null, GERM && GERM.roots, GERM && GERM.rootsGrow, SEED && SEED.src, SEED && SEED.grow]
    .concat(SAPS.map(function (p) { return p.src; })).concat([SCENE.macro && SCENE.macro.src]);
  Promise.all(srcs.map(load)).then(function (r) {
    IMG.plate = r[0]; IMG.plateBlur = r[1]; IMG.soil = r[4]; IMG.soilBlur = r[5]; IMG.germ = r[6]; IMG.germBlur = r[7];
    if (r[2]) REV.tree = new Revealer(r[2], r[3]);
    if (r[8]) REV.roots = new Revealer(r[8], r[9]);
    if (r[10]) REV.seed = new Revealer(r[10], r[11], 0.07);
    r.slice(12, 12 + SAPS.length).forEach(function (im, i) { IMG["sap" + i] = im; });
    IMG.macro = r[12 + SAPS.length] || null;
    ready = true;
  });
  requestAnimationFrame(frame);
})();
