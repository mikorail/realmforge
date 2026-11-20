/**
 * Culture pack: language. A pseudo-language that reads as real because it is the very language the culture's
 * place and person names come from (`makeLang(`${seed}:adv:${id}`, sphere)`, the object export.ts builds).
 * Core words are the culture's dictionary roots (so "river" inside a town name is the lexicon's "river");
 * everyday extras are coined with a side rng from the same phoneme inventory. Pure and deterministic.
 */
import { makeRng } from '../../../rng';
import type { Simulation } from '../../engine';
import type { LangPack } from '../../../adventure/culturepack';
import { makeLang } from '../../../gen/names';
import { syllable, spell, joinAffix, type Lang } from '../../../gen/naming/core';
import { tidy, wordIssue, editDistance, isGoodRoot } from '../../../gen/naming/quality';

/** dictionary roots (MEANINGS) that go into the lexicon, with their gloss */
const CORE = ['river', 'hill', 'mountain', 'lake', 'sea', 'forest', 'field', 'stone', 'valley', 'ford', 'port', 'fort', 'town', 'hall', 'new', 'old', 'white', 'black', 'red', 'green', 'great', 'holy', 'high', 'deep', 'gold', 'east', 'west', 'north', 'south', 'land'];

/** everyday extras coined from the same sounds: key and gloss */
const EXTRA: [string, string][] = [
	['hearth', 'hearth'], ['bread', 'bread'], ['water', 'water'], ['road', 'road'], ['sword', 'sword'], ['kin', 'kin'], ['elder', 'elder'],
	['mother', 'mother'], ['father', 'father'], ['child', 'child'], ['friend', 'friend'], ['enemy', 'enemy'], ['god', 'god'], ['night', 'night'],
	['sun', 'sun'], ['fire', 'fire'], ['death', 'death'], ['life', 'life'], ['guest', 'guest'], ['oath', 'oath'], ['home', 'home'], ['sky', 'sky'],
	['blood', 'blood'], ['king', 'ruler'], ['wolf', 'wolf'], ['salt', 'salt'], ['wine', 'wine'], ['song', 'song'], ['word', 'word'],
	['good', 'good'], ['strong', 'strong'], ['give', 'to give'], ['drink', 'to drink'], ['keep', 'to keep, to guard'],
	['you', 'you'], ['my', 'my'], ['and', 'and'], ['not', 'not']
];

export interface Tongue {
	L: Lang;
	/** key -> word in the culture's tongue (lowercase) */
	w: Record<string, string>;
	/** key -> English gloss */
	en: Record<string, string>;
	/** words for 1 to 10 */
	num: string[];
	/** headFirst languages put the adjective after the noun */
	headFirst: boolean;
}

const cache = new WeakMap<object, Map<number, Tongue>>();

/** the culture's tongue: shared by language.ts and literature.ts (poetic form names, refrains, numerals) */
export function cultureTongue(sim: Simulation, cu: number): Tongue {
	let m = cache.get(sim.w);
	if (!m) cache.set(sim.w, (m = new Map()));
	let t = m.get(cu);
	if (!t) m.set(cu, (t = buildTongue(sim, cu)));
	return t;
}

function coin(L: Lang, rng: ReturnType<typeof makeRng>, taken: string[], opts: { syl?: 1 | 2; min?: number; max?: number } = {}): string {
	const saved = L.rng;
	L.rng = rng;
	try {
		for (let t = 0; t < 600; t++) {
			const n = opts.syl ?? (t > 400 ? 3 : rng() < 0.55 ? 1 : 2);
			let raw = '';
			for (let i = 0; i < n; i++) raw += syllable(L);
			const sp = tidy(spell(L, raw)).toLowerCase();
			if (sp.length < (opts.min ?? 3) || sp.length > (opts.max ?? 9)) continue;
			if (wordIssue(sp, 9)) continue;
			if (taken.some((x) => editDistance(sp, x, 1) <= 1)) continue;
			return sp;
		}
		// give up politely: two plain syllables, still unique
		let sp = '';
		do sp = tidy(spell(L, syllable(L) + syllable(L))).toLowerCase();
		while (taken.includes(sp));
		return sp;
	} finally {
		L.rng = saved;
	}
}

function buildTongue(sim: Simulation, cu: number): Tongue {
	const w = sim.w;
	const cult = w.cultures[cu];
	// the very language export.ts builds, so words match place and person names
	const L = makeLang(`${w.opts.seed}:adv:${cu}`, cult?.sphere || undefined);
	const rng = makeRng(`${w.opts.seed}:cp:lang:${cu}`);
	const words: Record<string, string> = {};
	const en: Record<string, string> = {};
	const taken: string[] = [];
	for (const k of CORE) {
		const raw = L.lexicon[k];
		let sp = raw ? tidy(spell(L, raw)).toLowerCase() : '';
		const issue = sp ? wordIssue(sp) : 'empty';
		// a dictionary root is a place-name part, so it stays even when it is only too short; any other fault gets a coined word
		if (!sp || taken.includes(sp) || (issue && (issue !== 'too short' || !isGoodRoot(sp)))) sp = coin(L, rng, taken);
		words[k] = sp;
		en[k] = k;
		taken.push(sp);
	}
	for (const [k, g] of EXTRA) {
		// particles and pronouns are short: one syllable
		const short = k === 'you' || k === 'my' || k === 'and' || k === 'not' || k === 'good';
		words[k] = coin(L, rng, taken, { syl: short ? 1 : undefined });
		en[k] = g;
		taken.push(words[k]);
	}
	// the two particles: short function words
	words.of = coin(L, rng, taken, { syl: 1 });
	taken.push(words.of);
	words.the = coin(L, rng, taken, { syl: 1 });
	en.of = 'of (links two nouns)';
	en.the = 'the';
	return { L, w: words, en, num: numerals(L, rng, taken), headFirst: L.headFirst };
}

function numerals(L: Lang, rng: ReturnType<typeof makeRng>, taken: string[]): string[] {
	const t = [...taken];
	const base = (): string => {
		const x = coin(L, rng, t, { syl: rng() < 0.7 ? 1 : 2 });
		t.push(x);
		return x;
	};
	const join = (a: string, b: string) => {
		const j = tidy(joinAffix(a, '-' + b)).toLowerCase();
		return wordIssue(j, 12) ? `${a}-${b}` : j;
	};
	if (rng() < 0.5) return Array.from({ length: 10 }, base);
	// quinary: 1 to 5, a word for ten, and six to nine as five plus one to four
	const n = Array.from({ length: 5 }, base);
	const ten = base();
	return [...n, join(n[4], n[0]), join(n[4], n[1]), join(n[4], n[2]), join(n[4], n[3]), ten];
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function describeShape(L: Lang): { consonants: string; vowels: string; shape: string } {
	const set = new Set<string>();
	const s = L.struct;
	const add = (chars: string) => { for (const ch of chars) set.add(spell(L, ch)); };
	if (/C/.test(s)) add(L.cons);
	if (/S/.test(s)) add(L.sibs);
	if (/L/.test(s)) add(L.liqs);
	if (/F/.test(s)) add(L.fins);
	if (/N/.test(s)) add('mn');
	const consonants = [...set].filter((x) => x && x !== "'").join(' ') + (s.includes('ʔ') || set.has("'") ? " and a glottal stop (written ')" : '');
	const vowels = [...new Set(L.vows.split('').map((v) => spell(L, v)))].join(' ');
	const names: Record<string, string> = { C: 'consonant', S: 'hissing consonant', L: 'liquid', F: 'final consonant', N: 'nasal', V: 'vowel', 'ʔ': 'glottal stop' };
	const parts: string[] = [];
	for (let i = 0; i < s.length; i++) {
		const ch = s[i];
		if (ch === '?') continue;
		const nm = names[ch] ?? ch;
		parts.push(s[i + 1] === '?' ? `(${nm})` : nm);
	}
	const digraphs = [...set].filter((x) => x.length > 1);
	const bits: string[] = [];
	bits.push(`A syllable runs ${parts.join(' + ')}, brackets meaning optional.`);
	bits.push(`Words take ${L.minSyl} to ${L.maxSyl} syllables.`);
	if (digraphs.length) bits.push(`${digraphs.slice(0, 4).join(', ')} are single sounds.`);
	bits.push(L.headFirst ? 'The head noun comes first and its modifier follows, so "white ford" is "ford white".' : 'A modifier comes before its noun, so "white ford" is "white" then "ford".');
	if (L.sphere?.city?.length) bits.push(`Towns often end or begin in ${L.sphere.city.slice(0, 3).map((x) => x.trim()).join(', ')}.`);
	return { consonants, vowels, shape: bits.join(' ') };
}

type PhraseUse = NonNullable<LangPack['phrases']>[number]['use'];

export function genLanguage(sim: Simulation, cu: number): LangPack {
	const cult = sim.w.cultures[cu];
	if (!cult) return {};
	const T = cultureTongue(sim, cu);
	const { w, en } = T;
	const lexicon: [string, string][] = [];
	for (const k of [...CORE, ...EXTRA.map((e) => e[0]), 'of', 'the']) if (w[k]) lexicon.push([w[k], en[k]]);
	// two-word phrases: adjective follows the noun in head-first languages
	const np = (n: string, a: string) => (T.headFirst ? [n, a] : [a, n]);
	const mk = (use: PhraseUse, english: string, keys: string[]) => ({
		say: cap(keys.map((k) => w[k]).join(' ')),
		gloss: `${english} (${keys.map((k) => en[k].replace(/ \(.*/, '')).join(' ')})`,
		use
	});
	const phrases = [
		mk('greet', 'A good hearth to you.', [...np('hearth', 'good'), 'you']),
		mk('greet', 'Bread and water to you.', ['bread', 'and', 'water', 'you']),
		mk('greet', 'A good sun, elder.', [...np('sun', 'good'), 'elder']),
		mk('greet', 'My friend.', ['friend', 'my']),
		mk('toast', 'To life and wine!', ['life', 'and', 'wine']),
		mk('toast', 'To fire and kin!', ['fire', 'and', 'kin']),
		mk('toast', 'Salt and wine for my friends.', ['salt', 'and', 'wine', 'my', 'friend']),
		mk('thanks', 'You have given well.', ['you', 'give', 'good']),
		mk('thanks', 'My hearth is yours.', ['hearth', 'my', 'you']),
		mk('farewell', 'A good road to you.', [...np('road', 'good'), 'you']),
		mk('farewell', 'Good night.', np('night', 'good')),
		mk('farewell', 'Keep your home well.', ['home', 'you', 'keep', 'good']),
		mk('curse', 'Death to you.', ['death', 'you']),
		mk('curse', 'No hearth for you.', ['hearth', 'not', 'you']),
		mk('curse', 'May the wolf have you.', ['wolf', 'you', 'give']),
		mk('curse', 'Enemy of my kin.', ['enemy', 'of', 'kin', 'my']),
		mk('oath', 'My oath is stone.', ['oath', 'my', 'stone']),
		mk('oath', 'An oath of salt and blood.', ['oath', 'of', 'salt', 'and', 'blood']),
		mk('oath', 'My sword keeps you.', ['sword', 'my', 'you', 'keep']),
		mk('blessing', 'May god keep you.', ['god', 'you', 'keep']),
		mk('blessing', 'A good sky over you.', [...np('sky', 'good'), 'you']),
		mk('blessing', 'Strong kin and a good home.', [...np('kin', 'strong'), 'and', ...np('home', 'good')])
	];
	return { phonology: describeShape(T.L), lexicon, phrases, numerals: T.num };
}
