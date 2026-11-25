import { describe, expect, it } from 'vitest';
import { generateUniverse } from '../../../gen/universe';
import { Cosmos } from '../../cosmos';
import { culturePackOf, faithLoreOf, personVoiceOf } from '../../../adventure/culturepack_gen';
import { genFaithLore } from './faith';
import type { Genre } from '../../../gen/types';

const SCHEMA_TOKENS = new Set(['name', 'title', 'realm', 'town', 'time', 'deity', 'faith']);
const A_EXCEPT = /^(?:uni[a-z]|use[a-z]*|usu[a-z]*|one\b|once\b|eu[a-z]|ewe\b|ura[a-z]|ute[a-z])/i;

function collectStrings(v: unknown, path = '', out: { path: string; text: string }[] = []): { path: string; text: string }[] {
	if (typeof v === 'string') {
		out.push({ path, text: v });
	} else if (Array.isArray(v)) {
		v.forEach((x, i) => collectStrings(x, `${path}[${i}]`, out));
	} else if (v && typeof v === 'object') {
		for (const [k, x] of Object.entries(v)) collectStrings(x, path ? `${path}.${k}` : k, out);
	}
	return out;
}

function assertCleanText(entries: { path: string; text: string }[]) {
	const problems: string[] = [];
	for (const { path, text } of entries) {
		if (!text) continue;
		if (/\u2014/.test(text)) problems.push(`${path} [em-dash]: ${text}`);
		if (/\bNo faith\b/i.test(text)) problems.push(`${path} [No faith]: ${text}`);
		if (/\b(the|a|an)\s+\1\b/i.test(text)) problems.push(`${path} [double-article]: ${text}`);
		if (/\b(gods|heavens|ancestors|spirits)\s+is\b/i.test(text)) problems.push(`${path} [subject-verb]: ${text}`);
		if (/\b(\w+)\s+(?:sworn on the|of the)\s+(?:\w+\s+)?\1\b/i.test(text) || /of the house of the house/i.test(text)) {
			problems.push(`${path} [repeated-noun]: ${text}`);
		}
		if (/<[a-zA-Z0-9_]+>/.test(text)) problems.push(`${path} [unfilled-angle]: ${text}`);
		for (const m of text.matchAll(/\{([a-zA-Z0-9_]+)\}/g)) {
			if (!SCHEMA_TOKENS.has(m[1])) problems.push(`${path} [unfilled-brace {${m[1]}}]: ${text}`);
		}
		if (!path.includes('.lang.')) {
			for (const m of text.matchAll(/\ba\s+([aeiou][a-z-]+)/gi)) {
				if (!A_EXCEPT.test(m[1])) problems.push(`${path} [a-before-vowel]: ${text}`);
			}
		}
	}
	expect(problems).toEqual([]);
}

function makeSim(seed: string, genre: Genre) {
	const u = generateUniverse(
		{
			seed,
			template: 'continents',
			cells: 1600,
			states: 8,
			width: 1600,
			height: 1000,
			genre,
			planet: 'terran',
			spheres: null,
			depth: 0,
			sky: false,
			sea: false
		},
		1
	);
	const cos = new Cosmos(u);
	for (let m = 0; m < 12 * 15; m++) cos.tick();
	return cos.sims[0];
}

describe('culture pack generation and text polish', () => {
	it('generates deterministic, non-empty packs across spheres and genres with clean text', () => {
		const genres: Genre[] = ['fantasy', 'mythic', 'steampunk', 'cyberpunk', 'wasteland'];
		const spheresSeen = new Set<string>();

		for (const genre of genres) {
			const sim = makeSim(`cp-test-${genre}`, genre);
			// Religion 0 ("No faith") must never produce faith lore
			expect(genFaithLore(sim, 0)).toEqual({});
			expect(faithLoreOf(sim, 0)).toBeUndefined();

			const cultures = sim.w.cultures.filter((c) => c && c.id);
			expect(cultures.length).toBeGreaterThan(0);

			for (const c of cultures) {
				if (c.sphere) spheresSeen.add(c.sphere);
				const pack1 = culturePackOf(sim, c.id);
				const pack2 = culturePackOf(sim, c.id);
				expect(pack1).toBeDefined();
				expect(pack1).toEqual(pack2);

				expect(pack1!.voice?.greet?.length).toBeGreaterThan(0);
				expect(pack1!.voice?.farewell?.length).toBeGreaterThan(0);
				expect(pack1!.voice?.oaths?.length).toBeGreaterThan(0);
				expect(pack1!.voice?.proverbs?.length).toBeGreaterThan(0);
				expect(pack1!.customs?.taboos?.length).toBeGreaterThan(0);
				expect(pack1!.customs?.rites?.length).toBeGreaterThan(0);
				expect(pack1!.literature?.works?.length).toBeGreaterThan(0);
				expect(pack1!.material?.cuisine?.dishes?.length).toBeGreaterThan(0);
				expect(pack1!.material?.crafts?.length).toBeGreaterThan(0);
				expect(pack1!.lang?.lexicon && Object.keys(pack1!.lang.lexicon).length).toBeGreaterThan(0);

				assertCleanText(collectStrings(pack1, `${genre}:cu${c.id}`));
			}

			for (const r of sim.w.religions) {
				if (!r || !r.id) continue;
				const lore1 = faithLoreOf(sim, r.id);
				const lore2 = faithLoreOf(sim, r.id);
				expect(lore1).toBeDefined();
				expect(lore1).toEqual(lore2);
				expect(lore1!.prayers?.length).toBeGreaterThan(0);
				expect(lore1!.scripture?.excerpts?.length).toBeGreaterThan(0);
				assertCleanText(collectStrings(lore1, `${genre}:rel${r.id}`));
			}

			for (const p of sim.people.slice(0, 40)) {
				if (!p || !p.id) continue;
				const pv1 = personVoiceOf(sim, p);
				const pv2 = personVoiceOf(sim, p);
				expect(pv1).toEqual(pv2);
				if (pv1) assertCleanText(collectStrings(pv1, `${genre}:p${p.id}`));
			}
		}

		expect(spheresSeen.size).toBeGreaterThanOrEqual(4);
	}, 30000);
});
