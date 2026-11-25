/**
 * Faith lore for the Wanderer culture pack: prayers, liturgy, scripture, saints, heresies, afterlife, holy days,
 * blessings, sins, clergy greetings and observances, per religion. Pure and deterministic (side rngs only,
 * `seed:cp:faith:<id>`), reads sim state without changing it.
 */
import { makeRng, type Rng } from '../../../rng';
import { makeLang, personName } from '../../../gen/names';
import { DOCTRINES } from '../../../gen/religions';
import type { DoctrineKind, TheologyKind } from '../../../gen/types';
import type { FaithPack } from '../../../adventure/culturepack';
import type { Simulation } from '../../engine';
import { getSaintsInquisitionState } from '../../saints_inquisition';
import { monthName } from '../profile';
import {
	DARK_FORCES, DOC_AFTERLIFE, DOC_BLESSINGS, DOC_CLERGY, DOC_HERESIES, DOC_HOLYDAYS, DOC_LITURGY, DOC_OBSERVANCES, DOC_PRAYERS,
	DOC_SCRIPTURE, DOC_SINS, GENERIC_BLESSINGS, GENERIC_OBSERVANCES, GENERIC_SINS, GENRE_FAITH, LEGENDARY_LIVES, LEGEND_EPITHETS,
	LESSER_GODS, SCHISM_CLAIMS, SCRIPTURE_TITLES_A, SCRIPTURE_TITLES_B, THEO_AFTERLIFE, THEO_PRAYERS, THEO_SCRIPTURE, VIRTUE_LEGENDS
} from './faith_data';

type Tokens = Record<string, string>;

const A_EXCEPT = /^(?:uni[a-z]|use[a-z]*|usu[a-z]*|one\b|once\b|eu[a-z]|ewe\b|ura[a-z]|ute[a-z])/i;
function fixArticles(s: string): string {
	return s
		.replace(/\b(the)\s+the\b/gi, '$1')
		.replace(/\b(a|an)\s+\1\b/gi, '$1')
		.replace(/\b(a)\s+([aeiou][a-z-]*)/gi, (m, art: string, word: string) =>
			A_EXCEPT.test(word) ? m : `${art === 'A' ? 'An' : 'an'} ${word}`
		);
}

const fill = (t: string, k: Tokens): string => {
	const s = fixArticles(t.replace(/\{(\w+)\}/g, (m, key: string) => (key in k ? k[key] : m)));
	return s.charAt(0).toUpperCase() + s.slice(1);
};
const take = <T>(rng: Rng, arr: readonly T[], n: number): T[] => rng.shuffle(arr).slice(0, Math.min(n, arr.length));
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function defaultTheology(type: string): TheologyKind {
	return type === 'Folk' ? 'animism' : type === 'Cult' ? 'chaos_cult' : 'monotheism';
}
function defaultDoctrine(type: string): DoctrineKind {
	return type === 'Folk' ? 'ancestral' : type === 'Cult' ? 'esoteric' : 'caste';
}

export function genFaithLore(sim: Simulation, religionId: number): FaithPack {
	const w = sim.w;
	const r = w.religions[religionId];
	if (!r || !r.id || r.name === 'No faith') return {};
	const seed = w.opts.seed;
	const rng = makeRng(`${seed}:cp:faith:${religionId}`);
	const theology = r.theology ?? defaultTheology(r.type);
	const doctrine = r.doctrine ?? defaultDoctrine(r.type);
	const genre = GENRE_FAITH[sim.voice] ?? GENRE_FAITH.fantasy;
	const cu = w.cultures[r.culture];
	const L = makeLang(`${seed}:cp:faithlang:${religionId}`, cu?.sphere || undefined);

	const deity = (r.deity || '').split(',')[0].trim() || r.name;
	const D2 = theology === 'dualism' ? rng.pick(DARK_FORCES) : '';
	const gods = rng.shuffle(LESSER_GODS).filter((g) => g !== deity);
	const tk: Tokens = {
		D: deity,
		D2: theology === 'dualism' ? D2 : gods[0],
		D3: gods[1],
		P: cu ? L.places[0] || cu.name : r.name,
		lamp: genre.lamp,
		book: genre.book,
		bell: genre.bell,
		hall: genre.hall,
		bread: genre.bread,
		vessel: genre.vessel,
		T: DOCTRINES[doctrine].clergyTitle.toLowerCase()
	};
	// a few more place names for variety (fresh per use)
	const place = (): string => {
		const names = L.places.length ? L.places : [cu?.name ?? r.name];
		return names[rng.int(0, names.length - 1)];
	};
	const f = (t: string): string => fill(t, { ...tk, P: place() });

	// inquisition state, read-only
	const st = getSaintsInquisitionState(sim);
	const inq = st.inquisitions.find((i) => i.religionId === religionId && i.active);

	// prayers: 4 in the theology's voice, 2 from the doctrine
	const prayers = [...take(rng, THEO_PRAYERS[theology], 4), ...take(rng, DOC_PRAYERS[doctrine], 2)].map(f);

	// liturgy
	const lit = DOC_LITURGY[doctrine];
	const drop = new Set<number>();
	const dropN = rng.int(0, 3);
	while (drop.size < dropN) drop.add(rng.int(1, lit.steps.length - 2));
	const liturgy = {
		name: rng.pick(lit.names),
		steps: lit.steps.filter((_, i) => !drop.has(i)).map(f)
	};

	// scripture
	const scripture = {
		title: `${rng.pick(SCRIPTURE_TITLES_A)} ${rng.pick(SCRIPTURE_TITLES_B)}`,
		excerpts: rng.shuffle([...take(rng, THEO_SCRIPTURE[theology], 4), ...take(rng, DOC_SCRIPTURE[doctrine], 5)]).map(f)
	};

	// saints: real canonised people first, legends for the rest
	const real = st.saints.filter((s) => s.religionId === religionId).sort((a, b) => b.canonizedYear - a.canonizedYear).slice(0, 4);
	const saints: { name: string; legend: string; feast?: string }[] = [];
	const feastOf = (): string => `Day ${rng.int(1, 27)} of ${monthName(w, r.culture, rng.int(0, 11))}`;
	for (const s of real) {
		const shrine = w.burgs[s.shrineBurg]?.name ?? place();
		const bank = VIRTUE_LEGENDS[s.virtue] ?? VIRTUE_LEGENDS.Mercy;
		const legend = fill(rng.pick(bank), { ...tk, n: s.name, P: shrine });
		saints.push({ name: s.title, legend: `${legend} Canonised in year ${s.canonizedYear}.`, feast: feastOf() });
	}
	const wantLegends = real.length === 0 ? rng.int(3, 4) : Math.max(0, 2 - real.length);
	const lives = rng.shuffle(LEGENDARY_LIVES);
	for (let i = 0; i < wantLegends; i++) {
		const n = personName(L);
		const e = rng.pick(LEGEND_EPITHETS);
		const [virtue, line] = lives[i % lives.length];
		void virtue;
		saints.push({ name: `${n} ${e}`, legend: f(line.replace('{n} {e}', n)), feast: feastOf() });
	}

	// heresies: 2 to 4 from the doctrine bank, plus a real rival split with the same deity when present
	const hb = DOC_HERESIES[doctrine];
	const nH = rng.int(2, 4);
	const names = rng.shuffle(hb.names);
	const claims = rng.shuffle(hb.claims);
	const heresies: { name: string; claim: string }[] = [];
	const rival = w.religions.find((o) => o.id !== religionId && o.deity && o.deity === r.deity && o.type === 'Cult' && o.name !== r.name);
	if (rival) heresies.push({ name: rival.name, claim: `Holds ${lowerFirst(f(rng.pick(SCHISM_CLAIMS)))}.` });
	for (let i = 0; heresies.length < nH && i < names.length; i++) {
		heresies.push({ name: fill(names[i], tk), claim: `Holds ${lowerFirst(f(claims[i % claims.length]))}.` });
	}

	// afterlife
	const a1 = f(rng.pick(THEO_AFTERLIFE[theology]));
	const a2 = f(DOC_AFTERLIFE[doctrine]);
	const afterlife = rng.chance(0.7) && a1.length + a2.length < 118 ? `${a1} ${a2}` : a1;

	// holy days: month jitter keeps them near the doctrine's season
	const hd = take(rng, DOC_HOLYDAYS[doctrine], rng.int(3, 5));
	const holyDays = hd
		.map((h) => ({ name: f(h.name), month: (h.month + (rng.chance(0.3) ? rng.pick([-1, 1]) : 0) + 12) % 12, rite: f(h.rite) }))
		.sort((a, b) => a.month - b.month);

	// blessings and sins
	const blessings = [...take(rng, DOC_BLESSINGS[doctrine], 3), ...take(rng, GENERIC_BLESSINGS, 2)].map(f);
	const sinPool = [...take(rng, DOC_SINS[doctrine], 4), ...take(rng, GENERIC_SINS, 2)];
	const sins = sinPool.map((s) => lowerFirst(f(s)));
	if (inq) sins[sins.length - 1] = `hiding heretics from Inquisitor ${inq.grandInquisitor}`;

	// clergy
	const cl = DOC_CLERGY[doctrine];
	const clergy = {
		greetFaithful: f(rng.pick(cl.faithful)),
		greetStranger: f(rng.pick(cl.stranger)),
		title: DOCTRINES[doctrine].clergyTitle
	};

	// observances
	const observances = [...take(rng, DOC_OBSERVANCES[doctrine], 3), ...take(rng, GENERIC_OBSERVANCES, 1)].map(f);
	if (inq) observances[observances.length - 1] = `Report heresy to Inquisitor ${inq.grandInquisitor}, and ask no questions.`;

	return { prayers, liturgy, scripture, saints, heresies, afterlife, holyDays, blessings, sins, clergy, observances };
}
