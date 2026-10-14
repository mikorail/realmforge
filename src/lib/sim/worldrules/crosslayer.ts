/** Cross-layer politics, yearly: surface realms tax the undercity, sky realms blockade the ground below, sea realms toll and embargo ports. */
import type { Simulation } from '../engine';
import { clamp } from '../../rng';

export function yearlyCrossLayer(sim: Simulation) {
	const w = sim.w, r = sim.rng, P = sim.polities;
	for (const rt of w.routes) {
		if (rt.kind !== 'shaft') continue;
		const low = w.burgs[rt.a], up = w.burgs[rt.b];
		if (!low?.alive || !up?.alive || !low.state || !up.state || low.state === up.state) continue;
		const L = P[low.state], U = P[up.state];
		if (!L?.alive || !U?.alive || sim.atWar(L.id, U.id)) continue;
		const kind = w.layers[sim.burgLayer(low)]?.kind;
		const rel = sim.rel(L.id, U.id);
		if (kind === 'deep') {
			const tax = +clamp(low.pop * 0.3, 0.2, 6).toFixed(2);
			L.treasury -= tax;
			U.treasury += tax;
			sim.addRel(L.id, U.id, -1);
			if (rel < -40 && L.stability < 60 && r.chance(0.12)) {
				U.treasury -= tax * 3;
				U.stability = clamp(U.stability - 3, 0, 100);
				L.stability = clamp(L.stability + 4, 0, 100);
				sim.addRel(L.id, U.id, -6);
				sim.log('rebel', `TAX REVOLT: the undercity of ${low.name} bars the shaft to ${up.name}, and the tithe-collectors of ${U.name} are turned back at the lamps of ${L.name}.`, low.cell, L.id);
			} else if (rel < -15 && r.chance(0.05)) {
				sim.log('misc', `${U.name} squeezes the shaft-tolls of ${low.name}; the miners of ${L.name} mutter beneath the stone.`, up.cell, U.id);
			}
		} else if (kind === 'sky') {
			if (rel < 5 && r.chance(0.15)) {
				U.treasury -= 4 + up.pop * 0.5;
				U.stability = clamp(U.stability - 1.5, 0, 100);
				sim.addRel(L.id, U.id, -3);
				sim.log('misc', `SKY BLOCKADE: the floating hosts of ${L.name} close the air-lanes above ${up.name}, starving ${U.name} of the high trade.`, up.cell, U.id);
			}
		} else if (kind === 'sea') {
			const toll = +clamp(up.pop * 0.25, 0.2, 5).toFixed(2);
			U.treasury -= toll;
			L.treasury += toll;
			sim.addRel(L.id, U.id, -0.5);
			if (rel < -25 && r.chance(0.2)) {
				U.treasury -= 8 + up.pop * 0.5;
				sim.addRel(L.id, U.id, -4);
				sim.log('misc', `SEA EMBARGO: ${L.name} seals the deep channels, and no hull leaves the port of ${up.name} for ${U.name}.`, up.cell, U.id);
			} else if (rel < 0 && r.chance(0.04)) {
				sim.log('misc', `${L.name} raises its port toll at ${up.name}; the harbour-masters of ${U.name} protest.`, up.cell, U.id);
			}
		}
	}
}
