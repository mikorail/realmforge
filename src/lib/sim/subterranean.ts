import type { Simulation } from './engine';
import { makeRng } from '../rng';

export interface MagmaForge {
	id: number;
	burgId: number;
	stateId: number;
	cell: number;
	heatLevel: number; // 1 to 5
	weaponsOutput: number;
	goldYield: number;
	yearBuilt: number;
}

export interface SubterraneanRiver {
	id: number;
	name: string;
	layerIndex: number;
	burgA: number;
	burgB: number;
	tradeVolume: number;
	glowFlora: boolean;
}

export interface ShaftCollapse {
	routeIndex: number;
	upperBurg: number;
	lowerBurg: number;
	year: number;
	isolatedState: number;
	divergenceYears: number;
	culturalDivergenceName?: string;
}

export interface SubterraneanState {
	forges: MagmaForge[];
	rivers: SubterraneanRiver[];
	collapses: ShaftCollapse[];
	nextId: number;
}

const simSubterraneanMap = new WeakMap<Simulation, SubterraneanState>();

export function getSubterraneanState(sim: Simulation): SubterraneanState {
	let state = simSubterraneanMap.get(sim);
	if (!state) {
		const raw = (sim as unknown as { _subterraneanState?: SubterraneanState })._subterraneanState;
		if (raw && Array.isArray(raw.forges)) {
			state = raw;
		} else {
			state = {
				forges: [],
				rivers: [],
				collapses: [],
				nextId: 1
			};
			(sim as unknown as { _subterraneanState?: SubterraneanState })._subterraneanState = state;
		}
		simSubterraneanMap.set(sim, state);
	}
	return state;
}

const RIVER_PREFIXES = ['Stygian', 'Obsidian', 'Bioluminescent', 'Glow-Stone', 'Deep-Abyssal', 'Chasm-Flood'];
const RIVER_SUFFIXES = ['Run', 'Torrent', 'Current', 'Flow', 'Under-Stream', 'Vein'];
const DIVERGENCE_CULTURES = ['Deep-Hermits', 'Sub-Stygian Kin', 'Chasm-Born', 'Lumin-Dwellers', 'Obsidian Shapers'];

/** Construct a geothermal magma forge in a deep hold */
export function buildMagmaForge(sim: Simulation, burgId: number): MagmaForge | null {
	const b = sim.w.burgs[burgId];
	if (!b || !b.alive) return null;

	const pol = sim.polities[b.state];
	if (!pol || !pol.alive) return null;

	const st = getSubterraneanState(sim);
	if (st.forges.some((f) => f.burgId === burgId)) return null;

	const rng = makeRng(`seed:forge:${sim.year}:${burgId}:${sim.w.opts.seed}`);
	const heatLevel = rng.int(2, 5);
	const weaponsOutput = heatLevel * 15;
	const goldYield = heatLevel * 8;

	const forge: MagmaForge = {
		id: st.nextId++,
		burgId,
		stateId: b.state,
		cell: b.cell,
		heatLevel,
		weaponsOutput,
		goldYield,
		yearBuilt: sim.year
	};

	st.forges.push(forge);
	pol.treasury = Math.max(0, pol.treasury - 30);
	pol.stability = Math.min(100, pol.stability + 3);

	sim.log(
		'found',
		`Magma forge ignited: ${pol.name} harnesses the mantle fire beneath ${b.name}, forging obsidian arms and smelting subterranean wealth.`,
		b.cell,
		b.state
	);

	return forge;
}

/** Establish a subterranean river connection between two deep-layer settlements */
export function establishSubterraneanRiver(
	sim: Simulation,
	burgAId: number,
	burgBId: number,
	riverName?: string
): SubterraneanRiver | null {
	const a = sim.w.burgs[burgAId];
	const b = sim.w.burgs[burgBId];
	if (!a || !a.alive || !b || !b.alive) return null;

	const layerA = sim.burgLayer(a);
	const layerB = sim.burgLayer(b);
	if (layerA !== layerB || layerA === 0) return null;

	const rng = makeRng(`seed:subriver:${sim.year}:${burgAId}:${burgBId}`);
	const name = riverName ?? `${rng.pick(RIVER_PREFIXES)} ${rng.pick(RIVER_SUFFIXES)}`;

	const st = getSubterraneanState(sim);
	const river: SubterraneanRiver = {
		id: st.nextId++,
		name,
		layerIndex: layerA,
		burgA: burgAId,
		burgB: burgBId,
		tradeVolume: 35,
		glowFlora: rng.chance(0.6)
	};

	st.rivers.push(river);

	sim.log(
		'found',
		`Subterranean waterway mapped: trade barges navigate the ${river.name}, linking ${a.name} and ${b.name} through glowing cavern rapids.`,
		a.cell,
		a.state || undefined
	);

	return river;
}

/** Collapse a vertical shaft connecting the underdark and surface realms */
export function collapseShaft(sim: Simulation, routeIndex: number): ShaftCollapse | null {
	const r = sim.w.routes[routeIndex];
	if (!r || r.kind !== 'shaft') return null;

	const up = sim.w.burgs[r.b];
	const low = sim.w.burgs[r.a];
	if (!up || !low) return null;

	const st = getSubterraneanState(sim);
	if (st.collapses.some((c) => c.routeIndex === routeIndex)) return null;

	const rng = makeRng(`seed:shaft_collapse:${sim.year}:${routeIndex}`);
	const collapse: ShaftCollapse = {
		routeIndex,
		upperBurg: up.id,
		lowerBurg: low.id,
		year: sim.year,
		isolatedState: low.state,
		divergenceYears: 0,
		culturalDivergenceName: `${low.name} ${rng.pick(DIVERGENCE_CULTURES)}`
	};

	st.collapses.push(collapse);

	// Sever route in routes array
	r.kind = 'ruin' as unknown as typeof r.kind;

	sim.log(
		'disaster',
		`Catastrophic shaft collapse: tectonic tremors bury the great shaft between ${up.name} and ${low.name}, stranding the undercity in total isolation.`,
		low.cell,
		low.state || undefined
	);

	return collapse;
}

/** Yearly simulation pass for deep underdark and cavern geopolitics */
export function yearlySubterranean(sim: Simulation) {
	const st = getSubterraneanState(sim);
	const rng = makeRng(`seed:subterranean:yearly:${sim.year}:${sim.w.opts.seed}`);

	// 1. Magma forges production and heat hazards
	st.forges = st.forges.filter((forge) => {
		const b = sim.w.burgs[forge.burgId];
		const pol = sim.polities[forge.stateId];
		if (!b?.alive || !pol?.alive) return false;

		pol.treasury += forge.goldYield;

		// Chance of geothermal eruption or superheated breakthrough
		if (rng.chance(0.05) && forge.heatLevel >= 4) {
			b.pop = Math.max(1, Math.round(b.pop * 0.95));
			pol.stability = Math.max(10, pol.stability - 4);
			sim.log(
				'disaster',
				`Geothermal eruption: superheated magma overflows the crucibles of ${b.name}; artisan holds suffer heavy damage.`,
				b.cell,
				forge.stateId
			);
		}

		return true;
	});

	// 2. Subterranean river trade yields
	for (const river of st.rivers) {
		const a = sim.w.burgs[river.burgA];
		const b = sim.w.burgs[river.burgB];
		if (!a?.alive || !b?.alive) continue;

		if (a.state && sim.polities[a.state]?.alive) {
			sim.polities[a.state].treasury += 2;
		}
		if (b.state && b.state !== a.state && sim.polities[b.state]?.alive) {
			sim.polities[b.state].treasury += 2;
		}
	}

	// 3. Cultural divergence of isolated subterranean realms
	for (const col of st.collapses) {
		col.divergenceYears++;
		if (col.divergenceYears === 10) {
			const low = sim.w.burgs[col.lowerBurg];
			if (low?.alive && low.state && sim.polities[low.state]?.alive) {
				const pol = sim.polities[low.state];
				sim.log(
					'culture',
					`Cultural divergence: decades severed from the surface world have forged the ${col.culturalDivergenceName ?? 'Deepborn'} into a distinct subterranean society in ${low.name}.`,
					low.cell,
					low.state
				);
			}
		}
	}

	// 4. Auto-spawn magma forges for deep realms
	if (sim.year % 7 === 0 && st.forges.length < 8) {
		const deepBurgs = sim.w.burgs.filter((b) => {
			if (!b.id || !b.alive || !b.state) return false;
			const layer = sim.burgLayer(b);
			return layer > 0 && sim.w.layers[layer]?.kind === 'deep' && !st.forges.some((f) => f.burgId === b.id);
		});

		if (deepBurgs.length && rng.chance(0.35)) {
			const chosen = rng.pick(deepBurgs);
			buildMagmaForge(sim, chosen.id);
		}
	}

	// 5. Auto-discover subterranean rivers
	if (sim.year % 10 === 0 && st.rivers.length < 6) {
		const deepBurgs = sim.w.burgs.filter((b) => {
			if (!b.id || !b.alive) return false;
			const layer = sim.burgLayer(b);
			return layer > 0 && sim.w.layers[layer]?.kind === 'deep';
		});

		if (deepBurgs.length >= 2) {
			const a = rng.pick(deepBurgs);
			const layer = sim.burgLayer(a);
			const peers = deepBurgs.filter((b) => b.id !== a.id && sim.burgLayer(b) === layer);
			if (peers.length && rng.chance(0.4)) {
				const b = rng.pick(peers);
				if (!st.rivers.some((r) => (r.burgA === a.id && r.burgB === b.id) || (r.burgA === b.id && r.burgB === a.id))) {
					establishSubterraneanRiver(sim, a.id, b.id);
				}
			}
		}
	}

	// 6. Occasional shaft collapse
	if (sim.year % 20 === 0 && rng.chance(0.2)) {
		const shaftRoutes = sim.w.routes
			.map((r, idx) => ({ r, idx }))
			.filter(({ r, idx }) => r.kind === 'shaft' && !st.collapses.some((c) => c.routeIndex === idx));

		if (shaftRoutes.length) {
			const chosen = rng.pick(shaftRoutes);
			collapseShaft(sim, chosen.idx);
		}
	}
}
