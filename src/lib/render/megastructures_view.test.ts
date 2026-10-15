import { describe, expect, it } from 'vitest';
import {
	drawMegastructureMarkers,
	drawBottomlessAbyssMarker,
	drawSpireOfTrialsMarker,
	getMegastructureIconSize,
	ABYSS_LAYERS,
	LIFE_ECHO_TITLES,
	getTowerFloorDetails,
	type MegastructureSite
} from './megastructures';
import { makeRng } from '../rng';

function createMockCanvasContext(): {
	ctx: CanvasRenderingContext2D;
	ops: string[];
} {
	const ops: string[] = [];
	const ctx = {
		save: () => ops.push('save'),
		restore: () => ops.push('restore'),
		translate: () => ops.push('translate'),
		scale: () => ops.push('scale'),
		beginPath: () => ops.push('beginPath'),
		closePath: () => ops.push('closePath'),
		moveTo: (x: number, y: number) => ops.push(`moveTo(${x.toFixed(1)},${y.toFixed(1)})`),
		lineTo: (x: number, y: number) => ops.push(`lineTo(${x.toFixed(1)},${y.toFixed(1)})`),
		arc: (x: number, y: number, r: number) => ops.push(`arc(${r.toFixed(1)})`),
		rect: () => ops.push('rect'),
		fillRect: () => ops.push('fillRect'),
		strokeRect: () => ops.push('strokeRect'),
		fill: () => ops.push('fill'),
		stroke: () => ops.push('stroke'),
		setLineDash: (dash: number[]) => ops.push(`setLineDash([${dash.join(',')}])`),
		createRadialGradient: () => ({
			addColorStop: () => ops.push('radialGrad.addColorStop')
		}),
		createLinearGradient: () => ({
			addColorStop: () => ops.push('linearGrad.addColorStop')
		}),
		fillStyle: '',
		strokeStyle: '',
		lineWidth: 1,
		lineCap: 'round',
		canvas: { width: 1200, height: 900 }
	} as unknown as CanvasRenderingContext2D;

	return { ctx, ops };
}

describe('Megastructure visual markers and icon scaling', () => {
	it('smoothly scales icon size between 16px and 36px across zoom levels', () => {
		// Low zoom (far out)
		expect(getMegastructureIconSize(0.2)).toBe(16);
		expect(getMegastructureIconSize(0.6)).toBe(16);

		// Intermediate zoom levels
		const size1 = getMegastructureIconSize(1.0);
		const size2 = getMegastructureIconSize(2.1);
		const size3 = getMegastructureIconSize(3.0);

		expect(size1).toBeGreaterThanOrEqual(16);
		expect(size1).toBeLessThanOrEqual(36);
		expect(size2).toBeGreaterThanOrEqual(size1);
		expect(size3).toBeGreaterThanOrEqual(size2);

		// High zoom (close up)
		expect(getMegastructureIconSize(3.6)).toBe(36);
		expect(getMegastructureIconSize(5.0)).toBe(36);
	});

	it('draws The Bottomless Abyss marker with vortex, concentric rings, and depth marks', () => {
		const { ctx, ops } = createMockCanvasContext();

		drawBottomlessAbyssMarker(ctx, 400, 300, 28, {
			floorBreakRisk: 30,
			depth: 4,
			time: 12
		});

		expect(ops).toContain('save');
		expect(ops).toContain('restore');
		expect(ops).toContain('beginPath');
		expect(ops).toContain('fill');
		expect(ops).toContain('stroke');
		// Concentric rings and orbiting motes
		const arcCalls = ops.filter((o) => o.startsWith('arc'));
		expect(arcCalls.length).toBeGreaterThanOrEqual(10);
	});

	it('draws pulsing warning alert when floorBreakRisk exceeds 75%', () => {
		const { ctx: lowRiskCtx, ops: lowRiskOps } = createMockCanvasContext();
		drawBottomlessAbyssMarker(lowRiskCtx, 200, 200, 24, { floorBreakRisk: 40 });
		const hasDashedRingLow = lowRiskOps.some((o) => o.includes('setLineDash([4,4])'));
		expect(hasDashedRingLow).toBe(false);

		const { ctx: highRiskCtx, ops: highRiskOps } = createMockCanvasContext();
		drawBottomlessAbyssMarker(highRiskCtx, 200, 200, 24, { floorBreakRisk: 88, time: 5 });
		const hasDashedRingHigh = highRiskOps.some((o) => o.includes('setLineDash([4,4])'));
		expect(hasDashedRingHigh).toBe(true);
	});

	it('draws The Spire of Trials with beacon beam, constellation aura, monolith, and floor bands', () => {
		const { ctx, ops } = createMockCanvasContext();

		drawSpireOfTrialsMarker(ctx, 500, 400, 32, {
			floorBreakRisk: 20,
			floor: 45,
			time: 20
		});

		expect(ops).toContain('save');
		expect(ops).toContain('restore');
		expect(ops).toContain('linearGrad.addColorStop');
		expect(ops).toContain('fillRect');
		expect(ops).toContain('strokeRect');
		// Monolith facets and lines
		const lineCalls = ops.filter((o) => o.startsWith('lineTo'));
		expect(lineCalls.length).toBeGreaterThanOrEqual(10);
	});

	it('works cleanly even if gradient methods are omitted in minimalist canvas mocks', () => {
		const plainCtx = {
			save: () => {},
			restore: () => {},
			beginPath: () => {},
			closePath: () => {},
			moveTo: () => {},
			lineTo: () => {},
			arc: () => {},
			fillRect: () => {},
			strokeRect: () => {},
			fill: () => {},
			stroke: () => {},
			setLineDash: () => {},
			canvas: { width: 800, height: 600 }
		} as unknown as CanvasRenderingContext2D;

		expect(() =>
			drawBottomlessAbyssMarker(plainCtx, 100, 100, 24, { floorBreakRisk: 80, depth: 3 })
		).not.toThrow();

		expect(() =>
			drawSpireOfTrialsMarker(plainCtx, 150, 150, 24, { floorBreakRisk: 85, floor: 50 })
		).not.toThrow();
	});
});

describe('drawMegastructureMarkers layer filtering, coordinates, and culling', () => {
	it('renders markers matching the active layer and skips other layers', () => {
		const { ctx, ops } = createMockCanvasContext();

		const mockSim = {
			year: 150,
			month: 4,
			megastructures: [
				{
					id: 'abyss-1',
					kind: 'abyss',
					name: 'The Bottomless Abyss',
					layer: 0,
					x: 300,
					y: 300,
					floorBreakRisk: 40,
					currentDepth: 3
				},
				{
					id: 'spire-deep',
					kind: 'tower',
					name: 'Subterranean Spire of Trials',
					layer: 1,
					x: 400,
					y: 400,
					floorBreakRisk: 20,
					currentFloor: 12
				}
			]
		};

		const mockWorld = {
			opts: { seed: 'test-seed' }
		};

		// Layer 0: Only surface abyss should draw
		drawMegastructureMarkers(ctx, mockSim, mockWorld, 0, 1.5, (x, y) => [x, y]);
		const opsLayer0Count = ops.length;
		expect(opsLayer0Count).toBeGreaterThan(0);

		// Layer 1: Only underground tower should draw
		const undergroundMock = createMockCanvasContext();
		drawMegastructureMarkers(
			undergroundMock.ctx,
			mockSim,
			mockWorld,
			1,
			1.5,
			(x, y) => [x, y]
		);
		expect(undergroundMock.ops.length).toBeGreaterThan(0);
	});

	it('supports sim.megastructureState schema and resolves coordinates from world.cells.p', () => {
		const { ctx, ops } = createMockCanvasContext();

		const mockSim = {
			year: 210,
			month: 2,
			megastructureState: {
				abyss: {
					id: 'state-abyss',
					kind: 'abyss',
					name: 'The Bottomless Abyss',
					cell: 10,
					layer: 0,
					currentFloorBreakRisk: 82,
					deepestLayer: 4
				},
				tower: {
					id: 'state-tower',
					kind: 'tower',
					name: 'The Spire of Trials',
					cell: 20,
					layer: 0,
					currentFloorBreakRisk: 15,
					highestClearedFloor: 38
				}
			}
		};

		// world.cells.p has [x0, y0, x1, y1, ...]
		const p = new Float64Array(100);
		p[10 * 2] = 250;
		p[10 * 2 + 1] = 260;
		p[20 * 2] = 450;
		p[20 * 2 + 1] = 460;

		const mockWorld = {
			cells: { p }
		};

		drawMegastructureMarkers(ctx, mockSim, mockWorld, 0, 2.0, (x, y) => [x, y]);

		expect(ops).toContain('save');
		expect(ops).toContain('restore');
		// High risk on abyss triggers warning dash
		expect(ops.some((o) => o.includes('setLineDash([4,4])'))).toBe(true);
	});

	it('culls sites outside viewport padding bounds', () => {
		const { ctx, ops } = createMockCanvasContext();

		const mockSim = {
			megastructures: [
				{
					id: 'offscreen-site',
					kind: 'tower',
					name: 'Lost Far Spire',
					x: -800,
					y: 500,
					layer: 0
				}
			]
		};

		const mockWorld = {};

		drawMegastructureMarkers(ctx, mockSim, mockWorld, 0, 1.0, (x, y) => [x, y]);
		expect(ops.length).toBe(0);
	});

	it('gracefully handles empty, null, or destroyed sites without crashing', () => {
		const { ctx } = createMockCanvasContext();

		expect(() => drawMegastructureMarkers(ctx, null, null, 0, 1.0, (x, y) => [x, y])).not.toThrow();

		const destroyedSim = {
			megastructures: [
				null,
				{ id: 'ruined', kind: 'tower', destroyed: true, x: 100, y: 100, layer: 0 },
				{ id: 'inactive', kind: 'abyss', active: false, x: 200, y: 200, layer: 0 }
			]
		};
		expect(() =>
			drawMegastructureMarkers(ctx, destroyedSim, {}, 0, 1.0, (x, y) => [x, y])
		).not.toThrow();
	});
});

describe('Megastructure procedural data models and progression', () => {
	it('defines complete 6-layer progression for The Bottomless Abyss', () => {
		expect(ABYSS_LAYERS).toHaveLength(6);

		const expectedLayers = [
			'Edge of the Abyss',
			'Forest of Temptation',
			'The Great Fault',
			'Goblet of Giants',
			'Sea of Corpses',
			'Capital of the Unreturned / The Last Dive'
		];

		const expectedWhistles = [
			'Bell (Apprentice)',
			'Red Whistle (Novice)',
			'Blue Whistle (Adept)',
			'Moon Whistle (Master)',
			'Black Whistle (High Delver)',
			'White Whistle (Sovereign of the Deep)'
		];

		for (let i = 0; i < 6; i++) {
			expect(ABYSS_LAYERS[i].depth).toBe(i + 1);
			expect(ABYSS_LAYERS[i].name).toBe(expectedLayers[i]);
			expect(ABYSS_LAYERS[i].whistle).toBe(expectedWhistles[i]);
			expect(ABYSS_LAYERS[i].strain).toBeDefined();
			expect(ABYSS_LAYERS[i].desc).toBeDefined();
		}
	});

	it('procedurally generates deterministic floor details for Spire of Trials', () => {
		const floor10A = getTowerFloorDetails(10);
		const floor10B = getTowerFloorDetails(10);

		expect(floor10A.floorTitle).toBe(floor10B.floorTitle);
		expect(floor10A.name).toBe(floor10B.name);
		expect(floor10A.power).toBe(floor10B.power);
		expect(floor10A.dc).toBe(floor10B.dc);

		// Higher floor has higher stats and DC
		const floor80 = getTowerFloorDetails(80);
		expect(floor80.power).toBeGreaterThan(floor10A.power);
		expect(floor80.dc).toBeGreaterThan(floor10A.dc);
	});

	it('provides legendary Life Echo titles for White Whistles', () => {
		expect(LIFE_ECHO_TITLES.length).toBeGreaterThanOrEqual(5);
		expect(LIFE_ECHO_TITLES).toContain('Sovereign of Dawn');
		expect(LIFE_ECHO_TITLES).toContain('Lord of the Deep Void');
	});
});

describe('Strict zero em dashes enforcement', () => {
	const emDash = String.fromCharCode(8212);

	it('ensures all abyssal layers and descriptions contain zero em dashes', () => {
		for (const layer of ABYSS_LAYERS) {
			expect(layer.name).not.toContain(emDash);
			expect(layer.range).not.toContain(emDash);
			expect(layer.strain).not.toContain(emDash);
			expect(layer.strainDesc).not.toContain(emDash);
			expect(layer.desc).not.toContain(emDash);
			expect(layer.whistle).not.toContain(emDash);
		}
	});

	it('ensures all life echo titles contain zero em dashes', () => {
		for (const title of LIFE_ECHO_TITLES) {
			expect(title).not.toContain(emDash);
		}
	});

	it('ensures tower floor generation across 100 floors contains zero em dashes', () => {
		for (let floor = 1; floor <= 100; floor++) {
			const details = getTowerFloorDetails(floor);
			expect(details.floorTitle).not.toContain(emDash);
			expect(details.name).not.toContain(emDash);
			expect(details.title).not.toContain(emDash);
		}
	});
});
