import { describe, expect, it } from 'vitest';
import { SPHERES, SPHERE_BY_ID } from './spheres';
import {
	makeLang, makeName, personName, fullPersonName, regnalName, toRoman, nextRegnalNumber, epithet,
	gloss, glossText, dictionary, MEANINGS, driftName, driftStages, nameIssue, wordIssue, isGoodWord,
	isNearDuplicate, isOffensive, tidy, dayName, clanOf
} from './names';
import { makeRng } from '../rng';
import { maxConsonantRun, hasAwkwardOnset, editDistance } from './naming/quality';
import { generateUniverse } from './universe';
import type { GenInput } from './types';

const lang = (sphere: string, seed = 'test') => makeLang(`${seed}:${sphere}`, sphere);

describe('name grammar per sphere', () => {
	it('Nordic: patronymic -son / -dottir from the father', () => {
		const L = lang('norse');
		const m = fullPersonName(L, 'norse', { gender: 'm', father: 'Harald' });
		const f = fullPersonName(L, 'norse', { gender: 'f', father: 'Harald' });
		expect(m.surname).toBe('Haraldson');
		expect(f.surname).toBe('Haralddottir');
		expect(m.plain).toBe(`${m.given} Haraldson`);
	});
	it('Slavic: given + patronymic (-ovich/-ovna) + family, family feminised', () => {
		const L = lang('slavic');
		const m = fullPersonName(L, null, { gender: 'm', father: 'Ivano', house: 'Volkov' });
		const f = fullPersonName(L, null, { gender: 'f', father: 'Ivano', house: 'Volkov' });
		expect(m.surname).toBe('Ivanovich Volkov');
		expect(f.surname).toBe('Ivanovna Volkova');
		expect(m.house).toBe('Volkov');
		expect(f.house).toBe('Volkov');
	});
	it('Semitic: ibn / bint before the father, al- before the house', () => {
		const L = lang('arabic');
		const m = fullPersonName(L, 'arabic', { gender: 'm', father: 'Qadir', house: 'Zahra' });
		const f = fullPersonName(L, 'arabic', { gender: 'f', father: 'Qadir', house: 'Zahra' });
		expect(m.plain).toBe(`${m.given} ibn Qadir al-Zahra`);
		expect(f.surname).toBe('bint Qadir al-Zahra');
	});
	it('Celtic mac/nic, Steppe -oghlu, Persianate -pur', () => {
		expect(fullPersonName(lang('celtic'), 'celtic', { gender: 'm', father: 'Airt' }).surname).toBe('mac Airt');
		expect(fullPersonName(lang('celtic'), 'celtic', { gender: 'f', father: 'Airt' }).surname).toBe('nic Airt');
		expect(fullPersonName(lang('steppe'), 'steppe', { gender: 'm', father: 'Temur' }).surname).toBe('Temuroghlu');
		expect(fullPersonName(lang('persian'), 'persian', { gender: 'm', father: 'Rostam' }).surname).toBe('Rostampur');
	});
	it("Ethiopic: the father's given name is the second name", () => {
		const n = fullPersonName(lang('ethiopic'), 'ethiopic', { father: 'Tewodros' });
		expect(n.surname).toBe('Tewodros');
		expect(n.plain).toBe(`${n.given} Tewodros`);
	});
	it('Sinic and Japonic put the family name first', () => {
		for (const id of ['sinic', 'japonic']) {
			const n = fullPersonName(lang(id), id, {});
			expect(SPHERE_BY_ID[id].grammar?.order).toBe('family-given');
			expect(n.plain).toBe(`${n.surname} ${n.given}`);
		}
	});
	it('Sinic/Mande clans come from a small closed pool and are hereditary', () => {
		for (const id of ['sinic', 'mande']) {
			const L = lang(id);
			expect(L.clans.length).toBe(SPHERE_BY_ID[id].grammar!.clans);
			const names = Array.from({ length: 60 }, () => fullPersonName(L, id, {}));
			for (const n of names) expect(L.clans).toContain(n.surname);
			// same house → same clan (jamu passes down the lineage)
			const a = fullPersonName(L, id, { house: names[0].house });
			expect(a.surname).toBe(names[0].surname);
			expect(clanOf(L, names[0].house)).toBe(names[0].surname);
			expect(new Set(names.map((n) => n.surname)).size).toBeLessThanOrEqual(L.clans.length);
		}
	});
	it('Guinean: Akan-style weekday names, seven per gender with shared prefixes', () => {
		const L = lang('yoruba');
		expect(L.dayNames?.m.length).toBe(7);
		expect(L.dayNames?.f.length).toBe(7);
		expect(new Set(L.dayNames!.m).size).toBe(7);
		const n = fullPersonName(L, 'yoruba', { gender: 'm', weekday: 5 });
		expect(n.given).toBe(dayName(L, 5, 'm'));
		// every masculine day name starts with the same prefix letter(s)
		const first = new Set(L.dayNames!.m.map((s) => s[0]));
		expect(first.size).toBe(1);
	});
	it('Japonic, Latinate and Slavic houses take sphere affixes', () => {
		const ja = lang('japonic');
		const houses = Array.from({ length: 40 }, () => makeName(ja, 'house'));
		const affixed = houses.filter((h) => /(moto|yama|kawa|mura|da|shita|hara)$/.test(h));
		expect(affixed.length).toBeGreaterThan(10);
		const la = lang('latin');
		expect(Array.from({ length: 40 }, () => makeName(la, 'house')).some((h) => h.endsWith('ius'))).toBe(true);
	});
	it('Boreal has no shown surname; spheres without grammar use the house', () => {
		const n = fullPersonName(lang('inuit'), 'inuit', {});
		expect(n.surname).toBe('');
		expect(n.plain).toBe(n.given);
		const plain = makeLang('nosphere');
		const p = fullPersonName(plain, null, { house: 'Ashford' });
		expect(p.plain).toBe(`${p.given} Ashford`);
	});
	it('every sphere produces sane full names', () => {
		for (const sp of SPHERES) {
			const L = lang(sp.id, 'every');
			for (let i = 0; i < 20; i++) {
				const n = fullPersonName(L, sp, { epithet: i % 4 === 0 });
				expect(n.given.length).toBeGreaterThanOrEqual(2);
				expect(n.full.startsWith(sp.grammar?.order === 'family-given' && n.surname ? n.surname : n.given)).toBe(true);
				expect(n.full).not.toMatch(/\d|''|undefined/);
				expect(wordIssue(n.given, 10)).toBeNull();
			}
		}
	});
	it('personName still returns a single short given name', () => {
		const L = lang('norse');
		for (let i = 0; i < 50; i++) {
			const s = personName(L);
			expect(s).not.toContain(' ');
			expect(s.length).toBeLessThanOrEqual(10);
		}
	});
	it('given names recur (popular-name pool), so regnal numbers matter', () => {
		const L = lang('latin');
		const names = Array.from({ length: 200 }, () => personName(L));
		expect(new Set(names).size).toBeLessThan(150);
	});
	it('regnal numbers and epithets', () => {
		expect(regnalName('Kofi', 3)).toBe('Kofi III');
		expect(regnalName('Kofi', 0)).toBe('Kofi');
		expect(toRoman(14)).toBe('XIV');
		expect(toRoman(1999)).toBe('MCMXCIX');
		expect(nextRegnalNumber(['Kofi', 'Yaw', 'Kofi'], 'Kofi')).toBe(3);
		expect(nextRegnalNumber([], 'Kofi')).toBe(1);
		const n = fullPersonName(lang('yoruba'), 'yoruba', { given: 'Kofi', regnal: 3, epithet: 'the Bold' });
		expect(n.full).toBe('Kofi III the Bold');
		const r = makeRng('ep');
		const eps = Array.from({ length: 40 }, () => epithet(r, ['Strong']));
		expect(eps.some((e) => ['Iron-Hand', 'the Strong', 'the Mighty'].includes(e))).toBe(true);
		expect(eps.every((e) => typeof e === 'string' && e.length > 2)).toBe(true);
	});
});

describe('semantic place names', () => {
	it('each culture has one distinct root per meaning', () => {
		for (const sp of SPHERES) {
			const L = lang(sp.id);
			const all = Object.values(MEANINGS).flat();
			const forms = all.map((m) => L.lexicon[m]);
			expect(forms.every(Boolean)).toBe(true);
			expect(new Set(forms).size).toBe(forms.length);
			expect(Object.keys(dictionary(L))).toEqual(all);
		}
	});
	it('the dictionary is stable per culture and shared by its sim-era language', () => {
		const a = makeLang('seed:lang:3', 'norse');
		const b = makeLang('seed:lang:3', 'norse');
		const sim = makeLang('seed:lang:3:sim', 'norse');
		expect(a.lexicon).toEqual(b.lexicon);
		expect(sim.lexicon).toEqual(a.lexicon);
		expect(sim.cons).toBe(a.cons);
		expect(makeLang('seed:lang:4', 'norse').lexicon).not.toEqual(a.lexicon);
	});
	it('rivers and towns share recognisable roots', () => {
		const L = lang('celtic', 'roots');
		const rivers = Array.from({ length: 30 }, () => makeName(L, 'river'));
		const riverWord = L.lexicon.river;
		const withRiver = rivers.filter((r) => gloss(L, r)?.some((p) => p.meaning === 'river'));
		expect(withRiver.length).toBeGreaterThanOrEqual(2);
		for (const r of withRiver) expect(r.toLowerCase()).toContain(riverWord.toLowerCase());
		const towns = Array.from({ length: 60 }, () => makeName(L, 'city'));
		const glossed = towns.filter((t) => glossText(L, t));
		expect(glossed.length).toBeGreaterThan(10);
		// at least one meaning shows up in two different town names
		const counts: Record<string, number> = {};
		for (const t of glossed) for (const p of gloss(L, t)!) if (p.meaning) counts[p.meaning] = (counts[p.meaning] ?? 0) + 1;
		expect(Math.max(...Object.values(counts))).toBeGreaterThanOrEqual(2);
	});
	it("glosses spell out the parts and match the written name", () => {
		const L = lang('nahua', 'gloss');
		for (let i = 0; i < 80; i++) {
			const n = makeName(L, i % 2 ? 'city' : 'land');
			const parts = gloss(L, n);
			if (!parts) continue;
			const text = glossText(L, n);
			if (text) expect(text).toMatch(/'[a-z]+'/);
			// meaningful parts appear in the written name
			for (const p of parts) if (p.meaning) expect(n.toLowerCase()).toContain(p.form.toLowerCase());
		}
	});
	it('gloss() can decompose a compound of dictionary roots it never minted', () => {
		const L = lang('norse', 'parse');
		const name = (L.lexicon.white + L.lexicon.ford).replace(/./, (c) => c.toUpperCase());
		const spelled = dictionary(L).white + dictionary(L).ford.toLowerCase();
		const parts = gloss(L, spelled);
		expect(parts?.map((p) => p.meaning)).toEqual(['white', 'ford']);
		expect(name.length).toBeGreaterThan(0);
	});
});

describe('name drift', () => {
	const L = lang('latin', 'drift');
	it('is pure and deterministic', () => {
		expect(driftName('Tomgobata', L, 8)).toBe(driftName('Tomgobata', L, 8));
		expect(driftName('Tomgobata', L, 0)).toBe('Tomgobata');
	});
	it('changes names over many centuries and keeps them pronounceable', () => {
		const names = ['Tomgobata', 'Kalavira', 'Pattakeno', 'Ruwrupthani', 'Sewlalibela', 'Namirask', 'Akuvamavaral'];
		let changed = 0;
		for (const n of names) {
			const d = driftName(n, L, 12);
			if (d !== n) changed++;
			expect(d.length).toBeGreaterThanOrEqual(3);
			expect(maxConsonantRun(d)).toBeLessThan(4);
			expect(d[0]).toBe(d[0].toUpperCase());
		}
		expect(changed).toBeGreaterThanOrEqual(5);
	});
	it('is cumulative: each century continues the previous form', () => {
		const st = driftStages('Pattakenora', L, 10);
		expect(st[0]).toBe('Pattakenora');
		expect(st.length).toBe(11);
		expect(st[10]).toBe(driftName('Pattakenora', L, 10));
		// drifting never makes a name longer by more than a letter or two
		for (const s of st) expect(s.length).toBeLessThanOrEqual('Pattakenora'.length + 2);
	});
	it('keeps particles and separators', () => {
		const d = driftName('Dar Kattabila', L, 10);
		expect(d.startsWith('Dar ')).toBe(true);
		expect(driftName('al-Qasimara', L, 10).startsWith('al-')).toBe(true);
	});
	it('different languages drift the same name differently', () => {
		const outs = new Set(SPHERES.slice(0, 12).map((sp) => driftName('Pakitasombara', lang(sp.id, 'dd'), 15)));
		expect(outs.size).toBeGreaterThan(2);
	});
});

describe('quality filter', () => {
	it('rejects over-long words, vowel runs, 4+ consonant clusters and missing consonants', () => {
		expect(wordIssue('Abcdefghijklm')).toBe('too long');
		expect(wordIssue('Ueooei')).toBe('no consonant');
		expect(wordIssue('Kaeiro')).toBe('vowel run');
		expect(wordIssue('Ankstrom')).toBe('consonant cluster');
		expect(maxConsonantRun('Fekhkhocbur')).toBe(4);
		expect(isGoodWord('Haraldson')).toBe(true);
	});
	it('rejects awkward onsets but allows natural ones', () => {
		for (const bad of ['Rzhhr', 'Rnuzhs', 'Pvamrimvi', 'Dlonledro', 'Tkaro']) expect(hasAwkwardOnset(bad)).toBe(true);
		for (const ok of ['Strand', 'Nzunyombe', 'Mbeya', 'Tlaloc', 'Kristo', 'Shrabri', 'Bjorn', 'Ndola', 'Arno']) expect(hasAwkwardOnset(ok)).toBe(false);
		expect(wordIssue('Rzhaba')).toBe('awkward onset');
	});
	it('rejects awkward codas and noisy apostrophes', () => {
		expect(wordIssue('Pagratzh')).not.toBeNull();
		expect(wordIssue('Nopm')).not.toBeNull();
		expect(wordIssue("Mu'e'ti")).toBe('apostrophes');
		expect(tidy("'Mu''e'ti'")).toBe("Mu'eti");
		expect(tidy("Dar 'Kalo'ba")).toBe("Dar Kalo'ba");
	});
	it('blocks offensive substrings', () => {
		expect(isOffensive('Bashitar')).toBe(true);
		expect(isOffensive('Kalavira')).toBe(false);
		expect(wordIssue('Fukinu')).toBeNull();
		expect(wordIssue('Rafucka')).toBe('blocklist');
	});
	it('detects near-duplicates (edit distance ≤ 1)', () => {
		expect(editDistance('kalvik', 'kalvig')).toBe(1);
		expect(isNearDuplicate('Kalvik', ['Kalvig'])).toBe(true);
		expect(isNearDuplicate('Kalvik', ['Kalvikka'])).toBe(false);
		expect(nameIssue('Kalvik', ['Kalvi'])).toBe('near duplicate');
		expect(nameIssue('Kalvik', ['Dunmore'])).toBeNull();
	});
	it('generated place names obey every rule, across all spheres', () => {
		for (const sp of SPHERES) {
			const L = lang(sp.id, 'q');
			const made: string[] = [];
			for (let i = 0; i < 40; i++) {
				const key = ['city', 'land', 'river', 'people'][i % 4];
				const n = makeName(L, key);
				expect(n, `${sp.id}: ${n}`).not.toMatch(/\d|''/);
				expect(n.length, `${sp.id}: ${n}`).toBeLessThanOrEqual(18);
				expect(maxConsonantRun(n), `${sp.id}: ${n}`).toBeLessThan(4);
				expect(isOffensive(n)).toBe(false);
				expect(isNearDuplicate(n, made), `${sp.id}: ${n} vs ${made.join(',')}`).toBe(false);
				made.push(n);
			}
		}
	});
});

describe('determinism', () => {
	it('same seed → same names, people and drift', () => {
		const run = () => {
			const L = makeLang('det:1', 'yoruba');
			return [
				...Array.from({ length: 10 }, () => makeName(L, 'city')),
				...Array.from({ length: 10 }, () => fullPersonName(L, null, { epithet: true }).full),
				driftName('Ilebadofe', L, 7)
			];
		};
		expect(run()).toEqual(run());
	});
	it('world generation stays reproducible', () => {
		const base: GenInput = { seed: 'names', template: 'continents', cells: 2000, states: 8, width: 1600, height: 1000, genre: 'fantasy', planet: 'terran', spheres: null, depth: 1, sky: false, sea: false };
		const a = generateUniverse(base, 1).planets[0];
		const b = generateUniverse(base, 1).planets[0];
		expect(a.burgs.map((x) => x.name)).toEqual(b.burgs.map((x) => x.name));
		expect(a.rivers.map((x) => x.name)).toEqual(b.rivers.map((x) => x.name));
		expect(a.states.map((x) => x.fullName)).toEqual(b.states.map((x) => x.fullName));
	});
});
