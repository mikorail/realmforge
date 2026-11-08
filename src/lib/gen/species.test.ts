import { describe, expect, it } from 'vitest';
import { makeRng } from '../rng';
import {
	getCultureVariant,
	pickSpeciesVariant,
	SPECIES,
	SPECIES_VARIANTS,
	VARIANT_BY_ID
} from './species';
import { generateWorld } from './index';

describe('colored / biome subrace variations & tribal sub-lineages', () => {
	it('covers every built-in species with rich colored subraces, war-paint hexes, biomes, and totems', () => {
		for (const sp of SPECIES) {
			const variants = SPECIES_VARIANTS[sp.id];
			expect(variants, `missing variants for ${sp.id}`).toBeDefined();
			expect(variants.length, `expected >= 3 variants for ${sp.id}`).toBeGreaterThanOrEqual(3);
			for (const v of variants) {
				expect(v.speciesId).toBe(sp.id);
				expect(v.name.length).toBeGreaterThan(3);
				expect(v.colorHex).toMatch(/^#[0-9a-fA-F]{6}$/);
				expect(v.paintHex).toMatch(/^#[0-9a-fA-F]{6}$/);
				expect(v.biomes.length).toBeGreaterThan(0);
				expect(v.totem.length).toBeGreaterThan(2);
				expect(v.trait.length).toBeGreaterThan(2);
				expect(VARIANT_BY_ID[v.id]).toEqual(v);
			}
		}
	});

	it('returns deterministic biome-matched variants via getCultureVariant and pickSpeciesVariant', () => {
		for (const sp of SPECIES) {
			const v1 = getCultureVariant(sp.id, sp.biomes[0] ?? 4, 7);
			const v2 = getCultureVariant(sp.id, sp.biomes[0] ?? 4, 7);
			expect(v1).toEqual(v2);
			expect(v1.speciesId).toBe(sp.id);

			const rng1 = makeRng(`subrace-test-${sp.id}`);
			const rng2 = makeRng(`subrace-test-${sp.id}`);
			expect(pickSpeciesVariant(sp.id, sp.biomes[0] ?? 4, rng1)).toEqual(
				pickSpeciesVariant(sp.id, sp.biomes[0] ?? 4, rng2)
			);
		}

		// Verify biome sensitivity for orc subraces (e.g. glacier/tundra -> Frost-Tusk, lava/ash -> Bloodfang/Magma)
		const frostOrc = getCultureVariant('orc', 11, 1);
		expect(frostOrc.name).toBe('Azure Frost-Tusk');
		const forestGoblin = getCultureVariant('goblin', 15, 1);
		expect(forestGoblin.name).toBe('Spore-Green Creeper');
	});

	it('populates culture subrace and totem during worldgen while preserving strict seed determinism', () => {
		const w1 = generateWorld({ seed: 'subrace-det-seed', cells: 1000, states: 6 });
		const w2 = generateWorld({ seed: 'subrace-det-seed', cells: 1000, states: 6 });
		expect(w1.cultures.map((c) => [c.name, c.species, c.variant, c.subrace, c.totem])).toEqual(
			w2.cultures.map((c) => [c.name, c.species, c.variant, c.subrace, c.totem])
		);
		const realCultures = w1.cultures.filter((c) => c.id > 0);
		expect(realCultures.length).toBeGreaterThan(0);
		for (const cu of realCultures) {
			expect(cu.variant).toBeTruthy();
			expect(cu.subrace).toBeTruthy();
			expect(cu.totem).toBeTruthy();
		}
	});
});
