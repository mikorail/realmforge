import { describe, expect, it } from 'vitest';
import { generateUniverse } from '../gen/universe';
import { SPHERES, SPHERE_ARCH, archStyleOf } from '../gen/spheres';
import { Cosmos } from './cosmos';
import { cultureCard, cultureCardMarkdown } from './culture/card';
import { SPHERE_QUESTS, applySphereQuest, sphereQuestBonus, sphereQuestText, sphereQuestsFor } from './culture/spherequests';
import { spawnQuest, updateQuests } from './quests';
import type { Quest } from './types';

describe('sphere architecture styles', () => {
	it('every sphere has a tag and a unique glyph shape', () => {
		const shapes = new Set<string>();
		for (const s of SPHERES) {
			const a = SPHERE_ARCH[s.id];
			expect(a, s.id).toBeTruthy();
			expect(a.tag.length).toBeGreaterThan(3);
			expect(a.tag).not.toContain('—');
			shapes.add(a.shape);
		}
		expect(shapes.size).toBe(SPHERES.length);
		expect(archStyleOf('nope')).toBeNull();
	});
	it('culture card and dossier show the style tag', () => {
		const s = new Cosmos(generateUniverse({ seed: 'arch-test', cells: 3000, states: 10, genre: 'fantasy' }, 1)).sims[0];
		const cu = s.w.cultures.find((c) => c.id && c.sphere)!;
		const card = cultureCard(s, cu.id)!;
		expect(card.archStyle).toBe(SPHERE_ARCH[cu.sphere!].tag);
		expect(cultureCardMarkdown(card).join('\n')).toContain(card.archStyle);
	});
});

describe('sphere quests', () => {
	it('has at least two quests per sphere, with clean text', () => {
		for (const s of SPHERES) expect(sphereQuestsFor(s.id).length, s.id).toBeGreaterThanOrEqual(2);
		const ids = new Set<string>();
		for (const d of SPHERE_QUESTS) {
			expect(ids.has(d.id)).toBe(false);
			ids.add(d.id);
			for (const t of [d.title, d.scout, d.confront, d.triumph]) {
				expect(t).not.toContain('—');
				expect(t.length).toBeGreaterThan(15);
			}
			expect(d.title).toContain('{t}');
			expect(d.triumph).toMatch(/\{r\}/);
		}
	});

	function setup(seed: string) {
		const cos = new Cosmos(generateUniverse({ seed, cells: 3000, states: 12, genre: 'fantasy' }, 1));
		const sim = cos.sims[0];
		for (let m = 0; m < 24; m++) cos.tick();
		return sim;
	}

	it('turns spawned quests into sphere quests and plays them through', () => {
		const sim = setup('sphere-quest-seed');
		const heroes = sim.people.filter((p) => p.alive && p.id && p.burg);
		expect(heroes.length).toBeGreaterThan(5);
		let found: Quest | null = null;
		let before = '';
		for (let i = 0; i < 400 && !found; i++) {
			const hero = heroes[i % heroes.length];
			hero.role = 'hero';
			const q = spawnQuest(sim.w, sim.polities, [hero], sim.monsters.map((m) => ({ ...m, alive: false })), sim.rng, sim.year, { val: 1000 + i });
			if (!q) continue;
			q.heroId = hero.id;
			before = q.title;
			applySphereQuest(sim, q);
			if (q.sq) found = q;
		}
		expect(found).not.toBeNull();
		const q = found!;
		expect(q.sq).toMatch(/^[a-z]+\./);
		expect(q.title).not.toBe(before);
		expect(q.title).toContain(q.targetName);
		expect(q.storyLog[0]).toContain(q.targetName);
		expect(sim.w.burgs[0].alive).toBeFalsy();
		const hero = sim.people[q.heroId];
		const gold0 = hero.gold;
		const nextArt = { val: 9000 };
		const rng = sim.rng;
		updateQuests([q], sim.people, sim.artifacts, sim.year + 1, rng, nextArt, sim.lang(1), sim.monsters, sim.polities, sim.w);
		expect(q.stage).toBe('confrontation');
		expect(q.storyLog[1]).toContain(hero.name);
		expect(q.storyLog[1]).toBe(sphereQuestText(q, 'confront', hero.name));
		const ev = updateQuests([q], sim.people, sim.artifacts, sim.year + 2, rng, nextArt, sim.lang(1), sim.monsters, sim.polities, sim.w);
		expect(q.completed).toBe(true);
		expect(ev[0].text).toContain('QUEST COMPLETED');
		expect(ev[0].text).not.toContain('—');
		expect(hero.gold).toBeGreaterThanOrEqual(gold0);
	});

	it('stability boost applies to the home realm only for boost quests', () => {
		const sim = setup('sphere-quest-boost');
		const pol = sim.polities.find((p) => p.id && p.alive)!;
		pol.stability = 50;
		const boost = SPHERE_QUESTS.find((d) => d.boost)!;
		const plain = SPHERE_QUESTS.find((d) => !d.boost)!;
		const base = { stateId: pol.id } as Quest;
		sphereQuestBonus({ ...base, sq: plain.id }, sim.polities);
		expect(pol.stability).toBe(50);
		sphereQuestBonus({ ...base, sq: boost.id }, sim.polities);
		expect(pol.stability).toBe(58);
		sphereQuestBonus({ ...base }, sim.polities);
		expect(pol.stability).toBe(58);
	});

	it('is deterministic and leaves sim.rng alone', () => {
		const a = setup('sphere-quest-det');
		const b = setup('sphere-quest-det');
		const mk = (sim: typeof a) => {
			const hero = sim.people.find((p) => p.alive && p.id && p.burg)!;
			return { hero, q: { id: 5, year: sim.year, heroId: hero.id, kind: 'treasure', stateId: hero.state, title: 'x', icon: 'x', reward: 'x', storyLog: [], targetCell: 0, targetName: '' } as unknown as Quest };
		};
		const A = mk(a), B = mk(b);
		const st = a.rng.state();
		applySphereQuest(a, A.q);
		applySphereQuest(b, B.q);
		expect(a.rng.state()).toEqual(st);
		expect(A.q.sq).toBe(B.q.sq);
		expect(A.q.title).toBe(B.q.title);
	});

	it('sphere quests show up in a long run', () => {
		const cos = new Cosmos(generateUniverse({ seed: 'sphere-quest-run', cells: 3000, states: 12, genre: 'fantasy' }, 1));
		for (let m = 0; m < 12 * 150; m++) cos.tick();
		const sim = cos.sims[0];
		const qs = sim.quests.filter((q) => q.sq);
		expect(sim.quests.length).toBeGreaterThan(0);
		expect(qs.length).toBeGreaterThan(0);
	});
});
