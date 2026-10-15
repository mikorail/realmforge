import type { Simulation } from './engine';
import type { War } from './types';
import type { Burg } from '../gen/types';
import { getBurgDistricts } from './burgs';
import { declareWar } from './systems/diplomacy';

export interface TradeLeague {
	id: number;
	name: string;
	charterYear: number;
	leaderBurgId: number;
	memberBurgIds: number[];
	monopolies: string[];
	treasury: number;
	fleetEscortBonus: number;
}

export interface DefensiveCoalition {
	id: number;
	name: string;
	targetStateId: number;
	memberStateIds: number[];
	formedYear: number;
	threatLevel: number;
}

export interface RoyalMarriage {
	id: number;
	stateA: number;
	stateB: number;
	year: number;
	houseA: string;
	houseB: string;
}

export interface BanditCamp {
	burgId: number;
	cell: number;
	kind: 'bandit' | 'pirate';
	strength: number;
	lootedGold: number;
	name: string;
}

export interface LeagueState {
	tradeLeagues: Map<number, TradeLeague>;
	defensiveCoalitions: Map<number, DefensiveCoalition>;
	royalMarriages: Map<number, RoyalMarriage>;
	banditCamps: Map<number, BanditCamp>;
	nextLeagueId: number;
	nextCoalitionId: number;
	nextMarriageId: number;
}

const simLeagueMap = new WeakMap<Simulation, LeagueState>();

export function getLeagueState(sim: Simulation): LeagueState {
	let state = simLeagueMap.get(sim);
	if (!state) {
		const raw = (sim as unknown as { _leagueState?: LeagueState })._leagueState;
		if (raw) {
			state = raw;
		} else {
			state = {
				tradeLeagues: new Map(),
				defensiveCoalitions: new Map(),
				royalMarriages: new Map(),
				banditCamps: new Map(),
				nextLeagueId: 1,
				nextCoalitionId: 1,
				nextMarriageId: 1
			};
			(sim as unknown as { _leagueState?: LeagueState })._leagueState = state;
		}
		simLeagueMap.set(sim, state);
	}
	return state;
}

export function getTradeLeagues(sim: Simulation): TradeLeague[] {
	return Array.from(getLeagueState(sim).tradeLeagues.values());
}

export function getDefensiveCoalitions(sim: Simulation): DefensiveCoalition[] {
	return Array.from(getLeagueState(sim).defensiveCoalitions.values());
}

export function getRoyalMarriages(sim: Simulation): RoyalMarriage[] {
	return Array.from(getLeagueState(sim).royalMarriages.values());
}

export function getBanditCamps(sim: Simulation): BanditCamp[] {
	return Array.from(getLeagueState(sim).banditCamps.values());
}

const LEAGUE_PREFIXES = [
	'League of the Silver Tide',
	'Gilded Hanse',
	'Amber Sea League',
	'Iron Merchant Confederation',
	'Grand Maritime Hanse',
	'Consortium of the Golden Coast',
	'Alliance of Sovereign Guilds',
	'Azure Trading Union'
];

const TRADE_GOODS = [
	'Fine Silks',
	'Exotic Spices',
	'Refined Salt',
	'Lumber',
	'Precious Metals',
	'Fine Wines',
	'Rare Dyes',
	'Glassware',
	'Aged Spirits',
	'Smoked Fish'
];

function generateLeagueName(sim: Simulation, burg: Burg): string {
	if (sim.rng.chance(0.5)) {
		return sim.rng.pick(LEAGUE_PREFIXES);
	}
	return `${burg.name} Hanseatic League`;
}

function pickMonopolies(sim: Simulation): string[] {
	const goods = [...TRADE_GOODS];
	const count = sim.rng.int(2, 3);
	const picked: string[] = [];
	for (let i = 0; i < count; i++) {
		if (goods.length === 0) break;
		const idx = sim.rng.int(0, goods.length - 1);
		picked.push(goods.splice(idx, 1)[0]);
	}
	return picked;
}

/**
 * Burgs with level 2+ market or chartered port can found a trade league.
 * Member burgs receive +20% trade wealth, shared escorts reducing piracy.
 */
export function formTradeLeague(
	sim: Simulation,
	founderBurgId: number,
	name?: string
): TradeLeague | null {
	const burg = sim.w.burgs[founderBurgId];
	if (!burg || !burg.id || !burg.alive) return null;
	const pol = sim.polities[burg.state];
	if (!pol || !pol.alive) return null;

	const districts = getBurgDistricts(burg);
	const hasMarketTier2 = (districts.market ?? 0) >= 2;
	const hasCharteredPort = !!(burg.port && burg.charter);

	if (!hasMarketTier2 && !hasCharteredPort) {
		return null;
	}

	const state = getLeagueState(sim);
	if (burg.tradeLeague && state.tradeLeagues.has(burg.tradeLeague)) {
		return null;
	}

	const id = state.nextLeagueId++;
	const leagueName = name || generateLeagueName(sim, burg);
	const monopolies = pickMonopolies(sim);

	const league: TradeLeague = {
		id,
		name: leagueName,
		charterYear: sim.year,
		leaderBurgId: founderBurgId,
		memberBurgIds: [founderBurgId],
		monopolies,
		treasury: 60,
		fleetEscortBonus: 20
	};

	state.tradeLeagues.set(id, league);
	burg.tradeLeague = id;
	if (!pol.tradeLeague) {
		pol.tradeLeague = id;
	}

	sim.log(
		'misc',
		`The chartered trade league of ${league.name} was established in ${burg.name}, securing monopolies on ${monopolies.join(', ')}.`,
		burg.cell,
		burg.state
	);

	return league;
}

/**
 * Adds an alive burg to an existing trade league.
 */
export function joinTradeLeague(sim: Simulation, leagueId: number, burgId: number): boolean {
	const state = getLeagueState(sim);
	const league = state.tradeLeagues.get(leagueId);
	if (!league) return false;

	const burg = sim.w.burgs[burgId];
	if (!burg || !burg.id || !burg.alive) return false;

	if (league.memberBurgIds.includes(burgId)) return false;
	if (burg.tradeLeague && burg.tradeLeague !== leagueId && state.tradeLeagues.has(burg.tradeLeague)) {
		return false;
	}

	league.memberBurgIds.push(burgId);
	burg.tradeLeague = leagueId;

	const pol = sim.polities[burg.state];
	if (pol && !pol.tradeLeague) {
		pol.tradeLeague = leagueId;
	}

	sim.log(
		'misc',
		`${burg.name} joined ${league.name}, expanding the trade league's commercial reach.`,
		burg.cell,
		burg.state
	);

	return true;
}

/**
 * Formed when an aggressive realm wins 2+ conquest wars and controls > 35% of land.
 * Neighboring independent realms form a mutual defense pact.
 */
export function formDefensiveCoalition(
	sim: Simulation,
	targetStateId: number
): DefensiveCoalition | null {
	if (!targetStateId) return null;
	const targetPol = sim.polities[targetStateId];
	if (!targetPol || !targetPol.alive) return null;

	const conquestWins = sim.wars.filter(
		(w) => w.attackers.includes(targetStateId) && w.winner === 'attackers'
	).length;
	if (conquestWins < 2) return null;

	const totalCells = sim.polities.reduce(
		(sum, p) => sum + (p.alive && p.id ? p.cells : 0),
		0
	);
	const landShare = totalCells > 0 ? targetPol.cells / totalCells : 0;
	if (landShare <= 0.35) return null;

	if (sim.borders.size === 0) {
		sim.computeBorders();
	}
	const neighbors = sim.neighborsOf(targetStateId);
	let memberStateIds = neighbors.filter((id) => {
		const p = sim.polities[id];
		return p && p.alive && p.id !== targetStateId && !p.overlord;
	});

	if (memberStateIds.length === 0) {
		memberStateIds = sim.polities
			.filter((p) => p.alive && p.id > 0 && p.id !== targetStateId && !p.overlord)
			.map((p) => p.id);
		if (memberStateIds.length === 0) return null;
	}

	const state = getLeagueState(sim);
	for (const existing of state.defensiveCoalitions.values()) {
		if (existing.targetStateId === targetStateId) {
			for (const m of memberStateIds) {
				if (!existing.memberStateIds.includes(m)) existing.memberStateIds.push(m);
				sim.polities[m].coalition = existing.id;
			}
			return existing;
		}
	}

	const id = state.nextCoalitionId++;
	const threatLevel = Math.round(landShare * 100) + conquestWins * 10;
	const coalition: DefensiveCoalition = {
		id,
		name: `Grand Coalition against ${targetPol.name}`,
		targetStateId,
		memberStateIds,
		formedYear: sim.year,
		threatLevel
	};

	state.defensiveCoalitions.set(id, coalition);
	for (const mid of memberStateIds) {
		sim.polities[mid].coalition = id;
	}

	const memberNames = memberStateIds
		.map((mid) => sim.polities[mid]?.name ?? `Realm ${mid}`)
		.join(', ');

	sim.log(
		'war',
		`A defensive coalition was formed against ${targetPol.name} by ${memberNames} to counter imperial expansion.`,
		sim.w.burgs[targetPol.capital]?.cell,
		targetStateId
	);

	return coalition;
}

/**
 * Binds two dynasties. +30 diplomatic relations.
 */
export function arrangeRoyalMarriage(
	sim: Simulation,
	stateA: number,
	stateB: number
): { success: boolean; msg: string } {
	if (stateA === stateB || !stateA || !stateB) {
		return { success: false, msg: 'Cannot arrange royal marriage with self or invalid realm.' };
	}

	const polA = sim.polities[stateA];
	const polB = sim.polities[stateB];
	if (!polA || !polA.alive || !polB || !polB.alive) {
		return { success: false, msg: 'Both realms must be active to arrange a royal marriage.' };
	}

	const state = getLeagueState(sim);
	for (const m of state.royalMarriages.values()) {
		if (
			(m.stateA === stateA && m.stateB === stateB) ||
			(m.stateA === stateB && m.stateB === stateA)
		) {
			return {
				success: false,
				msg: `${polA.name} and ${polB.name} already share royal marriage ties.`
			};
		}
	}

	const rulerA = sim.people[polA.ruler];
	const rulerB = sim.people[polB.ruler];
	const houseA = rulerA?.house || polA.name;
	const houseB = rulerB?.house || polB.name;

	const id = state.nextMarriageId++;
	const marriage: RoyalMarriage = {
		id,
		stateA,
		stateB,
		year: sim.year,
		houseA,
		houseB
	};
	state.royalMarriages.set(id, marriage);

	if (!polA.royalMarriages) polA.royalMarriages = [];
	if (!polA.royalMarriages.includes(stateB)) polA.royalMarriages.push(stateB);

	if (!polB.royalMarriages) polB.royalMarriages = [];
	if (!polB.royalMarriages.includes(stateA)) polB.royalMarriages.push(stateA);

	sim.addRel(stateA, stateB, 30);

	sim.log(
		'misc',
		`House ${houseA} of ${polA.name} and House ${houseB} of ${polB.name} were joined in royal marriage.`,
		sim.w.burgs[polA.capital]?.cell,
		polA.id
	);

	return {
		success: true,
		msg: `Royal marriage arranged between House ${houseA} (${polA.name}) and House ${houseB} (${polB.name}).`
	};
}

/**
 * When a monarch dies with no living heirs, polities with royal marriages can claim the throne.
 * If multiple claim, triggers a Succession War; if single claim, triggers a Personal Union!
 */
export function evaluateSuccessionCrisis(
	sim: Simulation,
	deceasedRulerState: number
): { inheritedByState?: number; warOfSuccession?: boolean; msg: string } {
	const pol = sim.polities[deceasedRulerState];
	if (!pol || !pol.alive) {
		return { msg: 'Target realm does not exist or has fallen.' };
	}

	const heir = pol.heir ? sim.people[pol.heir] : null;
	if (heir && heir.alive) {
		return {
			msg: `${pol.name} has a direct heir, ${heir.name}, securing succession.`
		};
	}

	const state = getLeagueState(sim);
	const claimantIds: number[] = [];
	for (const m of state.royalMarriages.values()) {
		if (m.stateA === deceasedRulerState && sim.polities[m.stateB]?.alive) {
			if (!claimantIds.includes(m.stateB)) claimantIds.push(m.stateB);
		} else if (m.stateB === deceasedRulerState && sim.polities[m.stateA]?.alive) {
			if (!claimantIds.includes(m.stateA)) claimantIds.push(m.stateA);
		}
	}

	if (pol.royalMarriages) {
		for (const pId of pol.royalMarriages) {
			if (sim.polities[pId]?.alive && pId !== deceasedRulerState && !claimantIds.includes(pId)) {
				claimantIds.push(pId);
			}
		}
	}

	if (claimantIds.length === 0) {
		return {
			msg: `No royal marriage claimants. A local regent ascended the throne of ${pol.name}.`
		};
	}

	if (claimantIds.length === 1) {
		const seniorState = claimantIds[0];
		const senior = sim.polities[seniorState];

		pol.overlord = seniorState;
		pol.vassalSince = sim.year;
		if (senior.ruler) {
			pol.ruler = senior.ruler;
		}

		sim.log(
			'peace',
			`Following a succession crisis, ${pol.name} entered a personal union under ${senior.name}.`,
			sim.w.burgs[pol.capital]?.cell,
			pol.id
		);

		return {
			inheritedByState: seniorState,
			warOfSuccession: false,
			msg: `${pol.name} entered a personal union under ${senior.name}.`
		};
	}

	const [c1, c2] = claimantIds;
	const pol1 = sim.polities[c1];
	const pol2 = sim.polities[c2];

	const war = declareWar(sim, c1, c2, `disputed succession over ${pol.name}`);
	war.name = `War of the ${pol.name} Succession`;

	sim.log(
		'war',
		`The War of the ${pol.name} Succession erupted between ${pol1.name} and ${pol2.name}!`,
		sim.w.burgs[pol.capital]?.cell,
		pol.id
	);

	return {
		warOfSuccession: true,
		msg: `Multiple claimants triggered the War of the ${pol.name} Succession between ${pol1.name} and ${pol2.name}.`
	};
}

/**
 * Unfortified burgs with garrison < 5 and stability < 35% spawn bandit encampments or pirate havens.
 * Siphons 5-15% of trade revenue annually.
 */
export function spawnBanditsAndPiracy(sim: Simulation): BanditCamp[] {
	const state = getLeagueState(sim);

	for (const burg of sim.w.burgs) {
		if (!burg.id || !burg.alive) continue;
		const pol = sim.polities[burg.state];
		if (!pol || !pol.alive) continue;

		const walls = burg.districts?.walls ?? 0;
		const isUnfortified = walls === 0;
		const garrison = burg.garrison ?? 0;
		const isLowGarrison = garrison < 5;
		const isUnstable = pol.stability < 35;

		if (isUnfortified && isLowGarrison && isUnstable) {
			if (state.banditCamps.has(burg.id)) continue;

			const kind: 'bandit' | 'pirate' = burg.port ? 'pirate' : 'bandit';
			const strength = sim.rng.int(10, 25);
			const name =
				kind === 'pirate'
					? `${burg.name} Corsair Haven`
					: `${burg.name} Outlaw Lair`;

			const camp: BanditCamp = {
				burgId: burg.id,
				cell: burg.cell,
				kind,
				strength,
				lootedGold: 10,
				name
			};

			if (kind === 'pirate') {
				burg.pirateCove = true;
			} else {
				burg.banditCove = true;
			}

			state.banditCamps.set(burg.id, camp);

			sim.log(
				'misc',
				`A notorious ${kind === 'pirate' ? 'pirate haven' : 'bandit encampment'}, ${camp.name}, arose outside ${burg.name}.`,
				burg.cell,
				burg.state
			);
		}
	}

	return Array.from(state.banditCamps.values());
}

/**
 * Dispatches realm troops or heroes to wipe out outlaw haven, returning looted gold to treasury.
 */
export function clearBanditCamp(
	sim: Simulation,
	burgId: number,
	attackForce = 20
): { success: boolean; loot: number; msg: string } {
	const state = getLeagueState(sim);
	const camp = state.banditCamps.get(burgId);
	const burg = sim.w.burgs[burgId];

	if (!camp || !burg) {
		return { success: false, loot: 0, msg: 'No active outlaw haven located at this settlement.' };
	}

	if (attackForce >= camp.strength) {
		const loot = Math.max(10, Math.floor(camp.lootedGold));
		const pol = sim.polities[burg.state];
		if (pol && pol.alive) {
			pol.treasury += loot;
		}

		burg.banditCove = false;
		burg.pirateCove = false;
		state.banditCamps.delete(burgId);

		sim.log(
			'misc',
			`Realm forces purged ${camp.name} near ${burg.name}, restoring security and recovering ${loot} gold for the treasury.`,
			burg.cell,
			burg.state
		);

		return {
			success: true,
			loot,
			msg: `Successfully cleared ${camp.name} and recovered ${loot} gold for the treasury.`
		};
	}

	camp.strength = Math.max(1, camp.strength - Math.floor(attackForce / 2));
	return {
		success: false,
		loot: 0,
		msg: `Attack force was repelled by ${camp.name}. Remaining outlaw strength is ${camp.strength}.`
	};
}

/**
 * Annual processing: league dividends, coalition evaluation, bandit raids, logged without em dashes.
 */
export function processYearlyLeagues(sim: Simulation): {
	events: { text: string; cell?: number; state?: number }[];
} {
	const state = getLeagueState(sim);
	const events: { text: string; cell?: number; state?: number }[] = [];

	// 1. Trade League Dividends
	for (const league of state.tradeLeagues.values()) {
		let totalPayout = 0;
		for (const burgId of league.memberBurgIds) {
			const burg = sim.w.burgs[burgId];
			if (!burg || !burg.alive) continue;
			const pol = sim.polities[burg.state];
			if (!pol || !pol.alive) continue;

			const baseTrade = Math.max(2, Math.round(burg.pop * 0.25));
			const dividend = Math.round(baseTrade * 1.2);
			pol.treasury += dividend;
			totalPayout += dividend;
			league.treasury += Math.max(1, Math.round(dividend * 0.1));
		}

		if (league.treasury >= 120) {
			league.fleetEscortBonus = Math.min(50, league.fleetEscortBonus + 2);
		}

		if (sim.year === league.charterYear || sim.year % 10 === 0) {
			const leader = sim.w.burgs[league.leaderBurgId];
			const divText = `${league.name} distributed commercial dividends of ${totalPayout} gold across its member cities.`;
			events.push({ text: divText, cell: leader?.cell, state: leader?.state });
			sim.log('misc', divText, leader?.cell, leader?.state);
		}
	}

	// 2. Coalition Evaluation
	for (const pol of sim.polities) {
		if (pol.alive && pol.id > 0) {
			formDefensiveCoalition(sim, pol.id);
		}
	}

	const deadCoalitions: number[] = [];
	for (const coalition of state.defensiveCoalitions.values()) {
		const target = sim.polities[coalition.targetStateId];
		const totalCells = sim.polities.reduce(
			(sum, p) => sum + (p.alive && p.id ? p.cells : 0),
			0
		);
		const landShare = target && target.alive && totalCells > 0 ? target.cells / totalCells : 0;

		if (!target || !target.alive || landShare < 0.2) {
			deadCoalitions.push(coalition.id);
			for (const mId of coalition.memberStateIds) {
				const member = sim.polities[mId];
				if (member && member.coalition === coalition.id) {
					member.coalition = undefined;
				}
			}
			const dissText = `${coalition.name} was dissolved as the imperial threat diminished.`;
			events.push({ text: dissText, state: coalition.targetStateId });
			sim.log('peace', dissText, undefined, coalition.targetStateId);
		}
	}
	for (const cId of deadCoalitions) {
		state.defensiveCoalitions.delete(cId);
	}

	// 3. Bandit and Pirate Raids
	spawnBanditsAndPiracy(sim);
	for (const camp of state.banditCamps.values()) {
		const burg = sim.w.burgs[camp.burgId];
		if (!burg || !burg.alive) continue;
		const pol = sim.polities[burg.state];
		if (!pol || !pol.alive) continue;

		let siphonRate = 0.05 + sim.rng() * 0.10;
		if (burg.tradeLeague && camp.kind === 'pirate') {
			const league = state.tradeLeagues.get(burg.tradeLeague);
			if (league) {
				siphonRate *= Math.max(0.1, 1 - league.fleetEscortBonus / 100);
			}
		}

		const siphoned = Math.max(1, Math.round(pol.treasury * siphonRate));
		pol.treasury = Math.max(0, pol.treasury - siphoned);
		camp.lootedGold += siphoned;

		if (sim.rng.chance(0.08)) {
			const raidText = `${camp.name} raided trade routes near ${burg.name}, siphoning ${siphoned} gold into their hoard.`;
			events.push({ text: raidText, cell: burg.cell, state: burg.state });
			sim.log('misc', raidText, burg.cell, burg.state);
		}
	}

	return { events };
}
