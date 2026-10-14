import { createNoise2D } from 'simplex-noise';
import type { Rng } from '../rng';
import { clamp } from '../rng';
import { findCell, neighbors } from './grid';
import type { Cells, Template } from './types';

/**
 * Heightmap "template" DSL, modelled on Azgaar's: each step is
 * [op, count, height, xRange(%), yRange(%)].
 */
type Step =
	| ['hill' | 'pit' | 'range' | 'trough', string, string, string, string]
	| ['mask', number]
	| ['smooth', number]
	| ['noise', number]
	| ['add', number]
	| ['strait', number, 'v' | 'h'];

const TEMPLATES: Record<Template, Step[]> = {
	continents: [
		['hill', '1', '80-85', '60-80', '40-60'],
		['hill', '1', '80-85', '20-30', '40-60'],
		['hill', '6-7', '15-30', '25-75', '15-85'],
		['range', '2-3', '40-60', '15-85', '20-80'],
		['range', '2-3', '30-45', '15-85', '20-80'],
		['trough', '3-4', '15-20', '15-85', '20-80'],
		['hill', '3-5', '10-20', '15-85', '10-90'],
		['strait', 2, 'v'],
		['smooth', 2],
		['pit', '4-6', '15-25', '10-90', '10-90'],
		['noise', 6],
		['mask', 4]
	],
	archipelago: [
		['add', 11],
		['range', '2-3', '40-60', '20-80', '20-80'],
		['hill', '5', '15-20', '10-90', '30-70'],
		['hill', '2', '10-15', '10-30', '20-80'],
		['hill', '2', '10-15', '60-90', '20-80'],
		['smooth', 3],
		['trough', '10', '20-30', '5-95', '5-95'],
		['strait', 2, 'v'],
		['strait', 2, 'h'],
		['noise', 8],
		['mask', 3]
	],
	pangea: [
		['hill', '1-2', '25-40', '15-50', '0-10'],
		['hill', '1-2', '5-40', '50-85', '0-10'],
		['hill', '1-2', '25-40', '50-85', '90-100'],
		['hill', '1-2', '5-40', '15-50', '90-100'],
		['hill', '8-12', '20-40', '20-80', '48-52'],
		['smooth', 2],
		['range', '3-4', '30-60', '20-80', '20-80'],
		['trough', '3-4', '15-25', '15-85', '20-80'],
		['range', '2-3', '30-60', '20-80', '20-80'],
		['noise', 5],
		['mask', 4]
	],
	highIsland: [
		['hill', '1', '90-100', '65-75', '47-53'],
		['add', 7],
		['hill', '5-6', '20-30', '25-55', '45-55'],
		['range', '1', '40-50', '45-55', '45-55'],
		['smooth', 3],
		['trough', '2-3', '20-30', '20-30', '20-30'],
		['trough', '2-3', '20-30', '60-80', '70-80'],
		['hill', '1', '10-15', '60-60', '50-50'],
		['range', '1', '40-60', '20-80', '40-60'],
		['pit', '3-5', '10-30', '15-85', '20-80'],
		['noise', 6],
		['mask', 3]
	],
	inlandSea: [
		['hill', '2', '30-50', '10-90', '10-25'],
		['hill', '2', '30-50', '10-90', '75-90'],
		['hill', '3', '30-50', '0-10', '10-90'],
		['hill', '3', '30-50', '90-100', '10-90'],
		['hill', '6-8', '20-30', '5-95', '5-95'],
		['pit', '4-6', '25-40', '30-70', '30-70'],
		['smooth', 2],
		['range', '2-4', '30-50', '10-90', '10-90'],
		['noise', 6],
		['mask', 2]
	],
	peninsulas: [
		['add', 15],
		['hill', '3-4', '25-35', '5-95', '60-100'],
		['range', '4-6', '30-50', '5-95', '40-100'],
		['trough', '6-8', '20-30', '5-95', '5-60'],
		['hill', '2-3', '15-25', '5-95', '0-30'],
		['smooth', 2],
		['noise', 6],
		['mask', 2]
	]
};

export const TEMPLATE_NAMES: Record<Template, string> = {
	continents: 'Continents',
	archipelago: 'Archipelago',
	pangea: 'Pangea',
	highIsland: 'High Island',
	inlandSea: 'Inland Sea',
	peninsulas: 'Peninsulas'
};

function range(rng: Rng, s: string): number {
	const [a, b] = s.split('-').map(Number);
	return b === undefined ? a : a + rng() * (b - a);
}

/** decay exponents scale with cell density so blobs keep their on-screen size */
function blobPower(n: number) {
	const t: [number, number][] = [[1000, 0.93], [2000, 0.95], [5000, 0.97], [10000, 0.98], [20000, 0.99], [40000, 0.993], [100000, 0.997]];
	for (const [k, v] of t) if (n <= k) return v;
	return 0.998;
}
function linePower(n: number) {
	const t: [number, number][] = [[1000, 0.75], [2000, 0.77], [5000, 0.79], [10000, 0.81], [20000, 0.82], [40000, 0.84], [100000, 0.86]];
	for (const [k, v] of t) if (n <= k) return v;
	return 0.88;
}

export function generateHeightmap(rng: Rng, c: Cells, template: Template, W: number, H: number) {
	const n = c.n;
	const h = new Float32Array(n);
	const bp = blobPower(n);
	const lp = linePower(n);
	const noise = createNoise2D(rng);

	const randomCell = (xr: string, yr: string, limit = 90) => {
		for (let tries = 0; tries < 50; tries++) {
			const px = (range(rng, xr) / 100) * W;
			const py = (range(rng, yr) / 100) * H;
			const i = findCell(c, px, py, Math.floor(rng() * n));
			if (h[i] < limit) return i;
		}
		return Math.floor(rng() * n);
	};

	const blob = (sign: number, height: number, start: number) => {
		const change = new Float32Array(n);
		change[start] = height;
		const q = [start];
		for (let qi = 0; qi < q.length; qi++) {
			const cur = q[qi];
			for (const j of neighbors(c, cur)) {
				if (change[j]) continue;
				change[j] = Math.floor(change[cur] ** bp * (rng() * 0.2 + 0.9));
				if (change[j] > 1) q.push(j);
			}
		}
		for (let i = 0; i < n; i++) h[i] = clamp(h[i] + sign * change[i], 0, 100);
	};

	const line = (sign: number, height: number, xr: string, yr: string) => {
		const start = randomCell(xr, yr, sign > 0 ? 90 : 101);
		// end point ~ W/4..W/2 away
		let end = start;
		for (let tries = 0; tries < 30; tries++) {
			const ex = rng() * W * 0.8 + W * 0.1;
			const ey = rng() * H * 0.7 + H * 0.15;
			const d = Math.hypot(ex - c.x[start], ey - c.y[start]);
			if (d >= W / 8 && d <= W / 2) {
				end = findCell(c, ex, ey, start);
				break;
			}
		}
		// greedy noisy path
		const used = new Uint8Array(n);
		const path = [start];
		used[start] = 1;
		let cur = start;
		while (cur !== end && path.length < 400) {
			let best = -1, bestD = Infinity;
			for (const j of neighbors(c, cur)) {
				if (used[j]) continue;
				let d = (c.x[end] - c.x[j]) ** 2 + (c.y[end] - c.y[j]) ** 2;
				if (rng() > 0.85) d /= 2;
				if (d < bestD) { bestD = d; best = j; }
			}
			if (best < 0) break;
			cur = best;
			used[cur] = 1;
			path.push(cur);
		}
		// raise rings around the path
		let ring = path.slice();
		let hh = height;
		const touched = new Uint8Array(n);
		for (const i of ring) touched[i] = 1;
		while (ring.length && hh > 2) {
			for (const i of ring) h[i] = clamp(h[i] + sign * hh * (rng() * 0.3 + 0.85), 0, 100);
			hh = hh ** lp - 1;
			const next: number[] = [];
			for (const i of ring)
				for (const j of neighbors(c, i)) if (!touched[j]) { touched[j] = 1; next.push(j); }
			ring = next;
		}
	};

	for (const step of TEMPLATES[template]) {
		const op = step[0];
		if (op === 'hill' || op === 'pit') {
			const count = Math.round(range(rng, step[1] as string));
			for (let k = 0; k < count; k++) {
				const height = range(rng, step[2] as string);
				blob(op === 'hill' ? 1 : -1, height, randomCell(step[3] as string, step[4] as string, op === 'hill' ? 90 : 101));
			}
		} else if (op === 'range' || op === 'trough') {
			const count = Math.round(range(rng, step[1] as string));
			for (let k = 0; k < count; k++)
				line(op === 'range' ? 1 : -1, range(rng, step[2] as string), step[3] as string, step[4] as string);
		} else if (op === 'add') {
			for (let i = 0; i < n; i++) h[i] = clamp(h[i] + step[1], 0, 100);
		} else if (op === 'smooth') {
			const f = step[1];
			const copy = h.slice();
			for (let i = 0; i < n; i++) {
				let s = copy[i] * f, w = f;
				for (const j of neighbors(c, i)) { s += copy[j]; w++; }
				h[i] = s / w;
			}
		} else if (op === 'noise') {
			const amp = step[1];
			for (let i = 0; i < n; i++) {
				const nx = c.x[i] / W, ny = c.y[i] / H;
				const v = noise(nx * 4, ny * 4) * 0.6 + noise(nx * 12, ny * 12) * 0.4;
				if (h[i] > 12) h[i] = clamp(h[i] + v * amp, 0, 100);
			}
		} else if (op === 'mask') {
			const pw = step[1];
			for (let i = 0; i < n; i++) {
				const nx = (2 * c.x[i]) / W - 1, ny = (2 * c.y[i]) / H - 1;
				const d = (1 - nx * nx) * (1 - ny * ny); // 1 at center → 0 at edges
				const m = d ** (1 / pw);
				h[i] = (h[i] * (pw - 1 + m * 1.6)) / pw;
				if (d < 0.02) h[i] = Math.min(h[i], 12);
			}
		} else if (op === 'strait') {
			const width = step[1];
			const vert = step[2] === 'v';
			const pos = 0.3 + rng() * 0.4;
			for (let i = 0; i < n; i++) {
				const t = vert ? c.x[i] / W : c.y[i] / H;
				const along = vert ? c.y[i] / H : c.x[i] / W;
				const wob = noise(along * 3, pos * 10) * 0.03;
				const d = Math.abs(t - pos - wob);
				const w = (width * 0.012) * (0.5 + rng() * 0.2);
				if (d < w) h[i] = Math.max(0, h[i] - (1 - d / w) * 40);
			}
		}
	}
	for (let i = 0; i < n; i++) c.h[i] = Math.round(clamp(h[i], 0, 100));
}
