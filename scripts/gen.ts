import { generateWorld } from '../src/lib/gen/index';
import { BIOMES } from '../src/lib/gen/physical';
import type { Template } from '../src/lib/gen/types';

const template = (process.argv[2] ?? 'continents') as Template;
const cells = Number(process.argv[3] ?? 8000);
for (const seed of ['alpha', 'beta', 'gamma']) {
	const t0 = performance.now();
	const w = generateWorld({ seed, template, cells, states: 14, width: 1600, height: 1000, genre: 'fantasy', planet: 'terran', spheres: null, depth: 3, sky: true, sea: true });
	const c = w.cells;
	console.log('  layers', w.layers.map((l) => l.name + ':' + w.burgs.filter((b) => b.layer === l.kind && b.depth === l.depth).length).join(' '), '| polities', w.states.length, '| spheres', w.cultures.map((x) => x.sphere).join(','));
	let landN = 0;
	const bc = new Array(13).fill(0);
	for (let i = 0; i < c.n; i++) { if (c.h[i] >= 20) landN++; bc[c.biome[i]]++; }
	const stateCells = new Array(w.states.length).fill(0);
	for (let i = 0; i < c.n; i++) if (c.h[i] >= 20) stateCells[c.state[i]]++;
	console.log(`${seed} ${template}: ${(performance.now() - t0).toFixed(0)}ms n=${c.n} land=${((landN / c.n) * 100).toFixed(0)}% rivers=${w.rivers.length - 1} burgs=${w.burgs.length - 1} routes=${w.routes.length} links=${w.links.length} world="${w.name}"`);
	console.log('  biomes', bc.map((v, i) => v ? `${BIOMES[i].name}:${v}` : '').filter(Boolean).join(' '));
	console.log('  states', w.states.slice(0, 6).map((s) => `${s.fullName}(${stateCells[s.id]})`).join(', '));
	console.log('  cultures', w.cultures.slice(1, 6).map((x) => `${x.name}/${x.type}`).join(', '), '| faiths', w.religions.slice(-3).map((r) => r.name).join('; '));
	console.log('  burgs', w.burgs.slice(1, 9).map((b) => b.name).join(', '), '| rivers', w.rivers.slice(1, 5).map((r) => r.name).join(', '));
}
{
	const w = generateWorld({ seed: 'alpha', template, cells, states: 14, width: 1600, height: 1000, genre: 'fantasy', planet: 'terran', spheres: null, depth: 3, sky: true, sea: true });
	const c = w.cells;
	const hist = (arr: ArrayLike<number>, f: (i: number) => boolean, step: number) => {
		const m = new Map<number, number>();
		for (let i = 0; i < c.n; i++) if (f(i)) { const k = Math.floor(arr[i] / step) * step; m.set(k, (m.get(k) ?? 0) + 1); }
		return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join(' ');
	};
	console.log('h', hist(c.h, () => true, 10));
	console.log('temp(land)', hist(c.temp, (i) => c.h[i] >= 20, 5));
	console.log('prec(land)', hist(c.prec, (i) => c.h[i] >= 20, 5));
}
