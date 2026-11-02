/**
 * Railroads and air docks (transport). From the industrial era on (era ≥ 2, or a voice that is already industrial),
 * prosperous realms at peace lay rail lines between their larger towns along existing roads; lines grow station by
 * station, are cut when an enemy takes one of their cells (`railOnTake`, called from `takeCell`) and rebuilt after the
 * war. Sky-isle towns keep air docks from the start (their landing in the nearest surface town gets one too); airship
 * genres also raise docks in big surface towns and fly air routes between them.
 * Effects are modest: a little treasury per station / route, a small army top-up for wartime realms with intact lines.
 * Side rngs only (`seed:rail:<year>`), never `sim.rng`. State is `sim._railState` (saved by dump() through `ext`).
 */
import type { Simulation } from './engine';
import type { Burg, Route } from '../gen/types';
import type { Genre } from '../gen/genre';
import { makeRng } from '../rng';
import { cultureMod } from './culture';

export interface RailLine {
	id: number;
	name?: string;
	kind: string;
	/** realm that laid (and rebuilds) the line */
	owner: number;
	/** burg ids in line order */
	stations: number[];
	/** surface cells along the track, in order */
	cells: number[];
	built: number;
	/** year the war cut it (0 / undefined = running) */
	cut?: number;
	cutBy?: number;
}
export interface AirRoute {
	a: number;
	b: number;
	kind: string;
	built: number;
}
export interface RailState {
	lines: RailLine[];
	air: AirRoute[];
	docks: number[];
	next: number;
	/** sky-isle docks placed */
	init?: boolean;
}

/** rail kind per genre voice; fantasy-like voices fall back to the era */
const RAIL_KIND: Partial<Record<Genre, string>> = {
	steampunk: 'railway',
	dieselpunk: 'diesel line',
	atompunk: 'atomic monorail',
	cyberpunk: 'maglev',
	biopunk: 'bio-tram',
	solarpunk: 'solar rail',
	wasteland: 'salvage rail'
};
const ERA_RAIL = ['railway', 'railway', 'railway', 'diesel line', 'maglev'];
/** genres whose skies carry airships between surface towns */
const AIR_KIND: Partial<Record<Genre, string>> = {
	steampunk: 'airship',
	dieselpunk: 'zeppelin',
	atompunk: 'rocket ferry',
	cyberpunk: 'aerodyne',
	biopunk: 'sky-ray',
	solarpunk: 'solar glider',
	wasteland: 'gyrocopter'
};
const SKY_KIND: Partial<Record<Genre, string>> = { mythic: 'griffon roost', twilight: 'sky barge' };

const TITLE: Record<string, string> = {
	railway: 'Railway', 'diesel line': 'Line', 'atomic monorail': 'Monorail', maglev: 'Maglev', 'bio-tram': 'Tramway',
	'solar rail': 'Sunline', 'salvage rail': 'Rustline'
};

export function railState(sim: Simulation): RailState {
	const s = sim as unknown as { _railState?: RailState };
	if (!s._railState) s._railState = { lines: [], air: [], docks: [], next: 1 };
	const st = s._railState;
	st.lines ??= [];
	st.air ??= [];
	st.docks ??= [];
	st.next ??= 1;
	return st;
}

export function railKind(sim: Simulation): string | null {
	const k = RAIL_KIND[sim.voice];
	if (k) return k;
	return sim.era >= 2 ? ERA_RAIL[Math.min(ERA_RAIL.length - 1, sim.era)] : null;
}
function airKind(sim: Simulation): string | null {
	return AIR_KIND[sim.voice] ?? (sim.era >= 3 ? (sim.era >= 4 ? 'skyliner' : 'airship') : null);
}
function skyKind(sim: Simulation): string {
	return AIR_KIND[sim.voice] ?? SKY_KIND[sim.voice] ?? (sim.era >= 2 ? 'airship' : 'skyship');
}

/** cell → line ids, derived (never saved) */
const cellIndex = new WeakMap<RailState, Map<number, number[]>>();
function indexOf(st: RailState) {
	let m = cellIndex.get(st);
	if (!m) {
		m = new Map();
		for (const l of st.lines) for (const c of l.cells) {
			const xs = m.get(c);
			if (xs) xs.push(l.id);
			else m.set(c, [l.id]);
		}
		cellIndex.set(st, m);
	}
	return m;
}

/** takeCell hook: an enemy taking a cell of a running line cuts it */
export function railOnTake(sim: Simulation, cell: number, old: number, taker: number, atWar: boolean) {
	const st = (sim as unknown as { _railState?: RailState })._railState;
	if (!atWar || !st || !st.lines.length) return;
	const ids = indexOf(st).get(cell);
	if (!ids) return;
	for (const id of ids) {
		const l = st.lines.find((x) => x.id === id);
		if (!l || l.cut || taker === l.owner || old !== l.owner) continue;
		l.cut = sim.year;
		l.cutBy = taker;
		const by = sim.polities[taker]?.name ?? 'raiders';
		sim.log('war', `The ${lineTitle(l)} is cut: soldiers of ${by} tear up the ${l.kind} track and the trains stop.`, cell, l.owner);
	}
}

function lineTitle(l: RailLine) {
	return l.name ?? `${l.kind}`;
}

function surface(b: Burg | undefined): b is Burg {
	return !!b && b.id > 0 && b.alive && b.layer === 'surface';
}

/** yearly: build, extend, rebuild lines; docks and air routes; small yields */
export function yearlyRail(sim: Simulation) {
	const kind = railKind(sim);
	const st = (sim as unknown as { _railState?: RailState })._railState;
	if (!kind && !st && !sim.w.burgs.some((b) => b.alive && b.layer === 'sky')) return;
	const S = railState(sim);
	const rng = makeRng(`${sim.w.opts.seed}:rail:${sim.planetIndex}:${sim.year}`);
	const w = sim.w;
	if (!S.init) initSkyDocks(sim, S);
	if (kind) {
		rebuildLines(sim, S);
		buildLines(sim, S, kind, rng);
	}
	const ak = airKind(sim);
	if (ak) buildDocks(sim, S, ak, rng);
	// yields: each running station pays its town's realm a little; wartime realms with running lines move troops faster
	const railed = new Set<number>();
	for (const l of S.lines) {
		if (l.cut) continue;
		for (const id of l.stations) {
			const b = w.burgs[id];
			if (!surface(b) || !b.state) continue;
			const p = sim.polities[b.state];
			if (!p?.alive) continue;
			p.treasury += 0.4;
			railed.add(p.id);
		}
	}
	for (const id of railed) {
		const p = sim.polities[id];
		if (p.army > 0 && sim.warsOf(id).length) p.army *= 1.01;
	}
	for (const r of S.air) {
		const b = w.burgs[r.a];
		if (b?.alive && b.state && sim.polities[b.state]?.alive) sim.polities[b.state].treasury += 0.3;
	}
}

function initSkyDocks(sim: Simulation, S: RailState) {
	S.init = true;
	const w = sim.w;
	const docks = new Set(S.docks);
	const land = w.burgs.filter((b) => surface(b));
	if (!land.length) return;
	const kind = skyKind(sim);
	for (const b of w.burgs) {
		if (!b.id || !b.alive || b.layer !== 'sky') continue;
		let best: Burg | null = null, bd = Infinity;
		for (const o of land) {
			const d = (o.x - b.x) ** 2 + (o.y - b.y) ** 2;
			if (d < bd) { bd = d; best = o; }
		}
		docks.add(b.id);
		if (best) {
			docks.add(best.id);
			S.air.push({ a: b.id, b: best.id, kind, built: sim.year });
		}
	}
	S.docks = Array.from(docks).sort((a, b) => a - b);
}

/** larger towns: capitals plus the upper half of surface towns by population */
function largeTowns(sim: Simulation) {
	const pops = sim.w.burgs.filter(surface).map((b) => b.pop).sort((a, b) => a - b);
	const med = pops.length ? pops[Math.floor(pops.length * 0.5)] : 0;
	return (b: Burg) => surface(b) && (b.capital || b.pop >= med);
}

function routeKey(a: number, b: number) {
	return a < b ? a + ':' + b : b + ':' + a;
}

function buildLines(sim: Simulation, S: RailState, kind: string, rng: ReturnType<typeof makeRng>) {
	const w = sim.w;
	const big = largeTowns(sim);
	const cands = sim.polities.filter((p) => p.id && p.alive && p.treasury >= 60 && p.stability >= 35 && !sim.warsOf(p.id).length);
	if (!cands.length) return;
	// road graph between surface towns
	const adj = new Map<number, Route[]>();
	for (const r of w.routes) {
		if (r.kind !== 'road') continue;
		const a = w.burgs[r.a], b = w.burgs[r.b];
		if (!surface(a) || !surface(b)) continue;
		for (const k of [r.a, r.b]) {
			const xs = adj.get(k);
			if (xs) xs.push(r);
			else adj.set(k, [r]);
		}
	}
	const railedEdge = new Set<string>();
	const onLine = new Set<number>();
	for (const l of S.lines) {
		for (let i = 1; i < l.stations.length; i++) railedEdge.add(routeKey(l.stations[i - 1], l.stations[i]));
		for (const s of l.stations) onLine.add(s);
	}
	let built = 0;
	for (const pol of rng.shuffle(cands)) {
		if (built >= 2) break;
		if (!rng.chance(0.14 * cultureMod(sim, pol, 'trade'))) continue;
		const mine = (id: number) => { const b = w.burgs[id]; return surface(b) && b.state === pol.id && big(b); };
		// 1. extend one of the realm's running lines from an end station
		let done = false;
		for (const l of S.lines) {
			if (l.cut || l.owner !== pol.id || l.stations.length >= 8) continue;
			for (const end of [0, l.stations.length - 1]) {
				const at = l.stations[end];
				const opts = (adj.get(at) ?? []).filter((r) => {
					const o = r.a === at ? r.b : r.a;
					return mine(o) && !l.stations.includes(o) && !railedEdge.has(routeKey(at, o)) && r.cells.length <= 90;
				});
				if (!opts.length) continue;
				const r = rng.pick(opts);
				const o = r.a === at ? r.b : r.a;
				const cells = r.a === at ? r.cells.slice() : r.cells.slice().reverse();
				const cost = cells.length * 2.5;
				if (pol.treasury < cost * 1.5) continue;
				pol.treasury -= cost;
				if (end === 0) { l.stations.unshift(o); l.cells = cells.reverse().concat(l.cells.slice(1)); }
				else { l.stations.push(o); l.cells = l.cells.concat(cells.slice(1)); }
				cellIndex.delete(S);
				railedEdge.add(routeKey(at, o));
				sim.log('found', `The ${lineTitle(l)} of ${pol.name} reaches ${w.burgs[o].name}: a new station opens to cheering crowds (+trade).`, w.burgs[o].cell, pol.id, 'rail');
				done = true;
				break;
			}
			if (done) break;
		}
		if (done) { built++; continue; }
		// 2. open a new line between two larger towns of the realm joined by a road
		const pairs: Route[] = [];
		for (const [id, rs] of adj) {
			if (!mine(id)) continue;
			for (const r of rs) {
				if (r.a !== id) continue;
				if (!mine(r.b) || railedEdge.has(routeKey(r.a, r.b)) || r.cells.length < 2 || r.cells.length > 90) continue;
				if (onLine.has(r.a) && onLine.has(r.b)) continue;
				pairs.push(r);
			}
		}
		if (!pairs.length) continue;
		const r = rng.pick(pairs);
		const cost = r.cells.length * 3;
		if (pol.treasury < cost * 1.5) continue;
		pol.treasury -= cost;
		const A = w.burgs[r.a], B = w.burgs[r.b];
		const l: RailLine = { id: S.next++, kind, owner: pol.id, stations: [r.a, r.b], cells: r.cells.slice(), built: sim.year };
		l.name = `${A.name}–${B.name} ${TITLE[kind] ?? 'Line'}`;
		S.lines.push(l);
		cellIndex.delete(S);
		railedEdge.add(routeKey(r.a, r.b));
		onLine.add(r.a).add(r.b);
		pol.stability = Math.min(100, pol.stability + 1);
		sim.gainInnovation(3);
		sim.log('found', `The ${l.name} opens: ${S.lines.some((x) => x.owner === pol.id && x !== l) ? 'another' : 'the first'} ${kind} of ${pol.name} runs from ${A.name} to ${B.name}, with stations in both towns.`, A.cell, pol.id, 'rail');
		built++;
	}
}

function rebuildLines(sim: Simulation, S: RailState) {
	const w = sim.w;
	for (const l of S.lines) {
		if (!l.cut || sim.year - l.cut < 2) continue;
		// whoever holds most stations takes the line over
		const count = new Map<number, number>();
		for (const id of l.stations) {
			const b = w.burgs[id];
			if (surface(b) && b.state) count.set(b.state, (count.get(b.state) ?? 0) + 1);
		}
		let owner = l.owner, best = count.get(l.owner) ?? 0;
		for (const [k, n] of count) if (n > best) { best = n; owner = k; }
		const pol = sim.polities[owner];
		if (!pol?.alive || best < 2 || sim.warsOf(owner).length) continue;
		const cost = l.cells.length * 1.2;
		if (pol.treasury < cost * 1.5) continue;
		pol.treasury -= cost;
		const prev = l.owner;
		l.owner = owner;
		l.cut = 0;
		l.cutBy = 0;
		const how = prev === owner ? `${pol.name} relays the track` : `${pol.name} takes over the line and relays the track`;
		sim.log('found', `The ${lineTitle(l)} is rebuilt: ${how}, and trains run again.`, w.burgs[l.stations[0]]?.cell, owner, 'rail');
	}
}

function buildDocks(sim: Simulation, S: RailState, kind: string, rng: ReturnType<typeof makeRng>) {
	const w = sim.w;
	const docks = new Set(S.docks);
	const spacing = Math.sqrt((w.opts.width * w.opts.height) / w.opts.cells);
	const cands = sim.polities.filter((p) => p.id && p.alive && p.treasury >= 80 && p.stability >= 40);
	let built = 0;
	for (const pol of rng.shuffle(cands)) {
		if (built >= 1) break;
		if (!rng.chance(0.08)) continue;
		const towns = sim.idx.burgsIn(w.burgs, pol.id).filter((b) => surface(b) && b.state === pol.id && !docks.has(b.id));
		if (!towns.length) continue;
		const b = towns.reduce((m, x) => (x.capital && !m.capital) || (x.capital === m.capital && x.pop > m.pop) ? x : m);
		pol.treasury -= 30;
		docks.add(b.id);
		// fly to the nearest two docks within reach
		const near = Array.from(docks)
			.filter((id) => id !== b.id && w.burgs[id]?.alive)
			.map((id) => ({ id, d: Math.hypot(w.burgs[id].x - b.x, w.burgs[id].y - b.y) }))
			.filter((x) => x.d < spacing * 45)
			.sort((x, y) => x.d - y.d || x.id - y.id)
			.slice(0, 2);
		for (const n of near) S.air.push({ a: b.id, b: n.id, kind, built: sim.year });
		const to = near.length ? `, with ${kind} service to ${near.map((n) => w.burgs[n.id].name).join(' and ')}` : '';
		sim.log('found', `${pol.name} raises an air dock over ${b.name}${to}.`, b.cell, pol.id, 'rail');
		built++;
	}
	S.docks = Array.from(docks).sort((a, b) => a - b);
}
