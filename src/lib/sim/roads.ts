import type { Simulation } from './engine';
import type { Route } from '../gen/types';
import { landPath } from '../gen/society';
import { clamp } from '../rng';
import { cultureMod } from './culture';

/**
 * Annual road and route construction: living realms invest treasury and engineering skill
 * to construct new paved royal highways, international silk routes, or coastal sea lanes.
 */
export function buildRealmRoads(sim: Simulation) {
	const w = sim.w;
	const c = w.cells;
	const rng = sim.rng;
	const spacing = Math.sqrt((w.opts.width * w.opts.height) / w.opts.cells);

	const alivePolities = sim.polities.filter((p) => p.id && p.alive && p.treasury >= 40 && p.stability >= 30);
	if (!alivePolities.length) return;

	let builtCount = 0;
	// Shuffle polities to give different realms a fair opportunity
	const shuffled = rng.shuffle(alivePolities);

	for (const pol of shuffled) {
		if (builtCount >= 2) break; // Limit to 1-2 new highways per year world-wide

		// Modifiers for road building ambition
		const tradeMod = cultureMod(sim, pol, 'trade');
		const innovBonus = Math.min(0.2, sim.innovation / 300);
		const chance = 0.18 * tradeMod + innovBonus;
		if (!rng.chance(chance)) continue;

		const myBurgs = sim.idx.burgsIn(w.burgs, pol.id).filter((b) => b.alive);
		if (!myBurgs.length) continue;

		const isConnected = (a: number, b: number) =>
			w.routes.some((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a));

		let burgA = myBurgs[0];
		let burgB: typeof burgA | null = null;
		let isSeaLane = false;

		// 1. Try to connect capital to an unconnected town in the realm
		const cap = w.burgs[pol.capital];
		if (cap && cap.alive && cap.state === pol.id && myBurgs.length > 1) {
			const unconnected = myBurgs.filter((b) => b.id !== cap.id && !isConnected(cap.id, b.id));
			if (unconnected.length) {
				burgA = cap;
				burgB = rng.pick(unconnected);
			}
		}

		// 2. Try connecting two towns within the realm that lack a direct route
		if (!burgB && myBurgs.length >= 2) {
			const pairs: [typeof burgA, typeof burgA][] = [];
			for (let i = 0; i < myBurgs.length; i++) {
				for (let j = i + 1; j < myBurgs.length; j++) {
					const b1 = myBurgs[i], b2 = myBurgs[j];
					if (!isConnected(b1.id, b2.id)) {
						const dist = Math.hypot(b1.x - b2.x, b1.y - b2.y);
						if (dist < spacing * 40) {
							pairs.push([b1, b2]);
						}
					}
				}
			}
			if (pairs.length) {
				const picked = rng.pick(pairs);
				burgA = picked[0];
				burgB = picked[1];
			}
		}

		// 3. Try international trade route to an allied or peaceful neighbor
		if (!burgB) {
			const neighborBurgs = w.burgs.filter(
				(b) => b.id && b.alive && b.state && b.state !== pol.id && sim.polities[b.state]?.alive && !sim.atWar(pol.id, b.state)
			);
			const viableNeighbors = neighborBurgs.filter((nb) => {
				const rel = pol.relations[nb.state] ?? 0;
				return rel >= 0 && !isConnected(myBurgs[0].id, nb.id);
			});
			if (viableNeighbors.length && rng.chance(0.4)) {
				burgA = rng.pick(myBurgs);
				const nearNb = viableNeighbors
					.map((nb) => ({ nb, dist: Math.hypot(burgA.x - nb.x, burgA.y - nb.y) }))
					.filter((x) => x.dist < spacing * 35)
					.sort((a, b) => a.dist - b.dist);
				if (nearNb.length) {
					burgB = nearNb[0].nb;
				}
			}
		}

		if (!burgB || burgA.id === burgB.id) continue;

		// Determine path
		isSeaLane = Boolean(burgA.port && burgB.port && rng.chance(0.5));
		let path = landPath(c, burgA.cell, burgB.cell, isSeaLane);
		if (!path && isSeaLane) {
			// Fallback to land path if sea path fails
			isSeaLane = false;
			path = landPath(c, burgA.cell, burgB.cell, false);
		}

		if (!path || path.length < 2 || path.length > 85) continue;

		// Deduct treasury
		const cost = Math.min(Math.round(pol.treasury * 0.35), Math.round(path.length * 1.3));
		pol.treasury = Math.max(5, pol.treasury - cost);

		// Stamp road onto terrain
		if (!isSeaLane) {
			for (const cell of path) {
				c.road[cell] = Math.min(255, c.road[cell] + 1);
			}
		}

		const kind: Route['kind'] = isSeaLane
			? 'sea'
			: burgA.layer === 'deep' && burgB.layer === 'deep'
			? 'tunnel'
			: 'road';

		const isInternational = burgA.state !== burgB.state;
		const name = isSeaLane
			? `${burgA.name}-${burgB.name} Maritime Lane`
			: isInternational
			? `${burgA.name}-${burgB.name} Silk Highway`
			: `${burgA.name}-${burgB.name} Royal Road`;

		w.routes.push({ kind, cells: path, a: burgA.id, b: burgB.id, name });

		// Add travel link for avatar Dijkstra routing & caravans
		const travelDays = Math.max(1, Math.round((path.length / spacing) * (isSeaLane ? 0.7 : 1.4)));
		w.links.push([burgA.id, burgB.id, travelDays]);

		// Benefits to realm
		pol.stability = clamp(pol.stability + 2, 0, 100);
		sim.gainInnovation(5);
		sim.dirty.terrain = true;

		sim.log(
			'found',
			`NEW HIGHWAY: Engineers of ${pol.name} pave the ${name}, establishing a direct route between ${burgA.name} and ${burgB.name} (+trade, +stability).`,
			burgA.cell,
			pol.id
		);

		builtCount++;
	}
}
