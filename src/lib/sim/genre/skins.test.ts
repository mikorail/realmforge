import { describe, expect, it } from 'vitest';
import { DISCOVERIES } from '../tech';
import { MONSTER_ARCHETYPES } from '../monsters';
import { WONDER_TEMPLATES } from '../wonders';
import { GENRES, type Genre } from '../../gen/genre';
import { TECH_SKINS, type SkinGenre, techDesc, techName } from './techskins';
import { MONSTER_SKINS, WONDER_SKINS, monsterSkin, wonderSkin } from './creatureskins';

const SKIN_GENRES: SkinGenre[] =['steampunk', 'dieselpunk', 'atompunk', 'cyberpunk', 'biopunk', 'solarpunk'];

describe('genre tech skins', () => {
	it('every discovery has a name and description for every skinned genre', () => {
		for (const g of SKIN_GENRES) {
			for (const d of DISCOVERIES) {
				const skin = TECH_SKINS[g][d.id];
				expect(skin, `${g}/${d.id}`).toBeDefined();
				expect(skin.name.length, `${g}/${d.id} name`).toBeGreaterThan(0);
				expect(skin.desc.length, `${g}/${d.id} desc`).toBeGreaterThan(0);
				expect(skin.desc, `${g}/${d.id} one line`).not.toMatch(/\n/);
			}
		}
	});

	it('has no stray entries for unknown discovery ids', () => {
		const ids = new Set(DISCOVERIES.map((d) => d.id));
		for (const g of SKIN_GENRES) {
			for (const id of Object.keys(TECH_SKINS[g])) expect(ids.has(id), `${g}/${id}`).toBe(true);
		}
	});

	it('skinned names differ per genre and fall back for fantasy and mythic', () => {
		const bronze = DISCOVERIES.find((d) => d.id === 'bronze')!;
		expect(techName('cyberpunk', bronze.id, bronze.name)).not.toBe(bronze.name);
		expect(techName('steampunk', bronze.id, bronze.name)).not.toBe(techName('cyberpunk', bronze.id, bronze.name));
		expect(techName('fantasy', bronze.id, bronze.name)).toBe(bronze.name);
		expect(techName('mythic', bronze.id, bronze.name)).toBe(bronze.name);
		expect(techDesc('fantasy', bronze.id, bronze.description)).toBe(bronze.description);
		expect(techName('cyberpunk', 'no_such_tech', 'Fallback')).toBe('Fallback');
	});

	it('cyberpunk carries the requested examples', () => {
		const names = Object.values(TECH_SKINS.cyberpunk).map((s) => s.name.toLowerCase());
		expect(names.some((n) => n.includes('neural lace'))).toBe(true);
		expect(names.some((n) => n.includes('mesh'))).toBe(true);
		expect(names.some((n) => n.includes('orbital elevator'))).toBe(true);
	});
});

describe('genre creature skins', () => {
	it('every monster species has a skin for every skinned genre', () => {
		for (const g of SKIN_GENRES) {
			for (const a of MONSTER_ARCHETYPES) {
				const skin = MONSTER_SKINS[g][a.species];
				expect(skin, `${g}/${a.species}`).toBeDefined();
				expect(skin.name.length).toBeGreaterThan(0);
				expect(skin.icon.length).toBeGreaterThan(0);
				expect(skin.lore.length).toBeGreaterThan(0);
				expect(skin.lore, `${g}/${a.species} one line`).not.toMatch(/\n/);
			}
		}
	});

	it('every wonder kind has a skin for every skinned genre', () => {
		for (const g of SKIN_GENRES) {
			for (const t of WONDER_TEMPLATES) {
				const skin = WONDER_SKINS[g][t.kind];
				expect(skin, `${g}/${t.kind}`).toBeDefined();
				expect(skin.name.length).toBeGreaterThan(0);
				expect(skin.lore.length).toBeGreaterThan(0);
			}
		}
	});

	it('lookups return null for fantasy, mythic and unknown species or kinds', () => {
		expect(monsterSkin('fantasy', 'Ancient Red Dragon')).toBeNull();
		expect(monsterSkin('mythic', 'Ancient Red Dragon')).toBeNull();
		expect(monsterSkin('cyberpunk', 'No Such Beast')).toBeNull();
		expect(wonderSkin('fantasy', 'tower_magic')).toBeNull();
		expect(wonderSkin('solarpunk', 'no_such_kind')).toBeNull();
	});

	it('uses the requested examples (dragon to war-mech, tower of magic to spire, kraken to drone swarm)', () => {
		expect(monsterSkin('steampunk', 'Ancient Red Dragon')?.name).toBe('Rogue War-Mech');
		expect(wonderSkin('cyberpunk', 'tower_magic')?.name).toBe('Corporate Spire');
		expect(monsterSkin('cyberpunk', 'Abyssal Kraken')?.name).toBe('Abyssal Drone Swarm');
		expect(wonderSkin('biopunk', 'world_tree')?.name).toBe('Bio-Arcology');
	});

	it('the skin table covers the same genres as the genre registry', () => {
		for (const g of Object.keys(GENRES) as Genre[]) {
			if (g === 'fantasy' || g === 'mythic') continue;
			expect(MONSTER_SKINS[g]).toBeDefined();
			expect(WONDER_SKINS[g]).toBeDefined();
		}
	});
});
