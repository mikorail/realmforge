import { makeRng, type Rng } from '../rng';
import { DEFAULT_GRAMMAR, SPHERE_BY_ID, type Sphere } from './spheres';
import { cap, joinAffix, morpheme, spell, word, type GlossPart, type Lang } from './naming/core';
import { buildLexicon, semanticBase, SEMANTIC_P } from './naming/lexicon';
import { buildPersonal, clanOf, dayName, epithet as rollEpithet, givenName, houseForm, patronym, regnalName, withEpithet, type Gender } from './naming/grammar';
import { isGoodWord, nameIssue, tidy } from './naming/quality';

export type { Lang, GlossPart } from './naming/core';
export { gloss, glossText, dictionary, MEANINGS } from './naming/lexicon';
export { givenName, dayName, clanOf, patronym, epithet, withEpithet, regnalName, toRoman, nextRegnalNumber, type Gender } from './naming/grammar';
export { nameIssue, wordIssue, isGoodWord, isNearDuplicate, isOffensive, tidy } from './naming/quality';

/**
 * Procedural naming languages (after Martin O'Leary's "Generating fantasy maps" naming language):
 * each culture gets its own phoneme sets, syllable structure and orthography, and reuses
 * morphemes so names within a culture sound related. On top of that (P3 · Naming):
 *  - a per-culture dictionary of meanings (river, hill, new, white…) for semantic place names (`naming/lexicon.ts`);
 *  - sphere name grammar for people (`fullPersonName`, `naming/grammar.ts`);
 *  - a quality filter every name passes (`naming/quality.ts`) and sound-change drift (`naming/drift.ts`).
 */
const CONS = ['ptkmnls', 'ptkbdgmnlrsʃzʒʧ', 'prkfθvʃmnh', 'hmnlrsptkbdg', 'tksʃdbqɣxmnlrw', 'ptkbdgmnsz', 'ptkmnhlrwj', 'bdgmnlrvzʒ', 'ʃʒʧʤmnlrkg'];
const VOWS = ['aeiou', 'aiu', 'aeiouâêô', 'aeiouøy', 'aei', 'aeiouáéíóú', 'aou', 'eiouy'];
const SIBS = ['s', 'sʃ', 'sʃf', 'z', 'sz'];
const LIQS = ['rl', 'r', 'l', 'wj', 'rw', 'lr'];
const FINS = ['mn', 'sk', 'mnŋ', 'sʃzʒ', 'nr', 'lt', 'ndr'];
const STRUCTS = ['CVC', 'CVV?C', 'CVVC?', 'CVC?', 'CV', 'VC', 'CVF', 'C?VC', 'CVF?', 'CL?VC', 'CL?VF', 'S?CVC', 'S?CVF', 'S?CVC?', 'C?VF', 'C?VC?', 'C?VF?', 'C?L?VC', 'VC', 'CVL?C?', 'C?VL?C', 'C?VLC?'];
const ORTHO: Record<string, string>[] = [
	{ ʃ: 'sh', ʒ: 'zh', ʧ: 'ch', ʤ: 'j', ŋ: 'ng', j: 'y', x: 'kh', ɣ: 'gh', θ: 'th', ø: 'ö' },
	{ ʃ: 'sch', ʒ: 'zh', ʧ: 'tsch', ʤ: 'dz', ŋ: 'ng', j: 'j', x: 'ch', ɣ: 'gh', θ: 'th', ø: 'ø' },
	{ ʃ: 'x', ʒ: 'j', ʧ: 'tx', ʤ: 'tj', ŋ: 'ñ', j: 'y', x: 'j', ɣ: 'g', θ: 'z', ø: 'eu' },
	{ ʃ: 'ch', ʒ: 'j', ʧ: 'tch', ʤ: 'dj', ŋ: 'ng', j: 'y', x: "kh", ɣ: "r", θ: "th", ø: 'eu' },
	{ ʃ: 'sz', ʒ: 'ż', ʧ: 'cz', ʤ: 'dż', ŋ: 'ng', j: 'j', x: 'h', ɣ: 'g', θ: 'th', ø: 'ö' }
];

function shuffled(rng: Rng, s: string, keep: number) {
	const a = s.split('');
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a.slice(0, Math.max(2, keep)).join('');
}

/**
 * The sim rebuilds each culture's language with a ':sim' seed suffix (a fresh name stream). The sound
 * inventory, dictionary and clans come from the base seed so sim-era names still sound like, and share
 * roots with, the culture's generation-time names.
 */
const baseSeed = (seed: string) => seed.replace(/:sim$/, '');

export function makeLang(seed: string, sphereId?: string): Lang {
	const inv = baseSeed(seed);
	if (inv !== seed) {
		const base = makeLang(inv, sphereId);
		return { ...base, morphemes: {}, words: {}, used: new Set(), glosses: {}, places: [], givenPool: { m: [], f: [] }, rng: makeRng(seed) };
	}
	const rng = makeRng(seed);
	const sp: Sphere | null = sphereId ? (SPHERE_BY_ID[sphereId] ?? SPHERE_BY_ID[sphereId.toLowerCase()] ?? null) : null;
	const cons = sp ? sp.cons : rng.pick(CONS);
	const grammar = sp?.grammar ?? DEFAULT_GRAMMAR;
	// a sphere gives the family resemblance; each culture still drops a few phonemes for its own accent
	const L: Lang = {
		cons: shuffled(rng, cons, rng.int(Math.ceil(cons.length * (sp ? 0.7 : 0.5)), cons.length)),
		vows: sp ? shuffled(rng, sp.vows, Math.max(3, sp.vows.length - rng.int(0, 1))) : shuffled(rng, rng.pick(VOWS), rng.int(3, 5)),
		sibs: rng.pick(SIBS),
		liqs: sp?.liqs ?? rng.pick(LIQS),
		fins: sp?.fins ?? rng.pick(FINS),
		struct: sp ? rng.pick(sp.structs) : rng.pick(STRUCTS),
		ortho: sp?.ortho ? { ...ORTHO[0], ...sp.ortho } : rng.pick(ORTHO),
		minSyl: sp?.minSyl ?? rng.int(1, 2),
		maxSyl: 0,
		joiner: rng.pick([' ', ' ', ' ', '-', '']),
		morphemes: {},
		words: {},
		used: new Set(),
		rng,
		genitive: '',
		definite: '',
		sphere: sp,
		grammar,
		lexicon: {},
		headFirst: false,
		glosses: {},
		places: [],
		clans: [],
		dayNames: null,
		givenPool: { m: [], f: [] },
		fem: grammar.fem ?? []
	};
	L.maxSyl = sp?.maxSyl ?? Math.min(3, L.minSyl + rng.int(0, 1));
	// a syllable shape with no consonant slot makes all-vowel words; guarantee one
	if (!/[CSLFN]/.test(L.struct)) L.struct = 'C' + L.struct;
	L.genitive = morpheme(L, 'of');
	L.definite = morpheme(L, 'the');
	// dictionary, clans and day names get their own stream: deterministic, and the name stream is untouched
	const side = makeRng(seed + ':lex');
	L.headFirst = grammar.headFirst ?? side() < 0.35;
	if (!L.fem.length) L.fem = [spell(L, L.vows.includes('a') ? 'a' : L.vows[0])];
	buildLexicon(L, side);
	buildPersonal(L, side);
	return L;
}

/** keys whose names go on the map: these also reject near-duplicates of earlier ones */
const PLACE_KEYS = new Set(['', 'city', 'land', 'river', 'people', 'world', 'place']);

function accept(L: Lang, name: string, key: string, parts: GlossPart[] | null): boolean {
	if (L.used.has(name)) return false;
	const place = PLACE_KEYS.has(key);
	if (nameIssue(name, place ? L.places : undefined)) return false;
	L.used.add(name);
	if (place) L.places.push(name.toLowerCase());
	if (parts) L.glosses[name] = parts;
	return true;
}

/** Gloss parts after a sphere affix joined a single root, with forms as actually written (seam vowels elided). */
function glossWithAffix(root: string, affix: string, name: string, parts: GlossPart[]): GlossPart[] {
	if (affix.endsWith('-') || affix.endsWith(' ')) return [{ form: affix.trim().replace(/-$/, ''), meaning: null }, ...parts];
	let suf = affix.replace(/^-/, '');
	if (!name.toLowerCase().endsWith(suf.toLowerCase())) suf = suf.slice(1);
	const rootForm = name.slice(0, name.length - suf.length);
	const fixed = parts.length === 1 && root.toLowerCase().startsWith(rootForm.toLowerCase()) ? [{ ...parts[0], form: rootForm.toLowerCase() }] : parts;
	return [...fixed, { form: suf, meaning: null }];
}

/** A fresh, unused proper name. key ties it to a semantic morpheme (e.g. 'city', 'river'). */
export function makeName(L: Lang, key = ''): string {
	const affixes = key === 'city' ? L.sphere?.city : key === 'land' ? L.sphere?.land : key === 'house' ? L.grammar.houseAffixes : undefined;
	const affixP = key === 'house' ? 0.6 : 0.45;
	const semP = SEMANTIC_P[key] ?? 0;
	for (let tries = 0; tries < 60; tries++) {
		const useAffix = !!affixes?.length && L.rng() < affixP;
		let parts: GlossPart[] | null = null;
		let raw: string;
		if (semP && L.rng() < semP) {
			const s = semanticBase(L, key, useAffix);
			raw = s.raw;
			parts = s.parts;
		} else if (L.rng() < 0.55) raw = word(L, key);
		else {
			const w1 = word(L, L.rng() < 0.6 ? key : '');
			const w2 = word(L, '');
			raw = L.rng() < 0.5 ? w1 + w2 : w1 + L.genitive + w2;
		}
		let name = tidy(cap(spell(L, raw)));
		// base word rules: ≤ 12 letters, a consonant, no 3+ vowels / 4+ consonants, sane onset, no slurs
		if (!isGoodWord(name)) continue;
		if (useAffix && affixes) {
			const a = L.rng.pick(affixes);
			if (!parts && name.length > 7) name = name.slice(0, 6);
			const root = name;
			name = joinAffix(name, a);
			if (parts) parts = glossWithAffix(root, a, name, parts);
		}
		if (name.length > 16) continue;
		if (accept(L, name, key, parts)) return name;
	}
	for (let t = 0; t < 20; t++) {
		const fallback = tidy(cap(spell(L, L.rng.pick(L.cons.split('')) + word(L, key) + L.rng.pick(L.cons.split('')))));
		if (isGoodWord(fallback, 14) && accept(L, fallback, key, null)) return fallback;
	}
	let last = tidy(cap(spell(L, word(L, key) + word(L, ''))));
	while (L.used.has(last)) last += spell(L, L.rng.pick(L.vows.split('')) + L.rng.pick(L.cons.split('')));
	L.used.add(last);
	return last;
}

/** A given name (back-compatible single-string form; see `fullPersonName` for the sphere's full grammar). */
export function personName(L: Lang): string {
	return givenName(L, L.rng() < 0.5 ? 'm' : 'f');
}

export interface PersonNameOpts {
	gender?: Gender;
	/** keep this given name (e.g. a known heir) instead of rolling one */
	given?: string;
	/** father's given name, for patronymic / father-name spheres (rolled when absent) */
	father?: string;
	/** inherited lineage name; a new house is minted when absent */
	house?: string;
	/** weekday of birth (0..6) for day-name spheres */
	weekday?: number;
	/** names of ancestors; 30% chance the child is named after one of them */
	ancestors?: readonly string[];
	/** true = roll an epithet (from traits when given), string = use it */
	epithet?: boolean | string;
	traits?: readonly string[];
	/** regnal number (≥ 1) for a crowned ruler: shown as "Kofi III" */
	regnal?: number;
}

export interface PersonName {
	given: string;
	/** hereditary lineage name: what the engine stores in `Person.house` */
	house: string;
	/** the second element as this sphere shows it (patronymic, clan, father's name, house...) or '' */
	surname: string;
	epithet: string;
	/** everyday form in the sphere's order: "Wang Li", "Haraldson" style, "Hasan ibn Qadir al-Zahra" */
	plain: string;
	/** display form: regnal style for rulers, epithet appended: "Kofi III the Bold" */
	full: string;
	gender: Gender;
}

/** A full personal name following the sphere's grammar (defaults to the language's own sphere). */
export function fullPersonName(L: Lang, sphere?: Sphere | string | null, opts: PersonNameOpts = {}): PersonName {
	const sp = typeof sphere === 'string' ? (SPHERE_BY_ID[sphere] ?? null) : (sphere ?? L.sphere);
	const g = sp?.grammar ?? (sp ? DEFAULT_GRAMMAR : L.grammar);
	const r = L.rng;
	const gender: Gender = opts.gender ?? (r() < 0.5 ? 'm' : 'f');
	let given = opts.given ?? '';
	if (!given && opts.ancestors?.length && r() < 0.3) given = r.pick(opts.ancestors);
	if (!given && g.dayNames && L.dayNames) given = dayName(L, opts.weekday ?? r.int(0, 6), gender) ?? '';
	if (!given) given = givenName(L, gender);
	const house = opts.house ?? makeName(L, 'house');
	const father = opts.father ?? (g.surname === 'patronymic' || g.surname === 'father' ? givenName(L, 'm') : '');
	const shownHouse = (g.houseParticle ?? '') + houseForm(g, house, gender);
	let surname = '';
	switch (g.surname) {
		case 'house': surname = shownHouse; break;
		case 'clan': surname = clanOf(L, house); break;
		case 'father': surname = father; break;
		case 'patronymic': {
			const marker = g.patronymic?.[gender] ?? '-son';
			surname = patronym(father, marker) + (g.withHouse ? ' ' + shownHouse : '');
			break;
		}
	}
	const ep = typeof opts.epithet === 'string' ? opts.epithet : opts.epithet ? rollEpithet(r, opts.traits ?? [], sp) : '';
	const plain = !surname ? given : g.order === 'family-given' ? `${surname} ${given}` : `${given} ${surname}`;
	const full = withEpithet(opts.regnal ? regnalName(given, opts.regnal) : plain, ep);
	return { given, house, surname, epithet: ep, plain, full, gender };
}

export const STATE_FORMS = {
	Generic: ['Kingdom', 'Principality', 'Duchy', 'Grand Duchy', 'Realm'],
	Naval: ['Thalassocracy', 'Republic', 'Kingdom', 'League'],
	Nomadic: ['Horde', 'Khaganate', 'Khanate', 'Confederation'],
	Highland: ['Kingdom', 'Hold', 'Clanlands', 'Principality'],
	Hunting: ['Tribe', 'Chiefdom', 'Confederation'],
	River: ['Kingdom', 'Empire', 'Satrapy', 'Despotate'],
	Lake: ['Kingdom', 'Republic', 'Duchy']
} as const;

const DEITY_ROOTS = ['Sun', 'Moon', 'Storm', 'Sea', 'Earth', 'Flame', 'Stars', 'Void', 'Forge', 'Harvest', 'Wolf', 'Serpent', 'Raven', 'Mountain', 'Dawn', 'Dusk', 'Tree', 'River'];
const RELIGION_FORMS = ['Faith', 'Church', 'Way', 'Covenant', 'Order', 'Path', 'Teachings', 'Mysteries', 'Light', 'Circle'];

export function religionName(L: Lang, rng: Rng, folk: boolean, cultureName: string) {
	const deity = makeName(L, 'god');
	const aspect = rng.pick(DEITY_ROOTS);
	if (L.sphere && rng() < 0.7) {
		const f = rng.pick(L.sphere.faiths);
		const name = f.endsWith(' of') ? `${f} ${folk ? cultureName : deity}` : folk ? `${f} of the ${cultureName}` : `${f} of ${deity}`;
		return { name, deity: `${deity}, the ${aspect}` };
	}
	if (folk) return { name: `${cultureName} ${rng.pick(['Spirits', 'Ancestors', 'Old Gods', 'Totems', 'Shamanism', 'Pantheon'])}`, deity: `${deity}, the ${aspect}` };
	return { name: `${rng.pick(RELIGION_FORMS)} of ${rng.chance(0.5) ? deity : 'the ' + aspect}`, deity: `${deity}, the ${aspect}` };
}
