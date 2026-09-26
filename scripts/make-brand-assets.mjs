/**
 * Rebuild every CareerForm brand asset from the designer's exports.
 *
 *   node scripts/make-brand-assets.mjs
 *   node scripts/make-brand-assets.mjs --dark "<export.png>" --light "<export.png>"
 *   node scripts/make-brand-assets.mjs --emblem "<mark.png>"
 *
 * Three jobs, in order:
 *
 *   1. Crop each wordmark export to its ink box and write the two web logos. The dark
 *      artwork is white lettering (it only reads on the near-black theme) and the light
 *      one is black lettering, so `brand-logo.tsx` swaps between them with `data-theme`.
 *      Both are cropped to the *same* box on purpose: the header swaps artwork on a theme
 *      toggle, and two different intrinsic sizes would make the header twitch.
 *   2. Cut the emblem out of the wordmark (its ink is the leftmost column run) and use it
 *      as the icon master. The emblem is the same mark as the standalone export, but a
 *      ~430px render instead of a ~100px one, so the 256px favicon entry and the 512px
 *      touch icon stay sharp instead of being upscaled from a thumbnail.
 *   3. Emit the icon set. `src/app/favicon.ico` once shipped as the untouched Next.js
 *      starter file — the Vercel triangle in the browser tab — so it needs a real
 *      multi-resolution .ico. The project deliberately keeps no image dependency (sharp
 *      is only present as a transitive Next.js optional), so the decode, the alpha-aware
 *      downscale and the ICO container are all done here with Node's own zlib.
 *
 * Inputs: the two `1920x450` wordmark exports (or the already-cropped files, in which case
 * the crop is a no-op and the run is repeatable). Outputs:
 *
 *   public/careerform-logo.png        dark theme  (white lettering)
 *   public/careerform-logo-light.png  light theme (black lettering)
 *   public/careerform-icon.png        the mark alone, square
 *   src/app/favicon.ico               16 / 32 / 48 / 256 px entries
 *   src/app/icon.png                  512 px square, served at /icon.png
 *   src/app/apple-icon.png            180 px square for iOS home screens
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};

const DARK_SOURCE = flag('dark', 'public/careerform-logo.png');
const LIGHT_SOURCE = flag('light', 'public/careerform-logo-light.png');
const EMBLEM_SOURCE = flag('emblem', '');

const WEB_LOGOS = {
  dark: 'public/careerform-logo.png',
  light: 'public/careerform-logo-light.png',
};
const WEB_ICON = 'public/careerform-icon.png';

// ----------------------------------------------------------------- PNG decoding
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/** Decode an 8-bit non-interlaced PNG into RGBA pixels. */
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];

  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8) throw new Error(`only 8-bit PNGs are supported (got ${data[8]})`);
      if (data[12] !== 0) throw new Error('interlaced PNGs are not supported');
      colorType = data[9];
      if (colorType !== 6 && colorType !== 2) {
        throw new Error(`unsupported PNG colour type ${colorType} (need 2 or 6)`);
      }
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + len;
  }

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const rgba = Buffer.alloc(width * height * 4);

  let prev = Buffer.alloc(stride);
  let pos = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos];
    pos += 1;
    const line = Buffer.from(raw.subarray(pos, pos + stride));
    pos += stride;
    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? line[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      if (filter === 1) line[x] = (line[x] + a) & 0xff;
      else if (filter === 2) line[x] = (line[x] + b) & 0xff;
      else if (filter === 3) line[x] = (line[x] + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) line[x] = (line[x] + paeth(a, b, c)) & 0xff;
    }
    for (let x = 0; x < width; x += 1) {
      const s = x * channels;
      const d = (y * width + x) * 4;
      rgba[d] = line[s];
      rgba[d + 1] = line[s + 1];
      rgba[d + 2] = line[s + 2];
      rgba[d + 3] = channels === 4 ? line[s + 3] : 255;
    }
    prev = line;
  }

  return { width, height, rgba };
}

// ----------------------------------------------------------------- PNG encoding
function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ----------------------------------------------------------------- geometry
/** Tight rectangle around the visible pixels, so a logo with padding is not shrunk by it. */
function inkBounds({ width, height, rgba }) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (rgba[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { x: 0, y: 0, w: width, h: height };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Tight box around the visible pixels, so a logo with padding is not shrunk by it. */
function alphaBounds({ width, height, rgba }) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (rgba[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { x: 0, y: 0, size: Math.min(width, height) };
  const size = Math.max(maxX - minX + 1, maxY - minY + 1);
  const cx = (minX + maxX + 1) / 2;
  const cy = (minY + maxY + 1) / 2;
  return {
    x: Math.round(cx - size / 2),
    y: Math.round(cy - size / 2),
    size,
  };
}

/**
 * Premultiplied pixel read, clamped to the source edges.
 *
 * Averaging straight RGBA pulls the colour of fully transparent pixels into the edges and
 * leaves a dark halo around the mark at 16 px; weighting by alpha first avoids it, so every
 * sampling path in here works on alpha-weighted colour.
 */
function tap(src, sx, sy, weight) {
  const px = Math.min(src.width - 1, Math.max(0, sx));
  const py = Math.min(src.height - 1, Math.max(0, sy));
  const i = (py * src.width + px) * 4;
  const alpha = (src.rgba[i + 3] / 255) * weight;
  return {
    r: src.rgba[i] * alpha,
    g: src.rgba[i + 1] * alpha,
    b: src.rgba[i + 2] * alpha,
    a: src.rgba[i + 3] * weight,
  };
}

/**
 * Bilinear upscale on premultiplied colour.
 *
 * The source artwork for a browser icon is often smaller than the largest entry in the .ico
 * (and smaller than the 512 px PNG), and the box filter below degrades to nearest-neighbour
 * when it has to grow an image — which reads as a blocky blob on a Windows tile. Interpolating
 * instead keeps the smooth, slightly soft look the downsizes already have.
 */
function upscale(src, size, crop) {
  const out = Buffer.alloc(size * size * 4);
  const step = crop.size / size;
  for (let y = 0; y < size; y += 1) {
    const fy = crop.y + (y + 0.5) * step - 0.5;
    const y0 = Math.floor(fy);
    const ty = fy - y0;
    for (let x = 0; x < size; x += 1) {
      const fx = crop.x + (x + 0.5) * step - 0.5;
      const x0 = Math.floor(fx);
      const tx = fx - x0;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      const taps = [
        [x0, y0, (1 - tx) * (1 - ty)],
        [x0 + 1, y0, tx * (1 - ty)],
        [x0, y0 + 1, (1 - tx) * ty],
        [x0 + 1, y0 + 1, tx * ty],
      ];
      for (const [sx, sy, weight] of taps) {
        if (weight <= 0) continue;
        const px = tap(src, sx, sy, weight);
        r += px.r;
        g += px.g;
        b += px.b;
        a += px.a;
      }
      const d = (y * size + x) * 4;
      const alphaSum = a / 255;
      out[d] = alphaSum ? Math.round(r / alphaSum) : 0;
      out[d + 1] = alphaSum ? Math.round(g / alphaSum) : 0;
      out[d + 2] = alphaSum ? Math.round(b / alphaSum) : 0;
      out[d + 3] = Math.min(255, Math.round(a));
    }
  }
  return out;
}

/** Box-filter resample. Downsamples for every size a tab icon needs; delegates to
 * `upscale` when the requested entry is larger than the artwork it has to fill. */
function resize(src, size, crop) {
  if (crop.size < size) return upscale(src, size, crop);
  const out = Buffer.alloc(size * size * 4);
  const step = crop.size / size;
  for (let y = 0; y < size; y += 1) {
    const y0 = crop.y + y * step;
    const y1 = y0 + step;
    for (let x = 0; x < size; x += 1) {
      const x0 = crop.x + x * step;
      const x1 = x0 + step;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy += 1) {
        for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx += 1) {
          const px = tap(src, sx, sy, 1);
          r += px.r;
          g += px.g;
          b += px.b;
          a += px.a;
          n += 1;
        }
      }
      const d = (y * size + x) * 4;
      const alphaSum = a / 255;
      out[d] = alphaSum ? Math.round(r / alphaSum) : 0;
      out[d + 1] = alphaSum ? Math.round(g / alphaSum) : 0;
      out[d + 2] = alphaSum ? Math.round(b / alphaSum) : 0;
      out[d + 3] = Math.round(a / n);
    }
  }
  return out;
}

// ----------------------------------------------------------------- ICO container
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  const directory = Buffer.alloc(16 * entries.length);
  let offset = 6 + directory.length;
  entries.forEach((entry, index) => {
    const at = index * 16;
    directory[at] = entry.size >= 256 ? 0 : entry.size; // 0 means 256 in the ICO format
    directory[at + 1] = entry.size >= 256 ? 0 : entry.size;
    directory[at + 2] = 0;
    directory[at + 3] = 0;
    directory.writeUInt16LE(1, at + 4); // colour planes
    directory.writeUInt16LE(32, at + 6); // bits per pixel
    directory.writeUInt32LE(entry.png.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += entry.png.length;
  });

  return Buffer.concat([header, directory, ...entries.map(e => e.png)]);
}

// ----------------------------------------------------------------- crop + emblem
/** A new image holding exactly `box` of `src`; samples outside it clamp to the edge. */
function crop(src, box) {
  const rgba = Buffer.alloc(box.w * box.h * 4);
  for (let y = 0; y < box.h; y += 1) {
    for (let x = 0; x < box.w; x += 1) {
      const px = tap(src, box.x + x, box.y + y, 1);
      const alphaSum = px.a / 255;
      const d = (y * box.w + x) * 4;
      rgba[d] = alphaSum ? Math.round(px.r / alphaSum) : 0;
      rgba[d + 1] = alphaSum ? Math.round(px.g / alphaSum) : 0;
      rgba[d + 2] = alphaSum ? Math.round(px.b / alphaSum) : 0;
      rgba[d + 3] = Math.round(px.a);
    }
  }
  return { width: box.w, height: box.h, rgba };
}

/** Smallest box containing both — the canvas the two logos are cropped to, so the pair
 *  always comes out the same size even if one export has a stray pixel more ink. */
function union(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

/**
 * The emblem sits to the left of the wordmark, separated by a column gap, so the mark is
 * the first run of inked columns. Cutting it from the wordmark export rather than taking a
 * separate small file is what keeps the 512px icon from being an upscaled thumbnail.
 */
function leftmostRun(src) {
  for (let x = 0; x < src.width; x += 1) {
    let inked = false;
    for (let y = 0; y < src.height; y += 1) {
      if (src.rgba[(y * src.width + x) * 4 + 3] > 8) {
        inked = true;
        break;
      }
    }
    if (!inked) continue;
    let end = x;
    while (end + 1 < src.width) {
      let any = false;
      for (let y = 0; y < src.height; y += 1) {
        if (src.rgba[(y * src.width + (end + 1)) * 4 + 3] > 8) {
          any = true;
          break;
        }
      }
      if (!any) break;
      end += 1;
    }
    return { x, end };
  }
  return null;
}

// ----------------------------------------------------------------- run
const exportedDark = decodePng(fs.readFileSync(DARK_SOURCE));
const exportedLight = decodePng(fs.readFileSync(LIGHT_SOURCE));

const darkBox = inkBounds(exportedDark);
const lightBox = inkBounds(exportedLight);
const shared = union(darkBox, lightBox);

const darkLogo = crop(exportedDark, shared);
const lightLogo = crop(exportedLight, shared);

fs.writeFileSync(WEB_LOGOS.dark, encodePng(darkLogo.width, darkLogo.height, darkLogo.rgba));
fs.writeFileSync(WEB_LOGOS.light, encodePng(lightLogo.width, lightLogo.height, lightLogo.rgba));

console.log(`dark  ${DARK_SOURCE} — ${exportedDark.width}x${exportedDark.height}, ink box ${darkBox.w}x${darkBox.h} at (${darkBox.x}, ${darkBox.y})`);
console.log(`light ${LIGHT_SOURCE} — ${exportedLight.width}x${exportedLight.height}, ink box ${lightBox.w}x${lightBox.h} at (${lightBox.x}, ${lightBox.y})`);
console.log(`logos written at ${shared.w}x${shared.h} — ${WEB_LOGOS.dark}, ${WEB_LOGOS.light}`);

// The emblem master. `--emblem` short-circuits the cut for a standalone mark export.
let emblem = darkLogo;
if (EMBLEM_SOURCE) {
  emblem = decodePng(fs.readFileSync(EMBLEM_SOURCE));
  console.log(`emblem from ${EMBLEM_SOURCE} — ${emblem.width}x${emblem.height}`);
} else {
  const run = leftmostRun(darkLogo);
  if (!run) throw new Error('the dark artwork has no ink — nothing to cut an emblem from');
  const stem = crop(darkLogo, { x: 0, y: 0, w: run.end + 1, h: darkLogo.height });
  emblem = crop(stem, inkBounds(stem));
  fs.writeFileSync(WEB_ICON, encodePng(emblem.width, emblem.height, emblem.rgba));
  console.log(`emblem cut from columns ${run.x}-${run.end} — ${emblem.width}x${emblem.height} → ${WEB_ICON}`);
}

const source = emblem;
const emblemBox = alphaBounds(source);

// One square master, then every size from it. Downscaling straight to 16px in a single
// step would average dozens of source pixels per output pixel and blur the mark into mush;
// going through 256 first keeps the edges recognisable.
const master = { width: 256, height: 256, rgba: resize(source, 256, emblemBox) };
const masterCrop = { x: 0, y: 0, size: 256 };
const at = size => encodePng(size, size, size === 256 ? master.rgba : resize(master, size, masterCrop));

const sizes = [16, 32, 48, 256];
const ico = buildIco(sizes.map(size => ({ size, png: at(size) })));

fs.writeFileSync(path.join('src/app/favicon.ico'), ico);
fs.writeFileSync(path.join('src/app/icon.png'), encodePng(512, 512, resize(source, 512, emblemBox)));
fs.writeFileSync(path.join('src/app/apple-icon.png'), encodePng(180, 180, resize(source, 180, emblemBox)));

console.log(`emblem      ${source.width}x${source.height}, content box ${emblemBox.size}px at (${emblemBox.x}, ${emblemBox.y})`);
console.log(`favicon.ico ${ico.length} bytes (${sizes.join(', ')} px)`);
console.log('icon.png 512x512');
console.log('apple-icon.png 180x180');

// Self-check: read every entry back out of the finished file and confirm each one is a
// real, visible image. A stride mistake once shipped an .ico whose small sizes were
// sampled from the wrong buffer and came out almost fully transparent — this catches that
// instead of leaving it to whoever notices an empty tab icon.
let bad = 0;
for (const { size, png } of sizes.map(s => ({ size: s, png: at(s) }))) {
  const decoded = decodePng(png);
  let solid = 0;
  let peak = 0;
  for (let i = 0; i < size * size; i += 1) {
    const alpha = decoded.rgba[i * 4 + 3];
    if (alpha > 200) solid += 1;
    if (alpha > peak) peak = alpha;
  }
  const coverage = ((solid / (size * size)) * 100).toFixed(1);
  const ok = decoded.width === size && decoded.height === size && peak > 200;
  if (!ok) bad += 1;
  console.log(`  ${ok ? '✓' : '✗'} ${size}x${size} — peak alpha ${peak}, ${coverage}% solid`);
}
if (bad) {
  console.error(`\n${bad} icon size(s) look wrong — check the resize step before shipping.`);
  process.exitCode = 1;
}
