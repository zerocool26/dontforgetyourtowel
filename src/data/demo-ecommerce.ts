export type DemoProductVariant = {
  id: string;
  label: string;
  swatch?: string;
};

export type DemoProduct = {
  id: string;
  name: string;
  brand: string;
  description: string;
  bullets: string[];
  specs?: Record<string, string>;
  priceCents: number;
  compareAtCents?: number;
  rating: number; // 0-5
  reviewCount: number;
  tags: string[];
  images: string[];
  colors: DemoProductVariant[];
  sizes: DemoProductVariant[];
  inventory?: number;
  featured?: boolean;
};

const photo = (id: string, params = 'auto=format&fit=crop&w=1200&q=82') =>
  `https://images.unsplash.com/${id}?${params}`;

export const demoProducts: DemoProduct[] = [
  {
    id: 'aurora-hoodie',
    name: 'Aurora Knit Hoodie',
    brand: 'Northline Outfitters',
    description:
      'A soft structured hoodie built for work-from-anywhere days, weekend errands, and cold Chicago commutes.',
    bullets: [
      'Midweight knit with brushed interior',
      'Hidden phone pocket and reinforced cuffs',
      'Ships free with marketplace bundle orders',
    ],
    specs: {
      Material: 'Cotton-poly knit',
      Fit: 'Relaxed',
      Care: 'Machine wash cold',
      Department: 'Apparel',
    },
    priceCents: 7900,
    compareAtCents: 10900,
    rating: 4.8,
    reviewCount: 412,
    tags: ['apparel', 'featured', 'new', 'deal'],
    images: [
      photo('photo-1556821840-3a63f95609a7'),
      photo('photo-1523398002811-999ca8dec234'),
      photo('photo-1515886657613-9f3515b0c78f'),
    ],
    colors: [
      { id: 'obsidian', label: 'Obsidian', swatch: '#111827' },
      { id: 'stone', label: 'Stone', swatch: '#c9c2b8' },
      { id: 'forest', label: 'Forest', swatch: '#214234' },
    ],
    sizes: [
      { id: 'xs', label: 'XS' },
      { id: 's', label: 'S' },
      { id: 'm', label: 'M' },
      { id: 'l', label: 'L' },
      { id: 'xl', label: 'XL' },
    ],
    inventory: 42,
    featured: true,
  },
  {
    id: 'spectral-sneaker',
    name: 'Spectral Runner',
    brand: 'Avenue Athletic',
    description:
      'A lightweight city runner with a stable heel, breathable upper, and enough polish for casual office days.',
    bullets: [
      'Responsive foam midsole',
      'Breathable upper and stability collar',
      'Grip pattern tuned for pavement and transit platforms',
    ],
    specs: {
      Upper: 'Engineered mesh',
      Sole: 'Responsive foam',
      Drop: '8mm',
      Department: 'Footwear',
    },
    priceCents: 12900,
    compareAtCents: 15900,
    rating: 4.7,
    reviewCount: 268,
    tags: ['footwear', 'featured', 'deal'],
    images: [
      photo('photo-1542291026-7eec264c27ff'),
      photo('photo-1460353581641-37baddab0fa2'),
      photo('photo-1491553895911-0055eca6402d'),
    ],
    colors: [
      { id: 'void', label: 'Void', swatch: '#0f172a' },
      { id: 'cloud', label: 'Cloud', swatch: '#e2e8f0' },
      { id: 'electric', label: 'Electric', swatch: '#3b82f6' },
    ],
    sizes: [
      { id: '8', label: '8' },
      { id: '9', label: '9' },
      { id: '10', label: '10' },
      { id: '11', label: '11' },
      { id: '12', label: '12' },
    ],
    inventory: 18,
    featured: true,
  },
  {
    id: 'prism-bag',
    name: 'Prism Commuter Tote',
    brand: 'Field & Home',
    description:
      'A structured tote with laptop storage, grocery strength, and a clean profile for office-to-market days.',
    bullets: [
      'Padded 14-inch laptop sleeve',
      'Water-resistant recycled canvas',
      'Interior bottle loop and key clip',
    ],
    specs: {
      Capacity: '18L',
      Closure: 'Magnetic',
      Finish: 'Water-resistant',
      Department: 'Accessories',
    },
    priceCents: 6800,
    compareAtCents: 8900,
    rating: 4.6,
    reviewCount: 153,
    tags: ['accessories', 'work', 'marketplace'],
    images: [
      photo('photo-1590874103328-eac38a683ce7'),
      photo('photo-1542291026-7eec264c27ff', 'auto=format&fit=crop&w=900&q=80'),
      photo('photo-1524758631624-e2822e304c36'),
    ],
    colors: [
      { id: 'midnight', label: 'Midnight', swatch: '#0b1220' },
      { id: 'canvas', label: 'Canvas', swatch: '#cbbf9f' },
    ],
    sizes: [{ id: 'one', label: 'One size' }],
    inventory: 66,
  },
  {
    id: 'lumen-mug',
    name: 'Lumen Ceramic Mug Set',
    brand: 'Table Supply Co.',
    description:
      'Four balanced ceramic mugs with a comfortable handle, stackable profile, and heat-retention glaze.',
    bullets: ['Set of four', 'Dishwasher safe', 'Gift-ready retail packaging'],
    specs: {
      Material: 'Ceramic',
      Finish: 'Heat-retention glaze',
      Care: 'Dishwasher safe',
      Department: 'Home',
    },
    priceCents: 3600,
    compareAtCents: 4800,
    rating: 4.9,
    reviewCount: 811,
    tags: ['home', 'bulk', 'gift'],
    images: [
      photo('photo-1514228742587-6b1558fcf93a'),
      photo('photo-1495474472287-4d71bcdd2085'),
      photo('photo-1485808191679-5f86510681a2'),
    ],
    colors: [
      { id: 'cream', label: 'Cream', swatch: '#f8fafc' },
      { id: 'graphite', label: 'Graphite', swatch: '#1f2937' },
      { id: 'cobalt', label: 'Cobalt', swatch: '#1d4ed8' },
    ],
    sizes: [
      { id: '12oz', label: '12oz' },
      { id: '16oz', label: '16oz' },
    ],
    inventory: 120,
  },
  {
    id: 'nova-headphones',
    name: 'Nova Noise-Canceling Headphones',
    brand: 'SignalWorks',
    description:
      'Wireless over-ear headphones with strong noise canceling, multipoint pairing, and a long-haul battery.',
    bullets: [
      'Up to 42 hours battery life',
      'Multipoint Bluetooth pairing',
      'Hard case included',
    ],
    specs: {
      Battery: '42 hours',
      Connection: 'Bluetooth multipoint',
      Warranty: '2 years',
      Department: 'Electronics',
    },
    priceCents: 17900,
    compareAtCents: 22900,
    rating: 4.7,
    reviewCount: 1294,
    tags: ['electronics', 'featured', 'work', 'deal'],
    images: [
      photo('photo-1505740420928-5e560c06d30e'),
      photo('photo-1546435770-a3e426bf472b'),
      photo('photo-1484704849700-f032a568e944'),
    ],
    colors: [
      { id: 'black', label: 'Black', swatch: '#0f1115' },
      { id: 'sand', label: 'Sand', swatch: '#d8c7a3' },
    ],
    sizes: [{ id: 'one', label: 'One size' }],
    inventory: 31,
    featured: true,
  },
  {
    id: 'atlas-camera',
    name: 'Atlas Mirrorless Camera Kit',
    brand: 'Framehouse',
    description:
      'A compact creator kit with a sharp mirrorless body, travel lens, strap, and starter memory card.',
    bullets: [
      '24MP sensor with fast autofocus',
      'Includes 18-55mm travel lens',
      'Creator kit ships with card and strap',
    ],
    specs: {
      Sensor: '24MP APS-C',
      Lens: '18-55mm kit',
      Video: '4K 30fps',
      Department: 'Electronics',
    },
    priceCents: 64900,
    compareAtCents: 74900,
    rating: 4.6,
    reviewCount: 582,
    tags: ['electronics', 'creator', 'marketplace'],
    images: [
      photo('photo-1516035069371-29a1b244cc32'),
      photo('photo-1502920917128-1aa500764cbd'),
      photo('photo-1512790182412-b19e6d62bc39'),
    ],
    colors: [
      { id: 'black', label: 'Black', swatch: '#111827' },
      { id: 'silver', label: 'Silver', swatch: '#cbd5e1' },
    ],
    sizes: [{ id: 'kit', label: 'Kit' }],
    inventory: 11,
  },
  {
    id: 'harbor-sofa',
    name: 'Harbor Modular Sofa',
    brand: 'Roomline',
    description:
      'A three-seat modular sofa with washable covers, deep cushions, and delivery scheduling built for apartments.',
    bullets: [
      'Configurable left or right chaise',
      'Washable performance fabric',
      'White-glove delivery available',
    ],
    specs: {
      Width: '86 inches',
      Fabric: 'Performance weave',
      Assembly: 'Tool-free modules',
      Department: 'Furniture',
    },
    priceCents: 119900,
    compareAtCents: 139900,
    rating: 4.5,
    reviewCount: 347,
    tags: ['home', 'furniture', 'delivery'],
    images: [
      photo('photo-1555041469-a586c61ea9bc'),
      photo('photo-1493663284031-b7e3aefcae8e'),
      photo('photo-1484101403633-562f891dc89a'),
    ],
    colors: [
      { id: 'oat', label: 'Oat', swatch: '#d8cbb8' },
      { id: 'charcoal', label: 'Charcoal', swatch: '#343a40' },
      { id: 'moss', label: 'Moss', swatch: '#546a50' },
    ],
    sizes: [
      { id: 'left', label: 'Left chaise' },
      { id: 'right', label: 'Right chaise' },
    ],
    inventory: 7,
  },
  {
    id: 'pantry-coffee',
    name: 'Riverside Coffee Bulk Pack',
    brand: 'Pantry District',
    description:
      'A warehouse-style six-bag pack of medium roast whole bean coffee for offices, families, and repeat buyers.',
    bullets: [
      'Six 12oz bags',
      'Roasted in small batches',
      'Subscribe-and-save eligible',
    ],
    specs: {
      Roast: 'Medium',
      Pack: '6 x 12oz',
      Grind: 'Whole bean',
      Department: 'Pantry',
    },
    priceCents: 7200,
    compareAtCents: 8400,
    rating: 4.8,
    reviewCount: 963,
    tags: ['pantry', 'bulk', 'subscription', 'deal'],
    images: [
      photo('photo-1447933601403-0c6688de566e'),
      photo('photo-1459755486867-b55449bb39ff'),
      photo('photo-1514432324607-a09d9b4aefdd'),
    ],
    colors: [{ id: 'medium', label: 'Medium roast', swatch: '#7c4a2d' }],
    sizes: [
      { id: 'six', label: '6 pack' },
      { id: 'twelve', label: '12 pack' },
    ],
    inventory: 88,
  },
];
