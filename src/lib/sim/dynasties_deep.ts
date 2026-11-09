import type { Simulation } from './engine';
import { makeRng } from '../rng';
import type { Person, Role } from './types';

export type BloodlineCurse = 'Dragon-Heart' | 'Red Miasma' | 'Giant Stature' | 'Seer Lunacy';

export interface BloodlineRecord {
	personId: number;
	trait: BloodlineCurse;
	severity: number; // 1 to 3
	manifestedYear: number;
	boonText: string;
	curseText: string;
}

export interface RegencyCouncil {
	stateId: number;
	monarchId: number;
	regentId: number;
	regentName: string;
	formedYear: number;
	regentLoyalty: number; // 0 to 100
	regentAmbition: number; // 0 to 100
	active: boolean;
}

export interface PretenderContest {
	id: number;
	stateId: number;
	pretenderId: number;
	pretenderName: string;
	claimType: 'cadet_branch' | 'bastard_claimant' | 'disinherited_uncle';
	rebellionStrength: number;
	yearStarted: number;
	resolved: boolean;
}

export interface DynastyDeepState {
	bloodlines: Record<number, BloodlineRecord>;
	regencies: Record<number, RegencyCouncil>;
	pretenders: PretenderContest[];
	nextId: number;
}

const simDynastyDeepMap = new WeakMap<Simulation, DynastyDeepState>();

export function getDynastyDeepState(sim: Simulation): DynastyDeepState {
	let state = simDynastyDeepMap.get(sim);
	if (!state) {
		const raw = (sim as unknown as { _dynastyDeepState?: DynastyDeepState })._dynastyDeepState;
		if (raw && typeof raw.bloodlines === 'object') {
			state = raw;
		} else {
			state = {
				bloodlines: {},
				regencies: {},
				pretenders: [],
				nextId: 1
			};
			(sim as unknown as { _dynastyDeepState?: DynastyDeepState })._dynastyDeepState = state;
		}
		simDynastyDeepMap.set(sim, state);
	}
	return state;
}

const BLOODLINE_DESCRIPTIONS: Record<
	BloodlineCurse,
	{ boon: string; curse: string; statMod: (p: Person, s: number) => void }
> = {
	'Dragon-Heart': {
		boon: 'Unflinching martial valor and draconic majesty (+Martial)',
		curse: 'Volatile temperament and fiery bloodlust (civil friction risk)',
		statMod: (p, s) => {
			p.martial += 4 * s;
			p.renown += 10 * s;
		}
	},
	'Red Miasma': {
		boon: 'Aura of dread that terrifies court conspirators (+Intrigue)',
		curse: 'Somatic blight withering physical constitution (-Health)',
		statMod: (p, s) => {
			p.intrigue += 5 * s;
			p.health = Math.max(10, p.health - 12 * s);
		}
	},
	'Giant Stature': {
		boon: 'Colossal physical stature and battlefield endurance (+Martial, +Health)',
		curse: 'Clumsy diplomatic bearing in delicate salons (-Diplomacy)',
		statMod: (p, s) => {
			p.martial += 3 * s;
			p.health += 15 * s;
			p.diplomacy = Math.max(0, p.diplomacy - 2 * s);
		}
	},
	'Seer Lunacy': {
		boon: 'Prophetic visions of future omens and astral leylines (+Stewardship)',
		curse: 'Erratic fits of waking nightmare and mystic mania (-Stability)',
		statMod: (p, s) => {
			p.stewardship += 4 * s;
			p.intrigue += 3 * s;
		}
	}
};

/** Bestow or manifest a dynastic bloodline curse onto a person */
export function assignBloodlineCurse(
	sim: Simulation,
	personId: number,
	curse: BloodlineCurse,
	severity = 1
): BloodlineRecord | null {
	const p = sim.people[personId];
	if (!p || !p.alive) return null;

	const desc = BLOODLINE_DESCRIPTIONS[curse];
	desc.statMod(p, severity);

	if (!p.traits.includes(curse)) {
		p.traits.push(curse);
	}

	const st = getDynastyDeepState(sim);
	const record: BloodlineRecord = {
		personId,
		trait: curse,
		severity,
		manifestedYear: sim.year,
		boonText: desc.boon,
		curseText: desc.curse
	};

	st.bloodlines[personId] = record;

	const pol = sim.polities[p.state];
	const realmName = pol?.alive ? pol.name : 'the realm';
	sim.log(
		'birth',
		`Bloodline awakened: ${p.name} of ${p.house} manifests the hereditary ${curse} curse across ${realmName}.`,
		sim.w.burgs[p.burg]?.cell,
		p.state || undefined
	);

	return record;
}

/** Appoint a regency council for a minor sovereign */
export function appointRegency(
	sim: Simulation,
	stateId: number,
	rulerId: number
): RegencyCouncil | null {
	const pol = sim.polities[stateId];
	const monarch = sim.people[rulerId];
	if (!pol || !pol.alive || !monarch || !monarch.alive) return null;

	const rng = makeRng(`seed:regency:appoint:${sim.year}:${stateId}:${sim.w.opts.seed}`);

	// Find an elder noble, general, or minister to serve as Lord Regent
	const eligibleRegents = sim.people.filter(
		(p) => p.alive && p.state === stateId && p.id !== rulerId && sim.ageOf(p) >= 25
	);

	let regent: Person;
	if (eligibleRegents.length) {
		regent = rng.pick(eligibleRegents);
	} else {
		regent = sim.makePerson(pol.culture, stateId, pol.capital, 'ruler', rng.int(35, 55));
		regent.role = 'minister' as Role;
	}

	const regentLoyalty = rng.int(25, 95);
	const regentAmbition = rng.int(30, 95);

	const council: RegencyCouncil = {
		stateId,
		monarchId: rulerId,
		regentId: regent.id,
		regentName: regent.name,
		formedYear: sim.year,
		regentLoyalty,
		regentAmbition,
		active: true
	};

	const st = getDynastyDeepState(sim);
	st.regencies[stateId] = council;

	sim.log(
		'misc',
		`Regency established: with young monarch ${monarch.name} at age ${sim.ageOf(monarch)}, Lord Regent ${regent.name} assumes the seal of state for ${pol.name}.`,
		sim.w.burgs[pol.capital]?.cell,
		stateId
	);

	return council;
}

/** Trigger a succession pretender war raised by a cadet branch or bastard claimant */
export function triggerPretenderWar(
	sim: Simulation,
	stateId: number,
	claimantId?: number
): PretenderContest | null {
	const pol = sim.polities[stateId];
	if (!pol || !pol.alive) return null;

	const rng = makeRng(`seed:pretender:${sim.year}:${stateId}:${sim.w.opts.seed}`);
	const st = getDynastyDeepState(sim);

	let pretender: Person;
	let claimType: PretenderContest['claimType'] = 'cadet_branch';

	if (claimantId && sim.people[claimantId]?.alive) {
		pretender = sim.people[claimantId];
		claimType = 'bastard_claimant';
	} else {
		const types: PretenderContest['claimType'][] = ['cadet_branch', 'bastard_claimant', 'disinherited_uncle'];
		claimType = rng.pick(types);
		pretender = sim.makePerson(pol.culture, stateId, pol.capital, 'general', rng.int(22, 45));
		pretender.house = `${sim.ruler(pol)?.house ?? 'Royal'} Cadet`;
	}

	const contest: PretenderContest = {
		id: st.nextId++,
		stateId,
		pretenderId: pretender.id,
		pretenderName: pretender.name,
		claimType,
		rebellionStrength: rng.int(35, 80),
		yearStarted: sim.year,
		resolved: false
	};

	st.pretenders.push(contest);
	pol.stability = Math.max(10, pol.stability - 25);

	const claimDesc =
		claimType === 'bastard_claimant'
			? 'a bastard claimant'
			: claimType === 'cadet_branch'
				? 'a rival cadet branch'
				: 'a disinherited royal uncle';

	sim.log(
		'rebel',
		`Pretender war: ${pretender.name}, backed by ${claimDesc}, contests the crown of ${pol.name} and rallies rebel banners!`,
		sim.w.burgs[pol.capital]?.cell,
		stateId
	);

	return contest;
}

/** Yearly simulation step for deep dynastic bloodlines, regencies, and pretenders */
export function yearlyDynastiesDeep(sim: Simulation) {
	const st = getDynastyDeepState(sim);
	const rng = makeRng(`seed:dynasty:yearly:${sim.year}:${sim.w.opts.seed}`);

	// 1. Process regencies for underage rulers
	for (const stateIdStr of Object.keys(st.regencies)) {
		const stateId = Number(stateIdStr);
		const council = st.regencies[stateId];
		if (!council || !council.active) continue;

		const pol = sim.polities[stateId];
		const monarch = sim.people[council.monarchId];

		if (!pol?.alive || !monarch?.alive || pol.ruler !== monarch.id) {
			council.active = false;
			continue;
		}

		const age = sim.ageOf(monarch);
		if (age >= 16) {
			council.active = false;
			sim.log(
				'misc',
				`${monarch.name} of ${pol.name} attains royal majority at age ${age}; the regency council dissolves and the monarch claims full rule.`,
				sim.w.burgs[pol.capital]?.cell,
				stateId
			);
			pol.stability = Math.min(100, pol.stability + 8);
			continue;
		}

		// Active regency dynamics
		if (council.regentAmbition > 80 && council.regentLoyalty < 35 && rng.chance(0.2)) {
			// Regent embezzles or attempts coup
			const stolen = Math.min(pol.treasury, 15);
			pol.treasury -= stolen;
			pol.stability = Math.max(10, pol.stability - 5);
			if (rng.chance(0.3)) {
				sim.log(
					'intrigue',
					`Court intrigue in ${pol.name}: Lord Regent ${council.regentName} siphons state coffers while child ruler ${monarch.name} remains in the nursery.`,
					sim.w.burgs[pol.capital]?.cell,
					stateId
				);
			}
		} else {
			// Loyal governance
			pol.stability = Math.min(100, pol.stability + 1);
		}
	}

	// Check if any polity now has an underage monarch without a regency
	for (const pol of sim.polities) {
		if (!pol.alive || pol.ruler <= 0) continue;
		const ruler = sim.people[pol.ruler];
		if (ruler?.alive && sim.ageOf(ruler) < 16) {
			if (!st.regencies[pol.id] || !st.regencies[pol.id].active) {
				appointRegency(sim, pol.id, ruler.id);
			}
		}
	}

	// 2. Propagate hereditary bloodline curses to children
	for (const p of sim.people) {
		if (!p.alive || !p.parent) continue;
		const parentRecord = st.bloodlines[p.parent];
		if (parentRecord && !st.bloodlines[p.id] && rng.chance(0.65)) {
			assignBloodlineCurse(sim, p.id, parentRecord.trait, parentRecord.severity);
		}
	}

	// 3. Spontaneous curse manifestation for ancient monarchies
	if (sim.year % 12 === 0 && rng.chance(0.4)) {
		const nobleRulers = sim.polities
			.filter((p) => p.alive && p.ruler > 0)
			.map((p) => sim.people[p.ruler])
			.filter((p) => p?.alive && !st.bloodlines[p.id]);

		if (nobleRulers.length) {
			const picked = rng.pick(nobleRulers);
			const curseTypes: BloodlineCurse[] = ['Dragon-Heart', 'Red Miasma', 'Giant Stature', 'Seer Lunacy'];
			assignBloodlineCurse(sim, picked.id, rng.pick(curseTypes));
		}
	}

	// 4. Resolve ongoing pretender wars
	for (const pt of st.pretenders) {
		if (pt.resolved) continue;
		const pol = sim.polities[pt.stateId];
		const claimant = sim.people[pt.pretenderId];

		if (!pol?.alive || !claimant?.alive) {
			pt.resolved = true;
			continue;
		}

		if (rng.chance(0.35)) {
			// Pretender crushed or usurps
			if (rng.chance(0.65) || pol.stability > 50) {
				pt.resolved = true;
				claimant.alive = false;
				claimant.cause = 'executed after failed pretender rebellion';
				pol.stability = Math.min(100, pol.stability + 12);
				sim.log(
					'war',
					`The pretender rebellion of ${pt.pretenderName} in ${pol.name} is crushed; royal legitimacy is restored.`,
					sim.w.burgs[pol.capital]?.cell,
					pt.stateId
				);
			} else {
				pt.resolved = true;
				sim.crown(pol, claimant);
				pol.stability = 45;
				sim.log(
					'rebel',
					`Triumph of the pretender: ${pt.pretenderName} seizes the capital and crowns themselves ruler of ${pol.name}!`,
					sim.w.burgs[pol.capital]?.cell,
					pt.stateId
				);
			}
		}
	}

	// 5. Chance of new pretender wars on low stability realms
	if (sim.year % 8 === 0) {
		const unstableRealms = sim.polities.filter(
			(p) => p.alive && p.stability < 40 && !st.pretenders.some((pt) => pt.stateId === p.id && !pt.resolved)
		);
		if (unstableRealms.length && rng.chance(0.3)) {
			const target = rng.pick(unstableRealms);
			triggerPretenderWar(sim, target.id);
		}
	}
}
