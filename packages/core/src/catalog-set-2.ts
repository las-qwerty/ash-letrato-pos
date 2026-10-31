import type { Category, Material, Product } from './types';

type Recipe = Product['consumes'];
type Row = [categoryId: string, name: string, price: number, consumes?: Recipe, area?: { unit: string; min: number }];

const Q250 = 'mat-quaff-matte-250-gsm';
const Q300 = 'mat-quaff-matte-300-gsm';
const D250 = 'mat-double-sided-250-gsm';
const D300 = 'mat-double-sided-300-gsm';
const K250 = 'mat-kodak-250-gsm';
const K300 = 'mat-kodak-300-gsm';
const F = {
  r5: 'mat-frame-5r-black',
  a4: 'mat-frame-a4-black',
  r8: 'mat-frame-8r-black',
  r8glass: 'mat-frame-8r-glass',
  r8mat: 'mat-frame-8r-black-mat',
  r11mat: 'mat-frame-11r-black-mat',
  r16mat: 'mat-frame-16x20-black-mat',
  r20mat: 'mat-frame-20x30-black-mat',
};
const use = (materialId: string, qty: number) => ({ materialId, qty });
const code = (n: number) => `INV-${String(n).padStart(3, '0')}`;

export const catalogSet2Categories: Category[] = [
  { id: 'cat-pictures', name: 'Pictures', sortOrder: 8 },
  { id: 'cat-frames', name: 'Frames', sortOrder: 9 },
  { id: 'cat-studio', name: 'Studio & Frame Packages', sortOrder: 10 },
  { id: 'cat-tarp', name: 'Tarpaulin, Stickers & Banners', sortOrder: 11 },
  { id: 'cat-binding', name: 'Binding', sortOrder: 12 },
  { id: 'cat-lamination', name: 'Lamination', sortOrder: 13 },
  { id: 'cat-bir', name: 'BIR Printing', sortOrder: 14 },
];

const photo = (n: number, id: string, name: string): Material => ({
  id, code: code(n), name, stockQty: 0, costPerUnit: 0, stockByBranch: {}, unit: 'sheet',
  minStockLevel: 100, unitsPerPack: 50, packUnit: 'pack',
});
const frame = (n: number, id: string, name: string): Material => ({
  id, code: code(n), name, stockQty: 0, costPerUnit: 0, stockByBranch: {}, unit: 'piece', minStockLevel: 10,
});

export const catalogSet2Materials: Material[] = [
  photo(40, K250, 'Kodak (250 GSM)'),
  photo(41, K300, 'Kodak (300 GSM)'),
  photo(42, Q300, 'Quaff Matte (300 GSM)'),
  photo(43, D300, 'Double Sided (300 GSM)'),
  frame(44, F.r5, '5R - Black'),
  frame(45, F.a4, 'A4 - Black'),
  frame(46, F.r8, '8R - Black'),
  frame(47, F.r8glass, '8R - Glass to Glass'),
  frame(48, F.r8mat, '8R - Black (Mat)'),
  frame(49, F.r11mat, '11R - Black (Mat)'),
  frame(50, F.r16mat, '16" x 20" - Black (Mat)'),
  frame(51, F.r20mat, '20" x 30" - Black (Mat)'),
];

const pictures: Row[] = [
  ['cat-pictures', 'Picture — 1x1', 80, [use(K250, 0.083)]],
  ['cat-pictures', 'Picture — 2x2', 80, [use(K250, 0.331)]],
  ['cat-pictures', 'Picture — Combination', 80, [use(K250, 0.248)]],
  ['cat-pictures', 'Picture — Visa & PRC', 145, [use(D250, 0.331)]],
  ['cat-pictures', 'Picture — Nametag OR Attire', 95, [use(K250, 0.331)]],
  ['cat-pictures', 'Picture — Nametag AND Attire', 110, [use(K250, 0.331)]],
  ['cat-pictures', 'Picture — ID with Sign', 85, [use(K250, 0.331)]],
  ['cat-pictures', 'Picture — Wallet Size (3 pcs)', 30, [use(K250, 0.543)]],
  ['cat-pictures', 'Picture — 3R (3 pcs)', 40, [use(K250, 0.543)]],
  ['cat-pictures', 'Picture — 4R (2 pcs)', 50, [use(K250, 0.497)]],
  ['cat-pictures', 'Picture — 5R', 60, [use(K250, 0.362)]],
  ['cat-pictures', 'Picture — 6R', 70, [use(K250, 0.497)]],
  ['cat-pictures', 'Picture — 8R', 100, [use(K250, 1)]],
  ['cat-pictures', 'Picture — A4', 100, [use(K250, 1)]],
];

const frames: Row[] = [
  ['cat-frames', 'Frame Only — 5R Black', 79, [use(F.r5, 1)]],
  ['cat-frames', 'Frame Only — A4 Black', 199, [use(F.a4, 1)]],
  ['cat-frames', 'Frame Only — 8R Black', 199, [use(F.r8, 1)]],
  ['cat-frames', 'Frame Only — 8R Glass to Glass', 289, [use(F.r8glass, 1)]],
  ['cat-frames', 'Frame Only — 8R Black (w/ matting)', 239, [use(F.r8mat, 1)]],
  ['cat-frames', 'Frame Only — 11R Black (w/ matting)', 449, [use(F.r11mat, 1)]],
  ['cat-frames', 'Frame Only — 16x20 Black (w/ matting)', 899, [use(F.r16mat, 1)]],
  ['cat-frames', 'Frame Only — 20x30 Black (w/ matting)', 999, [use(F.r20mat, 1)]],
  ['cat-frames', 'Print & Frame — 5R with Frame', 150, [use(K250, 0.362), use(F.r5, 1)]],
  ['cat-frames', 'Print & Frame — 8R with Frame', 279, [use(K250, 1), use(F.r8, 1)]],
  ['cat-frames', 'Print & Frame — 8R Glass to Glass', 389, [use(K250, 1), use(F.r8glass, 1)]],
  ['cat-frames', 'Print & Frame — 8R with Matting', 339, [use(K250, 1), use(F.r8mat, 1)]],
  ['cat-frames', 'Print & Frame — 11R with Matting', 599, [use(F.r11mat, 1)]],
  ['cat-frames', 'Print & Frame — 16x20 with Matting', 1199, [use(F.r16mat, 1)]],
  ['cat-frames', 'Print & Frame — 20x30 with Matting', 1499, [use(F.r20mat, 1)]],
];

const studio: Row[] = [
  ['cat-studio', 'Studio Photography + 5R Frame', 399, [use(K250, 0.362), use(F.r5, 1)]],
  ['cat-studio', 'Studio Photography + 8R Black Frame', 549, [use(K250, 1), use(F.r8, 1)]],
  ['cat-studio', 'Studio Photography + 8R Glass to Glass', 699, [use(K250, 1), use(F.r8glass, 1)]],
  ['cat-studio', 'Studio Photography + 8R Black with Mat', 599, [use(K250, 1), use(F.r8mat, 1)]],
  ['cat-studio', 'Studio Photography + 11R Black with Mat', 999, [use(F.r11mat, 1)]],
  ['cat-studio', 'Studio Photography + 16x20 Black with Mat', 1899, [use(F.r16mat, 1)]],
  ['cat-studio', 'Studio Photography + 20x30 Black with Mat', 2299, [use(F.r20mat, 1)]],
];

const largeFormat: Row[] = [
  ['cat-tarp', 'Tarpaulin', 25, [], { unit: 'sq ft', min: 150 }],
  ['cat-tarp', 'Sticker on Sintra Board', 1.5, [], { unit: 'sq in', min: 150 }],
  ['cat-tarp', 'Poster Sticker / Outdoor Sticker', 1, [], { unit: 'sq in', min: 150 }],
  ['cat-tarp', 'Roll-up Banner (2.5ft x 5.0ft)', 1800],
  ['cat-tarp', 'Roll-up Banner (2.75m x 6.5ft)', 2000],
];

const binding: Row[] = [
  ['cat-binding', 'Bookbind (Thesis)', 500],
  ['cat-binding', 'Bookbind (up to 250 pages)', 450],
  ['cat-binding', 'Bookbind (up to 500 pages)', 550],
  ['cat-binding', 'Ringbind (up to 99 pages)', 120],
  ['cat-binding', 'Ringbind (up to 145 pages)', 150],
  ['cat-binding', 'Ringbind (up to 200 pages)', 180],
  ['cat-binding', 'Ringbind (up to 250 pages)', 240],
];

const lamination: Row[] = [
  ['cat-lamination', 'ID Size', 30],
  ['cat-lamination', 'Big Thick', 40],
  ['cat-lamination', 'Lam Short', 60],
  ['cat-lamination', 'Lam Long', 90],
];

type BirSize = [size: string, x2: number, x3: number, x4: number];
const birBooklets = (paper: string, sizes: BirSize[]): Row[] =>
  sizes.flatMap(([size, x2, x3, x4]) =>
    ([[2, x2], [3, x3], [4, x4]] as const).map(
      ([copies, price]): Row => ['cat-bir', `BIR ${paper} — ${size} (x${copies}, min 10 booklets)`, price],
    ),
  );
const birRows: Row[] = [
  ...birBooklets('Ordinary', [
    ['1/4 Long', 1300, 1800, 2300],
    ['1/3 Size (8.5 x 4.33 in)', 1500, 2000, 2500],
    ['1/2 Short', 2800, 3300, 3800],
    ['1/2 Long', 3000, 3500, 4000],
    ['1 Whole Short', 4000, 4500, 5000],
    ['1 Whole Long', 5000, 5500, 6000],
  ]),
  ...birBooklets('Carbonless', [
    ['1/4 Long', 1800, 2300, 2800],
    ['1/3 Size (11 x 21.5 cm)', 2000, 2500, 3000],
    ['1/2 Short', 3300, 3800, 4300],
    ['1/2 Long', 3500, 4000, 4500],
    ['1 Whole Short', 4500, 5000, 5500],
    ['1 Whole Long', 5500, 6000, 6500],
  ]),
];

const rows: Row[] = [...pictures, ...frames, ...studio, ...largeFormat, ...binding, ...lamination, ...birRows];

export const catalogSet2Products: Product[] = rows.map(
  ([categoryId, name, price, consumes = [], area], i): Product => ({
    id: `p-${113 + i}`,
    sku: `SRV-${113 + i}`,
    kind: 'service',
    categoryId,
    pricing: area ? 'area' : 'fixed',
    ...(area ? { areaUnit: area.unit, minCharge: area.min } : {}),
    name,
    price,
    consumes,
    isActive: true,
  }),
);

export const catalogSet2Recipes: Record<string, Recipe> = {
  'p-106': [use(Q250, 10)],
  'p-107': [use(Q300, 10)],
  'p-108': [use(D250, 10)],
  'p-109': [use(D300, 10)],
};

export function mergeCatalogSet2(input: { categories: Category[]; materials: Material[]; products: Product[] }): {
  categories: Category[];
  materials: Material[];
  products: Product[];
} {
  const has = (xs: { id: string }[]) => new Set(xs.map((x) => x.id));
  const cats = has(input.categories);
  const mats = has(input.materials);
  const prods = has(input.products);
  const skus = new Set(input.products.map((p) => p.sku));
  return {
    categories: [...input.categories, ...catalogSet2Categories.filter((c) => !cats.has(c.id))],
    materials: [...input.materials, ...catalogSet2Materials.filter((m) => !mats.has(m.id))],
    products: [
      ...input.products.map((p): Product => {
        const recipe = catalogSet2Recipes[p.id];
        return recipe && !p.consumes?.length ? { ...p, consumes: recipe } : p;
      }),
      ...catalogSet2Products
        .filter((p) => !prods.has(p.id))
        .map((p): Product => (skus.has(p.sku) ? { ...p, sku: `${p.sku}-2` } : p)),
    ],
  };
}
