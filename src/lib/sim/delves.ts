import { makeRng } from '../rng';
import type { Simulation } from './engine';
import type { Person } from './types';
import { getPartyAggregateSkills } from './party';

export type DungeonTheme =
	| 'ancient_catacomb'
	| 'sunken_vault'
	| 'arcane_labyrinth'
	| 'underdark_chasm'
	| 'titan_barrow';

export type RoomType = 'trap' | 'puzzle' | 'skirmish' | 'treasure' | 'boss';

export interface DelveRoom {
	id: number;
	name: string;
	description: string;
	type: RoomType;
	challengeStat: 'martial' | 'intrigue' | 'stewardship' | 'arcana';
	dc: number;
	gold: number;
	relicChance: number;
	cleared: boolean;
}

export interface DelveDungeon {
	id: string;
	name: string;
	theme: DungeonTheme;
	cell: number;
	layer: number;
	rooms: DelveRoom[];
	currentRoom: number;
	cleared: boolean;
	lootEarned: { gold: number; relics: string[] };
}

interface ThemeTemplate {
	dungeonNames: { prefixes: string[]; suffixes: string[] };
	rooms: {
		trap: { name: string; desc: string }[];
		puzzle: { name: string; desc: string }[];
		skirmish: { name: string; desc: string }[];
		treasure: { name: string; desc: string }[];
		boss: { name: string; desc: string }[];
	};
}

const THEME_DATA: Record<DungeonTheme, ThemeTemplate> = {
	ancient_catacomb: {
		dungeonNames: {
			prefixes: ['Crypt of', 'Catacombs of', 'Sepulcher of', 'Ossuary of', 'Mausoleum of'],
			suffixes: ['the Silent Kings', 'the Ashen Patriarch', 'the Nameless Dead', 'the Hollow Sovereign', 'the First Dynasty']
		},
		rooms: {
			trap: [
				{ name: 'Poison Needle Portcullis', desc: 'A heavy iron gate rigged with dried wyrm venom needles triggered by concealed tripwires.' },
				{ name: 'Sarcophagus Scythe Trap', desc: 'Curved obsidian blades that swing from masonry recesses when floor pavers depress.' },
				{ name: 'Ashen Floor Pit', desc: 'Deceptive flagstones suspended over a dark pit bristling with petrified bone spikes.' }
			],
			puzzle: [
				{ name: 'Hall of Weeping Statues', desc: 'Five hooded effigies facing inward, their tear paths illuminating celestial alignment runes.' },
				{ name: 'Runic Skull Dial', desc: 'A pedestal of carved skulls that must be oriented toward the cardinal points of death.' },
				{ name: 'Hieroglyphic Epitaph Wall', desc: 'Cryptic funerary verses describing the royal bloodline in forgotten glyphs.' }
			],
			skirmish: [
				{ name: 'Spectral Sentinel', desc: 'The glowing phantom of an oath-bound warrior guarding the sepulcher entrance.' },
				{ name: 'Mummified Royal Retinue', desc: 'Embalmed palace guardians rising from stone sarcophagi with tarnished bronze glaives.' },
				{ name: 'Bone-Swarm Legionnaires', desc: 'Animated skeletal soldiers clattering forward in tight shieldwall formation.' }
			],
			treasure: [
				{ name: 'Gilded Sarcophagus', desc: 'An ornate limestone casket encrusted with beaten gold leaf and lapis lazuli.' },
				{ name: 'Funerary Offering Chamber', desc: 'A dusty alcove holding ceremonial gold chalices and silver filigree urns.' },
				{ name: 'Patriarch Treasure Vault', desc: 'Cedar chests bound in verdigris bronze containing dynastic trade bars.' }
			],
			boss: [
				{ name: 'Throne of the Lich-Revenant', desc: 'A decaying sovereign seated upon a bone throne, wreathed in flickering soulfire.' },
				{ name: 'Crypt of the Ashen Tyrant', desc: 'An ancient warrior king awakened from centuries of slumber with a dread greatsword.' }
			]
		}
	},
	sunken_vault: {
		dungeonNames: {
			prefixes: ['Drowned Archive of', 'Sunken Treasury of', 'Abyssal Sluice of', 'Submerged Vault of', 'Oceanic Reliquary of'],
			suffixes: ['Nereis', 'the Coral Sovereign', 'the Sunken Citadel', 'the Leviathan Priests', 'the Drowned Empire']
		},
		rooms: {
			trap: [
				{ name: 'Crushing Hydraulic Gate', desc: 'Massive bronze sluice doors that slam shut, threatening to flood the chamber under ocean pressure.' },
				{ name: 'Electrified Siphon Coil', desc: 'Submerged runic conductors discharging crackling arcane lightning into brackish pools.' },
				{ name: 'Abyssal Whirlpool Basin', desc: 'A roaring drain in the center of the hall dragging intruders toward serrated reef blades.' }
			],
			puzzle: [
				{ name: 'Tide Gauge Valve Chamber', desc: 'A sequence of corroded brass valves that must balance chamber pressures to unlock the bulkhead.' },
				{ name: 'Phosphorescent Coral Mosaic', desc: 'Bioluminescent sea flora whose glowing patterns correspond to harmonic wave sequences.' },
				{ name: 'Submerged Astrolabe Orrery', desc: 'A brass nautical navigation sphere underwater requiring exact tidal alignment.' }
			],
			skirmish: [
				{ name: 'Coral-Crusted Automaton', desc: 'A bronze guardian driven by hydraulic clockwork and overgrown with razor-sharp barnacles.' },
				{ name: 'Deep-Sea Siren Vanguard', desc: 'Scaled aquatic predators striking from murky pools with disorienting sonic cries.' },
				{ name: 'Abyssal Sahuagin Raiders', desc: 'Cold-eyed amphibious warriors wielding barbed sharktooth tridents and nets.' }
			],
			treasure: [
				{ name: 'Sunken Coffer Chamber', desc: 'Watertight chests holding sovereign doubloons, pearl necklaces, and cut aquamarines.' },
				{ name: 'Drowned Navigator Cache', desc: 'A lead-lined coffer preserving ancient navigation scrolls and solid bullion plates.' },
				{ name: 'Pearl-Encrusted Font', desc: 'A scalloped marble basin brimming with iridescent black pearls and sapphire rings.' }
			],
			boss: [
				{ name: 'Sanctum of the Abyssal Leviathan', desc: 'A gigantic sea serpent coiled around a sunken obelisk pulsing with oceanic mana.' },
				{ name: 'Dais of the Coral King', desc: 'The shell-fused monarch of the drowned deep wielding a three-pronged spear of thunder.' }
			]
		}
	},
	arcane_labyrinth: {
		dungeonNames: {
			prefixes: ['Shifting Spire of', 'Labyrinth of', 'Runic Sanctum of', 'Clockwork Maze of', 'Aether Vault of'],
			suffixes: ['Astralar', 'Prismatic Mirrors', 'the Void Weaver', 'the Starless Eye', 'the Archmage Council']
		},
		rooms: {
			trap: [
				{ name: 'Prismatic Disintegration Beam', desc: 'Rotating crystal emitters firing focused rays of elemental disintegration across the hall.' },
				{ name: 'Gravitational Inversion Well', desc: 'A localized gravitational collapse that violently flings travelers against jagged vaulted ceilings.' },
				{ name: 'Temporal Rift Snare', desc: 'A stuttering rift of unstable chronomancy that distorts perception and saps reflexes.' }
			],
			puzzle: [
				{ name: 'Prismatic Mirror Corridor', desc: 'Crystalline reflectors that must be calibrated to redirect a beam of starlight onto runic eyes.' },
				{ name: 'Runic Logic Lock', desc: 'Concentric brass rings engraved with planetary symbols demanding mathematical sequence.' },
				{ name: 'Floating Grimoire Chamber', desc: 'Levitating spellbooks whose parchment leaves whisper secrets when read in harmonic harmony.' }
			],
			skirmish: [
				{ name: 'Archmage Automaton Core', desc: 'A hovering sphere of polished brass and mana crystals firing concentrated kinetic bolts.' },
				{ name: 'Mana-Warped Chimera', desc: 'A predatory chimera infused with raw planar magic, teleporting through dimensional tears.' },
				{ name: 'Rune-Carved Golem', desc: 'A hulking titan of quarried granite humming with protective ward barriers.' }
			],
			treasure: [
				{ name: 'Aetherial Essence Font', desc: 'A crystal basin shimmering with liquid starlight and refined alchemical mercury.' },
				{ name: 'Enchanted Relic Pedestal', desc: 'A levitating obsidian dais displaying gem-inlaid staves and preservation matrices.' },
				{ name: 'Grand Archivist Vault', desc: 'Vellum scrolls preserving lost architectural designs and royal spell formularies.' }
			],
			boss: [
				{ name: 'Sanctum of the Astral Eidolon', desc: 'A celestial entity towering above the chamber, manifested from raw stellar fury.' },
				{ name: 'Throne of the Clockwork Demiurge', desc: 'A mechanical sorcerer fused with the heart engine of the shifting labyrinth.' }
			]
		}
	},
	underdark_chasm: {
		dungeonNames: {
			prefixes: ['Black Fissure of', 'Cavern of', 'Obsidian Grotto of', 'Deep Chasm of', 'Underdark Hollow of'],
			suffixes: ['the Blind Horrors', 'the Gloom Stalkers', 'the Deep Dwellers', 'the Chitin Queen', 'the Silent Abyss']
		},
		rooms: {
			trap: [
				{ name: 'Chasm Web Snare', desc: 'Tensile webs of subterranean cave spiders rigged to drop unwary explorers into black chasms.' },
				{ name: 'Spore Pod Minefield', desc: 'Volatile bioluminescent fungi that explode in choking acid spores upon vibration.' },
				{ name: 'Obsidian Stalactite Trap', desc: 'Precision-loosened volcanic needles poised to plunge from the cavern vault.' }
			],
			puzzle: [
				{ name: 'Echo Cavern Resonance Organ', desc: 'Hollow stalactites that produce acoustic resonance when struck, requiring matching pitch.' },
				{ name: 'Luminescent Fungus Sequence', desc: 'Clusters of cave lichen that flash in rhythmic pulses that must be repeated in sequence.' },
				{ name: 'Shadow-Carved Bas-Relief', desc: 'An obsidian wall depicting the descent of the deep tribes with movable stone tablets.' }
			],
			skirmish: [
				{ name: 'Gloom-Stalker Ambush', desc: 'Chitinous predators dropping silently from the ceiling with dripping venom pincers.' },
				{ name: 'Chittering Chasm Swarm', desc: 'A skittering tide of blind cave horrors scouring the rock floor for warm blood.' },
				{ name: 'Subterranean Drider Vanguard', desc: 'Eight-legged monstrosities armed with obsidian composite bows and poisoned blades.' }
			],
			treasure: [
				{ name: 'Deep Mineral Geode', desc: 'A split cavern wall shimmering with amethyst spikes, raw mithril ore, and diamonds.' },
				{ name: 'Forgotten Miner Hoard', desc: 'An abandoned dwarven mine cart laden with refined silver bars and uncut rubies.' },
				{ name: 'Chasm Cache of the Ancients', desc: 'A sealed obsidian lockbox holding forgotten subterranean relics and emerald rings.' }
			],
			boss: [
				{ name: 'Broodmother Obsidian Lair', desc: 'A colossal spider queen bloated with venom, clinging to a vast web over the abyss.' },
				{ name: 'Sanctum of the Deep Abomination', desc: 'A tentacled leviathan of the underground deep, radiating psychic terror.' }
			]
		}
	},
	titan_barrow: {
		dungeonNames: {
			prefixes: ['Barrow of', 'Iron Mound of', 'Megalith Vault of', 'Shattered Dais of', 'Earthshaker Tomb of'],
			suffixes: ['the Colossus', 'the Titan Lord', 'Kronos', 'the First Behemoth', 'the Granite King']
		},
		rooms: {
			trap: [
				{ name: 'Crushing Megalith Piston', desc: 'A ten-ton block of dressed basalt crashing downward with earth-trembling force.' },
				{ name: 'Molten Slag Vent', desc: 'Pressurized channels discharging blinding sprays of molten volcanic iron across walkways.' },
				{ name: 'Iron Grasp Floor Snare', desc: 'Counterweighted steel jaws forged from titan armor plates snapping shut on footsteps.' }
			],
			puzzle: [
				{ name: 'Cuneiform Tablet Chamber', desc: 'Massive granite slabs inscribed with primordial language requiring contextual translation.' },
				{ name: 'Anvil of the Earthshaker', desc: 'A monumental iron anvil that rings out acoustic chords to shatter barrier glyphs.' },
				{ name: 'Weight of the Mountain Balance', desc: 'A giant stone balance scale demanding counterweight with boulder masses.' }
			],
			skirmish: [
				{ name: 'Iron Golem Sentry Post', desc: 'A towering construct of pitted cast iron wielding a sledgehammer of crushing heft.' },
				{ name: 'Earth-Elemental Guardian', desc: 'A churning vortex of rock and boulder held together by primordial binding spells.' },
				{ name: 'Runic Gargoyle Brute', desc: 'A winged colossus of volcanic tuff diving with devastating stone claws.' }
			],
			treasure: [
				{ name: 'Titan Hoard Vault', desc: 'Gigantic chests sized for colossi, overflowing with raw gold nuggets and heavy silver torcs.' },
				{ name: 'Forge-Master Cache', desc: 'Ingots of star-metal and adamantine resting beside gilded masterwork smithing hammers.' },
				{ name: 'Ancient Colossus Reliquary', desc: 'A vaulted niche holding primordial battle medallions and gem-encrusted belt plates.' }
			],
			boss: [
				{ name: 'Slumbering Colossus Dais', desc: 'A titan of living stone and banded iron awakening from a thousand years of silence.' },
				{ name: 'Throne of the Granite King', desc: 'The primordial lord of earth and stone, wreathed in dust and wielding a mountain maul.' }
			]
		}
	}
};

/**
 * Generate a procedural, deterministic multi-room dungeon ruin.
 * Contains 4 to 6 sequential chambers culminating in a climactic Boss chamber.
 */
export function generateDungeon(
	seed: string,
	cell: number,
	layer: number,
	theme?: DungeonTheme
): DelveDungeon {
	const rng = makeRng(`${seed}:dungeon:${cell}:${layer}`);

	const themes: DungeonTheme[] = [
		'ancient_catacomb',
		'sunken_vault',
		'arcane_labyrinth',
		'underdark_chasm',
		'titan_barrow'
	];
	const selectedTheme = theme ?? rng.pick(themes);
	const template = THEME_DATA[selectedTheme];

	const prefix = rng.pick(template.dungeonNames.prefixes);
	const suffix = rng.pick(template.dungeonNames.suffixes);
	const dungeonName = `${prefix} ${suffix}`;

	const roomCount = rng.int(4, 6);
	const rooms: DelveRoom[] = [];

	const roomPool: RoomType[] = ['trap', 'puzzle', 'skirmish', 'treasure'];

	for (let i = 0; i < roomCount - 1; i++) {
		// Pick room type, ensuring early chambers have diverse challenges
		let rType: RoomType;
		if (i === 0) {
			rType = rng.pick(['trap', 'skirmish']);
		} else if (i === 1) {
			rType = rng.pick(['puzzle', 'skirmish']);
		} else if (i === roomCount - 2) {
			rType = 'treasure';
		} else {
			rType = rng.pick(roomPool);
		}

		const entries = template.rooms[rType];
		const chosen = rng.pick(entries);

		// Challenge stats by room archetype
		let challengeStat: 'martial' | 'intrigue' | 'stewardship' | 'arcana' = 'martial';
		switch (rType) {
			case 'trap':
				challengeStat = 'intrigue';
				break;
			case 'puzzle':
				challengeStat = 'arcana';
				break;
			case 'skirmish':
				challengeStat = 'martial';
				break;
			case 'treasure':
				challengeStat = 'stewardship';
				break;
		}

		const dc = 10 + i * 2 + rng.int(0, 2);
		const baseGold = rType === 'treasure' ? rng.int(60, 120) : rng.int(20, 50);
		const gold = baseGold + i * 10;
		const relicChance = rType === 'treasure' ? 0.35 : rType === 'puzzle' ? 0.2 : 0.1;

		rooms.push({
			id: i + 1,
			name: chosen.name,
			description: chosen.desc,
			type: rType,
			challengeStat,
			dc,
			gold,
			relicChance,
			cleared: false
		});
	}

	// Final chamber: Boss Guardian
	const bossEntry = rng.pick(template.rooms.boss);
	const bossChallengeStat = selectedTheme === 'arcane_labyrinth' ? 'arcana' : 'martial';
	const bossRoom: DelveRoom = {
		id: roomCount,
		name: bossEntry.name,
		description: bossEntry.desc,
		type: 'boss',
		challengeStat: bossChallengeStat,
		dc: 15 + rng.int(1, 3),
		gold: rng.int(120, 220),
		relicChance: 0.75,
		cleared: false
	};
	rooms.push(bossRoom);

	return {
		id: `${seed}-${cell}-${layer}`,
		name: dungeonName,
		theme: selectedTheme,
		cell,
		layer,
		rooms,
		currentRoom: 0,
		cleared: false,
		lootEarned: { gold: 0, relics: [] }
	};
}

/**
 * Execute an action attempt against the current chamber of a dungeon.
 * Evaluates the party aggregate skill against the room DC, modifies health and gold,
 * and rolls for rare relics.
 */
export function attemptDelveRoom(
	sim: Simulation,
	dungeon: DelveDungeon,
	avatarId: number,
	tactic: 'assault' | 'cunning' | 'lore' | 'bribe'
): {
	success: boolean;
	text: string;
	damage: number;
	gold: number;
	relicAwarded?: string;
	finished: boolean;
} {
	if (dungeon.cleared || dungeon.currentRoom >= dungeon.rooms.length) {
		return {
			success: true,
			text: `${dungeon.name} has already been conquered in full.`,
			damage: 0,
			gold: 0,
			finished: true
		};
	}

	const room = dungeon.rooms[dungeon.currentRoom];
	const avatar = sim.people[avatarId];
	if (!avatar || !avatar.alive) {
		return {
			success: false,
			text: 'The party leader is incapacitated.',
			damage: 0,
			gold: 0,
			finished: false
		};
	}

	const skills = getPartyAggregateSkills(sim, avatarId);

	let statVal = 0;
	let synergy = 0;
	switch (tactic) {
		case 'assault':
			statVal = skills.martial;
			if (room.challengeStat === 'martial') synergy = 3;
			break;
		case 'cunning':
			statVal = skills.intrigue;
			if (room.challengeStat === 'intrigue') synergy = 3;
			break;
		case 'lore':
			statVal = skills.arcana;
			if (room.challengeStat === 'arcana') synergy = 3;
			break;
		case 'bribe':
			statVal = skills.stewardship;
			if (room.challengeStat === 'stewardship') synergy = 3;
			break;
	}

	const roll = sim.rng.int(1, 20);
	const statBonus = Math.floor(statVal / 2);
	const totalScore = roll + statBonus + synergy;
	const isSuccess = totalScore >= room.dc;

	const companions = (avatar.companions ?? [])
		.map((id) => sim.people[id])
		.filter((p): p is Person => Boolean(p && p.alive));

	const tacticLabels: Record<typeof tactic, string> = {
		assault: 'martial assault',
		cunning: 'cunning disarm and stealth',
		lore: 'arcane deciphering',
		bribe: 'shrewd negotiation and offering'
	};

	if (isSuccess) {
		room.cleared = true;

		// Quartermaster increases loot acquisition
		const hasQuartermaster = avatar.partyRole === 'quartermaster' || companions.some((c) => c.partyRole === 'quartermaster');
		const goldAwarded = hasQuartermaster ? Math.round(room.gold * 1.3) : room.gold;

		avatar.gold += goldAwarded;
		dungeon.lootEarned.gold += goldAwarded;

		const renownGain = room.type === 'boss' ? 12 : 3;
		avatar.renown += renownGain;

		// Lorekeeper improves relic identification and recovery
		const hasLorekeeper = avatar.partyRole === 'lorekeeper' || companions.some((c) => c.partyRole === 'lorekeeper');
		const effectiveRelicChance = hasLorekeeper ? Math.min(0.95, room.relicChance + 0.2) : room.relicChance;

		let relicAwarded: string | undefined;
		if (sim.rng.chance(effectiveRelicChance)) {
			const relicAdjectives = ['Ancient', 'Sacred', 'Gilded', 'Shadowed', 'Prismatic', 'Titan-Forged'];
			const relicNouns = ['Amulet', 'Blade', 'Chalice', 'Tome', 'Circlet', 'Signet'];
			const relicName = `${sim.rng.pick(relicAdjectives)} ${sim.rng.pick(relicNouns)} of ${dungeon.name.split(' ').slice(1).join(' ') || 'the Ruin'}`;
			relicAwarded = relicName;
			dungeon.lootEarned.relics.push(relicName);

			if (sim.artifacts) {
				const artId = sim.nextArtifactId ? sim.nextArtifactId++ : sim.artifacts.length + 1;
				sim.artifacts.push({
					id: artId,
					name: relicName,
					kind: 'relic',
					icon: '✦',
					fame: 45 + sim.rng.int(10, 45),
					year: sim.year,
					origin: `${dungeon.name}, ${room.name}`,
					bonusStat: sim.rng.pick(['martial', 'diplomacy', 'stewardship', 'intrigue']),
					bonusVal: sim.rng.int(2, 5),
					holderType: 'person',
					holderId: avatar.id,
					holderName: `${avatar.name} ${avatar.house}`,
					lore: `Recovered from ${dungeon.name} during an expedition into ${room.name}.`
				});
			}
		}

		dungeon.currentRoom++;
		const finished = dungeon.currentRoom >= dungeon.rooms.length;
		if (finished) {
			dungeon.cleared = true;
		}

		let text = `Victory in ${room.name}! Through ${tacticLabels[tactic]} (rolled ${totalScore} vs DC ${room.dc}), the party prevailed and secured ${goldAwarded} gold.`;
		if (relicAwarded) {
			text += ` Discovered legendary relic: ${relicAwarded}!`;
		}
		if (finished) {
			text += ` ${dungeon.name} has been thoroughly conquered and plundered!`;
		}

		if (sim.log) {
			sim.log('avatar', text);
		}

		return {
			success: true,
			text,
			damage: 0,
			gold: goldAwarded,
			relicAwarded,
			finished
		};
	} else {
		// Champion shields party and mitigates incoming physical harm
		const hasChampion = avatar.partyRole === 'champion' || companions.some((c) => c.partyRole === 'champion');
		const baseDamage = room.type === 'boss' ? sim.rng.int(16, 28) : sim.rng.int(6, 16);
		const damage = hasChampion ? Math.max(3, Math.round(baseDamage * 0.65)) : baseDamage;

		avatar.health = Math.max(1, avatar.health - damage);
		for (const c of companions) {
			if (c.alive) {
				c.health = Math.max(1, c.health - Math.floor(damage / 2));
			}
		}

		const text = `Setback in ${room.name}! The attempt at ${tacticLabels[tactic]} faltered (rolled ${totalScore} vs DC ${room.dc}). The party took ${damage} damage from hazards and counter-attacks.`;

		if (sim.log) {
			sim.log('avatar', text);
		}

		return {
			success: false,
			text,
			damage,
			gold: 0,
			finished: false
		};
	}
}
