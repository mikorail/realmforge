import { describe, expect, it } from 'vitest';
import { generateUniverse } from './universe';
import { Cosmos } from '../sim/cosmos';
import type { GenInput } from './types';

const base: GenInput = { seed: 'test', template: 'continents', cells: 3000, states: 10, width: 1600, height: 1000, genre: 'fantasy', planet: 'terran', spheres: null, depth: 2, sky: true, sea: true };

describe('generation', () => {
	it('is deterministic from the seed', () => {
		const a = generateUniverse(base, 1).planets[0];
		const b = generateUniverse(base, 1).planets[0];
		expect(a.name).toBe(b.name);
		expect(Array.from(a.cells.h)).toEqual(Array.from(b.cells.h));
		expect(a.burgs.map((x) => x.name)).toEqual(b.burgs.map((x) => x.name));
	});
	it('builds every requested layer, with the surface sharing cells.state', () => {
		const w = generateUniverse(base, 1).planets[0];
		expect(w.layers.map((l) => l.kind)).toEqual(['surface', 'deep', 'deep', 'sky', 'sea']);
		expect(w.layers[0].state).toBe(w.cells.state);
		expect(w.burgs.some((b) => b.layer === 'deep')).toBe(true);
	});
	it('respects chosen culture spheres', () => {
		const w = generateUniverse({ ...base, spheres: ['yoruba', 'nahua'] }, 1).planets[0];
		expect(new Set(w.cultures.slice(1).map((c) => c.sphere))).toEqual(new Set(['yoruba', 'nahua']));
	});
	it('climate config drives temperature and the new counts are honoured', () => {
		const hot = generateUniverse({ ...base, climate: { tEq: 40, tN: 20, tS: 20, mapSize: 30, latitude: 50, longitude: 50, prec: 100, winds: [225, 45, 225, 315, 135, 315] } }, 1).planets[0];
		const cold = generateUniverse({ ...base, climate: { tEq: -5, tN: -50, tS: -50, mapSize: 30, latitude: 50, longitude: 50, prec: 100, winds: [225, 45, 225, 315, 135, 315] } }, 1).planets[0];
		const avg = (a: Int8Array) => a.reduce((s, v) => s + v, 0) / a.length;
		expect(avg(hot.cells.temp)).toBeGreaterThan(avg(cold.cells.temp) + 20);
		const w = generateUniverse({ ...base, cultures: 7, religions: 3, burgs: 60, depth: 0, sky: false, sea: false }, 1).planets[0];
		expect(w.cultures.length - 1).toBe(7);
		expect(w.religions.filter((r) => r.type !== 'Folk').length).toBe(3);
		expect(w.burgs.length - 1).toBeLessThanOrEqual(60);
	});
	it('links planets with rifts and simulates a century without crashing', () => {
		const u = generateUniverse(base, 2);
		expect(u.rifts.length).toBeGreaterThan(0);
		const cos = new Cosmos(u);
		for (let m = 0; m < 1200; m++) cos.tick();
		expect(cos.year).toBe(101);
		expect(cos.sims.every((s) => s.polities.some((p) => p.alive))).toBe(true);
	});
});
