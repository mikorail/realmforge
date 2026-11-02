/**
 * Optional map layers for the newer simulation systems: rail lines and air routes (`sim._railState`), faults,
 * volcanoes and recent disasters (`sim._hazardsState`), disease outbreaks, genre forces (`sim.gf`) and
 * geographic name labels (`names` in maplabels.ts). Read-only: never creates sim state (the lazy getters
 * `railState()` / `hz()` would), so toggling a layer cannot change the simulation.
 * World-space parts are cached `Path2D`s rebuilt only when the cache key (political version, layer, year,
 * toggles) changes; markers are drawn screen-space each full frame.
 */
import type { World } from '../gen/types';
import type { Simulation } from '../sim/engine';
import type { RailState } from '../sim/rail';
import type { HzState } from '../sim/hazards/state';
import { hashSeed } from '../rng';
import { alpha, type MapTheme } from './theme';
import { MapLabels } from './maplabels';

export type SimLayerKey = 'rail' | 'faults' | 'disease' | 'forces' | 'names';
export const SIM_LAYERS: { key: SimLayerKey; icon: string; label: string; title: string }[] = [
	{ key: 'names', icon: '✎', label: 'Names', title: 'Mountain ranges, peaks, passes, waters, forests, deserts and major roads' },
	{ key: 'rail', icon: '🚆', label: 'Rail', title: 'Rail lines, stations, air routes and docks' },
	{ key: 'faults', icon: '⛰', label: 'Hazards', title: 'Fault lines, volcanoes and recent disasters' },
	{ key: 'disease', icon: '☣', label: 'Disease', title: 'Disease outbreaks and quarantined towns' },
	{ key: 'forces', icon: '✦', label: 'Forces', title: 'Genre forces: smog, fallout, megacorps, leylines' }
];

export const RAIL_COLORS: Record<string, string> = {
	railway: '#3b3b3b', 'diesel line': '#7a4a1f', 'atomic monorail': '#2a9d8f', maglev: '#d63384', 'bio-tram': '#5a9e2f', 'solar rail': '#e0a800', 'salvage rail': '#8a6e4b'
};
export const railColor = (kind: string) => RAIL_COLORS[kind] ?? '#444';
export const HZ_GLYPH: Record<string, string> = { quake: '≋', tsunami: '≈', eruption: '▲', storm: '@', tornado: '§', flood: '≈', landslide: '⩘', avalanche: '❄', locust: '✱', wildfire: '♨' };
/** how long a recent-disaster marker stays on the map */
export const HZ_FADE = 30;
export const diseaseColor = (id: string) => `hsl(${hashSeed('dz:' + id) % 360}, 75%, 45%)`;

const railOf = (sim: Simulation) => (sim as unknown as { _railState?: RailState })._railState;
const hzOf = (sim: Simulation) => (sim as unknown as { _hazardsState?: HzState })._hazardsState;

export interface LayerHost {
	world: World | null;
	sim: Simulation | null;
	layer: number;
	k: number;
	tx: number;
	ty: number;
	w: number;
	h: number;
	theme: MapTheme;
	politicalVersion: number;
}

interface Cache {
	rail: [string, Path2D, boolean][];
	air: Path2D;
	faults: Path2D;
	disease: [string, Path2D][];
	fallout: Path2D;
	falloutCore: Path2D;
	leys: Path2D;
}

function addCell(p: Path2D, w: World, i: number) {
	const c = w.cells, s = c.polyStart[i], e = c.polyStart[i + 1];
	if (e - s < 3) return;
	const xy = c.polyXY;
	p.moveTo(xy[2 * s], xy[2 * s + 1]);
	for (let k = s + 1; k < e; k++) p.lineTo(xy[2 * k], xy[2 * k + 1]);
	p.closePath();
}

function smoothCells(p: Path2D, w: World, pts: number[]) {
	const c = w.cells;
	if (pts.length < 2) return;
	p.moveTo(c.x[pts[0]], c.y[pts[0]]);
	for (let i = 1; i < pts.length - 1; i++) p.quadraticCurveTo(c.x[pts[i]], c.y[pts[i]], (c.x[pts[i]] + c.x[pts[i + 1]]) / 2, (c.y[pts[i]] + c.y[pts[i + 1]]) / 2);
	p.lineTo(c.x[pts[pts.length - 1]], c.y[pts[pts.length - 1]]);
}

export class SimLayers {
	on = new Set<SimLayerKey>();
	labels = new MapLabels();
	private key = '';
	private C: Cache | null = null;

	has(k: SimLayerKey) {
		return this.on.has(k);
	}
	toggle(k: SimLayerKey, v = !this.on.has(k)) {
		if (v) this.on.add(k);
		else this.on.delete(k);
	}

	private build(w: World, sim: Simulation, layer: number): Cache {
		const C: Cache = { rail: [], air: new Path2D(), faults: new Path2D(), disease: [], fallout: new Path2D(), falloutCore: new Path2D(), leys: new Path2D() };
		const c = w.cells;
		const rs = railOf(sim);
		if (this.on.has('rail') && rs) {
			const byKind = new Map<string, Path2D>();
			if (layer === 0)
				for (const l of rs.lines) {
					const key = `${l.kind}|${l.cut ? 1 : 0}`;
					let p = byKind.get(key);
					if (!p) byKind.set(key, (p = new Path2D()));
					smoothCells(p, w, l.cells);
				}
			for (const [key, p] of byKind) { const [kind, cut] = key.split('|'); C.rail.push([kind, p, cut === '1']); }
			for (const a of rs.air) {
				const A = w.burgs[a.a], B = w.burgs[a.b];
				if (!A?.alive || !B?.alive) continue;
				if (sim.burgLayer(A) !== layer && sim.burgLayer(B) !== layer) continue;
				const d = Math.hypot(B.x - A.x, B.y - A.y);
				C.air.moveTo(A.x, A.y);
				C.air.quadraticCurveTo((A.x + B.x) / 2, (A.y + B.y) / 2 - d * 0.25, B.x, B.y);
			}
		}
		const hs = hzOf(sim);
		if (this.on.has('faults') && hs && layer === 0)
			for (const f of hs.faults) {
				const set = new Set(f.cells);
				for (const i of f.cells)
					for (let k = c.nStart[i]; k < c.nStart[i + 1]; k++) {
						const j = c.nList[k];
						if (j > i && set.has(j)) { C.faults.moveTo(c.x[i], c.y[i]); C.faults.lineTo(c.x[j], c.y[j]); }
					}
			}
		if (this.on.has('disease') && hs && layer === 0) {
			const dz = new Map<number, string>();
			for (const o of hs.outbreaks) if (!o.ended) dz.set(o.id, o.disease);
			const groups = new Map<string, Path2D>();
			for (let i = 0; i < c.n; i++) {
				const v = sim.plague[i];
				if (v <= 0.05) continue;
				const d = dz.get(hs.ob[i]);
				if (!d) continue;
				const band = Math.min(4, Math.ceil(v * 4));
				const key = `${d}|${band}`;
				let p = groups.get(key);
				if (!p) groups.set(key, (p = new Path2D()));
				addCell(p, w, i);
			}
			for (const [key, p] of groups) {
				const [d, band] = key.split('|');
				const col = diseaseColor(d).replace('hsl(', 'hsla(').replace(')', `, ${(0.18 + +band * 0.13).toFixed(2)})`);
				C.disease.push([col, p]);
			}
		}
		if (this.on.has('forces') && sim.gf) {
			if (layer === 0)
				for (const z of sim.gf.fallout) {
					if (z.until <= sim.year) continue;
					for (const i of z.cells) addCell(C.fallout, w, i);
					for (const i of z.core) addCell(C.falloutCore, w, i);
				}
			for (const l of sim.gf.leys) {
				if (l.la !== layer && l.lb !== layer) continue;
				const ax = c.x[l.a], ay = c.y[l.a], bx = c.x[l.b], by = c.y[l.b];
				const d = Math.hypot(bx - ax, by - ay);
				C.leys.moveTo(ax, ay);
				C.leys.quadraticCurveTo((ax + bx) / 2 + d * 0.08, (ay + by) / 2 - d * 0.08, bx, by);
			}
		}
		return C;
	}

	/** world-space strokes and fills (call with the world transform set) */
	drawWorld(ctx: CanvasRenderingContext2D, R: LayerHost) {
		const w = R.world, sim = R.sim;
		if (!w || !sim || !this.on.size) return;
		const key = `${R.politicalVersion}|${R.layer}|${sim.year}|${[...this.on].sort().join(',')}|${w.name}`;
		if (key !== this.key || !this.C) {
			this.C = this.build(w, sim, R.layer);
			this.key = key;
		}
		const C = this.C, px = (n: number) => n / R.k;
		for (const [col, p] of C.disease) { ctx.fillStyle = col; ctx.fill(p); }
		if (this.on.has('forces')) {
			ctx.fillStyle = 'rgba(150,170,60,0.28)';
			ctx.fill(C.fallout);
			ctx.fillStyle = 'rgba(90,100,40,0.45)';
			ctx.fill(C.falloutCore);
			ctx.save();
			ctx.strokeStyle = 'rgba(150,110,255,0.75)';
			ctx.shadowColor = '#a78bfa';
			ctx.shadowBlur = 8;
			ctx.lineWidth = px(1.6);
			ctx.setLineDash([px(1), px(3)]);
			ctx.stroke(C.leys);
			ctx.restore();
		}
		if (this.on.has('faults')) {
			ctx.strokeStyle = 'rgba(160,40,20,0.7)';
			ctx.lineWidth = px(1.8);
			ctx.stroke(C.faults);
		}
		if (this.on.has('rail')) {
			for (const [kind, p, cut] of C.rail) {
				ctx.strokeStyle = alpha(railColor(kind), cut ? 0.55 : 0.95);
				ctx.lineWidth = px(2.6);
				ctx.setLineDash(cut ? [px(5), px(4)] : []);
				ctx.stroke(p);
				if (!cut) {
					// sleepers: a light dashed core over the dark line
					ctx.strokeStyle = 'rgba(255,250,235,0.8)';
					ctx.lineWidth = px(1);
					ctx.setLineDash([px(3), px(3)]);
					ctx.stroke(p);
				}
			}
			ctx.setLineDash([px(2), px(5)]);
			ctx.strokeStyle = 'rgba(80,140,210,0.55)';
			ctx.lineWidth = px(1.2);
			ctx.stroke(C.air);
			ctx.setLineDash([]);
		}
	}

	/** screen-space markers and labels (call with the dpr-only transform set) */
	drawScreen(ctx: CanvasRenderingContext2D, R: LayerHost, S: (x: number, y: number) => [number, number], placed: number[][]) {
		const w = R.world, sim = R.sim;
		if (!w || !sim || !this.on.size) return;
		const k = R.k, layer = R.layer, c = w.cells;
		const vis = (x: number, y: number) => x > -30 && y > -30 && x < R.w + 30 && y < R.h + 30;
		const z = Math.min(1.8, Math.max(0.8, Math.sqrt(k)));
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		const rs = railOf(sim);
		if (this.on.has('rail') && rs) {
			if (layer === 0)
				for (const l of rs.lines)
					for (const id of l.stations) {
						const b = w.burgs[id];
						if (!b?.alive) continue;
						const [x, y] = S(b.x, b.y);
						if (!vis(x, y)) continue;
						ctx.fillStyle = '#fff';
						ctx.strokeStyle = railColor(l.kind);
						ctx.lineWidth = 2;
						ctx.fillRect(x - 3 * z, y + 4, 6 * z, 4 * z);
						ctx.strokeRect(x - 3 * z, y + 4, 6 * z, 4 * z);
					}
			ctx.font = `${Math.round(10 * z)}px sans-serif`;
			for (const id of rs.docks) {
				const b = w.burgs[id];
				if (!b?.alive || sim.burgLayer(b) !== layer) continue;
				const [x, y] = S(b.x, b.y);
				if (!vis(x, y)) continue;
				ctx.fillStyle = 'rgba(80,140,210,0.95)';
				ctx.fillText('⚓', x + 9 * z, y - 7 * z);
			}
		}
		const hs = hzOf(sim);
		if (this.on.has('faults') && hs && layer === 0) {
			for (const v of hs.volcanoes) {
				const [x, y] = S(c.x[v.cell], c.y[v.cell]);
				if (!vis(x, y)) continue;
				const r = 5 * z;
				if (v.active) {
					const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
					g.addColorStop(0, 'rgba(255,120,30,0.65)');
					g.addColorStop(1, 'rgba(255,60,0,0)');
					ctx.fillStyle = g;
					ctx.beginPath();
					ctx.arc(x, y, r * 3, 0, Math.PI * 2);
					ctx.fill();
				}
				ctx.beginPath();
				ctx.moveTo(x, y - r);
				ctx.lineTo(x + r, y + r * 0.8);
				ctx.lineTo(x - r, y + r * 0.8);
				ctx.closePath();
				ctx.fillStyle = v.active ? '#c0392b' : '#6b5b4b';
				ctx.strokeStyle = '#2b2116';
				ctx.lineWidth = 1;
				ctx.fill();
				ctx.stroke();
				if (k > 1.6) {
					ctx.font = `italic 10px sans-serif`;
					ctx.fillStyle = '#5a1a0a';
					ctx.fillText(v.name, x, y + r + 8);
				}
			}
			ctx.font = `${Math.round(11 * z)}px sans-serif`;
			for (const e of hs.recent) {
				const age = sim.year - e.year;
				if (age < 0 || age >= HZ_FADE || e.cell < 0) continue;
				const [x, y] = S(c.x[e.cell], c.y[e.cell]);
				if (!vis(x, y)) continue;
				ctx.globalAlpha = Math.max(0.15, 1 - age / HZ_FADE);
				ctx.lineWidth = 3;
				ctx.strokeStyle = 'rgba(255,250,235,0.9)';
				ctx.strokeText(HZ_GLYPH[e.kind] ?? '!', x, y);
				ctx.fillStyle = e.kind === 'eruption' || e.kind === 'wildfire' ? '#c0392b' : e.kind === 'quake' || e.kind === 'landslide' ? '#7a4a1f' : '#1f5f9a';
				ctx.fillText(HZ_GLYPH[e.kind] ?? '!', x, y);
				ctx.globalAlpha = 1;
			}
		}
		if (this.on.has('disease') && hs && layer === 0) {
			for (const o of hs.outbreaks) {
				if (o.ended) continue;
				for (const id of o.quarantined) {
					const b = w.burgs[id];
					if (!b?.alive) continue;
					const [x, y] = S(b.x, b.y);
					if (!vis(x, y)) continue;
					ctx.beginPath();
					ctx.arc(x, y, 7 * z, 0, Math.PI * 2);
					ctx.setLineDash([3, 2]);
					ctx.strokeStyle = diseaseColor(o.disease);
					ctx.lineWidth = 2;
					ctx.stroke();
					ctx.setLineDash([]);
				}
			}
		}
		if (this.on.has('forces') && sim.gf) {
			const gf = sim.gf;
			for (const id of gf.smog) {
				const b = w.burgs[id];
				if (!b?.alive || sim.burgLayer(b) !== layer) continue;
				const [x, y] = S(b.x, b.y);
				if (!vis(x, y)) continue;
				ctx.fillStyle = 'rgba(90,85,80,0.35)';
				for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + (i - 1) * 5 * z, y - 8 * z - i * 3, 5 * z, 0, Math.PI * 2); ctx.fill(); }
			}
			ctx.font = `600 ${Math.round(10 * z)}px sans-serif`;
			for (const corp of gf.corps) {
				if (!corp.alive) continue;
				const b = w.burgs[corp.hq];
				if (!b?.alive || sim.burgLayer(b) !== layer) continue;
				const [x, y] = S(b.x, b.y);
				if (!vis(x, y)) continue;
				ctx.fillStyle = '#d63384';
				ctx.fillText('◆', x - 9 * z, y - 7 * z);
				if (k > 1.4) { ctx.fillStyle = '#7a1a4a'; ctx.fillText(corp.name, x, y + 14 * z); }
			}
			for (const l of gf.leys)
				for (const [cell, la] of [[l.a, l.la], [l.b, l.lb]]) {
					if (la !== layer) continue;
					const [x, y] = S(c.x[cell], c.y[cell]);
					if (!vis(x, y)) continue;
					ctx.fillStyle = 'rgba(167,139,250,0.9)';
					ctx.fillText('✦', x, y);
				}
		}
		if (this.on.has('names')) this.labels.draw(ctx, R, S, placed);
	}
}

/** hover-card lines for the sim layers under a cell (read-only) */
export function simLayerInfo(sim: Simulation, cell: number, layer: number): { icon: string; text: string }[] {
	const out: { icon: string; text: string }[] = [];
	if (cell < 0) return out;
	const c = sim.w.cells;
	const near = new Set([cell]);
	for (let k = c.nStart[cell]; k < c.nStart[cell + 1]; k++) near.add(c.nList[k]);
	const rs = railOf(sim);
	if (rs && layer === 0)
		for (const l of rs.lines)
			if (l.cells.some((i) => near.has(i))) {
				const owner = sim.polities[l.owner];
				out.push({ icon: '🚆', text: `${l.name ?? 'A ' + l.kind} (${l.kind}, ${l.stations.length} stations${owner?.alive ? `, ${owner.name}` : ''})${l.cut ? `, cut in Y${l.cut}` : ''}` });
				if (out.length > 2) break;
			}
	const hs = hzOf(sim);
	if (hs && layer === 0) {
		for (const f of hs.faults) if (f.cells.some((i) => near.has(i))) out.push({ icon: '≋', text: `${f.name}${f.last ? `, last quake Y${f.last}` : ''}` });
		for (const v of hs.volcanoes) if (near.has(v.cell)) out.push({ icon: '▲', text: `${v.name}, ${v.active ? 'active' : 'dormant'} ${v.kind === 'arc' ? 'arc volcano' : 'hotspot'}${v.last ? `, erupted Y${v.last}` : ''}` });
		const ob = hs.ob[cell];
		if (ob && sim.plague[cell] > 0.05) {
			const o = hs.outbreaks.find((x) => x.id === ob && !x.ended);
			if (o) out.push({ icon: '☣', text: `${o.name} (${o.disease}, since Y${o.since}${o.quarantined.length ? `, ${o.quarantined.length} towns quarantined` : ''})` });
		}
		for (const e of hs.recent) if (near.has(e.cell) && sim.year - e.year < HZ_FADE) out.push({ icon: HZ_GLYPH[e.kind] ?? '!', text: `${e.name ?? e.kind} (Y${e.year})` });
	}
	const gf = sim.gf;
	if (gf) {
		for (const z of gf.fallout) if (z.until > sim.year && layer === 0 && z.cells.includes(cell)) out.push({ icon: '☢', text: `Fallout of ${z.town} (Y${z.from}, clears ~Y${z.until})` });
		for (const l of gf.leys) if ((l.a === cell && l.la === layer) || (l.b === cell && l.lb === layer)) out.push({ icon: '✦', text: `Leyline ${l.an} – ${l.bn}` });
	}
	return out.slice(0, 6);
}
