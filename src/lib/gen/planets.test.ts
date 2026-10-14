import { describe, expect, it } from 'vitest';
import { generateUniverse } from './universe';
import type { GenInput, World } from './types';

const base: GenInput = { seed: 'planets', template: 'continents', cells: 3000, states: 10, width: 1600, height: 1000, genre: 'fantasy', planet: 'terran', spheres: null, depth: 2, sky: true, sea: true };
const burgsOn = (w: World, kind: string) => w.burgs.filter((b) => b.layer === kind).length;
const sig = (w: World) => JSON.stringify([w.opts.planet, w.opts.template, w.opts.genre, w.burgs.length, Array.from(w.cells.h.slice(0, 200))]);

describe('layerDetail', () => {
	it('defaults to 1 and leaves generation unchanged', () => {
		const a = generateUniverse(base, 1).planets[0];
		const b = generateUniverse({ ...base, layerDetail: { deep: 1, sky: 1, sea: 1 } }, 1).planets[0];
		expect(a.layers.map((l) => Array.from(l.open))).toEqual(b.layers.map((l) => Array.from(l.open)));
	});
	it('is deterministic and changes exotic layers only', () => {
		const o = { ...base, layerDetail: { deep: 2, sky: 0.5, sea: 1 } };
		const a = generateUniverse(o, 1).planets[0];
		const b = generateUniverse(o, 1).planets[0];
		const ref = generateUniverse(base, 1).planets[0];
		expect(a.layers.map((l) => Array.from(l.open))).toEqual(b.layers.map((l) => Array.from(l.open)));
		expect(Array.from(a.cells.h)).toEqual(Array.from(ref.cells.h));
		expect(Array.from(a.layers[1].open)).not.toEqual(Array.from(ref.layers[1].open));
	});
	it('higher deep detail yields more cavern settlements than lower', () => {
		const hi = generateUniverse({ ...base, layerDetail: { deep: 2, sky: 1, sea: 1 } }, 1).planets[0];
		const lo = generateUniverse({ ...base, layerDetail: { deep: 0.5, sky: 1, sea: 1 } }, 1).planets[0];
		expect(burgsOn(hi, 'deep')).toBeGreaterThan(burgsOn(lo, 'deep'));
	});
});

describe('planetOverrides', () => {
	it('does nothing when absent or empty', () => {
		const a = generateUniverse(base, 2);
		const b = generateUniverse({ ...base, planetOverrides: [{}, {}] }, 2);
		expect(a.planets.map(sig)).toEqual(b.planets.map(sig));
	});
	it('applies kind, template, genre and realms to the targeted planet only', () => {
		const plain = generateUniverse(base, 3);
		const u = generateUniverse({ ...base, planetOverrides: [{}, { planet: 'ice', template: 'archipelago', genre: 'steampunk', states: 7 }] }, 3);
		expect(u.planets[1].opts.planet).toBe('ice');
		expect(u.planets[1].opts.template).toBe('archipelago');
		expect(u.planets[1].opts.genre).toBe('steampunk');
		expect(u.planets[1].opts.states).toBe(7);
		expect(u.planets[1].opts.climate.tEq).toBe(4);
		expect(sig(u.planets[0])).toBe(sig(plain.planets[0]));
		expect(sig(u.planets[2])).toBe(sig(plain.planets[2]));
		expect(u.planets[1].opts.planetOverrides).toBeUndefined();
	});
	it('merges layer detail and is deterministic', () => {
		const o = { ...base, planetOverrides: [{}, { layerDetail: { deep: 2, sky: 2, sea: 2 }, cells: 2000 }] };
		const a = generateUniverse(o, 2);
		const b = generateUniverse(o, 2);
		expect(a.planets.map(sig)).toEqual(b.planets.map(sig));
		expect(a.planets[1].cells.n).toBeLessThan(2500);
		expect(a.planets[1].opts.density).toEqual({ deep: 1, sky: 1, sea: 1 });
	});
});
