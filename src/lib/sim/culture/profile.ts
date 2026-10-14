import { makeRng } from '../../rng';
import type { World } from '../../gen/types';
import type { Polity } from '../types';
import type { Simulation } from '../engine';
import { FALLBACK_CULTURE, FEAST_MONTH, MONTH_FAMILIES, SPHERE_CULTURE, type FeastKind, type SphereCulture } from './data';

export type TraitKey = 'seafaring' | 'martial' | 'mercantile' | 'ancestral' | 'pious' | 'scholarly' | 'nomadic' | 'insular';

/** the numbers a trait can move; every effect is a multiplier of an existing system value */
export type ModKey = 'aggression' | 'peace' | 'trade' | 'army' | 'colonize' | 'reform' | 'unrest' | 'conversion' | 'innovation';

export interface TraitDef {
	name: string;
	icon: string;
	blurb: string;
	mods: Partial<Record<ModKey, number>>;
}

/** multipliers of 0.7 to 1.3: a trait nudges, it never decides */
export const TRAITS: Record<TraitKey, TraitDef> = {
	seafaring: { name: 'Seafaring', icon: '⛵', blurb: 'Founds more colonies on the coasts and prospers from the sea lanes.', mods: { colonize: 1.3, trade: 1.1 } },
	martial: { name: 'Martial honour', icon: '⚔', blurb: 'Quicker to declare war and slower to accept peace; keeps a larger host.', mods: { aggression: 1.2, peace: 0.75, army: 1.1 } },
	mercantile: { name: 'Mercantile', icon: '⚖', blurb: 'Counting-houses fatten the treasury; merchants cool the war fever.', mods: { trade: 1.2, aggression: 0.9 } },
	ancestral: { name: 'Ancestral', icon: '🏺', blurb: 'Resists constitutional reform and keeps its lands calm under custom.', mods: { reform: 0.6, unrest: 0.85 } },
	pious: { name: 'Pious', icon: '🕯', blurb: 'Holds to the old faith when neighbours convert, and riots less under its priests.', mods: { conversion: 0.6, unrest: 0.9 } },
	scholarly: { name: 'Scholarly', icon: '📜', blurb: 'Favours reform and quickens the pace of discovery.', mods: { innovation: 1.3, reform: 1.25 } },
	nomadic: { name: 'Nomadic', icon: '🐎', blurb: 'Pushes into open land and fields riders in great numbers, but taxes poorly.', mods: { colonize: 1.2, army: 1.1, trade: 0.9 } },
	insular: { name: 'Insular', icon: '🏔', blurb: 'Distrusts outsiders: seeks peace, expands slowly and rarely starts wars.', mods: { aggression: 0.8, colonize: 0.8, peace: 1.2 } }
};

const SPHERE_AFFINITY: Record<string, Partial<Record<TraitKey, number>>> = {
	sinic: { scholarly: 2, ancestral: 2 }, japonic: { martial: 2, insular: 1.5, ancestral: 1 }, indic: { pious: 2, scholarly: 1.5, mercantile: 1 },
	sea: { seafaring: 2, mercantile: 2 }, steppe: { nomadic: 3, martial: 2 }, persian: { scholarly: 1.5, mercantile: 1.5 },
	arabic: { mercantile: 2, pious: 1.5, scholarly: 1 }, mande: { mercantile: 2, ancestral: 1 }, yoruba: { ancestral: 2, pious: 1.5 },
	bantu: { ancestral: 1.5, nomadic: 1 }, ethiopic: { pious: 2.5, insular: 1 }, nahua: { martial: 2.5, pious: 1.5 },
	maya: { scholarly: 2, pious: 1.5 }, andean: { ancestral: 2, insular: 1.5 }, turtle: { ancestral: 2, insular: 1 },
	inuit: { insular: 2, nomadic: 1.5, seafaring: 1 }, polynesian: { seafaring: 3, ancestral: 1 }, norse: { seafaring: 2.5, martial: 2 },
	celtic: { martial: 1.5, ancestral: 1.5 }, latin: { martial: 1.5, mercantile: 1, scholarly: 1 }, slavic: { pious: 1.5, martial: 1 },
	eldritch: { insular: 2, scholarly: 1.5 }
};

const TYPE_AFFINITY: Record<string, Partial<Record<TraitKey, number>>> = {
	Naval: { seafaring: 3 }, Lake: { seafaring: 2, mercantile: 1 }, Sea: { seafaring: 3 }, River: { mercantile: 1.5 },
	Nomadic: { nomadic: 3 }, Highland: { insular: 2, martial: 1 }, Hunting: { nomadic: 1.5, martial: 0.5 }, Deep: { insular: 2.5 }, Sky: { scholarly: 1.5, insular: 1 }
};

/** home-biome nudges (biome ids from physical.ts BIOMES) */
const BIOME_AFFINITY: Record<number, Partial<Record<TraitKey, number>>> = {
	1: { nomadic: 1, mercantile: 1 }, 2: { nomadic: 1, insular: 0.5 }, 3: { nomadic: 1, mercantile: 0.5 }, 4: { nomadic: 0.5 },
	6: { ancestral: 0.5 }, 8: { ancestral: 0.5, insular: 0.5 }, 9: { insular: 1 }, 10: { insular: 1.5 }, 11: { insular: 2 }, 12: { insular: 0.5 }
};

export interface CultureProfile extends SphereCulture {
	traits: TraitKey[];
	mods: Record<ModKey, number>;
	/** coastal home (within two cells of the sea) */
	coastal: boolean;
}

const ALL_MODS: ModKey[] = ['aggression', 'peace', 'trade', 'army', 'colonize', 'reform', 'unrest', 'conversion', 'innovation'];

/** pure and seeded by world seed + culture id: 2–3 traits from sphere, home biome and culture type */
export function buildProfile(w: World, cultureId: number): CultureProfile {
	const cu = w.cultures[cultureId];
	const base = (cu && SPHERE_CULTURE[cu.sphere]) || FALLBACK_CULTURE;
	const rng = makeRng(`${w.opts.seed}:cultrait:${cultureId}`);
	const score: Record<TraitKey, number> = { seafaring: 0, martial: 0, mercantile: 0, ancestral: 0, pious: 0, scholarly: 0, nomadic: 0, insular: 0 };
	const add = (t?: Partial<Record<TraitKey, number>>) => { if (t) for (const k in t) score[k as TraitKey] += t[k as TraitKey]!; };
	let coastal = false;
	if (cu) {
		add(SPHERE_AFFINITY[cu.sphere]);
		add(TYPE_AFFINITY[cu.type]);
		const cell = cu.center;
		if (cell >= 0 && cu.layer === 'surface') {
			add(BIOME_AFFINITY[w.cells.biome[cell]]);
			coastal = w.cells.dist[cell] <= 2;
			if (coastal) score.seafaring += 1;
		}
	}
	const keys = Object.keys(score) as TraitKey[];
	for (const k of keys) score[k] += rng() * 0.8; // jitter so equal cultures differ
	keys.sort((a, b) => score[b] - score[a]);
	const take = score[keys[2]] >= 2 ? 3 : 2;
	const traits = keys.slice(0, take);
	const mods = Object.fromEntries(ALL_MODS.map((m) => [m, 1])) as Record<ModKey, number>;
	for (const t of traits) for (const m in TRAITS[t].mods) mods[m as ModKey] *= TRAITS[t].mods[m as ModKey]!;
	for (const m of ALL_MODS) mods[m] = Math.min(1.3, Math.max(0.7, mods[m]));
	// biome and trait colour the card
	let food = base.food;
	if (traits.includes('seafaring') || coastal) food += ', plus the daily catch';
	if (traits.includes('nomadic')) food += ' and travel rations';
	return { ...base, food, traits, mods, coastal };
}

const cache = new WeakMap<World, Map<number, CultureProfile>>();
export function cultureProfile(w: World, cultureId: number): CultureProfile {
	let m = cache.get(w);
	if (!m) cache.set(w, (m = new Map()));
	let p = m.get(cultureId);
	if (!p) m.set(cultureId, (p = buildProfile(w, cultureId)));
	return p;
}

/**
 * Multiplier a realm's culture applies to an existing system value (1 = no effect).
 * Lingua-franca trade ports add a small extra to `trade`.
 */
export function cultureMod(sim: Simulation, pol: Polity | undefined, key: ModKey): number {
	if (!pol || !pol.id) return 1;
	let m = cultureProfile(sim.w, pol.culture).mods[key];
	if (key === 'trade' && sim.cx.francaRealms.includes(pol.id)) m *= 1.05;
	return m;
}

// ───────────── calendar ─────────────
export function monthName(w: World, cultureId: number, month: number): string {
	const fam = cultureProfile(w, cultureId).months;
	return MONTH_FAMILIES[fam][((month % 12) + 12) % 12];
}

export interface Feast {
	name: string;
	kind: FeastKind;
	month: number;
}

/** 2–3 feast days for a realm: its culture's feasts, month shifted ±1 by realm id; fixed per realm and culture */
export function realmFeasts(w: World, pol: Polity): Feast[] {
	const prof = cultureProfile(w, pol.culture);
	const rng = makeRng(`${w.opts.seed}:feasts:${pol.id}:${pol.culture}`);
	const n = rng.chance(0.5) ? 2 : 3;
	const pool = prof.feasts.slice().sort(() => rng() - 0.5).slice(0, n);
	return pool.map(([name, kind]) => ({ name, kind, month: (FEAST_MONTH[kind] + rng.int(-1, 1) + 12) % 12 }));
}

/** culture whose calendar the top bar shows: the avatar's realm, else the largest realm */
export function calendarCulture(sim: Simulation): number {
	const me = sim.me;
	const own = me ? sim.polities[me.state] : undefined;
	if (own?.alive && own.id) return own.culture;
	let best: Polity | undefined;
	for (const p of sim.polities) if (p.alive && p.id && (!best || p.cells > best.cells)) best = p;
	return best?.culture ?? 1;
}
