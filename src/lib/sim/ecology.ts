import type { Rng } from '../rng';
import type { World } from '../gen/types';
import type { ChronEvent, LegendaryPlace, Polity } from './types';
import { destroyWonder } from './wonders';

export type EcoDisasterKind = 'wildfire' | 'flood' | 'mine_collapse' | 'dust_bowl' | 'arcane_meltdown' | 'dam_rupture';

export interface EcoDisasterRecord {
	kind: EcoDisasterKind;
	name: string;
	cell: number;
	year: number;
	description: string;
	casualtyEstimate: number;
}

/** Check and trigger ecological and human-made disasters caused by reckless mortal exploitation */
export function processAnthropogenicDisasters(
	world: World,
	polities: Polity[],
	year: number,
	rng: Rng,
	wonders?: LegendaryPlace[],
	innovation?: number
): ChronEvent[] {
	const c = world.cells;
	const events: ChronEvent[] = [];

	// Evaluate 3 to 5 candidate cells each year
	for (let attempt = 0; attempt < 4; attempt++) {
		if (!rng.chance(0.24)) continue;

		const cell = rng.int(0, c.n - 1);
		if (c.h[cell] < 20) continue; // Only land cells

		const bId = c.burg[cell];
		const stateId = c.state[cell];
		const pol = polities[stateId];
		const biome = c.biome[cell];
		const prec = c.prec[cell];
		const temp = c.temp[cell];
		const pop = c.pop[cell];

		// 1. Arcane Meltdown / Alchemical Explosion (high innovation realms, technocracies, or magic spires)
		if (((innovation ?? 0) > 40 || pol?.ideology === 'technocracy') && pop > 0.6 && rng.chance(0.25)) {
			const burgName = bId ? world.burgs[bId].name : `Arcane Proving Grounds of Cell ${cell}`;
			c.biome[cell] = 15; // Volcanic / Scorched Ash
			c.pop[cell] = Math.max(0.02, c.pop[cell] * 0.4);
			if (pol?.alive) {
				pol.stability = Math.max(5, pol.stability - 18);
				pol.treasury = Math.max(0, pol.treasury - 25);
			}
			events.push({
				y: year,
				m: rng.int(0, 11),
				kind: 'eco_disaster',
				text: `ARCANE MELTDOWN: Unstable alchemy and runaway leyline containment experiments detonate violently near ${burgName}! Magical shockwaves scorch the earth into irradiated ash, collapsing towers and displacing hundreds.`,
				cell,
				state: stateId
			});
			if (wonders) {
				const standingWonder = wonders.find((w) => w.cell === cell && !w.destroyed);
				if (standingWonder) {
					const res = destroyWonder(standingWonder, 'Arcane Meltdown', year, 'catastrophic alchemical explosion');
					events.push(res.event);
				}
			}
			continue;
		}

		// 2. Reservoir Dam Rupture (river settlements with intense population)
		if (c.river[cell] > 0 && pop > 1.6 && rng.chance(0.28)) {
			const burgName = bId ? world.burgs[bId].name : 'downstream settlements';
			c.pop[cell] = Math.max(0.05, c.pop[cell] * 0.6);
			if (pol?.alive) {
				pol.stability = Math.max(5, pol.stability - 14);
				pol.treasury = Math.max(0, pol.treasury - 20);
			}
			events.push({
				y: year,
				m: rng.int(0, 11),
				kind: 'eco_disaster',
				text: `RESERVOIR DAM RUPTURE: Overstressed stone sluices and neglected spillways give way above ${burgName}! A towering wall of muddy water sweeps through river valleys, drowning granaries and shattering bridges.`,
				cell,
				state: stateId
			});
			if (wonders) {
				const standingWonder = wonders.find((w) => w.cell === cell && !w.destroyed);
				if (standingWonder && (standingWonder.kind === 'bridge' || standingWonder.kind === 'giant_harbor' || rng.chance(0.45))) {
					const res = destroyWonder(standingWonder, 'Mega-Dam Rupture', year, 'torrential reservoir surge washed away foundations');
					events.push(res.event);
				}
			}
			continue;
		}

		// 3. Reckless Clearcutting & Wildfires (in dry forests)
		if ((biome === 5 || biome === 6 || biome === 12) && prec < 45 && temp > 15 && pop > 0.8) {
			const burgName = bId ? world.burgs[bId].name : `Provinces of Cell ${cell}`;
			// Turn forest to charred woodland / plains
			c.biome[cell] = 4;
			if (pol?.alive) {
				pol.stability = Math.max(5, pol.stability - 8);
				pol.treasury = Math.max(0, pol.treasury - 10);
			}
			events.push({
				y: year,
				m: rng.int(0, 11),
				kind: 'eco_disaster',
				text: `ECOLOGICAL WILDFIRE: Reckless clearcutting and dry timber slash ignite massive wildfires near ${burgName}! Roaring infernos consume ancient timberland, leaving scorched plains in their wake.`,
				cell,
				state: stateId
			});
			if (wonders) {
				const standingWonder = wonders.find((w) => w.cell === cell && !w.destroyed);
				if (standingWonder && (standingWonder.kind === 'world_tree' || rng.chance(0.4))) {
					const res = destroyWonder(standingWonder, 'Anthropogenic Wildfire', year, 'consumed by raging forest inferno');
					events.push(res.event);
				}
			}
			continue;
		}

		// 4. Canal Failure & Great Flood (heavy precipitation on river valleys)
		if (c.river[cell] > 0 && prec > 65 && pop > 1.2 && rng.chance(0.35)) {
			const riverName = world.rivers[c.river[cell]]?.name ?? 'the river';
			const burgName = bId ? world.burgs[bId].name : 'local settlements';
			if (pol?.alive) {
				pol.stability = Math.max(5, pol.stability - 10);
				pol.treasury = Math.max(0, pol.treasury - 15);
			}
			events.push({
				y: year,
				m: rng.int(0, 11),
				kind: 'eco_disaster',
				text: `CANAL SYSTEM FAILURE: Heavy monsoon rainfall breaches artificial irrigation dikes along ${riverName}! Torrential floodwaters inundate ${burgName}, washing away topsoil and drowning winter stores.`,
				cell,
				state: stateId
			});
			continue;
		}

		// 5. Deep Mine Shaft Collapse (high altitude / mountain mining)
		if (c.h[cell] > 55 && bId && rng.chance(0.28)) {
			const b = world.burgs[bId];
			b.pop = Math.max(0.1, b.pop * 0.85);
			if (pol?.alive) {
				pol.treasury = Math.max(0, pol.treasury - 12);
			}
			events.push({
				y: year,
				m: rng.int(0, 11),
				kind: 'eco_disaster',
				text: `MINE SHAFT COLLAPSE: Aggressive excavation into unstable deep-vein fissures triggers a catastrophic cave-in beneath ${b.name}! Foundry tunnels collapse and dozens of miners are entombed.`,
				cell,
				state: stateId
			});
			continue;
		}

		// 6. Over-Farming Dust Bowl (arid plains / steppes)
		if ((biome === 1 || biome === 2 || biome === 3) && prec < 35 && pop > 0.9 && rng.chance(0.3)) {
			const locName = bId ? world.burgs[bId].name : `Territories of Cell ${cell}`;
			c.pop[cell] = Math.max(0.05, c.pop[cell] * 0.7);
			if (pol?.alive) {
				pol.stability = Math.max(5, pol.stability - 7);
			}
			events.push({
				y: year,
				m: rng.int(0, 11),
				kind: 'eco_disaster',
				text: `OVER-FARMING DUST BOWL: Decades of intensive cultivation and overgrazing exhaust the arid topsoil around ${locName}. Violent dust storms sweep the plains, suffocating crops and forcing herders into exile.`,
				cell,
				state: stateId
			});
		}
	}

	return events;
}
