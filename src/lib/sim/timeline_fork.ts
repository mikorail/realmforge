import { Simulation } from './engine';
import { pack, unpack } from '../save';
import { makeRng } from '../rng';
import type { World } from '../gen/types';

export interface TimelineFork {
	id: string;
	label: string;
	forkYear: number;
	snapIndex: number;
	originalSeed: string;
	sim: Simulation;
	yearsAdvanced: number;
}

export interface TimelineSummary {
	year: number;
	survivingRealms: number;
	totalCells: number;
	totalPop: number;
	totalWars: number;
	activeWars: number;
	topRealms: { id: number; name: string; cells: number; pop: number }[];
}

export interface RealmComparisonRow {
	id: number;
	name: string;
	originalAlive: boolean;
	forkAlive: boolean;
	originalCells: number;
	forkCells: number;
	cellDelta: number;
}

export interface DivergentHighlight {
	year: number;
	timeline: 'original' | 'fork';
	kind: string;
	text: string;
}

export interface TimelineComparison {
	forkYear: number;
	divergenceLabel: string;
	original: TimelineSummary;
	fork: TimelineSummary;
	deltas: {
		survivingRealms: number;
		totalCells: number;
		totalPop: number;
		totalWars: number;
		activeWars: number;
	};
	realmDiffs: RealmComparisonRow[];
	divergentHighlights: DivergentHighlight[];
}

/**
 * Fork a live Simulation from any recorded HistorySnapshot index.
 * Deep-clones the world and simulation state via reference-preserving pack/unpack,
 * rewinds surface borders and chronicle to the snapshot year, and re-seeds the
 * fork's RNG deterministically from the divergence label so history branches cleanly.
 */
export function forkFromSnapshot(
	sim: Simulation,
	snapIndex: number,
	divergenceLabel = 'Alternate Timeline'
): TimelineFork {
	const snaps = sim.historySnapshots;
	if (!snaps.length) {
		throw new Error('Cannot fork timeline: no history snapshots recorded.');
	}
	const clampedIdx = Math.max(0, Math.min(snapIndex, snaps.length - 1));
	const snap = snaps[clampedIdx];
	const label = divergenceLabel.trim() || 'Alternate Timeline';

	// Deep-clone world + simulation dump without mutating the live simulation
	const cloned = unpack(pack({ w: sim.w, dump: sim.dump() })) as {
		w: World;
		dump: ReturnType<Simulation['dump']>;
	};
	const forkSim = Simulation.restore(cloned.w, cloned.dump);

	// Detach from any live Cosmos skipper or player avatar so the fork runs independently
	forkSim.cosmos = undefined;
	forkSim.skipper = null;
	forkSim.avatar = -1;
	forkSim.travel = null;
	forkSim.pending = null;

	// Restore surface political borders from the chosen snapshot
	const surface = forkSim.w.layers[0].state;
	const copyLen = Math.min(surface.length, snap.surfaceStates.length);
	for (let i = 0; i < copyLen; i++) {
		surface[i] = snap.surfaceStates[i];
	}
	if (forkSim.w.cells.state !== surface) {
		for (let i = 0; i < copyLen; i++) {
			forkSim.w.cells.state[i] = snap.surfaceStates[i];
		}
	}

	// Rewind clock, snapshots, and chronicle to the snapshot year
	forkSim.year = snap.year;
	forkSim.month = 0;
	forkSim.historySnapshots = forkSim.historySnapshots.slice(0, clampedIdx + 1);
	forkSim.events = forkSim.events.filter((e) => e.y <= snap.year);
	forkSim.allEvents = forkSim.allEvents.filter((e) => e.y <= snap.year);

	// Reconcile wars as of the fork year
	forkSim.wars = forkSim.wars
		.filter((w) => w.start <= snap.year)
		.map((w) => (w.end && w.end > snap.year ? { ...w, end: undefined, winner: undefined } : w));

	// Reconcile polity liveness against the restored map
	const present = new Set<number>();
	for (let i = 0; i < surface.length; i++) {
		if (surface[i] > 0) present.add(surface[i]);
	}
	for (const p of forkSim.polities) {
		if (!p.id) continue;
		if (present.has(p.id)) {
			p.alive = true;
			if (p.fell && p.fell > snap.year) p.fell = undefined;
		} else if (p.layer === 0 && p.founded > snap.year) {
			p.alive = false;
		}
	}

	// Re-seed RNG deterministically so the alternate branch diverges reproducibly
	forkSim.rng = makeRng(`${sim.w.opts.seed}:fork:${snap.year}:${label}`);

	forkSim.syncBurgs();
	forkSim.idx.touch();
	forkSim.recount();
	forkSim.computeBorders();
	forkSim.dirty.political = true;

	forkSim.log('misc', `Timeline fork (${label}): history branches away from the original chronicle at Year ${snap.year}.`);

	return {
		id: `fork-${snap.year}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'branch'}`,
		label,
		forkYear: snap.year,
		snapIndex: clampedIdx,
		originalSeed: sim.w.opts.seed,
		sim: forkSim,
		yearsAdvanced: 0
	};
}

/** Advance a forked timeline forward by N years (12 monthly ticks per year) */
export function runForkYears(fork: TimelineFork, years: number): TimelineFork {
	const count = Math.max(0, Math.floor(years));
	const startYear = fork.sim.year;
	for (let m = 0; m < count * 12; m++) {
		if (fork.sim.pending) fork.sim.pending = null;
		fork.sim.tick();
	}
	fork.yearsAdvanced += Math.max(0, fork.sim.year - startYear);
	return fork;
}

function summarizeSim(sim: Simulation): TimelineSummary {
	const alive = sim.polities.filter((p) => p.id > 0 && p.alive);
	let totalCells = 0;
	let totalPop = 0;
	for (const p of alive) {
		totalCells += p.cells;
		totalPop += p.pop;
	}
	const topRealms = alive
		.slice()
		.sort((a, b) => b.cells - a.cells)
		.slice(0, 6)
		.map((p) => ({
			id: p.id,
			name: p.name,
			cells: p.cells,
			pop: Math.round(p.pop * 10) / 10
		}));

	return {
		year: sim.year,
		survivingRealms: alive.length,
		totalCells,
		totalPop: Math.round(totalPop * 10) / 10,
		totalWars: sim.wars.length,
		activeWars: sim.wars.filter((w) => !w.end).length,
		topRealms
	};
}

/** Produce a structured side-by-side comparison between the original simulation and a forked timeline */
export function compareTimelines(
	original: Simulation,
	forkOrSim: TimelineFork | Simulation
): TimelineComparison {
	const isForkObj = 'forkYear' in forkOrSim && 'sim' in forkOrSim;
	const forkSim = isForkObj ? forkOrSim.sim : forkOrSim;
	const forkYear = isForkObj ? forkOrSim.forkYear : 1;
	const divergenceLabel = isForkObj ? forkOrSim.label : 'Alternate Timeline';

	const origSummary = summarizeSim(original);
	const forkSummary = summarizeSim(forkSim);

	// Compare all polities present in either timeline
	const maxId = Math.max(original.polities.length, forkSim.polities.length);
	const realmDiffs: RealmComparisonRow[] = [];
	for (let id = 1; id < maxId; id++) {
		const po = original.polities[id];
		const pf = forkSim.polities[id];
		if (!po && !pf) continue;
		const originalAlive = Boolean(po?.alive);
		const forkAlive = Boolean(pf?.alive);
		const originalCells = originalAlive ? po.cells : 0;
		const forkCells = forkAlive ? pf.cells : 0;
		if (!originalAlive && !forkAlive) continue;
		const cellDelta = forkCells - originalCells;
		realmDiffs.push({
			id,
			name: (pf?.name ?? po?.name ?? `Realm ${id}`),
			originalAlive,
			forkAlive,
			originalCells,
			forkCells,
			cellDelta
		});
	}
	realmDiffs.sort((a, b) => Math.abs(b.cellDelta) - Math.abs(a.cellDelta) || b.forkCells - a.forkCells);

	// Collect divergent chronicle highlights after the fork year
	const origPost = original.allEvents.filter((e) => e.y >= forkYear);
	const forkPost = forkSim.allEvents.filter((e) => e.y >= forkYear);
	const origTexts = new Set(origPost.map((e) => `${e.y}|${e.text}`));
	const forkTexts = new Set(forkPost.map((e) => `${e.y}|${e.text}`));

	const majorKinds = new Set(['war', 'peace', 'fall', 'found', 'rebel', 'plague', 'tech', 'wonder', 'god']);
	const highlights: DivergentHighlight[] = [];

	for (const e of forkPost) {
		if (!origTexts.has(`${e.y}|${e.text}`) && (majorKinds.has(e.kind) || highlights.length < 6)) {
			highlights.push({ year: e.y, timeline: 'fork', kind: e.kind, text: e.text });
		}
		if (highlights.length >= 8) break;
	}
	let origAdded = 0;
	for (const e of origPost) {
		if (!forkTexts.has(`${e.y}|${e.text}`) && (majorKinds.has(e.kind) || origAdded < 4)) {
			highlights.push({ year: e.y, timeline: 'original', kind: e.kind, text: e.text });
			origAdded++;
		}
		if (origAdded >= 6) break;
	}
	highlights.sort((a, b) => a.year - b.year);

	return {
		forkYear,
		divergenceLabel,
		original: origSummary,
		fork: forkSummary,
		deltas: {
			survivingRealms: forkSummary.survivingRealms - origSummary.survivingRealms,
			totalCells: forkSummary.totalCells - origSummary.totalCells,
			totalPop: Math.round((forkSummary.totalPop - origSummary.totalPop) * 10) / 10,
			totalWars: forkSummary.totalWars - origSummary.totalWars,
			activeWars: forkSummary.activeWars - origSummary.activeWars
		},
		realmDiffs: realmDiffs.slice(0, 12),
		divergentHighlights: highlights
	};
}
