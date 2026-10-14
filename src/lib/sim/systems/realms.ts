/** Rebellions and revolts, colonisation of neutral land, tribes and new realms, yearly random events. */
import type { Simulation } from '../engine';
import { clamp } from '../../rng';
import { neighbors } from '../../gen/grid';
import { makeName } from '../../gen/names';
import { BIOMES } from '../../gen/physical';
import { GENRES } from '../../gen/genre';
import { palette, polityForm } from '../../gen/society';
import { narrateColonization, narrateDisaster, narrateFounding, narrateMiscEvent, narratePalaceCoup, narrateRebellion } from '../chronicle';
import { generateFactionsForPolity, formatRegimeTitle } from '../politics';
import { assignPatronDeity } from '../pantheon';
import { packLine } from '../genrepacks';
import { cultureMod } from '../culture';
import type { IdeologyKind, Person, Polity } from '../types';

export function rebellions(sim: Simulation) {
	for (const pol of sim.polities) {
		if (!pol.alive || pol.cells < 12) continue;
		if (pol.stability > 25) continue;
		if (!sim.rng.chance((25 - pol.stability) / 70)) continue;
		sim.revolt(pol);
	}
}

/** Split part of a realm around a rebel town into a new polity at war with its old master. */
export function revolt(sim: Simulation, pol: Polity, nearCell?: number, leader?: Person): Polity | null {
	const c = sim.c;
	const r = sim.rng;
	const towns = sim.idx.burgsIn(sim.w.burgs, pol.id).filter((b) => b.id && b.alive && b.state === pol.id && b.id !== pol.capital);
	if (!towns.length) return null;
	let town = towns[0];
	if (nearCell !== undefined) {
		town = towns.reduce((best, b) => ((b.x - c.x[nearCell]) ** 2 + (b.y - c.y[nearCell]) ** 2 < (best.x - c.x[nearCell]) ** 2 + (best.y - c.y[nearCell]) ** 2 ? b : best));
	} else {
		const cap = sim.w.burgs[pol.capital];
		const score = (b: (typeof towns)[0]) => Math.hypot(b.x - cap.x, b.y - cap.y) * (b.culture !== pol.culture ? 2 : 1) * (0.5 + r());
		town = towns.sort((a, b) => score(b) - score(a))[0];
	}
	// grow region (in the town's own layer): cells closer (by BFS) to the rebel town than to the capital
	const li = sim.burgLayer(town);
	const S = sim.st(li);
	const capCell = sim.burgLayer(sim.w.burgs[pol.capital]) === li ? sim.w.burgs[pol.capital].cell : -1;
	const dist = (start: number) => {
		const d = new Int32Array(c.n).fill(-1);
		d[start] = 0;
		const q = [start];
		for (let qi = 0; qi < q.length; qi++) {
			const i = q[qi];
			for (const j of neighbors(c, i)) if (d[j] < 0 && S[j] === pol.id) { d[j] = d[i] + 1; q.push(j); }
		}
		return d;
	};
	const dr = dist(town.cell), dc = capCell >= 0 ? dist(capCell) : new Int32Array(c.n).fill(-1);
	const cand: number[] = [];
	for (let i = 0; i < c.n; i++) if (S[i] === pol.id && dr[i] >= 0 && (dc[i] < 0 || dr[i] < dc[i])) cand.push(i);
	cand.sort((a, b) => dr[a] - dr[b]);
	const take = cand.slice(0, Math.max(3, Math.floor(pol.cells * (0.2 + r() * 0.25))));
	if (take.length < 3) return null;
	const id = sim.polities.length;
	const L = sim.lang(town.culture);
	const name = r.chance(0.6) ? town.name : makeName(L, 'land');

	// Determine ideological motive of the revolt
	const parentIdeology = pol.ideology ?? 'monarchy';
	let rebelIdeology: IdeologyKind;
	const roll = r();
	if (parentIdeology === 'monarchy') {
		if (roll < 0.45) rebelIdeology = 'republic';
		else if (roll < 0.75) rebelIdeology = 'communal';
		else if (roll < 0.88) rebelIdeology = 'oligarchy';
		else if (roll < 0.95) rebelIdeology = 'theocracy';
		else rebelIdeology = 'monarchy';
	} else if (parentIdeology === 'autocracy') {
		if (roll < 0.50) rebelIdeology = 'republic';
		else if (roll < 0.85) rebelIdeology = 'communal';
		else rebelIdeology = 'oligarchy';
	} else if (parentIdeology === 'theocracy') {
		if (roll < 0.50) rebelIdeology = 'republic';
		else if (roll < 0.80) rebelIdeology = 'communal';
		else rebelIdeology = 'theocracy';
	} else {
		rebelIdeology = r.pick(['republic', 'communal', 'oligarchy', 'autocracy', 'technocracy', 'monarchy']);
	}

	const { form, fullName } = formatRegimeTitle(name, rebelIdeology, sim.rng);
	const share = take.length / pol.cells;
	const np: Polity = {
		id,
		name,
		form,
		fullName,
		ideology: rebelIdeology,
		color: palette(r, 1, 60, 55)[0],
		capital: town.id,
		culture: town.culture,
		religion: li === 0 ? c.religion[town.cell] : pol.religion,
		alive: true,
		founded: sim.year,
		treasury: pol.treasury * share,
		army: pol.army * share * 1.2,
		stability: 65,
		tax: 0.1,
		ruler: 0,
		heir: 0,
		relations: { [pol.id]: -80 },
		allies: [],
		cells: 0,
		pop: 0,
		peak: 0,
		expansionism: 1.1,
		origin: 'rebellion',
		layer: li
	};
	pol.relations[id] = -80;
	pol.army *= 1 - share;
	pol.treasury *= 1 - share;
	np.factions = generateFactionsForPolity(np, sim.people, sim.rng);
	assignPatronDeity(np, sim.rng);
	sim.polities.push(np);
	for (const i of take) S[i] = id;
	sim.syncBurgs();
	town.capital = true;
	sim.crown(np, leader ?? sim.makePerson(town.culture, id, town.id, 'ruler', r.int(25, 50)));
	sim.makePerson(town.culture, id, town.id, 'general', r.int(25, 45));
	pol.stability = clamp(pol.stability + 15, 0, 100);
	sim.recount();
	sim.computeBorders();
	sim.dirty.political = true;
	const rebelText = narrateRebellion(sim.rng, town.name, pol.name, np.fullName, sim.ruler(np).name, rebelIdeology);
	sim.log('rebel', rebelText, town.cell, id);
	if (r.chance(0.8)) sim.declareWar(pol.id, id, 'to crush the rebels');
	return np;
}

/** neutral lands slowly get settled by neighbours */
export function colonize(sim: Simulation) {
	const c = sim.c;
	const r = sim.rng;
	for (let k = 0; k < 40; k++) {
		const li = k % sim.w.layers.length;
		const S = sim.st(li);
		const i = r.int(0, c.n - 1);
		if (!sim.open(li, i) || S[i]) continue;
		if (li === 0 && BIOMES[c.biome[i]].hab === 0) continue;
		for (const j of neighbors(c, i)) {
			const s = S[j];
			if (s && sim.open(li, j) && sim.polities[s].alive && r.chance(0.25 * sim.polities[s].expansionism * cultureMod(sim, sim.polities[s], 'colonize'))) {
				S[i] = s;
				const bid = sim.lb[li][i];
				if (bid) {
					sim.w.burgs[bid].state = s;
					sim.idx.touch();
					const colText = narrateColonization(sim.rng, sim.polities[s].name, sim.w.burgs[bid].name);
					sim.log('found', colText, i, s);
				}
				sim.dirty.political = true;
				break;
			}
		}
	}
}

/** independent towns in neutral land may found a new realm */
export function tribes(sim: Simulation) {
	const free = sim.w.burgs.filter((b) => b.id && b.alive && !b.state && b.pop > 0.8);
	if (!free.length || !sim.rng.chance(0.15)) return;
	const b = sim.rng.pick(free);
	sim.foundState(b.id, 'tribe');
}

export function foundState(sim: Simulation, burgId: number, origin: string, leader?: Person): Polity {
	const c = sim.c;
	const r = sim.rng;
	const b = sim.w.burgs[burgId];
	const L = sim.lang(b.culture);
	const form = origin === 'tribe' && r() > GENRES[sim.w.opts.genre].formBias ? r.pick(['Chiefdom', 'Principality', 'Free City', 'Tribe']) : polityForm(r, sim.w.cultures[b.culture]?.sphere ?? '', sim.w.opts.genre, sim.w.cultures[b.culture]?.type ?? 'Generic');
	const name = r.chance(0.5) ? b.name : makeName(L, 'land');
	const id = sim.polities.length;
	const li = sim.burgLayer(b);
	const S = sim.st(li);
	const np: Polity = { id, name, form, fullName: `${form} of ${name}`, color: palette(r, 1, 60, 55)[0], capital: b.id, culture: b.culture, religion: li === 0 ? c.religion[b.cell] : sim.w.religions.find((x) => x.culture === b.culture)?.id ?? 0, alive: true, founded: sim.year, treasury: 20, army: 1, stability: 60, tax: 0.1, ruler: 0, heir: 0, relations: {}, allies: [], cells: 0, pop: 0, peak: 0, expansionism: 1.3, origin, layer: li };
	assignPatronDeity(np, sim.rng);
	sim.polities.push(np);
	const prev = sim.polities[S[b.cell]];
	S[b.cell] = id;
	for (const j of neighbors(c, b.cell)) if (sim.open(li, j) && (!S[j] || origin === 'rift')) S[j] = id;
	if (prev?.alive && prev.capital === b.id) sim.relocateCapital(prev);
	b.state = id;
	sim.idx.touch();
	b.capital = true;
	sim.crown(np, leader ?? sim.makePerson(b.culture, id, b.id, 'ruler', r.int(20, 45)));
	sim.recount();
	sim.dirty.political = true;
	const foundText = narrateFounding(sim.rng, np.fullName, b.name);
	sim.log('found', foundText, b.cell, id);
	return np;
}

export function randomEvents(sim: Simulation) {
	const r = sim.rng;
	const alive = sim.polities.filter((p) => p.alive);
	if (!alive.length) return;
	const n = r.int(0, 2);
	for (let k = 0; k < n; k++) {
		const p = r.pick(alive);
		const cap = sim.w.burgs[p.capital];
		const roll = r();
		if (roll < 0.2) {
			p.stability += 15;
			p.treasury += 30;
			sim.log('misc', packLine(sim.voice, 'golden', sim.rng, { realm: p.name, town: cap.name }) ?? narrateMiscEvent(sim.rng, 'golden_age', cap.name, p.name), cap.cell, p.id);
		} else if (roll < 0.35) {
			for (let i = 0; i < sim.c.n; i++) if (sim.c.state[i] === p.id) sim.c.pop[i] *= 0.85;
			p.stability -= 10;
			sim.log('disaster', packLine(sim.voice, 'famine', sim.rng, { realm: p.name, town: cap.name }) ?? narrateDisaster(sim.rng, 'famine', cap.name, p.name), cap.cell, p.id);
		} else if (roll < 0.45) {
			const towns = sim.idx.burgsIn(sim.w.burgs, p.id).filter((b) => b.alive && b.state === p.id);
			if (towns.length) {
				const t = r.pick(towns);
				t.pop = +(t.pop * 0.7).toFixed(2);
				sim.log('disaster', narrateDisaster(sim.rng, 'fire', t.name, p.name), t.cell, p.id);
			}
		} else if (roll < 0.52) {
			const towns = sim.idx.burgsIn(sim.w.burgs, p.id).filter((b) => b.alive && b.state === p.id);
			if (towns.length) sim.seedPlague(r.pick(towns).cell, 0.6);
		} else if (roll < 0.6) {
			const omenKind = r.pick(['comet', 'library', 'wall', 'road', 'omen'] as const);
			sim.log('misc', narrateMiscEvent(sim.rng, omenKind, cap.name, p.name), cap.cell, p.id);
		} else if (roll < 0.66) {
			const ruler = sim.ruler(p);
			if (ruler?.alive && p.id !== sim.playerState() && r.chance(0.5)) {
				const plotter = sim.general(p);
				if (plotter && plotter.intrigue + plotter.martial > ruler.intrigue + 10 && p.stability < 40) {
					const coupText = narratePalaceCoup(sim.rng, plotter.name, ruler.name, p.name);
					sim.log('rebel', coupText, cap.cell, p.id);
					sim.kill(ruler, 'the coup');
					sim.crown(p, plotter);
				}
			}
		}
	}
}
