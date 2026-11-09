import type { Simulation } from './engine';
import { makeRng } from '../rng';

export type SaintVirtue = 'Mercy' | 'Valour' | 'Wisdom' | 'Martyrdom' | 'Purity';

export interface Saint {
	id: number;
	personId: number;
	name: string;
	religionId: number;
	title: string;
	virtue: SaintVirtue;
	shrineBurg: number;
	canonizedYear: number;
	miraclesAttributed: number;
}

export interface PilgrimageRoute {
	id: number;
	fromBurg: number;
	shrineBurg: number;
	pilgrimFlow: number;
	annualDonations: number;
}

export interface Inquisition {
	id: number;
	stateId: number;
	religionId: number;
	grandInquisitor: string;
	fervor: number; // 1 to 100
	hereticsPurged: number;
	startYear: number;
	active: boolean;
}

export interface RelicMiracle {
	relicId: number;
	relicName: string;
	shrineBurg: number;
	boonType: 'aegis_ward' | 'divine_healing' | 'heavenly_dread';
	yearInvoked: number;
}

export interface SaintsInquisitionState {
	saints: Saint[];
	pilgrimages: PilgrimageRoute[];
	inquisitions: Inquisition[];
	miracles: RelicMiracle[];
	nextId: number;
}

const simSaintsMap = new WeakMap<Simulation, SaintsInquisitionState>();

export function getSaintsInquisitionState(sim: Simulation): SaintsInquisitionState {
	let state = simSaintsMap.get(sim);
	if (!state) {
		const raw = (sim as unknown as { _saintsState?: SaintsInquisitionState })._saintsState;
		if (raw && Array.isArray(raw.saints)) {
			state = raw;
		} else {
			state = {
				saints: [],
				pilgrimages: [],
				inquisitions: [],
				miracles: [],
				nextId: 1
			};
			(sim as unknown as { _saintsState?: SaintsInquisitionState })._saintsState = state;
		}
		simSaintsMap.set(sim, state);
	}
	return state;
}

const VIRTUE_TITLES: Record<SaintVirtue, string[]> = {
	Mercy: ['the Compassionate', 'the Healer', 'the Comforter of the Weak'],
	Valour: ['the Shieldbearer', 'the Vanquisher of Evil', 'the Golden Vanguard'],
	Wisdom: ['the Illuminator', 'the Beacon of Truth', 'the Star of Doctrine'],
	Martyrdom: ['the Blood-Witness', 'the Unbroken', 'the Redeemed Martyr'],
	Purity: ['the Spotless', 'the Ascetic', 'the White Lily']
};

/** Posthumously canonize a pious figure, hero, or martyr as a revered Saint */
export function canonizeSaint(
	sim: Simulation,
	personId: number,
	shrineBurgId?: number,
	chosenVirtue?: SaintVirtue
): Saint | null {
	const p = sim.people[personId];
	if (!p) return null;

	const st = getSaintsInquisitionState(sim);
	if (st.saints.some((s) => s.personId === personId)) return null;

	const rng = makeRng(`seed:saint:${sim.year}:${personId}:${sim.w.opts.seed}`);
	const virtues: SaintVirtue[] = ['Mercy', 'Valour', 'Wisdom', 'Martyrdom', 'Purity'];
	const virtue = chosenVirtue ?? rng.pick(virtues);

	const titleSuffix = rng.pick(VIRTUE_TITLES[virtue]);
	const saintTitle = `Saint ${p.name} ${titleSuffix}`;

	let shrine = shrineBurgId;
	if (shrine === undefined) {
		shrine = p.burg && sim.w.burgs[p.burg]?.alive ? p.burg : sim.polities[p.state]?.capital ?? 1;
	}

	const shrineBurg = sim.w.burgs[shrine];
	const religionId = p.religion || (shrineBurg ? sim.w.cells.religion[shrineBurg.cell] : 1);

	const saint: Saint = {
		id: st.nextId++,
		personId,
		name: p.name,
		religionId,
		title: saintTitle,
		virtue,
		shrineBurg: shrine,
		canonizedYear: sim.year,
		miraclesAttributed: 1
	};

	st.saints.push(saint);

	const burgName = shrineBurg ? shrineBurg.name : 'the holy shrine';
	const relName = sim.w.religions[religionId]?.name ?? 'the faith';

	sim.log(
		'faith',
		`Holy canonization: the high prelates of ${relName} proclaim ${saint.title}, consecrating a venerated shrine in ${burgName}.`,
		shrineBurg?.cell,
		p.state || undefined
	);

	// Automatically establish pilgrimage route from neighbor burgs
	if (shrineBurg) {
		const nearby = sim.w.burgs.filter((b) => b.id && b.alive && b.id !== shrineBurg.id && b.culture === shrineBurg.culture);
		if (nearby.length) {
			const origin = rng.pick(nearby);
			establishPilgrimageRoute(sim, origin.id, shrineBurg.id);
		}
	}

	return saint;
}

/** Establish a holy pilgrimage route leading to a saint's shrine */
export function establishPilgrimageRoute(
	sim: Simulation,
	fromBurgId: number,
	shrineBurgId: number
): PilgrimageRoute | null {
	const a = sim.w.burgs[fromBurgId];
	const b = sim.w.burgs[shrineBurgId];
	if (!a || !a.alive || !b || !b.alive) return null;

	const st = getSaintsInquisitionState(sim);
	if (st.pilgrimages.some((p) => p.fromBurg === fromBurgId && p.shrineBurg === shrineBurgId)) return null;

	const route: PilgrimageRoute = {
		id: st.nextId++,
		fromBurg: fromBurgId,
		shrineBurg: shrineBurgId,
		pilgrimFlow: 40,
		annualDonations: 16
	};

	st.pilgrimages.push(route);

	sim.log(
		'faith',
		`Pilgrimage road consecrated: faithful devotees journey from ${a.name} to the holy shrine of ${b.name}, offering tithes and seeking divine grace.`,
		b.cell,
		b.state || undefined
	);

	return route;
}

/** Launch a holy inquisition to purge heretics and unrest within a realm */
export function launchInquisition(
	sim: Simulation,
	stateId: number,
	religionId?: number
): Inquisition | null {
	const pol = sim.polities[stateId];
	if (!pol || !pol.alive) return null;

	const relId = religionId ?? pol.religion ?? 1;
	const rel = sim.w.religions[relId];
	const relName = rel ? rel.name : 'Orthodoxy';

	const st = getSaintsInquisitionState(sim);
	const rng = makeRng(`seed:inquisition:${sim.year}:${stateId}:${sim.w.opts.seed}`);

	const grandInquisitor = `Inquisitor-General ${sim.makePerson(pol.culture, stateId, pol.capital, 'priest', rng.int(35, 60)).name}`;

	const inq: Inquisition = {
		id: st.nextId++,
		stateId,
		religionId: relId,
		grandInquisitor,
		fervor: 75,
		hereticsPurged: 0,
		startYear: sim.year,
		active: true
	};

	st.inquisitions.push(inq);

	sim.log(
		'faith',
		`Holy inquisition declared: ${grandInquisitor} of ${relName} initiates tribunals across ${pol.name} to root out blasphemers and subversive cults.`,
		sim.w.burgs[pol.capital]?.cell,
		stateId
	);

	return inq;
}

/** Activate a miraculous relic protection during a city siege */
export function triggerRelicMiracle(
	sim: Simulation,
	relicId: number,
	besiegedBurgId: number
): RelicMiracle | null {
	const burg = sim.w.burgs[besiegedBurgId];
	if (!burg || !burg.alive) return null;

	const st = getSaintsInquisitionState(sim);
	const rng = makeRng(`seed:miracle:${sim.year}:${relicId}:${besiegedBurgId}`);

	const relic = sim.artifacts.find((a) => a.id === relicId);
	const relicName = relic ? relic.name : 'Holy Relic of the Saints';

	const boons: RelicMiracle['boonType'][] = ['aegis_ward', 'divine_healing', 'heavenly_dread'];
	const boon = rng.pick(boons);

	const miracle: RelicMiracle = {
		relicId,
		relicName,
		shrineBurg: besiegedBurgId,
		boonType: boon,
		yearInvoked: sim.year
	};

	st.miracles.push(miracle);

	const pol = sim.polities[burg.state];
	if (pol?.alive) {
		pol.stability = Math.min(100, pol.stability + 15);
	}

	sim.log(
		'faith',
		`Miraculous intervention: as enemy banners besiege ${burg.name}, the sacred relic '${relicName}' flares with blinding celestial radiance, reinforcing the ramparts!`,
		burg.cell,
		burg.state || undefined
	);

	return miracle;
}

/** Yearly simulation pass for living faiths, saints, pilgrimages, and inquisitions */
export function yearlySaintsInquisition(sim: Simulation) {
	const st = getSaintsInquisitionState(sim);
	const rng = makeRng(`seed:saints:yearly:${sim.year}:${sim.w.opts.seed}`);

	// 1. Process active inquisitions
	for (const inq of st.inquisitions) {
		if (!inq.active) continue;
		const pol = sim.polities[inq.stateId];
		if (!pol?.alive) {
			inq.active = false;
			continue;
		}

		if (rng.chance(0.4)) {
			inq.hereticsPurged += rng.int(2, 6);
			// Purging lowers civil unrest and raises religious homogeneity
			pol.stability = Math.min(100, pol.stability + 2);

			if (rng.chance(0.2)) {
				sim.log(
					'faith',
					`Inquisition tribunals in ${pol.name}: ${inq.grandInquisitor} unmasks covert cabals, reaffirming religious piety.`,
					sim.w.burgs[pol.capital]?.cell,
					inq.stateId
				);
			}
		}

		// Inquisitions fade after several years or low fervor
		inq.fervor = Math.max(0, inq.fervor - 10);
		if (inq.fervor <= 15) {
			inq.active = false;
			sim.log(
				'faith',
				`The inquisition in ${pol.name} concludes as public peace settles and courts resume ordinary secular law.`,
				sim.w.burgs[pol.capital]?.cell,
				inq.stateId
			);
		}
	}

	// 2. Pilgrimage route income & stability
	for (const p of st.pilgrimages) {
		const shrine = sim.w.burgs[p.shrineBurg];
		if (!shrine?.alive) continue;

		const hostPol = sim.polities[shrine.state];
		if (hostPol?.alive) {
			hostPol.treasury += p.annualDonations;
			hostPol.stability = Math.min(100, hostPol.stability + 1);
		}
	}

	// 3. Spontaneous canonization of deceased heroes or pious rulers
	if (sim.year % 10 === 0 && st.saints.length < 12) {
		const deceasedHeroes = sim.people.filter(
			(p) => !p.alive && (p.role === 'hero' || p.renown >= 40 || p.traits.includes('Pious')) && !st.saints.some((s) => s.personId === p.id)
		);

		if (deceasedHeroes.length && rng.chance(0.4)) {
			const picked = rng.pick(deceasedHeroes);
			canonizeSaint(sim, picked.id);
		}
	}

	// 4. Check sieges of cities with sacred relics to invoke defensive boons
	for (const pol of sim.polities) {
		if (!pol.alive || sim.warsOf(pol.id).length === 0) continue;
		const sacredRelic = sim.artifacts.find(
			(a) => a.kind === 'relic' && a.holderType === 'polity' && a.holderId === pol.id
		);
		if (sacredRelic && rng.chance(0.2)) {
			const cap = sim.w.burgs[pol.capital];
			if (cap?.alive && !st.miracles.some((m) => m.relicId === sacredRelic.id && m.yearInvoked === sim.year)) {
				triggerRelicMiracle(sim, sacredRelic.id, cap.id);
			}
		}
	}
}
