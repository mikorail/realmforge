import type { Rng } from '../rng';
import type { ChronEvent, EventKind, Polity, War } from './types';

export type DivineSphere = 'High' | 'Chaos' | 'OldGods' | 'Nature';

export type PantheonDomain =
	| 'Sun'
	| 'Order'
	| 'Wisdom'
	| 'Storms'
	| 'Slaughter'
	| 'Sorcery'
	| 'Plague'
	| 'Excess'
	| 'Abyss'
	| 'Void'
	| 'Broods'
	| 'Forest'
	| 'Mountain'
	| 'Fire'
	| 'River'
	| 'War'
	| 'Seas'
	| 'Shadow'
	| 'Earth'
	| 'Death';

export interface PantheonDeity {
	id: string;
	name: string;
	sphere: DivineSphere;
	domain: PantheonDomain;
	title: string;
	icon: string;
	color: string;
	blessing: string;
	wrath: string;
}

export const PANTHEON_DEITIES: PantheonDeity[] = [
	// High & Olympian Celestial Gods
	{
		id: 'solarius',
		name: 'Solarius the Dawn-Bringer',
		sphere: 'High',
		domain: 'Sun',
		title: 'Lord of the Radiant Firmament',
		icon: '☀️',
		color: '#f59e0b',
		blessing: 'Bountiful harvest, population prosperity, and high realm stability',
		wrath: 'Scorching celestial droughts and blinding solar flares'
	},
	{
		id: 'omnipotis',
		name: 'Omnipotis the Sovereign Architect',
		sphere: 'High',
		domain: 'Order',
		title: 'Supreme Judge and Cosmic Lawgiver',
		icon: '👑',
		color: '#eab308',
		blessing: 'Unyielding constitutional order, lower corruption, and rapid public infrastructure',
		wrath: 'Inflexible dogmatic stagnation and bureaucratic paralyzation'
	},
	{
		id: 'thalor',
		name: 'Thalor the All-Seeing Mind',
		sphere: 'High',
		domain: 'Wisdom',
		title: 'Keeper of Ancient Truths',
		icon: '📜',
		color: '#6366f1',
		blessing: 'Accelerated innovation, scholarly breakthroughs, and wise governance',
		wrath: 'Maddening intellectual hubris and paralysis by analysis'
	},
	{
		id: 'zephyros',
		name: 'Zephyros the Sky-Sovereign',
		sphere: 'High',
		domain: 'Storms',
		title: 'Ruler of Gales and Thunderbolts',
		icon: '⚡',
		color: '#3b82f6',
		blessing: 'Lightning smites against invading foes and wind-blessed trade fleets',
		wrath: 'Devastating tornadic tempests flattening coastal settlements'
	},

	// Ruinous Chaos Gods
	{
		id: 'khorvath',
		name: 'Khorvath the Blood Lord',
		sphere: 'Chaos',
		domain: 'Slaughter',
		title: 'Master of Skulls and Eternal Slaughter',
		icon: '🩸',
		color: '#dc2626',
		blessing: 'Savage martial fury and irresistible berserker army assault power',
		wrath: 'Fratricidal bloodlust and reckless military mutinies'
	},
	{
		id: 'tzannik',
		name: 'Tzannik the Architect of Fate',
		sphere: 'Chaos',
		domain: 'Sorcery',
		title: 'Weaver of Mutating Destinies',
		icon: '🔮',
		color: '#8b5cf6',
		blessing: 'Arcane sorcery mastery, unexpected technological mutation, and insidious espionage',
		wrath: 'Chaotic magical backlashes and shifting treacherous conspiracies'
	},
	{
		id: 'pestilax',
		name: 'Pestilax the Rot-Father',
		sphere: 'Chaos',
		domain: 'Plague',
		title: 'Lord of Pestilence and Abundant Spores',
		icon: '🪰',
		color: '#65a30d',
		blessing: 'Pestilential resilience, unnatural endurance, and biological growth',
		wrath: 'Miasmic rot blighting harvests and virulent outbreaks among the populace'
	},
	{
		id: 'luxuria',
		name: 'Luxuria the Gilded Prince',
		sphere: 'Chaos',
		domain: 'Excess',
		title: 'Sovereign of Agony and Sublime Rapture',
		icon: '🎭',
		color: '#ec4899',
		blessing: 'Dazzling cultural splendor, artistic renaissance, and intoxicating diplomatic allure',
		wrath: 'Decadent social decay, moral collapse, and uncontrolled treasury squandering'
	},

	// Old Gods & Abyssal Horrors
	{
		id: 'cthulor',
		name: 'Cthulor the Abyssal Slumberer',
		sphere: 'OldGods',
		domain: 'Abyss',
		title: "Dredge-King of Sunken R'lyeh",
		icon: '🐙',
		color: '#0d9488',
		blessing: 'Unfathomable deep ocean relics, sunken monolith wealth, and crushing dread upon hostile navies',
		wrath: 'Maddening psychic tidal surges drowning coastal frontiers'
	},
	{
		id: 'nyxal',
		name: 'Nyxal the Void Dreamer',
		sphere: 'OldGods',
		domain: 'Void',
		title: 'Whispering Crawling Chaos',
		icon: '🌀',
		color: '#475569',
		blessing: 'Cosmic revelation grimoires, non-Euclidean defenses, and terror in enemy spymasters',
		wrath: 'Mass hallucinations, psychic dread, and suicidal cult delusions'
	},
	{
		id: 'shubbog',
		name: 'Shubbog the Brood Mother',
		sphere: 'OldGods',
		domain: 'Broods',
		title: 'Black Goat of the Ten Thousand Spawns',
		icon: '🐐',
		color: '#78350f',
		blessing: 'Explosive population fecundity and grotesque bio-chitin mutations bolstering militia',
		wrath: 'Monstrous deformed spawn rampaging through rural hamlets'
	},

	// Local Terrestrial & Nature Gods
	{
		id: 'sylvanor',
		name: 'Sylvanor the Forest Horn',
		sphere: 'Nature',
		domain: 'Forest',
		title: 'The Great Primal Stag of the Canopy',
		icon: '🦌',
		color: '#16a34a',
		blessing: 'Boundless timber, ancient herbal remedies, and wood-warden ambushes against invaders',
		wrath: 'Awakened treant wrath punishing aggressive lumber harvesting and deforestation'
	},
	{
		id: 'gorath',
		name: 'Gorath the Stone Peak',
		sphere: 'Nature',
		domain: 'Mountain',
		title: 'The Mountain Colossus and Deep Stone',
		icon: '🏔️',
		color: '#71717a',
		blessing: 'Inexhaustible ore veins, impenetrable fortress bastions, and avalanche defenses',
		wrath: 'Cataclysmic rockslides and quarry collapses choking mining trade'
	},
	{
		id: 'ignis',
		name: 'Ignis the Hearth Caldera',
		sphere: 'Nature',
		domain: 'Fire',
		title: 'Fire-Father of Subterranean Forges',
		icon: '🌋',
		color: '#ea580c',
		blessing: 'Superior forged metallurgy, volcanic soil fertility, and searing fire wards',
		wrath: 'Volcanic ash blights and destructive pyroclastic surges'
	},
	{
		id: 'undina',
		name: 'Undina of the Silver Basin',
		sphere: 'Nature',
		domain: 'River',
		title: 'Naiad Sovereign of Living Waters',
		icon: '💧',
		color: '#0284c7',
		blessing: 'Pristine freshwater aquifers, flourishing riverboat trade, and drought immunity',
		wrath: 'Torrential river deluges washing away bridges and riverbank docks'
	}
];

export const PANTHEON_DEITIES_BY_ID: Record<string, PantheonDeity> = Object.fromEntries(
	PANTHEON_DEITIES.map((d) => [d.id, d])
);

/** Assign an initial celestial patron deity to a mortal realm */
export function assignPatronDeity(pol: Polity, rng: Rng, preferredDeityName?: string): void {
	if (pol.secularized) return;
	const deity = preferredDeityName
		? PANTHEON_DEITIES.find((d) => d.name === preferredDeityName || d.id === preferredDeityName) ??
			rng.pick(PANTHEON_DEITIES)
		: rng.pick(PANTHEON_DEITIES);

	pol.patronDeity = deity.name;
	pol.patronDomain = deity.domain;
	pol.patronFavor = 50 + rng.int(5, 25);
}

/** Apply a deity's domain blessing to a mortal realm */
export function applyDeityBlessing(
	pol: Polity,
	deity: PantheonDeity,
	logFn: (kind: EventKind, text: string, cell?: number, state?: number) => void
): void {
	switch (deity.domain) {
		case 'Sun':
			pol.stability = Math.min(100, pol.stability + 18);
			pol.treasury += 20;
			logFn(
				'god',
				`PATRON MIRACLE: ${deity.name} bestows a radiant dawn upon ${pol.name}! Granaries overflow with miraculous golden grain, soothing civil unrest (+18 stability, +20 gold).`,
				undefined,
				pol.id
			);
			break;
		case 'Order':
			pol.stability = Math.min(100, pol.stability + 20);
			pol.treasury += 15;
			logFn(
				'god',
				`PATRON MIRACLE: ${deity.name} manifests the Sovereign Mandate in ${pol.name}! Incorruptible celestial magistrates codify sacred law, crushing unrest (+20 stability, +15 gold).`,
				undefined,
				pol.id
			);
			break;
		case 'Wisdom':
			pol.treasury += 20;
			pol.stability = Math.min(100, pol.stability + 14);
			logFn(
				'god',
				`PATRON MIRACLE: ${deity.name} whispers lost epics and architectural secrets to the scholars of ${pol.name}, ushering in an era of enlightened innovation (+14 stability, +20 gold).`,
				undefined,
				pol.id
			);
			break;
		case 'Storms':
			pol.army = +(pol.army * 1.15 + 2).toFixed(1);
			logFn(
				'god',
				`PATRON MIRACLE: ${deity.name} hurls deafening thunderbolts across the frontiers of ${pol.name}, scattering hostile vanguards with righteous gales (+15% army power).`,
				undefined,
				pol.id
			);
			break;
		case 'Slaughter':
		case 'War':
			pol.army = +(pol.army * 1.25 + 4).toFixed(1);
			pol.stability = Math.max(5, pol.stability - 8);
			logFn(
				'god',
				`RUINOUS GIFT: ${deity.name} floods the warriors of ${pol.name} with bloodthirsty slaughter! Mortal legions butcher foes with demonic savagery (+25% army power, -8 stability).`,
				undefined,
				pol.id
			);
			break;
		case 'Sorcery':
			pol.treasury += 30;
			pol.stability = Math.max(5, pol.stability - 6);
			logFn(
				'god',
				`RUINOUS GIFT: ${deity.name} mutates the weave of fate in ${pol.name}! Arcane mutations grant uncanny clairvoyance and secret gold, at the cost of civil panic (+30 gold, -6 stability).`,
				undefined,
				pol.id
			);
			break;
		case 'Plague':
		case 'Death':
			pol.army = +(pol.army * 1.12 + 3).toFixed(1);
			pol.stability = Math.min(100, pol.stability + 10);
			logFn(
				'god',
				`RUINOUS GIFT: ${deity.name} touches the hosts of ${pol.name} with blissful pestilence! Rotting flesh feels no pain, turning armies into unyielding revenants (+12% army power, +10 resilience).`,
				undefined,
				pol.id
			);
			break;
		case 'Excess':
			pol.treasury += 40;
			pol.stability = Math.max(5, pol.stability - 10);
			logFn(
				'god',
				`RUINOUS GIFT: ${deity.name} intoxicates the high courts of ${pol.name} with exquisite hedonism! Opulence surges alongside reckless decadence (+40 gold, -10 stability).`,
				undefined,
				pol.id
			);
			break;
		case 'Abyss':
		case 'Seas':
			pol.treasury += 35;
			pol.stability = Math.max(5, pol.stability - 5);
			logFn(
				'god',
				`ELDRITCH MANIFESTATION: ${deity.name} stirs in the ocean abyss beneath ${pol.name}! Barnacle-encrusted cyclopean monoliths surface, loaded with pre-human treasure (+35 gold, -5 stability).`,
				undefined,
				pol.id
			);
			break;
		case 'Void':
		case 'Shadow':
			pol.army = +(pol.army * 1.18 + 2).toFixed(1);
			pol.stability = Math.max(5, pol.stability - 7);
			logFn(
				'god',
				`ELDRITCH MANIFESTATION: ${deity.name} projects psychic void-whispers into the foes of ${pol.name}! Invaders flee in weeping delirium, haunted by visions of tentacled cosmic voids (+18% army power, -7 stability).`,
				undefined,
				pol.id
			);
			break;
		case 'Broods':
			pol.army = +(pol.army * 1.2 + 3).toFixed(1);
			pol.stability = Math.max(5, pol.stability - 6);
			logFn(
				'god',
				`ELDRITCH MANIFESTATION: ${deity.name} spawns thousands of chittering dark young in the sacred groves of ${pol.name}, swarming forward under black skies (+20% army power, -6 stability).`,
				undefined,
				pol.id
			);
			break;
		case 'Forest':
		case 'Earth':
			pol.stability = Math.min(100, pol.stability + 16);
			pol.army = +(pol.army * 1.1 + 2).toFixed(1);
			logFn(
				'god',
				`NATURE BLESSING: ${deity.name} awakens the ancient canopies of ${pol.name}! Verdant thickets ensnare enemies and provide abundant woodland forage (+16 stability, +10% army power).`,
				undefined,
				pol.id
			);
			break;
		case 'Mountain':
			pol.stability = Math.min(100, pol.stability + 15);
			pol.treasury += 25;
			logFn(
				'god',
				`NATURE BLESSING: ${deity.name} heaves rich subterranean veins to the surface of ${pol.name}! Granite ramparts harden against all siegecraft (+25 gold, +15 stability).`,
				undefined,
				pol.id
			);
			break;
		case 'Fire':
			pol.army = +(pol.army * 1.16 + 3).toFixed(1);
			pol.treasury += 15;
			logFn(
				'god',
				`NATURE BLESSING: ${deity.name} stokes the caldera hearths of ${pol.name}! Master smiths forge shimmering obsidian weaponry bathed in magma (+16% army power, +15 gold).`,
				undefined,
				pol.id
			);
			break;
		case 'River':
			pol.treasury += 30;
			pol.stability = Math.min(100, pol.stability + 12);
			logFn(
				'god',
				`NATURE BLESSING: ${deity.name} purifies the sacred rivers of ${pol.name}! Abundant fish and unhindered river trade enrich the townships (+30 gold, +12 stability).`,
				undefined,
				pol.id
			);
			break;
		default:
			pol.stability = Math.min(100, pol.stability + 14);
			pol.treasury += 15;
			logFn(
				'god',
				`PATRON MIRACLE: Luminous manifestations of ${deity.name} descend upon the shrines of ${pol.name}, answering prayers and shielding the realm.`,
				undefined,
				pol.id
			);
			break;
	}
}

/** Apply a deity's domain wrath to a mortal realm */
export function applyDeityWrath(
	pol: Polity,
	deity: PantheonDeity,
	logFn: (kind: EventKind, text: string, cell?: number, state?: number) => void
): void {
	switch (deity.domain) {
		case 'Sun':
			pol.treasury = Math.max(0, pol.treasury - 20);
			pol.stability = Math.max(5, pol.stability - 12);
			logFn(
				'god',
				`DIVINE WRATH: ${deity.name} scorns ${pol.name}! Scorching heatwaves wither crops and ignite pasturelands in celestial fury (-12 stability, -20 gold).`,
				undefined,
				pol.id
			);
			break;
		case 'Order':
			pol.stability = Math.max(5, pol.stability - 15);
			logFn(
				'god',
				`DIVINE WRATH: ${deity.name} strikes ${pol.name} with dogmatic paralysis! Bureaucracies grind to a halt as conflicting decrees spark urban gridlock (-15 stability).`,
				undefined,
				pol.id
			);
			break;
		case 'Wisdom':
			pol.stability = Math.max(5, pol.stability - 10);
			logFn(
				'god',
				`DIVINE WRATH: ${deity.name} clouds the counsel of ${pol.name}! Arrogant scholars clash in bitter schisms, paralyzing governance (-10 stability).`,
				undefined,
				pol.id
			);
			break;
		case 'Storms':
			pol.army = +(pol.army * 0.9).toFixed(1);
			pol.stability = Math.max(5, pol.stability - 10);
			logFn(
				'god',
				`DIVINE WRATH: ${deity.name} batters ${pol.name} with howling tempests! Sinking supply barges and shattered watchtowers sow chaos (-10% army power, -10 stability).`,
				undefined,
				pol.id
			);
			break;
		case 'Slaughter':
		case 'War':
			pol.stability = Math.max(5, pol.stability - 18);
			pol.army = +(pol.army * 0.9).toFixed(1);
			logFn(
				'god',
				`CHAOS WRATH: ${deity.name} demands blood from ${pol.name}! Fratricidal mutinies break out across military encampments in senseless slaughter (-18 stability, -10% army power).`,
				undefined,
				pol.id
			);
			break;
		case 'Sorcery':
			pol.treasury = Math.max(0, pol.treasury - 25);
			pol.stability = Math.max(5, pol.stability - 14);
			logFn(
				'god',
				`CHAOS WRATH: ${deity.name} unravels the destinies of ${pol.name}! Magical wild-surges turn treasury vaults to lead and dissolve alliances (-25 gold, -14 stability).`,
				undefined,
				pol.id
			);
			break;
		case 'Plague':
		case 'Death':
			pol.stability = Math.max(5, pol.stability - 16);
			pol.army = +(pol.army * 0.88).toFixed(1);
			logFn(
				'god',
				`CHAOS WRATH: ${deity.name} vents noxious rot through ${pol.name}! Horrific gangrene strikes garrisons and spoils granaries (-12% army power, -16 stability).`,
				undefined,
				pol.id
			);
			break;
		case 'Excess':
			pol.treasury = Math.max(0, pol.treasury - 35);
			pol.stability = Math.max(5, pol.stability - 12);
			logFn(
				'god',
				`CHAOS WRATH: ${deity.name} plunges the lords of ${pol.name} into ruinous hedonism! Nobles squander municipal reserves on grotesque bacchanals (-35 gold, -12 stability).`,
				undefined,
				pol.id
			);
			break;
		case 'Abyss':
		case 'Seas':
			pol.stability = Math.max(5, pol.stability - 16);
			logFn(
				'god',
				`ELDRITCH WRATH: ${deity.name} dreams of drowning! Cyclopean tidal bores sweep the coasts of ${pol.name}, shattering harbors and dragging fisherfolk into the deep (-16 stability).`,
				undefined,
				pol.id
			);
			break;
		case 'Void':
		case 'Shadow':
			pol.stability = Math.max(5, pol.stability - 18);
			logFn(
				'god',
				`ELDRITCH WRATH: ${deity.name} casts madness over ${pol.name}! Mass waking nightmares and hallucinations drive citizens to self-mutilation (-18 stability).`,
				undefined,
				pol.id
			);
			break;
		case 'Broods':
			pol.stability = Math.max(5, pol.stability - 15);
			pol.treasury = Math.max(0, pol.treasury - 20);
			logFn(
				'god',
				`ELDRITCH WRATH: ${deity.name} unleashes voracious dark young upon ${pol.name}! Abominations devour cattle and ravage boundary settlements (-15 stability, -20 gold).`,
				undefined,
				pol.id
			);
			break;
		case 'Forest':
		case 'Earth':
			pol.stability = Math.max(5, pol.stability - 14);
			pol.treasury = Math.max(0, pol.treasury - 15);
			logFn(
				'god',
				`NATURE WRATH: ${deity.name} retaliates against deforestation in ${pol.name}! Entangling roots crush logging camps and enraged beast-packs raid timber trails (-14 stability, -15 gold).`,
				undefined,
				pol.id
			);
			break;
		case 'Mountain':
			pol.treasury = Math.max(0, pol.treasury - 25);
			pol.stability = Math.max(5, pol.stability - 12);
			logFn(
				'god',
				`NATURE WRATH: ${deity.name} rumbles in fury at excessive digging in ${pol.name}! Tremendous rockslides bury royal mines and collapse tunnels (-25 gold, -12 stability).`,
				undefined,
				pol.id
			);
			break;
		case 'Fire':
			pol.stability = Math.max(5, pol.stability - 15);
			pol.treasury = Math.max(0, pol.treasury - 20);
			logFn(
				'god',
				`NATURE WRATH: ${deity.name} erupts through volcanic vents across ${pol.name}! Searing rivers of magma consume outlying pastures and scorch forges (-15 stability, -20 gold).`,
				undefined,
				pol.id
			);
			break;
		case 'River':
			pol.treasury = Math.max(0, pol.treasury - 25);
			pol.stability = Math.max(5, pol.stability - 14);
			logFn(
				'god',
				`NATURE WRATH: ${deity.name} floods the heartlands of ${pol.name}! Riverbanks collapse into raging torrents, washing away trade barges and bridges (-25 gold, -14 stability).`,
				undefined,
				pol.id
			);
			break;
		default:
			pol.stability = Math.max(5, pol.stability - 10);
			logFn(
				'god',
				`DIVINE WRATH: Ill omens and celestial silence from ${deity.name} fall upon ${pol.name}, shaking the faith of the populace (-10 stability).`,
				undefined,
				pol.id
			);
			break;
	}
}

/** Process yearly pantheon deity backing, miracles, favor shifts, and divine proxy wars */
export function processPantheonInterventions(
	polities: Polity[],
	wars: War[],
	year: number,
	rng: Rng,
	logFn: (kind: EventKind, text: string, cell?: number, state?: number) => void
): void {
	// 1. Process active divine proxy wars between realms backed by different deities
	for (const war of wars) {
		if (war.end) continue;
		if (!rng.chance(0.22)) continue;

		const attState = polities[war.attackers[0]];
		const defState = polities[war.defenders[0]];

		if (!attState?.alive || !defState?.alive) continue;
		if (attState.secularized || defState.secularized) continue;
		if (!attState.patronDeity || !defState.patronDeity) continue;
		if (attState.patronDeity === defState.patronDeity) continue;

		// Divine proxy war flares up!
		const attDeity = attState.patronDeity;
		const defDeity = defState.patronDeity;
		attState.army = +(attState.army * 1.08).toFixed(1);
		defState.army = +(defState.army * 1.08).toFixed(1);
		attState.patronFavor = Math.min(100, (attState.patronFavor ?? 50) + 6);
		defState.patronFavor = Math.min(100, (defState.patronFavor ?? 50) + 6);

		logFn(
			'god',
			`DIVINE PROXY WAR: The war between ${attState.name} and ${defState.name} escalates into a celestial proxy duel! ${attDeity} rallies the hosts of ${attState.name}, while ${defDeity} unleashes sacred omens to shield ${defState.name}.`,
			undefined,
			attState.id
		);
	}

	// 2. Individual realm patron deity favor updates and divine interventions
	for (const pol of polities) {
		if (!pol.id || !pol.alive || pol.secularized) continue;

		// If realm has no patron deity, small chance to adopt one
		if (!pol.patronDeity) {
			if (rng.chance(0.12)) {
				assignPatronDeity(pol, rng);
				if (pol.patronDeity) {
					logFn(
						'god',
						`DIVINE PATRONAGE: ${pol.name} dedicates its high altars to ${pol.patronDeity} (${pol.patronDomain}), receiving celestial favor and divine protection!`,
						undefined,
						pol.id
					);
				}
			}
			continue;
		}

		let favor = pol.patronFavor ?? 50;

		// High stability and wealth slightly improve favor; collapse reduces it
		if (pol.stability > 70) favor = Math.min(100, favor + 1);
		else if (pol.stability < 25) favor = Math.max(10, favor - 2);

		// Divine Intervention check when realm is in peril
		const isAtWar = wars.some((w) => !w.end && (w.attackers.includes(pol.id) || w.defenders.includes(pol.id)));
		const isChosen = pol.isChosenRealm;

		// Resolve deity definition or construct fallback
		const deityDef = PANTHEON_DEITIES.find(
			(d) => d.name === pol.patronDeity || d.id === pol.patronDeity
		) ?? {
			id: 'unknown',
			name: pol.patronDeity,
			sphere: 'High' as DivineSphere,
			domain: (pol.patronDomain ?? 'War') as PantheonDomain,
			title: 'The Divine Patron',
			icon: '✨',
			color: '#ffd700',
			blessing: 'Divine protection and celestial guidance',
			wrath: 'Divine displeasure and celestial wrath'
		};

		// Check for divine wrath if favor has plummeted
		if (favor < 25 && rng.chance(0.2)) {
			applyDeityWrath(pol, deityDef, logFn);
			favor = Math.min(40, favor + 4);
		} else if (
			favor >= 40 &&
			(isAtWar || pol.stability < 35 || isChosen) &&
			rng.chance(isChosen ? 0.35 : 0.18)
		) {
			applyDeityBlessing(pol, deityDef, logFn);
			favor = Math.min(100, favor + 4);
		}

		pol.patronFavor = favor;
	}
}
