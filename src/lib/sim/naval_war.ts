import type { Simulation } from './engine';
import { makeRng } from '../rng';

export type FlagshipType = 'Galleass' | 'Ironclad' | 'Turtle Ship' | 'War Galley' | 'Dreadnought' | 'Privateer Frigate';

export interface Flagship {
	id: number;
	name: string;
	type: FlagshipType;
	state: number;
	homeBurg: number;
	power: number;
	commander?: string;
	battlesWon: number;
	yearBuilt: number;
	alive: boolean;
}

export interface NavalBlockade {
	id: number;
	blockaderState: number;
	targetBurg: number;
	targetState: number;
	startYear: number;
	chokeSeverity: number; // 0.1 to 0.8 economic penalty
}

export interface PrivateerCommission {
	id: number;
	patronState: number;
	targetState: number;
	captain: string;
	corsairBurg: number;
	bootyPlundered: number;
	active: boolean;
	issuedYear: number;
}

export interface SeaMonster {
	id: number;
	kind: 'Kraken' | 'Megalodon' | 'Leviathan' | 'Sea Serpent';
	name: string;
	cell: number;
	terror: number;
	shipsSunk: number;
	alive: boolean;
}

export interface NavalWarState {
	flagships: Flagship[];
	blockades: NavalBlockade[];
	privateers: PrivateerCommission[];
	seaMonsters: SeaMonster[];
	nextId: number;
}

const simNavalMap = new WeakMap<Simulation, NavalWarState>();

export function getNavalState(sim: Simulation): NavalWarState {
	let state = simNavalMap.get(sim);
	if (!state) {
		const raw = (sim as unknown as { _navalState?: NavalWarState })._navalState;
		if (raw && Array.isArray(raw.flagships)) {
			state = raw;
		} else {
			state = {
				flagships: [],
				blockades: [],
				privateers: [],
				seaMonsters: [],
				nextId: 1
			};
			(sim as unknown as { _navalState?: NavalWarState })._navalState = state;
		}
		simNavalMap.set(sim, state);
	}
	return state;
}

const FLAGSHIP_NAMES = [
	'Leviathan Bane',
	'Iron Sovereign',
	'Dragon Crest',
	'Abyssal Fury',
	'Storm Herald',
	'Ocean Trident',
	'Tidecaller',
	'Gilded Siren',
	'Sea Wolf',
	'Vanguard Corsair'
];

const MONSTER_NAMES = [
	'Dagon the Abyssal',
	'The Maw of Charybdis',
	'Old Megalodon',
	'Krakentooth',
	'The Lurker Below'
];

/** Commission a mighty naval flagship for a coastal realm */
export function commissionFlagship(
	sim: Simulation,
	stateId: number,
	shipType?: FlagshipType,
	shipName?: string
): Flagship | null {
	const pol = sim.polities[stateId];
	if (!pol || !pol.alive) return null;

	const ports = sim.w.burgs.filter((b) => b.id && b.alive && b.state === stateId && b.port);
	if (!ports.length) return null;

	const rng = makeRng(`seed:naval:flagship:${sim.year}:${stateId}:${sim.w.opts.seed}`);
	const homeBurg = rng.pick(ports);

	// Pick appropriate flagship type based on era and genre
	let type: FlagshipType = shipType ?? 'War Galley';
	if (!shipType) {
		if (sim.era >= 3 || sim.voice === 'steampunk' || sim.voice === 'dieselpunk') {
			type = rng.chance(0.5) ? 'Ironclad' : 'Dreadnought';
		} else if (rng.chance(0.35)) {
			type = 'Turtle Ship';
		} else {
			type = rng.chance(0.5) ? 'Galleass' : 'War Galley';
		}
	}

	const st = getNavalState(sim);
	const name = shipName ?? `${rng.pick(FLAGSHIP_NAMES)}`;
	const power = type === 'Dreadnought' || type === 'Ironclad' ? 140 : type === 'Turtle Ship' ? 120 : 90;

	const leader = sim.general(pol) ?? sim.ruler(pol);
	const commander = leader ? leader.name : 'Admiral of the Fleet';

	const ship: Flagship = {
		id: st.nextId++,
		name,
		type,
		state: stateId,
		homeBurg: homeBurg.id,
		power,
		commander,
		battlesWon: 0,
		yearBuilt: sim.year,
		alive: true
	};

	st.flagships.push(ship);
	pol.treasury = Math.max(0, pol.treasury - 40);

	sim.log(
		'war',
		`${pol.name} launches the ${type} '${ship.name}' from the docks of ${homeBurg.name}, commanding naval dominance across the coasts.`,
		homeBurg.cell,
		stateId
	);

	return ship;
}

/** Issue privateer letters of marque against an enemy commerce fleet */
export function issueLetterOfMarque(
	sim: Simulation,
	patronStateId: number,
	targetStateId: number
): PrivateerCommission | null {
	const patron = sim.polities[patronStateId];
	const target = sim.polities[targetStateId];
	if (!patron || !patron.alive || !target || !target.alive) return null;

	const corsairPorts = sim.w.burgs.filter(
		(b) => b.id && b.alive && (b.state === patronStateId || b.pirateCove) && b.port
	);
	if (!corsairPorts.length) return null;

	const rng = makeRng(`seed:naval:marque:${sim.year}:${patronStateId}:${targetStateId}`);
	const corsairBurg = rng.pick(corsairPorts);
	const st = getNavalState(sim);

	const captain = `${corsairBurg.name} Corsair Syndicate`;
	const comm: PrivateerCommission = {
		id: st.nextId++,
		patronState: patronStateId,
		targetState: targetStateId,
		captain,
		corsairBurg: corsairBurg.id,
		bootyPlundered: 0,
		active: true,
		issuedYear: sim.year
	};

	st.privateers.push(comm);

	sim.log(
		'war',
		`${patron.name} grants privateer letters of marque to ${captain} to plunder maritime merchant lanes of ${target.name}.`,
		corsairBurg.cell,
		patronStateId
	);

	return comm;
}

/** Enforce a naval blockade against a rival coastal port */
export function declareNavalBlockade(
	sim: Simulation,
	blockaderStateId: number,
	targetBurgId: number
): NavalBlockade | null {
	const blockader = sim.polities[blockaderStateId];
	const burg = sim.w.burgs[targetBurgId];
	if (!blockader || !blockader.alive || !burg || !burg.alive || !burg.port) return null;

	const targetStateId = burg.state;
	const targetState = sim.polities[targetStateId];
	if (!targetState) return null;

	const st = getNavalState(sim);
	// Avoid duplicate active blockades on the same burg
	if (st.blockades.some((b) => b.targetBurg === targetBurgId)) return null;

	const blockade: NavalBlockade = {
		id: st.nextId++,
		blockaderState: blockaderStateId,
		targetBurg: targetBurgId,
		targetState: targetStateId,
		startYear: sim.year,
		chokeSeverity: 0.45
	};

	st.blockades.push(blockade);

	sim.log(
		'war',
		`Naval blockade: war fleets of ${blockader.name} seal the waters of ${burg.name}, throttling coastal trade and supplies.`,
		burg.cell,
		targetStateId
	);

	return blockade;
}

/** Spawn an oceanic terror that preys upon sea lanes */
export function spawnSeaMonster(
	sim: Simulation,
	kind?: 'Kraken' | 'Megalodon' | 'Leviathan' | 'Sea Serpent',
	targetCell?: number
): SeaMonster | null {
	const rng = makeRng(`seed:naval:monster:${sim.year}:${sim.w.opts.seed}`);
	const monsterKind = kind ?? rng.pick(['Kraken', 'Megalodon', 'Leviathan', 'Sea Serpent'] as const);

	let cell = targetCell;
	if (cell === undefined) {
		const seaCells: number[] = [];
		const n = sim.w.cells.n;
		for (let i = 0; i < n; i++) {
			if (sim.w.cells.h[i] < 20) seaCells.push(i);
		}
		if (!seaCells.length) return null;
		cell = rng.pick(seaCells);
	}

	const st = getNavalState(sim);
	const name = `${rng.pick(MONSTER_NAMES)} the ${monsterKind}`;

	const monster: SeaMonster = {
		id: st.nextId++,
		kind: monsterKind,
		name,
		cell,
		terror: 80,
		shipsSunk: 0,
		alive: true
	};

	st.seaMonsters.push(monster);

	sim.log(
		'disaster',
		`High seas terror: ${monster.name} rises from the pelagic trenches, sinking merchant galleys and devastating coastal shipping.`,
		cell
	);

	return monster;
}

/** Yearly naval simulation pass */
export function yearlyNavalWar(sim: Simulation) {
	const st = getNavalState(sim);
	const rng = makeRng(`seed:naval:yearly:${sim.year}:${sim.w.opts.seed}`);

	// 1. Maintain or dissolve blockades
	st.blockades = st.blockades.filter((bl) => {
		const blockader = sim.polities[bl.blockaderState];
		const defender = sim.polities[bl.targetState];
		const burg = sim.w.burgs[bl.targetBurg];

		if (!blockader?.alive || !defender?.alive || !burg?.alive || !sim.atWar(bl.blockaderState, bl.targetState)) {
			if (burg?.alive) {
				sim.log(
					'found',
					`The naval blockade of ${burg.name} is lifted; trade vessels return to the quays.`,
					burg.cell,
					bl.targetState
				);
			}
			return false;
		}

		// Choke economy of target burg and realm
		const economicLoss = Math.min(defender.treasury, 12 * bl.chokeSeverity);
		defender.treasury -= economicLoss;
		defender.stability = Math.max(10, defender.stability - 2);
		burg.pop = Math.max(1, Math.round(burg.pop * 0.98));

		return true;
	});

	// 2. Privateering actions
	for (const prv of st.privateers) {
		if (!prv.active) continue;
		const patron = sim.polities[prv.patronState];
		const target = sim.polities[prv.targetState];
		if (!patron?.alive || !target?.alive || !sim.atWar(prv.patronState, prv.targetState)) {
			prv.active = false;
			continue;
		}

		if (rng.chance(0.4)) {
			const plunder = rng.int(8, 22);
			const stolen = Math.min(target.treasury, plunder);
			target.treasury -= stolen;
			patron.treasury += Math.round(stolen * 0.6); // share with patron
			prv.bootyPlundered += stolen;

			if (rng.chance(0.3)) {
				sim.log(
					'war',
					`Privateers of ${prv.captain} intercept merchant convoys of ${target.name}, seizing ${stolen} gold in contraband.`,
					sim.w.burgs[prv.corsairBurg]?.cell,
					prv.patronState
				);
			}
		}
	}

	// 3. Flagship upgrades and encounters
	for (const ship of st.flagships) {
		if (!ship.alive) continue;
		const pol = sim.polities[ship.state];
		if (!pol || !pol.alive) {
			ship.alive = false;
			continue;
		}

		const wars = sim.warsOf(ship.state);
		if (wars.length > 0 && rng.chance(0.25)) {
			ship.battlesWon++;
			pol.stability = Math.min(100, pol.stability + 1);
			if (rng.chance(0.2)) {
				sim.log(
					'war',
					`The flagship '${ship.name}' shatters an opposing squadron in coastal waters, securing naval supremacy for ${pol.name}.`,
					sim.w.burgs[ship.homeBurg]?.cell,
					ship.state
				);
			}
		}
	}

	// 4. Sea monsters raiding trade lanes
	for (const mon of st.seaMonsters) {
		if (!mon.alive) continue;
		if (rng.chance(0.3)) {
			mon.shipsSunk += rng.int(1, 3);
			if (rng.chance(0.25)) {
				sim.log(
					'disaster',
					`Sailors recount dire tales of ${mon.name}: wreckage and broken hulls wash ashore following a savage pelagic ambush.`,
					mon.cell
				);
			}
		}
	}

	// 5. Occasionally spawn flagship or sea monster
	if (sim.year % 5 === 0 && st.flagships.filter((f) => f.alive).length < 6) {
		const coastalPolities = sim.polities.filter(
			(p) => p.id && p.alive && p.treasury >= 60 && sim.w.burgs.some((b) => b.state === p.id && b.port)
		);
		if (coastalPolities.length) {
			const picked = rng.pick(coastalPolities);
			if (!st.flagships.some((f) => f.state === picked.id && f.alive)) {
				commissionFlagship(sim, picked.id);
			}
		}
	}

	if (sim.year % 15 === 0 && st.seaMonsters.filter((m) => m.alive).length < 3 && rng.chance(0.4)) {
		spawnSeaMonster(sim);
	}
}
