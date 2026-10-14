import { makeRng, type Rng } from '../rng';
import { SPHERE_BY_ID, type Sphere } from './spheres';

/**
 * Procedural naming languages (after Martin O'Leary's "Generating fantasy maps" naming language):
 * each culture gets its own phoneme sets, syllable structure and orthography, and reuses
 * morphemes so names within a culture sound related.
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
}

function shuffled(rng: Rng, s: string, keep: number) {
	const a = s.split('');
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a.slice(0, Math.max(2, keep)).join('');
}

export function makeLang(seed: string, sphereId?: string): Lang {
	const rng = makeRng(seed);
	const sp: Sphere | null = sphereId ? (SPHERE_BY_ID[sphereId] ?? null) : null;
	const cons = sp ? sp.cons : rng.pick(CONS);
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
		sphere: sp
	};
	L.maxSyl = sp?.maxSyl ?? Math.min(3, L.minSyl + rng.int(0, 1));
	// a syllable shape with no consonant slot makes all-vowel words; guarantee one
	if (!/[CSLFN]/.test(L.struct)) L.struct = 'C' + L.struct;
	L.genitive = morpheme(L, 'of');
	L.definite = morpheme(L, 'the');
	return L;
}

function syllable(L: Lang): string {
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

function spell(L: Lang, s: string): string {
	let o = '';
	for (const ch of s) o += L.ortho[ch] ?? ch;
	return o;
}

function morpheme(L: Lang, key: string): string {
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

function word(L: Lang, key = ''): string {
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

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A fresh, unused proper name. key ties it to a semantic morpheme (e.g. 'city', 'river'). */
export function makeName(L: Lang, key = ''): string {
	for (let tries = 0; tries < 50; tries++) {
		let raw: string;
		if (L.rng() < 0.55) raw = word(L, key);
		else {
			const w1 = word(L, L.rng() < 0.6 ? key : '');
			const w2 = word(L, '');
			raw = L.rng() < 0.5 ? w1 + w2 : w1 + L.genitive + w2;
		}
		let name = cap(spell(L, raw));
		if (name.length > 11) continue;
		// every name needs a consonant and no run of 3+ vowels (vowel-heavy spheres otherwise yield 'Ueooei')
		if (!/[^aeiouyáéíóúâêôàèìòùäöüøåāīẹọɛɔə'\s-]/i.test(name) || /[aeiouyáéíóúâêôäöüøåāīẹọɛɔə]{3,}/i.test(name)) continue;
		const affixes = key === 'city' ? L.sphere?.city : key === 'land' ? L.sphere?.land : undefined;
		if (affixes?.length && L.rng() < 0.45) {
			const a = L.rng.pick(affixes);
			if (name.length > 7) name = name.slice(0, 6);
			name = a.endsWith('-') || a.endsWith(' ') ? a.replace(/-$/, '-') + (a.endsWith(' ') ? name : name.toLowerCase()) : name + a.slice(1);
			name = cap(name);
		}
		if (name.length < 3 || name.length > 16) continue;
		if (L.used.has(name)) continue;
		L.used.add(name);
		return name;
	}
	const fallback = cap(spell(L, L.rng.pick(L.cons.split('')) + word(L, key) + L.rng.pick(L.cons.split(''))));
	L.used.add(fallback);
	return fallback;
}

/** Personal names: given + family (dynasty) */
export function personName(L: Lang): string {
	const raw = word(L, 'person');
	const s = cap(spell(L, raw));
	return s.length > 10 ? s.slice(0, 10) : s;
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
