import { describe, expect, it } from 'vitest';
import { generateUniverse } from '../gen/universe';
import { Cosmos } from './cosmos';
import { generateWorldGazetteer } from '../export';
import { cultureMod, cultureProfile, monthName, realmFeasts, TRAITS } from './culture';
import { cultureCard } from './culture/card';
import { MONTH_FAMILIES, SPHERE_CULTURE } from './culture/data';
import { assimilate, noteConquest } from './culture';

const make = (seed = 'culture-test') => new Cosmos(generateUniverse({ seed, cells: 3000, states: 12, genre: 'fantasy' }, 1));
const run = (cos: Cosmos, years: number) => {
	for (let m = 0; m < years * 12; m++) cos.tick();
	return cos.sims[0];
};

describe('culture traits', () => {
	it('every culture gets 2-3 traits and modest multipliers', () => {
		const s = make().sims[0];
		for (const cu of s.w.cultures) {
			if (!cu.id) continue;
			const p = cultureProfile(s.w, cu.id);
			expect(p.traits.length).toBeGreaterThanOrEqual(2);
			expect(p.traits.length).toBeLessThanOrEqual(3);
			for (const k in p.mods) {
				expect(p.mods[k as keyof typeof p.mods]).toBeGreaterThanOrEqual(0.7);
				expect(p.mods[k as keyof typeof p.mods]).toBeLessThanOrEqual(1.3);
			}
		}
	});
	it('traits follow sphere and culture type, and are stable across calls', () => {
		const s = make().sims[0];
		const w = s.w;
		const steppe = w.cultures.find((c) => c.sphere === 'steppe');
		if (steppe) expect(cultureProfile(w, steppe.id).traits).toContain('nomadic');
		const naval = w.cultures.find((c) => c.type === 'Naval');
		if (naval) expect(cultureProfile(w, naval.id).traits).toContain('seafaring');
		expect(cultureProfile(w, 1).traits).toEqual(cultureProfile(w, 1).traits);
	});
	it('cultureMod reads the realm culture and defaults to 1', () => {
		const s = make().sims[0];
		expect(cultureMod(s, undefined, 'trade')).toBe(1);
		const pol = s.polities.find((p) => p.alive && p.id)!;
		const m = cultureMod(s, pol, 'aggression');
		expect(m).toBe(cultureProfile(s.w, pol.culture).mods.aggression);
		const martial = Object.entries(TRAITS).find(([, t]) => t.mods.peace && t.mods.peace < 1)![0];
		expect(martial).toBe('martial');
	});
});

describe('calendar and feasts', () => {
	it('every sphere has three feasts and a valid month family; realms get 2-3 fixed feasts', () => {
		for (const sp of Object.values(SPHERE_CULTURE)) {
			expect(sp.feasts).toHaveLength(3);
			expect(MONTH_FAMILIES[sp.months]).toHaveLength(12);
		}
		const s = make().sims[0];
		const pol = s.polities.find((p) => p.alive && p.id)!;
		const a = realmFeasts(s.w, pol);
		expect(a.length).toBeGreaterThanOrEqual(2);
		expect(a.length).toBeLessThanOrEqual(3);
		expect(realmFeasts(s.w, pol)).toEqual(a);
		for (const f of a) expect(monthName(s.w, pol.culture, f.month)).toBeTruthy();
	});
	it('feast days fire culture events for the player realm and nudge stability', () => {
		const cos = make();
		const s = cos.sims[0];
		const pol = s.polities.find((p) => p.alive && p.id)!;
		const ruler = s.people[pol.ruler];
		s.avatar = ruler.id;
		const feast = realmFeasts(s.w, pol)[0];
		s.month = (feast.month + 11) % 12;
		s.year = 50;
		const before = s.events.length;
		s.tick();
		expect(s.month).toBe(feast.month);
		const fresh = s.events.slice(before).filter((e) => e.kind === 'culture' && e.text.startsWith(feast.name));
		expect(fresh.length).toBe(1);
	});
});

describe('language spread', () => {
	it('conquered cells shift to the conqueror culture after decades', () => {
		const cos = make();
		const s = cos.sims[0];
		const w = s.w;
		const pol = s.polities.find((p) => p.alive && p.id)!;
		const foreign = w.cultures.find((c) => c.id && c.id !== pol.culture)!;
		const cell = w.cells.state.findIndex((st, i) => st === pol.id && w.cells.h[i] >= 20);
		w.cells.culture[cell] = foreign.id;
		s.year = 100;
		noteConquest(s, cell, pol.id);
		expect(s.cx.conquered[cell]).toBe(100);
		// young conquests do not shift; old ones do (the yearly pass, run directly)
		for (let y = 0; y < 30; y++) { s.year++; assimilate(s); }
		expect(w.cells.culture[cell]).toBe(foreign.id);
		for (let y = 0; y < 600 && w.cells.culture[cell] !== pol.culture; y++) { s.year++; assimilate(s); }
		expect(w.cells.culture[cell]).toBe(pol.culture);
		expect(s.cx.conquered[cell]).toBeUndefined();
	});
	it('a lingua franca is chosen on cross-culture routes in a long run', () => {
		const s = run(make(), 60);
		expect(s.cx.lingua.length).toBeGreaterThan(0);
		for (const l of s.cx.lingua) expect(s.w.burgs[l.a].culture).not.toBe(s.w.burgs[l.b].culture);
		expect(s.allEvents.some((e) => e.kind === 'culture' && /lingua franca/.test(e.text))).toBe(true);
	});
});

describe('movements and orders', () => {
	it('art movements and orders are founded, spread and sometimes suppressed over a long run', () => {
		const s = run(make('movements'), 200);
		expect(s.cx.movements.length).toBeGreaterThan(0);
		expect(s.cx.orders.length).toBeGreaterThan(0);
		const text = s.allEvents.map((e) => e.text).join('\n');
		expect(text).toMatch(/takes shape in/);
		expect(text).toMatch(/is founded in/);
		for (const m of [...s.cx.movements, ...s.cx.orders]) {
			expect(['rising', 'flourishing', 'suppressed', 'faded']).toContain(m.status);
			if (m.status === 'rising' || m.status === 'flourishing') expect(m.realms.length).toBeGreaterThan(0);
		}
	});
});

describe('culture determinism and export', () => {
	it('same seed gives identical culture state', () => {
		const a = run(make('det'), 80);
		const b = run(make('det'), 80);
		expect(JSON.stringify(a.cx)).toBe(JSON.stringify(b.cx));
		expect(a.allEvents.length).toBe(b.allEvents.length);
	});
	it('survives a dump/restore round trip', async () => {
		const a = run(make('save'), 60);
		const d = JSON.parse(JSON.stringify(a.dump()));
		expect(d.cx.movements.length).toBe(a.cx.movements.length);
		expect(d.cx.nextId).toBe(a.cx.nextId);
	});
	it('culture cards and the dossier carry food, holidays and movements', () => {
		const s = run(make('card'), 80);
		const card = cultureCard(s, s.polities.find((p) => p.alive && p.id)!.culture)!;
		expect(card.food.length).toBeGreaterThan(5);
		expect(card.holidays).toHaveLength(3);
		expect(card.traits.length).toBeGreaterThanOrEqual(2);
		const md = generateWorldGazetteer(s.w, s);
		expect(md).toContain('## Culture Cards');
		expect(md).toContain('**Holidays**');
		expect(md).toContain('**Feast days**');
		expect(md).toContain('## Art Movements and Religious Orders');
	});
});
