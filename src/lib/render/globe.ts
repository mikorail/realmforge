/**
 * Globe rendering: the flat map is resampled into an equirectangular raster (longitude wraps naturally),
 * then drawn onto a rotatable orthographic sphere. Pure functions, no DOM beyond the ImageData passed in.
 */
import { findCell } from '../gen/grid';
import { BIOMES } from '../gen/physical';
import { latRange, lonRange } from '../gen/options';
import { SEA } from '../gen/types';
import type { Simulation } from '../sim/engine';

export type GlobeMode = 'political' | 'biome';
export type AzimuthProjection = 'orthographic' | 'equidistant' | 'stereographic' | 'gnomonic';

export interface GlobeRaster {
	w: number;
	h: number;
	/** RGBA */
	data: Uint8ClampedArray;
	/** fraction of the sphere the map covers (0..1, area-agnostic: lon span x lat span / (360 x 180)) */
	coverage: number;
	/** east and west edges join */
	wrap: boolean;
}

const UNMAPPED: [number, number, number] = [24, 30, 44];
const hexCache = new Map<string, [number, number, number]>();
function rgb(hex: string): [number, number, number] {
	let c = hexCache.get(hex);
	if (!c) {
		const m = /^#?([0-9a-f]{6})$/i.exec(hex) ?? /^#?([0-9a-f]{3})$/i.exec(hex);
		let s = m ? m[1] : '808080';
		if (s.length === 3) s = s.split('').map((ch) => ch + ch).join('');
		const n = parseInt(s, 16);
		c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
		hexCache.set(hex, c);
	}
	return c;
}

/** map pixel (x,y) of the flat world for a longitude/latitude, or null when the map does not cover it */
export function lonLatToMap(sim: Simulation, lon: number, lat: number): [number, number] | null {
	const o = sim.w.opts;
	const lr = latRange(o.climate);
	const lo = lonRange(o.climate, o.width, o.height);
	let dl = lon - lo.left;
	if (o.wrapX) dl = ((dl % 360) + 360) % 360;
	const fx = dl / lo.span;
	const fy = (lr.top - lat) / lr.span;
	if (fx < 0 || fx >= 1 || fy < 0 || fy >= 1) return null;
	return [fx * o.width, fy * o.height];
}

export function buildEquirect(sim: Simulation, mode: GlobeMode, w = 720, h = 360): GlobeRaster {
	const c = sim.w.cells;
	const o = sim.w.opts;
	const data = new Uint8ClampedArray(w * h * 4);
	const state = sim.w.layers[0].state;
	let covered = 0;
	let cur = 0;
	for (let r = 0; r < h; r++) {
		const lat = 90 - ((r + 0.5) * 180) / h;
		for (let col = 0; col < w; col++) {
			const lon = -180 + ((col + 0.5) * 360) / w;
			const p = lonLatToMap(sim, lon, lat);
			let color = UNMAPPED;
			if (p) {
				covered++;
				cur = findCell(c, p[0], p[1], cur);
				const hgt = c.h[cur];
				if (hgt < SEA) {
					const d = Math.max(0, Math.min(1, hgt / SEA));
					color = [Math.round(28 + 40 * d), Math.round(62 + 60 * d), Math.round(110 + 50 * d)];
				} else if (mode === 'political' && state[cur] && sim.polities[state[cur]]) {
					color = rgb(sim.polities[state[cur]].color);
				} else {
					color = rgb(BIOMES[c.biome[cur]]?.color ?? '#888888');
					if (mode === 'political') color = [Math.round(color[0] * 0.75 + 30), Math.round(color[1] * 0.75 + 30), Math.round(color[2] * 0.75 + 30)];
				}
			}
			const i = (r * w + col) * 4;
			data[i] = color[0];
			data[i + 1] = color[1];
			data[i + 2] = color[2];
			data[i + 3] = 255;
		}
	}
	return { w, h, data, coverage: covered / (w * h), wrap: !!o.wrapX };
}

/** Azimuthal projection of the raster onto `out` (square ImageData), centred on lon0/lat0 degrees */
export function renderGlobe(
	r: GlobeRaster,
	out: ImageData,
	lon0: number,
	lat0: number,
	graticule = true,
	proj: AzimuthProjection = 'orthographic'
) {
	const S = out.width;
	const R = S / 2 - 2;
	const cx = S / 2, cy = S / 2;
	const phi0 = (lat0 * Math.PI) / 180;
	const sinP = Math.sin(phi0), cosP = Math.cos(phi0);
	const px = out.data;
	for (let py = 0; py < S; py++) {
		const y = (cy - py - 0.5) / R;
		for (let pxl = 0; pxl < S; pxl++) {
			const x = (pxl + 0.5 - cx) / R;
			const rr = x * x + y * y;
			const i = (py * S + pxl) * 4;
			const rho = Math.sqrt(rr);

			let sinC = 0, cosC = 1, cAngle = 0;
			let shade = 1;

			if (proj === 'orthographic') {
				if (rho > 1) { px[i + 3] = 0; continue; }
				sinC = rho;
				cosC = Math.sqrt(Math.max(0, 1 - rr));
				cAngle = Math.asin(Math.min(1, rho));
				shade = 0.5 + 0.5 * cosC;
			} else if (proj === 'equidistant') {
				// Azimuthal Equidistant: maps entire sphere up to antipode at rho = 1
				if (rho > 1) { px[i + 3] = 0; continue; }
				cAngle = rho * Math.PI;
				sinC = Math.sin(cAngle);
				cosC = Math.cos(cAngle);
				shade = 0.8 + 0.2 * Math.cos(cAngle / 2);
			} else if (proj === 'stereographic') {
				// Stereographic: conformal, covers hemisphere at rho = 1, up to 135 deg at rho = 1.3
				if (rho > 1.25) { px[i + 3] = 0; continue; }
				cAngle = 2 * Math.atan(rho);
				sinC = Math.sin(cAngle);
				cosC = Math.cos(cAngle);
				shade = 0.75 + 0.25 * Math.cos(cAngle / 2);
			} else if (proj === 'gnomonic') {
				// Gnomonic: great circles are straight lines; view limited to ~65 degrees
				if (rho > 1.4) { px[i + 3] = 0; continue; }
				cAngle = Math.atan(rho);
				sinC = Math.sin(cAngle);
				cosC = Math.cos(cAngle);
				shade = 0.75 + 0.25 * cosC;
			}

			let latD: number, lonD: number;
			if (rho < 1e-7) {
				latD = lat0;
				lonD = lon0;
			} else {
				const lat = Math.asin(Math.max(-1, Math.min(1, cosC * sinP + (y / rho) * sinC * cosP)));
				let lon = lon0 + (Math.atan2(x * sinC, rho * cosP * cosC - y * sinP * sinC) * 180) / Math.PI;
				lon = ((((lon + 180) % 360) + 360) % 360) - 180;
				latD = (lat * 180) / Math.PI;
				lonD = lon;
			}

			const sx = Math.min(r.w - 1, Math.floor(((lonD + 180) / 360) * r.w));
			const sy = Math.min(r.h - 1, Math.max(0, Math.floor(((90 - latD) / 180) * r.h)));
			const s = (sy * r.w + sx) * 4;

			if (graticule) {
				const a = Math.abs(((lonD + 180) % 30) - 15), b = Math.abs(((latD + 90) % 30) - 15);
				if (a > 14.3 || b > 14.3) shade *= 0.82;
			}
			px[i] = r.data[s] * shade;
			px[i + 1] = r.data[s + 1] * shade;
			px[i + 2] = r.data[s + 2] * shade;
			px[i + 3] = 255;
		}
	}
}

