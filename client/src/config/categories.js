// Permitted categories in v1
// Strictly non-perishable: Clothes (including sarees), Books and educational supplies, Rice and packaged essentials.
// No fresh or perishable food.

export const CATEGORIES = [
  {
    id: 'clothes',
    label: 'Clothes (including sarees)',
    description: 'Wearable apparel, warm clothing, everyday garments, and traditional attire (including sarees).',
    units: ['items', 'pairs', 'bundles'],
  },
  {
    id: 'books_educational',
    label: 'Books and educational supplies',
    description: 'Textbooks, notebooks, stationary kits, geometry boxes, and reading materials.',
    units: ['units', 'sets', 'boxes'],
  },
  {
    id: 'rice_essentials',
    label: 'Rice and packaged essentials',
    description: 'Dry grains, bagged rice, lentils, sealed pulses, edible oils, and packaged dry rations.',
    units: ['kg', 'bags', 'packets'],
  },
];

export const CATEGORY_LABELS = CATEGORIES.reduce((acc, cat) => {
  acc[cat.id] = cat.label;
  return acc;
}, {});
