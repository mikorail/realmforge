/**
 * The culture pack: the optional per-culture depth Realmforge ships to Wanderer (customs, voice, faith lore,
 * literature, material life, language) plus a small `voice` per notable person.
 *
 * SHARED SCHEMA. The Go mirror is `realmforge-wanderer/engine/culturepack.go`; keep both in step.
 * Every field is optional and omitted when empty (old world files still load). Everything is a pure function of
 * the world seed (side rngs `seed:cp:<part>:<id>`, never `sim.rng`), so the simulation never shifts.
 *
 * Text rules: no em dashes. Placeholders left for the engine to fill: {name} {title} {realm} {town} {culture}
 * {faith} {deity} {time} {kin} {item}. Lines are short (under 120 characters) so they fit a dialogue box.
 */

export const PACK_VERSION = 1;

/** the acts the engine can recognise. A taboo or rule names one; unrecognised acts are flavour only. */
export const ACTS = [
	'draw_weapon_indoors', // drawing a weapon in a hall, temple or home
	'refuse_hospitality', // turning down food, drink or a roof
	'refuse_gift',
	'insult_ancestors',
	'blaspheme',
	'work_on_holy_day',
	'speak_before_elder', // speaking first to an elder or a ruler
	'bare_head',
	'bare_arms',
	'public_anger', // shouting, threatening, brawling in public
	'stare',
	'eat_unclean', // eating a forbidden food
	'eat_alone',
	'enter_unbidden', // entering a home or hall uninvited
	'turn_back', // turning your back on a host or ruler
	'break_oath',
	'haggle_sacred', // bargaining over holy things or at a festival
	'wear_forbidden_color',
	'touch_head',
	'left_hand', // offering with the wrong hand
	'whistle_night',
	'waste_food',
	'drink_to_excess',
	'shirk_duty' // missing a communal duty, watch or muster
] as const;
export type ActId = (typeof ACTS)[number];

export type Register = 'formal' | 'blunt' | 'flowery' | 'terse' | 'earthy' | 'courtly';
export type Rank = 'low' | 'common' | 'high' | 'noble' | 'ruler' | 'priest' | 'elder' | 'stranger';
export type Punishment = 'none' | 'fine' | 'scorn' | 'exile' | 'lash' | 'mutilation' | 'hang' | 'weregild' | 'ordeal' | 'enslave' | 'duel';

// ---------- customs ----------

export interface Taboo {
	id: string;
	act: ActId;
	/** one sentence: what the culture holds and why */
	text: string;
	/** 1 = a frown, 2 = an insult, 3 = blood or banishment */
	severity: 1 | 2 | 3;
	/** how the offence is met */
	penalty: Punishment;
	/** a line an offended local says */
	rebuke: string;
	/** where it applies, empty = everywhere in the culture's lands */
	where?: 'home' | 'hall' | 'temple' | 'market' | 'road' | 'table' | 'feast';
}

export interface Etiquette {
	id: string;
	kind: 'greeting' | 'gesture' | 'gift' | 'food' | 'speech' | 'dress' | 'space' | 'time';
	/** the rule as a traveller's note */
	text: string;
	/** doing it right earns this much goodwill, 0 = none */
	reward?: number;
}

export interface Hospitality {
	/** days a guest is under protection */
	guestRight: number;
	/** what a host offers, in order */
	offers: string[];
	/** what a guest owes */
	duties: string[];
	/** what happens when guest right is broken */
	breach: string;
}

export interface Rite {
	id: 'birth' | 'naming' | 'comingofage' | 'betrothal' | 'wedding' | 'funeral' | 'oath' | 'harvest' | 'departure' | 'homecoming' | 'initiation';
	name: string;
	/** ordered steps, each one short sentence */
	steps: string[];
	roles?: string[];
	gifts?: string[];
	dress?: string;
	song?: string;
}

export interface FeastRitual {
	/** the feast's name as in `feasts[]` */
	feast: string;
	steps: string[];
	offerings: string[];
	dress?: string;
	food?: string;
	song?: string;
	taboo?: string;
	/** a game, contest or custom played that day */
	custom?: string;
}

export interface LawEntry {
	crime: 'theft' | 'murder' | 'adultery' | 'blasphemy' | 'debt' | 'trespass' | 'assault' | 'treason' | 'forgery' | 'smuggling';
	punish: Punishment;
	/** one line of how it is judged */
	note: string;
}

export interface CustomsPack {
	taboos?: Taboo[];
	etiquette?: Etiquette[];
	hospitality?: Hospitality;
	rites?: Rite[];
	festivals?: FeastRitual[];
	law?: { judge: string; ordeal?: string; entries: LawEntry[] };
	/** what the culture counts as a good death, a good host, a good name */
	ideals?: { death?: string; host?: string; name?: string; wealth?: string };
}

// ---------- voice ----------

export interface VoicePack {
	register: Register;
	greet?: string[]; // {name} {title} {time}
	farewell?: string[];
	thanks?: string[];
	apology?: string[];
	agree?: string[];
	refuse?: string[];
	praise?: string[];
	insults?: string[];
	curses?: string[];
	oaths?: string[];
	/** culture-wide filler words and speech tics ("well then", "by the river") */
	fillers?: string[];
	proverbs?: string[];
	idioms?: { say: string; meaning: string }[];
	honorifics?: Partial<Record<Rank, string>>;
	/** how to address someone: formal and familiar forms with {name} */
	address?: { formal: string; familiar: string };
	humour?: string;
	/** short ambient lines by setting */
	barks?: Partial<Record<'market' | 'guard' | 'tavern' | 'temple' | 'road' | 'night' | 'rain' | 'crowd' | 'smith' | 'farm' | 'harbor' | 'school', string[]>>;
	/** how gossip opens and how a rumour is passed on */
	gossip?: string[];
}

/** a notable's own speech habits, layered on the culture's voice */
export interface PersonVoice {
	/** adjusts the culture register: -1 plainer, 0 as culture, 1 grander */
	tone?: -1 | 0 | 1;
	tics?: string[];
	oath?: string;
	temper?: 'calm' | 'proud' | 'anxious' | 'wry' | 'gruff' | 'warm' | 'cold' | 'eager';
	beliefs?: string[];
	quirks?: string[];
	/** one thing they always bring up */
	topic?: string;
}

// ---------- faith ----------

export interface FaithPack {
	prayers?: string[];
	liturgy?: { name: string; steps: string[] };
	scripture?: { title: string; excerpts: string[] };
	saints?: { name: string; legend: string; feast?: string }[];
	heresies?: { name: string; claim: string }[];
	afterlife?: string;
	holyDays?: { name: string; month: number; rite: string }[];
	blessings?: string[];
	sins?: string[];
	/** how clergy greet the faithful and the stranger */
	clergy?: { greetFaithful: string; greetStranger: string; title?: string };
	/** what the faith asks of its followers each day, week, year */
	observances?: string[];
}

// ---------- literature ----------

export type LitForm = 'epic' | 'ballad' | 'history' | 'sermon' | 'satire' | 'tale' | 'lament' | 'hymn' | 'proverb' | 'love' | 'dispatch' | 'travelogue' | 'riddle';
export type LitBias = 'propagandist' | 'pious' | 'cynical' | 'partisan' | 'romantic' | 'neutral';

export interface Work {
	id: string;
	form: LitForm;
	title: string;
	author: string;
	bias: LitBias;
	year: number;
	/** the simulated event this is about, if any (ChronEvent index), else a legend */
	event?: number;
	/** 3 to 8 short lines or verses: an excerpt, not the whole */
	lines: string[];
	/** what a reader can learn: a true fact, a flattering lie, a place, a custom */
	reveals?: string;
}

export interface PoeticForm {
	name: string;
	rule: string;
	example: string[];
}

export interface LiteraturePack {
	forms?: PoeticForm[];
	works?: Work[];
	/** what the culture reads and sings, by taste */
	taste?: string;
}

// ---------- material ----------

export interface Dish {
	name: string;
	/** ingredients, local names */
	with: string[];
	/** the cooking tag the engine knows: hearty spry thick mending keen ember rime deep lasting venom */
	tag: string;
	note?: string;
	/** feast kind it belongs to, if any */
	feast?: string;
}

export interface Craft {
	name: string;
	goods: string[];
	/** what makes it distinctive */
	mark?: string;
}

export interface MaterialPack {
	cuisine?: { staples: string[]; dishes: Dish[]; drinks: string[]; meals?: string[]; unclean?: string[] };
	crafts?: Craft[];
	tradeGoods?: { name: string; kind: string; value: number }[];
	dress?: Partial<Record<'low' | 'common' | 'high' | 'ritual' | 'mourning' | 'wedding' | 'war', string>>;
	buildings?: { materials: string[]; house: string; hall: string; temple: string; gate?: string; roof?: string; color?: string; ornament?: string };
	music?: { instruments: string[]; forms: string[]; scale?: string };
	games?: { name: string; rule: string }[];
	/** a short note on how the land shapes daily life */
	land?: string;
}

// ---------- language ----------

export interface LangPack {
	/** about 60 everyday words: [word, gloss] */
	lexicon?: [string, string][];
	/** sounds the language uses and how words are built, for readers */
	phonology?: { consonants: string; vowels: string; shape: string };
	/** phrases in the language with glosses: greeting, toast, thanks, farewell */
	phrases?: { say: string; gloss: string; use: 'greet' | 'toast' | 'thanks' | 'farewell' | 'curse' | 'oath' | 'blessing' }[];
	numerals?: string[];
}

// ---------- the pack ----------

export interface CulturePack {
	v: number;
	customs?: CustomsPack;
	voice?: VoicePack;
	literature?: LiteraturePack;
	material?: MaterialPack;
	lang?: LangPack;
}
