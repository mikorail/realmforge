import { latRange } from '../gen/options';
import { BIOMES } from '../gen/physical';

export type SeasonKind = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonInfo {
	season: SeasonKind;
	name: string;
	icon: string;
	frostThreshold: number;
}

/**
 * Map month (0..11) to calendar season.
 * Spring: months 2, 3, 4
 * Summer: months 5, 6, 7
 * Autumn: months 8, 9, 10
 * Winter: months 11, 0, 1
 */
export function getSeason(month: number): SeasonInfo {
	const m = ((Math.floor(month) % 12) + 12) % 12;

	if (m === 2 || m === 3 || m === 4) {
		return {
			season: 'spring',
			name: 'Spring',
			icon: '🌱',
			frostThreshold: 72
		};
	}
	if (m === 5 || m === 6 || m === 7) {
		return {
			season: 'summer',
			name: 'Summer',
			icon: '☀️',
			frostThreshold: 90
		};
	}
	if (m === 8 || m === 9 || m === 10) {
		return {
			season: 'autumn',
			name: 'Autumn',
			icon: '🍂',
			frostThreshold: 62
		};
	}
	// Months 11, 0, 1
	return {
		season: 'winter',
		name: 'Winter',
		icon: '❄️',
		frostThreshold: 45
	};
}

export function isWinter(month: number): boolean {
	const m = ((Math.floor(month) % 12) + 12) % 12;
	return m === 11 || m === 0 || m === 1;
}

export function isAutumn(month: number): boolean {
	const m = ((Math.floor(month) % 12) + 12) % 12;
	return m === 8 || m === 9 || m === 10;
}

export function isSpring(month: number): boolean {
	const m = ((Math.floor(month) % 12) + 12) % 12;
	return m === 2 || m === 3 || m === 4;
}

export function isSummer(month: number): boolean {
	const m = ((Math.floor(month) % 12) + 12) % 12;
	return m === 5 || m === 6 || m === 7;
}

/**
 * Calculate cell latitude based on world climate options or world height.
 * Latitude ranges from +90 at the north to -90 at the south.
 */
export function cellLatitude(world: any, cellIndex: number): number {
	const cells = world?.cells;
	if (!cells) return 0;

	if (cells.lat && typeof cells.lat[cellIndex] === 'number') {
		return cells.lat[cellIndex];
	}
	if (cells.latitude && typeof cells.latitude[cellIndex] === 'number') {
		return cells.latitude[cellIndex];
	}

	const H = world.opts?.height ?? 1000;
	const cy = cells.y ? cells.y[cellIndex] ?? (H * 0.5) : H * 0.5;

	if (world.opts?.climate) {
		const { top, span } = latRange(world.opts.climate);
		return top - (cy / H) * span;
	}

	// Default full map projection: 90 at y=0 to -90 at y=H
	return 90 - (cy / H) * 180;
}

/**
 * Check if a cell is subject to seasonal frost based on northern latitude (> 55)
 * or alpine elevation (> 70).
 */
export function isFrostEligible(latitude: number, elevation: number): boolean {
	return latitude > 55 || elevation > 70;
}

/**
 * Check if a cell in a given world is frost eligible.
 */
export function isCellFrosty(world: any, cellIndex: number): boolean {
	const lat = cellLatitude(world, cellIndex);
	const elevation = world?.cells?.h ? (world.cells.h[cellIndex] ?? 0) : 0;
	return isFrostEligible(lat, elevation);
}

/**
 * Check if a cell is in a temperate forest biome (biomes 6, 8, or names matching temperate forest).
 */
export function isTemperateForest(world: any, cellIndex: number): boolean {
	const biomeIdx = world?.cells?.biome ? world.cells.biome[cellIndex] : -1;
	if (biomeIdx === 6 || biomeIdx === 8) return true;
	if (biomeIdx >= 0 && biomeIdx < BIOMES.length) {
		const name = BIOMES[biomeIdx]?.name?.toLowerCase() || '';
		return name.includes('temperate') && name.includes('forest');
	}
	return false;
}

interface SeasonalPrecomputed {
	winterCells: number[];
	autumnCells: number[];
}

const seasonalCache = new WeakMap<any, SeasonalPrecomputed>();

function getSeasonalPrecomputed(world: any): SeasonalPrecomputed {
	const cells = world?.cells;
	if (!cells) {
		return { winterCells: [], autumnCells: [] };
	}

	const cached = seasonalCache.get(cells);
	if (cached) return cached;

	const n = cells.n ?? 0;
	const winterCells: number[] = [];
	const autumnCells: number[] = [];

	for (let i = 0; i < n; i++) {
		if (isCellFrosty(world, i)) {
			winterCells.push(i);
		}
		if (isTemperateForest(world, i)) {
			autumnCells.push(i);
		}
	}

	const result: SeasonalPrecomputed = { winterCells, autumnCells };
	seasonalCache.set(cells, result);
	return result;
}

/**
 * Render dynamic seasonal atmospheric overlays on Canvas2D.
 * - Winter: subtle frosty vignette and alpine/northern snow dusting
 * - Autumn: warm gold/amber foliage dusting on temperate forest biomes
 * - Spring: soft verdant aura
 */
export function renderSeasonalOverlay(
	ctx: CanvasRenderingContext2D,
	sim: any,
	world: any,
	layer: number,
	k: number,
	S: (x: number, y: number) => [number, number],
	viewportW: number,
	viewportH: number
): void {
	if (!ctx || !sim || !world) return;

	// Seasons apply to surface layer (layer 0)
	const isSurface =
		layer === 0 ||
		(world.layers && world.layers[layer]?.kind === 'surface');
	if (!isSurface) return;

	const month = typeof sim.month === 'number' ? sim.month : 0;
	const season = getSeason(month);
	const cells = world.cells;
	if (!cells) return;

	const pad = 30;
	ctx.save();

	if (season.season === 'winter') {
		// 1. Subtle frosty vignette
		if (typeof ctx.createRadialGradient === 'function') {
			const cx = viewportW * 0.5;
			const cy = viewportH * 0.5;
			const rInner = Math.min(viewportW, viewportH) * 0.32;
			const rOuter = Math.hypot(viewportW, viewportH) * 0.55;

			const grad = ctx.createRadialGradient(cx, cy, rInner, cx, cy, rOuter);
			grad.addColorStop(0, 'rgba(235, 245, 255, 0)');
			grad.addColorStop(0.75, 'rgba(215, 235, 255, 0.08)');
			grad.addColorStop(1, 'rgba(200, 230, 255, 0.18)');

			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, viewportW, viewportH);
		}

		// 2. Snow dusting on northern cells (lat > 55) or mountain peaks (elevation > 70)
		const { winterCells } = getSeasonalPrecomputed(world);
		const dotR = Math.max(1.8, Math.min(6.5, 2.2 * Math.sqrt(k)));

		ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
		for (let idx = 0; idx < winterCells.length; idx++) {
			const i = winterCells[idx];
			const [sx, sy] = S(cells.x[i], cells.y[i]);

			if (
				sx < -pad ||
				sy < -pad ||
				sx > viewportW + pad ||
				sy > viewportH + pad
			) {
				continue;
			}

			const elev = cells.h ? cells.h[i] : 0;
			const rad = elev > 75 ? dotR * 1.3 : dotR;

			ctx.beginPath();
			ctx.arc(sx, sy, rad, 0, Math.PI * 2);
			ctx.fill();
		}
	} else if (season.season === 'autumn') {
		// 1. Soft warm ambient glow
		if (typeof ctx.createRadialGradient === 'function') {
			const cx = viewportW * 0.5;
			const cy = viewportH * 0.5;
			const rInner = Math.min(viewportW, viewportH) * 0.35;
			const rOuter = Math.hypot(viewportW, viewportH) * 0.55;

			const grad = ctx.createRadialGradient(cx, cy, rInner, cx, cy, rOuter);
			grad.addColorStop(0, 'rgba(245, 158, 11, 0)');
			grad.addColorStop(1, 'rgba(217, 119, 6, 0.06)');

			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, viewportW, viewportH);
		}

		// 2. Warm gold/amber foliage dusting on temperate forest biomes
		const { autumnCells } = getSeasonalPrecomputed(world);
		const dotR = Math.max(2, Math.min(6, 2.4 * Math.sqrt(k)));

		for (let idx = 0; idx < autumnCells.length; idx++) {
			const i = autumnCells[idx];
			const [sx, sy] = S(cells.x[i], cells.y[i]);

			if (
				sx < -pad ||
				sy < -pad ||
				sx > viewportW + pad ||
				sy > viewportH + pad
			) {
				continue;
			}

			// Alternating amber and gold foliage shades
			ctx.fillStyle = (i % 2 === 0)
				? 'rgba(217, 119, 6, 0.38)'
				: 'rgba(245, 158, 11, 0.34)';

			ctx.beginPath();
			ctx.arc(sx, sy, dotR, 0, Math.PI * 2);
			ctx.fill();
		}
	} else if (season.season === 'spring') {
		// Soft verdant aura across the realm
		if (typeof ctx.createRadialGradient === 'function') {
			const cx = viewportW * 0.5;
			const cy = viewportH * 0.5;
			const rInner = Math.min(viewportW, viewportH) * 0.25;
			const rOuter = Math.hypot(viewportW, viewportH) * 0.55;

			const grad = ctx.createRadialGradient(cx, cy, rInner, cx, cy, rOuter);
			grad.addColorStop(0, 'rgba(74, 222, 128, 0.035)');
			grad.addColorStop(0.7, 'rgba(34, 197, 94, 0.02)');
			grad.addColorStop(1, 'rgba(16, 185, 129, 0.045)');

			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, viewportW, viewportH);
		}
	}

	ctx.restore();
}
