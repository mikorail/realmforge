import { describe, expect, it } from 'vitest';
import { generateWorld } from '../gen/index';
import { buildCellIndex, queryCells } from './renderer';

describe('terrain tile cell index', () => {
	const w = generateWorld({ seed: 'tiles', cells: 4000 });
	const c = w.cells;
	const { width: W, height: H } = w.opts;
	const ix = buildCellIndex(c, W, H);

	it('returns every cell whose polygon overlaps the rect, without duplicates', () => {
		const rects: [number, number, number, number][] = [
			[0, 0, W, H],
			[100, 100, 260, 230],
			[W - 80, H - 60, W + 50, H + 50],
			[-40, -40, 20, 20]
		];
		for (const [x0, y0, x1, y1] of rects) {
			const got = queryCells(ix, x0, y0, x1, y1);
			expect(new Set(got).size).toBe(got.length);
			const set = new Set(got);
			for (let i = 0; i < c.n; i++) {
				let hit = false;
				for (let k = c.polyStart[i]; k < c.polyStart[i + 1] && !hit; k++) {
					const x = c.polyXY[2 * k], y = c.polyXY[2 * k + 1];
					hit = x >= x0 && x <= x1 && y >= y0 && y <= y1;
				}
				if (hit) expect(set.has(i)).toBe(true);
			}
		}
	});
});
