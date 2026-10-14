import type { Climate, GenOptions, PlanetKind } from './types';

/** wind bands, north pole → south pole: 90–60N, 60–30N, 30–0N, 0–30S, 30–60S, 60–90S. Degrees the wind blows TOWARD (0 = north). */
export const DEFAULT_WINDS = [225, 45, 225, 315, 135, 315];

export const CLIMATE_DEFAULT: Climate = { tEq: 27, tN: -28, tS: -30, mapSize: 40, latitude: 35, longitude: 50, prec: 100, winds: [...DEFAULT_WINDS] };

/** per-planet climate starting points (what the sliders jump to when picking a planet) */
export const PLANET_CLIMATE: Record<PlanetKind, Partial<Climate>> = {
	terran: {},
	verdant: { tEq: 30, tN: -18, tS: -20, prec: 160 },
	desert: { tEq: 38, tN: -5, tS: -8, prec: 35 },
	ocean: { tEq: 28, tN: -24, tS: -26, prec: 130 },
	ice: { tEq: 4, tN: -50, tS: -52, prec: 70 },
	volcanic: { tEq: 34, tN: -18, tS: -20, prec: 80 },
	shattered: { prec: 110 },
	exotic: { tEq: 29, tN: -22, tS: -24, prec: 120 }
};

export function climateFor(planet: PlanetKind, base: Climate = CLIMATE_DEFAULT): Climate {
	return { ...base, ...PLANET_CLIMATE[planet], winds: [...(base.winds ?? DEFAULT_WINDS)] };
}

export const CLIMATE_PRESETS: Record<string, Partial<Climate>> = {
	'Whole world': { mapSize: 100, latitude: 50 },
	Northern: { mapSize: 33, latitude: 18 },
	Tropical: { mapSize: 30, latitude: 50 },
	Southern: { mapSize: 33, latitude: 82 }
};

export const SPHERE_SETS: Record<string, string[] | null> = {
	All: null,
	European: ['norse', 'celtic', 'latin', 'slavic'],
	Asian: ['sinic', 'japonic', 'indic', 'sea', 'steppe', 'persian'],
	African: ['mande', 'yoruba', 'bantu', 'ethiopic', 'arabic'],
	American: ['nahua', 'maya', 'andean', 'turtle', 'inuit'],
	Oceanic: ['polynesian', 'sea'],
	'Silk Road': ['sinic', 'steppe', 'persian', 'arabic', 'indic', 'latin'],
	'Global South': ['indic', 'sea', 'mande', 'yoruba', 'bantu', 'nahua', 'maya', 'andean', 'polynesian'],
	Eldritch: ['eldritch']
};

export const DEFAULTS: Omit<GenOptions, 'seed'> = {
	template: 'continents',
	cells: 10000,
	states: 16,
	width: 1600,
	height: 1000,
	genre: 'fantasy',
	planet: 'terran',
	spheres: null,
	depth: 2,
	sky: true,
	sea: true,
	cultures: 0,
	burgs: 0,
	religions: 0,
	sizeVariety: 4,
	growth: 1,
	seaLevel: 0,
	rivers: 1,
	density: { deep: 1, sky: 1, sea: 1 },
	layerDetail: { deep: 1, sky: 1, sea: 1 },
	climate: CLIMATE_DEFAULT
};

/** fill any missing fields (old saves, scripts, tests) */
export function withDefaults(o: Partial<GenOptions> & { seed: string }): GenOptions {
	const out = { ...DEFAULTS, ...o } as GenOptions;
	out.density = { ...DEFAULTS.density, ...(o.density ?? {}) };
	const ld = { ...DEFAULTS.layerDetail, ...(o.layerDetail ?? {}) };
	for (const k of ['deep', 'sky', 'sea'] as const) ld[k] = Math.min(2, Math.max(0.5, Number.isFinite(ld[k]) ? ld[k] : 1));
	out.layerDetail = ld;
	out.climate = { ...climateFor(out.planet), ...(o.climate ?? {}) };
	if (!out.climate.winds || out.climate.winds.length !== 6) out.climate.winds = [...DEFAULT_WINDS];
	if (out.wrapX) {
		out.width = out.height * 2;
		out.climate.mapSize = 100;
		out.climate.latitude = 50;
	}
	return out;
}

/** latitude span + top latitude of the map from the climate config */
export function latRange(cl: Climate) {
	const span = (180 * cl.mapSize) / 100;
	const top = 90 - ((180 - span) * cl.latitude) / 100;
	return { span, top, bottom: top - span };
}

export function lonRange(cl: Climate, W: number, H: number) {
	const span = Math.min(360, (latRange(cl).span * W) / H);
	const left = -180 + ((360 - span) * cl.longitude) / 100;
	return { span, left, right: left + span };
}

/** surface temperature at a latitude (before altitude) */
export function tempAt(cl: Climate, lat: number) {
	const pole = lat >= 0 ? cl.tN : cl.tS;
	const f = 1 - Math.cos((Math.abs(lat) * Math.PI) / 180);
	return cl.tEq - (cl.tEq - pole) * f;
}

export function windBand(lat: number) {
	return lat > 60 ? 0 : lat > 30 ? 1 : lat > 0 ? 2 : lat > -30 ? 3 : lat > -60 ? 4 : 5;
}

/** km per map pixel along a meridian (Earth-sized planet) */
export function kmPerPx(cl: Climate, H: number) {
	return ((latRange(cl).span / 180) * 20004) / H;
}
