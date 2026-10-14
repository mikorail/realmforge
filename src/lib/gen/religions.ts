import type { Rng } from '../rng';
import type { DoctrineKind, TheologyKind } from './types';

export interface DoctrineMeta {
	id: DoctrineKind;
	name: string;
	icon: string;
	desc: string;
	clergyTitle: string;
	bonus: {
		conversionSpeed?: number;
		stability?: number;
		armyMorale?: number;
		harmony?: number;
	};
}

export const THEOLOGIES: Record<TheologyKind, { id: TheologyKind; name: string; icon: string; desc: string }> = {
	monotheism: {
		id: 'monotheism',
		name: 'Monotheism',
		icon: '☀️',
		desc: 'Veneration of a singular, all-encompassing supreme creator and judge.'
	},
	polytheism: {
		id: 'polytheism',
		name: 'Polytheism',
		icon: '⚡',
		desc: 'A diverse pantheon of patron gods governing elements, war, and fertility.'
	},
	animism: {
		id: 'animism',
		name: 'Animism',
		icon: '🌿',
		desc: 'Sacred spirits inhabiting forests, rivers, mountains, and beasts.'
	},
	pantheism: {
		id: 'pantheism',
		name: 'Pantheism',
		icon: '🌌',
		desc: 'The entire universe and nature embody the divine living mind.'
	},
	dualism: {
		id: 'dualism',
		name: 'Cosmic Dualism',
		icon: '☯️',
		desc: 'An eternal clash between the cosmic light of truth and primordial dark.'
	}
};

export const DOCTRINES: Record<DoctrineKind, DoctrineMeta> = {
	caste: {
		id: 'caste',
		name: 'Caste System',
		icon: '⚖️',
		desc: 'Hierarchical social order where sacred duty and lineage determine societal station.',
		clergyTitle: 'High Brahmin',
		bonus: { stability: 12, conversionSpeed: 0.8 }
	},
	evangelical: {
		id: 'evangelical',
		name: 'Evangelical Zeal',
		icon: '🕊️',
		desc: 'Fervent missionary mandate to proclaim the holy revelation to all mortal lands.',
		clergyTitle: 'Apostolic Overseer',
		bonus: { conversionSpeed: 1.5, stability: 4 }
	},
	militant: {
		id: 'militant',
		name: 'Holy Crusade',
		icon: '⚔️',
		desc: 'Confrontational and martial faith commanding holy warriors to defend and expand the creed.',
		clergyTitle: 'Grand Inquisitor',
		bonus: { armyMorale: 0.15, stability: 6 }
	},
	liberation: {
		id: 'liberation',
		name: 'Sacred Freedom',
		icon: '🔥',
		desc: 'Reverence for free will, personal autonomy, and resistance against earthly despots.',
		clergyTitle: 'Elder Guide',
		bonus: { harmony: 10, stability: -4 }
	},
	compassion: {
		id: 'compassion',
		name: 'Universal Love & Charity',
		icon: '🌸',
		desc: 'Vows of non-violence, communal hospices, and healing of the sick and destitute.',
		clergyTitle: 'Abbot of Mercy',
		bonus: { harmony: 15, stability: 8 }
	},
	esoteric: {
		id: 'esoteric',
		name: 'Arcane Mysteries',
		icon: '🔮',
		desc: 'Occult inner circles, ciphered grimoires, and secret initiations for the enlightened.',
		clergyTitle: 'Hierophant',
		bonus: { conversionSpeed: 0.6, stability: 5 }
	},
	ancestral: {
		id: 'ancestral',
		name: 'Ancestor Veneration',
		icon: '🏮',
		desc: 'Filial rites, remembrance shrines, and seeking guidance from the honoured departed.',
		clergyTitle: 'Patriarch',
		bonus: { stability: 10, harmony: 8 }
	}
};

/** Assign theology, doctrine, and rites to a religion */
export function assignReligionIdentity(
	rng: Rng,
	type: 'Folk' | 'Organized' | 'Cult',
	sphere: string
): { theology: TheologyKind; doctrine: DoctrineKind; features: string[] } {
	let theology: TheologyKind;
	let doctrine: DoctrineKind;

	if (type === 'Folk') {
		const roll = rng();
		theology = roll < 0.45 ? 'animism' : roll < 0.8 ? 'polytheism' : 'pantheism';
		doctrine = rng.pick(['ancestral', 'compassion', 'liberation']);
	} else if (type === 'Cult') {
		theology = rng.pick(['dualism', 'pantheism', 'polytheism']);
		doctrine = rng.pick(['esoteric', 'militant', 'liberation']);
	} else {
		// Organized
		const roll = rng();
		theology = roll < 0.4 ? 'monotheism' : roll < 0.75 ? 'polytheism' : 'dualism';
		doctrine = rng.pick(['caste', 'evangelical', 'militant', 'compassion', 'ancestral']);
	}

	const features: string[] = [
		THEOLOGIES[theology].name,
		DOCTRINES[doctrine].name,
		`Clergy: ${DOCTRINES[doctrine].clergyTitle}`
	];

	return { theology, doctrine, features };
}
