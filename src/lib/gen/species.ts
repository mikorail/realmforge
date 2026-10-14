import type { Rng } from '../rng';
import type { LayerKind } from './genre';

export interface SpeciesDef {
	id: string;
	name: string;
	plural: string;
	adjective: string;
	icon: string;
	desc: string;
	/** Stat modifiers for martial, diplomacy, stewardship, intrigue, health */
	mods: { martial: number; diplomacy: number; stewardship: number; intrigue: number; health: number };
	/** Lifespan multiplier relative to standard mortal baseline (e.g. elves 3.0, dwarves 1.8, humans 1.0, orcs 0.9) */
	lifespanMult: number;
	/** Biome preference IDs (from BIOMES) */
	biomes: number[];
	/** Preferred planes */
	layers: LayerKind[];
	/** Characteristic cultural traits */
	traits: string[];
	/** Preferred polity forms */
	forms: string[];
}

export const SPECIES: SpeciesDef[] = [
	{
		id: 'human',
		name: 'Human',
		plural: 'Humans',
		adjective: 'Human',
		icon: '👤',
		desc: 'Versatile and ambitious mortals who build sprawling empires across every continent.',
		mods: { martial: 0, diplomacy: 1, stewardship: 1, intrigue: 1, health: 0 },
		lifespanMult: 1.0,
		biomes: [3, 4, 5, 6, 7, 8],
		layers: ['surface'],
		traits: ['Ambitious', 'Lucky'],
		forms: ['Kingdom', 'Empire', 'Republic', 'Principality', 'Commonwealth']
	},
	{
		id: 'elf',
		name: 'Elf',
		plural: 'Elves',
		adjective: 'Elven',
		icon: '🧝',
		desc: 'Graceful, long-lived beings attuned to primal magic, ancient forests, and stellar harmonies.',
		mods: { martial: 1, diplomacy: 3, stewardship: 1, intrigue: 2, health: 15 },
		lifespanMult: 3.5,
		biomes: [5, 6, 7, 12, 14],
		layers: ['surface', 'sky'],
		traits: ['Scholar', 'Charming', 'Pious'],
		forms: ['High Kingdom', 'Conclave', 'Star-Realm', 'Sanctuary', 'Enclave']
	},
	{
		id: 'dwarf',
		name: 'Dwarf',
		plural: 'Dwarves',
		adjective: 'Dwarven',
		icon: '⛏️',
		desc: 'Stout, resolute masters of masonry, deep mining, and forged steel who carve citadels into living stone.',
		mods: { martial: 3, diplomacy: -1, stewardship: 4, intrigue: 0, health: 20 },
		lifespanMult: 2.0,
		biomes: [4, 6, 10, 15],
		layers: ['deep', 'surface'],
		traits: ['Strong', 'Brave', 'Greedy'],
		forms: ['Hold', 'Thaig', 'Mountain Kingdom', 'Great Clan', 'Iron League']
	},
	{
		id: 'orc',
		name: 'Orc',
		plural: 'Orcs',
		adjective: 'Orcish',
		icon: '🐗',
		desc: 'Fierce, muscular warriors governed by martial honor, blood covenants, and relentless resilience.',
		mods: { martial: 5, diplomacy: -2, stewardship: -1, intrigue: 0, health: 25 },
		lifespanMult: 0.9,
		biomes: [1, 2, 4, 15],
		layers: ['surface', 'deep'],
		traits: ['Brave', 'Strong', 'Fierce'],
		forms: ['Warband', 'Horde', 'Blood-Clan', 'Iron-Host', 'Warlordship']
	},
	{
		id: 'troll',
		name: 'Troll',
		plural: 'Trolls',
		adjective: 'Trollish',
		icon: '🧌',
		desc: 'Massive, regenerative brutes of mossy crags and deep wetlands possessing primeval strength.',
		mods: { martial: 6, diplomacy: -4, stewardship: -2, intrigue: -1, health: 40 },
		lifespanMult: 1.6,
		biomes: [7, 8, 10, 11, 16],
		layers: ['surface', 'deep'],
		traits: ['Strong', 'Cruel'],
		forms: ['Crag-Moot', 'Swamp-Dominion', 'War-Pack', 'Troll-Hold']
	},
	{
		id: 'beastman',
		name: 'Beastman',
		plural: 'Beastmen',
		adjective: 'Feral',
		icon: '🐺',
		desc: 'Prideful therianthropic folk bearing lupine, feline, or minotaur aspects, hunters of boundless wildlands.',
		mods: { martial: 3, diplomacy: 0, stewardship: 0, intrigue: 2, health: 15 },
		lifespanMult: 1.1,
		biomes: [2, 3, 5, 7, 9],
		layers: ['surface'],
		traits: ['Brave', 'Charming', 'Fierce'],
		forms: ['Pride', 'Pack-League', 'Great Herd', 'Totemic Confederacy']
	},
	{
		id: 'halfling',
		name: 'Halfling',
		plural: 'Halflings & Gnomes',
		adjective: 'Halfling',
		icon: '🌾',
		desc: 'Clever, jovial, and nimble folk who build peaceful pastoral burrows or intricate clockwork workshops.',
		mods: { martial: -2, diplomacy: 3, stewardship: 3, intrigue: 3, health: 5 },
		lifespanMult: 1.4,
		biomes: [3, 4, 5, 6],
		layers: ['surface'],
		traits: ['Lucky', 'Content', 'Scholar'],
		forms: ['Free Shire', 'Borough-League', 'Clockwork Guild', 'Moot']
	},
	{
		id: 'giant',
		name: 'Giant',
		plural: 'Giants',
		adjective: 'Gigantic',
		icon: '🗿',
		desc: 'Colossal beings of primeval stone, frost, and storm, keeping ancient memory of the world\'s dawn.',
		mods: { martial: 7, diplomacy: 1, stewardship: 0, intrigue: -2, health: 50 },
		lifespanMult: 4.0,
		biomes: [9, 10, 11, 15],
		layers: ['surface', 'sky'],
		traits: ['Strong', 'Scholar'],
		forms: ['Titan Moot', 'High Ordning', 'Peak-Dominion', 'Cloud-Throne']
	},
	{
		id: 'goblin',
		name: 'Goblin',
		plural: 'Goblins',
		adjective: 'Goblinoid',
		icon: '👺',
		desc: 'Prolific, cunning, and resourceful tinkerers who thrive in shadowy crevices, mines, and scrap cities.',
		mods: { martial: 0, diplomacy: -1, stewardship: 2, intrigue: 4, health: -5 },
		lifespanMult: 0.8,
		biomes: [1, 2, 4, 15],
		layers: ['deep', 'surface'],
		traits: ['Greedy', 'Paranoid', 'Ambitious'],
		forms: ['Scrap Cartel', 'Warren League', 'Tinker Syndicate', 'Under-Horde']
	},
	{
		id: 'saurian',
		name: 'Dragonborn',
		plural: 'Dragonborn',
		adjective: 'Draconic',
		icon: '🦎',
		desc: 'Scale-bound noble warriors descended from dragons, wielding elemental breath and stubborn pride.',
		mods: { martial: 4, diplomacy: 1, stewardship: 1, intrigue: 0, health: 20 },
		lifespanMult: 1.8,
		biomes: [1, 2, 10, 15],
		layers: ['surface', 'deep'],
		traits: ['Brave', 'Strong', 'Pious'],
		forms: ['Scale-Empire', 'Drake-Throne', 'Wyrm-Pact', 'Grand Wyrmdom']
	},
	{
		id: 'merfolk',
		name: 'Merfolk',
		plural: 'Merfolk',
		adjective: 'Oceanic',
		icon: '🧜',
		desc: 'Aquatic humanoids of the coral reefs and sunlit shallows, rulers of the pelagic depths.',
		mods: { martial: 1, diplomacy: 2, stewardship: 2, intrigue: 1, health: 10 },
		lifespanMult: 1.5,
		biomes: [0, 7, 12],
		layers: ['sea', 'surface'],
		traits: ['Charming', 'Pious'],
		forms: ['Abyssal Court', 'Coral Kingdom', 'Tide-Dominion', 'Pearl League']
	},
	{
		id: 'celestial',
		name: 'Starborn',
		plural: 'Starborn',
		adjective: 'Celestial',
		icon: '✨',
		desc: 'Luminous beings born of falling stars and astral conduits, radiating transcendent grace.',
		mods: { martial: 2, diplomacy: 5, stewardship: 2, intrigue: 2, health: 30 },
		lifespanMult: 5.0,
		biomes: [14, 12, 6],
		layers: ['sky', 'surface'],
		traits: ['Pious', 'Scholar', 'Charming'],
		forms: ['Astral Hegemony', 'Solar Conclave', 'Luminous Throne', 'Star-Dominion']
	}
];

export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

/** Pick an appropriate species for a culture based on biome, layer, and PRNG */
export function pickSpeciesForCulture(
	rng: Rng,
	biome: number,
	layer: LayerKind,
	sphereId: string
): SpeciesDef {
	// Deep layer defaults heavily to dwarves, goblins, or trolls
	if (layer === 'deep') {
		const roll = rng();
		if (roll < 0.45) return SPECIES_BY_ID['dwarf'];
		if (roll < 0.70) return SPECIES_BY_ID['goblin'];
		if (roll < 0.85) return SPECIES_BY_ID['troll'];
		return SPECIES_BY_ID['saurian'];
	}

	// Sea layer defaults to merfolk
	if (layer === 'sea') {
		return SPECIES_BY_ID['merfolk'];
	}

	// Sky layer defaults to celestials, elves, or giants
	if (layer === 'sky') {
		const roll = rng();
		if (roll < 0.45) return SPECIES_BY_ID['celestial'];
		if (roll < 0.80) return SPECIES_BY_ID['elf'];
		return SPECIES_BY_ID['giant'];
	}

	// Surface: biome and sphere weighted
	const candidates: { sp: SpeciesDef; weight: number }[] = [];
	for (const sp of SPECIES) {
		if (sp.layers.includes('surface')) {
			let w = 1.0;
			// Humans are the common baseline
			if (sp.id === 'human') w = 3.2;
			else if (sp.biomes.includes(biome)) w = 2.4;
			else w = 0.5;

			// Mountain peaks favour giants and dwarves
			if (biome === 10) {
				if (sp.id === 'giant') w = 4.0;
				if (sp.id === 'dwarf') w = 3.0;
			}
			// Swamps and jungles favour beastmen, trolls, orcs
			if (biome === 7 || biome === 8) {
				if (sp.id === 'beastman' || sp.id === 'troll') w = 3.5;
			}
			// Old growth forests favour elves and halflings
			if (biome === 6 || biome === 12) {
				if (sp.id === 'elf') w = 3.5;
				if (sp.id === 'halfling') w = 2.5;
			}
			// Steppes and volcanic ashlands favour orcs and saurians
			if (biome === 2 || biome === 15) {
				if (sp.id === 'orc' || sp.id === 'saurian') w = 3.5;
			}
			candidates.push({ sp, weight: w });
		}
	}

	const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
	let roll = rng() * totalWeight;
	for (const c of candidates) {
		if ((roll -= c.weight) <= 0) return c.sp;
	}
	return SPECIES_BY_ID['human'];
}
