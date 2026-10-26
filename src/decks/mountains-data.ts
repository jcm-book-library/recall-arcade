// Peaks for the Mountains quiz: [id, name, height in metres, latitude, longitude, continent, group, other names].
// Groups: "summit" = highest on its continent, "famous" = well-known peaks and volcanoes.
// Australia/Oceania has two "highest": Kosciuszko (mainland Australia) and Puncak Jaya (New Guinea).

export type PeakRow = [string, string, number, number, number, string, "summit" | "famous", string[]];

export const PEAKS: PeakRow[] = [
  // Highest on each continent
  ["everest", "Mount Everest", 8849, 27.988, 86.925, "AS", "summit", ["Everest", "Chomolungma", "Qomolangma", "Sagarmatha"]],
  ["aconcagua", "Aconcagua", 6961, -32.653, -70.011, "SA", "summit", ["Mount Aconcagua", "Cerro Aconcagua"]],
  ["denali", "Denali", 6190, 63.069, -151.007, "NA", "summit", ["Mount McKinley", "McKinley", "Mount Denali"]],
  ["kilimanjaro", "Kilimanjaro", 5895, -3.067, 37.356, "AF", "summit", ["Mount Kilimanjaro", "Kibo", "Uhuru Peak", "Kili"]],
  ["elbrus", "Mount Elbrus", 5642, 43.35, 42.445, "EU", "summit", ["Elbrus"]],
  ["vinson", "Mount Vinson", 4892, -78.525, -85.617, "AN", "summit", ["Vinson", "Vinson Massif"]],
  ["puncakjaya", "Puncak Jaya", 4884, -4.083, 137.183, "OC", "summit", ["Carstensz Pyramid", "Carstensz", "Mount Carstensz"]],
  ["kosciuszko", "Mount Kosciuszko", 2228, -36.456, 148.264, "OC", "summit", ["Kosciuszko", "Kosciusko", "Mount Kosciusko", "Kozzie"]],

  // Famous peaks
  ["k2", "K2", 8611, 35.882, 76.513, "AS", "famous", ["Mount Godwin-Austen", "Chhogori", "K 2"]],
  ["kangchenjunga", "Kangchenjunga", 8586, 27.703, 88.148, "AS", "famous", ["Kanchenjunga", "Kangchenjanga"]],
  ["fuji", "Mount Fuji", 3776, 35.361, 138.727, "AS", "famous", ["Fuji", "Fujisan", "Fuji-san", "Fujiyama"]],
  ["ararat", "Mount Ararat", 5137, 39.702, 44.298, "AS", "famous", ["Ararat", "Agri Dagi", "Ağrı Dağı"]],
  ["kinabalu", "Mount Kinabalu", 4095, 6.075, 116.559, "AS", "famous", ["Kinabalu"]],
  ["montblanc", "Mont Blanc", 4806, 45.833, 6.865, "EU", "famous", ["Monte Bianco", "Mount Blanc"]],
  ["matterhorn", "Matterhorn", 4478, 45.976, 7.659, "EU", "famous", ["The Matterhorn", "Monte Cervino", "Cervin"]],
  ["olympus", "Mount Olympus", 2918, 40.086, 22.358, "EU", "famous", ["Olympus", "Olympos"]],
  ["vesuvius", "Mount Vesuvius", 1281, 40.821, 14.426, "EU", "famous", ["Vesuvius", "Vesuvio"]],
  ["etna", "Mount Etna", 3357, 37.751, 14.993, "EU", "famous", ["Etna"]],
  ["bennevis", "Ben Nevis", 1345, 56.797, -5.004, "EU", "famous", ["The Ben"]],
  ["mountkenya", "Mount Kenya", 5199, -0.152, 37.308, "AF", "famous", ["Kirinyaga"]],
  ["tablemountain", "Table Mountain", 1085, -33.963, 18.41, "AF", "famous", ["Hoerikwaggo"]],
  ["rainier", "Mount Rainier", 4392, 46.852, -121.76, "NA", "famous", ["Rainier", "Tahoma"]],
  ["sthelens", "Mount St. Helens", 2549, 46.191, -122.194, "NA", "famous", ["St Helens", "Mount St Helens", "Mount Saint Helens"]],
  ["whitney", "Mount Whitney", 4421, 36.579, -118.292, "NA", "famous", ["Whitney"]],
  ["logan", "Mount Logan", 5959, 60.567, -140.405, "NA", "famous", ["Logan"]],
  ["chimborazo", "Chimborazo", 6263, -1.469, -78.818, "SA", "famous", ["Mount Chimborazo"]],
  ["cotopaxi", "Cotopaxi", 5897, -0.684, -78.438, "SA", "famous", ["Mount Cotopaxi"]],
  ["aoraki", "Aoraki / Mount Cook", 3724, -43.595, 170.142, "OC", "famous", ["Aoraki", "Mount Cook", "Aoraki Mount Cook", "Mt Cook"]],
  ["uluru", "Uluru", 863, -25.344, 131.037, "OC", "famous", ["Ayers Rock"]],
  ["maunakea", "Mauna Kea", 4207, 19.821, -155.468, "OC", "famous", ["Maunakea"]],
  ["erebus", "Mount Erebus", 3794, -77.53, 167.153, "AN", "famous", ["Erebus"]],
];
