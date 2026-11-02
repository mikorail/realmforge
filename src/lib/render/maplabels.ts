/**
 * Geographic name labels for the live map: the very names the Wanderer export gets (`adventure/names.ts`
 * `exportNames` over `namesGrid`), recomputed from the running sim once per decade (or when the world / voice
 * changes). Labels are placed screen-space with zoom thresholds and greedy collision avoidance (realm labels
 * claim their boxes first); ranges are tilted along their main axis, roads and rivers are lettered along the line.
 */
import type { World } from '../gen/types';
import type { Simulation } from '../sim/engine';
import { exportNames, namesGrid } from '../adventure/names';
import type { LayerHost } from './simlayers';

interface GeoLabel {
	text: string;
	kind: string;
	x: number;
	y: number;
	/** sqrt of area in world units, drives the font size */
	extent: number;
	angle: number;
	/** world points for along-line lettering (roads, rivers) */
	path?: number[];
}

const STYLE: Record<string, { color: string; italic: boolean; caps: boolean; min: number; scale: number; max: number }> = {
	range: { color: '#5b3f22', italic: false, caps: true, min: 9, scale: 0.11, max: 20 },
	peak: { color: '#4a3020', italic: true, caps: false, min: 9, scale: 0, max: 11 },
	pass: { color: '#4a3020', italic: true, caps: false, min: 9, scale: 0, max: 10 },
	hills: { color: '#6b5235', italic: true, caps: false, min: 9, scale: 0.09, max: 15 },
	water: { color: '#1f4e7a', italic: true, caps: false, min: 9, scale: 0.1, max: 26 },
	land: { color: '#3d4a26', italic: true, caps: false, min: 9, scale: 0.09, max: 17 },
	road: { color: '#5a3c1e', italic: false, caps: false, min: 9, scale: 0, max: 10 },
	river: { color: '#245a8a', italic: true, caps: false, min: 9, scale: 0, max: 10 }
};
const WATER = new Set(['lake', 'bay', 'gulf', 'sea', 'ocean']);
const styleOf = (kind: string) => STYLE[kind] ?? STYLE[WATER.has(kind) ? 'water' : 'land'];

export class MapLabels {
	private key = '';
	private list: GeoLabel[] = [];
	/** ms the last compute took (perf probe) */
	lastMs = 0;

	/** called after a deferred recompute finished (the renderer redraws) */
	onReady: (() => void) | null = null;
	private pending = 0;

	/** recompute when world, voice or decade changes: at once the first time, later on an idle callback (≈50-90 ms at 40k cells) */
	ensure(sim: Simulation, w: World) {
		const key = `${w.name}|${w.opts.seed}|${sim.voice}|${Math.floor(sim.year / 10)}`;
		if (key === this.key) return;
		this.key = key;
		const run = () => {
			this.pending = 0;
			const t0 = performance.now();
			this.list = computeLabels(sim, w);
			this.lastMs = performance.now() - t0;
		};
		const sameWorld = this.world === w;
		this.world = w;
		if (!sameWorld || !this.list.length || typeof window === 'undefined') return run();
		if (this.pending) clearTimeout(this.pending);
		this.pending = window.setTimeout(() => { run(); this.onReady?.(); }, 30);
	}
	private world: World | null = null;

	get labels(): readonly GeoLabel[] {
		return this.list;
	}

	draw(ctx: CanvasRenderingContext2D, R: LayerHost, S: (x: number, y: number) => [number, number], placed: number[][]) {
		const w = R.world, sim = R.sim;
		if (!w || !sim || R.layer !== 0) return;
		this.ensure(sim, w);
		const k = R.k, font = R.theme.bodyFont;
		const glow = !!R.theme.glow;
		const hit = (b: number[]) => placed.some((p) => b[0] < p[2] && b[2] > p[0] && b[1] < p[3] && b[3] > p[1]);
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.lineJoin = 'round';
		for (const lb of this.list) {
			const st = styleOf(lb.kind);
			let size: number;
			if (lb.kind === 'peak' || lb.kind === 'pass') { if (k < 2) continue; size = 10; }
			else if (lb.kind === 'road' || lb.kind === 'river') { if (k < 1.6) continue; size = st.max; }
			else {
				size = lb.extent * st.scale * k;
				if (size < st.min) continue;
				size = Math.min(st.max, size);
			}
			const [x, y] = S(lb.x, lb.y);
			if (x < -300 || y < -60 || x > R.w + 300 || y > R.h + 60) continue;
			const text = st.caps ? lb.text.toUpperCase() : lb.text;
			ctx.font = `${st.italic ? 'italic ' : ''}${st.caps ? 600 : 500} ${size.toFixed(1)}px ${font}`;
			const tw = ctx.measureText(text).width;
			const fill = glow ? '#e8e4ff' : st.color;
			const halo = glow ? 'rgba(10,8,20,0.8)' : 'rgba(255,250,235,0.75)';
			if (lb.path) {
				const pts: number[] = [];
				for (let i = 0; i < lb.path.length; i += 2) { const [a, b] = S(lb.path[i], lb.path[i + 1]); pts.push(a, b); }
				const box = onPath(ctx, text, tw, pts, size, fill, halo, hit);
				if (box) placed.push(box);
				continue;
			}
			const cos = Math.abs(Math.cos(lb.angle)), sin = Math.abs(Math.sin(lb.angle));
			const hw = (tw * cos + size * sin) / 2 + 2, hh = (tw * sin + size * cos) / 2 + 2;
			const box = [x - hw, y - hh, x + hw, y + hh];
			if (hit(box)) continue;
			placed.push(box);
			ctx.save();
			ctx.translate(x, y);
			if (lb.angle) ctx.rotate(lb.angle);
			ctx.lineWidth = Math.max(2, size / 5);
			ctx.strokeStyle = halo;
			ctx.strokeText(text, 0, 0);
			ctx.fillStyle = fill;
			ctx.fillText(text, 0, 0);
			ctx.restore();
		}
	}
}

/** letter `text` along a screen polyline around its middle; returns the bounding box or null if it did not fit */
function onPath(ctx: CanvasRenderingContext2D, text: string, tw: number, pts: number[], size: number, fill: string, halo: string, hit: (b: number[]) => boolean): number[] | null {
	const n = pts.length / 2;
	if (n < 2) return null;
	if (pts[2 * (n - 1)] < pts[0]) {
		const r: number[] = [];
		for (let i = n - 1; i >= 0; i--) r.push(pts[2 * i], pts[2 * i + 1]);
		pts = r;
	}
	const cum = [0];
	for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(pts[2 * i] - pts[2 * i - 2], pts[2 * i + 1] - pts[2 * i - 1]));
	const total = cum[n - 1];
	if (total < tw * 1.15) return null;
	const at = (d: number): [number, number, number] => {
		let i = 1;
		while (i < n - 1 && cum[i] < d) i++;
		const t = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
		const x0 = pts[2 * i - 2], y0 = pts[2 * i - 1], x1 = pts[2 * i], y1 = pts[2 * i + 1];
		return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, Math.atan2(y1 - y0, x1 - x0)];
	};
	const start = (total - tw) / 2;
	const [mx, my] = at(total / 2);
	const box = [mx - tw / 2 - 2, my - tw / 3 - size, mx + tw / 2 + 2, my + tw / 3 + size];
	if (hit(box)) return null;
	let d = start;
	ctx.lineWidth = Math.max(2, size / 4);
	for (const ch of text) {
		const cw = ctx.measureText(ch).width;
		const [x, y, a] = at(d + cw / 2);
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(a);
		ctx.strokeStyle = halo;
		ctx.strokeText(ch, 0, -size * 0.55);
		ctx.fillStyle = fill;
		ctx.fillText(ch, 0, -size * 0.55);
		ctx.restore();
		d += cw;
	}
	return box;
}

function computeLabels(sim: Simulation, w: World): GeoLabel[] {
	const { grid, pOfCell, sx, sy } = namesGrid(sim);
	const N = exportNames(sim, grid, pOfCell);
	const PW = grid.PW;
	const cx = (p: number) => ((p % PW) + 0.5) * sx, cy = (p: number) => (Math.floor(p / PW) + 0.5) * sy;
	const out: GeoLabel[] = [];
	for (const f of N.features) {
		if (f.kind === 'plain' && f.parasangs.length < 30) continue;
		let mx = 0, my = 0;
		for (const p of f.parasangs) { mx += cx(p); my += cy(p); }
		mx /= f.parasangs.length;
		my /= f.parasangs.length;
		// anchor on the member parasang nearest the centroid (concave regions keep their label inside)
		let best = f.parasangs[0], bd = Infinity;
		for (const p of f.parasangs) { const d = (cx(p) - mx) ** 2 + (cy(p) - my) ** 2; if (d < bd) { bd = d; best = p; } }
		let angle = 0;
		if (f.kind === 'range' && f.parasangs.length >= 4) {
			// principal axis of the range, tilted only when it is clearly elongated
			let xx = 0, yy = 0, xy = 0;
			for (const p of f.parasangs) { const dx = cx(p) - mx, dy = cy(p) - my; xx += dx * dx; yy += dy * dy; xy += dx * dy; }
			const a = 0.5 * Math.atan2(2 * xy, xx - yy);
			const tr = xx + yy, det = xx * yy - xy * xy;
			const l1 = tr / 2 + Math.sqrt(Math.max(0, tr * tr / 4 - det)), l2 = tr / 2 - Math.sqrt(Math.max(0, tr * tr / 4 - det));
			if (l1 > 3 * Math.max(1e-6, l2)) angle = Math.max(-1, Math.min(1, a));
		}
		const x = f.kind === 'peak' || f.kind === 'pass' ? cx(best) : bd < (sx * sx) ? mx : cx(best);
		const y = f.kind === 'peak' || f.kind === 'pass' ? cy(best) + sy * 0.25 : bd < (sy * sy) ? my : cy(best);
		out.push({ text: f.name, kind: f.kind, x, y, extent: Math.sqrt(f.parasangs.length * sx * sy), angle });
	}
	const c = w.cells;
	const pathOf = (cells: number[]) => {
		// thin + average so letters follow the line, not every cell zigzag
		const step = Math.max(1, Math.floor(cells.length / 24));
		const pts: number[] = [];
		for (let i = 0; i < cells.length; i += step) {
			let ax = 0, ay = 0, m = 0;
			for (let j = Math.max(0, i - step); j <= Math.min(cells.length - 1, i + step); j++) { ax += c.x[cells[j]]; ay += c.y[cells[j]]; m++; }
			pts.push(ax / m, ay / m);
		}
		const last = cells[cells.length - 1];
		pts.push(c.x[last], c.y[last]);
		return pts;
	};
	for (const r of N.routes) {
		if (r.kind !== 'road' || r.parasangs.length < 5) continue;
		const rt = w.routes[r.id];
		if (!rt || !w.burgs[rt.a]?.alive || !w.burgs[rt.b]?.alive) continue;
		const pts = pathOf(rt.cells);
		out.push({ text: r.name, kind: 'road', x: pts[pts.length >> 2 << 1], y: pts[(pts.length >> 2 << 1) + 1], extent: 0, angle: 0, path: pts });
	}
	for (const rv of N.rivers) {
		if (rv.parasangs.length < 6) continue;
		const r = w.rivers.find((x) => x.id === rv.id);
		if (!r) continue;
		const cells = r.cells.filter((i) => i >= 0 && i < c.n);
		if (cells.length < 4) continue;
		const pts = pathOf(cells);
		out.push({ text: rv.name, kind: 'river', x: pts[pts.length >> 2 << 1], y: pts[(pts.length >> 2 << 1) + 1], extent: 0, angle: 0, path: pts });
	}
	// big features first so they win collisions
	const rank = (l: GeoLabel) => (WATER.has(l.kind) ? 3 : l.kind === 'range' ? 2 : l.kind === 'road' || l.kind === 'river' ? 0 : 1) * 1e6 + l.extent;
	return out.sort((a, b) => rank(b) - rank(a));
}
