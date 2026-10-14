import { describe, expect, it } from 'vitest';
import { generateUniverse } from '../gen/universe';
import { Cosmos } from './cosmos';
import { reskin } from './genrepacks';

const run = (genre: 'fantasy' | 'cyberpunk', years: number) => {
	const cos = new Cosmos(generateUniverse({ seed: 'balance', cells: 4000, states: 14, genre }, 1));
	for (let m = 0; m < years * 12; m++) cos.tick();
	return cos.sims[0];
};

describe('balance & genre voice', () => {
	it('uprisings no longer dominate the chronicle and the cast stays bounded', () => {
		const s = run('fantasy', 120);
		const recent = s.events.slice(-400);
		const share = recent.filter((e) => e.kind === 'uprising').length / recent.length;
		expect(share).toBeLessThan(0.35);
		const aliveRealms = s.polities.filter((p) => p.alive && p.id).length;
		expect(s.people.filter((p) => p.alive).length).toBeLessThanOrEqual(150 + aliveRealms * 6 + 40);
	});
	it('cyberpunk chronicles are re-skinned out of medieval vocabulary', () => {
		const s = run('cyberpunk', 60);
		const text = s.allEvents.map((e) => e.text).join(' ');
		expect(text).not.toMatch(/\bbailiffs\b|\bknight-errant\b|\bgranaries\b/);
		expect(reskin('cyberpunk', 'The bailiffs raided the granaries.')).toBe('The corp enforcers raided the protein vats.');
	});
});

describe('avatar depth', () => {
	it('offers ambitions, hires companions, and receives letters', async () => {
		const { pickAmbition } = await import('./ambitions');
		const cos = new Cosmos(generateUniverse({ seed: 'avatar', cells: 4000, states: 12 }, 1));
		const s = cos.sims[0];
		const p = s.candidates().find((x) => x.role !== 'ruler')!;
		cos.choose(0, p.id);
		cos.tick();
		expect(p.ambitionChoices?.length).toBeGreaterThan(0);
		pickAmbition(s, 'company');
		p.gold = 200;
		for (let k = 0; k < 3; k++) s.act('companion');
		expect(p.companions?.length).toBe(3);
		s.pending = null;
		cos.tick();
		expect(p.ambitionsDone).toContain('company');
		p.renown = 80;
		for (let m = 0; m < 120 && s.me && !s.letters.length; m++) { s.pending = null; cos.tick(); }
		expect(s.letters.length).toBeGreaterThan(0);
	});
});
