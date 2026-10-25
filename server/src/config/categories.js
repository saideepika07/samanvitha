// Permitted Non-Perishable Categories and Allowed Units
const CATEGORIES = [
  {
    id: 'clothes',
    label: 'Clothes (including sarees)',
    description: 'Wearable apparel, warm clothing, everyday garments, and traditional attire (including sarees).',
    units: ['items', 'pairs', 'bundles'],
  },
  {
    id: 'books_educational',
    label: 'Books and educational supplies',
    description: 'Textbooks, notebooks, stationery kits, geometry boxes, and reading materials.',
    units: ['units', 'sets', 'boxes'],
  },
  {
    id: 'rice_essentials',
    label: 'Rice and packaged essentials',
    description: 'Dry grains, bagged rice, lentils, sealed pulses, edible oils, and packaged dry rations.',
    units: ['kg', 'bags', 'packets'],
  },
];

const CATEGORY_LABELS = CATEGORIES.map((c) => c.label);

const ALLOWED_UNITS = CATEGORIES.reduce((acc, cat) => {
  acc[cat.label] = cat.units;
  return acc;
}, {});

module.exports = {
  CATEGORIES,
  CATEGORY_LABELS,
  ALLOWED_UNITS,
};
