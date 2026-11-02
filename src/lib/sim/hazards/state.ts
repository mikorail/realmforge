/**
 * Hazard state (`sim._hazardsState`, saved through dump()'s `ext`): the planet's geology (faults and
 * volcanoes, computed once from the terrain with a side rng), recent disasters, scheduled after-effects,
 * the volcanic-winter veil, per-cell disease fields and outbreak records. Side rngs `seed:hz:...` only.
 */
import { makeRng, type Rng } from '../../rng';
import { makeName, type Lang } from '../../gen/names';
import type { Simulation } from '../engine';
import type { HazardKind } from './data';

export interface Fault { id: number; name: string; cells: number[]; offshore: boolean; activity: number; last: number }
export interface Volcano { id: number; name: string; cell: number; active: boolean; last: number; kind: 'arc' | 'hotspot' }
export interface HzEvent { kind: HazardKind; name?: string; year: number; cell: number; severity: number; towns: number[]; area?: number[]; ev?: number }
export interface Pending { year: number; kind: 'ash' | 'silt'; cells: number[]; name: string; town: number; state: number }
export interface Ash { cells: number[]; biomes: number[]; until: number }
export interface Outbreak {
	id: number;
	disease: string;
	name: string;
	since: number;
	cell: number;
	state: number;
	/** chronicle event that announced it */
	ev?: number;
	ended?: number;
	months: number;
	/** burg ids under quarantine */
	quarantined: number[];
	/** realms that already answered (so each response is logged once) */
	answered: number[];
	deaths: number;
}
/** per-realm response flags set yearly: q quarantine, med 0..3 (physicians → hospitals), proc processions, vax */
export interface Response { q?: boolean; med?: number; proc?: boolean; vax?: boolean }

export interface HzState {
	v: 1;
	faults: Fault[];
	volcanoes: Volcano[];
	recent: HzEvent[];
	counts: Record<string, number>;
	pending: Pending[];
	ash: Ash[];
	/** volcanic winter: degrees subtracted until `until` */
	veil: { dT: number; until: number; volcano: string } | null;
	/** cell → outbreak id */
	ob: Uint16Array;
	/** cell immunity 0..100 and the profile index + 1 it is against */
	imm: Uint8Array;
	immK: Uint8Array;
	outbreaks: Outbreak[];
	nextOb: number;
	resp: Record<number, Response>;
}

export const hzOn = (sim: Simulation) => sim.w.opts.hazards !== false;
export const hzRng = (sim: Simulation, ...tag: (string | number)[]): Rng => makeRng(`${sim.w.opts.seed}:hz:${tag.join(':')}`);

export function hz(sim: Simulation): HzState {
	const s = sim as unknown as { _hazardsState?: HzState };
	let st = s._hazardsState;
	if (!st) {
		const n = sim.c.n;
		st = { v: 1, faults: [], volcanoes: [], recent: [], counts: {}, pending: [], ash: [], veil: null, ob: new Uint16Array(n), imm: new Uint8Array(n), immK: new Uint8Array(n), outbreaks: [], nextOb: 1, resp: {} };
		s._hazardsState = st;
		computeGeology(sim, st);
	}
	return st;
}

/** a throwaway copy of a culture's naming language with its own stream: the sim's names never shift */
export function hzLang(sim: Simulation, culture: number, ...tag: (string | number)[]): Lang {
	const base = sim.lang(culture || 1);
	return {
		...base,
		morphemes: {},
		words: {},
		used: new Set(base.used),
		glosses: {},
		places: base.places.slice(),
		givenPool: { m: base.givenPool.m.slice(), f: base.givenPool.f.slice() },
		rng: makeRng(`${sim.w.opts.seed}:hz:lang:${culture}:${tag.join(':')}`)
	};
}

/** culture of the nearest land cell (water cells borrow the coast's) */
function cultureNear(sim: Simulation, cell: number): number {
	const c = sim.c;
	if (c.culture[cell]) return c.culture[cell];
	let best = 0, bd = Infinity;
	for (const b of sim.w.burgs) {
		if (!b.id || sim.burgLayer(b) !== 0) continue;
		const d = (b.x - c.x[cell]) ** 2 + (b.y - c.y[cell]) ** 2;
		if (d < bd) { bd = d; best = b.culture; }
	}
	return best || 1;
}

const FAULT_FORM = ['the {n} Fault', 'the {n} Rift', 'the {n} Scar', 'the {n} Fault', 'the {n} Fracture'];
const VOLC_FORM = ['Mount {n}', 'Mount {n}', '{n} Peak', 'the Fire of {n}', '{n} Crater', 'the {n} Cone'];

/**
 * Faults: connected runs of sharp-ridge or high-mountain cells, plus the steep coasts of large continents
 * (land cells beside deep water). Volcanoes: peaks of mountain arcs near the coast and a few hotspots
 * (island highs or random uplands). Volcanic planets get more of both. Pure (side rng) and never edits terrain.
 */
export function computeGeology(sim: Simulation, st: HzState) {
	const c = sim.c, n = c.n, w = sim.w;
	const r = hzRng(sim, 'geo');
	const volcanic = w.opts.planet === 'volcanic';
	const cand = new Uint8Array(n);
	const bigLand = new Set(w.features.filter((f) => f.land && f.type === 'continent' && f.cells >= n * 0.04).map((f) => f.id));
	for (let i = 0; i < n; i++) {
		if (c.h[i] < 20) continue;
		let ridge = 0, deep = false;
		const s = c.nStart[i], e = c.nStart[i + 1];
		for (let k = s; k < e; k++) {
			const j = c.nList[k];
			ridge = Math.max(ridge, Math.abs(c.h[i] - c.h[j]));
			if (c.h[j] < 12) deep = true;
		}
		if (c.h[i] >= 62 || ridge >= 16 || (c.dist[i] === 1 && deep && bigLand.has(c.feature[i]))) cand[i] = 1;
	}
	// connected runs, walked breadth-first and cut into segments so one long range holds several faults
	const comp = new Uint8Array(n);
	const segs: number[][] = [];
	for (let i = 0; i < n; i++) {
		if (!cand[i] || comp[i]) continue;
		const order: number[] = [];
		const queue = [i];
		comp[i] = 1;
		for (let q = 0; q < queue.length; q++) {
			const a = queue[q];
			order.push(a);
			for (let k = c.nStart[a]; k < c.nStart[a + 1]; k++) {
				const j = c.nList[k];
				if (cand[j] && !comp[j]) { comp[j] = 1; queue.push(j); }
			}
		}
		for (let k = 0; k < order.length; k += 40) {
			const seg = order.slice(k, k + 40);
			if (seg.length >= 8) segs.push(seg);
		}
	}
	const maxFaults = volcanic ? 10 : 7;
	const keep = r.shuffle(segs).slice(0, maxFaults);
	st.faults = keep.map((run, id) => {
		const cells = run;
		const mid = cells[Math.floor(cells.length / 2)];
		const L = hzLang(sim, cultureNear(sim, mid), 'fault', id);
		const nm = makeName(L, '');
		const offshore = cells.filter((x) => c.dist[x] === 1).length >= 3;
		return { id, name: (offshore && r.chance(0.4) ? 'the {n} Trench' : r.pick(FAULT_FORM)).replace('{n}', nm), cells, offshore, activity: 0.6 + r() * 0.9, last: 0 };
	});
	// volcanoes
	const vols: number[] = [];
	const minD2 = (w.opts.width / 14) ** 2;
	const farEnough = (i: number) => vols.every((v) => (c.x[v] - c.x[i]) ** 2 + (c.y[v] - c.y[i]) ** 2 > minD2);
	const peaks: number[] = [];
	for (let i = 0; i < n; i++) {
		if (c.h[i] < 58 || c.dist[i] > 6) continue;
		let top = true;
		for (let k = c.nStart[i]; k < c.nStart[i + 1]; k++) if (c.h[c.nList[k]] > c.h[i]) { top = false; break; }
		if (top) peaks.push(i);
	}
	const arcs = volcanic ? 8 : 3, hots = volcanic ? 5 : 2;
	for (const i of r.shuffle(peaks)) { if (vols.length >= arcs) break; if (farEnough(i)) vols.push(i); }
	const arcCount = vols.length;
	for (let t = 0; t < 400 && vols.length < arcCount + hots; t++) {
		const i = r.int(0, n - 1);
		if (c.h[i] < 35 || !farEnough(i)) continue;
		const isle = w.features[c.feature[i]]?.type === 'island';
		if (!isle && !r.chance(0.35)) continue;
		vols.push(i);
	}
	st.volcanoes = vols.map((cell, id) => {
		const L = hzLang(sim, cultureNear(sim, cell), 'volc', id);
		return { id, name: r.pick(VOLC_FORM).replace('{n}', makeName(L, '')), cell, active: r.chance(volcanic ? 0.7 : 0.45), last: 0, kind: id < arcCount ? 'arc' : 'hotspot' };
	});
}
