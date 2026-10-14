import { createNoise3D } from 'simplex-noise';
import type { Rng } from '../rng';
import { GENRES, type Genre, type LayerKind } from './genre';
import { neighbors } from './grid';
import { makeLang, makeName, religionName, type Lang } from './names';
import { expand, langSeed, palette, polityForm, spacedPicks } from './society';
import { pickSphere, SPHERES } from './spheres';
import { pickSpeciesForCulture } from './species';
import { assignReligionIdentity } from './religions';
import { SEA, type Burg, type Cells, type Culture, type GenOptions, type Layer, type Religion, type Route, type StateDef } from './types';

/**
 * Exotic planes stacked on the same cell graph:
 *  - deep 1..N: cave networks (level 1 hugs mountain roots, deeper levels sprawl even under the sea)
 *  - sky: floating-island archipelagos unrelated to the terrain below
 *  - sea: continental shelves for undersea domes
 * Each gets its own cultures, settlements, realms, and internal routes, plus vertical links to the surface.
 */
export function generateLayers(
	c: Cells,
	rng: Rng,
	opts: GenOptions,
	parts: { cultures: Culture[]; langs: Lang[]; burgs: Burg[]; states: StateDef[]; religions: Religion[]; routes: Route[]; links: [number, number, number][] },
	spacing: number
): Layer[] {
	const { width: W, height: H } = opts;
	const g = GENRES[opts.genre];
	const noise = createNoise3D(rng);
	const layers: Layer[] = [{ id: 0, kind: 'surface', depth: 0, name: g.layerNames.surface, open: new Uint8Array(c.n), state: c.state }];
	for (let i = 0; i < c.n; i++) layers[0].open[i] = c.h[i] >= SEA ? 1 : 0;

	const defs: { kind: LayerKind; depth: number }[] = [];
	for (let d = 1; d <= opts.depth; d++) defs.push({ kind: 'deep', depth: d });
	if (opts.sky) defs.push({ kind: 'sky', depth: 0 });
	if (opts.sea) defs.push({ kind: 'sea', depth: 0 });

	for (const def of defs) {
		const open = new Uint8Array(c.n);
		const z = def.kind === 'deep' ? def.depth * 3.7 : def.kind === 'sky' ? 50 : 90;
		for (let i = 0; i < c.n; i++) {
			const nx = (c.x[i] / W) * 5, ny = (c.y[i] / H) * 5;
			const v = noise(nx, ny, z) * 0.65 + noise(nx * 3, ny * 3, z + 7) * 0.35;
			if (def.kind === 'deep') {
				const mountain = c.h[i] >= SEA ? Math.max(0, c.h[i] - 40) / 60 : 0;
				const bias = def.depth === 1 ? mountain * 0.7 - (c.h[i] < SEA ? 0.5 : 0) : def.depth * 0.06 - (c.h[i] < 8 ? 0.15 : 0);
				open[i] = v + bias > 0.28 ? 1 : 0;
			} else if (def.kind === 'sky') {
				open[i] = v > 0.3 ? 1 : 0;
			} else {
				open[i] = c.h[i] < SEA && c.dist[i] <= -2 && c.dist[i] >= -9 && v > -0.25 ? 1 : 0;
			}
		}
		// prune specks: keep components of 6+ cells
		const comp = new Int32Array(c.n).fill(-1);
		for (let s = 0; s < c.n; s++) {
			if (!open[s] || comp[s] >= 0) continue;
			const q = [s];
			comp[s] = s;
			for (let qi = 0; qi < q.length; qi++) for (const j of neighbors(c, q[qi])) if (open[j] && comp[j] < 0) { comp[j] = s; q.push(j); }
			if (q.length < 6) for (const i of q) open[i] = 0;
		}
		const id = layers.length;
		const name = def.kind === 'deep' ? `${g.layerNames.deep} ${'I II III IV V VI'.split(' ')[def.depth - 1] ?? def.depth}` : g.layerNames[def.kind];
		const layer: Layer = { id, kind: def.kind, depth: def.depth, name, open, state: new Uint16Array(c.n) };
		layers.push(layer);
		populateLayer(c, rng, opts.genre, opts.seed, layer, parts, spacing, opts.spheres, opts);
	}
	return layers;
}

function populateLayer(
	c: Cells,
	rng: Rng,
	genre: Genre,
	seed: string,
	layer: Layer,
	parts: { cultures: Culture[]; langs: Lang[]; burgs: Burg[]; states: StateDef[]; religions: Religion[]; routes: Route[]; links: [number, number, number][] },
	spacing: number,
	allowed: string[] | null,
	opts: GenOptions
) {
	const g = GENRES[genre];
	const density = g.density[layer.kind as 'deep' | 'sky' | 'sea'] * (opts.density?.[layer.kind as 'deep' | 'sky' | 'sea'] ?? 1);
	let openN = 0;
	for (let i = 0; i < c.n; i++) openN += layer.open[i];
	if (openN < 20) return;
	const score = new Float32Array(c.n);
	for (let i = 0; i < c.n; i++) if (layer.open[i]) score[i] = 0.5 + rng();
	const count = Math.max(2, Math.round((openN / 70) * density));
	const minD = spacing * Math.max(3, Math.sqrt(openN / count) * 0.9);
	const sites = spacedPicks(c, rng, score, count, minD);
	if (!sites.length) return;

	// 1–3 peoples per layer (dwarven, sky-folk, merfolk… whatever the sphere makes of them)
	const nCult = Math.min(sites.length, layer.kind === 'deep' ? 2 : rng.int(1, 2));
	const cultIds: number[] = [];
	const eld = SPHERES.find((s) => s.id === 'eldritch')!;
	for (let k = 0; k < nCult; k++) {
		const id = parts.cultures.length;
		const sphere = layer.kind === 'deep' && layer.depth >= 3 && rng() < 0.5 && (!allowed || allowed.includes('eldritch')) ? eld : pickSphere(rng, c.biome[sites[k]], c.temp[sites[k]], allowed);
		const L = makeLang(langSeed(seed, id), sphere.id);
		parts.langs[id] = L;
		const type = layer.kind === 'deep' ? 'Deep' : layer.kind === 'sky' ? 'Sky' : 'Sea';
		const species = pickSpeciesForCulture(rng, c.biome[sites[k]], layer.kind, sphere.id);
		parts.cultures.push({ id, name: makeName(L, 'people'), color: palette(rng, 1, 40, 60)[0], center: sites[k], type, lang: id, sphere: sphere.id, layer: layer.kind, species: species.id });
		cultIds.push(id);
		const { name, deity } = religionName(L, rng, true, parts.cultures[id].name);
		const ident = assignReligionIdentity(rng, 'Folk', sphere.id || 'Generic');
		parts.religions.push({
			id: parts.religions.length,
			name,
			color: palette(rng, 1, 50, 55)[0],
			type: 'Folk',
			deity,
			center: sites[k],
			culture: id,
			theology: ident.theology,
			doctrine: ident.doctrine,
			features: ident.features
		});
	}
	const kinds = g.kinds[layer.kind];
	const layerBurgs: Burg[] = [];
	for (const cell of sites) {
		// nearest culture seed
		let cult = cultIds[0], best = Infinity;
		for (const id of cultIds) {
			const cc = parts.cultures[id].center;
			const d = (c.x[cc] - c.x[cell]) ** 2 + (c.y[cc] - c.y[cell]) ** 2;
			if (d < best) { best = d; cult = id; }
		}
		const b: Burg = {
			id: parts.burgs.length, cell, x: c.x[cell], y: c.y[cell], name: makeName(parts.langs[cult], 'city'), culture: cult, state: 0,
			capital: false, port: false, pop: +(1 + rng() * 6).toFixed(2), alive: true, layer: layer.kind, depth: layer.depth, kind: rng.pick(kinds)
		};
		parts.burgs.push(b);
		layerBurgs.push(b);
	}
	// realms: roughly one per 3–5 settlements
	const nStates = Math.max(1, Math.round(layerBurgs.length / (3 + rng() * 2)));
	const caps = layerBurgs.slice().sort((a, b) => b.pop - a.pop).slice(0, nStates);
	const ids: number[] = [];
	for (const b of caps) {
		const id = parts.states.length;
		const cult = parts.cultures[b.culture];
		const form = polityForm(rng, cult.sphere, genre, cult.type);
		const name = rng() < 0.5 ? b.name : makeName(parts.langs[b.culture], 'land');
		b.capital = true;
		b.state = id;
		const relId = parts.religions.find((r) => r.culture === b.culture)?.id ?? 0;
		parts.states.push({ id, name, form, fullName: `${form} of ${name}`, color: palette(rng, 1, 55, 50)[0], capital: b.id, culture: b.culture, religion: relId, expansionism: 0.8 + rng() * 0.6, layer: layer.id });
		ids.push(id);
	}
	expand(c, caps.map((b) => b.cell), layer.state, ids, (_f, to) => (layer.open[to] ? 1 + rng() * 0.3 : Infinity), spacing * 0 + Math.sqrt(openN / nStates) * 2.2);
	for (const b of layerBurgs) b.state = layer.state[b.cell];

	// internal routes
	const linkKind: Route['kind'] = layer.kind === 'deep' ? 'tunnel' : layer.kind === 'sky' ? 'sky' : 'sea';
	for (const b of layerBurgs) {
		const near = layerBurgs.filter((o) => o !== b).map((o) => ({ o, d: Math.hypot(o.x - b.x, o.y - b.y) })).sort((p, q) => p.d - q.d).slice(0, 2);
		for (const { o, d } of near) {
			if (parts.links.some(([x, y]) => (x === b.id && y === o.id) || (x === o.id && y === b.id))) continue;
			let cells: number[] | null = [b.cell, o.cell];
			if (layer.kind !== 'sky') cells = bfsPath(c, layer.open, b.cell, o.cell);
			if (!cells) continue;
			parts.routes.push({ kind: linkKind, cells, a: b.id, b: o.id });
			parts.links.push([b.id, o.id, Math.max(1, Math.round((layer.kind === 'sky' ? d / spacing : cells.length) * (layer.kind === 'sky' ? 0.5 : 1.2)))]);
		}
	}
	// vertical links: each settlement connects to the nearest settlement one level "up"
	const upper = parts.burgs.filter((o) => o.id && o.alive && (layer.kind === 'deep' ? (layer.depth === 1 ? o.layer === 'surface' : o.layer === 'deep' && o.depth === layer.depth - 1) : o.layer === 'surface' && (layer.kind !== 'sea' || o.port)));
	for (const b of layerBurgs) {
		if (!upper.length) break;
		let best = upper[0], bd = Infinity;
		for (const o of upper) {
			const d = (o.x - b.x) ** 2 + (o.y - b.y) ** 2;
			if (d < bd) { bd = d; best = o; }
		}
		parts.routes.push({ kind: 'shaft', cells: [b.cell, best.cell], a: b.id, b: best.id });
		parts.links.push([b.id, best.id, Math.max(2, Math.round(Math.sqrt(bd) / spacing))]);
	}
}

function bfsPath(c: Cells, open: Uint8Array, a: number, b: number): number[] | null {
	const prev = new Int32Array(c.n).fill(-1);
	prev[a] = a;
	const q = [a];
	for (let qi = 0; qi < q.length; qi++) {
		const i = q[qi];
		if (i === b) break;
		for (const j of neighbors(c, i)) if (prev[j] < 0 && (open[j] || j === b)) { prev[j] = i; q.push(j); }
	}
	if (prev[b] < 0) return null;
	const out = [b];
	for (let i = b; i !== a; i = prev[i]) out.push(prev[i]);
	return out.reverse();
}
