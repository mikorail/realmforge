import type { Simulation } from './engine';
import { clamp, makeRng, type Rng } from '../rng';

export type MedicineStage =
	| 'miasma'
	| 'herbalism'
	| 'quarantine_cordon'
	| 'inoculation'
	| 'germ_theory';

export const MEDICINE_STAGES: readonly MedicineStage[] = [
	'miasma',
	'herbalism',
	'quarantine_cordon',
	'inoculation',
	'germ_theory'
] as const;

export interface MedicineStageSpec {
	stage: MedicineStage;
	label: string;
	mortalityMult: number;
	spreadMult: number;
	growthBonus: number;
	cultureTrait: string;
	minEra: number;
}

export const MEDICINE_STAGE_SPECS: Record<MedicineStage, MedicineStageSpec> = {
	miasma: {
		stage: 'miasma',
		label: 'Miasma Lore',
		mortalityMult: 1.0,
		spreadMult: 1.0,
		growthBonus: 0,
		cultureTrait: 'humoral_rites',
		minEra: 0
	},
	herbalism: {
		stage: 'herbalism',
		label: 'Botanical Herbalism',
		mortalityMult: 0.82,
		spreadMult: 0.9,
		growthBonus: 0.002,
		cultureTrait: 'apothecary_guilds',
		minEra: 0
	},
	quarantine_cordon: {
		stage: 'quarantine_cordon',
		label: 'Quarantine Cordon',
		mortalityMult: 0.64,
		spreadMult: 0.65,
		growthBonus: 0.004,
		cultureTrait: 'sanitary_cordons',
		minEra: 1
	},
	inoculation: {
		stage: 'inoculation',
		label: 'Variolation & Inoculation',
		mortalityMult: 0.44,
		spreadMult: 0.48,
		growthBonus: 0.007,
		cultureTrait: 'variolation_clinics',
		minEra: 2
	},
	germ_theory: {
		stage: 'germ_theory',
		label: 'Clinical Germ Theory',
		mortalityMult: 0.25,
		spreadMult: 0.3,
		growthBonus: 0.011,
		cultureTrait: 'clinical_medicine',
		minEra: 3
	}
};

export interface HistoricalPandemic {
	id: number;
	name: string;
	originBurgId: number;
	originPolityId: number;
	startYear: number;
	endYear?: number;
	lethality: number;
	effectiveMortality: number;
	affectedBurgs: number[];
	estimatedDeaths: number;
	active: boolean;
}

export interface QuarantineWall {
	id: number;
	polityId: number;
	burgId: number;
	cell: number;
	builtYear: number;
	pandemicId: number;
	active: boolean;
}

export interface PlagueDoctorOrder {
	id: number;
	name: string;
	polityId: number;
	hqBurgId: number;
	foundedYear: number;
	stage: MedicineStage;
	mortalityReduction: number;
}

export interface MassGraveLandmark {
	id: number;
	name: string;
	pandemicId: number;
	pandemicName: string;
	burgId: number;
	cell: number;
	year: number;
	casualties: number;
}

export interface PolityMedicineRecord {
	polityId: number;
	stage: MedicineStage;
	stageIndex: number;
	lastAdvancedYear: number;
	cultureTraits: string[];
	mortalityModifier: number;
}

export interface MedicinePlaguesState {
	pandemics: HistoricalPandemic[];
	quarantineWalls: QuarantineWall[];
	doctorOrders: PlagueDoctorOrder[];
	massGraves: MassGraveLandmark[];
	polityMedicine: Record<number, PolityMedicineRecord>;
	nextId: number;
}

const simMedicineMap = new WeakMap<Simulation, MedicinePlaguesState>();

export function getMedicineState(sim: Simulation): MedicinePlaguesState {
	let state = simMedicineMap.get(sim);
	if (!state) {
		const raw = (sim as unknown as { _medicinePlaguesState?: MedicinePlaguesState })._medicinePlaguesState;
		if (raw && Array.isArray(raw.pandemics)) {
			state = raw;
		} else {
			state = {
				pandemics: [],
				quarantineWalls: [],
				doctorOrders: [],
				massGraves: [],
				polityMedicine: {},
				nextId: 1
			};
			(sim as unknown as { _medicinePlaguesState?: MedicinePlaguesState })._medicinePlaguesState = state;
		}
		simMedicineMap.set(sim, state);
	}
	return state;
}

const PANDEMIC_NAMES = [
	'The Pale Sweating',
	'Crimson Cough',
	'Black Lantern Fever',
	'Ashen Pox',
	'Weeping Blight',
	'Saffron Ague',
	'Silent Rot'
];

const ORDER_NAMES = [
	'Order of the Beaked Lantern',
	'Guild of Vinegar & Myrrh',
	'Brotherhood of the Clean Cordon',
	'Sisters of the White Ward',
	'Collegium of Clinical Physicians'
];

function sideRng(sim: Simulation, tag: string): Rng {
	return makeRng(`${sim.w.opts.seed}:mp:${sim.planetIndex}:${sim.year}:${tag}`);
}

export function getPolityMedicine(sim: Simulation, polityId: number): PolityMedicineRecord {
	const st = getMedicineState(sim);
	let rec = st.polityMedicine[polityId];
	if (!rec) {
		const stage: MedicineStage = 'miasma';
		const spec = MEDICINE_STAGE_SPECS[stage];
		rec = {
			polityId,
			stage,
			stageIndex: 0,
			lastAdvancedYear: sim.year,
			cultureTraits: [spec.cultureTrait],
			mortalityModifier: spec.mortalityMult
		};
		st.polityMedicine[polityId] = rec;
	}
	return rec;
}

function effectiveMortalityFor(sim: Simulation, polityId: number, baseLethality: number): number {
	const st = getMedicineState(sim);
	const med = getPolityMedicine(sim, polityId);
	const hasOrder = st.doctorOrders.some((o) => o.polityId === polityId);
	const orderFactor = hasOrder ? 0.85 : 1.0;
	return Math.round(clamp(baseLethality * med.mortalityModifier * orderFactor, 0.02, 0.95) * 1000) / 1000;
}

/** Charter a plague-doctor order in a polity */
export function foundPlagueDoctorOrder(
	sim: Simulation,
	polityId: number,
	burgId?: number
): PlagueDoctorOrder | null {
	const pol = sim.polities[polityId];
	if (!pol || !pol.alive) return null;

	const st = getMedicineState(sim);
	const hqBurgId = burgId ?? pol.capital;
	const burg = sim.w.burgs[hqBurgId];
	if (!burg || !burg.alive) return null;

	const med = getPolityMedicine(sim, polityId);
	const rng = sideRng(sim, `order:${polityId}:${st.nextId}`);
	const order: PlagueDoctorOrder = {
		id: st.nextId++,
		name: `${pol.name} ${rng.pick(ORDER_NAMES)}`,
		polityId,
		hqBurgId,
		foundedYear: sim.year,
		stage: med.stage,
		mortalityReduction: 0.15
	};
	st.doctorOrders.push(order);

	sim.log(
		'found',
		`Medical order chartered: ${order.name} establishes infirmaries in ${burg.name} to combat epidemic mortality.`,
		burg.cell,
		polityId
	);

	return order;
}

/** Erect a quarantine wall around a threatened settlement */
export function buildQuarantineWall(
	sim: Simulation,
	polityId: number,
	burgId: number,
	pandemicId: number
): QuarantineWall | null {
	const burg = sim.w.burgs[burgId];
	if (!burg || !burg.alive) return null;

	const st = getMedicineState(sim);
	const existing = st.quarantineWalls.find((q) => q.burgId === burgId && q.active);
	if (existing) return existing;

	const wall: QuarantineWall = {
		id: st.nextId++,
		polityId,
		burgId,
		cell: burg.cell,
		builtYear: sim.year,
		pandemicId,
		active: true
	};
	st.quarantineWalls.push(wall);

	const pol = sim.polities[polityId];
	if (pol?.alive) {
		pol.treasury = Math.max(0, pol.treasury - 6);
	}

	sim.log(
		'misc',
		`Quarantine cordon raised: authorities ring ${burg.name} with guarded quarantine walls to halt the contagion.`,
		burg.cell,
		polityId || undefined
	);

	return wall;
}

/** Record a named historical pandemic at a settlement and apply medicine-adjusted impact */
export function recordPandemic(
	sim: Simulation,
	name: string,
	burgId: number,
	lethality: number
): HistoricalPandemic | null {
	const burg = sim.w.burgs[burgId];
	if (!burg || !burg.alive) return null;

	const st = getMedicineState(sim);
	const baseLethality = clamp(lethality, 0.05, 0.95);
	const polityId = burg.state;
	const effMortality = effectiveMortalityFor(sim, polityId, baseLethality);

	// Apply demographic toll to the epicenter settlement and cell
	const popBefore = Math.max(0.5, burg.pop);
	const deaths = Math.round(popBefore * effMortality * 0.45 * 100) / 100;
	burg.pop = Math.max(0.2, Math.round((burg.pop - deaths) * 10) / 10);
	sim.c.pop[burg.cell] = Math.max(0.1, sim.c.pop[burg.cell] * (1 - effMortality * 0.35));

	const pandemic: HistoricalPandemic = {
		id: st.nextId++,
		name,
		originBurgId: burgId,
		originPolityId: polityId,
		startYear: sim.year,
		lethality: baseLethality,
		effectiveMortality: effMortality,
		affectedBurgs: [burgId],
		estimatedDeaths: deaths,
		active: true
	};
	st.pandemics.push(pandemic);

	const pol = sim.polities[polityId];
	if (pol?.alive) {
		pol.stability = clamp(pol.stability - Math.round(effMortality * 12), 10, 100);
	}

	sim.log(
		'disaster',
		`Historical pandemic erupts: ${name} strikes ${burg.name} with ${(effMortality * 100).toFixed(0)}% effective mortality.`,
		burg.cell,
		polityId || undefined
	);

	// High-mortality outbreaks trigger quarantine walls, plague-doctor orders, or mass grave landmarks
	if (effMortality >= 0.25 && polityId > 0) {
		buildQuarantineWall(sim, polityId, burgId, pandemic.id);
	}
	if (deaths >= 1.0 || effMortality >= 0.35) {
		const landmark: MassGraveLandmark = {
			id: st.nextId++,
			name: `Barrow of ${name} at ${burg.name}`,
			pandemicId: pandemic.id,
			pandemicName: name,
			burgId,
			cell: burg.cell,
			year: sim.year,
			casualties: deaths
		};
		st.massGraves.push(landmark);
	}

	return pandemic;
}

/** Advance a polity's medical knowledge one stage along miasma -> herbalism -> quarantine_cordon -> inoculation -> germ_theory */
export function advanceMedicine(sim: Simulation, polityId: number): PolityMedicineRecord | null {
	const pol = sim.polities[polityId];
	if (!pol || !pol.alive) return null;

	const rec = getPolityMedicine(sim, polityId);
	if (rec.stageIndex >= MEDICINE_STAGES.length - 1) return rec;

	const nextIndex = rec.stageIndex + 1;
	const nextStage = MEDICINE_STAGES[nextIndex];
	const spec = MEDICINE_STAGE_SPECS[nextStage];

	rec.stageIndex = nextIndex;
	rec.stage = nextStage;
	rec.lastAdvancedYear = sim.year;
	rec.mortalityModifier = spec.mortalityMult;
	if (!rec.cultureTraits.includes(spec.cultureTrait)) {
		rec.cultureTraits.push(spec.cultureTrait);
	}

	// Demographics and stability reward from medical advancement
	pol.stability = clamp(pol.stability + 4, 0, 100);
	const capital = sim.w.burgs[pol.capital];
	if (capital?.alive) {
		capital.pop = Math.round((capital.pop * (1 + spec.growthBonus * 5)) * 10) / 10;
	}

	sim.log(
		'tech',
		`Medical evolution in ${pol.name}: physicians adopt ${spec.label}, cultivating ${spec.cultureTrait.replace(/_/g, ' ')} and lowering epidemic mortality.`,
		capital?.cell,
		polityId
	);

	return rec;
}

/** Yearly simulation pass for Historical Plagues and Medicine Evolution (side RNG only) */
export function yearlyMedicinePlagues(sim: Simulation): void {
	const st = getMedicineState(sim);
	const rng = sideRng(sim, 'yearly');

	// 1. Progress active historical pandemics
	for (const pan of st.pandemics) {
		if (!pan.active) continue;
		const age = sim.year - pan.startYear;

		// Spread to a neighboring linked burg if not contained
		const lastBurgId = pan.affectedBurgs[pan.affectedBurgs.length - 1];
		const lastBurg = sim.w.burgs[lastBurgId];
		if (lastBurg?.alive && pan.affectedBurgs.length < 6) {
			const linkedIds: number[] = [];
			for (const [a, b] of sim.w.links) {
				const other = a === lastBurgId ? b : b === lastBurgId ? a : 0;
				if (other > 0 && !pan.affectedBurgs.includes(other) && sim.w.burgs[other]?.alive) {
					linkedIds.push(other);
				}
			}
			if (linkedIds.length) {
				const med = getPolityMedicine(sim, lastBurg.state);
				const spec = MEDICINE_STAGE_SPECS[med.stage];
				const hasWall = st.quarantineWalls.some((q) => q.burgId === lastBurgId && q.active);
				const spreadChance = 0.35 * spec.spreadMult * (hasWall ? 0.45 : 1.0);
				if (rng.chance(spreadChance)) {
					const nextId = rng.pick(linkedIds);
					const nextBurg = sim.w.burgs[nextId];
					pan.affectedBurgs.push(nextId);
					const eff = effectiveMortalityFor(sim, nextBurg.state, pan.lethality);
					const extraDeaths = Math.round(Math.max(0.3, nextBurg.pop) * eff * 0.25 * 100) / 100;
					nextBurg.pop = Math.max(0.2, Math.round((nextBurg.pop - extraDeaths) * 10) / 10);
					pan.estimatedDeaths = Math.round((pan.estimatedDeaths + extraDeaths) * 100) / 100;

					if (nextBurg.state > 0 && !st.doctorOrders.some((o) => o.polityId === nextBurg.state) && rng.chance(0.4)) {
						foundPlagueDoctorOrder(sim, nextBurg.state, nextBurg.id);
					}
				}
			}
		}

		// Subside after 2-5 years
		if (age >= 2 && rng.chance(0.45)) {
			pan.active = false;
			pan.endYear = sim.year;
			for (const q of st.quarantineWalls) {
				if (q.pandemicId === pan.id) q.active = false;
			}
			sim.log(
				'disaster',
				`Pandemic recedes: ${pan.name} finally ebbs after afflicting ${pan.affectedBurgs.length} settlements.`,
				sim.w.burgs[pan.originBurgId]?.cell,
				pan.originPolityId || undefined
			);
		}
	}

	// 2. Apply gentle demographic resilience from advanced medicine every 10 years
	if (sim.year % 10 === 0) {
		for (const pol of sim.polities) {
			if (!pol.id || !pol.alive) continue;
			const rec = st.polityMedicine[pol.id];
			if (!rec || rec.stageIndex === 0) continue;
			const spec = MEDICINE_STAGE_SPECS[rec.stage];
			const cap = sim.w.burgs[pol.capital];
			if (cap?.alive && spec.growthBonus > 0) {
				cap.pop = Math.round((cap.pop * (1 + spec.growthBonus)) * 10) / 10;
			}
		}
	}

	// 3. Natural folk-to-clinical medicine evolution across centuries
	if (sim.year >= 20 && sim.year % 20 === 0) {
		const alive = sim.polities.filter((p) => p.id > 0 && p.alive);
		for (const pol of alive) {
			const rec = getPolityMedicine(sim, pol.id);
			if (rec.stageIndex >= MEDICINE_STAGES.length - 1) continue;
			const nextStage = MEDICINE_STAGES[rec.stageIndex + 1];
			const nextSpec = MEDICINE_STAGE_SPECS[nextStage];
			if (sim.era < nextSpec.minEra) continue;
			const hadPandemic = st.pandemics.some((p) => p.originPolityId === pol.id);
			const chance = hadPandemic ? 0.35 : 0.14;
			if (rng.chance(chance)) {
				advanceMedicine(sim, pol.id);
				break; // at most one natural breakthrough per cycle
			}
		}
	}

	// 4. Periodic historical pandemic recording (rare, side RNG only)
	const activePandemics = st.pandemics.filter((p) => p.active).length;
	if (activePandemics === 0 && sim.year >= 18 && sim.year % 30 === 0 && rng.chance(0.3)) {
		const burgs = sim.w.burgs.filter((b) => b.id > 0 && b.alive && sim.burgLayer(b) === 0 && b.pop >= 3);
		if (burgs.length) {
			const epicenter = rng.pick(burgs);
			const pName = `${rng.pick(PANDEMIC_NAMES)} of Year ${sim.year}`;
			const lethality = Math.round((0.2 + rng() * 0.45) * 100) / 100;
			recordPandemic(sim, pName, epicenter.id, lethality);
		}
	}
}
