import { GENRES, type Genre } from '#lib/gen/genre';
import { TEMPLATE_NAMES } from '#lib/gen/heightmap';
import { climateFor, DEFAULTS, SPHERE_SETS } from '#lib/gen/options';
import { PLANETS } from '#lib/gen/physical';
import type { GenOptions, HeightImage, PlanetKind, Template } from '#lib/gen/types';
import { SPECIES, type SpeciesDef, sanitizeRace } from '#lib/gen/species';
import { decodeSharePayload } from '#lib/share';
import type { Preset } from './presets';

export type Settings = Omit<GenOptions, 'seed'> & { seed: string; planets: number; sphereSet: string };

export const STORE = 'realmforge:setup';
export const POINTS = [1000, 2000, 4000, 6000, 8000, 10000, 15000, 20000, 30000, 40000, 60000, 80000, 100000, 150000, 200000];
export const SIZES: [number, number, string][] = [
	[1600, 1000, '16:10 Wide'],
	[1920, 1080, '16:9 HD'],
	[2000, 1000, '2:1 Atlas'],
	[2600, 1000, 'Panorama'],
	[1300, 1300, 'Square'],
	[1000, 1500, 'Portrait'],
	[3200, 2000, 'Huge 16:10']
];

const words = ['amber', 'ash', 'brine', 'cinder', 'dusk', 'ember', 'fable', 'gale', 'hollow', 'iron', 'jade', 'kestrel', 'lumen', 'moss', 'nadir', 'onyx', 'pyre', 'quill', 'rune', 'sable', 'thorn', 'umber', 'vale', 'wyrm', 'zephyr'];
const pickW = () => words[Math.floor(Math.random() * words.length)];
export const rndSeed = () => `${pickW()}-${pickW()}-${Math.floor(Math.random() * 1000)}`;

const r = (a: number, b: number) => a + Math.random() * (b - a);
const ri = (a: number, b: number) => Math.round(r(a, b));
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];

const fresh = (): Settings => ({ ...structuredClone(DEFAULTS), seed: rndSeed(), planets: 1, sphereSet: 'All', planetOverrides: [] });

/** All generator settings plus the lock list. One instance per Setup screen; tabs receive it as a prop. */
export class SetupStore {
	s = $state<Settings>(fresh());
	locked = $state<string[]>([]);
	loaded = false;
	/** decoded custom heightmap picture: too big for localStorage or share links, so it lives outside `s` and only until the page closes */
	heightImage = $state.raw<HeightImage | null>(null);
	heightImageName = $state('');

	isLocked = (k: string) => this.locked.includes(k);
	toggleLock = (k: string) => (this.locked = this.isLocked(k) ? this.locked.filter((x) => x !== k) : [...this.locked, k]);
	unlockAll = () => (this.locked = []);

	/** localStorage first, then a share link in the URL hash (which locks the seed) */
	restore() {
		try {
			const raw = localStorage.getItem(STORE);
			if (raw) {
				const saved = JSON.parse(raw) as { s: Settings; locked: string[] };
				const base = fresh();
				this.s = {
					...base,
					...saved.s,
					seed: saved.locked?.includes('seed') ? saved.s.seed : rndSeed(),
					density: { ...base.density, ...saved.s.density },
					layerDetail: { ...base.layerDetail, ...saved.s.layerDetail },
					planetOverrides: Array.isArray(saved.s.planetOverrides) ? saved.s.planetOverrides.map((o) => (o && typeof o === 'object' ? o : {})) : [],
					climate: { ...base.climate, ...saved.s.climate },
					races: saved.s.races ? { allow: saved.s.races.allow ? [...saved.s.races.allow] : null, custom: Array.isArray(saved.s.races.custom) ? [...saved.s.races.custom] : [] } : undefined
				};
				this.locked = saved.locked ?? [];
			}
		} catch { /* private mode etc. */ }
		if (typeof window !== 'undefined' && window.location.hash) {
			const shared = decodeSharePayload(window.location.hash);
			if (shared) {
				const s = this.s;
				this.s = {
					...s,
					seed: shared.seed,
					genre: (shared.genre as Genre) in GENRES ? (shared.genre as Genre) : s.genre,
					planet: (shared.planet as PlanetKind) in PLANETS ? (shared.planet as PlanetKind) : s.planet,
					template: (shared.template as Template) in TEMPLATE_NAMES ? (shared.template as Template) : s.template,
					cells: shared.cells ?? s.cells,
					states: shared.states ?? s.states,
					width: shared.width ?? s.width,
					height: shared.height ?? s.height,
					climate: { ...s.climate, ...(shared.climate ?? {}) }
				};
				if (!this.locked.includes('seed')) this.locked = [...this.locked, 'seed'];
			}
		}
		this.loaded = true;
	}

	persist() {
		const snap = JSON.stringify({ s: this.s, locked: this.locked });
		if (!this.loaded) return;
		try { localStorage.setItem(STORE, snap); } catch { /* ignore */ }
	}

	reset() {
		this.s = fresh();
		this.locked = [];
	}

	randomize() {
		const s = this.s;
		const n = { ...s, climate: { ...s.climate }, density: { ...s.density }, layerDetail: { ...s.layerDetail } };
		const u = (k: string) => !this.isLocked(k);
		if (u('seed')) n.seed = rndSeed();
		if (u('template')) n.template = pick((Object.keys(TEMPLATE_NAMES) as Template[]).filter((t) => t !== 'image'));
		if (u('planet')) {
			n.planet = pick(Object.keys(PLANETS) as PlanetKind[]);
			if (u('climate')) n.climate = { ...climateFor(n.planet), mapSize: ri(20, 80), latitude: ri(10, 90), longitude: ri(0, 100) };
		}
		if (u('genre')) n.genre = pick(Object.keys(GENRES) as Genre[]);
		if (u('states')) n.states = ri(6, 30);
		if (u('cultures')) n.cultures = pick([0, 0, ri(4, 24)]);
		if (u('sizeVariety')) n.sizeVariety = ri(0, 10);
		if (u('growth')) n.growth = +r(0.5, 2).toFixed(1);
		if (u('seaLevel')) n.seaLevel = ri(-8, 8);
		if (u('rivers')) n.rivers = +r(0.5, 2).toFixed(1);
		if (u('religions')) n.religions = pick([0, ri(2, 10)]);
		if (u('sphereSet')) { n.sphereSet = pick(Object.keys(SPHERE_SETS).filter((x) => x !== 'Eldritch')); n.spheres = SPHERE_SETS[n.sphereSet]; }
		if (u('layers')) { n.depth = ri(0, 4); n.sky = Math.random() < 0.7; n.sea = Math.random() < 0.7; n.density = { deep: +r(0.5, 2).toFixed(1), sky: +r(0.5, 2).toFixed(1), sea: +r(0.5, 2).toFixed(1) }; }
		if (u('climate') && this.isLocked('planet')) n.climate = { ...n.climate, tEq: ri(15, 38), tN: ri(-40, -5), tS: ri(-40, -5), mapSize: ri(20, 80), latitude: ri(10, 90), prec: ri(50, 180) };
		this.s = n;
	}

	setPlanet(p: PlanetKind) {
		const s = this.s;
		s.planet = p;
		if (!this.isLocked('climate')) s.climate = { ...climateFor(p), mapSize: s.climate.mapSize, latitude: s.climate.latitude, longitude: s.climate.longitude, winds: [...s.climate.winds] };
	}

	/** Per-planet override object for planet `i` (index 0 = the main planet, left to the main tabs). Empty entries are padded. */
	override(i: number): Partial<GenOptions> {
		const arr = (this.s.planetOverrides ??= []);
		while (arr.length <= i) arr.push({});
		return arr[i];
	}

	/** Set or clear (value === undefined) one field of a planet's override. */
	setOverride<K extends 'planet' | 'template' | 'genre' | 'states'>(i: number, key: K, value: GenOptions[K] | undefined) {
		const o = this.override(i);
		if (value === undefined) delete o[key];
		else o[key] = value;
	}

	/** Layer detail for a planet (all three exotic layers at once); 1 clears it. */
	setOverrideDetail(i: number, v: number) {
		const o = this.override(i);
		if (v === 1) delete o.layerDetail;
		else o.layerDetail = { deep: v, sky: v, sea: v };
	}

	setSphereSet(name: string) {
		const s = this.s;
		s.sphereSet = name;
		if (name !== 'Custom') s.spheres = SPHERE_SETS[name] ? [...SPHERE_SETS[name]!] : null;
		else if (!s.spheres) s.spheres = ['sinic', 'yoruba', 'nahua'];
	}

	toggleSphere(id: string) {
		const s = this.s;
		s.sphereSet = 'Custom';
		const cur = s.spheres ?? [];
		s.spheres = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
	}

	isRaceAllowed(id: string): boolean {
		return !this.s.races?.allow || this.s.races.allow.includes(id);
	}

	setRaceMode(mode: 'all' | 'single' | 'custom', singleId?: string) {
		const custom = this.s.races?.custom ?? [];
		if (mode === 'all') {
			this.s.races = custom.length ? { allow: null, custom } : undefined;
		} else if (mode === 'single') {
			this.s.races = { allow: [singleId || 'human'], custom };
		} else {
			const allIds = [...SPECIES.map((s) => s.id), ...custom.map((c) => c.id)];
			this.s.races = { allow: this.s.races?.allow ? [...this.s.races.allow] : allIds, custom };
		}
	}

	toggleRace(id: string) {
		const curCustom = this.s.races?.custom ?? [];
		const allIds = [...SPECIES.map((s) => s.id), ...curCustom.map((c) => c.id)];
		let curAllow = this.s.races?.allow ? [...this.s.races.allow] : allIds;
		if (curAllow.includes(id)) {
			if (curAllow.length > 1) curAllow = curAllow.filter((x) => x !== id);
		} else {
			curAllow = [...curAllow, id];
		}
		this.s.races = { allow: curAllow.length === allIds.length && !curCustom.length ? null : curAllow, custom: curCustom };
	}

	addCustomRace(r: Partial<SpeciesDef>) {
		const custom = [...(this.s.races?.custom ?? [])];
		const sanitized = sanitizeRace(r, custom.length);
		custom.push(sanitized);
		const allow = this.s.races?.allow ? [...this.s.races.allow, sanitized.id] : null;
		this.s.races = { allow, custom };
	}

	removeCustomRace(id: string) {
		const custom = (this.s.races?.custom ?? []).filter((c) => c.id !== id);
		let allow = this.s.races?.allow ? this.s.races.allow.filter((x) => x !== id) : null;
		if (allow && !allow.length) allow = ['human'];
		this.s.races = custom.length || allow ? { allow, custom } : undefined;
	}

	/** Apply a gallery preset. Locked groups keep their values, like Randomize. Size, density, planets and evolve are never locked. */
	applyPreset(p: Preset) {
		const o = p.options;
		const n = { ...this.s, climate: { ...this.s.climate }, density: { ...this.s.density }, layerDetail: { ...this.s.layerDetail } };
		const u = (k: string) => !this.isLocked(k);
		if (u('seed')) n.seed = o.seed;
		if (u('genre')) n.genre = o.genre;
		if (u('template')) n.template = o.template;
		if (u('planet')) n.planet = o.planet;
		if (u('climate')) n.climate = { ...climateFor(u('planet') ? o.planet : n.planet), ...o.climate, winds: [...(o.climate?.winds ?? climateFor(o.planet).winds)] };
		if (u('states')) n.states = o.states;
		if (u('cultures')) n.cultures = o.cultures;
		if (u('religions')) n.religions = o.religions;
		if (u('sizeVariety')) n.sizeVariety = o.sizeVariety;
		if (u('growth')) n.growth = o.growth;
		if (u('seaLevel')) n.seaLevel = o.seaLevel;
		if (u('rivers')) n.rivers = o.rivers;
		if (u('sphereSet')) {
			n.sphereSet = o.spheres ? 'Custom' : o.sphereSet;
			n.spheres = o.spheres ? [...o.spheres] : SPHERE_SETS[o.sphereSet] ? [...SPHERE_SETS[o.sphereSet]!] : null;
		}
		if (u('layers')) {
			n.depth = o.depth;
			n.sky = o.sky;
			n.sea = o.sea;
			n.density = { ...o.density };
			n.layerDetail = { ...DEFAULTS.layerDetail };
		}
		n.cells = o.cells;
		n.burgs = o.burgs;
		n.width = o.width;
		n.height = o.height;
		n.planets = o.planets;
		n.evolve = o.evolve;
		this.s = n;
	}
}
