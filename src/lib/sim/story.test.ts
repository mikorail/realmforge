import { describe, expect, it } from 'vitest';
import { generateUniverse } from '../gen/universe';
import { Cosmos } from './cosmos';
import { Simulation } from './engine';
import { synthesizeAnnualAnnals } from './chronicle';
import { annalsAppendix, biography, eraTitle, findCause, indexEvents, causePhrase, eventTextWithCause } from './story/index';

const world = (seed: string, years: number, planets = 1) => {
	const cos = new Cosmos(generateUniverse({ seed, cells: 4000, states: 14 }, planets));
	for (let m = 0; m < years * 12; m++) cos.tick();
	return cos;
};

describe('story layer', () => {
	const cos = world('story', 260, 2);
	const s = cos.sims[0];

	it('is deterministic', () => {
		const again = world('story', 260, 2).sims[0];
		expect(again.allEvents.length).toBe(s.allEvents.length);
		expect(again.allEvents.map((e) => `${e.tag}${e.cause}${e.text}`).join('|')).toBe(s.allEvents.map((e) => `${e.tag}${e.cause}${e.text}`).join('|'));
	});

	it('links causes to earlier events and cites them in the annals', () => {
		const byId = indexEvents(s.allEvents);
		const caused = s.allEvents.filter((e) => e.cause !== undefined);
		expect(caused.length).toBeGreaterThan(0);
		for (const e of caused) {
			const c = byId.get(e.cause!);
			expect(c).toBeTruthy();
			expect(c!.id!).toBeLessThan(e.id!);
		}
		const e = caused[0];
		expect(eventTextWithCause(e, byId)).toContain(`Y${byId.get(e.cause!)!.y}`);
		const annals = synthesizeAnnualAnnals(s.allEvents, s.w.name, 1000);
		expect(annals.some((a) => /\bY\d+\b/.test(a.prose))).toBe(true);
	});

	it('finds chain causes by rule', () => {
		const sim = new Simulation(generateUniverse({ seed: 'chain', cells: 2000, states: 8 }, 1).planets[0]);
		const p = sim.polities.find((x) => x.alive && x.id)!;
		const famine = sim.log('disaster', 'A famine.', undefined, p.id, 'famine');
		const riot = sim.log('uprising', 'Bread riots.', undefined, p.id);
		expect(riot.tag).toBe('riot');
		expect(riot.cause).toBe(famine.id);
		const coup = sim.log('coup', 'A coup.', undefined, p.id);
		expect(coup.cause).toBe(riot.id);
		expect(findCause(sim, 'coup', p.id + 1)).toBeUndefined();
		expect(causePhrase(famine, riot)).toMatch(/famine of Y1/);
	});

	it('names eras every 20 years', () => {
		const withEras = s.polities.filter((p) => p.alive && p.eras?.length);
		expect(withEras.length).toBeGreaterThan(0);
		const p = withEras[0];
		expect(p.era).toBe(p.eras![p.eras!.length - 1].name);
		expect(p.era).toContain(p.name);
		expect(s.allEvents.some((e) => e.tag === 'era')).toBe(true);
		expect(eraTitle('X', { wars: 0, t: { famine: 0, plague: 0, riot: 0, coup: 0, capital: 0, golden: 0 }, growth: 0, stability: 70, reigns: 1 })).toBe('The Long Peace of X');
		expect(eraTitle('X', { wars: 3, t: { famine: 0, plague: 0, riot: 0, coup: 0, capital: 0, golden: 0 }, growth: 0, stability: 70, reigns: 1 })).toBe('The Troubles of X');
	});

	it('writes biographies from events and shows regnal numbers', () => {
		const p = s.polities.find((x) => x.alive && x.id)!;
		const bio = biography(s, p.ruler)!;
		expect(bio.title).toContain(s.people[p.ruler].name);
		expect(bio.summary).toContain('was born');
		expect(biography(s, 0)).toBeNull();
		const dead = s.people.find((x) => !x.alive && x.epithet);
		expect(dead).toBeTruthy();
		const repeated = s.people.find((x) => (x.regnal ?? 0) >= 2);
		if (repeated) expect(biography(s, repeated.id)!.title).toMatch(/ (II|III|IV|V)/);
		const md = annalsAppendix(s);
		expect(md).toContain('## Lives of the Rulers');
		expect(md).toContain('## Eras of the Realms');
	});

	it('keeps given name and hereditary house, and gives rulers regnal rolls', () => {
		for (const p of s.polities) if (p.id && p.reigns) for (const r of p.reigns) expect(s.people[r.id].name).toBe(r.given);
		const kid = s.people.find((x) => x.parent && s.people[x.parent]?.house === x.house);
		expect(kid).toBeTruthy();
		expect(s.people.find((x) => x.plain)?.plain).toContain(s.people.find((x) => x.plain)!.name);
	});

	it('drifts old town names once a century and logs it', () => {
		const renamed = s.w.burgs.filter((b) => b.originalName);
		expect(renamed.length).toBeGreaterThan(0);
		for (const b of renamed) expect(b.name).not.toBe(b.originalName);
		expect(s.allEvents.some((e) => e.tag === 'rename')).toBe(true);
	});

	it('gives major wars one name per side', () => {
		const named = s.wars.filter((w) => w.aliases);
		expect(named.length).toBeGreaterThan(0);
		const [, a, , b] = named[0].aliases!;
		expect(a).not.toBe(b);
		expect(s.allEvents.some((e) => e.tag === 'alias')).toBe(true);
	});

	it('stages rare world moments', () => {
		const moments = cos.sims.flatMap((x) => x.story.moments);
		expect(moments.length).toBeGreaterThan(0);
		expect(cos.sims.flatMap((x) => x.allEvents).some((e) => ['council', 'crusade', 'contact'].includes(e.tag ?? ''))).toBe(true);
	});

	it('survives dump and restore', () => {
		const copy = JSON.parse(JSON.stringify(s.story));
		expect(copy.nextMoment).toBe(s.story.nextMoment);
	});
});
