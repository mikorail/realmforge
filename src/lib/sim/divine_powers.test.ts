import { describe, expect, it } from 'vitest';
import { generateUniverse } from '../gen/universe';
import { Cosmos } from './cosmos';
import { POWERS } from './systems/godpowers';

const testConfig = {
	seed: 'divine-epic-powers-test-1',
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

describe('epic god powers (worldwar, ragnarok, conspiracy, resurgence)', () => {
	it('registers all 4 epic powers in the POWERS table', () => {
		expect(POWERS.worldwar).toBeDefined();
		expect(POWERS.ragnarok).toBeDefined();
		expect(POWERS.conspiracy).toBeDefined();
		expect(POWERS.resurgence).toBeDefined();

		expect(POWERS.worldwar.name).toBe('Incite World War');
		expect(POWERS.ragnarok.name).toBe('True Ragnarok');
		expect(POWERS.conspiracy.name).toBe('Grand Conspiracy');
		expect(POWERS.resurgence.name).toBe('Phoenix Resurgence');
	});

	it('incites great world war polarising nations into two grand ideological coalitions', () => {
		const u = generateUniverse(testConfig, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];
		sim.sandbox = true;

		const living = sim.polities.filter((p) => p.id && p.alive);
		expect(living.length).toBeGreaterThanOrEqual(2);

		const err = sim.cast('worldwar', 0, 0);
		expect(err).toBeNull();

		// World war must be registered in sim.wars
		const worldWar = sim.wars.find((w) => w.name.includes('World War'));
		expect(worldWar).toBeDefined();
		expect(worldWar!.attackers.length).toBeGreaterThan(0);
		expect(worldWar!.defenders.length).toBeGreaterThan(0);

		// Disjoint coalitions
		for (const att of worldWar!.attackers) {
			expect(worldWar!.defenders).not.toContain(att);
		}

		// Check logs for zero em dashes
		const warLogs = sim.events.filter((e) => e.text.includes('Great World War'));
		expect(warLogs.length).toBeGreaterThan(0);
		for (const ev of warLogs) {
			expect(ev.text).not.toContain('—');
		}
	});

	it('incites true ragnarok with world-eaters and forces mortal stalemate concordat', () => {
		const u = generateUniverse(testConfig, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];
		sim.sandbox = true;

		const monstersBefore = sim.monsters.length;
		const err = sim.cast('ragnarok', 0, 0);
		expect(err).toBeNull();

		// 4 primordial world-eaters spawned
		expect(sim.monsters.length).toBe(monstersBefore + 4);
		const fenrir = sim.monsters.find((m) => m.name.includes('Fenrir'));
		const surtr = sim.monsters.find((m) => m.name.includes('Surtr'));
		const nidhogg = sim.monsters.find((m) => m.name.includes('Nidhogg'));
		const jormungandr = sim.monsters.find((m) => m.name.includes('Jormungandr'));

		expect(fenrir).toBeDefined();
		expect(surtr).toBeDefined();
		expect(nidhogg).toBeDefined();
		expect(jormungandr).toBeDefined();

		expect(fenrir!.tier).toBe('cataclysm');
		expect(fenrir!.immortal).toBe(true);
		expect(fenrir!.armor).toBeGreaterThanOrEqual(0.75);
		expect(fenrir!.power).toBeGreaterThanOrEqual(200);

		// All wars should be paused/finished in white peace
		const activeWars = sim.wars.filter((w) => !w.end);
		expect(activeWars.length).toBe(0);

		// Chronicle check for zero em dashes
		const ragnarokLogs = sim.events.filter((e) => e.text.includes('RAGNAROK'));
		expect(ragnarokLogs.length).toBeGreaterThan(0);
		for (const ev of ragnarokLogs) {
			expect(ev.text).not.toContain('—');
		}
	});

	it('executes grand conspiracy destroying an empire from within', () => {
		const u = generateUniverse(testConfig, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];
		sim.sandbox = true;

		const target = sim.polities.find((p) => p.alive && p.id && p.cells > 5)!;
		const rulerBefore = sim.ruler(target);
		const cap = sim.w.burgs[target.capital];

		const err = sim.cast('conspiracy', cap.cell, 0);
		expect(err).toBeNull();

		// Ruler must be dead from poisoned dagger
		if (rulerBefore) {
			expect(rulerBefore.alive).toBe(false);
			expect(rulerBefore.cause).toContain('poison');
		}

		// Stability and treasury shattered
		expect(target.stability).toBe(0);
		expect(target.treasury).toBe(0);

		// Foreign relations collapsed
		expect(target.allies.length).toBe(0);

		// Chronicle event verified without em dashes
		const conspireLogs = sim.events.filter((e) => e.state === target.id && e.text.includes('CONSPIRACY'));
		expect(conspireLogs.length).toBeGreaterThan(0);
		for (const ev of conspireLogs) {
			expect(ev.text).not.toContain('—');
		}
	});

	it('resurrects ancient fallen kingdom and family from hundreds of years ago', () => {
		const u = generateUniverse(testConfig, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];
		sim.sandbox = true;

		// Pick a realm to simulate ancient history: founded Y1, fell Y300, now resurrected in Y800
		const target = sim.polities.find((p) => p.alive && p.id)!;
		target.founded = 1;
		target.fell = 300;
		target.alive = false;
		sim.year = 800;

		const capCell = sim.w.burgs[target.capital]?.cell ?? 100;

		// Resurrect specifically this ancient fallen kingdom
		sim.divineTargetPolityId = target.id;
		const err = sim.cast('resurgence', capCell, 0);
		expect(err).toBeNull();

		// Kingdom must be reborn alive
		expect(target.alive).toBe(true);
		expect(target.fell).toBeUndefined();
		expect(target.form).toBe('Phoenix Empire');
		expect(target.fullName).toContain('Phoenix Empire');
		expect(target.treasury).toBeGreaterThanOrEqual(500);
		expect(target.army).toBeGreaterThanOrEqual(150);
		expect(target.stability).toBe(100);

		// 50-year Golden Age era
		expect(target.era).toBe('The Phoenix Resurgence');
		const phoenixEra = target.eras?.find((e) => e.name === 'The Phoenix Resurgence');
		expect(phoenixEra).toBeDefined();
		expect(phoenixEra!.from).toBe(800);
		expect(phoenixEra!.to).toBe(850);

		// Sovereign must be crowned with legendary traits
		const ruler = sim.ruler(target);
		expect(ruler).toBeDefined();
		expect(ruler!.name).toContain('Phoenix Reborn');
		expect(ruler!.martial).toBe(95);
		expect(ruler!.diplomacy).toBe(95);
		expect(ruler!.traits).toContain('Legendary');
		expect(ruler!.traits).toContain('Immortal');

		// Sacred heirloom relic created
		const relic = sim.artifacts.find((a) => a.holderId === target.id && a.name.includes('Phoenix'));
		expect(relic).toBeDefined();
		expect(relic!.icon).toBe('👑');

		// Chronicle event logged without em dashes
		const resLogs = sim.events.filter((e) => e.state === target.id && e.text.includes('RESURGENCE'));
		expect(resLogs.length).toBeGreaterThan(0);
		for (const ev of resLogs) {
			expect(ev.text).not.toContain('—');
			expect(ev.text).toContain('Founded in year 1');
			expect(ev.text).toContain('fallen in year 300');
			expect(ev.text).toContain('year 800');
		}
	});
});
