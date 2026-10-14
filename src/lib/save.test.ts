// @ts-ignore
import { serialize } from 'node:v8';
import { describe, expect, it } from 'vitest';
import { generateUniverse } from './gen/universe';
import { baseMatches, cosmosFromData, decodeBase, decodeSave, encodeBase, encodeSave, pack, snapshotData, unpack } from './save';
import { Cosmos } from './sim/cosmos';

describe('binary pack', () => {
	it('round-trips typed arrays, shared/cyclic refs, Map/Set and odd numbers', () => {
		const shared = new Uint16Array([1, 2, 3]);
		const o: Record<string, unknown> = { a: shared, b: shared, f: new Float32Array([0.5, NaN]), m: new Map([[1, 'x']]), s: new Set(['y']), n: [NaN, Infinity, -Infinity, undefined, null], $weird: 1 };
		o.self = o;
		const back = unpack(pack(o)) as typeof o;
		expect(back.a).toEqual(shared);
		expect(back.a).toBe(back.b);
		expect(back.self).toBe(back);
		expect(Number.isNaN((back.f as Float32Array)[1])).toBe(true);
		expect(back.m).toEqual(o.m);
		expect(back.s).toEqual(o.s);
		expect(back.n).toEqual(o.n);
		expect(back.$weird).toBe(1);
	});
});

describe('delta + compressed saves', () => {
	it('restores a Cosmos exactly after ticks, storing the static world once', () => {
		const cos = new Cosmos(generateUniverse({ seed: 'save-test', cells: 3000, states: 10 }, 2));
		for (let m = 0; m < 12 * 30; m++) cos.tick();
		const baseBytes = encodeBase(cos.u);
		const base = decodeBase(baseBytes);
		expect(baseMatches(base, cos.u)).toBe(true);
		for (let m = 0; m < 12 * 20; m++) cos.tick(); // world keeps changing after the base was written
		const data = snapshotData(cos);
		const bytes = encodeSave(data, base);
		const back = decodeSave(bytes, base);
		// the decoded graph equals the live one, including mutated cell arrays
		expect(back).toEqual(data);
		expect(back.u.planets[0].layers[0].state).toBe(back.u.planets[0].cells.state);
		// decoded arrays never alias the cached base
		expect(back.u.planets[0].cells.x).not.toBe(base.planets[0].cells.x);
		const cos2 = cosmosFromData(back);
		expect(cos2.year).toBe(cos.year);
		for (let p = 0; p < cos.sims.length; p++) {
			const a = cos.sims[p], b = cos2.sims[p];
			expect(b.month).toBe(a.month);
			expect(b.rng.state()).toBe(a.rng.state());
			expect(b.allEvents).toEqual(a.allEvents);
			expect(b.historySnapshots).toEqual(a.historySnapshots);
			expect(b.polities.map((x) => [x.name, x.alive, x.cells])).toEqual(a.polities.map((x) => [x.name, x.alive, x.cells]));
			expect(Array.from(b.w.cells.state)).toEqual(Array.from(a.w.cells.state));
			expect(Array.from(b.w.cells.pop)).toEqual(Array.from(a.w.cells.pop));
			for (let l = 0; l < a.w.layers.length; l++) expect(b.w.layers[l].open).toEqual(a.w.layers[l].open);
		}
		// a restored game keeps simulating
		for (let m = 0; m < 24; m++) cos2.tick();
		expect(cos2.year).toBe(cos.year + 2);
	});

	it('reports save size for a 10k-cell world after 200 years', () => {
		const cos = new Cosmos(generateUniverse({ seed: 'size-probe', cells: 10000 }, 1));
		const base = decodeBase(encodeBase(cos.u));
		const baseSize = encodeBase(cos.u).length;
		const t0 = performance.now();
		for (let m = 0; m < 12 * 200; m++) cos.tick();
		const simMs = performance.now() - t0;
		const data = snapshotData(cos);
		const v1 = serialize(data).length; // ≈ what IndexedDB stored per save before
		const t1 = performance.now();
		const delta = encodeSave(data, base);
		const encMs = performance.now() - t1;
		const full = encodeSave(data, null).length;
		const events = cos.sims[0].allEvents.length, snaps = cos.sims[0].historySnapshots.length;
		console.log(
			`[save size] 10k cells, 200 years (${events} events, ${snaps} snapshots, sim ${(simMs / 1000).toFixed(1)}s): ` +
				`v1 structured ${(v1 / 1024).toFixed(0)} KB · v2 base ${(baseSize / 1024).toFixed(0)} KB once + delta ${(delta.length / 1024).toFixed(0)} KB per save ` +
				`(encode ${encMs.toFixed(0)} ms) · v2 without base ${(full / 1024).toFixed(0)} KB`
		);
		expect(decodeSave(delta, base)).toEqual(data);
		expect(delta.length).toBeLessThan(v1 / 4);
	}, 120_000);
});
