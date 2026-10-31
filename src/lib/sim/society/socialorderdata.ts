/**
 * Social orders data: the five orders, their genre/fantasy forms, choice affinities and chronicle lines.
 * In-world pressures only: unfree orders pay in unrest, revolts and stagnation, and abolition can win.
 */
import type { Genre } from '../../gen/genre';
import type { TraitKey } from '../culture/profile';
import type { SectorKey } from '../sectors';

export type OrderKind = 'free' | 'caste' | 'feudal' | 'slave' | 'egalitarian';
export const ORDER_KINDS: OrderKind[] = ['free', 'caste', 'feudal', 'slave', 'egalitarian'];

export interface OrderDef {
	name: string;
	icon: string;
	blurb: string;
	/** flat output change on top of the sector-weighted part */
	out: number;
	/** output change per sector share (weighted average over the realm's sector mix) */
	sector: Partial<Record<SectorKey, number>>;
	/** yearly stability nudge (economy drifts 20%/yr toward its target, so the offset is about 5x this) */
	stab: number;
	/** multiplier on uprising odds */
	unrest: number;
	/** innovation weight (by population share of the world) */
	innov: number;
	/** yearly policy push into sectors (sectors.ts pushSector) */
	push: Partial<Record<SectorKey, number>>;
	/** yearly growth of the reform / abolition pressure; 0 = no movement */
	pressure: number;
}

export const ORDER_DEFS: Record<OrderKind, OrderDef> = {
	free: {
		name: 'Free', icon: '🕊', blurb: 'Free subjects who sell their labour and move as they will. Trade and learning flourish.',
		out: -0.05, sector: { trade: 0.2, crafts: 0.1, scholarship: 0.12, industry: 0.08, seafaring: 0.06 }, stab: 0, unrest: 1, innov: 0.3,
		push: { trade: 0.01, scholarship: 0.005 }, pressure: 0
	},
	caste: {
		name: 'Caste', icon: '🪜', blurb: 'Birth fixes every station. Stable and pious, but slow to change or learn.',
		out: -0.01, sector: { crafts: 0.15, faith: 0.15, farming: 0.05, scholarship: -0.1, trade: -0.05 }, stab: 0.5, unrest: 0.9, innov: -0.4,
		push: { faith: 0.008, crafts: 0.006 }, pressure: 0.45
	},
	feudal: {
		name: 'Feudal', icon: '🏰', blurb: 'Lords hold the land and those who work it owe them labour and levies.',
		out: -0.01, sector: { farming: 0.12, military: 0.15, trade: -0.05, industry: -0.04 }, stab: 0.2, unrest: 1.05, innov: -0.12,
		push: { farming: 0.008, military: 0.006 }, pressure: 0.6
	},
	slave: {
		name: 'Unfree labour', icon: '⛓', blurb: 'The unfree do the heavy work. High output from fields and mines, paid for in unrest, risings and stagnation.',
		out: 0, sector: { mining: 0.3, farming: 0.2, industry: 0.12, crafts: -0.05, scholarship: -0.15 }, stab: -0.6, unrest: 1.15, innov: -0.3,
		push: { mining: 0.01, farming: 0.008 }, pressure: 1.1
	},
	egalitarian: {
		name: 'Egalitarian', icon: '🤝', blurb: 'Land and labour held in common. Content and steady, but poorer in coin and arms.',
		out: -0.04, sector: { farming: 0.08, crafts: 0.05, scholarship: 0.05, trade: -0.08, military: -0.08 }, stab: 0.2, unrest: 0.95, innov: 0.1,
		push: { farming: 0.006, crafts: 0.006 }, pressure: 0
	}
};

export interface OrderForm {
	id: string;
	kind: OrderKind;
	name: string;
	/** who works under it, for the chronicle */
	workers: string;
	/** genres it belongs to; null = fantasy and mythic */
	genres: Genre[] | null;
	/** constructs or spirits instead of people: less unrest, no moral movement, but they can break their bonds */
	construct?: boolean;
	/** small pick bonuses */
	species?: string[];
	spheres?: string[];
	doctrines?: string[];
	traits?: TraitKey[];
	ideologies?: string[];
}

const PUNK: Genre[] = ['steampunk', 'dieselpunk', 'atompunk'];
export const ORDER_FORMS: OrderForm[] = [
	// free
	{ id: 'freefolk', kind: 'free', name: 'Free folk', workers: 'free folk', genres: null },
	{ id: 'freeguilds', kind: 'free', name: 'Free guilds', workers: 'guildsfolk', genres: null, traits: ['mercantile'] },
	{ id: 'citizenry', kind: 'free', name: 'Free citizenry', workers: 'citizens', genres: null, ideologies: ['republic', 'oligarchy'] },
	{ id: 'wage', kind: 'free', name: 'Wage labour', workers: 'wage workers', genres: PUNK },
	{ id: 'contract', kind: 'free', name: 'Free contractors', workers: 'freelancers', genres: ['cyberpunk', 'biopunk', 'solarpunk'] },
	// caste
	{ id: 'caste', kind: 'caste', name: 'Caste order', workers: 'low castes', genres: null },
	{ id: 'guildcaste', kind: 'caste', name: 'Guild castes', workers: 'lesser guilds', genres: null, species: ['dwarf', 'gnome', 'halfling'], traits: ['ancestral'] },
	{ id: 'priestcaste', kind: 'caste', name: 'Priestly castes', workers: 'lay castes', genres: null, ideologies: ['theocracy'], traits: ['pious'] },
	{ id: 'clearance', kind: 'caste', name: 'Clearance castes', workers: 'uncleared', genres: PUNK },
	{ id: 'credit', kind: 'caste', name: 'Credit castes', workers: 'low-score citizens', genres: ['cyberpunk', 'solarpunk'] },
	{ id: 'gene', kind: 'caste', name: 'Gene castes', workers: 'unmodded', genres: ['biopunk'] },
	// feudal
	{ id: 'serfdom', kind: 'feudal', name: 'Serfdom', workers: 'serfs', genres: null },
	{ id: 'manor', kind: 'feudal', name: 'Manorial fiefs', workers: 'tenants', genres: null, spheres: ['latin', 'celtic', 'slavic', 'japonic', 'sinic'] },
	{ id: 'company', kind: 'feudal', name: 'Company towns', workers: 'company hands', genres: PUNK },
	{ id: 'corpfief', kind: 'feudal', name: 'Corporate fiefs', workers: 'corp dependants', genres: ['cyberpunk', 'biopunk'] },
	{ id: 'stewardship', kind: 'feudal', name: 'Green stewardships', workers: 'stewards', genres: ['solarpunk'] },
	// unfree
	{ id: 'thralls', kind: 'slave', name: 'Thralldom', workers: 'thralls', genres: null, spheres: ['norse', 'celtic', 'slavic'] },
	{ id: 'bondage', kind: 'slave', name: 'Bondage', workers: 'bondsfolk', genres: null },
	{ id: 'spirits', kind: 'slave', name: 'Bound spirits', workers: 'bound spirits', genres: null, construct: true, species: ['elf', 'celestial', 'void_elf'], spheres: ['eldritch'], doctrines: ['esoteric'] },
	{ id: 'golems', kind: 'slave', name: 'Golem labour', workers: 'golems', genres: null, construct: true, species: ['dwarf', 'gnome', 'giant'], traits: ['scholarly'] },
	{ id: 'indenture', kind: 'slave', name: 'Indentured labour', workers: 'indentured', genres: PUNK },
	{ id: 'automata', kind: 'slave', name: 'Automaton labour', workers: 'automata', genres: PUNK, construct: true, traits: ['scholarly'] },
	{ id: 'debt', kind: 'slave', name: 'Debt bondage', workers: 'debtors', genres: ['cyberpunk'] },
	{ id: 'drones', kind: 'slave', name: 'Servitor drones', workers: 'servitor drones', genres: ['cyberpunk', 'solarpunk'], construct: true },
	{ id: 'vatborn', kind: 'slave', name: 'Vatborn indenture', workers: 'vatborn', genres: ['biopunk'] },
	// egalitarian
	{ id: 'clancommons', kind: 'egalitarian', name: 'Clan commons', workers: 'clansfolk', genres: null, traits: ['nomadic'] },
	{ id: 'commune', kind: 'egalitarian', name: 'Communes', workers: 'communards', genres: null, ideologies: ['communal'] },
	{ id: 'coop', kind: 'egalitarian', name: 'Workers\' cooperatives', workers: 'cooperators', genres: PUNK },
	{ id: 'mesh', kind: 'egalitarian', name: 'Mesh collectives', workers: 'collective members', genres: ['cyberpunk', 'biopunk'] },
	{ id: 'greencommons', kind: 'egalitarian', name: 'Green commons', workers: 'commoners', genres: ['solarpunk', 'biopunk'] }
];
export const FORM_BY_ID: Record<string, OrderForm> = Object.fromEntries(ORDER_FORMS.map((f) => [f.id, f]));

// ───────────── choice affinities (added to base weights) ─────────────
type W = Partial<Record<OrderKind, number>>;
export const BASE_WEIGHT: Record<OrderKind, number> = { free: 1, caste: 0.45, feudal: 1, slave: 0.55, egalitarian: 0.6 };
export const SPHERE_ORDER: Record<string, W> = {
	sinic: { feudal: 1, caste: 0.3 }, japonic: { feudal: 1.4, caste: 0.5 }, indic: { caste: 1, free: 0.4 }, sea: { free: 0.6, feudal: 0.4 },
	steppe: { egalitarian: 1.1, slave: 0.3 }, persian: { feudal: 0.6, free: 0.6 }, arabic: { free: 0.8, slave: 0.3 }, mande: { free: 0.6, caste: 0.4 },
	yoruba: { feudal: 0.5, egalitarian: 0.5 }, bantu: { egalitarian: 1, free: 0.4 }, ethiopic: { feudal: 1 }, nahua: { slave: 0.5, caste: 0.5 },
	maya: { caste: 0.7, feudal: 0.4 }, andean: { egalitarian: 0.8, caste: 0.5 }, turtle: { egalitarian: 1.4 }, inuit: { egalitarian: 1.4 },
	polynesian: { caste: 0.5, egalitarian: 0.6 }, norse: { slave: 0.6, free: 0.8 }, celtic: { free: 0.6, feudal: 0.5 }, latin: { slave: 0.6, free: 0.6 },
	slavic: { feudal: 1.1 }, eldritch: { slave: 0.9, caste: 0.6 }
};
export const TRAIT_ORDER: Record<TraitKey, W> = {
	martial: { feudal: 0.5, slave: 0.3 }, mercantile: { free: 0.8 }, ancestral: { caste: 0.5, feudal: 0.3 }, pious: { caste: 0.5, feudal: 0.3 },
	scholarly: { free: 0.5 }, nomadic: { egalitarian: 1 }, insular: { caste: 0.5 }, seafaring: { free: 0.5 }
};
export const DOCTRINE_ORDER: Record<string, W> = {
	caste: { caste: 2.5 }, liberation: { free: 1.2, egalitarian: 1 }, compassion: { free: 0.6, egalitarian: 0.6 }, militant: { feudal: 0.8, slave: 0.4 },
	ancestral: { caste: 0.6, feudal: 0.4 }, evangelical: { feudal: 0.4 }, esoteric: { caste: 0.4, slave: 0.3 }
};
/** doctrines that shrink the unfree weight (multiplier) */
export const DOCTRINE_SLAVE_MULT: Record<string, number> = { liberation: 0.2, compassion: 0.45 };
export const IDEOLOGY_ORDER: Record<string, W> = {
	monarchy: { feudal: 1 }, republic: { free: 1.5 }, theocracy: { caste: 1.2 }, oligarchy: { free: 0.6, slave: 0.5 },
	autocracy: { slave: 0.6, feudal: 0.6 }, communal: { egalitarian: 2.5 }, technocracy: { free: 1, caste: 0.4 }
};
/** realm sector share above the world mean (ratio − 1, clamped 0..1.5) */
export const SECTOR_ORDER: Partial<Record<SectorKey, W>> = {
	farming: { feudal: 0.6, slave: 0.3 }, mining: { slave: 0.6 }, trade: { free: 0.8 }, crafts: { caste: 0.4, free: 0.3 },
	military: { feudal: 0.5 }, faith: { caste: 0.5 }, scholarship: { free: 0.5 }, seafaring: { free: 0.3 }
};
export const GENRE_ORDER: Partial<Record<Genre, W>> = {
	solarpunk: { egalitarian: 1.5 }, cyberpunk: { caste: 0.6, slave: 0.2 }, biopunk: { caste: 0.5 }, steampunk: { feudal: 0.6, slave: 0.2 },
	dieselpunk: { feudal: 0.6 }, atompunk: { free: 0.4, caste: 0.3 }, mythic: { slave: 0.2, caste: 0.2 }
};
export const ORIGIN_ORDER: Record<string, W> = { tribe: { egalitarian: 1.5 }, prophet: { caste: 0.5, egalitarian: 0.5 }, rebellion: { free: 0.8, egalitarian: 0.5 } };

// ───────────── chronicle lines ({realm} {form} {workers} {ruler} {town} {new} {overlord} {movement}) ─────────────
export const MOVEMENT_NAME: Record<OrderKind, string[]> = {
	slave: ['an abolition movement', 'the cause of emancipation', 'a society of abolitionists'],
	caste: ['a movement against the castes', 'a creed of one station for all', 'a league of the low-born'],
	feudal: ['a movement of free tenants', 'a league of the landless', 'a call to break the lords\' hold'],
	free: [''], egalitarian: ['']
};

export const LINES = {
	movement: [
		'In {realm}, {movement} takes root among the {workers}, demanding an end to {form}.',
		'{movement} spreads through the towns of {realm}; pamphlets and sermons decry {form}.',
		'Whispers in the fields of {realm}: {movement} gathers the {workers} against {form}.'
	],
	reform: [
		'{ruler} of {realm} abolishes {form}: the {workers} go free and the realm adopts {new}.',
		'By decree, {realm} ends {form}. Bells ring in {town} as the realm adopts {new}.',
		'After long debate, {realm} lays {form} to rest and adopts {new}.'
	],
	crackdown: [
		'{realm} crushes {movement}; its leaders hang and the {workers} are bound tighter.',
		'Soldiers scatter {movement} in {town}; {realm} keeps {form} by force.',
		'{ruler} of {realm} outlaws {movement}. The {workers} fall silent, for now.'
	],
	civilwar: [
		'Civil war over {form}! {town} rises for the {workers} and breaks from {realm}.',
		'{movement} takes up arms: {town} renounces {form} and secedes from {realm}.'
	],
	rising: [
		'The {workers} of {town} rise against their masters in {realm}; the rising is put down at great cost.',
		'A revolt of {workers} burns the estates around {town}; {realm} restores order with the sword.',
		'Thousands of {workers} flee {town} into the hills, and {realm} hunts them for a season.'
	],
	breakfree: [
		'The {workers} of {town} slip their bindings and wreak ruin before {realm} binds them again.',
		'A flaw spreads through the {workers} of {town}; they turn on their makers until {realm} quells them.'
	],
	imposed: [
		'{overlord} imposes {new} upon its vassal {realm}.',
		'Under the hand of {overlord}, {realm} gives up {form} for {new}.'
	],
	conquest: [
		'Victorious in the field, {overlord} forces {new} upon the beaten {realm}.',
		'The peace dictated by {overlord} ends {form} in {realm}; {new} is imposed by the victors.'
	],
	regime: [
		'With the new regime, {realm} turns from {form} to {new}.',
		'The new rulers of {realm} sweep away {form} and decree {new}.'
	],
	drift: [
		'As {realm} grows rich and wide, it leaves its old {form} behind for {new}.',
		'The old commons no longer suffice for so wide a realm as {realm}; it turns to {new}.'
	],
	wardrift: [
		'Amid long wars, the folk of {realm} bind themselves to lords for safety, accepting {new}.',
		'Worn down by war, the free folk of {realm} trade their freedom for protection under {new}.'
	],
	divine: ['DIVINE MANDATE: a voice from the heavens moves {realm} to end {form}; the heavens proclaim {new} in every square.']
};
