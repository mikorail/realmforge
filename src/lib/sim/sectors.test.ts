import { describe, expect, it } from 'vitest';
import { generateUniverse } from '../gen/universe';
import { Cosmos } from './cosmos';
import { cosmosFromData, decodeBase, decodeSave, encodeBase, encodeSave, snapshotData } from '../save';
import { burgMix, burgTradeMult, dominantSector, pushSector, realmMix, SECTORS, sectorArmy, sectorGrowth, sectorIncome, sectorNaval, sectorStability, specialities } from './sectors';

const make = (seed = 'sectors-test', sectors?: boolean) => new Cosmos(generateUniverse({ seed, cells: 3000, states: 10, genre: 'fantasy', sectors }, 1));
const run = (cos: Cosmos, years: number) => {
	for (let m = 0; m < years * 12; m++) cos.tick();
	return cos.sims[0];
};
const fingerprint = (cos: Cosmos) => {
	const s = cos.sims[0];
	return JSON.stringify([s.rng.state(), s.allEvents.length, s.polities.map((p) => [p.alive, p.cells, +p.treasury.toFixed(4), +p.army.toFixed(4), +p.stability.toFixed(4)]), s.innovation.toFixed(6)]);
};

describe('sectors', () => {
	it('every town gets a normalised mix and realms aggregate it', () => {
		const s = make().sims[0];
		expect(s.sectors).toBeDefined();
		for (const b of s.w.burgs) {
			if (!b.id) continue;
			const mix = burgMix(s, b.id)!;
			expect(mix).toHaveLength(SECTORS.length);
			expect(mix.reduce((a, x) => a + x, 0)).toBeCloseTo(1, 4);
			expect(Math.min(...mix)).toBeGreaterThan(0);
		}
		const pol = s.polities.find((p) => p.id && p.alive)!;
		expect(realmMix(s, pol.id)!.reduce((a, x) => a + x, 0)).toBeCloseTo(1, 4);
	});

	it('coastal ports lean to seafaring more than inland towns', () => {
		const s = make().sims[0];
		const sea = SECTORS.indexOf('seafaring');
		const surf = s.w.burgs.filter((b) => b.id && b.layer === 'surface');
		const ports = surf.filter((b) => b.port), inland = surf.filter((b) => !b.port && s.w.cells.dist[b.cell] > 2);
		expect(ports.length).toBeGreaterThan(0);
		expect(inland.length).toBeGreaterThan(0);
		const mean = (l: typeof surf) => l.reduce((a, b) => a + burgMix(s, b.id)![sea], 0) / l.length;
		expect(mean(ports)).toBeGreaterThan(mean(inland) * 1.5);
		expect(ports.filter((b) => dominantSector(s, b.id) === sea).length).toBeGreaterThan(ports.length / 4);
	});

	it('is deterministic', () => {
		const a = make(), b = make();
		run(a, 25);
		run(b, 25);
		expect(fingerprint(a)).toBe(fingerprint(b));
		expect(Array.from(a.sims[0].sectors!.w)).toEqual(Array.from(b.sims[0].sectors!.w));
	});

	it('off toggle: no state, neutral hooks, pushSector is a no-op', () => {
		const a = make('sectors-off', false), b = make('sectors-off', false);
		const s = a.sims[0];
		expect(s.sectors).toBeUndefined();
		const id = s.polities.find((p) => p.id && p.alive)!.id;
		expect([sectorGrowth(s, id), sectorIncome(s, id), sectorArmy(s, id), sectorNaval(s, id), sectorStability(s, id)]).toEqual([1, 1, 1, 1, 0]);
		expect(burgTradeMult(s, s.w.burgs[1])).toBe(1);
		expect(burgMix(s, 1)).toBeNull();
		run(a, 10);
		pushSector(a.sims[0], id, 'military', 0.5);
		run(a, 20);
		run(b, 30);
		expect(fingerprint(a)).toBe(fingerprint(b));
		expect(a.sims[0].allEvents.some((e) => e.text.includes('is now known far and wide'))).toBe(false);
	});

	it('pushSector moves a realm toward the pushed sector', () => {
		const a = make(), b = make();
		const sa = a.sims[0], sb = b.sims[0];
		const pol = sa.polities.filter((p) => p.id && p.alive).sort((x, y) => y.pop - x.pop)[0];
		const k = SECTORS.indexOf('scholarship');
		for (let y = 0; y < 15; y++) {
			pushSector(sa, pol.id, 'scholarship', 0.2);
			run(a, 1);
			run(b, 1);
		}
		const cap = sa.w.burgs[pol.capital];
		expect(burgMix(sa, cap.id)![k]).toBeGreaterThan(burgMix(sb, sb.w.burgs[pol.capital].id)![k] + 0.03);
		if (sa.polities[pol.id].alive) expect(realmMix(sa, pol.id)![k]).toBeGreaterThan(realmMix(sb, pol.id)![k]);
	});

	it('effects stay small and specialities are named', () => {
		const s = run(make(), 30);
		for (const p of s.polities) {
			if (!p.id || !p.alive) continue;
			expect(sectorIncome(s, p.id)).toBeGreaterThanOrEqual(0.9);
			expect(sectorIncome(s, p.id)).toBeLessThanOrEqual(1.15);
			expect(sectorArmy(s, p.id)).toBeLessThanOrEqual(1.15);
			for (const sp of specialities(s, p.id)) expect(SECTORS).toContain(sp);
		}
		expect(s.polities.some((p) => p.id && p.alive && specialities(s, p.id).length)).toBe(true);
	});

	it('save round-trip keeps sectors; old saves derive them', () => {
		const cos = make('sectors-save');
		run(cos, 20);
		const base = decodeBase(encodeBase(cos.u));
		const back = decodeSave(encodeSave(snapshotData(cos), base), base);
		const cos2 = cosmosFromData(back);
		const a = cos.sims[0], b = cos2.sims[0];
		expect(Array.from(b.sectors!.w)).toEqual(Array.from(a.sectors!.w));
		expect(Array.from(b.sectors!.mods)).toEqual(Array.from(a.sectors!.mods));
		expect(Array.from(b.sectors!.known)).toEqual(Array.from(a.sectors!.known));
		run(cos2, 3);
		expect(b.sectors!.w.length).toBe(a.sectors!.w.length);
		// a save from before sectors existed
		const old = snapshotData(cos);
		for (const sd of (old as any).sims) delete sd.sectors;
		const cos3 = cosmosFromData(decodeSave(encodeSave(old, base), base));
		expect(cos3.sims[0].sectors).toBeDefined();
		expect(burgMix(cos3.sims[0], 1)!.reduce((x, y) => x + y, 0)).toBeCloseTo(1, 4);
		run(cos3, 2);
	});
});
