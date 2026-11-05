/*
  The photo scene behind the landing page, measured in the photo's own pixels (1672 x 941).
  base:   where the trunk meets the hill (the tree grows from this point)
  ground: the cut line; the soil cross-section starts here
  cut:    where the tree cut-out (tree.webp) sits in the photo [x, y, width, height]
  skyExt: rows of extra sky added above the photo in plate.webp
  stops:  where each clay island sits on the tree, as the bottom-centre of the island [x, y]
          order: Build, Brand, Content, Growth, Checked
*/
window.BONGWEB_SCENE = {
  plate: "assets/photo/plate.webp",
  plateBlur: "assets/photo/plate-blur.webp",
  tree: "assets/photo/tree.webp",
  treeGrow: "assets/photo/tree-grow.png",
  soil: "assets/photo/soil.webp",
  soilBlur: "assets/photo/soil-blur.webp",
  w: 1672, h: 941, skyExt: 420,
  base: [845, 712],
  ground: 726,
  cut: [425, 70, 822, 658],
  crownTop: 70, crownLeft: 425, crownRight: 1247,
  skyTop: "#064296", skyLow: "#7e95b3", soilDeep: "#23160d",
  stops: [[500, 440], [1180, 430], [540, 210], [1110, 235], [835, 135]],

  // The bean germinating underground (pixels in the germination photo, drawn k times smaller than the landscape)
  germ: {
    base: "assets/germ/germ.webp", roots: "assets/germ/germ-roots.webp", rootsGrow: "assets/germ/germ-roots-grow.png",
    w: 1672, h: 941, k: 0.046, bean: [825, 290], beanH: 110, hookX: 878, box: [330, 84, 979, 800],
  },
  // The seedling that breaks the surface (h is its height in landscape pixels)
  seedling: { src: "assets/germ/seedling.webp", grow: "assets/germ/seedling-grow.png", aspect: 0.4788, baseX: 0.4932, h: 70 },
  // Close-up landscape behind the seedling (photo taken from the grass); grassLine = where the meadow meets the soil, as a fraction of its height
  macro: { src: "assets/macro/backdrop.webp", grassLine: 0.88 },
  // Young trees between the seedling and the full tree (h in landscape pixels)
  saplings: [
    { src: "assets/germ/sapling1.webp", aspect: 0.4785, baseX: 0.5442, h: 150 },
    { src: "assets/germ/sapling2.webp", aspect: 0.702, baseX: 0.506, h: 330 },
  ],
};
