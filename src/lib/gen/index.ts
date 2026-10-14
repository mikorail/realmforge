import { makeRng } from '../rng';
import { buildGrid } from './grid';
import { generateHeightmap } from './heightmap';
import { makeName } from './names';
import { generateLayers } from './layers';
import { assignBiomes, assignPopulation, climate, markFeatures, PLANETS, planetBiomes, precipitation, rivers } from './physical';
import { generateBurgs, generateCultures, generateReligions, generateRoutes, generateStates } from './society';
import { withDefaults } from './options';
import { setRaces } from './species';
import type { GenInput, World } from './types';

export type Progress = (stage: string, pct: number) => void;

/** Full pipeline: grid → heightmap → features → climate → rivers → biomes → people → states → faiths → routes. */
export function generateWorld(input: GenInput, progress: Progress = () => {}, planetIndex = 0): World {
	const opts = withDefaults(input);
	const rng = makeRng(opts.seed);
	const { width: W, height: H } = opts;
	setRaces(opts.races);
	progress('Scattering points', 0.02);
	const { cells: c, edges, spacing } = buildGrid(rng, opts.cells, W, H, !!opts.wrapX);
	progress('Raising mountains', 0.12);
	const pk = PLANETS[opts.planet];
	generateHeightmap(rng, c, opts.planet === 'shattered' && opts.template === 'continents' ? 'archipelago' : opts.template, W, H);
	const shift = pk.sea - opts.seaLevel;
	if (shift) for (let i = 0; i < c.n; i++) if (c.h[i] > 2) c.h[i] = Math.max(0, Math.min(100, c.h[i] + shift));
	progress('Filling oceans', 0.3);
	let features = markFeatures(c, W, H);
	// guarantee a playable amount of land
	let landCount = 0;
	for (let i = 0; i < c.n; i++) if (c.h[i] >= 20) landCount++;
	if (landCount < c.n * 0.12) {
		for (let i = 0; i < c.n; i++) if (c.h[i] > 8) c.h[i] = Math.min(100, c.h[i] + 6);
		features = markFeatures(c, W, H);
	}
	progress('Turning the winds', 0.4);
	const lat = climate(c, H, opts.climate);
	precipitation(rng, c, W, H, lat, opts.climate);
	progress('Carving rivers', 0.5);
	const riverList = rivers(rng, c, features, opts.rivers);
	assignBiomes(c);
	planetBiomes(c, opts.planet, rng);
	assignPopulation(c, features);
	progress('Seeding peoples', 0.6);
	const cultureCount = opts.cultures || Math.max(5, Math.round(opts.states * 0.75));
	const { cultures, langs } = generateCultures(c, rng, opts.seed, features, cultureCount, opts.spheres);
	progress('Founding cities', 0.7);
	const burgs = generateBurgs(c, rng, langs, features, opts.states, opts.genre, opts.burgs);
	const states = generateStates(c, rng, burgs, cultures, langs, opts.genre, opts.sizeVariety, opts.growth);
	progress('Kindling faiths', 0.8);
	const religions = generateReligions(c, rng, cultures, burgs, states, langs, opts.religions);
	progress('Paving roads', 0.88);
	const { routes, links } = generateRoutes(c, burgs, spacing);
	progress('Delving the deeps', 0.93);
	const layers = generateLayers(c, rng, opts, { cultures, langs, burgs, states, religions, routes, links }, spacing);
	for (const r of riverList) {
		if (!r.id || !r.cells.length) continue;
		const cu = c.culture[r.cells[0]] || 1;
		r.name = makeName(langs[cu] ?? langs[1], 'river');
	}
	const name = makeName(langs[1], 'world');
	progress('Done', 1);
	return { planet: planetIndex, name, opts, layers, cells: c, edges, features, rivers: riverList, cultures, religions, burgs, states, routes, links };
}
