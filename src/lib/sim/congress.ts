import type { Simulation } from './engine';

export type ResolutionKind =
	| 'ban_dread_arts'
	| 'open_seas_accord'
	| 'sanction_warmonger'
	| 'joint_titan_crusade'
	| 'universal_truce';

export interface WorldResolution {
	id: number;
	kind: ResolutionKind;
	title: string;
	desc: string;
	targetStateId?: number;
	passed: boolean;
	votesFor: number[];
	votesAgainst: number[];
}

export interface WorldCongressSummit {
	year: number;
	hostBurgId: number;
	hostBurgName: string;
	resolutions: WorldResolution[];
	rogueStates: number[];
	activeAccords: string[];
}

export interface CongressState {
	currentSummit: WorldCongressSummit | null;
	summitsHistory: WorldCongressSummit[];
	activeAccords: string[];
	rogueStates: number[];
	lastConvenedYear: number;
	nextResolutionId: number;
}

const simCongressMap = new WeakMap<Simulation, CongressState>();

export function getCongressState(sim: Simulation): CongressState {
	let state = simCongressMap.get(sim);
	if (!state) {
		const raw = (sim as unknown as { _congressState?: CongressState })._congressState;
		if (raw) {
			state = raw;
		} else {
			state = {
				currentSummit: null,
				summitsHistory: [],
				activeAccords: [],
				rogueStates: [],
				lastConvenedYear: 0,
				nextResolutionId: 1
			};
			(sim as unknown as { _congressState?: CongressState })._congressState = state;
		}
		simCongressMap.set(sim, state);
	}
	return state;
}

/**
 * Convenes the Grand World Congress at the largest neutral/cultural metropolis.
 * Generates 3 diplomatic resolutions tailored to current world tensions.
 */
export function conveneWorldCongress(sim: Simulation): WorldCongressSummit {
	const state = getCongressState(sim);
	const rng = sim.rng;

	// Pick host burg: largest alive settlement, prioritizing peaceable polities
	const aliveBurgs = sim.w.burgs.filter((b) => b.id && b.alive);
	let hostBurg = aliveBurgs[0];

	if (aliveBurgs.length > 0) {
		const sorted = [...aliveBurgs].sort((a, b) => {
			const aWars = a.state ? sim.warsOf(a.state).length : 0;
			const bWars = b.state ? sim.warsOf(b.state).length : 0;
			if (aWars !== bWars) return aWars - bWars;
			return b.pop - a.pop;
		});
		hostBurg = sorted[0];
	}

	const hostBurgId = hostBurg ? hostBurg.id : 1;
	const hostBurgName = hostBurg ? hostBurg.name : 'The Grand Cosmopolis';

	// Generate 3 diplomatic resolutions based on current tensions
	const alivePolities = sim.polities.filter((p) => p.id && p.alive);
	const warmongers = alivePolities.filter((p) => sim.warsOf(p.id).length > 0);
	const activeWars = sim.wars.filter((w) => !w.end);

	const candidateResolutions: Omit<WorldResolution, 'id' | 'passed' | 'votesFor' | 'votesAgainst'>[] = [];

	// 1. Sanction warmonger if wars exist
	if (warmongers.length > 0) {
		const target = warmongers[Math.floor(rng() * warmongers.length)];
		candidateResolutions.push({
			kind: 'sanction_warmonger',
			title: `International Sanctions Against ${target.name}`,
			desc: `Impose pan-continental trade embargoes and diplomatic isolation upon ${target.name} for aggressive warfare.`,
			targetStateId: target.id
		});
	}

	// 2. Universal truce if multiple active wars
	if (activeWars.length > 0) {
		candidateResolutions.push({
			kind: 'universal_truce',
			title: 'The Great Mandate of Universal Truce',
			desc: 'Mandate an immediate armistice across all active frontiers and arbitrate border claims in open council.'
		});
	}

	// 3. Open seas accord
	candidateResolutions.push({
		kind: 'open_seas_accord',
		title: 'Charter of Free Navigation and Open Seas',
		desc: 'Guarantee open navigation through all straits and fund international naval convoys against piracy.'
	});

	// 4. Ban dread arts
	candidateResolutions.push({
		kind: 'ban_dread_arts',
		title: 'Edict on the Prohibition of Dread Sorcery',
		desc: 'Prohibit dark necromancy, apocalyptic covenants, and catastrophic blood sorcery within all sovereign realms.'
	});

	// 5. Joint titan crusade
	candidateResolutions.push({
		kind: 'joint_titan_crusade',
		title: 'Pan-Continental Coalition Against Ancient Titans',
		desc: 'Mobilize vanguard contingents from all sovereign states to purge rampaging world-titans and abyssal terrors.'
	});

	// Shuffle and pick 3
	for (let i = candidateResolutions.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[candidateResolutions[i], candidateResolutions[j]] = [candidateResolutions[j], candidateResolutions[i]];
	}

	const selectedCandidates = candidateResolutions.slice(0, 3);
	const resolutions: WorldResolution[] = selectedCandidates.map((cand) => {
		const resId = state.nextResolutionId++;
		const votesFor: number[] = [];
		const votesAgainst: number[] = [];

		// Initial AI votes from sovereign nations
		for (const pol of alivePolities) {
			if (cand.kind === 'sanction_warmonger') {
				if (pol.id === cand.targetStateId) {
					votesAgainst.push(pol.id);
				} else if (pol.allies.includes(cand.targetStateId!)) {
					votesAgainst.push(pol.id);
				} else if (sim.warsOf(pol.id).length > 0) {
					// Other warmongers dislike sanctions precedent
					if (rng() < 0.6) votesAgainst.push(pol.id);
					else votesFor.push(pol.id);
				} else {
					votesFor.push(pol.id);
				}
			} else if (cand.kind === 'ban_dread_arts') {
				if (pol.stability > 40 || rng() < 0.75) {
					votesFor.push(pol.id);
				} else {
					votesAgainst.push(pol.id);
				}
			} else if (cand.kind === 'open_seas_accord') {
				const hasPort = sim.w.burgs.some((b) => b.state === pol.id && b.port && b.alive);
				if (hasPort || rng() < 0.7) {
					votesFor.push(pol.id);
				} else {
					votesAgainst.push(pol.id);
				}
			} else if (cand.kind === 'joint_titan_crusade') {
				if (rng() < 0.75) {
					votesFor.push(pol.id);
				} else {
					votesAgainst.push(pol.id);
				}
			} else {
				// universal_truce
				if (sim.warsOf(pol.id).length > 0 && pol.treasury < 60) {
					votesFor.push(pol.id);
				} else if (rng() < 0.6) {
					votesFor.push(pol.id);
				} else {
					votesAgainst.push(pol.id);
				}
			}
		}

		return {
			id: resId,
			kind: cand.kind,
			title: cand.title,
			desc: cand.desc,
			targetStateId: cand.targetStateId,
			passed: false,
			votesFor,
			votesAgainst
		};
	});

	const summit: WorldCongressSummit = {
		year: sim.year,
		hostBurgId,
		hostBurgName,
		resolutions,
		rogueStates: [...state.rogueStates],
		activeAccords: [...state.activeAccords]
	};

	state.currentSummit = summit;
	state.lastConvenedYear = sim.year;
	state.summitsHistory.push(summit);

	return summit;
}

/**
 * Vote on a specific resolution during the current summit.
 */
export function voteOnResolution(
	_sim: Simulation,
	summit: WorldCongressSummit,
	resolutionId: number,
	stateId: number,
	voteFor: boolean
): void {
	const resolution = summit.resolutions.find((r) => r.id === resolutionId);
	if (!resolution) return;

	resolution.votesFor = resolution.votesFor.filter((id) => id !== stateId);
	resolution.votesAgainst = resolution.votesAgainst.filter((id) => id !== stateId);

	if (voteFor) {
		resolution.votesFor.push(stateId);
	} else {
		resolution.votesAgainst.push(stateId);
	}
}

/**
 * Enacts the resolutions of the World Congress Summit, implementing treaties and sanctioning rogue states.
 */
export function enactCongressSummit(
	sim: Simulation,
	summit: WorldCongressSummit
): { passedCount: number; events: { text: string; state?: number }[] } {
	const state = getCongressState(sim);
	let passedCount = 0;
	const events: { text: string; state?: number }[] = [];
	const alivePolities = sim.polities.filter((p) => p.id && p.alive);

	for (const res of summit.resolutions) {
		if (res.votesFor.length > res.votesAgainst.length) {
			res.passed = true;
			passedCount++;

			if (!summit.activeAccords.includes(res.title)) {
				summit.activeAccords.push(res.title);
			}
			if (!state.activeAccords.includes(res.title)) {
				state.activeAccords.push(res.title);
			}

			if (res.kind === 'ban_dread_arts') {
				for (const pol of alivePolities) {
					pol.stability = Math.min(100, pol.stability + 5);
				}
				events.push({
					text: `The World Congress ratified '${res.title}', outlawing catastrophic dark sorcery across all civilized borders.`
				});
			} else if (res.kind === 'open_seas_accord') {
				for (const pol of alivePolities) {
					pol.treasury += 60;
				}
				events.push({
					text: `The World Congress enacted '${res.title}', opening global maritime sea lanes and granting +20% international trade wealth.`
				});
			} else if (res.kind === 'sanction_warmonger') {
				if (res.targetStateId && sim.polities[res.targetStateId]?.alive) {
					const target = sim.polities[res.targetStateId];
					target.treasury = Math.max(0, Math.floor(target.treasury * 0.65));
					target.stability = Math.max(0, target.stability - 15);
					events.push({
						text: `Pan-continental sanctions fell upon ${target.name}, cutting commercial maritime trade and isolating their regency.`,
						state: target.id
					});
				}
			} else if (res.kind === 'joint_titan_crusade') {
				if (sim.monsters && sim.monsters.length > 0) {
					for (const mon of sim.monsters) {
						if (mon.alive) {
							mon.alive = false;
							break;
						}
					}
				}
				events.push({
					text: `Under '${res.title}', combined sovereign vanguards mobilized across frontiers, defeating rampaging beasts.`
				});
			} else if (res.kind === 'universal_truce') {
				if (sim.wars && sim.wars.length > 0) {
					for (const war of sim.wars) {
						if (!war.end) {
							war.end = sim.year;
							war.winner = 'white';
						}
					}
				}
				events.push({
					text: `The World Congress promulgated '${res.title}', cooling martial aggression and mediating white truces across fractured borders.`
				});
			}

			// Identify rogue defiance: nations targeted by passed sanctions or voting vehemently against multiple accords
			if (res.kind === 'sanction_warmonger' && res.targetStateId) {
				if (res.votesAgainst.includes(res.targetStateId)) {
					if (!summit.rogueStates.includes(res.targetStateId)) {
						summit.rogueStates.push(res.targetStateId);
					}
					if (!state.rogueStates.includes(res.targetStateId)) {
						state.rogueStates.push(res.targetStateId);
					}
				}
			}
		}
	}

	// Check any state that voted against all passed resolutions
	for (const pol of alivePolities) {
		const votedAgainstAllPassed = summit.resolutions
			.filter((r) => r.passed)
			.every((r) => r.votesAgainst.includes(pol.id));

		if (votedAgainstAllPassed && summit.resolutions.some((r) => r.passed)) {
			if (!summit.rogueStates.includes(pol.id)) {
				summit.rogueStates.push(pol.id);
			}
			if (!state.rogueStates.includes(pol.id)) {
				state.rogueStates.push(pol.id);
			}
		}
	}

	// Apply rogue sanctions
	for (const rogueId of state.rogueStates) {
		const rogue = sim.polities[rogueId];
		if (rogue && rogue.alive) {
			rogue.treasury = Math.max(0, Math.floor(rogue.treasury * 0.85));
			rogue.stability = Math.max(0, rogue.stability - 5);
			events.push({
				text: `${rogue.name} stands condemned as a rogue state in defiance of World Congress law, suffering trade embargoes.`,
				state: rogue.id
			});
		}
	}

	return { passedCount, events };
}
