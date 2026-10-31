/** Persistent state of the W3 social systems, hung off `sim.w3` (plain data so saves pack it unchanged). */
import { makeRng, type Rng } from '../../rng';
import type { Lang } from '../../gen/names';
import type { Simulation } from '../engine';

export type ReformKind = 'legal' | 'temperance' | 'franchise' | 'land' | 'tolerance';
export type PersecutionKind = 'pogrom' | 'expulsion' | 'conversion';
export type FamineChoice = 'relief' | 'hoard' | 'requisition' | 'scapegoat';

/** two peoples sharing one realm: warm years, unions so far, first union */
export interface MixPair {
	realm: number;
	a: number;
	b: number;
	warm: number;
	unions: number;
	since: number;
	/** latest blended house name */
	house?: string;
}

/** a people born of two others (a new culture) */
export interface MixedPeople {
	culture: number;
	a: number;
	b: number;
	realm: number;
	year: number;
}

export interface Persecution {
	id: number;
	realm: number;
	axis: 'c' | 'f';
	/** culture or faith id */
	target: number;
	kind: PersecutionKind;
	since: number;
	until: number;
	/** realm that took the refugees in (0 = none) */
	haven: number;
	/** ruler who began it */
	by: number;
	/** event that caused it (a famine scapegoating) */
	cause?: number;
	ended?: number;
}

export interface Reform {
	id: number;
	kind: ReformKind;
	realm: number;
	name: string;
	leader: string;
	born: number;
	/** 0..100 */
	support: number;
	status: 'rising' | 'passed' | 'failed' | 'crushed';
	ended?: number;
}

export interface FamineRecord {
	y: number;
	realm: number;
	choice: FamineChoice;
	ruler: string;
}

export interface W3State {
	pairs: Record<string, MixPair>;
	peoples: MixedPeople[];
	pers: Persecution[];
	/** realm id → year it may persecute again */
	persCool: Record<number, number>;
	reforms: Reform[];
	/** realm id → reforms in force */
	enacted: Record<number, ReformKind[]>;
	/** culture id → smoothed prestige score */
	prestige: Record<number, number>;
	/** culture id → decaying count of great works and art */
	works: Record<number, number>;
	/** world mean of `prestige`, cached when it is rescored (missing in older saves) */
	pmean?: number;
	/** culture id currently held most admired */
	top: number;
	famines: FamineRecord[];
	nextId: number;
	/** last year a mixed people was born (world-wide pacing) */
	lastPeople: number;
}

export function newW3(): W3State {
	return { pairs: {}, peoples: [], pers: [], persCool: {}, reforms: [], enacted: {}, prestige: {}, works: {}, top: 0, famines: [], nextId: 1, lastPeople: -999 };
}

export function restoreW3(d: Partial<W3State> | undefined): W3State {
	return { ...newW3(), ...(d ?? {}) };
}

/** `GenOptions.socialLife === false` turns every W3 hook into a no-op */
export const w3On = (sim: Simulation) => sim.w.opts.socialLife !== false;

/** side rng: never touches `sim.rng` */
export const w3Rng = (sim: Simulation, ...tag: (string | number)[]): Rng => makeRng(`${sim.w.opts.seed}:w3:${tag.join(':')}`);

/** a throwaway copy of a culture's sim language with its own name stream (shares inventory, lexicon and clans) */
export function sideLang(sim: Simulation, culture: number, ...tag: (string | number)[]): Lang {
	const base = sim.lang(culture);
	return {
		...base,
		morphemes: {},
		words: {},
		used: new Set(base.used),
		glosses: {},
		places: base.places.slice(),
		givenPool: { m: base.givenPool.m.slice(), f: base.givenPool.f.slice() },
		rng: makeRng(`${sim.w.opts.seed}:w3:lang:${culture}:${tag.join(':')}`)
	};
}

export const enacted = (sim: Simulation, realm: number, k: ReformKind) => !!sim.w3?.enacted[realm]?.includes(k);
