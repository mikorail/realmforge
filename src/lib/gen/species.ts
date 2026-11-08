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
	},
	{
		id: 'ratfolk',
		name: 'Ratfolk',
		plural: 'Ratfolk',
		adjective: 'Verminous',
		icon: '🐀',
		desc: 'Cunning subterranean rodentkin and warpstone tinkerers who breed rapidly in foul under-empires.',
		mods: { martial: 2, diplomacy: -3, stewardship: 1, intrigue: 6, health: -5 },
		lifespanMult: 0.65,
		biomes: [4, 7, 12, 15],
		layers: ['deep', 'surface'],
		traits: ['Paranoid', 'Ambitious', 'Greedy'],
		forms: ['Under-Empire', 'Clan-Warren', 'Pestilent Nest', 'Council of Thirteen']
	},
	{
		id: 'lizardfolk',
		name: 'Lizardfolk',
		plural: 'Lizardfolk',
		adjective: 'Saurian',
		icon: '🐊',
		desc: 'Cold-blooded ancient guardians of the geomantic web who defend temple-cities under primal mandates.',
		mods: { martial: 4, diplomacy: 0, stewardship: 4, intrigue: -1, health: 25 },
		lifespanMult: 2.5,
		biomes: [5, 7, 8, 12],
		layers: ['surface', 'deep'],
		traits: ['Pious', 'Strong', 'Brave'],
		forms: ['Temple-City', 'Geomantic Enclave', 'Spawning Dominion', 'Sacred Cohort']
	},
	{
		id: 'tomb_undead',
		name: 'Tomb Revenant',
		plural: 'Tomb Revenants',
		adjective: 'Undying',
		icon: '💀',
		desc: 'Ancient slumbering skeletal pharaohs and living-metal monarchs commanding eternal legions.',
		mods: { martial: 4, diplomacy: -2, stewardship: 3, intrigue: 2, health: 35 },
		lifespanMult: 10.0,
		biomes: [1, 2, 13, 14],
		layers: ['surface', 'deep'],
		traits: ['Pious', 'Scholar', 'Strong'],
		forms: ['Tomb Dynasty', 'Necropolis', 'Awakened Legion', 'Eternal Hegemony']
	},
	{
		id: 'ogor',
		name: 'Ogor',
		plural: 'Ogors',
		adjective: 'Ogor',
		icon: '🍖',
		desc: 'Massive nomadic brute warriors driven by eternal hunger and gut-magic across mountains and steppes.',
		mods: { martial: 6, diplomacy: -2, stewardship: -2, intrigue: -1, health: 40 },
		lifespanMult: 1.2,
		biomes: [2, 3, 4, 10, 11],
		layers: ['surface'],
		traits: ['Strong', 'Brave', 'Fierce'],
		forms: ['Mawtribe', 'Glutton-Horde', 'Nomad-Camp', 'Great Gut-Pact']
	},
	{
		id: 'void_elf',
		name: 'Void Elf',
		plural: 'Void Elves',
		adjective: 'Void-Elven',
		icon: '🌌',
		desc: 'Ancient psychic wanderers of cosmic webways with spirit stones preserving souls against the void.',
		mods: { martial: 2, diplomacy: 2, stewardship: 2, intrigue: 4, health: 10 },
		lifespanMult: 4.5,
		biomes: [6, 12, 14],
		layers: ['sky', 'surface'],
		traits: ['Scholar', 'Pious', 'Ambitious'],
		forms: ['Craft-Realm', 'Void Conclave', 'Star-Dominion', 'Webway Enclave']
	},
	{
		id: 'warp_fiend',
		name: 'Warp Fiend',
		plural: 'Warp Fiends',
		adjective: 'Daemonkin',
		icon: '👹',
		desc: 'Horned warp-manifestations born of cosmic fractures and excess emotion hungry for slaughter.',
		mods: { martial: 6, diplomacy: -4, stewardship: -3, intrigue: 3, health: 45 },
		lifespanMult: 8.0,
		biomes: [13, 15, 16],
		layers: ['surface', 'deep', 'sky'],
		traits: ['Cruel', 'Fierce', 'Ambitious'],
		forms: ['Chaos Legion', 'Ruinous Host', 'Warp Coven', 'Blood-Court']
	},
	{
		id: 'chitin_swarm',
		name: 'Chitin Swarm',
		plural: 'Chitin Swarms',
		adjective: 'Bio-Form',
		icon: '🦗',
		desc: 'Synaptic bio-constructs with chittering carapaces driven by a devouring hive-mind.',
		mods: { martial: 5, diplomacy: -5, stewardship: 1, intrigue: 1, health: 20 },
		lifespanMult: 0.8,
		biomes: [1, 5, 7, 12, 15],
		layers: ['surface', 'deep'],
		traits: ['Fierce', 'Cruel', 'Strong'],
		forms: ['Hive-Colony', 'Synaptic Brood', 'Chitin Swarm', 'Bio-Dominion']
	}
];

export const SPECIES_BY_ID: Record<string, SpeciesDef> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

export interface SpeciesVariant {
	id: string;
	speciesId: string;
	name: string;
	colorHex: string;
	paintHex: string;
	biomes: number[];
	totem: string;
	trait: string;
}

export const SPECIES_VARIANTS: Record<string, SpeciesVariant[]> = {
	orc: [
		{ id: 'orc_bloodfang', speciesId: 'orc', name: 'Crimson Bloodfang', colorHex: '#b83b32', paintHex: '#f5e6c8', biomes: [1, 3, 13, 16], totem: 'Blood-Boar', trait: 'Fierce' },
		{ id: 'orc_frosttusk', speciesId: 'orc', name: 'Azure Frost-Tusk', colorHex: '#4f7a9e', paintHex: '#d8f3ff', biomes: [2, 9, 10, 11], totem: 'Rime-Warg', trait: 'Brave' },
		{ id: 'orc_magma', speciesId: 'orc', name: 'Ash-Skin Magma', colorHex: '#5c524f', paintHex: '#ff5924', biomes: [13, 15, 16], totem: 'Cinder-Drak', trait: 'Strong' },
		{ id: 'orc_ironjaw', speciesId: 'orc', name: 'Deep-Moss Ironjaw', colorHex: '#567844', paintHex: '#c9382b', biomes: [4, 5, 6, 7, 8, 12], totem: 'Iron-Tusker', trait: 'Strong' }
	],
	goblin: [
		{ id: 'goblin_redcap', speciesId: 'goblin', name: 'Redcap Butcher', colorHex: '#8c6d53', paintHex: '#b82525', biomes: [4, 6, 8, 10], totem: 'Blood-Crow', trait: 'Cruel' },
		{ id: 'goblin_frostbiter', speciesId: 'goblin', name: 'Frostbiter Blue', colorHex: '#5d8aa8', paintHex: '#e0f7fa', biomes: [2, 9, 10, 11], totem: 'Ice-Weasel', trait: 'Paranoid' },
		{ id: 'goblin_sunscorch', speciesId: 'goblin', name: 'Sunscorch Yellow', colorHex: '#c49e49', paintHex: '#9e2a2b', biomes: [1, 2, 3, 13], totem: 'Dune-Scorpion', trait: 'Greedy' },
		{ id: 'goblin_spore', speciesId: 'goblin', name: 'Spore-Green Creeper', colorHex: '#6b9c48', paintHex: '#a855f7', biomes: [5, 7, 12, 15], totem: 'Shriek-Bat', trait: 'Ambitious' }
	],
	elf: [
		{ id: 'elf_sungold', speciesId: 'elf', name: 'Sun-Gold High-Kin', colorHex: '#f5d49c', paintHex: '#e6a817', biomes: [3, 4, 5, 14], totem: 'Solar Phoenix', trait: 'Scholar' },
		{ id: 'elf_silvermoon', speciesId: 'elf', name: 'Silver-Moon Kin', colorHex: '#dce4f2', paintHex: '#7aa2f7', biomes: [6, 8, 9, 14], totem: 'Lunar Stag', trait: 'Pious' },
		{ id: 'elf_wildkin', speciesId: 'elf', name: 'Emerald Wild-Kin', colorHex: '#c2e0c6', paintHex: '#2d7a47', biomes: [5, 6, 7, 8, 12], totem: 'Great Tree-Hart', trait: 'Brave' },
		{ id: 'elf_autumncourt', speciesId: 'elf', name: 'Crimson Autumn-Court', colorHex: '#e8bfa5', paintHex: '#b8332a', biomes: [4, 6, 8], totem: 'Scarlet Fox', trait: 'Charming' },
		{ id: 'elf_duskkin', speciesId: 'elf', name: 'Obsidian Dusk-Kin', colorHex: '#5d576b', paintHex: '#c084fc', biomes: [13, 14, 15], totem: 'Shadow-Spider', trait: 'Paranoid' }
	],
	dwarf: [
		{ id: 'dwarf_forgeclan', speciesId: 'dwarf', name: 'Red-Beard Forge-Clan', colorHex: '#d99568', paintHex: '#c83e2b', biomes: [4, 6, 13, 16], totem: 'Anvil-Ram', trait: 'Strong' },
		{ id: 'dwarf_deepdelver', speciesId: 'dwarf', name: 'Slate-Skin Deep-Delver', colorHex: '#7a828a', paintHex: '#d4af37', biomes: [10, 13, 15], totem: 'Blind-Mole', trait: 'Greedy' },
		{ id: 'dwarf_frosthold', speciesId: 'dwarf', name: 'Rime-Beard Frost-Hold', colorHex: '#c8d6e5', paintHex: '#3b82f6', biomes: [2, 9, 10, 11], totem: 'Glacier-Bear', trait: 'Brave' },
		{ id: 'dwarf_stonesinger', speciesId: 'dwarf', name: 'Jade-Vein Stone-Singer', colorHex: '#b8a07e', paintHex: '#10b981', biomes: [5, 6, 8, 14], totem: 'Jade-Badger', trait: 'Scholar' }
	],
	saurian: [
		{ id: 'saurian_firescale', speciesId: 'saurian', name: 'Crimson Fire-Scale', colorHex: '#b83b2b', paintHex: '#ffb703', biomes: [1, 3, 13, 16], totem: 'Solar Wyrm', trait: 'Fierce' },
		{ id: 'saurian_stormscale', speciesId: 'saurian', name: 'Azure Storm-Scale', colorHex: '#2b6cb0', paintHex: '#90cdf4', biomes: [0, 2, 4, 14], totem: 'Tempest-Drake', trait: 'Brave' },
		{ id: 'saurian_venomscale', speciesId: 'saurian', name: 'Emerald Venom-Scale', colorHex: '#2f855a', paintHex: '#a3e635', biomes: [5, 7, 8, 12, 15], totem: 'Jungle-Basilisk', trait: 'Strong' },
		{ id: 'saurian_sunscale', speciesId: 'saurian', name: 'Golden Sun-Scale', colorHex: '#c9972c', paintHex: '#fef08a', biomes: [1, 3, 4, 14], totem: 'Crown-Dragon', trait: 'Pious' },
		{ id: 'saurian_rimescale', speciesId: 'saurian', name: 'Alabaster Rime-Scale', colorHex: '#cbd5e1', paintHex: '#38bdf8', biomes: [2, 9, 10, 11], totem: 'Frost-Wyrm', trait: 'Strong' }
	],
	lizardfolk: [
		{ id: 'lizardfolk_firescale', speciesId: 'lizardfolk', name: 'Crimson Fire-Scale', colorHex: '#a8382b', paintHex: '#f59e0b', biomes: [1, 3, 13, 16], totem: 'Ignis-Crest', trait: 'Fierce' },
		{ id: 'lizardfolk_stormscale', speciesId: 'lizardfolk', name: 'Azure Storm-Scale', colorHex: '#29788c', paintHex: '#67e8f9', biomes: [0, 6, 8, 12], totem: 'River-Leviathan', trait: 'Pious' },
		{ id: 'lizardfolk_venomscale', speciesId: 'lizardfolk', name: 'Emerald Venom-Scale', colorHex: '#348252', paintHex: '#84cc16', biomes: [5, 7, 8, 12], totem: 'Feathered Coatl', trait: 'Brave' },
		{ id: 'lizardfolk_sunscale', speciesId: 'lizardfolk', name: 'Golden Sun-Scale', colorHex: '#b88c32', paintHex: '#fde047', biomes: [1, 3, 5], totem: 'Solar Caiman', trait: 'Pious' },
		{ id: 'lizardfolk_rimescale', speciesId: 'lizardfolk', name: 'Alabaster Rime-Scale', colorHex: '#b8c7cc', paintHex: '#0ea5e9', biomes: [2, 9, 10, 12], totem: 'Pale Olm', trait: 'Scholar' }
	],
	troll: [
		{ id: 'troll_mossback', speciesId: 'troll', name: 'Moss-Back River', colorHex: '#4d6b53', paintHex: '#84cc16', biomes: [6, 7, 8, 12], totem: 'Mire-Snapper', trait: 'Strong' },
		{ id: 'troll_glacier', speciesId: 'troll', name: 'Glacier-Hide Blue', colorHex: '#4f758c', paintHex: '#bae6fd', biomes: [9, 10, 11], totem: 'Avalanche-Yeti', trait: 'Fierce' },
		{ id: 'troll_cinder', speciesId: 'troll', name: 'Cinder-Hide Magma', colorHex: '#63463d', paintHex: '#f97316', biomes: [1, 13, 15, 16], totem: 'Slag-Behemoth', trait: 'Cruel' }
	],
	ogor: [
		{ id: 'ogor_mossback', speciesId: 'ogor', name: 'Moss-Back River', colorHex: '#9c8669', paintHex: '#4d7c0f', biomes: [4, 5, 6, 8, 12], totem: 'Gorge-Aurochs', trait: 'Strong' },
		{ id: 'ogor_glacier', speciesId: 'ogor', name: 'Glacier-Hide Blue', colorHex: '#8fa3b0', paintHex: '#38bdf8', biomes: [2, 9, 10, 11], totem: 'Frost-Mammoth', trait: 'Fierce' },
		{ id: 'ogor_cinder', speciesId: 'ogor', name: 'Cinder-Hide Magma', colorHex: '#9e6248', paintHex: '#ef4444', biomes: [1, 3, 13, 16], totem: 'Fire-Belly Maw', trait: 'Brave' }
	],
	beastman: [
		{ id: 'beastman_albino', speciesId: 'beastman', name: 'White-Fur Albino Seer', colorHex: '#e2dcd5', paintHex: '#9333ea', biomes: [9, 10, 11, 14], totem: 'Ghost-Wolf', trait: 'Pious' },
		{ id: 'beastman_bloodhorn', speciesId: 'beastman', name: 'Red-Mane Blood-Horn', colorHex: '#8c3b2b', paintHex: '#dc2626', biomes: [5, 6, 7, 8], totem: 'Gorgon-Bull', trait: 'Fierce' },
		{ id: 'beastman_brindle', speciesId: 'beastman', name: 'Brindle Steppe-Herd', colorHex: '#a3784e', paintHex: '#eab308', biomes: [1, 2, 3, 4], totem: 'Thunder-Stallion', trait: 'Brave' },
		{ id: 'beastman_blackfur', speciesId: 'beastman', name: 'Black-Fur Plague-Skulk', colorHex: '#3b3735', paintHex: '#65a30d', biomes: [7, 12, 13, 15], totem: 'Carrion-Hound', trait: 'Cruel' }
	],
	ratfolk: [
		{ id: 'ratfolk_albino', speciesId: 'ratfolk', name: 'White-Fur Albino Seer', colorHex: '#dfd8d0', paintHex: '#22c55e', biomes: [10, 14, 15], totem: 'Horned Seer-Rat', trait: 'Scholar' },
		{ id: 'ratfolk_redmane', speciesId: 'ratfolk', name: 'Red-Mane Blood-Horn', colorHex: '#824335', paintHex: '#ef4444', biomes: [4, 6, 13, 16], totem: 'Fang-Gnasher', trait: 'Fierce' },
		{ id: 'ratfolk_brindle', speciesId: 'ratfolk', name: 'Brindle Steppe-Herd', colorHex: '#8c735b', paintHex: '#f59e0b', biomes: [1, 2, 3, 4], totem: 'Burrow-Pack', trait: 'Greedy' },
		{ id: 'ratfolk_blackfur', speciesId: 'ratfolk', name: 'Black-Fur Plague-Skulk', colorHex: '#383330', paintHex: '#84cc16', biomes: [7, 8, 12, 15], totem: 'Blight-Vermin', trait: 'Paranoid' }
	],
	merfolk: [
		{ id: 'merfolk_coral', speciesId: 'merfolk', name: 'Coral-Red Reef', colorHex: '#d96b5c', paintHex: '#fde047', biomes: [0, 5, 7], totem: 'Crown-Nautilus', trait: 'Charming' },
		{ id: 'merfolk_indigo', speciesId: 'merfolk', name: 'Deep-Indigo Trench', colorHex: '#3b4d8c', paintHex: '#38bdf8', biomes: [0, 8, 9, 10, 11], totem: 'Abyssal Kraken', trait: 'Strong' },
		{ id: 'merfolk_glowshoal', speciesId: 'merfolk', name: 'Bioluminescent Glow-Shoal', colorHex: '#48b8a8', paintHex: '#2dd4bf', biomes: [0, 12, 14, 15], totem: 'Lantern-Ray', trait: 'Pious' }
	],
	human: [
		{ id: 'human_woad', speciesId: 'human', name: 'Woad-Painted Blue-Pelt', colorHex: '#e6b88a', paintHex: '#2563eb', biomes: [4, 6, 8, 9, 10], totem: 'Storm-Boar', trait: 'Brave' },
		{ id: 'human_ochre', speciesId: 'human', name: 'Red-Ochre Sun-Runner', colorHex: '#a86b3e', paintHex: '#dc2626', biomes: [1, 3, 5, 7], totem: 'Sun-Lion', trait: 'Strong' },
		{ id: 'human_dune', speciesId: 'human', name: 'Amber-Cloaked Dune', colorHex: '#c98e58', paintHex: '#d97706', biomes: [1, 2, 3, 13], totem: 'Wind-Falcon', trait: 'Ambitious' },
		{ id: 'human_warden', speciesId: 'human', name: 'Pine-Green Warden', colorHex: '#d9a477', paintHex: '#15803d', biomes: [5, 6, 7, 8, 12], totem: 'Silver-Wolf', trait: 'Lucky' }
	],
	halfling: [
		{ id: 'halfling_woad', speciesId: 'halfling', name: 'Woad-Painted Blue-Pelt', colorHex: '#ebb886', paintHex: '#3b82f6', biomes: [4, 6, 8, 9], totem: 'Hill-Hare', trait: 'Brave' },
		{ id: 'halfling_ochre', speciesId: 'halfling', name: 'Red-Ochre Sun-Runner', colorHex: '#c98d59', paintHex: '#ea580c', biomes: [1, 3, 4, 5], totem: 'Meadow-Fox', trait: 'Lucky' },
		{ id: 'halfling_dune', speciesId: 'halfling', name: 'Amber-Cloaked Dune', colorHex: '#d6a06b', paintHex: '#eab308', biomes: [1, 2, 3, 14], totem: 'Clockwork Wren', trait: 'Scholar' },
		{ id: 'halfling_warden', speciesId: 'halfling', name: 'Pine-Green Warden', colorHex: '#e5b583', paintHex: '#16a34a', biomes: [5, 6, 7, 8, 12], totem: 'Oak-Badger', trait: 'Content' }
	],
	giant: [
		{ id: 'giant_frost', speciesId: 'giant', name: 'Rime-Bound Frost-Titan', colorHex: '#9ab4c9', paintHex: '#38bdf8', biomes: [9, 10, 11], totem: 'Glacier-Roc', trait: 'Strong' },
		{ id: 'giant_fire', speciesId: 'giant', name: 'Basalt-Carved Fire-Titan', colorHex: '#6e524b', paintHex: '#f97316', biomes: [1, 13, 16], totem: 'Magma-Colossus', trait: 'Fierce' },
		{ id: 'giant_storm', speciesId: 'giant', name: 'Cloud-Silver Storm-Titan', colorHex: '#b8c4d4', paintHex: '#c084fc', biomes: [4, 6, 10, 14], totem: 'Thunder-Eagle', trait: 'Scholar' }
	],
	celestial: [
		{ id: 'celestial_solar', speciesId: 'celestial', name: 'Dawn-Gold Solar-Kin', colorHex: '#fae3a7', paintHex: '#f59e0b', biomes: [1, 3, 4, 14], totem: 'Zenith-Seraph', trait: 'Pious' },
		{ id: 'celestial_astral', speciesId: 'celestial', name: 'Starlight-Silver Astral-Kin', colorHex: '#d9ecff', paintHex: '#60a5fa', biomes: [6, 9, 11, 14], totem: 'Comet-Swan', trait: 'Scholar' },
		{ id: 'celestial_nebula', speciesId: 'celestial', name: 'Nebula-Violet Zenith-Kin', colorHex: '#e2d4f5', paintHex: '#a855f7', biomes: [7, 12, 14, 15], totem: 'Void-Pegasus', trait: 'Charming' }
	],
	tomb_undead: [
		{ id: 'tomb_gilded', speciesId: 'tomb_undead', name: 'Gilded-Bone Sun-Dynasty', colorHex: '#c4b491', paintHex: '#eab308', biomes: [1, 2, 3], totem: 'Golden Scarab', trait: 'Pious' },
		{ id: 'tomb_bronze', speciesId: 'tomb_undead', name: 'Verdigris-Bronze Legion', colorHex: '#7d8c82', paintHex: '#10b981', biomes: [10, 13, 14], totem: 'Obsidian Sphinx', trait: 'Strong' },
		{ id: 'tomb_ashen', speciesId: 'tomb_undead', name: 'Ashen-Shroud Barrow-Kin', colorHex: '#8e8a84', paintHex: '#38bdf8', biomes: [4, 8, 9, 12, 13], totem: 'Soul-Vulture', trait: 'Scholar' }
	],
	void_elf: [
		{ id: 'void_elf_amethyst', speciesId: 'void_elf', name: 'Amethyst Rift-Walker', colorHex: '#b8a6db', paintHex: '#a855f7', biomes: [6, 14, 15], totem: 'Astral Manta', trait: 'Scholar' },
		{ id: 'void_elf_indigo', speciesId: 'void_elf', name: 'Starless-Indigo Web-Born', colorHex: '#8d9bc9', paintHex: '#38bdf8', biomes: [8, 9, 12, 14], totem: 'Void-Weaver', trait: 'Ambitious' },
		{ id: 'void_elf_quartz', speciesId: 'void_elf', name: 'Pale-Quartz Soul-Binder', colorHex: '#dcd6e8', paintHex: '#f43f5e', biomes: [1, 2, 13, 14], totem: 'Spirit-Hound', trait: 'Pious' }
	],
	warp_fiend: [
		{ id: 'warp_blood', speciesId: 'warp_fiend', name: 'Brass-Blood Slaughter-Kin', colorHex: '#b82e3d', paintHex: '#f59e0b', biomes: [1, 13, 16], totem: 'Brass-Hound', trait: 'Fierce' },
		{ id: 'warp_flux', speciesId: 'warp_fiend', name: 'Iridescent Warp-Flame Kin', colorHex: '#7c3aed', paintHex: '#38bdf8', biomes: [14, 15, 16], totem: 'Nine-Eyed Raven', trait: 'Ambitious' },
		{ id: 'warp_blight', speciesId: 'warp_fiend', name: 'Bile-Green Blight-Spawn', colorHex: '#5c7844', paintHex: '#a3e635', biomes: [7, 12, 15], totem: 'Plague-Toad', trait: 'Cruel' }
	],
	chitin_swarm: [
		{ id: 'chitin_leviathan', speciesId: 'chitin_swarm', name: 'Bone-Purple Leviathan-Brood', colorHex: '#c9b8d4', paintHex: '#7e22ce', biomes: [5, 7, 12, 14], totem: 'Norn-Queen', trait: 'Strong' },
		{ id: 'chitin_behemoth', speciesId: 'chitin_swarm', name: 'Crimson-Shell Behemoth-Brood', colorHex: '#9e2b35', paintHex: '#14b8a6', biomes: [1, 3, 13, 16], totem: 'Carnifex-Maw', trait: 'Fierce' },
		{ id: 'chitin_gorgon', speciesId: 'chitin_swarm', name: 'Chameleon-Green Gorgon-Brood', colorHex: '#3b6e52', paintHex: '#bef264', biomes: [5, 6, 7, 8, 15], totem: 'Venom-Mantis', trait: 'Cruel' }
	]
};

export const VARIANT_BY_ID: Record<string, SpeciesVariant> = Object.fromEntries(
	Object.values(SPECIES_VARIANTS)
		.flat()
		.map((v) => [v.id, v])
);

function hashVariantSeed(speciesId: string, biome: number, seedHash: number): number {
	let h = (2166136261 ^ Math.imul(biome | 0, 0x9e3779b1) ^ Math.imul(seedHash | 0, 0x85ebca6b)) >>> 0;
	for (let i = 0; i < speciesId.length; i++) {
		h ^= speciesId.charCodeAt(i);
		h = Math.imul(h, 16777619) >>> 0;
	}
	h ^= h >>> 16;
	h = Math.imul(h, 0x7feb352d) >>> 0;
	h ^= h >>> 15;
	return h >>> 0;
}

/**
 * Deterministically select a colored subrace / tribal lineage for a species, biome, and culture/seed hash
 * without consuming any draws from the main simulation PRNG stream.
 */
export function getCultureVariant(speciesId: string, biome: number, seedHash = 1): SpeciesVariant {
	const list = SPECIES_VARIANTS[speciesId] ?? SPECIES_VARIANTS.human;
	const h = hashVariantSeed(speciesId, biome, seedHash);
	const biomeMatches = list.filter((v) => v.biomes.includes(biome));
	const pool = biomeMatches.length > 0 ? biomeMatches : list;
	return pool[h % pool.length] ?? list[0];
}

/**
 * Pick a colored subrace / tribal lineage using a supplied PRNG stream, weighted toward matching biomes.
 */
export function pickSpeciesVariant(speciesId: string, biome: number, rng: Rng): SpeciesVariant {
	const list = SPECIES_VARIANTS[speciesId] ?? SPECIES_VARIANTS.human;
	const biomeMatches = list.filter((v) => v.biomes.includes(biome));
	const pool = biomeMatches.length > 0 ? biomeMatches : list;
	return pool[Math.floor(rng() * pool.length)] ?? list[0];
}

/** per-world race setup: `allow` restricts which species cultures get (null = all), `custom` adds new races */
export interface RaceConfig {
	allow: string[] | null;
	custom?: SpeciesDef[];
}

const BUILTIN_COUNT = SPECIES.length;
let activeAllow: string[] | null = null;

const clampN = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const LAYER_KINDS: LayerKind[] = ['surface', 'deep', 'sky', 'sea'];

/** make a user-defined race safe: id prefix `x-`, clamped stats, never empty lists */
export function sanitizeRace(r: Partial<SpeciesDef>, index: number): SpeciesDef {
	const name = String(r.name || `Race ${index + 1}`).slice(0, 24);
	const slug = String(r.id || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/^x-/, '') || `race${index + 1}`;
	const m = r.mods ?? ({} as SpeciesDef['mods']);
	const layers = (r.layers ?? []).filter((l) => LAYER_KINDS.includes(l));
	const forms = (r.forms ?? []).map((f) => String(f).trim()).filter(Boolean).slice(0, 8);
	return {
		id: `x-${slug}`,
		name,
		plural: String(r.plural || `${name}s`).slice(0, 24),
		adjective: String(r.adjective || name).slice(0, 24),
		icon: String(r.icon || '🧬').slice(0, 4),
		desc: String(r.desc || `A custom people: the ${name}.`).slice(0, 200),
		mods: { martial: clampN(m.martial, -5, 8, 0), diplomacy: clampN(m.diplomacy, -5, 8, 0), stewardship: clampN(m.stewardship, -5, 8, 0), intrigue: clampN(m.intrigue, -5, 8, 0), health: clampN(m.health, -30, 60, 0) },
		lifespanMult: clampN(r.lifespanMult, 0.3, 10, 1),
		biomes: (r.biomes ?? []).filter((b) => Number.isInteger(b) && b >= 0 && b <= 16),
		layers: layers.length ? layers : ['surface'],
		traits: (r.traits ?? []).slice(0, 4),
		forms: forms.length ? forms : ['Kingdom', 'Clanhold']
	};
}

/**
 * Apply a world's race config to the (module-level) registry. Called at the start of generation and in the
 * Simulation constructor, so worker and main thread agree. Replaces any custom races from an earlier world.
 */
export function setRaces(cfg?: RaceConfig | null) {
	SPECIES.length = BUILTIN_COUNT;
	for (const id of Object.keys(SPECIES_BY_ID)) if (id.startsWith('x-')) delete SPECIES_BY_ID[id];
	(cfg?.custom ?? []).forEach((c, i) => {
		const sp = sanitizeRace(c, i);
		if (SPECIES_BY_ID[sp.id]) sp.id = `${sp.id}-${i}`;
		SPECIES.push(sp);
		SPECIES_BY_ID[sp.id] = sp;
	});
	const allow = (cfg?.allow ?? []).filter((id) => SPECIES_BY_ID[id]);
	activeAllow = allow.length ? allow : null;
}

/** with an allow-list: pick only among allowed races, weighted by layer and biome fit */
function pickAllowed(rng: Rng, biome: number, layer: LayerKind, allow: string[]): SpeciesDef {
	const pool = allow.map((id) => SPECIES_BY_ID[id]);
	if (pool.length === 1) return pool[0];
	const w = pool.map((sp) => (sp.layers.includes(layer) ? 3 : 0.6) * (sp.biomes.includes(biome) ? 2.4 : 1));
	let roll = rng() * w.reduce((a, b) => a + b, 0);
	for (let i = 0; i < pool.length; i++) if ((roll -= w[i]) <= 0) return pool[i];
	return pool[0];
}

/** Pick an appropriate species for a culture based on biome, layer, and PRNG */
export function pickSpeciesForCulture(
	rng: Rng,
	biome: number,
	layer: LayerKind,
	sphereId: string
): SpeciesDef {
	if (activeAllow) return pickAllowed(rng, biome, layer, activeAllow);
	// Deep layer defaults heavily to dwarves, ratfolk, goblins, tomb revenants, trolls, etc.
	if (layer === 'deep') {
		const roll = rng();
		if (roll < 0.28) return SPECIES_BY_ID['dwarf'];
		if (roll < 0.46) return SPECIES_BY_ID['ratfolk'];
		if (roll < 0.60) return SPECIES_BY_ID['goblin'];
		if (roll < 0.72) return SPECIES_BY_ID['tomb_undead'];
		if (roll < 0.82) return SPECIES_BY_ID['troll'];
		if (roll < 0.90) return SPECIES_BY_ID['chitin_swarm'];
		if (roll < 0.96) return SPECIES_BY_ID['warp_fiend'];
		return SPECIES_BY_ID['saurian'];
	}

	// Sea layer defaults to merfolk
	if (layer === 'sea') {
		return SPECIES_BY_ID['merfolk'];
	}

	// Sky layer defaults to celestials, void elves, elves, or giants
	if (layer === 'sky') {
		const roll = rng();
		if (roll < 0.35) return SPECIES_BY_ID['celestial'];
		if (roll < 0.60) return SPECIES_BY_ID['void_elf'];
		if (roll < 0.82) return SPECIES_BY_ID['elf'];
		if (roll < 0.93) return SPECIES_BY_ID['giant'];
		return SPECIES_BY_ID['warp_fiend'];
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

			// Mountain peaks favour giants, dwarves, and ogors
			if (biome === 10) {
				if (sp.id === 'giant') w = 4.0;
				if (sp.id === 'dwarf') w = 3.0;
				if (sp.id === 'ogor') w = 3.5;
			}
			// Swamps and jungles favour beastmen, trolls, lizardfolk, ratfolk, and chitin swarm
			if (biome === 7 || biome === 8 || biome === 12) {
				if (sp.id === 'beastman' || sp.id === 'troll') w = 3.5;
				if (sp.id === 'lizardfolk') w = 4.0;
				if (sp.id === 'ratfolk') w = 3.0;
				if (sp.id === 'chitin_swarm') w = 2.5;
			}
			// Old growth forests favour elves and halflings
			if (biome === 6 || biome === 12) {
				if (sp.id === 'elf') w = 3.5;
				if (sp.id === 'halfling') w = 2.5;
			}
			// Steppes and cold deserts favour orcs, ogors, and saurians
			if (biome === 2 || biome === 3) {
				if (sp.id === 'ogor') w = 3.5;
				if (sp.id === 'orc') w = 3.0;
			}
			// Hot arid deserts favour tomb revenants and saurians
			if (biome === 1) {
				if (sp.id === 'tomb_undead') w = 4.0;
				if (sp.id === 'saurian') w = 3.0;
			}
			// Volcanic ashlands and lava flats favour warp fiends, chitin swarm, saurians, and orcs
			if (biome === 13 || biome === 15 || biome === 16) {
				if (sp.id === 'warp_fiend') w = 4.5;
				if (sp.id === 'chitin_swarm') w = 3.0;
				if (sp.id === 'orc' || sp.id === 'saurian') w = 2.5;
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

/**
 * Racial trade-offs (sim/sentiment.ts applies them, scaled by `GenOptions.racialStrength`).
 * econ / army / growth are multipliers around 1, `stab` is a stability shift in points at strength 1,
 * `unrest` multiplies riot odds, `adapt` multiplies how hard mixed company hits a realm (low = adaptable).
 */
export interface RacialFx { econ: number; army: number; stab: number; growth: number; unrest: number; adapt: number }

export const NEUTRAL_FX: RacialFx = { econ: 1, army: 1, stab: 0, growth: 1, unrest: 1, adapt: 1 };

const FX: Record<string, Partial<RacialFx>> = {
	human: { econ: 1.04, stab: 0.5, adapt: 0.6 },
	elf: { econ: 1.03, army: 0.95, stab: 2, growth: 0.82, unrest: 0.9 },
	dwarf: { econ: 1.14, army: 1.08, stab: 1, growth: 0.85, unrest: 0.9 },
	orc: { econ: 0.94, army: 1.18, stab: -4, growth: 1.08, unrest: 1.3 },
	troll: { econ: 0.88, army: 1.18, stab: -3, growth: 0.95, unrest: 1.2 },
	beastman: { econ: 0.95, army: 1.1, stab: -1, growth: 1.05 },
	halfling: { econ: 1.1, army: 0.88, stab: 3, growth: 1.03, unrest: 0.85, adapt: 0.8 },
	giant: { econ: 0.95, army: 1.2, growth: 0.8 },
	goblin: { econ: 1.02, army: 0.95, stab: -3, growth: 1.15, unrest: 1.2 },
	saurian: { army: 1.12, stab: 1, growth: 0.92 },
	merfolk: { econ: 1.08, army: 0.95, growth: 0.95 },
	celestial: { econ: 1.05, stab: 3, growth: 0.75 },
	ratfolk: { army: 0.92, stab: -3, growth: 1.2, unrest: 1.15 },
	lizardfolk: { econ: 1.05, army: 1.08, stab: 1, growth: 0.9 },
	tomb_undead: { army: 1.15, stab: 2, growth: 0.7 },
	ogor: { econ: 0.88, army: 1.15, stab: -2 },
	void_elf: { econ: 1.06, growth: 0.78 },
	warp_fiend: { econ: 0.85, army: 1.2, stab: -5, growth: 0.9, unrest: 1.35 },
	chitin_swarm: { econ: 0.92, army: 1.15, stab: -2, growth: 1.15 }
};

/** a species' trade-offs: the table above, or derived from stats and lifespan for custom races */
export function racialFx(id: string): RacialFx {
	const o = FX[id];
	if (o) return { ...NEUTRAL_FX, ...o };
	const sp = SPECIES_BY_ID[id];
	if (!sp) return NEUTRAL_FX;
	const m = sp.mods;
	const c = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
	return {
		econ: c(1 + 0.02 * m.stewardship, 0.85, 1.15),
		army: c(1 + 0.02 * m.martial, 0.88, 1.2),
		stab: c(0.6 * m.diplomacy, -5, 4),
		growth: c(1.05 - 0.05 * sp.lifespanMult, 0.75, 1.1),
		unrest: c(1 - 0.03 * m.diplomacy + 0.02 * Math.max(0, m.martial), 0.85, 1.3),
		adapt: 1
	};
}
