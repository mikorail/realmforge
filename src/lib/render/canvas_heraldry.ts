import { getRealmCoatOfArms, drawHeraldry, type CoatOfArms } from './heraldry';
import { makeRng } from '../rng';

export type Surface = HTMLCanvasElement | OffscreenCanvas;

/** Cache of rendered heraldic banners keyed by seed:polityId:size */
const bannerBitmapCache = new Map<string, Surface>();

/** Create an offscreen drawing surface in browser or node environment */
export function createSurface(width: number, height: number): Surface | null {
	const w = Math.max(1, Math.ceil(width));
	const h = Math.max(1, Math.ceil(height));
	if (typeof OffscreenCanvas !== 'undefined') {
		return new OffscreenCanvas(w, h);
	}
	if (typeof document !== 'undefined') {
		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		return canvas;
	}
	return null;
}

/** Clear the heraldry bitmap cache */
export function clearHeraldryCache(): void {
	bannerBitmapCache.clear();
}

/** Return the number of cached coat of arms surfaces */
export function getHeraldryCacheSize(): number {
	return bannerBitmapCache.size;
}

/**
 * Retrieve or generate a cached bitmap surface of the coat of arms for a polity.
 * Keyed by seed and state ID so redraws at 60fps are simple blits.
 */
export function getCachedCoatOfArmsCanvas(
	seed: string,
	pol: { id: number; color?: string; sphere?: string; ideology?: string },
	renderSize = 64
): Surface | null {
	const cacheKey = `${seed}:${pol.id}:${renderSize}`;
	const existing = bannerBitmapCache.get(cacheKey);
	if (existing) return existing;

	const surface = createSurface(renderSize, renderSize);
	if (!surface) return null;

	const ctx = surface.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
	if (!ctx) return null;

	const coa = getRealmCoatOfArms(seed, pol);
	drawHeraldry(ctx as CanvasRenderingContext2D, coa, 0, 0, renderSize);

	bannerBitmapCache.set(cacheKey, surface);
	return surface;
}

/**
 * Calculate banner size scaling smoothly with zoom k between 12px and 26px.
 * Zoom threshold starts at k >= 0.85.
 */
export function getBannerSizeForZoom(k: number): number {
	if (k < 0.85) return 12;
	const progress = Math.min(1, Math.max(0, (k - 0.85) / 1.65));
	return Math.round(12 + progress * 14);
}

/**
 * Draw a fluttering banner with flagpole and coat of arms shield/flag.
 */
export function drawBannerFlag(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	coaCanvas: Surface | null,
	coa: CoatOfArms,
	accentColor?: string
): void {
	ctx.save();

	const poleHeight = Math.round(size * 1.85);
	const flagW = Math.round(size * 1.35);
	const flagH = Math.round(size * 0.95);
	const poleX = x;
	const poleBaseY = y;
	const poleTopY = y - poleHeight;

	// 1. Draw Flagpole
	ctx.beginPath();
	ctx.moveTo(poleX, poleBaseY);
	ctx.lineTo(poleX, poleTopY);
	ctx.strokeStyle = '#2b2116';
	ctx.lineWidth = Math.max(1.5, size * 0.08);
	ctx.lineCap = 'round';
	ctx.stroke();

	// 2. Brass finial ball on top of flagpole
	ctx.beginPath();
	const finialR = Math.max(1.8, size * 0.09);
	ctx.arc(poleX, poleTopY, finialR, 0, Math.PI * 2);
	ctx.fillStyle = '#ffd700';
	ctx.fill();
	ctx.strokeStyle = '#92400e';
	ctx.lineWidth = 0.8;
	ctx.stroke();

	// 3. Fluttering banner fabric extending to the right
	const bannerX = poleX + 1;
	const bannerY = poleTopY + finialR + 1;
	const waveOffset = Math.sin((x + y) * 0.05) * (size * 0.12);

	ctx.beginPath();
	ctx.moveTo(bannerX, bannerY);
	// Top waving edge
	ctx.quadraticCurveTo(
		bannerX + flagW * 0.5,
		bannerY - waveOffset,
		bannerX + flagW,
		bannerY + waveOffset * 0.5
	);
	// Swallowtail / triangular flag tail
	ctx.lineTo(bannerX + flagW - size * 0.25, bannerY + flagH * 0.5);
	ctx.lineTo(bannerX + flagW, bannerY + flagH);
	// Bottom waving edge
	ctx.quadraticCurveTo(
		bannerX + flagW * 0.5,
		bannerY + flagH - waveOffset,
		bannerX,
		bannerY + flagH
	);
	ctx.closePath();

	// Banner fabric fill
	ctx.fillStyle = accentColor || coa.tinctureA || '#dc2626';
	ctx.fill();
	ctx.strokeStyle = '#1e293b';
	ctx.lineWidth = 1.2;
	ctx.stroke();

	// 4. Render Coat of Arms shield inside the banner
	const shieldPad = Math.max(2, size * 0.1);
	const shieldSize = Math.max(8, flagH - shieldPad * 2);
	const shieldX = bannerX + shieldPad;
	const shieldY = bannerY + (flagH - shieldSize) * 0.5;

	if (coaCanvas) {
		try {
			ctx.drawImage(
				coaCanvas as CanvasImageSource,
				shieldX,
				shieldY,
				shieldSize,
				shieldSize
			);
		} catch {
			drawHeraldry(ctx, coa, shieldX, shieldY, shieldSize);
		}
	} else {
		drawHeraldry(ctx, coa, shieldX, shieldY, shieldSize);
	}

	ctx.restore();
}

/**
 * Draw citadel defensive heraldic shield marker on Canvas2D.
 */
export function drawCitadelShield(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	coaCanvas: Surface | null,
	coa: CoatOfArms
): void {
	ctx.save();

	const shieldSize = Math.round(size * 0.95);
	const ox = x - shieldSize * 0.5;
	const oy = y - shieldSize * 1.1;

	// Stone crenelated backing bracket
	ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
	ctx.beginPath();
	ctx.arc(x, y - shieldSize * 0.6, shieldSize * 0.65, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = '#cbd5e1';
	ctx.lineWidth = 1.5;
	ctx.stroke();

	if (coaCanvas) {
		try {
			ctx.drawImage(
				coaCanvas as CanvasImageSource,
				ox,
				oy,
				shieldSize,
				shieldSize
			);
		} catch {
			drawHeraldry(ctx, coa, ox, oy, shieldSize);
		}
	} else {
		drawHeraldry(ctx, coa, ox, oy, shieldSize);
	}

	ctx.restore();
}

/**
 * Draw an army regiment war banner above marching army tokens.
 */
export function drawRegimentBanner(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	coaCanvas: Surface | null,
	coa: CoatOfArms,
	armyColor: string
): void {
	ctx.save();

	const bannerW = Math.round(size * 1.1);
	const bannerH = Math.round(size * 0.8);
	const poleHeight = Math.round(size * 1.5);
	const topY = y - poleHeight;

	// Staff
	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.lineTo(x, topY);
	ctx.strokeStyle = '#1e293b';
	ctx.lineWidth = 1.6;
	ctx.stroke();

	// Golden spearhead finial
	ctx.beginPath();
	ctx.moveTo(x, topY - 3);
	ctx.lineTo(x - 2, topY);
	ctx.lineTo(x + 2, topY);
	ctx.closePath();
	ctx.fillStyle = '#f59e0b';
	ctx.fill();

	// Pennant flag
	const flagX = x + 1;
	const flagY = topY + 2;

	ctx.beginPath();
	ctx.moveTo(flagX, flagY);
	ctx.lineTo(flagX + bannerW, flagY + bannerH * 0.5);
	ctx.lineTo(flagX, flagY + bannerH);
	ctx.closePath();
	ctx.fillStyle = armyColor || coa.tinctureA || '#ef4444';
	ctx.fill();
	ctx.strokeStyle = '#0f172a';
	ctx.lineWidth = 1;
	ctx.stroke();

	// Small heraldic insignia
	const iconSize = Math.max(6, Math.round(bannerH * 0.6));
	const iconX = flagX + 2;
	const iconY = flagY + (bannerH - iconSize) * 0.5;

	if (coaCanvas) {
		try {
			ctx.drawImage(
				coaCanvas as CanvasImageSource,
				iconX,
				iconY,
				iconSize,
				iconSize
			);
		} catch {
			drawHeraldry(ctx, coa, iconX, iconY, iconSize);
		}
	} else {
		drawHeraldry(ctx, coa, iconX, iconY, iconSize);
	}

	ctx.restore();
}

/**
 * Main render function for canvas heraldry.
 * When zoom k >= 0.85, paints flagpole and fluttering heraldic banner at polity capital cells
 * and citadels, scaling flag size smoothly with zoom.
 * Also renders army regiment war banners above active frontline ArmyTokens.
 */
export function drawCanvasBanners(
	ctx: CanvasRenderingContext2D,
	sim: any,
	world: any,
	layer: number,
	k: number,
	S: (x: number, y: number) => [number, number]
): void {
	if (!sim || !world) return;
	if (k < 0.85) return;

	const flagSize = getBannerSizeForZoom(k);
	const worldSeed = world.opts?.seed || (sim.seed ? String(sim.seed) : 'realmforge');
	const polities = sim.polities || [];
	const burgs = world.burgs || [];

	const viewportW = ctx.canvas?.width ?? 2000;
	const viewportH = ctx.canvas?.height ?? 2000;
	const cullingPad = 80;

	const drawnBurgs = new Set<number>();

	// 1. Paint capital city banners
	for (const pol of polities) {
		if (!pol || !pol.alive || !pol.id) continue;
		const capId = pol.capital;
		if (!capId || !burgs[capId]) continue;

		const burg = burgs[capId];
		if (!burg.alive) continue;

		// Check layer
		const bLayer = typeof sim.burgLayer === 'function'
			? sim.burgLayer(burg)
			: (burg.layer === 'surface' || burg.layer === undefined ? 0 : 1);
		if (bLayer !== layer) continue;

		const [sx, sy] = S(burg.x, burg.y);
		if (
			sx < -cullingPad ||
			sy < -cullingPad ||
			sx > viewportW + cullingPad ||
			sy > viewportH + cullingPad
		) {
			continue;
		}

		drawnBurgs.add(capId);

		const coa = getRealmCoatOfArms(worldSeed, pol);
		const cachedCanvas = getCachedCoatOfArmsCanvas(worldSeed, pol, 64);

		drawBannerFlag(ctx, sx, sy, flagSize, cachedCanvas, coa, pol.color);
	}

	// 2. Paint citadel and fortress shields
	for (const burg of burgs) {
		if (!burg || !burg.alive || !burg.id) continue;
		if (drawnBurgs.has(burg.id)) continue;

		const isCitadel =
			burg.kind === 'Citadel' ||
			burg.kind === 'Fortress' ||
			burg.kind === 'Skyfort' ||
			(typeof burg.kind === 'string' &&
				(burg.kind.toLowerCase().includes('citadel') ||
					burg.kind.toLowerCase().includes('fort'))) ||
			(burg.districts && burg.districts.walls && burg.districts.walls >= 2) ||
			(burg.garrison && burg.garrison >= 120);

		if (!isCitadel) continue;

		const bLayer = typeof sim.burgLayer === 'function'
			? sim.burgLayer(burg)
			: (burg.layer === 'surface' || burg.layer === undefined ? 0 : 1);
		if (bLayer !== layer) continue;

		const [sx, sy] = S(burg.x, burg.y);
		if (
			sx < -cullingPad ||
			sy < -cullingPad ||
			sx > viewportW + cullingPad ||
			sy > viewportH + cullingPad
		) {
			continue;
		}

		const pol = polities[burg.state] || {
			id: burg.state || 0,
			color: '#94a3b8'
		};
		const coa = getRealmCoatOfArms(worldSeed, pol);
		const cachedCanvas = getCachedCoatOfArmsCanvas(worldSeed, pol, 64);

		drawCitadelShield(ctx, sx, sy, flagSize, cachedCanvas, coa);
	}

	// 3. Paint army regiment war banners above frontline ArmyTokens
	const armyTokens = sim.armyTokens;
	if (armyTokens && armyTokens.length > 0 && layer === 0) {
		const armyBannerSize = Math.max(10, Math.round(flagSize * 0.85));

		for (const ar of armyTokens) {
			const [ax, ay] = S(ar.x, ar.y);
			if (
				ax < -cullingPad ||
				ay < -cullingPad ||
				ax > viewportW + cullingPad ||
				ay > viewportH + cullingPad
			) {
				continue;
			}

			const pol = polities[ar.polityId] || {
				id: ar.polityId || 0,
				color: ar.color || '#ef4444'
			};
			const coa = getRealmCoatOfArms(worldSeed, pol);
			const cachedCanvas = getCachedCoatOfArmsCanvas(worldSeed, pol, 64);

			drawRegimentBanner(ctx, ax, ay, armyBannerSize, cachedCanvas, coa, ar.color);
		}
	}
}
