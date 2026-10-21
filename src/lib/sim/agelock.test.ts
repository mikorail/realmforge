import { describe, expect, it } from 'vitest';
import { generateUniverse } from '../gen/universe';
import type { GenInput } from '../gen/types';
import { Simulation } from './engine';
import { DISCOVERIES, GENRE_AGE, lockedEra } from './tech';

const YEARS = 300;

function world(extra: Partial<GenInput> = {}) {
	const input: GenInput = { seed: 'agelock-test', cells: 2000, states: 8, ...extra };
	return generateUniverse(input, 1).planets[0];
}

function run(extra: Partial<GenInput>, years = YEARS) {
	const sim = new Simulation(world(extra));
	sim.skipMonths(years * 12);
	return sim;
}

describe('age lock', () => {
	it('starts the world in the locked era and keeps it for 300 years', () => {
		const sim = new Simulation(world({ ageLock: 2 }));
		expect(sim.era).toBe(2);
		sim.skipMonths(YEARS * 12);
		expect(sim.year).toBeGreaterThanOrEqual(YEARS);
		expect(sim.era).toBe(2);
		expect(sim.allEvents.some((e) => /wheel of ages/i.test(e.text))).toBe(false);
	});

	it('leaves the age free when the lock is off, and the wheel still turns', () => {
		const sim = run({});
		expect(sim.era).toBeGreaterThanOrEqual(1);
		expect(sim.allEvents.some((e) => /wheel of ages/i.test(e.text))).toBe(true);
	});

	it('null and undefined are byte-identical to the old behaviour', () => {
		const a = run({});
		const b = run({ ageLock: null });
		const c = run({ ageLock: undefined });
		const snap = (s: Simulation) => JSON.stringify({ era: s.era, techs: [...s.techs].sort(), ev: s.allEvents.map((e) => e.text) });
		expect(snap(b)).toBe(snap(a));
		expect(snap(c)).toBe(snap(a));
	});

	it('discoveries never exceed the locked era but keep unlocking', () => {
		const sim = run({ ageLock: 1 });
		const byId = new Map(DISCOVERIES.map((d) => [d.id, d]));
		expect(sim.techs.size).toBeGreaterThan(0);
		for (const id of sim.techs) expect(byId.get(id)!.era).toBeLessThanOrEqual(1);
	});

	it('innovation still accrues under a lock, so the lock is pinned rather than frozen', () => {
		const sim = run({ ageLock: 0 });
		expect(sim.era).toBe(0);
		expect(sim.innovation).toBeGreaterThan(0);
	});

	it('voice follows the locked era only when evolve is on', () => {
		const frozen = new Simulation(world({ genre: 'fantasy', ageLock: 2, evolve: false }));
		frozen.updateVoice();
		expect(frozen.voice).toBe('fantasy');

		const evolving = new Simulation(world({ genre: 'fantasy', ageLock: 2, evolve: true }));
		evolving.updateVoice();
		expect(evolving.voice).toBe('steampunk');
	});

	it('save and restore keep the lock, and old saves without the era field load into the locked era', () => {
		const w = world({ ageLock: 3 });
		const sim = new Simulation(w);
		sim.skipMonths(40 * 12);
		const d = sim.dump();
		const back = Simulation.restore(w, d);
		expect(back.era).toBe(3);
		expect(back.year).toBe(sim.year);

		const { era: _era, ...old } = d;
		void _era;
		const legacy = Simulation.restore(w, old as typeof d);
		expect(legacy.era).toBe(3);
	});

	it('maps genres to their natural eras and clamps out-of-range locks', () => {
		expect(GENRE_AGE.fantasy).toBe(1);
		expect(GENRE_AGE.mythic).toBe(0);
		expect(GENRE_AGE.steampunk).toBe(2);
		expect(GENRE_AGE.dieselpunk).toBe(3);
		expect(GENRE_AGE.solarpunk).toBe(4);
		expect(lockedEra(null)).toBeNull();
		expect(lockedEra(undefined)).toBeNull();
		expect(lockedEra(9)).toBe(4);
		expect(lockedEra(-3)).toBe(0);
		expect(lockedEra(2.4)).toBe(2);
	});
});
