/** Demographics, treasury/army/stability economics, innovation and eras, wonder upkeep and AI wonder construction. */
import type { Simulation } from '../engine';
import { clamp } from '../../rng';
import { ERAS, checkNextDiscovery, lockedEra, type TechDiscovery } from '../tech';
import { techName } from '../genre/techskins';
import { buildWonder } from '../wonders';
import type { LegendaryPlace } from '../types';
import { cellsByState } from '../indexes';
import { cultureMod } from '../culture';

export function demographics(sim: Simulation) {
	const c = sim.c;
	const r = sim.rng;
	for (let i = 0; i < c.n; i++) {
		if (!sim.isLand(i)) continue;
		const cap = sim.basePop[i] * (c.state[i] ? 1.6 : 1.1) + (c.burg[i] ? 2 : 0);
		if (cap <= 0) continue;
		const p = c.pop[i];
		c.pop[i] = Math.max(0.01, p + p * 0.03 * (1 - p / cap) + (r() - 0.5) * 0.01);
	}
	for (const b of sim.w.burgs) {
		if (!b.id || !b.alive) continue;
		const li = sim.burgLayer(b);
		const ratio = li === 0 ? c.pop[b.cell] / Math.max(0.1, sim.basePop[b.cell]) : 1.01;
		b.pop = +clamp(b.pop * (0.97 + ratio * 0.03 + (r() - 0.5) * 0.02), 0.2, 500).toFixed(2);
		b.state = sim.st(li)[b.cell];
	}
	sim.idx.touch();
}

export function economy(sim: Simulation) {
	const r = sim.rng;
	// surface cells per realm; ownership does not change inside this loop
	const own = cellsByState(sim.c.state, sim.polities.length);
	for (const p of sim.polities) {
		if (!p.alive) continue;
		const ruler = sim.ruler(p);
		const wars = sim.warsOf(p.id).length;
		const income = p.pop * p.tax * (0.8 + (ruler?.stewardship ?? 5) * 0.04) * cultureMod(sim, p, 'trade');
		const upkeep = p.army * 0.6;
		p.treasury += income - upkeep;
		const target = p.pop * (wars ? 0.05 : 0.02) * cultureMod(sim, p, 'army');
		if (p.army < target && p.treasury > 0) {
			const add = Math.min(target - p.army, p.pop * 0.01, p.treasury / 2);
			p.army += add;
			p.treasury -= add * 2;
		} else if (p.army > target * 1.3 && !wars) p.army *= 0.92;
		// stability drift
		let cult = 0, faith = 0, tot = 0;
		const c = sim.c;
		for (let k = own.start[p.id], end = own.start[p.id + 1]; k < end; k++) {
			const i = own.cells[k];
			if (i % 3) continue; // every third cell, as sampled before the index existed
			tot++;
			if (c.culture[i] === p.culture) cult++;
			if (c.religion[i] === p.religion) faith++;
		}
		const cs = tot ? cult / tot : 1, fs = tot ? faith / tot : 1;
		const target2 = 45 + (ruler?.diplomacy ?? 5) * 1.6 + (cs - 0.7) * 40 + (fs - 0.7) * 30 - wars * 7 - (p.treasury < 0 ? 15 : 0) - (p.tax - 0.1) * 120 - Math.max(0, p.cells / Math.max(1, p.peak) < 0.6 ? 10 : 0);
		p.stability = clamp(p.stability + (target2 - p.stability) * 0.2 + (r() - 0.5) * 6, 0, 100);
		if (p.treasury < -60) {
			p.army *= 0.8;
			p.stability -= 5;
		}
	}
}

export function innovate(sim: Simulation) {
	const scholars = sim.idx.living(sim.people).filter((p) => p.traits.includes('Scholar')).length;
	const stableRealms = sim.polities.filter((p) => p.alive && p.stability > 60).length;
	// diminishing returns so the ages unfold over centuries, not years (≈ era every 100–150 yrs)
	sim.gainInnovation(0.9 + Math.sqrt(scholars) * 0.25 + Math.sqrt(stableRealms) * 0.15);

	// Check epoch transition (an age-locked world keeps its era for good: no wheel of ages)
	const lock = lockedEra(sim.w.opts.ageLock);
	const nextEra = ERAS.find((e) => e.index === sim.era + 1);
	if (nextEra && (lock === null || nextEra.index <= lock) && sim.innovation >= nextEra.threshold) {
		sim.era = nextEra.index;
		sim.updateVoice();
		sim.log('misc', `The grand wheel of ages turns: the ancient ways yield as the ${nextEra.name} (${nextEra.genreName}) dawns across the lands of ${sim.w.name}!`);
	}

	// Chance of procedural tech breakthrough
	if (sim.rng.chance(0.35)) {
		const disc = checkNextDiscovery(sim.techs, sim.era, sim.rng);
		if (disc) {
			sim.techs.add(disc.id);
			sim.applyTechBonus(disc);
			const invSummary = disc.inventions?.length ? ` (${disc.inventions.slice(0, 2).join(', ')})` : '';
			sim.log('tech', `Artificers and scholars achieve a historic breakthrough: ${techName(sim.voice, disc.id, disc.name)}${invSummary} spreads between guilds and academies across the realms!`);
		}
	}
}

export function applyTechBonus(sim: Simulation, disc: TechDiscovery) {
	for (const p of sim.polities) {
		if (!p.alive || !p.id) continue;
		if (disc.bonus.stability) p.stability = clamp(p.stability + disc.bonus.stability, 0, 100);
		if (disc.bonus.tax) p.tax = clamp(p.tax + disc.bonus.tax, 0.05, 0.4);
		if (disc.bonus.army) p.army = +(p.army * (1 + disc.bonus.army)).toFixed(1);
	}
}

export function updateWonders(sim: Simulation) {
	for (const w of sim.wonders) {
		if (w.destroyed) continue;
		if (w.kind === 'university') {
			sim.gainInnovation(2.5);
		} else if (w.kind === 'tower_magic') {
			sim.gainInnovation(1.5);
		} else if (w.kind === 'world_tree') {
			if (w.stateId && sim.polities[w.stateId]?.alive) {
				sim.polities[w.stateId].stability = clamp(sim.polities[w.stateId].stability + 1, 0, 100);
			}
		} else if (w.kind === 'giant_harbor' || w.kind === 'metropolis') {
			if (w.stateId && sim.polities[w.stateId]?.alive) {
				sim.polities[w.stateId].treasury += 2;
			}
		} else if (w.kind === 'ancient_forge' || w.kind === 'tower_trials') {
			if (w.stateId && sim.polities[w.stateId]?.alive) {
				sim.polities[w.stateId].army = +(sim.polities[w.stateId].army * 1.01).toFixed(1);
			}
		} else if (w.kind === 'titan_shrine') {
			if (w.stateId && sim.polities[w.stateId]?.alive) {
				sim.polities[w.stateId].stability = clamp(sim.polities[w.stateId].stability + 1, 0, 100);
			}
		} else if (w.kind === 'bridge') {
			if (w.stateId && sim.polities[w.stateId]?.alive) {
				sim.polities[w.stateId].treasury += 1.5;
			}
		}
	}
}

export function yearlyWonderConstruction(sim: Simulation) {
	if (sim.wonders.length >= 18) return;
	const candidates = sim.polities.filter(
		(p) => p.id && p.alive && p.treasury >= 120 && p.stability >= 55 && !sim.warsOf(p.id).length
	);
	if (!candidates.length || !sim.rng.chance(0.22)) return;

	const pol = sim.rng.pick(candidates);
	const ruler = sim.people[pol.ruler];
	const builderName = ruler?.alive ? `${ruler.name} of ${pol.name}` : pol.name;
	const capitalBurg = sim.w.burgs[pol.capital];
	if (!capitalBurg) return;

	const isCoastal = sim.w.cells.dist[capitalBurg.cell] === 1;
	const isMountain = sim.w.cells.h[capitalBurg.cell] > 50;
	let kind: LegendaryPlace['kind'] = 'tower_magic';
	if (isCoastal && sim.rng.chance(0.5)) kind = 'giant_harbor';
	else if (isMountain || sim.rng.chance(0.35)) kind = 'tower_magic';
	else if (pol.army > 30 && sim.rng.chance(0.4)) kind = 'tower_trials';
	else if (sim.rng.chance(0.5)) kind = 'university';
	else kind = 'bridge';

	pol.treasury -= 90;
	pol.stability = clamp(pol.stability + 12, 0, 100);
	if (ruler?.alive) ruler.renown += 25;

	const nextWdObj = { val: sim.nextWonderId };
	const wonder = buildWonder(
		sim.w,
		capitalBurg.cell,
		pol.layer ?? 0,
		kind,
		builderName,
		pol.id,
		sim.year,
		nextWdObj,
		sim.rng
	);
	sim.nextWonderId = nextWdObj.val;
	sim.wonders.push(wonder);

	sim.log(
		'wonder',
		`MONUMENT ERECTED: ${builderName} commissions and completes the ${wonder.name} (${wonder.icon}) in ${capitalBurg.name}! ${wonder.effect}`,
		capitalBurg.cell,
		pol.id
	);
}
