import { describe, expect, it } from 'vitest';
import { generateUniverse } from '../gen/universe';
import { Cosmos } from './cosmos';
import { makeRng } from '../rng';
import {
	resolveMonsterCombat,
	updateMonsters,
	evaluateRealmWeirdness,
	processMonsterWrath
} from './monsters';
import { buildRealmRoads } from './roads';

const testConfig = {
	seed: 'beasts-roads-seed-42',
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

describe('beasts, titan wrath, and realm roads', () => {
	it('supports immortal titans that slumber and reawaken over centuries', () => {
		const u = generateUniverse(testConfig, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		// Ensure we have an immortal monster
		let monster = sim.monsters.find((m) => m.immortal);
		if (!monster) {
			monster = sim.monsters[0];
			monster.immortal = true;
		}

		expect(monster.birthYear).toBeLessThan(0); // Existed for centuries prior to year 1
		monster.health = 15;
		const startYear = 100;
		const rng = makeRng('combat-test-1');

		// Mortal blow struck against immortal titan
		const res = resolveMonsterCombat(monster, 100, 'Heroic Champion', startYear, rng);
		expect(res.slain).toBe(true);
		expect(monster.alive).toBe(false);
		expect(monster.slayer).toBe('Heroic Champion');
		expect(monster.slumberUntil).toBeGreaterThan(startYear + 50);
		expect(res.summary).not.toContain('—');

		// Simulating intervening years: monster should stay dead/dormant during slumber
		const eventsMidway = updateMonsters(sim.monsters, sim.w, sim.rng, startYear + 10, 0);
		expect(monster.alive).toBe(false);
		expect(eventsMidway.some((e) => e.text.includes('TITAN REAWAKENING'))).toBe(false);

		// When slumber year arrives or passes, titan rises again
		const wakeupYear = monster.slumberUntil! + 1;
		const eventsWake = updateMonsters(sim.monsters, sim.w, sim.rng, wakeupYear, 0);
		expect(monster.alive).toBe(true);
		expect(monster.slumberUntil).toBeUndefined();
		expect(monster.health).toBe(monster.maxHealth);
		expect(eventsWake.some((e) => e.text.includes('TITAN REAWAKENING'))).toBe(true);
	});

	it('evaluates realm weirdness and provokes beast wrath', () => {
		const u = generateUniverse(testConfig, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		const pol = sim.polities.find((p) => p.alive && p.id)!;
		const monster = sim.monsters.find((m) => m.alive)!;

		// Baseline evaluation
		const baseEval = evaluateRealmWeirdness(sim, pol, monster);
		expect(typeof baseEval.score).toBe('number');
		expect(baseEval.reason).not.toContain('—');

		// Induce weird traits: iconoclasm, tyrant ruler, low stability
		pol.religion = 0;
		pol.ideology = 'technocracy';
		pol.stability = 10;
		const ruler = sim.ruler(pol);
		if (ruler) {
			ruler.traits = ['Cruel', 'Tyrant', 'Mad'];
		}

		const weirdEval = evaluateRealmWeirdness(sim, pol, monster);
		expect(weirdEval.score).toBeGreaterThan(baseEval.score);
		expect(weirdEval.reason).toContain('blasphemous iconoclasm');
		expect(weirdEval.reason).toContain('bloody societal chaos');
	});

	it('allows a catastrophic beast to completely destroy a nation', () => {
		const u = generateUniverse(testConfig, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		const pol = sim.polities.find((p) => p.alive && p.id && p.cells > 0)!;
		expect(pol).toBeDefined();
		const cap = sim.w.burgs[pol.capital];

		// Create or configure a cataclysmic beast
		const titan = sim.monsters[0];
		titan.alive = true;
		titan.tier = 'cataclysm';
		titan.power = 120;
		titan.cell = cap.cell;
		titan.x = cap.x;
		titan.y = cap.y;
		titan.behavior = 'rampage';
		titan.wrathTarget = pol.id;

		// Reduce realm to only the capital settlement so it cannot relocate
		const realmBurgs = sim.idx.burgsIn(sim.w.burgs, pol.id);
		for (const b of realmBurgs) {
			if (b.id !== cap.id) {
				b.alive = false;
				sim.w.cells.burg[b.cell] = 0;
			}
		}
		sim.idx.touch();

		const initialDestructions = titan.destructionCount ?? 0;
		const events = processMonsterWrath(sim);

		// Realm must be destroyed
		expect(pol.alive).toBe(false);
		expect(titan.destructionCount).toBe(initialDestructions + 1);

		// All cells belonging to this polity must be cleared to 0 (wilderness reclaimed)
		const S = sim.st(0);
		for (let i = 0; i < sim.w.cells.n; i++) {
			expect(S[i]).not.toBe(pol.id);
		}

		// Check apocalyptic event logged with zero em dashes
		const apocalypseEvent = events.find((e) => e.kind === 'fall');
		expect(apocalypseEvent).toBeDefined();
		expect(apocalypseEvent?.text).toContain('TITAN APOCALYPSE');
		expect(apocalypseEvent?.text).not.toContain('—');
	});

	it('allows realms to construct royal roads and new routes', () => {
		const u = generateUniverse(testConfig, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];

		// Pick a prosperous polity and give it sufficient treasury and stability
		const pol = sim.polities.find((p) => p.alive && p.id)!;
		pol.treasury = 300;
		pol.stability = 90;

		const routesBefore = sim.w.routes.length;
		const linksBefore = sim.w.links.length;

		// Force construction
		let built = false;
		for (let attempt = 0; attempt < 10; attempt++) {
			buildRealmRoads(sim);
			if (sim.w.routes.length > routesBefore) {
				built = true;
				break;
			}
		}

		expect(built).toBe(true);
		expect(sim.w.routes.length).toBeGreaterThan(routesBefore);
		expect(sim.w.links.length).toBeGreaterThan(linksBefore);

		const newRoute = sim.w.routes[sim.w.routes.length - 1];
		expect(newRoute.cells.length).toBeGreaterThan(1);
		expect(newRoute.name).toBeDefined();
		expect(newRoute.name).not.toContain('—');

		// Check that road levels were stamped on terrain cells
		let roadStamped = false;
		for (const c of newRoute.cells) {
			if (sim.w.cells.road[c] > 0) {
				roadStamped = true;
				break;
			}
		}
		expect(roadStamped).toBe(true);
	});
});
