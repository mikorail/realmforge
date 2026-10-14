/** People: creation, ageing and death, succession crises, cast pruning, luminaries. */
import type { Simulation } from '../engine';
import { clamp } from '../../rng';
import { makeName, personName } from '../../gen/names';
import { TRAITS, TRAIT_FX } from '../content';
import { narrateDeath, narrateHeirlessCrisis } from '../chronicle';
import { createLuminary, LUMINARY_PROFILES } from '../luminaries';
import { SPECIES_BY_ID } from '../../gen/species';
import { transitionRegime } from '../politics';
import type { IdeologyKind, Person, Role } from '../types';

export function makePerson(sim: Simulation, culture: number, state: number, burg: number, role: Role, age: number, parent = 0): Person {
	const r = sim.rng;
	const par = parent ? sim.people[parent] : null;
	const L = sim.lang(culture);
	const traits: string[] = [];
	while (traits.length < 2) {
		const t = r.pick(TRAITS);
		if (!traits.includes(t)) traits.push(t);
	}
	const stat = () => r.int(1, 8) + (role === 'ruler' || role === 'hero' || role === 'villain' || role === 'prophet' ? 2 : 0);
	const p: Person = {
		id: sim.people.length,
		name: personName(L),
		house: par ? par.house : makeName(L, 'house'),
		born: sim.year - age,
		culture,
		religion: sim.polities[state]?.religion || sim.c.religion[sim.w.burgs[burg]?.cell ?? 0] || culture,
		state,
		burg,
		role,
		martial: stat(),
		diplomacy: stat(),
		stewardship: stat(),
		intrigue: stat(),
		health: 70 + r.int(0, 30),
		gold: role === 'entrepreneur' ? 140 : role === 'trader' ? 90 : role === 'merchant' ? 60 : role === 'ruler' ? 100 : role === 'villain' ? 80 : 20,
		renown: role === 'ruler' ? 40 : role === 'general' ? 20 : role === 'entrepreneur' ? 15 : role === 'villain' || role === 'prophet' ? 30 : r.int(0, 8),
		alive: true,
		traits,
		parent
	};
	for (const t of traits) for (const [k, v] of Object.entries(TRAIT_FX[t] ?? {})) p[k as 'martial'] = clamp(p[k as 'martial'] + v, 0, 20);
	if (role === 'general') p.martial = clamp(p.martial + 4, 0, 20);
	if (role === 'merchant') p.stewardship = clamp(p.stewardship + 3, 0, 20);
	if (role === 'trader') { p.stewardship = clamp(p.stewardship + 4, 0, 20); p.diplomacy = clamp(p.diplomacy + 2, 0, 20); }
	if (role === 'entrepreneur') { p.stewardship = clamp(p.stewardship + 6, 0, 20); p.intrigue = clamp(p.intrigue + 3, 0, 20); }
	if (role === 'priest') p.diplomacy = clamp(p.diplomacy + 3, 0, 20);
	if (role === 'villain') { p.martial = clamp(p.martial + 6, 0, 20); p.intrigue = clamp(p.intrigue + 4, 0, 20); }
	if (role === 'prophet') { p.diplomacy = clamp(p.diplomacy + 6, 0, 20); p.martial = clamp(p.martial + 1, 0, 20); }
	p.species = sim.w.cultures[culture]?.species ?? 'human';
	const spDef = SPECIES_BY_ID[p.species];
	if (spDef) {
		p.martial = clamp(p.martial + spDef.mods.martial, 0, 20);
		p.diplomacy = clamp(p.diplomacy + spDef.mods.diplomacy, 0, 20);
		p.stewardship = clamp(p.stewardship + spDef.mods.stewardship, 0, 20);
		p.intrigue = clamp(p.intrigue + spDef.mods.intrigue, 0, 20);
		p.health = Math.max(20, p.health + spDef.mods.health);
	}
	sim.people.push(p);
	return p;
}

export function lifecycle(sim: Simulation) {
	const r = sim.rng;
	for (const p of sim.people) {
		if (!p.alive || !p.id) continue;
		const age = sim.ageOf(p);
		const spMult = SPECIES_BY_ID[p.species ?? 'human']?.lifespanMult ?? 1.0;
		const effAge = age / spMult;
		let risk = effAge < 5 ? 0.02 : effAge < 45 ? 0.006 : 0.006 + (effAge - 45) * 0.0045;
		risk *= 1 + (100 - p.health) / 60;
		if (p.traits.includes('Sickly')) risk *= 1.6;
		if (p.traits.includes('Strong')) risk *= 0.7;
		if (sim.plague[sim.w.burgs[p.burg]?.cell ?? 0] > 0.2) risk += 0.08;
		if (p.role === 'general' && sim.warsOf(p.state).length) risk += 0.04;
		p.health = clamp(p.health + 4 - Math.max(0, effAge - 50) * 0.3, 0, 100);
		if (r.chance(risk)) sim.kill(p, effAge > 60 ? 'old age' : r.pick(['fever', 'a fall from a horse', 'poison', 'a wasting sickness', 'a hunting accident', 'battle wounds']));
	}
	for (const pol of sim.polities) {
		if (!pol.alive) continue;
		const ruler = sim.ruler(pol);
		const rulerSpMult = SPECIES_BY_ID[ruler?.species ?? 'human']?.lifespanMult ?? 1.0;
		if (ruler?.alive && !sim.people[pol.heir]?.alive && sim.ageOf(ruler) > 18 && sim.ageOf(ruler) < 55 * Math.min(2.5, rulerSpMult) && r.chance(0.25)) {
			const h = sim.makePerson(pol.culture, pol.id, pol.capital, 'heir', 0, ruler.id);
			pol.heir = h.id;
			if (ruler.id === sim.avatar) sim.log('birth', `A child, ${h.name}, is born to ${ruler.name}.`, undefined, pol.id);
		}
		if (!sim.general(pol) && r.chance(0.5)) sim.makePerson(pol.culture, pol.id, pol.capital, 'general', r.int(22, 40));
	}
	// keep a pool of wanderers for avatar mode
	const free = sim.people.filter((p) => p.alive && p.state === 0).length;
	if (free < 25) {
		const burgs = sim.w.burgs.filter((b) => b.id && b.alive);
		const b = r.pick(burgs);
		sim.makePerson(b.culture, 0, b.id, r.pick<Role>(['merchant', 'wanderer', 'priest']), r.int(16, 30));
	}
}

export function kill(sim: Simulation, p: Person, cause: string) {
	p.alive = false;
	p.died = sim.year;
	p.cause = cause;
	const pol = sim.polities[p.state];
	if ((p.role === 'ruler' || p.role === 'villain') && pol?.alive && pol.ruler === p.id) {
		const heir = sim.people[pol.heir];
		if (heir?.alive) {
			sim.crown(pol, heir);
			const isChild = sim.ageOf(heir) < 16;
			pol.stability -= isChild ? 12 : 4;
			const deathText = narrateDeath(sim.rng, p.name, p.house, pol.name, cause, heir.name, isChild, sim.ageOf(heir));
			sim.log('death', deathText, sim.w.burgs[pol.capital].cell, pol.id);
			if (p.id === sim.avatar) sim.avatar = heir.id;
		} else {
			// Interregnum: check if monarchy is abolished in favor of a Republic or Union
			const republicanParty = pol.factions?.find((f) => f.ideology === 'republic' || f.ideology === 'communal');
			const shouldAbolishCrown = pol.ideology === 'monarchy' && (sim.rng.chance(0.30) || (republicanParty && republicanParty.influence > 45));
			if (shouldAbolishCrown) {
				const targetIdeology: IdeologyKind = republicanParty ? republicanParty.ideology : (sim.rng.chance(0.6) ? 'republic' : 'communal');
				const citizenLeader = sim.makePerson(pol.culture, pol.id, pol.capital, 'ruler', sim.rng.int(28, 55));
				sim.crown(pol, citizenLeader);
				const transRes = transitionRegime(pol, targetIdeology, 'interregnum', sim.year, sim.rng, sim.people, { customLeader: citizenLeader });
				for (const ev of transRes.events) {
					sim.log(ev.kind, ev.text, ev.cell, ev.state);
				}
				sim.dirty.political = true;
				if (p.id === sim.avatar) sim.avatar = citizenLeader.id;
			} else {
				const claimant = sim.makePerson(pol.culture, pol.id, pol.capital, 'ruler', sim.rng.int(20, 45));
				claimant.house = makeName(sim.lang(pol.culture), 'house');
				sim.crown(pol, claimant);
				pol.stability -= 25;
				const heirlessText = narrateHeirlessCrisis(sim.rng, p.name, p.house, pol.name, cause, claimant.house);
				sim.log('death', heirlessText, sim.w.burgs[pol.capital].cell, pol.id);
				if (p.id === sim.avatar) sim.avatar = -1;
			}
		}
	} else if (p.id === sim.avatar) {
		// continue as a child if any
		const child = sim.people.find((x) => x.alive && x.parent === p.id);
		sim.log('avatar', `${p.name} ${p.house} departs sim mortal realm (${cause}).${child ? ` Their kin, ${child.name}, carries on the family mantle.` : ' The journey ends here.'}`);
		sim.avatar = child ? child.id : -1;
		if (child) { child.gold += p.gold; child.renown += Math.round(p.renown / 2); }
	}
	if (pol && pol.heir === p.id) pol.heir = 0;
}

/**
 * Keep the living cast bounded: once the world holds more notable people than it can
 * meaningfully track, the least renowned commoners fade from the annals (no log line).
 * Rulers, heirs, generals, the avatar and anyone mid-quest are never pruned.
 */
export function pruneMinorPeople(sim: Simulation) {
	const aliveRealms = sim.polities.filter((p) => p.alive && p.id).length;
	const cap = 150 + aliveRealms * 6;
	const alive = sim.people.filter((p) => p.alive && p.id);
	if (alive.length <= cap) return;
	const busy = new Set<number>();
	for (const q of sim.quests ?? []) if (!q.completed) busy.add(q.heroId);
	const keepRole = new Set(['ruler', 'heir', 'general']);
	const candidates = alive
		.filter((p) => p.id !== sim.avatar && p.companionOf !== sim.avatar && !busy.has(p.id) && !(keepRole.has(p.role) && sim.polities[p.state]?.alive) && !p.magnumOpus)
		.sort((a, b) => a.renown - b.renown);
	for (const p of candidates.slice(0, alive.length - cap)) {
		p.alive = false;
		p.died = sim.year;
		p.cause = 'faded from the annals';
	}
}

export function updateLuminaries(sim: Simulation) {
	const activeLuminaries = sim.people.filter((p) => p.alive && ['magician', 'thinker', 'artist', 'athlete', 'inventor'].includes(p.role));
	if (activeLuminaries.length < 8 && sim.rng.chance(0.45)) {
		const aliveBurgs = sim.w.burgs.filter((b) => b.id && b.alive);
		if (aliveBurgs.length) {
			const b = sim.rng.pick(aliveBurgs);
			const role = sim.rng.pick<Role>(['magician', 'thinker', 'artist', 'athlete', 'inventor']) as 'magician' | 'thinker' | 'artist' | 'athlete' | 'inventor';
			const speciesId = sim.w.cultures[b.culture]?.species ?? 'human';
			const lum = createLuminary(
				sim.people.length,
				sim.rng,
				b.culture,
				b.state,
				b.id,
				role,
				sim.year,
				sim.lang(b.culture),
				speciesId
			);
			sim.people.push(lum);
			const prof = LUMINARY_PROFILES[role];
			sim.log('luminary', `${prof.title} ${lum.name} of ${b.name} achieves worldwide acclaim with their magnum opus: "${lum.magnumOpus}".`, b.cell, b.state);
			if (role === 'thinker' || role === 'inventor') {
				sim.gainInnovation(3);
			}
		}
	}

	for (const lum of activeLuminaries) {
		if (sim.rng.chance(0.12)) {
			const prof = LUMINARY_PROFILES[lum.role];
			if (prof) {
				const ach = sim.rng.pick(prof.achievementTpl);
				const b = sim.w.burgs[lum.burg];
				const locName = b ? b.name : 'the realm';
				sim.log('luminary', `${lum.name} (${prof.title}) ${ach} in ${locName}.`, b ? b.cell : undefined, lum.state);
				lum.renown += 5;
				if (lum.role === 'inventor' || lum.role === 'thinker') sim.gainInnovation(2);
			}
		}
	}
}
