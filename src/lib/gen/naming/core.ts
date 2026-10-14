import type { Rng } from '../../rng';
import type { NameGrammar, Sphere } from '../spheres';

/** One piece of a semantic name: the spelled form plus its English meaning (null = no meaning, e.g. a sphere affix). */
export interface GlossPart {
	form: string;
	meaning: string | null;
}

export interface Lang {
	cons: string;
	vows: string;
	sibs: string;
	liqs: string;
	fins: string;
	struct: string;
	ortho: Record<string, string>;
	minSyl: number;
	maxSyl: number;
	joiner: string;
	morphemes: Record<string, string[]>;
	words: Record<string, string[]>;
	used: Set<string>;
	rng: Rng;
	/** typical place suffix morphemes */
	genitive: string;
	definite: string;
	sphere: Sphere | null;
	/** resolved name grammar (sphere config or the default "given + house") */
	grammar: NameGrammar;
	/** meaning -> raw morpheme (unspelled); built once per culture so place names share roots */
	lexicon: Record<string, string>;
	/** head noun before modifier ("Fort-White") instead of after ("Whitefort") */
	headFirst: boolean;
	/** name -> parts, for every semantic name this language minted */
	glosses: Record<string, GlossPart[]>;
	/** place-type names minted so far, lowercased (near-duplicate check; houses excluded) */
	places: string[];
	/** closed clan / surname pool (Mande jamu, Sinic surnames); empty when the grammar has none */
	clans: string[];
	/** Akan-style weekday names, index 0..6, or null */
	dayNames: { m: string[]; f: string[] } | null;
	/** popular given names, reused so dynasties repeat names (and regnal numbers matter) */
	givenPool: { m: string[]; f: string[] };
	/** feminine given-name endings */
	fem: string[];
}

export function syllable(L: Lang): string {
	let out = '';
	const s = L.struct;
	for (let i = 0; i < s.length; i++) {
		const ch = s[i];
		if (s[i + 1] === '?' && L.rng() < 0.5) { i++; continue; }
		const set = ch === 'C' ? L.cons : ch === 'V' ? L.vows : ch === 'S' ? L.sibs : ch === 'L' ? L.liqs : ch === 'F' ? L.fins : ch === 'N' ? 'mn' : '';
		if (set) out += L.rng.pick(set.split(''));
		else out += ch;
		if (s[i + 1] === '?') i++;
	}
	return out;
}

export function spell(L: Lang, s: string): string {
	let o = '';
	for (const ch of s) o += L.ortho[ch] ?? ch;
	return o;
}

export function morpheme(L: Lang, key: string): string {
	const list = (L.morphemes[key] ??= []);
	const extras = key === '' ? 10 : 1;
	const n = L.rng.int(0, list.length + extras - 1);
	if (n < list.length) return list[n];
	for (let tries = 0; tries < 20; tries++) {
		const m = syllable(L);
		let clash = false;
		for (const k in L.morphemes) if (L.morphemes[k].includes(m)) { clash = true; break; }
		if (clash) continue;
		list.push(m);
		return m;
	}
	return syllable(L);
}

export function word(L: Lang, key = ''): string {
	const nsyl = L.rng.int(L.minSyl, L.maxSyl);
	const keys = Array.from({ length: nsyl }, () => '');
	keys[L.rng.int(0, nsyl - 1)] = key;
	let out = '';
	const seen = new Set<string>();
	for (const k of keys) {
		let m = morpheme(L, k);
		for (let t = 0; t < 6 && seen.has(m); t++) m = morpheme(L, '');
		if (seen.has(m)) continue;
		out += m;
		seen.add(m);
	}
	return out;
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const VOWELS = 'aeiouyáéíóúâêôàèìòùäöüøåāīẹọɛɔə';
export const isVowel = (ch: string) => VOWELS.includes(ch.toLowerCase());

/**
 * Attach a sphere affix: '-x' suffix, 'x-' hyphenated prefix, 'x ' separate word.
 * A vowel at the seam is elided so 'Tomgoba' + '-abad' gives 'Tomgobabad', not 'Tomgobaabad'.
 */
export function joinAffix(base: string, affix: string): string {
	if (affix.endsWith(' ')) return affix + cap(base);
	if (affix.endsWith('-')) return cap(affix + base.toLowerCase());
	let suf = affix.startsWith('-') ? affix.slice(1) : affix;
	let b = base;
	if (suf && isVowel(suf[0]) && b && isVowel(b[b.length - 1])) b = b.slice(0, -1);
	if (suf && b && suf[0].toLowerCase() === b[b.length - 1].toLowerCase() && !isVowel(suf[0])) suf = suf.slice(1);
	return cap(b + suf);
}
