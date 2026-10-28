// The body systems for scripts/build-organs.mjs, found by looking at each source drawing piece by piece.
//
// file:  the downloaded drawing.
// parts: organ id -> the pieces of the source that make it. An entry is an id from the source (a group
//        takes everything inside it), or [id, [x, y, width, height]] to use only that part of a
//        shape (cut to a box, in the finished picture's numbers), or [id, [x, y, width, height, "out"]]
//        for everything except the box. The organ ids are the quiz item ids.
//        "_context" is for a shape that is also cut up into parts: the rest of it is drawn as background.
// keep:  if given, only these parts of the drawing are used (the rest is labels, boxes, insets).
// drop:  source ids that are text, label lines, arrows, boxes and so on.
// move:  { id: [ids] } draws those pieces right after id, when the source covers one with the other.
// viewBox: the picture's size, when the source has none.
//
// n<number> names a shape that has no id in the source: its place in drawing order.
const n = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => `n${from + i}`);

// The same pieces, each cut to one band of the picture: [x, y, width, height].
const cut = (ids, box) => ids.map((id) => [id, box]);

const TALL = ["path1843", "rect14405", "path8591", "path8597", "path15277", "rect14468", "path15287", "rect1576", "rect1595", "rect1823", "rect1840"];

export const SYSTEMS = {
  digestive: {
    file: "Digestive_system_diagram_en.svg",
    drop: ["layer2", "layer3", "layer4", "layer5", "path10118", "rect11465"],
    // The pancreas is seen in front of the stomach in the picture, so it is drawn after it.
    move: { path6063: ["path2174", "rect8590", "path8607", "path8609", "rect4556"] },
    parts: {
      _context: [["path6063", [300, 400, 200, 165, "out"]]],
      oesophagus: ["rect4987", "path6525", "rect7359"],
      stomach: [["path6063", [300, 400, 200, 165]], "path6047"],
      liver: ["path2176", "path2348", "path2533", "rect4052"],
      gallbladder: ["path7192", "path4783"],
      pancreas: ["path2174", "rect8590", "path8607", "path8609", "rect4556"],
      duodenum: [["path6309", [0, 0, 300, 700]], "rect4019", "path3169", "rect3958", "rect3958-8-4", "rect3958-8"],
      smallint: ["path10149"],
      largeint: ["path10143", "path10145", "path10147", "path10151", "path10155", "path10157", "path10159", "path10161", "rect10067", "rect10086"],
      parotid: ["g11205"],
      sublingual: ["g11226"],
      submandibular: ["g11213"],
    },
  },
  respiratory: {
    file: "Respiratory_system_complete_en.svg",
    // Only the main picture: the close-up of the air sacs, the boxes and the label lines are left out.
    keep: ["n0", "n1", ...n(6, 27), ...n(29, 50)],
    move: { n6: n(35, 46) },
    parts: {
      _context: ["n23"],
      nasal: [["n23", [200, 100, 300, 105]]],
      larynx: [["n23", [250, 300, 250, 140]], "n47"],
      trachea: [["n11", [0, 0, 1000, 512]], "n18", ...n(31, 34), "n48"],
      bronchi: [["n11", [0, 512, 1000, 400]], "n19", "n20", "n22"],
      lungs: ["n6", ...n(35, 46)],
      diaphragm: ["n49", "n50"],
    },
  },
  heart: {
    file: "Diagram_of_the_human_heart_cropped.svg",
    keep: ["layer1"],
    parts: {
      "inferior-vena-cava": ["inferior_vena_cava"],
      "superior-vena-cava": ["superior_vena_cava"],
      aorta: ["aorta"],
      "pulmonary-artery": ["pulmonary_artery_1", "pulmonary_artery_2"],
      "pulmonary-veins": ["pulmonary_vein_1", "pulmonary_vein_2"],
      "left-atrium": ["left_atrium"],
      "left-ventricle": ["left_ventricle"],
      "right-atrium": ["right_atrium"],
      "right-ventricle": ["right_ventricle"],
      "tricuspid-valve": ["tricuspid_valve_1", "tricuspid_valve_2"],
      "mitral-valve": ["mitral_valve_1", "mitral_valve_2"],
    },
  },
  urinary: {
    file: "Urinary_system.svg",
    drop: ["layer2", "layer3", "layer4"],
    parts: {
      kidneys: ["path4585", "path2934", "path2884", "path3802"],
      ureters: ["path4579", "path4587"],
      bladder: ["path4582", "g3057", ["path2876", [0, 0, 600, 727]], "path3708", "path3675", "path3673"],
      urethra: ["rect4659", ["path2876", [0, 727, 600, 100]]],
      adrenals: ["g4329", "g4325"],
    },
  },
  female: {
    file: "Scheme_female_reproductive_system-en.svg",
    keep: ["layer1", "layer6", "layer7", "layer9"],
    // Leftovers: lines up to the top of the page, small crosses and a bar that sit outside the drawing.
    drop: ["rect15993", "g16826", "g16821", "path11948", "g5280", "path15470"],
    viewBox: [100, 60, 330, 270],
    parts: {
      ovaries: ["g2655", "path1365", "path15246", "rect41903"],
      tubes: [
        "path14452", "rect1632", "path6699", "path7015", "path14247", "path14250", "path14252", "path14254", "path14256", "path14258", "path1473", "path1475",
        "g5691", "path15195", "rect6359", "path15230", "rect15174", "path15319", "path15321", "path15323", "path15325", "path5687", "path5704", "path1451", "path18797",
      ],
      // These pieces run from the womb down to the vagina, so each is cut into three bands.
      uterus: cut(TALL, [0, 0, 600, 165]),
      cervix: [...cut(TALL, [0, 165, 600, 35]), "path15168-6"],
      vagina: [
        ...cut(TALL, [0, 200, 600, 200]),
        "path7009", "path7998", "path7996", "rect15433", "rect1691", "rect1740", "path1644", "path1646", "path1648", "path1659", "path1661", "path1663", "path1665", "path1667", "path1669", "path1671", "path1673", "path1675",
      ],
    },
  },
  nervous: {
    file: "TE-Nervous_system_diagram.svg",
    // The text in this picture is drawn as shapes (grey), so only the figure itself is listed.
    keep: [...n(0, 62), "n414", ...n(436, 539)],
    parts: {
      brain: n(436, 539),
      cerebellum: ["n414"],
      // One shape draws the spinal cord and the nerves together: the cord is the middle band.
      "spinal-cord": [["n12", [343, 70, 14, 355]]],
      nerves: [["n12", [343, 70, 14, 355, "out"]], "n61", "n62"],
    },
  },
};
