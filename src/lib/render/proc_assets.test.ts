import { describe, expect, it } from 'vitest';
import { describeProceduralAppearance, hash32, hashStr32 } from './proc_assets';
import type { Person } from '../sim/types';

describe('procedural character & environment assets', () => {
	// loose fixture: only the fields the appearance code reads matter
	const samplePerson = {
		id: 42,
		name: 'Kaelen',
		house: 'Vane',
		role: 'hero',
		state: 1,
		burg: 1,
		born: 120,
		traits: ['Brave', 'Pious'],
		martial: 8,
		diplomacy: 5,
		intrigue: 4,
		stewardship: 5,
		renown: 55,
		gold: 120,
		alive: true,
		friends: [],
		rivals: [],
		species: 'elf',
		epithet: 'the Silver',
	} as unknown as Person;

	it('produces deterministic hashes and appearance descriptions', () => {
		expect(hash32(12345)).toBe(hash32(12345));
		expect(hashStr32('realmforge-seed')).toBe(hashStr32('realmforge-seed'));

		const look1 = describeProceduralAppearance(samplePerson, 'world-seed-1');
		const look2 = describeProceduralAppearance(samplePerson, 'world-seed-1');
		expect(look1).toEqual(look2);
		expect(look1.summary.length).toBeGreaterThan(20);
		expect(look1.summary).not.toContain('—');
	});

	it('creates distinct variations across different species and IDs', () => {
		const summaries = new Set<string>();
		const speciesList: Person['species'][] = [
			'human', 'elf', 'dwarf', 'orc', 'troll', 'beastman', 'halfling',
			'giant', 'goblin', 'saurian', 'merfolk', 'celestial', 'ratfolk',
			'lizardfolk', 'tomb_undead', 'ogor', 'void_elf', 'warp_fiend', 'chitin_swarm',
		];
		for (let i = 0; i < speciesList.length; i++) {
			const p: Person = { ...samplePerson, id: 100 + i, species: speciesList[i] };
			const look = describeProceduralAppearance(p, 'world-seed-1');
			summaries.add(look.summary);
		}
		expect(summaries.size).toBe(speciesList.length);
	});
});
