import { Delaunay } from 'd3-delaunay';
import type { Rng } from '../rng';
import type { Cells, Edges } from './types';

/** Jittered square grid → Delaunay/Voronoi. Same approach as Azgaar's FMG. */
export function buildGrid(rng: Rng, desired: number, width: number, height: number) {
	const spacing = Math.sqrt((width * height) / desired);
	const radius = spacing / 2;
	const jitter = radius * 0.9;
	const pts: number[] = [];
	for (let y = radius; y < height; y += spacing)
		for (let x = radius; x < width; x += spacing)
			pts.push(
				Math.min(width - 1e-3, Math.max(1e-3, x + (rng() * 2 - 1) * jitter)),
				Math.min(height - 1e-3, Math.max(1e-3, y + (rng() * 2 - 1) * jitter))
			);
	const n = pts.length / 2;
	const delaunay = new Delaunay(Float64Array.from(pts));
	const voronoi = delaunay.voronoi([0, 0, width, height]);

	const x = new Float32Array(n);
	const y = new Float32Array(n);
	for (let i = 0; i < n; i++) {
		x[i] = pts[2 * i];
		y[i] = pts[2 * i + 1];
	}

	// neighbours (CSR)
	const nStart = new Int32Array(n + 1);
	const tmp: number[] = [];
	for (let i = 0; i < n; i++) {
		nStart[i] = tmp.length;
		for (const j of delaunay.neighbors(i)) tmp.push(j);
	}
	nStart[n] = tmp.length;
	const nList = Int32Array.from(tmp);

	// polygons (CSR)
	const polyStart = new Int32Array(n + 1);
	const poly: number[] = [];
	for (let i = 0; i < n; i++) {
		polyStart[i] = poly.length / 2;
		const ring = voronoi.cellPolygon(i);
		if (ring) for (let k = 0; k < ring.length - 1; k++) poly.push(ring[k][0], ring[k][1]);
	}
	polyStart[n] = poly.length / 2;

	// edges between adjacent cells, keyed by circumcenter (voronoi vertex) ids
	const { triangles, halfedges } = delaunay;
	const cc = voronoi.circumcenters;
	const nt = triangles.length / 3;
	const vx = new Float32Array(nt);
	const vy = new Float32Array(nt);
	for (let t = 0; t < nt; t++) {
		vx[t] = Math.min(width, Math.max(0, cc[2 * t]));
		vy[t] = Math.min(height, Math.max(0, cc[2 * t + 1]));
	}
	const ea: number[] = [], eb: number[] = [], eva: number[] = [], evb: number[] = [];
	for (let e = 0; e < halfedges.length; e++) {
		const o = halfedges[e];
		if (o < e) continue; // unique + skip hull (-1)
		const next = e % 3 === 2 ? e - 2 : e + 1;
		ea.push(triangles[e]);
		eb.push(triangles[next]);
		eva.push(Math.floor(e / 3));
		evb.push(Math.floor(o / 3));
	}
	const edges: Edges = {
		n: ea.length,
		a: Int32Array.from(ea),
		b: Int32Array.from(eb),
		va: Int32Array.from(eva),
		vb: Int32Array.from(evb),
		vx,
		vy
	};

	const cells: Cells = {
		n,
		x,
		y,
		nStart,
		nList,
		polyStart,
		polyXY: Float32Array.from(poly),
		h: new Uint8Array(n),
		feature: new Int32Array(n),
		dist: new Int8Array(n),
		temp: new Int8Array(n),
		prec: new Uint8Array(n),
		flux: new Float32Array(n),
		river: new Uint16Array(n),
		biome: new Uint8Array(n),
		pop: new Float32Array(n),
		culture: new Uint16Array(n),
		state: new Uint16Array(n),
		religion: new Uint16Array(n),
		burg: new Uint16Array(n),
		road: new Uint8Array(n)
	};
	return { cells, edges, spacing };
}

/** iterate neighbours without allocating */
export function forN(c: Cells, i: number, fn: (j: number) => void) {
	for (let k = c.nStart[i], e = c.nStart[i + 1]; k < e; k++) fn(c.nList[k]);
}

export function neighbors(c: Cells, i: number): Int32Array {
	return c.nList.subarray(c.nStart[i], c.nStart[i + 1]);
}

/** Nearest cell by brute-ish search via walking the neighbour graph (greedy). */
export function findCell(c: Cells, px: number, py: number, start = 0): number {
	let cur = start;
	let best = (c.x[cur] - px) ** 2 + (c.y[cur] - py) ** 2;
	for (;;) {
		let moved = false;
		for (const j of neighbors(c, cur)) {
			const d = (c.x[j] - px) ** 2 + (c.y[j] - py) ** 2;
			if (d < best) {
				best = d;
				cur = j;
				moved = true;
			}
		}
		if (!moved) return cur;
	}
}

/** Binary min-heap keyed by number: used for Dijkstra expansions and priority-flood. */
export class Heap {
	private k: number[] = [];
	private v: number[] = [];
	get size() {
		return this.v.length;
	}
	push(value: number, key: number) {
		const k = this.k, v = this.v;
		let i = v.length;
		k.push(key);
		v.push(value);
		while (i > 0) {
			const p = (i - 1) >> 1;
			if (k[p] <= key) break;
			k[i] = k[p];
			v[i] = v[p];
			i = p;
		}
		k[i] = key;
		v[i] = value;
	}
	/** returns value; read key via lastKey */
	lastKey = 0;
	pop(): number {
		const k = this.k, v = this.v;
		const top = v[0];
		this.lastKey = k[0];
		const lk = k.pop()!, lv = v.pop()!;
		const n = v.length;
		if (n > 0) {
			let i = 0;
			for (;;) {
				let m = 2 * i + 1;
				if (m >= n) break;
				if (m + 1 < n && k[m + 1] < k[m]) m++;
				if (k[m] >= lk) break;
				k[i] = k[m];
				v[i] = v[m];
				i = m;
			}
			k[i] = lk;
			v[i] = lv;
		}
		return top;
	}
}
