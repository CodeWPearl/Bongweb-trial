/*
  Bongweb landing page: the studio's story in nine painted pictures, played by scrolling.

  1. A seed engraved "Bongweb" puts out a root and two leaves.
  2. The seed cracks open and a sprout grows out of it.
  3. The sprout grows into a young tree, and the young tree into a giant tree whose branches carry five signs.
  4. The camera flies to each sign (Build, Brand, Content, Growth, Checked) and the picture of that branch
     fills the screen, alive with small movements.
  5. The camera pulls back to the whole tree.

  Pictures and measurements live in data/story.js. Each picture has a mask (assets/story/*-mask.png):
    red   which pixels stay hidden until growth reaches them (root, leaves, sprout; the whole picture for the
          trees); in the branch pictures, the patches of sunlight on the bark, which shimmer
    green the order growth reaches them (0 first, 1 last)
    blue  how much the leaves there move in the breeze
  One WebGL shader draws every picture with its growth, breeze and "rigs" (a head that nods, a sign that
  swings on its ropes). Glints, chat bubbles, ticks and falling leaves are drawn on a 2D canvas above it.
  The first four pictures carry painted words (logo, headline, button). Those were lifted into their own layer
  (<name>-text.webp) so they stay still and readable while the art grows and the camera moves; on phones the
  logo sits in the header and the words above the picture. Every painted button is a real link.
  Add ?grow=7.5 to the URL to pin the story at a point, and &t=2 to pin the animation clock (for testing).
*/
(function () {
  "use strict";
  var section = document.getElementById("grow");
  var S = window.BONGWEB_STORY;
  if (!section || !S) return;
  var stage = section.querySelector(".grow-stage");
  var canvas = section.querySelector(".grow-canvas");
  var fxCanvas = section.querySelector(".grow-fx");
  var fx = fxCanvas.getContext("2d");
  var reduceMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var PW = S.w, PH = S.h, PICS = S.pics, BR = S.branches;
  var BG = [0.99, 0.94, 0.9];   // the cream of the painted sky near the ground
  var PI = Math.PI;

  /* ---------- helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function seg(f, a, b) { return clamp((f - a) / (b - a), 0, 1); }
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function makeCanvas(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function loadImg(src) {
    return new Promise(function (res) {
      if (!src) return res(null);
      var i = new Image(); i.decoding = "async";
      i.onload = function () { res(i); }; i.onerror = function () { res(null); };
      i.src = src;
    });
  }

  /* ---------- motion of the rigs ---------- */
  function wave(kind, f, t, ph) {
    var x = t * f + (ph || 0), p = x - Math.floor(x), s2 = Math.sin(2 * PI * x);
    switch (kind) {
      case "talk": return s2 * (0.6 + 0.4 * Math.sin(2 * PI * x * 0.37));
      case "press": return p < 0.5 ? smooth(p / 0.5) : 1 - smooth((p - 0.5) / 0.5);
      case "lift": return 0.5 - 0.5 * Math.cos(2 * PI * x);
      case "type": return Math.sin(2 * PI * x) * 0.6 + Math.sin(2 * PI * x * 1.73 + 1) * 0.4;
      case "paint": return Math.sin(2 * PI * x) * 0.8 + Math.sin(4 * PI * x + 0.6) * 0.2;
      case "write": return Math.sin(2 * PI * x) * 0.7 + Math.sin(2 * PI * x * 2.3) * 0.3;
      default: return s2;
    }
  }

  /* ---------- pictures ---------- */
  var MAXR = 10;
  var IM = {};
  Object.keys(PICS).forEach(function (name) {
    var c = PICS[name], rigs = (c.rigs || []).slice(0, MAXR);
    var C = new Float32Array(MAXR * 4), P = new Float32Array(MAXR * 4);
    rigs.forEach(function (q, i) {
      C[i * 4] = q.c[0] / PW; C[i * 4 + 1] = q.c[1] / PH; C[i * 4 + 2] = q.r[0] / PW; C[i * 4 + 3] = q.r[1] / PH;
      var pv = q.p || q.c; P[i * 4] = pv[0] / PW; P[i * 4 + 1] = pv[1] / PH;
    });
    IM[name] = { name: name, cfg: c, rigs: rigs, rigC: C, rigP: P, ready: false };
  });
  var RIGM = new Float32Array(MAXR * 4);
  function rigMotion(p, t) {
    RIGM.fill(0);
    p.rigs.forEach(function (q, i) {
      var v = wave(q.wave, q.f, t, q.ph);
      RIGM[i * 4] = (q.rot || 0) * v; RIGM[i * 4 + 1] = (q.dx || 0) * v / PW; RIGM[i * 4 + 2] = (q.dy || 0) * v / PH;
      RIGM[i * 4 + 3] = (q.glow || 0) * Math.abs(v);
    });
    return RIGM;
  }

  /* ---------- renderer: WebGL (growth, breeze, rigs), or plain canvas as a fallback ---------- */
  var VS = "attribute vec2 aPos;uniform vec4 uQuad;uniform vec4 uImg;uniform vec2 uView;varying vec2 vUv;" +
    "void main(){vec2 p=uQuad.xy+aPos*uQuad.zw;vUv=(p-uImg.xy)/uImg.zw;vec2 c=p/uView*2.0-1.0;gl_Position=vec4(c.x,-c.y,0.0,1.0);}";
  var FS = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH", "precision highp float;", "#else", "precision mediump float;", "#endif",
    "uniform sampler2D uTex;uniform sampler2D uSoft;uniform sampler2D uMask;",
    "uniform float uUseMask;uniform float uReveal;uniform float uT;uniform float uEdge;uniform float uRim;",
    "uniform float uAlpha;uniform float uBlur;uniform float uTime;uniform float uWind;uniform float uFeather;",
    "uniform float uAsp;uniform float uDim;uniform float uMirror;uniform float uRigs;uniform float uDapple;uniform vec2 uTexel;",
    "uniform vec4 uC[10];uniform vec4 uP[10];uniform vec4 uM[10];",
    "varying vec2 vUv;",
    "void main(){",
    " vec2 uv=vUv;",
    " if(uMirror>0.5){uv=1.0-abs(1.0-mod(uv,2.0));}",
    " else if(uv.x<0.0||uv.y<0.0||uv.x>1.0||uv.y>1.0){discard;}",
    " vec2 q=uv;float glow=0.0;",
    " for(int i=0;i<10;i++){",
    "  if(float(i)>=uRigs)break;",
    "  vec4 C=uC[i];vec2 d=(uv-C.xy)/C.zw;float w=1.0-smoothstep(0.5,1.0,length(d));",
    "  if(w>0.0){vec4 P=uP[i];vec4 M=uM[i];vec2 s=vec2((q.x-P.x)*uAsp,q.y-P.y);float a=-M.x*w;float cs=cos(a);float sn=sin(a);",
    "   s=vec2(cs*s.x-sn*s.y,sn*s.x+cs*s.y);q=vec2(s.x/uAsp+P.x,s.y+P.y)-M.yz*w;glow+=M.w*w;}",
    " }",
    " vec4 m=vec4(0.0);",
    " if(uUseMask>0.5){",
    "  float wv=texture2D(uMask,uv).b*uWind;",
    "  if(wv>0.001){vec2 o=vec2(sin(uTime*1.1+uv.x*5.0+uv.y*9.0)+0.35*sin(uTime*2.7+uv.x*31.0+uv.y*23.0),",
    "   0.6*cos(uTime*0.9+uv.x*7.0-uv.y*4.0)+0.25*sin(uTime*2.3+uv.y*29.0+uv.x*11.0));q+=o*wv*uTexel;}",
    "  m=texture2D(uMask,q);",
    " }",
    " vec3 col=texture2D(uTex,q).rgb;",
    " if(uBlur>0.001){col=mix(col,texture2D(uSoft,q).rgb,uBlur);}",
    " if(uDapple>0.0&&m.r>0.001){float n=sin(q.x*61.0+q.y*23.0+uTime*0.8)*sin(q.x*29.0-q.y*71.0-uTime*0.55+1.3);",
    "  col*=1.0+m.r*uDapple*(0.25-(0.5+0.5*n));}",   // sunlight patches fade and return as the leaves above move
    " col=col*uDim+glow*vec3(1.0,0.93,0.78);",
    " float a=1.0;",
    " if(uReveal>0.5){float rev=1.0-smoothstep(uT-uEdge,uT,m.g);a=1.0-m.r*(1.0-rev);",
    "  float front=smoothstep(uT-uEdge*3.0,uT-uEdge*0.6,m.g)*rev*m.r;",
    "  col+=front*uRim*vec3(0.11,0.1,0.06)*clamp((1.0-dot(col,vec3(0.3,0.59,0.11)))*1.8,0.0,1.0);}",   // the growing edge glows; pale sky stays as it is
    " if(uFeather>0.0){vec2 e=min(uv,1.0-uv);a*=smoothstep(0.0,uFeather,e.x)*smoothstep(0.0,uFeather*uAsp,e.y);}",
    " a*=uAlpha;",
    " gl_FragColor=vec4(col*a,a);",
    "}"].join("\n");

  var R = null, clockT = 0;
  function makeGL() {
    var opts = { alpha: false, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: "high-performance" };
    var gl = null, gl2 = false;
    try {
      gl = canvas.getContext("webgl2", opts); gl2 = !!gl;
      if (!gl) gl = canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
    } catch (e) { gl = null; }
    if (!gl) return null;
    var U = {}, blank, prog;
    function shader(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
      return s;
    }
    function init() {
      prog = gl.createProgram();
      gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
      gl.useProgram(prog);
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
      var aPos = gl.getAttribLocation(prog, "aPos"); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      ["uQuad", "uImg", "uView", "uTex", "uSoft", "uMask", "uUseMask", "uReveal", "uT", "uEdge", "uRim", "uAlpha", "uBlur", "uTime",
        "uWind", "uFeather", "uAsp", "uDim", "uMirror", "uRigs", "uDapple", "uTexel", "uC", "uP", "uM"].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
      gl.uniform1i(U.uTex, 0); gl.uniform1i(U.uSoft, 1); gl.uniform1i(U.uMask, 2);
      gl.uniform1f(U.uAsp, PW / PH); gl.uniform2f(U.uTexel, 1 / PW, 1 / PH);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.DEPTH_TEST);
      blank = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, blank);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      if (gl.getError() !== gl.NO_ERROR) throw new Error("gl");
    }
    try { init(); } catch (e) { if (window.console) console.warn("grow: WebGL unavailable, using the simple renderer.", e); return null; }

    function texture(img, mip) {
      if (!img) return null;
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      var useMip = mip && gl2;
      if (useMip) gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, useMip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    }
    var lost = false;
    canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); lost = true; });
    canvas.addEventListener("webglcontextrestored", function () {
      try { init(); } catch (e) { return; }
      lost = false;
      Object.keys(IM).forEach(function (n) { var p = IM[n]; p.tTex = p.tSoft = p.tMask = p.tPlate = null; api.upload(p); });
      api.resize();
    });
    var api = {
      kind: "gl",
      upload: function (p) {   // called twice: first with only the soft copy, then with everything
        if (p.soft && !p.tSoft) p.tSoft = texture(p.soft, false);
        if (p.img && !p.tTex) {
          p.tMask = texture(p.mask, false); p.tPlate = texture(p.plate, false);
          p.tTex = texture(p.img, true);
        }
      },
      resize: function () { gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(U.uView, canvas.width, canvas.height); },
      begin: function () { gl.clearColor(BG[0], BG[1], BG[2], 1); gl.clear(gl.COLOR_BUFFER_BIT); },
      draw: function (L) {
        if (lost) return;
        var p = IM[L.pic], early = !L.plate && !p.tTex, tx = L.plate ? p.tPlate : (p.tTex || p.tSoft);
        if (!tx) return;
        var r = L.rect, q = L.mirror ? { x: 0, y: 0, w: W, h: H } : clipToScreen(r);
        if (!q) return;
        gl.uniform4f(U.uQuad, q.x * DPR, q.y * DPR, q.w * DPR, q.h * DPR);
        gl.uniform4f(U.uImg, r.x * DPR, r.y * DPR, r.w * DPR, r.h * DPR);
        var useMask = !L.plate && !early && !!p.tMask;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tx);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, (!L.plate && p.tSoft) || blank);
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, useMask ? p.tMask : blank);
        var edge = p.cfg.soft || 0.06;
        gl.uniform1f(U.uUseMask, useMask ? 1 : 0);
        gl.uniform1f(U.uReveal, useMask && L.reveal ? 1 : 0);
        gl.uniform1f(U.uEdge, edge);
        gl.uniform1f(U.uT, lerp(-0.01, 1 + edge + 0.01, L.T == null ? 1 : L.T));
        gl.uniform1f(U.uRim, L.rim ? 1 : 0);
        gl.uniform1f(U.uAlpha, L.alpha);
        gl.uniform1f(U.uBlur, L.plate || early || !p.tSoft ? 0 : clamp(L.blur || 0, 0, 1));
        gl.uniform1f(U.uTime, clockT);
        gl.uniform1f(U.uWind, L.live && !L.plate && !reduceMotion ? (p.cfg.wind || 0) : 0);
        gl.uniform1f(U.uFeather, L.feather || 0);
        gl.uniform1f(U.uDim, L.dim || 1);
        gl.uniform1f(U.uMirror, L.mirror ? 1 : 0);
        gl.uniform1f(U.uDapple, useMask && !L.reveal && L.live && !reduceMotion ? (p.cfg.dapple || 0) : 0);
        var n = L.live && !L.plate && !early && !reduceMotion ? p.rigs.length : 0;
        if (n) { gl.uniform4fv(U.uC, p.rigC); gl.uniform4fv(U.uP, p.rigP); gl.uniform4fv(U.uM, rigMotion(p, clockT)); }
        gl.uniform1f(U.uRigs, n);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
    };
    return api;
  }
  function make2D() {
    var c = canvas.getContext("2d");
    if (!c) return null;
    return {
      kind: "2d",
      upload: function () {},
      resize: function () {},
      begin: function () {
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
        c.fillStyle = "rgb(" + BG.map(function (v) { return Math.round(v * 255); }).join(",") + ")";
        c.fillRect(0, 0, canvas.width, canvas.height);
      },
      draw: function (L) {
        if (L.plate) return;   // without WebGL roots and sprout are simply shown grown
        var p = IM[L.pic], r = L.rect, a = L.alpha, im = p.img || p.soft;
        if (!im) return;
        if (L.reveal && p.cfg.mask !== "full") a *= clamp((L.T == null ? 1 : L.T) * 1.4, 0, 1);
        var b = p.soft ? clamp(L.blur || 0, 0, 1) : 0;
        c.globalAlpha = a * (1 - b * 0.85);
        c.drawImage(im, r.x * DPR, r.y * DPR, r.w * DPR, r.h * DPR);
        if (b > 0.02 && p.img) { c.globalAlpha = a * b; c.drawImage(p.soft, r.x * DPR, r.y * DPR, r.w * DPR, r.h * DPR); }
        if (L.dim && L.dim < 1) { c.globalAlpha = a * (1 - L.dim); c.fillStyle = "#000"; c.fillRect(r.x * DPR, r.y * DPR, r.w * DPR, r.h * DPR); }
        c.globalAlpha = 1;
      },
    };
  }
  function clipToScreen(r) {
    var x0 = Math.max(0, r.x), y0 = Math.max(0, r.y), x1 = Math.min(W, r.x + r.w), y1 = Math.min(H, r.y + r.h);
    return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
  }

  /* ---------- layout ---------- */
  var W = 0, H = 0, DPR = 1, CY = 0, HEAD = 68;
  function portrait() { return W / H < 0.9; }

  // world: the young tree's picture is the reference; the other growth pictures are placed by `at`
  function place(name) { var a = PICS[name].at || [0, 0, 1]; return { ox: a[0], oy: a[1], s: a[2] }; }
  function coverZ(name) { var p = place(name); return Math.max(W / (PW * p.s), H / (PH * p.s)); }
  function fit(c, name) {   // keep the picture over the whole screen where it is big enough
    var p = place(name), hw = W / 2 / c.z, hh = H / 2 / c.z, iw = PW * p.s, ih = PH * p.s;
    if (iw >= hw * 2) c.x = clamp(c.x, p.ox + hw, p.ox + iw - hw);
    if (ih >= hh * 2) c.y = clamp(c.y, p.oy + hh, p.oy + ih - hh);
    return c;
  }
  // Wide screens show each picture as painted, in one frame for its words and its art: as large as fills the
  // screen, but never so large that the words or the art are cut off (what is left over at the edges of
  // screens wider or narrower than 16:9 is the picture mirrored: more sky, more bark).
  function frameScale(x0, x1, y0, y1) {
    var mx = Math.max(16, W * 0.02), my = 8;
    return Math.min(Math.max(W / PW, H / PH), (W - 2 * mx) / (x1 - x0), (H - 2 * my) / (y1 - y0));
  }
  function restFrame() {   // growth pictures: words from x 80, art to x 1530 (the outermost leaf tips may be cut)
    var s = frameScale(80, 1530, 8, 878);
    return { s: s, ox: W / 2 - 805 * s, oy: H / 2 - 443 * s };
  }
  // camera keyframes. Wide screens show the picture in its frame (see restFrame), pushing in by `mul` around
  // the art (ax, ay) so the art grows in place and never slides under the words.
  // Portrait screens show the art alone, `vw` picture pixels across around (u, v); the words sit above it.
  var K = {
    seedA: { pic: "seed", mul: 1.0, ax: 1150, ay: 560, u: 1145, v: 536, vw: 794 },
    seedB: { pic: "seed", mul: 1.04, ax: 1150, ay: 560, u: 1149, v: 541, vw: 900 },
    shell: { pic: "sprout", mul: 1.08, ax: 1070, ay: 690, u: 1068, v: 660, vw: 640 },
    sprout: { pic: "sprout", mul: 1.03, ax: 1080, ay: 470, u: 1086, v: 453, vw: 700 },
    young: { pic: "young", mul: 1.0, ax: 1180, ay: 470, u: 1174, v: 448, vw: 912 },
    tree: { pic: "tree", mul: 1.0, ax: 1120, ay: 480, u: 1122, v: 481, vw: 1225 },
  };
  function camK(k, extra) {
    var p = place(k.pic);
    if (portrait()) return fit({ x: p.ox + k.u * p.s, y: p.oy + k.v * p.s, z: W / (k.vw * p.s) * (extra || 1) }, k.pic);
    var F = restFrame(), z = F.s * k.mul * (extra || 1) / p.s;
    var X = F.ox + k.ax * F.s, Y = F.oy + k.ay * F.s;   // where the anchor sits in the frame
    return { x: p.ox + k.ax * p.s - (X - W / 2) / z, y: p.oy + k.ay * p.s - (Y - CY) / z, z: z };
  }
  function camStop(i) {   // close on the sign of branch i
    var h = PICS.tree.stops[i], p = place("tree");
    var z = portrait() ? W / (h[2] * 1.02 * p.s) : Math.min(W / (h[2] * p.s), H / (h[3] * p.s)) * 0.9;
    z = Math.max(z, coverZ("tree") * 1.25);
    return fit({ x: p.ox + (h[0] + h[2] / 2) * p.s, y: p.oy + (h[1] + h[3] / 2) * p.s, z: z }, "tree");
  }
  function mixCam(a, b, t) { return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), t)) }; }
  function hopCam(a, b, t, hop) { var c = mixCam(a, b, t); c.z *= Math.exp(-hop * Math.sin(PI * t)); return c; }
  function rectOf(name, c) {
    var p = place(name);
    return { x: (p.ox - c.x) * c.z + W / 2, y: (p.oy - c.y) * c.z + CY, w: PW * p.s * c.z, h: PH * p.s * c.z };
  }
  function coverRect(name, mul) {
    var f = PICS[name].focus || [PW / 2, PH / 2], s = Math.max(W / PW, H / PH) * mul, w = PW * s, h = PH * s;
    return { x: clamp(W / 2 - f[0] * s, W - w, 0), y: clamp(H / 2 - f[1] * s, H - h, 0), w: w, h: h };
  }
  // a branch picture fills the screen and drifts slowly; on phones it is a wide band that pans across the scene
  function closeRect(i, h, push) {
    var name = BR[i], f = PICS[name].focus || [PW / 2, PH / 2], dir = i % 2 ? -1 : 1, e = smooth(h), s, w, hh;
    if (portrait()) {
      s = W / 820 * push; w = PW * s; hh = PH * s;
      var pan = lerp(0.12, 0.88, e); if (dir < 0) pan = 1 - pan;
      return { x: -(w - W) * pan, y: (PICS[name].text ? artCY() : (H + HEAD) / 2) - hh / 2, w: w, h: hh };
    }
    // the sign (from x 50) and the painted words (to x 1612) always fit; drift slowly while you scroll
    var s0 = frameScale(50, 1612, 20, 925), mx = Math.max(16, W * 0.02);
    s = s0 * (1 + 0.03 * e) * push; w = PW * s; hh = PH * s;
    var xa = mx - 50 * s, xb = W - mx - 1612 * s;     // sign at the left edge / words at the right edge
    var x = xb < xa ? lerp(xa, xb, dir > 0 ? e : 1 - e) : (W - (50 + 1612) * s) / 2;
    return { x: x, y: H / 2 - (472 - 12 * e) * s, w: w, h: hh };
  }

  /* ---------- the painted words of the growth pictures ---------- */
  var TEXTPICS = Object.keys(PICS).filter(function (n) { return PICS[n].text; });
  var COPYW = Math.max.apply(null, TEXTPICS.map(function (n) { return PICS[n].text.copy[2]; }));
  var COPYH = Math.max.apply(null, TEXTPICS.map(function (n) { return PICS[n].text.copy[3]; }));
  function copyScale() { return Math.min((W - 32) / COPYW, H * 0.4 / COPYH, 0.9); }
  function copyTop() { return HEAD + 8; }
  function artCY() { var b = copyTop() + COPYH * copyScale(); return b + (H - b) / 2; }   // phones: the art below the words
  function part(t, k) { var b = t.box, q = t[k]; return [q[0] - b[0], q[1] - b[1], q[2], q[3]]; }
  // screen places of a picture's text layer: [source rect in the layer, destination rect on screen].
  // Wide screens: the whole layer, as painted, in the picture's frame (`rect`, for a branch picture where it
  // is now; the growth pictures' resting frame otherwise). Phones: the logo in the header, the words on top.
  function textParts(name, rect) {
    var t = PICS[name].text, b = t.box, out = [], s, ox, oy, sc;
    if (!portrait()) {
      if (rect) { s = rect.w / PW; ox = rect.x; oy = rect.y; } else { var F = restFrame(); s = F.s; ox = F.ox; oy = F.oy; }
      out.push([[0, 0, b[2], b[3]], [ox + b[0] * s, oy + b[1] * s, b[2] * s, b[3] * s]]);
      out.button = [ox + t.button[0] * s, oy + t.button[1] * s, t.button[2] * s, t.button[3] * s];
      return out;
    }
    if (t.logo) {
      s = Math.min(50 / t.logo[3], 1);
      out.push([part(t, "logo"), [16, HEAD / 2 - t.logo[3] * s / 2, t.logo[2] * s, t.logo[3] * s]]);
    }
    sc = copyScale(); ox = 16; oy = copyTop();
    out.push([part(t, "copy"), [ox, oy, t.copy[2] * sc, t.copy[3] * sc]]);
    out.button = [ox + (t.button[0] - t.copy[0]) * sc, oy + (t.button[1] - t.copy[1]) * sc, t.button[2] * sc, t.button[3] * sc];
    if (t.scroll) out.scroll = [part(t, "scroll"), [16, H - 18 - t.scroll[3] * sc, t.scroll[2] * sc, t.scroll[3] * sc]];
    return out;
  }
  // how much of each picture's words shows at a point of the story (crossfades with the pictures)
  function textAt(k, f, i, out) {
    function add(n, a) { if (a > 0.003) out.text.push({ pic: n, a: a }); }
    var x;
    switch (k) {
      case "seed": add("seed", 1); break;
      case "sprout": x = smooth(seg(f, 0.04, 0.34)); add("seed", 1 - x); add("sprout", x); break;
      case "young": x = smooth(seg(f, 0.02, 0.2)); add("sprout", 1 - x); add("young", x); break;
      case "tree": x = smooth(seg(f, 0.02, 0.2)); add("young", 1 - x); add("tree", x); break;
      case "full": add("tree", 1); break;
      case "dive": if (!i) add("tree", 1 - smooth(seg(f, 0, 0.22))); break;
      case "outro": add("tree", smooth(seg(f, 0.55, 0.95))); break;
      case "end": add("tree", 1); break;
    }
    return out.text.reduce(function (a, e) { return a + e.a; }, 0);
  }

  /* ---------- the scroll story ---------- */
  var SEGS = [], totalUnits = 0;
  (function () {
    var list = [["seed", 2.2], ["sprout", 2.8], ["young", 2.4], ["tree", 2.8], ["full", 0.6]];
    BR.forEach(function (_, i) { list.push(["dive", 1.5, i], ["hold", 1.1, i]); });
    list.push(["outro", 1.4], ["end", 0.5]);
    var at = 0;
    list.forEach(function (s) { SEGS.push({ k: s[0], d: s[1], i: s[2], a: at }); at += s[1]; });
    totalUnits = at;
  })();

  function worldLayer(out, name, cam, o) {
    o = o || {};
    o.pic = name; o.rect = rectOf(name, cam);
    if (o.alpha == null) o.alpha = 1;
    if (portrait()) o.feather = 0.03; else o.mirror = true;
    o.live = true;
    out.layers.push(o);
    if (portrait()) out.back.push(backdrop(name, o.bd == null ? o.alpha : o.bd));
    if (o.alpha > 0.04) out.fx.push({ pic: name, rect: o.rect, a: o.alpha * (o.fxA == null ? 1 : o.fxA), T: o.T == null ? 1 : o.T });
    return o;
  }
  function backdrop(name, a) { return { pic: name, rect: coverRect(name, 1.12), alpha: a, blur: 1, dim: 0.97 }; }
  function closeLayer(out, i, rect, o) {
    var name = BR[i];
    o = o || {};
    o.pic = name; o.rect = rect; o.live = true;
    if (o.alpha == null) o.alpha = 1;
    if (portrait()) { o.feather = 0.03; out.back.push(backdrop(name, o.alpha)); } else o.mirror = true;
    out.layers.push(o);
    // the words stay at the picture's resting size while the art pushes in or out
    if (PICS[name].text && o.alpha > 0.003) out.text.push({ pic: name, a: o.alpha, rect: o.textRect || rect });
    if (o.alpha > 0.04) out.fx.push({ pic: name, rect: rect, a: o.alpha, T: 1 });
    return o;
  }
  function treeBlur(cam) { return clamp((cam.z / camK(K.tree).z - 1.7) / 2.2, 0, 0.3); }

  function stateAt(u) {
    var s = SEGS[SEGS.length - 1];
    for (var n = 0; n < SEGS.length; n++) if (u < SEGS[n].a + SEGS[n].d) { s = SEGS[n]; break; }
    var f = clamp((u - s.a) / s.d, 0, 1), i = s.i;
    var out = { back: [], layers: [], fx: [], text: [], k: s.k };
    var cam, d, T, e1, dOut, dIn, k, fly;
    textAt(s.k, f, i, out);
    CY = portrait() ? artCY() : H / 2;   // phones: the art always sits below the words (every picture has words)
    switch (s.k) {
      case "seed":
        cam = mixCam(camK(K.seedA), camK(K.seedB), ease(f));
        worldLayer(out, "seed", cam, { T: lerp(0.03, 1, smooth(seg(f, 0.08, 0.9))), reveal: true, withPlate: true });
        break;
      case "sprout":   // the seed cracks open (dissolve), then the sprout grows out of it
        d = smooth(seg(f, 0.04, 0.34));
        cam = f < 0.34 ? mixCam(camK(K.seedB), camK(K.shell), ease(seg(f, 0, 0.34))) : mixCam(camK(K.shell), camK(K.sprout), ease(seg(f, 0.34, 0.96)));
        T = smooth(seg(f, 0.3, 0.9));
        worldLayer(out, "sprout", cam, { T: T, reveal: true, withPlate: true, blur: (1 - d) * 0.5, bd: 1, fxA: d });
        if (d < 1) worldLayer(out, "seed", cam, { T: 1, reveal: true, alpha: 1 - d, blur: 0.12 + d * 0.55 });
        break;
      case "young":    // the young tree grows out of the sprout: trunk, branches, leaves, then the sky
        T = smooth(seg(f, 0, 0.88));
        cam = mixCam(camK(K.sprout), camK(K.young), ease(f));
        worldLayer(out, "sprout", cam, { T: 1, reveal: true, fxA: 1 - T });
        worldLayer(out, "young", cam, { T: T, reveal: true, rim: 1, bd: T, fxA: T });
        break;
      case "tree":     // ...and the giant tree grows out of the young one
        T = smooth(seg(f, 0, 0.88));
        cam = mixCam(camK(K.young), camK(K.tree), ease(f));
        worldLayer(out, "young", cam, { T: 1, reveal: true, fxA: 1 - T });
        worldLayer(out, "tree", cam, { T: T, reveal: true, rim: 1, bd: T, fxA: T });
        break;
      case "full":
        cam = camK(K.tree, 1 + 0.02 * smooth(f));
        worldLayer(out, "tree", cam);
        break;
      case "dive": {   // to sign i: (back out of the last picture,) fly there, dissolve into its branch's picture
        var name = BR[i], prev = i ? BR[i - 1] : null;
        e1 = 1; dOut = 1;
        if (!prev) {
          fly = ease(seg(f, 0, 0.66)); dIn = smooth(seg(f, 0.5, 0.78)); k = ease(seg(f, 0.74, 1));
          cam = mixCam(camK(K.tree), camStop(0), fly);
        } else {
          e1 = ease(seg(f, 0, 0.16)); dOut = smooth(seg(f, 0.12, 0.32));
          fly = ease(seg(f, 0.28, 0.7)); dIn = smooth(seg(f, 0.6, 0.82)); k = ease(seg(f, 0.78, 1));
          cam = hopCam(camStop(i - 1), camStop(i), fly, 0.45);
          cam.z *= lerp(1.16, 1, dOut);
        }
        cam.z *= lerp(1, 1.22, dIn);   // keep pushing in while the sign dissolves into its branch's picture
        cam = fit(cam, "tree");
        if (dOut > 0 && k <= 0) {
          var tb = treeBlur(cam) + 0.45 * Math.sin(PI * dIn) + (prev ? 0.45 * Math.sin(PI * dOut) : 0);
          worldLayer(out, "tree", cam, { blur: tb });
        }
        if (prev && dOut < 1) closeLayer(out, i - 1, closeRect(i - 1, 1, lerp(1, 1.1, e1)), { alpha: 1 - dOut, blur: dOut * 0.6, textRect: closeRect(i - 1, 1, 1) });
        if (dIn > 0) closeLayer(out, i, closeRect(i, 0, lerp(1.16, 1, k)), { alpha: dIn, blur: (1 - dIn) * 0.6, textRect: closeRect(i, 0, 1) });
        break;
      }
      case "hold":
        closeLayer(out, i, closeRect(i, f, 1));
        break;
      case "outro": {  // back out of the last branch to the whole tree
        var last = BR.length - 1;
        e1 = ease(seg(f, 0, 0.16)); dOut = smooth(seg(f, 0.12, 0.4));
        cam = mixCam(camStop(last), camK(K.tree), ease(seg(f, 0.32, 1)));
        cam.z *= lerp(1.16, 1, dOut); cam = fit(cam, "tree");
        if (dOut > 0) worldLayer(out, "tree", cam, { blur: treeBlur(cam) + 0.45 * Math.sin(PI * dOut) });
        if (dOut < 1) closeLayer(out, last, closeRect(last, 1, lerp(1, 1.1, e1)), { alpha: 1 - dOut, blur: dOut * 0.6, textRect: closeRect(last, 1, 1) });
        break;
      }
      default:   // end: the whole tree
        cam = camK(K.tree, 1 + 0.025 * smooth(f));
        worldLayer(out, "tree", cam);
    }
    return out;
  }

  /* ---------- light and air (2D canvas above the pictures) ---------- */
  function sprite(size, paint) { var c = makeCanvas(size, size); paint(c.getContext("2d"), size); return c; }
  var GLOW = sprite(128, function (x, s) {
    var g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,226,170,0.95)"); g.addColorStop(0.25, "rgba(255,196,120,0.45)"); g.addColorStop(1, "rgba(255,170,90,0)");
    x.fillStyle = g; x.fillRect(0, 0, s, s);
  });
  var WHITE = sprite(128, function (x, s) {
    var g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.3, "rgba(255,252,240,0.5)"); g.addColorStop(1, "rgba(255,250,235,0)");
    x.fillStyle = g; x.fillRect(0, 0, s, s);
  });
  var STAR = sprite(128, function (x, s) {
    var c = s / 2;
    for (var k = 0; k < 2; k++) {
      x.save(); x.translate(c, c); x.rotate(k * PI / 2 + PI / 4 * 0);
      var g = x.createLinearGradient(-c, 0, c, 0);
      g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,250,0.95)"); g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, c, c * 0.045, 0, 0, PI * 2); x.fill(); x.restore();
    }
    var r = x.createRadialGradient(c, c, 0, c, c, c * 0.32);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = r; x.fillRect(0, 0, s, s);
  });
  var BOKEH = sprite(96, function (x, s) {
    var g = x.createRadialGradient(s / 2, s / 2, s * 0.3, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,236,190,0.55)"); g.addColorStop(0.85, "rgba(255,236,190,0.75)"); g.addColorStop(1, "rgba(255,236,190,0)");
    x.fillStyle = g; x.beginPath(); x.arc(s / 2, s / 2, s / 2, 0, PI * 2); x.fill();
  });
  var LEAVES = [];
  var vignette = null;

  var air = { motes: [], bokeh: [], leaves: [] };
  function buildAir() {
    var r = rng(77), m = Math.min(1, W * H / (1440 * 900));
    air.motes = []; air.bokeh = []; air.leaves = [];
    for (var i = 0; i < Math.round(26 + 34 * m); i++) air.motes.push({ x: r() * W, y: r() * H, v: 5 + r() * 12, s: 0.6 + r() * 1.4, ph: r() * 6.28 });
    for (i = 0; i < Math.round(8 + 8 * m); i++) air.bokeh.push({ x: r() * W, y: r() * H, v: 2 + r() * 5, s: 10 + r() * 34, ph: r() * 6.28, a: 0.25 + r() * 0.5 });
    for (i = 0; i < Math.round(3 + 5 * m); i++) air.leaves.push({ x: r() * W, y: r() * H * 1.4 - H * 0.4, v: 26 + r() * 30, s: 15 + r() * 13, ph: r() * 6.28, spin: 0.7 + r() * 1.3, img: i % 3 });
    vignette = makeCanvas(Math.max(2, Math.round(W / 4)), Math.max(2, Math.round(H / 4)));
    var vx = vignette.getContext("2d"), vw = vignette.width, vh = vignette.height;
    var g = vx.createRadialGradient(vw / 2, vh * 0.48, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.hypot(vw, vh) * 0.62);
    g.addColorStop(0, "rgba(90,52,20,0)"); g.addColorStop(1, "rgba(90,52,20,0.16)");
    vx.fillStyle = g; vx.fillRect(0, 0, vw, vh);
  }

  function pulse(t, period, d) { return ((t + (d || 0)) % period + period) % period / period; }
  function drawBeams(b, rect, a, t) {
    var k = rect.w / PW, sx = rect.x + b.x * k, sy = rect.y + b.y * k, len = b.len * k;
    fx.save(); fx.globalCompositeOperation = "lighter";
    for (var j = 0; j < 5; j++) {
      var ang = b.ang + (j - 2) * b.spread * 0.24 + Math.sin(t * 0.11 + j * 1.7) * 0.02;
      var al = a * b.a * (0.5 + 0.5 * Math.sin(t * 0.33 + j * 2.1));
      for (var layer = 1; layer <= 3; layer++) {
        var w = (0.018 + 0.012 * (j % 3)) * layer;
        var g = fx.createLinearGradient(sx, sy, sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
        g.addColorStop(0, "rgba(" + b.tint + "," + (al / 3).toFixed(3) + ")"); g.addColorStop(1, "rgba(" + b.tint + ",0)");
        fx.fillStyle = g; fx.beginPath(); fx.moveTo(sx, sy);
        fx.lineTo(sx + Math.cos(ang - w) * len, sy + Math.sin(ang - w) * len);
        fx.lineTo(sx + Math.cos(ang + w) * len, sy + Math.sin(ang + w) * len);
        fx.closePath(); fx.fill();
      }
    }
    fx.restore();
  }
  function drawPicFx(e, t) {
    var c = PICS[e.pic], rect = e.rect, k = rect.w / PW, a = e.a;
    if (a <= 0.02) return;
    if (c.beams && !reduceMotion) drawBeams(c.beams, rect, a, t);
    fx.globalCompositeOperation = "lighter";
    (c.fx || []).forEach(function (q) {
      if (q.after != null && e.T < q.after) return;
      var x = rect.x + q.x * k, y = rect.y + q.y * k, r = q.r * k, p, s;
      if (x < -r * 4 || y < -r * 4 || x > W + r * 4 || y > H + r * 4) return;
      switch (q.t) {
        case "lamp":
          s = reduceMotion ? 1 : 0.86 + 0.08 * Math.sin(t * 7.3 + (q.d || 0) * 5) + 0.06 * Math.sin(t * 13.1 + (q.d || 0) * 3);
          fx.globalAlpha = a * (q.a || 0.42) * s;
          fx.drawImage(GLOW, x - r * 3, y - r * 3, r * 6, r * 6);
          break;
        case "glint":
          p = pulse(t, 3.4, q.d); s = reduceMotion ? 0.5 : Math.pow(Math.max(0, Math.sin(p * PI * 2)), 6);
          if (s < 0.02) break;
          fx.globalAlpha = a * s * 0.9;
          var R2 = r * (1.6 + s * 1.6);
          fx.save(); fx.translate(x, y); fx.rotate(0.3 + p * 0.6); fx.drawImage(STAR, -R2, -R2, R2 * 2, R2 * 2); fx.restore();
          break;
        case "tick":
          p = pulse(t, 3.0, -(q.d || 0)); s = reduceMotion ? 0 : (p < 0.08 ? p / 0.08 : Math.max(0, 1 - (p - 0.08) / 0.3));
          if (s < 0.02) break;
          fx.globalAlpha = a * s * 0.55; fx.drawImage(WHITE, x - r * 2, y - r * 2, r * 4, r * 4);
          break;
        case "pop":
          p = pulse(t, 2.8, q.d); s = 1 - p;
          fx.globalAlpha = a * 0.3 * (0.6 + 0.4 * Math.sin(t * 3)); fx.drawImage(WHITE, x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
          if (reduceMotion) break;
          fx.globalCompositeOperation = "source-over";
          fx.globalAlpha = a * 0.55 * s * s; fx.strokeStyle = "rgba(240,255,235,1)"; fx.lineWidth = Math.max(1, 2 * k);
          fx.beginPath(); fx.arc(x, y, r * (1.05 + p * 1.5), 0, PI * 2); fx.stroke();
          fx.globalCompositeOperation = "lighter";
          break;
        case "flash":
          p = pulse(t, 3.8, q.d) * 3.8; s = reduceMotion ? 0 : (p < 0.06 ? p / 0.06 : Math.exp(-(p - 0.06) * 7));
          if (s < 0.01) break;
          fx.globalAlpha = a * s; fx.drawImage(WHITE, x - r * (1 + s), y - r * (1 + s), r * 2 * (1 + s), r * 2 * (1 + s));
          fx.globalAlpha = a * s * 0.07; fx.fillStyle = "#fff8ee";
          fx.fillRect(Math.max(0, rect.x), Math.max(0, rect.y), Math.min(W, rect.x + rect.w) - Math.max(0, rect.x), Math.min(H, rect.y + rect.h) - Math.max(0, rect.y));
          break;
        case "steam":
          if (reduceMotion) break;
          for (var j = 0; j < 5; j++) {
            p = pulse(t * 0.3, 1, j / 5);
            var sx = x + Math.sin(p * 5 + j * 1.3) * 7 * k, sy = y - p * 75 * k, sr = (5 + p * 16) * k;
            fx.globalAlpha = a * Math.sin(p * PI) * 0.16;
            fx.drawImage(WHITE, sx - sr, sy - sr, sr * 2, sr * 2);
          }
          break;
      }
    });
    fx.globalAlpha = 1; fx.globalCompositeOperation = "source-over";
  }
  function drawAir(dt, t, st) {
    var wB = 0, wL = 0;
    st.fx.forEach(function (e) { var kind = PICS[e.pic].air; if (kind === "bokeh") wB = Math.max(wB, e.a); else wL = Math.max(wL, e.a); });
    var still = reduceMotion, i;
    if (wB > 0.02) {
      fx.globalCompositeOperation = "lighter";
      for (i = 0; i < air.bokeh.length; i++) {
        var b = air.bokeh[i];
        if (!still) { b.y -= b.v * dt; b.x += Math.sin(t * 0.2 + b.ph) * 4 * dt; }
        if (b.y < -60) { b.y = H + 60; b.x = Math.random() * W; }
        fx.globalAlpha = wB * b.a * 0.16 * (0.7 + 0.3 * Math.sin(t * 0.7 + b.ph));
        fx.drawImage(BOKEH, b.x - b.s, b.y - b.s, b.s * 2, b.s * 2);
      }
    }
    fx.globalCompositeOperation = "lighter";
    for (i = 0; i < air.motes.length; i++) {   // pollen and dust in the sunlight
      var m = air.motes[i];
      if (!still) { m.y -= m.v * dt; m.x += Math.sin(t * 0.5 + m.ph) * 9 * dt; }
      if (m.y < -10) { m.y = H + 10; m.x = Math.random() * W; }
      if (m.x < -10) m.x += W + 20; if (m.x > W + 10) m.x -= W + 20;
      var R2 = 3.2 * m.s;
      fx.globalAlpha = 0.26 + 0.3 * (still ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.7 + m.ph));
      fx.drawImage(WHITE, m.x - R2, m.y - R2, R2 * 2, R2 * 2);
    }
    fx.globalCompositeOperation = "source-over";
    if (wL > 0.05 && !still && LEAVES.length) {   // a few leaves let go and drift down
      for (i = 0; i < air.leaves.length; i++) {
        var l = air.leaves[i], im = LEAVES[l.img % LEAVES.length];
        l.y += l.v * dt; l.x += (Math.sin(t * 1.1 + l.ph) * 30 + 10) * dt;
        if (l.y > H + 40) { l.y = -40 - Math.random() * H * 0.5; l.x = Math.random() * W; }
        if (l.x > W + 40) l.x -= W + 80;
        fx.save(); fx.globalAlpha = wL * 0.92;
        fx.translate(l.x, l.y); fx.rotate(Math.sin(t * l.spin + l.ph) * 1.1 + l.ph);
        fx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(t * l.spin * 1.6 + l.ph)));
        var lw = l.s, lh = l.s * im.height / im.width;
        fx.drawImage(im, -lw / 2, -lh / 2, lw, lh);
        fx.restore();
      }
    }
    fx.globalAlpha = 1;
  }

  function drawText(st) {
    fx.imageSmoothingEnabled = true; fx.imageSmoothingQuality = "high";
    st.text.forEach(function (e) {
      var im = IM[e.pic].textImg;
      if (!im) return;
      textParts(e.pic, e.rect).forEach(function (q) {
        fx.globalAlpha = e.a; fx.drawImage(im, q[0][0], q[0][1], q[0][2], q[0][3], q[1][0], q[1][1], q[1][2], q[1][3]);
      });
      if (portrait() && e.pic === "seed") {   // "Scroll to explore", until the visitor starts scrolling
        var sc = textParts("seed").scroll, a = e.a * (1 - clamp(current / 0.25, 0, 1));
        if (a > 0.01) { fx.globalAlpha = a; fx.drawImage(im, sc[0][0], sc[0][1], sc[0][2], sc[0][3], sc[1][0], sc[1][1], sc[1][2], sc[1][3]); }
      }
    });
    fx.globalAlpha = 1;
  }

  // the painted buttons are links: an invisible link sits over each while its picture is on screen
  var CTA = {};
  function scrollToBranches() {
    var hold = SEGS.filter(function (g) { return g.k === "hold" && g.i === 0; })[0];
    var top = section.getBoundingClientRect().top + window.pageYOffset;
    var y = top + hold.a / totalUnits * (section.offsetHeight - window.innerHeight);
    window.scrollTo({ top: Math.round(y), behavior: reduceMotion ? "auto" : "smooth" });
  }
  Object.keys(PICS).forEach(function (name) {
    var c = PICS[name].cta;
    if (!c) return;
    var a = document.createElement("a");
    a.className = "grow-cta"; a.textContent = c.label; a.hidden = true;
    if (c.wa) { a.href = window.bongwebWa ? window.bongwebWa(c.wa) : "#grow"; a.target = "_blank"; a.rel = "noopener"; }
    else { a.href = "#grow"; a.addEventListener("click", function (ev) { ev.preventDefault(); scrollToBranches(); }); }
    stage.appendChild(a);
    CTA[name] = { el: a, key: "" };
  });
  function placeCtas(st) {
    var on = {};
    st.text.forEach(function (e) { if (e.a > 0.6 && CTA[e.pic]) on[e.pic] = textParts(e.pic, e.rect).button; });
    Object.keys(CTA).forEach(function (n) {
      var q = on[n], o = CTA[n];
      if (q && (q[0] + q[2] < 0 || q[1] + q[3] < 0 || q[0] > W || q[1] > H)) q = null;
      var key = q ? q.map(Math.round).join(",") : "";
      if (key === o.key) return;
      o.key = key; o.el.hidden = !q;
      if (q) { var st2 = o.el.style; st2.left = q[0] + "px"; st2.top = q[1] + "px"; st2.width = q[2] + "px"; st2.height = q[3] + "px"; }
    });
  }

  /* ---------- wiring ---------- */
  var header = document.querySelector(".site-header");
  var target = 0, current = 0, needPic = function () {};
  function readScroll() {
    var rect = section.getBoundingClientRect();
    var total = section.offsetHeight - window.innerHeight;
    target = (total > 0 ? clamp(-rect.top / total, 0, 1) : 0) * totalUnits;
  }
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    if (!W || !H) return;
    HEAD = header ? Math.max(48, header.getBoundingClientRect().bottom - stage.getBoundingClientRect().top) : 68;
    CY = H / 2;
    // the pictures are 1672 px wide, so beyond ~3 million canvas pixels a sharper canvas shows nothing new
    DPR = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(3.2e6 / (W * H)));
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    fxCanvas.width = Math.round(W * DPR); fxCanvas.height = Math.round(H * DPR);
    if (R) R.resize();
    section.style.height = (totalUnits * (portrait() ? 40 : 36) + 100) + "vh";
    buildAir();
    readScroll();
  }

  var visible = true;
  if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(section);

  var params = new URLSearchParams(location.search);
  var pinU = parseFloat(params.get("grow")), pinT = parseFloat(params.get("t")), noFx = params.get("fx") === "0";
  var last = performance.now(), first = true;
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min((now - last) / 1000, 0.05); last = now;
    if ((!visible && !first) || !W || !IM.seed.img) return;
    if (!reduceMotion) clockT += dt;
    if (!isNaN(pinT)) clockT = pinT;
    current = reduceMotion || first ? target : current + (target - current) * (1 - Math.exp(-dt * 5.5));
    if (Math.abs(target - current) < 1e-4) current = target;
    first = false;
    var st = stateAt(current);

    st.layers.forEach(function (L) { if (!IM[L.pic].img) needPic(L.pic); });
    R.begin();
    st.back.forEach(function (L) { if (L.alpha > 0.003 && IM[L.pic].ready) R.draw(L); });
    st.layers.forEach(function (L) {
      if (L.alpha <= 0.003 || !IM[L.pic].ready) return;
      if (L.withPlate && L.T < 1 && IM[L.pic].cfg.plate) {   // what lies behind the roots / sprout until they grow
        var b = IM[L.pic].cfg.plate, r = L.rect, kx = r.w / PW, ky = r.h / PH;
        R.draw({ pic: L.pic, plate: true, alpha: L.alpha, rect: { x: r.x + b[0] * kx, y: r.y + b[1] * ky, w: b[2] * kx, h: b[3] * ky } });
      }
      R.draw(L);
    });

    fx.setTransform(DPR, 0, 0, DPR, 0, 0);
    fx.clearRect(0, 0, W, H);
    if (!noFx) st.fx.forEach(function (e) { if (IM[e.pic].ready) drawPicFx(e, clockT); });
    if (!noFx) drawAir(dt, clockT, st);
    if (vignette && !noFx) { fx.globalAlpha = 1; fx.drawImage(vignette, 0, 0, W, H); }
    drawText(st);
    placeCtas(st);
  }

  R = makeGL();
  if (!R) {   // WebGL failed (perhaps after taking the canvas): start again on a fresh canvas with plain 2D drawing
    var fresh = canvas.cloneNode(false);
    canvas.parentNode.replaceChild(fresh, canvas);
    canvas = fresh;
    R = make2D();
  }
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", function () { readScroll(); }, { passive: true });
  if (!isNaN(pinU)) readScroll = function () { target = pinU; };
  resize();

  function loadSoft(name) {
    return loadImg(S.dir + name + "-soft.webp").then(function (im) {
      var p = IM[name]; p.soft = im;
      if (im) { if (R) R.upload(p); p.ready = true; }
    });
  }
  function loadPic(name) {
    var c = PICS[name], d = S.dir;
    return Promise.all([
      loadImg(d + name + ".webp"), c.mask ? loadImg(d + name + "-mask.png") : null, c.plate ? loadImg(d + name + "-plate.webp") : null,
      c.text ? loadImg(d + name + "-text.webp") : null,
    ]).then(function (r) {
      var p = IM[name];
      if (!r[0]) return;
      p.img = r[0]; p.mask = r[1]; p.plate = r[2]; p.textImg = r[3];
      if (R) R.upload(p);
      p.ready = true;
    });
  }
  // the seed first so the page can start, plus the tiny soft copy of every picture (a stand-in until its
  // sharp version arrives, so a fast scroll never shows an empty frame); then the rest in story order,
  // two at a time, and whatever the current scroll position needs jumps the queue
  var ORDER = ["seed", "sprout", "young", "tree"].concat(BR);
  var queue = ORDER.slice(1), loading = 0;
  function pump() {
    while (loading < 2 && queue.length) {
      loading++;
      loadPic(queue.shift()).then(function () { loading--; pump(); });
    }
  }
  needPic = function (name) {
    var k = queue.indexOf(name);
    if (k > 0) { queue.splice(k, 1); queue.unshift(name); }
  };
  Promise.all([loadPic("seed")].concat(ORDER.map(loadSoft))).then(pump);
  Promise.all((S.leaves || []).map(function (f) { return loadImg(S.dir + f); })).then(function (r) { LEAVES = r.filter(Boolean); });
  requestAnimationFrame(frame);
})();
