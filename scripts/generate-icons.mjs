// Generates the PWA icons referenced by public/manifest.json.
//
// Written as a pure-Node PNG encoder so the icons can be regenerated anywhere
// without ImageMagick, Sharp or PIL. Output is deterministic: re-running this
// produces byte-identical files, so it never churns the repo.
//
//   node scripts/generate-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Theme colors, kept in step with public/manifest.json.
const BG = [0x02, 0x0b, 0x14];
const CYAN = [0x00, 0xd4, 0xff];

/* ── PNG encoding ── */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** Encode an RGBA pixel buffer as a PNG. */
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Each scanline is prefixed with its filter byte (0 = None).
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ── Drawing ── */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Antialiased coverage for a filled disc of radius `r`, given distance `d`. */
const disc = (d, r, edge) => clamp01((r - d) / edge + 0.5);

/** Antialiased coverage for a ring centred on `r` with half-thickness `half`. */
const ring = (d, r, half, edge) => clamp01((half - Math.abs(d - r)) / edge + 0.5);

/** Draw the arc-reactor mark at a given size and return an RGBA buffer. */
function render(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const c = (size - 1) / 2;
  const edge = size / 128; // antialiasing width, scales with the icon

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c);

      let [r, g, b] = BG;
      const blend = (color, a) => {
        if (a <= 0) return;
        const k = clamp01(a);
        r = r * (1 - k) + color[0] * k;
        g = g * (1 - k) + color[1] * k;
        b = b * (1 - k) + color[2] * k;
      };

      // Soft glow behind the core.
      const glow = Math.pow(clamp01(1 - d / (size * 0.36)), 2.2);
      blend(CYAN, glow * 0.32);

      // Outer ring, inner ring, then the solid core.
      blend(CYAN, ring(d, size * 0.4, size * 0.021, edge));
      blend(CYAN, ring(d, size * 0.285, size * 0.013, edge) * 0.75);
      blend(CYAN, disc(d, size * 0.15, edge));

      const i = (y * size + x) * 4;
      rgba[i] = Math.round(r);
      rgba[i + 1] = Math.round(g);
      rgba[i + 2] = Math.round(b);
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

mkdirSync(join(ROOT, "public"), { recursive: true });
for (const size of [192, 512]) {
  const out = join(ROOT, "public", `icon-${size}.png`);
  writeFileSync(out, encodePng(size, size, render(size)));
  console.log(`  wrote public/icon-${size}.png`);
}
