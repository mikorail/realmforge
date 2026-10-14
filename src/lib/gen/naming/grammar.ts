import { hashSeed, type Rng } from '../../rng';
import type { NameGrammar, Sphere } from '../spheres';
import { cap, isVowel, spell, syllable, word, type Lang } from './core';
import { isGoodWord, tidy } from './quality';

/** Personal-name building blocks: given names, patronymics, clans, day names, epithets, regnal numbers. */

export type Gender = 'm' | 'f';

/** popular names get reused once a culture has this many */
const POOL_MIN = 20;

/** Swap or add a feminine ending: 'Ivan' + 'a' → 'Ivana', 'Haru' + 'ko' → 'Haruko'. */
export function feminize(L: Lang, name: string, rng: Rng = L.rng): string {
	const ends = L.fem.length ? L.fem : ['a'];
	const e = rng.pick(ends);
	if (name.toLowerCase().endsWith(e)) return name;
	let base = name;
	if (isVowel(e[0]) && isVowel(base[base.length - 1])) base = base.slice(0, -1);
	return base + e;
}

/**
 * A given name. Cultures keep a pool of popular names and reuse them (weighted towards the oldest,
 * most popular) so lineages repeat names, which is what makes regnal numbers interesting.
 */
export function givenName(L: Lang, gender: Gender = 'm'): string {
	const pool = L.givenPool[gender];
	if (pool.length >= POOL_MIN && L.rng() < 0.55) return pool[Math.floor(L.rng() ** 2 * pool.length)];
	for (let t = 0; t < 30; t++) {
		let s = tidy(cap(spell(L, word(L, 'person'))));
		if (gender === 'f') s = feminize(L, s);
		if (!isGoodWord(s, 10)) continue;
		pool.push(s);
		return s;
	}
	// harsh phonologies (Slavic CCV) can miss 30 times: reuse a popular name, else build a plain CVCV
	if (pool.length) return L.rng.pick(pool);
	const c = () => L.rng.pick(L.cons.split(''));
	const v = () => L.rng.pick(L.vows.split(''));
	let s = tidy(cap(spell(L, c() + v() + c() + v())));
	if (gender === 'f') s = feminize(L, s);
	pool.push(s);
	return s;
}

/** Build per-culture closed sets (clan pool, weekday names). Uses its own rng so the main stream is unchanged. */
export function buildPersonal(L: Lang, rng: Rng) {
	const g = L.grammar;
	const saved = L.rng;
	L.rng = rng;
	if (g.surname === 'clan') {
		const n = g.clans ?? 12;
		for (let t = 0; t < n * 20 && L.clans.length < n; t++) {
			const s = tidy(cap(spell(L, syllable(L) + (L.minSyl > 1 || rng() < (L.maxSyl <= 2 ? 0.25 : 0.6) ? syllable(L) : ''))));
			if (isGoodWord(s, 9) && !L.clans.includes(s)) L.clans.push(s);
		}
	}
	if (g.dayNames) {
		// Akan pattern: a shared masculine and feminine prefix + one root per weekday
		const mPre = syllable(L);
		const fPre = L.rng.pick(L.vows.split(''));
		const m: string[] = [];
		const f: string[] = [];
		for (let d = 0; d < 7; d++) {
			for (let t = 0; t < 40; t++) {
				const root = syllable(L);
				const ms = tidy(cap(spell(L, mPre + root)));
				const fs = tidy(feminize(L, cap(spell(L, fPre + root)), rng));
				if (!isGoodWord(ms, 9) || !isGoodWord(fs, 9) || m.includes(ms) || f.includes(fs)) continue;
				m.push(ms);
				f.push(fs);
				break;
			}
			if (m.length <= d) {
				const root = syllable(L) + syllable(L);
				m.push(cap(spell(L, mPre + root)));
				f.push(feminize(L, cap(spell(L, fPre + root)), rng));
			}
		}
		L.dayNames = { m, f };
	}
	L.rng = saved;
}

/** weekday name (0..6) for cultures with day names, else null */
export function dayName(L: Lang, weekday: number, gender: Gender = 'm'): string | null {
	return L.dayNames ? L.dayNames[gender][((weekday % 7) + 7) % 7] : null;
}

/** clan of a lineage: hereditary and stable because it is derived from the house name */
export function clanOf(L: Lang, house: string): string {
	return L.clans.length ? L.clans[hashSeed(house) % L.clans.length] : house;
}

/** 'Harald' + '-son' → 'Haraldson'; 'Ivano' + '-ovich' → 'Ivanovich'; 'Qadir' + 'ibn ' → 'ibn Qadir' */
export function patronym(father: string, marker: string): string {
	if (marker.endsWith(' ')) return marker + father;
	const suf = marker.replace(/^-/, '');
	let base = father;
	if (isVowel(suf[0]) && isVowel(base[base.length - 1])) base = base.slice(0, -1);
	return base + suf;
}

/** feminine house form: Volkov → Volkova, Julius → Julia */
export function houseForm(g: NameGrammar, house: string, gender: Gender): string {
	if (gender !== 'f' || !g.houseFem) return house;
	for (const [m, f] of g.houseFem) if (house.endsWith(m)) return house.slice(0, -m.length) + f;
	return house;
}

const TRAIT_EPITHETS: Record<string, string[]> = {
	Brave: ['the Bold', 'the Brave', 'Lionheart', 'the Fearless'],
	Craven: ['the Timid', 'the Unready'],
	Just: ['the Just', 'the Fair', 'the Lawgiver'],
	Cruel: ['the Cruel', 'the Terrible', 'the Grim'],
	Ambitious: ['the Great', 'the Conqueror'],
	Content: ['the Peaceful', 'the Gentle'],
	Pious: ['the Pious', 'the Devout', 'the Saint'],
	Cynical: ['the Shrewd', 'the Sly'],
	Greedy: ['the Grasping', 'Goldfist'],
	Generous: ['the Generous', 'Open-Hand'],
	Scholar: ['the Wise', 'the Learned'],
	Strong: ['Iron-Hand', 'the Strong', 'the Mighty'],
	Sickly: ['the Pale', 'the Frail'],
	Charming: ['the Fair', 'Silver-Tongue'],
	Paranoid: ['the Watchful', 'the Wary'],
	Lucky: ['the Fortunate', 'the Blessed']
};
const GENERIC_EPITHETS = ['the Bold', 'the Wise', 'Iron-Hand', 'the Great', 'the Elder', 'the Younger', 'the Tall', 'the Lame', 'the Stern', 'the Builder', 'the Restorer', 'the Peacemaker', 'the Hammer', 'the Silent', 'the Exile', 'Longspear', 'Stormborn'];

/** An epithet: trait-driven when traits are given (60%), else the generic pool plus the sphere's own. */
export function epithet(rng: Rng, traits: readonly string[] = [], sphere?: Sphere | null): string {
	const byTrait = traits.flatMap((t) => TRAIT_EPITHETS[t] ?? []);
	if (byTrait.length && rng() < 0.6) return rng.pick(byTrait);
	return rng.pick([...GENERIC_EPITHETS, ...(sphere?.grammar?.epithets ?? []), ...(sphere?.grammar?.epithets ?? [])]);
}

/** "Kofi III the Bold" / "Haraldson Iron-Hand": epithets starting with 'the'/'of' follow directly, others too */
export const withEpithet = (name: string, ep: string) => (ep ? `${name} ${ep}` : name);

const ROMAN: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
export function toRoman(n: number): string {
	let out = '';
	let v = Math.floor(n);
	for (const [k, s] of ROMAN) while (v >= k) { out += s; v -= k; }
	return out;
}

/** regnalName('Kofi', 3) → 'Kofi III'; count ≤ 0 leaves the name alone */
export function regnalName(name: string, count: number): string {
	return count >= 1 ? `${name} ${toRoman(count)}` : name;
}

/**
 * Regnal number for a new ruler: 1 + how many earlier rulers of the same realm bore the same given name.
 * `previousGiven` is the list of given names of the realm's past rulers (any order).
 */
export function nextRegnalNumber(previousGiven: readonly string[], given: string): number {
	let n = 1;
	for (const g of previousGiven) if (g === given) n++;
	return n;
}
