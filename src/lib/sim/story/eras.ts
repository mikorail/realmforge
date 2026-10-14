/** Named eras: every 20 years each realm's recent stats are summed up into a title ("The Troubles of X"). */
import type { Simulation } from '../engine';

export const ERA_SPAN = 20;

interface Tally {
	famine: number;
	plague: number;
	riot: number;
	coup: number;
	capital: number;
	golden: number;
}

const EMPTY = (): Tally => ({ famine: 0, plague: 0, riot: 0, coup: 0, capital: 0, golden: 0 });

/** per-realm event counts over the last `span` years (one pass over the archive tail) */
function tallies(sim: Simulation, span: number): Map<number, Tally> {
	const out = new Map<number, Tally>();
	const all = sim.allEvents;
	for (let i = all.length - 1; i >= 0; i--) {
		const e = all[i];
		if (e.y <= sim.year - span) break;
		if (e.state === undefined) continue;
		let t = out.get(e.state);
		if (!t) out.set(e.state, (t = EMPTY()));
		if (e.tag === 'famine') t.famine++;
		else if (e.tag === 'plague') t.plague++;
		else if (e.tag === 'riot') t.riot++;
		else if (e.tag === 'coup' || e.tag === 'revolt') t.coup++;
		else if (e.tag === 'capital') t.capital++;
		else if (e.tag === 'golden') t.golden++;
	}
	return out;
}

function warsIn(sim: Simulation, id: number, from: number): number {
	let n = 0;
	for (const w of sim.wars) {
		if ((w.end ?? sim.year) < from) continue;
		if (w.attackers.includes(id) || w.defenders.includes(id)) n++;
	}
	return n;
}

/** pick the title from the stats of the period (first matching rule wins) */
export function eraTitle(name: string, s: { wars: number; t: Tally; growth: number; stability: number; reigns: number }): string {
	const { wars, t, growth, stability, reigns } = s;
	if (t.capital > 0 && wars > 0) return `The Burning Years of ${name}`;
	if (wars >= 2 || (wars >= 1 && t.riot + t.coup >= 2)) return `The Troubles of ${name}`;
	if (t.coup >= 2 || reigns >= 3) return `The Age of Usurpers in ${name}`;
	if (t.plague + t.famine >= 2) return `The Hungry Years of ${name}`;
	if (t.plague > 0 && wars === 0) return `The Pale Years of ${name}`;
	if (growth >= 0.25) return `The Ascendancy of ${name}`;
	if (growth <= -0.2) return `The Decline of ${name}`;
	if (wars === 0 && t.riot === 0 && t.coup === 0 && stability >= 60) return `The Long Peace of ${name}`;
	if (t.golden > 0 || (stability >= 70 && wars === 0)) return `The Golden Years of ${name}`;
	if (t.riot >= 2) return `The Restless Years of ${name}`;
	return `The Quiet Years of ${name}`;
}

export function yearlyEras(sim: Simulation) {
	if (sim.year % ERA_SPAN !== 0) return;
	const t = tallies(sim, ERA_SPAN);
	const from = sim.year - ERA_SPAN;
	for (const p of sim.polities) {
		if (!p.alive || !p.id) continue;
		// a realm younger than a decade has no era yet; its first era covers its life so far
		const begin = Math.max(from, p.founded);
		if (sim.year - begin < 10) continue;
		const growth = p.eraCells ? (p.cells - p.eraCells) / p.eraCells : 0;
		const reigns = (p.reigns ?? []).filter((r) => r.from > from).length;
		const name = eraTitle(p.name, {
			wars: warsIn(sim, p.id, from),
			t: t.get(p.id) ?? EMPTY(),
			growth,
			stability: p.stability,
			reigns
		});
		(p.eras ??= []).push({ from: begin, to: sim.year, name });
		if (p.eras.length > 30) p.eras.shift();
		p.era = name;
		p.eraCells = p.cells;
		sim.log('misc', `The annalists of ${p.name} will remember the years ${begin} to ${sim.year} as "${name}".`, sim.w.burgs[p.capital]?.cell, p.id, 'era');
	}
}
