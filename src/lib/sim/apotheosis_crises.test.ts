import { describe, expect, it } from 'vitest';
import { generateUniverse } from '../gen/universe';
import { Cosmos } from './cosmos';
import {
	canAscendToGodhood,
	performApotheosis,
	castApotheosisMiracle,
	processYearlyApotheosis,
	getApotheosis,
	getAllApotheoses,
	PORTFOLIO_CONFIG,
	type ApotheosisPortfolio
} from './apotheosis';
import {
	triggerPlanetaryCrisis,
	quarantineCrisisArea,
	processYearlyCrisis,
	getActiveCrises,
	getAllCrises,
	type CrisisKind
} from './crises';

const testConfig = {
	seed: 'apotheosis-crises-suite-1',
	template: 'continents' as const,
	cells: 2500,
	states: 6,
	width: 1000,
	height: 600,
	genre: 'fantasy' as const,
	planet: 'terran' as const,
	spheres: null,
	depth: 0,
	sky: false,
	sea: false
};

function createTestSim(seedSuffix = '1') {
	const u = generateUniverse({ ...testConfig, seed: `${testConfig.seed}-${seedSuffix}` }, 1);
	const cos = new Cosmos(u);
	const sim = cos.sims[0];
	sim.sandbox = true;
	return sim;
}

describe('avatar divine ascension (apotheosis)', () => {
	it('evaluates eligibility criteria correctly for mortals', () => {
		const sim = createTestSim('eligibility');
		const person = sim.people[1];
		expect(person).toBeDefined();

		// Case 1: Low renown, no feats -> ineligible
		person.renown = 30;
		person.traits = ['Cautious'];
		person.role = 'wanderer';
		const checkLow = canAscendToGodhood(sim, person.id);
		expect(checkLow.eligible).toBe(false);
		expect(checkLow.reqRenown).toBe(85);
		expect(checkLow.reqTrophyOrFeat).toBe(false);
		expect(checkLow.reason).toBeDefined();
		expect(checkLow.reason).not.toContain('—');

		// Case 2: Renown 85+ -> eligible
		person.renown = 90;
		const checkRenown = canAscendToGodhood(sim, person.id);
		expect(checkRenown.eligible).toBe(true);

		// Case 3: Renown below 85, but slew a cataclysm beast -> eligible
		person.renown = 40;
		if (sim.monsters.length > 0) {
			const m = sim.monsters[0];
			m.tier = 'cataclysm';
			m.alive = false;
			m.slayer = person.name;
		} else {
			person.traits.push('Cataclysm Slayer');
		}
		const checkBeast = canAscendToGodhood(sim, person.id);
		expect(checkBeast.eligible).toBe(true);
		expect(checkBeast.reqTrophyOrFeat).toBe(true);

		// Case 4: Legendary sovereign / archmage rule -> eligible
		person.renown = 75;
		person.role = 'ruler';
		person.traits = ['Legendary'];
		const checkSovereign = canAscendToGodhood(sim, person.id);
		expect(checkSovereign.eligible).toBe(true);
		expect(checkSovereign.reqTrophyOrFeat).toBe(true);
	});

	it('performs divine apotheosis ceremony into an immortal God-King', () => {
		const sim = createTestSim('ceremony');
		const person = sim.people[1];
		person.renown = 95;

		const res = performApotheosis(
			sim,
			person.id,
			'sun',
			'Solarius the Radiant',
			'Order of the Solar Aegis'
		);

		expect(res.success).toBe(true);
		expect(res.apotheosis).toBeDefined();
		expect(res.apotheosis.ascended).toBe(true);
		expect(res.apotheosis.deityName).toBe('Solarius the Radiant');
		expect(res.apotheosis.portfolio).toBe('sun');
		expect(res.apotheosis.constellation).toBe('The Solar Crown');
		expect(res.apotheosis.holyOrderName).toBe('Order of the Solar Aegis');
		expect(res.apotheosis.prayerMana).toBe(100);
		expect(res.apotheosis.followers).toBeGreaterThanOrEqual(800);
		expect(res.apotheosis.domainPerks).toEqual(PORTFOLIO_CONFIG.sun.perks);

		// Immortal God-King status
		expect(person.alive).toBe(true);
		expect(person.traits).toContain('Immortal');
		expect(person.traits).toContain('God-King');
		expect(person.traits).toContain('Ascended');

		// Registered in lookup helpers
		expect(getApotheosis(sim, person.id)).toBe(res.apotheosis);
		expect(getAllApotheoses(sim)).toContain(res.apotheosis);

		// Verified chronicle log without em dashes
		expect(res.msg).not.toContain('—');
		const godEvents = sim.events.filter((e) => e.kind === 'god');
		expect(godEvents.length).toBeGreaterThan(0);
		for (const ev of godEvents) {
			expect(ev.text).not.toContain('—');
		}
	});

	it('assigns thematic constellations and perks across all portfolios', () => {
		const sim = createTestSim('portfolios');
		const portfolios: ApotheosisPortfolio[] = [
			'storm',
			'war',
			'secrets',
			'harvest',
			'death',
			'forge',
			'chaos',
			'sun',
			'abyss'
		];

		for (const p of portfolios) {
			const person = sim.blankPerson();
			person.name = `Champion of ${p}`;
			person.renown = 100;
			person.id = sim.people.length;
			sim.people.push(person);

			const res = performApotheosis(sim, person.id, p);
			expect(res.success).toBe(true);
			expect(res.apotheosis.portfolio).toBe(p);
			expect(res.apotheosis.constellation).toBe(PORTFOLIO_CONFIG[p].constellation);
			expect(res.apotheosis.domainPerks).toEqual(PORTFOLIO_CONFIG[p].perks);
			expect(res.msg).not.toContain('—');
		}
	});

	it('enacts personal divine miracles consuming prayer mana', () => {
		const sim = createTestSim('miracles');
		const person = sim.people[1];
		person.renown = 100;
		const { apotheosis } = performApotheosis(sim, person.id, 'war');

		const targetCell = 150;

		// 1. Smite Hostile Army (cost 40)
		const smiteRes = castApotheosisMiracle(sim, person.id, 'smite_army', targetCell);
		expect(smiteRes.success).toBe(true);
		expect(apotheosis.prayerMana).toBe(60);
		expect(apotheosis.miraclesCast).toBe(1);
		expect(smiteRes.msg).not.toContain('—');

		// 2. Bless Province (cost 30)
		const blessRes = castApotheosisMiracle(sim, person.id, 'bless_province', targetCell);
		expect(blessRes.success).toBe(true);
		expect(apotheosis.prayerMana).toBe(30);
		expect(apotheosis.miraclesCast).toBe(2);
		expect(blessRes.msg).not.toContain('—');

		// 3. Quell Revolt (cost 35) -> insufficient mana check (only 30 remaining)
		const quellFail = castApotheosisMiracle(sim, person.id, 'quell_revolt', targetCell);
		expect(quellFail.success).toBe(false);
		expect(quellFail.msg).toContain('Insufficient prayer mana');
		expect(quellFail.msg).not.toContain('—');

		// Add mana and cast quell_revolt successfully
		apotheosis.prayerMana += 40;
		const quellSuccess = castApotheosisMiracle(sim, person.id, 'quell_revolt', targetCell);
		expect(quellSuccess.success).toBe(true);
		expect(apotheosis.prayerMana).toBe(35);
		expect(quellSuccess.msg).not.toContain('—');

		// 4. Avatar Host (cost 50) -> insufficient
		const hostFail = castApotheosisMiracle(sim, person.id, 'avatar_host', targetCell);
		expect(hostFail.success).toBe(false);

		apotheosis.prayerMana += 50;
		const hostSuccess = castApotheosisMiracle(sim, person.id, 'avatar_host', targetCell);
		expect(hostSuccess.success).toBe(true);
		expect(hostSuccess.msg).not.toContain('—');
	});

	it('processes annual prayer tithes, holy order spread, and pilgrimages', () => {
		const sim = createTestSim('yearly-apotheosis');
		const person = sim.people[1];
		person.renown = 90;
		const { apotheosis } = performApotheosis(sim, person.id, 'harvest');
		const initialMana = apotheosis.prayerMana;
		const initialFollowers = apotheosis.followers;

		sim.year += 1;
		const yearly = processYearlyApotheosis(sim);

		expect(apotheosis.prayerMana).toBeGreaterThan(initialMana);
		expect(apotheosis.followers).toBeGreaterThan(initialFollowers);

		// Advance 10 years to trigger grand pilgrimage festival milestone
		sim.year += 9;
		const milestoneYearly = processYearlyApotheosis(sim);
		expect(milestoneYearly.events.length).toBeGreaterThan(0);
		for (const ev of milestoneYearly.events) {
			expect(ev.text).not.toContain('—');
		}
	});
});

describe('planetary grand crises', () => {
	it('triggers all 3 crisis kinds with correct thematic consequences', () => {
		const sim = createTestSim('crises-trigger');

		// 1. Pale Blight
		const blight = triggerPlanetaryCrisis(sim, 'pale_blight');
		expect(blight.kind).toBe('pale_blight');
		expect(blight.name).toContain('The Pale Blight');
		expect(blight.intensity).toBeGreaterThanOrEqual(70);
		expect(blight.blightedCells.length).toBeGreaterThan(0);
		expect(blight.activeHordes).toBeGreaterThan(0);
		expect(blight.contained).toBe(false);
		expect(blight.curedYear).toBeUndefined();

		// 2. Midas Curse
		const midas = triggerPlanetaryCrisis(sim, 'midas_curse');
		expect(midas.kind).toBe('midas_curse');
		expect(midas.name).toContain('The Midas Curse');
		expect(midas.intensity).toBeGreaterThanOrEqual(60);
		expect(midas.blightedCells.length).toBeGreaterThan(0);
		expect(midas.contained).toBe(false);

		// 3. Blood Eclipse
		// Ensure at least one living monster exists to test mutation
		if (sim.monsters.length === 0) {
			sim.monsters.push({
				id: 1,
				name: 'Test Behemoth',
				species: 'Gargantuan Beast',
				tier: 'cataclysm',
				category: 'mythos',
				icon: '🐉',
				cell: 200,
				layer: 0,
				x: 500,
				y: 300,
				power: 60,
				health: 300,
				maxHealth: 300,
				alive: true,
				lairCell: 200,
				lairName: 'Abyssal Chasm',
				behavior: 'roaming',
				lore: 'Ancient terror of the deep lands.'
			});
		}
		const initialPower = sim.monsters[0].power;

		const eclipse = triggerPlanetaryCrisis(sim, 'blood_eclipse');
		expect(eclipse.kind).toBe('blood_eclipse');
		expect(eclipse.name).toContain('The Blood Eclipse');
		expect(eclipse.intensity).toBeGreaterThanOrEqual(80);
		expect(sim.monsters[0].power).toBe(Math.round(initialPower * 1.5));
		expect(sim.monsters[0].behavior).toBe('rampage');

		// Active crises list
		const active = getActiveCrises(sim);
		expect(active).toContain(blight);
		expect(active).toContain(midas);
		expect(active).toContain(eclipse);
		expect(getAllCrises(sim).length).toBe(3);
	});

	it('propagates uncontained crises and inflicts casualties over years', () => {
		const sim = createTestSim('crises-propagation');
		const blight = triggerPlanetaryCrisis(sim, 'pale_blight');
		const initialCellsCount = blight.blightedCells.length;
		const initialCasualties = blight.casualties;

		sim.year += 1;
		const yearly = processYearlyCrisis(sim);

		expect(blight.blightedCells.length).toBeGreaterThan(initialCellsCount);
		expect(blight.casualties).toBeGreaterThan(initialCasualties);
		expect(yearly.events.length).toBeGreaterThan(0);

		for (const ev of yearly.events) {
			expect(ev.text).not.toContain('—');
		}
	});

	it('establishes quarantine containment and eradicates crisis with funding', () => {
		const sim = createTestSim('quarantine');
		const crisis = triggerPlanetaryCrisis(sim, 'midas_curse');
		expect(crisis.contained).toBe(false);

		// Partial funding
		const q1 = quarantineCrisisArea(sim, crisis.id, 100);
		expect(q1.success).toBe(true);
		expect(q1.msg).not.toContain('—');
		expect(crisis.containmentProgress).toBeGreaterThan(0);
		expect(crisis.quarantineFunding).toBe(100);

		// Full funding to eradicate
		const q2 = quarantineCrisisArea(sim, crisis.id, 400);
		expect(q2.success).toBe(true);
		expect(q2.msg).not.toContain('—');
		expect(crisis.contained).toBe(true);
		expect(crisis.curedYear).toBe(sim.year);

		// Now no longer in active crises
		const active = getActiveCrises(sim);
		expect(active).not.toContain(crisis);

		// Trying to quarantine an already cured crisis fails cleanly
		const qAgain = quarantineCrisisArea(sim, crisis.id, 50);
		expect(qAgain.success).toBe(false);
		expect(qAgain.msg).not.toContain('—');
	});

	it('allows contained crises to recede naturally and conclude over time', () => {
		const sim = createTestSim('crisis-recede');
		const blight = triggerPlanetaryCrisis(sim, 'pale_blight');

		// Contain without immediately curing
		crisisSetContained(blight);
		blight.intensity = 20;

		sim.year += 1;
		processYearlyCrisis(sim);
		// Intensity should drop by 15
		expect(blight.intensity).toBe(5);

		sim.year += 1;
		processYearlyCrisis(sim);
		// Intensity drops to 0 and cures
		expect(blight.intensity).toBe(0);
		expect(blight.curedYear).toBe(sim.year);
	});

	it('ends Blood Eclipse after 10 years and calms rampaging monsters', () => {
		const sim = createTestSim('blood-eclipse-cycle');
		if (sim.monsters.length === 0) {
			sim.monsters.push({
				id: 1,
				name: 'Blood Beast',
				species: 'Beast',
				tier: 'cataclysm',
				category: 'mythos',
				icon: '🐺',
				cell: 100,
				layer: 0,
				x: 300,
				y: 300,
				power: 50,
				health: 200,
				maxHealth: 200,
				alive: true,
				lairCell: 100,
				lairName: 'Den',
				behavior: 'roaming',
				lore: 'Predator.'
			});
		}

		const eclipse = triggerPlanetaryCrisis(sim, 'blood_eclipse');
		expect(eclipse.contained).toBe(false);
		expect(sim.monsters[0].behavior).toBe('rampage');

		// Fast forward 10 years
		sim.year = eclipse.yearStarted + 10;
		const res = processYearlyCrisis(sim);

		expect(eclipse.contained).toBe(true);
		expect(eclipse.curedYear).toBe(sim.year);
		expect(sim.monsters[0].behavior).toBe('roaming');

		const conclusionEv = res.events.find((e) => e.text.includes('10-year astrological omen concludes'));
		expect(conclusionEv).toBeDefined();
		expect(conclusionEv!.text).not.toContain('—');
	});

	it('maintains determinism across identical simulation seeds', () => {
		const sim1 = createTestSim('seed-match');
		const sim2 = createTestSim('seed-match');

		const c1 = triggerPlanetaryCrisis(sim1, 'pale_blight');
		const c2 = triggerPlanetaryCrisis(sim2, 'pale_blight');

		expect(c1.epicenter).toBe(c2.epicenter);
		expect(c1.blightedCells).toEqual(c2.blightedCells);
		expect(c1.intensity).toBe(c2.intensity);
		expect(c1.name).toBe(c2.name);
	});

	it('strictly contains zero em dashes in any log, text, perk, or description', () => {
		const sim = createTestSim('zero-em-dash');

		// 1. Apotheosis perks and configs
		for (const conf of Object.values(PORTFOLIO_CONFIG)) {
			expect(conf.title).not.toContain('—');
			expect(conf.constellation).not.toContain('—');
			expect(conf.orderDefault).not.toContain('—');
			expect(conf.namePrefix).not.toContain('—');
			for (const p of conf.perks) {
				expect(p).not.toContain('—');
			}
		}

		// 2. Perform apotheosis and cast all miracles
		const person = sim.people[1];
		person.renown = 99;
		performApotheosis(sim, person.id, 'secrets');
		castApotheosisMiracle(sim, person.id, 'smite_army', 10);
		castApotheosisMiracle(sim, person.id, 'bless_province', 10);

		// 3. Trigger all crises and advance years
		triggerPlanetaryCrisis(sim, 'pale_blight');
		triggerPlanetaryCrisis(sim, 'midas_curse');
		triggerPlanetaryCrisis(sim, 'blood_eclipse');

		sim.year += 1;
		processYearlyApotheosis(sim);
		processYearlyCrisis(sim);

		// Verify every single logged event across the simulation
		for (const ev of sim.events) {
			expect(ev.text).not.toContain('—');
			if (ev.detail) expect(ev.detail).not.toContain('—');
		}
	});
});

function crisisSetContained(c: any) {
	c.contained = true;
}
