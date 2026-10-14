import { VOWELS } from './core';

/**
 * Name quality filter: rules every generated proper name must pass.
 * Pure functions; `nameIssue` returns the first failed rule (handy in tests), `isGoodWord` a boolean.
 */

/** single words longer than this read as keyboard mash on a map */
export const MAX_WORD = 12;

/** two- and three-consonant word onsets that read naturally in at least one sphere's orthography */
const ONSETS = new Set(
	(
		'bl br bj by ch cl cr cz dr dw dz dj fl fr fj gl gr gw gh hj hv kh kl kr kw kv kj ll ' +
		'mb mp mw nd ng nk nj nz ny nt nw ph pl pr ps sc sh sk sl sm sn sp st sv sw sj sz ' +
		'th tr ts tl tw tz tj vl vr wr zh zl zv ' +
		'str spr scr spl skr shr thr sch chr phr ndr ngw mbw nkw'
	).split(' ')
);

/** word-final consonant clusters that read naturally; any doubled consonant is fine too */
const CODAS = new Set(
	(
		'st nd nt nk ng rd rt rk rn rm rs rg rv rf rl rb rp rz ld lt lk lm ls lf lv lp lb sk sp ft kt pt mp mb ns nz ts tz ks ps ' +
		'sh ch th kh gh zh ph ck nch nsk rst rth rsh rch lth ngs nds nts rds rks lch ltz ndr'
	).split(' ')
);

/** letter pairs that never read well in any of the orthographies */
const UGLY = ['hh', 'bv', 'pv', 'vb', 'vp', 'fv', 'vf', 'bp', 'pb', 'dt', 'td', 'gk', 'kg', 'qk', 'kq', 'qg', 'gq', 'cq', 'qc', 'tzh', 'dzh', 'zhh', 'khh', 'ghh', 'shh', 'wq', 'qw'];

/** Tidy spelling before checks: one glottal-stop apostrophe per word, none leading or doubled. */
export function tidy(name: string): string {
	return name
		.split(/([\s-]+)/)
		.map((w, i) => {
			if (i % 2 === 1) return w;
			let seen = false;
			let out = '';
			const lead = w.startsWith("'");
			for (const ch of w.replace(/^'+/, '')) {
				if (ch === "'") { if (seen) continue; seen = true; }
				out += ch;
			}
			// cap() on "'ekab" was a no-op, so restore the capital the apostrophe swallowed
			return lead && i === 0 ? out.charAt(0).toUpperCase() + out.slice(1) : out;
		})
		.join('');
}

/**
 * Real-world slurs and obscenities, matched as substrings of the letters-only lowercase spelling.
 * Kept short on purpose: a few false positives just cost one retry.
 */
const BLOCKLIST = [
	'nigg', 'nigr', 'negro', 'fag', 'kike', 'kyke', 'spic', 'chink', 'gook', 'wetback', 'coon', 'dyke', 'tranny',
	'retard', 'paki', 'raghead', 'towelhead', 'beaner', 'kaffir', 'kafir', 'wog', 'cunt', 'whore', 'slut', 'rape',
	'nazi', 'hitler', 'shit', 'fuck', 'cock', 'dick', 'piss', 'twat', 'jizz', 'bitch', 'porn', 'penis', 'vagin'
];

const letters = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zñøæåþðʒʃ]/g, '');

export function isOffensive(name: string): boolean {
	const l = letters(name);
	return BLOCKLIST.some((b) => l.includes(b));
}

const isV = (ch: string) => VOWELS.includes(ch);
const isC = (ch: string) => !isV(ch) && /\p{L}/u.test(ch);

/** longest run of consonant letters (apostrophes, spaces and hyphens break a run) */
export function maxConsonantRun(name: string): number {
	let best = 0;
	let run = 0;
	for (const ch of name.toLowerCase()) {
		if (isC(ch)) best = Math.max(best, ++run);
		else run = 0;
	}
	return best;
}

/** true when a word begins with a consonant cluster no sphere would write ('Rzh', 'Pv', 'Dl') */
export function hasAwkwardOnset(w: string): boolean {
	const s = w.toLowerCase().replace(/^['\s-]+/, '');
	let i = 0;
	while (i < s.length && isC(s[i])) i++;
	if (i <= 1) return false;
	return !ONSETS.has(s.slice(0, i));
}

/** true when a word ends in a consonant cluster like '-hn', '-pm', '-tzh' */
export function hasAwkwardCoda(w: string): boolean {
	const s = w.toLowerCase().replace(/['\s-]+$/, '');
	let i = s.length;
	while (i > 0 && isC(s[i - 1])) i--;
	const coda = s.slice(i);
	if (coda.length <= 1) return false;
	if (coda.length === 2 && coda[0] === coda[1]) return false;
	return !CODAS.has(coda);
}

/** Levenshtein distance with an early exit once every cell of a row exceeds `max` */
export function editDistance(a: string, b: string, max = Infinity): number {
	if (Math.abs(a.length - b.length) > max) return max + 1;
	let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
	for (let i = 1; i <= a.length; i++) {
		const cur = [i];
		let rowMin = i;
		for (let j = 1; j <= b.length; j++) {
			const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
			cur.push(v);
			if (v < rowMin) rowMin = v;
		}
		if (rowMin > max) return max + 1;
		prev = cur;
	}
	return prev[b.length];
}

/** edit distance ≤ 1 without allocating a DP table (the hot path of name generation) */
export function withinOneEdit(a: string, b: string): boolean {
	if (a === b) return true;
	const la = a.length;
	const lb = b.length;
	if (la - lb > 1 || lb - la > 1) return false;
	let i = 0;
	while (i < la && i < lb && a.charCodeAt(i) === b.charCodeAt(i)) i++;
	if (la === lb) return a.slice(i + 1) === b.slice(i + 1);
	return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/** another name within edit distance `maxDist` (case-insensitive; pass a lowercased pool for speed) */
export function isNearDuplicate(name: string, pool: Iterable<string>, maxDist = 1): boolean {
	const n = name.toLowerCase();
	for (const p of pool) {
		if (Math.abs(p.length - n.length) > maxDist) continue;
		const q = p === p.toLowerCase() ? p : p.toLowerCase();
		if (maxDist === 1 ? withinOneEdit(n, q) : editDistance(n, q, maxDist) <= maxDist) return true;
	}
	return false;
}

/** Why a single generated word would be rejected, or null if it is fine. */
export function wordIssue(w: string, maxLen = MAX_WORD): string | null {
	if (w.length < 3) return 'too short';
	if (w.length > maxLen) return 'too long';
	const l = w.toLowerCase();
	if (!/[^aeiouyáéíóúâêôàèìòùäöüøåāīẹọɛɔə'\s-]/i.test(l)) return 'no consonant';
	if (/[aeiouyáéíóúâêôàèìòùäöüøåāīẹọɛɔə]{3,}/i.test(l)) return 'vowel run';
	if (maxConsonantRun(l) >= 4) return 'consonant cluster';
	if (/(.)\1\1/.test(l)) return 'triple letter';
	if (hasAwkwardOnset(l)) return 'awkward onset';
	if (hasAwkwardCoda(l)) return 'awkward coda';
	if (UGLY.some((u) => l.includes(u))) return 'ugly letter pair';
	const vowelLetters = [...l].filter((c) => isV(c)).length;
	if (l.length >= 6 && vowelLetters / l.replace(/['\s-]/g, '').length > 0.65) return 'too many vowels';
	// one glottal-stop apostrophe per word reads as flavour; more reads as noise ("Mu''e'ti'")
	if ((l.match(/'/g) ?? []).length > 1 || l.startsWith("'")) return 'apostrophes';
	if (isOffensive(l)) return 'blocklist';
	return null;
}

export const isGoodWord = (w: string, maxLen = MAX_WORD) => wordIssue(w, maxLen) === null;

/** looser check for a dictionary root that will sit inside compounds (may be 2 letters) */
export function isGoodRoot(sp: string): boolean {
	const l = sp.toLowerCase();
	return l.length >= 2 && !l.includes("'") && !hasAwkwardOnset(l) && !hasAwkwardCoda(l) && !UGLY.some((u) => l.includes(u)) && !isOffensive(l) && [...l].some(isV) && [...l].some(isC);
}

/**
 * Full check for a finished (possibly multi-word / affixed) name: every word passes the word rules except
 * onset (affixes like 'Llan-' or "R'" are deliberate), whole name ≤ 18, no near-duplicate in `existing`.
 */
export function nameIssue(name: string, existing?: Iterable<string>): string | null {
	if (name.length < 3) return 'too short';
	if (name.length > 18) return 'too long';
	if (isOffensive(name)) return 'blocklist';
	if (maxConsonantRun(name) >= 4) return 'consonant cluster';
	for (const w of name.split(/[\s]+/)) if (w.replace(/-/g, '').length > MAX_WORD + 4) return 'too long';
	if (existing && isNearDuplicate(name, existing)) return 'near duplicate';
	return null;
}
