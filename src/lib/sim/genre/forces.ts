/**
 * Genre forces: pressures that belong to one voice of the age (FORCES in forcelines.ts).
 * A force is active while `sim.voice` is one of its voices, so evolving worlds pick forces up
 * and drop them as eras change, and age-locked worlds keep theirs. Called once a year from
 * `engine.yearly()`. Draws only from a side rng (`seed:gf:year`), never `sim.rng`.
 * `GenOptions.genreForces` = 0 turns it off (no state changes at all), unset = 1, up to 2.
 */
import type { Simulation } from '../engine';
import type { Monster, Polity } from '../types';
import { clamp, makeRng, type Rng } from '../../rng';
import { neighbors } from '../../gen/grid';
import { burgMix, realmMix } from '../sectors';
import { cellsByState } from '../indexes';
import { isWonderStanding } from '../wonders';
import { CORP_SUFFIXES, FORCE_FADE, FORCE_KEYS, FORCE_RISE, FORCES, LEY_BEAST_STATS, LEY_BEASTS, forceLine, type ForceKey } from './forcelines';

export interface FalloutZone { cells: number[]; core: number[]; bio: number[]; state: number; by: number; from: number; until: number; town: string }
export interface ArmsRace { a: number; b: number; since: number }
export interface Megacorp { id: number; name: string; hq: number; host: number; wealth: number; influence: number; captured: number; founded: number; alive: boolean }
export interface Leyline { a: number; la: number; b: number; lb: number; an: string; bn: string; draw: number; bound: number }
export interface GenreForceState {
	active: ForceKey[];
	/** burg ids already announced as smog-choked */
	smog: number[];
	/** polity id → last strike year */
	strikes: Record<number, number>;
	/** war ids whose mobilisation was announced */
	mob: number[];
	races: ArmsRace[];
	fallout: FalloutZone[];
	lastFallout: number;
	corps: Megacorp[];
	nextCorp: number;
	lastCorpWar: number;
	/** polity id → year its commons charter began */
	commons: Record<number, number>;
	leys: Leyline[];
	leyBuilt: number;
	/** monster id of the living ley beast (0 = none) */
	leyBeast: number;
	/** polity id → gene vat strain 0..1+ */
	vats: Record<number, number>;
	/** set after the first yearly pass, so the forces a world starts with are not announced */
	seen?: boolean;
}

export function newForces(): GenreForceState {
	return { active: [], smog: [], strikes: {}, mob: [], races: [], fallout: [], lastFallout: -99, corps: [], nextCorp: 1, lastCorpWar: -99, commons: {}, leys: [], leyBuilt: -99, leyBeast: 0, vats: {} };
}

export function restoreForces(d: Partial<GenreForceState> | undefined): GenreForceState {
	return { ...newForces(), ...(d ?? {}) };
}

export function forceStrength(sim: Simulation): number {
	const g = sim.w.opts.genreForces;
	return g === undefined || g === null ? 1 : clamp(Number(g) || 0, 0, 2);
}

/** forces of the current voice (empty when the toggle is off) */
export function activeForces(sim: Simulation): ForceKey[] {
	if (!forceStrength(sim)) return [];
	return FORCE_KEYS.filter((k) => FORCES[k].voices.includes(sim.voice));
}

const IND = 1, TRADE = 3, FARM = 0, SCHOL = 5;
const alive = (p: Polity | undefined): p is Polity => !!p && p.alive && !!p.id;

/** realm sector share relative to the world mean (1 = average; 1 when sectors are off) */
function realmRel(sim: Simulation, id: number, k: number): number {
	const mix = realmMix(sim, id);
	const world = sim.sectors?.world;
	if (!mix || !world) return 1;
	return mix[k] / Math.max(0.02, world[k]);
}

export function yearlyGenreForces(sim: Simulation) {
	const s = forceStrength(sim);
	if (!s) return;
	const gf = sim.gf;
	const rng = makeRng(`${sim.w.opts.seed}:gf:${sim.year}`);
	const act = activeForces(sim);
	const on = (k: ForceKey) => act.includes(k);
	turnOver(sim, gf, act);
	if (on('smog')) smog(sim, s, rng);
	if (on('strikes')) strikes(sim, s, rng);
	if (on('wareconomy')) warEconomy(sim, s, rng);
	if (on('armsrace')) armsRace(sim, s, rng);
	if (on('fallout')) falloutStrike(sim, s, rng);
	healFallout(sim, rng); // zones keep healing after the atomic age ends
	if (on('megacorps')) megacorps(sim, s, rng);
	if (on('commons')) commons(sim, s, rng);
	if (on('leylines')) leylines(sim, s, rng);
	if (on('genevats')) geneVats(sim, s, rng);
}

/** announce forces the voice brings in or takes away; clear the state of forces that left */
function turnOver(sim: Simulation, gf: GenreForceState, act: ForceKey[]) {
	const rose = act.filter((k) => !gf.active.includes(k));
	const fell = gf.active.filter((k) => !act.includes(k));
	gf.active = act.slice();
	const tell = gf.seen;
	gf.seen = true;
	if (tell && rose.length) sim.log('tech', `A new force stirs in ${sim.w.name}: ${rose.map((k) => FORCE_RISE[k]).join('; ')}.`);
	if (tell && fell.length) sim.log('tech', `The age turns in ${sim.w.name}: ${fell.map((k) => FORCE_FADE[k]).join('; ')}.`);
	for (const k of fell) {
		if (k === 'armsrace') gf.races = [];
		if (k === 'megacorps') for (const c of gf.corps) { c.alive = false; c.captured = 0; }
		if (k === 'commons') gf.commons = {};
		if (k === 'leylines') { gf.leys = []; gf.leyBuilt = -99; }
		if (k === 'genevats') gf.vats = {};
	}
}

// ───────────── steam / diesel ─────────────
function smog(sim: Simulation, s: number, rng: Rng) {
	const c = sim.c, gf = sim.gf;
	const hit = new Map<number, number>();
	let pick = -1, best = 0.6;
	for (const b of sim.w.burgs) {
		if (!b.id || !b.alive || b.pop < 5 || sim.burgLayer(b) !== 0) continue;
		const mix = burgMix(sim, b.id);
		const ind = mix ? mix[IND] : 0.22;
		const level = clamp(((ind - 0.12) * 4 * Math.log10(b.pop + 1)) / 2, 0, 1);
		if (level < 0.15) continue;
		c.pop[b.cell] *= 1 - 0.01 * level * s;
		for (const j of neighbors(c, b.cell)) if (c.pop[j] > 0) c.pop[j] *= 1 - 0.005 * level * s;
		if (b.state) hit.set(b.state, (hit.get(b.state) ?? 0) + 0.4 * level * s);
		if (level > best && !gf.smog.includes(b.id)) { best = level; pick = b.id; }
	}
	for (const [id, h] of hit) {
		const p = sim.polities[id];
		if (alive(p)) p.stability = Math.max(5, p.stability - Math.min(3, h));
	}
	if (pick > 0) {
		gf.smog.push(pick);
		if (gf.smog.length > 300) gf.smog.shift();
		const b = sim.w.burgs[pick];
		const p = sim.polities[b.state];
		if (rng.chance(0.5)) sim.log('eco_disaster', forceLine('smog', rng, { town: b.name, realm: alive(p) ? p.name : 'the free lands' }), b.cell, b.state || undefined);
	}
}

function strikes(sim: Simulation, s: number, rng: Rng) {
	const gf = sim.gf;
	const realms = sim.polities.filter((p) => alive(p) && p.cells > 0);
	const scale = Math.min(1, 10 / Math.max(1, realms.length));
	let n = 0;
	for (const p of realms) {
		if (n >= 2) break;
		if ((gf.strikes[p.id] ?? -99) + 8 > sim.year || (sim.unrestUntil.get(p.id) ?? 0) > sim.year || p.stability > 55) continue;
		const ind = realmRel(sim, p.id, IND);
		if (ind < 1.1 || !rng.chance(0.06 * s * ind * scale)) continue;
		const towns = sim.idx.burgsIn(sim.w.burgs, p.id).filter((b) => b.id && b.alive && b.state === p.id);
		if (!towns.length) continue;
		let town = towns[0], top = -1;
		for (const b of towns) { const m = burgMix(sim, b.id); const v = (m ? m[IND] : 0.2) * b.pop; if (v > top) { top = v; town = b; } }
		n++;
		gf.strikes[p.id] = sim.year;
		sim.unrestUntil.set(p.id, sim.year + rng.int(3, 7));
		p.treasury = Math.max(0, p.treasury - Math.min(Math.max(0, p.treasury), 6 + Math.max(0, p.treasury) * 0.08 * s));
		p.stability = Math.max(5, p.stability - rng.int(3, 6) * s);
		town.pop = +Math.max(0.2, town.pop * 0.98).toFixed(2);
		const rec = { id: sim.uprisings.length + 1, kind: 'riot' as const, subtype: 'factory_strike', title: `Strike at ${town.name}`, burgId: town.id, burgName: town.name, stateId: p.id, stateName: p.name, year: sim.year, cell: town.cell, description: `Workers of ${town.name} walk out of the factories.`, active: true };
		sim.uprisings.push(rec);
		sim.log('uprising', forceLine('strike', rng, { town: town.name, realm: p.name }), town.cell, p.id);
		// a strike in a realm already on the brink can tip into revolt
		if (p.stability <= 15 && p.cells >= 10 && towns.length > 1 && rng.chance(0.2)) sim.revolt(p, town.cell);
	}
}

function warEconomy(sim: Simulation, s: number, rng: Rng) {
	const gf = sim.gf;
	const seen = new Set<number>();
	for (const w of sim.wars) {
		if (w.end) continue;
		for (const id of [...w.attackers, ...w.defenders]) {
			if (seen.has(id)) continue;
			seen.add(id);
			const p = sim.polities[id];
			if (!alive(p)) continue;
			const f = clamp(realmRel(sim, id, IND), 0.6, 1.5);
			p.army *= 1 + 0.02 * s * f;
			p.treasury -= Math.max(0, p.treasury) * 0.03 * s;
			p.stability = Math.max(5, p.stability - 0.5 * s);
		}
		if (!gf.mob.includes(w.id) && w.months >= 12) {
			gf.mob.push(w.id);
			if (gf.mob.length > 200) gf.mob.shift();
			const p = sim.polities[w.attackers[0]];
			if (!alive(p) || !rng.chance(0.15)) continue;
			const cap = sim.w.burgs[p.capital];
			sim.log('war', forceLine('mobilise', rng, { realm: p.name, town: cap?.name ?? p.name }), cap?.cell, p.id);
		}
	}
}

// ───────────── atom ─────────────
function armsRace(sim: Simulation, s: number, rng: Rng) {
	const gf = sim.gf;
	gf.races = gf.races.filter((r) => {
		const a = sim.polities[r.a], b = sim.polities[r.b];
		if (!alive(a) || !alive(b)) return false;
		if (sim.rel(r.a, r.b) > -10 || sim.year - r.since > 40) {
			sim.log('peace', forceLine('race.end', rng, { realm: a.name, other: b.name }), sim.w.burgs[a.capital]?.cell, a.id);
			return false;
		}
		for (const p of [a, b]) {
			p.treasury -= Math.max(0, p.treasury) * 0.04 * s + s;
			p.army *= 1 + 0.025 * s;
		}
		return true;
	});
	if (gf.races.length >= 4 || !rng.chance(0.3 * s)) return;
	let best: [number, number] | null = null, top = 0;
	for (const k of sim.borders.keys()) {
		const [a, b] = k.split('-').map(Number);
		const pa = sim.polities[a], pb = sim.polities[b];
		if (!alive(pa) || !alive(pb) || sim.rel(a, b) > -35) continue;
		if (gf.races.some((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a))) continue;
		const v = pa.army + pb.army;
		if (v > top) { top = v; best = [a, b]; }
	}
	if (!best || top < 8) return;
	gf.races.push({ a: best[0], b: best[1], since: sim.year });
	const pa = sim.polities[best[0]], pb = sim.polities[best[1]];
	sim.log('war', forceLine('race.start', rng, { realm: pa.name, other: pb.name }), sim.w.burgs[pa.capital]?.cell, pa.id);
}

function falloutStrike(sim: Simulation, s: number, rng: Rng) {
	const gf = sim.gf, c = sim.c;
	if (gf.fallout.length >= 12 || sim.year - gf.lastFallout < 3) return;
	for (const w of sim.wars) {
		if (w.end || w.months < 12 || !rng.chance(0.06 * s)) continue;
		const flip = rng.chance(0.5);
		const by = sim.polities[flip ? w.attackers[0] : w.defenders[0]];
		const tgt = sim.polities[flip ? w.defenders[0] : w.attackers[0]];
		if (!alive(by) || !alive(tgt)) continue;
		const from = sim.w.burgs[by.capital];
		const towns = sim.idx.burgsIn(sim.w.burgs, tgt.id).filter((b) => b.id && b.alive && b.state === tgt.id && sim.burgLayer(b) === 0);
		if (!towns.length || !from) continue;
		let town = towns[0], d = Infinity;
		for (const b of towns) { const dd = (b.x - from.x) ** 2 + (b.y - from.y) ** 2; if (dd < d) { d = dd; town = b; } }
		// blast: ring 1 turns to ash, ring 2 is poisoned
		const core = [town.cell, ...Array.from(neighbors(c, town.cell)).filter((j) => sim.isLand(j))];
		const ring = new Set(core);
		for (const i of core) for (const j of neighbors(c, i)) if (sim.isLand(j)) ring.add(j);
		const zone: FalloutZone = { cells: [...ring], core, bio: core.map((i) => c.biome[i]), state: tgt.id, by: by.id, from: sim.year, until: sim.year + 40, town: town.name };
		for (const i of zone.cells) c.pop[i] *= 0.5;
		for (const i of core) c.biome[i] = 13;
		gf.fallout.push(zone);
		gf.lastFallout = sim.year;
		town.pop = +Math.max(0.2, town.pop * 0.6).toFixed(2);
		tgt.stability = Math.max(5, tgt.stability - 8 * s);
		sim.addRel(by.id, tgt.id, -20);
		for (const nb of sim.neighborsOf(by.id)) if (nb !== tgt.id) sim.addRel(by.id, nb, -4);
		sim.dirty.terrain = true;
		sim.log('disaster', forceLine('fallout', rng, { town: town.name, realm: tgt.name, other: by.name }), town.cell, tgt.id);
		return;
	}
}

function healFallout(sim: Simulation, rng: Rng) {
	const gf = sim.gf, c = sim.c;
	if (!gf.fallout.length) return;
	gf.fallout = gf.fallout.filter((z) => {
		if (sim.year >= z.until) {
			for (let k = 0; k < z.core.length; k++) if (c.biome[z.core[k]] === 13) c.biome[z.core[k]] = z.bio[k];
			sim.dirty.terrain = true;
			if (rng.chance(0.5)) sim.log('eco_disaster', forceLine('fallout.clear', rng, { town: z.town }), z.core[0], c.state[z.core[0]] || undefined);
			return false;
		}
		// poisoned land holds few people; the cap lifts as the zone heals (also survives a climate re-run)
		const f = 0.3 + 0.7 * ((sim.year - z.from) / (z.until - z.from));
		for (const i of z.cells) c.pop[i] = Math.min(c.pop[i], sim.basePop[i] * f);
		for (let k = 0; k < z.core.length; k++) {
			const i = z.core[k];
			if (c.biome[i] !== 13 && sim.isLand(i)) { z.bio[k] = c.biome[i]; c.biome[i] = 13; sim.dirty.terrain = true; }
		}
		return true;
	});
}

// ───────────── cyber ─────────────
function megacorps(sim: Simulation, s: number, rng: Rng) {
	const gf = sim.gf;
	const realms = sim.polities.filter((p) => alive(p));
	const living = gf.corps.filter((x) => x.alive);
	const max = clamp(Math.round(realms.length / 4), 2, 6);
	if (living.length < max && rng.chance(0.25 * s)) {
		let best = null as (typeof sim.w.burgs)[number] | null, top = 0;
		for (const b of sim.w.burgs) {
			if (!b.id || !b.alive || !b.state || b.pop < 12 || living.some((x) => x.hq === b.id)) continue;
			const m = burgMix(sim, b.id);
			const v = b.pop * (m ? m[TRADE] + m[IND] : 0.35);
			if (v > top) { top = v; best = b; }
		}
		if (best) {
			const corp: Megacorp = { id: gf.nextCorp++, name: `${best.name} ${rng.pick(CORP_SUFFIXES)}`, hq: best.id, host: best.state, wealth: 20, influence: 10, captured: 0, founded: sim.year, alive: true };
			gf.corps.push(corp);
			living.push(corp);
			sim.log('misc', forceLine('corp.found', rng, { corp: corp.name, town: best.name, realm: sim.polities[best.state].name }), best.cell, best.state);
		}
	}
	for (const corp of living) {
		const b = sim.w.burgs[corp.hq];
		if (!b?.alive || !b.state || !alive(sim.polities[b.state])) {
			corp.alive = false;
			corp.captured = 0;
			sim.log('misc', forceLine('corp.fold', rng, { corp: corp.name, town: b?.name ?? 'its tower' }), b?.cell);
			continue;
		}
		if (b.state !== corp.host) { corp.host = b.state; corp.influence = 10; corp.captured = 0; }
		const p = sim.polities[corp.host];
		const m = burgMix(sim, b.id);
		corp.wealth += b.pop * 0.08 * (m ? 0.5 + m[TRADE] + m[IND] : 1);
		// buys influence: security contracts steady the realm, lobbying wins the council
		const spend = Math.min(corp.wealth * 0.3, 6 * s);
		corp.wealth -= spend;
		corp.influence = Math.min(100, corp.influence + spend * 1.2 - (corp.captured ? 0 : 2));
		p.stability = Math.min(95, p.stability + 0.5 * s);
		if (!corp.captured && corp.influence >= 70 && !living.some((x) => x.alive && x.captured === p.id) && (p.stability < 65 || p.ideology === 'oligarchy' || p.ideology === 'technocracy') && rng.chance(0.25)) {
			corp.captured = p.id;
			sim.log('coup', forceLine('corp.capture', rng, { corp: corp.name, realm: p.name }), b.cell, p.id);
		}
		if (corp.captured !== p.id) continue;
		const siphon = Math.max(0, p.treasury) * 0.04 * s;
		p.treasury -= siphon;
		corp.wealth += siphon;
		// rival corporations wage proxy wars through the realms they own
		if (sim.year - gf.lastCorpWar < 12) continue;
		for (const other of living) {
			if (other === corp || !other.alive || !other.captured || other.captured === p.id) continue;
			const q = sim.polities[other.captured];
			if (!alive(q) || sim.atWar(p.id, q.id) || p.allies.includes(q.id) || p.overlord === q.id || q.overlord === p.id) continue;
			if (!sim.neighborsOf(p.id).includes(q.id)) continue;
			sim.addRel(p.id, q.id, -3 * s);
			if (sim.rel(p.id, q.id) > -20 || !rng.chance(0.08 * s)) continue;
			gf.lastCorpWar = sim.year;
			sim.log('war', forceLine('corp.war', rng, { corp: corp.name, realm: p.name, other: q.name }), b.cell, p.id);
			sim.declareWar(p.id, q.id, `a hostile takeover of ${other.name} by ${corp.name}`);
			break;
		}
	}
	if (gf.corps.length > 24) gf.corps = gf.corps.filter((x, k) => x.alive || k >= gf.corps.length - 12);
}

// ───────────── solar ─────────────
function commons(sim: Simulation, s: number, rng: Rng) {
	const gf = sim.gf, c = sim.c;
	const regrow: Polity[] = [];
	for (const p of sim.polities) {
		if (!p.alive || !p.id) { delete gf.commons[p.id]; continue; }
		const wars = sim.warsOf(p.id).length;
		const since = gf.commons[p.id];
		if (since !== undefined) {
			if (wars || p.stability < 35) {
				delete gf.commons[p.id];
				if (rng.chance(0.6)) sim.log('culture', forceLine('commons.lapse', rng, { realm: p.name }), sim.w.burgs[p.capital]?.cell, p.id);
				continue;
			}
			if (p.stability < 88) p.stability = Math.min(88, p.stability + s);
			for (const nb of sim.neighborsOf(p.id)) if (sim.rel(p.id, nb) < 40) sim.addRel(p.id, nb, s);
			regrow.push(p);
		} else if (!wars && p.stability >= 55 && p.cells > 0) {
			const green = clamp((realmRel(sim, p.id, FARM) + realmRel(sim, p.id, 4)) / 2, 0.6, 1.6);
			if (!rng.chance(0.05 * s * green)) continue;
			gf.commons[p.id] = sim.year;
			sim.log('culture', forceLine('commons.adopt', rng, { realm: p.name }), sim.w.burgs[p.capital]?.cell, p.id);
		}
	}
	if (!regrow.length) return;
	// rewilding: a few grassland/savanna (and old ash) cells per commons realm turn back to forest
	const own = cellsByState(c.state, sim.polities.length);
	const n = Math.ceil(1.5 * s);
	const toForest: Record<number, number> = { 4: 6, 3: 5, 13: 4 };
	const fall = new Set<number>();
	for (const z of sim.gf.fallout) for (const i of z.core) fall.add(i);
	let told = false;
	for (const p of regrow) {
		const len = own.start[p.id + 1] - own.start[p.id];
		if (!len) continue;
		let done = 0;
		for (let t = 0; t < n * 4 && done < n; t++) {
			const i = own.cells[own.start[p.id] + Math.floor(rng() * len)];
			const nb = toForest[c.biome[i]];
			if (nb === undefined || fall.has(i)) continue;
			c.biome[i] = nb;
			sim.basePop[i] *= 1.03;
			done++;
			sim.dirty.terrain = true;
		}
		if (done && !told && sim.year - (gf.commons[p.id] ?? sim.year) >= 10 && rng.chance(0.04)) {
			told = true;
			const cap = sim.w.burgs[p.capital];
			sim.log('culture', forceLine('commons.regrow', rng, { realm: p.name, town: cap?.name ?? p.name }), cap?.cell, p.id);
		}
	}
}

// ───────────── fantasy / mythic ─────────────
function buildLeys(sim: Simulation) {
	const gf = sim.gf;
	const sites: { cell: number; layer: number; name: string }[] = [];
	for (const w of sim.wonders) if (isWonderStanding(w) && w.cell >= 0) sites.push({ cell: w.cell, layer: w.layer ?? 0, name: w.name });
	for (const r of sim.w.religions) if (r.id && r.center >= 0 && sim.isLand(r.center)) sites.push({ cell: r.center, layer: 0, name: `the holy seat of ${r.name}` });
	const c = sim.c;
	const maxD = 0.3 * Math.hypot(sim.w.opts.width, sim.w.opts.height);
	const pairs: [number, number, number][] = [];
	for (let i = 0; i < sites.length; i++) {
		let bj = -1, bd = Infinity;
		for (let j = 0; j < sites.length; j++) {
			if (i === j || sites[i].cell === sites[j].cell) continue;
			const d = Math.hypot(c.x[sites[i].cell] - c.x[sites[j].cell], c.y[sites[i].cell] - c.y[sites[j].cell]);
			if (d < bd) { bd = d; bj = j; }
		}
		if (bj < 0 || bd > maxD) continue;
		const a = Math.min(i, bj), b = Math.max(i, bj);
		if (!pairs.some((p) => p[0] === a && p[1] === b)) pairs.push([a, b, bd]);
	}
	pairs.sort((x, y) => x[2] - y[2]);
	const old = gf.leys;
	gf.leys = pairs.slice(0, 8).map(([i, j]) => {
		const a = sites[i], b = sites[j];
		const prev = old.find((l) => (l.a === a.cell && l.b === b.cell) || (l.a === b.cell && l.b === a.cell));
		return { a: a.cell, la: a.layer, b: b.cell, lb: b.layer, an: a.name, bn: b.name, draw: prev?.draw ?? 0, bound: prev?.bound ?? 0 };
	});
	gf.leyBuilt = sim.year;
}

function leylines(sim: Simulation, s: number, rng: Rng) {
	const gf = sim.gf, c = sim.c;
	if (!gf.leys.length || sim.year - gf.leyBuilt >= 20) buildLeys(sim);
	let told = false, surged = false;
	let held = 0;
	for (const l of gf.leys) {
		const sa = sim.w.layers[l.la]?.state[l.a] ?? 0, sb = sim.w.layers[l.lb]?.state[l.b] ?? 0;
		const pa = sim.polities[sa], pb = sim.polities[sb];
		const own = (alive(pa) ? 1 : 0) + (alive(pb) ? 1 : 0);
		const same = own === 2 && sa === sb;
		held += own + (same ? 1 : 0);
		if (same) pa.stability = Math.min(95, pa.stability + 0.3 * s);
		l.draw = own ? l.draw + 0.012 * s * (own + (same ? 1 : 0)) : Math.max(0, l.draw - 0.04);
		if (same && l.bound !== sa && !told) {
			l.bound = sa;
			told = true;
			sim.log('luminary', forceLine('ley.bind', rng, { realm: pa.name, site: l.an, site2: l.bn }), l.a, sa);
		}
		if (l.draw < 1 || surged || !rng.chance(0.2)) continue;
		// overdrawn: the line surges at one end
		surged = true;
		l.draw = 0.25;
		const atA = rng.chance(0.5);
		const cell = atA ? l.a : l.b, site = atA ? l.an : l.bn, st = atA ? sa : sb;
		const owner = sim.polities[st];
		if (sim.isLand(cell)) {
			c.pop[cell] *= 0.85;
			for (const j of neighbors(c, cell)) c.pop[j] *= 0.9;
		}
		if (alive(owner)) owner.stability = Math.max(5, owner.stability - 5 * s);
		const realm = alive(owner) ? owner.name : 'the wild lands';
		const beast = gf.leyBeast ? sim.monsters.find((m) => m.id === gf.leyBeast) : undefined;
		if (!beast?.alive && sim.year - (beast?.birthYear ?? -99) >= 40 && sim.isLand(cell) && rng.chance(0.3)) {
			const m = spawnLeyBeast(sim, cell, atA ? l.la : l.lb, site, rng);
			sim.log('monster', forceLine('ley.beast', rng, { site, realm, beast: m.name }), cell, st || undefined);
		} else sim.log('disaster', forceLine('ley.surge', rng, { site, realm }), cell, st || undefined);
	}
	if (held) sim.gainInnovation(0.12 * s * held);
}

function spawnLeyBeast(sim: Simulation, cell: number, layer: number, site: string, rng: Rng): Monster {
	const d = rng.pick(LEY_BEASTS);
	const st = LEY_BEAST_STATS;
	const m: Monster = {
		id: sim.monsters.length + 1, name: rng.pick(d.names), species: d.species, tier: st.tier, category: st.category, icon: d.icon,
		cell, layer, x: sim.c.x[cell], y: sim.c.y[cell], power: st.power, health: st.maxHealth, maxHealth: st.maxHealth, alive: true,
		lairCell: cell, lairName: `the scar at ${site}`, behavior: 'roaming', lore: d.lore, armor: st.armor, regen: st.regen, trophy: d.trophy, birthYear: sim.year
	};
	sim.monsters.push(m);
	sim.gf.leyBeast = m.id;
	return m;
}

// ───────────── bio ─────────────
function geneVats(sim: Simulation, s: number, rng: Rng) {
	const gf = sim.gf;
	let toldH = false, toldB = false;
	for (const p of sim.polities) {
		if (!p.alive || !p.id) { delete gf.vats[p.id]; continue; }
		let load = Math.max(0, (gf.vats[p.id] ?? 0) - 0.05);
		const lab = clamp((realmRel(sim, p.id, SCHOL) + realmRel(sim, p.id, FARM)) / 2, 0.6, 1.6);
		if (p.stability > 40 && rng.chance(0.08 * s * lab)) {
			const towns = sim.idx.burgsIn(sim.w.burgs, p.id).filter((b) => b.id && b.alive && b.state === p.id);
			for (const b of towns) b.pop = +Math.min(500, b.pop * (1 + 0.03 * s)).toFixed(2);
			p.stability = Math.min(95, p.stability + 2);
			load += 0.35;
			if (!toldH && towns.length && rng.chance(0.12)) {
				toldH = true;
				const t = rng.pick(towns);
				sim.log('misc', forceLine('vats.harvest', rng, { realm: p.name, town: t.name }), t.cell, p.id);
			}
		}
		if (load >= 1 && !toldB && rng.chance(0.3)) {
			load = 0;
			const cap = sim.w.burgs[p.capital];
			if (cap?.alive && sim.burgLayer(cap) === 0) {
				toldB = true;
				sim.plague[cap.cell] = Math.max(sim.plague[cap.cell], 0.4);
				sim.plagueActive = true;
				p.stability = Math.max(5, p.stability - 5 * s);
				sim.dirty.political = true;
				sim.log('disaster', forceLine('vats.blight', rng, { realm: p.name, town: cap.name }), cap.cell, p.id, 'plague');
			}
		}
		if (load > 0) gf.vats[p.id] = +load.toFixed(3);
		else delete gf.vats[p.id];
	}
}

// ───────────── UI ─────────────
export interface ForceChip { icon: string; label: string; title: string }

/** active forces touching one realm, for the realm card */
export function realmForces(sim: Simulation, id: number): ForceChip[] {
	const act = activeForces(sim);
	const gf = sim.gf;
	const out: ForceChip[] = [];
	const chip = (k: ForceKey, label: string) => out.push({ icon: FORCES[k].icon, label, title: `${FORCES[k].name}: ${FORCES[k].blurb}` });
	if (act.includes('smog')) {
		const n = gf.smog.filter((b) => sim.w.burgs[b]?.alive && sim.w.burgs[b].state === id).length;
		if (n) chip('smog', `${n} smog-choked town${n > 1 ? 's' : ''}`);
	}
	if (act.includes('strikes') && gf.strikes[id] !== undefined && sim.year - gf.strikes[id] <= 10) chip('strikes', `Strike in Y${gf.strikes[id]}`);
	if (act.includes('wareconomy') && sim.warsOf(id).length) chip('wareconomy', 'War economy');
	for (const r of gf.races) if (r.a === id || r.b === id) chip('armsrace', `Arms race with ${sim.polities[r.a === id ? r.b : r.a].name}`);
	const z = gf.fallout.filter((f) => f.state === id).length;
	if (z) chip('fallout', `${z} fallout zone${z > 1 ? 's' : ''}`);
	for (const corp of gf.corps) {
		if (!corp.alive) continue;
		if (corp.captured === id) chip('megacorps', `Captured by ${corp.name}`);
		else if (corp.host === id) chip('megacorps', `Home of ${corp.name} (${Math.round(corp.influence)}% sway)`);
	}
	if (gf.commons[id] !== undefined) chip('commons', `Green commons since Y${gf.commons[id]}`);
	if (act.includes('leylines')) {
		let n = 0;
		for (const l of gf.leys) n += (sim.w.layers[l.la]?.state[l.a] === id ? 1 : 0) + (sim.w.layers[l.lb]?.state[l.b] === id ? 1 : 0);
		if (n) chip('leylines', `${n} ley node${n > 1 ? 's' : ''}`);
	}
	if (gf.vats[id]) chip('genevats', `Gene vat strain ${Math.round(gf.vats[id] * 100)}%`);
	return out;
}
