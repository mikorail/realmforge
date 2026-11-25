import { describe, expect, it, beforeEach } from 'vitest';
import { generateUniverse } from '../gen/universe';
import { Cosmos } from './cosmos';
import type { Simulation } from './engine';
import {
	getMigrationState,
	settleMigrationWave,
	triggerMigrationWave,
	yearlyMigrationWaves
} from './migrations_waves';
import {
	advanceMedicine,
	buildQuarantineWall,
	foundPlagueDoctorOrder,
	getMedicineState,
	getPolityMedicine,
	MEDICINE_STAGES,
	recordPandemic,
	yearlyMedicinePlagues
} from './medicine_plagues';
import {
	compareTimelines,
	forkFromSnapshot,
	runForkYears
} from './timeline_fork';

function makeSim(seed = 'macro-expansions-seed'): Simulation {
	const u = generateUniverse(
		{
			seed,
			template: 'continents',
			cells: 1000,
			states: 6,
			width: 800,
			height: 600,
			genre: 'fantasy',
			planet: 'terran',
			spheres: null,
			depth: 1,
			sky: false,
			sea: false
		},
		1
	);
	return new Cosmos(u).sims[0];
}

describe('Realmforge Macro Expansions', () => {
	let sim: Simulation;

	beforeEach(() => {
		sim = makeSim();
	});

	describe('1. Great Migrations & Colonization Waves', () => {
		it('triggers steppe horde, refugee armada, and gold rush waves without shifting sim.rng', () => {
			const rngBefore = sim.rng.state();
			const alive = sim.polities.filter((p) => p.id > 0 && p.alive);
			expect(alive.length).toBeGreaterThan(1);

			const w1 = triggerMigrationWave(sim, 'steppe_horde', alive[0].id);
			const w2 = triggerMigrationWave(sim, 'refugee_armada', alive[1].id);
			const w3 = triggerMigrationWave(sim, 'gold_rush');

			expect(w1).not.toBeNull();
			expect(w2).not.toBeNull();
			expect(w3).not.toBeNull();
			expect(sim.rng.state()).toBe(rngBefore);

			const st = getMigrationState(sim);
			expect(st.waves.length).toBe(3);
			expect(st.waves.every((w) => w.active)).toBe(true);
		});

		it('settles waves into hybrid successor polities and cultural enclaves cleanly', () => {
			const rngBefore = sim.rng.state();
			const politiesBefore = sim.polities.length;

			const wave = triggerMigrationWave(sim, 'steppe_horde');
			expect(wave).not.toBeNull();
			// Ensure target burg is a non-capital so hybrid polity founding is eligible
			const nonCap = sim.w.burgs.find((b) => b.id > 0 && b.alive && !b.capital && sim.burgLayer(b) === 0);
			if (nonCap && wave) {
				wave.targetBurgId = nonCap.id;
				wave.targetCell = nonCap.cell;
			}

			const res = settleMigrationWave(sim, wave!.id, 'hybrid_polity');
			expect(res).not.toBeNull();
			if (nonCap) {
				expect(res!.outcome).toBe('hybrid_polity');
				expect(res!.successor).toBeDefined();
				expect(sim.polities.length).toBe(politiesBefore + 1);
				const st = getMigrationState(sim);
				expect(st.successors.length).toBe(1);
				const founded = sim.polities[res!.successor!.polityId];
				expect(founded.alive).toBe(true);
				expect(founded.origin).toBe('migration');
				expect(founded.cells).toBeGreaterThan(0);
			}

			const enclaveWave = triggerMigrationWave(sim, 'refugee_armada');
			expect(enclaveWave).not.toBeNull();
			const enclaveRes = settleMigrationWave(sim, enclaveWave!.id, 'cultural_enclave');
			expect(enclaveRes?.outcome).toBe('cultural_enclave');
			expect(enclaveRes?.enclave).toBeDefined();
			expect(getMigrationState(sim).enclaves.length).toBe(1);

			// Side RNG only: sim.rng must remain completely untouched
			expect(sim.rng.state()).toBe(rngBefore);
		});

		it('advances and settles active waves in yearlyMigrationWaves without shifting sim.rng', () => {
			const wave = triggerMigrationWave(sim, 'gold_rush');
			expect(wave).not.toBeNull();
			wave!.durationYears = 2;

			const rngBefore = sim.rng.state();
			yearlyMigrationWaves(sim);
			expect(wave!.active).toBe(true);
			yearlyMigrationWaves(sim);
			expect(wave!.active).toBe(false);
			expect(wave!.outcome).toBeDefined();
			expect(sim.rng.state()).toBe(rngBefore);
		});
	});

	describe('2. Historical Plagues & Medicine Evolution', () => {
		it('evolves polity medicine across all five stages from miasma to germ_theory', () => {
			const pol = sim.polities.find((p) => p.id > 0 && p.alive)!;
			const rngBefore = sim.rng.state();

			expect(getPolityMedicine(sim, pol.id).stage).toBe('miasma');
			const seenStages: string[] = ['miasma'];

			for (let i = 1; i < MEDICINE_STAGES.length; i++) {
				const rec = advanceMedicine(sim, pol.id);
				expect(rec).not.toBeNull();
				seenStages.push(rec!.stage);
			}

			expect(seenStages).toEqual(['miasma', 'herbalism', 'quarantine_cordon', 'inoculation', 'germ_theory']);
			const finalRec = getPolityMedicine(sim, pol.id);
			expect(finalRec.mortalityModifier).toBeLessThan(0.3);
			expect(finalRec.cultureTraits).toContain('clinical_medicine');
			expect(sim.rng.state()).toBe(rngBefore);
		});

		it('records named pandemics with quarantine walls, mass graves, doctor orders, and medicine mortality reduction', () => {
			const burgs = sim.w.burgs.filter((b) => b.id > 0 && b.alive && b.state > 0 && sim.burgLayer(b) === 0);
			expect(burgs.length).toBeGreaterThan(1);

			const b1 = burgs[0];
			const b2 = burgs.find((b) => b.state !== b1.state) ?? burgs[1];
			b1.pop = Math.max(b1.pop, 12);
			b2.pop = Math.max(b2.pop, 12);

			const rngBefore = sim.rng.state();

			// Record pandemic in a miasma-stage polity
			const p1 = recordPandemic(sim, 'The Pale Sweating', b1.id, 0.6);
			expect(p1).not.toBeNull();
			expect(p1!.effectiveMortality).toBeCloseTo(0.6, 2);

			const st = getMedicineState(sim);
			expect(st.quarantineWalls.length).toBeGreaterThanOrEqual(1);
			expect(st.massGraves.length).toBeGreaterThanOrEqual(1);

			// Advance b2's polity to germ_theory and charter a plague-doctor order
			for (let i = 0; i < 4; i++) advanceMedicine(sim, b2.state);
			const order = foundPlagueDoctorOrder(sim, b2.state, b2.id);
			expect(order).not.toBeNull();

			const p2 = recordPandemic(sim, 'Crimson Cough', b2.id, 0.6);
			expect(p2).not.toBeNull();
			expect(p2!.effectiveMortality).toBeLessThan(p1!.effectiveMortality);

			// Quarantine wall helper idempotency
			const wall = buildQuarantineWall(sim, b2.state, b2.id, p2!.id);
			expect(wall).not.toBeNull();

			// Yearly pass runs deterministically without touching sim.rng
			for (let y = 0; y < 4; y++) {
				sim.year++;
				yearlyMedicinePlagues(sim);
			}
			expect(sim.rng.state()).toBe(rngBefore);
		});
	});

	describe('3. Interactive What-If World Forking', () => {
		it('forks from a historical snapshot, advances N years independently, and compares timelines', () => {
			// Advance original sim 15 years so multiple snapshots exist (years 1, 5, 10, 15)
			for (let m = 0; m < 15 * 12; m++) sim.tick();
			expect(sim.historySnapshots.length).toBeGreaterThanOrEqual(3);

			const origYearBefore = sim.year;
			const origRngBefore = sim.rng.state();
			const origEventsBefore = sim.allEvents.length;

			// Fork from snapshot index 1 (Year 5)
			const fork = forkFromSnapshot(sim, 1, 'What If Peace Failed');
			expect(fork.forkYear).toBe(sim.historySnapshots[1].year);
			expect(fork.sim.year).toBe(fork.forkYear);
			expect(fork.label).toBe('What If Peace Failed');

			// Advance the fork by 10 years
			runForkYears(fork, 10);
			expect(fork.yearsAdvanced).toBe(10);
			expect(fork.sim.year).toBe(fork.forkYear + 10);

			// Original simulation must be completely unmutated
			expect(sim.year).toBe(origYearBefore);
			expect(sim.rng.state()).toBe(origRngBefore);
			expect(sim.allEvents.length).toBe(origEventsBefore);

			// Compare original vs fork
			const cmp = compareTimelines(sim, fork);
			expect(cmp.forkYear).toBe(fork.forkYear);
			expect(cmp.divergenceLabel).toBe('What If Peace Failed');
			expect(cmp.original.survivingRealms).toBeGreaterThan(0);
			expect(cmp.fork.survivingRealms).toBeGreaterThan(0);
			expect(cmp.original.totalCells).toBeGreaterThan(0);
			expect(cmp.fork.totalCells).toBeGreaterThan(0);
			expect(cmp.deltas.survivingRealms).toBe(cmp.fork.survivingRealms - cmp.original.survivingRealms);
			expect(cmp.deltas.totalCells).toBe(cmp.fork.totalCells - cmp.original.totalCells);
			expect(cmp.divergentHighlights.length).toBeGreaterThan(0);

			// Determinism: repeating the same fork with the same label gives identical results
			const fork2 = forkFromSnapshot(sim, 1, 'What If Peace Failed');
			runForkYears(fork2, 10);
			expect(fork2.sim.rng.state()).toBe(fork.sim.rng.state());
			expect(fork2.sim.allEvents.length).toBe(fork.sim.allEvents.length);
		});
	});
});
