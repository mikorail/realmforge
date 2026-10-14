/** Planet-specific rules (world.opts.planet). Small hooks called from existing systems; all effects are modest. */
import type { Simulation } from '../engine';
import { clamp } from '../../rng';
import { neighbors } from '../../gen/grid';
import { BIOMES } from '../../gen/physical';

const naval = new WeakMap<Simulation, Float64Array>();
const wet = new WeakMap<Simulation, { year: number; share: Float64Array }>();

export const planetOf = (sim: Simulation) => sim.w.opts.planet;

/** ocean worlds: up to +15% strength for realms whose towns are mostly ports (refreshed yearly) */
export function navalMult(sim: Simulation, id: number): number {
	return naval.get(sim)?.[id] ?? 1;
}

function refreshNaval(sim: Simulation) {
	const n = sim.polities.length, ports = new Float64Array(n), all = new Float64Array(n);
	for (const b of sim.w.burgs) {
		if (!b.id || !b.alive || !b.state || b.state >= n) continue;
		all[b.state]++;
		if (b.port) ports[b.state]++;
	}
	const m = new Float64Array(n).fill(1);
	for (let i = 1; i < n; i++) if (all[i]) m[i] = 1 + 0.15 * (ports[i] / all[i]);
	naval.set(sim, m);
}

/** ice worlds: no front moves in the coldest months */
export function campaignHalted(sim: Simulation): boolean {
	if (planetOf(sim) !== 'ice') return false;
	const m = sim.month;
	return m === 11 || m === 0 || m === 1;
}

/** share of each realm's habitable surface cells that are water-rich (river or wetland) */
export function wetShare(sim: Simulation): Float64Array {
	const hit = wet.get(sim);
	if (hit && hit.year === sim.year) return hit.share;
	const n = sim.polities.length, tot = new Float64Array(n), w = new Float64Array(n), c = sim.c;
	for (let i = 0; i < c.n; i++) {
		const s = c.state[i];
		if (!s || s >= n || BIOMES[c.biome[i]].hab === 0) continue;
		tot[s]++;
		if (c.river[i] > 0 || c.biome[i] === 12) w[s]++;
	}
	const share = new Float64Array(n);
	for (let i = 1; i < n; i++) if (tot[i]) share[i] = w[i] / tot[i];
	wet.set(sim, { year: sim.year, share });
	return share;
}

/** ocean worlds: extra coastal and sea-layer colonization attempts (called after the normal pass) */
export function extraColonize(sim: Simulation) {
	if (planetOf(sim) !== 'ocean') return;
	const c = sim.c, r = sim.rng;
	const seaLi = sim.w.layers.findIndex((l) => l.kind === 'sea');
	for (let k = 0; k < 14; k++) {
		const li = k % 2 && seaLi > 0 ? seaLi : 0;
		const S = sim.st(li);
		const i = r.int(0, c.n - 1);
		if (!sim.open(li, i) || S[i]) continue;
		if (li === 0 && (BIOMES[c.biome[i]].hab === 0 || c.dist[i] !== 1)) continue;
		for (const j of neighbors(c, i)) {
			const s = S[j];
			if (s && sim.open(li, j) && sim.polities[s].alive && r.chance(0.2 * sim.polities[s].expansionism)) {
				S[i] = s;
				const bid = sim.lb[li][i];
				if (bid) {
					sim.w.burgs[bid].state = s;
					sim.idx.touch();
					sim.log('found', `${sim.polities[s].name} sends its sea-captains to settle ${sim.w.burgs[bid].name}, claiming the isle for the crown.`, i, s);
				}
				sim.dirty.political = true;
				break;
			}
		}
	}
}

const ODD: readonly [string, string, number, number][] = [
	['CRYSTAL CHORUS', 'The crystal fields of {s} sing at dusk for nine nights; scholars flock to listen.', 3, 4],
	['SPORE-RAIN', 'A rain of glittering spores falls across {s}; the harvest is strange but heavy.', 2, 6],
	['GLASS DAWN', 'The sun rises through glass-coloured haze over {s}, and the people take it for an omen of favour.', 4, 0],
	['GRAVITY TIDE', 'Stones drift an arm-span above the ground in {s}; carts will not roll for a week and the markets close.', -3, -4],
	['WHISPERING LIGHTS', 'Pale lights whisper from the horizon over {s}; the watch deserts its posts to follow them.', -4, 0]
];

/** exotic worlds: odd phenomena */
function exoticEvent(sim: Simulation) {
	if (!sim.rng.chance(0.18)) return;
	const live = sim.polities.filter((p) => p.alive && p.id);
	if (!live.length) return;
	const p = sim.rng.pick(live), e = sim.rng.pick(ODD as unknown as [string, string, number, number][]);
	p.stability = clamp(p.stability + e[2], 0, 100);
	p.treasury += e[3];
	sim.log('misc', `${e[0]}: ${e[1].replace('{s}', p.name)}`, sim.w.burgs[p.capital]?.cell, p.id);
}

/** volcanic worlds: rare eruptions scar a high cell and its ring */
export function eruption(sim: Simulation, force = false) {
	if (!force && !sim.rng.chance(0.07)) return;
	const c = sim.c, r = sim.rng;
	let cell = -1;
	for (let t = 0; t < 40; t++) {
		const i = r.int(0, c.n - 1);
		if (c.h[i] >= 55 && c.biome[i] && BIOMES[c.biome[i]].hab > 0) { cell = i; break; }
	}
	if (cell < 0) return;
	const ring = [cell, ...neighbors(c, cell)];
	for (const i of ring) {
		if (c.biome[i] && c.biome[i] !== 16) c.biome[i] = 13;
		c.pop[i] *= i === cell ? 0.3 : 0.65;
	}
	const set = new Set(ring);
	for (const b of sim.w.burgs) {
		if (!b.id || !b.alive || sim.burgLayer(b) !== 0 || !set.has(b.cell)) continue;
		b.pop = +(b.pop * 0.75).toFixed(2);
	}
	const owner = c.state[cell];
	if (owner) sim.polities[owner].stability = clamp(sim.polities[owner].stability - 3, 0, 100);
	let name = 'the burning mountain', best = Infinity;
	for (const b of sim.w.burgs) {
		if (!b.id || !b.alive || sim.burgLayer(b) !== 0) continue;
		const d = (b.x - c.x[cell]) ** 2 + (b.y - c.y[cell]) ** 2;
		if (d < best) { best = d; name = `the mountain above ${b.name}`; }
	}
	sim.dirty.terrain = true;
	sim.log('disaster', `ERUPTION: ${name} bursts open; ash buries the fields and the surrounding lands lose many souls.`, cell, owner || undefined);
}

/** desert worlds: rivers and wetlands are wealth; envious neighbours cool toward the wet realms */
function desertRules(sim: Simulation) {
	const share = wetShare(sim);
	for (const p of sim.polities) {
		if (!p.alive || !p.id || !(share[p.id] > 0)) continue;
		p.treasury += clamp(share[p.id] * p.pop * p.tax * 0.6, 0, 25);
	}
	for (const t of sim.polities) {
		if (!t.alive || !t.id || !(share[t.id] >= 0.12)) continue;
		for (const n of sim.neighborsOf(t.id)) {
			const np = sim.polities[n];
			if (!np?.alive || share[n] >= share[t.id] || np.allies.includes(t.id) || np.overlord === t.id) continue;
			sim.addRel(n, t.id, -2);
		}
	}
}

export function yearlyPlanetRules(sim: Simulation) {
	switch (planetOf(sim)) {
		case 'ocean': refreshNaval(sim); break;
		case 'desert': desertRules(sim); break;
		case 'volcanic': eruption(sim); break;
		case 'exotic': exoticEvent(sim); break;
	}
}
