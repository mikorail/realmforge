import { makeName, type Lang } from '../gen/names';
import type { Rng } from '../rng';
import type { Monster } from './types';

export type ArtifactKind = 'weapon' | 'crown' | 'tome' | 'relic' | 'rector' | 'monolith';

export interface Artifact {
	id: number;
	name: string;
	kind: ArtifactKind;
	icon: string;
	fame: number;
	year: number;
	origin: string;
	bonusStat: 'martial' | 'diplomacy' | 'stewardship' | 'intrigue' | 'stability';
	bonusVal: number;
	holderType: 'person' | 'burg' | 'polity';
	holderId: number;
	holderName: string;
	lore: string;
}

const KIND_ICONS: Record<ArtifactKind, string> = {
	weapon: '⚔',
	crown: '👑',
	tome: '📜',
	relic: '✦',
	rector: '⚡',
	monolith: '🗿'
};

const STATS: ('martial' | 'diplomacy' | 'stewardship' | 'intrigue' | 'stability')[] = [
	'martial', 'diplomacy', 'stewardship', 'intrigue', 'stability'
];

/** Generate a procedural heirloom or sacred relic for a realm or hero */
export function forgeArtifact(
	id: number,
	rng: Rng,
	year: number,
	lang: Lang,
	holderType: 'person' | 'burg' | 'polity',
	holderId: number,
	holderName: string,
	originContext?: string
): Artifact {
	const kinds: ArtifactKind[] = ['weapon', 'crown', 'tome', 'relic', 'rector'];
	const kind = rng.pick(kinds);
	const bonusStat = rng.pick(STATS);
	const bonusVal = rng.int(2, 6);
	const fame = rng.int(25, 95);

	const adjectives = ['Sun-forged', 'Ancient', 'Shadowed', 'Eternal', 'Blood-gilded', 'Whispering', 'Hallowed', 'Shattered', 'Astral', 'Iron-bound'];
	const nouns: Record<ArtifactKind, string[]> = {
		weapon: ['Blade', 'Spear', 'Halberd', 'Edge', 'Scythe', 'Saber'],
		crown: ['Diadem', 'Crown', 'Circlet', 'Coronet', 'Tiara'],
		tome: ['Grimoire', 'Chronicle', 'Codex', 'Scripture', 'Lexicon'],
		relic: ['Chalice', 'Heart', 'Orb', 'Shard', 'Amulet', 'Icon'],
		rector: ['Conduit', 'Capacitor', 'Core', 'Matrix', 'Relay'],
		monolith: ['Stele', 'Pillar', 'Effigy', 'Obelisk']
	};

	const wordName = makeName(lang, 'place');
	const adj = rng.pick(adjectives);
	const noun = rng.pick(nouns[kind]);
	const name = `${adj} ${noun} of ${wordName}`;

	const origin = originContext || `Unearthed in the ancient chronicles of year ${year}.`;
	const lore = `${name}: A fabled ${kind} held by ${holderName}, granting renown across the realms.`;

	return {
		id,
		name,
		kind,
		icon: KIND_ICONS[kind],
		fame,
		year,
		origin,
		bonusStat,
		bonusVal,
		holderType,
		holderId,
		holderName,
		lore
	};
}

/** Generate a legendary weapon or sacred relic forged from a slain monster's remains */
export function forgeMonsterRelic(
	id: number,
	rng: Rng,
	year: number,
	monster: Monster,
	slayerName: string,
	holderType: 'person' | 'burg' | 'polity',
	holderId: number,
	holderName: string
): Artifact {
	let kind: ArtifactKind = 'weapon';
	let name = '';
	let bonusStat: 'martial' | 'diplomacy' | 'stewardship' | 'intrigue' | 'stability' = 'martial';
	let bonusVal = rng.int(4, 8);
	const fame = rng.int(60, 100);

	if (monster.category === 'dragon') {
		kind = 'weapon';
		const weapons = ['Dragonfang Greatblade', 'Pyre-Forged Cleaver', 'Wyrm-Bane Halberd', 'Blood-Scale Saber'];
		name = rng.pick(weapons);
		bonusStat = 'martial';
		bonusVal = rng.int(5, 9);
	} else if (monster.category === 'biblical') {
		if (monster.species === 'Leviathan') {
			kind = rng.pick<ArtifactKind>(['weapon', 'relic']);
			name = kind === 'weapon' ? 'Abyssal Leviathan Trident' : 'Aegis of the Coiled Abyss';
			bonusStat = kind === 'weapon' ? 'martial' : 'stability';
		} else if (monster.species === 'Behemoth') {
			kind = rng.pick<ArtifactKind>(['weapon', 'relic']);
			name = kind === 'weapon' ? 'Behemoth Horn Maul' : 'Iron-Bone Bulwark';
			bonusStat = kind === 'weapon' ? 'martial' : 'stewardship';
		} else {
			// Ziz
			kind = 'relic';
			name = 'Storm-Feather Mantle of Ziz';
			bonusStat = 'martial';
		}
		bonusVal = rng.int(6, 10);
	} else if (monster.category === 'sea_terror') {
		kind = 'weapon';
		name = 'Abyssal Kraken Harpoon';
		bonusStat = 'martial';
		bonusVal = rng.int(5, 8);
	} else if (monster.category === 'guardian') {
		kind = 'relic';
		name = `${monster.name.split(' ')[0]} Sacred Talisman`;
		bonusStat = 'diplomacy';
		bonusVal = rng.int(4, 7);
	} else {
		kind = 'weapon';
		name = `${monster.species} Trophy Blade`;
		bonusStat = 'martial';
		bonusVal = rng.int(4, 7);
	}

	const origin = `Forged in year ${year} by ${slayerName} from the remains of ${monster.name}.`;
	const lore = `${name}: A fabled ${kind} forged from the remains of the titan ${monster.name}, wielded by ${holderName}.`;

	return {
		id,
		name,
		kind,
		icon: KIND_ICONS[kind],
		fame,
		year,
		origin,
		bonusStat,
		bonusVal,
		holderType,
		holderId,
		holderName,
		lore
	};
}

