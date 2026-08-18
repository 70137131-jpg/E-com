/**
 * Product imagery generator.
 *
 * PRD 16 asks for real photography at 1200x1200 WebP under 200KB. This script
 * produces studio-styled vector artwork to that exact spec so the demo ships
 * complete, on-brand and offline-safe. Swapping in licensed photography is a
 * drop-in replacement: keep the filenames in `productImages()` and overwrite
 * the files in public/products/.
 *
 *   npm run images:generate
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  CATALOG,
  COLOURS,
  productImages,
  type GarmentShape,
  type SeedProduct,
} from '../src/lib/db/catalog-data';

const OUT_DIR = join(process.cwd(), 'public', 'products');
const SIZE = 1200;

const PAPER = '#F3F0EA';
const PAPER_EDGE = '#E4DFD6';
const INK = '#1C1917';

type Palette = { hex: string; shade: string; light: string };

// --------------------------------------------------------------------------
// Shared SVG furniture
// --------------------------------------------------------------------------

function defs(p: Palette, id: string): string {
  return `
  <defs>
    <radialGradient id="bg-${id}" cx="50%" cy="38%" r="78%">
      <stop offset="0%" stop-color="#FBF9F5"/>
      <stop offset="100%" stop-color="${PAPER_EDGE}"/>
    </radialGradient>
    <linearGradient id="cloth-${id}" x1="18%" y1="0%" x2="82%" y2="100%">
      <stop offset="0%" stop-color="${p.light}"/>
      <stop offset="46%" stop-color="${p.hex}"/>
      <stop offset="100%" stop-color="${p.shade}"/>
    </linearGradient>
    <linearGradient id="cloth2-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.hex}"/>
      <stop offset="100%" stop-color="${p.shade}"/>
    </linearGradient>
    <filter id="soft-${id}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="26"/>
    </filter>
    <pattern id="weave-${id}" width="9" height="9" patternUnits="userSpaceOnUse">
      <rect width="9" height="9" fill="none"/>
      <path d="M0 0 H9 M0 4.5 H9" stroke="#ffffff" stroke-opacity="0.10" stroke-width="1"/>
      <path d="M0 0 V9 M4.5 0 V9" stroke="#000000" stroke-opacity="0.06" stroke-width="1"/>
    </pattern>
  </defs>`;
}

function backdrop(id: string): string {
  return `<rect width="${SIZE}" height="${SIZE}" fill="url(#bg-${id})"/>`;
}

function groundShadow(id: string, cx = 600, cy = 1046, rx = 330, ry = 42): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${INK}" opacity="0.13" filter="url(#soft-${id})"/>`;
}

/** Overlay the weave pattern on whatever was just drawn, clipped to the shape. */
function textured(id: string, body: string): string {
  return `
  <g>
    ${body}
  </g>
  <g opacity="0.85">
    ${body.replace(/fill="url\(#cloth2?-[^)]+\)"/g, `fill="url(#weave-${id})"`)}
  </g>`;
}

function wordmark(): string {
  return `<text x="600" y="1148" text-anchor="middle" font-family="Helvetica,Arial,sans-serif"
    font-size="21" letter-spacing="7" fill="${INK}" opacity="0.32">KARAKORAM THREADS</text>`;
}

// --------------------------------------------------------------------------
// Garment silhouettes
// --------------------------------------------------------------------------

function mirror(path: string): string {
  return `<g transform="translate(1200,0) scale(-1,1)">${path}</g>`;
}

function garment(shape: GarmentShape, id: string): string {
  const cloth = `url(#cloth-${id})`;
  const cloth2 = `url(#cloth2-${id})`;
  const seam = `stroke="${INK}" stroke-opacity="0.16" stroke-width="2.5" fill="none"`;

  switch (shape) {
    case 'kurta': {
      const sleeve = `<path d="M478 300 L336 372 Q322 380 328 396 L372 494 Q378 508 394 500 L512 440 Z" fill="${cloth2}"/>`;
      return `
        ${sleeve}
        ${mirror(sleeve)}
        <path d="M470 288 Q600 268 730 288 L764 968 Q600 1000 436 968 Z" fill="${cloth}"/>
        <path d="M540 286 Q600 352 660 286" fill="${PAPER}"/>
        <path d="M536 284 Q600 356 664 284" ${seam}/>
        <rect x="588" y="332" width="24" height="182" rx="8" fill="${INK}" opacity="0.13"/>
        <circle cx="600" cy="372" r="7" fill="${INK}" opacity="0.30"/>
        <circle cx="600" cy="432" r="7" fill="${INK}" opacity="0.30"/>
        <circle cx="600" cy="492" r="7" fill="${INK}" opacity="0.30"/>
        <path d="M470 700 Q600 726 730 700" ${seam}/>
        <path d="M446 940 L452 966 M754 940 L748 966" ${seam}/>`;
    }

    case 'shirt': {
      const sleeve = `<path d="M470 306 L330 376 Q316 384 322 400 L378 534 Q384 548 400 540 L510 486 Z" fill="${cloth2}"/>`;
      return `
        ${sleeve}
        ${mirror(sleeve)}
        <path d="M466 294 Q600 274 734 294 L756 838 Q600 866 444 838 Z" fill="${cloth}"/>
        <path d="M600 300 L520 288 L482 336 L560 372 Z" fill="${cloth2}"/>
        <path d="M600 300 L680 288 L718 336 L640 372 Z" fill="${cloth2}"/>
        <path d="M600 300 L520 288 L482 336 L560 372 Z" ${seam}/>
        <path d="M600 300 L680 288 L718 336 L640 372 Z" ${seam}/>
        <rect x="590" y="360" width="20" height="440" rx="6" fill="${INK}" opacity="0.12"/>
        <circle cx="600" cy="424" r="7" fill="${INK}" opacity="0.32"/>
        <circle cx="600" cy="516" r="7" fill="${INK}" opacity="0.32"/>
        <circle cx="600" cy="608" r="7" fill="${INK}" opacity="0.32"/>
        <circle cx="600" cy="700" r="7" fill="${INK}" opacity="0.32"/>
        <path d="M444 820 Q600 848 756 820" ${seam}/>`;
    }

    case 'tee': {
      const sleeve = `<path d="M462 306 L340 366 Q326 374 332 390 L372 468 Q378 482 394 474 L496 424 Z" fill="${cloth2}"/>`;
      return `
        ${sleeve}
        ${mirror(sleeve)}
        <path d="M460 296 Q600 272 740 296 L764 818 Q600 848 436 818 Z" fill="${cloth}"/>
        <path d="M524 288 Q600 356 676 288" fill="${PAPER}"/>
        <path d="M518 286 Q600 364 682 286" ${seam}/>
        <path d="M528 296 Q600 358 672 296" stroke="${INK}" stroke-opacity="0.22" stroke-width="9" fill="none"/>
        <path d="M444 792 Q600 820 756 792" ${seam}/>`;
    }

    case 'trousers':
      return `
        <path d="M444 288 L756 288 L752 556 L448 556 Z" fill="${cloth}"/>
        <path d="M452 540 L592 540 L578 1012 Q524 1026 468 1012 Z" fill="${cloth}"/>
        <path d="M608 540 L748 540 L732 1012 Q676 1026 622 1012 Z" fill="${cloth2}"/>
        <path d="M592 540 L608 540 L600 626 Z" fill="${PAPER_EDGE}"/>
        <rect x="444" y="288" width="312" height="62" rx="10" fill="${INK}" opacity="0.10"/>
        <path d="M444 350 H756" ${seam}/>
        <path d="M520 600 L512 990 M684 600 L692 990" ${seam}/>
        <path d="M466 372 Q506 424 470 470" ${seam}/>
        <path d="M734 372 Q694 424 730 470" ${seam}/>`;

    case 'waistcoat': {
      // Armhole scoop, cut out of the body so the backdrop shows through.
      const armhole = `<path d="M462 300 Q392 424 428 560 Q470 430 512 318 Z" fill="${PAPER}"/>`;
      return `
        <path d="M462 300 Q600 276 738 300 L766 884 Q600 912 434 884 Z" fill="${cloth}"/>
        ${armhole}
        ${mirror(armhole)}
        <path d="M524 290 L600 576 L676 290 Q600 272 524 290 Z" fill="${PAPER}"/>
        <path d="M524 290 L600 576 L676 290" ${seam}/>
        <path d="M556 296 L600 452" stroke="${INK}" stroke-opacity="0.10" stroke-width="16" fill="none"/>
        <path d="M644 296 L600 452" stroke="${INK}" stroke-opacity="0.10" stroke-width="16" fill="none"/>
        <path d="M600 576 L600 890" ${seam}/>
        <circle cx="632" cy="628" r="9" fill="${INK}" opacity="0.34"/>
        <circle cx="632" cy="700" r="9" fill="${INK}" opacity="0.34"/>
        <circle cx="632" cy="772" r="9" fill="${INK}" opacity="0.34"/>
        <rect x="470" y="742" width="104" height="13" rx="6" fill="${INK}" opacity="0.16"/>
        <rect x="668" y="742" width="104" height="13" rx="6" fill="${INK}" opacity="0.16"/>`;
    }

    case 'jacket': {
      const sleeve = `<path d="M458 306 L308 380 Q290 390 298 410 L392 716 Q398 734 418 726 L536 668 Z" fill="${cloth2}"/>`;
      return `
        ${sleeve}
        ${mirror(sleeve)}
        <path d="M458 300 Q600 278 742 300 L768 906 Q600 936 432 906 Z" fill="${cloth}"/>
        <!-- Open front: a strip of shadowed lining between the two panels. -->
        <path d="M566 330 L634 330 L640 900 L560 900 Z" fill="${INK}" opacity="0.30"/>
        <!-- Lapels folded back over the chest. -->
        <path d="M600 486 L512 288 L448 322 L560 560 Z" fill="${cloth2}"/>
        <path d="M600 486 L688 288 L752 322 L640 560 Z" fill="${cloth2}"/>
        <path d="M600 486 L512 288 M600 486 L688 288" ${seam}/>
        <path d="M560 560 L560 900 M640 560 L640 900" ${seam}/>
        <rect x="452" y="660" width="118" height="15" rx="7" fill="${INK}" opacity="0.18"/>
        <rect x="630" y="660" width="118" height="15" rx="7" fill="${INK}" opacity="0.18"/>
        <rect x="444" y="742" width="312" height="34" rx="10" fill="${INK}" opacity="0.14"/>
        <path d="M432 880 Q600 910 768 880" ${seam}/>`;
    }

    case 'shawl':
    case 'dupatta': {
      const fringe = Array.from({ length: 15 }, (_, i) => {
        const x = 322 + i * 39;
        const drop = 60 + ((i * 7) % 17);
        return `<path d="M${x} ${938 - Math.abs(i - 7) * 4} l${-6 + (i % 3)} ${drop}"
          stroke="${INK}" stroke-opacity="0.30" stroke-width="4" stroke-linecap="round"/>`;
      }).join('');
      // Draped rather than flat: each band curves independently so the cloth reads soft.
      return `
        <path d="M304 262 Q600 196 896 262 Q866 330 900 386 Q600 452 300 386 Q334 330 304 262 Z" fill="${cloth2}"/>
        <path d="M300 380 Q600 446 900 380 Q872 512 906 640 Q600 706 294 640 Q328 512 300 380 Z" fill="${cloth}"/>
        <path d="M294 634 Q600 700 906 634 Q876 788 908 934 Q600 992 292 934 Q324 788 294 634 Z" fill="${cloth2}"/>
        <path d="M300 386 Q600 452 900 386" ${seam}/>
        <path d="M294 640 Q600 706 906 640" ${seam}/>
        <path d="M420 300 Q460 520 428 900" ${seam}/>
        <path d="M780 300 Q740 520 772 900" ${seam}/>
        <path d="M322 274 Q600 210 878 274" stroke="${INK}" stroke-opacity="0.22" stroke-width="7" fill="none"/>
        ${fringe}`;
    }

    case 'cap':
      return `
        <path d="M600 336 Q828 356 828 596 Q828 664 600 664 Q372 664 372 596 Q372 356 600 336 Z" fill="${cloth}"/>
        <ellipse cx="600" cy="702" rx="278" ry="104" fill="${cloth2}"/>
        <ellipse cx="600" cy="672" rx="278" ry="98" fill="${cloth}"/>
        <ellipse cx="600" cy="660" rx="212" ry="62" fill="${INK}" opacity="0.16"/>
        <path d="M400 640 Q600 590 800 640" ${seam}/>
        <path d="M600 336 Q600 480 600 620" ${seam}/>`;
  }
}

// --------------------------------------------------------------------------
// The three views
// --------------------------------------------------------------------------

function viewFront(shape: GarmentShape, p: Palette, id: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
    ${defs(p, id)}
    ${backdrop(id)}
    ${groundShadow(id)}
    ${textured(id, garment(shape, id))}
    ${wordmark()}
  </svg>`;
}

function viewDetail(p: Palette, id: string, label: string): string {
  const stitches = Array.from({ length: 22 }, (_, i) => {
    const x = 236 + i * 34;
    return `<path d="M${x} 828 h20" stroke="${INK}" stroke-opacity="0.30" stroke-width="5" stroke-linecap="round"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
    ${defs(p, id)}
    ${backdrop(id)}
    <ellipse cx="600" cy="640" rx="440" ry="380" fill="${INK}" opacity="0.12" filter="url(#soft-${id})"/>
    <rect x="180" y="180" width="840" height="840" rx="26" fill="url(#cloth-${id})"/>
    <rect x="180" y="180" width="840" height="840" rx="26" fill="url(#weave-${id})"/>
    <path d="M180 470 Q600 402 1020 470" stroke="${INK}" stroke-opacity="0.13" stroke-width="30" fill="none"/>
    <path d="M180 632 Q600 700 1020 632" stroke="#ffffff" stroke-opacity="0.16" stroke-width="24" fill="none"/>
    ${stitches}
    <rect x="700" y="248" width="230" height="112" rx="10" fill="${PAPER}" opacity="0.94"/>
    <text x="815" y="296" text-anchor="middle" font-family="Helvetica,Arial,sans-serif"
      font-size="19" letter-spacing="4" fill="${INK}" opacity="0.75">KARAKORAM</text>
    <text x="815" y="330" text-anchor="middle" font-family="Helvetica,Arial,sans-serif"
      font-size="15" letter-spacing="2" fill="${INK}" opacity="0.55">${label}</text>
    ${wordmark()}
  </svg>`;
}

function viewFolded(p: Palette, id: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
    ${defs(p, id)}
    ${backdrop(id)}
    ${groundShadow(id, 600, 900, 360, 40)}
    <g>
      <path d="M262 780 Q600 742 938 780 L938 872 Q600 916 262 872 Z" fill="url(#cloth2-${id})"/>
      <path d="M300 640 Q600 604 900 640 L900 748 Q600 790 300 748 Z" fill="url(#cloth-${id})"/>
      <path d="M338 506 Q600 472 862 506 L862 616 Q600 656 338 616 Z" fill="url(#cloth2-${id})"/>
      <path d="M376 376 Q600 344 824 376 L824 484 Q600 522 376 484 Z" fill="url(#cloth-${id})"/>
    </g>
    <g fill="url(#weave-${id})">
      <path d="M262 780 Q600 742 938 780 L938 872 Q600 916 262 872 Z"/>
      <path d="M300 640 Q600 604 900 640 L900 748 Q600 790 300 748 Z"/>
      <path d="M338 506 Q600 472 862 506 L862 616 Q600 656 338 616 Z"/>
      <path d="M376 376 Q600 344 824 376 L824 484 Q600 522 376 484 Z"/>
    </g>
    <g stroke="${INK}" stroke-opacity="0.15" stroke-width="3" fill="none">
      <path d="M262 872 Q600 916 938 872"/>
      <path d="M300 748 Q600 790 900 748"/>
      <path d="M338 616 Q600 656 862 616"/>
      <path d="M376 484 Q600 522 824 484"/>
    </g>
    ${wordmark()}
  </svg>`;
}

// --------------------------------------------------------------------------
// Marketing art
// --------------------------------------------------------------------------

function bandScene(width: number, height: number, keys: string[], heading?: string): string {
  const id = `s${keys.join('')}`.replace(/[^a-zA-Z0-9]/g, '');
  const bands = keys
    .map((key, i) => {
      const c = COLOURS[key];
      const y = height * (0.16 + i * 0.19);
      const skew = height * 0.07;
      return `<path d="M-40 ${y + skew} Q${width * 0.5} ${y - skew} ${width + 40} ${y + skew * 0.4}
        L${width + 40} ${y + height * 0.2} Q${width * 0.5} ${y + height * 0.2 - skew * 1.4} -40 ${y + height * 0.2 + skew * 0.6} Z"
        fill="${c.hex}" opacity="0.94"/>
      <path d="M-40 ${y + skew} Q${width * 0.5} ${y - skew} ${width + 40} ${y + skew * 0.4}"
        stroke="${c.shade}" stroke-width="6" fill="none" opacity="0.8"/>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <radialGradient id="bg-${id}" cx="50%" cy="30%" r="80%">
        <stop offset="0%" stop-color="#FBF9F5"/>
        <stop offset="100%" stop-color="${PAPER_EDGE}"/>
      </radialGradient>
      <pattern id="weave-${id}" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M0 0 H10 M0 5 H10" stroke="#ffffff" stroke-opacity="0.10" stroke-width="1"/>
        <path d="M0 0 V10 M5 0 V10" stroke="#000000" stroke-opacity="0.05" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg-${id})"/>
    ${bands}
    <rect width="${width}" height="${height}" fill="url(#weave-${id})" opacity="0.5"/>
    ${
      heading
        ? `<text x="${width / 2}" y="${height * 0.53}" text-anchor="middle"
            font-family="Helvetica,Arial,sans-serif" font-size="${Math.round(height * 0.1)}"
            letter-spacing="${Math.round(height * 0.012)}" fill="${INK}" opacity="0.86">${heading}</text>`
        : ''
    }
  </svg>`;
}

// --------------------------------------------------------------------------
// Runner
// --------------------------------------------------------------------------

async function toWebp(svg: string, file: string, quality = 82) {
  const buf = await sharp(Buffer.from(svg)).webp({ quality, effort: 5 }).toBuffer();
  await writeFile(join(OUT_DIR, file), buf);
  return buf.length;
}

function paletteFor(product: SeedProduct): Palette {
  const key = product.colours?.[0];
  if (key && COLOURS[key]) return COLOURS[key];
  // Products without a colour option still need a considered colourway.
  const fallback: Record<string, string> = {
    'shalimar-cotton-shalwar': 'Sand',
    'anarkali-everyday-tee': 'Charcoal',
    'basant-linen-kurta': 'Ivory',
    'lucknow-chikankari-shirt': 'Chalk',
    'jamawar-waistcoat': 'Plum',
    'darbar-sherwani-kurta': 'Onyx',
    'chitrali-wool-cap': 'Sand',
    'swat-woolen-waistcoat': 'Slate',
    'deosai-camel-overcoat': 'Camel',
  };
  return COLOURS[fallback[product.slug] ?? 'Sand'];
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  let total = 0;
  let largest = 0;

  for (const product of CATALOG) {
    const palette = paletteFor(product);
    const files = productImages(product);
    const id = product.slug.replace(/[^a-z0-9]/g, '');
    const label = product.collection.toUpperCase();

    const views = [
      viewFront(product.shape, palette, `${id}a`),
      viewDetail(palette, `${id}b`, label),
      viewFolded(palette, `${id}c`),
    ];

    for (let i = 0; i < files.length; i++) {
      const bytes = await toWebp(views[i], files[i].replace('/products/', ''));
      total += bytes;
      largest = Math.max(largest, bytes);
    }
    console.log(`  ${product.slug}  ${files.length} images`);
  }

  // Collection tiles, hero, OG and the cart-line placeholder.
  await toWebp(bandScene(1200, 1200, ['Ivory', 'Sage', 'Sand', 'Indigo'], 'EVERYDAY'), 'collection-everyday.webp');
  await toWebp(bandScene(1200, 1200, ['Plum', 'Emerald', 'Camel', 'Onyx'], 'OCCASION'), 'collection-occasion.webp');
  await toWebp(bandScene(1200, 1200, ['Camel', 'Charcoal', 'Slate', 'Rust'], 'OUTERWEAR'), 'collection-outerwear.webp');
  await toWebp(bandScene(2400, 1400, ['Sand', 'Terracotta', 'Emerald', 'Indigo', 'Onyx']), 'hero.webp', 80);
  await toWebp(bandScene(600, 600, ['Sand', 'Camel']), 'placeholder.webp');

  const og = await sharp(Buffer.from(bandScene(1200, 630, ['Sand', 'Terracotta', 'Indigo'], 'KARAKORAM THREADS')))
    .png()
    .toBuffer();
  await writeFile(join(process.cwd(), 'public', 'og.png'), og);

  const icon = await sharp(
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <rect width="512" height="512" rx="96" fill="#1C1917"/>
      <path d="M150 132 L150 380 M150 262 L330 132 M226 200 L346 380" stroke="#F3F0EA" stroke-width="42"
        stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`),
  )
    .png()
    .toBuffer();
  await writeFile(join(process.cwd(), 'public', 'icon.png'), icon);
  await sharp(icon).resize(180, 180).png().toFile(join(process.cwd(), 'public', 'apple-icon.png'));

  console.log(
    `\nGenerated ${CATALOG.length} products. Largest product image: ${(largest / 1024).toFixed(0)}KB, total ${(total / 1024 / 1024).toFixed(1)}MB`,
  );
  if (largest > 200 * 1024) {
    console.warn('WARNING: an image exceeds the 200KB budget in PRD 16.');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
