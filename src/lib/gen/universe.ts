import { makeRng } from '../rng';
import { generateWorld, type Progress } from './index';
import { climateFor, withDefaults } from './options';
import type { GenInput, GenOptions, PlanetKind, Template, World } from './types';

export interface RiftEnd {
	planet: number;
	burg: number;
}
export interface Rift {
	id: number;
	name: string;
	a: RiftEnd;
	b: RiftEnd;
	/** months of travel through the rift */
	days: number;
}
export interface Universe {
	seed: string;
	planets: World[];
	rifts: Rift[];
}

const KINDS: PlanetKind[] = ['terran', 'verdant', 'desert', 'ocean', 'ice', 'volcanic', 'shattered', 'exotic'];
const TEMPLATES: Template[] = ['continents', 'archipelago', 'pangea', 'highIsland', 'inlandSea', 'peninsulas'];

/** Layer an override over the rolled options. Nested density/layerDetail/climate merge; a new planet kind without its own climate re-derives it (keeping the rolled latitude). */
export function applyOverride(rolled: GenOptions, base: GenOptions, ov?: Partial<GenOptions>): GenOptions {
	const { planetOverrides: _drop, ...rest } = rolled;
	if (!ov) return rest as GenOptions;
	const out = withDefaults({ ...rest, ...ov, density: { ...rolled.density, ...ov.density }, layerDetail: { ...rolled.layerDetail, ...ov.layerDetail }, climate: ov.climate ? { ...rolled.climate, ...ov.climate } : rolled.climate } as GenInput);
	if (ov.planet && ov.planet !== rolled.planet && !ov.climate) out.climate = { ...climateFor(ov.planet, base.climate), latitude: rolled.climate.latitude };
	delete out.planetOverrides;
	return out;
}

/** One or more planets linked by rifts. Planet 0 uses the chosen options; the rest are rolled. */
export function generateUniverse(input: GenInput, planets: number, progress: Progress = () => {}): Universe {
	const base = withDefaults(input);
	const rng = makeRng(base.seed + ':cosmos');
	const worlds: World[] = [];
	for (let p = 0; p < planets; p++) {
		const rolled: GenOptions =
			p === 0
				? base
				: (() => {
						const planet = rng.pick(KINDS.filter((k) => k !== base.planet));
						return { ...base, seed: `${base.seed}:planet${p}`, planet, template: rng.pick(TEMPLATES), states: Math.max(6, Math.round(base.states * (0.6 + rng() * 0.6))), cultures: 0, burgs: 0, religions: 0, climate: { ...climateFor(planet, base.climate), latitude: rng.int(15, 85) } };
					})();
		const opts = applyOverride(rolled, base, base.planetOverrides?.[p]);
		worlds.push(generateWorld(opts, (stage, pct) => progress(`${planets > 1 ? `Planet ${p + 1}/${planets}: ` : ''}${stage}`, (p + pct) / planets), p));
	}
	const rifts: Rift[] = [];
	if (planets > 1) {
		const ends = (w: World) => w.burgs.filter((b) => b.id && b.alive);
		for (let p = 0; p < planets; p++)
			for (let k = 0; k < 2; k++) {
				const q = (p + 1 + k) % planets;
				if (q === p) continue;
				const a = rng.pick(ends(worlds[p]));
				const b = rng.pick(ends(worlds[q]));
				const name = `${rng.pick(['Weeping', 'Burning', 'Silent', 'Singing', 'Hollow', 'Starlit', 'Shattered', 'Crimson'])} ${rng.pick(['Rift', 'Gate', 'Tear', 'Door', 'Veil', 'Wound'])}`;
				rifts.push({ id: rifts.length, name, a: { planet: p, burg: a.id }, b: { planet: q, burg: b.id }, days: rng.int(1, 3) });
			}
	}
	return { seed: base.seed, planets: worlds, rifts };
}
