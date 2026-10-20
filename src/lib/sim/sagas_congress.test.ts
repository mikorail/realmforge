import { describe, expect, it } from 'vitest';
import { generateUniverse } from '../gen/universe';
import { SEA } from '../gen/types';
import { Simulation } from './engine';
import {
	composeSagaForEvent,
	commissionCourtTapestry,
	erectHeroicMonument,
	getChronicleSagas
} from './sagas';
import {
	findPotentialCanalSites,
	initiateMegaproject,
	contributeToMegaproject,
	processYearlyMegaprojects,
	getActiveMegaprojects,
	getMegaprojectsState
} from './megaprojects';
import {
	conveneWorldCongress,
	voteOnResolution,
	enactCongressSummit,
	getCongressState
} from './congress';

const testUniverseOpts = {
	seed: 'sagas-megaprojects-congress-seed-42',
	template: 'continents' as const,
	cells: 2500,
	states: 6,
	width: 1400,
	height: 900,
	genre: 'fantasy' as const,
	planet: 'terran' as const,
	spheres: null,
	depth: 1,
	sky: false,
	sea: false
};

function createTestSimulation(): {
	sim: Simulation;
	pol: import('./types').Polity;
	burg: import('../gen/types').Burg;
} {
	const world = generateUniverse(testUniverseOpts, 1).planets[0];
	const sim = new Simulation(world);
	const pol = sim.polities.find((p) => p.alive && p.id && p.capital > 0)!;
	const burg =
		sim.w.burgs[pol.capital] ||
		sim.w.burgs.find((b) => b.alive && b.id && b.state === pol.id)!;
	return { sim, pol, burg };
}

describe('Living Bardic Tradition (Sagas, Tapestries, and Monuments)', () => {
	it('composes alliterative bardic poetry for diverse events without em dashes', () => {
		const { sim, pol } = createTestSimulation();

		const eventKinds = ['war', 'titan_slain', 'fall', 'apotheosis', 'resurgence'] as const;

		for (const eventKind of eventKinds) {
			const saga = composeSagaForEvent(sim, eventKind, {
				realmName: pol.name,
				heroName: 'Valerius the Bold',
				foeName: 'Jormungandr the Abyssal',
				subjectStateId: pol.id
			});

			expect(saga.id).toBeGreaterThan(0);
			expect(saga.title.length).toBeGreaterThan(0);
			expect(saga.author.length).toBeGreaterThan(0);
			expect(saga.stanzas.length).toBeGreaterThanOrEqual(3);
			expect(saga.fame).toBeGreaterThan(0);

			// Strictly NO em dashes anywhere
			expect(saga.title).not.toContain('—');
			expect(saga.author).not.toContain('—');
			for (const stanza of saga.stanzas) {
				expect(stanza).not.toContain('—');
				expect(stanza.length).toBeGreaterThan(20);
			}
		}

		const allSagas = getChronicleSagas(sim);
		expect(allSagas.length).toBe(eventKinds.length);
	});

	it('handles court tapestry commissioning and heroic battlefield monuments', () => {
		const { sim, pol, burg } = createTestSimulation();

		const initialStability = pol.stability;
		const saga = composeSagaForEvent(sim, 'war', {
			realmName: pol.name,
			heroName: 'Aurelia of the Sun'
		});

		// 1. Commission Court Tapestry
		const tapestryRes = commissionCourtTapestry(sim, saga.id, burg.id);
		expect(tapestryRes.success).toBe(true);
		expect(tapestryRes.msg).not.toContain('—');
		expect(saga.tapestryBurgId).toBe(burg.id);
		expect(pol.stability).toBe(Math.min(100, initialStability + 10));

		// 2. Erect Stone Obelisk Monument
		const initialFame = saga.fame;
		// Find a valid land cell
		let landCell = 0;
		for (let i = 0; i < sim.w.cells.n; i++) {
			if (sim.w.cells.h[i] >= SEA) {
				landCell = i;
				break;
			}
		}

		const monumentRes = erectHeroicMonument(sim, saga.id, landCell);
		expect(monumentRes.success).toBe(true);
		expect(monumentRes.msg).not.toContain('—');
		expect(saga.monumentCell).toBe(landCell);
		expect(saga.fame).toBe(initialFame + 15);
		expect(sim.dirty.terrain).toBe(true);
	});
});

describe('Planetary Megaprojects System', () => {
	it('identifies candidate canal sites across the continental landmass', () => {
		const { sim } = createTestSimulation();

		const canalSites = findPotentialCanalSites(sim);
		expect(Array.isArray(canalSites)).toBe(true);
		expect(canalSites.length).toBeGreaterThan(0);

		for (const site of canalSites) {
			expect(site.isthmusCells.length).toBeGreaterThanOrEqual(1);
			expect(site.isthmusCells.length).toBeLessThanOrEqual(3);
			expect(site.name.length).toBeGreaterThan(0);
			expect(site.cost).toBeGreaterThan(0);
			expect(site.name).not.toContain('—');
		}
	});

	it('initiates, funds, and completes a continental canal carves sea tiles', () => {
		const { sim, pol } = createTestSimulation();
		const sites = findPotentialCanalSites(sim);
		const targetSite = sites[0];

		// Ensure chosen cells were land before canal
		for (const cell of targetSite.isthmusCells) {
			sim.w.cells.h[cell] = 30; // Solid land > SEA (20)
		}

		const init = initiateMegaproject(sim, pol.id, 'continental_canal', targetSite.isthmusCells);
		expect(init.success).toBe(true);
		expect(init.project).toBeDefined();
		expect(init.msg).not.toContain('—');

		const proj = init.project!;
		expect(proj.completed).toBe(false);
		expect(proj.progress).toBe(0);

		// Partial funding
		const partial = contributeToMegaproject(sim, proj.id, 200);
		expect(partial.completed).toBe(false);
		expect(proj.fundedGold).toBe(200);
		expect(partial.progress).toBe(Math.floor((200 / proj.totalCostGold) * 100));

		// Complete funding
		const remaining = proj.totalCostGold - proj.fundedGold;
		const full = contributeToMegaproject(sim, proj.id, remaining);
		expect(full.completed).toBe(true);
		expect(proj.completed).toBe(true);
		expect(proj.progress).toBe(100);
		expect(full.msg).not.toContain('—');

		// Geo-engineering verification: sea tiles carved (h < SEA)
		for (const cell of targetSite.isthmusCells) {
			expect(sim.w.cells.h[cell]).toBeLessThan(SEA);
			expect(sim.w.cells.dist[cell]).toBe(-1); // Coastal sea
		}

		const megaState = getMegaprojectsState(sim);
		expect(megaState.globalTradeBonus).toBeGreaterThanOrEqual(0.4);
		expect(sim.dirty.terrain).toBe(true);
	});

	it('handles bastion wall and celestial orrery completion benefits', () => {
		const { sim, pol } = createTestSimulation();

		// Bastion Wall
		const wallInit = initiateMegaproject(sim, pol.id, 'bastion_wall', [100, 101, 102]);
		expect(wallInit.success).toBe(true);
		const wall = wallInit.project!;
		contributeToMegaproject(sim, wall.id, wall.totalCostGold);
		expect(wall.completed).toBe(true);

		const megaState = getMegaprojectsState(sim);
		expect(megaState.bastionCells.has(100)).toBe(true);
		expect(megaState.bastionCells.has(101)).toBe(true);

		// Celestial Orrery
		const initialInnov = sim.innovation;
		const orreryInit = initiateMegaproject(sim, pol.id, 'celestial_orrery', [150]);
		expect(orreryInit.success).toBe(true);
		const orrery = orreryInit.project!;
		contributeToMegaproject(sim, orrery.id, orrery.totalCostGold);
		expect(orrery.completed).toBe(true);
		expect(sim.innovation).toBe(initialInnov + 15);
		expect(megaState.celestialRiftsRevealed).toBe(true);

		// Yearly processing yields
		const preYearInnov = sim.innovation;
		const yearRes = processYearlyMegaprojects(sim);
		expect(sim.innovation).toBe(preYearInnov + 15); // Celestial orrery annual bonus
		for (const ev of yearRes.events) {
			expect(ev.text).not.toContain('—');
		}

		const activeProjects = getActiveMegaprojects(sim);
		expect(activeProjects.length).toBeGreaterThanOrEqual(2);
	});
});

describe('Grand World Congress System', () => {
	it('convenes a world congress summit with 3 resolutions and voting mechanics', () => {
		const { sim, pol } = createTestSimulation();

		const summit = conveneWorldCongress(sim);
		expect(summit.year).toBe(sim.year);
		expect(summit.hostBurgName.length).toBeGreaterThan(0);
		expect(summit.resolutions.length).toBe(3);

		for (const res of summit.resolutions) {
			expect(res.id).toBeGreaterThan(0);
			expect(res.title.length).toBeGreaterThan(0);
			expect(res.desc.length).toBeGreaterThan(0);
			expect(res.title).not.toContain('—');
			expect(res.desc).not.toContain('—');
			// Initial voting from member states
			expect(Array.isArray(res.votesFor)).toBe(true);
			expect(Array.isArray(res.votesAgainst)).toBe(true);
		}

		// Vote on resolution
		const firstRes = summit.resolutions[0];
		voteOnResolution(sim, summit, firstRes.id, pol.id, true);
		expect(firstRes.votesFor).toContain(pol.id);
		expect(firstRes.votesAgainst).not.toContain(pol.id);

		// Switch vote to Nay
		voteOnResolution(sim, summit, firstRes.id, pol.id, false);
		expect(firstRes.votesFor).not.toContain(pol.id);
		expect(firstRes.votesAgainst).toContain(pol.id);
	});

	it('enacts resolutions into active accords and identifies rogue state defiance', () => {
		const { sim } = createTestSimulation();
		const summit = conveneWorldCongress(sim);

		// Rig first resolution to pass with overwhelming majority
		const passedRes = summit.resolutions[0];
		passedRes.votesFor = [1, 2, 3, 4, 5];
		passedRes.votesAgainst = [];

		// Target state 2 as rogue defying resolutions
		if (passedRes.kind === 'sanction_warmonger') {
			passedRes.targetStateId = 2;
			passedRes.votesAgainst = [2];
			passedRes.votesFor = [1, 3, 4, 5];
		} else {
			// Second resolution fails
			summit.resolutions[1].votesFor = [];
			summit.resolutions[1].votesAgainst = [1, 2, 3, 4, 5];
		}

		const enactRes = enactCongressSummit(sim, summit);
		expect(enactRes.passedCount).toBeGreaterThanOrEqual(1);
		expect(passedRes.passed).toBe(true);
		expect(summit.activeAccords).toContain(passedRes.title);

		for (const ev of enactRes.events) {
			expect(ev.text).not.toContain('—');
		}

		const congressState = getCongressState(sim);
		expect(congressState.activeAccords).toContain(passedRes.title);
	});
});

describe('Seeded Determinism and Zero Em Dash Audit', () => {
	it('ensures identical seeds yield identical sagas, megaprojects, and congress resolutions', () => {
		const worldA = generateUniverse(testUniverseOpts, 1).planets[0];
		const simA = new Simulation(worldA);

		const worldB = generateUniverse(testUniverseOpts, 1).planets[0];
		const simB = new Simulation(worldB);

		const sagaA = composeSagaForEvent(simA, 'war', { realmName: 'Valyria', heroName: 'Orion' });
		const sagaB = composeSagaForEvent(simB, 'war', { realmName: 'Valyria', heroName: 'Orion' });

		expect(sagaA.title).toBe(sagaB.title);
		expect(sagaA.author).toBe(sagaB.author);
		expect(sagaA.stanzas).toEqual(sagaB.stanzas);
		expect(sagaA.fame).toBe(sagaB.fame);

		const summitA = conveneWorldCongress(simA);
		const summitB = conveneWorldCongress(simB);

		expect(summitA.hostBurgName).toBe(summitB.hostBurgName);
		expect(summitA.resolutions.map((r) => r.title)).toEqual(
			summitB.resolutions.map((r) => r.title)
		);
		expect(summitA.resolutions.map((r) => r.kind)).toEqual(
			summitB.resolutions.map((r) => r.kind)
		);
	});

	it('strictly verifies ZERO em dashes exist across all generated text', () => {
		const { sim, pol, burg } = createTestSimulation();

		// Sagas
		const events = ['war', 'titan_slain', 'fall', 'apotheosis', 'resurgence'] as const;
		for (const ev of events) {
			const s = composeSagaForEvent(sim, ev, { realmName: pol.name, heroName: 'Hero' });
			expect(s.title).not.toContain('—');
			expect(s.author).not.toContain('—');
			for (const stanza of s.stanzas) {
				expect(stanza).not.toContain('—');
			}
		}

		// Megaprojects
		const sites = findPotentialCanalSites(sim);
		for (const site of sites) {
			expect(site.name).not.toContain('—');
		}

		const initWall = initiateMegaproject(sim, pol.id, 'bastion_wall', [1, 2, 3]);
		expect(initWall.msg).not.toContain('—');
		expect(initWall.project!.name).not.toContain('—');
		expect(initWall.project!.benefitsDesc).not.toContain('—');

		const contrib = contributeToMegaproject(sim, initWall.project!.id, 50);
		expect(contrib.msg).not.toContain('—');

		// Congress
		const summit = conveneWorldCongress(sim);
		expect(summit.hostBurgName).not.toContain('—');
		for (const res of summit.resolutions) {
			expect(res.title).not.toContain('—');
			expect(res.desc).not.toContain('—');
		}

		const enact = enactCongressSummit(sim, summit);
		for (const ev of enact.events) {
			expect(ev.text).not.toContain('—');
		}
	});
});
