/**
 * Living Seasons & Visual World Map Shifts (seasons.ts).
 * 1. Dynamic snowlines advancing southward in winter and receding north in spring/summer.
 * 2. Frozen rivers: winter rivers freeze over with icy cyan and fracture styling.
 * 3. Seasonal deciduous foliage: autumn amber/russet/gold shifts, spring blossoming pink/lime.
 * 4. Megafauna migrations: animated oceanic leviathans, aetheric sky-whales, and tundra mammoths.
 */

import { latRange } from '../gen/options';
import { BIOMES } from '../gen/physical';

export type SeasonKind = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonInfo {
	season: SeasonKind;
	name: string;
	icon: string;
	snowlineLat: number; // latitude above which snow falls
	snowlineElev: number; // elevation (0..100) above which alpine snow accumulates
}

export function getSeason(month: number): SeasonInfo {
	const m = ((Math.floor(month) % 12) + 12) % 12;

	// Month 0: Mid-winter, Month 1: Late winter, Month 11: Early winter
	if (m === 0) {
		return { season: 'winter', name: 'Mid-Winter', icon: '❄️', snowlineLat: 32, snowlineElev: 40 };
	}
	if (m === 1 || m === 11) {
		return { season: 'winter', name: 'Winter', icon: '❄️', snowlineLat: 42, snowlineElev: 52 };
	}
	// Months 2, 3, 4: Spring
	if (m === 2 || m === 3 || m === 4) {
		return { season: 'spring', name: 'Spring', icon: '🌱', snowlineLat: 65, snowlineElev: 75 };
	}
	// Months 5, 6, 7: Summer
	if (m === 5 || m === 6 || m === 7) {
		return { season: 'summer', name: 'Summer', icon: '☀️', snowlineLat: 78, snowlineElev: 85 };
	}
	// Months 8, 9, 10: Autumn
	return { season: 'autumn', name: 'Autumn', icon: '🍂', snowlineLat: 54, snowlineElev: 64 };
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

	return 90 - (cy / H) * 180;
}

/** Check if a cell is covered by the dynamic seasonal snowline */
export function isCellSnowbound(world: any, cellIndex: number, season: SeasonInfo): boolean {
	const lat = cellLatitude(world, cellIndex);
	const elev = world?.cells?.h ? (world.cells.h[cellIndex] ?? 0) : 0;
	return lat >= season.snowlineLat || elev >= season.snowlineElev;
}

export function isTemperateForest(world: any, cellIndex: number): boolean {
	const biomeIdx = world?.cells?.biome ? world.cells.biome[cellIndex] : -1;
	if (biomeIdx === 6 || biomeIdx === 8) return true;
	if (biomeIdx >= 0 && biomeIdx < BIOMES.length) {
		const name = BIOMES[biomeIdx]?.name?.toLowerCase() || '';
		return name.includes('temperate') && name.includes('forest');
	}
	return false;
}

/** Megafauna migration routes and positions */
export interface MegafaunaMigration {
	id: string;
	name: string;
	glyph: string;
	color: string;
	kind: 'ocean' | 'sky' | 'land';
}

export const MEGAFAUNA_SPECIES: MegafaunaMigration[] = [
	{ id: 'leviathan', name: 'Great Oceanic Leviathan', glyph: '🐋', color: '#38bdf8', kind: 'ocean' },
	{ id: 'sky_whale', name: 'Aetheric Sky-Whale', glyph: '🕊️', color: '#c084fc', kind: 'sky' },
	{ id: 'mammoth', name: 'Colossal Tundra Mammoth', glyph: '🦣', color: '#d97706', kind: 'land' }
];

/**
 * Render dynamic seasonal atmospheric overlays on Canvas2D.
 * - Dynamic Snowlines
 * - Frozen Rivers
 * - Seasonal Deciduous Foliage
 * - Megafauna Migrations
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

	const isSurface = layer === 0 || (world.layers && world.layers[layer]?.kind === 'surface');
	if (!isSurface) return;

	const month = typeof sim.month === 'number' ? sim.month : 0;
	const season = getSeason(month);
	const cells = world.cells;
	if (!cells) return;

	const pad = 30;
	ctx.save();

	// 1. Seasonal Ambient Atmosphere
	if (season.season === 'winter') {
		const cx = viewportW * 0.5;
		const cy = viewportH * 0.5;
		const rInner = Math.min(viewportW, viewportH) * 0.3;
		const rOuter = Math.hypot(viewportW, viewportH) * 0.55;
		const grad = ctx.createRadialGradient(cx, cy, rInner, cx, cy, rOuter);
		grad.addColorStop(0, 'rgba(235, 245, 255, 0)');
		grad.addColorStop(0.75, 'rgba(215, 235, 255, 0.08)');
		grad.addColorStop(1, 'rgba(186, 230, 253, 0.22)');
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, viewportW, viewportH);
	} else if (season.season === 'autumn') {
		const cx = viewportW * 0.5;
		const cy = viewportH * 0.5;
		const rInner = Math.min(viewportW, viewportH) * 0.35;
		const rOuter = Math.hypot(viewportW, viewportH) * 0.55;
		const grad = ctx.createRadialGradient(cx, cy, rInner, cx, cy, rOuter);
		grad.addColorStop(0, 'rgba(245, 158, 11, 0)');
		grad.addColorStop(1, 'rgba(217, 119, 6, 0.08)');
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, viewportW, viewportH);
	} else if (season.season === 'spring') {
		const cx = viewportW * 0.5;
		const cy = viewportH * 0.5;
		const rInner = Math.min(viewportW, viewportH) * 0.3;
		const rOuter = Math.hypot(viewportW, viewportH) * 0.55;
		const grad = ctx.createRadialGradient(cx, cy, rInner, cx, cy, rOuter);
		grad.addColorStop(0, 'rgba(74, 222, 128, 0.03)');
		grad.addColorStop(1, 'rgba(16, 185, 129, 0.06)');
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, viewportW, viewportH);
	}

	// 2. Dynamic Snowlines & Snow Caps
	const n = cells.n ?? 0;
	const dotR = Math.max(1.8, Math.min(6.5, 2.2 * Math.sqrt(k)));

	for (let i = 0; i < n; i += 3) {
		if (isCellSnowbound(world, i, season)) {
			const [sx, sy] = S(cells.x[i], cells.y[i]);
			if (sx < -pad || sy < -pad || sx > viewportW + pad || sy > viewportH + pad) continue;

			const elev = cells.h ? cells.h[i] : 0;
			const isPeak = elev >= 75;

			ctx.fillStyle = isPeak
				? 'rgba(255, 255, 255, 0.75)'
				: 'rgba(224, 242, 254, 0.45)';

			ctx.beginPath();
			ctx.arc(sx, sy, isPeak ? dotR * 1.4 : dotR, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	// 3. Frozen Rivers (in Winter over snowbound cells)
	if (season.season === 'winter' && world.rivers) {
		ctx.strokeStyle = '#e0f2fe';
		ctx.lineWidth = Math.max(1.5, Math.min(4.5, 1.8 * Math.sqrt(k)));

		for (let r = 0; r < world.rivers.length; r++) {
			const river = world.rivers[r];
			if (!river || !river.cells || river.cells.length < 2) continue;

			ctx.beginPath();
			let hasDrawn = false;
			for (let idx = 0; idx < river.cells.length; idx++) {
				const cIdx = river.cells[idx];
				if (isCellSnowbound(world, cIdx, season)) {
					const [sx, sy] = S(cells.x[cIdx], cells.y[cIdx]);
					if (!hasDrawn) {
						ctx.moveTo(sx, sy);
						hasDrawn = true;
					} else {
						ctx.lineTo(sx, sy);
					}
				} else {
					hasDrawn = false;
				}
			}
			ctx.stroke();
		}
	}

	// 4. Seasonal Deciduous Foliage (Autumn Amber/Gold & Spring Blossoms)
	if (season.season === 'autumn' || season.season === 'spring') {
		const foliageR = Math.max(2, Math.min(5.5, 2.4 * Math.sqrt(k)));

		for (let i = 0; i < n; i += 4) {
			if (isTemperateForest(world, i)) {
				const [sx, sy] = S(cells.x[i], cells.y[i]);
				if (sx < -pad || sy < -pad || sx > viewportW + pad || sy > viewportH + pad) continue;

				if (season.season === 'autumn') {
					ctx.fillStyle = i % 3 === 0
						? 'rgba(180, 83, 9, 0.45)' // russet
						: i % 3 === 1
							? 'rgba(234, 88, 12, 0.42)' // amber
							: 'rgba(234, 179, 8, 0.38)'; // goldenrod
				} else {
					ctx.fillStyle = i % 2 === 0
						? 'rgba(134, 239, 172, 0.38)' // lime
						: 'rgba(244, 114, 182, 0.32)'; // cherry blossom
				}

				ctx.beginPath();
				ctx.arc(sx, sy, foliageR, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	}

	// 5. Megafauna Migrations (Oceanic Leviathans, Sky-Whales, Tundra Mammoths)
	const worldW = world.opts?.width ?? 1200;
	const worldH = world.opts?.height ?? 800;
	const phase = (month / 12) * Math.PI * 2;

	// a) Oceanic Leviathan Pod
	const levX = (worldW * 0.5) + Math.cos(phase) * (worldW * 0.38);
	const levY = (worldH * 0.5) + Math.sin(phase) * (worldH * 0.28);
	const [lsx, lsy] = S(levX, levY);

	if (lsx >= -pad && lsy >= -pad && lsx <= viewportW + pad && lsy <= viewportH + pad) {
		ctx.font = `${Math.max(12, Math.min(22, 14 * Math.sqrt(k)))}px sans-serif`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('🐋', lsx, lsy);

		// Water wake ripples
		ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(lsx, lsy, 16, 0, Math.PI * 2);
		ctx.stroke();
	}

	// b) Aetheric Sky-Whale
	const skyPhase = phase + Math.PI * 0.5;
	const skyX = (worldW * 0.45) + Math.sin(skyPhase) * (worldW * 0.35);
	const skyY = (worldH * 0.4) + Math.cos(skyPhase) * (worldH * 0.25);
	const [ssx, ssy] = S(skyX, skyY);

	if (ssx >= -pad && ssy >= -pad && ssx <= viewportW + pad && ssy <= viewportH + pad) {
		ctx.font = `${Math.max(12, Math.min(22, 14 * Math.sqrt(k)))}px sans-serif`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('🕊️', ssx, ssy);

		ctx.strokeStyle = 'rgba(192, 132, 252, 0.4)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(ssx, ssy, 14, 0, Math.PI * 2);
		ctx.stroke();
	}

	// c) Tundra Mammoth Herd
	const mamPhase = Math.sin(phase);
	const mamX = (worldW * 0.3) + mamPhase * (worldW * 0.15);
	const mamY = (worldH * 0.18) + Math.abs(mamPhase) * (worldH * 0.12);
	const [msx, msy] = S(mamX, mamY);

	if (msx >= -pad && msy >= -pad && msx <= viewportW + pad && msy <= viewportH + pad) {
		ctx.font = `${Math.max(12, Math.min(22, 14 * Math.sqrt(k)))}px sans-serif`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('🦣', msx, msy);

		ctx.fillStyle = 'rgba(217, 119, 6, 0.35)';
		ctx.beginPath();
		ctx.arc(msx, msy + 6, 6, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.restore();
}
