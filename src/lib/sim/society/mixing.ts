/**
 * Intermarriage and mixed peoples. Two peoples who share a realm and feel warmly toward each other marry across
 * the line: a few children of two cultures (and maybe two species) join the cast with blended house names.
 * After decades of unions the contact zone may become a new, mixed culture (like the dialect splits in epochs.ts).
 * Names come from throwaway side languages, so no culture's name stream moves.
 */
import { neighbors } from '../../gen/grid';
import { fullPersonName, isGoodWord, makeLang, makeName, nameIssue, tidy } from '../../gen/names';
import { langSeed } from '../../gen/society';
import { SPECIES_BY_ID } from '../../gen/species';
import { TRAITS } from '../content';
import { clamp } from '../../rng';
import { feeling, sentimentOn, shift } from '../sentiment';
import type { Simulation } from '../engine';
import type { Person, Role } from '../types';
import { budget, cultureName, townOf, type RealmShares } from './common';
import { line, MIX_LINES } from './data';
import { sideLang, w3Rng, type MixPair } from './state';

const pairKey = (realm: number, a: number, b: number) => (a < b ? `${realm}:${a}|${b}` : `${realm}:${b}|${a}`);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/** "Vardan" + "Kelos" → "Vardelos", or a double-barrelled "Vardan-Kelos" when the blend reads badly */
export function blendNames(x: string, y: string, taken?: Iterable<string>): string {
	const a = x.split(/[\s-]/)[0], b = y.split(/[\s-]/).pop() ?? y;
	const head = a.slice(0, Math.max(2, Math.ceil(a.length * 0.55)));
	const tail = b.slice(Math.floor(b.length * 0.45));
	const fused = tidy(cap(head + tail));
	if (fused.length >= 4 && fused.length <= 12 && isGoodWord(fused) && !nameIssue(fused, taken) && fused !== a && fused !== b) return fused;
	if (a.length + b.length <= 13) return `${a}-${b}`;
	const short = tidy(cap(a.slice(0, 5) + b.slice(-4)));
	return isGoodWord(short) ? short : a.slice(0, 8);
}

function blendColor(a: string, b: string): string {
	const p = (h: string) => {
		const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
		if (!m) return [128, 128, 128];
		const n = parseInt(m[1], 16);
		return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
	};
	const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
	const hex = (v: number) => Math.round(v).toString(16).padStart(2, '0');
	return `#${hex((r1 + r2) / 2)}${hex((g1 + g2) / 2)}${hex((b1 + b2) / 2)}`;
}

/** mean warmth between two peoples in [-100, 100]; without sentiment, a calm realm stands in for it */
function warmth(sim: Simulation, a: number, b: number, stability: number): number {
	if (!sentimentOn(sim)) return stability >= 55 ? 35 : 0;
	const sa = sim.w.cultures[a]?.species ?? 'human', sb = sim.w.cultures[b]?.species ?? 'human';
	const c = (feeling(sim, 'c', a, b) + feeling(sim, 'c', b, a)) / 2;
	const s = sa === sb ? c : (feeling(sim, 's', sa, sb) + feeling(sim, 's', sb, sa)) / 2;
	return 0.75 * c + 0.25 * s;
}

export function yearlyMixing(sim: Simulation, shares: Map<number, RealmShares>) {
	const st = sim.w3;
	const r = w3Rng(sim, 'mix', sim.year);
	const seen = new Set<string>();
	const scale = budget(sim);
	let left = 3;
	for (const [rid, sh] of shares) {
		const pol = sim.polities[rid];
		const top = [...sh.cu].filter(([id, s]) => id > 0 && s >= 0.08 && sim.w.cultures[id]).sort((x, y) => y[1] - x[1] || x[0] - y[0]).slice(0, 4);
		for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) {
			const [a, sa] = top[i], [b, sb] = top[j];
			const k = pairKey(rid, a, b);
			seen.add(k);
			const pair = (st.pairs[k] ??= { realm: rid, a: Math.min(a, b), b: Math.max(a, b), warm: 0, unions: 0, since: 0 });
			if (warmth(sim, a, b, pol.stability) >= 20) pair.warm++;
			else pair.warm = Math.max(0, pair.warm - 2);
			if (pair.warm < 4 || left <= 0) continue;
			if (!r.chance(0.25 * Math.min(1, 4 * Math.min(sa, sb)) * scale)) continue;
			left--;
			union(sim, pair, r.chance(0.5) ? a : b);
		}
	}
	for (const k of Object.keys(st.pairs)) {
		const p = st.pairs[k];
		if (seen.has(k)) continue;
		if (!p.unions || !sim.polities[p.realm]?.alive) delete st.pairs[k];
		else p.warm = Math.max(0, p.warm - 1);
	}
	if (sim.year - st.lastPeople >= 40) {
		for (const k of Object.keys(st.pairs).sort()) {
			const p = st.pairs[k];
			if (p.unions >= 5 && sim.year - p.since >= 50 && p.warm >= 20 && shares.has(p.realm) && r.chance(0.25)) {
				if (birthOfPeople(sim, p, shares.get(p.realm)!)) break;
			}
		}
	}
}

function union(sim: Simulation, pair: MixPair, side: number) {
	const pol = sim.polities[pair.realm];
	const other = side === pair.a ? pair.b : pair.a;
	const n = pair.unions;
	const r = w3Rng(sim, 'union', sim.year, pair.realm, pair.a, pair.b, n);
	// a parent from the realm's cast when one is at hand
	let parent: Person | undefined;
	for (const x of sim.idx.inState(sim.people, pol.id)) {
		if (!x.alive || x.state !== pol.id || x.role === 'ruler' || x.mixed) continue;
		const age = sim.ageOf(x);
		if (age < 18 || age > 60 || (x.culture !== side && x.culture !== other)) continue;
		if (!parent || x.renown > parent.renown) parent = x;
	}
	const pc = parent?.culture ?? side;
	const oc = pc === pair.a ? pair.b : pair.a;
	const town = townOf(sim, pol.id, pc) ?? townOf(sim, pol.id);
	const Lg = sideLang(sim, r.chance(0.5) ? pc : oc, 'g', sim.year, pair.realm, n);
	let house = pair.house && r.chance(0.6) ? pair.house : '';
	if (!house) {
		const ha = parent?.house || makeName(sideLang(sim, pc, 'ha', sim.year, pair.realm, n), 'house');
		const hb = makeName(sideLang(sim, oc, 'hb', sim.year, pair.realm, n), 'house');
		house = blendNames(ha, hb);
		pair.house = house;
	}
	const fn = fullPersonName(Lg, undefined, { house, father: parent?.name });
	const roles: Role[] = ['merchant', 'trader', 'wanderer', 'priest'];
	const stat = () => r.int(1, 8);
	const traits: string[] = [];
	while (traits.length < 2) {
		const t = r.pick(TRAITS);
		if (!traits.includes(t)) traits.push(t);
	}
	const species = sim.w.cultures[pc]?.species ?? 'human';
	const otherSpecies = sim.w.cultures[oc]?.species ?? 'human';
	const age = r.int(0, 4);
	const p: Person = {
		id: sim.people.length,
		name: fn.given,
		house: fn.house,
		plain: fn.plain,
		born: sim.year - age,
		culture: pc,
		religion: pol.religion,
		state: pol.id,
		burg: town?.id ?? pol.capital,
		role: r.pick(roles),
		martial: stat(),
		diplomacy: clamp(stat() + 3, 0, 20),
		stewardship: stat(),
		intrigue: stat(),
		health: 70 + r.int(0, 30),
		gold: 20,
		renown: r.int(2, 10),
		alive: true,
		traits,
		parent: parent?.id ?? 0,
		species,
		mixed: { culture: oc, ...(otherSpecies !== species ? { species: otherSpecies } : {}) }
	};
	sim.people.push(p);
	sim.idx.touch();
	pair.unions++;
	if (!pair.since) pair.since = sim.year;
	shift(sim, 'c', pair.a, pair.b, 0.4);
	shift(sim, 'c', pair.b, pair.a, 0.4);
	const sp = otherSpecies !== species ? ` ${fn.given} is of ${SPECIES_BY_ID[species]?.name ?? species} and ${SPECIES_BY_ID[otherSpecies]?.name ?? otherSpecies} blood.` : '';
	const vars = { town: town?.name ?? pol.name, realm: pol.name, name: fn.plain, house, a: cultureName(sim, pc), b: cultureName(sim, oc) };
	if (n === 0) sim.log('culture', line(r, MIX_LINES.firstUnion, vars) + sp, town?.cell, pol.id, 'union');
	else if (r.chance(0.3)) sim.log('culture', line(r, MIX_LINES.union, vars) + sp, town?.cell, pol.id, 'union');
}

function birthOfPeople(sim: Simulation, pair: MixPair, sh: RealmShares): boolean {
	const c = sim.c, st = sim.w3;
	const pol = sim.polities[pair.realm];
	const r = w3Rng(sim, 'people', sim.year, pair.realm);
	const { a, b } = pair;
	const major = (sh.cu.get(a) ?? 0) >= (sh.cu.get(b) ?? 0) ? a : b;
	const base = sim.w.cultures[major], A = sim.w.cultures[a], B = sim.w.cultures[b];
	if (!base || !A || !B) return false;
	// the contact zone: cells of either people that touch the other
	const contact: number[] = [];
	for (const i of sh.cells) {
		const x = c.culture[i];
		if (x !== a && x !== b) continue;
		const y = x === a ? b : a;
		for (const j of neighbors(c, i)) if (c.state[j] === pol.id && c.culture[j] === y) { contact.push(i); break; }
	}
	if (contact.length < 4) return false;
	const take = r.shuffle(contact).slice(0, Math.max(4, Math.round(contact.length * 0.4)));
	const id = sim.w.cultures.length;
	const names = sim.w.cultures.map((x) => x.name);
	let name = blendNames(makeName(sideLang(sim, a, 'pa', sim.year), 'people'), makeName(sideLang(sim, b, 'pb', sim.year), 'people'), names);
	if (name.includes('-') || names.includes(name)) name = cultureName(sim, a).slice(0, 4) + cultureName(sim, b).slice(-4).toLowerCase();
	if (nameIssue(name, names)) {
		const L0 = makeLang(langSeed(sim.w.opts.seed, id) + ':mixed', base.sphere || undefined);
		name = makeName(L0, 'people');
	}
	const L = makeLang(langSeed(sim.w.opts.seed, id) + ':mixed', base.sphere || undefined);
	sim.langs[id] = L;
	sim.w.cultures.push({ ...base, id, name, color: blendColor(A.color, B.color), center: take[0], lang: id });
	const set = new Set(take);
	for (const i of take) c.culture[i] = id;
	for (const bg of sim.idx.burgsIn(sim.w.burgs, pol.id)) if (bg.alive && bg.state === pol.id && set.has(bg.cell)) bg.culture = id;
	for (const parent of [a, b]) {
		shift(sim, 'c', id, parent, 30);
		shift(sim, 'c', parent, id, 20);
	}
	st.peoples.push({ culture: id, a, b, realm: pol.id, year: sim.year });
	st.lastPeople = sim.year;
	const years = sim.year - pair.since;
	pair.unions = 0;
	pair.since = sim.year;
	sim.log('culture', line(r, MIX_LINES.people, { years, realm: pol.name, a: A.name, b: B.name, name }), take[0], pol.id, 'mixed_people');
	sim.dirty.political = true;
	return true;
}
