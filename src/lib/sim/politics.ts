import type { Rng } from '../rng';
import type { ChronEvent, Faction, IdeologyKind, Person, Polity } from './types';
import { narrateSystemChange } from './chronicle';

export interface IdeologyDef {
	id: IdeologyKind;
	name: string;
	icon: string;
	defaultForm: string;
	forms: string[];
	titleFormat: (baseName: string) => string;
	titleTemplates: ((baseName: string) => string)[];
	rulerTitle: string;
	desc: string;
	bonus: {
		tax?: number;
		army?: number;
		stability?: number;
	};
}

export const IDEOLOGIES: Record<IdeologyKind, IdeologyDef> = {
	monarchy: {
		id: 'monarchy',
		name: 'Hereditary Monarchy',
		icon: '👑',
		defaultForm: 'Kingdom',
		forms: ['Kingdom', 'Empire', 'Grand Duchy', 'Principality', 'High Realm'],
		titleFormat: (b) => `Kingdom of ${b}`,
		titleTemplates: [
			(b) => `Kingdom of ${b}`,
			(b) => `Empire of ${b}`,
			(b) => `Grand Duchy of ${b}`,
			(b) => `Principality of ${b}`,
			(b) => `High Realm of ${b}`
		],
		rulerTitle: 'King',
		desc: 'Dynastic rule passed through royal bloodlines and noble lineage.',
		bonus: { stability: 6 }
	},
	republic: {
		id: 'republic',
		name: 'Civic Republic',
		icon: '🏛️',
		defaultForm: 'Republic',
		forms: ['Republic', 'Democratic Union', 'United Provinces', 'Free Commonwealth', 'Confederation'],
		titleFormat: (b) => `Republic of ${b}`,
		titleTemplates: [
			(b) => `Republic of ${b}`,
			(b) => `Democratic Union of ${b}`,
			(b) => `United Provinces of ${b}`,
			(b) => `Free Commonwealth of ${b}`,
			(b) => `Confederation of ${b}`
		],
		rulerTitle: 'Consul',
		desc: 'Representative governance by citizen assemblies and elected senates.',
		bonus: { tax: 0.04, stability: 4 }
	},
	theocracy: {
		id: 'theocracy',
		name: 'Holy Theocracy',
		icon: '☀️',
		defaultForm: 'Theocracy',
		forms: ['Holy See', 'Theocracy', 'Sacred Order', 'Patriarchate', 'Divine Realm'],
		titleFormat: (b) => `Holy See of ${b}`,
		titleTemplates: [
			(b) => `Holy See of ${b}`,
			(b) => `Theocracy of ${b}`,
			(b) => `Sacred Order of ${b}`,
			(b) => `Patriarchate of ${b}`,
			(b) => `Divine Realm of ${b}`
		],
		rulerTitle: 'High Pontiff',
		desc: 'Clerical rule guided by divine scripture and sacred mandates.',
		bonus: { stability: 8 }
	},
	oligarchy: {
		id: 'oligarchy',
		name: 'Merchant Oligarchy',
		icon: '⚖️',
		defaultForm: 'Merchant League',
		forms: ['Merchant League', 'Trade Federation', 'Commercial Union', 'Syndicate', 'Free Trading Cities'],
		titleFormat: (b) => `Merchant League of ${b}`,
		titleTemplates: [
			(b) => `Merchant League of ${b}`,
			(b) => `Trade Federation of ${b}`,
			(b) => `Commercial Union of ${b}`,
			(b) => `Syndicate of ${b}`,
			(b) => `Free Trading Cities of ${b}`
		],
		rulerTitle: 'Lord Chancellor',
		desc: 'Governance dominated by wealthy patricians, guildmasters, and trade cartels.',
		bonus: { tax: 0.08, army: -0.05 }
	},
	autocracy: {
		id: 'autocracy',
		name: 'Military Stratocracy',
		icon: '⚔️',
		defaultForm: 'Iron Dominion',
		forms: ['Iron Dominion', 'Military Junta', 'Grand Marshalate', 'Protectorate', 'Stratocracy'],
		titleFormat: (b) => `Iron Dominion of ${b}`,
		titleTemplates: [
			(b) => `Iron Dominion of ${b}`,
			(b) => `Military Junta of ${b}`,
			(b) => `Grand Marshalate of ${b}`,
			(b) => `Protectorate of ${b}`,
			(b) => `Stratocracy of ${b}`
		],
		rulerTitle: 'Lord Marshal',
		desc: 'Authoritarian martial junta governing through armed might and discipline.',
		bonus: { army: 0.2, stability: -5 }
	},
	communal: {
		id: 'communal',
		name: 'Agrarian Commonweal',
		icon: '🌾',
		defaultForm: 'Free Union',
		forms: ['Free Union', 'People\'s Republic', 'Commune', 'Popular Commonwealth', 'Workers\' Federation'],
		titleFormat: (b) => `Free Union of ${b}`,
		titleTemplates: [
			(b) => `Free Union of ${b}`,
			(b) => `People's Republic of ${b}`,
			(b) => `Commune of ${b}`,
			(b) => `Popular Commonwealth of ${b}`,
			(b) => `Workers' Federation of ${b}`
		],
		rulerTitle: 'Elder Speaker',
		desc: 'Decentralized collective governance organized around agrarian communes and folk moots.',
		bonus: { stability: 10, tax: -0.02 }
	},
	technocracy: {
		id: 'technocracy',
		name: 'Artificer Technocracy',
		icon: '⚙️',
		defaultForm: 'Polytechnic League',
		forms: ['Polytechnic League', 'Artificer Directorate', 'Cybernetic Union', 'Council of Ingenuity'],
		titleFormat: (b) => `Polytechnic League of ${b}`,
		titleTemplates: [
			(b) => `Polytechnic League of ${b}`,
			(b) => `Artificer Directorate of ${b}`,
			(b) => `Cybernetic Union of ${b}`,
			(b) => `Council of Ingenuity of ${b}`
		],
		rulerTitle: 'Grand Artificer',
		desc: 'Rule by polymaths, natural philosophers, and master engineers.',
		bonus: { tax: 0.05, army: 0.05 }
	}
};

/** Format dynamic state title and regime form based on ideology */
export function formatRegimeTitle(
	baseName: string,
	ideology: IdeologyKind,
	rng: Rng,
	preferredForm?: string
): { form: string; fullName: string } {
	const def = IDEOLOGIES[ideology] ?? IDEOLOGIES.monarchy;
	if (preferredForm) {
		return { form: preferredForm, fullName: `${preferredForm} of ${baseName}` };
	}
	const idx = rng.int(0, def.forms.length - 1);
	const form = def.forms[idx];
	const fullName = def.titleTemplates[idx](baseName);
	return { form, fullName };
}

/** Generate internal factions for a realm */
export function generateFactionsForPolity(
	polity: Polity,
	people: Person[],
	rng: Rng
): Faction[] {
	const currentIdeology = polity.ideology ?? 'monarchy';
	const factions: Faction[] = [];

	// Ruling party
	const rulingLeader = people.find((p) => p.alive && p.state === polity.id && p.id !== polity.ruler) ?? people[polity.ruler];
	factions.push({
		id: 'ruling_loyalists',
		name: `${polity.name} Loyalists`,
		ideology: currentIdeology,
		influence: rng.int(45, 65),
		leaderId: rulingLeader ? rulingLeader.id : polity.ruler,
		militancy: rng.int(10, 30)
	});

	// Rival faction 1
	const otherIdeologies = (Object.keys(IDEOLOGIES) as IdeologyKind[]).filter((k) => k !== currentIdeology);
	const rival1Ideology = rng.pick(otherIdeologies);
	const def1 = IDEOLOGIES[rival1Ideology];
	const rival1Leader = people.find((p) => p.alive && p.state === polity.id && p.id !== polity.ruler) ?? people[polity.ruler];
	factions.push({
		id: `rival_${rival1Ideology}`,
		name: `${def1.name.split(' ')[0]} Movement`,
		ideology: rival1Ideology,
		influence: rng.int(20, 40),
		leaderId: rival1Leader ? rival1Leader.id : polity.ruler,
		militancy: rng.int(25, 55)
	});

	// Optional third faction
	if (rng.chance(0.5)) {
		const remaining = otherIdeologies.filter((k) => k !== rival1Ideology);
		const rival2Ideology = rng.pick(remaining);
		const def2 = IDEOLOGIES[rival2Ideology];
		factions.push({
			id: `rival_${rival2Ideology}`,
			name: `${def2.name.split(' ')[0]} Faction`,
			ideology: rival2Ideology,
			influence: rng.int(10, 30),
			leaderId: polity.ruler,
			militancy: rng.int(15, 45)
		});
	}

	return factions;
}

export type RegimeChangeContext =
	| 'revolt'
	| 'revolution'
	| 'reform'
	| 'conquest'
	| 'interregnum'
	| 'avatar'
	| 'coup';

export interface RegimeChangeResult {
	events: ChronEvent[];
	changed: boolean;
	newFullName: string;
	newForm: string;
}

/** Formally transition a polity to a new ideology and constitutional system */
export function transitionRegime(
	pol: Polity,
	newIdeology: IdeologyKind,
	context: RegimeChangeContext,
	year: number,
	rng: Rng,
	people: Person[],
	options?: {
		preferredForm?: string;
		victorName?: string;
		customLeader?: Person;
	}
): RegimeChangeResult {
	const events: ChronEvent[] = [];
	const oldFullName = pol.fullName;
	const { form: newForm, fullName: newFullName } = formatRegimeTitle(pol.name, newIdeology, rng, options?.preferredForm);

	pol.previousForm = pol.form;
	pol.form = newForm;
	pol.fullName = newFullName;
	pol.ideology = newIdeology;
	pol.reformedSystemYear = year;
	pol.systemChangeCause = context;
	if (context !== 'reform') {
		pol.origin = context;
	}

	let leaderName = 'The citizen assembly';

	if (context === 'reform') {
		const currentRuler = people[pol.ruler];
		leaderName = currentRuler ? currentRuler.name : 'The sovereign';
		pol.stability = Math.min(100, pol.stability + rng.int(15, 25));
	} else if (context === 'avatar') {
		const currentRuler = people[pol.ruler];
		leaderName = currentRuler ? currentRuler.name : 'The ruler';
		pol.stability = Math.min(100, pol.stability + 20);
	} else if (context === 'interregnum') {
		if (options?.customLeader) {
			pol.ruler = options.customLeader.id;
			options.customLeader.role = 'ruler';
			leaderName = options.customLeader.name;
		}
		pol.stability = 55 + rng.int(5, 20);
	} else {
		// revolution, conquest, coup, revolt
		const oldRuler = people[pol.ruler];
		if (oldRuler && oldRuler.alive) {
			oldRuler.alive = false;
			oldRuler.died = year;
			oldRuler.cause = context === 'revolution'
				? 'deposed in the popular revolution'
				: context === 'conquest'
				? 'deposed following defeat in war'
				: 'deposed in a military coup';
		}
		if (options?.customLeader) {
			pol.ruler = options.customLeader.id;
			options.customLeader.role = 'ruler';
			leaderName = options.customLeader.name;
		} else {
			const candidate = people.find((p) => p.alive && p.state === pol.id && p.id !== pol.ruler);
			if (candidate) {
				candidate.role = 'ruler';
				pol.ruler = candidate.id;
				leaderName = candidate.name;
			} else {
				leaderName = 'The revolutionary council';
			}
		}
		pol.stability = 50 + rng.int(10, 25);
	}

	// Update internal factions to reflect the new ruling party
	if (pol.factions && pol.factions.length > 0) {
		for (const f of pol.factions) {
			if (f.ideology === newIdeology) {
				f.influence = Math.max(55, f.influence + 30);
				f.militancy = Math.max(10, f.militancy - 25);
			} else {
				f.influence = Math.max(10, f.influence - 15);
				f.militancy = Math.max(15, f.militancy - 10);
			}
		}
		const totalInf = pol.factions.reduce((s, f) => s + f.influence, 0);
		if (totalInf > 0) {
			for (const f of pol.factions) {
				f.influence = Math.round((f.influence / totalInf) * 100);
			}
		}
	} else {
		pol.factions = generateFactionsForPolity(pol, people, rng);
	}

	// Narrative chronicle event
	const eventText = narrateSystemChange(rng, pol.name, oldFullName, newFullName, context, leaderName, options?.victorName);
	events.push({
		y: year,
		m: rng.int(0, 11),
		kind: 'coup',
		text: eventText,
		state: pol.id
	});

	// Check for Revolutionary Secularization / State Atheism
	const isRadicalSecular = newIdeology === 'communal' || newIdeology === 'republic' || newIdeology === 'technocracy';
	if (isRadicalSecular && !pol.secularized && (context === 'revolution' || context === 'conquest' || context === 'coup' || rng.chance(0.45))) {
		pol.secularized = true;
		pol.secularYear = year;
		pol.religion = 0;
		pol.patronDeity = undefined;
		pol.patronFavor = 0;
		pol.treasury += 65;
		events.push({
			y: year,
			m: rng.int(0, 11),
			kind: 'faith',
			text: `STATE ATHEISM PROCLAIMED: The revolutionary leadership in ${pol.name} enacts Radical Secularization! State religion is abolished, temple estates and monastery vaults are confiscated for the people (+65 gold), and ancient dogma is suppressed.`,
			state: pol.id
		});
	}

	return { events, changed: true, newFullName, newForm };
}

/** Update political factions and process coups d'etat, revolutions, and reforms */
export function updatePolitics(
	pol: Polity,
	people: Person[],
	year: number,
	rng: Rng,
	hasActiveWars: boolean
): { events: ChronEvent[]; regimeChanged: boolean } {
	const events: ChronEvent[] = [];
	let regimeChanged = false;

	if (!pol.factions || pol.factions.length === 0) {
		pol.factions = generateFactionsForPolity(pol, people, rng);
	}

	// Dynamic influence shifts
	for (const f of pol.factions) {
		// War increases autocracy militancy
		if (hasActiveWars && f.ideology === 'autocracy') {
			f.influence = Math.min(95, f.influence + rng.int(3, 8));
			f.militancy = Math.min(90, f.militancy + rng.int(4, 10));
		}
		// Low stability increases opposition militancy
		if (pol.stability < 40 && f.ideology !== pol.ideology) {
			f.influence = Math.min(90, f.influence + rng.int(4, 9));
			f.militancy = Math.min(95, f.militancy + rng.int(5, 12));
		}
		// Economic wealth increases oligarchy influence
		if (pol.treasury > 80 && f.ideology === 'oligarchy') {
			f.influence = Math.min(85, f.influence + rng.int(2, 6));
		}
	}

	// Normalize influences
	const totalInf = pol.factions.reduce((s, f) => s + f.influence, 0);
	if (totalInf > 0) {
		for (const f of pol.factions) {
			f.influence = Math.round((f.influence / totalInf) * 100);
		}
	}

	// 1. Check for Peaceful Constitutional Reform:
	// If at peace, healthy stability (>= 48), and reformist faction (republic/communal/technocracy) has high influence
	if (!hasActiveWars && pol.stability >= 48 && pol.ideology === 'monarchy') {
		const reformist = pol.factions.find(
			(f) => (f.ideology === 'republic' || f.ideology === 'communal' || f.ideology === 'technocracy') && f.influence >= 50 && f.militancy <= 40
		);
		if (reformist && rng.chance(0.20)) {
			const res = transitionRegime(pol, reformist.ideology, 'reform', year, rng, people);
			events.push(...res.events);
			regimeChanged = true;
			return { events, regimeChanged };
		}
	}

	// 2. Check for Insurgency / Coup / Popular Revolution:
	const insurgents = pol.factions
		.filter((f) => f.ideology !== pol.ideology && f.influence > 45 && f.militancy > 55)
		.sort((a, b) => b.influence - a.influence);

	if (insurgents.length > 0 && (pol.stability < 38 || insurgents[0].influence > 65) && rng.chance(0.25)) {
		const victor = insurgents[0];
		const isMassRev = victor.ideology === 'communal' || victor.ideology === 'republic';
		const context: RegimeChangeContext = isMassRev ? 'revolution' : 'coup';
		const leaderPerson = people[victor.leaderId] && people[victor.leaderId].alive && victor.leaderId !== pol.ruler
			? people[victor.leaderId]
			: undefined;

		const res = transitionRegime(pol, victor.ideology, context, year, rng, people, { customLeader: leaderPerson });
		events.push(...res.events);
		regimeChanged = true;
	}

	return { events, regimeChanged };
}
