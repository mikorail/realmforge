import type { Simulation } from './engine';
import type { Person, Polity } from './types';
import { clamp, makeRng, type Rng } from '../rng';
import { SEA } from '../gen/types';
import { neighbors } from '../gen/grid';
import { palette } from '../gen/society';
import { BIOMES } from '../gen/physical';

export type MigrationWaveKind = 'steppe_horde' | 'refugee_armada' | 'gold_rush';

export interface MigrationWave {
	id: number;
	kind: MigrationWaveKind;
	name: string;
	originPolityId: number;
	originCulture: number;
	originCell: number;
	targetCell: number;
	targetBurgId: number;
	currentCell: number;
	startYear: number;
	durationYears: number;
	yearsElapsed: number;
	migrants: number;
	active: boolean;
	outcome?: 'hybrid_polity' | 'cultural_enclave' | 'dispersed';
	successorPolityId?: number;
}

export interface CulturalEnclave {
	id: number;
	name: string;
	waveId: number;
	originCulture: number;
	hostCulture: number;
	hostPolityId: number;
	burgId: number;
	cell: number;
	foundedYear: number;
	hybridLabel: string;
}

export interface HybridSuccessor {
	id: number;
	polityId: number;
	name: string;
	waveId: number;
	kind: MigrationWaveKind;
	originCulture: number;
	localCulture: number;
	foundedYear: number;
	capitalBurgId: number;
}

export interface MigrationWavesState {
	waves: MigrationWave[];
	enclaves: CulturalEnclave[];
	successors: HybridSuccessor[];
	nextId: number;
}

const simMigrationMap = new WeakMap<Simulation, MigrationWavesState>();

export function getMigrationState(sim: Simulation): MigrationWavesState {
	let state = simMigrationMap.get(sim);
	if (!state) {
		const raw = (sim as unknown as { _migrationWavesState?: MigrationWavesState })._migrationWavesState;
		if (raw && Array.isArray(raw.waves)) {
			state = raw;
		} else {
			state = {
				waves: [],
				enclaves: [],
				successors: [],
				nextId: 1
			};
			(sim as unknown as { _migrationWavesState?: MigrationWavesState })._migrationWavesState = state;
		}
		simMigrationMap.set(sim, state);
	}
	return state;
}

const WAVE_LABELS: Record<MigrationWaveKind, readonly string[]> = {
	steppe_horde: ['Iron Stirrup Horde', 'Grey Steppe Host', 'Wind-Rider Confederation', 'Great Plains Banner', 'Red Banner Tumens'],
	refugee_armada: ['Exile Fleet', 'Salt-Tide Armada', 'Displaced Flotilla', 'Shattered Coast Convoy', 'Haven-Bound Sails'],
	gold_rush: ['Gilded Frontier Rush', 'Silver-Vein Stampede', 'Prospector Tide', 'Sun-Ore Boom', 'Deep-Lode Rush']
};

const SUCCESSOR_FORMS: Record<MigrationWaveKind, readonly string[]> = {
	steppe_horde: ['Khanate', 'Horde', 'March'],
	refugee_armada: ['Freehold', 'Exarchate', 'League'],
	gold_rush: ['Syndicate', 'Frontier Compact', 'Charter']
};

function sideRng(sim: Simulation, tag: string): Rng {
	return makeRng(`${sim.w.opts.seed}:mw:${sim.planetIndex}:${sim.year}:${tag}`);
}

function cellDistanceSq(sim: Simulation, a: number, b: number): number {
	const dx = sim.c.x[a] - sim.c.x[b];
	const dy = sim.c.y[a] - sim.c.y[b];
	return dx * dx + dy * dy;
}

function pickDestinationBurg(sim: Simulation, originCell: number, originPolityId: number, kind: MigrationWaveKind, rng: Rng) {
	const surfaceBurgs = sim.w.burgs.filter((b) => b.id > 0 && b.alive && sim.burgLayer(b) === 0);
	if (!surfaceBurgs.length) return null;

	let candidates = surfaceBurgs.filter((b) => b.state !== originPolityId);
	if (kind === 'refugee_armada') {
		const coastal = candidates.filter((b) => {
			if (b.port) return true;
			const nbs = neighbors(sim.c, b.cell);
			for (let k = 0; k < nbs.length; k++) if (sim.c.h[nbs[k]] < SEA) return true;
			return false;
		});
		if (coastal.length) candidates = coastal;
	} else if (kind === 'gold_rush') {
		const frontier = candidates.filter((b) => b.state === 0 || b.pop < 8);
		if (frontier.length) candidates = frontier;
	}
	if (!candidates.length) candidates = surfaceBurgs;

	// Prefer distant destinations to simulate trans-continental movement
	const ranked = candidates
		.map((b) => ({ b, d2: cellDistanceSq(sim, originCell, b.cell) }))
		.sort((x, y) => y.d2 - x.d2);
	const pool = ranked.slice(0, Math.min(6, ranked.length));
	return rng.pick(pool).b;
}

function makeHybridName(originName: string, localName: string): string {
	const a = originName.split(/\s+/)[0] || 'Border';
	const b = localName.split(/\s+/)[0] || 'March';
	if (a.toLowerCase() === b.toLowerCase()) return `New ${b}`;
	return `${a}-${b}`;
}

/** Found a hybrid successor polity without touching sim.rng */
function foundHybridSuccessorPolity(
	sim: Simulation,
	wave: MigrationWave,
	targetBurgId: number,
	rng: Rng
): HybridSuccessor | null {
	const st = getMigrationState(sim);
	const burg = sim.w.burgs[targetBurgId];
	if (!burg || !burg.alive) return null;

	const c = sim.c;
	const S = sim.st(0);
	const oldStateId = S[burg.cell];
	const originCultureObj = sim.w.cultures[wave.originCulture];
	const localCultureId = c.culture[burg.cell] || burg.culture || 1;
	const localCultureObj = sim.w.cultures[localCultureId];

	const hybridBase = makeHybridName(originCultureObj?.name ?? 'Vanguard', localCultureObj?.name ?? burg.name);
	const form = rng.pick(SUCCESSOR_FORMS[wave.kind]);
	const fullName = `${form} of ${hybridBase}`;
	const newId = sim.polities.length;

	// Claim a small cluster of surface cells around the destination burg
	const claimCells: number[] = [burg.cell];
	const visited = new Set<number>([burg.cell]);
	const queue: number[] = [burg.cell];
	const maxCells = wave.kind === 'steppe_horde' ? 12 : wave.kind === 'gold_rush' ? 8 : 7;

	while (queue.length && claimCells.length < maxCells) {
		const cur = queue.shift()!;
		for (const nb of neighbors(c, cur)) {
			if (visited.has(nb) || c.h[nb] < SEA || BIOMES[c.biome[nb]].hab === 0) continue;
			visited.add(nb);
			// Do not steal another realm's capital cell
			const nbBurgId = sim.lb[0][nb];
			if (nbBurgId && sim.w.burgs[nbBurgId]?.capital && S[nb] !== 0) continue;
			claimCells.push(nb);
			queue.push(nb);
			if (claimCells.length >= maxCells) break;
		}
	}

	const ideology =
		wave.kind === 'steppe_horde'
			? 'autocracy'
			: wave.kind === 'gold_rush'
				? 'oligarchy'
				: 'republic';

	const newPolity: Polity = {
		id: newId,
		name: hybridBase,
		form,
		fullName,
		color: palette(rng, 1, 62, 54)[0],
		capital: burg.id,
		culture: wave.originCulture || localCultureId,
		religion: c.religion[burg.cell] || 1,
		alive: true,
		founded: sim.year,
		treasury: 35 + Math.round(wave.migrants * 1.5),
		army: Math.max(4, wave.migrants * 0.45),
		stability: 62,
		tax: 0.1,
		ruler: 0,
		heir: 0,
		relations: {},
		allies: [],
		cells: 0,
		pop: 0,
		peak: 0,
		expansionism: wave.kind === 'steppe_horde' ? 1.35 : 1.05,
		origin: 'migration',
		layer: 0,
		species: originCultureObj?.species ?? 'human',
		ideology
	};

	if (oldStateId > 0 && sim.polities[oldStateId]?.alive) {
		newPolity.relations[oldStateId] = wave.kind === 'steppe_horde' ? -60 : -20;
		sim.polities[oldStateId].relations[newId] = newPolity.relations[oldStateId];
	}

	// Create a ruler without advancing sim.rng
	const rulerId = sim.people.length;
	const ruler: Person = {
		id: rulerId,
		name: `${hybridBase} Vanguard`,
		house: `House ${hybridBase}`,
		born: sim.year - rng.int(24, 46),
		culture: newPolity.culture,
		religion: newPolity.religion,
		state: newId,
		burg: burg.id,
		role: 'ruler',
		martial: rng.int(5, 10),
		diplomacy: rng.int(4, 9),
		stewardship: rng.int(4, 9),
		intrigue: rng.int(3, 8),
		health: 100,
		gold: 40,
		renown: 25,
		alive: true,
		traits: [wave.kind === 'steppe_horde' ? 'bold' : wave.kind === 'gold_rush' ? 'greedy' : 'resilient'],
		parent: 0
	};
	sim.people.push(ruler);
	newPolity.ruler = rulerId;
	sim.polities.push(newPolity);

	for (const cell of claimCells) {
		S[cell] = newId;
		if (rng.chance(0.55) && wave.originCulture > 0) {
			c.culture[cell] = wave.originCulture;
		}
		c.pop[cell] = Math.max(0.2, c.pop[cell] + wave.migrants / Math.max(4, claimCells.length));
	}

	burg.capital = true;
	burg.pop = Math.round((burg.pop + wave.migrants * 0.6) * 10) / 10;

	sim.syncBurgs();
	sim.idx.touch();
	sim.recount();
	sim.computeBorders();
	sim.dirty.political = true;

	const successor: HybridSuccessor = {
		id: st.nextId++,
		polityId: newId,
		name: fullName,
		waveId: wave.id,
		kind: wave.kind,
		originCulture: wave.originCulture,
		localCulture: localCultureId,
		foundedYear: sim.year,
		capitalBurgId: burg.id
	};
	st.successors.push(successor);

	wave.outcome = 'hybrid_polity';
	wave.successorPolityId = newId;
	wave.active = false;

	sim.log(
		'found',
		`Migration successor founded: ${wave.name} settles around ${burg.name} and establishes ${fullName}, blending ${originCultureObj?.name ?? 'migrant'} and ${localCultureObj?.name ?? 'local'} customs.`,
		burg.cell,
		newId
	);

	return successor;
}

/** Establish a cultural enclave inside a host settlement without touching sim.rng */
function foundCulturalEnclave(
	sim: Simulation,
	wave: MigrationWave,
	targetBurgId: number,
	rng: Rng
): CulturalEnclave | null {
	const st = getMigrationState(sim);
	const burg = sim.w.burgs[targetBurgId];
	if (!burg || !burg.alive) return null;

	const originCultureObj = sim.w.cultures[wave.originCulture];
	const hostCultureId = sim.c.culture[burg.cell] || burg.culture || 1;
	const hostCultureObj = sim.w.cultures[hostCultureId];
	const hybridLabel = makeHybridName(originCultureObj?.name ?? 'Migrant', hostCultureObj?.name ?? 'Local');

	const enclave: CulturalEnclave = {
		id: st.nextId++,
		name: `${hybridLabel} Quarter of ${burg.name}`,
		waveId: wave.id,
		originCulture: wave.originCulture,
		hostCulture: hostCultureId,
		hostPolityId: burg.state,
		burgId: burg.id,
		cell: burg.cell,
		foundedYear: sim.year,
		hybridLabel
	};
	st.enclaves.push(enclave);

	// Boost local population and spread culture to a couple neighboring cells
	burg.pop = Math.round((burg.pop + wave.migrants * 0.4) * 10) / 10;
	sim.c.pop[burg.cell] += wave.migrants * 0.25;
	if (wave.originCulture > 0) {
		for (const nb of neighbors(sim.c, burg.cell)) {
			if (sim.c.h[nb] >= SEA && rng.chance(0.35)) {
				sim.c.culture[nb] = wave.originCulture;
			}
		}
	}

	const hostPol = sim.polities[burg.state];
	if (hostPol?.alive) {
		if (wave.kind === 'gold_rush') {
			hostPol.treasury += Math.round(wave.migrants * 1.2);
		} else {
			hostPol.stability = clamp(hostPol.stability - 3, 10, 100);
		}
	}

	wave.outcome = 'cultural_enclave';
	wave.active = false;

	sim.log(
		'found',
		`Cultural enclave settled: migrants of ${wave.name} establish ${enclave.name}, enriching ${burg.name} with ${hybridLabel} traditions.`,
		burg.cell,
		burg.state || undefined
	);

	return enclave;
}

/** Trigger a Great Migration or Colonization Wave (steppe horde, refugee armada, or gold rush) */
export function triggerMigrationWave(
	sim: Simulation,
	kind: MigrationWaveKind,
	originPolityId?: number
): MigrationWave | null {
	const st = getMigrationState(sim);
	const rng = sideRng(sim, `trigger:${kind}:${originPolityId ?? 0}:${st.nextId}`);

	const alivePolities = sim.polities.filter((p) => p.id > 0 && p.alive && p.layer === 0);
	let originPol: Polity | undefined;
	if (originPolityId !== undefined) {
		originPol = sim.polities[originPolityId];
		if (!originPol || !originPol.alive) return null;
	} else if (alivePolities.length) {
		originPol = rng.pick(alivePolities);
	}

	const originBurg = originPol ? sim.w.burgs[originPol.capital] : sim.w.burgs.find((b) => b.id > 0 && b.alive && sim.burgLayer(b) === 0);
	if (!originBurg) return null;

	const targetBurg = pickDestinationBurg(sim, originBurg.cell, originPol?.id ?? 0, kind, rng);
	if (!targetBurg) return null;

	const baseLabel = rng.pick(WAVE_LABELS[kind]);
	const originName = originPol?.name ?? originBurg.name;
	const name = `${originName} ${baseLabel}`;
	const migrants = kind === 'steppe_horde' ? rng.int(12, 26) : kind === 'refugee_armada' ? rng.int(8, 20) : rng.int(10, 24);
	const durationYears = rng.int(2, 5);

	const wave: MigrationWave = {
		id: st.nextId++,
		kind,
		name,
		originPolityId: originPol?.id ?? 0,
		originCulture: originPol?.culture ?? originBurg.culture,
		originCell: originBurg.cell,
		targetCell: targetBurg.cell,
		targetBurgId: targetBurg.id,
		currentCell: originBurg.cell,
		startYear: sim.year,
		durationYears,
		yearsElapsed: 0,
		migrants,
		active: true
	};

	st.waves.push(wave);

	const kindDesc =
		kind === 'steppe_horde'
			? 'steppe horde migration'
			: kind === 'refugee_armada'
				? 'refugee armada'
				: 'frontier gold-rush wave';

	sim.log(
		'misc',
		`Great migration begins: ${wave.name} launches a ${kindDesc} from ${originName} toward ${targetBurg.name}.`,
		originBurg.cell,
		originPol?.id || undefined
	);

	return wave;
}

/** Settle an active migration wave into either a hybrid successor polity or a cultural enclave */
export function settleMigrationWave(
	sim: Simulation,
	waveId: number,
	forceOutcome?: 'hybrid_polity' | 'cultural_enclave'
): { outcome: 'hybrid_polity' | 'cultural_enclave' | 'dispersed'; successor?: HybridSuccessor; enclave?: CulturalEnclave } | null {
	const st = getMigrationState(sim);
	const wave = st.waves.find((w) => w.id === waveId);
	if (!wave || !wave.active) return null;

	const rng = sideRng(sim, `settle:${wave.id}`);
	const targetBurg = sim.w.burgs[wave.targetBurgId];
	if (!targetBurg || !targetBurg.alive) {
		wave.active = false;
		wave.outcome = 'dispersed';
		return { outcome: 'dispersed' };
	}

	wave.currentCell = targetBurg.cell;
	const canFoundPolity = !targetBurg.capital || targetBurg.state === 0;
	const wantPolity =
		forceOutcome === 'hybrid_polity'
			? true
			: forceOutcome === 'cultural_enclave'
				? false
				: canFoundPolity && (wave.kind === 'steppe_horde' ? rng.chance(0.65) : rng.chance(0.45));

	if (wantPolity && canFoundPolity) {
		const successor = foundHybridSuccessorPolity(sim, wave, targetBurg.id, rng);
		if (successor) return { outcome: 'hybrid_polity', successor };
	}

	const enclave = foundCulturalEnclave(sim, wave, targetBurg.id, rng);
	if (enclave) return { outcome: 'cultural_enclave', enclave };

	wave.active = false;
	wave.outcome = 'dispersed';
	return { outcome: 'dispersed' };
}

/** Yearly simulation pass for Great Migrations and Colonization Waves (side RNG only) */
export function yearlyMigrationWaves(sim: Simulation): void {
	const st = getMigrationState(sim);
	const rng = sideRng(sim, 'yearly');

	// 1. Advance active migration waves
	for (const wave of st.waves) {
		if (!wave.active) continue;
		wave.yearsElapsed++;
		if (wave.yearsElapsed >= wave.durationYears) {
			settleMigrationWave(sim, wave.id);
		}
	}

	// 2. Periodically spawn organic Volkerwanderung waves (kept rare so history stays balanced)
	const activeCount = st.waves.filter((w) => w.active).length;
	if (activeCount >= 2 || sim.year < 15 || sim.year % 25 !== 0) return;

	if (!rng.chance(0.28)) return;

	const alive = sim.polities.filter((p) => p.id > 0 && p.alive && p.layer === 0);
	if (alive.length < 2) return;

	// Choose wave kind from world conditions
	const activeWars = sim.wars.filter((w) => !w.end).length;
	let kind: MigrationWaveKind;
	if (activeWars >= 2 && rng.chance(0.5)) {
		kind = 'refugee_armada';
	} else if (rng.chance(0.5)) {
		kind = 'steppe_horde';
	} else {
		kind = 'gold_rush';
	}

	const origin = rng.pick(alive);
	triggerMigrationWave(sim, kind, origin.id);
}
