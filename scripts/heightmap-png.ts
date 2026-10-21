/** Renders a world's heightmap/biomes to a PNG for eyeballing: npx tsx scripts/heightmap-png.ts [template] [cells] [out.png] [wrap] [flipX] */
import { writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';
import { generateWorld } from '../src/lib/gen/index';
import type { Template } from '../src/lib/gen/types';

const template = (process.argv[2] ?? 'earth') as Template;
const cells = Number(process.argv[3] ?? 40000);
const out = process.argv[4] ?? 'heightmap.png';
const wrapX = process.argv[5] === 'wrap';
const flipX = process.argv[6] === 'flipX';
const w = generateWorld({ seed: 'preview', template, cells, states: 10, width: wrapX ? 2000 : 1600, height: 1000, wrapX, flipX, depth: 0, sky: false, sea: false, climate: wrapX ? undefined : { mapSize: 100, latitude: 50 } as never });
const c = w.cells;
const W = w.opts.width, H = w.opts.height;
const px = new Uint8Array(W * H * 3);
// nearest-cell raster (brute force grid bucket)
const B = 20, gw = Math.ceil(W / B), gh = Math.ceil(H / B);
const bucket: number[][] = Array.from({ length: gw * gh }, () => []);
for (let i = 0; i < c.n; i++) bucket[Math.floor(c.y[i] / B) * gw + Math.floor(c.x[i] / B)].push(i);
const colour = (h: number): [number, number, number] => {
	if (h < 20) { const t = h / 20; return [20 + 30 * t, 50 + 70 * t, 110 + 90 * t]; }
	const t = (h - 20) / 80;
	if (t < 0.15) return [90 + 60 * t, 150 - 20 * t, 70];
	if (t < 0.4) return [150, 140 - 60 * (t - 0.15), 80];
	return [140 + 115 * t, 130 + 125 * t, 120 + 135 * t];
};
for (let y = 0; y < H; y++)
	for (let x = 0; x < W; x++) {
		let best = 0, bd = Infinity;
		const bx = Math.floor(x / B), by = Math.floor(y / B);
		for (let r = 1; r < 6 && bd === Infinity; r++)
			for (let dy = -r; dy <= r; dy++)
				for (let dx = -r; dx <= r; dx++) {
					const gx = bx + dx, gy = by + dy;
					if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) continue;
					for (const i of bucket[gy * gw + gx]) { const d = (c.x[i] - x) ** 2 + (c.y[i] - y) ** 2; if (d < bd) { bd = d; best = i; } }
				}
		const [r, g, b] = colour(c.h[best]);
		const o = (y * W + x) * 3;
		px[o] = r; px[o + 1] = g; px[o + 2] = b;
	}
const raw = new Uint8Array((W * 3 + 1) * H);
for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (W * 3 + 1) + 1); }
const chunk = (type: string, data: Uint8Array) => {
	const b = new Uint8Array(12 + data.length);
	const dv = new DataView(b.buffer);
	dv.setUint32(0, data.length);
	for (let i = 0; i < 4; i++) b[4 + i] = type.charCodeAt(i);
	b.set(data, 8);
	dv.setUint32(8 + data.length, crc32(b.subarray(4, 8 + data.length)));
	return b;
};
const ihdr = new Uint8Array(13);
const dv = new DataView(ihdr.buffer);
dv.setUint32(0, W); dv.setUint32(4, H); ihdr[8] = 8; ihdr[9] = 2;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array(0))]);
writeFileSync(out, png);
let land = 0;
for (let i = 0; i < c.n; i++) if (c.h[i] >= 20) land++;
console.log(`${template} n=${c.n} land=${((land / c.n) * 100).toFixed(1)}% -> ${out}`);
