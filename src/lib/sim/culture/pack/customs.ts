/**
 * Culture pack, customs part: taboos, etiquette, hospitality, rites, festival rituals, law and ideals
 * for one culture, built from sphere, culture traits, home biome, species, faith, the realm's ideology,
 * era and genre. Pure and deterministic: every random choice uses a side rng seeded from the world seed,
 * `sim.rng` is never touched and nothing is mutated.
 */
import { makeRng, type Rng } from '../../../rng';
import { makeLang, makeName } from '../../../gen/names';
import type { Simulation } from '../../engine';
import type { Etiquette, FeastRitual, Hospitality, LawEntry, Punishment, Rite, Taboo, CustomsPack } from '../../../adventure/culturepack';
import { cultureProfile } from '../profile';
import { FEAST_MONTH, SPHERE_CULTURE, FALLBACK_CULTURE } from '../data';
import {
	BREACHES, BREACH_GENRE, COLOR_RULES, DESERT_TABOO, DUTIES, ETIQUETTE, FALLBACK_FLAV, GENRE_ETIQUETTE, GENRE_FLAV, GENRE_TABOOS,
	IDEAL_DEATH, IDEAL_DEATH_GENRE, IDEAL_HOST, IDEAL_NAME, IDEAL_WEALTH, IDEAL_WEALTH_GENRE, OFFER_FIRST, OFFER_FIRST_GENRE, OFFER_FOOD,
	OFFER_LAST, OFFER_ROOF, OFFER_ROOF_NOMAD, SPECIES_EXTRA, SPHERE_FLAV, TABOOS, TYPE_TABOOS
} from './customs_data';
import {
	CRIME_BASE, CRIME_CLAUSE, FEASTS, FEAST_GENRE_CUSTOM, JUDGE_BY_GENRE, JUDGE_BY_IDEOLOGY, JUDGE_BY_TRAIT, ORDEALS, ORDEAL_GENRE, PUNISH_CLAUSE,
	RITES, type RiteId, type V
} from './customs_rites_data';

type Ctx = Record<string, string>;

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** fill our own <token> placeholders; {schema} placeholders are left for the engine */
function fill(s: string, ctx: Ctx): string {
	return s.replace(/<(\w+)>/g, (_, k: string) => {
		const v = ctx[k.toLowerCase()] ?? '';
		return k[0] !== k[0].toLowerCase() ? cap(v) : v;
	});
}

/** weight of a tagged item for this culture: untagged 1, matching tags raise it, a miss is rare */
function wt(tags: string, traits: string[], genre: string, ideology: string): number {
	if (!tags) return 1;
	let hit = 0;
	for (const t of tags.split(' ')) if (traits.includes(t) || t === genre || t === ideology) hit++;
	return hit ? 1 + 2 * hit : 0.12;
}

function pickV(rng: Rng, vs: V[], traits: string[], genre: string, ideology: string): string {
	return rng.weighted(vs.map((v) => v[1]), vs.map((v) => wt(v[0], traits, genre, ideology)));
}

function sample<T>(rng: Rng, arr: readonly T[], n: number): T[] {
	return rng.shuffle(arr).slice(0, n);
}

const IDEOLOGY_BY_TRAIT: Record<string, string> = { pious: 'theocracy', mercantile: 'oligarchy', nomadic: 'communal', scholarly: 'technocracy', martial: 'autocracy' };

interface Base {
	sim: Simulation;
	cu: number;
	sphere: string;
	traits: string[];
	genre: string;
	era: number;
	ideology: string;
	doctrine: string;
	species: string;
	type: string;
	biome: number;
	desert: boolean;
	ctx: Ctx;
	seed: string;
}

function build(sim: Simulation, cu: number): Base | null {
	const w = sim.w;
	const cult = w.cultures[cu];
	if (!cult) return null;
	const prof = cultureProfile(w, cu);
	const traits: string[] = prof.traits.slice();
	const genre = sim.voice;
	const sphere = cult.sphere || '';
	// the realm that carries this culture: the largest living one, else the owner of the culture's centre
	let realm = undefined as (typeof sim.polities)[number] | undefined;
	for (const p of sim.polities) if (p.alive && p.id && p.culture === cu && (!realm || p.cells > realm.cells)) realm = p;
	if (!realm && cult.center >= 0) realm = sim.polities[w.cells.state[cult.center]];
	const faith = w.religions.find((r) => r.culture === cu && r.type !== 'Cult') ?? w.religions.find((r) => r.id === realm?.religion);
	const ideology = realm?.ideology ?? IDEOLOGY_BY_TRAIT[traits.find((t) => IDEOLOGY_BY_TRAIT[t]) ?? ''] ?? 'monarchy';
	const doctrine = faith?.doctrine ?? (traits.includes('ancestral') ? 'ancestral' : traits.includes('martial') ? 'militant' : 'caste');
	const biome = cult.center >= 0 && cult.layer === 'surface' ? w.cells.biome[cult.center] : 4;
	const sf = SPHERE_FLAV[sphere] ?? FALLBACK_FLAV;
	const gf = GENRE_FLAV[genre] ?? GENRE_FLAV.fantasy;
	const sc = SPHERE_CULTURE[sphere] ?? FALLBACK_CULTURE;
	const seed = String(w.opts.seed);
	const crng = makeRng(`${seed}:cp:ctx:${cu}`);
	const [col, who] = crng.pick(COLOR_RULES);
	const ctx: Ctx = {
		drink: sf.drink, staple: sf.staple, gesture: sf.gesture, gift: sf.gifts[0], gift2: sf.gifts[1], gift3: sf.gifts[2], head: sf.head,
		elder: sf.elder, seat: sf.seat, anc: sf.anc, hall: gf.hall, weapon: gf.weapon, oath: gf.oath, mark: gf.mark, light: gf.light, coin: gf.coin,
		house: traits.includes('nomadic') && genre !== 'cyberpunk' ? 'tent' : gf.house, sfood: sc.food, sdress: sc.dress, smusic: sc.music, col: col.toLowerCase(), who
	};
	return { sim, cu, sphere, traits, genre, era: sim.era, ideology, doctrine, species: cult.species ?? 'human', type: cult.type, biome, desert: biome === 1 || biome === 2, ctx, seed };
}

// ---------- taboos ----------

function softenPenalty(pen: Punishment, b: Base): Punishment {
	const soft = b.era >= 3 || b.doctrine === 'compassion' || b.genre === 'solarpunk';
	if (soft && (pen === 'hang' || pen === 'mutilation')) return 'exile';
	if (soft && pen === 'lash') return 'fine';
	if (b.doctrine === 'compassion' && pen === 'duel') return 'scorn';
	if (b.ideology === 'republic' && pen === 'mutilation') return 'lash';
	return pen;
}

function genTaboos(b: Base): Taboo[] {
	const rng = makeRng(`${b.seed}:cp:taboo:${b.cu}`);
	const out: Taboo[] = [];
	const seen = new Set<string>();
	const add = (t: { act: Taboo['act']; sev: 1 | 2 | 3; pen: Punishment; where: Taboo['where'] | ''; text: string; rebuke: string }) => {
		if (seen.has(t.act)) return;
		seen.add(t.act);
		const x: Taboo = { id: `tb_${t.act}`, act: t.act, text: fill(t.text, b.ctx), severity: t.sev, penalty: softenPenalty(t.pen, b), rebuke: fill(t.rebuke, b.ctx) };
		if (t.where) x.where = t.where;
		out.push(x);
	};
	const extras: (typeof TABOOS)[number][] = [];
	const ge = GENRE_TABOOS[b.genre];
	if (ge?.length) extras.push(rng.pick(ge));
	const se = SPECIES_EXTRA[b.species];
	if (se) extras.push(se.taboo);
	const te = TYPE_TABOOS[b.type];
	if (te && rng.chance(0.85)) extras.push(te);
	if (b.desert && (b.traits.includes('nomadic') || b.genre === 'wasteland') && rng.chance(0.8)) extras.push(DESERT_TABOO);
	for (const t of extras) add(t);
	const n = Math.min(10, Math.max(6, 6 + rng.int(0, 4)));
	const scored = TABOOS.map((t) => {
		let s = 0;
		for (const tag of t.tr.split(' ')) if (b.traits.includes(tag)) s += tag === b.traits[0] ? 3 : 2;
		return { t, s: s + rng() * 1.4 };
	}).sort((a, c) => c.s - a.s);
	for (const { t } of scored) {
		if (out.length >= n) break;
		add(t);
	}
	// keep a stable, readable order: harshest first
	return out.sort((x, y) => y.severity - x.severity);
}

// ---------- etiquette ----------

const KINDS: Etiquette['kind'][] = ['greeting', 'gesture', 'gift', 'food', 'speech', 'dress', 'space', 'time'];

function genEtiquette(b: Base): Etiquette[] {
	const rng = makeRng(`${b.seed}:cp:etiq:${b.cu}`);
	interface C { kind: Etiquette['kind']; text: string; r: number; s: number }
	const cands: C[] = [];
	const push = (kind: Etiquette['kind'], tr: string, r: number, text: string, bonus: number) => {
		let s = 0;
		if (!tr) s = 0.6;
		else for (const tag of tr.split(' ')) if (b.traits.includes(tag)) s += tag === b.traits[0] ? 3 : 2; else if (tag === b.genre) s += 2;
		cands.push({ kind, text: fill(text, b.ctx), r, s: s + bonus + rng() * 1.5 });
	};
	for (const e of ETIQUETTE) push(e.kind, e.tr, e.r, e.text, 0);
	for (const e of GENRE_ETIQUETTE[b.genre] ?? []) push(e.kind, e.tr, e.r, e.text, 2.5);
	const se = SPECIES_EXTRA[b.species];
	if (se) push(se.etiq[0], '', 2, se.etiq[1], 4);
	const chosen: C[] = [];
	for (const k of KINDS) {
		const best = cands.filter((c) => c.kind === k).sort((x, y) => y.s - x.s)[0];
		if (best) chosen.push(best);
	}
	const n = 8 + rng.int(0, 4);
	for (const c of cands.sort((x, y) => y.s - x.s)) {
		if (chosen.length >= n) break;
		if (!chosen.includes(c) && !chosen.some((o) => o.text === c.text)) chosen.push(c);
	}
	chosen.sort((x, y) => KINDS.indexOf(x.kind) - KINDS.indexOf(y.kind));
	return chosen.map((c, i) => ({ id: `et_${c.kind}_${i}`, kind: c.kind, text: c.text, reward: Math.max(1, Math.min(3, c.r)) }));
}

// ---------- hospitality ----------

function genHospitality(b: Base): Hospitality {
	const rng = makeRng(`${b.seed}:cp:host:${b.cu}`);
	let guestRight = 3;
	if (b.traits.includes('nomadic')) guestRight = b.desert ? 40 : 9;
	else if (b.desert) guestRight = 9;
	else if (b.traits.includes('insular')) guestRight = 1;
	const nomad = b.traits.includes('nomadic');
	const gFirst = OFFER_FIRST_GENRE[b.genre];
	const first = gFirst && rng.chance(0.65) ? rng.pick(gFirst) : rng.pick(OFFER_FIRST);
	const roofPool = nomad ? OFFER_ROOF_NOMAD.concat(OFFER_ROOF.slice(0, 1)) : OFFER_ROOF;
	const offers = [first, rng.pick(OFFER_FOOD), rng.pick(roofPool)];
	if (guestRight > 1 && rng.chance(0.75)) offers.push(rng.pick(OFFER_LAST));
	const duels = DUTIES.map(([text, tags]) => ({ text, s: wt(tags, b.traits, b.genre, b.ideology) * (0.6 + rng()) }));
	duels.sort((x, y) => y.s - x.s);
	const duties = duels.slice(0, 3 + (rng.chance(0.5) ? 1 : 0)).map((d) => fill(d.text, b.ctx));
	const gb = BREACH_GENRE[b.genre];
	const breach = gb && rng.chance(0.45)
		? gb
		: rng.weighted(BREACHES.map((x) => x[0]), BREACHES.map((x) => wt(x[1], b.traits, b.genre, b.ideology)));
	return { guestRight, offers: offers.map((o) => fill(o, b.ctx)), duties, breach: fill(breach, b.ctx) };
}

// ---------- rites ----------

function riteName(rng: Rng, L: ReturnType<typeof makeLang>, def: { names: string[] }): string {
	const rn = rng.pick(def.names);
	const word = cap(makeName(L, 'land'));
	const r = rng();
	if (r < 0.3) return rn;
	if (r < 0.7) return `${word} ${rn}`;
	return `${rn} of ${word}`;
}

function genRites(b: Base): Rite[] {
	const rng = makeRng(`${b.seed}:cp:rites:${b.cu}`);
	const L = makeLang(`${b.seed}:cp:lang:${b.cu}`, b.sphere || undefined);
	const ids: RiteId[] = ['birth', 'naming', 'comingofage', 'betrothal', 'wedding', 'funeral', 'oath'];
	if (b.traits.includes('martial') || b.traits.includes('scholarly')) ids.push('initiation');
	const out: Rite[] = [];
	for (const id of ids) {
		const def = RITES[id];
		const steps: string[] = [];
		def.slots.forEach((slot, i) => {
			if (def.slots.length >= 5 && i > 0 && i < def.slots.length - 1 && rng.chance(0.18)) return;
			steps.push(pickV(rng, slot, b.traits, b.genre, b.ideology));
		});
		const g = def.genre[b.genre];
		if (g) steps.splice(rng.int(1, steps.length), 0, g);
		while (steps.length > 7) steps.splice(rng.int(1, steps.length - 2), 1);
		const rite: Rite = {
			id, name: riteName(rng, L, def), steps: steps.map((s) => fill(s, b.ctx)),
			roles: sample(rng, def.roles, 2 + (rng.chance(0.5) ? 1 : 0)).map((s) => fill(s, b.ctx)),
			gifts: sample(rng, def.gifts, 1 + rng.int(0, 2)).map((s) => fill(s, b.ctx)),
			dress: fill(rng.pick(def.dress), b.ctx), song: fill(rng.pick(def.song), b.ctx)
		};
		out.push(rite);
	}
	return out;
}

// ---------- festivals ----------

function genFestivals(b: Base): FeastRitual[] {
	const prof = cultureProfile(b.sim.w, b.cu);
	const out: FeastRitual[] = [];
	for (const [name, kind] of prof.feasts) {
		const rng = makeRng(`${b.seed}:cp:feast:${b.cu}:${name}`);
		const def = FEASTS[kind];
		if (!def) continue;
		// pick 3 to 6 steps, preferring distinct moments of the day
		const k = 3 + rng.int(0, 3);
		let pool = def.steps.slice();
		const picked: [number, string][] = [];
		while (picked.length < k && pool.length) {
			const s = rng.weighted(pool, pool.map((p) => wt(p[2], b.traits, b.genre, b.ideology)));
			picked.push([s[0], s[1]]);
			pool = pool.filter((p) => p[0] !== s[0]);
			if (!pool.length && picked.length < k) pool = def.steps.filter((p) => !picked.some((q) => q[1] === p[1]));
		}
		picked.sort((a, c) => a[0] - c[0]);
		const offerings = sample(rng, def.offerings, 2 + rng.int(0, 1));
		const gc = FEAST_GENRE_CUSTOM[b.genre];
		const custom = gc && rng.chance(0.35) ? gc : rng.pick(def.custom);
		const fr: FeastRitual = {
			feast: name, steps: picked.map((p) => fill(p[1], b.ctx)), offerings: offerings.map((o) => fill(o, b.ctx)),
			dress: fill(rng.pick(def.dress), b.ctx), food: fill(rng.pick(def.food), b.ctx), song: fill(rng.pick(def.song), b.ctx),
			taboo: fill(rng.pick(def.taboo), b.ctx), custom: fill(custom, b.ctx)
		};
		out.push(fr);
	}
	void FEAST_MONTH;
	return out;
}

// ---------- law ----------

const WEREGILD_SPHERES = new Set(['norse', 'celtic', 'arabic', 'steppe', 'bantu', 'yoruba', 'ethiopic', 'turtle', 'mande']);

function punishWeights(crime: LawEntry['crime'], b: Base, weregildCulture: boolean): Partial<Record<Punishment, number>> {
	const w: Partial<Record<Punishment, number>> = { ...CRIME_BASE[crime] };
	const mul = (p: Punishment, k: number) => { if (w[p] !== undefined) w[p]! *= k; };
	const many = (o: Partial<Record<Punishment, number>>) => { for (const p in o) mul(p as Punishment, o[p as Punishment]!); };
	switch (b.ideology) {
		case 'autocracy': many({ hang: 1.8, mutilation: 1.8, lash: 1.5, fine: 0.7 }); break;
		case 'monarchy': many({ hang: 1.2, mutilation: 1.1 }); break;
		case 'republic': many({ exile: 1.6, fine: 1.5, hang: 0.4, mutilation: 0.2, lash: 0.6 }); break;
		case 'theocracy': many({ lash: 1.3, ordeal: 1.5, exile: 1.2 }); if (crime === 'blasphemy') many({ hang: 2, lash: 1.4 }); break;
		case 'oligarchy': many({ fine: 1.8, enslave: 1.8, exile: 1.2 }); break;
		case 'communal': many({ scorn: 2, exile: 1.5, fine: 1.2, hang: 0.3, mutilation: 0.1 }); break;
		case 'technocracy': many({ fine: 1.8, exile: 1.5, hang: 0.2, mutilation: 0, lash: 0.3, scorn: 1.3 }); break;
	}
	switch (b.doctrine) {
		case 'caste': many({ lash: 1.4, enslave: 1.6 }); break;
		case 'militant': many({ hang: 1.5, duel: 2 }); break;
		case 'compassion': many({ hang: 0, mutilation: 0, lash: 0.2, fine: 1.5, scorn: 1.8, exile: 1.4 }); break;
		case 'liberation': many({ scorn: 1.8, fine: 1.4, hang: 0.3, mutilation: 0.2 }); break;
		case 'esoteric': many({ ordeal: 2.5 }); break;
		case 'ancestral': many({ weregild: 2, exile: 1.3 }); break;
		case 'blood_offering': many({ hang: 1.8 }); break;
		case 'sacred_grove': many({ exile: 1.5, fine: 1.3 }); break;
		case 'mountain_pact': many({ weregild: 1.5, duel: 1.5 }); break;
	}
	if (b.era >= 3) many({ hang: 0.3, mutilation: 0, lash: 0.3, enslave: 0, ordeal: 0.3, exile: 1.2, fine: 1.5 });
	else if (b.era === 2) many({ mutilation: 0.3, lash: 0.7, enslave: 0.3 });
	else if (b.era === 0) many({ hang: 1.3, mutilation: 1.3 });
	switch (b.genre) {
		case 'cyberpunk': many({ fine: 1.5, enslave: crime === 'debt' ? 2 : 1, exile: 1.3 }); break;
		case 'wasteland': many({ exile: 1.6, hang: 1.5, lash: 1.3, fine: 0.5 }); break;
		case 'solarpunk': many({ scorn: 1.8, exile: 1.4, hang: 0, mutilation: 0, lash: 0.1, enslave: 0 }); break;
		case 'atompunk': many({ exile: 1.3, fine: 1.3, mutilation: 0 }); break;
		case 'steampunk': many({ lash: 1.2, fine: 1.2 }); break;
		case 'twilight': many({ ordeal: 1.5, fine: 1.3 }); break;
		case 'dieselpunk': many({ fine: 1.3, lash: 1.1 }); break;
		case 'biopunk': many({ exile: 1.3 }); break;
		case 'mythic': many({ ordeal: 1.6, duel: 1.4, hang: 1.2 }); break;
		case 'fantasy': many({ ordeal: 1.2 }); break;
	}
	for (const t of b.traits) {
		if (t === 'martial') many({ duel: 1.6, hang: 1.2 });
		else if (t === 'mercantile') many({ fine: 1.5 });
		else if (t === 'pious') many({ ordeal: 1.3 });
		else if (t === 'scholarly') many({ fine: 1.3, scorn: 1.3 });
		else if (t === 'insular') many({ exile: 1.5 });
		else if (t === 'nomadic') many({ exile: 1.2, weregild: 1.5 });
	}
	if (weregildCulture) {
		if (crime === 'murder') { w.weregild = (CRIME_BASE.murder.weregild ?? 1) * 8; mul('hang', 0.5); }
		else if (crime === 'assault') { w.weregild = (CRIME_BASE.assault.weregild ?? 0.5) * 10; }
	}
	return w;
}

function composeNote(rng: Rng, crime: LawEntry['crime'], pun: Punishment, b: Base): string {
	const cl = CRIME_CLAUSE[crime];
	const pl = PUNISH_CLAUSE[pun];
	let best = '';
	for (let i = 0; i < 10; i++) {
		const a = fill(rng.pick(cl), b.ctx);
		const p = fill(rng.pick(pl), b.ctx);
		const both = `${a} ${p}`;
		if (both.length <= 118) return both;
		if (!best || p.length < best.length) best = p;
	}
	return best;
}

function genLaw(b: Base): NonNullable<CustomsPack['law']> {
	const rng = makeRng(`${b.seed}:cp:law:${b.cu}`);
	// who judges
	const trait = b.traits.find((t) => JUDGE_BY_TRAIT[t]);
	const kinds: { k: string[]; w: number }[] = [{ k: JUDGE_BY_IDEOLOGY[b.ideology] ?? JUDGE_BY_IDEOLOGY.monarchy, w: 1 }];
	if (trait) kinds.push({ k: JUDGE_BY_TRAIT[trait], w: b.traits.includes('nomadic') && b.ideology !== 'theocracy' ? 2.5 : 0.8 });
	const gj = JUDGE_BY_GENRE[b.genre];
	if (gj) kinds.push({ k: gj, w: 0.9 });
	const judge = fill(rng.pick(rng.weighted(kinds.map((x) => x.k), kinds.map((x) => x.w))), b.ctx);
	// ordeal
	let ordeal: string | undefined;
	const pOrd = (b.era >= 3 || b.doctrine === 'compassion') && b.genre !== 'wasteland' ? 0.25 : b.doctrine === 'esoteric' || b.traits.includes('pious') ? 0.8 : 0.55;
	if (rng.chance(pOrd)) {
		const go = ORDEAL_GENRE[b.genre];
		ordeal = go && rng.chance(0.4) ? go : rng.weighted(ORDEALS.map((o) => o[0]), ORDEALS.map((o) => wt(o[1], b.traits, b.genre, b.ideology)));
		ordeal = fill(ordeal, b.ctx);
	}
	const sc = (WEREGILD_SPHERES.has(b.sphere) ? 1 : 0) + (b.traits.includes('ancestral') ? 1 : 0) + (b.traits.includes('nomadic') ? 1 : 0)
		+ (b.traits.includes('martial') ? 0.5 : 0) + (b.doctrine === 'ancestral' ? 1 : 0);
	const weregildCulture = sc >= 2 && !(b.era >= 3 && (b.ideology === 'republic' || b.ideology === 'technocracy'));
	const crimes: LawEntry['crime'][] = ['theft', 'murder', 'adultery', 'blasphemy', 'debt', 'trespass', 'assault', 'treason'];
	const extra: LawEntry['crime'][] = ['forgery', 'smuggling'];
	for (const c of extra) if (rng.chance(0.65)) crimes.push(c);
	if (crimes.length < 9 && !crimes.includes('forgery')) crimes.push('forgery');
	const entries: LawEntry[] = [];
	for (const crime of crimes) {
		const w = punishWeights(crime, b, weregildCulture);
		const keys = (Object.keys(w) as Punishment[]).filter((k) => (w[k] ?? 0) > 0);
		const punish = keys.length ? rng.weighted(keys, keys.map((k) => w[k]!)) : 'fine';
		entries.push({ crime, punish, note: composeNote(rng, crime, punish, b) });
	}
	const out: NonNullable<CustomsPack['law']> = { judge, entries };
	if (ordeal) out.ordeal = ordeal;
	return out;
}

// ---------- ideals ----------

function genIdeals(b: Base): NonNullable<CustomsPack['ideals']> {
	const rng = makeRng(`${b.seed}:cp:ideals:${b.cu}`);
	const pickFrom = (m: Record<string, string[]>): string => {
		const t = b.traits[rng.chance(0.7) ? 0 : Math.min(1, b.traits.length - 1)];
		return rng.pick(m[t] ?? m.ancestral);
	};
	const gd = IDEAL_DEATH_GENRE[b.genre];
	const gw = IDEAL_WEALTH_GENRE[b.genre];
	return {
		death: fill(gd && rng.chance(0.45) ? gd : pickFrom(IDEAL_DEATH), b.ctx),
		host: fill(pickFrom(IDEAL_HOST), b.ctx),
		name: fill(pickFrom(IDEAL_NAME), b.ctx),
		wealth: fill(gw && rng.chance(0.55) ? gw : pickFrom(IDEAL_WEALTH), b.ctx)
	};
}

// ---------- entry point ----------

/** the customs of culture `cu`: taboos, etiquette, hospitality, rites, festival rituals, law and ideals */
export function genCustoms(sim: Simulation, cu: number): CustomsPack {
	const b = build(sim, cu);
	if (!b) return {};
	return {
		taboos: genTaboos(b),
		etiquette: genEtiquette(b),
		hospitality: genHospitality(b),
		rites: genRites(b),
		festivals: genFestivals(b),
		law: genLaw(b),
		ideals: genIdeals(b)
	};
}
