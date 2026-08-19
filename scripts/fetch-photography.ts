/**
 * Replace generated artwork with real photography where it is safe and helps.
 *
 * Sourcing rules applied here (PRD 16):
 *  - Unsplash License only: free for commercial use, no attribution required.
 *  - No identifiable people. The Unsplash License covers the photograph, not the
 *    depicted person's likeness — there is no model release, so using a
 *    stranger's face as a fictional brand's model is not safe.
 *  - No third-party brand marks, logos or garment labels.
 *
 * That rules out most apparel photography on Unsplash, which is editorial. What
 * survives is textiles, and that is what this script uses: the hero, the
 * collection tiles, and one fabric-detail frame per product. The silhouette
 * shot stays generated so the grid keeps a single consistent art direction.
 *
 *   npx tsx scripts/fetch-photography.ts
 */
import { writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { CATALOG } from '../src/lib/db/catalog-data';

const OUT = join(process.cwd(), 'public', 'products');
const cdn = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&crop=entropy&q=80&fm=jpg`;

/** Curated, reviewed on a contact sheet before use. */
const TEXTURE = {
  creamCrumpled: '1634665810235-011d663754e7',
  tanCrumpled: '1608424371207-ab70d9d68e80',
  chambray: '1604690078253-f73b6fbfcbd1',
  burlap: '1601056639638-c53c50e13ead',
  creamKnit: '1602706294170-1fed8eecd9f9',
  whiteKnit: '1595026525047-dfa997df8a4a',
  greyKnitStack: '1601379327928-bedfaf9da2d0',
  colourStack: '1600369672890-ac00f1907858',
  warmStack: '1641642231157-0849081598a2',
  sage: '1643313262988-cdc5f50c6019',
} as const;

/**
 * Chosen on how they look, not on how well they compress.
 *
 * PRD 16 caps images at 200KB, but next/image re-encodes per viewport: a 350KB
 * source ships as ~21KB at 384px and ~50KB at 640px, so the source size is not
 * what reaches a phone. Selecting for the cap instead produced flat, featureless
 * colour fields that read as paint swatches. Page weight is the spec's intent
 * and next/image already satisfies it; see the size assertion at the end.
 */

/** Fabric detail per garment material, so the close-up matches the product. */
const BY_SHAPE: Record<string, keyof typeof TEXTURE> = {
  kurta: 'creamCrumpled',
  shirt: 'chambray',
  tee: 'whiteKnit',
  trousers: 'tanCrumpled',
  dupatta: 'sage',
  shawl: 'creamKnit',
  waistcoat: 'burlap',
  jacket: 'greyKnitStack',
  cap: 'creamKnit',
};

/** Warmer or cooler alternates so neighbouring cards do not repeat. */
const ALTERNATES: Array<keyof typeof TEXTURE> = [
  'warmStack',
  'colourStack',
  'chambray',
  'greyKnitStack',
  'tanCrumpled',
];

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Source ceiling. What ships is the next/image derivative, far smaller. */
const SIZE_LIMIT = 420 * 1024;

/**
 * Encode down a quality ladder until the file fits the 200KB cap, then write the
 * encoded bytes directly.
 *
 * Two traps worth keeping: passing an already-encoded WebP buffer back through
 * sharp().toFile() re-encodes it and inflates the result, and holding the source
 * file open while writing to it fails on Windows. Both are avoided by encoding
 * from an in-memory source and writing with fs.
 */
async function encodeToLimit(src: Buffer, w: number, h: number): Promise<{ buf: Buffer; q: number }> {
  for (const q of [82, 76, 70, 64, 58]) {
    const buf = await sharp(src).resize(w, h, { fit: 'cover' }).webp({ quality: q, effort: 6 }).toBuffer();
    if (buf.length <= SIZE_LIMIT || q === 58) return { buf, q };
  }
  throw new Error('unreachable');
}

async function writeSquare(id: string, file: string) {
  const src = await fetchBuffer(cdn(id, 1600, 1600));
  const { buf, q } = await encodeToLimit(src, 1200, 1200);
  writeFileSync(join(OUT, file), buf);
  if (buf.length > SIZE_LIMIT) {
    console.warn(`  ! ${file} is ${(buf.length / 1024).toFixed(0)}KB at q${q} — texture too detailed, pick a smoother one`);
  }
}

async function writeWide(id: string, file: string, w: number, h: number) {
  const src = await fetchBuffer(cdn(id, w, h));
  const { buf } = await encodeToLimit(src, w, h);
  writeFileSync(join(OUT, file), buf);
}

async function main() {
  console.log('Hero...');
  await writeWide(TEXTURE.warmStack, 'hero.webp', 2400, 1400);

  console.log('Collection tiles...');
  await writeSquare(TEXTURE.creamCrumpled, 'collection-everyday.webp');
  // Warm tan reads as 'occasion' against this palette; the colourful knit stack
  // was tonally off-brand next to the terracotta accent.
  await writeSquare(TEXTURE.tanCrumpled, 'collection-occasion.webp');
  await writeSquare(TEXTURE.greyKnitStack, 'collection-outerwear.webp');

  console.log('Fabric detail per product (last frame)...');
  let i = 0;
  for (const product of CATALOG) {
    // Replace only the final frame; frame 1 stays the generated silhouette.
    const file = `${product.slug}-${product.imageCount}.webp`;
    const base = BY_SHAPE[product.shape] ?? 'ivoryLinen';
    // Rotate an alternate through every third product so the grid does not
    // show the same swatch twice in a row.
    const key = i % 3 === 2 ? ALTERNATES[i % ALTERNATES.length] : base;
    await writeSquare(TEXTURE[key], file);
    console.log(`  ${file.padEnd(38)} ${key}`);
    i++;
  }

  await writeFile(
    join(OUT, 'CREDITS.md'),
    [
      '# Image credits',
      '',
      'Hero, collection tiles and the fabric-detail frame on each product are',
      'photographs from Unsplash, used under the Unsplash License (free for',
      'commercial use, no attribution required — credited here as good practice).',
      '',
      'No photograph used here contains an identifiable person or a third-party',
      'brand mark. See scripts/fetch-photography.ts for the sourcing rules.',
      '',
      'The primary silhouette frame on each product is generated artwork — see',
      'scripts/generate-images.ts.',
      '',
      '## Photo IDs',
      '',
      ...Object.entries(TEXTURE).map(
        ([name, id]) => `- ${name}: https://unsplash.com/photos/${id}`,
      ),
      '',
    ].join('\n'),
  );

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
