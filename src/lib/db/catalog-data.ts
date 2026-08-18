/**
 * The catalogue - PRD 16.
 *
 * This file is the single source of truth for both the seed script and the
 * image generator, so a product can never exist without artwork or vice versa.
 *
 * Prices are integer paisa. PKR 4,200 is 420_000.
 */

export type GarmentShape =
  | 'kurta'
  | 'shirt'
  | 'trousers'
  | 'tee'
  | 'dupatta'
  | 'shawl'
  | 'waistcoat'
  | 'jacket'
  | 'cap';

export type SeedProduct = {
  slug: string;
  title: string;
  collection: 'everyday' | 'occasion' | 'outerwear';
  shape: GarmentShape;
  description: string;
  featured: boolean;
  priceCents: number;
  compareAtCents?: number;
  sizes?: string[];
  colours?: string[];
  /** Stock overrides keyed by variant title; everything else gets a varied default. */
  stock?: Record<string, number>;
  /** How many images to generate. Two or three per product (PRD 16). */
  imageCount: 2 | 3;
};

/** Colourway swatches - drive both the variant picker and the generated artwork. */
export const COLOURS: Record<string, { hex: string; shade: string; light: string }> = {
  Ivory: { hex: '#EDE7DC', shade: '#D6CEC0', light: '#F7F3EC' },
  Chalk: { hex: '#F2F0EB', shade: '#DCD8D0', light: '#FBFAF7' },
  Sand: { hex: '#C9B79C', shade: '#AD9B80', light: '#DDCFBB' },
  Camel: { hex: '#B08A5E', shade: '#8F6E47', light: '#C7A57C' },
  Terracotta: { hex: '#B5603F', shade: '#8F4931', light: '#C97C5C' },
  Rust: { hex: '#A24D2E', shade: '#7F3B22', light: '#BB6A4A' },
  Sage: { hex: '#8C9A86', shade: '#6F7D6A', light: '#A6B2A0' },
  Emerald: { hex: '#1F5B4A', shade: '#144134', light: '#2E7862' },
  Indigo: { hex: '#2E3A5C', shade: '#1F2842', light: '#435278' },
  Navy: { hex: '#223A5E', shade: '#162944', light: '#35527B' },
  Slate: { hex: '#4A5560', shade: '#353E47', light: '#657280' },
  Charcoal: { hex: '#3A3A38', shade: '#262625', light: '#54544F' },
  Onyx: { hex: '#22201E', shade: '#121110', light: '#3A3733' },
  Plum: { hex: '#5B2B45', shade: '#421D32', light: '#763B5C' },
};

export const CATALOG: SeedProduct[] = [
  // --- Everyday ------------------------------------------------------------
  {
    slug: 'noor-lawn-kurta',
    title: 'Noor Lawn Kurta',
    collection: 'everyday',
    shape: 'kurta',
    featured: true,
    priceCents: 420_000,
    sizes: ['S', 'M', 'L'],
    colours: ['Ivory', 'Indigo'],
    stock: { 'M / Indigo': 2 },
    imageCount: 3,
    description:
      'Single-needle stitched lawn that stays light through a Karachi afternoon. The straight cut falls just below the knee with side vents deep enough to sit cross-legged in, and the placket is finished with four shell buttons. Pre-washed twice so it will not shrink on you after the first wash.',
  },
  {
    slug: 'shalimar-cotton-shalwar',
    title: 'Shalimar Cotton Shalwar',
    collection: 'everyday',
    shape: 'trousers',
    featured: false,
    priceCents: 280_000,
    sizes: ['S', 'M', 'L', 'XL'],
    imageCount: 2,
    description:
      'A classic wide-leg shalwar in mid-weight cotton, cut generously through the thigh and tapered to a clean ankle. The waistband takes a drawstring and an internal elastic panel, so it holds without digging in. Flat-felled seams throughout mean nothing frays at the pocket bags.',
  },
  {
    slug: 'mall-road-poplin-shirt',
    title: 'Mall Road Poplin Shirt',
    collection: 'everyday',
    shape: 'shirt',
    featured: true,
    priceCents: 390_000,
    sizes: ['S', 'M', 'L'],
    colours: ['Chalk', 'Sage'],
    stock: { 'L / Sage': 0 },
    imageCount: 3,
    description:
      'Compact-yarn poplin with enough body to hold a collar roll without fusing. Cut slightly relaxed through the chest, with a two-button rounded cuff and a split yoke that lets the shoulders move. Presses flat off the line, which is the entire point of a poplin shirt.',
  },
  {
    slug: 'anarkali-everyday-tee',
    title: 'Anarkali Everyday Tee',
    collection: 'everyday',
    shape: 'tee',
    featured: false,
    priceCents: 165_000,
    sizes: ['S', 'M', 'L', 'XL'],
    imageCount: 2,
    description:
      'Heavyweight 220gsm combed cotton, tubular knit so there are no side seams to twist in the wash. The neck is ribbed and taped shoulder to shoulder, which is what stops a tee going out of shape by month three. Cut boxy, hits at the hip.',
  },
  {
    slug: 'ravi-chino-trousers',
    title: 'Ravi Chino Trousers',
    collection: 'everyday',
    shape: 'trousers',
    featured: true,
    priceCents: 460_000,
    sizes: ['M', 'L', 'XL'],
    colours: ['Sand', 'Charcoal'],
    imageCount: 3,
    description:
      'Garment-dyed cotton twill with a touch of stretch, cut straight from the knee down. Slant hand pockets, a single welt back pocket, and a curved waistband that sits flat when you sit down. Hemmed long on purpose so a tailor can finish them to your leg.',
  },
  {
    slug: 'basant-linen-kurta',
    title: 'Basant Linen Kurta',
    collection: 'everyday',
    shape: 'kurta',
    featured: true,
    priceCents: 540_000,
    compareAtCents: 680_000,
    sizes: ['S', 'M', 'L'],
    imageCount: 3,
    description:
      'European flax woven at a loose sett so air actually moves through it. The band collar is hand-finished and the hem is curved, high at the sides, which keeps it tidy untucked. Linen creases; this one creases handsomely rather than looking slept in.',
  },
  {
    slug: 'chenab-cotton-dupatta',
    title: 'Chenab Cotton Dupatta',
    collection: 'everyday',
    shape: 'dupatta',
    featured: false,
    priceCents: 190_000,
    colours: ['Ivory', 'Terracotta', 'Sage'],
    imageCount: 2,
    description:
      'Two and a half metres of fine cotton voile with a hand-rolled edge on all four sides. Light enough to drape twice over the shoulder without bulk, opaque enough to work over a plain kameez. The selvedge carries a single tonal stripe, visible only when the light catches it.',
  },

  // --- Occasion ------------------------------------------------------------
  {
    slug: 'hunza-embroidered-kurta',
    title: 'Hunza Embroidered Kurta',
    collection: 'occasion',
    shape: 'kurta',
    featured: true,
    priceCents: 890_000,
    sizes: ['S', 'M', 'L'],
    colours: ['Emerald', 'Onyx'],
    imageCount: 3,
    description:
      'Hand-embroidered placket worked in tonal silk thread, following a geometric motif borrowed from Hunza window screens. Roughly eleven hours of needlework per piece, which is why the run is small. The base cloth is a dense cotton satin that holds the stitch without puckering.',
  },
  {
    slug: 'lucknow-chikankari-shirt',
    title: 'Lucknow Chikankari Shirt',
    collection: 'occasion',
    shape: 'shirt',
    featured: false,
    priceCents: 720_000,
    sizes: ['S', 'M', 'L'],
    imageCount: 2,
    description:
      'Shadow-work chikankari across the chest and cuffs, stitched from the reverse so the pattern reads as a soft haze from the front. On white-on-white cotton mul, the traditional pairing. Wash it by hand and it will outlive most things in the wardrobe.',
  },
  {
    slug: 'jamawar-waistcoat',
    title: 'Jamawar Waistcoat',
    collection: 'occasion',
    shape: 'waistcoat',
    featured: false,
    priceCents: 980_000,
    compareAtCents: 1_250_000,
    sizes: ['M', 'L', 'XL'],
    stock: { L: 3 },
    imageCount: 3,
    description:
      'Woven jamawar front panels with a plain cotton back and an adjustable cinch strap. Five covered buttons, two welted pockets, and a full lining so it sits cleanly over a kurta. The pattern is matched across the button line, which is fussy work and worth it.',
  },
  {
    slug: 'zari-silk-dupatta',
    title: 'Zari Silk Dupatta',
    collection: 'occasion',
    shape: 'dupatta',
    featured: true,
    priceCents: 640_000,
    colours: ['Plum', 'Emerald', 'Ivory'],
    imageCount: 2,
    description:
      'Mulberry silk with a metallic zari border woven in, not applied afterwards, so there is nothing to lift or fray. Two and a quarter metres, with a weight that lets it hold a fold across the shoulder. Dry clean only, and worth the trip.',
  },
  {
    slug: 'banarsi-kameez',
    title: 'Banarsi Kameez',
    collection: 'occasion',
    shape: 'kurta',
    featured: false,
    priceCents: 1_450_000,
    sizes: ['S', 'M', 'L'],
    colours: ['Plum', 'Navy'],
    imageCount: 3,
    description:
      'Banarsi brocade with a repeating buti motif in antique gold, cut into a straight kameez with a keyhole neck. Fully lined in cotton so the brocade never sits against the skin. A formal piece: it photographs beautifully and needs almost nothing worn with it.',
  },
  {
    slug: 'darbar-sherwani-kurta',
    title: 'Darbar Sherwani Kurta',
    collection: 'occasion',
    shape: 'kurta',
    featured: true,
    priceCents: 1_890_000,
    sizes: ['M', 'L', 'XL'],
    imageCount: 3,
    description:
      'A sherwani-collar kurta in structured cotton silk, with a concealed placket and a slightly extended hem. Shoulders are lightly canvassed so the line stays sharp through a long evening. Made for weddings, and cut so it can be worn again without announcing itself.',
  },
  {
    slug: 'multani-block-print-kurta',
    title: 'Multani Block-Print Kurta',
    collection: 'occasion',
    shape: 'kurta',
    featured: false,
    priceCents: 670_000,
    sizes: ['S', 'M', 'L'],
    colours: ['Rust', 'Ivory'],
    stock: { 'S / Rust': 1 },
    imageCount: 3,
    description:
      'Hand block-printed in Multan with madder and iron-based dyes, so the colour shifts gently over years rather than fading flat. Small registration differences between panels are inherent to the process. Mid-weight cotton, straight cut, side pockets deep enough to be useful.',
  },

  // --- Outerwear -----------------------------------------------------------
  {
    slug: 'kaghan-pashmina-shawl',
    title: 'Kaghan Pashmina Shawl',
    collection: 'outerwear',
    shape: 'shawl',
    featured: true,
    priceCents: 1_240_000,
    colours: ['Camel', 'Charcoal', 'Rust'],
    stock: { Camel: 3 },
    imageCount: 3,
    description:
      'Handloom pashmina in a twill weave, two metres by one, with a knotted fringe finished by hand. Warm out of proportion to its weight, which is the whole argument for pashmina. Folds down to nothing in a bag and comes out without a crease.',
  },
  {
    slug: 'chitrali-wool-cap',
    title: 'Chitrali Wool Cap',
    collection: 'outerwear',
    shape: 'cap',
    featured: false,
    priceCents: 240_000,
    sizes: ['M', 'L'],
    imageCount: 2,
    description:
      'The traditional rolled-brim pakol, felted from undyed sheep wool in the Chitral valley. The brim unrolls to cover the ears when the temperature drops. No two are exactly the same shade because the wool is not dyed at all.',
  },
  {
    slug: 'skardu-quilted-jacket',
    title: 'Skardu Quilted Jacket',
    collection: 'outerwear',
    shape: 'jacket',
    featured: false,
    priceCents: 1_180_000,
    compareAtCents: 1_490_000,
    sizes: ['M', 'L', 'XL'],
    colours: ['Navy', 'Slate'],
    imageCount: 3,
    description:
      'Diamond-quilted cotton shell over a light wool wadding, cut to layer over a kurta without pulling at the shoulders. Two-way zip, corduroy-lined collar, and press-stud storm flap. Warm to about eight degrees on its own, colder than that with something under it.',
  },
  {
    slug: 'swat-woolen-waistcoat',
    title: 'Swat Woolen Waistcoat',
    collection: 'outerwear',
    shape: 'waistcoat',
    featured: false,
    priceCents: 760_000,
    sizes: ['M', 'L', 'XL'],
    imageCount: 2,
    description:
      'Boiled wool with a dense, closed surface that sheds a light drizzle. Cut to sit over a shirt or a kurta, with a high button stance so the chest stays covered. The back is the same wool rather than lining fabric, which makes it warmer and heavier.',
  },
  {
    slug: 'deosai-camel-overcoat',
    title: 'Deosai Camel Overcoat',
    collection: 'outerwear',
    shape: 'jacket',
    featured: false,
    priceCents: 2_150_000,
    sizes: ['M', 'L', 'XL'],
    imageCount: 3,
    description:
      'Camel hair blended with lambswool, woven into a soft coating cloth and cut long with a half belt at the back. Single-breasted, three buttons, patch pockets. Heavy enough for a northern winter and cut wide enough to wear over a waistcoat.',
  },
  {
    slug: 'nanga-gilet',
    title: 'Nanga Gilet',
    collection: 'outerwear',
    shape: 'waistcoat',
    featured: false,
    priceCents: 840_000,
    sizes: ['S', 'M', 'L'],
    colours: ['Charcoal', 'Sand'],
    imageCount: 2,
    description:
      'A sleeveless quilted layer for the weeks that are not quite coat weather. Snap front, two zipped hand pockets, and a dropped back hem. Packs into its own left pocket, which sounds like a gimmick until the first time you need it to.',
  },
  {
    slug: 'hindukush-wool-shawl',
    title: 'Hindukush Wool Shawl',
    collection: 'outerwear',
    shape: 'shawl',
    featured: false,
    priceCents: 930_000,
    compareAtCents: 1_100_000,
    colours: ['Onyx', 'Sand'],
    imageCount: 2,
    description:
      'Thick handwoven sheep wool with a herringbone structure, closer to a blanket than a scarf. Traditionally worn folded lengthways across the shoulders. It will soften over the first winter and keep softening after that.',
  },
];

/** Deterministic varied stock so the seed is reproducible run to run (PRD 16). */
export function defaultStock(sku: string): number {
  let hash = 0;
  for (let i = 0; i < sku.length; i++) hash = (hash * 31 + sku.charCodeAt(i)) >>> 0;
  return 5 + (hash % 36); // 5..40
}

export type BuiltVariant = {
  sku: string;
  title: string;
  optionValues: Record<string, string>;
  priceCents: number;
  compareAtCents: number | null;
  stock: number;
  position: number;
};

/** Expand a seed product into its variant matrix. Max two option types (PRD A7). */
export function buildVariants(product: SeedProduct): {
  optionTypes: string[];
  variants: BuiltVariant[];
} {
  const optionTypes: string[] = [];
  if (product.sizes?.length) optionTypes.push('Size');
  if (product.colours?.length) optionTypes.push('Colour');

  const sizes = product.sizes ?? [null];
  const colours = product.colours ?? [null];
  const prefix = product.slug
    .split('-')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);

  const variants: BuiltVariant[] = [];
  let position = 0;

  for (const colour of colours) {
    for (const size of sizes) {
      const parts = [size, colour].filter(Boolean) as string[];
      const title = parts.join(' / ') || 'One size';
      const optionValues: Record<string, string> = {};
      if (size) optionValues.Size = size;
      if (colour) optionValues.Colour = colour;

      const sku = `${prefix}-${(size ?? 'OS').toUpperCase()}-${(colour ?? 'NAT').slice(0, 3).toUpperCase()}`;
      variants.push({
        sku,
        title,
        optionValues,
        priceCents: product.priceCents,
        compareAtCents: product.compareAtCents ?? null,
        stock: product.stock?.[title] ?? defaultStock(sku),
        position: position++,
      });
    }
  }

  return { optionTypes, variants };
}

export function productImages(product: SeedProduct): string[] {
  return Array.from(
    { length: product.imageCount },
    (_, i) => `/products/${product.slug}-${i + 1}.webp`,
  );
}
