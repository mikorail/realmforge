import type { Simulation } from './engine';
import { makeRng } from '../rng';

export type BlightKind = 'crystalline_barrens' | 'aetheric_plains' | 'prismatic_rift' | 'chrono_scar';

export interface ManaSmogZone {
	cell: number;
	intensity: number; // 1 to 100
	sourceBurg?: number;
	cause: string;
}

export interface WildMagicBlight {
	id: number;
	cell: number;
	type: BlightKind;
	radius: number;
	yearFormed: number;
	active: boolean;
}

export interface ManaDrought {
	active: boolean;
	untilYear: number;
	severity: number;
	cause: string;
}

export interface ThaumaturgyState {
	smogZones: Record<number, ManaSmogZone>;
	blights: WildMagicBlight[];
	drought: ManaDrought;
	nextBlightId: number;
}

const simThaumaturgyMap = new WeakMap<Simulation, ThaumaturgyState>();

export function getThaumaturgyState(sim: Simulation): ThaumaturgyState {
	let state = simThaumaturgyMap.get(sim);
	if (!state) {
		const raw = (sim as unknown as { _thaumaturgyState?: ThaumaturgyState })._thaumaturgyState;
		if (raw && typeof raw.smogZones === 'object') {
			state = raw;
		} else {
			state = {
				smogZones: {},
				blights: [],
				drought: { active: false, untilYear: 0, severity: 0, cause: '' },
				nextBlightId: 1
			};
			(sim as unknown as { _thaumaturgyState?: ThaumaturgyState })._thaumaturgyState = state;
		}
		simThaumaturgyMap.set(sim, state);
	}
	return state;
}

const BLIGHT_NAMES: Record<BlightKind, string> = {
	crystalline_barrens: 'Crystalline Barrens',
	aetheric_plains: 'Aetheric Plains',
	prismatic_rift: 'Prismatic Rift',
	chrono_scar: 'Chrono Scar'
};

/** Inject mana smog / arcane fallout into a cell */
export function addManaSmog(
	sim: Simulation,
	cell: number,
	amount: number,
	cause = 'arcane research'
): ManaSmogZone {
	const st = getThaumaturgyState(sim);
	const existing = st.smogZones[cell];
	const current = existing ? existing.intensity : 0;
	const intensity = Math.min(100, current + amount);

	const zone: ManaSmogZone = {
		cell,
		intensity,
		cause
	};

	st.smogZones[cell] = zone;

	if (intensity >= 75 && current < 75) {
		sim.log(
			'eco_disaster',
			`Arcane desiccation: hazardous mana smog blankets the countryside around cell ${cell}, poisoning soil and inducing crystalline mutations.`,
			cell
		);
	}

	return zone;
}

/** Trigger a wild magic biome rupture in a localized region */
export function triggerWildMagicBlight(
	sim: Simulation,
	cell: number,
	blightType?: BlightKind
): WildMagicBlight {
	const st = getThaumaturgyState(sim);
	const rng = makeRng(`seed:blight:${sim.year}:${cell}:${sim.w.opts.seed}`);

	const types: BlightKind[] = ['crystalline_barrens', 'aetheric_plains', 'prismatic_rift', 'chrono_scar'];
	const type = blightType ?? rng.pick(types);
	const blightName = BLIGHT_NAMES[type];

	const blight: WildMagicBlight = {
		id: st.nextBlightId++,
		cell,
		type,
		radius: 2,
		yearFormed: sim.year,
		active: true
	};

	st.blights.push(blight);

	// Deplete local population and harvest yields
	sim.c.pop[cell] = Math.max(0, sim.c.pop[cell] * 0.7);

	sim.log(
		'disaster',
		`Wild magic rupture: reality frays as a ${blightName} tears open, transmuting the landscape into an iridescent, perilous anomaly.`,
		cell
	);

	return blight;
}

/** Initiate a global or realm-spanning mana drought */
export function triggerManaDrought(
	sim: Simulation,
	durationYears = 3,
	cause = 'excessive thaumaturgical overdraw'
): ManaDrought {
	const st = getThaumaturgyState(sim);
	st.drought = {
		active: true,
		untilYear: sim.year + durationYears,
		severity: 0.6,
		cause
	};

	sim.mana = Math.max(0, sim.mana - 35);

	sim.log(
		'disaster',
		`Mana drought: a planetary aetheric vacuum stalls spellcraft and ritual sorcery following ${cause}.`
	);

	return st.drought;
}

/** Yearly simulation pass for thaumaturgical pollution, blights, and mana droughts */
export function yearlyThaumaturgy(sim: Simulation) {
	const st = getThaumaturgyState(sim);
	const rng = makeRng(`seed:thaumaturgy:yearly:${sim.year}:${sim.w.opts.seed}`);

	// 1. Academies and arcane colleges generate mana smog
	for (const b of sim.w.burgs) {
		if (!b.id || !b.alive) continue;
		const academyLevel = b.districts?.academy ?? 0;
		if (academyLevel > 0) {
			const smogGenerated = academyLevel * 8 + rng.int(2, 6);
			addManaSmog(sim, b.cell, smogGenerated, `arcane research in ${b.name}`);
		}
	}

	// 2. High innovation / tech levels generate residual mana smog
	if (sim.innovation > 150 && rng.chance(0.2)) {
		const capital = sim.w.burgs.find((b) => b.id && b.alive && b.capital);
		if (capital) {
			addManaSmog(sim, capital.cell, 12, 'high-tier arcane laboratory emissions');
		}
	}

	// 3. Dissipate or escalate existing mana smog zones
	for (const cellStr of Object.keys(st.smogZones)) {
		const cell = Number(cellStr);
		const zone = st.smogZones[cell];
		if (!zone) continue;

		// Smog causes population strain and stability decline in host realm
		const stateId = sim.w.cells.state[cell];
		if (zone.intensity > 50 && stateId && sim.polities[stateId]?.alive) {
			sim.polities[stateId].stability = Math.max(10, sim.polities[stateId].stability - 1);
		}

		// Chance of spawning a wild magic blight if smog exceeds 80
		if (zone.intensity >= 80 && rng.chance(0.15)) {
			triggerWildMagicBlight(sim, cell);
			zone.intensity = 30; // reset intensity after cataclysm
		} else {
			// Natural dissipation
			zone.intensity = Math.max(0, zone.intensity - 10);
			if (zone.intensity === 0) {
				delete st.smogZones[cell];
			}
		}
	}

	// 4. Update ongoing mana drought
	if (st.drought.active) {
		if (sim.year >= st.drought.untilYear) {
			st.drought.active = false;
			sim.log(
				'faith',
				'The mana drought recedes: leylines recharge and natural aether flows once more through the mortal sphere.'
			);
		} else {
			// Suppress godpower mana recovery while drought persists
			sim.mana = Math.min(sim.mana, sim.manaMax * 0.4);
		}
	}

	// 5. Blight ambient effects
	for (const blight of st.blights) {
		if (!blight.active) continue;
		if (rng.chance(0.1)) {
			// Aetheric flares
			const cell = blight.cell;
			if (rng.chance(0.3)) {
				sim.log(
					'misc',
					`Prismatic auras ripple across the ${BLIGHT_NAMES[blight.type]} at cell ${cell}, confounding travelers and arcane scholars.`,
					cell
				);
			}
		}
	}
}
