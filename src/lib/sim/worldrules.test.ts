import { describe, expect, it } from 'vitest';
import { generateUniverse } from '../gen/universe';
import { Cosmos } from './cosmos';
import type { PlanetKind } from '../gen/types';
import { yearlyCrossLayer } from './worldrules/crosslayer';
import { campaignHalted, eruption, navalMult, wetShare } from './worldrules/planets';

const mk = (planet: PlanetKind, seed = 'wr') =>
	new Cosmos(generateUniverse({ seed, cells: 3500, states: 10, genre: 'fantasy', planet, depth: 1, sky: true, sea: true }, 1));
const years = (cos: Cosmos, n: number) => { for (let m = 0; m < n * 12; m++) cos.tick(); return cos.sims[0]; };

describe('cross-layer politics', () => {
	it('moves treasure and logs events across shafts between hostile realms', () => {
		const sim = years(mk('terran'), 3);
		const shafts = sim.w.routes.filter((r) => r.kind === 'shaft');
		expect(shafts.length).toBeGreaterThan(0);
		const kinds = new Set<string>();
		for (const rt of shafts) {
			const lo = sim.w.burgs[rt.a], up = sim.w.burgs[rt.b];
			if (!lo.alive || !up.alive || !lo.state || !up.state || lo.state === up.state) continue;
			kinds.add(sim.w.layers[sim.burgLayer(lo)].kind);
			sim.polities[lo.state].relations[up.state] = -60;
			sim.polities[up.state].relations[lo.state] = -60;
			sim.polities[lo.state].stability = 30;
		}
		expect(kinds.size).toBeGreaterThan(0);
		const before = sim.allEvents.length;
		const rel0 = [...kinds].length;
		for (let i = 0; i < 40; i++) yearlyCrossLayer(sim);
		const text = sim.allEvents.slice(before).map((e) => e.text).join(' ');
		expect(text).toMatch(/TAX REVOLT|SKY BLOCKADE|SEA EMBARGO|toll/);
		expect(rel0).toBeGreaterThan(0);
	});
	it('is deterministic', () => {
		const a = years(mk('terran', 'det'), 15), b = years(mk('terran', 'det'), 15);
		expect(a.allEvents.map((e) => e.text)).toEqual(b.allEvents.map((e) => e.text));
	});
});

describe('planet rules', () => {
	it('ocean worlds give a naval bonus only to port realms', () => {
		const sim = years(mk('ocean'), 3);
		const m = sim.polities.filter((p) => p.alive && p.id).map((p) => navalMult(sim, p.id));
		expect(Math.max(...m)).toBeGreaterThan(1);
		expect(Math.max(...m)).toBeLessThanOrEqual(1.15);
		const t = years(mk('terran'), 3);
		expect(navalMult(t, 1)).toBe(1);
	});
	it('ice worlds halt campaigns in the coldest months only', () => {
		const sim = mk('ice').sims[0];
		const flags: boolean[] = [];
		for (let m = 0; m < 12; m++) { sim.month = m; flags.push(campaignHalted(sim)); }
		expect(flags.filter(Boolean).length).toBe(3);
		const t = mk('terran').sims[0];
		t.month = 0;
		expect(campaignHalted(t)).toBe(false);
	});
	it('volcanic eruptions scar land and are logged', () => {
		const sim = mk('volcanic').sims[0];
		const before = sim.allEvents.length;
		const pop = sim.c.pop.reduce((s, x) => s + x, 0);
		for (let i = 0; i < 5; i++) eruption(sim, true);
		const ev = sim.allEvents.slice(before).filter((e) => e.kind === 'disaster' && /ERUPTION/.test(e.text));
		expect(ev.length).toBeGreaterThan(0);
		expect(sim.c.pop.reduce((s, x) => s + x, 0)).toBeLessThan(pop);
		expect(sim.dirty.terrain).toBe(true);
	});
	it('desert worlds value water-rich cells; exotic worlds see odd phenomena', () => {
		const d = years(mk('desert'), 5);
		const share = wetShare(d);
		expect(share.some((x) => x > 0)).toBe(true);
		const x = years(mk('exotic'), 60);
		expect(x.allEvents.some((e) => /CRYSTAL CHORUS|SPORE-RAIN|GLASS DAWN|GRAVITY TIDE|WHISPERING LIGHTS/.test(e.text))).toBe(true);
		const v = years(mk('volcanic'), 120);
		expect(v.allEvents.some((e) => /ERUPTION/.test(e.text))).toBe(true);
	});
});
