import { makeRng } from '../rng';
import type { Simulation } from './engine';
import type { Person } from './types';
import { getPartyAggregateSkills } from './party';

export type MegastructureKind = 'abyss' | 'tower';
export type WhistleTier = 'bell' | 'red' | 'blue' | 'moon' | 'black' | 'white';
export type RankerGrade =
	| 'F'
	| 'E'
	| 'D'
	| 'C'
	| 'B'
	| 'A'
	| 'S'
	| 'SS'
	| 'SSS'
	| 'Ranker'
	| 'High Ranker';

export type TrialKind = 'survival' | 'skirmish' | 'puzzle' | 'duel' | 'defense' | 'boss';

export interface AbyssDepthLayer {
	layer: number;
	name: string;
	depthRange: string;
	curseDescription: string;
	minWhistle: WhistleTier;
	strainBaseDamage: number;
}

export interface TowerFloor {
	floor: number;
	trialKind: TrialKind;
	name: string;
	theme: string;
	guardian: {
		name: string;
		title: string;
		power: number;
		health: number;
		defeated: boolean;
	};
	clearReward: {
		gold: number;
		innovation: number;
		relic?: string;
		constellationStigma?: string;
	};
}

export interface MegastructureSite {
	id: string;
	kind: MegastructureKind;
	name: string;
	cell: number;
	layer: number;
	outpostBurgId?: number;
	currentFloorBreakRisk: number;
	highestClearedFloor: number;
}

export interface RankerRecord {
	personId: number;
	name: string;
	grade: RankerGrade;
	highestFloor: number;
	titles: string[];
	constellation?: string;
	active: boolean;
}

export interface DelverRecord {
	personId: number;
	name: string;
	whistle: WhistleTier;
	deepestLayer: number;
	relicsFound: number;
	lastDive: boolean;
	alive: boolean;
}

export interface MegastructureState {
	abyss: MegastructureSite;
	tower: MegastructureSite;
	rankers: Map<number, RankerRecord>;
	delvers: Map<number, DelverRecord>;
	towerFloors: Map<number, TowerFloor>;
	activeBreakBeasts: { name: string; cell: number; power: number }[];
	relicsExtracted: number;
}

export const ABYSS_DEPTH_LAYERS: AbyssDepthLayer[] = [
	{
		layer: 1,
		name: 'Edge of the Abyss',
		depthRange: '0-1,350m',
		curseDescription: 'Light dizziness and loss of balance upon ascent',
		minWhistle: 'bell',
		strainBaseDamage: 8
	},
	{
		layer: 2,
		name: 'Forest of Whispers',
		depthRange: '1,350-2,600m',
		curseDescription: 'Nausea, severe headaches, and limb numbness upon ascent',
		minWhistle: 'red',
		strainBaseDamage: 20
	},
	{
		layer: 3,
		name: 'The Great Fault',
		depthRange: '2,600-7,000m',
		curseDescription: 'Violent vertigo and auditory hallucinations upon ascent',
		minWhistle: 'blue',
		strainBaseDamage: 38
	},
	{
		layer: 4,
		name: 'Goblet of Giants',
		depthRange: '7,000-12,000m',
		curseDescription: 'Intense systemic pain and bodily hemorrhaging upon ascent',
		minWhistle: 'moon',
		strainBaseDamage: 60
	},
	{
		layer: 5,
		name: 'Sea of Corpses',
		depthRange: '12,000-13,000m',
		curseDescription: 'Complete sensory deprivation, identity confusion, and mental strain upon ascent',
		minWhistle: 'black',
		strainBaseDamage: 85
	},
	{
		layer: 6,
		name: 'Capital of the Unreturned',
		depthRange: '>13,000m (The Last Dive)',
		curseDescription: 'Devastating curse: catastrophic bodily mutation or mortality upon ascent',
		minWhistle: 'white',
		strainBaseDamage: 120
	}
];

export const WHISTLE_TIER_ORDER: Record<WhistleTier, number> = {
	bell: 0,
	red: 1,
	blue: 2,
	moon: 3,
	black: 4,
	white: 5
};

export const RANKER_GRADE_ORDER: Record<RankerGrade, number> = {
	'High Ranker': 10,
	Ranker: 9,
	SSS: 8,
	SS: 7,
	S: 6,
	A: 5,
	B: 4,
	C: 3,
	D: 2,
	E: 1,
	F: 0
};

const simMegastructureMap = new WeakMap<Simulation, MegastructureState>();

/**
 * Retrieve or initialize the Megastructure simulation state.
 */
export function getMegastructureState(sim: Simulation): MegastructureState {
	let state = simMegastructureMap.get(sim);
	if (!state) {
		const raw = (sim as unknown as { _megastructureState?: MegastructureState })._megastructureState;
		if (raw) {
			state = raw;
		} else {
			state = {
				abyss: {
					id: 'abyss-prime',
					kind: 'abyss',
					name: 'The Bottomless Abyss',
					cell: 0,
					layer: 0,
					currentFloorBreakRisk: 0,
					highestClearedFloor: 0
				},
				tower: {
					id: 'tower-prime',
					kind: 'tower',
					name: 'The Spire of Trials',
					cell: 0,
					layer: 0,
					currentFloorBreakRisk: 0,
					highestClearedFloor: 0
				},
				rankers: new Map(),
				delvers: new Map(),
				towerFloors: new Map(),
				activeBreakBeasts: [],
				relicsExtracted: 0
			};
			(sim as unknown as { _megastructureState?: MegastructureState })._megastructureState = state;
		}
		simMegastructureMap.set(sim, state);
	}
	return state;
}

/**
 * Compute the Ranker Grade based on the highest floor cleared and renown.
 */
export function computeRankerGrade(highestFloor: number, renown: number = 0): RankerGrade {
	if (highestFloor >= 100) {
		return renown >= 50 ? 'High Ranker' : 'Ranker';
	}
	if (highestFloor >= 90) return 'SSS';
	if (highestFloor >= 77) return 'SS';
	if (highestFloor >= 70) return 'S';
	if (highestFloor >= 50) return 'A';
	if (highestFloor >= 40) return 'B';
	if (highestFloor >= 30) return 'C';
	if (highestFloor >= 20) return 'D';
	if (highestFloor >= 10) return 'E';
	return 'F';
}

/**
 * Initialize world megastructures: The Bottomless Abyss and The Spire of Trials.
 * Places one abyss at a wild/rugged cell and one tower at an ancient/mountain cell deterministically.
 * Connects the nearest burg as an Outpost city.
 */
export function initWorldMegastructures(sim: Simulation): {
	abyss: MegastructureSite;
	tower: MegastructureSite;
} {
	const state = getMegastructureState(sim);
	const cells = sim.w.cells;

	// Collect eligible land cells
	const landCells: number[] = [];
	for (let c = 0; c < cells.n; c++) {
		if (cells.h[c] >= 20) {
			landCells.push(c);
		}
	}

	const fallbackCell = landCells.length > 0 ? landCells[0] : 0;

	// Find ancient/mountain cells for Spire of Trials: highest elevations
	let highestElevation = -1;
	let towerCandidate = fallbackCell;
	for (const c of landCells) {
		if (cells.h[c] > highestElevation) {
			highestElevation = cells.h[c];
			towerCandidate = c;
		}
	}

	// Filter other high elevation cells for deterministic selection
	const highMountainCells = landCells.filter((c) => cells.h[c] >= Math.max(50, highestElevation - 15));
	const towerRng = makeRng(`${sim.w.opts.seed}:tower-site`);
	const towerCell = highMountainCells.length > 0 ? towerRng.pick(highMountainCells) : towerCandidate;

	// Find wild/rugged cells for the Bottomless Abyss: distinct from tower cell
	const ruggedCells: number[] = [];
	for (const c of landCells) {
		if (c === towerCell) continue;
		// Wild/rugged: high inland distance, rugged elevation, or specific wild biomes
		const isRugged = cells.dist[c] >= 2 || cells.h[c] >= 35 || cells.biome[c] >= 3;
		if (isRugged) {
			ruggedCells.push(c);
		}
	}

	const abyssRng = makeRng(`${sim.w.opts.seed}:abyss-site`);
	const abyssCell =
		ruggedCells.length > 0
			? abyssRng.pick(ruggedCells)
			: landCells.find((c) => c !== towerCell) ?? fallbackCell;

	// Connect nearest burg as Outpost city
	const livingBurgs = sim.w.burgs.filter((b) => b && b.alive);

	let towerOutpost: number | undefined;
	let towerMinDist = Infinity;
	let abyssOutpost: number | undefined;
	let abyssMinDist = Infinity;

	const towerX = cells.x[towerCell];
	const towerY = cells.y[towerCell];
	const abyssX = cells.x[abyssCell];
	const abyssY = cells.y[abyssCell];

	for (const burg of livingBurgs) {
		const dt = Math.hypot(towerX - burg.x, towerY - burg.y);
		if (dt < towerMinDist) {
			towerMinDist = dt;
			towerOutpost = burg.id;
		}
		const da = Math.hypot(abyssX - burg.x, abyssY - burg.y);
		if (da < abyssMinDist) {
			abyssMinDist = da;
			abyssOutpost = burg.id;
		}
	}

	state.tower = {
		id: 'tower-spire-of-trials',
		kind: 'tower',
		name: 'The Spire of Trials',
		cell: towerCell,
		layer: 0,
		outpostBurgId: towerOutpost,
		currentFloorBreakRisk: 0,
		highestClearedFloor: 0
	};

	state.abyss = {
		id: 'abyss-bottomless-chasm',
		kind: 'abyss',
		name: 'The Bottomless Abyss',
		cell: abyssCell,
		layer: 0,
		outpostBurgId: abyssOutpost,
		currentFloorBreakRisk: 0,
		highestClearedFloor: 0
	};

	return { abyss: state.abyss, tower: state.tower };
}

const THEME_NAMES = [
	{ name: 'Floor of the Iron Plains', theme: 'Rugged Iron Wastes' },
	{ name: 'Floor of the Whispering Sands', theme: 'Drifting Ghost Dunes' },
	{ name: 'Floor of the Starless Sea', theme: 'Endless Dark Waters' },
	{ name: 'Floor of the Obsidian Spire', theme: 'Volcanic Obsidian Crags' },
	{ name: 'Floor of the Ashen Labyrinth', theme: 'Smoldering Ash Corridors' },
	{ name: 'Floor of the Frozen Ridge', theme: 'Glacial Permafrost Pinnacles' },
	{ name: 'Floor of the Gilded Vault', theme: 'Gilded Imperial Vaults' },
	{ name: 'Floor of the Crimson Marsh', theme: 'Blood-stained Bog' },
	{ name: 'Floor of the Emerald Canopy', theme: 'Towering Ancient Boughs' },
	{ name: 'Floor of the Thunder Crag', theme: 'Storm-wracked Highlands' },
	{ name: 'Floor of the Sunken Crypt', theme: 'Drowned Catacombs' },
	{ name: 'Floor of the Clockwork Chasm', theme: 'Interlocking Brass Cogs' },
	{ name: 'Floor of the Radiant Mirage', theme: 'Glimmering Illusory Halls' },
	{ name: 'Floor of the Serpent Vale', theme: 'Venomous Reptilian Caves' },
	{ name: 'Floor of the Twilight Bastion', theme: 'Dusk-lit Ramparts' }
];

const GUARDIAN_FIRST_NAMES = [
	'Kaelen',
	'Vorgar',
	'Malakor',
	'Zephyros',
	'Ignis',
	'Thalor',
	'Morrigan',
	'Draxos',
	'Vaelis',
	'Oryx',
	'Bael',
	'Gorath',
	'Sylas',
	'Astra'
];

const GUARDIAN_TITLES = [
	'Warden of the Threshold',
	'Sentinel of the Iron Gate',
	'Executioner of the Spire',
	'Rune-Carved Golem',
	'Shadow Stalker',
	'Blade-Dancer of the Halls',
	'Chamber Archon',
	'Grave Sentinel',
	'Storm Weaver',
	'Voidborn Herald'
];

const CONSTELLATIONS = [
	'Stigma of the Iron Bull',
	'Stigma of the Abyssal Serpent',
	'Stigma of the Silver Archer',
	'Stigma of the Polaris Weaver',
	'Stigma of the Radiant Lion',
	'Stigma of the Crimson Comet',
	'Stigma of the Void Falcon'
];

/**
 * Generate procedural trials and guardians for floors 1..100 with milestone bosses at 10, 20, 50, 77, 100.
 */
export function generateTowerFloor(seed: string, floor: number): TowerFloor {
	const clampedFloor = Math.max(1, Math.min(100, Math.floor(floor)));
	const rng = makeRng(`${seed}:tower:floor:${clampedFloor}`);

	// Milestone Boss Floors
	if (clampedFloor === 10) {
		return {
			floor: 10,
			trialKind: 'boss',
			name: 'Floor of the Colossus Gate',
			theme: 'Ancient Titan Bastion',
			guardian: {
				name: 'Bronzehorn the Unbroken',
				title: 'Warden of the Lower Gate',
				power: 38,
				health: 220,
				defeated: false
			},
			clearReward: {
				gold: 350,
				innovation: 2,
				relic: 'Bronze Pendant of the Gatekeeper'
			}
		};
	}

	if (clampedFloor === 20) {
		return {
			floor: 20,
			trialKind: 'boss',
			name: 'Floor of the Drowned Sovereign',
			theme: 'Submerged Abyssal Vault',
			guardian: {
				name: 'Scylla of the Depths',
				title: 'Terror of the Sunken Bastion',
				power: 68,
				health: 380,
				defeated: false
			},
			clearReward: {
				gold: 750,
				innovation: 3,
				relic: 'Pearl of the Drowned Sovereign'
			}
		};
	}

	if (clampedFloor === 50) {
		return {
			floor: 50,
			trialKind: 'boss',
			name: 'Floor of the Silver Monarch',
			theme: 'Radiant Crystalline Peak',
			guardian: {
				name: 'Aurelius the Radiant',
				title: 'Sovereign of the Crystalline Peak',
				power: 125,
				health: 700,
				defeated: false
			},
			clearReward: {
				gold: 1800,
				innovation: 5,
				relic: 'Aegis of the Silver Monarch'
			}
		};
	}

	if (clampedFloor === 77) {
		return {
			floor: 77,
			trialKind: 'boss',
			name: 'Floor of the Constellation Nexus',
			theme: 'Star-Forged Celestial Crossing',
			guardian: {
				name: 'Astraea of the Red Star',
				title: 'Herald of the Constellations',
				power: 195,
				health: 1100,
				defeated: false
			},
			clearReward: {
				gold: 3200,
				innovation: 8,
				relic: 'Starlight Mantle of Astraea',
				constellationStigma: 'Stigma of the Polaris Weaver'
			}
		};
	}

	if (clampedFloor === 100) {
		return {
			floor: 100,
			trialKind: 'boss',
			name: 'The Apex of Ascendance',
			theme: 'Primordial Throne of the Spire',
			guardian: {
				name: 'The Primordial Arbiter',
				title: 'Keeper of the Spire Apex',
				power: 285,
				health: 1800,
				defeated: false
			},
			clearReward: {
				gold: 6000,
				innovation: 15,
				relic: 'Crown of the Primordial Arbiter',
				constellationStigma: 'Stigma of the Supreme Ascendant'
			}
		};
	}

	// Procedural standard floors
	const trialPool: TrialKind[] = ['survival', 'skirmish', 'puzzle', 'duel', 'defense'];
	const trialKind = rng.pick(trialPool);
	const template = rng.pick(THEME_NAMES);

	const guardianName = rng.pick(GUARDIAN_FIRST_NAMES);
	const guardianTitle = `${rng.pick(GUARDIAN_TITLES)} of Floor ${clampedFloor}`;
	const power = 10 + clampedFloor * 2 + rng.int(1, 8);
	const health = 35 + clampedFloor * 12 + rng.int(5, 20);

	const gold = clampedFloor * 25 + rng.int(10, 40);
	const innovation = Math.floor(clampedFloor / 25) + 1;

	let relic: string | undefined;
	if (clampedFloor % 10 === 0 || rng.chance(0.08)) {
		relic = `Spire Relic of Floor ${clampedFloor}`;
	}

	let constellationStigma: string | undefined;
	if (clampedFloor >= 70 && (clampedFloor % 7 === 0 || rng.chance(0.06))) {
		constellationStigma = rng.pick(CONSTELLATIONS);
	}

	return {
		floor: clampedFloor,
		trialKind,
		name: template.name,
		theme: template.theme,
		guardian: {
			name: guardianName,
			title: guardianTitle,
			power,
			health,
			defeated: false
		},
		clearReward: {
			gold,
			innovation,
			relic,
			constellationStigma
		}
	};
}

function deriveArcana(p: Person): number {
	const raw = (p as unknown as { arcana?: number }).arcana;
	if (typeof raw === 'number') return raw;
	let base = Math.max(1, Math.round((p.intrigue + p.stewardship) / 2));
	if (p.traits?.includes('Mystic')) base += 3;
	if (p.traits?.includes('Scholar')) base += 2;
	if (p.traits?.includes('Wise')) base += 2;
	if (p.role === 'priest' || p.role === 'prophet' || p.role === 'magician') base += 3;
	return base;
}

/**
 * Attempt a trial on a specific floor of the Spire of Trials.
 * Evaluates martial/intrigue/arcana stats, rolls deterministic checks, updates RankerGrade and leaderboard.
 */
export function attemptTowerTrial(
	sim: Simulation,
	tower: MegastructureSite,
	personId: number,
	floor: number,
	tactic: 'assault' | 'tactic' | 'magic'
): { success: boolean; text: string; damage: number; reward?: TowerFloor['clearReward'] } {
	const person = sim.people[personId];
	if (!person || !person.alive) {
		return {
			success: false,
			text: 'Candidate is incapacitated or unavailable.',
			damage: 0
		};
	}

	const state = getMegastructureState(sim);
	let floorObj = state.towerFloors.get(floor);
	if (!floorObj) {
		floorObj = generateTowerFloor(sim.w.opts.seed, floor);
		state.towerFloors.set(floor, floorObj);
	}

	// Skill score evaluation
	let martialScore = person.martial;
	let intrigueScore = person.intrigue;
	let arcanaScore = deriveArcana(person);

	// If person is avatar, incorporate party aggregate capabilities
	if (sim.avatar === personId) {
		const party = getPartyAggregateSkills(sim, personId);
		martialScore = party.martial;
		intrigueScore = party.intrigue;
		arcanaScore = party.arcana;
	}

	let statVal = martialScore;
	if (tactic === 'tactic') statVal = intrigueScore;
	if (tactic === 'magic') statVal = arcanaScore;

	// Tactical synergy with trial type
	let synergy = 0;
	if (floorObj.trialKind === 'boss') synergy = 2;
	else if (floorObj.trialKind === 'duel' && tactic === 'assault') synergy = 4;
	else if (floorObj.trialKind === 'skirmish' && tactic === 'assault') synergy = 3;
	else if (floorObj.trialKind === 'puzzle' && (tactic === 'magic' || tactic === 'tactic')) synergy = 4;
	else if (floorObj.trialKind === 'survival' && tactic === 'tactic') synergy = 3;
	else if (floorObj.trialKind === 'defense' && tactic === 'assault') synergy = 3;

	const targetDc = 8 + Math.floor(floor * 0.45) + (floorObj.trialKind === 'boss' ? 4 : 0);
	const roll = sim.rng.int(1, 20);
	const totalScore = roll + statVal + synergy;
	const isSuccess = totalScore >= targetDc;

	let record = state.rankers.get(personId);
	if (!record) {
		record = {
			personId,
			name: `${person.name} ${person.house}`.trim(),
			grade: 'F',
			highestFloor: 0,
			titles: [],
			active: true
		};
		state.rankers.set(personId, record);
	}

	if (isSuccess) {
		floorObj.guardian.defeated = true;
		tower.highestClearedFloor = Math.max(tower.highestClearedFloor, floor);
		record.highestFloor = Math.max(record.highestFloor, floor);
		record.grade = computeRankerGrade(record.highestFloor, person.renown);

		// Milestone titles
		if (floor === 10 && !record.titles.includes('Gatebreaker')) {
			record.titles.push('Gatebreaker');
		} else if (floor === 20 && !record.titles.includes('Abyss Cleaver')) {
			record.titles.push('Abyss Cleaver');
		} else if (floor === 50 && !record.titles.includes('Monarch Vanguard')) {
			record.titles.push('Monarch Vanguard');
		} else if (floor === 77 && !record.titles.includes('Star Chosen')) {
			record.titles.push('Star Chosen');
		} else if (floor === 100 && !record.titles.includes('Apex Ascendant')) {
			record.titles.push('Apex Ascendant');
		}

		if (floorObj.clearReward.constellationStigma && !record.constellation) {
			record.constellation = floorObj.clearReward.constellationStigma;
		}

		// Rewards
		person.gold += floorObj.clearReward.gold;
		person.renown += floorObj.trialKind === 'boss' ? 18 : 5;
		sim.innovation += floorObj.clearReward.innovation;

		if (floorObj.clearReward.relic && sim.artifacts) {
			const artId = sim.nextArtifactId ? sim.nextArtifactId++ : sim.artifacts.length + 1;
			sim.artifacts.push({
				id: artId,
				name: floorObj.clearReward.relic,
				kind: 'relic',
				icon: '✦',
				fame: 40 + floor,
				year: sim.year,
				origin: `${tower.name}, Floor ${floor}`,
				bonusStat: 'martial',
				bonusVal: 2 + Math.floor(floor / 25),
				holderType: 'person',
				holderId: person.id,
				holderName: `${person.name} ${person.house}`.trim(),
				lore: `Won upon conquering Floor ${floor} in ${tower.name}.`
			});
			state.relicsExtracted++;
		}

		// Clearing floors suppresses floor break risk
		tower.currentFloorBreakRisk = Math.max(0, tower.currentFloorBreakRisk - 12);

		const text = `${person.name} conquered Floor ${floor} (${floorObj.name}) using ${tactic} (score ${totalScore} vs DC ${targetDc}). Defeated ${floorObj.guardian.name}. Promoted to ${record.grade}-Rank!`;

		if (sim.log) {
			sim.log('quest', text, tower.cell, person.state);
		}

		return {
			success: true,
			text,
			damage: 0,
			reward: floorObj.clearReward
		};
	} else {
		const rawDamage = Math.floor(floorObj.guardian.power * 0.35) + sim.rng.int(4, 12);
		const damage = Math.max(4, rawDamage);

		person.health = Math.max(0, person.health - damage);
		if (person.health <= 0) {
			person.alive = false;
			person.died = sim.year;
			person.cause = `Fell in battle on Floor ${floor} of the Spire of Trials`;
			sim.idx.touch();
			record.active = false;
		}

		// Failures agitate the spire beasts
		tower.currentFloorBreakRisk = Math.min(100, tower.currentFloorBreakRisk + 8);

		const text = `${person.name} was repelled on Floor ${floor} (${floorObj.name}) using ${tactic} (score ${totalScore} vs DC ${targetDc}). Took ${damage} damage from ${floorObj.guardian.name}.`;

		if (sim.log) {
			sim.log('quest', text, tower.cell, person.state);
		}

		return {
			success: false,
			text,
			damage,
			reward: undefined
		};
	}
}

/**
 * Attempt descent into the Bottomless Abyss.
 * Handles the Curse of Ascension upon return/ascent depending on depth layer.
 * Advances whistle rank if qualifying milestones met.
 */
export function attemptAbyssDescent(
	sim: Simulation,
	abyss: MegastructureSite,
	personId: number,
	targetLayer: number
): {
	success: boolean;
	text: string;
	strainDamage: number;
	relicEarned?: string;
	lastDiveTriggered: boolean;
} {
	const person = sim.people[personId];
	if (!person || !person.alive) {
		return {
			success: false,
			text: 'Delver is unavailable or deceased.',
			strainDamage: 0,
			lastDiveTriggered: false
		};
	}

	const state = getMegastructureState(sim);
	const clampedLayer = Math.max(1, Math.min(6, Math.floor(targetLayer)));
	const layerData = ABYSS_DEPTH_LAYERS[clampedLayer - 1];
	const isLastDive = clampedLayer >= 6;

	let delver = state.delvers.get(personId);
	if (!delver) {
		delver = {
			personId,
			name: `${person.name} ${person.house}`.trim(),
			whistle: 'bell',
			deepestLayer: 0,
			relicsFound: 0,
			lastDive: false,
			alive: true
		};
		state.delvers.set(personId, delver);
	}

	// Curse of Ascension calculation: strain mitigation based on whistle rank
	const whistleRank = WHISTLE_TIER_ORDER[delver.whistle];
	const whistleMitigation = whistleRank * 4;
	const variation = sim.rng.int(-3, 6);
	const strainDamage = Math.max(4, layerData.strainBaseDamage - whistleMitigation + variation);

	person.health = Math.max(0, person.health - strainDamage);

	if (person.health <= 0) {
		person.alive = false;
		person.died = sim.year;
		person.cause = `Consumed by the Curse of Ascension on Layer ${clampedLayer} (${layerData.name})`;
		sim.idx.touch();
		delver.alive = false;

		const failText = `${person.name} succumbed to the Curse of Ascension ascending from Layer ${clampedLayer} (${layerData.name}). Took ${strainDamage} strain damage: ${layerData.curseDescription}.`;

		if (sim.log) {
			sim.log('disaster', failText);
		}

		return {
			success: false,
			text: failText,
			strainDamage,
			lastDiveTriggered: isLastDive
		};
	}

	// Survived the descent and ascent
	delver.deepestLayer = Math.max(delver.deepestLayer, clampedLayer);
	abyss.highestClearedFloor = Math.max(abyss.highestClearedFloor, clampedLayer);

	if (isLastDive) {
		delver.lastDive = true;
		if (!person.traits.includes('Abyssal Transcendent')) {
			person.traits.push('Abyssal Transcendent');
		}
	}

	// Advance Whistle Rank based on depth reached
	let promotedWhistle: WhistleTier = delver.whistle;
	if (clampedLayer >= 5) {
		promotedWhistle = 'white';
	} else if (clampedLayer >= 4 && WHISTLE_TIER_ORDER[promotedWhistle] < WHISTLE_TIER_ORDER.black) {
		promotedWhistle = 'black';
	} else if (clampedLayer >= 3 && WHISTLE_TIER_ORDER[promotedWhistle] < WHISTLE_TIER_ORDER.moon) {
		promotedWhistle = 'moon';
	} else if (clampedLayer >= 2 && WHISTLE_TIER_ORDER[promotedWhistle] < WHISTLE_TIER_ORDER.blue) {
		promotedWhistle = 'blue';
	} else if (clampedLayer >= 1 && WHISTLE_TIER_ORDER[promotedWhistle] < WHISTLE_TIER_ORDER.red) {
		promotedWhistle = 'red';
	}
	delver.whistle = promotedWhistle;

	// Relic discovery chance
	const relicChance = 0.35 + clampedLayer * 0.1;
	let relicEarned: string | undefined;

	if (sim.rng.chance(relicChance)) {
		const relicNames = [
			'Sun Stone Shard',
			'Inverted Bell of Whispers',
			'Compass of the Great Fault',
			'Prismatic Goblet of the Giants',
			'Soul-Carved White Whistle Core',
			'Aubade Core of the Golden City'
		];
		relicEarned = relicNames[clampedLayer - 1];
		delver.relicsFound++;
		state.relicsExtracted++;

		if (sim.artifacts) {
			const artId = sim.nextArtifactId ? sim.nextArtifactId++ : sim.artifacts.length + 1;
			sim.artifacts.push({
				id: artId,
				name: relicEarned,
				kind: 'relic',
				icon: '✦',
				fame: 35 + clampedLayer * 12,
				year: sim.year,
				origin: `${abyss.name}, Layer ${clampedLayer}`,
				bonusStat: 'intrigue',
				bonusVal: 2 + clampedLayer,
				holderType: 'person',
				holderId: person.id,
				holderName: `${person.name} ${person.house}`.trim(),
				lore: `Salvaged from the depth of Layer ${clampedLayer} in ${abyss.name}.`
			});
		}

		person.gold += clampedLayer * 45 + sim.rng.int(10, 30);
		sim.innovation += Math.floor(clampedLayer / 2) + 1;
	}

	person.renown += clampedLayer * 4;
	abyss.currentFloorBreakRisk = Math.max(0, abyss.currentFloorBreakRisk - 10);

	let successText = `${person.name} survived descent to Layer ${clampedLayer} (${layerData.name}), enduring ${strainDamage} strain damage: ${layerData.curseDescription}. Whistle tier: ${delver.whistle}.`;
	if (relicEarned) {
		successText += ` Salvaged ancient relic: ${relicEarned}!`;
	}
	if (isLastDive) {
		successText += ` The Last Dive was executed into the Capital of the Unreturned!`;
	}

	if (sim.log) {
		sim.log('quest', successText, abyss.cell, person.state);
	}

	return {
		success: true,
		text: successText,
		strainDamage,
		relicEarned,
		lastDiveTriggered: isLastDive
	};
}

/**
 * Trigger a Floor Break from the Spire of Trials.
 * Spawns rampaging floor guardians onto the world map if neglected, threatening surrounding cities.
 */
export function triggerFloorBreak(
	sim: Simulation,
	tower: MegastructureSite
): { text: string; beastName: string; cell: number } {
	const state = getMegastructureState(sim);
	const beastFloor = Math.max(1, tower.highestClearedFloor);
	const beastName = `Floor ${beastFloor} Dread Chimera`;

	state.activeBreakBeasts.push({
		name: beastName,
		cell: tower.cell,
		power: 50 + beastFloor * 2
	});

	tower.currentFloorBreakRisk = 0;

	let outpostName = 'the surrounding frontiers';
	if (typeof tower.outpostBurgId === 'number' && sim.w.burgs[tower.outpostBurgId]) {
		const outpost = sim.w.burgs[tower.outpostBurgId];
		outpostName = outpost.name;
		outpost.pop = Math.max(0.2, outpost.pop - 0.4);
		if (typeof outpost.garrison === 'number') {
			outpost.garrison = Math.max(0, outpost.garrison - 5);
		}
	}

	const text = `Floor Break at ${tower.name}! ${beastName} broke containment from the Spire, rampaging toward ${outpostName}!`;

	if (sim.log) {
		sim.log('disaster', text);
	}

	return { text, beastName, cell: tower.cell };
}

/**
 * Trigger an Abyssal Surge from the Bottomless Abyss.
 * Miasma and eldritch horrors swarm the rim outpost.
 */
export function triggerAbyssalSurge(
	sim: Simulation,
	abyss: MegastructureSite
): { text: string; cell: number } {
	abyss.currentFloorBreakRisk = 0;

	let outpostName = 'the rim settlements';
	if (typeof abyss.outpostBurgId === 'number' && sim.w.burgs[abyss.outpostBurgId]) {
		const outpost = sim.w.burgs[abyss.outpostBurgId];
		outpostName = outpost.name;
		outpost.pop = Math.max(0.2, outpost.pop - 0.5);
	}

	const text = `Abyssal Surge at ${abyss.name}! Eldritch miasma and primordial horrors poured over the rim, swarming ${outpostName}!`;

	if (sim.log) {
		sim.log('disaster', text);
	}

	return { text, cell: abyss.cell };
}

/**
 * Process yearly simulation ticks for world megastructures.
 * AI adventurers challenge the tower and abyss, top rankers climb, relics are sold to realm markets
 * granting +innovation and +treasury, and floor break risks increment.
 */
export function processYearlyMegastructures(sim: Simulation): {
	events: { text: string; cell?: number; state?: number; kind: string }[];
} {
	const state = getMegastructureState(sim);
	const events: { text: string; cell?: number; state?: number; kind: string }[] = [];

	// Increment floor break risks
	state.tower.currentFloorBreakRisk += sim.rng.int(6, 15);
	state.abyss.currentFloorBreakRisk += sim.rng.int(6, 15);

	// Check for Spire Floor Break
	if (state.tower.currentFloorBreakRisk >= 100) {
		const breakEvt = triggerFloorBreak(sim, state.tower);
		events.push({
			text: breakEvt.text,
			cell: breakEvt.cell,
			kind: 'floor_break'
		});
	}

	// Check for Abyssal Surge
	if (state.abyss.currentFloorBreakRisk >= 100) {
		const surgeEvt = triggerAbyssalSurge(sim, state.abyss);
		events.push({
			text: surgeEvt.text,
			cell: surgeEvt.cell,
			kind: 'abyssal_surge'
		});
	}

	// Living adventurers
	const livingAdventurers = sim.people.filter(
		(p) => p.alive && (p.role === 'hero' || p.role === 'wanderer' || p.role === 'general' || p.role === 'magician')
	);

	const candidatePool = livingAdventurers.length > 0 ? livingAdventurers : sim.people.filter((p) => p.alive);

	// 1-2 AI Tower trial attempts
	if (candidatePool.length > 0) {
		const towerChallenger = sim.rng.pick(candidatePool);
		const existingRecord = state.rankers.get(towerChallenger.id);
		const targetFloor = Math.min(100, (existingRecord?.highestFloor ?? 0) + 1);
		const tactics: ('assault' | 'tactic' | 'magic')[] = ['assault', 'tactic', 'magic'];
		const chosenTactic = sim.rng.pick(tactics);

		const trialRes = attemptTowerTrial(sim, state.tower, towerChallenger.id, targetFloor, chosenTactic);
		if (trialRes.success && (targetFloor % 10 === 0 || targetFloor === 77 || targetFloor === 100)) {
			events.push({
				text: trialRes.text,
				cell: state.tower.cell,
				state: towerChallenger.state,
				kind: 'tower_climb'
			});
		}
	}

	// 1 AI Abyss descent attempt
	if (candidatePool.length > 0) {
		const delverCandidate = sim.rng.pick(candidatePool);
		const existingDelver = state.delvers.get(delverCandidate.id);
		const targetLayer = Math.min(6, (existingDelver?.deepestLayer ?? 0) + 1);

		const descentRes = attemptAbyssDescent(sim, state.abyss, delverCandidate.id, targetLayer);
		if (descentRes.success && (targetLayer >= 5 || descentRes.relicEarned)) {
			events.push({
				text: descentRes.text,
				cell: state.abyss.cell,
				state: delverCandidate.state,
				kind: 'abyss_descent'
			});
		}
	}

	// Relics and delve findings enrich the realm
	if (state.relicsExtracted > 0) {
		sim.innovation += 1;
		if (typeof state.tower.outpostBurgId === 'number') {
			const b = sim.w.burgs[state.tower.outpostBurgId];
			if (b && b.state > 0 && sim.polities[b.state]) {
				sim.polities[b.state].treasury += 20;
			}
		}
		if (typeof state.abyss.outpostBurgId === 'number') {
			const b = sim.w.burgs[state.abyss.outpostBurgId];
			if (b && b.state > 0 && sim.polities[b.state]) {
				sim.polities[b.state].treasury += 20;
			}
		}
	}

	return { events };
}

/**
 * Return Hall of Rankers sorted by highest floor reached and rank grade.
 */
export function getHallOfRankers(sim: Simulation): RankerRecord[] {
	const state = getMegastructureState(sim);
	return Array.from(state.rankers.values()).sort((a, b) => {
		if (b.highestFloor !== a.highestFloor) {
			return b.highestFloor - a.highestFloor;
		}
		return RANKER_GRADE_ORDER[b.grade] - RANKER_GRADE_ORDER[a.grade];
	});
}

/**
 * Return all delvers who have attained the White Whistle rank.
 */
export function getWhiteWhistleDelvers(sim: Simulation): DelverRecord[] {
	const state = getMegastructureState(sim);
	return Array.from(state.delvers.values())
		.filter((d) => d.whistle === 'white')
		.sort((a, b) => b.deepestLayer - a.deepestLayer);
}
