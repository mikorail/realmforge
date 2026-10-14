import type { Rng } from '../rng';
import { latRange, tempAt, windBand } from './options';
import type { Climate } from './types';
import { clamp } from '../rng';
import { Heap, neighbors } from './grid';
import { SEA, type Cells, type Feature, type River } from './types';

/** Flood-fill water bodies & landmasses; signed distance to coast. */
export function markFeatures(c: Cells, W: number, H: number): Feature[] {
	const n = c.n;
	c.feature.fill(-1);
	const features: Feature[] = [];
	const edgeMargin = Math.sqrt((W * H) / n) * 1.5;
	for (let s = 0; s < n; s++) {
		if (c.feature[s] !== -1) continue;
		const land = c.h[s] >= SEA;
		const id = features.length;
		let size = 0;
		let border = false;
		const q = [s];
		c.feature[s] = id;
		for (let qi = 0; qi < q.length; qi++) {
			const i = q[qi];
			size++;
			if (c.x[i] < edgeMargin || c.y[i] < edgeMargin || c.x[i] > W - edgeMargin || c.y[i] > H - edgeMargin) border = true;
			for (const j of neighbors(c, i))
				if (c.feature[j] === -1 && c.h[j] >= SEA === land) {
					c.feature[j] = id;
					q.push(j);
				}
		}
		const type: Feature['type'] = land ? (size > n / 25 ? 'continent' : 'island') : border || size > n / 20 ? 'ocean' : 'lake';
		features.push({ id, type, land, cells: size });
	}
	// signed coast distance via BFS rings
	c.dist.fill(0);
	let ring: number[] = [];
	for (let i = 0; i < n; i++) {
		const land = c.h[i] >= SEA;
		for (const j of neighbors(c, i))
			if (c.h[j] >= SEA !== land) {
				c.dist[i] = land ? 1 : -1;
				ring.push(i);
				break;
			}
	}
	for (let d = 2; d < 120 && ring.length; d++) {
		const next: number[] = [];
		for (const i of ring)
			for (const j of neighbors(c, i))
				if (c.dist[j] === 0) {
					c.dist[j] = c.h[j] >= SEA ? d : -d;
					next.push(j);
				}
		ring = next;
	}
	for (let i = 0; i < n; i++) if (c.dist[i] === 0) c.dist[i] = c.h[i] >= SEA ? 120 : -120;
	return features;
}

/** Temperature by latitude (from the Climate config) + altitude lapse rate. */
export function climate(c: Cells, H: number, cl: Climate) {
	const { top, span } = latRange(cl);
	for (let i = 0; i < c.n; i++) {
		const lat = top - (c.y[i] / H) * span;
		const altKm = c.h[i] >= SEA ? ((c.h[i] - 18) / 82) ** 1.6 * 4.2 : 0;
		c.temp[i] = Math.round(clamp(tempAt(cl, lat) - altKm * 6.5, -60, 60));
	}
	return { latN: top, span };
}

/** Moisture carried by prevailing winds; drops on land, more against rising terrain. */
export function precipitation(rng: Rng, c: Cells, W: number, H: number, lat: { latN: number; span: number }, cl: Climate) {
	const n = c.n;
	const carried = new Float32Array(n);
	const prec = new Float32Array(n);
	const band = new Uint8Array(n);
	for (let i = 0; i < n; i++) band[i] = windBand(lat.latN - (c.y[i] / H) * lat.span);
	const modifier = (0.85 + rng() * 0.3) * (cl.prec / 100);
	// one sweep per wind band, cells ordered upwind → downwind along that band's wind vector
	for (let b = 0; b < 6; b++) {
		const a = (cl.winds[b] * Math.PI) / 180;
		const dx = Math.sin(a), dy = -Math.cos(a);
		const seq: number[] = [];
		for (let i = 0; i < n; i++) if (band[i] === b) seq.push(i);
		if (!seq.length) continue;
		seq.sort((p, q) => c.x[p] * dx + c.y[p] * dy - (c.x[q] * dx + c.y[q] * dy));
		const dir = 1;
		for (const i of seq) {
			let sum = 0, cnt = 0;
			for (const j of neighbors(c, i))
				if ((c.x[j] - c.x[i]) * dx + (c.y[j] - c.y[i]) * dy < 0) { sum += carried[j]; cnt++; }
			let m = cnt ? sum / cnt : c.h[i] < SEA ? 60 : 20;
			if (c.h[i] < SEA) {
				m = Math.min(100, m + 6 + Math.max(0, c.temp[i]) * 0.15);
				prec[i] = m * 0.05;
			} else {
				// orographic lift
				let up = 0;
				for (const j of neighbors(c, i)) if (((c.x[j] - c.x[i]) * dx + (c.y[j] - c.y[i]) * dy) * dir < 0) up = Math.max(up, c.h[i] - c.h[j]);
				const rate = 0.05 + Math.max(0, up) * 0.012 + (c.h[i] > 70 ? 0.08 : 0);
				const rain = m * Math.min(0.6, rate);
				prec[i] = rain;
				m -= rain * 0.9;
				if (c.temp[i] < -5) m *= 0.9;
			}
			carried[i] = m;
		}
	}
	// blur + lakes give moisture; temperature caps (cold air holds little water)
	for (let i = 0; i < n; i++) {
		let s = prec[i] * 2, w = 2;
		for (const j of neighbors(c, i)) { s += prec[j]; w++; }
		const capT = c.temp[i] < 0 ? 0.5 : 1;
		c.prec[i] = Math.round(clamp((s / w) * 9 * modifier * capT, 0, 100));
	}
	void W;
}

/** Priority-flood drainage → flux accumulation → rivers. */
export function rivers(rng: Rng, c: Cells, features: Feature[], abundance = 1): River[] {
	const n = c.n;
	// drainage elevation: ocean cells are outlets; everything else is raised just enough to drain
	const dh = new Float32Array(n);
	const done = new Uint8Array(n);
	const heap = new Heap();
	for (let i = 0; i < n; i++) {
		dh[i] = c.h[i];
		if (c.h[i] < SEA && features[c.feature[i]].type === 'ocean') {
			done[i] = 1;
			heap.push(i, c.h[i]);
		}
	}
	while (heap.size) {
		const i = heap.pop();
		for (const j of neighbors(c, i)) {
			if (done[j]) continue;
			done[j] = 1;
			if (dh[j] <= dh[i]) dh[j] = dh[i] + 0.001 + rng() * 0.001;
			heap.push(j, dh[j]);
		}
	}
	const order = Array.from({ length: n }, (_, i) => i)
		.filter((i) => !(c.h[i] < SEA && features[c.feature[i]].type === 'ocean'))
		.sort((a, b) => dh[b] - dh[a]);
	c.flux.fill(0);
	c.river.fill(0);
	const down = new Int32Array(n).fill(-1);
	for (const i of order) {
		c.flux[i] += c.prec[i] / 10 + 0.05;
		let lo = -1, loH = dh[i];
		for (const j of neighbors(c, i)) if (dh[j] < loH) { loH = dh[j]; lo = j; }
		if (lo >= 0) {
			down[i] = lo;
			c.flux[lo] += c.flux[i];
		}
	}
	// threshold scales with cell density
	const thr = (18 * Math.sqrt(10000 / n)) / Math.max(0.1, abundance);
	const out: River[] = [{ id: 0, cells: [], flux: 0, name: '' }];
	for (const i of order) {
		if (c.flux[i] < thr || c.h[i] < SEA) continue;
		if (!c.river[i]) {
			// river source: no upstream river cell
			out.push({ id: out.length, cells: [i], flux: 0, name: '' });
			c.river[i] = out.length - 1;
		}
		const r = c.river[i];
		const d = down[i];
		if (d < 0) continue;
		if (c.h[d] < SEA) {
			out[r].cells.push(d); // mouth
			out[r].flux = Math.max(out[r].flux, c.flux[i]);
			continue;
		}
		if (!c.river[d]) {
			c.river[d] = r;
			out[r].cells.push(d);
		} else {
			// confluence: tributary ends here
			out[r].cells.push(d);
			out[r].flux = Math.max(out[r].flux, c.flux[i]);
		}
		out[r].flux = Math.max(out[r].flux, c.flux[d]);
	}
	return out;
}

export const BIOMES = [
	{ name: 'Marine', color: '#466eab', hab: 0, cost: 10 },
	{ name: 'Hot desert', color: '#fbe79f', hab: 4, cost: 200 },
	{ name: 'Cold desert', color: '#b5b887', hab: 10, cost: 150 },
	{ name: 'Savanna', color: '#d2d082', hab: 22, cost: 60 },
	{ name: 'Grassland', color: '#c8d68f', hab: 30, cost: 50 },
	{ name: 'Tropical seasonal forest', color: '#b6d95d', hab: 50, cost: 70 },
	{ name: 'Temperate deciduous forest', color: '#29bc56', hab: 100, cost: 70 },
	{ name: 'Tropical rainforest', color: '#7dcb35', hab: 80, cost: 80 },
	{ name: 'Temperate rainforest', color: '#409c43', hab: 90, cost: 90 },
	{ name: 'Taiga', color: '#4b6b32', hab: 12, cost: 200 },
	{ name: 'Tundra', color: '#96784b', hab: 4, cost: 1000 },
	{ name: 'Glacier', color: '#d5e7eb', hab: 0, cost: 5000 },
	{ name: 'Wetland', color: '#0b9131', hab: 12, cost: 150 },
	{ name: 'Ashland', color: '#6b5a55', hab: 3, cost: 300 },
	{ name: 'Crystal fields', color: '#b9a6e8', hab: 15, cost: 120 },
	{ name: 'Fungal forest', color: '#a07ab8', hab: 35, cost: 90 },
	{ name: 'Lava flats', color: '#c2502e', hab: 0, cost: 2000 }
] as const;

import type { PlanetKind } from './types';
export const PLANETS: Record<PlanetKind, { name: string; temp: number; prec: number; sea: number; desc: string }> = {
	terran: { name: 'Terran', temp: 0, prec: 1, sea: 0, desc: 'Familiar seas and seasons' },
	verdant: { name: 'Verdant', temp: 3, prec: 1.6, sea: 0, desc: 'Lush, wet, overgrown' },
	desert: { name: 'Desert', temp: 6, prec: 0.35, sea: 6, desc: 'Dunes and rare oases' },
	ocean: { name: 'Oceanic', temp: 1, prec: 1.3, sea: -8, desc: 'Endless sea, scattered isles' },
	ice: { name: 'Glacial', temp: -24, prec: 0.7, sea: 0, desc: 'Frozen wastes, hardy folk' },
	volcanic: { name: 'Volcanic', temp: 5, prec: 0.8, sea: 2, desc: 'Ash, fire and obsidian' },
	shattered: { name: 'Shattered', temp: 0, prec: 1.1, sea: -4, desc: 'Broken continents and straits' },
	exotic: { name: 'Exotic', temp: 2, prec: 1.2, sea: 0, desc: 'Crystal plains, fungal jungles' }
};

/** planet flavour on top of the normal biome model */
export function planetBiomes(c: Cells, planet: PlanetKind, rng: () => number) {
	for (let i = 0; i < c.n; i++) {
		const b = c.biome[i];
		if (!b) continue;
		if (planet === 'volcanic') {
			if (c.h[i] > 62) c.biome[i] = rng() < 0.15 ? 16 : 13;
			else if ((b === 1 || b === 2) && rng() < 0.5) c.biome[i] = 13;
		} else if (planet === 'exotic') {
			if (b === 1 || b === 2 || b === 10) c.biome[i] = 14;
			else if (b === 6 || b === 8 || b === 9 || b === 12) c.biome[i] = 15;
		}
	}
}

export function biomeOf(h: number, temp: number, prec: number, flux: number, n: number): number {
	if (h < SEA) return 0;
	if (temp <= -8) return 11;
	const m = prec + Math.min(30, flux * Math.sqrt(n / 10000) * 0.4);
	if (m > 62 && h < 24 && temp > 2) return 12;
	if (temp <= 0) return m < 10 ? 2 : 10;
	if (temp < 5) return m < 10 ? 2 : m < 18 ? 10 : 9;
	if (temp < 15) return m < 8 ? 2 : m < 18 ? 4 : m < 36 ? 6 : 8;
	if (temp < 22) return m < 8 ? 1 : m < 18 ? 4 : m < 34 ? 6 : 8;
	return m < 9 ? 1 : m < 20 ? 3 : m < 40 ? 5 : 7;
}

export function assignBiomes(c: Cells) {
	for (let i = 0; i < c.n; i++) c.biome[i] = biomeOf(c.h[i], c.temp[i], c.prec[i], c.flux[i], c.n);
}

/** Population potential per cell (thousands). */
export function assignPopulation(c: Cells, features: Feature[]) {
	const scale = Math.sqrt(10000 / c.n) * 2;
	for (let i = 0; i < c.n; i++) {
		if (c.h[i] < SEA) { c.pop[i] = 0; continue; }
		let s = BIOMES[c.biome[i]].hab;
		if (!s) { c.pop[i] = 0; continue; }
		if (c.river[i]) s += Math.min(60, Math.sqrt(c.flux[i]) * 4);
		if (c.dist[i] === 1) {
			let ocean = false, lake = false;
			for (const j of neighbors(c, i)) {
				if (c.h[j] >= SEA) continue;
				const t = features[c.feature[j]].type;
				if (t === 'ocean') ocean = true;
				else lake = true;
			}
			if (ocean) s += 20;
			if (lake) s += 25;
		}
		s -= Math.max(0, c.h[i] - 50) * 0.8; // highlands are poorer
		c.pop[i] = Math.max(0, s / 10) * scale;
	}
}
