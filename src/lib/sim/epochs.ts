import { neighbors } from '../gen/grid';
import { makeLang, makeName } from '../gen/names';
import { langSeed, palette } from '../gen/society';
import type { Simulation } from './engine';

/**
 * Deep time: the world itself changes over centuries.
 * - Climate epochs (ice age, warm period, great drought, pluvial age) drift the Configure-World
 *   climate a little every decade, re-running temperature, rain and biomes.
 * - Migrations: peoples under pressure (cold, hunger, defeat) spill into neighbouring realms.
 * - Dialects: a splinter realm that keeps its parent's culture for generations grows its own tongue.
 */
export interface ClimateEpoch {
	kind: 'ice' | 'warm' | 'drought' | 'pluvial';
	start: number;
	end: number;
	/** accumulated change applied so far */
	dT: number;
	dP: number;
}

const EPOCH_TEXT: Record<ClimateEpoch['kind'], { name: string; start: string; end: string; dT: number; dP: number }> = {
	ice: { name: 'Long Winter', start: 'A Long Winter settles on {world}: summers fail, glaciers creep down from the peaks and the northern harbours freeze.', end: 'The Long Winter loosens its grip on {world}; meltwater roars in the rivers once more.', dT: -0.6, dP: -2 },
	warm: { name: 'Golden Warmth', start: 'A Golden Warmth spreads across {world}: vineyards climb north and the passes stay open all year.', end: 'The Golden Warmth of {world} fades; old men speak of the endless summers.', dT: 0.5, dP: 1 },
	drought: { name: 'Great Drought', start: 'The Great Drought begins in {world}: rains fail year after year and the rivers shrink to threads.', end: 'Rain returns to {world} at last; the Great Drought is over.', dT: 0.2, dP: -5 },
	pluvial: { name: 'Age of Rains', start: 'An Age of Rains begins on {world}: lakes swell, deserts green and the marshes spread.', end: 'The Age of Rains on {world} draws to a close.', dT: 0, dP: 5 }
};

export function yearlyEpochs(sim: Simulation) {
	climateEpochs(sim);
	if (sim.year % 4 === 0) migrations(sim);
	if (sim.year % 20 === 0) dialects(sim);
}

function climateEpochs(sim: Simulation) {
	const r = sim.rng;
	const e = sim.epoch;
	if (!e) {
		if (sim.year > 40 && r.chance(1 / 180)) {
			const kind = r.pick(['ice', 'warm', 'drought', 'pluvial'] as const);
			const len = r.int(40, 120);
			sim.epoch = { kind, start: sim.year, end: sim.year + len, dT: 0, dP: 0 };
			sim.log('disaster', EPOCH_TEXT[kind].start.replace('{world}', sim.w.name));
		}
		return;
	}
	const def = EPOCH_TEXT[e.kind];
	const half = (e.start + e.end) / 2;
	if (sim.year >= e.end) {
		// snap back whatever drift remains
		applyDrift(sim, -e.dT, -e.dP);
		sim.log('misc', def.end.replace('{world}', sim.w.name));
		sim.epoch = null;
		return;
	}
	if ((sim.year - e.start) % 10 !== 0) return;
	// worsen through the first half, recover through the second
	const sign = sim.year < half ? 1 : -1;
	const dT = def.dT * sign, dP = def.dP * sign;
	e.dT += dT;
	e.dP += dP;
	applyDrift(sim, dT, dP);
}

function applyDrift(sim: Simulation, dT: number, dP: number) {
	if (!dT && !dP) return;
	const cl = sim.w.opts.climate;
	sim.reclimate({ ...cl, tEq: cl.tEq + dT, tN: cl.tN + dT * 1.5, tS: cl.tS + dT * 1.5, prec: Math.max(5, cl.prec + dP), winds: [...cl.winds] }, true);
}

function migrations(sim: Simulation) {
	const r = sim.rng;
	const c = sim.c;
	const pressured = sim.polities.filter((p) => p.alive && p.id && p.layer === 0 && p.cells > 6 && (p.stability < 30 || (sim.epoch && (sim.epoch.kind === 'ice' || sim.epoch.kind === 'drought'))));
	if (!pressured.length || !r.chance(0.35)) return;
	const from = r.pick(pressured);
	const nbs = sim.neighborsOf(from.id).map((id) => sim.polities[id]).filter((n) => n.alive && n.layer === 0);
	if (!nbs.length) return;
	const to = nbs.sort((a, b) => b.stability - a.stability)[0];
	const migrant = from.culture;
	if (!migrant || migrant === to.culture) return;
	// settle the border band of the host realm
	const band: number[] = [];
	for (let i = 0; i < c.n; i++) {
		if (c.state[i] !== to.id || c.culture[i] === migrant) continue;
		for (const j of neighbors(c, i)) if (c.state[j] === from.id) { band.push(i); break; }
	}
	const settled = band.sort(() => r() - 0.5).slice(0, r.int(4, 14));
	if (settled.length < 3) return;
	for (const i of settled) {
		c.culture[i] = migrant;
		c.pop[i] *= 1.1;
	}
	to.stability = Math.max(0, to.stability - 3);
	to.pop += settled.length * 0.2;
	const why = sim.epoch?.kind === 'ice' ? 'fleeing the cold' : sim.epoch?.kind === 'drought' ? 'fleeing the drought' : 'fleeing turmoil';
	sim.log('found', `Waves of ${sim.w.cultures[migrant].name} folk, ${why}, cross from ${from.name} and settle the borderlands of ${to.name}.`, settled[0], to.id);
	sim.dirty.political = true;
}

function dialects(sim: Simulation) {
	const r = sim.rng;
	const c = sim.c;
	for (const p of sim.polities) {
		if (!p.alive || !p.id || p.layer !== 0 || p.founded <= 0 || sim.year - p.founded < 80 || p.cells < 10) continue;
		// another realm must still share this culture, otherwise there's nothing to drift away from
		const parentCulture = p.culture;
		if (!sim.polities.some((q) => q.alive && q.id !== p.id && q.culture === parentCulture)) continue;
		if (!r.chance(0.2)) continue;
		const parent = sim.w.cultures[parentCulture];
		const id = sim.w.cultures.length;
		const L = makeLang(langSeed(sim.w.opts.seed, id) + ':dialect', parent.sphere || undefined);
		sim.langs[id] = L;
		const name = makeName(L, 'people');
		sim.w.cultures.push({ ...parent, id, name, color: palette(r, 1, 45, 62)[0], center: sim.w.burgs[p.capital]?.cell ?? parent.center, lang: id });
		let moved = 0;
		for (let i = 0; i < c.n; i++) if (c.state[i] === p.id && c.culture[i] === parentCulture) { c.culture[i] = id; moved++; }
		for (const b of sim.w.burgs) if (b.alive && b.state === p.id && b.culture === parentCulture) b.culture = id;
		p.culture = id;
		p.stability = Math.min(100, p.stability + 5);
		sim.log('culture', `Over ${sim.year - p.founded} years the speech of ${p.name} has drifted from the ${parent.name} tongue; its people now call themselves the ${name}.`, sim.w.burgs[p.capital]?.cell, p.id);
		sim.dirty.political = true;
		if (moved) break; // at most one new people per 20 years
	}
}
