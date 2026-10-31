/**
 * Pogroms, expulsions and forced conversions. A realm whose ruling people (or state faith) bears a deep grudge
 * against a minority living inside it may turn on them: the minority's lands lose people, some districts are
 * emptied and resettled (or forced into the state faith), and refugees flee to the most welcoming neighbour,
 * whose border districts take their culture or faith. Relations sour; the grievance is remembered.
 * Religious tolerance (reforms.ts) forbids it. Side rng only.
 */
import { neighbors } from '../../gen/grid';
import { feeling, sentimentOn, shift } from '../sentiment';
import { activeMotive } from '../motives';
import type { Simulation } from '../engine';
import type { Polity } from '../types';
import type { Rng } from '../../rng';
import { budget, cultureName, faithName, has, rulerLabel, rulerOf, townOf, type RealmShares } from './common';
import { line, PERSECUTION_DEF, PERSECUTION_LINES } from './data';
import { enacted, w3Rng, type Persecution, type PersecutionKind } from './state';

const targetName = (sim: Simulation, axis: 'c' | 'f', id: number) => (axis === 'c' ? cultureName(sim, id) : `faithful of ${faithName(sim, id)}`);

export const activePersecutions = (sim: Simulation, realm: number) => sim.w3.pers.filter((p) => !p.ended && p.realm === realm);

export function yearlyPersecution(sim: Simulation, shares: Map<number, RealmShares>) {
	const st = sim.w3;
	const r = w3Rng(sim, 'pers', sim.year);
	// ongoing campaigns grind on, or end
	for (const ps of st.pers) {
		if (ps.ended) continue;
		const pol = sim.polities[ps.realm];
		const newRuler = pol?.alive && pol.ruler !== ps.by && r.chance(0.35);
		if (!pol?.alive || sim.year >= ps.until || enacted(sim, ps.realm, 'tolerance') || newRuler) {
			ps.ended = sim.year;
			if (pol?.alive) sim.log('misc', line(r, PERSECUTION_LINES.end, { realm: pol.name, target: targetName(sim, ps.axis, ps.target) }), sim.w.burgs[pol.capital]?.cell, pol.id, 'persecution_end');
			continue;
		}
		const sh = shares.get(ps.realm);
		if (sh) {
			const arr = ps.axis === 'c' ? sim.c.culture : sim.c.religion;
			for (const i of sh.cells) if (arr[i] === ps.target) sim.c.pop[i] *= 0.995;
		}
		pol.stability = Math.max(0, pol.stability - 0.3);
		shift(sim, ps.axis, ps.target, ps.axis === 'c' ? pol.culture : pol.religion, -1);
	}
	if (st.pers.length > 80) st.pers = st.pers.filter((p) => !p.ended || sim.year - p.ended < 150).slice(-80);

	const scale = budget(sim);
	for (const [rid, sh] of shares) {
		const pol = sim.polities[rid];
		if ((st.persCool[rid] ?? 0) > sim.year || enacted(sim, rid, 'tolerance') || activePersecutions(sim, rid).length) continue;
		const cand = worstMinority(sim, pol, sh);
		if (!cand) continue;
		const ruler = rulerOf(sim, pol);
		const m = activeMotive(sim, pol);
		let w = 1 + (has(ruler, 'Cruel') ? 0.6 : 0) + (has(ruler, 'Paranoid') ? 0.3 : 0) + (has(ruler, 'Just') ? -0.4 : 0) + (pol.stability < 30 ? 0.5 : 0);
		if (cand.axis === 'f') w += (pol.ideology === 'theocracy' ? 0.6 : 0) + (m === 'faith' ? 0.5 : 0) + (pol.secularized ? -0.5 : 0);
		if (!r.chance(0.04 * scale * Math.max(0.2, w) * Math.min(2, -cand.f / 60))) continue;
		startPersecution(sim, pol, cand.axis, cand.id, pickKind(r, cand.axis, ruler?.traits ?? []), r);
	}
}

function worstMinority(sim: Simulation, pol: Polity, sh: RealmShares): { axis: 'c' | 'f'; id: number; f: number } | null {
	let best: { axis: 'c' | 'f'; id: number; f: number } | null = null;
	const sent = sentimentOn(sim);
	for (const [id, s] of sh.cu) {
		if (!id || id === pol.culture || s < 0.05 || s > 0.45 || !sent) continue;
		const f = feeling(sim, 'c', pol.culture, id);
		if (f <= -50 && (!best || f < best.f)) best = { axis: 'c', id, f };
	}
	for (const [id, s] of sh.fa) {
		if (!id || id === pol.religion || s < 0.05 || s > 0.45) continue;
		const f = sent ? feeling(sim, 'f', pol.religion, id) : pol.ideology === 'theocracy' ? -50 : 0;
		if (f <= -40 && (!best || f < best.f)) best = { axis: 'f', id, f };
	}
	return best;
}

function pickKind(r: Rng, axis: 'c' | 'f', traits: string[]): PersecutionKind {
	const cruel = traits.includes('Cruel');
	if (axis === 'f') return r.weighted(['conversion', 'expulsion', 'pogrom'] as const, [3, 2, cruel ? 2 : 1]);
	return r.weighted(['expulsion', 'pogrom'] as const, [2, cruel ? 2 : 1]);
}

/** begin a campaign against a minority now (also used by famine scapegoating) */
export function startPersecution(sim: Simulation, pol: Polity, axis: 'c' | 'f', target: number, kind: PersecutionKind, r: Rng, cause?: number): Persecution | null {
	const c = sim.c, st = sim.w3;
	const def = PERSECUTION_DEF[kind];
	const arr = axis === 'c' ? c.culture : c.religion;
	const own = axis === 'c' ? pol.culture : pol.religion;
	const cells: number[] = [];
	for (let i = 0; i < c.n; i++) if (c.state[i] === pol.id && arr[i] === target && sim.isLand(i)) cells.push(i);
	if (!cells.length) return null;
	let lost = 0;
	for (const i of cells) {
		const d = c.pop[i] * def.loss;
		c.pop[i] -= d;
		lost += d;
	}
	const conv = new Set(r.shuffle(cells).slice(0, Math.round(cells.length * def.convert)));
	for (const i of conv) arr[i] = own;
	let victim = null as ReturnType<typeof townOf>;
	for (const b of sim.idx.burgsIn(sim.w.burgs, pol.id)) {
		if (!b.id || !b.alive || b.state !== pol.id) continue;
		const hit = axis === 'c' ? b.culture === target : c.religion[b.cell] === target || conv.has(b.cell);
		if (!hit) continue;
		b.pop = +Math.max(0.2, b.pop * (1 - def.loss)).toFixed(2);
		if (axis === 'c' && conv.has(b.cell)) b.culture = own;
		if (!victim || b.pop > victim.pop) victim = b;
	}
	const town = victim ?? townOf(sim, pol.id);
	pol.stability = Math.max(0, pol.stability - (kind === 'pogrom' ? 3 : 4));
	shift(sim, axis, target, own, -12);
	if (axis === 'c') shift(sim, 's', sim.w.cultures[target]?.species ?? 'human', sim.w.cultures[own]?.species ?? 'human', -4);
	const ps: Persecution = { id: st.nextId++, realm: pol.id, axis, target, kind, since: sim.year, until: sim.year + r.int(8, 20), haven: 0, by: pol.ruler, cause };
	st.pers.push(ps);
	st.persCool[pol.id] = sim.year + 25;
	const tname = targetName(sim, axis, target);
	const ev = sim.log('misc', line(r, def.start, { realm: pol.name, town: town?.name ?? pol.name, target: tname, ruler: rulerLabel(sim, pol) }), town?.cell, pol.id, 'persecution', cause);

	// refugees go to the most welcoming neighbour
	let haven: Polity | null = null, best = -5;
	for (const nb of sim.neighborsOf(pol.id)) {
		const q = sim.polities[nb];
		if (!q?.alive || q.layer !== 0 || q.id === pol.id) continue;
		const qOwn = axis === 'c' ? q.culture : q.religion;
		const score = (qOwn === target ? 100 : sentimentOn(sim) ? feeling(sim, axis, qOwn, target) : 0) + (enacted(sim, q.id, 'tolerance') ? 30 : 0);
		if (score > best || (score === best && haven && q.id < haven.id)) { best = score; haven = q; }
	}
	if (haven) {
		const band: number[] = [];
		for (let i = 0; i < c.n; i++) {
			if (c.state[i] !== haven.id || !sim.isLand(i)) continue;
			for (const j of neighbors(c, i)) if (c.state[j] === pol.id) { band.push(i); break; }
		}
		const settle = r.shuffle(band).slice(0, 6);
		if (settle.length) {
			const add = (lost * def.refugees) / settle.length;
			for (let k = 0; k < settle.length; k++) {
				const i = settle[k];
				c.pop[i] += add;
				if (k < Math.ceil(settle.length / 2)) arr[i] = target;
			}
			haven.stability = Math.max(0, haven.stability - 1);
			haven.treasury += 3;
			ps.haven = haven.id;
			sim.addRel(pol.id, haven.id, -10);
			shift(sim, axis, target, axis === 'c' ? haven.culture : haven.religion, 5);
			sim.log('misc', line(r, PERSECUTION_LINES.haven, { realm: pol.name, haven: haven.name, target: tname }), settle[0], haven.id, 'refugees', ev.id);
		}
	}
	if (!ps.haven) sim.log('misc', line(r, PERSECUTION_LINES.nohaven, { realm: pol.name, target: tname }), town?.cell, pol.id, 'refugees', ev.id);
	sim.dirty.political = true;
	return ps;
}

export function persecutionLines(sim: Simulation, realm: number): string[] {
	return sim.w3.pers
		.filter((p) => p.realm === realm && (!p.ended || sim.year - p.ended < 30))
		.slice(-3)
		.map((p) => `${PERSECUTION_DEF[p.kind].name} of the ${targetName(sim, p.axis, p.target)} (${p.ended ? `year ${p.since} to ${p.ended}` : `since year ${p.since}`})${p.haven ? `, refugees to ${sim.polities[p.haven]?.name ?? 'a neighbour'}` : ''}`);
}
