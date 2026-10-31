/**
 * Cultural prestige: every 5 years each culture is scored from the wonders standing in its lands, its living
 * luminaries and their great works, its art movements, its great works and festivals (spherelore), lingua-franca
 * routes and the weight of the realms that speak it. The smoothed score becomes a mild multiplier (0.8 to 1.4)
 * on conquest assimilation and lingua-franca choice (culture/index.ts). Reading it never draws from `sim.rng`.
 */
import type { Simulation } from '../engine';
import { isWonderStanding } from '../wonders';
import { line, PRESTIGE_LINES } from './data';
import { w3On, w3Rng } from './state';

const LUMINARY_ROLES = new Set(['magician', 'thinker', 'artist', 'athlete', 'inventor']);

export interface PrestigeParts {
	wonders: number;
	luminaries: number;
	arts: number;
	works: number;
	trade: number;
	realms: number;
}

/** raw score per culture this year, with its sources */
export function rawPrestige(sim: Simulation): Map<number, PrestigeParts> {
	const out = new Map<number, PrestigeParts>();
	const get = (id: number) => {
		let p = out.get(id);
		if (!p) out.set(id, (p = { wonders: 0, luminaries: 0, arts: 0, works: 0, trade: 0, realms: 0 }));
		return p;
	};
	const cultureOfRealm = (id: number | undefined) => (id ? sim.polities[id]?.culture : undefined);
	for (const w of sim.wonders) {
		if (!isWonderStanding(w)) continue;
		const cu = (w.burgId ? sim.w.burgs[w.burgId]?.culture : undefined) ?? cultureOfRealm(w.stateId);
		if (cu) get(cu).wonders += 4 + Math.min(6, (w.fame ?? 0) / 20);
	}
	for (const p of sim.idx.living(sim.people)) {
		if (!LUMINARY_ROLES.has(p.role) && !p.magnumOpus) continue;
		get(p.culture).luminaries += p.magnumOpus ? 4 : 1.5;
	}
	for (const m of sim.cx.movements) if (m.status === 'flourishing' || m.status === 'rising') get(m.culture).arts += m.status === 'flourishing' ? 5 : 2;
	for (const [id, n] of Object.entries(sim.w3.works)) get(+id).works += n;
	for (const l of sim.cx.lingua) get(l.culture).trade += 6;
	for (const pol of sim.polities) if (pol.alive && pol.id && pol.culture) get(pol.culture).realms += Math.sqrt(Math.max(0, pol.pop)) * 0.3 + (pol.layer === 0 ? 1 : 0.5);
	return out;
}

export const total = (p: PrestigeParts) => p.wonders + p.luminaries + p.arts + p.works + p.trade + p.realms;

/** fold this year's great works into the decaying tally (called yearly) */
function countWorks(sim: Simulation) {
	const st = sim.w3, all = sim.allEvents;
	for (let i = all.length - 1; i >= 0; i--) {
		const e = all[i];
		if (e.y < sim.year) break;
		if (e.kind !== 'culture' || !e.state) continue;
		const cu = sim.polities[e.state]?.culture;
		if (!cu) continue;
		const great = e.text.includes(' completes ') || e.text.includes('a marvel of');
		st.works[cu] = (st.works[cu] ?? 0) + (great ? 3 : 0.3);
	}
}

export function yearlyPrestige(sim: Simulation) {
	countWorks(sim);
	if (sim.year % 5 !== 0) return;
	const st = sim.w3;
	for (const k of Object.keys(st.works)) {
		st.works[+k] *= 0.85;
		if (st.works[+k] < 0.2) delete st.works[+k];
	}
	const raw = rawPrestige(sim);
	const next: Record<number, number> = {};
	for (const [id, p] of raw) next[id] = 0.6 * (st.prestige[id] ?? total(p)) + 0.4 * total(p);
	for (const k of Object.keys(st.prestige)) if (!(+k in next) && st.prestige[+k] * 0.6 > 0.5) next[+k] = st.prestige[+k] * 0.6;
	st.prestige = next;
	st.pmean = mean(sim);
	let top = 0, best = 0;
	for (const [k, v] of Object.entries(next)) if (v > best || (v === best && +k < top)) { best = v; top = +k; }
	if (top && top !== st.top && sim.year > 20) {
		let second = 0;
		for (const [k, v] of Object.entries(next)) if (+k !== top && v > second) second = v;
		if (best > second * 1.15 && sim.w.cultures[top]) {
			sim.log('culture', line(w3Rng(sim, 'prestige', sim.year), PRESTIGE_LINES, { world: sim.w.name, name: sim.w.cultures[top].name }), sim.w.cultures[top].center, undefined, 'prestige');
			st.top = top;
		}
	}
}

/** world mean of the scores that exist */
function mean(sim: Simulation): number {
	const v = Object.values(sim.w3.prestige);
	if (!v.length) return 0;
	let t = 0;
	for (const x of v) t += x;
	return t / v.length;
}

/** 0.8 .. 1.4 multiplier for a culture's pull (assimilation, lingua franca); exactly 1 when the system is off or unscored */
export function prestigeMult(sim: Simulation, culture: number): number {
	if (!sim.w3 || !w3On(sim)) return 1;
	const s = sim.w3.prestige[culture];
	const m = sim.w3.pmean ?? mean(sim);
	if (s === undefined || m <= 0) return 1;
	return Math.min(1.4, Math.max(0.8, 0.8 + 0.2 * (s / m)));
}

export interface PrestigeView {
	score: number;
	rank: number;
	of: number;
	mult: number;
	parts: PrestigeParts | null;
}

export function prestigeView(sim: Simulation, culture: number): PrestigeView | null {
	if (!sim.w3 || !w3On(sim)) return null;
	const s = sim.w3.prestige[culture];
	if (s === undefined) return null;
	const all = Object.entries(sim.w3.prestige).sort((a, b) => b[1] - a[1] || +a[0] - +b[0]);
	return { score: Math.round(s), rank: all.findIndex(([k]) => +k === culture) + 1, of: all.length, mult: prestigeMult(sim, culture), parts: rawPrestige(sim).get(culture) ?? null };
}
