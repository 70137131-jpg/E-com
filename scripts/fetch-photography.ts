/**
 * Photograph every frame in the catalogue.
 *
 * This replaces the earlier split where frame 1 was generated silhouette artwork
 * and only the last frame was a photograph. The storefront now ships real
 * photography end to end: garment shot, fabric detail, styled frame.
 *
 * Sourcing rules applied here (PRD 16) — do not relax them:
 *  - Unsplash License only: free for commercial use, no attribution required.
 *  - No identifiable people. The licence covers the photograph, not the depicted
 *    person's likeness; there is no model release, so a stranger's face cannot
 *    model for a fictional brand. Every frame below is garment-only.
 *  - No third-party brand marks, logos or garment labels.
 *
 * Every id in GARMENT and DETAIL was reviewed on a contact sheet before it was
 * added. Candidates rejected on review are listed in CREDITS.md so the next pass
 * does not re-litigate them.
 *
 * `FRAMES` is exhaustive over CATALOG and is asserted to be, so a new product
 * cannot ship with a missing or stale photograph.
 *
 *   npx tsx scripts/fetch-photography.ts
 *
 * Note this overwrites everything scripts/generate-images.ts writes. Photography
 * is the source of truth for /public/products; the generator is kept only as the
 * artwork fallback and running it after this script reverts the storefront to
 * silhouettes.
 */
import { writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { CATALOG } from '../src/lib/db/catalog-data';

const OUT = join(process.cwd(), 'public', 'products');
const cdn = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&crop=entropy&q=80&fm=jpg`;

/**
 * Garment frames — a single piece, or a small rail of pieces, on a plain ground.
 * These carry the product grid, so they are chosen for consistent light and a
 * neutral background rather than for literal accuracy to a Pakistani silhouette,
 * which stock does not have without a model wearing it.
 */
const GARMENT = {
  linenMandarin: '1713881587420-113c1c43e28a', // cream mandarin-collar linen, warm wall
  linenCream: '1713881676551-b16f22ce4719', // cream linen top on hanger
  linenBlue: '1713881842156-3d9ef36418cc', // pale indigo linen shirt
  linenTee: '1693443688057-85f57b872a3c', // grey linen v-neck
  whiteShirtHanger: '1604506847073-4a8e18e07d92', // white shirt, wooden hanger
  whiteRail: '1605450081927-6b40c11c661f', // rail of white and cream shirts
  airyWhites: '1490481651871-ab68de25d43d', // white garments, airy room
  blushOnRail: '1666358065297-18e26b09887b', // single blush top, white ground
  twoOnRail: '1666358061695-14d15f16376f', // charcoal and blush tops, white ground
  blackTop: '1519554318711-aaf73ece6ff9', // black top on hanger, white wall
  blazerRow: '1740710370552-a49b5b01f80a', // row of linen blazers, studio white
  navyBlazers: '1740710748146-a15d840d6f40', // two navy linen blazers
  camelCoat: '1604882767135-b41fac508fff', // camel coat on a rail
  beigeKnits: '1655252205431-5d0ef316837b', // beige knits, wooden hangers
  rustKnits: '1603400521630-9f2de124b33b', // cream and rust knits on a rail
  darkTrousers: '1718252540511-e958742e4165', // trousers folded flat, white floor
  foldedChinos: '1589226849736-8d0e0c78e869', // folded twill on wood
  foldedShirtsDark: '1548768041-2fceab4c0b85', // folded shirts, dark ground
  knitStack: '1731401545002-db7dd5e3162b', // stack of knitted sweaters
  knitCap: '1576529598261-96e376f6aabb', // cable-knit bobble cap, white ground
  scarvesFolded: '1638256049277-d405173a560b', // folded scarves with fringe
  linenFringe: '1591625591034-75d303d2e1a4', // folded cream linen, fringed edge
  silkLilac: '1627052045672-be78a58fcd37', // lilac silk, soft folds
} as const;

/** Fabric and styled frames. Reused freely — these are never the grid thumbnail. */
const DETAIL = {
  linenBench: '1596433904500-97b901c5d274', // folded linens on a bench
  linenSage: '1596433904747-e8b061219a71', // sage and white linen
  linenCrate: '1596433904493-c7ae3d6d179f', // folded linen on a wooden crate
  linenPile: '1524404794194-16bae22718c0', // pile of soft cloth
  pastelStack: '1545042746-ec9e5a59b359', // pastel folded linen
  embroidery: '1680034976848-d9fe95466aba', // hand embroidery on cream
  whitework: '1745091946873-92e0a0a7819c', // raised white-on-white floral
  silkEmerald: '1527167598984-8802d8028eea', // emerald silk
  silkPlum: '1629197520669-0210d6b270d9', // deep plum, soft sheen
  velvetRose: '1591957974074-68daffbf8df8', // rose and copper crushed velvet
  brocadeRed: '1786282574955-cba959404d1a', // embossed floral velvet
  blackWeave: '1551381912-4e2e29c7fd17', // black textured weave on white
  rustKnit: '1543334270-a1c233b25539', // rust knit, close
  camelFolds: '1634120455427-d4db69777fdc', // camel wool, soft folds
  creamKnitRoll: '1602706294170-1fed8eecd9f9', // cream knit beside a camel roll
  waffleKnit: '1633175118641-6001540f5dc7', // beige waffle knit
  ribbedTaupe: '1607122573683-dc40afbcb70c', // taupe ribbing
  charcoalCable: '1742113041820-ba5b9da08f9a', // charcoal cable knit
  sageKnit: '1597954222003-0ce9cfa08494', // sage-grey knit
  ivoryWoven: '1716110260836-b9827c6afc57', // ivory plain weave
  mustardCable: '1737061538920-0d747a1d2eaf', // mustard cable knit
} as const;

type Id = (typeof GARMENT)[keyof typeof GARMENT] | (typeof DETAIL)[keyof typeof DETAIL];

/**
 * Frame 1 is unique per product — it is the grid thumbnail, and a repeat there
 * reads as a broken catalogue. Frames 2 and 3 repeat where the material matches.
 */
const FRAMES: Record<string, Id[]> = {
  // --- Everyday ------------------------------------------------------------
  'noor-lawn-kurta': [GARMENT.linenMandarin, DETAIL.linenBench, GARMENT.linenBlue],
  'shalimar-cotton-shalwar': [GARMENT.darkTrousers, DETAIL.linenPile],
  'mall-road-poplin-shirt': [GARMENT.whiteShirtHanger, DETAIL.linenSage, GARMENT.whiteRail],
  'anarkali-everyday-tee': [GARMENT.linenTee, DETAIL.linenBench],
  'ravi-chino-trousers': [GARMENT.foldedChinos, DETAIL.ribbedTaupe, DETAIL.linenPile],
  'basant-linen-kurta': [GARMENT.linenCream, DETAIL.linenCrate, GARMENT.linenFringe],
  'chenab-cotton-dupatta': [GARMENT.scarvesFolded, DETAIL.pastelStack],

  // --- Occasion ------------------------------------------------------------
  'hunza-embroidered-kurta': [GARMENT.blackTop, DETAIL.embroidery, DETAIL.silkEmerald],
  'lucknow-chikankari-shirt': [GARMENT.airyWhites, DETAIL.whitework],
  'jamawar-waistcoat': [GARMENT.blazerRow, DETAIL.brocadeRed, GARMENT.foldedShirtsDark],
  'zari-silk-dupatta': [GARMENT.silkLilac, DETAIL.silkEmerald],
  'banarsi-kameez': [GARMENT.blushOnRail, DETAIL.silkPlum, DETAIL.velvetRose],
  'darbar-sherwani-kurta': [GARMENT.navyBlazers, DETAIL.blackWeave, DETAIL.charcoalCable],
  'multani-block-print-kurta': [GARMENT.rustKnits, DETAIL.camelFolds, DETAIL.rustKnit],

  // --- Outerwear -----------------------------------------------------------
  'kaghan-pashmina-shawl': [GARMENT.knitStack, DETAIL.creamKnitRoll, DETAIL.rustKnit],
  'chitrali-wool-cap': [GARMENT.knitCap, DETAIL.mustardCable],
  'skardu-quilted-jacket': [GARMENT.beigeKnits, DETAIL.sageKnit, DETAIL.ivoryWoven],
  'swat-woolen-waistcoat': [GARMENT.foldedShirtsDark, DETAIL.waffleKnit],
  'deosai-camel-overcoat': [GARMENT.camelCoat, DETAIL.creamKnitRoll, DETAIL.camelFolds],
  'nanga-gilet': [GARMENT.twoOnRail, DETAIL.blackWeave],
  'hindukush-wool-shawl': [GARMENT.linenFringe, DETAIL.charcoalCable],
};

/** Hero and collection tiles. */
const SCENE = {
  // Wide crops, so these are chosen on how the 2400x1400 entropy crop lands, not
  // on the thumbnail. A close-up source zooms in and loses the subject.
  hero: '1558769132-cb1aea458c5e', // neutral rail, dried grasses, warm light
  everyday: '1605450081927-6b40c11c661f', // rail of white and cream shirts
  occasion: '1680034976848-d9fe95466aba', // hand embroidery on cream
  outerwear: '1634120455427-d4db69777fdc', // camel wool, soft folds
} as const;

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Source ceiling. What ships is the next/image derivative, far smaller. */
const SIZE_LIMIT = 420 * 1024;

/**
 * Encode down a quality ladder until the file fits, then write the encoded bytes
 * directly.
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

async function write(id: string, file: string, w: number, h: number) {
  const src = await fetchBuffer(cdn(id, Math.round(w * 1.35), Math.round(h * 1.35)));
  const { buf, q } = await encodeToLimit(src, w, h);
  writeFileSync(join(OUT, file), buf);
  if (buf.length > SIZE_LIMIT) {
    console.warn(`  ! ${file} is ${(buf.length / 1024).toFixed(0)}KB at q${q} — too detailed, pick another`);
  }
}

/** A product without frames, or frames without a product, is a bug — not a warning. */
function assertFramesMatchCatalogue() {
  const problems: string[] = [];
  for (const product of CATALOG) {
    const frames = FRAMES[product.slug];
    if (!frames) problems.push(`${product.slug}: no frames`);
    else if (frames.length !== product.imageCount) {
      problems.push(`${product.slug}: ${frames.length} frames, imageCount is ${product.imageCount}`);
    } else if (new Set(frames).size !== frames.length) {
      problems.push(`${product.slug}: the same photograph twice`);
    }
  }
  const slugs = new Set(CATALOG.map((p) => p.slug));
  for (const slug of Object.keys(FRAMES)) {
    if (!slugs.has(slug)) problems.push(`${slug}: in FRAMES but not in CATALOG`);
  }

  const firsts = CATALOG.map((p) => FRAMES[p.slug]?.[0]).filter(Boolean);
  if (new Set(firsts).size !== firsts.length) {
    problems.push('two products share a frame-1 photograph — the grid would show a duplicate');
  }

  if (problems.length) throw new Error(`FRAMES is out of step with CATALOG:\n  ${problems.join('\n  ')}`);
}

async function main() {
  assertFramesMatchCatalogue();

  console.log('Hero and collection tiles...');
  await write(SCENE.hero, 'hero.webp', 2400, 1400);
  await write(SCENE.everyday, 'collection-everyday.webp', 1200, 1200);
  await write(SCENE.occasion, 'collection-occasion.webp', 1200, 1200);
  await write(SCENE.outerwear, 'collection-outerwear.webp', 1200, 1200);

  console.log('\nProduct frames...');
  for (const product of CATALOG) {
    const frames = FRAMES[product.slug];
    for (const [i, id] of frames.entries()) {
      const file = `${product.slug}-${i + 1}.webp`;
      await write(id, file, 1200, 1200);
      console.log(`  ${file}`);
    }
  }

  const used = [
    ...new Set<string>([...Object.values(FRAMES).flat(), ...Object.values(SCENE)]),
  ].sort();
  await writeFile(
    join(OUT, 'CREDITS.md'),
    [
      '# Image credits',
      '',
      'Every image in this directory is a photograph from Unsplash, used under the',
      'Unsplash License (free for commercial use, no attribution required —',
      'credited here as good practice).',
      '',
      'No photograph used here contains an identifiable person or a third-party',
      'brand mark. See scripts/fetch-photography.ts for the sourcing rules and for',
      'which frame each id fills.',
      '',
      '## Photo IDs',
      '',
      ...used.map((id) => `- https://unsplash.com/photos/${id}`),
      '',
      '## Rejected on review',
      '',
      'Recorded so the next pass does not re-litigate them:',
      '',
      '- Editorial apparel shots with a visible model — no model release (PRD 16).',
      '- Garment close-ups showing a woven brand label.',
      '- Market and bazaar stalls: colourful, but they read as someone else‘s shop.',
      '- Empty hangers and empty rails: no product in frame.',
      '',
    ].join('\n'),
  );

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
