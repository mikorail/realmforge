import type { Burg, BurgDistricts } from '../gen/types';
import type { Simulation } from './engine';

export type DistrictKind = keyof BurgDistricts;

export interface DistrictTierMeta {
	level: number;
	name: string;
	desc: string;
	effects: string;
}

export interface DistrictMeta {
	id: DistrictKind;
	name: string;
	icon: string;
	desc: string;
	levels: DistrictTierMeta[];
}

export const DISTRICT_UPGRADE_COSTS: Record<number, number> = {
	0: 25,
	1: 60,
	2: 120
};

export const DISTRICT_DEFINITIONS: Record<DistrictKind, DistrictMeta> = {
	walls: {
		id: 'walls',
		name: 'Defensive Walls',
		icon: '🏰',
		desc: 'Curtain walls and bastions guarding against hostile sieges and monstrous beasts.',
		levels: [
			{
				level: 0,
				name: 'Unfortified',
				desc: 'Open settlement with no perimeter barriers.',
				effects: 'Standard defense'
			},
			{
				level: 1,
				name: 'Timber Palisades',
				desc: 'Stout wooden stockade and watch posts protecting against frontier skirmishes.',
				effects: '+35% siege resistance, 15% beast damage reduction'
			},
			{
				level: 2,
				name: 'Stone Ramparts',
				desc: 'Ashlar masonry ramparts with battlements, crenels, and reinforced iron gates.',
				effects: '+70% siege resistance, 30% beast damage reduction'
			},
			{
				level: 3,
				name: 'Citadel',
				desc: 'Towering multi-ring bastion with moats, curtain towers, and subterranean redoubts.',
				effects: '+105% siege resistance, 45% beast damage reduction'
			}
		]
	},
	market: {
		id: 'market',
		name: 'Trade Market',
		icon: '🪙',
		desc: 'Commercial infrastructure attracting traders, merchant caravans, and guild houses.',
		levels: [
			{
				level: 0,
				name: 'Local Stalls',
				desc: 'Rudimentary booths for local barter and seasonal crop exchange.',
				effects: 'Baseline trade yield'
			},
			{
				level: 1,
				name: 'Trading Post',
				desc: 'Permanent storefronts, weighing stations, and foreign merchant hostels.',
				effects: '+15% trade tax yield, +3 gold annually to realm treasury'
			},
			{
				level: 2,
				name: 'Grand Bazaar',
				desc: 'Sprawling trade pavilions, spice vaults, and long-distance caravan convoys.',
				effects: '+30% trade tax yield, +7 gold annually to realm treasury'
			},
			{
				level: 3,
				name: 'Merchant Guildhall',
				desc: 'Sovereign commercial exchange, banking houses, and chartered monopoly fleets.',
				effects: '+45% trade tax yield, +12 gold annually to realm treasury'
			}
		]
	},
	granary: {
		id: 'granary',
		name: 'Granary & Storage',
		icon: '🌾',
		desc: 'Food preservation facilities protecting against famine and fostering population growth.',
		levels: [
			{
				level: 0,
				name: 'None',
				desc: 'No centralized food reserves; population suffers heavily in poor harvests.',
				effects: 'Vulnerable to drought and famine'
			},
			{
				level: 1,
				name: 'Storehouse',
				desc: 'Elevated timber silos protecting harvested grain from rain and rodents.',
				effects: '+20% natural population growth, 35% famine damage mitigation'
			},
			{
				level: 2,
				name: 'Grand Silo',
				desc: 'Deep subterranean stone vaults holding multi-year grain and salt rations.',
				effects: '+40% natural population growth, 70% famine damage mitigation'
			},
			{
				level: 3,
				name: 'Aqueduct System',
				desc: 'Engineered aqueducts, cisterns, and hydraulic irrigation networks.',
				effects: '+60% natural population growth, 100% famine and drought immunity'
			}
		]
	},
	temple: {
		id: 'temple',
		name: 'Sacred Temple',
		icon: '⛩️',
		desc: 'Spiritual sanctuary fostering harmony, reducing riots, and diffusing faith.',
		levels: [
			{
				level: 0,
				name: 'Shrine',
				desc: 'Simple wayside altar or ancestral grove honoring local spirits.',
				effects: 'Local folk worship'
			},
			{
				level: 1,
				name: 'Holy Temple',
				desc: 'Sanctified house of prayer with resident priests and solemn festivals.',
				effects: '+3 realm stability, 20% riot risk reduction, gradual faith spread'
			},
			{
				level: 2,
				name: 'Grand Cathedral',
				desc: 'Monumental edifice of stone and glass drawing devoted pilgrims from afar.',
				effects: '+6 realm stability, 40% riot risk reduction, active religious conversion'
			},
			{
				level: 3,
				name: 'Sacred Pagoda',
				desc: 'Peerless sacred pagoda or cathedral radiating spiritual peace and divine protection.',
				effects: '+9 realm stability, 60% riot risk reduction, widespread faith dominance'
			}
		]
	},
	academy: {
		id: 'academy',
		name: 'Scholarly Academy',
		icon: '📜',
		desc: 'Centers of learning, natural philosophy, and mechanical experimentation.',
		levels: [
			{
				level: 0,
				name: 'None',
				desc: 'Oral tradition and informal village apprenticeships.',
				effects: 'No scientific research'
			},
			{
				level: 1,
				name: 'Scriptorium',
				desc: 'Monastic scriptorium cataloguing manuscripts and translation treatises.',
				effects: '+2 innovation points annually'
			},
			{
				level: 2,
				name: 'Polytechnic Academy',
				desc: 'Workshops for geometry, navigation, architectural drafting, and alchemy.',
				effects: '+5 innovation points annually'
			},
			{
				level: 3,
				name: 'Great University',
				desc: 'Distinguished collegiate halls attracting scholars across continents.',
				effects: '+8 innovation points annually'
			}
		]
	}
};

/**
 * Returns the active districts for a burg with defaults for missing levels.
 */
export function getBurgDistricts(burg: Burg): Required<BurgDistricts> {
	if (!burg.districts) {
		burg.districts = {
			walls: 0,
			market: 0,
			granary: 0,
			temple: 0,
			academy: 0
		};
	}
	return {
		walls: burg.districts.walls ?? 0,
		market: burg.districts.market ?? 0,
		granary: burg.districts.granary ?? 0,
		temple: burg.districts.temple ?? 0,
		academy: burg.districts.academy ?? 0
	};
}

/**
 * Returns the tier name for a district kind and level (0..3).
 */
export function getDistrictTierName(kind: keyof BurgDistricts, level: number): string {
	const def = DISTRICT_DEFINITIONS[kind];
	const cl = Math.max(0, Math.min(3, level));
	return def?.levels[cl]?.name ?? 'Unknown';
}

/**
 * Returns the treasury/gold cost to upgrade a district (e.g. 25, 60, 120 gold).
 * Returns Infinity if already at maximum tier (3).
 */
export function districtCost(kind: keyof BurgDistricts, currentLevel: number): number {
	return DISTRICT_UPGRADE_COSTS[currentLevel] ?? Infinity;
}

/**
 * Checks treasury, increments district level, spends gold, updates terrain dirty,
 * and logs the event without em dashes.
 */
export function upgradeDistrict(
	sim: Simulation,
	burgId: number,
	kind: keyof BurgDistricts
): { success: boolean; msg: string } {
	const burg = sim.w.burgs[burgId];
	if (!burg || !burg.alive) {
		return { success: false, msg: 'Settlement does not exist or has fallen.' };
	}
	const pol = sim.polities[burg.state];
	if (!pol || !pol.alive) {
		return { success: false, msg: 'No sovereign realm governs this settlement.' };
	}

	const districts = getBurgDistricts(burg);
	const cur = districts[kind];
	if (cur >= 3) {
		return {
			success: false,
			msg: `${burg.name} has already developed ${kind} to the maximum tier.`
		};
	}

	const cost = districtCost(kind, cur);
	if (pol.treasury < cost) {
		return {
			success: false,
			msg: `Insufficient treasury: requires ${cost} gold, but ${pol.name} has only ${Math.floor(pol.treasury)} gold.`
		};
	}

	// Deduct gold
	pol.treasury -= cost;

	// Increment level
	if (!burg.districts) burg.districts = {};
	const nextLevel = cur + 1;
	burg.districts[kind] = nextLevel;

	// Mark terrain dirty
	sim.dirty.terrain = true;

	const tierName = getDistrictTierName(kind, nextLevel);

	// Log event without em dashes
	sim.log(
		'misc',
		`${burg.name} in ${pol.name} upgraded its ${kind} district to ${tierName} for ${cost} gold.`,
		burg.cell,
		pol.id
	);

	return {
		success: true,
		msg: `${burg.name} upgraded ${kind} to ${tierName} (Level ${nextLevel}) for ${cost} gold.`
	};
}

/**
 * Sets burg.governor = personId and logs the event.
 */
export function appointBurgGovernor(
	sim: Simulation,
	burgId: number,
	personId: number
): { success: boolean; msg: string } {
	const burg = sim.w.burgs[burgId];
	if (!burg || !burg.alive) {
		return { success: false, msg: 'Settlement does not exist or has fallen.' };
	}

	if (personId === 0) {
		burg.governor = undefined;
		sim.log('misc', `The governor of ${burg.name} stepped down from office.`, burg.cell, burg.state);
		return { success: true, msg: `Removed governor from ${burg.name}.` };
	}

	const person = sim.people[personId];
	if (!person || !person.alive) {
		return { success: false, msg: 'Appointed leader is unavailable or deceased.' };
	}

	burg.governor = personId;
	person.burg = burgId;
	sim.idx.touch();

	sim.log(
		'misc',
		`${person.name} was appointed as governor of ${burg.name}.`,
		burg.cell,
		burg.state
	);

	return {
		success: true,
		msg: `${person.name} appointed as governor of ${burg.name}.`
	};
}

/**
 * Stations garrison defense points in burg.garrison, protecting against sieges and rebellions.
 */
export function stationGarrison(
	sim: Simulation,
	burgId: number,
	points: number
): { success: boolean; msg: string } {
	const burg = sim.w.burgs[burgId];
	if (!burg || !burg.alive) {
		return { success: false, msg: 'Settlement does not exist or has fallen.' };
	}
	if (points < 0) {
		return { success: false, msg: 'Garrison points cannot be negative.' };
	}

	burg.garrison = points;

	sim.log(
		'misc',
		`A defense garrison of ${points} cohorts was stationed at ${burg.name}.`,
		burg.cell,
		burg.state
	);

	return {
		success: true,
		msg: `Stationed ${points} defense garrison points in ${burg.name}.`
	};
}

/**
 * Sets burg.charter = true and grants municipal autonomy (+stability, +trade, -unrest).
 */
export function grantBurgCharter(
	sim: Simulation,
	burgId: number
): { success: boolean; msg: string } {
	const burg = sim.w.burgs[burgId];
	if (!burg || !burg.alive) {
		return { success: false, msg: 'Settlement does not exist or has fallen.' };
	}
	if (burg.charter) {
		return { success: false, msg: `${burg.name} already holds a municipal charter.` };
	}

	burg.charter = true;
	const pol = sim.polities[burg.state];
	if (pol && pol.alive) {
		pol.stability = Math.min(100, pol.stability + 5);
		pol.treasury += 15;
	}

	sim.log(
		'misc',
		`A royal municipal charter was granted to ${burg.name}, granting self-governance and commercial autonomy.`,
		burg.cell,
		burg.state
	);

	return {
		success: true,
		msg: `Granted municipal charter to ${burg.name}.`
	};
}

/**
 * Calculates the total siege defense multiplier for a burg.
 */
export function getBurgSiegeDefense(burg: Burg): number {
	const d = getBurgDistricts(burg);
	const wallBonus = (d.walls ?? 0) * 0.35;
	const garrisonBonus = (burg.garrison ?? 0) * 0.04;
	const charterBonus = burg.charter ? 0.10 : 0;
	return +(1 + wallBonus + garrisonBonus + charterBonus).toFixed(2);
}

/**
 * Calculates the percentage reduction against beast/monster attack damage (0..0.70).
 */
export function getBurgBeastDamageReduction(burg: Burg): number {
	const d = getBurgDistricts(burg);
	const wallReduction = (d.walls ?? 0) * 0.15;
	const garrisonReduction = Math.min(0.25, (burg.garrison ?? 0) * 0.02);
	return +Math.min(0.70, wallReduction + garrisonReduction).toFixed(2);
}

/**
 * Calculates the famine damage mitigation factor (0.0 = full damage, 1.0 = total immunity).
 */
export function getBurgFamineMitigation(burg: Burg): number {
	const d = getBurgDistricts(burg);
	if (d.granary >= 3) return 1.0;
	return +((d.granary ?? 0) * 0.35).toFixed(2);
}

/**
 * Applies famine effects to a burg while respecting granary mitigation.
 */
export function mitigateBurgFamine(burg: Burg, baseLossFraction = 0.30): { popLost: number; mitigated: boolean } {
	const mitigation = getBurgFamineMitigation(burg);
	const effectiveLossFraction = Math.max(0, baseLossFraction * (1 - mitigation));
	const initialPop = burg.pop;
	burg.pop = +(Math.max(0.2, burg.pop * (1 - effectiveLossFraction))).toFixed(2);
	const popLost = +(initialPop - burg.pop).toFixed(2);
	return { popLost, mitigated: mitigation > 0 };
}

/**
 * Runs annually: academies grant innovation, granaries mitigate famines, markets generate trade revenue.
 */
export function processYearlyBurgs(sim: Simulation): void {
	const INNOV_BY_LEVEL = [0, 2, 5, 8];
	const TRADE_BASE_BY_LEVEL = [0, 3, 7, 12];

	for (const b of sim.w.burgs) {
		if (!b.id || !b.alive) continue;
		const d = getBurgDistricts(b);
		const pol = sim.polities[b.state];

		// 1. Academies generate annual innovation points
		if (d.academy > 0) {
			const innovPts = INNOV_BY_LEVEL[d.academy] ?? 0;
			sim.innovation += innovPts;
		}

		// 2. Markets generate trade tax yield and realm gold
		if (d.market > 0 && pol && pol.alive) {
			const baseTrade = TRADE_BASE_BY_LEVEL[d.market] ?? 0;
			const popBonus = Math.round(b.pop * 0.15 * d.market);
			const charterBonus = b.charter ? 3 : 0;
			const totalTradeGold = baseTrade + popBonus + charterBonus;
			pol.treasury += totalTradeGold;
		}

		// 3. Granaries boost natural population growth and mitigate drought
		if (d.granary > 0) {
			const growthBoost = 0.005 * d.granary;
			b.pop = +(Math.min(500, b.pop * (1 + growthBoost))).toFixed(2);
		}

		// 4. Temples stabilize the realm and reduce riot risks
		if (d.temple > 0 && pol && pol.alive) {
			pol.stability = Math.min(100, +(pol.stability + d.temple * 0.3).toFixed(2));
			if (d.temple >= 2 && sim.rng.chance(0.15 * d.temple)) {
				const c = sim.c;
				if (pol.religion && c.religion[b.cell] !== pol.religion) {
					c.religion[b.cell] = pol.religion;
				}
			}
		}

		// 5. Municipal Charters grant steady stability
		if (b.charter && pol && pol.alive) {
			pol.stability = Math.min(100, +(pol.stability + 0.2).toFixed(2));
		}
	}
}
