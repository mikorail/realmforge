export type Role =
	| 'ruler'
	| 'heir'
	| 'general'
	| 'merchant'
	| 'trader'
	| 'entrepreneur'
	| 'priest'
	| 'wanderer'
	| 'hero'
	| 'villain'
	| 'prophet'
	| 'magician'
	| 'thinker'
	| 'artist'
	| 'athlete'
	| 'inventor';

export type IdeologyKind =
	| 'monarchy'
	| 'republic'
	| 'theocracy'
	| 'oligarchy'
	| 'autocracy'
	| 'communal'
	| 'technocracy';

export interface Faction {
	id: string;
	name: string;
	ideology: IdeologyKind;
	influence: number; // 0..100
	leaderId: number;
	militancy: number; // 0..100
}

export interface Person {
	id: number;
	name: string;
	house: string;
	born: number;
	culture: number;
	religion: number;
	/** polity they serve (0 = none) */
	state: number;
	burg: number;
	role: Role;
	martial: number;
	diplomacy: number;
	stewardship: number;
	intrigue: number;
	health: number;
	gold: number;
	renown: number;
	alive: boolean;
	died?: number;
	cause?: string;
	traits: string[];
	parent: number;
	/** merchant cargo bought at burg for cost */
	cargo?: { from: number; cost: number };
	species?: string;
	magnumOpus?: string;
	/** avatar life goals (ambitions.ts) */
	ambition?: string;
	ambitionChoices?: string[];
	ambitionsDone?: string[];
	visited?: number[];
	companions?: number[];
	companionOf?: number;
	rival?: number;
	/** story layer (sim/story): regnal number in their realm, epithet earned at death, sphere-ordered everyday name */
	regnal?: number;
	epithet?: string;
	plain?: string;
}

export interface Polity {
	id: number;
	name: string;
	form: string;
	fullName: string;
	color: string;
	capital: number;
	culture: number;
	religion: number;
	alive: boolean;
	founded: number;
	fell?: number;
	treasury: number;
	army: number;
	stability: number;
	tax: number;
	ruler: number;
	heir: number;
	relations: Record<number, number>;
	allies: number[];
	cells: number;
	pop: number;
	peak: number;
	expansionism: number;
	/** origin: 'founding' | 'rebellion' | 'tribe' | 'avatar' | 'rift' | 'scourge' | 'prophet' | 'species' | 'alien' | 'coup' */
	origin: string;
	/** home layer index */
	layer: number;
	species?: string;
	ideology?: IdeologyKind;
	factions?: Faction[];
	spymaster?: number;
	patronDeity?: string;
	patronDomain?: string;
	patronFavor?: number;
	isChosenRealm?: boolean;
	secularized?: boolean;
	secularYear?: number;
	reformed?: boolean;
	reformedSystemYear?: number;
	previousForm?: string;
	systemChangeCause?: string;
	/** suzerain polity id when this realm is a vassal */
	overlord?: number;
	vassalSince?: number;
	/** set when absorbed peacefully / by union / annexation */
	mergedInto?: number;
	/** story layer: named eras (every 20 years), the current one, and the realm's rulers in order */
	eras?: { from: number; to: number; name: string }[];
	era?: string;
	/** land held when the last era was named (growth/decline between eras) */
	eraCells?: number;
	reigns?: { id: number; given: string; from: number }[];
}

export interface War {
	id: number;
	name: string;
	attackers: number[];
	defenders: number[];
	start: number;
	end?: number;
	/** cells taken by attackers minus defenders */
	score: number;
	months: number;
	startArmy: [number, number];
	winner?: 'attackers' | 'defenders' | 'white';
	/** chronicle event that declared it (cause chains) */
	ev?: number;
	/** perspective names: [attackers' culture name, attackers' name for it, defenders' culture name, defenders' name for it] */
	aliases?: [string, string, string, string];
}

export type CovertOpKind = 'sabotage' | 'incite_revolt' | 'assassinate' | 'siphon' | 'sow_distrust';

export interface CovertMission {
	id: number;
	sourceState: number;
	targetState: number;
	kind: CovertOpKind;
	operativeName: string;
	success: boolean;
	discovered: boolean;
	year: number;
	summary: string;
}

export type QuestKind = 'subjugation' | 'treasure' | 'rescue' | 'expedition';
export type QuestStage = 'scouting' | 'confrontation' | 'climax' | 'completed' | 'failed';

export interface Quest {
	id: number;
	title: string;
	kind: QuestKind;
	icon: string;
	heroId: number;
	heroName: string;
	stateId: number;
	targetCell: number;
	targetName: string;
	stage: QuestStage;
	progress: number;
	reward: string;
	storyLog: string[];
	completed: boolean;
	/** sphere quest id (culture/spherequests.ts); unset for ordinary quests */
	sq?: string;
	year: number;
}

export type EventKind =
	| 'war'
	| 'peace'
	| 'death'
	| 'birth'
	| 'found'
	| 'fall'
	| 'rebel'
	| 'disaster'
	| 'god'
	| 'avatar'
	| 'faith'
	| 'misc'
	| 'capture'
	| 'monster'
	| 'wonder'
	| 'luminary'
	| 'tech'
	| 'coup'
	| 'intrigue'
	| 'quest'
	| 'eco_disaster'
	| 'uprising'
	| 'culture';

export type UprisingKind = 'riot' | 'cult' | 'prophet' | 'hero' | 'mutiny' | 'slave_revolt';

export interface UprisingRecord {
	id: number;
	kind: UprisingKind;
	subtype: string;
	title: string;
	burgId: number;
	burgName: string;
	stateId: number;
	stateName: string;
	year: number;
	cell: number;
	leaderName?: string;
	leaderId?: number;
	description: string;
	active: boolean;
}

export interface ChronEvent {
	id?: number;
	y: number;
	m: number;
	kind: EventKind;
	text: string;
	cell?: number;
	state?: number;
	detail?: string;
	/** id of an earlier event that led to this one (story/chains.ts) */
	cause?: number;
	/** what sort of event it is for cause chains: famine, plague, riot, revolt, coup, capital, war, epoch ... */
	tag?: string;
}

export interface Monster {
	id: number;
	name: string;
	species: string;
	tier: 'legendary' | 'mythos' | 'apex' | 'dread' | 'cataclysm';
	category: 'biblical' | 'guardian' | 'mythos' | 'dragon' | 'sea_terror' | 'herd' | 'folklore';
	icon: string;
	cell: number;
	layer: number;
	x: number;
	y: number;
	power: number;
	health: number;
	maxHealth: number;
	alive: boolean;
	lairCell: number;
	lairName: string;
	behavior: 'dormant' | 'roaming' | 'hunting' | 'rampage';
	slayer?: string;
	slainYear?: number;
	lore: string;
	armor?: number;
	regen?: number;
	trophy?: string;
	hardToKill?: boolean;
}

export interface LegendaryPlace {
	id: number;
	name: string;
	kind:
		| 'world_tree'
		| 'tower_magic'
		| 'tower_trials'
		| 'bridge'
		| 'university'
		| 'giant_harbor'
		| 'metropolis'
		| 'ancient_forge'
		| 'sunken_citadel'
		| 'titan_shrine';
	icon: string;
	cell: number;
	layer: number;
	x: number;
	y: number;
	burgId?: number;
	stateId?: number;
	description: string;
	lore: string;
	fame: number;
	effect: string;
	builtYear: number;
	builder?: string;
	monumentTo?: string;
	destroyed?: boolean;
	destroyedYear?: number;
	destroyer?: string;
	ruinCause?: string;
}

export interface Travel {
	path: number[];
	leg: number;
	days: number;
	legDays: number;
}

export interface Encounter {
	id: string;
	title: string;
	text: string;
	options: EncounterOption[];
}

export interface EncounterOption {
	label: string;
	stat?: 'martial' | 'diplomacy' | 'stewardship' | 'intrigue';
	dc?: number;
	win: Effects;
	lose?: Effects;
}

export interface Effects {
	text: string;
	gold?: number;
	renown?: number;
	health?: number;
	martial?: number;
	diplomacy?: number;
	stewardship?: number;
	intrigue?: number;
	trait?: string;
	follow?: string;
}

export interface ArmyToken {
	id: number;
	warId: number;
	polityId: number;
	name: string;
	size: number;
	x: number;
	y: number;
	targetX: number;
	targetY: number;
	color: string;
}

export interface HistorySnapshot {
	year: number;
	surfaceStates: Uint16Array;
	activeRealms: number;
	activeWars: number;
}
