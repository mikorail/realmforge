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
		name: 'Supreme High Creator',
		icon: '☀️',
		desc: 'Veneration of a singular, all-encompassing supreme creator and celestial judge.'
	},
	polytheism: {
		id: 'polytheism',
		name: 'Celestial Olympian Pantheon',
		icon: '⚡',
		desc: 'A diverse celestial pantheon of patron gods governing elements, war, and fertility.'
	},
	animism: {
		id: 'animism',
		name: 'Local Spirits of Forests & Mountains',
		icon: '🌿',
		desc: 'Sacred terrestrial spirits inhabiting ancient groves, rivers, mountains, and beasts.'
	},
	chaos_cult: {
		id: 'chaos_cult',
		name: 'Ruinous Powers & Chaos Gods',
		icon: '🩸',
		desc: 'Devotion to the primordial dark powers of blood, sorcery, decay, and excess.'
	},
	eldritch_horror: {
		id: 'eldritch_horror',
		name: 'Old Gods & Cosmic Abyssal Horrors',
		icon: '🐙',
		desc: 'Dread communion with void leviathans and dreaming horrors slumbering beyond reality.'
	},
	ancestral: {
		id: 'ancestral',
		name: 'Deified God-Emperors & Ancestral Kings',
		icon: '👑',
		desc: 'Reverence for royal bloodlines and ancient god-kings elevated to eternal divinity.'
	},
	pantheism: {
		id: 'pantheism',
		name: 'Living World Mind',
		icon: '🌌',
		desc: 'The entire universe and living world embody the divine, unified consciousness.'
	},
	dualism: {
		id: 'dualism',
		name: 'Cosmic Light vs Primordial Dark',
		icon: '☯️',
		desc: 'An eternal war between transcendent light and primeval shadow.'
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
	},
	blood_offering: {
		id: 'blood_offering',
		name: 'Blood Offering',
		icon: '🩸',
		desc: 'Sacrificial blood spilled upon desecrated altars to feed the hunger of Ruinous Powers.',
		clergyTitle: 'Blood Priest',
		bonus: { armyMorale: 0.22, stability: -6 }
	},
	mutation_rites: {
		id: 'mutation_rites',
		name: 'Mutation Rites',
		icon: '🔮',
		desc: 'Warp-touched rituals celebrating grotesque physical gifts and chaotic metamorphosis.',
		clergyTitle: 'Warp Weaver',
		bonus: { armyMorale: 0.14, conversionSpeed: 1.3 }
	},
	void_whispers: {
		id: 'void_whispers',
		name: 'Void Whispers',
		icon: '🐙',
		desc: 'Listening to the maddening cosmic echoes radiating from slumbering abyssal leviathans.',
		clergyTitle: 'Void Oracle',
		bonus: { conversionSpeed: 1.4, harmony: -6 }
	},
	cyclopean_rites: {
		id: 'cyclopean_rites',
		name: 'Cyclopean Rites',
		icon: '🌀',
		desc: 'Monumental basalt architecture, non-Euclidean monoliths, and abyssal chant circles.',
		clergyTitle: 'Abyssal Hierophant',
		bonus: { stability: 14, conversionSpeed: 0.8 }
	},
	sacred_grove: {
		id: 'sacred_grove',
		name: 'Sacred Grove',
		icon: '🦌',
		desc: 'Sanctified primeval woodlands, standing stones, and bloodless communion with flora.',
		clergyTitle: 'Archdruid',
		bonus: { harmony: 16, stability: 8 }
	},
	mountain_pact: {
		id: 'mountain_pact',
		name: 'Mountain Pact',
		icon: '🏔️',
		desc: 'Solemn covenants sworn to mountain colossi and subterranean spirits of living stone.',
		clergyTitle: 'Runepriest',
		bonus: { stability: 15, armyMorale: 0.1 }
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
		theology = roll < 0.35 ? 'animism' : roll < 0.65 ? 'polytheism' : roll < 0.85 ? 'pantheism' : 'ancestral';
		doctrine = rng.pick(['ancestral', 'compassion', 'liberation', 'sacred_grove', 'mountain_pact']);
	} else if (type === 'Cult') {
		theology = rng.pick(['chaos_cult', 'eldritch_horror', 'dualism', 'pantheism', 'polytheism']);
		doctrine = rng.pick(['blood_offering', 'mutation_rites', 'void_whispers', 'cyclopean_rites', 'esoteric', 'militant']);
	} else {
		// Organized
		const roll = rng();
		theology = roll < 0.35 ? 'monotheism' : roll < 0.65 ? 'polytheism' : roll < 0.85 ? 'dualism' : 'ancestral';
		doctrine = rng.pick(['caste', 'evangelical', 'militant', 'compassion', 'ancestral', 'mountain_pact', 'sacred_grove']);
	}

	const features: string[] = [
		THEOLOGIES[theology].name,
		DOCTRINES[doctrine].name,
		`Clergy: ${DOCTRINES[doctrine].clergyTitle}`
	];

	return { theology, doctrine, features };
}
