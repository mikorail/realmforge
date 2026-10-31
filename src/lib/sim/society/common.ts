/** Shared per-year snapshot for the W3 systems: each surface realm's land cells and its culture / faith shares. */
import { cellsByState } from '../indexes';
import type { Simulation } from '../engine';
import type { Burg } from '../../gen/types';
import type { Polity } from '../types';

export interface RealmShares {
	/** land cells of the realm */
	cells: number[];
	cu: Map<number, number>;
	fa: Map<number, number>;
}

export function sharesOf(sim: Simulation): Map<number, RealmShares> {
	const own = cellsByState(sim.c.state, sim.polities.length);
	const out = new Map<number, RealmShares>();
	const c = sim.c;
	for (const p of sim.polities) {
		if (!p.alive || !p.id || p.layer !== 0) continue;
		const cells: number[] = [];
		const cu = new Map<number, number>(), fa = new Map<number, number>();
		for (let k = own.start[p.id], end = own.start[p.id + 1]; k < end; k++) {
			const i = own.cells[k];
			if (!sim.isLand(i)) continue;
			cells.push(i);
			cu.set(c.culture[i], (cu.get(c.culture[i]) ?? 0) + 1);
			fa.set(c.religion[i], (fa.get(c.religion[i]) ?? 0) + 1);
		}
		if (cells.length < 4) continue;
		for (const [k, v] of cu) cu.set(k, v / cells.length);
		for (const [k, v] of fa) fa.set(k, v / cells.length);
		out.set(p.id, { cells, cu, fa });
	}
	return out;
}

/** biggest living town of the realm, optionally only of one culture */
export function townOf(sim: Simulation, realm: number, culture?: number): Burg | null {
	let best: Burg | null = null;
	for (const b of sim.idx.burgsIn(sim.w.burgs, realm)) {
		if (!b.id || !b.alive || b.state !== realm) continue;
		if (culture !== undefined && b.culture !== culture) continue;
		if (!best || b.pop > best.pop) best = b;
	}
	return best;
}

export const rulerOf = (sim: Simulation, p: Polity) => {
	const r = sim.people[p.ruler];
	return r?.alive ? r : undefined;
};

export const rulerLabel = (sim: Simulation, p: Polity) => rulerOf(sim, p)?.name ?? `the council of ${p.name}`;

export const cultureName = (sim: Simulation, id: number) => sim.w.cultures[id]?.name ?? 'strangers';
export const faithName = (sim: Simulation, id: number) => sim.w.religions[id]?.name ?? 'the old faith';

/** budget so a world with many realms does not multiply events */
export const budget = (sim: Simulation) => Math.min(1, 10 / Math.max(1, sim.polities.filter((p) => p.alive && p.id).length));

export const has = (p: { traits: string[] } | undefined, t: string) => !!p?.traits.includes(t);
