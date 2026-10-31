/**
 * Wanderer -> Realmforge: fold the roguelike hero's deeds into the sim's history (applyDeeds), pass the
 * in-game time the hero spent as simulated months (advanceForTurns), and the live postMessage link.
 */
import type { Simulation } from '../sim/engine';
import type { Cosmos } from '../sim/cosmos';

export interface WandererDeed {
	kind: string;
	text: string;
	monster?: number;
	artifact?: number;
	cell: number;
	year: number;
}
export interface WandererChronicle {
	seed: string;
	world?: string;
	hero?: { name?: string } & Record<string, unknown>;
	turns?: number;
	deeds: WandererDeed[];
}

/** The Wanderer dev port; the link only ever talks to this origin family. */
export const WANDERER_URL = 'http://localhost:5195/?link=1';
export const WANDERER_PORT = '5195';
export const REALMFORGE_PORT = '5180';

export function wandererOriginOk(origin: string): boolean {
	try {
		const u = new URL(origin);
		return u.port === WANDERER_PORT && u.hostname === location.hostname && (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
	} catch {
		return false;
	}
}
export function wandererOrigin(): string {
	const u = new URL(WANDERER_URL);
	return u.origin;
}

export const worldSeed = (sim: Simulation) => `${sim.w.opts.seed}:${sim.w.planet}`;

const applied = new WeakMap<Simulation, Set<string>>();
const syncedTurns = new WeakMap<Simulation, number>();

function heroName(deed: WandererDeed, fallback?: string): string {
	const m = /wanderer ([^,.]+?)(?:,| recovered| carried| completed| performed| became| perished|\.| was)/.exec(deed.text);
	return fallback || m?.[1]?.trim() || 'the wanderer';
}

/** Apply deeds to the sim. Returns how many entered history (already-applied deeds are skipped). */
export function applyDeeds(sim: Simulation, deeds: WandererDeed[], hero?: string): number {
	let seen = applied.get(sim);
	if (!seen) applied.set(sim, (seen = new Set()));
	const w = sim.w;
	let n = 0;
	for (const d of deeds) {
		const key = `${d.kind}|${d.year}|${d.text}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const cell = d.cell >= 0 && d.cell < w.cells.n ? d.cell : undefined;
		const name = heroName(d, hero);
		switch (d.kind) {
			case 'slay': {
				const m = d.monster ? sim.monsters.find((x) => x.id === d.monster) : undefined;
				if (m && m.alive) {
					m.alive = false;
					m.health = 0;
					m.slayer = name;
					m.slainYear = sim.year;
					if (m.immortal) m.slumberUntil = sim.year + 150;
				}
				sim.log('monster', d.text, cell);
				break;
			}
			case 'relic': {
				const a = d.artifact ? sim.artifacts.find((x) => x.id === d.artifact) : undefined;
				if (a && !/ was sold /.test(d.text)) {
					a.holderType = 'burg';
					a.holderId = nearestBurg(sim, cell ?? -1) || a.holderId;
					a.holderName = name;
				}
				sim.log('avatar', d.text, cell);
				break;
			}
			case 'quest':
				sim.log('quest', d.text, cell);
				break;
			default: // death, kinship, murder
				sim.log('avatar', d.text, cell);
		}
		n++;
	}
	return n;
}

function nearestBurg(sim: Simulation, cell: number): number {
	if (cell < 0) return 0;
	const c = sim.w.cells;
	let best = 0, bd = Infinity;
	for (const b of sim.w.burgs) {
		if (!b.id || !b.alive) continue;
		const d = (b.x - c.x[cell]) ** 2 + (b.y - c.y[cell]) ** 2;
		if (d < bd) {
			bd = d;
			best = b.id;
		}
	}
	return best;
}

const TURNS_PER_MONTH = 60 * 24 * 30;

/** Advance the cosmos by the months the hero spent since the last sync; logs a note. Returns months run. */
export function advanceForTurns(cosmos: Cosmos, sim: Simulation, turns: number): number {
	const prev = syncedTurns.get(sim) ?? 0;
	if (turns <= prev) return 0;
	const months = Math.min(24, Math.floor((turns - prev) / TURNS_PER_MONTH));
	if (months <= 0) return 0; // keep the remainder: syncedTurns only moves when months pass
	syncedTurns.set(sim, turns);
	cosmos.skip(months);
	sim.log('avatar', `While the wanderer travelled, ${months} month${months === 1 ? '' : 's'} passed.`);
	return months;
}

/** Full import used by file and live link: checks nothing about the seed; callers do. */
export function ingest(cosmos: Cosmos, sim: Simulation, deeds: WandererDeed[], turns: number, hero?: string): { deeds: number; months: number } {
	const n = applyDeeds(sim, deeds, hero);
	const months = advanceForTurns(cosmos, sim, turns);
	return { deeds: n, months };
}
