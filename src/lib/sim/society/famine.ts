/**
 * Famine ethics: when hunger strikes (random famines in systems/realms.ts, lean years under a Long Winter or
 * Great Drought), the ruler chooses by motive, ideology and traits: open the granaries (relief), keep them for
 * the court (hoard), feed the army (requisition) or blame a minority (scapegoat, which may start a persecution).
 * Each choice moves stability, treasury, people and feelings, and is written into the chronicle. Side rng only.
 */
import { clamp } from '../../rng';
import { activeMotive } from '../motives';
import { feeling, sentimentOn, shift } from '../sentiment';
import type { Simulation } from '../engine';
import type { ChronEvent, Polity } from '../types';
import { budget, cultureName, faithName, has, rulerLabel, rulerOf, townOf, type RealmShares } from './common';
import { FAMINE_LINES, LEAN_YEARS, line } from './data';
import { startPersecution } from './persecution';
import { enacted, w3On, w3Rng, type FamineChoice } from './state';

const CHOICES: FamineChoice[] = ['relief', 'hoard', 'requisition', 'scapegoat'];

function minorityOf(sim: Simulation, pol: Polity): { axis: 'c' | 'f'; id: number; f: number } | null {
	const c = sim.c;
	const cu = new Map<number, number>(), fa = new Map<number, number>();
	let n = 0;
	for (let i = 0; i < c.n; i++) {
		if (c.state[i] !== pol.id || !sim.isLand(i)) continue;
		n++;
		cu.set(c.culture[i], (cu.get(c.culture[i]) ?? 0) + 1);
		fa.set(c.religion[i], (fa.get(c.religion[i]) ?? 0) + 1);
	}
	if (n < 4) return null;
	let best: { axis: 'c' | 'f'; id: number; f: number } | null = null, worst = Infinity;
	const sent = sentimentOn(sim);
	for (const [id, k] of cu) {
		if (!id || id === pol.culture || k / n < 0.05 || k / n > 0.45) continue;
		const f = sent ? feeling(sim, 'c', pol.culture, id) : 0;
		if (f < worst) { worst = f; best = { axis: 'c', id, f }; }
	}
	for (const [id, k] of fa) {
		if (id === pol.religion || k / n < 0.05 || k / n > 0.45) continue;
		const f = (sent ? feeling(sim, 'f', pol.religion, id) : 0) + 5;
		if (f < worst) { worst = f; best = { axis: 'f', id, f }; }
	}
	return best;
}

function scaleCells(sim: Simulation, pol: Polity, k: number) {
	const c = sim.c;
	for (let i = 0; i < c.n; i++) if (c.state[i] === pol.id) c.pop[i] *= k;
}

/** the ruler's answer to a famine just logged as `ev` */
export function onFamine(sim: Simulation, pol: Polity, ev?: ChronEvent) {
	if (!sim.w3 || !w3On(sim) || !pol.alive || !pol.id) return;
	if (((globalThis as any).__w3skip ?? '').includes('fam')) return; // TEMP
	const r = w3Rng(sim, 'famine', sim.year, pol.id, ev?.id ?? 0);
	const ruler = rulerOf(sim, pol);
	const m = activeMotive(sim, pol);
	const ideo = pol.ideology ?? 'monarchy';
	const atWar = sim.warsOf(pol.id).length > 0;
	const minority = enacted(sim, pol.id, 'tolerance') ? null : minorityOf(sim, pol);
	const w: Record<FamineChoice, number> = {
		relief: (1.2 + (has(ruler, 'Just') ? 1.5 : 0) + (has(ruler, 'Generous') ? 2 : 0) + (m === 'legacy' || m === 'survival' ? 1 : 0) + (ideo === 'communal' || ideo === 'republic' ? 1.5 : 0)) * (pol.treasury > 40 ? 1 : 0.3),
		hoard: 0.8 + (has(ruler, 'Greedy') ? 2 : 0) + (m === 'gold' ? 1.5 : 0) + (ideo === 'oligarchy' ? 1.5 : 0) + (has(ruler, 'Generous') ? -0.6 : 0),
		requisition: 0.5 + (atWar ? 2 : 0) + (m === 'glory' || m === 'vengeance' ? 1.5 : 0) + (ideo === 'autocracy' ? 1.5 : 0) + (has(ruler, 'Cruel') ? 1 : 0),
		scapegoat: minority ? 0.7 + Math.max(0, -minority.f / 40) + (has(ruler, 'Paranoid') ? 1.5 : 0) + (has(ruler, 'Cruel') ? 1.5 : 0) + (m === 'faith' && minority.axis === 'f' ? 1 : 0) + (ideo === 'theocracy' ? 1 : 0) + (has(ruler, 'Just') ? -0.4 : 0) : 0
	};
	const choice = r.weighted(CHOICES, CHOICES.map((k) => Math.max(0, w[k])));
	const town = townOf(sim, pol.id) ?? sim.w.burgs[pol.capital];
	const vars: Record<string, string> = { ruler: rulerLabel(sim, pol), realm: pol.name, town: town?.name ?? pol.name, target: '' };
	switch (choice) {
		case 'relief': {
			const cost = Math.min(Math.max(0, pol.treasury) * 0.4, 60);
			pol.treasury -= cost;
			pol.stability = clamp(pol.stability + 6, 0, 100);
			scaleCells(sim, pol, 1.06);
			if (ruler) ruler.renown += 5;
			break;
		}
		case 'hoard':
			pol.treasury += 20;
			pol.stability = clamp(pol.stability - 5, 0, 100);
			scaleCells(sim, pol, 0.97);
			if (ruler) ruler.renown = Math.max(0, ruler.renown - 3);
			break;
		case 'requisition':
			pol.army *= 1.08;
			pol.stability = clamp(pol.stability - 7, 0, 100);
			scaleCells(sim, pol, 0.95);
			break;
		case 'scapegoat': {
			if (!minority) break;
			vars.target = minority.axis === 'c' ? cultureName(sim, minority.id) : `faithful of ${faithName(sim, minority.id)}`;
			pol.stability = clamp(pol.stability + 3, 0, 100);
			const own = minority.axis === 'c' ? pol.culture : pol.religion;
			shift(sim, minority.axis, own, minority.id, -10);
			shift(sim, minority.axis, minority.id, own, -6);
			break;
		}
	}
	sim.w3.famines.push({ y: sim.year, realm: pol.id, choice, ruler: ruler?.name ?? '' });
	if (sim.w3.famines.length > 60) sim.w3.famines.shift();
	const out = sim.log('disaster', line(r, FAMINE_LINES[choice], vars), town?.cell, pol.id, 'famine_choice', ev?.id);
	if (choice === 'scapegoat' && minority && (sim.w3.persCool[pol.id] ?? 0) <= sim.year && r.chance(0.4)) {
		startPersecution(sim, pol, minority.axis, minority.id, 'pogrom', r, out.id);
	}
}

/** lean years under a Long Winter or Great Drought */
export function yearlyLeanYears(sim: Simulation, shares: Map<number, RealmShares>) {
	const e = sim.epoch;
	if (!e || (e.kind !== 'ice' && e.kind !== 'drought') || sim.year - e.start < 3) return;
	const r = w3Rng(sim, 'lean', sim.year);
	const scale = budget(sim);
	const epochName = e.kind === 'ice' ? 'Long Winter' : 'Great Drought';
	for (const [rid] of shares) {
		if (!r.chance(0.012 * scale)) continue;
		const pol = sim.polities[rid];
		scaleCells(sim, pol, 0.93);
		pol.stability = clamp(pol.stability - 5, 0, 100);
		const town = townOf(sim, rid) ?? sim.w.burgs[pol.capital];
		const ev = sim.log('disaster', line(r, LEAN_YEARS, { epoch: epochName, realm: pol.name, town: town?.name ?? pol.name }), town?.cell, rid, 'famine', e.ev);
		onFamine(sim, pol, ev);
	}
}

export const FAMINE_NAMES: Record<FamineChoice, string> = { relief: 'opened the granaries', hoard: 'hoarded grain', requisition: 'requisitioned for the army', scapegoat: 'blamed a minority' };

export function famineLine(sim: Simulation, realm: number): string | null {
	for (let i = sim.w3.famines.length - 1; i >= 0; i--) {
		const f = sim.w3.famines[i];
		if (f.realm === realm && sim.year - f.y < 60) return `In the famine of year ${f.y}${f.ruler ? `, ${f.ruler}` : ''} ${FAMINE_NAMES[f.choice]}`;
	}
	return null;
}
