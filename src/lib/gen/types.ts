import type { Genre, LayerKind } from './genre';
import type { RaceConfig } from './species';
export type { Genre, LayerKind };
export type Template = 'continents' | 'archipelago' | 'pangea' | 'highIsland' | 'inlandSea' | 'peninsulas' | 'earth' | 'image';

/** a user-supplied grayscale image used by the 'image' template (kept out of share links and saved settings) */
export interface HeightImage {
	w: number;
	h: number;
	/** w*h brightness values 0..255, row-major */
	data: Uint8Array | number[];
}
export type PlanetKind = 'terran' | 'desert' | 'ocean' | 'ice' | 'volcanic' | 'shattered' | 'verdant' | 'exotic';

export interface GenOptions {
	seed: string;
	template: Template;
	cells: number;
	states: number;
	width: number;
	height: number;
	genre: Genre;
	planet: PlanetKind;
	/** null = any sphere (climate-correlated) */
	spheres: string[] | null;
	/** underground depth levels (0 disables) */
	depth: number;
	sky: boolean;
	sea: boolean;
	/** 0 = auto (≈ 0.75 × states) */
	cultures: number;
	/** 0 = auto (≈ cells / 45) */
	burgs: number;
	/** organized faiths; 0 = auto */
	religions: number;
	/** 0–10: how unequal realms' expansion power is */
	sizeVariety: number;
	/** 0.2–3: how far realms spread before neutral land remains */
	growth: number;
	/** −15…+15 shifts the shoreline (positive = more sea) */
	seaLevel: number;
	/** 0.25–3: river abundance */
	rivers: number;
	/** multipliers for exotic layer settlements */
	density: { deep: number; sky: number; sea: number };
	/** 0.5–2: granularity of each exotic layer on the shared cell graph (noise frequency, min component size, settlement spacing); 1 = unchanged */
	layerDetail: { deep: number; sky: number; sea: number };
	/** per-planet overrides (index = planet) applied on top of the rolled options in generateUniverse; deep-merged for density/layerDetail/climate */
	planetOverrides?: Partial<GenOptions>[];
	climate: Climate;
	/** the narration voice follows the tech era (myth → fantasy → steam → diesel → cyber/solar) */
	evolve?: boolean;
	/** 0–4: pins the world to one tech era (sim/tech ERAS) for its whole history; null/undefined = free */
	ageLock?: number | null;
	/** which races exist: allow-list (null = all) plus user-made custom races; unset = classic behaviour */
	races?: RaceConfig;
	/** spherical world: the east and west edges join (cells across the seam become neighbours); forces a 2:1 map covering all 360 degrees */
	wrapX?: boolean;
	/** 'earth' template: mirror the real world east-west / north-south so it is not always our Earth */
	flipX?: boolean;
	flipY?: boolean;
	/** 'image' template: the decoded picture (not persisted, not saved with the world) */
	heightImage?: HeightImage;
	/** 'image' template: treat bright as sea and dark as land */
	invertImage?: boolean;
}

/** what callers pass in; missing fields are filled by withDefaults() */
export type GenInput = Partial<GenOptions> & { seed: string };

export interface Climate {
	/** °C at the equator / poles */
	tEq: number;
	tN: number;
	tS: number;
	/** % of the globe's height the map covers */
	mapSize: number;
	/** 0 = map touches north pole … 100 = touches south pole */
	latitude: number;
	/** 0–100 position along the longitudes (cosmetic coordinates) */
	longitude: number;
	/** precipitation % */
	prec: number;
	/** 6 bands north→south, degrees wind blows toward */
	winds: number[];
}

/** Per-cell data lives in flat typed arrays (struct-of-arrays): cheap to clone to/from the worker. */
export interface Cells {
	n: number;
	x: Float32Array;
	y: Float32Array;
	/** CSR neighbour list: neighbours of i are nList[nStart[i] .. nStart[i+1]) */
	nStart: Int32Array;
	nList: Int32Array;
	/** CSR polygon ring: polyXY[2*polyStart[i] .. 2*polyStart[i+1]) */
	polyStart: Int32Array;
	polyXY: Float32Array;
	/** elevation 0–100, sea level 20 */
	h: Uint8Array;
	/** water body / landmass id (index into World.features) */
	feature: Int32Array;
	/** signed coast distance: 1 = coastal land, -1 = coastal water, 2.. inland, -2.. deep */
	dist: Int8Array;
	temp: Int8Array;
	prec: Uint8Array;
	flux: Float32Array;
	river: Uint16Array;
	biome: Uint8Array;
	/** thousands of people */
	pop: Float32Array;
	culture: Uint16Array;
	state: Uint16Array;
	religion: Uint16Array;
	burg: Uint16Array;
	road: Uint8Array;
}

/** Voronoi edges (one per adjacent cell pair) with their two vertex ids: used for borders & coastlines. */
export interface Edges {
	n: number;
	a: Int32Array;
	b: Int32Array;
	va: Int32Array;
	vb: Int32Array;
	vx: Float32Array;
	vy: Float32Array;
}

export interface Feature {
	id: number;
	type: 'ocean' | 'lake' | 'island' | 'continent';
	land: boolean;
	cells: number;
}

export interface River {
	id: number;
	cells: number[];
	flux: number;
	name: string;
}

export interface Culture {
	id: number;
	name: string;
	color: string;
	center: number;
	type: 'Generic' | 'River' | 'Lake' | 'Naval' | 'Nomadic' | 'Highland' | 'Hunting' | 'Deep' | 'Sky' | 'Sea';
	lang: number;
	sphere: string;
	layer: LayerKind;
	species?: string;
}

export type TheologyKind =
	| 'monotheism'
	| 'polytheism'
	| 'animism'
	| 'pantheism'
	| 'dualism'
	| 'chaos_cult'
	| 'eldritch_horror'
	| 'ancestral';

export type DoctrineKind =
	| 'caste'
	| 'evangelical'
	| 'militant'
	| 'liberation'
	| 'compassion'
	| 'esoteric'
	| 'ancestral'
	| 'blood_offering'
	| 'mutation_rites'
	| 'void_whispers'
	| 'cyclopean_rites'
	| 'sacred_grove'
	| 'mountain_pact';

export interface Religion {
	id: number;
	name: string;
	color: string;
	type: 'Folk' | 'Organized' | 'Cult';
	deity: string;
	center: number;
	culture: number;
	theology?: TheologyKind;
	doctrine?: DoctrineKind;
	features?: string[];
}

export interface Burg {
	id: number;
	cell: number;
	x: number;
	y: number;
	name: string;
	culture: number;
	state: number;
	capital: boolean;
	port: boolean;
	pop: number;
	alive: boolean;
	/** which plane the settlement lives on; 'deep' uses depth 1..n */
	layer: LayerKind;
	depth: number;
	kind: string;
	/** set once the name has drifted over the centuries (story/drift.ts) */
	originalName?: string;
	/** built settlement infrastructure districts (walls, market, granary, temple, academy) */
	districts?: BurgDistricts;
	/** appointed governor or mayor person id */
	governor?: number;
	/** stationed town defense garrison points */
	garrison?: number;
	/** whether the burg holds a municipal royal charter / free city privileges */
	charter?: boolean;
	/** heraldic coat of arms / regional symbol */
	coa?: any;
	/** bandit or outlaw encampment harassing trade routes */
	banditCove?: boolean;
	/** pirate haven raiding maritime sea lanes */
	pirateCove?: boolean;
	/** id of the trade league this city belongs to */
	tradeLeague?: number;
}

export interface BurgDistricts {
	walls?: number;
	market?: number;
	granary?: number;
	temple?: number;
	academy?: number;
}

export interface StateDef {
	id: number;
	name: string;
	form: string;
	fullName: string;
	color: string;
	capital: number;
	culture: number;
	religion: number;
	expansionism: number;
	layer: number;
}

export interface Route {
	kind: 'road' | 'sea' | 'tunnel' | 'sky' | 'shaft';
	cells: number[];
	a: number;
	b: number;
	name?: string;
}

/**
 * A plane of existence sharing the cell graph: surface, each underground level, the sky, the sea floor.
 * Each has its own passability + territory so realms can live entirely underground or aloft.
 */
export interface Layer {
	id: number;
	kind: LayerKind;
	depth: number;
	name: string;
	/** 1 = habitable/passable in this layer */
	open: Uint8Array;
	state: Uint16Array;
}

export interface World {
	/** planet index in the universe */
	planet: number;
	name: string;
	opts: GenOptions;
	cells: Cells;
	edges: Edges;
	features: Feature[];
	rivers: River[];
	cultures: Culture[];
	religions: Religion[];
	burgs: Burg[];
	/** index 0 is "Neutral lands" */
	states: StateDef[];
	routes: Route[];
	/** burg adjacency for travel: [a, b, days] */
	links: [number, number, number][];
	layers: Layer[];
}

export const SEA = 20;
