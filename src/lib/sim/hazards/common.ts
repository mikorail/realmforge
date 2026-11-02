/** Shared helpers for hazards: lines, towns near a cell, damage, records, famine through the existing famine path. */
import { clamp, type Rng } from '../../rng';
import { onFamine } from '../society';
import { getBurgDistricts } from '../burgs';
import type { Burg } from '../../gen/types';
import type { Simulation } from '../engine';
import type { ChronEvent } from '../types';
import { HZ_GENRE, HZ_LINES, type HazardKind } from './data';
import { hz, type HzEvent } from './state';

export function line(sim: Simulation, key: string, r: Rng, vars: Record<string, string | number>): string {
	const list = HZ_GENRE[sim.voice]?.[key] ?? HZ_LINES[key] ?? [key];
	let t = r.pick(list);
	for (const k in vars) t = t.split(`{${k}}`).join(String(vars[k]));
	return t.replace('{world}', sim.w.name);
}

export const scaleOf = (sim: Simulation) => sim.w.opts.width / 1600;

export function surfaceTowns(sim: Simulation): Burg[] {
	return sim.w.burgs.filter((b) => b.id && b.alive && sim.burgLayer(b) === 0);
}

export function townsNear(sim: Simulation, cell: number, radius: number, filter?: (b: Burg) => boolean): { b: Burg; d: number }[] {
	const c = sim.c, x = c.x[cell], y = c.y[cell], r2 = radius * radius;
	const out: { b: Burg; d: number }[] = [];
	for (const b of sim.w.burgs) {
		if (!b.id || !b.alive || sim.burgLayer(b) !== 0) continue;
		const d2 = (b.x - x) ** 2 + (b.y - y) ** 2;
		if (d2 <= r2 && (!filter || filter(b))) out.push({ b, d: Math.sqrt(d2) });
	}
	return out.sort((a, b) => a.d - b.d);
}

export function cellsNear(sim: Simulation, cell: number, radius: number): number[] {
	const c = sim.c, x = c.x[cell], y = c.y[cell], r2 = radius * radius;
	const out: number[] = [];
	for (let i = 0; i < c.n; i++) if ((c.x[i] - x) ** 2 + (c.y[i] - y) ** 2 <= r2) out.push(i);
	return out;
}

/** cells within `hops` neighbour steps */
export function ringOf(sim: Simulation, cell: number, hops: number, ok: (i: number) => boolean = () => true): number[] {
	const c = sim.c;
	const seen = new Set([cell]);
	let front = [cell];
	for (let h = 0; h < hops; h++) {
		const nx: number[] = [];
		for (const a of front) for (let k = c.nStart[a]; k < c.nStart[a + 1]; k++) {
			const j = c.nList[k];
			if (!seen.has(j) && ok(j)) { seen.add(j); nx.push(j); }
		}
		front = nx;
	}
	return [...seen];
}

export function hitTown(sim: Simulation, b: Burg, loss: number) {
	loss = clamp(loss, 0, 0.6);
	b.pop = +(b.pop * (1 - loss)).toFixed(2);
	sim.c.pop[b.cell] *= 1 - loss * 0.7;
}

/** quake / storm damage to built districts (walls first) */
export function damageDistricts(b: Burg, severe: boolean) {
	if (!b.districts) return;
	const d = getBurgDistricts(b);
	if (d.walls > 0) b.districts.walls = d.walls - 1;
	if (severe && d.market > 0) b.districts.market = d.market - 1;
	if (severe && d.temple > 0) b.districts.temple = d.temple - 1;
}

export function hitRealm(sim: Simulation, state: number, stab: number, gold = 0) {
	const p = sim.polities[state];
	if (!p?.alive || !state) return;
	p.stability = clamp(p.stability - stab, 0, 100);
	p.treasury -= gold;
}

export function record(sim: Simulation, e: HzEvent) {
	const st = hz(sim);
	st.recent.push(e);
	if (st.recent.length > 160) st.recent.splice(0, st.recent.length - 160);
	st.counts[e.kind] = (st.counts[e.kind] ?? 0) + 1;
}

export function logHz(sim: Simulation, kind: HazardKind | 'plague', text: string, cell: number, state: number, cause?: number): ChronEvent {
	return sim.log('disaster', text, cell, state || undefined, kind, cause);
}

/** hunger after ruin: a lighter famine than the random one, then the ruler's famine choice (society/famine.ts) */
export function famineAfter(sim: Simulation, state: number, r: Rng, cause: number | undefined, town: string) {
	const p = sim.polities[state];
	if (!p?.alive || !state) return;
	const c = sim.c;
	for (let i = 0; i < c.n; i++) if (c.state[i] === state) c.pop[i] *= 0.94;
	p.stability = clamp(p.stability - 5, 0, 100);
	const cap = sim.w.burgs[p.capital];
	const ev = sim.log('disaster', line(sim, 'famine', r, { realm: p.name, town }), cap?.cell, p.id, 'famine', cause);
	hz(sim).counts.famine = (hz(sim).counts.famine ?? 0) + 1;
	onFamine(sim, p, ev);
}
