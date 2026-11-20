/**
 * Culture pack: literature. Poetic forms named in the culture's own tongue, and 8 to 14 works: at least half about
 * REAL events of `sim.allEvents` that touch the culture, the rest legends of its founding, heroes and monsters.
 * Facts come from the chronicle (events, wars, polities, burgs, wonders, people); a work's bias bends them
 * deterministically (numbers, credit, villain). Pure: side rng `seed:cp:lit:<id>`, never `sim.rng`, no mutation.
 */
import { makeRng, type Rng } from '../../../rng';
import type { Simulation } from '../../engine';
import type { ChronEvent, Person, Polity, War } from '../../types';
import type { Burg } from '../../../gen/types';
import type { LiteraturePack, LitBias, LitForm, PoeticForm, Register, Work } from '../../../adventure/culturepack';
import { fullPersonName, makeLang, makeName } from '../../../gen/names';
import { cultureProfile, type TraitKey } from '../profile';
import { cultureTongue } from './language';
import {
	ALLIT, BANKS, BIAS_LINE, DISASTER_FORCE, EPITHET, FAMILY, FRAMES, GENRE_BANK, KIND, MEDIUM, RIDDLES, ROLE, ROLE_GENRE, SPHERE_REGISTER,
	SYL5, SYL7, TITLES, cap, type Banks, type Family, type KindId
} from './literature_data';

// ---------- indexes over the simulation (read only, cached per sim) ----------

interface Idx {
	n: number;
	pols: { id: number; name: string }[];
	burgsAt: Map<number, Burg[]>;
	warByEv: Map<number, War>;
}
const idxCache = new WeakMap<Simulation, Idx>();

function indexOf(sim: Simulation): Idx {
	const hit = idxCache.get(sim);
	if (hit && hit.n === sim.allEvents.length) return hit;
	const burgsAt = new Map<number, Burg[]>();
	for (const b of sim.w.burgs) {
		if (!b || !b.id) continue;
		const l = burgsAt.get(b.cell);
		if (l) l.push(b); else burgsAt.set(b.cell, [b]);
	}
	const warByEv = new Map<number, War>();
	for (const w of sim.wars) if (w.ev !== undefined) warByEv.set(w.ev, w);
	const pols = sim.polities.filter((p) => p && p.id && p.name.length >= 3).map((p) => ({ id: p.id, name: p.name }));
	const idx = { n: sim.allEvents.length, pols, burgsAt, warByEv };
	idxCache.set(sim, idx);
	return idx;
}

const isLetter = (ch: string | undefined) => !!ch && /\p{L}/u.test(ch);

/** polities named in a text, in order of first appearance */
function mentioned(ix: Idx, text: string): number[] {
	const hits: [number, number][] = [];
	for (const p of ix.pols) {
		let from = 0;
		for (;;) {
			const i = text.indexOf(p.name, from);
			if (i < 0) break;
			if (!isLetter(text[i - 1]) && !isLetter(text[i + p.name.length])) { hits.push([i, p.id]); break; }
			from = i + 1;
		}
	}
	hits.sort((a, b) => a[0] - b[0]);
	const out: number[] = [];
	for (const h of hits) if (!out.includes(h[1])) out.push(h[1]);
	return out;
}

// ---------- facts ----------

type Stance = 'win' | 'lose' | 'draw' | 'none';

interface Fact {
	idx: number;
	kind: KindId;
	y: number;
	place: string;
	A: string;
	B: string;
	/** which of A and B belongs to the culture: A, B or none */
	ours: 'A' | 'B' | 'none';
	stance: Stance;
	n: number;
	unit: string;
	/** a war name from the culture's side (alias) and from the other side */
	war?: string;
	warOther?: string;
	warOver?: boolean;
	warWinner?: string;
	obj?: string;
	sub?: string;
	years?: string;
	weight: number;
	/** the polity whose banner the author lives under (0 = none) */
	realmId: number;
	otherCulture?: number;
	otherId?: number;
	/** how the author's side names the other party when it is not a polity */
	tName?: string;
}

const PLURAL: Record<LitForm, string> = {
	epic: 'epics', ballad: 'ballads', history: 'histories', sermon: 'sermons', satire: 'satires', tale: 'tales', lament: 'laments', hymn: 'hymns', proverb: 'proverbs',
	love: 'love songs', dispatch: 'dispatches', travelogue: 'travelogues', riddle: 'riddles'
};

const KIND_T: Partial<Record<KindId, string>> = {
	coup: 'a foreign court', reign: 'a rival house', golden: 'envious neighbours', disaster: 'the strangers at the border', wonder: 'a rival realm', prophet: 'the old priests', fall: 'its neighbours'
};

const DEAD_KINDS = new Set<KindId>(['capital', 'siege', 'disaster', 'beast', 'monster', 'war', 'coup', 'revolt']);

export function genLiterature(sim: Simulation, cu: number): LiteraturePack {
	const w = sim.w;
	const cult = w.cultures[cu];
	if (!cult) return {};
	const seed = String(w.opts.seed);
	const rng = makeRng(`${seed}:cp:lit:${cu}`);
	const fam: Family = FAMILY[cult.sphere] ?? 'north';
	const prof = cultureProfile(w, cu);
	const genre = sim.voice;
	const gb = GENRE_BANK[genre] ?? GENRE_BANK.fantasy;
	const reg = registerOf(cult.sphere, prof.traits);
	const T = cultureTongue(sim, cu);
	const ix = indexOf(sim);

	// a private naming language for invented names (never shifts the tongue's own name stream)
	const nameLang = (c: number, tag: string) => {
		const cc = w.cultures[c] ?? cult;
		const L = makeLang(`${seed}:adv:${c}`, cc.sphere || undefined);
		L.rng = makeRng(`${seed}:cp:litnames:${tag}:${c}`);
		return { L, sphere: cc.sphere || null };
	};
	const own = nameLang(cu, 'own');
	const person = () => fullPersonName(own.L, own.sphere).plain;
	const town = () => makeName(own.L, 'city');

	const polity = (id: number | undefined): Polity | undefined => (id ? sim.polities[id] : undefined);
	const mine = sim.polities.filter((p) => p && p.id && p.culture === cu);
	const mainRealm = mine.filter((p) => p.alive).sort((a, b) => b.cells - a.cells)[0] ?? mine.sort((a, b) => b.peak - a.peak)[0];
	const capitalName = (p?: Polity) => (p ? w.burgs[p.capital]?.name : undefined);

	const banks = mergeBanks(BANKS[fam], gb);
	const home = capitalName(mainRealm) ?? town();

	const poeticForms = genForms(sim, cu, rng.int(0, 1 << 30), { fam, banks, T, home, person, reg, traits: prof.traits });

	// ---------- real events touching the culture ----------
	const cands = collectFacts(sim, cu, ix, rng);
	const N0 = rng.int(8, 14);
	let evTarget = Math.ceil(N0 / 2) + rng.int(0, 1);
	const picked = pickFacts(cands, evTarget, rng, sim.year);
	let pairs = Math.min(3, Math.floor(evTarget / 3), picked.length);
	let evWorks = picked.length + pairs;
	let N = N0;
	if (evWorks < Math.ceil(N / 2)) N = Math.max(8, evWorks * 2);
	if (evWorks > N - 2) { evTarget = N - 2; evWorks = Math.min(evWorks, N - 2); pairs = Math.max(0, evWorks - picked.length); }

	const used = new Map<string, number>(); // author uses
	const formUse = new Map<LitForm, number>();
	const works: Work[] = [];
	const ctx: Ctx = { sim, cu, rng, fam, banks, gb, reg, T, genre, ix, own, nameLang, person, town, used, formUse, seed };

	let k = 0;
	const addWork = (f: Fact, bias: LitBias | undefined, side: Side, form?: LitForm): Work | null => {
		const wk = composeWork(ctx, f, bias, side, `lit:${cu}:${k++}`, form);
		if (wk) works.push(wk);
		return wk;
	};
	for (const f of picked) addWork(f, undefined, 'ours');
	// the same event told from the other side, so a reader can cross-reference
	const pairFacts = picked.filter((f) => DEAD_KINDS.has(f.kind) && f.kind !== 'disaster').concat(picked.filter((f) => f.kind === 'disaster'));
	for (let i = 0; i < pairs && i < pairFacts.length; i++) {
		const f = pairFacts[i];
		const first = works.find((x) => x.event === f.idx);
		const rival = f.otherId !== undefined && f.ours !== 'none' && rng.chance(0.7);
		const bias: LitBias = rival ? (first?.bias === 'partisan' ? 'propagandist' : 'partisan') : first?.bias === 'cynical' ? 'romantic' : 'cynical';
		addWork(f, bias, rival ? 'rival' : 'dissident');
	}

	// ---------- legends ----------
	const legends = legendFacts(sim, cu, ctx, mine, N - works.length);
	for (const f of legends) if (works.length < N) addWork(f, undefined, 'ours');

	// order: by year of writing, stable
	works.sort((a, b) => a.year - b.year);
	works.forEach((x, i) => (x.id = `lit:${cu}:${i}`));

	const favs = [...new Set(works.map((x) => PLURAL[x.form]))].slice(0, 3);
	const taste = `${cap(cult.name)} readers favour ${favs.join(', ')} on ${MEDIUM[genre] ?? MEDIUM.fantasy}; the voice is ${reg}, and they prize ${traitTaste(prof.traits)}.`;
	return clean({ forms: poeticForms, works, taste });
}

type Side = 'ours' | 'rival' | 'dissident';

interface Ctx {
	sim: Simulation;
	cu: number;
	rng: Rng;
	fam: Family;
	banks: Banks;
	gb: (typeof GENRE_BANK)[string];
	reg: Register;
	T: ReturnType<typeof cultureTongue>;
	genre: string;
	ix: Idx;
	own: { L: ReturnType<typeof makeLang>; sphere: string | null };
	nameLang: (c: number, tag: string) => { L: ReturnType<typeof makeLang>; sphere: string | null };
	person: () => string;
	town: () => string;
	used: Map<string, number>;
	formUse: Map<LitForm, number>;
	seed: string;
}

function mergeBanks(b: Banks, gb: (typeof GENRE_BANK)[string]): Banks {
	return { ...b, sky: [...b.sky, ...gb.sky, ...gb.sky], work: [...b.work, ...gb.work, ...gb.work], sim: [...b.sim, ...gb.sim, ...gb.sim] };
}

function registerOf(sphere: string, traits: TraitKey[]): Register {
	let r = SPHERE_REGISTER[sphere] ?? 'formal';
	if (traits.includes('scholarly') && (r === 'blunt' || r === 'earthy')) r = 'formal';
	else if (traits.includes('martial') && (r === 'flowery' || r === 'formal')) r = 'blunt';
	return r;
}

function traitTaste(traits: TraitKey[]): string {
	const t: Record<TraitKey, string> = {
		seafaring: 'voyage songs', martial: 'tales of battle', mercantile: 'ledgers turned into verse', ancestral: 'long lists of the dead',
		pious: 'hymns and homilies', scholarly: 'riddles and commentaries', nomadic: 'songs sung on the move', insular: 'stories that never leave the valley'
	};
	return traits.slice(0, 2).map((x) => t[x]).join(' and ');
}

function clean(p: LiteraturePack): LiteraturePack {
	const fix = (s: string) => s.replace(/\u2014/g, ',').replace(/\u2013/g, '-');
	const fixAll = <T,>(v: T): T => {
		if (typeof v === 'string') return fix(v) as unknown as T;
		if (Array.isArray(v)) return v.map(fixAll) as unknown as T;
		if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([a, b]) => [a, fixAll(b)])) as T;
		return v;
	};
	return fixAll(p);
}

// ---------- collecting facts ----------

const BASE_TAGS = new Set(Object.keys(DISASTER_FORCE));

function collectFacts(sim: Simulation, cu: number, ix: Idx, rng: Rng): Fact[] {
	const out: Fact[] = [];
	const evs = sim.allEvents;
	const w = sim.w;
	const cultureAt = (cell: number | undefined) => (cell !== undefined && cell >= 0 ? w.cells.culture[cell] : -1);
	const burgOf = (cell: number | undefined, prefer?: number): Burg | undefined => {
		if (cell === undefined || cell < 0) return undefined;
		const l = ix.burgsAt.get(cell);
		if (!l) return undefined;
		return l.find((b) => b.culture === prefer) ?? l[0];
	};
	for (let i = 0; i < evs.length; i++) {
		const e = evs[i];
		const f = factOf(sim, cu, ix, i, e, cultureAt, burgOf);
		if (!f) continue;
		const r = makeRng(`${w.opts.seed}:cp:fact:${cu}:${i}`);
		f.weight = KIND[f.kind].weight * (f.ours === 'none' ? 0.8 : 1.4) * (0.75 + 0.5 * (f.y / Math.max(1, sim.year))) * (0.7 + r() * 0.6);
		out.push(f);
	}
	void rng;
	return out;
}

function pickFacts(cands: Fact[], want: number, rng: Rng, nowYear: number): Fact[] {
	void rng;
	void nowYear;
	const perKind = new Map<KindId, number>();
	const places = new Set<string>();
	const out: Fact[] = [];
	const pool = [...cands].sort((x, y) => y.weight - x.weight);
	// each pick of a kind halves the appeal of the next one, so wars do not crowd out plagues and wonders
	while (out.length < want && pool.length) {
		let bestI = -1;
		let best = 0;
		for (let i = 0; i < pool.length; i++) {
			const f = pool[i];
			if (places.has(f.place)) continue;
			const sc = f.weight * Math.pow(0.45, perKind.get(f.kind) ?? 0);
			if (sc > best) { best = sc; bestI = i; }
		}
		if (bestI < 0) break;
		const f = pool.splice(bestI, 1)[0];
		perKind.set(f.kind, (perKind.get(f.kind) ?? 0) + 1);
		places.add(f.place);
		out.push(f);
	}
	return out;
}

function factOf(
	sim: Simulation, cu: number, ix: Idx, idx: number, e: ChronEvent,
	cultureAt: (c: number | undefined) => number,
	burgOf: (c: number | undefined, prefer?: number) => Burg | undefined
): Fact | null {
	const k = e.kind;
	const tag = e.tag;
	const rel = k === 'war' || k === 'capture' || k === 'fall' || k === 'disaster' || k === 'wonder' || k === 'coup' || k === 'rebel' || k === 'peace' || k === 'faith' || k === 'monster' || k === 'misc';
	if (!rel) return null;
	const sp = (id: number | undefined) => (id ? sim.polities[id] : undefined);
	const rng = makeRng(`${sim.w.opts.seed}:cp:facts:${idx}`);
	const evPol = sp(e.state) ?? sp(e.cell !== undefined && e.cell >= 0 ? sim.c.state[e.cell] : 0);
	const cellCu = cultureAt(e.cell);
	const burg = burgOf(e.cell, cu);
	const placeOf = (p?: Polity) => burg?.name ?? (p ? sim.w.burgs[p.capital]?.name : undefined) ?? '';
	const pop = Math.max(1, burg?.pop ?? 3);
	const round10 = (x: number) => Math.max(10, Math.round(x / 10) * 10);
	const base = { idx, y: e.y, weight: 0, realmId: 0 } as const;
	const sideOf = (a: Polity | undefined, b: Polity | undefined, placeCu?: number): 'A' | 'B' | 'none' =>
		a?.culture === cu ? 'A' : b?.culture === cu ? 'B' : placeCu === cu ? 'B' : 'none';
	const unitHost = 'host';

	// wars
	if (k === 'war' && tag === 'war') {
		const war = ix.warByEv.get(e.id ?? -1);
		if (!war) return null;
		const pa = sp(war.attackers[0]);
		const pb = sp(war.defenders[0]);
		if (!pa || !pb || pa.name === pb.name) return null;
		const ours = war.attackers.some((id) => sp(id)?.culture === cu) ? 'A' : war.defenders.some((id) => sp(id)?.culture === cu) ? 'B' : 'none';
		if (ours === 'none') return null;
		const aName = war.aliases;
		const nameFor = (c: number) => (aName ? (pa.culture === c ? aName[1] : pb.culture === c ? aName[3] : war.name) : war.name);
		const mineName = nameFor(cu);
		const otherCu = ours === 'A' ? pb.culture : pa.culture;
		const otherName = nameFor(otherCu);
		const win = war.winner === 'attackers' ? 'A' : war.winner === 'defenders' ? 'B' : null;
		const stance: Stance = !war.end ? 'none' : !win ? 'draw' : win === ours ? 'win' : 'lose';
		const yrs = Math.max(1, Math.round((war.end ?? sim.year) - war.start));
		return {
			...base, kind: 'war', place: placeOf(pb) || pb.name, A: pa.name, B: pb.name, ours, stance, unit: unitHost,
			n: Math.max(120, round10(war.startArmy[ours === 'A' ? 1 : 0] * 14)), war: mineName, warOther: otherName, warOver: !!war.end,
			warWinner: war.winner === 'attackers' ? pa.name : war.winner === 'defenders' ? pb.name : undefined, years: String(yrs),
			realmId: ours === 'A' ? pa.id : pb.id, otherCulture: otherCu, otherId: ours === 'A' ? pb.id : pa.id
		};
	}
	// sieges and falls of capitals
	if (k === 'capture' && /relic|WONDER/i.test(e.text)) return null;
	if (k === 'capture' && burg) {
		const taker = sp(e.state);
		const m = mentioned(ix, e.text);
		const loser = sp(m.find((id) => id !== e.state));
		if (!taker || !loser || taker.name === loser.name) return null;
		const ours = sideOf(taker, loser, burg.culture);
		if (ours === 'none') return null;
		const kind: KindId = tag === 'capital' ? 'capital' : 'siege';
		return {
			...base, kind, place: burg.name, A: taker.name, B: loser.name, ours, stance: ours === 'A' ? 'win' : 'lose', unit: 'dead',
			n: round10(Math.min(pop, 150) * (15 + rng() * 70)), realmId: ours === 'A' ? taker.id : loser.id, otherCulture: ours === 'A' ? loser.culture : taker.culture,
			otherId: ours === 'A' ? loser.id : taker.id
		};
	}
	if (k === 'fall' && evPol) {
		if (evPol.culture !== cu || (evPol.fell ?? e.y) - evPol.founded < 8) return null;
		return {
			...base, kind: 'fall', place: capitalOf(sim, evPol), A: evPol.name, B: 'its neighbours', ours: 'A', stance: 'lose', unit: 'years',
			n: Math.max(1, Math.round((evPol.fell ?? e.y) - evPol.founded)), realmId: evPol.id
		};
	}
	if (k === 'disaster' && tag && BASE_TAGS.has(tag)) {
		const p = evPol;
		if (!(p?.culture === cu || cellCu === cu)) return null;
		const place = placeOf(p) || p?.name || '';
		if (!place) return null;
		const big = tag === 'famine' || tag === 'plague' ? 1.8 : tag === 'quake' || tag === 'tsunami' || tag === 'eruption' ? 1.5 : 1;
		const ForceNames = DISASTER_FORCE[tag];
		return {
			...base, kind: 'disaster', place, A: ForceNames.force[0], B: p?.name ?? place, ours: 'B', stance: 'lose', unit: 'dead', sub: tag,
			n: round10(Math.min(pop, 150) * (10 + rng() * 70) * big), realmId: p?.id ?? 0
		};
	}
	if (k === 'wonder') {
		const wd = sim.wonders.find((x) => e.text.includes(x.name));
		const m = /^[^:]+: (.+?) of (.+?) (?:commissions|raises|builds|completes)/.exec(e.text);
		if (!wd || !/MONUMENT|commission|complet/i.test(e.text)) return null;
		const p = evPol;
		if (!(p?.culture === cu || cellCu === cu)) return null;
		return {
			...base, kind: 'wonder', place: placeOf(p) || p?.name || '', A: m ? m[1] : (p?.name ?? 'the realm'), B: p?.name ?? '', ours: 'A', stance: 'win', unit: 'years',
			n: 4 + Math.floor(rng() * 22), obj: wd.name, realmId: p?.id ?? 0
		};
	}
	if (k === 'coup' && tag === 'coup' && evPol?.culture === cu) {
		const m = /! ([A-Z][^\s]*(?: [A-Z][^\s]*)?) (?:seizes|takes|rises|leads|declares|proclaims)/.exec(e.text);
		return {
			...base, kind: 'coup', place: placeOf(evPol) || evPol.name, A: m ? m[1] : 'a clique of officers', B: evPol.name, ours: 'B', stance: 'none', unit: unitHost,
			n: 40 + Math.floor(rng() * 40) * 10, realmId: evPol.id
		};
	}
	if (k === 'rebel' && tag === 'revolt' && evPol) {
		const m = mentioned(ix, e.text);
		const parent = sp(m.find((id) => id !== evPol.id));
		const p2 = parent ?? evPol;
		if (!(evPol.culture === cu || parent?.culture === cu)) return null;
		const ours = evPol.culture === cu ? 'A' : 'B';
		return {
			...base, kind: 'revolt', place: placeOf(evPol) || evPol.name, A: evPol.name, B: p2 === evPol ? 'the old crown' : p2.name, ours, stance: ours === 'A' ? 'win' : 'lose', unit: unitHost,
			n: 100 + Math.floor(rng() * 40) * 50, realmId: ours === 'A' ? evPol.id : p2.id, otherId: ours === 'A' ? p2.id : evPol.id, otherCulture: ours === 'A' ? p2.culture : evPol.culture
		};
	}
	if (k === 'peace' && (tag === 'peace' || tag === 'vassal')) {
		if (tag === 'peace') {
			const war = sim.wars.find((x) => x.end !== undefined && Math.abs(x.end - e.y) <= 1 && e.text.includes(x.name));
			if (!war) return null;
			const pa = sp(war.attackers[0]);
			const pb = sp(war.defenders[0]);
			if (!pa || !pb) return null;
			const ours = sideOf(pa, pb);
			if (ours === 'none') return null;
			const nameFor = (c: number) => (war.aliases ? (pa.culture === c ? war.aliases[1] : pb.culture === c ? war.aliases[3] : war.name) : war.name);
			const win = war.winner === 'attackers' ? 'A' : war.winner === 'defenders' ? 'B' : null;
			return {
				...base, kind: 'peace', place: placeOf(pb) || pb.name, A: pa.name, B: pb.name, ours, stance: !win ? 'draw' : win === ours ? 'win' : 'lose', unit: 'years',
				n: Math.max(1, Math.round((war.end ?? e.y) - war.start)), war: nameFor(cu), warOther: nameFor(ours === 'A' ? pb.culture : pa.culture),
				realmId: ours === 'A' ? pa.id : pb.id, otherId: ours === 'A' ? pb.id : pa.id, otherCulture: ours === 'A' ? pb.culture : pa.culture
			};
		}
		const loser = evPol;
		const lord = sp(mentioned(ix, e.text).find((id) => id !== loser?.id));
		if (!loser || !lord) return null;
		const ours = sideOf(lord, loser);
		if (ours === 'none') return null;
		return {
			...base, kind: 'vassal', place: placeOf(loser) || loser.name, A: lord.name, B: loser.name, ours, stance: ours === 'A' ? 'win' : 'lose', unit: 'gold',
			n: 20 + Math.floor(rng() * 16) * 10, realmId: ours === 'A' ? lord.id : loser.id, otherId: ours === 'A' ? loser.id : lord.id, otherCulture: ours === 'A' ? loser.culture : lord.culture
		};
	}
	if (k === 'misc' && tag === 'golden' && evPol?.culture === cu) {
		return { ...base, kind: 'golden', place: placeOf(evPol) || evPol.name, A: evPol.name, B: evPol.name, ours: 'A', stance: 'win', unit: 'years', n: 10 + Math.floor(rng() * 30), realmId: evPol.id };
	}
	if (k === 'faith' && tag === 'crusade') {
		const m = /^(.+?) calls the faithful of (.+?) to a Great Crusade against (.+?);/.exec(e.text);
		if (!m) return null;
		const target = sim.polities.find((p) => p && p.id && p.name === m[3]);
		const callerRealm = evPol;
		const ours = callerRealm?.culture === cu ? 'A' : target?.culture === cu ? 'B' : 'none';
		if (ours === 'none') return null;
		return {
			...base, kind: 'crusade', place: placeOf(callerRealm) || m[3], A: m[1], B: m[3], ours, stance: ours === 'A' ? 'win' : 'lose', unit: 'followers',
			n: 200 + Math.floor(rng() * 48) * 100, realmId: (ours === 'A' ? callerRealm?.id : target?.id) ?? 0, otherId: ours === 'A' ? target?.id : callerRealm?.id, otherCulture: ours === 'A' ? target?.culture : callerRealm?.culture
		};
	}
	if (k === 'faith' && !tag && /prophet/.test(e.text) && (evPol?.culture === cu || cellCu === cu)) {
		const m = /prophet (\S+)/.exec(e.text);
		if (!m) return null;
		return { ...base, kind: 'prophet', place: burg?.name ?? evPol?.name ?? '', A: m[1], B: evPol?.name ?? '', ours: 'A', stance: 'none', unit: 'followers', n: 80 + Math.floor(rng() * 28) * 50, realmId: evPol?.id ?? 0 };
	}
	if (k === 'monster') {
		const mon = sim.monsters.find((m) => e.text.includes(m.name));
		if (!mon || !(evPol?.culture === cu || cellCu === cu) || !burg) return null;
		return { ...base, kind: 'beast', place: burg.name, A: evPol?.name ?? 'the realm', B: mon.name, ours: 'A', stance: 'none', unit: 'dead', n: 10 + Math.floor(rng() * 30) * 10, realmId: evPol?.id ?? 0 };
	}
	if (k === 'misc' && tag === 'reign' && evPol?.culture === cu) {
		const m = /^(.+?) is acclaimed/.exec(e.text);
		if (!m) return null;
		return { ...base, kind: 'reign', place: capitalOf(sim, evPol), A: m[1], B: evPol.name, ours: 'A', stance: 'win', unit: 'people in the square', n: 200 + Math.floor(rng() * 28) * 100, realmId: evPol.id };
	}
	return null;
}

function capitalOf(sim: Simulation, p: Polity): string {
	return sim.w.burgs[p.capital]?.name ?? p.name;
}

// ---------- legends ----------

function legendFacts(sim: Simulation, cu: number, ctx: Ctx, mine: Polity[], want: number): Fact[] {
	const w = sim.w;
	const rng = makeRng(`${ctx.seed}:cp:legend:${cu}`);
	const out: Fact[] = [];
	const first = [...mine].sort((a, b) => a.founded - b.founded)[0];
	const others = sim.polities.filter((p) => p && p.id && p.culture !== cu && p.alive);
	const foe = () => (others.length ? rng.pick(others).name : 'the strangers');
	const realm = first?.name ?? w.cultures[cu].name;
	const people = sim.people.filter((p) => p.culture === cu && p.id && p.name && (p.role === 'hero' || p.role === 'general' || p.role === 'ruler' || p.role === 'prophet')).sort((a, b) => b.renown - a.renown);
	const monsters = sim.monsters.filter((m) => w.cells.culture[m.cell] === cu);
	const ix = ctx.ix;
	const burgOfPerson = (p: Person) => w.burgs[p.burg]?.name;
	const homeBurgs = [...w.burgs].filter((b) => b && b.id && b.culture === cu);
	const placeLegend = () => (homeBurgs.length ? rng.pick(homeBurgs).name : ctx.town());
	void ix;
	const base = { weight: 1, realmId: first?.id ?? 0 } as const;

	// founding (up to 2)
	for (let i = 0; i < 2; i++) {
		const founderReal = i === 0 ? people.slice(-1)[0] : undefined;
		out.push({
			...base, idx: -1, kind: 'founding', y: first?.founded ?? 1, place: (first ? w.burgs[first.capital]?.name : undefined) ?? placeLegend(),
			A: i === 0 && founderReal && founderReal.born < (first?.founded ?? 0) + 40 ? founderReal.name : ctx.person(), B: realm, ours: 'B', stance: 'win', unit: 'households',
			n: 12 + Math.floor(rng() * 20) * 5, tName: foe()
		});
	}
	// heroes
	const heroPool = people.slice(0, 6);
	for (let i = 0; i < 3; i++) {
		const p = heroPool[i];
		out.push({
			...base, idx: -1, kind: 'hero', y: p ? p.born + 25 : Math.max(1, Math.floor(sim.year * rng())), place: (p && burgOfPerson(p)) ?? placeLegend(),
			A: p?.name ?? ctx.person(), B: foe(), ours: 'A', stance: 'win', unit: 'followers', n: 30 + Math.floor(rng() * 30) * 10
		});
	}
	// monsters
	const monPool = monsters.length ? monsters : [];
	for (let i = 0; i < 2; i++) {
		const m = monPool[i];
		const beast = rng.pick(ctx.banks.beast);
		const place = m ? (ix.burgsAt.get(m.cell)?.[0]?.name ?? placeLegend()) : placeLegend();
		const hero = people[(i + 1) % Math.max(1, people.length)];
		out.push({
			...base, idx: -1, kind: 'monster', y: m ? (m.slainYear ?? Math.max(1, sim.year - 10)) : Math.max(1, Math.floor(sim.year * (0.1 + rng() * 0.5))), place,
			A: hero?.name ?? ctx.person(), B: m?.name ?? `the ${beast} of ${place}`, ours: 'A', stance: 'win', unit: 'dead', n: 3 + Math.floor(rng() * 10)
		});
	}
	// order: interleave kinds so a short list still has all three
	void want;
	return [out[0], out[2], out[5], out[3], out[6], out[4], out[1]].filter(Boolean) as Fact[];
}

// ---------- composing a work ----------

const LAG: Record<LitForm, [number, number]> = {
	dispatch: [0, 0], sermon: [0, 3], hymn: [0, 5], ballad: [1, 6], lament: [1, 4], satire: [1, 5], love: [2, 20], proverb: [5, 30], travelogue: [5, 40],
	riddle: [10, 60], history: [8, 40], epic: [15, 80], tale: [20, 100]
};

const BIAS_BY_FORM: Record<LitForm, [LitBias, number][]> = {
	epic: [['propagandist', 3], ['romantic', 2], ['partisan', 2], ['pious', 1]],
	ballad: [['romantic', 3], ['partisan', 2], ['neutral', 1], ['cynical', 1]],
	history: [['neutral', 3], ['propagandist', 2], ['cynical', 1], ['partisan', 1]],
	sermon: [['pious', 1]],
	satire: [['cynical', 3], ['partisan', 1]],
	tale: [['romantic', 2], ['neutral', 2], ['pious', 1]],
	lament: [['romantic', 3], ['pious', 1], ['neutral', 1]],
	hymn: [['pious', 3], ['romantic', 1]],
	proverb: [['cynical', 2], ['neutral', 2], ['pious', 1]],
	love: [['romantic', 1]],
	dispatch: [['neutral', 2], ['propagandist', 2], ['partisan', 1]],
	travelogue: [['neutral', 2], ['cynical', 2], ['romantic', 1]],
	riddle: [['neutral', 1], ['cynical', 1]]
};

const FAM_FORMS: Record<Family, LitForm[]> = {
	east: ['lament', 'history', 'riddle'], monsoon: ['hymn', 'love', 'tale'], steppe: ['epic', 'ballad', 'proverb'], desert: ['love', 'proverb', 'riddle'],
	afr: ['proverb', 'tale', 'hymn'], amer: ['hymn', 'history', 'epic'], sea: ['ballad', 'tale', 'travelogue'], north: ['epic', 'satire', 'ballad'], eldritch: ['riddle', 'hymn', 'sermon']
};

const PERSON_ROLES: Record<LitForm, string[]> = {
	epic: ['hero', 'general', 'artist'], ballad: ['artist', 'wanderer', 'hero'], history: ['thinker', 'priest', 'ruler'], sermon: ['priest', 'prophet'],
	satire: ['artist', 'merchant', 'thinker'], tale: ['artist', 'wanderer'], lament: ['artist', 'priest'], hymn: ['priest', 'prophet'], proverb: ['thinker', 'priest', 'trader'],
	love: ['artist'], dispatch: ['general', 'hero', 'trader'], travelogue: ['wanderer', 'trader', 'merchant'], riddle: ['thinker', 'magician', 'artist']
};

const PERSON_LABEL: Record<string, string> = {
	ruler: 'ruler', general: 'general', priest: 'priest', prophet: 'prophet', thinker: 'scholar', artist: 'artist', magician: 'mage', merchant: 'merchant',
	hero: 'champion', wanderer: 'wanderer', trader: 'trader', inventor: 'inventor', villain: 'exile', athlete: 'champion', entrepreneur: 'financier', heir: 'heir'
};

function weightedPick<T>(rng: Rng, items: [T, number][]): T {
	let t = 0;
	for (const it of items) t += it[1];
	let r = rng() * t;
	for (const it of items) { r -= it[1]; if (r <= 0) return it[0]; }
	return items[items.length - 1][0];
}

function composeWork(ctx: Ctx, f: Fact, forcedBias: LitBias | undefined, side: Side, id: string, forcedForm?: LitForm): Work | null {
	const { sim, cu, fam, banks, gb, genre, T } = ctx;
	const w = sim.w;
	const rng = makeRng(`${ctx.seed}:cp:work:${cu}:${id}:${f.idx}:${f.kind}`);
	const def = KIND[f.kind];
	const ours = polity(sim, f.realmId);
	const ideology = ours?.ideology;

	// form: from the kind's list, favour the culture's tastes, avoid repeating
	const forms = def.forms.filter((x) => (ctx.formUse.get(x) ?? 0) < 2);
	const form = forcedForm ?? weightedPick(rng, (forms.length ? forms : def.forms).map((x, i) => [x, (4 - Math.min(3, i)) * (FAM_FORMS[fam].includes(x) ? 1.8 : 1) / (1 + (ctx.formUse.get(x) ?? 0))] as [LitForm, number]));
	ctx.formUse.set(form, (ctx.formUse.get(form) ?? 0) + 1);

	// bias
	const opts = BIAS_BY_FORM[form].map(([b, wt]) => {
		let m = 1;
		if (ideology === 'theocracy' && b === 'pious') m = 2;
		if ((ideology === 'autocracy' || ideology === 'monarchy') && b === 'propagandist') m = 1.5;
		if (ideology === 'republic' && b === 'cynical') m = 1.5;
		if (ideology === 'communal' && b === 'partisan') m = 1.3;
		return [b, wt * m] as [LitBias, number];
	});
	let bias = forcedBias ?? weightedPick(rng, opts);
	if (!forcedBias && side === 'rival') bias = rng.chance(0.6) ? 'partisan' : 'propagandist';
	else if (!forcedBias && side === 'dissident') bias = rng.chance(0.55) ? 'cynical' : 'romantic';

	// whose eyes: for a rival, our and their roles swap
	const flip = side === 'rival';
	const oursSide: 'A' | 'B' = f.ours === 'none' ? 'A' : f.ours;
	const authorSide: 'A' | 'B' = flip ? (oursSide === 'A' ? 'B' : 'A') : oursSide;
	const O = authorSide === 'A' ? f.A : f.B;
	const Tn = f.tName ?? KIND_T[f.kind] ?? (authorSide === 'A' ? f.B : f.A);
	const stance: Stance = flip ? (f.stance === 'win' ? 'lose' : f.stance === 'lose' ? 'win' : f.stance) : f.stance;
	const agent = f.kind !== 'disaster' && f.kind !== 'golden' && f.kind !== 'wonder' && f.kind !== 'reign' && f.kind !== 'fall';
	if (!agent && bias === 'partisan') bias = 'cynical';
	if (f.idx < 0 && bias === 'partisan') bias = 'romantic';

	// numbers: the annals' figure and the author's
	const nT = f.n;
	const nV = distort(nT, bias, stance, f.unit);
	const nLow = Math.max(1, Math.round(nT * 0.2));

	// styled names
	const styled = (nm: string, isOurs: boolean): string => {
		if (!agent) return nm;
		if (bias === 'cynical' || bias === 'neutral') return nm;
		if (f.idx < 0) return nm === f.A && f.kind !== 'monster' ? `${nm} ${epithet('hero', rng(), banks, ctx)}` : nm;
		const r = rng();
		if (isOurs) return `${nm} ${epithet('hero', r, banks, ctx)}`;
		return `${nm} ${epithet(bias === 'pious' || bias === 'romantic' ? 'soft' : 'villain', r, banks, ctx)}`;
	};
	const ourNameIsA = authorSide === 'A';
	const Ah = styled(f.A, ourNameIsA);
	const Bv = styled(f.B, !ourNameIsA);
	const Oh = ourNameIsA ? Ah : Bv;
	const Tv = f.tName ?? KIND_T[f.kind] ? Tn : ourNameIsA ? Bv : Ah;

	const realmName = (flip ? polity(sim, f.otherId ?? 0)?.name : ours?.name) ?? O ?? w.cultures[cu].name;
	const withDeity = (id: number | undefined) => w.religions.find((r) => r.id === id && r.deity);
	const rel = withDeity(ours?.religion) ?? withDeity(w.cells.religion[w.cultures[cu].center]) ?? w.religions.find((r) => r.culture === cu && r.deity);
	const deity = (rel?.deity || 'the Giver of Rain').split(',')[0];
	const beast = rng.pick(banks.beast);
	const sky = rng.pick(banks.sky);
	const workN = rng.pick(banks.work);
	const land = rng.pick(banks.land);
	const simile = rng.pick(banks.sim);
	const host = rng.pick(gb.host);
	const arm = rng.pick(gb.arm);
	const unitFor = (n: number) => (f.unit === 'host' ? host : f.unit === 'years' && n === 1 ? 'year' : f.unit);
	const unitText = unitFor(nV);

	// the clause that tells it
	const loserOnly = f.kind === 'capital' || f.kind === 'siege' || f.kind === 'vassal' || f.kind === 'revolt';
	const arr = bias === 'propagandist' ? (stance === 'lose' ? def.flatter : def.true) : bias === 'partisan' ? (loserOnly && stance !== 'lose' ? def.true : def.blame) : bias === 'pious' ? def.pious : def.true;
	const actTpl = rng.pick(arr);
	const force = f.sub ? rng.pick(DISASTER_FORCE[f.sub].force) : '';
	const thing = thingOf(f);
	const years = f.years ?? '';
	const afterWar = f.kind === 'war' ? (f.warOver ? `{war} ended after ${plural(Number(years), 'year')}, ${f.warWinner ? `with ${f.warWinner} the victor` : 'in a stalemate'}` : '{war} was not yet ended') : '';
	const afterTpl = f.kind === 'war' ? afterWar : rng.pick(def.after);
	const warName = side === 'rival' ? (f.warOther ?? f.war ?? '') : (f.war ?? '');

	const S: Record<string, string> = {
		A: f.A, B: f.B, Ah, Bv, O, T: Tn, Oh, Tv, Work: tc(workN), Land: tc(land), Beast: tc(beast), place: f.place, n: fmtN(nV), nLow: String(nLow), unit: unitText, y: String(Math.max(1, f.y)), thing, Thing: cap(thing), war: art(warName),
		deity, land, beast, host, arm, sky, sim: simile, work: workN, realm: realmName, force, obj: f.obj ?? '', sig: gb.sig, after_war: afterWar,
		answer: def.answer.replace('{force}', force), pv: rng.pick(banks.proverbs)
	};
	S.moral = rng.pick(def.moral);
	S.after = afterTpl;
	S.act = actTpl;

	// compose lines
	const frame = FRAMES[form];
	let lines = frame.lines.map((variants) => rng.pick(variants));
	const biasLine = rng.pick(BIAS_LINE[bias]);
	const insertAt = form === 'riddle' || form === 'proverb' ? -1 : Math.max(1, lines.length - 1);
	if (insertAt > 0) lines.splice(insertAt, 0, biasLine);
	lines = lines.map((l) => fill(l, S)).map((l) => capFirst(l));
	lines = decorate(lines, ctx.reg, form, rng.shuffle(banks.sim), workN, rng);
	const finalLines = fitLines(lines.filter((l) => l.trim())).slice(0, 8);
	if (finalLines.length < 3) return null;

	// author and year
	const lag = LAG[form];
	const year = Math.max(1, Math.min(sim.year, f.y + (lag[0] === lag[1] ? lag[0] : rng.int(lag[0], lag[1]))));
	const author = pickAuthor(ctx, f, form, year, side, rng, O);
	const title = fill(rng.pick(TITLES[form]), { ...S, Thing: cap(thing) });
	const reveals = revealOf(f, bias, side, { nV, nT, O, T: Tn, deity, unit: unitText, unitT: unitFor(nT) });

	return { id, form, title: capFirst(title), author, bias, year, ...(f.idx >= 0 ? { event: f.idx } : {}), lines: finalLines, reveals };
}

function polity(sim: Simulation, id: number): Polity | undefined {
	return id ? sim.polities[id] : undefined;
}

function thingOf(f: Fact): string {
	switch (f.kind) {
		case 'war': return art(f.war ?? 'the war');
		case 'capital': return `the fall of ${f.place}`;
		case 'siege': return `the siege of ${f.place}`;
		case 'fall': return `the fall of ${f.A}`;
		case 'disaster': return `the ${DISASTER_FORCE[f.sub ?? 'famine'].name} at ${f.place}`;
		case 'wonder': return `the raising of ${f.obj}`;
		case 'coup': return `the coup in ${f.B}`;
		case 'revolt': return `the rising at ${f.place}`;
		case 'peace': return `the peace after ${art(f.war ?? 'the war')}`;
		case 'vassal': return `the submission of ${f.B}`;
		case 'golden': return `the golden age of ${f.A}`;
		case 'crusade': return `the crusade against ${f.B}`;
		case 'prophet': return `the preaching at ${f.place}`;
		case 'beast': return `the fight at ${f.place}`;
		case 'reign': return `the crowning of ${f.A}`;
		case 'founding': return `the founding of ${f.B}`;
		case 'hero': return `the deeds of ${f.A}`;
		case 'monster': return `the coming of ${f.B}`;
	}
}

function epithet(kind: 'hero' | 'villain' | 'soft', r: number, banks: Banks, ctx: Ctx): string {
	const list = EPITHET[kind];
	const e = list[Math.floor(r * list.length) % list.length];
	return e.replace('{land}', banks.land[Math.floor(r * 97) % banks.land.length]).replace('{beast}', tc(banks.beast[Math.floor(r * 89) % banks.beast.length]));
	void ctx;
}

function distort(n: number, bias: LitBias, stance: Stance, unit: string): number {
	const dead = unit === 'dead' || unit === 'host' || unit === 'followers' || unit === 'people in the square';
	const round = (x: number) => (x >= 1000 ? Math.round(x / 100) * 100 : x >= 100 ? Math.round(x / 10) * 10 : Math.round(x));
	switch (bias) {
		case 'propagandist': return round(n * (!dead ? 1.5 : stance === 'lose' ? 0.4 : 2.1));
		case 'cynical': return round(n * (dead ? 1.25 : 1));
		case 'partisan': return round(n * (dead ? 1.5 : 1.1));
		case 'romantic': return dead ? Math.max(10, Math.round((n * 1.8) / 100) * 100) : n;
		default: return n;
	}
}

const tc = (x: string) => x.replace(/(^|[\s-])(\p{L})/gu, (_m, a, b) => a + b.toUpperCase());
const fmtN = (n: number) => (n >= 10000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : String(n));
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const art = (n: string) => (/^the\s/i.test(n) ? n : `the ${n}`);

function capFirst(s: string): string {
	return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function fill(tpl: string, S: Record<string, string>): string {
	let out = tpl;
	for (let i = 0; i < 4 && /\{\w+\}/.test(out); i++) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in S ? S[k] : m));
	return out.replace(/\s+/g, ' ').replace(/ ,/g, ',').replace(/\.\./g, '.').replace(/([.!?] )([a-z])/g, (_m, a, b) => a + b.toUpperCase()).trim();
}

/** keep every line under 120 characters: split long ones at a clause break */
function fitLines(lines: string[]): string[] {
	const out: string[] = [];
	for (const l of lines) {
		let rest = l;
		let guard = 0;
		while (rest.length > 112 && guard++ < 3) {
			const opts = [', ', '; ', ' and ', ': ', '. ', ' who ', ' when ', ' to find '].map((p) => [p, rest.lastIndexOf(p, 100)] as [string, number]);
			const best = opts.sort((a, b) => b[1] - a[1])[0];
			if (best[1] < 30) {
				const sp = rest.lastIndexOf(' ', 100);
				if (sp < 40) break;
				out.push(rest.slice(0, sp));
				rest = rest.slice(sp + 1);
				continue;
			}
			const head = rest.slice(0, best[1]);
			const mark = best[0] === ': ' ? ':' : best[0] === '. ' ? '.' : best[0] === '; ' ? ';' : best[0] === ', ' ? ',' : '';
			out.push(head + mark);
			rest = rest.slice(best[1] + (mark ? 2 : 1));
			if (mark === '.') rest = rest.charAt(0).toUpperCase() + rest.slice(1);
		}
		out.push(rest);
	}
	return out;
}

function decorate(lines: string[], reg: Register, form: LitForm, similes: string[], work: string, rng: Rng): string[] {
	const ceremonial = form === 'history' || form === 'sermon' || form === 'dispatch' || form === 'travelogue';
	if (form === 'dispatch' || form === 'riddle' || form === 'proverb') return lines;
	const out = [...lines];
	const eligible = out.map((l, i) => (/\.$/.test(l) && l.length < 85 && i > 0 && i < out.length - 1 ? i : -1)).filter((i) => i >= 0);
	const pickIdx = (n: number) => rng.shuffle(eligible).slice(0, n);
	const strip = (l: string) => l.replace(/\.$/, '');
	switch (reg) {
		case 'flowery': pickIdx(2).forEach((i, n) => (out[i] = `${strip(out[i])}, ${similes[n % similes.length]}.`)); break;
		case 'earthy': for (const i of pickIdx(1)) out[i] = `${strip(out[i])}, as any ${work} maker knows.`; break;
		case 'courtly': if (ceremonial) out[0] = `With respect: ${out[0].charAt(0).toLowerCase()}${out[0].slice(1)}`; break;
		case 'formal': if (ceremonial) out[0] = `Let it be set down: ${out[0].charAt(0).toLowerCase()}${out[0].slice(1)}`; break;
		case 'terse': for (let i = 0; i < out.length; i++) { const c = out[i].search(/[,;] /); if (c > 28 && out[i].length > 55) out[i] = out[i].slice(0, c) + '.'; } break;
		default: break;
	}
	return out;
}

function pickAuthor(ctx: Ctx, f: Fact, form: LitForm, year: number, side: Side, rng: Rng, theirName: string): string {
	const { sim, cu, genre } = ctx;
	const role = ROLE_GENRE[genre]?.[form] ?? ROLE[form];
	if (side === 'rival' && f.otherCulture !== undefined) {
		const nl = ctx.nameLang(f.otherCulture, `rv${f.idx}`);
		return `${fullPersonName(nl.L, nl.sphere).plain}, ${role} of ${theirName}`;
	}
	const roles = PERSON_ROLES[form];
	const pool = sim.people.filter(
		(p) => p.culture === cu && p.id && p.name && roles.includes(p.role) && p.born + 16 <= year && (p.died ?? 1e9) >= year && (ctx.used.get(p.name) ?? 0) < 1
	);
	if (pool.length && rng.chance(0.65)) {
		const p = weightedPick(rng, pool.slice(0, 40).map((x) => [x, 1 + Math.max(0, x.renown) / 20] as [Person, number]));
		ctx.used.set(p.name, (ctx.used.get(p.name) ?? 0) + 1);
		const st = sim.polities[p.state];
		const label = PERSON_LABEL[p.role] ?? p.role;
		return st && (p.role === 'ruler' || p.role === 'general') ? `${p.name}, ${label} of ${st.name}` : `${p.name}, ${label}`;
	}
	return `${ctx.person()}, ${side === 'dissident' ? `exiled ${role}` : role}`;
}

function revealOf(f: Fact, bias: LitBias, side: Side, v: { nV: number; nT: number; O: string; T: string; deity: string; unit: string; unitT: string }): string {
	const u = v.unit;
	if (f.idx < 0) {
		if (f.kind === 'founding') return `Names ${f.place} as the first hearth of ${f.B}; ${f.y >= 1 ? `the annals date it to year ${f.y}` : 'it is older than the count of years'}.`;
		if (f.kind === 'hero') return `${f.A} was a real figure of ${f.place}; the tellers have grown the deeds since.`;
		return `A legend placed at ${f.place}; no annal records ${f.B} there, so it may be older than the count of years.`;
	}
	const same = v.nV === v.nT;
	let r: string;
	switch (bias) {
		case 'propagandist': r = same ? `A flattering account of ${f.place}, year ${f.y}: it softens the loss and lifts ${v.O}.` : `Flattering lie: claims ${fmtN(v.nV)} ${u}; the annals say about ${fmtN(v.nT)} (${f.place}, year ${f.y}).`; break;
		case 'pious': r = `A true fact, glossed: ${f.place}, year ${f.y}, about ${fmtN(v.nT)} ${v.unitT}; the divine cause is the author's addition.`; break;
		case 'cynical': r = `A true fact: ${f.place}, year ${f.y}; cynics count ${fmtN(v.nV)} ${u}, the annals about ${fmtN(v.nT)}.`; break;
		case 'partisan': r = `Blames ${v.T}; in truth ${f.A} and ${f.B} both bear it (${f.place}, year ${f.y}).`; break;
		case 'romantic': r = `${f.place} and year ${f.y} are true; ${fmtN(v.nV)} ${u} is rounded up, the annals say about ${fmtN(v.nT)}.`; break;
		default: r = `A sober record: ${f.place}, year ${f.y}, about ${fmtN(v.nT)} ${v.unitT}.`;
	}
	if (side === 'rival') r = `A rival's pen: ${r}`;
	return r;
}

// ---------- poetic forms ----------

interface FormCtx { fam: Family; banks: Banks; T: ReturnType<typeof cultureTongue>; home: string; person: () => string; reg: Register; traits: TraitKey[] }

interface Arch {
	id: string;
	keys: [string, string];
	rule: string;
	make: (c: FormCtx, rng: Rng) => string[];
}

function genForms(sim: Simulation, cu: number, salt: number, c: FormCtx): PoeticForm[] {
	void sim;
	const rng = makeRng(`${sim.w.opts.seed}:cp:forms:${cu}:${salt}`);
	const w = c.T.w;
	const B = c.banks;
	const num = c.T.num;
	const pick = (a: string[]) => rng.pick(a);
	const archs: Arch[] = [
		{
			id: 'refrain', keys: ['song', 'hearth'], rule: 'Three lines of image, then a refrain that returns after every verse.',
			make: () => [`${cap(pick(B.sky))} on the ${pick(B.land)},`, `the ${pick(B.beast)} gone down to the water,`, `${c.home} asleep, and the ${pick(B.work)} still.`, `${cap(w.hearth)}, ${w.hearth}, ${w.keep} ${w.you}! (hearth, hearth, keep you)`]
		},
		{
			id: 'riddle', keys: ['word', 'night'], rule: 'Two lines of clues and a third that gives the answer, always a plain thing.',
			make: () => { const r = rng.pick(RIDDLES); return [r[0], r[1], `Answer: ${r[2]}.`]; }
		},
		{
			id: 'call', keys: ['song', 'road'], rule: 'One voice calls a line and the company answers with its last word.',
			make: () => { const a = pick(B.land); const b = pick(B.beast); return [`Call: Who keeps the ${a}?`, `All: The ${a}!`, `Call: Who feeds the ${b}?`, `All: The ${b}!`]; }
		},
		{
			id: 'catalog', keys: ['word', 'salt'], rule: 'A list of things said in one breath, closing on the singer\'s own name.',
			make: () => [`The ${pick(B.beast)}, the ${pick(B.work)}, the ${pick(B.land)}, the ${pick(B.sky)}, and ${c.person().split(' ')[0]}.`, 'Say it in one breath, or begin again.']
		},
		{
			id: 'turn', keys: ['word', 'fire'], rule: 'Four lines: two of praise, a third that turns on "but", and a fourth that bites.',
			make: () => [`How fine the ${pick(B.land)} under the ${pick(B.sky)},`, `how full the halls of the ${pick(B.work)} makers,`, `but who counts what the ${pick(B.beast)} took?`, 'Not the one who laid the table.']
		},
		{
			id: 'count', keys: ['life', 'word'], rule: 'A counting verse: each line names as many things as its number.',
			make: () => [`${cap(num[0])}: the ${pick(B.sky)}.`, `${cap(num[1])}: the ${pick(B.beast)} and the ${pick(B.work)}.`, `${cap(num[2])}: the ${pick(B.land)}, the road, and ${c.home}.`]
		},
		{
			id: 'praise', keys: ['king', 'word'], rule: 'A string of praise-names, each opening "one who", ending on the subject\'s own name.',
			make: () => [`One who feeds the ${pick(B.beast)}, one who warms the ${pick(B.land)},`, `one who outlasts the ${pick(B.sky)}: ${c.person().split(' ')[0]}.`]
		},
		{
			id: 'couplet', keys: ['wine', 'word'], rule: 'Couplets that all end on one return word; here the word is "hearth".',
			make: () => [`The ${pick(B.sky)} forgets the ${pick(B.land)}, but not my hearth.`, `The ${pick(B.work)} forgets the ${pick(B.beast)}, but not my hearth.`]
		},
		{
			id: 'allit', keys: ['sword', 'song'], rule: 'Four beats to a line, and at least two of them begin on the same sound.',
			make: () => rng.shuffle(ALLIT).slice(0, 3)
		},
		{
			id: 'short', keys: ['word', 'stone'], rule: 'Three lines of five, seven and five syllables.',
			make: () => { const a = rng.shuffle(SYL5); return [a[0], pick(SYL7), a[1]]; }
		},
		{
			id: 'boast', keys: ['sword', 'word'], rule: 'First-person boasts before a fight, ending on a challenge to the foe.',
			make: () => [`I crossed the ${pick(B.land)} under a ${pick(B.sky)}, alone.`, `I buried my father at ${c.home}.`, `Now let ${pick(B.foe)} step forward and say a name.`]
		},
		{
			id: 'dirge', keys: ['death', 'song'], rule: 'Four lines: the hush, the idle tool, the name of the dead, the road they take.',
			make: () => [`The ${pick(B.sky)} lies still.`, `The ${pick(B.work)} is not touched.`, `Here lies ${c.person().split(' ')[0]}, who kept the ${pick(B.land)}.`, `Go by the ${pick(B.land)} road, and do not look back.`]
		}
	];
	const WEIGHTS: Record<Family, Record<string, number>> = {
		east: { short: 4, turn: 3, riddle: 2, refrain: 2, dirge: 1 },
		monsoon: { couplet: 3, refrain: 3, catalog: 2, praise: 2, riddle: 1 },
		steppe: { boast: 4, call: 3, count: 2, allit: 2, praise: 1 },
		desert: { couplet: 4, riddle: 3, praise: 2, catalog: 2, refrain: 1 },
		afr: { praise: 4, call: 3, riddle: 3, count: 1, refrain: 1 },
		amer: { count: 3, refrain: 3, call: 2, dirge: 2, praise: 1 },
		sea: { call: 4, count: 2, dirge: 3, refrain: 2, short: 1 },
		north: { allit: 4, boast: 3, dirge: 3, riddle: 2, turn: 1 },
		eldritch: { count: 4, riddle: 3, catalog: 2, dirge: 2, couplet: 1 }
	};
	const boost: Partial<Record<TraitKey, string[]>> = {
		martial: ['boast'], pious: ['refrain', 'dirge'], scholarly: ['riddle', 'turn'], seafaring: ['call'], mercantile: ['catalog'], ancestral: ['dirge', 'praise'], nomadic: ['call', 'allit'], insular: ['count']
	};
	const weights = archs.map((a) => {
		let wt = WEIGHTS[c.fam][a.id] ?? 0.4;
		for (const t of c.traits) if (boost[t]?.includes(a.id)) wt += 1.5;
		return [a, wt] as [Arch, number];
	});
	const count = rng() < 0.45 ? 4 : 3;
	const chosen: Arch[] = [];
	const pool = [...weights];
	while (chosen.length < count && pool.length) {
		const a = weightedPick(rng, pool);
		chosen.push(a);
		pool.splice(pool.findIndex((x) => x[0] === a), 1);
	}
	return chosen.map((a) => {
		const nm = `${cap(w[a.keys[0]])} ${cap(w[a.keys[1]])}`;
		const gloss = `${a.keys[0]} + ${a.keys[1]}`;
		return { name: nm, rule: `${a.rule} (${gloss})`, example: a.make(c, rng).slice(0, 4) };
	});
}
