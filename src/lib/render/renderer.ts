import { findCell, neighbors } from '../gen/grid';
import { BIOMES } from '../gen/physical';
import { SEA, type Cells, type Edges, type World } from '../gen/types';
import type { Simulation } from '../sim/engine';
import { alpha, mix, shade, THEMES, type MapTheme } from './theme';

export type MapMode = 'political' | 'biome' | 'height' | 'culture' | 'religion' | 'population';

interface Label {
	x: number;
	y: number;
	text: string;
	size: number;
	id: number;
}

export const HYPSO = ['#3a7a3a', '#5f9a48', '#8fb35a', '#c2c46a', '#d8b46a', '#c48e52', '#a06a44', '#8a5a44', '#b0a49a', '#f2f2f2'];

/** walk edges that satisfy pred into vertex chains (for smooth coastlines / borders) */
export function chains(e: Edges, pred: (a: number, b: number) => boolean): number[][] {
	const adj = new Map<number, number[]>();
	const ids: number[] = [];
	for (let k = 0; k < e.n; k++) {
		if (!pred(e.a[k], e.b[k])) continue;
		ids.push(k);
		const va = e.va[k], vb = e.vb[k];
		(adj.get(va) ?? adj.set(va, []).get(va)!).push(k);
		(adj.get(vb) ?? adj.set(vb, []).get(vb)!).push(k);
	}
	const used = new Set<number>();
	const out: number[][] = [];
	const walk = (start: number) => {
		const chain = [start];
		let v = start;
		for (;;) {
			const next = (adj.get(v) ?? []).find((k) => !used.has(k));
			if (next === undefined) break;
			used.add(next);
			v = e.va[next] === v ? e.vb[next] : e.va[next];
			chain.push(v);
		}
		if (chain.length > 1) out.push(chain);
	};
	// open chains first (odd-degree vertices), then loops
	for (const [v, list] of adj) if (list.length % 2 === 1) walk(v);
	for (const k of ids) if (!used.has(k)) walk(e.va[k]);
	return out;
}

function smooth(path: Path2D, e: Edges, chain: number[]) {
	const X = (i: number) => e.vx[chain[i]], Y = (i: number) => e.vy[chain[i]];
	const n = chain.length;
	if (n < 3) {
		path.moveTo(X(0), Y(0));
		path.lineTo(X(n - 1), Y(n - 1));
		return;
	}
	const closed = chain[0] === chain[n - 1];
	if (closed) {
		path.moveTo((X(0) + X(1)) / 2, (Y(0) + Y(1)) / 2);
		for (let i = 1; i < n - 1; i++) path.quadraticCurveTo(X(i), Y(i), (X(i) + X(i + 1)) / 2, (Y(i) + Y(i + 1)) / 2);
		path.quadraticCurveTo(X(0), Y(0), (X(0) + X(1)) / 2, (Y(0) + Y(1)) / 2);
		path.closePath();
	} else {
		path.moveTo(X(0), Y(0));
		for (let i = 1; i < n - 1; i++) path.quadraticCurveTo(X(i), Y(i), (X(i) + X(i + 1)) / 2, (Y(i) + Y(i + 1)) / 2);
		path.lineTo(X(n - 1), Y(n - 1));
	}
}

function addCell(p: Path2D, c: Cells, i: number) {
	const s = c.polyStart[i], e = c.polyStart[i + 1];
	if (e - s < 3) return;
	const xy = c.polyXY;
	p.moveTo(xy[2 * s], xy[2 * s + 1]);
	for (let k = s + 1; k < e; k++) p.lineTo(xy[2 * k], xy[2 * k + 1]);
	p.closePath();
}

function groupPaths(c: Cells, colorOf: (i: number) => string | null): [string, Path2D][] {
	const m = new Map<string, Path2D>();
	for (let i = 0; i < c.n; i++) {
		const col = colorOf(i);
		if (!col) continue;
		let p = m.get(col);
		if (!p) m.set(col, (p = new Path2D()));
		addCell(p, c, i);
	}
	return [...m];
}

type Surface = HTMLCanvasElement | OffscreenCanvas;
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** raster tile edge in device pixels (each tile canvas carries a 1px apron to hide seams) */
const TILE = 512;
const TILE_CACHE = 72;
/** the always-available whole-world raster is at most this many pixels wide/tall */
const OVERVIEW_MAX = 2048;
/** tiles are rendered for a scale s and shown at s·(0.71..1]; line widths assume the middle of that band */
const LW_FIT = 0.85;

/** a canvas of at least 1×1 pixels, or null (drawImage throws on 0×0 sources) */
function makeSurface(w: number, h: number): Surface | null {
	w = Math.ceil(w);
	h = Math.ceil(h);
	if (!(w > 0 && h > 0)) return null;
	if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
	if (typeof document === 'undefined') return null;
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	return c;
}

/** uniform-grid bucket index of cell polygon bounding boxes, so a tile only paints the cells it touches */
export interface CellIndex {
	cs: number;
	gx: number;
	gy: number;
	start: Int32Array;
	items: Int32Array;
	stamp: Uint32Array;
	tick: number;
}

export function buildCellIndex(c: Cells, W: number, H: number): CellIndex {
	const cs = Math.max(4, Math.sqrt((W * H) / Math.max(1, c.n)) * 6);
	const gx = Math.max(1, Math.ceil(W / cs)), gy = Math.max(1, Math.ceil(H / cs));
	const box = new Int32Array(c.n * 4);
	const count = new Int32Array(gx * gy + 1);
	const xy = c.polyXY;
	const clampX = (v: number) => Math.max(0, Math.min(gx - 1, Math.floor(v / cs)));
	const clampY = (v: number) => Math.max(0, Math.min(gy - 1, Math.floor(v / cs)));
	for (let i = 0; i < c.n; i++) {
		const s = c.polyStart[i], e = c.polyStart[i + 1];
		let x0 = c.x[i], y0 = c.y[i], x1 = x0, y1 = y0;
		for (let k = s; k < e; k++) {
			const x = xy[2 * k], y = xy[2 * k + 1];
			if (x < x0) x0 = x; else if (x > x1) x1 = x;
			if (y < y0) y0 = y; else if (y > y1) y1 = y;
		}
		const bx0 = clampX(x0), bx1 = clampX(x1), by0 = clampY(y0), by1 = clampY(y1);
		box[4 * i] = bx0; box[4 * i + 1] = by0; box[4 * i + 2] = bx1; box[4 * i + 3] = by1;
		for (let by = by0; by <= by1; by++) for (let bx = bx0; bx <= bx1; bx++) count[by * gx + bx + 1]++;
	}
	for (let b = 1; b < count.length; b++) count[b] += count[b - 1];
	const start = count.slice();
	const items = new Int32Array(start[start.length - 1]);
	const fill = start.slice(0, gx * gy);
	for (let i = 0; i < c.n; i++)
		for (let by = box[4 * i + 1]; by <= box[4 * i + 3]; by++)
			for (let bx = box[4 * i]; bx <= box[4 * i + 2]; bx++) items[fill[by * gx + bx]++] = i;
	return { cs, gx, gy, start, items, stamp: new Uint32Array(c.n), tick: 0 };
}

/** ids of cells whose bounding box may overlap the world rect (deduplicated) */
export function queryCells(ix: CellIndex, x0: number, y0: number, x1: number, y1: number): number[] {
	const out: number[] = [];
	const bx0 = Math.max(0, Math.floor(x0 / ix.cs)), bx1 = Math.min(ix.gx - 1, Math.floor(x1 / ix.cs));
	const by0 = Math.max(0, Math.floor(y0 / ix.cs)), by1 = Math.min(ix.gy - 1, Math.floor(y1 / ix.cs));
	if (bx1 < bx0 || by1 < by0) return out;
	if (++ix.tick >= 0xffffffff) { ix.stamp.fill(0); ix.tick = 1; }
	const t = ix.tick;
	for (let by = by0; by <= by1; by++)
		for (let bx = bx0; bx <= bx1; bx++) {
			const b = by * ix.gx + bx;
			for (let k = ix.start[b]; k < ix.start[b + 1]; k++) {
				const i = ix.items[k];
				if (ix.stamp[i] === t) continue;
				ix.stamp[i] = t;
				out.push(i);
			}
		}
	return out;
}

export interface Overlay {
	rifts: Set<number>;
	avatarBurg: number;
	travel: number[] | null;
	selectedState: number;
	selectedBurg: number;
	selectedCell: number;
}

export class MapRenderer {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	dpr = 1;
	w = 0;
	h = 0;
	k = 1;
	tx = 0;
	ty = 0;
	world: World | null = null;
	sim: Simulation | null = null;
	theme: MapTheme = THEMES.fantasy;
	layer = 0;
	mode: MapMode = 'political';
	overlay: Overlay = { rifts: new Set(), avatarBurg: 0, travel: null, selectedState: 0, selectedBurg: 0, selectedCell: -1 };
	showLabels = true;
	showGhost = true;
	previewHistoryStates: Uint16Array | null = null;
	private terrainKey = '';
	private politicalKey = '';
	/** static terrain: per-cell palette indices (-1 = not painted) + smoothed global paths; rasterised into tiles */
	private T: { pal: string[]; ocean: Int32Array; land: Path2D; landBase: string; cells: Int32Array; coast: Path2D; rivers: [number, Path2D][]; ghost: Path2D | null; layerOpen: Path2D | null; layerCells: Int32Array | null } | null = null;
	private index: CellIndex | null = null;
	private indexWorld: World | null = null;
	/** whole-world raster (fallback while tiles render, and the only level when zoomed out) */
	private ov: Surface | null = null;
	private ovS = 0;
	private tiles = new Map<string, Surface>();
	private refineRaf = 0;
	private lastInteract = 0;
	private P: { fills: [string, Path2D][]; borders: Path2D; labels: Label[]; fronts: Path2D; plague: [string, Path2D][]; select: Path2D | null } | null = null;
	politicalVersion = 0;
	terrainVersion = 0;
	private lastCell = 0;
	private snap: HTMLCanvasElement | null = null;
	private snapCam = { k: 1, tx: 0, ty: 0 };
	/** snapshot caching for silky smooth pan/zoom and lightweight overlay updates */
	get heavy() {
		return true;
	}

	/** cheap frame: last full render, re-transformed to the current camera */
	drawSnapshot() {
		if (!this.snap || !this.snap.width || !this.snap.height || !this.world || !this.T) return this.draw();
		this.lastInteract = performance.now();
		const ctx = this.ctx;
		const f = this.k / this.snapCam.k;
		// cached terrain rasters fill the edges the old snapshot does not cover (no tile rendering here)
		this.blitTerrain(0);
		ctx.setTransform(f, 0, 0, f, this.dpr * (this.tx - this.snapCam.tx * f), this.dpr * (this.ty - this.snapCam.ty * f));
		ctx.drawImage(this.snap, 0, 0);
		ctx.setTransform(1, 0, 0, 1, 0, 0);
	}

	/** fast frame: redraws only transient overlays (rifts, selection rings, avatar) over snapshot */
	drawDynamic() {
		if (!this.snap || this.snapCam.k !== this.k || this.snapCam.tx !== this.tx || this.snapCam.ty !== this.ty) {
			return this.draw();
		}
		const ctx = this.ctx;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.drawImage(this.snap, 0, 0);
		this.drawOverlays();
	}

	private takeSnapshot() {
		// a hidden or not-yet-sized canvas has 0×0 pixels; drawImage would throw
		if (!this.canvas.width || !this.canvas.height) return;
		if (!this.snap) this.snap = document.createElement('canvas');
		if (this.snap.width !== this.canvas.width || this.snap.height !== this.canvas.height) {
			this.snap.width = this.canvas.width;
			this.snap.height = this.canvas.height;
		}
		const sctx = this.snap.getContext('2d');
		if (sctx) {
			sctx.clearRect(0, 0, this.snap.width, this.snap.height);
			sctx.drawImage(this.canvas, 0, 0);
		}
		this.snapCam = { k: this.k, tx: this.tx, ty: this.ty };
	}

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d')!;
	}

	setWorld(world: World, sim: Simulation, theme: MapTheme) {
		this.world = world;
		this.sim = sim;
		this.theme = theme;
		this.terrainKey = this.politicalKey = '';
		if (this.layer >= world.layers.length) this.layer = 0;
	}

	resize(w: number, h: number) {
		this.dpr = Math.min(2, window.devicePixelRatio || 1);
		this.w = w;
		this.h = h;
		this.canvas.width = Math.round(w * this.dpr);
		this.canvas.height = Math.round(h * this.dpr);
		this.canvas.style.width = `${w}px`;
		this.canvas.style.height = `${h}px`;
	}

	fit() {
		if (!this.world) return;
		const { width: W, height: H } = this.world.opts;
		this.k = Math.min(this.w / W, this.h / H) * 0.98;
		this.tx = (this.w - W * this.k) / 2;
		this.ty = (this.h - H * this.k) / 2;
	}

	toWorld(sx: number, sy: number): [number, number] {
		return [(sx - this.tx) / this.k, (sy - this.ty) / this.k];
	}

	zoomAt(sx: number, sy: number, f: number) {
		const nk = Math.min(40, Math.max(0.2, this.k * f));
		const [wx, wy] = this.toWorld(sx, sy);
		this.k = nk;
		this.tx = sx - wx * nk;
		this.ty = sy - wy * nk;
	}

	pick(sx: number, sy: number): number {
		if (!this.world) return -1;
		const [wx, wy] = this.toWorld(sx, sy);
		const { width: W, height: H } = this.world.opts;
		if (wx < 0 || wy < 0 || wx > W || wy > H) return -1;
		this.lastCell = findCell(this.world.cells, wx, wy, this.lastCell);
		return this.lastCell;
	}

	// ───────────────────────── caches ─────────────────────────
	private buildTerrain() {
		const w = this.world!;
		const c = w.cells;
		const th = this.theme;
		const L = w.layers[this.layer];
		const isWater = (i: number) => c.h[i] < SEA;
		const pal: string[] = [];
		const palIx = new Map<string, number>();
		const colourIndex = (colorOf: (i: number) => string | null) => {
			const out = new Int32Array(c.n);
			for (let i = 0; i < c.n; i++) {
				const col = colorOf(i);
				if (!col) { out[i] = -1; continue; }
				let ix = palIx.get(col);
				if (ix === undefined) { ix = pal.length; pal.push(col); palIx.set(col, ix); }
				out[i] = ix;
			}
			return out;
		};
		const ocean = colourIndex((i) => {
			if (!isWater(i)) return null;
			if (w.features[c.feature[i]]?.type === 'lake') return th.lake;
			const d = Math.min(8, -c.dist[i]);
			return mix(th.oceanShallow, th.oceanDeep, (d - 1) / 7);
		});
		// smoothed land outline (evenodd → lakes punch holes)
		const land = new Path2D();
		const coast = new Path2D();
		for (const ch of chains(w.edges, (a, b) => isWater(a) !== isWater(b))) {
			smooth(land, w.edges, ch);
			smooth(coast, w.edges, ch);
		}
		// hillshade from a NW light
		const shadeOf = (i: number) => {
			let gx = 0, gy = 0;
			for (const j of neighbors(c, i)) {
				const dh = c.h[j] - c.h[i];
				const dx = c.x[j] - c.x[i], dy = c.y[j] - c.y[i];
				const d = Math.hypot(dx, dy) || 1;
				gx += (dh * dx) / d;
				gy += (dh * dy) / d;
			}
			const l = (gx + gy) * 0.012; // slope facing NW (negative gradient) is lit
			return Math.max(-2, Math.min(2, Math.round(l * 4)));
		};
		const tint = (col: string) => (th.tintAmt ? mix(col, th.tint, th.tintAmt) : col);
		const muted = this.mode === 'political' || this.mode === 'culture' || this.mode === 'religion' || this.mode === 'population';
		const cells = colourIndex((i) => {
			if (isWater(i)) return null;
			let base: string;
			if (this.mode === 'height') base = HYPSO[Math.min(9, Math.floor(((c.h[i] - SEA) / (100 - SEA)) * 10))];
			else base = BIOMES[c.biome[i]].color;
			base = tint(base);
			if (muted) base = mix(base, th.tint, th.paper ? 0.35 : 0.5);
			const s = shadeOf(i);
			return s ? shade(base, -s * 0.07) : base;
		});
		const landBase = tint(muted ? mix('#c8d68f', th.tint, 0.4) : '#c8d68f');
		const rivers: [number, Path2D][] = [];
		for (const r of w.rivers) {
			if (!r.id || r.cells.length < 2) continue;
			const p = new Path2D();
			const pts = r.cells;
			p.moveTo(c.x[pts[0]], c.y[pts[0]]);
			for (let k = 1; k < pts.length - 1; k++) p.quadraticCurveTo(c.x[pts[k]], c.y[pts[k]], (c.x[pts[k]] + c.x[pts[k + 1]]) / 2, (c.y[pts[k]] + c.y[pts[k + 1]]) / 2);
			p.lineTo(c.x[pts[pts.length - 1]], c.y[pts[pts.length - 1]]);
			rivers.push([Math.min(4, 0.5 + Math.sqrt(r.flux) * 0.06 * Math.sqrt(c.n / 10000)), p]);
		}
		let layerOpen: Path2D | null = null;
		let layerCells: Int32Array | null = null;
		if (L.kind !== 'surface') {
			layerOpen = new Path2D();
			for (const ch of chains(w.edges, (a, b) => L.open[a] !== L.open[b])) smooth(layerOpen, w.edges, ch);
			const lp = L.kind === 'deep' ? th.deep : L.kind === 'sky' ? th.sky : th.sea;
			layerCells = colourIndex((i) => {
				if (!L.open[i]) return null;
				const t = (Math.sin(c.x[i] * 0.05 + L.depth) + Math.cos(c.y[i] * 0.04)) * 0.25 + 0.5;
				return mix(lp[0], lp[1], Math.round(t * 4) / 4 * 0.8);
			});
		}
		let ghost: Path2D | null = null;
		if (L.kind !== 'surface') {
			ghost = new Path2D();
			for (const ch of chains(w.edges, (a, b) => isWater(a) !== isWater(b))) {
				smooth(ghost, w.edges, ch);
			}
		} else {
			const deepL = w.layers.find((l) => l.kind === 'deep');
			if (deepL) {
				ghost = new Path2D();
				for (const ch of chains(w.edges, (a, b) => deepL.open[a] !== deepL.open[b])) {
					smooth(ghost, w.edges, ch);
				}
			}
		}
		this.T = { pal, ocean, land, landBase, cells, coast, rivers, ghost, layerOpen, layerCells };
		this.dropRasters();
		if (this.indexWorld !== w) {
			this.index = buildCellIndex(c, w.opts.width, w.opts.height);
			this.indexWorld = w;
		}
		// whole-world raster, rendered once per terrain key
		const { width: W, height: H } = w.opts;
		const z = Math.floor(2 * Math.log2(OVERVIEW_MAX / Math.max(W, H)));
		const s = 2 ** (z / 2);
		const ov = makeSurface(W * s, H * s);
		const g = ov?.getContext('2d') as Ctx2D | null | undefined;
		if (ov && g) {
			g.setTransform(s, 0, 0, s, 0, 0);
			this.paintTerrain(g, 0, 0, W, H, s, null);
			this.ov = ov;
			this.ovS = s;
		}
	}

	private dropRasters() {
		this.tiles.clear();
		this.ov = null;
		this.ovS = 0;
	}

	/** group the given cells (all when ids is null) by palette index into one Path2D per colour */
	private groups(col: Int32Array, ids: number[] | null): [string, Path2D][] {
		const c = this.world!.cells, pal = this.T!.pal;
		const m = new Map<number, Path2D>();
		const add = (i: number) => {
			const k = col[i];
			if (k < 0) return;
			let p = m.get(k);
			if (!p) m.set(k, (p = new Path2D()));
			addCell(p, c, i);
		};
		if (ids) for (const i of ids) add(i);
		else for (let i = 0; i < c.n; i++) add(i);
		return [...m].map(([k, p]) => [pal[k], p]);
	}

	/**
	 * Paint the static terrain (ocean depth, halo, land/biome/height shading, rivers, coast,
	 * exotic-layer dimming + plane) for the world rect [x0,x1]×[y0,y1] into a raster whose
	 * transform is already world → pixels at scale s. ids === null paints every cell.
	 */
	private paintTerrain(g: Ctx2D, x0: number, y0: number, x1: number, y1: number, s: number, ix: CellIndex | null) {
		const w = this.world!, T = this.T!, th = this.theme;
		const L = w.layers[this.layer];
		const { width: W, height: H } = w.opts;
		const px = (n: number) => (n * this.dpr) / (s * LW_FIT);
		const ids = ix ? queryCells(ix, x0, y0, x1, y1) : null;
		g.lineJoin = 'round';
		g.lineCap = 'round';
		g.save();
		g.beginPath();
		g.rect(0, 0, W, H);
		g.clip();
		g.fillStyle = th.oceanDeep;
		g.fillRect(x0, y0, x1 - x0, y1 - y0);
		for (const [col, p] of this.groups(T.ocean, ids)) { g.fillStyle = col; g.fill(p); g.strokeStyle = col; g.lineWidth = px(0.6); g.stroke(p); }
		// shallow-water halo
		g.strokeStyle = alpha(th.oceanShallow, 0.5);
		g.lineWidth = px(9);
		g.stroke(T.coast);
		g.save();
		g.clip(T.land, 'evenodd');
		g.fillStyle = T.landBase;
		g.fill(T.land, 'evenodd');
		for (const [col, p] of this.groups(T.cells, ids)) { g.fillStyle = col; g.fill(p); g.strokeStyle = col; g.lineWidth = px(0.6); g.stroke(p); }
		g.restore();
		g.strokeStyle = th.river;
		for (const [wd, p] of T.rivers) { g.lineWidth = Math.max(px(0.6), wd); g.stroke(p); }
		g.strokeStyle = th.coast;
		g.lineWidth = px(1.3);
		if (th.glow) { g.shadowColor = th.coast; g.shadowBlur = th.glow; }
		g.stroke(T.coast);
		g.shadowBlur = 0;
		// exotic layer: dim the surface, then draw the plane on top
		if (L.kind !== 'surface' && T.layerOpen && T.layerCells) {
			g.fillStyle = this.layerDim();
			g.fillRect(x0, y0, x1 - x0, y1 - y0);
			if (L.kind === 'sky') {
				g.save();
				g.translate(6, 10);
				g.fillStyle = 'rgba(20,30,50,0.35)';
				for (const [, p] of this.groups(T.layerCells, ix ? queryCells(ix, x0 - 6, y0 - 10, x1 - 6, y1 - 10) : null)) g.fill(p);
				g.restore();
			}
			for (const [col, p] of this.groups(T.layerCells, ids)) { g.fillStyle = col; g.fill(p); g.strokeStyle = col; g.lineWidth = px(0.6); g.stroke(p); }
			const lp = L.kind === 'deep' ? th.deep : L.kind === 'sky' ? th.sky : th.sea;
			g.strokeStyle = L.kind === 'sky' ? '#7a8fb0' : shade(lp[1], 0.3);
			g.lineWidth = px(1.5);
			g.stroke(T.layerOpen);
		}
		g.restore();
	}

	private layerDim() {
		const L = this.world!.layers[this.layer];
		return L.kind === 'deep' ? `rgba(8,5,3,${0.62 + L.depth * 0.08})` : L.kind === 'sea' ? 'rgba(2,20,30,0.55)' : this.theme.glow ? 'rgba(10,18,40,0.6)' : 'rgba(200,225,255,0.35)';
	}

	private renderTile(z: number, i: number, j: number): Surface | null {
		const s = 2 ** (z / 2);
		const surf = makeSurface(TILE + 2, TILE + 2);
		const g = surf?.getContext('2d') as Ctx2D | null | undefined;
		if (!surf || !g || !this.index) return null;
		const x0 = (i * TILE - 1) / s, y0 = (j * TILE - 1) / s;
		g.setTransform(s, 0, 0, s, -x0 * s, -y0 * s);
		this.paintTerrain(g, x0, y0, x0 + (TILE + 2) / s, y0 + (TILE + 2) / s, s, this.index);
		const key = `${z}|${i}|${j}`;
		this.tiles.set(key, surf);
		while (this.tiles.size > TILE_CACHE) this.tiles.delete(this.tiles.keys().next().value!);
		return surf;
	}

	private cachedTile(key: string): Surface | undefined {
		const t = this.tiles.get(key);
		if (t) { this.tiles.delete(key); this.tiles.set(key, t); } // LRU touch
		return t;
	}

	/**
	 * Background + static terrain from rasters: the whole-world overview, then tiles of the
	 * half-octave level matching the camera. Renders missing tiles for up to budgetMs;
	 * returns false when some visible tile is still missing (coarser rasters stand in).
	 */
	private blitTerrain(budgetMs: number): boolean {
		const w = this.world!, ctx = this.ctx, dpr = this.dpr;
		const L = w.layers[this.layer];
		const { width: W, height: H } = w.opts;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.fillStyle = this.theme.oceanDeep;
		ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		if (L.kind !== 'surface') {
			ctx.fillStyle = this.layerDim();
			ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		}
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';
		const kd = this.k * dpr;
		if (this.ov && this.ov.width && this.ov.height) {
			const f = kd / this.ovS;
			ctx.setTransform(f, 0, 0, f, dpr * this.tx, dpr * this.ty);
			ctx.drawImage(this.ov, 0, 0);
		}
		const z = Math.ceil(2 * Math.log2(kd) - 1e-9);
		if (!this.index || 2 ** (z / 2) <= this.ovS * 1.001) return true;
		// visible world rect
		const vx0 = Math.max(0, -this.tx / this.k), vy0 = Math.max(0, -this.ty / this.k);
		const vx1 = Math.min(W, (this.w - this.tx) / this.k), vy1 = Math.min(H, (this.h - this.ty) / this.k);
		if (vx1 <= vx0 || vy1 <= vy0) return true;
		const range = (zz: number) => {
			const s = 2 ** (zz / 2);
			return [Math.floor((vx0 * s) / TILE), Math.floor((vy0 * s) / TILE), Math.floor((vx1 * s - 1e-6) / TILE), Math.floor((vy1 * s - 1e-6) / TILE)];
		};
		const [i0, j0, i1, j1] = range(z);
		const t0 = performance.now();
		let complete = true;
		const have: [Surface, number, number][] = [];
		for (let j = j0; j <= j1; j++)
			for (let i = i0; i <= i1; i++) {
				let t = this.cachedTile(`${z}|${i}|${j}`);
				if (!t && performance.now() - t0 < budgetMs) t = this.renderTile(z, i, j) ?? undefined;
				if (t) have.push([t, i, j]);
				else complete = false;
			}
		const put = (zz: number, list: [Surface, number, number][]) => {
			const f = kd / 2 ** (zz / 2);
			ctx.setTransform(f, 0, 0, f, dpr * this.tx, dpr * this.ty);
			// 1px apron on each side; the extra pixel overlaps the neighbour so no seam shows
			for (const [t, i, j] of list) if (t.width && t.height) ctx.drawImage(t, 1, 1, TILE + 1, TILE + 1, i * TILE, j * TILE, TILE + 1, TILE + 1);
		};
		if (!complete) {
			// stand-ins: any cached coarser (then finer) level covering the gaps
			for (const zz of [z - 4, z - 3, z - 2, z - 1, z + 1]) {
				if (2 ** (zz / 2) <= this.ovS) continue;
				const [a0, b0, a1, b1] = range(zz);
				const list: [Surface, number, number][] = [];
				for (let j = b0; j <= b1; j++) for (let i = a0; i <= a1; i++) { const t = this.tiles.get(`${zz}|${i}|${j}`); if (t) list.push([t, i, j]); }
				if (list.length) put(zz, list);
			}
		}
		put(z, have);
		return complete;
	}

	/** keep rendering missing tiles on later frames, but never while the user is panning */
	private scheduleRefine() {
		if (this.refineRaf || typeof requestAnimationFrame === 'undefined') return;
		this.refineRaf = requestAnimationFrame(() => {
			this.refineRaf = 0;
			if (performance.now() - this.lastInteract < 160) this.scheduleRefine();
			else this.draw();
		});
	}

	private buildPolitical() {
		const w = this.world!, s = this.sim!;
		const c = w.cells;
		const L = w.layers[this.layer];
		const st = this.previewHistoryStates && this.layer === 0 ? this.previewHistoryStates : L.state;
		const open = L.open;
		const pols = s.polities;
		const fill = this.mode === 'political' ? (this.theme.glow ? 0.22 : 0.42) : 0.62;
		let fills: [string, Path2D][] = [];
		if (this.mode === 'political') fills = groupPaths(c, (i) => (open[i] && st[i] && pols[st[i]]?.alive ? alpha(pols[st[i]].color, fill) : null));
		else if (this.mode === 'culture' && L.kind === 'surface') fills = groupPaths(c, (i) => (open[i] && c.culture[i] ? alpha(w.cultures[c.culture[i]].color, fill) : null));
		else if (this.mode === 'religion' && L.kind === 'surface') fills = groupPaths(c, (i) => (open[i] && c.religion[i] ? alpha(w.religions[c.religion[i]]?.color ?? '#999', fill) : null));
		else if (this.mode === 'population' && L.kind === 'surface') fills = groupPaths(c, (i) => (open[i] ? alpha('#c0392b', Math.min(0.85, Math.round(Math.sqrt(c.pop[i]) * 4) / 20)) : null));
		const borders = new Path2D();
		const keyArr = this.mode === 'culture' ? c.culture : this.mode === 'religion' ? c.religion : st;
		if (this.mode !== 'biome' && this.mode !== 'height' && this.mode !== 'population')
			for (const ch of chains(w.edges, (a, b) => open[a] === 1 && open[b] === 1 && keyArr[a] !== keyArr[b])) smooth(borders, w.edges, ch);
		// war fronts
		const fronts = new Path2D();
		const enemies = new Set<string>();
		for (const war of s.wars) if (!war.end) for (const a of war.attackers) for (const d of war.defenders) { enemies.add(`${a}-${d}`); enemies.add(`${d}-${a}`); }
		if (enemies.size)
			for (let e = 0; e < w.edges.n; e++) {
				const a = w.edges.a[e], b = w.edges.b[e];
				if (!open[a] || !open[b] || st[a] === st[b]) continue;
				if (!enemies.has(`${st[a]}-${st[b]}`)) continue;
				fronts.moveTo(w.edges.vx[w.edges.va[e]], w.edges.vy[w.edges.va[e]]);
				fronts.lineTo(w.edges.vx[w.edges.vb[e]], w.edges.vy[w.edges.vb[e]]);
			}
		const plague = L.kind === 'surface' ? groupPaths(c, (i) => (s.plague[i] > 0.05 ? `rgba(110,190,40,${(Math.round(s.plague[i] * 5) / 5) * 0.55})` : null)) : [];
		// labels at each realm's "pole of inaccessibility" (deepest interior cell)
		const labels: Label[] = [];
		const keyN = this.mode === 'culture' ? w.cultures.length : this.mode === 'religion' ? w.religions.length : pols.length;
		if (this.mode === 'political' || ((this.mode === 'culture' || this.mode === 'religion') && L.kind === 'surface')) {
			const dist = new Int16Array(c.n).fill(-1);
			let ring: number[] = [];
			for (let i = 0; i < c.n; i++) {
				if (!open[i] || !keyArr[i]) continue;
				for (const j of neighbors(c, i)) if (!open[j] || keyArr[j] !== keyArr[i]) { dist[i] = 0; ring.push(i); break; }
			}
			for (let d = 1; ring.length; d++) {
				const next: number[] = [];
				for (const i of ring) for (const j of neighbors(c, i)) if (dist[j] < 0 && open[j] && keyArr[j] === keyArr[i]) { dist[j] = d; next.push(j); }
				ring = next;
			}
			const best = new Int32Array(keyN).fill(-1);
			const count = new Int32Array(keyN);
			for (let i = 0; i < c.n; i++) {
				if (!open[i] || !keyArr[i]) continue;
				const k = keyArr[i];
				count[k]++;
				if (best[k] < 0 || dist[i] > dist[best[k]]) best[k] = i;
			}
			for (let k = 1; k < keyN; k++) {
				if (best[k] < 0 || count[k] < 4) continue;
				const name = this.mode === 'culture' ? w.cultures[k].name : this.mode === 'religion' ? w.religions[k].name : pols[k]?.alive ? pols[k].name : '';
				if (!name) continue;
				const i = best[k];
				labels.push({ x: c.x[i], y: c.y[i], text: name, size: Math.max(7, Math.min(46, Math.sqrt(count[k]) * 1.7 * Math.sqrt(10000 / c.n))), id: k });
			}
		}
		let select: Path2D | null = null;
		const sel = this.overlay.selectedState;
		if (sel && this.mode === 'political') {
			select = new Path2D();
			for (const ch of chains(w.edges, (a, b) => open[a] === 1 && (st[a] === sel) !== (open[b] === 1 && st[b] === sel))) smooth(select, w.edges, ch);
		}
		this.P = { fills, borders, labels, fronts, plague, select };
	}

	invalidatePolitical() {
		this.politicalVersion++;
	}
	invalidateTerrain() {
		this.terrainVersion++;
	}

	// ───────────────────────── draw ─────────────────────────
	draw() {
		const w = this.world, s = this.sim;
		const ctx = this.ctx;
		if (!w || !s) return;
		const th = this.theme;
		const tk = `${this.layer}|${this.mode}|${this.terrainVersion}|${th.tint}|${th.oceanDeep}|${th.coast}|${th.glow}|${this.dpr}`;
		if (tk !== this.terrainKey) {
			this.buildTerrain();
			this.terrainKey = tk;
			this.politicalKey = '';
		}
		const pk = `${this.layer}|${this.mode}|${this.politicalVersion}|${this.overlay.selectedState}|${this.previewHistoryStates ? 'history' : 'live'}`;
		if (pk !== this.politicalKey) {
			this.buildPolitical();
			this.politicalKey = pk;
		}
		const T = this.T!, P = this.P!;
		const c = w.cells;
		const L = w.layers[this.layer];
		const k = this.k;
		const px = (n: number) => n / k; // screen px → world units

		// ── static terrain from cached rasters (overview + zoom-level tiles) ──
		if (!this.blitTerrain(40)) this.scheduleRefine();
		ctx.setTransform(this.dpr * k, 0, 0, this.dpr * k, this.dpr * this.tx, this.dpr * this.ty);
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';

		// ── cross-layer peeking contour ──
		if (this.showGhost && T.ghost) {
			ctx.strokeStyle = L.kind === 'surface' ? 'rgba(215, 140, 60, 0.28)' : th.glow ? 'rgba(90, 160, 255, 0.25)' : 'rgba(255, 255, 255, 0.2)';
			ctx.lineWidth = px(1.2);
			ctx.setLineDash([px(4), px(4)]);
			ctx.stroke(T.ghost);
			ctx.setLineDash([]);
		}

		// ── political / thematic ──
		for (const [col, p] of P.fills) { ctx.fillStyle = col; ctx.fill(p); }
		for (const [col, p] of P.plague) { ctx.fillStyle = col; ctx.fill(p); }
		ctx.strokeStyle = th.glow ? th.border : alpha(th.border, 0.75);
		ctx.lineWidth = px(1.4);
		ctx.setLineDash(th.glow ? [] : [px(5), px(3)]);
		if (th.glow) { ctx.shadowColor = th.border; ctx.shadowBlur = th.glow; }
		ctx.stroke(P.borders);
		ctx.setLineDash([]);
		ctx.shadowBlur = 0;
		ctx.strokeStyle = 'rgba(220,30,30,0.85)';
		ctx.lineWidth = px(3);
		ctx.stroke(P.fronts);
		if (P.select) {
			ctx.strokeStyle = th.glow ? '#fff' : '#f7d774';
			ctx.lineWidth = px(3.5);
			ctx.stroke(P.select);
		}

		// ── routes ──
		this.drawRoutes(px);

		// ── screen-space marks ──
		ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		const S = (x: number, y: number): [number, number] => [x * k + this.tx, y * k + this.ty];
		// realm labels
		if (this.showLabels) {
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			for (const lb of P.labels) {
				const size = lb.size * Math.sqrt(k) * 0.9;
				if (size < 8) continue;
				const [x, y] = S(lb.x, lb.y);
				if (x < -200 || y < -50 || x > this.w + 200 || y > this.h + 50) continue;
				ctx.font = `600 ${size.toFixed(1)}px ${th.font}`;
				const text = lb.text.toUpperCase().split('').join(size > 16 ? ' ' : '');
				ctx.lineWidth = Math.max(2, size / 6);
				ctx.strokeStyle = th.labelHalo;
				ctx.strokeText(text, x, y);
				ctx.fillStyle = this.mode === 'political' && this.sim!.polities[lb.id] && !th.glow ? shade(this.sim!.polities[lb.id].color, -0.55) : th.label;
				ctx.fillText(text, x, y);
			}
		}
		// burgs on this layer
		for (const b of w.burgs) {
			if (!b.id || !b.alive) continue;
			const bl = this.sim!.burgLayer(b);
			const here = bl === this.layer;
			const [x, y] = S(b.x, b.y);
			if (x < -20 || y < -20 || x > this.w + 20 || y > this.h + 20) continue;
			if (!here) continue;
			const big = b.capital;
			const r = (big ? 3.4 : 2) * Math.min(2.2, Math.max(0.8, Math.sqrt(k)));
			if (!big && k < 0.7) continue;
			ctx.beginPath();
			if (big) {
				ctx.rect(x - r, y - r, r * 2, r * 2);
			} else ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.fillStyle = th.glow ? '#0d0b18' : '#fffaf0';
			ctx.fill();
			ctx.lineWidth = big ? 1.8 : 1.2;
			ctx.strokeStyle = th.glow ? (b.state ? this.sim!.polities[b.state].color : '#888') : '#2b2116';
			ctx.stroke();
			if (this.showLabels && (k > 1.5 || (big && k > 0.75))) {
				const fs = big ? 12 : 10.5;
				ctx.font = `${big ? 600 : 400} ${fs}px ${th.bodyFont}`;
				ctx.textAlign = 'left';
				ctx.lineWidth = 3;
				ctx.strokeStyle = th.labelHalo;
				ctx.strokeText(b.name, x + r + 3, y - r - 1);
				ctx.fillStyle = th.label;
				ctx.fillText(b.name, x + r + 3, y - r - 1);
			}
		}
		// shaft / dock markers: settlements on other planes that connect here
		if (k > 0.9) {
			ctx.font = `10px ${th.bodyFont}`;
			for (const rt of w.routes) {
				if (rt.kind !== 'shaft') continue;
				const A = w.burgs[rt.a], B = w.burgs[rt.b];
				for (const [here, there] of [[A, B], [B, A]] as const) {
					if (!here.alive || !there.alive) continue;
					if (this.sim!.burgLayer(here) !== this.layer) continue;
					const tl = w.layers[this.sim!.burgLayer(there)];
					const [x, y] = S(here.x, here.y);
					ctx.fillStyle = tl.kind === 'deep' ? '#c58a4a' : tl.kind === 'sky' ? '#6fb8ff' : tl.kind === 'sea' ? '#2fd0c0' : '#ddd';
					ctx.fillText(tl.kind === 'deep' || (tl.kind === 'surface' && L.kind === 'sky') ? '▼' : tl.kind === 'surface' && L.kind === 'deep' ? '▲' : tl.kind === 'sky' ? '▲' : '≈', x - 12, y + 10);
				}
			}
		}
		this.takeSnapshot();
		this.drawOverlays();
	}

	drawOverlays() {
		const w = this.world, s = this.sim;
		const ctx = this.ctx;
		if (!w || !s) return;
		const th = this.theme;
		const k = this.k;
		ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		const S = (x: number, y: number): [number, number] => [x * k + this.tx, y * k + this.ty];

		// selected burg highlight
		const sel = this.overlay.selectedBurg;
		if (sel && w.burgs[sel]?.alive) {
			const b = w.burgs[sel];
			if (s.burgLayer(b) === this.layer) {
				const [x, y] = S(b.x, b.y);
				const big = b.capital;
				const r = (big ? 3.4 : 2) * Math.min(2.2, Math.max(0.8, Math.sqrt(k)));
				ctx.beginPath();
				ctx.arc(x, y, r + 5, 0, Math.PI * 2);
				ctx.strokeStyle = '#f7d774';
				ctx.lineWidth = 2;
				ctx.stroke();
			}
		}

		// rift glyphs
		if (this.overlay.rifts.size > 0) {
			for (const id of this.overlay.rifts) {
				const b = w.burgs[id];
				if (!b || !b.alive || s.burgLayer(b) !== this.layer) continue;
				const [x, y] = S(b.x, b.y);
				if (x < -30 || y < -30 || x > this.w + 30 || y > this.h + 30) continue;
				const big = b.capital;
				const r = (big ? 3.4 : 2) * Math.min(2.2, Math.max(0.8, Math.sqrt(k)));
				this.riftGlyph(x, y, r + 7);
			}
		}

		// avatar
		const ab = this.overlay.avatarBurg;
		if (ab && w.burgs[ab]) {
			const tr = this.overlay.travel;
			if (tr && tr.length > 1) {
				ctx.beginPath();
				tr.forEach((id, i) => { const [x, y] = S(w.burgs[id].x, w.burgs[id].y); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
				ctx.setLineDash([6, 5]);
				ctx.strokeStyle = '#f7d774';
				ctx.lineWidth = 2.5;
				ctx.stroke();
				ctx.setLineDash([]);
			}
			const [x, y] = S(w.burgs[ab].x, w.burgs[ab].y);
			ctx.beginPath();
			ctx.moveTo(x, y - 6);
			ctx.lineTo(x - 7, y - 20);
			ctx.lineTo(x + 7, y - 20);
			ctx.closePath();
			ctx.fillStyle = '#f7d774';
			ctx.strokeStyle = '#2b2116';
			ctx.lineWidth = 1.5;
			ctx.fill();
			ctx.stroke();
		}

		// trade caravans along roads and sea lanes
		if (this.layer === 0 && s.caravans.length > 0) {
			for (const cv of s.caravans) {
				const [x, y] = S(cv.x, cv.y);
				if (x < -20 || y < -20 || x > this.w + 20 || y > this.h + 20) continue;
				ctx.beginPath();
				ctx.arc(x, y, 3, 0, Math.PI * 2);
				ctx.fillStyle = '#f7d774';
				ctx.strokeStyle = '#2b2116';
				ctx.lineWidth = 1;
				ctx.fill();
				ctx.stroke();
			}
		}

		// marching army regiments in active wars
		if (this.layer === 0 && s.armyTokens.length > 0) {
			for (const ar of s.armyTokens) {
				const [x, y] = S(ar.x, ar.y);
				if (x < -30 || y < -30 || x > this.w + 30 || y > this.h + 30) continue;
				const [tx, ty] = S(ar.targetX, ar.targetY);

				// dashed march vector
				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.lineTo(tx, ty);
				ctx.setLineDash([4, 4]);
				ctx.strokeStyle = ar.color;
				ctx.lineWidth = 1.5;
				ctx.stroke();
				ctx.setLineDash([]);

				// army diamond token
				const sz = 6 * Math.min(1.8, Math.max(0.9, Math.sqrt(k)));
				ctx.beginPath();
				ctx.moveTo(x, y - sz);
				ctx.lineTo(x + sz, y);
				ctx.lineTo(x, y + sz);
				ctx.lineTo(x - sz, y);
				ctx.closePath();
				ctx.fillStyle = ar.color;
				ctx.fill();
				ctx.strokeStyle = '#fff';
				ctx.lineWidth = 1.5;
				ctx.stroke();

				// sword pip inside
				ctx.beginPath();
				ctx.arc(x, y, 1.8, 0, Math.PI * 2);
				ctx.fillStyle = '#fff';
				ctx.fill();
			}
		}

		// legendary places / wonders
		if (s.wonders && s.wonders.length > 0) {
			for (const wd of s.wonders) {
				if (wd.layer !== this.layer) continue;
				const [x, y] = S(wd.x, wd.y);
				if (x < -30 || y < -30 || x > this.w + 30 || y > this.h + 30) continue;

				// Wonder or Ruin badge
				const r = 9 * Math.min(1.6, Math.max(0.85, Math.sqrt(k)));
				ctx.beginPath();
				ctx.arc(x, y, r, 0, Math.PI * 2);
				if (wd.destroyed) {
					ctx.fillStyle = 'rgba(70, 60, 60, 0.45)';
					ctx.strokeStyle = '#71717a';
					ctx.lineWidth = 1.2;
					ctx.fill();
					ctx.stroke();

					// Ruined Icon
					ctx.font = `${Math.round(r * 1.15)}px serif`;
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';
					ctx.fillText('🏚️', x, y);

					if (k > 1.4) {
						ctx.font = '500 9.5px sans-serif';
						ctx.fillStyle = '#a1a1aa';
						ctx.fillText(`${wd.name} (Ruins)`, x, y + r + 9);
					}
				} else {
					ctx.fillStyle = 'rgba(235, 180, 50, 0.25)';
					ctx.strokeStyle = '#ffd700';
					ctx.lineWidth = 1.5;
					ctx.fill();
					ctx.stroke();

					// Icon
					ctx.font = `${Math.round(r * 1.3)}px serif`;
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';
					ctx.fillText(wd.icon, x, y);

					// Label if zoomed in
					if (k > 1.4) {
						ctx.font = '600 10px sans-serif';
						ctx.fillStyle = '#fce8a6';
						ctx.fillText(wd.name, x, y + r + 9);
					}
				}
			}
		}

		// legendary monsters
		if (s.monsters && s.monsters.length > 0) {
			for (const mn of s.monsters) {
				if (!mn.alive || mn.layer !== this.layer) continue;
				const [x, y] = S(mn.x, mn.y);
				if (x < -30 || y < -30 || x > this.w + 30 || y > this.h + 30) continue;

				// Monster badge
				const r = 9 * Math.min(1.6, Math.max(0.85, Math.sqrt(k)));
				const tierColor = mn.tier === 'cataclysm' ? '#ff3b30' : mn.tier === 'dread' ? '#af52de' : mn.tier === 'legendary' ? '#ff9500' : '#34c759';
				ctx.beginPath();
				ctx.arc(x, y, r, 0, Math.PI * 2);
				ctx.fillStyle = mn.tier === 'cataclysm' ? 'rgba(255, 59, 48, 0.22)' : 'rgba(175, 82, 222, 0.22)';
				ctx.strokeStyle = tierColor;
				ctx.lineWidth = 1.5;
				ctx.fill();
				ctx.stroke();

				// Icon
				ctx.font = `${Math.round(r * 1.3)}px serif`;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText(mn.icon, x, y);

				// Label if zoomed in
				if (k > 1.5) {
					ctx.font = '600 10px sans-serif';
					ctx.fillStyle = '#fff';
					ctx.fillText(mn.name, x, y + r + 9);
				}
			}
		}

		// selected cell ring
		const sc = this.overlay.selectedCell;
		if (sc >= 0 && !this.overlay.selectedBurg) {
			const [x, y] = S(w.cells.x[sc], w.cells.y[sc]);
			ctx.beginPath();
			ctx.arc(x, y, 6, 0, Math.PI * 2);
			ctx.strokeStyle = th.glow ? '#fff' : '#2b2116';
			ctx.lineWidth = 1.5;
			ctx.stroke();
		}
	}

	private riftGlyph(x: number, y: number, r: number) {
		const ctx = this.ctx;
		const t = performance.now() / 600;
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(t);
		ctx.strokeStyle = '#c56cff';
		ctx.shadowColor = '#c56cff';
		ctx.shadowBlur = 10;
		ctx.lineWidth = 2;
		for (let a = 0; a < 3; a++) {
			ctx.beginPath();
			ctx.arc(0, 0, r, a * 2.09, a * 2.09 + 1.2);
			ctx.stroke();
		}
		ctx.restore();
	}

	private drawRoutes(px: (n: number) => number) {
		const w = this.world!, ctx = this.ctx, c = w.cells, th = this.theme;
		const L = w.layers[this.layer];
		const s = this.sim!;
		for (const rt of w.routes) {
			if (rt.kind === 'shaft') continue;
			const a = w.burgs[rt.a];
			if (s.burgLayer(a) !== this.layer) continue;
			if (!a.alive || !w.burgs[rt.b].alive) continue;
			ctx.beginPath();
			const pts = rt.cells;
			if (rt.kind === 'sky') {
				const ax = c.x[pts[0]], ay = c.y[pts[0]], bx = c.x[pts[pts.length - 1]], by = c.y[pts[pts.length - 1]];
				ctx.moveTo(ax, ay);
				ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 - Math.hypot(bx - ax, by - ay) * 0.2, bx, by);
			} else {
				ctx.moveTo(c.x[pts[0]], c.y[pts[0]]);
				for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(c.x[pts[i]], c.y[pts[i]], (c.x[pts[i]] + c.x[pts[i + 1]]) / 2, (c.y[pts[i]] + c.y[pts[i + 1]]) / 2);
				ctx.lineTo(c.x[pts[pts.length - 1]], c.y[pts[pts.length - 1]]);
			}
			if (rt.kind === 'road') { ctx.strokeStyle = alpha(th.road, 0.8); ctx.lineWidth = px(1.2); ctx.setLineDash([px(4), px(2.5)]); }
			else if (rt.kind === 'sea') { ctx.strokeStyle = alpha(L.kind === 'sea' ? '#bff' : '#ffffff', 0.45); ctx.lineWidth = px(1); ctx.setLineDash([px(2), px(4)]); }
			else if (rt.kind === 'tunnel') { ctx.strokeStyle = alpha(th.deep[1], 0.9); ctx.lineWidth = px(1.8); ctx.setLineDash([px(6), px(2)]); }
			else { ctx.strokeStyle = alpha('#5a7fb0', 0.8); ctx.lineWidth = px(1.2); ctx.setLineDash([px(3), px(3)]); }
			ctx.stroke();
		}
		ctx.setLineDash([]);
	}
}
