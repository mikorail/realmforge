import { createNoise3D } from 'simplex-noise';
import type { Rng } from '../rng';
import { EARTH_MASK_B64, EARTH_MASK_H, EARTH_MASK_W } from './earthMask';
import { lonRange, latRange } from './options';
import type { Cells, Climate, HeightImage } from './types';

/** extras the heightmap stage needs for the real-world and image templates */
export interface HeightmapExtra {
	climate?: Climate;
	wrapX?: boolean;
	flipX?: boolean;
	flipY?: boolean;
	invert?: boolean;
	image?: HeightImage;
}

/* ---------- Earth land mask ---------- */

let softMask: Float32Array | null = null;

/** the packed 1-bit mask, unpacked and box-blurred once (wrapping in longitude) into a soft 0..1 field; deterministic, cached */
function getSoftMask(): Float32Array {
	if (softMask) return softMask;
	const W = EARTH_MASK_W, H = EARTH_MASK_H;
	const bin = typeof atob === 'function' ? atob(EARTH_MASK_B64) : Buffer.from(EARTH_MASK_B64, 'base64').toString('binary');
	let a = new Float32Array(W * H);
	for (let i = 0; i < W * H; i++) a[i] = (bin.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1;
	for (let pass = 0; pass < 1; pass++) {
		const b = new Float32Array(W * H);
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) {
				let s = 0;
				for (let dy = -1; dy <= 1; dy++) {
					const yy = Math.min(H - 1, Math.max(0, y + dy));
					for (let dx = -1; dx <= 1; dx++) s += a[yy * W + ((x + dx + W) % W)];
				}
				b[y * W + x] = s / 9;
			}
		a = b;
	}
	softMask = a;
	return a;
}

/** bilinear sample of the soft mask at a longitude/latitude (degrees) */
function sampleMask(m: Float32Array, lon: number, lat: number): number {
	const W = EARTH_MASK_W, H = EARTH_MASK_H;
	const fx = (((lon + 180) / 360) * W - 0.5 + W * 4) % W;
	const fy = Math.min(H - 1, Math.max(0, ((90 - lat) / 180) * H - 0.5));
	const x0 = Math.floor(fx), y0 = Math.floor(fy);
	const tx = fx - x0, ty = fy - y0;
	const x1 = (x0 + 1) % W, y1 = Math.min(H - 1, y0 + 1);
	return (m[y0 * W + x0] * (1 - tx) + m[y0 * W + x1] * tx) * (1 - ty) + (m[y1 * W + x0] * (1 - tx) + m[y1 * W + x1] * tx) * ty;
}

/* ---------- mountain belts (lon, lat) ---------- */

interface Belt {
	/** extra height at the crest */
	h: number;
	/** half-width in degrees */
	w: number;
	pts: [number, number][];
}

export const BELTS: Record<string, Belt> = {
	himalaya: { h: 62, w: 3.2, pts: [[71, 36.5], [76, 35.5], [80, 31.5], [85, 28], [90, 27.8], [95, 28.5], [98, 27.5]] },
	tibet: { h: 24, w: 7, pts: [[80, 34], [90, 33.5], [98, 33]] },
	tianShan: { h: 38, w: 2.5, pts: [[70, 41], [80, 42], [88, 43]] },
	hinduKush: { h: 40, w: 2.5, pts: [[66, 35.5], [71, 36.5]] },
	altai: { h: 28, w: 2.5, pts: [[85, 50], [92, 49], [98, 48.5]] },
	stanovoy: { h: 20, w: 2.5, pts: [[118, 56], [130, 55]] },
	verkhoyansk: { h: 22, w: 2.5, pts: [[130, 68], [135, 62], [140, 60]] },
	andes: { h: 48, w: 2.4, pts: [[-72, 9], [-75, 5], [-77.5, 0], [-78.5, -5], [-76, -10], [-73, -14], [-69, -18], [-68.5, -23], [-70, -30], [-71, -37], [-72, -44], [-73.5, -50], [-72, -53]] },
	altiplano: { h: 16, w: 4, pts: [[-68, -16], [-67, -21]] },
	rockies: { h: 38, w: 3, pts: [[-150, 63], [-135, 60], [-125, 59], [-120, 54], [-115, 50], [-111, 45], [-108, 40], [-106, 36], [-106, 32]] },
	sierraMadre: { h: 30, w: 2.2, pts: [[-106, 30], [-105, 26], [-103, 22], [-100, 19], [-96, 17]] },
	cascades: { h: 26, w: 1.8, pts: [[-122, 49], [-122, 44], [-120, 38], [-117, 34]] },
	appalachians: { h: 20, w: 2, pts: [[-85, 34], [-80, 37], [-77, 40], [-74, 42], [-71, 44.5], [-67, 46]] },
	alps: { h: 42, w: 1.9, pts: [[6, 44], [7, 46], [10, 46.5], [13, 46.5], [15.5, 47]] },
	pyrenees: { h: 28, w: 1.2, pts: [[-2, 43], [2, 42.7]] },
	carpathians: { h: 22, w: 1.6, pts: [[17, 49], [22, 49.2], [25, 47], [25.5, 45.5], [22.5, 45.2]] },
	caucasus: { h: 40, w: 1.6, pts: [[38, 44], [42, 43], [46, 42], [48.5, 41.8]] },
	scandes: { h: 28, w: 2, pts: [[6, 60], [9, 62], [13, 65], [17, 68], [21, 69.5]] },
	urals: { h: 22, w: 1.4, pts: [[60, 68], [60, 60], [59, 55], [58, 52]] },
	zagros: { h: 30, w: 2.2, pts: [[46, 37], [50, 33], [54, 29], [58, 27]] },
	taurus: { h: 26, w: 1.8, pts: [[30, 37], [37, 37.5], [42, 38]] },
	elburz: { h: 30, w: 1.6, pts: [[48, 37], [53, 36]] },
	atlas: { h: 30, w: 1.8, pts: [[-9, 31], [-5, 33], [-1, 34], [4, 35.5], [8, 36]] },
	ahaggar: { h: 14, w: 2.2, pts: [[5, 23], [7, 20]] },
	ethiopia: { h: 30, w: 2.6, pts: [[36, 13], [38, 9], [40, 6]] },
	eastAfrica: { h: 24, w: 2.2, pts: [[36, 2], [34, -3], [35, -9], [34, -14]] },
	drakensberg: { h: 20, w: 1.8, pts: [[30, -24], [29, -29], [27, -32]] },
	greatDividing: { h: 20, w: 1.7, pts: [[145, -15], [147, -20], [150, -25], [150, -30], [148, -36], [146.5, -37.5]] },
	newGuinea: { h: 34, w: 1.8, pts: [[137, -4.5], [141, -5.5], [145, -6], [147, -7]] },
	southernAlps: { h: 34, w: 1.1, pts: [[169, -44], [171, -43], [172.5, -41.5]] },
	westernGhats: { h: 14, w: 1.2, pts: [[73.5, 20], [75, 14], [77, 9]] },
	annamite: { h: 16, w: 1.4, pts: [[104, 22], [106, 17], [108, 13]] },
	brazilHighlands: { h: 12, w: 3, pts: [[-45, -16], [-42, -20]] }
};

interface PreBelt extends Belt { x0: number; x1: number; y0: number; y1: number }
let prepped: PreBelt[] | null = null;
function belts(): PreBelt[] {
	if (prepped) return prepped;
	prepped = Object.values(BELTS).map((b) => {
		const xs = b.pts.map((p) => p[0]), ys = b.pts.map((p) => p[1]);
		const pad = b.w * 1.3 * 3.2;
		return { ...b, x0: Math.min(...xs) - pad * 2.2, x1: Math.max(...xs) + pad * 2.2, y0: Math.min(...ys) - pad, y1: Math.max(...ys) + pad };
	});
	return prepped;
}

/** squared distance (deg^2, longitude scaled by cos latitude) from a point to a polyline */
function distSq(pts: [number, number][], lon: number, lat: number, k: number): number {
	let best = Infinity;
	for (let i = 0; i < pts.length - 1; i++) {
		const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
		const vx = (bx - ax) * k, vy = by - ay;
		const px = (lon - ax) * k, py = lat - ay;
		const l2 = vx * vx + vy * vy;
		const t = l2 > 0 ? Math.max(0, Math.min(1, (px * vx + py * vy) / l2)) : 0;
		const dx = px - vx * t, dy = py - vy * t;
		const d = dx * dx + dy * dy;
		if (d < best) best = d;
	}
	return best;
}

const wrapLon = (x: number) => ((((x + 180) % 360) + 360) % 360) - 180;

/** map x/y of every cell to Earth longitude/latitude (after the optional mirror flips) */
function geo(c: Cells, W: number, H: number, ex: HeightmapExtra, i: number): [number, number] {
	const cl = ex.climate;
	let lat: number, lon: number;
	if (cl) {
		const { top, span } = latRange(cl);
		lat = top - (c.y[i] / H) * span;
		const lr = lonRange(cl, W, H);
		lon = lr.left + (c.x[i] / W) * lr.span;
	} else {
		lat = 90 - (c.y[i] / H) * 180;
		lon = -180 + (c.x[i] / W) * 360;
	}
	lon = wrapLon(lon);
	if (ex.flipX) lon = -lon;
	if (ex.flipY) lat = -lat;
	return [lon, lat];
}

/**
 * Earth-like continents: the soft land mask gives land/sea, 3D simplex noise (on the unit sphere, so it
 * tiles across the wrapped seam and does not pinch at the poles) jitters the coast and adds relief, and
 * real mountain belts are raised along lat/lon polylines. Heights are centred on the shoreline (20) so
 * the sea-level option moves the coast in a believable way.
 */
export function earthHeights(rng: Rng, c: Cells, W: number, H: number, ex: HeightmapExtra): Float32Array {
	const n = c.n;
	const out = new Float32Array(n);
	const noise = createNoise3D(rng);
	const ridge = createNoise3D(rng);
	const m = getSoftMask();
	const bl = belts();
	const D2R = Math.PI / 180;
	for (let i = 0; i < n; i++) {
		const [lon, lat] = geo(c, W, H, ex, i);
		const cl = Math.cos(lat * D2R);
		const px = cl * Math.cos(lon * D2R), py = cl * Math.sin(lon * D2R), pz = Math.sin(lat * D2R);
		// coastline jitter: 5 octaves, strongest at the shoreline
		let f = 2.2, a = 0.5, coast = 0;
		for (let o = 0; o < 5; o++) { coast += noise(px * f, py * f, pz * f) * a; f *= 2.1; a *= 0.55; }
		// the blur halves thin islands; re-centre so a one-pixel island (coverage 1/9..) still crosses the shoreline
		const s0 = Math.max(0, Math.min(1, 0.5 + (sampleMask(m, lon, lat) - 0.36) * 1.5));
		const edge = Math.max(0, 1 - (2 * s0 - 1) ** 2);
		const s = s0 + coast * 0.55 * edge;
		let h = 19 + (s - 0.5) * 30;
		if (s > 0.4) {
			// gentle interior relief
			h += (noise(px * 5 + 11, py * 5, pz * 5) * 0.6 + noise(px * 14, py * 14 + 7, pz * 14) * 0.4) * 5 * Math.min(1, (s - 0.4) * 5);
			const k = Math.max(0.15, cl);
			const dl = lon;
			let add = 0;
			for (const b of bl) {
				if (lat < b.y0 || lat > b.y1 || dl < b.x0 || dl > b.x1) continue;
				const d2 = distSq(b.pts, dl, lat, k);
				const bw = b.w * 1.3;
				const w2 = bw * bw;
				if (d2 > w2 * 9) continue;
				const r = 0.62 + 0.38 * ridge(px * 9, py * 9, pz * 9);
				add = Math.max(add, b.h * Math.exp(-d2 / w2) * r);
			}
			h += add * Math.min(1, (s - 0.4) * 6);
		}
		out[i] = Math.max(0, Math.min(100, h));
	}
	return out;
}

/* ---------- user image ---------- */

/** bilinear brightness (0..1) of a grayscale image at normalised u,v */
function sampleImage(img: HeightImage, u: number, v: number, wrap: boolean): number {
	const { w, h, data } = img;
	let fx = u * w - 0.5, fy = Math.min(h - 1, Math.max(0, v * h - 0.5));
	if (wrap) fx = ((fx % w) + w) % w;
	else fx = Math.min(w - 1, Math.max(0, fx));
	const x0 = Math.floor(fx), y0 = Math.floor(fy);
	const tx = fx - x0, ty = fy - y0;
	const x1 = wrap ? (x0 + 1) % w : Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1);
	const g = (x: number, y: number) => data[y * w + x];
	return ((g(x0, y0) * (1 - tx) + g(x1, y0) * tx) * (1 - ty) + (g(x0, y1) * (1 - tx) + g(x1, y1) * tx) * ty) / 255;
}

/** brightness at/below this is sea; above it rises to mountains */
export const IMAGE_SEA = 0.3;

/** heightmap from a user image: dark = sea, bright = high; stretched to fill the map. Pure sampling, no rng. */
export function imageHeights(c: Cells, W: number, H: number, img: HeightImage, invert: boolean, wrap: boolean): Float32Array {
	const out = new Float32Array(c.n);
	for (let i = 0; i < c.n; i++) {
		let b = sampleImage(img, c.x[i] / W, c.y[i] / H, wrap);
		if (invert) b = 1 - b;
		out[i] = b <= IMAGE_SEA ? (b / IMAGE_SEA) * 19 : 20 + ((b - IMAGE_SEA) / (1 - IMAGE_SEA)) * 70;
	}
	return out;
}
