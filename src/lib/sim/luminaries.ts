import type { Rng } from '../rng';
import type { Person, Role } from './types';
import { personName } from '../gen/names';

export interface LuminaryProfile {
	role: 'magician' | 'thinker' | 'artist' | 'athlete' | 'inventor';
	title: string;
	icon: string;
	statFocus: 'martial' | 'diplomacy' | 'stewardship' | 'intrigue';
	magnumOpusTpl: string[];
	achievementTpl: string[];
	traitPool: string[];
}

export const LUMINARY_PROFILES: Record<string, LuminaryProfile> = {
	magician: {
		role: 'magician',
		title: 'Archmage',
		icon: '🔮',
		statFocus: 'intrigue',
		magnumOpusTpl: [
			'Grimoire of the Primordial Aether',
			'The Philosopher\'s Crucible',
			'Codex of Astral Ley-Lines',
			'Tome of Celestial Transmutation',
			'The Ever-Burning Flame'
		],
		achievementTpl: [
			'weaves a protective arcane ward over the city walls',
			'unravels a supernatural anomaly in the mountains',
			'summons an aura of calm that cleanses local sickness',
			'transmutes lead into silver, filling the state coffers'
		],
		traitPool: ['Scholar', 'Ambitious', 'Pious']
	},
	thinker: {
		role: 'thinker',
		title: 'Philosopher',
		icon: '📜',
		statFocus: 'stewardship',
		magnumOpusTpl: [
			'Treatise on Natural Justice',
			'Dialogue on the Motion of Spheres',
			'The Principles of Commonwealth',
			'Meditations on Mortal Mind',
			'The Great Syntaxis'
		],
		achievementTpl: [
			'publishes a groundbreaking philosophical treatise that inspires court reforms',
			'calculates the true circumference of the world from tower shadows',
			'drafts a universal legal code that enhances provincial stability',
			'founds an academy of logic drawing inquisitive students from distant lands'
		],
		traitPool: ['Scholar', 'Just', 'Content']
	},
	artist: {
		role: 'artist',
		title: 'Master Artisan',
		icon: '🎨',
		statFocus: 'diplomacy',
		magnumOpusTpl: [
			'The Monument of Eternal Heroes',
			'Epic of the Founding Kings',
			'The Celestial Symphony',
			'Fresco of the Dawn of Creation',
			'The Golden Tapestry of Ages'
		],
		achievementTpl: [
			'unveils a breathtaking marble colossus in the central plaza',
			'composes an immortal ballad that brings tears to commoners and kings alike',
			'completes a cathedral ceiling fresco celebrating the history of the realm',
			'stages a grand theatrical masterpiece celebrating freedom'
		],
		traitPool: ['Charming', 'Generous', 'Creative']
	},
	athlete: {
		role: 'athlete',
		title: 'Grand Champion',
		icon: '🏆',
		statFocus: 'martial',
		magnumOpusTpl: [
			'Champion of the Grand Games',
			'The Invincible Spear of the List',
			'Victor of the Colosseum',
			'Legend of the Chariot Tracks',
			'The Undefeated Champion'
		],
		achievementTpl: [
			'sweeps all contenders in the Grand Tourney to ecstatic cheers from thousands',
			'bestows glorious sporting renown upon the host realm in the international games',
			'defeats a formidable foreign knight in single combat before the royal court',
			'sets an unprecedented record in the sprint and javelin throwing trials'
		],
		traitPool: ['Strong', 'Brave', 'Lucky']
	},
	inventor: {
		role: 'inventor',
		title: 'Master Artificer',
		icon: '⚙️',
		statFocus: 'stewardship',
		magnumOpusTpl: [
			'The Master Water-Driven Loom',
			'The Clockwork Chronometer',
			'The Pneumatic Archimedes Screw',
			'The Movable-Type Printing Press',
			'The Compound Lever Crane'
		],
		achievementTpl: [
			'constructs a magnificent clockwork astrolabe atop the harbor watchtower',
			'engineers a revolutionary watermill mechanism that doubles grain milling yields',
			'invents an ingenious optical telescope to survey distant constellations',
			'designs a rapid-firing ballista mechanism adopted by frontier garrisons'
		],
		traitPool: ['Scholar', 'Ambitious', 'Clever']
	}
};

/** Create a new luminary person */
export function createLuminary(
	id: number,
	rng: Rng,
	cultureId: number,
	stateId: number,
	burgId: number,
	role: 'magician' | 'thinker' | 'artist' | 'athlete' | 'inventor',
	currentYear: number,
	lang: any,
	speciesId = 'human'
): Person {
	const prof = LUMINARY_PROFILES[role];
	const age = rng.int(22, 55);
	const name = personName(lang);
	const magnumOpus = rng.pick(prof.magnumOpusTpl);

	const p: Person = {
		id,
		name,
		house: '',
		born: currentYear - age,
		culture: cultureId,
		religion: 0,
		state: stateId,
		burg: burgId,
		role,
		martial: rng.int(6, 14),
		diplomacy: rng.int(6, 14),
		stewardship: rng.int(6, 14),
		intrigue: rng.int(6, 14),
		health: 80 + rng.int(0, 20),
		gold: rng.int(30, 80),
		renown: rng.int(25, 60),
		alive: true,
		traits: [...prof.traitPool],
		parent: 0,
		species: speciesId,
		magnumOpus
	};

	// Boost primary focus
	p[prof.statFocus] = Math.min(20, p[prof.statFocus] + 6);
	if (role === 'athlete') p.health += 15;
	if (role === 'thinker' || role === 'inventor') p.stewardship += 4;
	if (role === 'artist') p.diplomacy += 4;
	if (role === 'magician') p.intrigue += 4;

	return p;
}
