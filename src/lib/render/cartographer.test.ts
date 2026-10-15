import { describe, expect, it, beforeEach } from 'vitest';
import {
	drawCanvasBanners,
	getCachedCoatOfArmsCanvas,
	clearHeraldryCache,
	getHeraldryCacheSize,
	getBannerSizeForZoom,
	drawBannerFlag,
	drawCitadelShield,
	drawRegimentBanner
} from './canvas_heraldry';
import {
	getSeason,
	isWinter,
	isSpring,
	isSummer,
	isAutumn,
	cellLatitude,
	isFrostEligible,
	isCellFrosty,
	isTemperateForest,
	renderSeasonalOverlay
} from './seasons';
import { getRealmCoatOfArms, generateHeraldry } from './heraldry';

describe('Seasonal cycle calculations for all 12 months', () => {
	it('maps every month 0..11 to the exact seasonal calendar mapping', () => {
		// Winter: months 11, 0, 1
		expect(getSeason(0).season).toBe('winter');
		expect(getSeason(1).season).toBe('winter');
		expect(getSeason(11).season).toBe('winter');

		// Spring: months 2, 3, 4
		expect(getSeason(2).season).toBe('spring');
		expect(getSeason(3).season).toBe('spring');
		expect(getSeason(4).season).toBe('spring');

		// Summer: months 5, 6, 7
		expect(getSeason(5).season).toBe('summer');
		expect(getSeason(6).season).toBe('summer');
		expect(getSeason(7).season).toBe('summer');

		// Autumn: months 8, 9, 10
		expect(getSeason(8).season).toBe('autumn');
		expect(getSeason(9).season).toBe('autumn');
		expect(getSeason(10).season).toBe('autumn');
	});

	it('provides correct seasonal names and icons for all 12 months', () => {
		for (let m = 0; m < 12; m++) {
			const info = getSeason(m);
			expect(info.name).toBeDefined();
			expect(info.icon).toBeDefined();
			expect(info.frostThreshold).toBeGreaterThan(0);

			if (m === 11 || m === 0 || m === 1) {
				expect(info.name).toBe('Winter');
				expect(info.icon).toBe('❄️');
			} else if (m >= 2 && m <= 4) {
				expect(info.name).toBe('Spring');
				expect(info.icon).toBe('🌱');
			} else if (m >= 5 && m <= 7) {
				expect(info.name).toBe('Summer');
				expect(info.icon).toBe('☀️');
			} else if (m >= 8 && m <= 10) {
				expect(info.name).toBe('Autumn');
				expect(info.icon).toBe('🍂');
			}
		}
	});

	it('handles wrapped and negative month values gracefully', () => {
		expect(getSeason(12).season).toBe('winter'); // 12 % 12 = 0
		expect(getSeason(13).season).toBe('winter'); // 13 % 12 = 1
		expect(getSeason(14).season).toBe('spring'); // 14 % 12 = 2
		expect(getSeason(-1).season).toBe('winter'); // -1 wraps to 11
		expect(getSeason(-2).season).toBe('autumn'); // -2 wraps to 10
	});

	it('helper boolean predicates align with seasonal definitions', () => {
		expect(isWinter(0)).toBe(true);
		expect(isWinter(1)).toBe(true);
		expect(isWinter(11)).toBe(true);
		expect(isWinter(6)).toBe(false);

		expect(isSpring(2)).toBe(true);
		expect(isSpring(3)).toBe(true);
		expect(isSpring(4)).toBe(true);
		expect(isSpring(0)).toBe(false);

		expect(isSummer(5)).toBe(true);
		expect(isSummer(6)).toBe(true);
		expect(isSummer(7)).toBe(true);
		expect(isSummer(2)).toBe(false);

		expect(isAutumn(8)).toBe(true);
		expect(isAutumn(9)).toBe(true);
		expect(isAutumn(10)).toBe(true);
		expect(isAutumn(5)).toBe(false);
	});
});

describe('Banner cache generation and stability', () => {
	beforeEach(() => {
		clearHeraldryCache();
	});

	it('smoothly scales banner size between 12px and 26px based on zoom k', () => {
		expect(getBannerSizeForZoom(0.5)).toBe(12);
		expect(getBannerSizeForZoom(0.84)).toBe(12);
		expect(getBannerSizeForZoom(0.85)).toBe(12);
		expect(getBannerSizeForZoom(1.675)).toBeGreaterThanOrEqual(18);
		expect(getBannerSizeForZoom(1.675)).toBeLessThanOrEqual(20);
		expect(getBannerSizeForZoom(2.5)).toBe(26);
		expect(getBannerSizeForZoom(4.0)).toBe(26);
	});

	it('caches rendered coat of arms bitmaps by seed and polity id', () => {
		const seed = 'cartographer-realm-seed-77';
		const pol = { id: 3, color: '#dc2626', sphere: 'norse' };

		expect(getHeraldryCacheSize()).toBe(0);

		const canvas1 = getCachedCoatOfArmsCanvas(seed, pol, 64);
		if (canvas1) {
			expect(getHeraldryCacheSize()).toBe(1);

			// Subsequent call with identical parameters returns the cached instance
			const canvas2 = getCachedCoatOfArmsCanvas(seed, pol, 64);
			expect(canvas2).toBe(canvas1);
			expect(getHeraldryCacheSize()).toBe(1);

			// Different polity id produces a new cache entry
			const pol2 = { id: 4, color: '#2563eb', sphere: 'sinic' };
			const canvas3 = getCachedCoatOfArmsCanvas(seed, pol2, 64);
			expect(canvas3).not.toBe(canvas1);
			expect(getHeraldryCacheSize()).toBe(2);

			// Clearing cache resets count
			clearHeraldryCache();
			expect(getHeraldryCacheSize()).toBe(0);
		}
	});

	it('drawCanvasBanners skips rendering when zoom k is below 0.85 threshold', () => {
		let drawCalls = 0;
		const mockCtx = {
			save: () => drawCalls++,
			restore: () => drawCalls++,
			beginPath: () => drawCalls++
		} as unknown as CanvasRenderingContext2D;

		const mockSim = {
			seed: 'world-42',
			polities: [{ id: 1, alive: true, capital: 1, color: '#ef4444' }],
			armyTokens: []
		};
		const mockWorld = {
			opts: { seed: 'world-42' },
			burgs: [{ id: 1, alive: true, x: 100, y: 100, layer: 'surface' }]
		};

		drawCanvasBanners(mockCtx, mockSim, mockWorld, 0, 0.75, (x, y) => [x, y]);
		expect(drawCalls).toBe(0);
	});

	it('drawCanvasBanners renders banners at polity capitals when k >= 0.85', () => {
		const mockOperations: string[] = [];
		const mockCtx = {
			save: () => mockOperations.push('save'),
			restore: () => mockOperations.push('restore'),
			translate: () => mockOperations.push('translate'),
			scale: () => mockOperations.push('scale'),
			clip: () => mockOperations.push('clip'),
			beginPath: () => mockOperations.push('beginPath'),
			closePath: () => mockOperations.push('closePath'),
			moveTo: () => mockOperations.push('moveTo'),
			lineTo: () => mockOperations.push('lineTo'),
			arc: () => mockOperations.push('arc'),
			rect: () => mockOperations.push('rect'),
			roundRect: () => mockOperations.push('roundRect'),
			quadraticCurveTo: () => mockOperations.push('quadraticCurveTo'),
			bezierCurveTo: () => mockOperations.push('bezierCurveTo'),
			fill: () => mockOperations.push('fill'),
			fillRect: () => mockOperations.push('fillRect'),
			stroke: () => mockOperations.push('stroke'),
			drawImage: () => mockOperations.push('drawImage'),
			fillStyle: '',
			strokeStyle: '',
			lineWidth: 1,
			lineCap: 'round',
			canvas: { width: 800, height: 600 }
		} as unknown as CanvasRenderingContext2D;

		const mockSim = {
			seed: 'test-seed-banners',
			polities: [
				null,
				{ id: 1, alive: true, capital: 1, color: '#dc2626', sphere: 'latin' }
			],
			burgLayer: () => 0,
			armyTokens: [
				{ id: 1, polityId: 1, x: 200, y: 200, color: '#dc2626' }
			]
		};

		const mockWorld = {
			opts: { seed: 'test-seed-banners', width: 1000, height: 1000 },
			burgs: [
				null,
				{ id: 1, alive: true, x: 150, y: 150, layer: 'surface' },
				{ id: 2, alive: true, x: 300, y: 300, kind: 'Citadel', state: 1, layer: 'surface' }
			]
		};

		drawCanvasBanners(mockCtx, mockSim, mockWorld, 0, 1.2, (x, y) => [x, y]);

		expect(mockOperations).toContain('save');
		expect(mockOperations).toContain('restore');
		expect(mockOperations).toContain('beginPath');
		expect(mockOperations).toContain('stroke');
		expect(mockOperations).toContain('fill');
	});
});

describe('Seasonal frost latitude rules and biomes', () => {
	it('evaluates frost eligibility based on northern latitude > 55 or alpine elevation > 70', () => {
		// Northern high latitude (> 55)
		expect(isFrostEligible(56, 10)).toBe(true);
		expect(isFrostEligible(70, 20)).toBe(true);
		expect(isFrostEligible(85, 0)).toBe(true);

		// Alpine elevation (> 70) regardless of latitude
		expect(isFrostEligible(10, 71)).toBe(true);
		expect(isFrostEligible(-20, 85)).toBe(true);
		expect(isFrostEligible(0, 95)).toBe(true);

		// Borderline cases
		expect(isFrostEligible(55, 70)).toBe(false);
		expect(isFrostEligible(55.1, 30)).toBe(true);
		expect(isFrostEligible(20, 70.1)).toBe(true);

		// Low latitude and low elevation
		expect(isFrostEligible(30, 25)).toBe(false);
		expect(isFrostEligible(0, 30)).toBe(false);
		expect(isFrostEligible(-45, 50)).toBe(false);
	});

	it('computes cell latitude from climate options accurately', () => {
		const worldWithClimate = {
			opts: {
				height: 1000,
				climate: { mapSize: 40, latitude: 35 }
			},
			cells: {
				y: [0, 500, 1000]
			}
		};

		const latTop = cellLatitude(worldWithClimate, 0);
		const latMid = cellLatitude(worldWithClimate, 1);
		const latBottom = cellLatitude(worldWithClimate, 2);

		expect(latTop).toBeGreaterThan(latMid);
		expect(latMid).toBeGreaterThan(latBottom);
	});

	it('identifies temperate forest biomes', () => {
		const mockWorld = {
			cells: {
				biome: [0, 6, 8, 1, 9]
			}
		};

		// Biome 6: Temperate deciduous forest
		expect(isTemperateForest(mockWorld, 1)).toBe(true);
		// Biome 8: Temperate rainforest
		expect(isTemperateForest(mockWorld, 2)).toBe(true);
		// Biome 0: Marine
		expect(isTemperateForest(mockWorld, 0)).toBe(false);
		// Biome 1: Hot desert
		expect(isTemperateForest(mockWorld, 3)).toBe(false);
	});

	it('renders seasonal overlay without exceptions across all four seasons', () => {
		const mockGradient = {
			addColorStop: () => {}
		};
		const mockOperations: string[] = [];
		const mockCtx = {
			save: () => mockOperations.push('save'),
			restore: () => mockOperations.push('restore'),
			beginPath: () => mockOperations.push('beginPath'),
			arc: () => mockOperations.push('arc'),
			fill: () => mockOperations.push('fill'),
			fillRect: () => mockOperations.push('fillRect'),
			createRadialGradient: () => mockGradient,
			fillStyle: '',
			canvas: { width: 800, height: 600 }
		} as unknown as CanvasRenderingContext2D;

		const mockWorld = {
			opts: { width: 1000, height: 1000 },
			cells: {
				n: 4,
				x: [100, 200, 300, 400],
				y: [50, 500, 200, 800],
				h: [80, 30, 40, 20],
				biome: [6, 1, 8, 3]
			}
		};

		// Test Winter (month 0)
		const simWinter = { month: 0 };
		renderSeasonalOverlay(mockCtx, simWinter, mockWorld, 0, 1, (x, y) => [x, y], 800, 600);
		expect(mockOperations).toContain('save');
		expect(mockOperations).toContain('fillRect');

		// Test Autumn (month 9)
		mockOperations.length = 0;
		const simAutumn = { month: 9 };
		renderSeasonalOverlay(mockCtx, simAutumn, mockWorld, 0, 1, (x, y) => [x, y], 800, 600);
		expect(mockOperations).toContain('save');
		expect(mockOperations).toContain('arc');

		// Test Spring (month 3)
		mockOperations.length = 0;
		const simSpring = { month: 3 };
		renderSeasonalOverlay(mockCtx, simSpring, mockWorld, 0, 1, (x, y) => [x, y], 800, 600);
		expect(mockOperations).toContain('save');

		// Test Summer (month 6)
		mockOperations.length = 0;
		const simSummer = { month: 6 };
		renderSeasonalOverlay(mockCtx, simSummer, mockWorld, 0, 1, (x, y) => [x, y], 800, 600);
		expect(mockOperations).toContain('save');
	});
});

describe('Determinism and zero em dashes verification', () => {
	it('strictly contains zero em dashes across heraldry blazons and seasons', () => {
		// Verify season names and blazons
		for (let m = 0; m < 12; m++) {
			const season = getSeason(m);
			expect(season.name).not.toContain('—');
			expect(season.icon).not.toContain('—');
		}

		// Verify heraldry coat of arms generated blazons
		for (let i = 0; i < 50; i++) {
			const coa = generateHeraldry(`cartographer-em-dash-test-${i}`);
			expect(coa.blazon).not.toContain('—');
		}
	});

	it('produces deterministic coat of arms and coordinates for the same seed', () => {
		const seed = 'deterministic-cartographer-test';
		const pol = { id: 7, color: '#f59e0b', sphere: 'desert', ideology: 'republic' };

		const coaA = getRealmCoatOfArms(seed, pol);
		const coaB = getRealmCoatOfArms(seed, pol);

		expect(coaA).toEqual(coaB);
		expect(coaA.blazon).toBe(coaB.blazon);
		expect(coaA.emblem).toBe(coaB.emblem);
	});
});
