/*
  The scroll story, picture by picture. Every picture is 1672 x 941 and every measurement here is in that
  picture's own pixels.

  The four growth pictures share one "world" so a picture can grow out of the one before it:
  `at` places a picture in the world ([left, top, scale]); the young tree's picture is the reference.

  rigs: parts of a picture that move. c centre, r radius, p pivot (all px), rot swing (radians),
        dx/dy travel (px), glow brightening, f beats per second, wave the shape of the motion, ph phase.
  fx:   light added on top: lamp glows, glints, a camera flash, a chat bubble, steam from a cup.
*/
window.BONGWEB_STORY = {
  w: 1672, h: 941,
  dir: "assets/story/",
  leaves: ["leaf-a.png", "leaf-b.png", "leaf-c.png"],

  pics: {
    seed: {
      at: [327.3, 439.3, 0.674], mask: "full", plate: [786, 652, 290, 232], soft: 0.06,
      alt: "A glossy brown seed engraved with the word Bongweb, resting on moss and wet soil in the sunlight",
      wind: 1.6, air: "bokeh",
      beams: { x: -120, y: -160, ang: 0.62, spread: 0.5, len: 1500, tint: "255,226,160", a: 0.12 },
      fx: [
        { t: "glint", x: 1172, y: 190, r: 16 }, { t: "glint", x: 1184, y: 263, r: 12, d: 1.1 },
        { t: "glint", x: 1232, y: 228, r: 10, d: 2.0 }, { t: "glint", x: 629, y: 373, r: 14, d: 0.6 },
        { t: "glint", x: 1062, y: 299, r: 9, d: 1.6 }, { t: "glint", x: 1338, y: 336, r: 9, d: 2.6 },
      ],
      rigs: [],
    },
    sprout: {
      at: [45, 96, 1], mask: "full", plate: [818, 176, 506, 548], soft: 0.06,
      alt: "The seed has cracked open and a green sprout with two leaves rises from it, under a great old tree",
      wind: 1.8, air: "bokeh",
      beams: { x: -100, y: -140, ang: 0.55, spread: 0.45, len: 1500, tint: "255,232,175", a: 0.09 },
      fx: [{ t: "glint", x: 1287, y: 266, r: 15, after: 0.97 }, { t: "glint", x: 1178, y: 252, r: 8, d: 1.4, after: 0.97 }],
      rigs: [
        { c: [1070, 330], r: [330, 260], p: [1020, 700], rot: 0.012, f: 0.22 },                       // the whole sprout sways from its base
        { c: [1190, 275], r: [210, 150], p: [1068, 352], rot: 0.022, f: 0.41, ph: 0.3 },               // right leaf flutters
        { c: [935, 318], r: [190, 120], p: [1050, 362], rot: -0.02, f: 0.37, ph: 0.7 },                // left leaf flutters
      ],
    },
    young: {
      at: [0, 0, 1], mask: "half", soft: 0.07, rim: 1,
      alt: "A young tree with fresh leaves on a sunny hillside, a small wooden Bongweb sign at its roots",
      wind: 2.2, air: "leaves",
      fx: [{ t: "glint", x: 1096, y: 770, r: 10, d: 0.4 }],
      rigs: [{ c: [1030, 280], r: [620, 330], p: [1040, 790], rot: 0.006, f: 0.17 }],
    },
    tree: {
      at: [210, 20, 1], mask: "half", soft: 0.07, rim: 1,
      alt: "A giant tree with five tree houses on its branches labelled Build, Brand, Content, Growth and Checked, and a Bongweb sign on the trunk",
      wind: 1.7, air: "leaves",
      fx: [
        { t: "lamp", x: 165, y: 483, r: 26 }, { t: "lamp", x: 1161, y: 261, r: 26, d: 0.7 },
        { t: "lamp", x: 1255, y: 513, r: 24, d: 1.3 }, { t: "lamp", x: 809, y: 93, r: 22, d: 0.3 },
        { t: "glint", x: 835, y: 537, r: 14, d: 0.8 },
      ],
      rigs: [],
      // where each branch's tree house is (x, y, w, h), in the order the camera visits them
      houses: [[100, 405, 430, 262], [186, 156, 388, 230], [678, 22, 448, 230], [1068, 192, 490, 206], [1158, 432, 418, 226]],
    },

    build: {
      mask: "half", wind: 1.5, air: "leaves", focus: [820, 430],
      alt: "Builders in a tree house: two people planning a shop website on paper, one at a laptop, one pressing a panel onto a big website frame, and one on the branch reading a WhatsApp message",
      fx: [
        { t: "lamp", x: 1375, y: 241, r: 34 }, { t: "pop", x: 1575, y: 348, r: 26 },
        { t: "lamp", x: 520, y: 713, r: 9, d: 0.4, a: 0.5 }, { t: "lamp", x: 695, y: 690, r: 9, d: 1.1, a: 0.5 },
        { t: "lamp", x: 960, y: 635, r: 9, d: 1.9, a: 0.5 }, { t: "lamp", x: 1235, y: 590, r: 9, d: 2.6, a: 0.5 },
      ],
      rigs: [
        { c: [255, 245], r: [200, 120], p: [255, 150], rot: 0.02, f: 0.24 },                           // the Build sign swings on its ropes
        { c: [420, 420], r: [85, 90], p: [420, 352], rot: 0.035, f: 0.33, ph: 0.4 },                   // pinned sketch sways
        { c: [238, 388], r: [56, 58], p: [236, 442], rot: 0.05, f: 0.36 },                             // planner looks between plan and partner
        { c: [315, 528], r: [118, 80], p: [315, 600], rot: 0.015, dy: 2.5, f: 0.5, ph: 0.2 },          // the paper plan lifts a little
        { c: [490, 490], r: [54, 52], p: [494, 538], rot: 0.06, f: 0.46, ph: 0.3, wave: "talk" },      // partner talks
        { c: [690, 506], r: [48, 46], p: [694, 546], rot: 0.04, f: 0.3, ph: 0.7 },                     // laptop worker thinks
        { c: [950, 355], r: [74, 54], p: [996, 392], rot: 0.05, dx: -3, f: 0.55, wave: "press" },     // smoothing the panel onto the site
        { c: [1515, 366], r: [54, 54], p: [1515, 412], rot: 0.04, f: 0.5, wave: "talk" },              // laughing at the message
      ],
    },
    brand: {
      mask: "half", wind: 1.5, air: "leaves", focus: [820, 420],
      alt: "A brand team in a tree house: one painting a leaf logo, one pointing at the logo board, one holding colour swatches, and one lifting a branded box",
      fx: [{ t: "lamp", x: 142, y: 378, r: 26 }, { t: "lamp", x: 1283, y: 201, r: 30, d: 0.8 }, { t: "lamp", x: 1426, y: 445, r: 30, a: 0.35, d: 1.5 }],
      rigs: [
        { c: [240, 235], r: [170, 95], p: [240, 150], rot: 0.02, f: 0.22 },                            // the Brand sign swings
        { c: [1283, 192], r: [42, 62], p: [1283, 140], rot: 0.06, f: 0.45, ph: 0.2 },                 // lantern sways
        { c: [735, 262], r: [100, 52], p: [735, 222], rot: 0.035, f: 0.4 },                            // swatches on the line
        { c: [320, 392], r: [135, 68], p: [320, 336], rot: 0.025, f: 0.32, ph: 0.5 },                  // sketches on the line
        { c: [262, 525], r: [48, 46], p: [240, 562], rot: 0.08, f: 0.6, wave: "paint" },               // painting
        { c: [690, 412], r: [62, 32], p: [648, 420], rot: 0.05, dx: 3, f: 0.5, wave: "press" },        // tapping the logo board
        { c: [610, 336], r: [52, 54], p: [606, 382], rot: 0.04, f: 0.3, ph: 0.4 },                     // his head
        { c: [612, 456], r: [46, 46], p: [612, 496], rot: 0.05, f: 0.4, ph: 0.2, wave: "talk" },       // she answers
        { c: [1452, 310], r: [84, 62], p: [1500, 362], rot: 0.04, dy: -3, f: 0.4, wave: "lift" },      // lifting the box to look
        { c: [1545, 240], r: [52, 56], p: [1545, 292], rot: 0.04, f: 0.35 },                           // her head
      ],
    },
    content: {
      mask: "half", wind: 1.5, air: "leaves", focus: [830, 430],
      alt: "A content team in a tree house: sketches pinned on a line, a man pinning posts on a calendar, a photographer shooting a mug, and a woman hanging photos on a line",
      fx: [{ t: "lamp", x: 1046, y: 509, r: 40 }, { t: "flash", x: 996, y: 574, r: 60 }, { t: "steam", x: 1058, y: 578 }],
      rigs: [
        { c: [315, 402], r: [135, 82], p: [315, 346], rot: 0.025, f: 0.33 },                           // sketches on the line
        { c: [1330, 368], r: [320, 64], p: [1330, 318], dy: 2, f: 0.3, ph: 0.6 },                      // photos on the line
        { c: [255, 440], r: [42, 46], p: [240, 482], rot: 0.06, f: 0.5 },                              // clipping a sketch
        { c: [120, 472], r: [58, 56], p: [130, 522], rot: 0.03, f: 0.3, ph: 0.5 },                     // her head
        { c: [730, 470], r: [48, 42], p: [690, 500], rot: 0.04, dx: 3, f: 0.55, wave: "press" },       // pinning a post
        { c: [600, 430], r: [48, 50], p: [600, 472], rot: 0.04, f: 0.35, ph: 0.2 },                    // his head
        { c: [950, 548], r: [84, 68], p: [930, 622], rot: 0.02, f: 0.25 },                             // photographer leans
        { c: [1600, 400], r: [72, 72], p: [1580, 470], rot: 0.03, f: 0.4, ph: 0.3 },                   // hanging a photo
        { c: [1510, 472], r: [50, 54], p: [1515, 522], rot: 0.04, f: 0.3 },                            // her head
      ],
    },
    growth: {
      mask: "half", wind: 1.5, air: "leaves", focus: [830, 430],
      alt: "A growth team in a tree house: a man planning with a target chart, a woman sealing envelopes, envelopes on a line to a mailbox, and two people delighted by a WhatsApp message beside a rising chart",
      fx: [{ t: "lamp", x: 503, y: 312, r: 32 }, { t: "pop", x: 1422, y: 391, r: 22 }, { t: "steam", x: 381, y: 632 }],
      rigs: [
        { c: [225, 200], r: [185, 80], p: [225, 112], rot: 0.018, f: 0.22 },                           // the Growth sign swings
        { c: [503, 300], r: [44, 58], p: [503, 255], rot: 0.05, f: 0.45 },                             // lantern sways
        { c: [320, 386], r: [125, 68], p: [320, 330], rot: 0.02, f: 0.3, ph: 0.4 },                    // portraits on the line
        { c: [836, 396], r: [42, 38], p: [836, 356], rot: 0.08, f: 0.5 },                              // envelopes swing on the rope
        { c: [940, 426], r: [40, 36], p: [940, 396], rot: 0.07, f: 0.45, ph: 0.3 },
        { c: [1025, 432], r: [37, 34], p: [1025, 402], rot: 0.08, f: 0.55, ph: 0.6 },
        { c: [700, 592], r: [92, 42], p: [700, 622], dy: 3, f: 0.5, wave: "press" },                   // sealing an envelope
        { c: [650, 396], r: [56, 56], p: [655, 452], rot: 0.04, f: 0.3 },                              // her head
        { c: [1335, 376], r: [52, 52], p: [1340, 422], rot: 0.05, f: 0.6, wave: "talk" },              // laughing at the message
        { c: [1500, 456], r: [42, 36], p: [1470, 470], rot: 0.08, f: 0.6, ph: 0.25 },                  // he gestures
      ],
    },
    checked: {
      mask: "half", wind: 1.4, air: "leaves", focus: [840, 420],
      alt: "Reviewers in a tree house: one marking a printout with a red pen, one typing on a laptop, a checklist reading Quality, Details, Usability, and a finished book handed over with a green seal",
      fx: [
        { t: "lamp", x: 336, y: 334, r: 36 }, { t: "glint", x: 1475, y: 419, r: 18, d: 0.5 },
        { t: "tick", x: 751, y: 539, r: 13 }, { t: "tick", x: 754, y: 568, r: 13, d: 0.45 }, { t: "tick", x: 758, y: 596, r: 13, d: 0.9 },
      ],
      rigs: [
        { c: [315, 135], r: [225, 90], p: [315, 45], rot: 0.012, f: 0.2 },                             // the Checked sign swings
        { c: [345, 300], r: [54, 48], p: [345, 255], rot: 0.05, f: 0.4 },                              // lamp sways
        { c: [196, 346], r: [52, 54], p: [200, 396], rot: 0.04, f: 0.35, wave: "talk" },               // young man talks
        { c: [440, 376], r: [52, 52], p: [445, 422], rot: 0.04, f: 0.3, ph: 0.5 },                     // she listens
        { c: [765, 456], r: [42, 36], p: [745, 470], rot: 0.06, dx: 3, f: 1.1, wave: "write" },        // marking the printout
        { c: [752, 336], r: [52, 52], p: [756, 382], rot: 0.03, f: 0.25 },                             // her head
        { c: [1030, 562], r: [58, 26], p: [1030, 562], dy: 1.6, f: 4.2, wave: "type" },                // typing
        { c: [985, 376], r: [52, 52], p: [990, 422], rot: 0.04, f: 0.35, ph: 0.6 },                    // her head
        { c: [1215, 302], r: [56, 56], p: [1220, 352], rot: 0.04, f: 0.3, wave: "talk" },              // handing over the book
        { c: [1580, 322], r: [52, 56], p: [1580, 372], rot: 0.04, f: 0.4, ph: 0.2 },                   // she smiles back
      ],
    },
  },
  // the order of the branches, matching the tree houses above
  branches: ["build", "brand", "content", "growth", "checked"],
};
