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
