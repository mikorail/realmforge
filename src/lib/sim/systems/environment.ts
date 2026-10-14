/** Plague spread, terraforming after terrain edits, live climate reconfiguration. */
import type { Simulation } from '../engine';
import { makeRng } from '../../rng';
import { neighbors } from '../../gen/grid';
import { assignBiomes, assignPopulation, biomeOf, BIOMES, climate, markFeatures, planetBiomes, precipitation } from '../../gen/physical';
import { withDefaults } from '../../gen/options';
import type { Climate, World } from '../../gen/types';
import { narrateDisaster } from '../chronicle';

export function seedPlague(sim: Simulation, cell: number, v = 1) {
	sim.plagueActive = true;
	sim.plague[cell] = Math.max(sim.plague[cell], v);
	const b = sim.c.burg[cell] ? sim.w.burgs[sim.c.burg[cell]] : null;
	sim.log('disaster', narrateDisaster(sim.rng, 'plague', b?.name ?? 'the frontier'), cell, sim.c.state[cell], 'plague');
	sim.dirty.political = true;
}

export function spreadPlague(sim: Simulation) {
	if (!sim.plagueActive) return;
	const c = sim.c, pl = sim.plague;
	let any = false;
	const next = pl.slice();
	for (let i = 0; i < c.n; i++) {
		if (pl[i] <= 0.02) { if (pl[i]) next[i] = 0; continue; }
		any = true;
		c.pop[i] *= 1 - pl[i] * 0.04;
		next[i] = pl[i] * 0.93;
		for (const j of neighbors(c, i)) {
			if (!sim.isLand(j) && !c.road[i]) continue;
			const spread = pl[i] * (c.road[j] ? 0.35 : 0.18) * (c.pop[j] > 1 ? 1.2 : 0.6);
			if (spread > next[j] && sim.rng.chance(0.3)) next[j] = Math.min(1, spread);
		}
	}
	sim.plague = next;
	if (any) sim.dirty.political = true;
	if (sim.plagueActive && !any) sim.log('misc', 'After seasons of dread, the pestilence finally burns itself out; survivors emerge from shuttered homes to bury the dead and rebuild.');
	sim.plagueActive = any;
}

/** re-derive water bodies / biomes after terrain edits (rivers stay put) */
export function terraform(sim: Simulation) {
	const c = sim.c;
	const { width: W, height: H } = sim.w.opts;
	sim.w.features = markFeatures(c, W, H);
	for (let i = 0; i < c.n; i++) {
		c.biome[i] = biomeOf(c.h[i], c.temp[i], c.prec[i], c.flux[i], c.n);
		if (!sim.isLand(i)) {
			if (c.state[i]) c.state[i] = 0;
			c.pop[i] = 0;
			if (c.burg[i]) {
				const b = sim.w.burgs[c.burg[i]];
				b.alive = false;
				c.burg[i] = 0;
				sim.log('disaster', `Surging waters engulf the ramparts: ${b.name} sinks beneath the waves and is lost to the sea.`, i, b.state);
				const owner = sim.polities[b.state];
				if (owner?.capital === b.id && !sim.relocateCapital(owner)) sim.fall(owner);
			}
		} else if (sim.basePop[i] === 0 && BIOMES[c.biome[i]].hab) {
			sim.basePop[i] = BIOMES[c.biome[i]].hab / 20;
			c.pop[i] = 0.05;
		}
	}
	sim.recount();
	sim.dirty.terrain = true;
	sim.dirty.political = true;
}

/** Configure World, live: re-run climate + precipitation + biomes; people rescale to the new carrying capacity. */
export function reclimate(sim: Simulation, cl: Climate, silent = false) {
	const c = sim.c;
	const w = sim.w;
	w.opts = withDefaults({ ...w.opts, climate: { ...cl, winds: [...cl.winds] } });
	const { width: W, height: H } = w.opts;
	const lat = climate(c, H, w.opts.climate);
	precipitation(makeRng(w.opts.seed + ':clim'), c, W, H, lat, w.opts.climate);
	assignBiomes(c);
	planetBiomes(c, w.opts.planet, makeRng(w.opts.seed + ':pb'));
	const cur = c.pop.slice();
	const old = sim.basePop;
	assignPopulation(c, w.features);
	const next = c.pop.slice();
	for (let i = 0; i < c.n; i++) c.pop[i] = old[i] > 0 ? (cur[i] * next[i]) / old[i] : next[i] * 0.3;
	sim.basePop = next;
	sim.recount();
	if (!silent) sim.log('god', `The heavens shift and winds veer: the global climate of ${sim.w.name} is permanently remade by divine will.`);
	sim.dirty.terrain = true;
	sim.dirty.political = true;
}
