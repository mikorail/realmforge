/**
 * Economic sectors per settlement (and aggregated per realm): farming, industry, mining, trade,
 * crafts, scholarship, military, faith, seafaring. Initial mix from terrain, species, culture traits,
 * religion and genre; drifts slowly each year (O(burgs)). Realm shares relative to the world mean
 * become small multipliers read by existing systems. `GenOptions.sectors === false` leaves
 * `sim.sectors` undefined and every hook returns its neutral value.
 */
import type { Simulation } from './engine';
import type { Burg, World } from '../gen/types';
import { makeRng } from '../rng';
import { cultureProfile, type TraitKey } from './culture/profile';

export const SECTORS = ['farming', 'industry', 'mining', 'trade', 'crafts', 'scholarship', 'military', 'faith', 'seafaring'] as const;
export type SectorKey = (typeof SECTORS)[number];
const K = SECTORS.length;
const IX = Object.fromEntries(SECTORS.map((s, i) => [s, i])) as Record<SectorKey, number>;

export const SECTOR_INFO: Record<SectorKey, { name: string; icon: string; color: string; centre: string }> = {
	farming: { name: 'Farming', icon: '🌾', color: '#9bbf3b', centre: 'a breadbasket of the realm' },
	industry: { name: 'Industry', icon: '⚙', color: '#8a8f99', centre: 'a city of forges and workshops' },
	mining: { name: 'Mining', icon: '⛏', color: '#9c6b3f', centre: 'a mining town' },
	trade: { name: 'Trade', icon: '⚖', color: '#e0a32e', centre: 'a great market town' },
	crafts: { name: 'Crafts & arts', icon: '🎨', color: '#c45fa0', centre: 'a city of artisans' },
	scholarship: { name: 'Scholarship', icon: '📜', color: '#4f7fd6', centre: 'a city of scholars' },
	military: { name: 'Military', icon: '⚔', color: '#c0392b', centre: 'a garrison city' },
	faith: { name: 'Faith', icon: '🕯', color: '#7a5cc4', centre: 'a holy city' },
	seafaring: { name: 'Seafaring', icon: '⛵', color: '#2a9fb0', centre: 'a port of shipwrights and sailors' }
};

/** per-realm multipliers, in this order inside `mods` */
const M_GROWTH = 0, M_INCOME = 1, M_ARMY = 2, M_CONV = 3, M_NAVAL = 4, M_STAB = 5, M_FAMINE = 6, M = 7;
const NEUTRAL = [1, 1, 1, 1, 1, 0, 0];

export interface SectorState {
	/** burg capacity (arrays are n × K) */
	n: number;
	/** static affinity from terrain/species/culture/faith/genre, sums to 1 */
	base: Float32Array;
	/** current weights, sums to 1 */
	w: Float32Array;
	/** burg pop last year (disaster detection) */
	lastPop: Float32Array;
	/** announced centre sector per burg (255 = none) */
	known: Uint8Array;
	/** polity capacity of the realm arrays */
	pn: number;
	/** policy pushes per polity × K, decay yearly */
	push: Float32Array;
	/** pop-weighted realm share per polity × K */
	realm: Float32Array;
	/** world pop-weighted mean share per sector */
	world: Float32Array;
	/** per polity × M multipliers (see M_*) */
	mods: Float64Array;
}

// ───────────── initial mix ─────────────
type Aff = Partial<Record<SectorKey, number>>;
const BIOME_AFF: Record<number, Aff> = {
	1: { trade: 0.6, mining: 0.4 }, 2: { mining: 0.5, trade: 0.3 }, 3: { farming: 1.2 }, 4: { farming: 1.6 }, 5: { farming: 1.3 },
	6: { farming: 1.5, crafts: 0.2 }, 7: { farming: 0.6, crafts: 0.3 }, 8: { farming: 0.7, crafts: 0.3 }, 9: { mining: 0.5, military: 0.3 },
	10: { mining: 0.5 }, 11: { mining: 0.4, faith: 0.3 }, 12: { farming: 0.6 }, 13: { mining: 1 }, 14: { mining: 0.8, scholarship: 0.4 },
	15: { farming: 0.6, crafts: 0.3 }, 16: { mining: 1.1 }
};
const SPECIES_AFF: Record<string, Aff> = {
	dwarf: { mining: 1.2, crafts: 0.8 }, elf: { crafts: 0.8, scholarship: 0.8 }, orc: { military: 1.2 }, troll: { military: 0.8, mining: 0.4 },
	beastman: { farming: 0.5, military: 0.6 }, halfling: { farming: 1.2, crafts: 0.4 }, giant: { mining: 0.6, military: 0.6 }, goblin: { industry: 0.8, mining: 0.4 },
	saurian: { military: 0.5, faith: 0.5 }, merfolk: { seafaring: 1.5 }, celestial: { scholarship: 1, faith: 1 }, ratfolk: { industry: 1, trade: 0.4 },
	lizardfolk: { faith: 0.6, farming: 0.4 }, tomb_undead: { faith: 1, crafts: 0.4 }, ogor: { military: 1 }, void_elf: { scholarship: 0.8, military: 0.4 },
	warp_fiend: { military: 0.8, faith: 0.6 }, chitin_swarm: { industry: 0.6, farming: 0.6 }
};
const TRAIT_AFF: Record<TraitKey, Aff> = {
	seafaring: { seafaring: 1 }, martial: { military: 1 }, mercantile: { trade: 1 }, ancestral: { crafts: 0.6, farming: 0.4 }, pious: { faith: 1 },
	scholarly: { scholarship: 1 }, nomadic: { military: 0.5, farming: 0.5 }, insular: { farming: 0.5, mining: 0.4 }
};
const DOCTRINE_AFF: Record<string, Aff> = {
	militant: { military: 0.6, faith: 0.4 }, evangelical: { faith: 0.8 }, compassion: { farming: 0.3, faith: 0.4 }, esoteric: { scholarship: 0.6 },
	caste: { crafts: 0.4, farming: 0.3 }, liberation: { trade: 0.3, crafts: 0.3 }, ancestral: { crafts: 0.4, faith: 0.3 }
};
const GENRE_AFF: Record<string, Aff> = {
	steampunk: { industry: 1.2, mining: 0.5 }, dieselpunk: { industry: 1.5, military: 0.5 }, atompunk: { industry: 1, scholarship: 0.8 },
	cyberpunk: { trade: 1, industry: 0.8, scholarship: 0.4 }, biopunk: { scholarship: 0.8, farming: 0.6 }, solarpunk: { farming: 0.8, crafts: 0.6, scholarship: 0.5 },
	wasteland: { military: 0.8, mining: 0.6, crafts: 0.4 }, twilight: { faith: 0.9, military: 0.5, scholarship: 0.3 },
	mythic: { faith: 1, military: 0.3 }, fantasy: { crafts: 0.3, faith: 0.2 }
};

function baseMix(w: World, b: Burg, out: Float32Array, o: number) {
	const sc = new Float64Array(K).fill(0.35);
	const add = (a?: Aff, f = 1) => { if (a) for (const k in a) sc[IX[k as SectorKey]] += a[k as SectorKey]! * f; };
	const c = w.cells, i = b.cell;
	if (b.layer === 'surface') {
		add(BIOME_AFF[c.biome[i]]);
		const h = c.h[i];
		if (h > 60) { sc[IX.mining] += 1.5; sc[IX.farming] -= 0.4; } else if (h > 45) sc[IX.mining] += 0.8;
		if (b.port) { sc[IX.seafaring] += 1.6; sc[IX.trade] += 0.6; } else if (c.dist[i] === 1) sc[IX.seafaring] += 0.7;
		if (c.river[i]) { sc[IX.trade] += 0.6; sc[IX.farming] += 0.5; }
		const rel = w.religions[c.religion[i]];
		if (rel) {
			if (rel.doctrine) add(DOCTRINE_AFF[rel.doctrine]);
			if (rel.type === 'Organized') sc[IX.faith] += 0.3;
			else if (rel.type === 'Cult') sc[IX.faith] += 0.5;
		}
	} else if (b.layer === 'deep') add({ mining: 2, crafts: 0.6 });
	else if (b.layer === 'sky') add({ scholarship: 1, trade: 0.6, faith: 0.4 });
	else if (b.layer === 'sea') add({ seafaring: 2, trade: 0.5 });
	const cu = w.cultures[b.culture];
	if (cu) {
		add(SPECIES_AFF[cu.species ?? 'human']);
		for (const t of cultureProfile(w, b.culture).traits) add(TRAIT_AFF[t]);
	}
	add(GENRE_AFF[w.opts.genre]);
	const size = Math.log10(Math.max(1, b.pop));
	add({ trade: 0.35, crafts: 0.3, scholarship: 0.25, industry: 0.2 }, size);
	sc[IX.farming] += Math.max(0, 1 - size) * 0.6;
	if (b.capital) add({ military: 0.5, trade: 0.4, scholarship: 0.3 });
	let tot = 0;
	for (let k = 0; k < K; k++) { sc[k] = Math.max(0.05, sc[k]); tot += sc[k]; }
	for (let k = 0; k < K; k++) out[o + k] = sc[k] / tot;
}

function growBurgs(st: SectorState, w: World) {
	const n = w.burgs.length;
	if (n <= st.n) return;
	const grow = <T extends Float32Array | Uint8Array>(a: T, size: number, fill = 0): T => {
		const b = new (a.constructor as any)(size) as T;
		b.fill(fill);
		b.set(a);
		return b;
	};
	st.base = grow(st.base, n * K);
	st.w = grow(st.w, n * K);
	st.lastPop = grow(st.lastPop, n);
	st.known = grow(st.known, n, 255);
	for (let id = st.n; id < n; id++) initBurg(st, w, id);
	st.n = n;
}

function initBurg(st: SectorState, w: World, id: number) {
	const b = w.burgs[id];
	if (!b || !b.id) return;
	baseMix(w, b, st.base, id * K);
	st.w.set(st.base.subarray(id * K, id * K + K), id * K);
	st.lastPop[id] = b.pop;
	const top = topOf(st.w, id * K);
	st.known[id] = st.w[id * K + top] >= CENTRE ? top : 255;
}

function growPolities(st: SectorState, np: number) {
	if (np <= st.pn) return;
	const push = new Float32Array(np * K); push.set(st.push);
	const realm = new Float32Array(np * K); realm.set(st.realm);
	const mods = new Float64Array(np * M);
	mods.set(st.mods);
	for (let p = st.pn; p < np; p++) for (let m = 0; m < M; m++) mods[p * M + m] = NEUTRAL[m];
	Object.assign(st, { push, realm, mods, pn: np });
}

const CENTRE = 0.3;

function topOf(a: Float32Array, o: number) {
	let t = 0;
	for (let k = 1; k < K; k++) if (a[o + k] > a[o + t]) t = k;
	return t;
}

/** builds the initial state (also used to derive it for old saves); undefined when the toggle is off */
export function initSectors(sim: Simulation): SectorState | undefined {
	if (sim.w.opts.sectors === false) return undefined;
	const st: SectorState = {
		n: 0, base: new Float32Array(0), w: new Float32Array(0), lastPop: new Float32Array(0), known: new Uint8Array(0),
		pn: 0, push: new Float32Array(0), realm: new Float32Array(0), world: new Float32Array(K), mods: new Float64Array(0)
	};
	growBurgs(st, sim.w);
	growPolities(st, sim.polities.length);
	aggregate(sim, st);
	return st;
}

// ───────────── yearly ─────────────
/** O(burgs × K): drift each burg toward its target mix, then re-aggregate realms and their multipliers */
export function yearlySectors(sim: Simulation) {
	const st = sim.sectors;
	if (!st) return;
	const w = sim.w;
	growBurgs(st, w);
	const np = sim.polities.length;
	growPolities(st, np);
	const atWar = new Uint8Array(np);
	for (const war of sim.wars) if (!war.end) { for (const a of war.attackers) if (a < np) atWar[a] = 1; for (const d of war.defenders) if (d < np) atWar[d] = 1; }
	const era = Math.min(5, sim.era);
	const t = new Float64Array(K);
	for (const b of w.burgs) {
		if (!b.id || !b.alive) continue;
		const o = b.id * K;
		for (let k = 0; k < K; k++) t[k] = st.base[o + k];
		t[IX.industry] += 0.04 * era;
		t[IX.scholarship] += 0.02 * era;
		t[IX.farming] -= 0.02 * era;
		const s = b.state;
		if (s && s < np) {
			if (atWar[s]) { t[IX.military] += 0.12; t[IX.farming] -= 0.05; t[IX.trade] -= 0.03; }
			for (let k = 0; k < K; k++) t[k] += st.push[s * K + k];
		}
		if (b.layer === 'surface' && sim.plague[b.cell] > 0.05) { t[IX.faith] += 0.08; t[IX.trade] -= 0.05; }
		if (b.pop < st.lastPop[b.id] * 0.85) { t[IX.faith] += 0.06; t[IX.crafts] -= 0.03; t[IX.farming] -= 0.03; }
		st.lastPop[b.id] = b.pop;
		if (b.tradeLeague) t[IX.trade] += 0.1;
		if (b.districts) {
			const d = b.districts;
			t[IX.trade] += 0.03 * (d.market ?? 0);
			t[IX.scholarship] += 0.04 * (d.academy ?? 0);
			t[IX.faith] += 0.03 * (d.temple ?? 0);
			t[IX.farming] += 0.03 * (d.granary ?? 0);
			t[IX.military] += 0.02 * (d.walls ?? 0);
		}
		let tot = 0;
		for (let k = 0; k < K; k++) { t[k] = Math.max(0.02, t[k]); tot += t[k]; }
		let sum = 0;
		for (let k = 0; k < K; k++) { st.w[o + k] += (t[k] / tot - st.w[o + k]) * 0.06; sum += st.w[o + k]; }
		for (let k = 0; k < K; k++) st.w[o + k] /= sum;
	}
	for (let k = 0; k < st.push.length; k++) st.push[k] *= 0.9;
	aggregate(sim, st);
	effects(sim, st);
	announce(sim, st);
}

const clampN = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);

function aggregate(sim: Simulation, st: SectorState) {
	const np = Math.min(sim.polities.length, st.pn);
	st.realm.fill(0);
	const tot = new Float64Array(np);
	const world = new Float64Array(K);
	let wt = 0;
	for (const b of sim.w.burgs) {
		if (!b.id || !b.alive || !b.state || b.state >= np) continue;
		const o = b.id * K, s = b.state, p = Math.max(0.2, b.pop);
		for (let k = 0; k < K; k++) { st.realm[s * K + k] += st.w[o + k] * p; world[k] += st.w[o + k] * p; }
		tot[s] += p;
		wt += p;
	}
	for (let k = 0; k < K; k++) st.world[k] = wt ? world[k] / wt : 1 / K;
	for (let s = 0; s < np; s++) {
		if (!tot[s]) { for (let k = 0; k < K; k++) st.realm[s * K + k] = st.world[k]; continue; }
		for (let k = 0; k < K; k++) st.realm[s * K + k] /= tot[s];
	}
	for (let s = 0; s < np; s++) {
		const r = (k: number) => clampN((st.realm[s * K + k] - st.world[k]) / Math.max(0.02, st.world[k]), -1, 1.5);
		const o = s * M;
		if (!s) { for (let m = 0; m < M; m++) st.mods[o + m] = NEUTRAL[m]; continue; }
		const fa = r(IX.farming), mi = r(IX.mining), tr = r(IX.trade), ind = r(IX.industry), mil = r(IX.military);
		st.mods[o + M_GROWTH] = clampN(1 + 0.1 * fa, 0.92, 1.12);
		st.mods[o + M_INCOME] = clampN(1 + 0.06 * mi + 0.06 * tr + (mi > 0 && ind > 0 ? 0.03 * Math.min(mi, ind) : 0), 0.9, 1.15);
		st.mods[o + M_ARMY] = clampN(1 + 0.07 * mil + 0.04 * ind, 0.9, 1.15);
		st.mods[o + M_CONV] = clampN(1 - 0.2 * r(IX.faith), 0.75, 1.15);
		st.mods[o + M_NAVAL] = clampN(1 + 0.06 * r(IX.seafaring), 0.94, 1.1);
		st.mods[o + M_STAB] = clampN(2.5 * r(IX.crafts) + 1.5 * r(IX.faith), -3, 4);
		st.mods[o + M_FAMINE] = 0.06 * clampN(fa, 0, 1.5);
	}
}

/** effects that belong to this module: scholarship nudges innovation (through the ×0.16 guard), crafts bring renown */
function effects(sim: Simulation, st: SectorState) {
	const np = Math.min(sim.polities.length, st.pn);
	let extra = 0;
	for (let s = 1; s < np; s++) {
		const p = sim.polities[s];
		if (!p.alive) continue;
		const rs = (st.realm[s * K + IX.scholarship] - st.world[IX.scholarship]) / Math.max(0.02, st.world[IX.scholarship]);
		extra += clampN(0.15 * rs, -0.3, 0.3);
		if (sim.year % 5 === 0 && st.realm[s * K + IX.crafts] > st.world[IX.crafts] * 1.4) {
			const ruler = sim.people[p.ruler];
			if (ruler?.alive) ruler.renown += 2;
		}
	}
	if (extra) sim.gainInnovation(clampN(extra, -0.5, 0.5));
}

/** at most one chronicle line a year, when a sizeable town's dominant sector becomes a new specialty */
function announce(sim: Simulation, st: SectorState) {
	let pick = -1, pickTop = 0, best = 0;
	for (const b of sim.w.burgs) {
		if (!b.id || !b.alive || b.pop < 8) continue;
		const o = b.id * K, top = topOf(st.w, o), v = st.w[o + top];
		if (v < CENTRE || st.known[b.id] === top) continue;
		if (v > best) { best = v; pick = b.id; pickTop = top; }
	}
	if (pick < 0) return;
	const rng = makeRng(`${sim.w.opts.seed}:sectors:${sim.year}`);
	st.known[pick] = pickTop;
	if (!rng.chance(0.5)) return;
	const b = sim.w.burgs[pick];
	const pol = sim.polities[b.state];
	const where = pol?.alive && pol.id ? ` of ${pol.name}` : '';
	sim.log('culture', `${b.name}${where} is now known far and wide as ${SECTOR_INFO[SECTORS[pickTop]].centre}.`, b.cell, b.state || undefined);
}

// ───────────── hooks other systems call ─────────────
/** policy hook: a ruler or motive pushes a sector in every town of the realm (amount ≈ 0.05 to 0.3; decays 10%/yr) */
export function pushSector(sim: Simulation, polityId: number, sector: SectorKey, amount: number) {
	const st = sim.sectors;
	if (!st || !polityId || !sim.polities[polityId]) return;
	growPolities(st, sim.polities.length);
	const j = polityId * K + IX[sector];
	st.push[j] = clampN(st.push[j] + amount, -0.5, 0.5);
}

function mod(sim: Simulation, id: number, m: number): number {
	const st = sim.sectors;
	if (!st || !id || id >= st.pn) return NEUTRAL[m];
	return st.mods[id * M + m];
}
/** farming: multiplier on natural population growth (per state id) */
export const sectorGrowth = (sim: Simulation, id: number) => mod(sim, id, M_GROWTH);
/** mining + trade (+ mining/industry synergy): multiplier on tax income */
export const sectorIncome = (sim: Simulation, id: number) => mod(sim, id, M_INCOME);
/** military + industry: multiplier on the army target */
export const sectorArmy = (sim: Simulation, id: number) => mod(sim, id, M_ARMY);
/** faith: multiplier on the chance the realm converts its state faith */
export const sectorConversion = (sim: Simulation, id: number) => mod(sim, id, M_CONV);
/** seafaring: multiplier on military strength */
export const sectorNaval = (sim: Simulation, id: number) => mod(sim, id, M_NAVAL);
/** crafts + faith: points added to the stability drift target */
export const sectorStability = (sim: Simulation, id: number) => mod(sim, id, M_STAB);
/** farming: fraction of a famine's loss avoided (0 when off) */
export const sectorFamineRelief = (sim: Simulation, id: number) => mod(sim, id, M_FAMINE);

/** trade weight of one town vs the world: multiplier on league dividends and market yields */
export function burgTradeMult(sim: Simulation, b: Burg): number {
	const st = sim.sectors;
	if (!st || !b.id || b.id >= st.n) return 1;
	return clampN(1 + 1.5 * (st.w[b.id * K + IX.trade] - st.world[IX.trade]), 0.85, 1.25);
}

/** growth multiplier per state id (null when off), for the per-cell demographics loop */
export function growthTable(sim: Simulation): Float64Array | null {
	const st = sim.sectors;
	if (!st) return null;
	const g = new Float64Array(st.pn);
	for (let s = 0; s < st.pn; s++) g[s] = st.mods[s * M + M_GROWTH];
	return g;
}

// ───────────── UI helpers ─────────────
export function burgMix(sim: Simulation, burgId: number): number[] | null {
	const st = sim.sectors;
	if (!st || !burgId || burgId >= st.n) return null;
	return Array.from(st.w.subarray(burgId * K, burgId * K + K));
}
export function realmMix(sim: Simulation, polityId: number): number[] | null {
	const st = sim.sectors;
	if (!st || !polityId || polityId >= st.pn) return null;
	return Array.from(st.realm.subarray(polityId * K, polityId * K + K));
}
export function dominantSector(sim: Simulation, burgId: number): number {
	const st = sim.sectors;
	if (!st || !burgId || burgId >= st.n) return -1;
	return topOf(st.w, burgId * K);
}
/** sectors where the realm stands well above the world mean, strongest first */
export function specialities(sim: Simulation, polityId: number): SectorKey[] {
	const st = sim.sectors;
	if (!st || !polityId || polityId >= st.pn) return [];
	const out: [SectorKey, number][] = [];
	for (let k = 0; k < K; k++) {
		const r = st.realm[polityId * K + k] / Math.max(0.02, st.world[k]);
		if (r >= 1.25) out.push([SECTORS[k], r]);
	}
	return out.sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
}
/** top sectors of a town with share, for one-line summaries */
export function burgSummary(sim: Simulation, burgId: number, n = 3): { key: SectorKey; share: number }[] {
	const mix = burgMix(sim, burgId);
	if (!mix) return [];
	return mix.map((share, k) => ({ key: SECTORS[k], share })).sort((a, b) => b.share - a.share).slice(0, n);
}

/** restore helper: keep saved state, or derive it for saves made before sectors existed */
export function restoreSectors(sim: Simulation, saved: SectorState | undefined): SectorState | undefined {
	if (sim.w.opts.sectors === false) return undefined;
	if (!saved) return initSectors(sim);
	return saved;
}
