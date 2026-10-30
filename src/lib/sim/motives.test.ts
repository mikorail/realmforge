import { describe, expect, it } from 'vitest';
import { generateUniverse } from '../gen/universe';
import { Cosmos } from './cosmos';
import { Simulation } from './engine';
import { biography } from './story/people';
import { grudgeTarget, motiveInfo, motiveMod, MOTIVES, rollOnCrown, warBias } from './motives';
import type { GenOptions } from '../gen/types';

const make = (seed: string, extra: Partial<GenOptions> = {}) => new Cosmos(generateUniverse({ seed, cells: 3000, states: 12, genre: 'fantasy', ...extra }, 1));
const run = (cos: Cosmos, years: number) => {
	for (let m = 0; m < years * 12; m++) cos.tick();
	return cos.sims[0];
};
const hashEvents = (s: Simulation) => {
	let h = 0;
	for (const e of s.allEvents) for (let i = 0; i < e.text.length; i++) h = (h * 31 + e.text.charCodeAt(i)) | 0;
	return h;
};

describe('ruler motives', () => {
	it('gives every living ruler a motive and is deterministic', () => {
		const a = run(make('mv-det'), 80);
		const b = run(make('mv-det'), 80);
		expect(JSON.stringify(a.mv)).toBe(JSON.stringify(b.mv));
		expect(hashEvents(a)).toBe(hashEvents(b));
		const rulers = a.polities.filter((p) => p.alive && p.id).map((p) => a.ruler(p)).filter((r) => r?.alive);
		expect(rulers.length).toBeGreaterThan(3);
		const withMotive = rulers.filter((r) => r.motive);
		expect(withMotive.length / rulers.length).toBeGreaterThan(0.85);
		for (const r of withMotive) expect(MOTIVES).toContain(r.motive);
		expect(a.allEvents.some((e) => e.tag === 'motive')).toBe(true);
	});

	it('vengeance picks the realm that wronged the house most', () => {
		const s = make('mv-wrong').sims[0];
		const [a, b, c] = s.polities.filter((p) => p.alive && p.id);
		const house = 'Testhouse';
		const g = (s.mv.grudges[house] = [] as { kind: 'war' | 'sack' | 'kin'; by: number; y: number; what: string }[]);
		g.push({ kind: 'war', by: b.id, y: s.year, what: 'Old War' });
		g.push({ kind: 'sack', by: c.id, y: s.year, what: 'Highgate' });
		g.push({ kind: 'sack', by: c.id, y: s.year, what: 'Lowgate' });
		const t = grudgeTarget(s, house, a.id)!;
		expect(t.id).toBe(c.id);
		expect(t.why).toContain('sack');
		// rulers of that house who roll vengeance always aim at c
		let seen = 0;
		for (let i = 0; i < 60; i++) {
			const p = s.makePerson(a.culture, a.id, a.capital, 'heir', 30);
			p.house = house;
			p.traits = [];
			rollOnCrown(s, a, p, undefined);
			if (p.motive === 'vengeance') {
				seen++;
				expect(p.motiveTarget).toBe(c.id);
			}
		}
		expect(seen).toBeGreaterThan(5);
		// war bias leans on the vengeance target only
		const r = s.ruler(a);
		r.motive = 'vengeance';
		r.motiveEnd = undefined;
		r.motiveTarget = c.id;
		expect(warBias(s, a, c.id).relBias).toBeLessThan(0);
		expect(warBias(s, a, b.id).relBias).toBe(0);
		expect(motiveMod(s, a, 'aggression')).toBeGreaterThan(1);
	});

	it('an heir inherits, flips or re-rolls the motive of the ruler before', () => {
		const s = make('mv-heir').sims[0];
		const pol = s.polities.find((p) => p.alive && p.id)!;
		const kinds = new Set<string>();
		for (let i = 0; i < 80; i++) {
			const prev = s.makePerson(pol.culture, pol.id, pol.capital, 'ruler', 40);
			prev.motive = 'glory';
			const h = s.makePerson(pol.culture, pol.id, pol.capital, 'heir', 20);
			s.year += 1; // new side-rng stream each time
			rollOnCrown(s, pol, h, prev.id);
			kinds.add(h.motive!);
		}
		expect(kinds.has('glory')).toBe(true);
		expect(kinds.has('survival')).toBe(true); // the opposite
		expect(kinds.size).toBeGreaterThan(2);
	});

	it('motives off leaves the world exactly as before motives existed', () => {
		const s = run(make('off-base', { motives: false }), 100);
		expect(s.people.every((p) => p.motive === undefined)).toBe(true);
		expect(Object.keys(s.mv.grudges)).toHaveLength(0);
		expect(s.allEvents.some((e) => e.tag === 'motive')).toBe(false);
		// recorded on the commit before this feature: same seed, 3000 cells, 12 states, 100 years
		expect(s.allEvents.length).toBe(2907);
		expect(s.polities.filter((p) => p.alive && p.id).length).toBe(38);
		expect(s.wars.length).toBe(64);
		expect(s.people.length).toBe(581);
		expect(hashEvents(s)).toBe(314333586);
	});

	it('survives a dump/restore round trip and old saves without motive fields', () => {
		const a = run(make('mv-save'), 60);
		const d = JSON.parse(JSON.stringify(a.dump()));
		const b = Simulation.restore(a.w, d);
		expect(JSON.stringify(b.mv)).toBe(JSON.stringify(a.mv));
		for (const p of a.polities) if (p.alive && p.id) expect(b.people[p.ruler].motive).toBe(a.people[p.ruler].motive);
		// an old save has neither mv nor motive fields
		delete d.mv;
		for (const p of d.people) { delete p.motive; delete p.motiveSince; delete p.motiveTarget; delete p.motiveWhy; delete p.motiveEnd; }
		const c = Simulation.restore(a.w, d);
		expect(c.mv.grudges).toEqual({});
		expect(motiveInfo(c, c.people[c.polities.find((p) => p.alive && p.id)!.ruler])).toBeNull();
	});

	it('biographies mention the motive', () => {
		const s = run(make('mv-bio'), 60);
		const r = s.ruler(s.polities.find((p) => p.alive && p.id)!);
		expect(biography(s, r.id)!.summary).toContain('driven by');
	});
});
