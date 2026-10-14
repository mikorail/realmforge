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
