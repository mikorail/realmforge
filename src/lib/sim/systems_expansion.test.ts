import { describe, expect, it, beforeEach } from 'vitest';
import { generateUniverse } from '../gen/universe';
import { Cosmos } from './cosmos';
import type { Simulation } from './engine';

import {
	commissionFlagship,
	declareNavalBlockade,
	getNavalState,
	issueLetterOfMarque,
	spawnSeaMonster,
	yearlyNavalWar
} from './naval_war';

import {
	appointRegency,
	assignBloodlineCurse,
	getDynastyDeepState,
	triggerPretenderWar,
	yearlyDynastiesDeep
} from './dynasties_deep';

import {
	buildMagmaForge,
	collapseShaft,
	establishSubterraneanRiver,
	getSubterraneanState,
	yearlySubterranean
} from './subterranean';

import {
	addManaSmog,
	getThaumaturgyState,
	triggerManaDrought,
	triggerWildMagicBlight,
	yearlyThaumaturgy
} from './thaumaturgy';

import {
	canonizeSaint,
	establishPilgrimageRoute,
	getSaintsInquisitionState,
	launchInquisition,
	triggerRelicMiracle,
	yearlySaintsInquisition
} from './saints_inquisition';

import {
	declareCommodityMonopoly,
	defaultSovereignLoan,
	foundBankingHouse,
	getBankingState,
	issueSovereignLoan,
	repaySovereignLoan,
	startEconomicTradeWar,
	yearlyBanking
} from './banking';

describe('Realmforge 6 Expanded Systems Suite', () => {
	let sim: Simulation;

	beforeEach(() => {
		const u = generateUniverse(
			{
				seed: 'expansion-test-seed',
				template: 'continents',
				cells: 1000,
				states: 6,
				width: 800,
				height: 600,
				genre: 'fantasy',
				planet: 'terran',
				spheres: null,
				depth: 2,
				sky: true,
				sea: true
			},
			1
		);
		const cos = new Cosmos(u);
		sim = cos.sims[0];
	});

	describe('1. Naval Dominance, Flagships & High-Seas Piracy', () => {
		it('manages naval state and flagship commissioning', () => {
			const st = getNavalState(sim);
			expect(st.flagships).toBeDefined();

			const coastalState = sim.polities.find(
				(p) => p.id && p.alive && sim.w.burgs.some((b) => b.state === p.id && b.port)
			);
			expect(coastalState).toBeDefined();
			if (!coastalState) return;

			coastalState.treasury = 100;
			const ship = commissionFlagship(sim, coastalState.id, 'Turtle Ship', 'Iron Shell');
			expect(ship).not.toBeNull();
			expect(ship?.name).toBe('Iron Shell');
			expect(ship?.type).toBe('Turtle Ship');
			expect(ship?.alive).toBe(true);
			expect(ship?.power).toBeGreaterThan(100);

			// Check blockades
			const enemyState = sim.polities.find((p) => p.id && p.alive && p.id !== coastalState.id);
			expect(enemyState).toBeDefined();
			if (!enemyState) return;

			const targetPort = sim.w.burgs.find((b) => b.id && b.alive && b.port && b.state === enemyState.id);
			if (targetPort) {
				const blockade = declareNavalBlockade(sim, coastalState.id, targetPort.id);
				expect(blockade).not.toBeNull();
				expect(blockade?.targetBurg).toBe(targetPort.id);
			}

			// Check letters of marque
			const marque = issueLetterOfMarque(sim, coastalState.id, enemyState.id);
			expect(marque).not.toBeNull();
			expect(marque?.active).toBe(true);

			// Check sea monsters
			const monster = spawnSeaMonster(sim, 'Kraken');
			expect(monster).not.toBeNull();
			expect(monster?.kind).toBe('Kraken');
			expect(monster?.alive).toBe(true);

			// Run yearly naval update
			yearlyNavalWar(sim);
			expect(st.flagships.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe('2. Dynastic Bloodline Curses, Regencies & Pretender Wars', () => {
		it('applies bloodline curses, regency councils, and pretender wars', () => {
			const st = getDynastyDeepState(sim);
			const livingPersons = sim.idx.living(sim.people);
			expect(livingPersons.length).toBeGreaterThan(0);
			const p = livingPersons[0];

			// Assign bloodline curse
			const oldMartial = p.martial;
			const curse = assignBloodlineCurse(sim, p.id, 'Dragon-Heart', 2);
			expect(curse).not.toBeNull();
			expect(curse?.trait).toBe('Dragon-Heart');
			expect(p.traits).toContain('Dragon-Heart');
			expect(p.martial).toBeGreaterThan(oldMartial);

			// Appoint regency council
			const pol = sim.polities.find((x) => x.id && x.alive && x.ruler > 0);
			expect(pol).toBeDefined();
			if (!pol) return;

			const youngMonarch = sim.people[pol.ruler];
			youngMonarch.born = sim.year - 10; // age 10
			expect(sim.ageOf(youngMonarch)).toBe(10);

			const council = appointRegency(sim, pol.id, youngMonarch.id);
			expect(council).not.toBeNull();
			expect(council?.active).toBe(true);
			expect(council?.regentId).not.toBe(youngMonarch.id);

			// Trigger pretender contest
			const pretender = triggerPretenderWar(sim, pol.id);
			expect(pretender).not.toBeNull();
			expect(pretender?.stateId).toBe(pol.id);
			expect(pretender?.resolved).toBe(false);

			// Age monarch to 16 and run yearly pass
			youngMonarch.born = sim.year - 16;
			yearlyDynastiesDeep(sim);
			expect(council?.active).toBe(false); // Regency dissolved upon reaching majority
		});
	});

	describe('3. Subterranean Geopolitics & Deep Cavern Ecosystems', () => {
		it('builds magma forges, connects subterranean rivers, and handles shaft collapses', () => {
			const st = getSubterraneanState(sim);
			expect(st.forges).toBeDefined();

			const burgs = sim.w.burgs.filter((b) => b.id && b.alive && b.state);
			expect(burgs.length).toBeGreaterThan(1);
			const b1 = burgs[0];
			const b2 = burgs[1];

			// Magma forge
			const forge = buildMagmaForge(sim, b1.id);
			expect(forge).not.toBeNull();
			expect(forge?.burgId).toBe(b1.id);
			expect(forge?.weaponsOutput).toBeGreaterThan(0);
			expect(forge?.goldYield).toBeGreaterThan(0);

			// Subterranean river
			const river = establishSubterraneanRiver(sim, b1.id, b2.id, 'The Deep Stygian Flow');
			if (sim.burgLayer(b1) === sim.burgLayer(b2) && sim.burgLayer(b1) > 0) {
				expect(river).not.toBeNull();
				expect(river?.name).toBe('The Deep Stygian Flow');
			}

			// Shaft collapse
			const shaftIdx = sim.w.routes.findIndex((r) => r.kind === 'shaft');
			if (shaftIdx >= 0) {
				const col = collapseShaft(sim, shaftIdx);
				expect(col).not.toBeNull();
				expect(col?.routeIndex).toBe(shaftIdx);
				expect(sim.w.routes[shaftIdx].kind).toBe('ruin');
			}

			yearlySubterranean(sim);
			expect(st.forges.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe('4. Thaumaturgical Smog, Leyline Fallout & Wild Magic', () => {
		it('tracks mana smog, triggers wild magic blights, and manages mana droughts', () => {
			const st = getThaumaturgyState(sim);
			const cell = 50;

			// Add mana smog
			const zone = addManaSmog(sim, cell, 45, 'experimental alchemical test');
			expect(zone.intensity).toBe(45);
			expect(st.smogZones[cell].intensity).toBe(45);

			// Trigger wild magic blight
			const blight = triggerWildMagicBlight(sim, cell, 'crystalline_barrens');
			expect(blight).not.toBeNull();
			expect(blight.type).toBe('crystalline_barrens');
			expect(blight.active).toBe(true);

			// Trigger mana drought
			const drought = triggerManaDrought(sim, 2, 'planar rift leak');
			expect(drought.active).toBe(true);
			expect(drought.untilYear).toBe(sim.year + 2);

			yearlyThaumaturgy(sim);
			// Smog dissipates slightly
			expect(st.smogZones[cell].intensity).toBe(35);
		});
	});

	describe('5. Living Faiths: Saints, Inquisitions & Miraculous Relics', () => {
		it('canonizes saints, opens pilgrimage routes, runs inquisitions, and fires relic miracles', () => {
			const st = getSaintsInquisitionState(sim);
			const living = sim.idx.living(sim.people);
			expect(living.length).toBeGreaterThan(0);
			const candidate = living[0];
			candidate.alive = false; // deceased hero/martyr

			// Canonize saint
			const saint = canonizeSaint(sim, candidate.id, undefined, 'Valour');
			expect(saint).not.toBeNull();
			expect(saint?.virtue).toBe('Valour');
			expect(saint?.title).toContain('Saint');

			// Pilgrimage route
			const burgs = sim.w.burgs.filter((b) => b.id && b.alive);
			if (burgs.length >= 2) {
				const route = establishPilgrimageRoute(sim, burgs[0].id, burgs[1].id);
				expect(route).not.toBeNull();
				expect(route?.annualDonations).toBeGreaterThan(0);
			}

			// Inquisition
			const pol = sim.polities.find((p) => p.id && p.alive);
			if (pol) {
				const inq = launchInquisition(sim, pol.id);
				expect(inq).not.toBeNull();
				expect(inq?.active).toBe(true);
				expect(inq?.fervor).toBeGreaterThan(50);
			}

			// Relic miracle
			if (burgs.length) {
				const miracle = triggerRelicMiracle(sim, 999, burgs[0].id);
				expect(miracle).not.toBeNull();
				expect(miracle?.shrineBurg).toBe(burgs[0].id);
			}

			yearlySaintsInquisition(sim);
			expect(st.saints.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe('6. Trans-Continental Banking, Monopolies & Promissory Notes', () => {
		it('founds banking dynasties, issues sovereign loans, triggers default armadas, and starts trade wars', () => {
			const st = getBankingState(sim);
			const burg = sim.w.burgs.find((b) => b.id && b.alive && b.state);
			expect(burg).toBeDefined();
			if (!burg) return;

			// Found banking house
			const bank = foundBankingHouse(sim, burg.id, 'Medici Exchange');
			expect(bank).not.toBeNull();
			expect(bank?.name).toBe('Medici Exchange');
			expect(bank?.capitalGold).toBeGreaterThan(100);

			// Issue sovereign loan
			const borrower = sim.polities.find((p) => p.id && p.alive && p.id !== burg.state);
			expect(borrower).toBeDefined();
			if (!borrower || !bank) return;

			const borrowerOldTreasury = borrower.treasury;
			const loan = issueSovereignLoan(sim, bank.id, borrower.id, 80, 0.1);
			expect(loan).not.toBeNull();
			expect(borrower.treasury).toBe(borrowerOldTreasury + 80);
			expect(loan?.remainingBalance).toBe(88); // 80 * 1.1

			// Repay part of loan
			const repaid = repaySovereignLoan(sim, loan!.id, 30);
			expect(repaid).toBe(true);
			expect(loan?.remainingBalance).toBe(58);

			// Sovereign default and armada intervention
			const armada = defaultSovereignLoan(sim, loan!.id);
			expect(armada).not.toBeNull();
			expect(armada?.active).toBe(true);
			expect(armada?.targetState).toBe(borrower.id);
			expect(loan?.defaulted).toBe(true);

			// Commodity monopolies and trade wars
			declareCommodityMonopoly(sim, bank.id, 'spices');
			expect(bank.controlledMonopolies).toContain('spices');

			const tradeWar = startEconomicTradeWar(sim, burg.state, borrower.id, 'spices');
			expect(tradeWar).not.toBeNull();
			expect(tradeWar?.active).toBe(true);

			yearlyBanking(sim);
			expect(st.houses.length).toBeGreaterThanOrEqual(1);
		});
	});
});
