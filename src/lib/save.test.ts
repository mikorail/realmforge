// @ts-ignore
import { serialize } from 'node:v8';
import { describe, expect, it } from 'vitest';
import { generateUniverse } from './gen/universe';
import { baseMatches, cosmosFromData, decodeBase, decodeExport, decodeSave, encodeBase, encodeExport, encodeSave, groupSaves, newBaseKey, nextAutoSlot, nextSlotId, pack, parseSlot, snapshotData, unpack, unusedBaseKeys } from './save';
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

describe('slots, export and import', () => {
	it('parses slot ids, including legacy bare seeds', () => {
		expect(parseSlot('abc')).toEqual({ seed: 'abc', kind: 'legacy', n: 0 });
		expect(parseSlot('abc#3')).toEqual({ seed: 'abc', kind: 'manual', n: 3 });
		expect(parseSlot('abc#auto2')).toEqual({ seed: 'abc', kind: 'auto', n: 2 });
		expect(parseSlot('a#b#quick')).toEqual({ seed: 'a#b', kind: 'quick', n: 0 });
		expect(nextSlotId('abc', ['abc', 'abc#1', 'abc#4', 'abc#auto1', 'zzz#9'])).toBe('abc#5');
		expect(nextSlotId('abc', ['abc'])).toBe('abc#1');
	});

	it('rotates the autosave ring, overwriting the oldest', () => {
		expect(nextAutoSlot('s', [])).toBe('s#auto1');
		expect(nextAutoSlot('s', [{ slot: 's#auto1', saved: 1 }, { slot: 's#auto3', saved: 2 }])).toBe('s#auto2');
		const full = [{ slot: 's#auto1', saved: 30 }, { slot: 's#auto2', saved: 10 }, { slot: 's#auto3', saved: 20 }];
		expect(nextAutoSlot('s', full)).toBe('s#auto2');
	});

	it('groups saves by world, newest first, tolerating records without a label', () => {
		const m = (slot: string, saved: number, label?: string) => ({ slot, name: 'W', year: 1, genre: 'fantasy', planets: 1, saved, ...(label ? { label } : {}) });
		const g = groupSaves([m('a', 5), m('b#1', 9, 'x'), m('a#2', 7), m('b#auto1', 3, 'Autosave')]);
		expect(g.map((x) => x.seed)).toEqual(['b', 'a']);
		expect(g[1].saves.map((x) => x.slot)).toEqual(['a#2', 'a']);
	});

	it('shares the seed base across slots; deleting one slot keeps the base while another uses it', () => {
		const refs = [{ slot: 's#1', baseKey: 's', baseId: 'id1' }, { slot: 's#2', baseKey: 's', baseId: 'id1' }];
		expect(newBaseKey(refs, 's', 's#1', 'id2')).toBe('s@id2'); // s#2 still needs the old base
		expect(newBaseKey([refs[0]], 's', 's#1', 'id2')).toBe('s'); // only its own slot: may rewrite in place
		expect(newBaseKey([], 's', 's#2', 'id2')).toBe('s');
		// pruning after a delete keeps every base some remaining slot references, drops the rest
		expect(unusedBaseKeys(['s', 'other'], refs.filter((r) => r.slot !== 's#1'))).toEqual(['other']);
		expect(unusedBaseKeys(['s', 'other'], [])).toEqual(['s', 'other']);
	});

	it('two slots of one world round-trip against one shared base', () => {
		const cos = new Cosmos(generateUniverse({ seed: 'slots-test', cells: 2500, states: 8 }, 1));
		const base = decodeBase(encodeBase(cos.u));
		for (let m = 0; m < 12 * 15; m++) cos.tick();
		const a = encodeSave(snapshotData(cos), base);
		const yearA = cos.year;
		const stateA = Array.from(cos.sims[0].w.cells.state);
		for (let m = 0; m < 12 * 15; m++) cos.tick();
		const b = encodeSave(snapshotData(cos), base);
		const backA = cosmosFromData(decodeSave(a, base)), backB = cosmosFromData(decodeSave(b, base));
		expect(backA.year).toBe(yearA);
		expect(Array.from(backA.sims[0].w.cells.state)).toEqual(stateA);
		expect(backB.year).toBe(cos.year);
		expect(backB.year).toBeGreaterThan(backA.year);
		expect(b.length).toBeLessThan(encodeSave(snapshotData(cos), null).length); // the extra slot costs only a delta
	}, 60_000);

	it('exports and imports a slot byte-for-byte and rejects garbage', () => {
		const cos = new Cosmos(generateUniverse({ seed: 'export-test', cells: 2000, states: 6 }, 1));
		const baseBytes = encodeBase(cos.u);
		const base = decodeBase(baseBytes);
		for (let m = 0; m < 12 * 10; m++) cos.tick();
		const blob = encodeSave(snapshotData(cos), base);
		const meta = { slot: 'export-test#1', name: 'N', year: cos.year, genre: 'fantasy', planets: 1, saved: 123, label: 'Mine' };
		const file = encodeExport({ seed: 'export-test', meta, baseId: 'b1', base: baseBytes, blob });
		const back = decodeExport(file);
		expect(back.meta).toEqual(meta);
		expect(back.baseId).toBe('b1');
		expect(back.seed).toBe('export-test');
		expect(Array.from(back.blob)).toEqual(Array.from(blob));
		expect(cosmosFromData(decodeSave(back.blob, decodeBase(back.base))).year).toBe(cos.year);

		expect(() => decodeExport(new Uint8Array([1, 2, 3]))).toThrow(/Not a valid Realmforge save/);
		expect(() => decodeExport(new TextEncoder().encode('{"hello":"world"} padding padding'))).toThrow(/missing .rfsave header/);
		expect(() => decodeExport(file.slice(0, file.length - 10))).toThrow(/truncated/);
		const corrupt = file.slice();
		corrupt.fill(7, corrupt.length - 200);
		expect(() => decodeExport(corrupt)).toThrow(/corrupt/);
	}, 60_000);
});
