import { describe, expect, it } from 'vitest';
import { generateWorld } from './index';
import type { GenInput, HeightImage } from './types';

const base: GenInput = { seed: 'earth-test', cells: 10000, states: 8, width: 2000, height: 1000, wrapX: true, depth: 0, sky: false, sea: false };

/** height of the cell nearest a lon/lat on a wrapX world (2:1, whole globe) */
function heightAt(w: ReturnType<typeof generateWorld>, lon: number, lat: number) {
	const W = w.opts.width, H = w.opts.height;
	const x = ((lon + 180) / 360) * W, y = ((90 - lat) / 180) * H;
	const c = w.cells;
	let best = 0, bd = Infinity;
	for (let i = 0; i < c.n; i++) {
		const d = (c.x[i] - x) ** 2 + (c.y[i] - y) ** 2;
		if (d < bd) { bd = d; best = i; }
	}
	return c.h[best];
}

describe('earth template', () => {
	const a = generateWorld({ ...base, template: 'earth' });
	it('is deterministic per seed and varies between seeds', () => {
		const b = generateWorld({ ...base, template: 'earth' });
		expect(Array.from(b.cells.h)).toEqual(Array.from(a.cells.h));
		const c = generateWorld({ ...base, seed: 'other', template: 'earth' });
		expect(Array.from(c.cells.h)).not.toEqual(Array.from(a.cells.h));
	});
	it('has an Earth-like land fraction at 10K cells', () => {
		let land = 0;
		for (let i = 0; i < a.cells.n; i++) if (a.cells.h[i] >= 20) land++;
		const f = land / a.cells.n;
		expect(f).toBeGreaterThan(0.2);
		expect(f).toBeLessThan(0.45);
	});
	it('puts Eurasia, Africa and the Americas on the map and the Pacific at sea', () => {
		expect(heightAt(a, 80, 50)).toBeGreaterThanOrEqual(20); // Kazakhstan
		expect(heightAt(a, 20, 5)).toBeGreaterThanOrEqual(20); // Congo
		expect(heightAt(a, -60, -10)).toBeGreaterThanOrEqual(20); // Brazil
		expect(heightAt(a, -100, 40)).toBeGreaterThanOrEqual(20); // USA
		expect(heightAt(a, -150, 0)).toBeLessThan(20); // mid-Pacific
		expect(heightAt(a, -30, 30)).toBeLessThan(20); // mid-Atlantic
		expect(heightAt(a, 85, 28)).toBeGreaterThan(55); // Himalaya
	});
	it('mirrors with flipX', () => {
		const f = generateWorld({ ...base, template: 'earth', flipX: true });
		expect(heightAt(f, -80, 50)).toBeGreaterThanOrEqual(20);
		expect(heightAt(f, 150, 0)).toBeLessThan(20);
	});
	it('works unwrapped, with the default climate window', () => {
		const w = generateWorld({ ...base, wrapX: false, width: 1600, template: 'earth', cells: 3000 });
		expect(w.cells.n).toBeGreaterThan(2000);
	});
});

describe('image template', () => {
	const W = 64, H = 32;
	const data = new Uint8Array(W * H);
	for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) data[y * W + x] = Math.round((x / (W - 1)) * 255);
	const heightImage: HeightImage = { w: W, h: H, data };
	const opts: GenInput = { seed: 'img', cells: 4000, states: 6, width: 1600, height: 1000, depth: 0, sky: false, sea: false, template: 'image', heightImage };
	const w = generateWorld(opts);
	it('makes land where the picture is bright and sea where it is dark', () => {
		const c = w.cells;
		let left = 0, nl = 0, right = 0, nr = 0;
		for (let i = 0; i < c.n; i++) {
			if (c.x[i] < 1600 * 0.15) { nl++; if (c.h[i] >= 20) left++; }
			if (c.x[i] > 1600 * 0.85) { nr++; if (c.h[i] >= 20) right++; }
		}
		expect(left / nl).toBeLessThan(0.05);
		expect(right / nr).toBeGreaterThan(0.95);
	});
	it('can be inverted', () => {
		const inv = generateWorld({ ...opts, invertImage: true });
		let leftLand = 0, nl = 0;
		for (let i = 0; i < inv.cells.n; i++) if (inv.cells.x[i] < 1600 * 0.15) { nl++; if (inv.cells.h[i] >= 20) leftLand++; }
		expect(leftLand / nl).toBeGreaterThan(0.95);
	});
	it('does not keep the picture in the saved world, and falls back to continents without one', () => {
		expect(w.opts.heightImage).toBeUndefined();
		const fb = generateWorld({ ...opts, heightImage: undefined });
		const cont = generateWorld({ ...opts, heightImage: undefined, template: 'continents' });
		expect(Array.from(fb.cells.h)).toEqual(Array.from(cont.cells.h));
	});
});

describe('existing templates are unchanged', () => {
	// FNV-1a of cells.h, captured before the earth/image templates existed
	const GOLDEN: Record<string, [number, number]> = {
		continents: [3202486461, 1408199382],
		archipelago: [4083241165, 2447266223],
		pangea: [1761584298, 141043200],
		highIsland: [1349931753, 3830414098],
		inlandSea: [3565423012, 3047565277],
		peninsulas: [913400719, 4229358631]
	};
	for (const [template, [flat, wrapped]] of Object.entries(GOLDEN))
		it(template, () => {
			for (const [wrapX, want] of [[false, flat], [true, wrapped]] as const) {
				const w = generateWorld({ seed: 'golden', template: template as never, cells: 2000, states: 8, width: 1600, height: 1000, wrapX, depth: 0, sky: false, sea: false });
				let h = 2166136261;
				for (let i = 0; i < w.cells.n; i++) h = Math.imul(h ^ w.cells.h[i], 16777619) >>> 0;
				expect(h).toBe(want);
			}
		});
});
