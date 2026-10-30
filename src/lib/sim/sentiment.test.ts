import { describe, expect, it } from 'vitest';
import { generateUniverse } from '../gen/universe';
import { NEUTRAL_FX, racialFx, SPECIES } from '../gen/species';
import { Cosmos } from './cosmos';
import { Simulation } from './engine';
import { feeling, onConquest, shift, yearlyPeoples } from './sentiment';
import type { GenInput } from '../gen/types';

const make = (extra: Partial<GenInput> = {}, seed = 'sx-base') => new Cosmos(generateUniverse({ seed, cells: 3000, states: 12, genre: 'fantasy', ...extra }, 1));
const run = (cos: Cosmos, years: number) => {
	for (let m = 0; m < years * 12; m++) cos.tick();
	return cos.sims[0];
};
const fp = (s: Simulation) => ({ rng: s.rng.state(), ev: s.allEvents.length, wars: s.wars.length, tre: Math.round(s.polities.reduce((a, p) => a + p.treasury, 0) * 1000) });

describe('sentiment between peoples', () => {
	it('is deterministic', () => {
		const a = run(make(), 40), b = run(make(), 40);
		expect(fp(a)).toEqual(fp(b));
		expect(a.sx).toEqual(b.sx);
	});

	it('conquest lowers the conquered people toward the conqueror', () => {
		const s = make().sims[0];
		const pols = s.polities.filter((p) => p.alive && p.id);
		const taker = pols[0];
		const cell = [...Array(s.c.n).keys()].find((i) => s.isLand(i) && s.c.state[i] && s.c.culture[i] !== taker.culture && s.polities[s.c.state[i]].id !== taker.id);
		expect(cell).toBeDefined();
		const cu = s.c.culture[cell!];
		expect(feeling(s, 'c', cu, taker.culture)).toBe(0);
		onConquest(s, cell!, taker.id);
		expect(feeling(s, 'c', cu, taker.culture)).toBeLessThan(0);
		// the conqueror's own feeling does not move
		expect(feeling(s, 'c', taker.culture, cu)).toBe(0);
	});

	it('old memories make a new grievance bite harder', () => {
		const s = make().sims[0];
		shift(s, 'c', 1, 2, -50);
		const fresh = feeling(s, 'c', 3, 4);
		shift(s, 'c', 3, 4, -10);
		const base = feeling(s, 'c', 3, 4) - fresh;
		s.sx.v['c:1>2'] = 0; // healed, but remembered
		const before = feeling(s, 'c', 1, 2);
		shift(s, 'c', 1, 2, -10);
		expect(feeling(s, 'c', 1, 2) - before).toBeLessThan(base);
	});

	it('decays toward neutral', () => {
		const s = make().sims[0];
		shift(s, 'c', 1, 2, -40);
		const start = feeling(s, 'c', 1, 2);
		for (let y = 0; y < 20; y++) { s.year++; yearlyPeoples(s); }
		const end = feeling(s, 'c', 1, 2);
		expect(end).toBeGreaterThan(start);
		expect(end).toBeLessThan(0);
	});

	it('names a feud after 30 years below -60', () => {
		const s = make().sims[0];
		s.sx.v['s:orc>elf'] = -90;
		s.sx.v['s:elf>orc'] = -90;
		for (let y = 0; y < 31; y++) { s.sx.v['s:orc>elf'] = -90; s.sx.v['s:elf>orc'] = -90; s.year++; yearlyPeoples(s); }
		expect(s.sx.feuds.some((f) => f.name.includes('Orc') && f.name.includes('Elf'))).toBe(true);
		expect(s.allEvents.some((e) => e.text.includes('feud'))).toBe(true);
	});

	it('both toggles off leave the simulation untouched (baseline fingerprint)', () => {
		const s = run(make({ sentiment: false, racialStrength: 0 }), 80);
		expect(fp(s)).toEqual({ rng: 4137145477, ev: 2193, wars: 45, tre: 12445744 });
		expect(Object.keys(s.sx.v)).toHaveLength(0);
		expect(Object.keys(s.sx.rx)).toHaveLength(0);
	});

	it('saves and restores, and old saves load neutral', () => {
		const cos = make();
		const s = run(cos, 30);
		expect(Object.keys(s.sx.v).length).toBeGreaterThan(0);
		const d = JSON.parse(JSON.stringify(s.dump()));
		const r = Simulation.restore(s.w, d);
		expect(r.sx).toEqual(s.sx);
		delete d.sx;
		const old = Simulation.restore(s.w, d);
		expect(old.sx.v).toEqual({});
		expect(old.sx.feuds).toEqual([]);
	});
});

describe('racial advantage', () => {
	it('racialStrength 0 gives neutral realm effects', () => {
		const s = run(make({ racialStrength: 0, sentiment: false }), 10);
		expect(s.sx.rx).toEqual({});
		const t = run(make({ racialStrength: 0 }), 10);
		for (const fx of Object.values(t.sx.rx)) {
			expect(fx.a).toBe(1);
			expect(fx.g).toBe(1);
		}
	});

	it('species carry real trade-offs and custom races stay in range', () => {
		expect(racialFx('dwarf').econ).toBeGreaterThan(racialFx('orc').econ);
		expect(racialFx('orc').army).toBeGreaterThan(racialFx('human').army);
		expect(racialFx('orc').unrest).toBeGreaterThan(1);
		expect(racialFx('elf').growth).toBeLessThan(racialFx('human').growth);
		expect(racialFx('no-such-race')).toEqual(NEUTRAL_FX);
		for (const sp of SPECIES) {
			const f = racialFx(sp.id);
			expect(f.econ).toBeGreaterThan(0.8);
			expect(f.army).toBeLessThan(1.3);
			expect(f.growth).toBeGreaterThan(0.6);
		}
	});

	it('a strong setting widens the spread between realms', () => {
		const spread = (k: number) => {
			const s = run(make({ racialStrength: k }), 5);
			const a = Object.values(s.sx.rx).map((x) => x.a);
			return Math.max(...a) - Math.min(...a);
		};
		expect(spread(2)).toBeGreaterThanOrEqual(spread(1));
		expect(spread(0)).toBe(0);
	});
});
