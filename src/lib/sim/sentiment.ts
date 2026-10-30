/**
 * Sentiment between peoples and racial advantage.
 *
 * A sparse feeling matrix (-100..100, directed: "how `a` feels about `b`") is kept between species, cultures and
 * faiths in `sim.sx`. Grievances build from conquest, sacks, forced conversion and wars; gratitude from alliances,
 * trade and shared faith; everything decays slowly toward neutral but leaves a memory so old feuds can flare again.
 * Each realm's mix of peoples turns the numbers into trade, stability, riots (through the uprisings budget),
 * border friction, refugees and expulsions. Species also carry real trade-offs (`racialFx`), scaled by
 * `GenOptions.racialStrength`.
 *
 * Determinism: no call here touches `sim.rng`; the few random choices use a side rng seeded by world seed + year.
 * `GenOptions.sentiment === false` and `racialStrength === 0` make every hook a no-op.
 */
import { clamp, makeRng } from '../rng';
import { NEUTRAL_FX, racialFx, SPECIES_BY_ID } from '../gen/species';
import { cellsByState } from './indexes';
import type { Simulation } from './engine';
import type { Polity } from './types';

export type Axis = 's' | 'c' | 'f';

/** per-realm derived numbers, saved so a restored game continues exactly */
export interface RealmFx {
	/** army strength multiplier, growth multiplier, riot-odds multiplier */
	a: number;
	g: number;
	u: number;
	/** internal tension and harmony 0..1 */
	t: number;
	h: number;
	/** species diversity 0..1 */
	d: number;
}

export interface Feud {
	axis: Axis;
	a: string;
	b: string;
	name: string;
	since: number;
	ended?: number;
}

export interface SentimentState {
	/** `${axis}:${from}>${to}` → feeling */
	v: Record<string, number>;
	/** worst grievance remembered per key (negative) */
	m: Record<string, number>;
	/** `${axis}:${a}|${b}` (sorted) → consecutive years the pair has stayed below -60 */
	low: Record<string, number>;
	feuds: Feud[];
	/** polity id → year it may next expel a minority */
	cool: Record<number, number>;
	rx: Record<number, RealmFx>;
}

export function newSentiment(): SentimentState {
	return { v: {}, m: {}, low: {}, feuds: [], cool: {}, rx: {} };
}

export const sentimentOn = (sim: Simulation) => sim.w.opts.sentiment !== false;
export const racialStrength = (sim: Simulation) => clamp(sim.w.opts.racialStrength ?? 1, 0, 2);

const key = (axis: Axis, a: string | number, b: string | number) => `${axis}:${a}>${b}`;

export function feeling(sim: Simulation, axis: Axis, a: string | number, b: string | number): number {
	if (a === b) return 0;
	return sim.sx.v[key(axis, a, b)] ?? 0;
}

/** shift how `a` feels about `b`; grievances bite harder where an old memory is still alive */
export function shift(sim: Simulation, axis: Axis, a: string | number, b: string | number, d: number) {
	if (a === b || !d || a === undefined || b === undefined) return;
	const sx = sim.sx, k = key(axis, a, b);
	const mem = sx.m[k] ?? 0;
	if (d < 0) d *= 1 + (0.6 * -mem) / 100;
	const nv = clamp((sx.v[k] ?? 0) + d, -100, 100);
	sx.v[k] = nv;
	if (nv < mem) sx.m[k] = nv;
}

const cultureSpecies = (sim: Simulation, id: number) => sim.w.cultures[id]?.species ?? 'human';

/** both directions at once (e.g. allies warm to each other) */
function shiftBoth(sim: Simulation, axis: Axis, a: string | number, b: string | number, d: number) {
	shift(sim, axis, a, b, d);
	shift(sim, axis, b, a, d);
}

// ───────────────────────────── event hooks (no rng) ─────────────────────────────

/** a surface cell of one people's land was taken by another realm */
export function onConquest(sim: Simulation, cell: number, taker: number) {
	if (!sentimentOn(sim)) return;
	const conq = sim.polities[taker];
	if (!conq?.alive || !conq.culture) return;
	const cu = sim.c.culture[cell];
	if (!cu || cu === conq.culture) return;
	shift(sim, 'c', cu, conq.culture, -0.6);
	shift(sim, 's', cultureSpecies(sim, cu), cultureSpecies(sim, conq.culture), -0.3);
	const fa = sim.c.religion[cell];
	if (fa !== conq.religion) shift(sim, 'f', fa, conq.religion, -0.2);
}

/** a town changed hands: `severity` 1 = ordinary siege, 4 = capital fell, +2 for a razed wonder */
export function onSack(sim: Simulation, burgCulture: number, taker: number, severity: number) {
	if (!sentimentOn(sim)) return;
	const conq = sim.polities[taker];
	if (!conq?.alive || !conq.culture || burgCulture === conq.culture) return;
	shift(sim, 'c', burgCulture, conq.culture, -1.5 * severity);
	shift(sim, 's', cultureSpecies(sim, burgCulture), cultureSpecies(sim, conq.culture), -0.7 * severity);
}

/** a cell was pushed into the realm's faith (state pressure) */
export function onForcedConversion(sim: Simulation, from: number, to: number) {
	if (!sentimentOn(sim) || from === to) return;
	shift(sim, 'f', from, to, -0.05);
}

// ───────────────────────────── realm mix ─────────────────────────────

export interface Mix {
	cu: Map<number, number>;
	sp: Map<string, number>;
	fa: Map<number, number>;
}

function mixOf(sim: Simulation, pol: Polity, own: ReturnType<typeof cellsByState>): Mix {
	const cu = new Map<number, number>(), fa = new Map<number, number>(), sp = new Map<string, number>();
	const c = sim.c;
	let n = 0;
	for (let k = own.start[pol.id], end = own.start[pol.id + 1]; k < end; k++) {
		const i = own.cells[k];
		if (!sim.isLand(i)) continue;
		n++;
		const x = c.culture[i], r = c.religion[i];
		cu.set(x, (cu.get(x) ?? 0) + 1);
		fa.set(r, (fa.get(r) ?? 0) + 1);
	}
	if (n < 3) {
		cu.clear(); fa.clear();
		cu.set(pol.culture, 1);
		fa.set(pol.religion, 1);
		n = 1;
	}
	for (const [x, v] of cu) {
		cu.set(x, v / n);
		const s = cultureSpecies(sim, x);
		sp.set(s, (sp.get(s) ?? 0) + v / n);
	}
	for (const [x, v] of fa) fa.set(x, v / n);
	return { cu, sp, fa };
}

/** unordered pair sum: Σ share_a·share_b·(cold or warm part of the mean feeling) */
function pairs<T extends string | number>(sim: Simulation, axis: Axis, m: Map<T, number>): { t: number; h: number } {
	let t = 0, h = 0;
	const ids = [...m.keys()];
	for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
		const a = ids[i], b = ids[j];
		const w = m.get(a)! * m.get(b)!;
		const f = (feeling(sim, axis, a, b) + feeling(sim, axis, b, a)) / 2;
		if (f < 0) t += (w * -f) / 100;
		else h += (w * f) / 100;
	}
	return { t: Math.min(1, 4 * t), h: Math.min(1, 4 * h) };
}

/** the saved numbers plus this year's economy multiplier and stability shift, applied immediately */
interface Computed extends RealmFx { e: number; s: number }

function realmFx(sim: Simulation, mix: Mix, strength: number, sent: boolean): Computed {
	let econ = 0, army = 0, stab = 0, growth = 0, unrest = 0, adapt = 0, diversity = 1;
	for (const [id, share] of mix.sp) {
		const f = strength > 0 ? racialFx(id) : NEUTRAL_FX;
		econ += share * f.econ; army += share * f.army; stab += share * f.stab;
		growth += share * f.growth; unrest += share * f.unrest; adapt += share * f.adapt;
		diversity -= share * share;
	}
	// strength scales every trade-off around neutral
	econ = 1 + (econ - 1) * strength;
	army = 1 + (army - 1) * strength;
	growth = 1 + (growth - 1) * strength;
	unrest = 1 + (unrest - 1) * strength;
	stab *= strength;
	let t = 0, h = 0;
	if (sent) {
		const c = pairs(sim, 'c', mix.cu), s = pairs(sim, 's', mix.sp), f = pairs(sim, 'f', mix.fa);
		t = 0.55 * c.t + 0.3 * s.t + 0.15 * f.t;
		h = 0.55 * c.h + 0.3 * s.h + 0.15 * f.h;
	}
	// mixed company carries friction of its own; adaptable peoples feel less of it
	if (strength > 0) t += 0.2 * diversity * adapt * Math.min(1, strength);
	t = clamp(t, 0, 1);
	return { a: army, g: growth, u: unrest * (1 + 0.8 * t), t, h, d: diversity, e: econ, s: stab };
}

// ───────────────────────────── yearly ─────────────────────────────

const pairKey = (axis: Axis, a: string | number, b: string | number) => (String(a) < String(b) ? `${axis}:${a}|${b}` : `${axis}:${b}|${a}`);

export function yearlyPeoples(sim: Simulation) {
	const strength = racialStrength(sim), sent = sentimentOn(sim);
	if (strength <= 0 && !sent) return;
	const sx = sim.sx;
	const alive = sim.polities.filter((p) => p.alive && p.id);
	const own = cellsByState(sim.c.state, sim.polities.length);
	const mixes = new Map<number, Mix>();

	// 1. feelings move with this year's events
	if (sent) {
		const prim = (id: number) => sim.polities[id];
		for (const w of sim.wars) {
			if (w.end) continue;
			for (const a of w.attackers) for (const d of w.defenders) {
				const A = prim(a), D = prim(d);
				if (!A?.alive || !D?.alive) continue;
				shiftBoth(sim, 'c', A.culture, D.culture, -1);
				shiftBoth(sim, 's', cultureSpecies(sim, A.culture), cultureSpecies(sim, D.culture), -0.5);
				if (A.religion !== D.religion) shiftBoth(sim, 'f', A.religion, D.religion, -0.4);
			}
		}
		for (const p of alive) for (const al of p.allies) {
			if (al <= p.id) continue;
			const B = sim.polities[al];
			if (!B?.alive) continue;
			shiftBoth(sim, 'c', p.culture, B.culture, 1);
			shiftBoth(sim, 's', cultureSpecies(sim, p.culture), cultureSpecies(sim, B.culture), 0.5);
			shiftBoth(sim, 'f', p.religion, B.religion, 0.3);
		}
		// trade routes between different peoples at peace
		const burgs = sim.w.burgs;
		for (const rt of sim.w.routes) {
			if (rt.kind !== 'road' && rt.kind !== 'sea') continue;
			const A = burgs[rt.a], B = burgs[rt.b];
			if (!A?.alive || !B?.alive || !A.state || !B.state || A.state === B.state || A.culture === B.culture) continue;
			if (sim.atWar(A.state, B.state)) continue;
			shiftBoth(sim, 'c', A.culture, B.culture, 0.12);
			shiftBoth(sim, 's', cultureSpecies(sim, A.culture), cultureSpecies(sim, B.culture), 0.05);
		}
		// neighbours who share a faith
		for (const k of sim.borders.keys()) {
			const [a, b] = k.split('-').map(Number);
			const A = sim.polities[a], B = sim.polities[b];
			if (!A?.alive || !B?.alive || !a || !b || sim.atWar(a, b)) continue;
			if (A.religion === B.religion && A.culture !== B.culture) shiftBoth(sim, 'c', A.culture, B.culture, 0.2);
		}
	}

	// 2. per-realm effects
	for (const p of alive) {
		const mix = mixOf(sim, p, own);
		mixes.set(p.id, mix);
		const fx = realmFx(sim, mix, strength, sent);
		const income = p.pop * p.tax * 0.8;
		const mixedTrade = 0.02 * fx.d * (1 - fx.t) + 0.02 * fx.h;
		p.treasury += income * (fx.e - 1 + (strength > 0 || sent ? mixedTrade : 0));
		p.stability = clamp(p.stability + fx.s * 0.2 - 1.5 * fx.t + 0.6 * fx.h, 0, 100);
		sx.rx[p.id] = { a: fx.a, g: fx.g, u: fx.u, t: fx.t, h: fx.h, d: fx.d };
	}

	if (sent) {
		borderFeelings(sim, mixes);
		social(sim, mixes);
		decay(sim);
		feuds(sim);
	}
}

/** neighbours' mutual feeling bends their relations: friction where cold, ease where warm */
function borderFeelings(sim: Simulation, mixes: Map<number, Mix>) {
	for (const k of sim.borders.keys()) {
		const [a, b] = k.split('-').map(Number);
		const A = sim.polities[a], B = sim.polities[b];
		if (!A?.alive || !B?.alive || !a || !b) continue;
		const f = (feeling(sim, 'c', A.culture, B.culture) + feeling(sim, 'c', B.culture, A.culture)) / 2;
		if (Math.abs(f) < 15) continue;
		sim.addRel(a, b, clamp(f / 100, -1, 1) * 0.8);
	}
	void mixes;
}

/** intermarriage, friendly migration, refugee waves and expulsions (side rng only) */
function social(sim: Simulation, mixes: Map<number, Mix>) {
	const rng = makeRng(`${sim.w.opts.seed}:sx:${sim.year}`);
	const burgs = sim.w.burgs;
	const alive = sim.polities.filter((p) => p.alive && p.id && p.cells > 0);
	if (!alive.length) return;
	const scale = Math.min(1, 10 / alive.length);
	const town = (id: number, cu: number) => {
		let best: (typeof burgs)[number] | null = null;
		for (const b of sim.idx.burgsIn(burgs, id)) if (b.id && b.alive && b.state === id && b.culture === cu && (!best || b.pop > best.pop)) best = b;
		return best;
	};

	// warm neighbours: marriage and migration
	for (const k of sim.borders.keys()) {
		const [a, b] = k.split('-').map(Number);
		const A = sim.polities[a], B = sim.polities[b];
		if (!A?.alive || !B?.alive || !a || !b || A.culture === B.culture || sim.atWar(a, b)) continue;
		const f = (feeling(sim, 'c', A.culture, B.culture) + feeling(sim, 'c', B.culture, A.culture)) / 2;
		if (f < 35 || !rng.chance(0.03 * scale)) continue;
		shiftBoth(sim, 'c', A.culture, B.culture, 0.5);
		if (rng.chance(0.5)) {
			const ta = town(a, A.culture), tb = town(b, B.culture);
			if (ta && tb) sim.log('misc', `Families of ${ta.name} and ${tb.name} marry across the border; the ${sim.w.cultures[A.culture]?.name ?? 'old'} and ${sim.w.cultures[B.culture]?.name ?? 'new'} folk grow closer.`, ta.cell, a);
		} else {
			// a few settlers drift to the friendlier realm
			const from = town(b, A.culture), to = town(a, A.culture);
			if (from && to && from.id !== to.id) {
				const moved = +(from.pop * 0.08).toFixed(2);
				from.pop = +(from.pop - moved).toFixed(2);
				to.pop = +(to.pop + moved).toFixed(2);
			}
		}
	}

	// cold realms: expel a minority (budgeted, with a cooldown per realm)
	for (const p of alive) {
		const fx = sim.sx.rx[p.id];
		const mix = mixes.get(p.id);
		if (!fx || !mix || fx.t < 0.25 || (sim.sx.cool[p.id] ?? 0) > sim.year) continue;
		if (!rng.chance(0.05 * fx.t * scale)) continue;
		let worst = 0, minority = 0;
		for (const [cu, share] of mix.cu) {
			if (cu === p.culture || share < 0.05 || share > 0.5) continue;
			const f = feeling(sim, 'c', p.culture, cu);
			if (f < worst) { worst = f; minority = cu; }
		}
		if (!minority || worst > -35) continue;
		const victim = town(p.id, minority);
		if (!victim) continue;
		sim.sx.cool[p.id] = sim.year + 12;
		const lost = +(victim.pop * 0.3).toFixed(2);
		victim.pop = +(Math.max(0.2, victim.pop - lost)).toFixed(2);
		p.stability = clamp(p.stability - 3, 0, 100);
		shift(sim, 'c', minority, p.culture, -8);
		shift(sim, 's', cultureSpecies(sim, minority), cultureSpecies(sim, p.culture), -3);
		// the exiles go where their own people are welcome
		let haven: (typeof burgs)[number] | null = null;
		for (const nb of sim.neighborsOf(p.id)) {
			const t = town(nb, minority);
			if (t && (!haven || t.pop > haven.pop)) haven = t;
		}
		const name = sim.w.cultures[minority]?.name ?? 'minority';
		if (haven) {
			haven.pop = +(haven.pop + lost * 0.7).toFixed(2);
			sim.log('misc', `${p.name} drives the ${name} out of ${victim.name}; refugees stream to ${haven.name}, carrying the tale of their grievance.`, victim.cell, p.id);
			shift(sim, 'c', minority, sim.polities[haven.state]?.culture ?? minority, 0.5);
		} else {
			sim.log('misc', `${p.name} expels the ${name} of ${victim.name}; the fires of their quarter burn for days.`, victim.cell, p.id);
		}
	}
}

/** slow fade toward neutral (2% a year), with the memory fading slower */
function decay(sim: Simulation) {
	const sx = sim.sx;
	for (const k of Object.keys(sx.v)) {
		const nv = sx.v[k] * 0.98;
		if (Math.abs(nv) < 0.4 && Math.abs(sx.m[k] ?? 0) < 1) { delete sx.v[k]; delete sx.m[k]; continue; }
		sx.v[k] = nv;
	}
	for (const k of Object.keys(sx.m)) {
		const nm = sx.m[k] * 0.995;
		if (Math.abs(nm) < 1 && !(k in sx.v)) delete sx.m[k];
		else sx.m[k] = nm;
	}
}

const nameOf = (sim: Simulation, axis: Axis, id: string) =>
	axis === 's' ? (SPECIES_BY_ID[id]?.name ?? id) : axis === 'c' ? (sim.w.cultures[+id]?.name ?? id) : (sim.w.religions[+id]?.name ?? id);

/** a pair that stays below -60 for 30 years earns a name in the chronicle */
function feuds(sim: Simulation) {
	const sx = sim.sx;
	const seen = new Set<string>();
	for (const k of Object.keys(sx.v)) {
		const axis = k[0] as Axis;
		const [a, b] = k.slice(2).split('>');
		const pk = pairKey(axis, a, b);
		if (seen.has(pk)) continue;
		seen.add(pk);
		const mean = (feeling(sim, axis, a, b) + feeling(sim, axis, b, a)) / 2;
		if (mean <= -60) sx.low[pk] = (sx.low[pk] ?? 0) + 1;
		else if (mean > -45) delete sx.low[pk];
		const active = sx.feuds.find((f) => !f.ended && pairKey(f.axis, f.a, f.b) === pk);
		if (!active && (sx.low[pk] ?? 0) >= 30) {
			const [x, y] = [nameOf(sim, axis, a), nameOf(sim, axis, b)];
			const feud: Feud = { axis, a, b, name: `the ${x}-${y} feud`, since: sim.year };
			sx.feuds.push(feud);
			sim.log('misc', `Chroniclers now speak of ${feud.name}: for thirty years the ${x} and the ${y} have answered every wrong with another.`);
		} else if (active && mean > -25) {
			active.ended = sim.year;
			sim.log('misc', `The long quarrel known as ${active.name} cools at last.`);
		}
	}
	for (const pk of Object.keys(sx.low)) if (!seen.has(pk)) delete sx.low[pk];
}

// ───────────────────────────── queries for other systems and the UI ─────────────────────────────

/** army multiplier used by `Simulation.strength` */
export const armyFx = (sim: Simulation, id: number) => sim.sx.rx[id]?.a ?? 1;

/** per-state growth multipliers for demographics, or null when everything is neutral */
export function growthTable(sim: Simulation): Float64Array | null {
	const rx = sim.sx.rx, ids = Object.keys(rx);
	if (!ids.length) return null;
	const t = new Float64Array(sim.polities.length + 1).fill(1);
	for (const id of ids) if (+id < t.length) t[+id] = rx[+id].g;
	return t;
}

/** riot-odds multiplier and tension flag for the uprisings budget */
export function unrestFx(sim: Simulation, id: number): { mult: number; tense: boolean } {
	const r = sim.sx.rx[id];
	if (!r) return { mult: 1, tense: false };
	return { mult: clamp(r.u, 0.7, 1.7), tense: r.t > 0.3 };
}

export interface PeopleShare { id: string; name: string; icon: string; share: number }

export function realmPeoples(sim: Simulation, pol: Polity): { species: PeopleShare[]; cultures: PeopleShare[]; grudge: string | null; tension: number; harmony: number } {
	const own = cellsByState(sim.c.state, sim.polities.length);
	const mix = mixOf(sim, pol, own);
	const species = [...mix.sp].sort((a, b) => b[1] - a[1]).map(([id, share]) => ({ id, name: SPECIES_BY_ID[id]?.plural ?? id, icon: SPECIES_BY_ID[id]?.icon ?? '', share }));
	const cultures = [...mix.cu].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, share]) => ({ id: String(id), name: sim.w.cultures[id]?.name ?? '?', icon: '', share }));
	let grudge: string | null = null, worst = -20;
	for (const [cu] of mix.cu) {
		for (const [other] of mix.cu) {
			const f = feeling(sim, 'c', cu, other);
			if (cu !== other && f < worst) { worst = f; grudge = `${sim.w.cultures[cu]?.name} toward ${sim.w.cultures[other]?.name} (${Math.round(f)})`; }
		}
		for (const nb of sim.neighborsOf(pol.id)) {
			const oc = sim.polities[nb]?.culture;
			if (!oc || oc === cu) continue;
			const f = feeling(sim, 'c', cu, oc);
			if (f < worst) { worst = f; grudge = `${sim.w.cultures[cu]?.name} toward ${sim.w.cultures[oc]?.name} (${Math.round(f)})`; }
		}
	}
	const r = sim.sx.rx[pol.id];
	return { species, cultures, grudge, tension: r?.t ?? 0, harmony: r?.h ?? 0 };
}

export interface MatrixView {
	ids: string[];
	names: string[];
	icons: string[];
	/** rows: how row feels about column */
	cells: number[][];
}

function matrix(sim: Simulation, axis: Axis, ids: string[], names: string[], icons: string[]): MatrixView {
	return { ids, names, icons, cells: ids.map((a) => ids.map((b) => Math.round(feeling(sim, axis, a, b)))) };
}

export function peoplesView(sim: Simulation): { species: MatrixView; cultures: MatrixView; top: { label: string; value: number; kind: string }[]; feuds: Feud[] } {
	const spIds = new Set<string>();
	const cuCells = new Map<number, number>();
	const c = sim.c;
	for (let i = 0; i < c.n; i += 2) if (c.state[i]) cuCells.set(c.culture[i], (cuCells.get(c.culture[i]) ?? 0) + 1);
	for (const id of cuCells.keys()) spIds.add(cultureSpecies(sim, id));
	const sp = [...spIds].sort();
	const cu = [...cuCells].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
	const top: { label: string; value: number; kind: string }[] = [];
	for (const k of Object.keys(sim.sx.v)) {
		const v = sim.sx.v[k];
		if (v > -25) continue;
		const axis = k[0] as Axis;
		const [a, b] = k.slice(2).split('>');
		top.push({ label: `${nameOf(sim, axis, a)} toward ${nameOf(sim, axis, b)}`, value: Math.round(v), kind: axis === 's' ? 'species' : axis === 'c' ? 'culture' : 'faith' });
	}
	top.sort((x, y) => x.value - y.value);
	return {
		species: matrix(sim, 's', sp, sp.map((id) => SPECIES_BY_ID[id]?.name ?? id), sp.map((id) => SPECIES_BY_ID[id]?.icon ?? '')),
		cultures: matrix(sim, 'c', cu.map(String), cu.map((id) => sim.w.cultures[id]?.name ?? '?'), cu.map(() => '')),
		top: top.slice(0, 8),
		feuds: sim.sx.feuds.slice(-6).reverse()
	};
}
