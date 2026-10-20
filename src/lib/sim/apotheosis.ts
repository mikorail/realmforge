import type { Simulation } from './engine';
import type { Person } from './types';
import type { Burg } from '../gen/types';
import { clamp } from '../rng';

export type ApotheosisPortfolio =
	| 'storm'
	| 'war'
	| 'secrets'
	| 'harvest'
	| 'death'
	| 'forge'
	| 'chaos'
	| 'sun'
	| 'abyss';

export interface ApotheosisState {
	ascended: boolean;
	deityName: string;
	portfolio: ApotheosisPortfolio;
	constellation: string;
	holyOrderName: string;
	prayerMana: number;
	followers: number;
	miraclesCast: number;
	domainPerks: string[];
	personId: number;
	shrineBurgId: number;
	shrineCell: number;
	yearAscended: number;
}

export interface ApotheosisSimData {
	apotheoses: Map<number, ApotheosisState>;
}

const simApotheosisMap = new WeakMap<Simulation, ApotheosisSimData>();

export function getApotheosisSimData(sim: Simulation): ApotheosisSimData {
	let data = simApotheosisMap.get(sim);
	if (!data) {
		const raw = (sim as unknown as { _apotheosisData?: ApotheosisSimData })._apotheosisData;
		if (raw) {
			data = raw;
		} else {
			data = {
				apotheoses: new Map()
			};
			(sim as unknown as { _apotheosisData?: ApotheosisSimData })._apotheosisData = data;
		}
		simApotheosisMap.set(sim, data);
	}
	return data;
}

export const PORTFOLIO_CONFIG: Record<
	ApotheosisPortfolio,
	{
		title: string;
		constellation: string;
		orderDefault: string;
		perks: string[];
		namePrefix: string;
	}
> = {
	storm: {
		title: 'Tempests and Sky',
		constellation: 'The Roaring Tempest',
		orderDefault: 'Order of the Rising Tempest',
		perks: ['Tempest Ward', 'Thunderous Strike', 'Call Storms'],
		namePrefix: 'the Storm Lord'
	},
	war: {
		title: 'War and Dominion',
		constellation: 'The Crimson Blade',
		orderDefault: 'Order of the Iron Aegis',
		perks: ['Martial Radiance', 'Unyielding Vanguard', 'Battle Fervor'],
		namePrefix: 'the Iron Warlord'
	},
	secrets: {
		title: 'Shadows and Secrets',
		constellation: 'The Veiled Eye',
		orderDefault: 'Order of the Whispering Shroud',
		perks: ['Veil of Shadows', 'Whispering Oracle', 'Mind Fracture'],
		namePrefix: 'the Veiled Whisperer'
	},
	harvest: {
		title: 'Earth and Abundance',
		constellation: 'The Golden Sickle',
		orderDefault: 'Order of the Gilded Scythe',
		perks: ['Abundant Bounty', 'Floral Rebirth', 'Famine Ward'],
		namePrefix: 'the Earth Mother'
	},
	death: {
		title: 'Underworld and Mortality',
		constellation: 'The Obsidian Hourglass',
		orderDefault: 'Order of the Silent Gate',
		perks: ['Grave Ward', 'Soul Harvest', 'Immortal Will'],
		namePrefix: 'the Pale Sovereign'
	},
	forge: {
		title: 'Craft and Creation',
		constellation: 'The Anvil of Stars',
		orderDefault: 'Order of the Eternal Flame',
		perks: ['Celestial Smithing', 'Adamantine Armor', 'Molten Hearth'],
		namePrefix: 'the Prime Smith'
	},
	chaos: {
		title: 'Entropy and Change',
		constellation: 'The Wandering Comet',
		orderDefault: 'Order of the Primordial Fracture',
		perks: ['Entropic Surge', 'Wild Fortune', 'Reality Warp'],
		namePrefix: 'the Entropic Spark'
	},
	sun: {
		title: 'Light and Dawn',
		constellation: 'The Solar Crown',
		orderDefault: 'Order of the Radiant Dawn',
		perks: ['Solar Flare', 'Purifying Light', 'Eternal Dawn'],
		namePrefix: 'the Sunbringer'
	},
	abyss: {
		title: 'The Deep Void',
		constellation: 'The Leviathan Spiral',
		orderDefault: 'Order of the Abyssal Tide',
		perks: ['Void Grasp', 'Deep Trench Call', 'Eldritch Tides'],
		namePrefix: 'of the Deep Void'
	}
};

/**
 * Checks whether a mortal has gathered the renown or epic feats necessary for apotheosis.
 * Criteria: Renown >= 85, or has slain a Cataclysm beast, or has reigned as legendary sovereign / archmage.
 */
export function canAscendToGodhood(
	sim: Simulation,
	personId: number
): { eligible: boolean; reqRenown: number; reqTrophyOrFeat: boolean; reason?: string } {
	const person = sim.people[personId];
	if (!person) {
		return {
			eligible: false,
			reqRenown: 85,
			reqTrophyOrFeat: false,
			reason: 'Mortal candidate does not exist in world records.'
		};
	}

	const hasRenown = (person.renown ?? 0) >= 85;

	// Check if person has slain a Cataclysm tier beast
	const hasCataclysmBeast =
		(sim.monsters &&
			sim.monsters.some(
				(m) =>
					m.tier === 'cataclysm' &&
					!m.alive &&
					(m.slayer === person.name || (m.slayer && m.slayer.includes(person.name)))
			)) ||
		person.traits.some(
			(t) =>
				t.toLowerCase().includes('cataclysm') ||
				t.toLowerCase().includes('godslayer') ||
				t.toLowerCase().includes('titan slayer')
		);

	// Check if person is a legendary sovereign or archmage
	const isLegendarySovereign =
		(person.role === 'ruler' || (person.regnal ?? 0) > 0) &&
		(person.traits.includes('Legendary') ||
			person.traits.includes('Immortal') ||
			person.traits.includes('High Sovereign') ||
			(person.renown ?? 0) >= 70);

	const isArchmage =
		(person.role === 'magician' ||
			person.traits.includes('Archmage') ||
			person.traits.includes('Grand Archmage') ||
			person.traits.includes('Mystic')) &&
		(person.traits.includes('Legendary') || (person.renown ?? 0) >= 70);

	const reqTrophyOrFeat = hasCataclysmBeast || isLegendarySovereign || isArchmage;
	const eligible = hasRenown || reqTrophyOrFeat;

	let reason: string;
	if (eligible) {
		if (hasRenown && reqTrophyOrFeat) {
			reason = 'Renown reaches 85 and extraordinary legendary feats have illuminated the realm.';
		} else if (hasRenown) {
			reason = 'Mortal renown has achieved the divine threshold of 85.';
		} else if (hasCataclysmBeast) {
			reason = 'The trophy of a slain cataclysm titan proves readiness for godhood.';
		} else {
			reason = 'Legendary reign as sovereign or grand archmage has elevated this soul above mortals.';
		}
	} else {
		reason = 'Requires 85 renown, a cataclysm beast trophy, or legendary sovereign / archmage status.';
	}

	return {
		eligible,
		reqRenown: 85,
		reqTrophyOrFeat,
		reason
	};
}

/**
 * Finds the nearest living burg to a target cell or person location.
 */
function findNearestSettlement(sim: Simulation, targetCell: number): Burg | null {
	const burgs = sim.w.burgs.filter((b) => b && b.id > 0 && b.alive);
	if (burgs.length === 0) return null;

	const cellX = sim.w.cells.x[targetCell] ?? 0;
	const cellY = sim.w.cells.y[targetCell] ?? 0;

	let best = burgs[0];
	let bestDist = Infinity;

	for (const b of burgs) {
		const bx = sim.w.cells.x[b.cell] ?? 0;
		const by = sim.w.cells.y[b.cell] ?? 0;
		const dx = cellX - bx;
		const dy = cellY - by;
		const dist = dx * dx + dy * dy;
		if (dist < bestDist) {
			bestDist = dist;
			best = b;
		}
	}

	return best;
}

/**
 * Performs divine apotheosis: elevates a mortal person to an immortal God-King.
 * Establishes Holy Order, crowns constellation, and grants starting prayer mana and followers.
 */
export function performApotheosis(
	sim: Simulation,
	personId: number,
	portfolio: ApotheosisPortfolio,
	deityName?: string,
	orderName?: string
): { success: boolean; apotheosis: ApotheosisState; msg: string } {
	const person = sim.people[personId];
	if (!person) {
		throw new Error(`Person with id ${personId} not found.`);
	}

	const config = PORTFOLIO_CONFIG[portfolio] ?? PORTFOLIO_CONFIG.sun;
	const resolvedDeityName = deityName?.trim() || `${person.name} ${config.namePrefix}`;
	const resolvedConstellation = config.constellation;
	const resolvedOrderName = orderName?.trim() || config.orderDefault;

	// Establish nearest settlement for the Holy Order shrine
	let shrineBurg = person.burg > 0 ? sim.w.burgs[person.burg] : null;
	if (!shrineBurg || !shrineBurg.alive) {
		shrineBurg = findNearestSettlement(sim, person.burg > 0 ? shrineBurg?.cell ?? 0 : 0);
	}
	const shrineBurgId = shrineBurg ? shrineBurg.id : 0;
	const shrineCell = shrineBurg ? shrineBurg.cell : (person.burg > 0 ? sim.w.burgs[person.burg]?.cell ?? 0 : 0);

	// Immortal God-King transformation
	person.alive = true;
	person.health = 100;
	if (!person.traits.includes('Immortal')) person.traits.push('Immortal');
	if (!person.traits.includes('God-King')) person.traits.push('God-King');
	if (!person.traits.includes('Ascended')) person.traits.push('Ascended');
	person.epithet = `the Ascended God of ${config.title}`;

	// Initial followers based on settlement size or standard devout flock
	const initialFollowers = shrineBurg ? Math.max(800, Math.round(shrineBurg.pop * 120)) : 1000;

	const apotheosis: ApotheosisState = {
		ascended: true,
		deityName: resolvedDeityName,
		portfolio,
		constellation: resolvedConstellation,
		holyOrderName: resolvedOrderName,
		prayerMana: 100,
		followers: initialFollowers,
		miraclesCast: 0,
		domainPerks: [...config.perks],
		personId,
		shrineBurgId,
		shrineCell,
		yearAscended: sim.year
	};

	const data = getApotheosisSimData(sim);
	data.apotheoses.set(personId, apotheosis);

	// Log epic divine ascension event strictly without em dashes
	const burgName = shrineBurg ? shrineBurg.name : 'the sacred highlands';
	const logMsg = `${person.name} ascends to divine godhood as ${resolvedDeityName}, Deity of ${config.title}. Constellation ${resolvedConstellation} blazes in the firmament, and the ${resolvedOrderName} is consecrated in ${burgName}.`;
	sim.log('god', logMsg, shrineCell, person.state > 0 ? person.state : undefined);

	return {
		success: true,
		apotheosis,
		msg: logMsg
	};
}

/**
 * Casts a divine miracle powered by accumulated prayer mana.
 */
export function castApotheosisMiracle(
	sim: Simulation,
	personId: number,
	miracle: 'smite_army' | 'bless_province' | 'quell_revolt' | 'avatar_host',
	targetCell: number
): { success: boolean; msg: string } {
	const data = getApotheosisSimData(sim);
	const apotheosis = data.apotheoses.get(personId);
	if (!apotheosis || !apotheosis.ascended) {
		return {
			success: false,
			msg: 'Divine ascension has not yet been achieved by this candidate.'
		};
	}

	const costs: Record<'smite_army' | 'bless_province' | 'quell_revolt' | 'avatar_host', number> = {
		smite_army: 40,
		bless_province: 30,
		quell_revolt: 35,
		avatar_host: 50
	};

	const cost = costs[miracle];
	if (apotheosis.prayerMana < cost) {
		return {
			success: false,
			msg: `Insufficient prayer mana: miracle requires ${cost} mana, but only ${apotheosis.prayerMana} is available.`
		};
	}

	apotheosis.prayerMana -= cost;
	apotheosis.miraclesCast++;

	let outcomeText = '';

	if (miracle === 'smite_army') {
		// Disperse hostile armies or monsters near target cell
		let smittenArmyCount = 0;
		if (sim.armyTokens && sim.armyTokens.length > 0) {
			const targetX = sim.w.cells.x[targetCell] ?? 0;
			const targetY = sim.w.cells.y[targetCell] ?? 0;
			for (const token of sim.armyTokens) {
				const dx = token.x - targetX;
				const dy = token.y - targetY;
				if (dx * dx + dy * dy < 2500) {
					token.size = Math.max(0, Math.floor(token.size * 0.25));
					smittenArmyCount++;
				}
			}
		}

		// Also strike monsters if any dwell at this cell
		let monsterHit = false;
		if (sim.monsters) {
			for (const m of sim.monsters) {
				if (m.alive && m.cell === targetCell) {
					m.health = Math.max(0, m.health - 60);
					if (m.health <= 0) {
						m.alive = false;
						m.slayer = apotheosis.deityName;
						m.slainYear = sim.year;
					}
					monsterHit = true;
				}
			}
		}

		outcomeText = smittenArmyCount > 0 || monsterHit
			? `${apotheosis.deityName} smites the forces at cell ${targetCell} with thunderous wrath, scattering ranks and crushing defiance.`
			: `${apotheosis.deityName} casts divine thunderbolts across cell ${targetCell}, incinerating enemy camps and intimidating nearby realms.`;
	} else if (miracle === 'bless_province') {
		// Cleanse plague, boost harvest, and elevate realm stability
		sim.plague[targetCell] = 0;
		const cellStateId = sim.w.cells.state[targetCell];
		if (cellStateId > 0 && sim.polities[cellStateId]) {
			const pol = sim.polities[cellStateId];
			pol.stability = clamp(pol.stability + 15, 0, 100);
			pol.treasury += 40;
		}
		outcomeText = `${apotheosis.deityName} bestows celestial blessings upon province ${targetCell}, purifying the soil and bringing wondrous abundance.`;
	} else if (miracle === 'quell_revolt') {
		// Pacify uprisings and unrest
		let uprisingsQuashed = 0;
		if (sim.uprisings) {
			for (const u of sim.uprisings) {
				if (u.active && (u.cell === targetCell || (u.burgId > 0 && sim.w.burgs[u.burgId]?.cell === targetCell))) {
					u.active = false;
					uprisingsQuashed++;
				}
			}
		}
		const cellStateId = sim.w.cells.state[targetCell];
		if (cellStateId > 0) {
			sim.unrestUntil.delete(cellStateId);
			if (sim.polities[cellStateId]) {
				sim.polities[cellStateId].stability = clamp(sim.polities[cellStateId].stability + 20, 0, 100);
			}
		}
		outcomeText = uprisingsQuashed > 0
			? `${apotheosis.deityName} manifests in radiant majesty, pacifying revolts and restoring righteous peace in cell ${targetCell}.`
			: `${apotheosis.deityName} soothes civil grievances and solidifies royal harmony throughout cell ${targetCell}.`;
	} else if (miracle === 'avatar_host') {
		// Summon divine host / avatar empowerment
		const person = sim.people[personId];
		if (person) {
			person.renown += 25;
			person.health = 100;
		}
		const cellStateId = sim.w.cells.state[targetCell];
		if (cellStateId > 0 && sim.polities[cellStateId]) {
			sim.polities[cellStateId].army += 40;
		}
		outcomeText = `${apotheosis.deityName} summons an army of celestial spirits and heavenly guardians to protect cell ${targetCell}.`;
	}

	sim.log('god', outcomeText, targetCell);

	return {
		success: true,
		msg: outcomeText
	};
}

/**
 * Annual simulation hook for divine apotheosis:
 * Generates prayer mana tithes, expands Holy Order presence, and welcomes pilgrimages.
 */
export function processYearlyApotheosis(
	sim: Simulation
): { events: { text: string; cell?: number; state?: number }[] } {
	const data = getApotheosisSimData(sim);
	const events: { text: string; cell?: number; state?: number }[] = [];

	for (const apotheosis of data.apotheoses.values()) {
		if (!apotheosis.ascended) continue;

		// Annual tithe from devout followers
		const manaGained = Math.max(12, Math.floor(apotheosis.followers / 60));
		apotheosis.prayerMana += manaGained;

		// Follower population organic spread (+6% to +10% annually)
		const growth = Math.max(25, Math.floor(apotheosis.followers * 0.08));
		apotheosis.followers += growth;

		// Pilgrims journeying to sacred shrine
		const shrineBurg = apotheosis.shrineBurgId > 0 ? sim.w.burgs[apotheosis.shrineBurgId] : null;
		if (shrineBurg && shrineBurg.alive) {
			const stateId = shrineBurg.state;
			if (stateId > 0 && sim.polities[stateId]) {
				sim.polities[stateId].treasury += 15;
			}
		}

		// Milestone celebrations every 10 years or significant milestones
		const age = sim.year - apotheosis.yearAscended;
		if (age > 0 && age % 10 === 0) {
			const evtText = `The grand festival of ${apotheosis.deityName} gathers thousands of devout pilgrims to celebrate ${age} years of divine guidance.`;
			events.push({
				text: evtText,
				cell: apotheosis.shrineCell,
				state: shrineBurg?.state
			});
			sim.log('god', evtText, apotheosis.shrineCell, shrineBurg?.state);
		}
	}

	return { events };
}

/**
 * Retrieves the apotheosis state for a person if they have ascended.
 */
export function getApotheosis(sim: Simulation, personId: number): ApotheosisState | null {
	const data = getApotheosisSimData(sim);
	return data.apotheoses.get(personId) ?? null;
}

/**
 * Retrieves all registered apotheosis states in the simulation.
 */
export function getAllApotheoses(sim: Simulation): ApotheosisState[] {
	const data = getApotheosisSimData(sim);
	return Array.from(data.apotheoses.values());
}
