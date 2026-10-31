/**
 * W2 Social orders: every realm has one (free, caste, feudal, unfree labour, egalitarian) in a genre form
 * (thralldom, bound spirits, golems, company towns, automaton labour, credit castes, green commons...).
 * Chosen at founding from sphere, culture traits, faith doctrine, ideology, sectors, era, genre and origin;
 * shifts with regime changes, vassalage, growth and reform movements that can win, be crushed or start a civil war.
 * Effects: sector-weighted output (treasury), stability nudges, uprising odds (`orderUnrest`, read by uprisings.ts),
 * innovation drag for rigid orders, risings of the unfree. One yearly hook (`yearlySocialOrders`).
 *
 * Determinism: all rolls use side rngs (`${seed}:so:...`); `sim.rng` is only touched through `sim.revolt` when
 * an abolition civil war breaks out. `GenOptions.socialOrders === false` leaves `sim.so` undefined: no effect at all.
 */
import type { Simulation } from '../engine';
import type { Polity } from '../types';
import { clamp, makeRng, type Rng } from '../../rng';
import { cultureProfile } from '../culture/profile';
import { pushSector, realmMix, SECTORS } from '../sectors';
import {
	BASE_WEIGHT, DOCTRINE_ORDER, DOCTRINE_SLAVE_MULT, FORM_BY_ID, GENRE_ORDER, IDEOLOGY_ORDER, LINES, MOVEMENT_NAME, ORDER_DEFS, ORDER_FORMS,
	ORDER_KINDS, ORIGIN_ORDER, SECTOR_ORDER, SPHERE_ORDER, TRAIT_ORDER, type OrderForm, type OrderKind
} from './socialorderdata';

export { ORDER_DEFS, ORDER_KINDS, type OrderKind } from './socialorderdata';

export interface OrderRec {
	/** order kind */
	k: OrderKind;
	/** form id (data.ts ORDER_FORMS) */
	f: string;
	/** year adopted */
	y: number;
	/** reform / abolition pressure 0..100 */
	p: number;
	/** movement announced (pressure crossed 50) */
	m?: 1;
	/** ideology last seen (regime change detection) */
	ide?: string;
	/** previous order, for the card */
	prev?: string;
}

export interface SocialOrderState {
	/** polity id → order */
	r: Record<number, OrderRec>;
	/** year of the last abolition civil war on this planet (world budget) */
	war: number;
	/** order changes so far */
	changes: number;
}

export const socialOrdersOn = (sim: Simulation) => sim.w.opts.socialOrders !== false;

const doctrineOf = (sim: Simulation, pol: Polity) => sim.w.religions[pol.religion]?.doctrine as string | undefined;

function fill(t: string, v: Record<string, string>): string {
	return t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
}
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// ───────────── choosing ─────────────
function weightsFor(sim: Simulation, pol: Polity): number[] {
	const w: Record<OrderKind, number> = { ...BASE_WEIGHT };
	const add = (a?: Partial<Record<OrderKind, number>>, f = 1) => { if (a) for (const k in a) w[k as OrderKind] += a[k as OrderKind]! * f; };
	const cu = sim.w.cultures[pol.culture];
	if (cu) {
		add(SPHERE_ORDER[cu.sphere]);
		for (const t of cultureProfile(sim.w, pol.culture).traits) add(TRAIT_ORDER[t]);
	}
	const doc = doctrineOf(sim, pol);
	if (doc) add(DOCTRINE_ORDER[doc]);
	if (pol.ideology) add(IDEOLOGY_ORDER[pol.ideology]);
	const mix = realmMix(sim, pol.id), world = sim.sectors?.world;
	if (mix && world) for (let k = 0; k < SECTORS.length; k++) {
		const r = clamp(mix[k] / Math.max(0.02, world[k]) - 1, 0, 1.5);
		if (r > 0) add(SECTOR_ORDER[SECTORS[k]], r);
	}
	add(GENRE_ORDER[sim.voice]);
	add(ORIGIN_ORDER[pol.origin]);
	const era = Math.min(5, sim.era);
	w.free += 0.2 * era;
	w.slave *= Math.max(0.3, 1 - 0.12 * era);
	if (doc && DOCTRINE_SLAVE_MULT[doc]) w.slave *= DOCTRINE_SLAVE_MULT[doc];
	if (pol.origin === 'rebellion') w.slave *= 0.5;
	return ORDER_KINDS.map((k) => Math.max(0.02, w[k]));
}

function formsFor(sim: Simulation, kind: OrderKind): OrderForm[] {
	const g = sim.voice;
	const fantasy = g === 'fantasy' || g === 'mythic';
	const list = ORDER_FORMS.filter((f) => f.kind === kind && (f.genres ? f.genres.includes(g) : fantasy));
	return list.length ? list : ORDER_FORMS.filter((f) => f.kind === kind && !f.genres);
}

function pickForm(sim: Simulation, pol: Polity, kind: OrderKind, rng: Rng): string {
	const list = formsFor(sim, kind);
	const cu = sim.w.cultures[pol.culture];
	const sp = pol.species ?? cu?.species ?? 'human';
	const traits = cu ? cultureProfile(sim.w, pol.culture).traits : [];
	const doc = doctrineOf(sim, pol);
	const weights = list.map((f) => {
		let x = f.construct ? 0.35 : 1;
		if (f.species?.includes(sp)) x += 2;
		if (cu && f.spheres?.includes(cu.sphere)) x += 1.5;
		if (doc && f.doctrines?.includes(doc)) x += 1.2;
		if (f.traits?.some((t) => traits.includes(t))) x += 0.8;
		if (pol.ideology && f.ideologies?.includes(pol.ideology)) x += 1.2;
		return x;
	});
	return rng.weighted(list, weights).id;
}

function chooseOrder(sim: Simulation, pol: Polity): OrderRec {
	const rng = makeRng(`${sim.w.opts.seed}:so:${pol.id}:${pol.founded}`);
	const k = rng.weighted(ORDER_KINDS, weightsFor(sim, pol));
	return { k, f: pickForm(sim, pol, k, rng), y: sim.year, p: 0, ide: pol.ideology };
}

/** builds the state (also derives it for old saves); undefined when the toggle is off */
export function initSocialOrders(sim: Simulation): SocialOrderState | undefined {
	if (!socialOrdersOn(sim)) return undefined;
	const st: SocialOrderState = { r: {}, war: -999, changes: 0 };
	for (const p of sim.polities) if (p.id && p.alive) st.r[p.id] = chooseOrder(sim, p);
	return st;
}

export function restoreSocialOrders(sim: Simulation, saved: SocialOrderState | undefined): SocialOrderState | undefined {
	if (!socialOrdersOn(sim)) return undefined;
	if (!saved) return initSocialOrders(sim);
	return { r: saved.r ?? {}, war: saved.war ?? -999, changes: saved.changes ?? 0 };
}

// ───────────── changing ─────────────
function change(sim: Simulation, pol: Polity, rec: OrderRec, k: OrderKind, rng: Rng, line: keyof typeof LINES, extra: Record<string, string> = {}) {
	const st = sim.so!;
	const old = FORM_BY_ID[rec.f]?.name ?? ORDER_DEFS[rec.k].name;
	const f = pickForm(sim, pol, k, rng);
	const town = sim.w.burgs[pol.capital];
	const ruler = sim.ruler(pol);
	const text = fill(rng.pick(LINES[line]), {
		realm: pol.name, form: old.toLowerCase(), workers: FORM_BY_ID[rec.f]?.workers ?? 'labourers', new: FORM_BY_ID[f].name.toLowerCase(),
		ruler: ruler?.name ?? 'the council', town: town?.name ?? pol.name, ...extra
	});
	rec.prev = old;
	rec.k = k;
	rec.f = f;
	rec.y = sim.year;
	rec.p = 0;
	rec.m = undefined;
	st.changes++;
	sim.log('misc', cap(text), town?.cell, pol.id);
}

/** where a reform leads */
function reformTarget(pol: Polity, k: OrderKind, rng: Rng, era: number): OrderKind {
	if (pol.ideology === 'communal') return 'egalitarian';
	if (k === 'slave' && era === 0 && rng.chance(0.35)) return 'feudal';
	return rng.chance(0.85) ? 'free' : 'egalitarian';
}

// ───────────── yearly ─────────────
export function yearlySocialOrders(sim: Simulation) {
	const st = sim.so;
	if (!st) return;
	const seed = sim.w.opts.seed;
	const era = Math.min(5, sim.era);
	const alive = sim.polities.filter((p) => p.id && p.alive && p.cells > 0);
	if (!alive.length) return;
	let worldPop = 0;
	for (const p of alive) worldPop += p.pop;
	let innov = 0;
	const scale = Math.min(1, 10 / alive.length);
	for (const pol of alive) {
		let rec = st.r[pol.id];
		if (!rec) rec = st.r[pol.id] = chooseOrder(sim, pol);
		const rng = makeRng(`${seed}:so:${pol.id}:${sim.year}`);
		const def = ORDER_DEFS[rec.k];
		const form = FORM_BY_ID[rec.f];
		const construct = !!form?.construct;

		// output: sector-weighted share of tax income
		const mix = realmMix(sim, pol.id);
		let out = def.out;
		for (let k = 0; k < SECTORS.length; k++) out += (mix ? mix[k] : 1 / SECTORS.length) * (def.sector[SECTORS[k]] ?? 0);
		if (rec.k === 'slave' && construct) out += 0.02;
		const income = pol.pop * pol.tax * (0.8 + (sim.ruler(pol)?.stewardship ?? 5) * 0.04);
		pol.treasury += income * out;
		pol.stability = clamp(pol.stability + (construct ? 0 : def.stab), 0, 100);
		for (const s in def.push) pushSector(sim, pol.id, s as (typeof SECTORS)[number], def.push[s as (typeof SECTORS)[number]]!);
		if (worldPop > 0) innov += (pol.pop / worldPop) * def.innov;

		// regime changed since last year
		if (pol.ideology !== rec.ide) {
			const was = rec.ide;
			rec.ide = pol.ideology;
			let to: OrderKind | null = null;
			if (was !== undefined) {
				if (pol.ideology === 'communal' && rec.k !== 'egalitarian' && rng.chance(0.7)) to = 'egalitarian';
				else if ((pol.ideology === 'republic' || pol.ideology === 'technocracy') && (rec.k === 'slave' || rec.k === 'feudal' || rec.k === 'caste') && rng.chance(0.25)) to = 'free';
				else if (pol.ideology === 'autocracy' && rec.k === 'free' && rng.chance(0.15)) to = 'feudal';
				else if (pol.ideology === 'theocracy' && rec.k === 'free' && rng.chance(0.15)) to = 'caste';
			}
			if (to) { change(sim, pol, rec, to, rng, 'regime'); continue; }
		}

		// vassals take their overlord's order
		const ov = pol.overlord ? sim.polities[pol.overlord] : undefined;
		const ovRec = ov?.alive ? st.r[ov.id] : undefined;
		if (ov && ovRec && ovRec.k !== rec.k && rng.chance(0.01)) {
			change(sim, pol, rec, ovRec.k, rng, 'imposed', { overlord: ov.name });
			continue;
		}

		// slow drift
		if (rec.k === 'egalitarian' && era >= 1 && pol.cells > 70 && rng.chance(0.012)) { change(sim, pol, rec, 'free', rng, 'drift'); continue; }
		if (rec.k === 'free' && sim.warsOf(pol.id).length >= 2 && pol.stability < 30 && era <= 2 && rng.chance(0.01)) {
			change(sim, pol, rec, 'feudal', rng, 'wardrift');
			continue;
		}

		const town = () => {
			const towns = sim.idx.burgsIn(sim.w.burgs, pol.id).filter((b) => b.id && b.alive && b.state === pol.id);
			return towns.length ? rng.pick(towns) : sim.w.burgs[pol.capital];
		};

		// risings of the unfree (no realm split; the abolition path below can split)
		if (rec.k === 'slave' && rng.chance((construct ? 0.008 : 0.02) * (pol.stability < 40 ? 2 : 1) * scale)) {
			const b = town();
			if (b) {
				const text = fill(rng.pick(construct ? LINES.breakfree : LINES.rising), { realm: pol.name, town: b.name, workers: form?.workers ?? 'bondsfolk' });
				pol.stability = clamp(pol.stability - rng.int(4, 8), 0, 100);
				pol.army *= 0.93;
				if (construct) b.pop = +Math.max(0.2, b.pop * 0.92).toFixed(2);
				else rec.p = Math.min(100, rec.p + 15);
				sim.uprisings.push({
					id: sim.uprisings.length + 1, kind: 'slave_revolt', subtype: construct ? 'bonds_broken' : 'rising', title: cap(`${form?.workers ?? 'bondsfolk'} of ${b.name}`),
					burgId: b.id, burgName: b.name, stateId: pol.id, stateName: pol.name, year: sim.year, cell: b.cell,
					description: `The ${form?.workers ?? 'unfree'} of ${b.name} rose against ${pol.name}.`, active: false
				});
				sim.log('uprising', cap(text), b.cell, pol.id);
			}
		}

		// reform / abolition pressure
		if (!def.pressure) continue;
		let dp = def.pressure * (construct ? 0.35 : 1) + 0.2 * era;
		const doc = doctrineOf(sim, pol);
		if (doc === 'liberation') dp += 1.5;
		else if (doc === 'compassion') dp += 0.8;
		else if (doc === 'caste' && rec.k === 'caste') dp -= 0.8;
		if (pol.ideology === 'republic' || pol.ideology === 'communal') dp += 1;
		else if (pol.ideology === 'autocracy' || (pol.ideology === 'theocracy' && rec.k === 'caste')) dp -= 0.6;
		if (pol.stability < 35) dp += 0.6;
		const nb = sim.neighborsOf(pol.id);
		if (nb.length) {
			let freeN = 0;
			for (const id of nb) { const r = st.r[id]; if (r && (r.k === 'free' || r.k === 'egalitarian')) freeN++; }
			dp += (freeN / nb.length) * 0.8;
		}
		if (mix && sim.sectors) {
			const sc = SECTORS.indexOf('scholarship');
			dp += clamp(mix[sc] / Math.max(0.02, sim.sectors.world[sc]) - 1, -0.5, 1) * 0.6;
		}
		rec.p = clamp(rec.p + dp * (0.6 + rng() * 0.8), 0, 100);
		const vars = (): Record<string, string> => ({
			realm: pol.name, form: (form?.name ?? def.name).toLowerCase(), workers: form?.workers ?? 'labourers',
			movement: rng.pick(MOVEMENT_NAME[rec.k]), ruler: sim.ruler(pol)?.name ?? 'the council', town: town()?.name ?? pol.name
		});
		if (rec.p >= 50 && !rec.m) {
			rec.m = 1;
			if (rng.chance(0.6)) sim.log('misc', cap(fill(rng.pick(LINES.movement), vars())), sim.w.burgs[pol.capital]?.cell, pol.id);
		}
		if (rec.p < 100) continue;

		// the movement comes to a head
		const ruler = sim.ruler(pol);
		let peace = 0.5 + 0.04 * ((ruler?.diplomacy ?? 5) - 5);
		if (pol.ideology === 'republic' || pol.ideology === 'communal' || pol.ideology === 'technocracy') peace += 0.2;
		if (pol.ideology === 'autocracy') peace -= 0.25;
		if (ruler?.traits.includes('Cruel')) peace -= 0.2;
		if (ruler?.traits.includes('Just') || ruler?.traits.includes('Generous')) peace += 0.15;
		if (rng.chance(clamp(peace, 0.15, 0.9))) {
			change(sim, pol, rec, reformTarget(pol, rec.k, rng, era), rng, 'reform');
			pol.stability = clamp(pol.stability - 4, 0, 100);
			continue;
		}
		const v = vars();
		if (sim.year - st.war >= 30 && pol.cells >= 14 && !sim.warsOf(pol.id).length && rng.chance(0.45)) {
			st.war = sim.year;
			const np = sim.revolt(pol);
			if (np) {
				const nr: OrderRec = { k: rng.chance(0.8) ? 'free' : 'egalitarian', f: '', y: sim.year, p: 0, ide: np.ideology, prev: form?.name };
				nr.f = pickForm(sim, np, nr.k, rng);
				st.r[np.id] = nr;
				st.changes++;
				v.town = sim.w.burgs[np.capital]?.name ?? np.name;
				sim.log('rebel', cap(fill(rng.pick(LINES.civilwar), v)), sim.w.burgs[np.capital]?.cell, np.id);
				rec.p = 30;
				rec.m = undefined;
				continue;
			}
		}
		sim.log('misc', cap(fill(rng.pick(LINES.crackdown), v)), sim.w.burgs[pol.capital]?.cell, pol.id);
		pol.stability = clamp(pol.stability - 6, 0, 100);
		rec.p = 20;
		rec.m = undefined;
	}
	// rigid orders drag on discovery, free ones quicken it (through the ×0.16 guard)
	if (innov) sim.gainInnovation(clamp(innov, -0.4, 0.4));
}

// ───────────── hooks ─────────────
/** multiplier on a realm's uprising odds (1 when off) */
export function orderUnrest(sim: Simulation, id: number): number {
	const rec = sim.so?.r[id];
	if (!rec) return 1;
	if (rec.k === 'slave' && FORM_BY_ID[rec.f]?.construct) return 1;
	return ORDER_DEFS[rec.k].unrest;
}

/** god power / deed: end an unfree, caste or feudal order at once; returns an error text or null */
export function emancipate(sim: Simulation, pol: Polity, by = 'divine'): string | null {
	const st = sim.so;
	if (!st) return 'Social orders are off in this world.';
	const rec = (st.r[pol.id] ??= chooseOrder(sim, pol));
	if (rec.k === 'free' || rec.k === 'egalitarian') return `${pol.name} is already a free realm.`;
	const rng = makeRng(`${sim.w.opts.seed}:so:${by}:${pol.id}:${sim.year}`);
	change(sim, pol, rec, pol.ideology === 'communal' ? 'egalitarian' : 'free', rng, by === 'divine' ? 'divine' : 'reform');
	pol.stability = clamp(pol.stability + 10, 0, 100);
	return null;
}

// ───────────── UI / export ─────────────
export interface OrderInfo {
	kind: OrderKind;
	name: string;
	form: string;
	workers: string;
	icon: string;
	blurb: string;
	since: number;
	pressure: number;
	movement: boolean;
	construct: boolean;
	prev?: string;
}

/** current order of a realm (null when off); derives one without storing it if the realm has none yet */
export function orderInfo(sim: Simulation, pol: Polity | null | undefined): OrderInfo | null {
	if (!pol || !pol.id || !sim.so) return null;
	const rec = sim.so.r[pol.id] ?? chooseOrder(sim, pol);
	const def = ORDER_DEFS[rec.k], f = FORM_BY_ID[rec.f];
	return {
		kind: rec.k, name: def.name, form: f?.name ?? def.name, workers: f?.workers ?? '', icon: def.icon,
		blurb: def.blurb + (f?.construct ? ' Its labour is bound, not born: fewer risings, but bindings can fail.' : ''),
		since: rec.y, pressure: Math.round(rec.p), movement: !!rec.m, construct: !!f?.construct, prev: rec.prev
	};
}
