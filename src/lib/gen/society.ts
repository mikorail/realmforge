import { maxOf, type Rng } from '../rng';
import { Heap, neighbors } from './grid';
import { GENRES, type Genre } from './genre';
import { makeLang, makeName, religionName, type Lang } from './names';
import { pickSphere, SPHERE_BY_ID } from './spheres';
import { pickSpeciesForCulture } from './species';
import { assignReligionIdentity } from './religions';
import { BIOMES } from './physical';
import { SEA, type Burg, type Cells, type Culture, type Feature, type Religion, type Route, type StateDef } from './types';

export const langSeed = (seed: string, i: number) => `${seed}:lang:${i}`;

/** pleasant distinct colours via golden-angle hue walk */
export function palette(rng: Rng, count: number, s = 55, l = 58): string[] {
	const out: string[] = [];
	let hue = rng() * 360;
	for (let i = 0; i < count; i++) {
		hue = (hue + 137.508) % 360;
		out.push(`hsl(${hue.toFixed(0)} ${s + rng() * 15 - 7}% ${l + rng() * 12 - 6}%)`);
	}
	return out;
}

const land = (c: Cells, i: number) => c.h[i] >= SEA;

export function spacedPicks(c: Cells, rng: Rng, score: Float32Array, count: number, minDist: number, exclude?: (i: number) => boolean) {
	const order = Array.from({ length: c.n }, (_, i) => i).filter((i) => score[i] > 0 && !exclude?.(i));
	order.sort((a, b) => score[b] - score[a]);
	const picked: number[] = [];
	let d = minDist;
	while (picked.length < count && d > 1) {
		for (const i of order) {
			if (picked.length >= count) break;
			if (picked.includes(i)) continue;
			let ok = true;
			for (const p of picked) if ((c.x[p] - c.x[i]) ** 2 + (c.y[p] - c.y[i]) ** 2 < d * d) { ok = false; break; }
			if (ok) picked.push(i);
		}
		d *= 0.8;
	}
	void rng;
	return picked;
}

/** generic Dijkstra region growth from seeds with a cost function */
export function expand(c: Cells, seeds: number[], out: Uint16Array, ids: number[], costFn: (from: number, to: number, owner: number) => number, maxCost = Infinity) {
	const cost = new Float64Array(c.n).fill(Infinity);
	const heap = new Heap();
	seeds.forEach((s, k) => {
		cost[s] = 0;
		out[s] = ids[k];
		heap.push(s, 0);
	});
	while (heap.size) {
		const i = heap.pop();
		const ci = heap.lastKey;
		if (ci > cost[i]) continue;
		const owner = out[i];
		for (const j of neighbors(c, i)) {
			const step = costFn(i, j, owner);
			if (!isFinite(step)) continue;
			const nc = ci + step;
			if (nc > maxCost || nc >= cost[j]) continue;
			cost[j] = nc;
			out[j] = owner;
			heap.push(j, nc);
		}
	}
}

export function generateCultures(c: Cells, rng: Rng, seed: string, features: Feature[], count: number, allowed: string[] | null) {
	const score = new Float32Array(c.n);
	for (let i = 0; i < c.n; i++) score[i] = land(c, i) ? c.pop[i] * (0.5 + rng()) : 0;
	const W = maxOf(c.x), H = maxOf(c.y);
	const centers = spacedPicks(c, rng, score, count, Math.sqrt((W * H) / count) * 0.6);
	const colors = palette(rng, centers.length, 45, 62);
	const langs: Lang[] = [];
	const cultures: Culture[] = [{ id: 0, name: 'Wildlands', color: '#999', center: -1, type: 'Generic', lang: 0, sphere: '', layer: 'surface' }];
	centers.forEach((center, k) => {
		const id = k + 1;
		const sphere = pickSphere(rng, c.biome[center], c.temp[center], allowed);
		const L = makeLang(langSeed(seed, id), sphere.id);
		langs[id] = L;
		const b = c.biome[center];
		let type: Culture['type'] = 'Generic';
		if (c.h[center] > 50) type = 'Highland';
		else if (b === 1 || b === 2 || b === 3 || b === 4) type = rng.chance(0.6) ? 'Nomadic' : 'Generic';
		else if (b === 9 || b === 10) type = 'Hunting';
		else if (c.dist[center] === 1 && rng.chance(0.6)) {
			let lake = false;
			for (const j of neighbors(c, center)) if (!land(c, j) && features[c.feature[j]].type === 'lake') lake = true;
			type = lake ? 'Lake' : 'Naval';
		} else if (c.river[center] && c.flux[center] > 40) type = 'River';
		const species = pickSpeciesForCulture(rng, c.biome[center], 'surface', sphere.id);
		cultures.push({ id, name: makeName(L, 'people'), color: colors[k], center, type, lang: id, sphere: sphere.id, layer: 'surface', species: species.id });
	});
	expand(
		c,
		centers,
		c.culture,
		centers.map((_, k) => k + 1),
		(from, to, owner) => {
			if (!land(c, to)) return Infinity;
			const t = cultures[owner].type;
			let cost = BIOMES[c.biome[to]].cost / 10;
			if (t === 'Nomadic' && (c.biome[to] <= 4)) cost *= 0.4;
			if (t === 'Hunting' && (c.biome[to] === 9 || c.biome[to] === 10)) cost *= 0.3;
			if (t === 'Highland') cost *= c.h[to] > 45 ? 0.5 : 2.5;
			else cost += Math.max(0, c.h[to] - 55) * 0.6;
			if (t === 'River') cost *= c.river[to] ? 0.4 : 1.6;
			if (t === 'Naval' || t === 'Lake') cost *= c.dist[to] <= 2 ? 0.5 : 1.8;
			if (c.river[to] && !c.river[from]) cost += 2;
			return cost + 1;
		}
	);
	return { cultures, langs };
}

export function generateBurgs(c: Cells, rng: Rng, langs: Lang[], features: Feature[], stateCount: number, genre: Genre, burgCount = 0): Burg[] {
	const score = new Float32Array(c.n);
	for (let i = 0; i < c.n; i++) {
		if (!land(c, i) || c.pop[i] <= 0) continue;
		let s = c.pop[i];
		if (c.river[i]) s *= 1.4;
		if (c.dist[i] === 1) s *= 1.3;
		score[i] = s * (0.6 + rng() * 0.8);
	}
	const W = maxOf(c.x), H = maxOf(c.y);
	const capitals = spacedPicks(c, rng, score, stateCount, Math.sqrt((W * H) / stateCount) * 0.75);
	const townCount = burgCount ? Math.max(0, burgCount - capitals.length) : Math.round(c.n / 45);
	const towns = spacedPicks(c, rng, score, townCount, Math.sqrt((W * H) / townCount) * 0.55, (i) => capitals.includes(i));
	const burgs: Burg[] = [{ id: 0, cell: -1, x: 0, y: 0, name: '', culture: 0, state: 0, capital: false, port: false, pop: 0, alive: false, layer: 'surface', depth: 0, kind: '' }];
	const kinds = GENRES[genre].kinds.surface;
	for (const [list, cap] of [[capitals, true], [towns, false]] as const)
		for (const cell of list) {
			const id = burgs.length;
			const cult = c.culture[cell];
			let port = false;
			if (c.dist[cell] === 1)
				for (const j of neighbors(c, cell))
					if (!land(c, j) && (features[c.feature[j]].type === 'ocean' || features[c.feature[j]].cells > 20)) port = true;
			const pop = Math.max(0.5, c.pop[cell] * (cap ? 1.8 : 0.7) * (0.6 + rng() * 0.8) * (port ? 1.3 : 1));
			const kind = cap ? kinds[1] : port ? kinds[3] : pop > 4 ? kinds[1] : c.h[cell] > 50 ? kinds[2] : kinds[0];
			burgs.push({ id, cell, x: c.x[cell], y: c.y[cell], name: makeName(langs[cult] ?? langs[1], 'city'), culture: cult, state: 0, capital: cap, port, pop: +pop.toFixed(2), alive: true, layer: 'surface', depth: 0, kind });
			c.burg[cell] = id;
		}
	return burgs;
}

export function polityForm(rng: Rng, sphereId: string, genre: Genre, cultType: string): string {
	const g = GENRES[genre];
	const sp = SPHERE_BY_ID[sphereId];
	if (!sp || rng() < g.formBias) return rng.pick(g.forms);
	if (cultType === 'Nomadic' && rng() < 0.5) return rng.pick(['Horde', 'Confederation', 'Khanate']);
	return rng.pick(sp.forms);
}

export function generateStates(c: Cells, rng: Rng, burgs: Burg[], cultures: Culture[], langs: Lang[], genre: Genre, variety = 4, growth = 1): StateDef[] {
	const caps = burgs.filter((b) => b.capital);
	const colors = palette(rng, caps.length, 60, 55);
	const states: StateDef[] = [{ id: 0, name: 'Neutral lands', form: '', fullName: 'Neutral lands', color: '#aaa', capital: 0, culture: 0, religion: 0, expansionism: 0, layer: 0 }];
	caps.forEach((b, k) => {
		const id = k + 1;
		const cult = cultures[b.culture];
		const form = polityForm(rng, cult.sphere, genre, cult.type);
		const name = rng.chance(0.4) ? b.name : makeName(langs[cult.id] ?? langs[1], 'land');
		states.push({ id, name, form, fullName: `${form} of ${name}`, color: colors[k], capital: b.id, culture: cult.id, religion: 0, expansionism: Math.max(0.3, 1 + (rng() - 0.5) * variety * 0.22), layer: 0 });
		b.state = id;
	});
	const W = maxOf(c.x), H = maxOf(c.y);
	const area = W * H;
	const maxCost = Math.sqrt(area / caps.length) * 0.09 * (c.n / 8000) ** 0.5 * 24 * growth;
	expand(
		c,
		caps.map((b) => b.cell),
		c.state,
		caps.map((_, k) => k + 1),
		(from, to, owner) => {
			if (!land(c, to)) return Infinity;
			const s = states[owner];
			let cost = BIOMES[c.biome[to]].cost / 10 + 1;
			if (c.culture[to] !== s.culture) cost += 10;
			cost += Math.max(0, c.h[to] - 60) * 0.8;
			if (c.river[to] && !c.river[from]) cost += 3;
			return cost / s.expansionism;
		},
		maxCost
	);
	for (const b of burgs) if (b.id) b.state = c.state[b.cell];
	return states;
}

export function generateReligions(c: Cells, rng: Rng, cultures: Culture[], burgs: Burg[], states: StateDef[], langs: Lang[], count = 0): Religion[] {
	const religions: Religion[] = [{ id: 0, name: 'No faith', color: '#bbb', type: 'Folk', deity: '', center: -1, culture: 0 }];
	const colors = palette(rng, cultures.length + 6, 50, 60);
	// folk faith per culture
	for (const cu of cultures) {
		if (!cu.id) continue;
		const { name, deity } = religionName(langs[cu.id], rng, true, cu.name);
		const id = religions.length;
		const ident = assignReligionIdentity(rng, 'Folk', cu.sphere || 'Generic');
		religions.push({
			id,
			name,
			color: colors[id - 1],
			type: 'Folk',
			deity,
			center: cu.center,
			culture: cu.id,
			theology: ident.theology,
			doctrine: ident.doctrine,
			features: ident.features
		});
	}
	for (let i = 0; i < c.n; i++) c.religion[i] = c.culture[i] ? c.culture[i] : 0; // folk id == culture id
	// organized faiths spread from a few capitals
	const nOrg = count || Math.max(2, Math.round((states.length - 1) / 4));
	const caps = burgs.filter((b) => b.capital).sort(() => rng() - 0.5).slice(0, nOrg);
	const seeds: number[] = [];
	const ids: number[] = [];
	for (const b of caps) {
		const L = langs[b.culture] ?? langs[1];
		const { name, deity } = religionName(L, rng, false, cultures[b.culture].name);
		const id = religions.length;
		const type = rng.chance(0.15) ? 'Cult' : 'Organized';
		const ident = assignReligionIdentity(rng, type, cultures[b.culture].sphere || 'Generic');
		religions.push({
			id,
			name,
			color: colors[id - 1] ?? '#c9a',
			type,
			deity,
			center: b.cell,
			culture: b.culture,
			theology: ident.theology,
			doctrine: ident.doctrine,
			features: ident.features
		});
		seeds.push(b.cell);
		ids.push(id);
	}
	const org = new Uint16Array(c.n);
	const W = maxOf(c.x), H = maxOf(c.y);
	expand(
		c,
		seeds,
		org,
		ids,
		(_f, to) => {
			if (!land(c, to)) return 8; // faiths cross straits
			return BIOMES[c.biome[to]].cost / 25 + 1 + (c.pop[to] < 0.5 ? 4 : 0);
		},
		Math.sqrt((W * H) / Math.max(1, states.length - 1)) * 0.6 * Math.sqrt(c.n / 8000)
	);
	for (let i = 0; i < c.n; i++) if (org[i] && land(c, i)) c.religion[i] = org[i];
	// each state adopts the majority faith around its capital
	for (const s of states) {
		if (!s.id) continue;
		s.religion = c.religion[burgs[s.capital].cell];
	}
	return religions;
}

/** A* over land cells; roads cheaper on existing roads so they merge into networks */
function landPath(c: Cells, a: number, b: number, water = false): number[] | null {
	const n = c.n;
	const g = new Float32Array(n).fill(Infinity);
	const from = new Int32Array(n).fill(-1);
	const heap = new Heap();
	g[a] = 0;
	heap.push(a, 0);
	const hx = c.x[b], hy = c.y[b];
	let expanded = 0;
	while (heap.size) {
		const i = heap.pop();
		if (i === b) break;
		if (++expanded > (water ? 20000 : 6000)) return null;
		for (const j of neighbors(c, i)) {
			if (water ? land(c, j) && j !== b : !land(c, j)) continue;
			const d = Math.hypot(c.x[j] - c.x[i], c.y[j] - c.y[i]);
			if (water) {
				const ng = g[i] + d * (c.dist[j] < -3 ? 0.9 : 1);
				if (ng < g[j]) { g[j] = ng; from[j] = i; heap.push(j, ng + Math.hypot(hx - c.x[j], hy - c.y[j])); }
				continue;
			}
			let mul = BIOMES[c.biome[j]].cost / 60 + 0.5 + Math.max(0, c.h[j] - 55) * 0.05;
			if (c.road[j]) mul *= 0.35;
			if (c.river[j] && !c.river[i]) mul += 1;
			const ng = g[i] + d * mul;
			if (ng < g[j]) {
				g[j] = ng;
				from[j] = i;
				heap.push(j, ng + Math.hypot(hx - c.x[j], hy - c.y[j]) * 0.5);
			}
		}
	}
	if (from[b] < 0 && a !== b) return null;
	const path = [b];
	for (let i = b; i !== a; i = from[i]) path.push(from[i]);
	return path.reverse();
}

export function generateRoutes(c: Cells, burgs: Burg[], spacing: number) {
	const routes: Route[] = [];
	const links: [number, number, number][] = [];
	const live = burgs.filter((b) => b.id && b.layer === 'surface');
	const linked = new Set<string>();
	const addLink = (a: number, b: number, days: number) => {
		const k = a < b ? `${a}-${b}` : `${b}-${a}`;
		if (linked.has(k)) return;
		linked.add(k);
		links.push([a, b, Math.max(1, Math.round(days))]);
	};
	// each burg connects to its 2 nearest same-landmass burgs (forms a connected-ish road net)
	for (const b of live) {
		const near = live
			.filter((o) => o.id !== b.id && c.feature[o.cell] === c.feature[b.cell])
			.map((o) => ({ o, d: Math.hypot(o.x - b.x, o.y - b.y) }))
			.sort((p, q) => p.d - q.d)
			.slice(0, b.capital ? 3 : 2);
		for (const { o } of near) {
			const k = b.id < o.id ? `${b.id}-${o.id}` : `${o.id}-${b.id}`;
			if (linked.has(k)) continue;
			const path = landPath(c, b.cell, o.cell);
			if (!path) continue;
			for (const i of path) c.road[i] = Math.min(255, c.road[i] + 1);
			routes.push({ kind: 'road', cells: path, a: b.id, b: o.id });
			let len = 0;
			for (let k2 = 1; k2 < path.length; k2++) {
				const p = path[k2 - 1], q = path[k2];
				len += Math.hypot(c.x[q] - c.x[p], c.y[q] - c.y[p]) * (BIOMES[c.biome[q]].cost / 80 + 0.6);
			}
			addLink(b.id, o.id, (len / spacing) * 1.5);
		}
	}
	// sea lanes: each port links to 2 nearest other ports
	const ports = live.filter((b) => b.port);
	for (const p of ports) {
		const near = ports
			.filter((o) => o.id !== p.id)
			.map((o) => ({ o, d: Math.hypot(o.x - p.x, o.y - p.y) }))
			.sort((a, b) => a.d - b.d)
			.slice(0, 2);
		for (const { o, d } of near) {
			if (d > spacing * 40) continue;
			const k = p.id < o.id ? `${p.id}-${o.id}` : `${o.id}-${p.id}`;
			if (linked.has(k)) continue;
			const path = landPath(c, p.cell, o.cell, true);
			if (!path) continue;
			routes.push({ kind: 'sea', cells: path, a: p.id, b: o.id });
			addLink(p.id, o.id, (path.length * 0.6));
		}
	}
	return { routes, links };
}
