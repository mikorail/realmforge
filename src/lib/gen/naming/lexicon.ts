import type { Rng } from '../../rng';
import { cap, spell, syllable, morpheme, type GlossPart, type Lang } from './core';
import { isGoodRoot } from './quality';

/**
 * Semantic place names: every culture gets a small dictionary of common meanings, built once from its
 * phonology, so its towns share recognisable roots ("two towns both containing the word for river").
 */
export const MEANINGS = {
	/** landscape nouns */
	feature: ['river', 'hill', 'mountain', 'lake', 'sea', 'forest', 'field', 'stone', 'spring', 'marsh', 'island', 'valley', 'oak'],
	/** settlement heads */
	settle: ['ford', 'port', 'fort', 'town', 'bridge', 'hall'],
	adj: ['new', 'old', 'white', 'black', 'red', 'green', 'great', 'little', 'holy', 'high', 'deep', 'gold'],
	dir: ['east', 'west', 'north', 'south'],
	misc: ['land']
} as const;

export const ALL_MEANINGS: string[] = Object.values(MEANINGS).flat();

/** chance that makeName uses the dictionary for a key */
export const SEMANTIC_P: Record<string, number> = { city: 0.4, land: 0.35, river: 0.5 };

/** Fill L.lexicon with one distinct morpheme per meaning. Uses `rng` (not L.rng) so it doesn't shift the name stream. */
export function buildLexicon(L: Lang, rng: Rng) {
	const saved = L.rng;
	L.rng = rng;
	const taken = new Set<string>();
	for (const m of ALL_MEANINGS) {
		let form = '';
		for (let t = 0; t < 150; t++) {
			let f = syllable(L);
			if (spell(L, f).length < 3 && rng() < 0.6) f += syllable(L);
			// glottal stops would stack apostrophes once roots are compounded
			if (spell(L, f).includes("'")) f = f.replace(/ʔ/g, '');
			const sp = spell(L, f);
			if (taken.has(f) || sp.length > 6 || !isGoodRoot(sp)) continue;
			form = f;
			break;
		}
		if (!form) form = syllable(L) + syllable(L) + syllable(L);
		taken.add(form);
		L.lexicon[m] = form;
	}
	L.rng = saved;
}

const pickM = (r: Rng, list: readonly string[], not?: string) => {
	const pool = not ? list.filter((x) => x !== not) : list;
	return r.pick(pool);
};

/**
 * A raw semantic base for a place key, with its gloss parts.
 * `single` = one meaningful root only (the caller is about to add a sphere affix as the head).
 */
export function semanticBase(L: Lang, key: string, single: boolean): { raw: string; parts: GlossPart[] } {
	const r = L.rng;
	const lex = (m: string): [string, GlossPart] => [L.lexicon[m], { form: spell(L, L.lexicon[m]), meaning: m }];
	const free = (): [string, GlossPart] => {
		const m = morpheme(L, '');
		return [m, { form: spell(L, m), meaning: null }];
	};
	const compound = (mod: [string, GlossPart], head: [string, GlossPart]) => {
		const seq = L.headFirst ? [head, mod] : [mod, head];
		return { raw: seq[0][0] + seq[1][0], parts: [seq[0][1], seq[1][1]] };
	};
	const { feature, settle, adj, dir } = MEANINGS;
	if (single) {
		const pool: readonly string[] = key === 'land' ? [...feature, ...adj, ...dir] : [...feature, ...adj];
		const [raw, part] = lex(r.pick(pool));
		return { raw, parts: [part] };
	}
	if (key === 'river') {
		const mod = r() < 0.7 ? lex(pickM(r, [...adj, 'stone', 'forest', 'mountain', 'hill', 'oak', 'marsh'])) : free();
		return compound(mod, lex('river'));
	}
	if (key === 'land') {
		const mod = r() < 0.6 ? lex(r.pick([...dir, ...adj, ...feature])) : free();
		return compound(mod, lex('land'));
	}
	// city
	const roll = r();
	if (roll < 0.55) return compound(lex(r.pick([...feature, ...adj, ...dir])), lex(r.pick(settle)));
	if (roll < 0.85) return compound(lex(r.pick(adj)), lex(pickM(r, feature)));
	return compound(free(), lex(r.pick(settle)));
}

/** The gloss of a name this language minted, or a decomposition into known roots (null if it has none). */
export function gloss(L: Lang, name: string): GlossPart[] | null {
	const stored = L.glosses[name];
	if (stored) return stored;
	// fallback: cover the whole lowercased name with dictionary roots (longest match first)
	const target = name.toLowerCase();
	const forms = Object.entries(L.lexicon)
		.map(([m, raw]) => ({ m, f: spell(L, raw).toLowerCase() }))
		.sort((a, b) => b.f.length - a.f.length);
	const parts: GlossPart[] = [];
	let i = 0;
	while (i < target.length) {
		const hit = forms.find((x) => x.f && target.startsWith(x.f, i));
		if (!hit) return null;
		parts.push({ form: hit.f, meaning: hit.m });
		i += hit.f.length;
	}
	return parts.length >= 2 ? parts : null;
}

/** "kal 'white' + vik 'ford'" (affixes without a meaning are listed bare), or null */
export function glossText(L: Lang, name: string): string | null {
	const parts = gloss(L, name);
	if (!parts?.some((p) => p.meaning)) return null;
	return parts.map((p) => (p.meaning ? `${p.form.toLowerCase()} '${p.meaning}'` : p.form.toLowerCase())).join(' + ');
}

/** meaning -> spelled word, e.g. for a culture card or the gazetteer */
export function dictionary(L: Lang): Record<string, string> {
	const out: Record<string, string> = {};
	for (const m of ALL_MEANINGS) out[m] = cap(spell(L, L.lexicon[m]));
	return out;
}
