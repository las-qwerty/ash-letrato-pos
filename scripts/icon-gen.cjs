// Minimal PNG decode/encode for icon generation — no dependencies.
const zlib = require('zlib');
const fs = require('fs');

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function decodePng(buf) {
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const bitDepth = buf[24], colorType = buf[25];
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2))
    throw new Error(`unsupported png: depth ${bitDepth} type ${colorType}`);
  const bpp = colorType === 6 ? 4 : 3;
  let idat = [];
  let p = 8;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    if (type === 'IDAT') idat.push(buf.subarray(p + 8, p + 8 + len));
    if (type === 'IEND') break;
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  const paeth = (a, b, c) => {
    const d = a + b - c, da = Math.abs(d - a), db = Math.abs(d - b), dc = Math.abs(d - c);
    return da <= db && da <= dc ? a : db <= dc ? b : c;
  };
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    const dst = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? dst[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = x >= bpp && prev ? prev[x - bpp] : 0;
      let v = row[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) v += paeth(a, b, c);
      dst[x] = v & 0xff;
    }
  }
  return { w, h, bpp, data: out };
}

function encodePng(w, h, rgba) {
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const t = Buffer.from(type);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// bilinear sample from RGBA source (converts RGB → transparent-white)
function sample(src, fx, fy) {
  const x0 = Math.max(0, Math.min(src.w - 1, Math.floor(fx)));
  const y0 = Math.max(0, Math.min(src.h - 1, Math.floor(fy)));
  const x1 = Math.min(src.w - 1, x0 + 1), y1 = Math.min(src.h - 1, y0 + 1);
  const tx = fx - x0, ty = fy - y0;
  const px = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    const i00 = (y0 * src.w + x0) * src.bpp + c;
    const i10 = (y0 * src.w + x1) * src.bpp + c;
    const i01 = (y1 * src.w + x0) * src.bpp + c;
    const i11 = (y1 * src.w + x1) * src.bpp + c;
    const get = (i) => (src.bpp === 4 ? src.data[i] : c === 3 ? 255 : src.data[i]);
    px[c] = Math.round(
      get(i00) * (1 - tx) * (1 - ty) + get(i10) * tx * (1 - ty) +
      get(i01) * (1 - tx) * ty + get(i11) * tx * ty,
    );
  }
  return px;
}

function render(src, size, { scale = 1, bg = null } = {}) {
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // map output pixel → source coords (centered, scaled)
      const fx = ((x + 0.5 - size / 2) / scale + src.w / 2);
      const fy = ((y + 0.5 - size / 2) / scale + src.h / 2);
      const i = (y * size + x) * 4;
      let p;
      if (fx < 0 || fy < 0 || fx > src.w || fy > src.h) p = [0, 0, 0, 0];
      else p = sample(src, fx, fy);
      if (bg && p[3] < 255) {
        const a = p[3] / 255;
        p[0] = Math.round(p[0] * a + bg[0] * (1 - a));
        p[1] = Math.round(p[1] * a + bg[1] * (1 - a));
        p[2] = Math.round(p[2] * a + bg[2] * (1 - a));
        p[3] = 255;
      }
      out[i] = p[0]; out[i + 1] = p[1]; out[i + 2] = p[2]; out[i + 3] = p[3];
    }
  }
  return out;
}

let src = decodePng(fs.readFileSync(process.argv[2]));
// optional crop: node icon-gen.cjs <src> [x y w h]
if (process.argv.length >= 7) {
  const [cx, cy, cw, ch] = process.argv.slice(3).map(Number);
  const data = Buffer.alloc(ch * cw * src.bpp);
  for (let y = 0; y < ch; y++) {
    src.data.copy(data, y * cw * src.bpp, ((cy + y) * src.w + cx) * src.bpp, ((cy + y) * src.w + cx + cw) * src.bpp);
  }
  src = { w: cw, h: ch, bpp: src.bpp, data };
}
const S = 1024;
const s = S / src.w; // source → target scale

fs.writeFileSync(
  'apps/web/public/icon.png',
  encodePng(S, S, render(src, S, { scale: s, bg: [255, 255, 255] })),
);
// maskable: shrink to ~62% so squircle/circle masks never clip the hexagon
fs.writeFileSync(
  'apps/web/public/icon-maskable.png',
  encodePng(S, S, render(src, S, { scale: s * 0.62, bg: [255, 255, 255] })),
);
fs.writeFileSync(
  'apps/desktop/src-tauri/app-icon.png',
  encodePng(S, S, render(src, S, { scale: s * 0.62, bg: [255, 255, 255] })),
);
console.log('icons written');
