import { describe, expect, it } from 'vitest';
import { generateUniverse } from '../gen/universe';
import { Simulation } from './engine';
import {
	formTradeLeague,
	joinTradeLeague,
	formDefensiveCoalition,
	arrangeRoyalMarriage,
	evaluateSuccessionCrisis,
	spawnBanditsAndPiracy,
	clearBanditCamp,
	processYearlyLeagues,
	getTradeLeagues,
	getDefensiveCoalitions,
	getRoyalMarriages,
	getBanditCamps
} from './leagues';

const universeOpts = {
	seed: 'leagues-arch-test-seed',
	template: 'continents' as const,
	cells: 2500,
	states: 6,
	width: 1400,
	height: 900,
	genre: 'fantasy' as const,
	planet: 'terran' as const,
	spheres: null,
	depth: 1,
	sky: false,
	sea: false
};

function createTestSimulation(): {
	sim: Simulation;
	burg: import('../gen/types').Burg;
	pol: import('./types').Polity;
} {
	const world = generateUniverse(universeOpts, 1).planets[0];
	const sim = new Simulation(world);
	const pol = sim.polities.find((p) => p.alive && p.id && p.capital > 0)!;
	const burg =
		sim.w.burgs[pol.capital] ||
		sim.w.burgs.find((b) => b.alive && b.id && b.state === pol.id)!;
	return { sim, burg, pol };
}

describe('Trade Leagues, Coalitions, Royal Marriages, and Bandits System', () => {
	it('handles trade league creation, membership, and dividend yields', () => {
		const { sim, burg, pol } = createTestSimulation();

		// Reset districts to ensure market is level 0 and no charter
		burg.districts = { market: 0, walls: 0, granary: 0, temple: 0, academy: 0 };
		burg.charter = false;
		burg.port = false;
		burg.tradeLeague = undefined;

		// Unqualified burg cannot found a trade league
		const failLeague = formTradeLeague(sim, burg.id);
		expect(failLeague).toBeNull();

		// Qualify burg with Level 2 market
		burg.districts.market = 2;
		const league = formTradeLeague(sim, burg.id, 'League of the Silver Tide');
		expect(league).not.toBeNull();
		expect(league?.name).toBe('League of the Silver Tide');
		expect(league?.leaderBurgId).toBe(burg.id);
		expect(league?.memberBurgIds).toContain(burg.id);
		expect(league?.monopolies.length).toBeGreaterThanOrEqual(2);
		expect(league?.treasury).toBe(60);
		expect(league?.fleetEscortBonus).toBe(20);
		expect(burg.tradeLeague).toBe(league?.id);

		// Second burg joins the league
		const otherBurg = sim.w.burgs.find(
			(b) => b.alive && b.id && b.id !== burg.id && !b.tradeLeague
		);
		expect(otherBurg).toBeDefined();
		if (otherBurg && league) {
			const joined = joinTradeLeague(sim, league.id, otherBurg.id);
			expect(joined).toBe(true);
			expect(league.memberBurgIds).toContain(otherBurg.id);
			expect(otherBurg.tradeLeague).toBe(league.id);

			// Cannot join twice
			const reJoin = joinTradeLeague(sim, league.id, otherBurg.id);
			expect(reJoin).toBe(false);
		}

		// Annual processing pays dividends
		const initialTreasury = pol.treasury;
		const initialLeagueTreasury = league?.treasury ?? 0;
		const result = processYearlyLeagues(sim);
		expect(result.events.length).toBeGreaterThan(0);
		expect(pol.treasury).toBeGreaterThan(initialTreasury);
		expect(league?.treasury).toBeGreaterThan(initialLeagueTreasury);
	});

	it('triggers defensive coalitions against aggressive conquerors', () => {
		const { sim, pol } = createTestSimulation();

		// Non-aggressive realm returns null
		const noCoalition = formDefensiveCoalition(sim, pol.id);
		expect(noCoalition).toBeNull();

		// Set realm to have >35% land control and 2+ conquest victories
		const totalCells = sim.polities.reduce(
			(sum, p) => sum + (p.alive && p.id ? p.cells : 0),
			0
		);
		pol.cells = Math.floor(totalCells * 0.5) + 50;

		const enemy = sim.polities.find((p) => p.alive && p.id && p.id !== pol.id)!;
		sim.wars.push({
			id: sim.nextWar++,
			name: 'Imperial Conquest of the North',
			attackers: [pol.id],
			defenders: [enemy.id],
			start: sim.year,
			score: 15,
			months: 18,
			startArmy: [500, 200],
			winner: 'attackers'
		});
		sim.wars.push({
			id: sim.nextWar++,
			name: 'Imperial Conquest of the Marches',
			attackers: [pol.id],
			defenders: [enemy.id],
			start: sim.year,
			score: 20,
			months: 24,
			startArmy: [600, 150],
			winner: 'attackers'
		});

		const coalition = formDefensiveCoalition(sim, pol.id);
		expect(coalition).not.toBeNull();
		expect(coalition?.targetStateId).toBe(pol.id);
		expect(coalition?.memberStateIds.length).toBeGreaterThan(0);
		expect(coalition?.memberStateIds).not.toContain(pol.id);
		expect(coalition?.threatLevel).toBeGreaterThan(35);

		// Members have coalition id assigned
		const memberId = coalition!.memberStateIds[0];
		expect(sim.polities[memberId].coalition).toBe(coalition!.id);
	});

	it('handles royal marriages and succession inheritance claims', () => {
		const world = generateUniverse(universeOpts, 1).planets[0];
		const sim = new Simulation(world);
		const polA = sim.polities.find((p) => p.alive && p.id && p.capital > 0)!;
		const polB = sim.polities.find(
			(p) => p.alive && p.id && p.id !== polA.id && p.capital > 0
		)!;
		const polC = sim.polities.find(
			(p) => p.alive && p.id && p.id !== polA.id && p.id !== polB.id && p.capital > 0
		)!;

		const initialRel = sim.rel(polA.id, polB.id);
		const marriageRes = arrangeRoyalMarriage(sim, polA.id, polB.id);
		expect(marriageRes.success).toBe(true);
		expect(sim.rel(polA.id, polB.id)).toBe(initialRel + 30);
		expect(polA.royalMarriages).toContain(polB.id);
		expect(polB.royalMarriages).toContain(polA.id);

		// Duplicate marriage rejected
		const dupRes = arrangeRoyalMarriage(sim, polA.id, polB.id);
		expect(dupRes.success).toBe(false);

		// Single claimant triggers Personal Union when ruler dies with no heirs
		polA.heir = 0;
		const crisisRes = evaluateSuccessionCrisis(sim, polA.id);
		expect(crisisRes.inheritedByState).toBe(polB.id);
		expect(crisisRes.warOfSuccession).toBe(false);
		expect(polA.overlord).toBe(polB.id);

		// Multiple claimants trigger a Succession War
		arrangeRoyalMarriage(sim, polC.id, polA.id);
		polA.heir = 0;
		const warCrisis = evaluateSuccessionCrisis(sim, polA.id);
		expect(warCrisis.warOfSuccession).toBe(true);
	});

	it('handles bandit camp spawning in vulnerable burgs and successful clearing', () => {
		const { sim, burg, pol } = createTestSimulation();

		// Make burg vulnerable: unfortified, garrison < 5, realm stability < 35%
		burg.districts = { walls: 0, market: 0, granary: 0, temple: 0, academy: 0 };
		burg.garrison = 2;
		pol.stability = 25;
		pol.treasury = 100;

		const camps = spawnBanditsAndPiracy(sim);
		expect(camps.length).toBeGreaterThan(0);

		const targetCamp = camps.find((c) => c.burgId === burg.id);
		expect(targetCamp).toBeDefined();
		expect(targetCamp?.strength).toBeGreaterThanOrEqual(10);
		expect(burg.banditCove || burg.pirateCove).toBe(true);

		// Yearly processing siphons trade wealth into camp hoard
		const initialHoard = targetCamp!.lootedGold;
		processYearlyLeagues(sim);
		expect(targetCamp!.lootedGold).toBeGreaterThan(initialHoard);

		// Dispatched attack force clears the camp
		const clearRes = clearBanditCamp(sim, burg.id, 50);
		expect(clearRes.success).toBe(true);
		expect(clearRes.loot).toBeGreaterThanOrEqual(10);
		expect(burg.banditCove).toBe(false);
		expect(burg.pirateCove).toBe(false);
		expect(getBanditCamps(sim).find((c) => c.burgId === burg.id)).toBeUndefined();
	});

	it('ensures determinism and strictly zero em dashes in all logs, text, and messages', () => {
		const world1 = generateUniverse(universeOpts, 1).planets[0];
		const sim1 = new Simulation(world1);
		const world2 = generateUniverse(universeOpts, 1).planets[0];
		const sim2 = new Simulation(world2);

		const b1 = sim1.w.burgs.find((b) => b.alive && b.id)!;
		b1.districts = { market: 2, walls: 0, granary: 0, temple: 0, academy: 0 };
		const l1 = formTradeLeague(sim1, b1.id);

		const b2 = sim2.w.burgs.find((b) => b.alive && b.id)!;
		b2.districts = { market: 2, walls: 0, granary: 0, temple: 0, academy: 0 };
		const l2 = formTradeLeague(sim2, b2.id);

		expect(l1?.name).toBe(l2?.name);
		expect(l1?.monopolies).toEqual(l2?.monopolies);

		// Zero em dashes verification
		const res1 = processYearlyLeagues(sim1);
		for (const ev of res1.events) {
			expect(ev.text).not.toContain('—');
		}

		for (const ev of sim1.events) {
			expect(ev.text).not.toContain('—');
		}

		const p1 = sim1.polities.find((p) => p.alive && p.id)!;
		const p2 = sim1.polities.find((p) => p.alive && p.id && p.id !== p1.id)!;
		const marRes = arrangeRoyalMarriage(sim1, p1.id, p2.id);
		expect(marRes.msg).not.toContain('—');

		p1.heir = 0;
		const succRes = evaluateSuccessionCrisis(sim1, p1.id);
		expect(succRes.msg).not.toContain('—');

		const camps = spawnBanditsAndPiracy(sim1);
		for (const camp of camps) {
			expect(camp.name).not.toContain('—');
			const clearRes = clearBanditCamp(sim1, camp.burgId, 30);
			expect(clearRes.msg).not.toContain('—');
		}
	});
});
