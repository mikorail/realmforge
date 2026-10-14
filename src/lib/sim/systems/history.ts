/** Chronicle archive: logging (re-skinned through the genre voice), periodic border snapshots, archive compaction. */
import type { Simulation } from '../engine';
import { reskin } from '../genrepacks';
import type { ChronEvent, EventKind } from '../types';

const MAX_EVENTS = 600;

export function log(sim: Simulation, kind: EventKind, text: string, cell?: number, state?: number) {
	const ev: ChronEvent = { id: sim.nextEventId++, y: sim.year, m: sim.month, kind, text: reskin(sim.voice, text), cell, state };
	sim.events.push(ev);
	if (sim.events.length > MAX_EVENTS) sim.events.splice(0, sim.events.length - MAX_EVENTS);
	sim.allEvents.push(ev);
}

export function takeHistorySnapshot(sim: Simulation) {
	const surfaceStates = new Uint16Array(sim.w.layers[0].state);
	const activeRealms = sim.polities.filter((p) => p.id && p.alive).length;
	const activeWars = sim.wars.filter((w) => !w.end).length;
	sim.historySnapshots.push({
		year: sim.year,
		surfaceStates,
		activeRealms,
		activeWars
	});
	if (sim.historySnapshots.length > 1000) sim.historySnapshots.shift();
}

/** major events are kept forever; routine ones older than 60 years are dropped once the archive is large */
export function compactArchive(sim: Simulation) {
	if (sim.allEvents.length < 25000) return;
	const MINOR = new Set(['uprising', 'intrigue', 'misc', 'luminary', 'quest', 'avatar', 'capture', 'birth', 'tech']);
	const cutoff = sim.year - 60;
	sim.allEvents = sim.allEvents.filter((e) => e.y >= cutoff || !MINOR.has(e.kind));
}
