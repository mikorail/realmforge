import { hashSeed, makeRng, type Rng } from '../../rng';
import type { Lang } from './core';
import { maxConsonantRun } from './quality';

/**
 * Name drift: plausible sound changes applied century by century (lenition, vowel reduction,
 * syncope/apocope, cluster simplification, degemination...). Each language gets its own subset of
 * rules (derived from its phonology), and the steps are seeded by the name, so:
 *  - the result is a pure function of (name, language, centuries);
 *  - drift is cumulative: driftName(n, L, 3) continues from driftName(n, L, 2).
 */

const DIGRAPHS = ['tsch', 'sch', 'sh', 'ch', 'th', 'kh', 'gh', 'zh', 'ng', 'ts', 'tl', 'ny', 'ph', 'dz'];
const V = 'aeiouyáéíóúâêôäöüøåāīẹọɛɔə';
const isV = (u: string) => u.length === 1 && V.includes(u);
const isC = (u: string) => !isV(u) && u !== "'";

function tokenize(w: string): string[] {
	const out: string[] = [];
	let i = 0;
	while (i < w.length) {
		const d = DIGRAPHS.find((x) => w.startsWith(x, i));
		if (d) { out.push(d); i += d.length; } else { out.push(w[i]); i++; }
	}
	return out;
}

type Rule = (u: string[], r: Rng) => string[] | null;

/** indices where `pred` holds; pick one at random or null */
function site(u: string[], r: Rng, pred: (i: number) => boolean): number | null {
	const hits: number[] = [];
	for (let i = 0; i < u.length; i++) if (pred(i)) hits.push(i);
	return hits.length ? hits[Math.floor(r() * hits.length)] : null;
}
const between = (u: string[], i: number) => i > 0 && i < u.length - 1 && isV(u[i - 1]) && isV(u[i + 1]);
const swap = (u: string[], i: number, v: string) => [...u.slice(0, i), v, ...u.slice(i + 1)];
const drop = (u: string[], i: number) => [...u.slice(0, i), ...u.slice(i + 1)];

const LENITE: Record<string, string> = { p: 'b', t: 'd', k: 'g', f: 'v', s: 'z', q: 'g' };
const SPIRANT: Record<string, string> = { b: 'v', d: 'th', g: 'y' };
const MONOPH: Record<string, string> = { ai: 'e', au: 'o', ei: 'i', ou: 'u', ae: 'e', oi: 'e', ea: 'e', ia: 'e' };
const PALATAL: Record<string, string> = { k: 'ch', g: 'j', t: 'ch', s: 'sh' };
const DEVOICE: Record<string, string> = { b: 'p', d: 't', g: 'k', v: 'f', z: 's' };

export const RULES: Record<string, Rule> = {
	/** voiceless stop between vowels voices: Lupata → Lubata */
	lenition: (u, r) => { const i = site(u, r, (i) => between(u, i) && !!LENITE[u[i]]); return i === null ? null : swap(u, i, LENITE[u[i]]); },
	/** voiced stop between vowels turns fricative: Abara → Avara */
	spirant: (u, r) => { const i = site(u, r, (i) => between(u, i) && !!SPIRANT[u[i]]); return i === null ? null : swap(u, i, SPIRANT[u[i]]); },
	/** a medial vowel drops out if the cluster it leaves stays short: Kalavira → Kalvira */
	syncope: (u, r) => {
		if (u.length < 6) return null;
		const i = site(u, r, (i) => i > 1 && i < u.length - 2 && isV(u[i]) && isC(u[i - 1]) && isC(u[i + 1]) && !isC(u[i - 2]) && !isC(u[i + 2]));
		return i === null ? null : drop(u, i);
	},
	/** final vowel lost after a single consonant: Tomgoba → Tomgob */
	apocope: (u) => (u.length >= 5 && isV(u[u.length - 1]) && isC(u[u.length - 2]) && !isC(u[u.length - 3]) ? u.slice(0, -1) : null),
	/** non-initial vowel weakens to e: Moritaku → Moreteku (one at a time) */
	reduce: (u, r) => { const i = site(u, r, (i) => i > 1 && isV(u[i]) && u[i] !== 'e' && !isV(u[i - 1])); return i === null ? null : swap(u, i, 'e'); },
	/** diphthongs flatten: Kaisar → Kesar */
	monophthong: (u, r) => {
		const i = site(u, r, (i) => i < u.length - 1 && !!MONOPH[u[i] + u[i + 1]]);
		return i === null ? null : [...u.slice(0, i), MONOPH[u[i] + u[i + 1]], ...u.slice(i + 2)];
	},
	/** three consonants in a row lose the middle one; nasals assimilate: Anbar → Ambar */
	cluster: (u, r) => {
		const i = site(u, r, (i) => i > 0 && i < u.length - 1 && isC(u[i - 1]) && isC(u[i]) && isC(u[i + 1]));
		if (i !== null) return drop(u, i);
		const j = site(u, r, (j) => j < u.length - 1 && u[j] === 'n' && 'bp'.includes(u[j + 1]));
		return j === null ? null : swap(u, j, 'm');
	},
	/** double consonants simplify: Kattara → Katara */
	degeminate: (u, r) => { const i = site(u, r, (i) => i > 0 && isC(u[i]) && u[i] === u[i - 1]); return i === null ? null : drop(u, i); },
	/** k/g/t/s before i or e palatalise: Kiru → Chiru */
	palatal: (u, r) => { const i = site(u, r, (i) => i < u.length - 1 && !!PALATAL[u[i]] && 'ie'.includes(u[i + 1])); return i === null ? null : swap(u, i, PALATAL[u[i]]); },
	/** h is lost or kh weakens: Khazar → Hazar, Hamun → Amun */
	hloss: (u) => {
		const i = u.findIndex((x) => x === 'kh' || x === 'gh' || x === 'h');
		if (i < 0) return null;
		if (u[i] === 'h') return u.length > 4 && (i === 0 ? isV(u[1]) : isV(u[i - 1])) ? drop(u, i) : null;
		return swap(u, i, 'h');
	},
	/** word-final voiced consonant devoices: Brogad → Brogat */
	devoice: (u) => (DEVOICE[u[u.length - 1]] ? swap(u, u.length - 1, DEVOICE[u[u.length - 1]]) : null)
};
const OPTIONAL = ['lenition', 'spirant', 'syncope', 'apocope', 'reduce', 'monophthong', 'palatal', 'hloss', 'devoice'];

/** the language's own sound-change set: always cluster + degemination, plus 4 to 6 others */
export function driftProfile(L: Lang | null): string[] {
	const key = L ? `${L.sphere?.id ?? ''}|${L.cons}|${L.vows}|${L.struct}` : 'generic';
	const r = makeRng(hashSeed('drift:' + key));
	const pick = r.shuffle(OPTIONAL).slice(0, r.int(4, 6));
	return ['cluster', 'degeminate', ...pick];
}

function ok(u: string[]): boolean {
	const s = u.join('');
	return s.length >= 3 && u.some(isV) && u.some(isC) && maxConsonantRun(s) < 4;
}

function driftWord(w: string, profile: string[], r: Rng, centuries: number): string {
	let u = tokenize(w.toLowerCase());
	for (let c = 0; c < centuries; c++) {
		// fixed rng use per century (gate + seed) whatever happens, so longer drifts extend shorter ones
		const gate = r();
		const sub = makeRng(Math.floor(r() * 4294967296));
		if (gate > 0.8) continue;
		// try the language's rules in a random order; the first one that applies is this century's change
		for (const name of sub.shuffle(profile)) {
			const next = RULES[name](u, sub);
			if (next && ok(next) && next.join('') !== u.join('')) { u = next; break; }
		}
	}
	return u.join('');
}

/**
 * Erode a name by `centuries` of sound change. Spaces, hyphens and apostrophes are kept; short
 * particles (al-, ibn, Te) and words under 4 letters are left alone; capitalisation is restored.
 */
export function driftName(name: string, lang: Lang | null, centuries: number): string {
	const n = Math.floor(centuries);
	if (n <= 0 || !name) return name;
	const profile = driftProfile(lang);
	const segs = name.split(/([\s'-]+)/);
	return segs
		.map((seg, i) => {
			if (i % 2 === 1 || seg.length < 4) return seg;
			const r = makeRng(hashSeed(`drift|${seg.toLowerCase()}|${profile.join(',')}`));
			const out = driftWord(seg, profile, r, n);
			return seg[0] === seg[0].toUpperCase() ? out.charAt(0).toUpperCase() + out.slice(1) : out;
		})
		.join('');
}

/** every intermediate form, century by century: [original, after 1, after 2, ...] (duplicates kept) */
export function driftStages(name: string, lang: Lang | null, centuries: number): string[] {
	return Array.from({ length: Math.max(0, Math.floor(centuries)) + 1 }, (_, c) => driftName(name, lang, c));
}
