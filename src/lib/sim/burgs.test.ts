import { describe, expect, it } from 'vitest';
import { generateUniverse } from '../gen/universe';
import { Simulation } from './engine';
import {
	DISTRICT_DEFINITIONS,
	districtCost,
	getBurgDistricts,
	getDistrictTierName,
	getBurgSiegeDefense,
	getBurgBeastDamageReduction,
	getBurgFamineMitigation,
	mitigateBurgFamine,
	upgradeDistrict,
	appointBurgGovernor,
	stationGarrison,
	grantBurgCharter,
	processYearlyBurgs,
	type DistrictKind
} from './burgs';

const universeOpts = {
	seed: 'burg-arch-test-seed',
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

function createTestSimulation(): { sim: Simulation; burg: import('../gen/types').Burg; pol: import('./types').Polity } {
	const world = generateUniverse(universeOpts, 1).planets[0];
	const sim = new Simulation(world);
	const pol = sim.polities.find((p) => p.alive && p.id && p.capital > 0)!;
	const burg = sim.w.burgs[pol.capital] || sim.w.burgs.find((b) => b.alive && b.id && b.state === pol.id)!;
	return { sim, burg, pol };
}

describe('Burg settlement infrastructure and management', () => {
	it('provides default district levels and cost curve', () => {
		const { burg } = createTestSimulation();
		// Delete any existing districts to test default initialization
		delete burg.districts;

		const d = getBurgDistricts(burg);
		expect(d.walls).toBe(0);
		expect(d.market).toBe(0);
		expect(d.granary).toBe(0);
		expect(d.temple).toBe(0);
		expect(d.academy).toBe(0);

		// Cost progression
		expect(districtCost('walls', 0)).toBe(25);
		expect(districtCost('walls', 1)).toBe(60);
		expect(districtCost('walls', 2)).toBe(120);
		expect(districtCost('walls', 3)).toBe(Infinity);

		// Tier names
		expect(getDistrictTierName('walls', 0)).toBe('Unfortified');
		expect(getDistrictTierName('walls', 1)).toBe('Timber Palisades');
		expect(getDistrictTierName('walls', 2)).toBe('Stone Ramparts');
		expect(getDistrictTierName('walls', 3)).toBe('Citadel');

		expect(getDistrictTierName('market', 0)).toBe('Local Stalls');
		expect(getDistrictTierName('market', 3)).toBe('Merchant Guildhall');

		expect(getDistrictTierName('granary', 0)).toBe('None');
		expect(getDistrictTierName('granary', 3)).toBe('Aqueduct System');

		expect(getDistrictTierName('temple', 0)).toBe('Shrine');
		expect(getDistrictTierName('temple', 3)).toBe('Sacred Pagoda');

		expect(getDistrictTierName('academy', 0)).toBe('None');
		expect(getDistrictTierName('academy', 3)).toBe('Great University');
	});

	it('deducts gold and increments district levels on upgrade', () => {
		const { sim, burg, pol } = createTestSimulation();
		burg.districts = undefined;
		pol.treasury = 200;
		sim.dirty.terrain = false;

		// Upgrade level 0 -> 1 (costs 25)
		const res1 = upgradeDistrict(sim, burg.id, 'walls');
		expect(res1.success).toBe(true);
		expect(res1.msg).toContain('Timber Palisades');
		expect(res1.msg).toContain('25 gold');
		expect(pol.treasury).toBe(175);
		expect(getBurgDistricts(burg).walls).toBe(1);
		expect(sim.dirty.terrain).toBe(true);

		// Upgrade level 1 -> 2 (costs 60)
		sim.dirty.terrain = false;
		const res2 = upgradeDistrict(sim, burg.id, 'walls');
		expect(res2.success).toBe(true);
		expect(res2.msg).toContain('Stone Ramparts');
		expect(res2.msg).toContain('60 gold');
		expect(pol.treasury).toBe(115);
		expect(getBurgDistricts(burg).walls).toBe(2);
		expect(sim.dirty.terrain).toBe(true);

		// Upgrade level 2 -> 3 requires 120, but treasury is only 115
		const resFail = upgradeDistrict(sim, burg.id, 'walls');
		expect(resFail.success).toBe(false);
		expect(resFail.msg).toContain('Insufficient treasury');
		expect(getBurgDistricts(burg).walls).toBe(2);
		expect(pol.treasury).toBe(115);

		// Add sufficient funds and complete upgrade to Citadel
		pol.treasury += 50; // now 165
		const res3 = upgradeDistrict(sim, burg.id, 'walls');
		expect(res3.success).toBe(true);
		expect(res3.msg).toContain('Citadel');
		expect(getBurgDistricts(burg).walls).toBe(3);
		expect(pol.treasury).toBe(45);

		// Attempting to upgrade past level 3 fails
		const resMax = upgradeDistrict(sim, burg.id, 'walls');
		expect(resMax.success).toBe(false);
		expect(resMax.msg).toContain('maximum tier');
		expect(getBurgDistricts(burg).walls).toBe(3);
	});

	it('appoints burg governor and stations military garrison', () => {
		const { sim, burg, pol } = createTestSimulation();
		const courtier =
			sim.idx.inState(sim.people, pol.id).find((p) => p.alive && p.role !== 'ruler') ||
			sim.makePerson(burg.culture, pol.id, burg.id, 'merchant', 32);

		// Appoint governor
		const resGov = appointBurgGovernor(sim, burg.id, courtier.id);
		expect(resGov.success).toBe(true);
		expect(resGov.msg).toContain(courtier.name);
		expect(burg.governor).toBe(courtier.id);
		expect(courtier.burg).toBe(burg.id);

		// Dismiss governor
		const resDismiss = appointBurgGovernor(sim, burg.id, 0);
		expect(resDismiss.success).toBe(true);
		expect(burg.governor).toBeUndefined();

		// Station garrison
		const resGarr = stationGarrison(sim, burg.id, 20);
		expect(resGarr.success).toBe(true);
		expect(resGarr.msg).toContain('20');
		expect(burg.garrison).toBe(20);

		// Grant royal municipal charter
		burg.charter = false;
		const initStab = pol.stability;
		const initGold = pol.treasury;
		const resChart = grantBurgCharter(sim, burg.id);
		expect(resChart.success).toBe(true);
		expect(burg.charter).toBe(true);
		expect(pol.stability).toBeGreaterThanOrEqual(initStab);
		expect(pol.treasury).toBe(initGold + 15);

		// Duplicate charter fails
		const resDup = grantBurgCharter(sim, burg.id);
		expect(resDup.success).toBe(false);
		expect(resDup.msg).toContain('already holds a municipal charter');
	});

	it('processes yearly burgs yielding innovation from academies and trade gold from markets', () => {
		const { sim, burg, pol } = createTestSimulation();
		burg.districts = {
			walls: 1,
			market: 2,
			granary: 1,
			temple: 1,
			academy: 2
		};
		burg.charter = true;

		sim.innovation = 10;
		pol.treasury = 50;

		const startInnov = sim.innovation;
		const startGold = pol.treasury;

		processYearlyBurgs(sim);

		// Level 2 academy grants +5 innovation points
		expect(sim.innovation).toBeGreaterThanOrEqual(startInnov + 5);

		// Level 2 market + charter yields annual gold
		expect(pol.treasury).toBeGreaterThan(startGold);

		// Test level 3 academy gives +8 innovation points
		burg.districts.academy = 3;
		const preInnov = sim.innovation;
		processYearlyBurgs(sim);
		expect(sim.innovation).toBeGreaterThanOrEqual(preInnov + 8);
	});

	it('provides defense against sieges and beasts and resilience against famines', () => {
		const { burg } = createTestSimulation();

		// Baseline unfortified burg
		burg.districts = { walls: 0, market: 0, granary: 0, temple: 0, academy: 0 };
		burg.garrison = 0;
		burg.charter = false;

		const baseDefense = getBurgSiegeDefense(burg);
		expect(baseDefense).toBe(1.0);
		expect(getBurgBeastDamageReduction(burg)).toBe(0);
		expect(getBurgFamineMitigation(burg)).toBe(0);

		// Upgraded walls and stationed garrison
		burg.districts.walls = 2; // Stone Ramparts
		burg.garrison = 10;
		burg.charter = true;

		const fortifiedDefense = getBurgSiegeDefense(burg);
		expect(fortifiedDefense).toBeGreaterThan(1.7);
		expect(getBurgBeastDamageReduction(burg)).toBeGreaterThan(0.3);

		// Citadel maximum protection
		burg.districts.walls = 3;
		expect(getBurgSiegeDefense(burg)).toBeGreaterThan(2.0);
		expect(getBurgBeastDamageReduction(burg)).toBeGreaterThanOrEqual(0.45);

		// Granary famine mitigation
		burg.districts.granary = 1;
		expect(getBurgFamineMitigation(burg)).toBe(0.35);

		burg.districts.granary = 2;
		expect(getBurgFamineMitigation(burg)).toBe(0.70);

		burg.districts.granary = 3; // Aqueduct System gives 100% immunity
		expect(getBurgFamineMitigation(burg)).toBe(1.0);

		// Verify famine mitigation preserves population
		burg.pop = 50.0;
		const outcomeImmune = mitigateBurgFamine(burg, 0.40);
		expect(outcomeImmune.popLost).toBe(0);
		expect(burg.pop).toBe(50.0);

		// Unprotected burg loses population in famine
		burg.districts.granary = 0;
		const outcomeVulnerable = mitigateBurgFamine(burg, 0.30);
		expect(outcomeVulnerable.popLost).toBeGreaterThan(0);
		expect(burg.pop).toBeLessThan(50.0);
	});

	it('enforces strictly zero em dashes in all logs, text, and messages', () => {
		const { sim, burg, pol } = createTestSimulation();
		pol.treasury = 500;
		burg.districts = { walls: 0, market: 0, granary: 0, temple: 0, academy: 0 };

		// Check all district definitions
		const kinds: DistrictKind[] = ['walls', 'market', 'granary', 'temple', 'academy'];
		for (const k of kinds) {
			const def = DISTRICT_DEFINITIONS[k];
			expect(def.name).not.toContain('—');
			expect(def.desc).not.toContain('—');
			for (const lvl of def.levels) {
				expect(lvl.name).not.toContain('—');
				expect(lvl.desc).not.toContain('—');
				expect(lvl.effects).not.toContain('—');
			}
		}

		// Perform actions and verify all return messages
		const resUp = upgradeDistrict(sim, burg.id, 'market');
		expect(resUp.msg).not.toContain('—');

		const resGov = appointBurgGovernor(sim, burg.id, 1);
		expect(resGov.msg).not.toContain('—');

		const resGarr = stationGarrison(sim, burg.id, 12);
		expect(resGarr.msg).not.toContain('—');

		burg.charter = false;
		const resChart = grantBurgCharter(sim, burg.id);
		expect(resChart.msg).not.toContain('—');

		// Check all chronicle events generated
		for (const ev of sim.events) {
			expect(ev.text).not.toContain('—');
		}
	});
});
