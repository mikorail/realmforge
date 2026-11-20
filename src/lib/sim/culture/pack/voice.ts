/**
 * Culture voice for the Wanderer export: register, phrase lists, proverbs, barks (genVoice) and the
 * speech habits of notable people (genPersonVoice). Pure and deterministic: side rngs only.
 */
import { makeRng, hashSeed, type Rng } from '../../../rng';
import type { Simulation } from '../../engine';
import type { Person } from '../../types';
import { SPHERE_BY_ID } from '../../../gen/spheres';
import { DOCTRINES } from '../../../gen/religions';
import type { Genre } from '../../../gen/genre';
import { cultureProfile, type TraitKey } from '../profile';
import type { PersonVoice, Rank, Register, VoicePack } from '../../../adventure/culturepack';
import {
	BARK_KEYS, BELIEF_DOCTRINE, BELIEF_IDEOLOGY, COMMON_IDIOMS, DOMAIN_IDIOMS, DOMAIN_LEX, DOMAIN_PROVERBS, FRIEND_WORD, GENRE, QUIRKS_GENERAL,
	QUIRKS_ROLE, REG, REG_HONOR, TICS, VALUE_BELIEF_TPL, VALUE_PROVERBS, type Domain
} from './voice_data';

const REGISTERS: Register[] = ['formal', 'blunt', 'flowery', 'terse', 'earthy', 'courtly'];
type Score = Partial<Record<Register, number>>;

const SPHERE_REG: Record<string, Score> = {
	sinic: { formal: 2, courtly: 1.5, terse: 0.5 }, japonic: { courtly: 2, formal: 1.5, terse: 1 }, indic: { flowery: 2, formal: 1 },
	sea: { flowery: 1.5, earthy: 1 }, steppe: { blunt: 2.5, terse: 1, earthy: 0.5 }, persian: { flowery: 2.5, courtly: 2 },
	arabic: { flowery: 2, formal: 1.5 }, mande: { earthy: 1.5, formal: 1, flowery: 0.5 }, yoruba: { flowery: 1.5, earthy: 1, formal: 1 },
	bantu: { earthy: 2, flowery: 0.5 }, ethiopic: { formal: 2, courtly: 1 }, nahua: { formal: 1.5, blunt: 1, flowery: 1 },
	maya: { formal: 1.5, flowery: 1 }, andean: { terse: 1.5, earthy: 1, formal: 0.5 }, turtle: { terse: 1.5, earthy: 1, flowery: 0.5 },
	inuit: { terse: 3, earthy: 0.5 }, polynesian: { flowery: 1.5, earthy: 1.5 }, norse: { blunt: 2.5, terse: 1 },
	celtic: { flowery: 1.5, earthy: 1.5 }, latin: { formal: 2, blunt: 1 }, slavic: { earthy: 2, blunt: 1 }, eldritch: { terse: 1, formal: 1, flowery: 1 }
};
const TRAIT_REG: Record<TraitKey, Score> = {
	martial: { blunt: 1.5, terse: 0.5 }, mercantile: { courtly: 0.8, formal: 0.5 }, scholarly: { formal: 1, flowery: 0.7, courtly: 0.5 },
	ancestral: { formal: 1, earthy: 0.5 }, pious: { flowery: 1, formal: 0.5, courtly: 0.3 }, seafaring: { blunt: 0.7, earthy: 0.8 },
	nomadic: { blunt: 1, terse: 1 }, insular: { terse: 1.2, formal: 0.3 }
};
const IDEO_REG: Record<string, Score> = {
	monarchy: { courtly: 1, formal: 0.7 }, republic: { blunt: 0.6, formal: 0.5 }, theocracy: { formal: 1, flowery: 0.6 },
	oligarchy: { courtly: 1, formal: 0.6 }, autocracy: { blunt: 1, terse: 0.8 }, communal: { earthy: 1.2, blunt: 0.4 }, technocracy: { formal: 1, terse: 0.6 }
};
const GENRE_REG: Record<Genre, Score> = {
	fantasy: { courtly: 0.4, earthy: 0.3 }, mythic: { flowery: 0.9, formal: 0.4 }, steampunk: { formal: 0.8, courtly: 0.4 }, dieselpunk: { blunt: 1, terse: 0.6 },
	atompunk: { earthy: 0.5, blunt: 0.5 }, cyberpunk: { terse: 1, blunt: 0.8 }, biopunk: { earthy: 0.8, flowery: 0.3 }, solarpunk: { earthy: 0.6, flowery: 0.8 },
	wasteland: { terse: 1, blunt: 1 }, twilight: { courtly: 0.8, flowery: 0.5 }
};

function addScore(tot: Record<Register, number>, s?: Score) {
	if (s) for (const k in s) tot[k as Register] += s[k as Register]!;
}

/** n distinct picks in shuffled order */
function take<T>(rng: Rng, arr: readonly T[], n: number): T[] {
	return rng.shuffle(Array.from(new Set(arr))).slice(0, Math.max(0, n));
}

/** n lines: n-g from the register bank, g from the genre bank (topped up from the register bank if short) */
function mix(rng: Rng, reg: string[], gen: string[], n: number, g: number): string[] {
	const fromGen = take(rng, gen, g);
	const fromReg = take(rng, reg.filter((x) => !fromGen.includes(x)), n - fromGen.length);
	return rng.shuffle([...fromReg, ...fromGen]);
}

const CAP = (s: string) => s.replace(/(^|[.!?]\s+)([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase());

type Lex = Record<string, string>;
const fill = (s: string, lex: Lex): string => s.replace(/<(\w+)>/g, (m, k: string) => lex[k] ?? m);
const fl = (arr: string[], lex: Lex, cap = true) => arr.map((s) => (cap ? CAP(fill(s, lex)) : fill(s, lex)));

function domainOf(sim: Simulation, cu: number, traits: TraitKey[]): { d1: Domain; d2: Domain } {
	const w = sim.w;
	const c = w.cultures[cu];
	let land: Domain = 'farm';
	const biome = c && c.layer === 'surface' && c.center >= 0 ? w.cells.biome[c.center] : -1;
	const byBiome: Record<number, Domain> = { 1: 'desert', 2: 'highland', 3: 'steppe', 4: 'farm', 5: 'farm', 6: 'farm', 7: 'forest', 8: 'forest', 9: 'north', 10: 'north', 11: 'north', 12: 'farm', 13: 'highland', 14: 'highland', 15: 'deep', 16: 'highland' };
	if (biome >= 0 && byBiome[biome]) land = byBiome[biome];
	if (c) {
		const t = c.type;
		if (t === 'Deep' || c.layer === 'deep') land = 'deep';
		else if (t === 'Sky' || c.layer === 'sky') land = 'sky';
		else if (t === 'Naval' || t === 'Sea' || t === 'Lake' || c.layer === 'sea') land = 'sea';
		else if (t === 'Nomadic') land = 'steppe';
		else if (t === 'Highland') land = 'highland';
		else if (t === 'Hunting') land = 'forest';
		else if (t === 'River') land = 'farm';
		if (c.sphere === 'steppe') land = 'steppe';
		if (c.sphere === 'inuit') land = 'north';
	}
	const fromTrait = (t?: TraitKey): Domain | undefined => (t === 'seafaring' ? 'sea' : t === 'nomadic' ? 'steppe' : t === 'mercantile' ? 'trade' : t === 'insular' && land === 'farm' ? 'highland' : undefined);
	const list: Domain[] = [];
	for (const t of traits) {
		const d = fromTrait(t);
		if (d && !list.includes(d)) list.push(d);
	}
	if (!list.includes(land)) list.push(land);
	if (list.length < 2) list.push(land === 'farm' ? 'trade' : 'farm');
	return { d1: list[0], d2: list[1] };
}

function cultureContext(sim: Simulation, cu: number) {
	const pols = sim.polities.filter((p) => p.alive && p.id && p.culture === cu).sort((a, b) => b.cells - a.cells);
	const lead = pols[0];
	const rel = lead ? sim.w.religions[lead.religion] : sim.w.religions.find((r) => r && r.id && r.culture === cu);
	return { ideology: lead?.ideology ?? 'monarchy', religion: rel };
}

function pickRegister(sim: Simulation, cu: number, rng: Rng, genre: Genre, traits: TraitKey[], ideology: string): Register {
	const tot = { formal: 0, blunt: 0, flowery: 0, terse: 0, earthy: 0, courtly: 0 } as Record<Register, number>;
	addScore(tot, SPHERE_REG[sim.w.cultures[cu]?.sphere ?? '']);
	for (const t of traits) addScore(tot, TRAIT_REG[t]);
	addScore(tot, IDEO_REG[ideology]);
	addScore(tot, GENRE_REG[genre]);
	for (const r of REGISTERS) tot[r] += rng() * 1.0;
	return REGISTERS.slice().sort((a, b) => tot[b] - tot[a])[0];
}

export function genVoice(sim: Simulation, cu: number): VoicePack {
	const w = sim.w;
	const rng = makeRng(hashSeed(`${w.opts.seed}:cp:voice:${cu}`));
	const genre = sim.voice as Genre;
	const cult = w.cultures[cu];
	const sphere = SPHERE_BY_ID[cult?.sphere ?? ''];
	const prof = cultureProfile(w, cu);
	const traits = prof.traits;
	const { ideology, religion } = cultureContext(sim, cu);
	const register = pickRegister(sim, cu, rng, genre, traits, ideology);
	const R = REG[register];
	const GB = GENRE[genre] ?? GENRE.fantasy;
	const { d1, d2 } = domainOf(sim, cu, traits);
	const lex: Lex = { ...GB.lex, ...DOMAIN_LEX[d1] };

	// proverbs: 5 from the main land or trade, 3 from the second, 3 from values, 3 from the genre
	const valKeys = traits.filter((t) => VALUE_PROVERBS[t]);
	const valPool: string[] = [];
	for (const k of valKeys) valPool.push(...take(rng, VALUE_PROVERBS[k], 3));
	valPool.push(...take(rng, VALUE_PROVERBS.common, 2));
	const prov: string[] = [];
	const push = (arr: string[], n: number) => { for (const s of arr) { if (n <= 0) break; const f = fill(s, lex); if (!prov.includes(f)) { prov.push(f); n--; } } };
	push(take(rng, DOMAIN_PROVERBS[d1], 10), 5);
	push(take(rng, DOMAIN_PROVERBS[d2], 10), 3);
	push(take(rng, valPool, 10), 3);
	push(take(rng, GB.proverbs, 4), 3);
	push(take(rng, DOMAIN_PROVERBS[d1], 10), 14 - prov.length);
	push(take(rng, VALUE_PROVERBS.common, 8), 14 - prov.length);

	// idioms: 3 from the main land, 2 from the second, 1 common, 2 from the genre
	const idioms = [
		...take(rng, DOMAIN_IDIOMS[d1], 3), ...take(rng, DOMAIN_IDIOMS[d2], 2), ...take(rng, COMMON_IDIOMS, 1), ...take(rng, GB.idioms, 2)
	];
	const seenIdiom = new Set<string>();
	const idiomsOut = idioms.filter((i) => (seenIdiom.has(i.say) ? false : (seenIdiom.add(i.say), true))).slice(0, 8)
		.map((i) => ({ say: fill(i.say, lex), meaning: fill(i.meaning, lex) }));
	for (const i of take(rng, DOMAIN_IDIOMS[d1], 8)) {
		if (idiomsOut.length >= 8) break;
		if (!idiomsOut.some((o) => o.say === i.say)) idiomsOut.push(i);
	}

	// oaths: register bank, genre bank, one land oath
	const landOaths = [`By ${lex.land}, and by what it has given me.`, `By ${lex.work}, which keeps my house.`, `By the ${lex.weather} and the ${lex.beast}, I swear.`];
	const oaths = [...take(rng, R.oaths, 3), ...take(rng, GB.oaths, 2), ...take(rng, landOaths, 1)];

	// honorifics
	const rulers = sphere?.rulers?.length ? sphere.rulers : ['Ruler'];
	const rulerT = rulers[0];
	const nobleT = rulers.length > 1 ? rulers[rulers.length - 1] : REG_HONOR[register].noble;
	const clergy = religion?.doctrine ? DOCTRINES[religion.doctrine]?.clergyTitle : undefined;
	const H = REG_HONOR[register];
	const plain = register === 'blunt' || register === 'terse' || register === 'earthy';
	const rulerHon = register === 'flowery' ? `Radiant ${rulerT}` : register === 'courtly' ? `Most Gracious ${rulerT}` : rulerT;
	const honorifics: Partial<Record<Rank, string>> = {
		low: H.low, common: plain ? FRIEND_WORD[genre] : H.common, high: H.high, noble: nobleT, ruler: rulerHon,
		priest: clergy ?? 'Priest', elder: H.elder, stranger: H.stranger
	};

	// barks: 4 from the register, 2 from the genre
	const barks: NonNullable<VoicePack['barks']> = {};
	for (const k of BARK_KEYS) barks[k] = fl(mix(rng, R.barks[k] ?? [], GB.barks[k] ?? [], 6, 2), lex);

	const prefixed = (a: string[], g: string[], n: number, ng: number) => fl(mix(rng, a, g, n, ng), lex);
	return {
		register,
		greet: prefixed(R.greet, GB.greet, 8, 2),
		farewell: prefixed(R.farewell, GB.farewell, 6, 2),
		thanks: prefixed(R.thanks, GB.thanks, 5, 1),
		apology: prefixed(R.apology, GB.apology, 4, 1),
		agree: prefixed(R.agree, GB.agree, 5, 1),
		refuse: prefixed(R.refuse, GB.refuse, 5, 1),
		praise: prefixed(R.praise, GB.praise, 5, 1),
		insults: prefixed(R.insults, GB.insults, 6, 2),
		curses: prefixed(R.curses, GB.curses, 6, 2),
		oaths: fl(oaths, lex),
		fillers: fl(mix(rng, R.fillers, GB.fillers, 6, 2), lex, false),
		proverbs: prov.slice(0, 14),
		idioms: idiomsOut,
		honorifics,
		address: rng.pick(R.address),
		humour: fill(rng.pick(R.humour), lex),
		barks,
		gossip: prefixed(R.gossip, GB.gossip, 5, 1)
	};
}

// ---------------- people ----------------

const NOTABLE_ROLES = new Set(['ruler', 'heir', 'general', 'hero', 'villain', 'prophet', 'magician', 'thinker', 'artist', 'athlete', 'inventor']);

function isSaint(sim: Simulation, id: number): boolean {
	const st = (sim as unknown as { _saintsState?: { saints?: { personId: number }[] } })._saintsState;
	return !!st?.saints?.some((s) => s.personId === id);
}

function isNotable(sim: Simulation, p: Person): boolean {
	if (!p || !p.id) return false;
	if (NOTABLE_ROLES.has(p.role)) return true;
	if (p.role === 'priest' && p.renown >= 10) return true;
	if (p.renown >= 20) return true;
	return isSaint(sim, p.id);
}

let memoSim: WeakRef<Simulation> | undefined;
let memoYear = -1;
const memo = new Map<number, VoicePack>();
function cultureVoice(sim: Simulation, cu: number): VoicePack {
	if (memoSim?.deref() !== sim || memoYear !== sim.year) {
		memo.clear();
		memoSim = new WeakRef(sim);
		memoYear = sim.year;
	}
	let v = memo.get(cu);
	if (!v) memo.set(cu, (v = genVoice(sim, cu)));
	return v;
}

type Temper = NonNullable<PersonVoice['temper']>;
const TEMPERS: Temper[] = ['calm', 'proud', 'anxious', 'wry', 'gruff', 'warm', 'cold', 'eager'];
const TRAIT_TEMPER: Record<string, Partial<Record<Temper, number>>> = {
	Brave: { eager: 1, proud: 0.6 }, Craven: { anxious: 1.5 }, Just: { calm: 1.2 }, Cruel: { cold: 1.5, proud: 0.4 }, Ambitious: { eager: 1, proud: 0.8 },
	Content: { calm: 1, warm: 0.6 }, Pious: { calm: 0.8, warm: 0.6 }, Cynical: { wry: 1.5, cold: 0.4 }, Greedy: { eager: 0.8, cold: 0.8 },
	Generous: { warm: 1.5 }, Scholar: { calm: 0.8, wry: 0.7 }, Strong: { gruff: 1.2 }, Sickly: { anxious: 1 }, Charming: { warm: 1, wry: 0.8 },
	Paranoid: { anxious: 1, cold: 0.8 }, Lucky: { eager: 0.6, wry: 0.6 }
};
const ROLE_TEMPER: Record<string, Partial<Record<Temper, number>>> = {
	ruler: { proud: 0.8, cold: 0.3 }, heir: { eager: 0.6, proud: 0.4 }, general: { gruff: 0.8, proud: 0.3 }, priest: { calm: 0.8, warm: 0.4 },
	prophet: { eager: 0.5, proud: 0.5 }, merchant: { eager: 0.6, wry: 0.3 }, thinker: { calm: 0.5, wry: 0.5 }, villain: { cold: 0.8 }, hero: { warm: 0.4, eager: 0.5 }
};

function pickTemper(rng: Rng, p: Person): Temper {
	const s: Record<Temper, number> = { calm: 0, proud: 0, anxious: 0, wry: 0, gruff: 0, warm: 0, cold: 0, eager: 0 };
	const add = (t?: Partial<Record<Temper, number>>) => { if (t) for (const k in t) s[k as Temper] += t[k as Temper]!; };
	s.gruff += p.martial / 10; s.proud += p.martial / 14; s.eager += p.martial / 20;
	s.warm += p.diplomacy / 10; s.calm += p.diplomacy / 16; s.wry += p.diplomacy / 20;
	s.calm += p.stewardship / 10; s.anxious += p.stewardship / 25; s.cold += p.stewardship / 25;
	s.wry += p.intrigue / 10; s.cold += p.intrigue / 12; s.anxious += p.intrigue / 20;
	for (const t of p.traits) add(TRAIT_TEMPER[t]);
	add(ROLE_TEMPER[p.role]);
	if (p.health < 40) s.anxious += 0.5;
	for (const t of TEMPERS) s[t] += rng() * 0.8;
	return TEMPERS.slice().sort((a, b) => s[b] - s[a])[0];
}

export function genPersonVoice(sim: Simulation, p: Person): PersonVoice | undefined {
	if (!isNotable(sim, p)) return undefined;
	const w = sim.w;
	const rng = makeRng(hashSeed(`${w.opts.seed}:cp:pvoice:${p.id}`));
	const cv = cultureVoice(sim, p.culture);
	const genre = sim.voice as Genre;
	const GB = GENRE[genre] ?? GENRE.fantasy;
	const lex: Lex = { ...GB.lex };
	const temper = pickTemper(rng, p);

	// tone
	let t = (rng() - 0.5) * 0.8;
	if (['ruler', 'heir', 'prophet', 'priest'].includes(p.role)) t += 0.8;
	if (temper === 'proud') t += 0.6;
	if (temper === 'gruff' || temper === 'eager') t -= 0.7;
	if (p.traits.includes('Charming') || p.diplomacy >= 14) t += 0.3;
	if (cv.register === 'terse' || cv.register === 'blunt') t -= 0.3;
	const tone: -1 | 0 | 1 = t >= 0.9 ? 1 : t <= -0.9 ? -1 : 0;

	// tics: temper habits plus maybe one culture filler
	const nT = rng.int(1, 3);
	const tics = take(rng, TICS[temper], nT - 1 + (nT === 1 ? 1 : 0));
	if (nT >= 2 && cv.fillers?.length) tics.push(rng.pick(cv.fillers));
	const ticsOut = Array.from(new Set(tics)).slice(0, nT);

	// oath from the culture's voice; the pious favour their god
	let oaths = cv.oaths ?? [];
	if (p.traits.includes('Pious') || p.role === 'priest' || p.role === 'prophet') {
		const g = oaths.filter((o) => o.includes('{deity}'));
		if (g.length) oaths = g;
	}
	const oath = oaths.length ? rng.pick(oaths) : undefined;

	// beliefs
	const rel = w.religions[p.religion];
	const prof = cultureProfile(w, p.culture);
	const pol = sim.polities[p.state];
	const cands: string[] = [];
	const doc = rel?.doctrine ? BELIEF_DOCTRINE[rel.doctrine] : BELIEF_DOCTRINE[`_${rel?.theology ?? 'other'}`] ?? BELIEF_DOCTRINE._other;
	if (doc) cands.push(...take(rng, doc, 1));
	const val = prof.values.length ? rng.pick(prof.values) : '';
	if (val) cands.push(rng.pick(VALUE_BELIEF_TPL).replace('{v}', val));
	if (pol?.ideology && BELIEF_IDEOLOGY[pol.ideology]) cands.push(BELIEF_IDEOLOGY[pol.ideology]);
	const faithy = p.role === 'priest' || p.role === 'prophet' || p.traits.includes('Pious');
	const ordered = faithy ? cands : cands.length > 1 ? [...cands.slice(1), cands[0]] : cands;
	const beliefs = ordered.slice(0, rng.chance(0.6) ? 2 : 1);

	// quirk
	const pool: string[] = [];
	if (p.martial >= 12) pool.push(...QUIRKS_ROLE.martial);
	if (p.diplomacy >= 12) pool.push(...QUIRKS_ROLE.diplomacy);
	if (p.stewardship >= 12) pool.push(...QUIRKS_ROLE.stewardship);
	if (p.intrigue >= 12) pool.push(...QUIRKS_ROLE.intrigue);
	const quirks: string[] = [];
	if (pool.length) quirks.push(rng.pick(pool));
	const gen = fill(rng.pick(QUIRKS_GENERAL), lex);
	if (!quirks.length || rng.chance(0.4)) quirks.push(gen);

	return { tone, tics: ticsOut, oath, temper, beliefs, quirks, topic: topicOf(sim, p, rng) };
}

function topicOf(sim: Simulation, p: Person, rng: Rng): string {
	const w = sim.w;
	const rel = w.religions[p.religion];
	const burg = w.burgs[p.burg];
	const town = burg?.name ?? '{town}';
	const wars = sim.wars.filter((x) => (x.attackers.includes(p.state) || x.defenders.includes(p.state)) && x.start >= p.born);
	const war = wars.length ? wars[wars.length - 1] : undefined;
	const warTopic = war ? `the ${war.name}, in the year ${war.start}` : undefined;
	const lineage = `the house of ${p.house}, and how long it has held on`;
	const faith = rel?.name ? `${rel.name} and what it asks of people` : 'the duties owed to the gods';
	switch (p.role) {
		case 'ruler':
		case 'heir':
			return rng.pick([lineage, warTopic ?? lineage, `the future of {realm} and whose hands it will rest in`, `the old kings of {realm} and their debts`]);
		case 'general':
			return rng.pick([warTopic ?? `the last campaign and its cost`, warTopic ?? 'the proper way to hold a line', 'the men and women who did not come back']);
		case 'merchant':
		case 'trader':
		case 'entrepreneur':
			return rng.pick(['the price of grain and salt', 'the road tolls and who sets them', `the best market in ${town}`, 'which partners can be trusted']);
		case 'priest':
		case 'prophet':
			return rng.pick([faith, `the next feast and the state of the shrine in ${town}`, 'the sins of the age']);
		case 'magician':
		case 'thinker':
		case 'artist':
		case 'athlete':
		case 'inventor':
			return p.magnumOpus ? `their life's work, "${p.magnumOpus}"` : rng.pick(['their craft and its masters', `the rivals they have outlived in ${town}`]);
		case 'hero':
			return rng.pick(['the deeds that made their name', warTopic ?? 'the road they walked to get here', `the people of ${town}`]);
		case 'villain':
			return rng.pick(['a grudge they have not forgiven', lineage, warTopic ?? 'who really owes whom']);
		default:
			return rng.pick([`the old days in ${town}`, warTopic ?? lineage, faith]);
	}
}
