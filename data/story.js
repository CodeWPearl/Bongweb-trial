/*
  The scroll story, picture by picture. Every picture is 1672 x 941 and every measurement here is in that
  picture's own pixels.

  The four growth pictures share one "world" so a picture can grow out of the one before it:
  `at` places a picture in the world ([left, top, scale]); the young tree's picture is the reference.

  rigs:   parts of a picture that move. c centre, r radius, p pivot (all px), rot swing (radians),
          dx/dy travel (px), glow brightening, f beats per second, wave the shape of the motion, ph phase.
  fx:     light added on top: glints on water drops and metal, a chat bubble that pops, ticks that flash.
  wind:   how far the leaves move in the breeze. dapple: how much the patches of sunlight on the bark shimmer.
  focus:  the part of a picture to keep in view; on phones the soft backdrop around the picture is taken from
          there (for the growth pictures, a plain stretch of sky and ground).
  text:   the painted logo, words and button, lifted into their own layer (<name>-text.webp, placed at `box`)
          so they stay still and readable while the art grows, and so phones can show them above the picture.
          logo / copy / button / scroll are parts of that layer (on phones the logo sits in the header).
  cta:    what a painted button does: open WhatsApp with a message, or scroll on to the branches.
*/
window.BONGWEB_STORY = {
  w: 1672, h: 941,
  dir: "assets/story/",
  leaves: ["leaf-a.png", "leaf-b.png", "leaf-c.png"],

  pics: {
    seed: {
      at: [257.9, 215.5, 0.8666], mask: "full", plate: [875, 234, 732, 614], soft: 0.06, focus: [300, 470],
      text: { box: [82, 9, 642, 865], logo: [98, 13, 182, 167], copy: [86, 228, 634, 504], button: [89, 636, 431, 96], scroll: [89, 831, 224, 39] },
      cta: { label: "Chat on WhatsApp", wa: "Hi Bongweb, I'd like to talk about a project." },
      alt: "AI studio, human review. Your next idea starts here. Websites, brand and marketing, built with AI and checked by people. Beside the words, a glossy brown seed engraved Bongweb puts out a root and two fresh leaves.",
      wind: 4, air: "bokeh",
      beams: { x: -120, y: -160, ang: 0.62, spread: 0.5, len: 1500, tint: "255,226,160", a: 0.07 },
      fx: [
        { t: "glint", x: 1010, y: 348, r: 13 }, { t: "glint", x: 964, y: 387, r: 12, d: 1.1 },
        { t: "glint", x: 1321, y: 567, r: 8, d: 2.0 },
        { t: "glint", x: 1459, y: 363, r: 10, d: 0.6, after: 0.97 }, { t: "glint", x: 1473, y: 500, r: 9, d: 1.6, after: 0.97 },
      ],
      rigs: [],
    },
    sprout: {
      at: [148.9, 8.7, 0.992], mask: "full", plate: [733, 70, 939, 771], soft: 0.06, focus: [300, 470],
      text: { box: [95, 13, 605, 865], logo: [102, 17, 194, 184], copy: [100, 229, 596, 515], button: [103, 648, 418, 96], scroll: [99, 835, 227, 39] },
      cta: { label: "Plan your project", wa: "Hi Bongweb, I'd like to plan a project: the scope, the price and a delivery date." },
      alt: "From idea to a clear plan. Give your idea a shape: a clear scope, a fixed price and an agreed delivery date. Beside the words, the seed has cracked open and a green sprout rises out of the shell.",
      wind: 2.5, air: "bokeh",
      beams: { x: -100, y: -140, ang: 0.55, spread: 0.45, len: 1500, tint: "255,232,175", a: 0.06 },
      fx: [{ t: "glint", x: 930, y: 200, r: 12, after: 0.97 }, { t: "glint", x: 1270, y: 209, r: 14, d: 1.4, after: 0.97 }],
      rigs: [
        { c: [1094, 342], r: [340, 276], p: [1032, 591], rot: 0.012, f: 0.22 },                       // the whole shoot sways from the shell
        { c: [1249, 198], r: [170, 106], p: [1103, 273], rot: 0.025, f: 0.41, ph: 0.3 },               // right leaf flutters
        { c: [928, 254], r: [142, 87], p: [1057, 306], rot: -0.022, f: 0.37, ph: 0.7 },                // left leaf flutters
      ],
    },
    young: {
      at: [0, 0, 1], mask: "half", soft: 0.07, rim: 1, focus: [300, 470],
      text: { box: [87, 15, 685, 861], logo: [109, 19, 191, 181], copy: [91, 252, 677, 453], button: [91, 620, 414, 85], scroll: [93, 836, 194, 36] },
      cta: { label: "Explore our services", scrollTo: "branches" },
      alt: "Built around your business. Start small, make room to grow: start with the website, brand or content you need and add more as your business grows. Beside the words, a young tree with a small wooden Bongweb sign at its roots.",
      wind: 2.2, air: "leaves",
      fx: [],
      rigs: [{ c: [1174, 311], r: [438, 301], p: [1174, 767], rot: 0.005, f: 0.17 }],
    },
    tree: {
      at: [-41.4, -84, 1.0792], mask: "half", soft: 0.07, rim: 1, focus: [300, 470],
      text: { box: [79, 14, 559, 853], logo: [100, 18, 199, 184], copy: [83, 250, 551, 462], button: [85, 621, 380, 91], scroll: [87, 825, 214, 38] },
      cta: { label: "Explore our work", scrollTo: "branches" },
      alt: "Meet Bongweb. One studio, five ways forward: build, brand, content and growth, with human review at every step. Beside the words, a giant tree whose branches carry five signs, Build, Brand, Content, Growth and Checked, and a Bongweb sign on the trunk.",
      wind: 1.7, air: "leaves",
      fx: [],
      rigs: [],
      // where each branch's sign sits (x, y, w, h), in the order the camera visits them
      stops: [[655, 434, 304, 194], [677, 248, 304, 194], [977, 134, 304, 194], [1264, 248, 304, 194], [1281, 438, 304, 194]],
    },

    build: {
      mask: "half", wind: 1.5, dapple: 0.3, air: "leaves", focus: [760, 470],
      alt: "Build. Your business, online and working: websites, stores and apps built around what your business needs. Websites, web apps, chatbots. On a branch by the Build sign, a man presses a panel onto a big wooden-framed shop website.",
      cta: { label: "Discuss your build", wa: "Hi Bongweb, I'd like to discuss a website, store or app." },
      text: { box: [1013, 55, 589, 405], copy: [1017, 59, 581, 397], button: [1026, 387, 349, 64] },
      fx: [{ t: "pop", x: 1153, y: 715, r: 14 }],
      rigs: [
        { c: [287, 551], r: [113, 117], p: [287, 452], rot: 0.02, f: 0.3 },                            // the pinned sketch sways
        { c: [948, 465], r: [62, 64], p: [950, 525], rot: 0.03, f: 0.32 },                             // he nods while he works
        { c: [776, 520], r: [103, 110], dx: -2.5, f: 0.45, wave: "press" },                            // smoothing the panel onto the page
        { c: [1432, 630], r: [166, 147], p: [1270, 718], rot: 0.02, f: 0.27 },                         // the twig sways
      ],
    },
    brand: {
      mask: "half", wind: 1.5, dapple: 0.3, air: "leaves", focus: [760, 470],
      alt: "Brand. Look ready for business: a clear identity and thoughtful design for a consistent, recognisable business. Identity, UI/UX, packaging. Under the hanging Brand sign, a woman draws a leaf logo on a gift box.",
      cta: { label: "Shape your brand", wa: "Hi Bongweb, I'd like to talk about my brand." },
      text: { box: [1007, 66, 595, 461], copy: [1011, 70, 587, 453], button: [1088, 453, 359, 65] },
      fx: [{ t: "glint", x: 513, y: 452, r: 8, d: 0.8 }],
      rigs: [
        { c: [235, 235], r: [190, 95], p: [235, 125], rot: 0.014, f: 0.22 },                           // the Brand sign swings on its ropes
        { c: [510, 395], r: [115, 100], p: [530, 480], rot: 0.02, f: 0.28 },                           // her head
        { c: [668, 628], r: [48, 40], p: [630, 650], rot: 0.07, f: 0.6, wave: "paint" },               // drawing the logo
        { c: [1450, 610], r: [170, 130], p: [1330, 700], rot: 0.02, f: 0.25, ph: 0.4 },                // the twig sways
      ],
    },
    content: {
      mask: "half", wind: 1.5, dapple: 0.3, air: "leaves", focus: [760, 470],
      alt: "Content. Stay seen, stay remembered: social posts, carousels and captions planned around your business. Calendars, posts, captions. Below the Content sign, a woman pins a post onto a content calendar.",
      cta: { label: "Plan your content", wa: "Hi Bongweb, I'd like help planning my content." },
      text: { box: [966, 57, 641, 466], copy: [970, 61, 633, 458], button: [975, 441, 391, 73] },
      fx: [{ t: "glint", x: 800, y: 325, r: 14, d: 0.5 }],
      rigs: [
        { c: [360, 410], r: [110, 88], p: [390, 480], rot: 0.02, f: 0.28 },                            // her head
        { c: [645, 485], r: [45, 42], dx: 2, f: 0.45, wave: "press" },                                 // pressing the post onto its pin
        { c: [190, 720], r: [110, 120], p: [300, 560], rot: 0.012, f: 0.35, ph: 0.3 },                 // the end of her scarf stirs
        { c: [1530, 600], r: [160, 130], p: [1400, 700], rot: 0.02, f: 0.26, ph: 0.6 },                // the twig sways
      ],
    },
    growth: {
      mask: "half", wind: 1.5, dapple: 0.3, air: "leaves", focus: [760, 470],
      alt: "Growth. Turn attention into enquiries: reach the right people and understand what works through clear reporting. Outreach, lead generation, reporting. Under the hanging Growth sign, a woman posts a letter into a wooden mailbox.",
      cta: { label: "Discuss your growth", wa: "Hi Bongweb, I'd like to get more enquiries for my business." },
      text: { box: [1001, 39, 568, 416], copy: [1005, 43, 560, 408], button: [1010, 382, 381, 64] },
      fx: [{ t: "pop", x: 1203, y: 530, r: 20 }, { t: "tick", x: 1160, y: 676, r: 10, d: 1.2 }, { t: "glint", x: 955, y: 510, r: 10, d: 2.1 }],
      rigs: [
        { c: [200, 220], r: [185, 85], p: [215, 120], rot: 0.014, f: 0.22 },                           // the Growth sign swings on its ropes
        { c: [510, 315], r: [120, 115], p: [520, 420], rot: 0.018, f: 0.26 },                          // her head
        { c: [790, 555], r: [115, 65], dx: 4, dy: 1, f: 0.32, wave: "press" },                         // posting the letter
        { c: [975, 445], r: [40, 35], p: [958, 470], rot: 0.06, f: 0.55 },                             // the mailbox flag
        { c: [1530, 690], r: [160, 130], p: [1400, 760], rot: 0.02, f: 0.27, ph: 0.2 },                // the twig sways
      ],
    },
    checked: {
      mask: "half", wind: 1.4, dapple: 0.3, air: "leaves", focus: [760, 470],
      alt: "Checked by people. AI helps us make, people make sure: a senior person reviews and refines every piece before handover. Review, refinement, handover. Under the hanging Checked sign, an older woman marks a page with a red pencil.",
      cta: { label: "Chat on WhatsApp", wa: "Hi Bongweb, I'd like to talk about a project." },
      text: { box: [976, 68, 601, 447], copy: [980, 72, 593, 439], button: [990, 438, 367, 68] },
      fx: [
        { t: "tick", x: 873, y: 622, r: 11 }, { t: "tick", x: 869, y: 649, r: 11, d: 0.45 }, { t: "tick", x: 866, y: 676, r: 11, d: 0.9 },
        { t: "tick", x: 930, y: 565, r: 30, d: 1.5 }, { t: "glint", x: 690, y: 315, r: 9, d: 2.2 },
      ],
      rigs: [
        { c: [235, 190], r: [200, 95], p: [235, 40], rot: 0.012, f: 0.2 },                             // the Checked sign swings on its ropes
        { c: [595, 280], r: [130, 130], p: [610, 400], rot: 0.015, f: 0.25 },                          // her head
        { c: [620, 605], r: [70, 55], p: [560, 640], rot: 0.03, dx: 2, f: 1.0, wave: "write" },        // marking the page
        { c: [1480, 650], r: [170, 170], p: [1330, 720], rot: 0.018, f: 0.25, ph: 0.5 },               // the twig sways
      ],
    },
  },
  // the order of the branches, matching the signs above
  branches: ["build", "brand", "content", "growth", "checked"],
};
