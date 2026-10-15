import { describe, expect, it } from 'vitest';
import { generateUniverse } from '../gen/universe';
import { Simulation } from './engine';
import {
	initWorldMegastructures,
	generateTowerFloor,
	attemptTowerTrial,
	attemptAbyssDescent,
	triggerFloorBreak,
	triggerAbyssalSurge,
	processYearlyMegastructures,
	getMegastructureState,
	getHallOfRankers,
	getWhiteWhistleDelvers,
	computeRankerGrade,
	ABYSS_DEPTH_LAYERS,
	type TowerFloor
} from './megastructures';

const testOpts = {
	seed: 'megastructure-test-seed-v1',
	template: 'continents' as const,
	cells: 1000,
	states: 4,
	width: 1000,
	height: 600,
	genre: 'fantasy' as const,
	planet: 'terran' as const,
	spheres: null,
	depth: 1,
	sky: false,
	sea: false
};

function createTestContext(customSeed = testOpts.seed) {
	const world = generateUniverse({ ...testOpts, seed: customSeed }, 1).planets[0];
	const sim = new Simulation(world);
	const hero = sim.people.find((p) => p.alive && p.id > 0)!;

	hero.health = 250;
	hero.martial = 35;
	hero.diplomacy = 20;
	hero.stewardship = 20;
	hero.intrigue = 30;
	hero.gold = 500;
	hero.renown = 100;
	hero.traits = ['Mystic', 'Brave'];

	const { abyss, tower } = initWorldMegastructures(sim);

	return { sim, hero, abyss, tower };
}

describe('Megastructures - Deterministic Placement and Procedural Floors', () => {
	it('places the Abyss and Tower deterministically on identical seeds', () => {
		const ctx1 = createTestContext('seed-alpha-42');
		const ctx2 = createTestContext('seed-alpha-42');

		expect(ctx1.abyss.cell).toBe(ctx2.abyss.cell);
		expect(ctx1.tower.cell).toBe(ctx2.tower.cell);
		expect(ctx1.abyss.outpostBurgId).toBe(ctx2.abyss.outpostBurgId);
		expect(ctx1.tower.outpostBurgId).toBe(ctx2.tower.outpostBurgId);
		expect(ctx1.abyss.kind).toBe('abyss');
		expect(ctx1.tower.kind).toBe('tower');
	});

	it('generates procedural tower floors deterministically with milestone bosses', () => {
		const f1 = generateTowerFloor('test-seed', 1);
		const f1Duplicate = generateTowerFloor('test-seed', 1);
		expect(f1).toEqual(f1Duplicate);
		expect(f1.floor).toBe(1);
		expect(f1.guardian.power).toBeGreaterThan(0);

		// Milestone floors: 10, 20, 50, 77, 100 must be boss trials
		const milestoneFloors = [10, 20, 50, 77, 100];
		for (const floorNum of milestoneFloors) {
			const floor = generateTowerFloor('test-seed', floorNum);
			expect(floor.trialKind).toBe('boss');
			expect(floor.guardian.name.length).toBeGreaterThan(0);
			expect(floor.guardian.title.length).toBeGreaterThan(0);
			expect(floor.clearReward.relic).toBeDefined();
		}

		// Floor 77 and Floor 100 constellation stigmas
		const f77 = generateTowerFloor('test-seed', 77);
		expect(f77.clearReward.constellationStigma).toBe('Stigma of the Polaris Weaver');

		const f100 = generateTowerFloor('test-seed', 100);
		expect(f100.clearReward.constellationStigma).toBe('Stigma of the Supreme Ascendant');
		expect(f100.name).toBe('The Apex of Ascendance');
	});
});

describe('Megastructures - Ranker Progression and Leaderboards', () => {
	it('correctly calculates RankerGrade progression', () => {
		expect(computeRankerGrade(5)).toBe('F');
		expect(computeRankerGrade(10)).toBe('E');
		expect(computeRankerGrade(20)).toBe('D');
		expect(computeRankerGrade(30)).toBe('C');
		expect(computeRankerGrade(40)).toBe('B');
		expect(computeRankerGrade(50)).toBe('A');
		expect(computeRankerGrade(70)).toBe('S');
		expect(computeRankerGrade(77)).toBe('SS');
		expect(computeRankerGrade(90)).toBe('SSS');
		expect(computeRankerGrade(100, 20)).toBe('Ranker');
		expect(computeRankerGrade(100, 75)).toBe('High Ranker');
	});

	it('allows a hero to climb from F-Rank to High Ranker and enter the Hall of Rankers', () => {
		const { sim, hero, tower } = createTestContext('seed-climber-test');

		// Climb low floor -> F-Rank
		const r1 = attemptTowerTrial(sim, tower, hero.id, 1, 'assault');
		expect(r1.success).toBe(true);

		let state = getMegastructureState(sim);
		let record = state.rankers.get(hero.id)!;
		expect(record).toBeDefined();
		expect(record.grade).toBe('F');
		expect(record.highestFloor).toBe(1);

		// Milestone Floor 10 -> E-Rank and Gatebreaker title
		hero.martial = 60;
		const r10 = attemptTowerTrial(sim, tower, hero.id, 10, 'assault');
		expect(r10.success).toBe(true);
		expect(record.grade).toBe('E');
		expect(record.titles).toContain('Gatebreaker');

		// Milestone Floor 50 -> A-Rank and Monarch Vanguard title
		hero.martial = 80;
		const r50 = attemptTowerTrial(sim, tower, hero.id, 50, 'assault');
		expect(r50.success).toBe(true);
		expect(record.grade).toBe('A');
		expect(record.titles).toContain('Monarch Vanguard');

		// Milestone Floor 77 -> SS-Rank and Star Chosen title and Constellation
		hero.intrigue = 100;
		const r77 = attemptTowerTrial(sim, tower, hero.id, 77, 'tactic');
		expect(r77.success).toBe(true);
		expect(record.grade).toBe('SS');
		expect(record.titles).toContain('Star Chosen');
		expect(record.constellation).toBeDefined();

		// Floor 95 -> SSS-Rank
		const r95 = attemptTowerTrial(sim, tower, hero.id, 95, 'assault');
		expect(r95.success).toBe(true);
		expect(record.grade).toBe('SSS');

		// Floor 100 -> High Ranker
		hero.renown = 120;
		const r100 = attemptTowerTrial(sim, tower, hero.id, 100, 'magic');
		expect(r100.success).toBe(true);
		expect(record.grade).toBe('High Ranker');
		expect(record.titles).toContain('Apex Ascendant');

		// Leaderboard verification
		const leaderboard = getHallOfRankers(sim);
		expect(leaderboard.length).toBeGreaterThan(0);
		expect(leaderboard[0].personId).toBe(hero.id);
		expect(leaderboard[0].grade).toBe('High Ranker');
		expect(leaderboard[0].highestFloor).toBe(100);
	});
});

describe('Megastructures - Abyss Descent, Curse of Ascension, and White Whistle Promotion', () => {
	it('defines all 6 depth layers with scaling strain and correct metadata', () => {
		expect(ABYSS_DEPTH_LAYERS.length).toBe(6);

		expect(ABYSS_DEPTH_LAYERS[0].name).toBe('Edge of the Abyss');
		expect(ABYSS_DEPTH_LAYERS[0].depthRange).toBe('0-1,350m');

		expect(ABYSS_DEPTH_LAYERS[1].name).toBe('Forest of Whispers');
		expect(ABYSS_DEPTH_LAYERS[1].depthRange).toBe('1,350-2,600m');

		expect(ABYSS_DEPTH_LAYERS[2].name).toBe('The Great Fault');
		expect(ABYSS_DEPTH_LAYERS[2].depthRange).toBe('2,600-7,000m');

		expect(ABYSS_DEPTH_LAYERS[3].name).toBe('Goblet of Giants');
		expect(ABYSS_DEPTH_LAYERS[3].depthRange).toBe('7,000-12,000m');

		expect(ABYSS_DEPTH_LAYERS[4].name).toBe('Sea of Corpses');
		expect(ABYSS_DEPTH_LAYERS[4].depthRange).toBe('12,000-13,000m');

		expect(ABYSS_DEPTH_LAYERS[5].name).toBe('Capital of the Unreturned');
		expect(ABYSS_DEPTH_LAYERS[5].depthRange).toContain('>13,000m');

		// Strain damages must strictly scale upward
		for (let i = 0; i < 5; i++) {
			expect(ABYSS_DEPTH_LAYERS[i].strainBaseDamage).toBeLessThan(
				ABYSS_DEPTH_LAYERS[i + 1].strainBaseDamage
			);
		}
	});

	it('promotes delvers through whistle tiers to White Whistle and executes The Last Dive', () => {
		const { sim, hero, abyss } = createTestContext('seed-abyss-test');
		hero.health = 500; // ample health to withstand deep strain

		// Layer 1 descent
		const d1 = attemptAbyssDescent(sim, abyss, hero.id, 1);
		expect(d1.success).toBe(true);
		expect(d1.lastDiveTriggered).toBe(false);

		let state = getMegastructureState(sim);
		let delver = state.delvers.get(hero.id)!;
		expect(delver).toBeDefined();
		expect(delver.whistle).toBe('red');

		// Layer 2 descent -> Blue Whistle
		const d2 = attemptAbyssDescent(sim, abyss, hero.id, 2);
		expect(d2.success).toBe(true);
		expect(delver.whistle).toBe('blue');

		// Layer 3 descent -> Moon Whistle
		const d3 = attemptAbyssDescent(sim, abyss, hero.id, 3);
		expect(d3.success).toBe(true);
		expect(delver.whistle).toBe('moon');

		// Layer 4 descent -> Black Whistle
		const d4 = attemptAbyssDescent(sim, abyss, hero.id, 4);
		expect(d4.success).toBe(true);
		expect(delver.whistle).toBe('black');

		// Layer 5 descent -> White Whistle promotion!
		const d5 = attemptAbyssDescent(sim, abyss, hero.id, 5);
		expect(d5.success).toBe(true);
		expect(delver.whistle).toBe('white');

		const whiteWhistles = getWhiteWhistleDelvers(sim);
		expect(whiteWhistles.length).toBeGreaterThan(0);
		expect(whiteWhistles[0].personId).toBe(hero.id);
		expect(whiteWhistles[0].whistle).toBe('white');

		// Layer 6 descent -> The Last Dive triggered
		const d6 = attemptAbyssDescent(sim, abyss, hero.id, 6);
		expect(d6.success).toBe(true);
		expect(d6.lastDiveTriggered).toBe(true);
		expect(delver.lastDive).toBe(true);
		expect(hero.traits).toContain('Abyssal Transcendent');
	});
});

describe('Megastructures - Floor Breaks, Abyssal Surges, and Yearly Processing', () => {
	it('triggers Floor Break and damages surrounding outpost', () => {
		const { sim, tower } = createTestContext('seed-break-test');
		tower.highestClearedFloor = 25;
		tower.currentFloorBreakRisk = 100;

		const breakResult = triggerFloorBreak(sim, tower);
		expect(breakResult.beastName).toContain('Chimera');
		expect(breakResult.cell).toBe(tower.cell);
		expect(tower.currentFloorBreakRisk).toBe(0);

		const state = getMegastructureState(sim);
		expect(state.activeBreakBeasts.length).toBeGreaterThan(0);
	});

	it('triggers Abyssal Surge and resets surge risk', () => {
		const { sim, abyss } = createTestContext('seed-surge-test');
		abyss.currentFloorBreakRisk = 100;

		const surgeResult = triggerAbyssalSurge(sim, abyss);
		expect(surgeResult.cell).toBe(abyss.cell);
		expect(abyss.currentFloorBreakRisk).toBe(0);
	});

	it('simulates yearly megastructure progression and adventurer expeditions', () => {
		const { sim, tower, abyss } = createTestContext('seed-yearly-test');
		tower.currentFloorBreakRisk = 95;
		abyss.currentFloorBreakRisk = 95;

		const res = processYearlyMegastructures(sim);
		expect(res.events).toBeDefined();
		expect(Array.isArray(res.events)).toBe(true);

		// With starting risk at 95, yearly increment should trigger break or surge
		const kinds = res.events.map((e) => e.kind);
		expect(kinds.includes('floor_break') || kinds.includes('abyssal_surge')).toBe(true);
	});
});

describe('Megastructures - Strict Zero Em Dashes Guarantee', () => {
	it('strictly ensures zero em dashes across all procedural outputs, layers, and texts', () => {
		// Check all 6 depth layers
		for (const layer of ABYSS_DEPTH_LAYERS) {
			expect(layer.name).not.toContain('—');
			expect(layer.depthRange).not.toContain('—');
			expect(layer.curseDescription).not.toContain('—');
		}

		// Check all 100 floors
		for (let i = 1; i <= 100; i++) {
			const floor = generateTowerFloor('em-dash-audit-seed', i);
			expect(floor.name).not.toContain('—');
			expect(floor.theme).not.toContain('—');
			expect(floor.guardian.name).not.toContain('—');
			expect(floor.guardian.title).not.toContain('—');
			if (floor.clearReward.relic) {
				expect(floor.clearReward.relic).not.toContain('—');
			}
			if (floor.clearReward.constellationStigma) {
				expect(floor.clearReward.constellationStigma).not.toContain('—');
			}
		}

		const { sim, hero, tower, abyss } = createTestContext('em-dash-runtime-seed');

		// Tower trial text
		const trialSuccess = attemptTowerTrial(sim, tower, hero.id, 1, 'assault');
		expect(trialSuccess.text).not.toContain('—');

		hero.health = 5;
		hero.martial = 0;
		const trialFail = attemptTowerTrial(sim, tower, hero.id, 99, 'assault');
		expect(trialFail.text).not.toContain('—');

		// Reset hero for abyss
		hero.health = 150;
		hero.alive = true;
		const abyssSuccess = attemptAbyssDescent(sim, abyss, hero.id, 3);
		expect(abyssSuccess.text).not.toContain('—');

		hero.health = 5;
		const abyssFail = attemptAbyssDescent(sim, abyss, hero.id, 6);
		expect(abyssFail.text).not.toContain('—');

		// Break and surge texts
		const breakEvt = triggerFloorBreak(sim, tower);
		expect(breakEvt.text).not.toContain('—');

		const surgeEvt = triggerAbyssalSurge(sim, abyss);
		expect(surgeEvt.text).not.toContain('—');

		// Yearly simulation events
		const yearly = processYearlyMegastructures(sim);
		for (const ev of yearly.events) {
			expect(ev.text).not.toContain('—');
		}
	});
});
