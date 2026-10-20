import type { Simulation } from './engine';
import { clamp } from '../rng';

export type CrisisKind = 'pale_blight' | 'midas_curse' | 'blood_eclipse';

export interface WorldCrisis {
	id: number;
	kind: CrisisKind;
	name: string;
	epicenter: number;
	yearStarted: number;
	intensity: number; // 0..100
	contained: boolean;
	blightedCells: number[];
	activeHordes: number;
	casualties: number;
	curedYear?: number;
	quarantineFunding?: number;
	containmentProgress?: number;
	description?: string;
}

export interface CrisisSimData {
	crises: Map<number, WorldCrisis>;
	nextCrisisId: number;
}

const simCrisisMap = new WeakMap<Simulation, CrisisSimData>();

export function getCrisisSimData(sim: Simulation): CrisisSimData {
	let data = simCrisisMap.get(sim);
	if (!data) {
		const raw = (sim as unknown as { _crisisData?: CrisisSimData })._crisisData;
		if (raw) {
			data = raw;
		} else {
			data = {
				crises: new Map(),
				nextCrisisId: 1
			};
			(sim as unknown as { _crisisData?: CrisisSimData })._crisisData = data;
		}
		simCrisisMap.set(sim, data);
	}
	return data;
}

/**
 * Returns neighbor cell indexes for a given cell.
 */
function getNeighbors(sim: Simulation, c: number): number[] {
	if (c < 0 || c >= sim.w.cells.n) return [];
	const start = sim.w.cells.nStart[c];
	const end = sim.w.cells.nStart[c + 1];
	const neighbors: number[] = [];
	for (let i = start; i < end; i++) {
		neighbors.push(sim.w.cells.nList[i]);
	}
	return neighbors;
}

/**
 * Finds a suitable land cell for a planetary crisis epicenter.
 */
function selectEpicenterCell(sim: Simulation): number {
	const candidates: number[] = [];
	for (let i = 0; i < sim.w.cells.n; i++) {
		// Prefer populated land cells
		if (sim.w.cells.h[i] >= 20 && (sim.w.cells.burg[i] > 0 || sim.w.cells.state[i] > 0)) {
			candidates.push(i);
		}
	}
	if (candidates.length > 0) {
		return sim.rng.pick(candidates);
	}
	// Fallback to any land cell
	for (let i = 0; i < sim.w.cells.n; i++) {
		if (sim.w.cells.h[i] >= 20) return i;
	}
	return 0;
}

/**
 * Triggers a planetary grand crisis:
 * - 'pale_blight': eldritch miasmic fog creeps tile-by-tile, turns land into blighted biome, raises thrall hordes threatening cities.
 * - 'midas_curse': alchemical gold-fever crystallizes rivers and fields into brittle gold, causing hyperinflation (-stability, famine).
 * - 'blood_eclipse': 10-year astrological omen mutating wild monsters with +50% power and aggressive rampage behavior.
 */
export function triggerPlanetaryCrisis(
	sim: Simulation,
	kind: CrisisKind,
	epicenterCell?: number
): WorldCrisis {
	const data = getCrisisSimData(sim);
	const id = data.nextCrisisId++;

	let epicenter = epicenterCell;
	if (epicenter === undefined || epicenter < 0 || epicenter >= sim.w.cells.n) {
		epicenter = selectEpicenterCell(sim);
	}

	const neighbors = getNeighbors(sim, epicenter);
	const burgId = sim.w.cells.burg[epicenter];
	const burgName = burgId > 0 && sim.w.burgs[burgId] ? sim.w.burgs[burgId].name : `Sector ${epicenter}`;

	let name = '';
	let description = '';
	let initialIntensity = 70;
	let initialHordes = 0;
	let blightedCells: number[] = [epicenter];
	let logMsg = '';

	if (kind === 'pale_blight') {
		name = `The Pale Blight of ${burgName}`;
		description =
			'Eldritch miasmic fog creeps tile-by-tile, turning soil to chalky ash and raising undead thralls.';
		initialIntensity = 75;
		initialHordes = 3;
		// Initial blighted cells include epicenter and immediate land neighbors
		const initialLand = neighbors.filter((n) => sim.w.cells.h[n] >= 20);
		blightedCells = [epicenter, ...initialLand.slice(0, 3)];
		sim.plague[epicenter] = 0.6;
		logMsg = `${name} emerges: an eldritch miasmic fog rises from cell ${epicenter}, raising hostile thrall hordes and turning fertile soil into blighted wasteland.`;
	} else if (kind === 'midas_curse') {
		name = `The Midas Curse of ${burgName}`;
		description =
			'Alchemical gold-fever crystallizes rivers and crops into brittle yellow metal, fueling hyperinflation and famine.';
		initialIntensity = 65;
		initialHordes = 0;
		// Initial blighted cells follow river or fertile contours
		const riverNeighbors = neighbors.filter((n) => sim.w.cells.river[n] > 0 || sim.w.cells.flux[n] > 3);
		blightedCells = riverNeighbors.length > 0 ? [epicenter, ...riverNeighbors] : [epicenter, ...neighbors.slice(0, 2)];
		// Destabilize polity at epicenter with fool's gold rush
		const polId = sim.w.cells.state[epicenter];
		if (polId > 0 && sim.polities[polId]) {
			sim.polities[polId].treasury += 120;
			sim.polities[polId].stability = clamp(sim.polities[polId].stability - 18, 0, 100);
		}
		logMsg = `${name} strikes: alchemical gold crystallization transmutes rivers and harvests into mineral ore at cell ${epicenter}, sparking devastating inflation and food shortages.`;
	} else if (kind === 'blood_eclipse') {
		name = `The Blood Eclipse of Year ${sim.year}`;
		description =
			'A 10-year astrological omen that mutates wild predators with unnatural strength and savage bloodlust.';
		initialIntensity = 85;
		initialHordes = 5;
		const landNeighbors = neighbors.filter((n) => sim.w.cells.h[n] >= 20);
		blightedCells = [epicenter, ...landNeighbors];

		// Mutate wild monsters with +50% power and aggressive rampage behavior
		if (sim.monsters && sim.monsters.length > 0) {
			for (const m of sim.monsters) {
				if (m.alive) {
					m.power = Math.round(m.power * 1.5);
					m.behavior = 'rampage';
				}
			}
		}
		logMsg = `${name} overshadows the sky: crimson astronomical alignment mutates primordial beasts with 50% greater fury, unleashing rampages across the continents.`;
	}

	const crisis: WorldCrisis = {
		id,
		kind,
		name,
		epicenter,
		yearStarted: sim.year,
		intensity: initialIntensity,
		contained: false,
		blightedCells,
		activeHordes: initialHordes,
		casualties: 0,
		quarantineFunding: 0,
		containmentProgress: 0,
		description
	};

	data.crises.set(id, crisis);
	sim.log('disaster', logMsg, epicenter);

	return crisis;
}

/**
 * Quarantine containment action:
 * Rulers or avatar contribute gold to build containment wards and dispatch alchemical sanitizers.
 */
export function quarantineCrisisArea(
	sim: Simulation,
	crisisId: number,
	fundingGold: number
): { success: boolean; msg: string } {
	const data = getCrisisSimData(sim);
	const crisis = data.crises.get(crisisId);

	if (!crisis) {
		return {
			success: false,
			msg: 'Target planetary crisis could not be found.'
		};
	}

	if (crisis.curedYear) {
		return {
			success: false,
			msg: `${crisis.name} has already been cured and poses no active threat.`
		};
	}

	crisis.quarantineFunding = (crisis.quarantineFunding ?? 0) + fundingGold;
	const progressGain = Math.max(12, Math.floor(fundingGold / 3));
	crisis.containmentProgress = Math.min(100, (crisis.containmentProgress ?? 0) + progressGain);

	const intensityDrop = Math.max(8, Math.floor(fundingGold / 5));
	crisis.intensity = Math.max(0, crisis.intensity - intensityDrop);

	if (crisis.containmentProgress >= 70 || crisis.intensity <= 25) {
		crisis.contained = true;
	}

	if (crisis.containmentProgress >= 100 || crisis.intensity <= 0) {
		crisis.contained = true;
		crisis.curedYear = sim.year;
		crisis.intensity = 0;
		const victoryMsg = `${crisis.name} has been thoroughly purged and eradicated thanks to generous quarantine funding and alchemical sanitizers.`;
		sim.log('disaster', victoryMsg, crisis.epicenter);
		return {
			success: true,
			msg: `Quarantine cordon fully established with ${fundingGold} gold. ${crisis.name} has been completely eradicated!`
		};
	}

	if (crisis.contained) {
		const containedMsg = `Arcane wards and quarantine perimeters successfully enclose ${crisis.name}, halting its outwards expansion.`;
		sim.log('disaster', containedMsg, crisis.epicenter);
		return {
			success: true,
			msg: `Quarantine established with ${fundingGold} gold. ${crisis.name} is now contained and cannot spread further.`
		};
	}

	const ongoingMsg = `Dispatched ${fundingGold} gold for alchemical sanitizers. ${crisis.name} containment progress reached ${crisis.containmentProgress}%, intensity dropped to ${crisis.intensity}%.`;
	return {
		success: true,
		msg: ongoingMsg
	};
}

/**
 * Annual simulation hook for planetary crises:
 * Expands active crises, checks containment progress, heals or ravages provinces, logs without em dashes.
 */
export function processYearlyCrisis(
	sim: Simulation
): { events: { text: string; cell?: number; state?: number; kind: string }[] } {
	const data = getCrisisSimData(sim);
	const events: { text: string; cell?: number; state?: number; kind: string }[] = [];

	for (const crisis of data.crises.values()) {
		if (crisis.curedYear) continue;

		if (crisis.contained) {
			// Contained crises gradually recede
			crisis.intensity = Math.max(0, crisis.intensity - 15);
			// Gradually restore blighted cells
			if (crisis.blightedCells.length > 1) {
				const cellsToKeep = Math.max(1, Math.floor(crisis.blightedCells.length * 0.75));
				crisis.blightedCells = crisis.blightedCells.slice(0, cellsToKeep);
			}

			if (crisis.intensity <= 0) {
				crisis.curedYear = sim.year;
				const curedText = `${crisis.name} has dissipated completely following successful containment and alchemical cleansing.`;
				events.push({
					text: curedText,
					cell: crisis.epicenter,
					kind: crisis.kind
				});
				sim.log('disaster', curedText, crisis.epicenter);
			} else {
				const recedeText = `${crisis.name} recedes under quarantine; containment holds firm and remaining intensity drops to ${crisis.intensity}%.`;
				events.push({
					text: recedeText,
					cell: crisis.epicenter,
					kind: crisis.kind
				});
			}
			continue;
		}

		// Crisis is NOT contained: ravage provinces and expand
		if (crisis.kind === 'pale_blight') {
			// Find adjacent land cells to infect
			const candidates = new Set<number>();
			for (const bc of crisis.blightedCells) {
				for (const n of getNeighbors(sim, bc)) {
					if (sim.w.cells.h[n] >= 20 && !crisis.blightedCells.includes(n)) {
						candidates.add(n);
					}
				}
			}

			const toInfect = Array.from(candidates).slice(0, 3);
			for (const c of toInfect) {
				crisis.blightedCells.push(c);
				sim.plague[c] = Math.min(1, sim.plague[c] + 0.35);
			}

			const victims = Math.max(40, Math.floor(crisis.intensity * 3));
			crisis.casualties += victims;
			crisis.activeHordes = Math.min(12, crisis.activeHordes + 1);

			const blightText = `The Pale Blight creeps across ${toInfect.length} new territories: thrall hordes multiply and ${victims} victims perish in the miasma.`;
			events.push({
				text: blightText,
				cell: crisis.epicenter,
				kind: crisis.kind
			});
			sim.log('disaster', blightText, crisis.epicenter);
		} else if (crisis.kind === 'midas_curse') {
			// Spreads along river/field systems
			const candidates = new Set<number>();
			for (const bc of crisis.blightedCells) {
				for (const n of getNeighbors(sim, bc)) {
					if (sim.w.cells.h[n] >= 20 && !crisis.blightedCells.includes(n)) {
						candidates.add(n);
					}
				}
			}

			const toInfect = Array.from(candidates).slice(0, 2);
			for (const c of toInfect) {
				crisis.blightedCells.push(c);
				const polId = sim.w.cells.state[c];
				if (polId > 0 && sim.polities[polId]) {
					const pol = sim.polities[polId];
					pol.stability = clamp(pol.stability - 8, 0, 100);
					pol.treasury += 60;
				}
			}

			const famineCasualties = Math.max(30, Math.floor(crisis.intensity * 2.2));
			crisis.casualties += famineCasualties;

			const midasText = `The Midas Curse crystallizes additional farmlands into brittle gold: hyperinflation and famine cause ${famineCasualties} casualties.`;
			events.push({
				text: midasText,
				cell: crisis.epicenter,
				kind: crisis.kind
			});
			sim.log('disaster', midasText, crisis.epicenter);
		} else if (crisis.kind === 'blood_eclipse') {
			// Check if 10-year astrological cycle has concluded
			const duration = sim.year - crisis.yearStarted;
			if (duration >= 10) {
				crisis.contained = true;
				crisis.curedYear = sim.year;
				crisis.intensity = 0;

				// Return monsters to normal behavior
				if (sim.monsters) {
					for (const m of sim.monsters) {
						if (m.alive && m.behavior === 'rampage') {
							m.behavior = 'roaming';
						}
					}
				}

				const endText = `The 10-year astrological omen concludes: the Blood Eclipse vanishes from the firmament and mutated beasts cease their rampage.`;
				events.push({
					text: endText,
					cell: crisis.epicenter,
					kind: crisis.kind
				});
				sim.log('disaster', endText, crisis.epicenter);
			} else {
				const eclipseVictims = Math.max(50, Math.floor(crisis.intensity * 2.8));
				crisis.casualties += eclipseVictims;
				const eclipseText = `Year ${duration + 1} of the Blood Eclipse: blood-crazed titans and mutated predators ravage provincial borders, causing ${eclipseVictims} casualties.`;
				events.push({
					text: eclipseText,
					cell: crisis.epicenter,
					kind: crisis.kind
				});
				sim.log('disaster', eclipseText, crisis.epicenter);
			}
		}
	}

	return { events };
}

/**
 * Returns all active (uncured) planetary crises.
 */
export function getActiveCrises(sim: Simulation): WorldCrisis[] {
	const data = getCrisisSimData(sim);
	return Array.from(data.crises.values()).filter((c) => !c.curedYear);
}

/**
 * Returns all recorded crises, active and historic.
 */
export function getAllCrises(sim: Simulation): WorldCrisis[] {
	const data = getCrisisSimData(sim);
	return Array.from(data.crises.values());
}
