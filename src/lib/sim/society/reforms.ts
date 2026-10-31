/**
 * Reform movements: grassroots campaigns for legal reform, temperance, enfranchisement, land reform and
 * religious tolerance. They rise from a realm's sectors, ideology, stability and tensions, gather support, and
 * at the tipping point the ruler (by ideology, motive and traits) enacts them, outwaits them or crushes them.
 * Enacted reforms carry small lasting effects. Side rng only.
 */
import { fullPersonName } from '../../gen/names';
import { clamp, type Rng } from '../../rng';
import { cultureProfile } from '../culture/profile';
import { activeMotive, type Motive } from '../motives';
import { realmMix } from '../sectors';
import { shift } from '../sentiment';
import type { Simulation } from '../engine';
import type { IdeologyKind, Polity } from '../types';
import { budget, has, rulerLabel, rulerOf, townOf, type RealmShares } from './common';
import { line, REFORM_DEF, REFORM_LINES } from './data';
import { enacted, sideLang, w3Rng, type Reform, type ReformKind } from './state';

export const REFORM_KINDS: ReformKind[] = ['legal', 'temperance', 'franchise', 'land', 'tolerance'];

/** how readily each regime enacts each reform (0..1) */
const ACCEPT: Record<IdeologyKind, Record<ReformKind, number>> = {
	monarchy: { legal: 0.5, temperance: 0.4, franchise: 0.25, land: 0.3, tolerance: 0.45 },
	republic: { legal: 0.8, temperance: 0.4, franchise: 0.85, land: 0.5, tolerance: 0.7 },
	theocracy: { legal: 0.35, temperance: 0.8, franchise: 0.2, land: 0.4, tolerance: 0.1 },
	oligarchy: { legal: 0.6, temperance: 0.35, franchise: 0.35, land: 0.1, tolerance: 0.55 },
	autocracy: { legal: 0.25, temperance: 0.4, franchise: 0.1, land: 0.3, tolerance: 0.25 },
	communal: { legal: 0.6, temperance: 0.5, franchise: 0.9, land: 0.9, tolerance: 0.6 },
	technocracy: { legal: 0.8, temperance: 0.35, franchise: 0.5, land: 0.5, tolerance: 0.8 }
};

const MOTIVE_ACCEPT: Partial<Record<Motive, Partial<Record<ReformKind, number>>>> = {
	legacy: { legal: 0.15, temperance: 0.1, franchise: 0.1, land: 0.1, tolerance: 0.1 },
	knowledge: { legal: 0.15, tolerance: 0.15 },
	faith: { temperance: 0.2, tolerance: -0.3 },
	gold: { legal: 0.1, land: -0.2 },
	survival: { legal: 0.1, franchise: 0.1, land: 0.1 },
	glory: { franchise: -0.1, tolerance: -0.05 },
	dynasty: { franchise: -0.15 },
	vengeance: { tolerance: -0.1 }
};

/** sector shares (farming, industry, mining, trade, crafts, scholarship, military, faith, seafaring) */
function sectorShares(sim: Simulation, id: number): number[] {
	const m = realmMix(sim, id);
	if (!m) return new Array(9).fill(1 / 9);
	let t = 0;
	for (const x of m) t += x;
	return t > 0 ? m.map((x) => x / t) : new Array(9).fill(1 / 9);
}

/** how much a realm's conditions push for each reform, 0 = not on the table */
export function reformPressure(sim: Simulation, pol: Polity, sh: RealmShares | undefined): Record<ReformKind, number> {
	const s = sectorShares(sim, pol.id);
	const [farm, ind, , trade, crafts, schol, , faith] = s;
	const ideo = pol.ideology ?? 'monarchy';
	const traits = cultureProfile(sim.w, pol.culture).traits;
	const era = sim.era;
	let minority = 0;
	if (sh) {
		for (const [id, v] of sh.cu) if (id !== pol.culture && v >= 0.1) minority = Math.max(minority, v);
		for (const [id, v] of sh.fa) if (id !== pol.religion && v >= 0.1) minority = Math.max(minority, v);
	}
	const recentPers = sim.w3.pers.some((p) => p.realm === pol.id && sim.year - (p.ended ?? sim.year) < 30);
	const tension = sim.sx.rx[pol.id]?.t ?? 0;
	return {
		legal: 0.3 + 1.5 * (schol + trade) + (pol.stability > 30 && pol.stability < 70 ? 0.2 : 0) + (traits.includes('scholarly') ? 0.2 : 0),
		temperance: pol.treasury > 40 ? 0.15 + 2 * faith + (ideo === 'theocracy' ? 0.4 : 0) + (traits.includes('pious') ? 0.3 : 0) : 0,
		franchise: ideo === 'republic' || ideo === 'communal' || era < 1 ? 0 : 0.15 + 1.5 * (trade + crafts + ind) + (era >= 2 ? 0.4 : 0),
		land: ideo === 'communal' ? 0 : 0.15 + 1.5 * farm + (pol.stability < 45 ? 0.4 : 0),
		tolerance: minority >= 0.1 || recentPers ? 0.3 + tension + (traits.includes('scholarly') ? 0.2 : 0) + (recentPers ? 0.5 : 0) + minority : 0
	};
}

export const activeReforms = (sim: Simulation, realm: number) => sim.w3.reforms.filter((x) => x.status === 'rising' && x.realm === realm);

export function yearlyReforms(sim: Simulation, shares: Map<number, RealmShares>) {
	const st = sim.w3;
	const r = w3Rng(sim, 'reform', sim.year);
	// enacted reforms keep working
	for (const key of Object.keys(st.enacted)) {
		const pol = sim.polities[+key];
		if (!pol?.alive) { delete st.enacted[+key]; continue; }
		applyEnacted(sim, pol, st.enacted[+key], shares.get(pol.id));
	}
	// movements grow and come to a head
	for (const mv of st.reforms) {
		if (mv.status !== 'rising') continue;
		const pol = sim.polities[mv.realm];
		if (!pol?.alive) { mv.status = 'failed'; mv.ended = sim.year; continue; }
		const pr = reformPressure(sim, pol, shares.get(pol.id))[mv.kind];
		mv.support = clamp(mv.support + 2 + 6 * pr + (pol.stability < 40 ? 2 : 0) + (pol.ideology === 'autocracy' ? -2 : 0) + r.int(-2, 2), 0, 100);
		if (mv.support >= 60) resolve(sim, pol, mv, r);
		else if (sim.year - mv.born > 30 || pr <= 0) end(sim, pol, mv, 'failed', r);
	}
	if (st.reforms.length > 120) st.reforms = st.reforms.filter((x) => x.status === 'rising' || sim.year - (x.ended ?? 0) < 200).slice(-120);
	// new movements
	const scale = budget(sim);
	for (const [rid, sh] of shares) {
		const pol = sim.polities[rid];
		if (activeReforms(sim, rid).length) continue;
		let last: Reform | undefined;
		for (let k = st.reforms.length - 1; k >= 0 && !last; k--) if (st.reforms[k].realm === rid) last = st.reforms[k];
		if (last && sim.year - (last.ended ?? last.born) < 12) continue;
		const pr = reformPressure(sim, pol, sh);
		const kinds = REFORM_KINDS.filter((k) => pr[k] > 0 && !enacted(sim, rid, k));
		if (!kinds.length) continue;
		const total = kinds.reduce((t, k) => t + pr[k], 0);
		if (!r.chance(0.012 * scale * Math.min(3, total))) continue;
		const kind = r.weighted(kinds, kinds.map((k) => pr[k]));
		spawn(sim, pol, kind, r);
	}
}

function spawn(sim: Simulation, pol: Polity, kind: ReformKind, r: Rng) {
	const st = sim.w3;
	const id = st.nextId++;
	const town = townOf(sim, pol.id) ?? sim.w.burgs[pol.capital];
	const leader = fullPersonName(sideLang(sim, pol.culture, 'reform', id)).plain;
	const def = REFORM_DEF[kind];
	const name = r.pick(def.movement);
	const mv: Reform = { id, kind, realm: pol.id, name, leader, born: sim.year, support: r.int(10, 25), status: 'rising' };
	st.reforms.push(mv);
	sim.log('misc', line(r, REFORM_LINES.rise, { town: town?.name ?? pol.name, movement: name, leader, reform: def.name.toLowerCase(), realm: pol.name }), town?.cell, pol.id, 'reform');
}

function resolve(sim: Simulation, pol: Polity, mv: Reform, r: Rng) {
	const ruler = rulerOf(sim, pol);
	const m = activeMotive(sim, pol);
	let a = ACCEPT[pol.ideology ?? 'monarchy'][mv.kind] + (m ? (MOTIVE_ACCEPT[m]?.[mv.kind] ?? 0) : 0);
	a += (has(ruler, 'Just') ? 0.15 : 0) + (has(ruler, 'Cruel') ? -0.2 : 0) + (has(ruler, 'Paranoid') ? -0.15 : 0);
	if (mv.kind === 'land') a += (has(ruler, 'Generous') ? 0.1 : 0) + (has(ruler, 'Greedy') ? -0.15 : 0);
	if (mv.kind === 'temperance') a += has(ruler, 'Pious') ? 0.15 : 0;
	if (mv.kind === 'tolerance') a += has(ruler, 'Pious') ? -0.15 : 0;
	if (mv.kind === 'legal') a += has(ruler, 'Scholar') ? 0.1 : 0;
	a += (pol.stability < 35 ? 0.15 : 0) + (mv.support - 60) / 200;
	if (r() < a) {
		const list = (sim.w3.enacted[pol.id] ??= []);
		if (!list.includes(mv.kind)) list.push(mv.kind);
		pol.stability = clamp(pol.stability + 5, 0, 100);
		end(sim, pol, mv, 'passed', r);
	} else if (r.chance(0.35 + (has(ruler, 'Cruel') ? 0.25 : 0) + (pol.ideology === 'autocracy' ? 0.2 : 0))) {
		pol.stability = clamp(pol.stability - 6, 0, 100);
		end(sim, pol, mv, 'crushed', r);
	} else {
		// rebuffed: the movement regroups
		mv.support -= 25;
		pol.stability = clamp(pol.stability - 1, 0, 100);
	}
}

function end(sim: Simulation, pol: Polity, mv: Reform, status: Reform['status'], r: Rng) {
	mv.status = status;
	mv.ended = sim.year;
	const town = townOf(sim, pol.id) ?? sim.w.burgs[pol.capital];
	const lines = status === 'passed' ? REFORM_LINES.passed : status === 'crushed' ? REFORM_LINES.crushed : REFORM_LINES.failed;
	sim.log('misc', line(r, lines, { ruler: rulerLabel(sim, pol), realm: pol.name, movement: mv.name, reform: REFORM_DEF[mv.kind].name.toLowerCase(), leader: mv.leader, town: town?.name ?? pol.name }), town?.cell, pol.id, 'reform');
}

function applyEnacted(sim: Simulation, pol: Polity, list: ReformKind[], sh: RealmShares | undefined) {
	const income = pol.pop * pol.tax;
	let stab = 0;
	for (const k of list) {
		if (k === 'legal') { stab += 0.3; pol.treasury += income * 0.03; }
		else if (k === 'temperance') { stab += 0.2; pol.treasury -= income * 0.01; }
		else if (k === 'franchise') { stab += 0.4; pol.treasury += income * 0.02; }
		else if (k === 'land') {
			stab += 0.2;
			pol.treasury -= income * 0.02;
			if (sh) for (const i of sh.cells) sim.c.pop[i] *= 1.001;
		} else if (k === 'tolerance' && sh) {
			for (const [id, v] of sh.cu) if (id && id !== pol.culture && v >= 0.05) { shift(sim, 'c', pol.culture, id, 0.3); shift(sim, 'c', id, pol.culture, 0.3); }
			for (const [id, v] of sh.fa) if (id !== pol.religion && v >= 0.05) { shift(sim, 'f', pol.religion, id, 0.2); shift(sim, 'f', id, pol.religion, 0.2); }
		}
	}
	pol.stability = clamp(pol.stability + Math.min(0.6, stab), 0, 100);
}

export function reformLines(sim: Simulation, realm: number): { active: string[]; enacted: string[] } {
	return {
		active: activeReforms(sim, realm).map((x) => `${REFORM_DEF[x.kind].icon} ${x.name} (${REFORM_DEF[x.kind].name.toLowerCase()}, led by ${x.leader}, support ${Math.round(x.support)}%)`),
		enacted: (sim.w3.enacted[realm] ?? []).map((k) => `${REFORM_DEF[k].icon} ${REFORM_DEF[k].name}`)
	};
}
