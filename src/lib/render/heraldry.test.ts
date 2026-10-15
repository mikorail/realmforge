import { describe, expect, it } from 'vitest';
import {
	generateHeraldry,
	heraldrySvg,
	drawHeraldry,
	getRealmCoatOfArms,
	getBurgCoatOfArms,
	SHIELD_SHAPES,
	DIVISIONS,
	CHARGE_KINDS,
	type CoatOfArms
} from './heraldry';

describe('heraldry procedural generation', () => {
	it('is deterministic: same seed produces identical CoatOfArms', () => {
		const seed = 'test-heraldry-seed-42';
		const coa1 = generateHeraldry(seed);
		const coa2 = generateHeraldry(seed);

		expect(coa1).toEqual(coa2);
		expect(coa1.blazon).toBe(coa2.blazon);
		expect(coa1.emblem).toBe(coa2.emblem);
	});

	it('produces identical SVG output when given the same seed and size', () => {
		const seed = 'reproducible-world-seed-99';
		const coa = generateHeraldry(seed);
		const svg1 = heraldrySvg(coa, 64);
		// Note: each call to heraldrySvg increments a unique clip ID to prevent DOM conflicts,
		// but the geometric paths and colors must be completely identical.
		const normalizeSvg = (svg: string) => svg.replace(/rf-coa-clip-\d+/g, 'clip-id');
		expect(normalizeSvg(svg1)).toBe(normalizeSvg(heraldrySvg(coa, 64)));
	});

	it('supports all shield shapes and produces valid SVG for each', () => {
		for (const shape of SHIELD_SHAPES) {
			const coa: CoatOfArms = {
				shape,
				division: 'plain',
				tinctureA: '#dc2626',
				tinctureB: '#f59e0b',
				charge: { kind: 'lion', color: '#f59e0b', count: 1 },
				blazon: 'Gules, a lion rampant Or.',
				emblem: 'M -3,-20 L 3,-20 Z'
			};
			const svg = heraldrySvg(coa, 96);
			expect(svg).toContain('<svg');
			expect(svg).toContain('viewBox="0 0 100 100"');
			expect(svg).toContain('width="96"');
			expect(svg).toContain('height="96"');
			expect(svg).toContain('clipPath');
			expect(svg).toContain('</svg>');
		}
	});

	it('supports all divisions and produces valid SVG for each', () => {
		for (const division of DIVISIONS) {
			const coa: CoatOfArms = {
				shape: 'heater',
				division,
				tinctureA: '#2563eb',
				tinctureB: '#e2e8f0',
				charge: { kind: 'sword', color: '#f59e0b', count: 2 },
				blazon: `Azure, a ${division} Argent.`,
				emblem: 'M 0,-21 L 0,21 Z'
			};
			const svg = heraldrySvg(coa, 64);
			expect(svg).toContain('<svg');
			expect(svg).toContain('</svg>');
			expect(svg).toContain(coa.tinctureA);
			if (division !== 'plain') {
				expect(svg).toContain(coa.tinctureB);
			}
		}
	});

	it('supports all 18 charge kinds', () => {
		for (const kind of CHARGE_KINDS) {
			const coa = generateHeraldry(`seed-charge-${kind}`, undefined, undefined, undefined);
			expect(coa.charge.kind).toBeDefined();
			const svg = heraldrySvg(coa, 64);
			expect(svg).toContain('<path');
			expect(svg).toContain(coa.charge.color);
		}
	});

	it('ensures zero em dashes appear in any generated blazon across hundreds of seeds', () => {
		const ideologies = ['monarchy', 'republic', 'theocracy', 'oligarchy', 'autocracy', 'communal', 'technocracy'];
		const spheres = ['sea', 'norse', 'sinic', 'indic', 'persian', 'latin', 'celtic', 'eldritch'];

		for (let i = 0; i < 200; i++) {
			const seed = `blazon-check-seed-${i}`;
			const ideology = ideologies[i % ideologies.length];
			const sphere = spheres[i % spheres.length];
			const coa = generateHeraldry(seed, undefined, sphere, ideology);

			expect(coa.blazon).not.toContain('—');
			expect(coa.blazon.length).toBeGreaterThan(5);
			expect(coa.blazon.endsWith('.')).toBe(true);
		}
	});

	it('influences charge selection based on ideology and sphere', () => {
		// Seafaring sphere should strongly bias towards anchors/stars/sun
		let seaAnchors = 0;
		for (let i = 0; i < 40; i++) {
			const coa = generateHeraldry(`sea-test-${i}`, undefined, 'sea', undefined);
			if (coa.charge.kind === 'anchor' || coa.charge.kind === 'star' || coa.charge.kind === 'sun') {
				seaAnchors++;
			}
		}
		expect(seaAnchors).toBeGreaterThan(12);

		// Monarchy should bias towards crown, lion, eagle, sword
		let royalSymbols = 0;
		for (let i = 0; i < 40; i++) {
			const coa = generateHeraldry(`monarchy-test-${i}`, undefined, undefined, 'monarchy');
			if (['crown', 'lion', 'eagle', 'sword', 'dragon'].includes(coa.charge.kind)) {
				royalSymbols++;
			}
		}
		expect(royalSymbols).toBeGreaterThan(15);
	});

	it('drawHeraldry executes cleanly on a Canvas2D rendering context', () => {
		const coa = generateHeraldry('canvas-draw-test');
		const mockCalls: string[] = [];

		const mockCtx = {
			save: () => mockCalls.push('save'),
			restore: () => mockCalls.push('restore'),
			translate: (x: number, y: number) => mockCalls.push(`translate(${x},${y})`),
			scale: (x: number, y: number) => mockCalls.push(`scale(${x},${y})`),
			beginPath: () => mockCalls.push('beginPath'),
			closePath: () => mockCalls.push('closePath'),
			clip: () => mockCalls.push('clip'),
			moveTo: (x: number, y: number) => mockCalls.push(`moveTo(${x},${y})`),
			lineTo: (x: number, y: number) => mockCalls.push(`lineTo(${x},${y})`),
			bezierCurveTo: () => mockCalls.push('bezierCurveTo'),
			arc: () => mockCalls.push('arc'),
			fillRect: (x: number, y: number, w: number, h: number) => mockCalls.push(`fillRect(${x},${y},${w},${h})`),
			fill: () => mockCalls.push('fill'),
			stroke: () => mockCalls.push('stroke'),
			fillStyle: '',
			strokeStyle: '',
			lineWidth: 1
		} as unknown as CanvasRenderingContext2D;

		expect(() => drawHeraldry(mockCtx, coa, 10, 20, 64)).not.toThrow();
		expect(mockCalls).toContain('save');
		expect(mockCalls).toContain('restore');
		expect(mockCalls).toContain('translate(10,20)');
		expect(mockCalls).toContain('clip');
		expect(mockCalls).toContain('stroke');
	});

	it('getRealmCoatOfArms generates consistent arms for polities', () => {
		const seed = 'world-seed-1234';
		const pol = {
			id: 3,
			color: '#ef4444',
			sphere: 'latin',
			ideology: 'monarchy'
		};

		const coa1 = getRealmCoatOfArms(seed, pol);
		const coa2 = getRealmCoatOfArms(seed, pol);

		expect(coa1).toEqual(coa2);
		expect(coa1.blazon).not.toContain('—');
		expect(coa1.tinctureA.toLowerCase()).toBe('#ef4444');
	});

	it('getBurgCoatOfArms generates distinct arms for ports vs landlocked settlements', () => {
		const seed = 'world-seed-5678';
		const inlandBurg = { id: 10, name: 'Stoneford', port: false };
		const portBurg = { id: 11, name: 'Seahaven', port: true };

		const coaInland = getBurgCoatOfArms(seed, inlandBurg);
		const coaPort = getBurgCoatOfArms(seed, portBurg);

		expect(coaInland).toBeDefined();
		expect(coaPort).toBeDefined();
		expect(coaInland.blazon).not.toContain('—');
		expect(coaPort.blazon).not.toContain('—');
		expect(coaInland.blazon).not.toBe(coaPort.blazon);
	});
});
