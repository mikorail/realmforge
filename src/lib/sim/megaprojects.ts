import { SEA } from '../gen/types';
import type { Simulation } from './engine';

export type MegaprojectKind = 'continental_canal' | 'bastion_wall' | 'celestial_orrery';

export interface Megaproject {
	id: number;
	kind: MegaprojectKind;
	name: string;
	sponsorStateId: number;
	cells: number[];
	progress: number;
	totalCostGold: number;
	fundedGold: number;
	completed: boolean;
	completionYear?: number;
	benefitsDesc: string;
}

export interface MegaprojectsState {
	projects: Megaproject[];
	nextProjectId: number;
	globalTradeBonus: number;
	bastionCells: Set<number>;
	celestialRiftsRevealed: boolean;
}

const simMegaprojectsMap = new WeakMap<Simulation, MegaprojectsState>();

export function getMegaprojectsState(sim: Simulation): MegaprojectsState {
	let state = simMegaprojectsMap.get(sim);
	if (!state) {
		const raw = (sim as unknown as { _megaprojectsState?: MegaprojectsState })._megaprojectsState;
		if (raw) {
			state = raw;
		} else {
			state = {
				projects: [],
				nextProjectId: 1,
				globalTradeBonus: 0,
				bastionCells: new Set<number>(),
				celestialRiftsRevealed: false
			};
			(sim as unknown as { _megaprojectsState?: MegaprojectsState })._megaprojectsState = state;
		}
		simMegaprojectsMap.set(sim, state);
	}
	return state;
}

/**
 * Identifies narrow 1 to 3 cell land bridges separating two distinct ocean bodies.
 */
export function findPotentialCanalSites(
	sim: Simulation
): { isthmusCells: number[]; name: string; cost: number }[] {
	const c = sim.w.cells;
	const n = c.n;
	const candidates: { isthmusCells: number[]; name: string; cost: number }[] = [];
	const seenCells = new Set<number>();

	// Helper: get water neighbours of a cell
	function getWaterNeighbours(cell: number): number[] {
		const waterNbrs: number[] = [];
		const start = c.nStart[cell];
		const end = c.nStart[cell + 1];
		for (let k = start; k < end; k++) {
			const nbr = c.nList[k];
			if (c.h[nbr] < SEA) {
				waterNbrs.push(nbr);
			}
		}
		return waterNbrs;
	}

	// Helper: check if two water cells are distinct ocean bodies or separated by distant water
	function isDistinctWater(w1: number, w2: number): boolean {
		if (w1 === w2) return false;
		if (c.feature[w1] !== c.feature[w2]) {
			return true;
		}
		// If same water feature, check if distance via water is >= 6
		const queue: [number, number][] = [[w1, 0]];
		const visited = new Set<number>([w1]);
		let foundWithinLimit = false;

		while (queue.length > 0) {
			const [curr, depth] = queue.shift()!;
			if (curr === w2) {
				foundWithinLimit = true;
				break;
			}
			if (depth >= 5) continue;
			const start = c.nStart[curr];
			const end = c.nStart[curr + 1];
			for (let k = start; k < end; k++) {
				const nbr = c.nList[k];
				if (c.h[nbr] < SEA && !visited.has(nbr)) {
					visited.add(nbr);
					queue.push([nbr, depth + 1]);
				}
			}
		}

		return !foundWithinLimit;
	}

	// 1-cell isthmuses
	for (let i = 0; i < n; i++) {
		if (c.h[i] < SEA) continue;
		const waterNbrs = getWaterNeighbours(i);
		if (waterNbrs.length < 2) continue;

		for (let a = 0; a < waterNbrs.length; a++) {
			for (let b = a + 1; b < waterNbrs.length; b++) {
				if (isDistinctWater(waterNbrs[a], waterNbrs[b])) {
					if (!seenCells.has(i)) {
						seenCells.add(i);
						const burg = sim.w.burgs.find((bg) => bg.alive && bg.cell === i);
						const polity = c.state[i] ? sim.polities[c.state[i]] : null;
						const name = burg
							? `${burg.name} Isthmus Cut`
							: polity
								? `${polity.name} Strait Canal`
								: `Continental Neck Canal ${candidates.length + 1}`;
						candidates.push({
							isthmusCells: [i],
							name,
							cost: 500
						});
					}
					break;
				}
			}
			if (seenCells.has(i)) break;
		}
		if (candidates.length >= 6) break;
	}

	// 2-cell isthmuses if needed
	if (candidates.length < 4) {
		for (let i = 0; i < n; i++) {
			if (c.h[i] < SEA || seenCells.has(i)) continue;
			const waterA = getWaterNeighbours(i);
			if (waterA.length === 0) continue;

			const start = c.nStart[i];
			const end = c.nStart[i + 1];
			for (let k = start; k < end; k++) {
				const j = c.nList[k];
				if (j <= i || c.h[j] < SEA || seenCells.has(j)) continue;
				const waterB = getWaterNeighbours(j);
				if (waterB.length === 0) continue;

				let found = false;
				for (const wa of waterA) {
					for (const wb of waterB) {
						if (isDistinctWater(wa, wb)) {
							seenCells.add(i);
							seenCells.add(j);
							const polity = c.state[i] ? sim.polities[c.state[i]] : null;
							const name = polity
								? `${polity.name} Dual-Reach Canal`
								: `Great Isthmus Canal ${candidates.length + 1}`;
							candidates.push({
								isthmusCells: [i, j],
								name,
								cost: 900
							});
							found = true;
							break;
						}
					}
					if (found) break;
				}
				if (found) break;
			}
			if (candidates.length >= 6) break;
		}
	}

	// 3-cell fallback if no natural 1-2 cell isthmus found
	if (candidates.length === 0) {
		// Pick any coastal land cell chain that approaches another coast
		for (let i = 0; i < n; i++) {
			if (c.h[i] >= SEA && c.dist[i] === 1) {
				const start = c.nStart[i];
				const end = c.nStart[i + 1];
				for (let k = start; k < end; k++) {
					const j = c.nList[k];
					if (c.h[j] >= SEA) {
						const jStart = c.nStart[j];
						const jEnd = c.nStart[j + 1];
						for (let l = jStart; l < jEnd; l++) {
							const m = c.nList[l];
							if (m !== i && c.h[m] >= SEA && c.dist[m] === 1) {
								candidates.push({
									isthmusCells: [i, j, m],
									name: 'Transcontinental Passage Canal',
									cost: 1400
								});
								return candidates;
							}
						}
					}
				}
			}
		}
	}

	return candidates;
}

/**
 * Initiate construction on a planetary megaproject.
 */
export function initiateMegaproject(
	sim: Simulation,
	stateId: number,
	kind: MegaprojectKind,
	cells: number[]
): { success: boolean; project?: Megaproject; msg: string } {
	const state = getMegaprojectsState(sim);
	const polity = sim.polities[stateId];
	if (!polity || !polity.alive) {
		return { success: false, msg: 'Sponsoring realm not found or inactive.' };
	}

	let name = '';
	let totalCostGold = 1000;
	let benefitsDesc = '';

	if (kind === 'continental_canal') {
		name = `${polity.name} Continental Canal`;
		totalCostGold = Math.max(500, cells.length * 500);
		benefitsDesc =
			'Carves navigable sea tiles across the continent, connecting maritime routes (+40% global trade wealth).';
	} else if (kind === 'bastion_wall') {
		name = `${polity.name} Bastion Wall`;
		totalCostGold = Math.max(400, cells.length * 150);
		benefitsDesc =
			'Massive stone fortifications along frontier territory (+70% defense against all invasions and beast attacks).';
	} else {
		// celestial_orrery
		name = `${polity.name} Celestial Orrery`;
		totalCostGold = 1200;
		benefitsDesc =
			'Colossal planetary astrolabe tapping cosmic leylines (+15 annual innovation and reveals celestial rifts).';
	}

	const id = state.nextProjectId++;
	const project: Megaproject = {
		id,
		kind,
		name,
		sponsorStateId: stateId,
		cells: [...cells],
		progress: 0,
		totalCostGold,
		fundedGold: 0,
		completed: false,
		benefitsDesc
	};

	state.projects.push(project);
	return {
		success: true,
		project,
		msg: `Megaproject '${project.name}' formally initiated by ${polity.name}.`
	};
}

/**
 * Contribute treasury gold to a megaproject, advancing its construction.
 */
export function contributeToMegaproject(
	sim: Simulation,
	projectId: number,
	gold: number
): { completed: boolean; progress: number; msg: string } {
	const state = getMegaprojectsState(sim);
	const project = state.projects.find((p) => p.id === projectId);
	if (!project) {
		return { completed: false, progress: 0, msg: 'Megaproject record not found.' };
	}

	if (project.completed) {
		return {
			completed: true,
			progress: 100,
			msg: `Megaproject '${project.name}' is already completed.`
		};
	}

	project.fundedGold += gold;
	project.progress = Math.min(100, Math.floor((project.fundedGold / project.totalCostGold) * 100));

	if (project.fundedGold >= project.totalCostGold) {
		project.completed = true;
		project.completionYear = sim.year;
		project.progress = 100;

		if (project.kind === 'continental_canal') {
			// Carve sea tiles (h < SEA)
			for (const cell of project.cells) {
				if (cell >= 0 && cell < sim.w.cells.n) {
					sim.w.cells.h[cell] = SEA - 2; // e.g. 18 < 20
					sim.w.cells.dist[cell] = -1; // coastal sea
					sim.w.cells.road[cell] = 0;
				}
			}
			sim.dirty.terrain = true;
			state.globalTradeBonus += 0.4;
			if (sim.polities[project.sponsorStateId]?.alive) {
				sim.polities[project.sponsorStateId].treasury += 200;
				sim.polities[project.sponsorStateId].stability = Math.min(
					100,
					sim.polities[project.sponsorStateId].stability + 10
				);
			}
		} else if (project.kind === 'bastion_wall') {
			// Fortify frontier border cells with massive stone bastions
			for (const cell of project.cells) {
				state.bastionCells.add(cell);
			}
			if (sim.polities[project.sponsorStateId]?.alive) {
				const sponsor = sim.polities[project.sponsorStateId];
				sponsor.stability = Math.min(100, sponsor.stability + 15);
				sponsor.army += 50;
			}
		} else if (project.kind === 'celestial_orrery') {
			// Grants +15 annual innovation to the sponsor nation and reveals celestial rifts
			sim.innovation += 15;
			state.celestialRiftsRevealed = true;
		}

		return {
			completed: true,
			progress: 100,
			msg: `The Megaproject '${project.name}' has reached glorious completion!`
		};
	}

	return {
		completed: false,
		progress: project.progress,
		msg: `Contributed ${gold} gold to '${project.name}'. Construction progress: ${project.progress}%.`
	};
}

/**
 * Advances ongoing megaprojects yearly, processing investments and yields.
 */
export function processYearlyMegaprojects(
	sim: Simulation
): { events: { text: string; cell?: number; state?: number }[] } {
	const state = getMegaprojectsState(sim);
	const events: { text: string; cell?: number; state?: number }[] = [];

	for (const project of state.projects) {
		if (!project.completed) {
			const polity = sim.polities[project.sponsorStateId];
			if (polity && polity.alive && polity.treasury > 80) {
				const investment = Math.min(
					polity.treasury - 40,
					Math.max(15, Math.floor(polity.treasury * 0.12))
				);
				polity.treasury -= investment;
				const res = contributeToMegaproject(sim, project.id, investment);
				if (res.completed) {
					events.push({
						text: `The citizens of ${polity.name} celebrate the glorious completion of '${project.name}'!`,
						state: project.sponsorStateId
					});
				}
			}
		} else {
			// Annual benefits for completed works
			if (project.kind === 'celestial_orrery') {
				sim.innovation += 15;
			}
		}
	}

	return { events };
}

/**
 * Returns all active and completed megaprojects.
 */
export function getActiveMegaprojects(sim: Simulation): Megaproject[] {
	return getMegaprojectsState(sim).projects;
}
