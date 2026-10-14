import { describe, expect, it } from 'vitest';
import { withDefaults } from './options';
import { buildGrid } from './grid';
import { generateWorld } from './index';
import { makeRng } from '../rng';
import { sanitizeRace, setRaces, SPECIES_BY_ID } from './species';
import { buildEquirect, renderGlobe } from '../render/globe';
import { Simulation } from '../sim/engine';

describe('spherical world and wrapX', () => {
	it('enforces 2:1 ratio and whole-globe climate when wrapX is true', () => {
		const opts = withDefaults({ seed: 'wrap-test', wrapX: true, height: 400 });
		expect(opts.wrapX).toBe(true);
		expect(opts.width).toBe(800);
		expect(opts.climate.mapSize).toBe(100);
		expect(opts.climate.latitude).toBe(50);
	});

	it('creates seam links between east and west boundary cells when wrap is enabled', () => {
		const rng = makeRng('wrap-grid-test');
		const { cells } = buildGrid(rng, 1000, 600, 300, true);
		expect(cells.n).toBeGreaterThan(500);

		// At least some cells should have neighbor links crossing the east/west boundary
		let seamFound = false;
		for (let i = 0; i < cells.n; i++) {
			const x1 = cells.x[i];
			const start = cells.nStart[i];
			const end = cells.nStart[i + 1];
			for (let e = start; e < end; e++) {
				const n = cells.nList[e];
				const x2 = cells.x[n];
				if (Math.abs(x1 - x2) > 400) {
					seamFound = true;
					break;
				}
			}
			if (seamFound) break;
		}
		expect(seamFound).toBe(true);
	});
});

describe('globe azimuthal projections', () => {
	it('builds equirectangular raster and renders across all 4 azimuthal projections', () => {
		const world = generateWorld({ seed: 'globe-test', cells: 1000, width: 400, height: 200, wrapX: true });
		const sim = new Simulation(world);
		const raster = buildEquirect(sim, 'political', 180, 90);
		expect(raster.w).toBe(180);
		expect(raster.h).toBe(90);
		expect(raster.data.length).toBe(180 * 90 * 4);

		const S = 64;
		const img = {
			width: S,
			height: S,
			data: new Uint8ClampedArray(S * S * 4)
		} as ImageData;

		const projections = ['orthographic', 'equidistant', 'stereographic', 'gnomonic'] as const;
		for (const proj of projections) {
			img.data.fill(0);
			renderGlobe(raster, img, 0, 0, true, proj);
			// Center pixel must have opaque alpha
			const centerIdx = ((S / 2) * S + (S / 2)) * 4;
			expect(img.data[centerIdx + 3]).toBe(255);
		}
	});
});

describe('race configuration and single-race worlds', () => {
	it('allows creating mono-species worlds (e.g. 100% Dwarves or 100% Elves)', () => {
		const dwarfWorld = generateWorld({
			seed: 'dwarf-realm',
			cells: 1000,
			cultures: 6,
			races: { allow: ['dwarf'] }
		});
		const dwarfCultures = dwarfWorld.cultures.slice(1);
		expect(dwarfCultures.length).toBeGreaterThan(0);
		for (const c of dwarfCultures) {
			expect(c.species).toBe('dwarf');
		}

		const elfWorld = generateWorld({
			seed: 'elf-realm',
			cells: 1000,
			cultures: 6,
			races: { allow: ['elf'] }
		});
		const elfCultures = elfWorld.cultures.slice(1);
		expect(elfCultures.length).toBeGreaterThan(0);
		for (const c of elfCultures) {
			expect(c.species).toBe('elf');
		}
		setRaces(undefined);
	});

	it('supports custom forged species with custom stats and lifespans', () => {
		const draconian = sanitizeRace({
			name: 'Draconian',
			plural: 'Draconians',
			icon: '🐉',
			lifespanMult: 2.8,
			layers: ['surface', 'sky'],
			mods: { martial: 4, diplomacy: 1, stewardship: 2, intrigue: -1, health: 30 }
		}, 0);

		expect(draconian.id).toBe('x-draconian');
		expect(draconian.lifespanMult).toBe(2.8);
		expect(draconian.mods.martial).toBe(4);

		const world = generateWorld({
			seed: 'draconia',
			cells: 1000,
			cultures: 5,
			races: { allow: ['x-draconian'], custom: [draconian] }
		});

		const settledCultures = world.cultures.slice(1);
		expect(settledCultures.length).toBeGreaterThan(0);
		for (const c of settledCultures) {
			expect(c.species).toBe('x-draconian');
			const def = SPECIES_BY_ID[c.species!];
			expect(def).toBeDefined();
			expect(def.name).toBe('Draconian');
			expect(def.lifespanMult).toBe(2.8);
		}

		// Also check that a simulation runs smoothly with this custom species
		const sim = new Simulation(world);
		expect(sim.polities.length).toBeGreaterThan(0);
		for (let m = 0; m < 12; m++) sim.tick();
		expect(sim.year).toBe(2);
		setRaces(undefined);
	});
});
