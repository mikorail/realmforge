import { describe, expect, it } from 'vitest';
import { generateUniverse } from '../gen/universe';
import { Cosmos } from './cosmos';
import { POWERS, type Power } from './systems/godpowers';

const testConfig = {
	seed: 'divine-regime-test-seed-1',
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

describe('divine regime transformation (coup, reform, revolution by gods will)', () => {
	it('registers coup, reform, and revolution in POWERS table', () => {
		expect(POWERS.coup).toBeDefined();
		expect(POWERS.reform).toBeDefined();
		expect(POWERS.revolution).toBeDefined();
		expect(POWERS.coup.name).toBe('Divine Coup');
		expect(POWERS.reform.name).toBe('Divine Reform');
		expect(POWERS.revolution.name).toBe('Divine Revolution');
	});

	it('executes a divine coup d etat to overthrow a ruler and transform the system', () => {
		const u = generateUniverse(testConfig, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];
		sim.sandbox = true; // Unlimited mana for god testing

		const pol = sim.polities.find((p) => p.alive && p.id)!;
		const oldIdeology = pol.ideology;
		const oldFullName = pol.fullName;
		const oldRulerId = pol.ruler;
		const cap = sim.w.burgs[pol.capital];

		// Cast Divine Coup
		const err = sim.cast('coup', cap.cell, 0);
		expect(err).toBeNull();

		// Realm should have transitioned
		expect(pol.fullName).not.toBe(oldFullName);
		expect(pol.reformedSystemYear).toBe(sim.year);
		expect(pol.systemChangeCause).toBe('coup');

		// Old ruler should be deposed
		const oldRuler = sim.people[oldRulerId];
		if (oldRuler) {
			expect(oldRuler.alive).toBe(false);
			expect(oldRuler.cause).toContain('coup');
		}

		// Chronicle event logged
		const coupEvents = sim.events.filter((e) => e.state === pol.id && (e.kind === 'coup' || e.kind === 'god'));
		expect(coupEvents.length).toBeGreaterThan(0);
		for (const ev of coupEvents) {
			expect(ev.text).not.toContain('—');
		}
	});

	it('respects divineTargetIdeology to dictate the exact system for a coup', () => {
		const u = generateUniverse(testConfig, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];
		sim.sandbox = true;

		const pol = sim.polities.find((p) => p.alive && p.id)!;
		const cap = sim.w.burgs[pol.capital];

		sim.divineTargetIdeology = 'theocracy';
		const err = sim.cast('coup', cap.cell, 0);
		expect(err).toBeNull();

		expect(pol.ideology).toBe('theocracy');
		expect(pol.form.toLowerCase()).toMatch(/theocracy|holy|see|order|patriarchate|divine/);
	});

	it('executes peaceful divine constitutional reform preserving ruler and boosting stability', () => {
		const u = generateUniverse(testConfig, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];
		sim.sandbox = true;

		const pol = sim.polities.find((p) => p.alive && p.id)!;
		pol.ideology = 'monarchy';
		pol.stability = 40;
		const cap = sim.w.burgs[pol.capital];
		const rulerBefore = sim.people[pol.ruler];

		sim.divineTargetIdeology = 'republic';
		const err = sim.cast('reform', cap.cell, 0);
		expect(err).toBeNull();

		expect(pol.ideology).toBe('republic');
		expect(pol.stability).toBeGreaterThanOrEqual(60); // +25 stability boost
		expect(rulerBefore.alive).toBe(true); // Peaceful reform does not execute ruler

		// Re-casting the exact same ideology returns a helpful message
		const duplicateErr = sim.cast('reform', cap.cell, 0);
		expect(duplicateErr).toContain('already follows this constitutional system');
	});

	it('executes a popular revolution by divine will to dismantle autocracy', () => {
		const u = generateUniverse(testConfig, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];
		sim.sandbox = true;

		const pol = sim.polities.find((p) => p.alive && p.id)!;
		pol.ideology = 'autocracy';
		const cap = sim.w.burgs[pol.capital];

		sim.divineTargetIdeology = 'communal';
		const err = sim.cast('revolution', cap.cell, 0);
		expect(err).toBeNull();

		expect(pol.ideology).toBe('communal');
		expect(pol.form.toLowerCase()).toMatch(/union|republic|commune|commonwealth|federation/);
		expect(pol.systemChangeCause).toBe('revolution');

		const godLogs = sim.events.filter((e) => e.kind === 'god' && e.state === pol.id);
		expect(godLogs.some((e) => e.text.includes('DIVINE MANDATE'))).toBe(true);
		for (const ev of godLogs) {
			expect(ev.text).not.toContain('—');
		}
	});

	it('supports casting coup, reform, and revolution on random targets', () => {
		const u = generateUniverse(testConfig, 1);
		const cos = new Cosmos(u);
		const sim = cos.sims[0];
		sim.sandbox = true;

		const powers: Power[] = ['coup', 'reform', 'revolution'];
		for (const p of powers) {
			sim.divineTargetIdeology = undefined;
			const res = sim.castRandom(p, 0);
			expect(res.cell).toBeGreaterThanOrEqual(0);
			expect(res.text).toBeDefined();
			expect(res.text).not.toContain('—');
		}
	});
});
