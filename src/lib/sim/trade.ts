import { SEA, type Cells, type World } from '../gen/types';
import type { Rng } from '../rng';

export type Commodity = 'grain' | 'timber' | 'iron' | 'silver' | 'spices' | 'silk' | 'crystals' | 'petroleum';

export interface CommodityDef {
	id: Commodity;
	name: string;
	icon: string;
	basePrice: number;
}

export const COMMODITIES: Record<Commodity, CommodityDef> = {
	grain: { id: 'grain', name: 'Grain and Wine', icon: '🌾', basePrice: 4 },
	timber: { id: 'timber', name: 'Hardwood Timber', icon: '🌲', basePrice: 6 },
	iron: { id: 'iron', name: 'Iron Ore', icon: '⛏', basePrice: 9 },
	silver: { id: 'silver', name: 'Silver and Gold', icon: '🪙', basePrice: 16 },
	spices: { id: 'spices', name: 'Rare Spices', icon: '🌶', basePrice: 14 },
	silk: { id: 'silk', name: 'Dyed Silk and Wool', icon: '🧵', basePrice: 11 },
	crystals: { id: 'crystals', name: 'Aether Crystals', icon: '💎', basePrice: 22 },
	petroleum: { id: 'petroleum', name: 'Mineral Pitch', icon: '🛢', basePrice: 18 }
};

export interface CaravanToken {
	id: number;
	fromBurg: number;
	toBurg: number;
	commodity: Commodity;
	pathCells: number[];
	progress: number; // 0.0 to 1.0
	x: number;
	y: number;
}

/** Determine primary commodity produced by a cell based on biome and geography */
export function cellCommodity(biome: number, h: number, isExotic = false): Commodity {
	if (isExotic) return 'crystals';
	if (h > 65) return h > 80 ? 'silver' : 'iron';
	// Biome mapping: 1,2: Tundra/Taiga; 3,4,5: Forest; 6,7,8: Plains/Grass; 9,10: Desert
	if (biome <= 2) return 'timber';
	if (biome >= 3 && biome <= 5) return 'timber';
	if (biome >= 6 && biome <= 8) return 'grain';
	if (biome >= 9 && biome <= 11) return 'spices';
	if (biome === 12 || biome === 13) return 'silk';
	return 'grain';
}

/** Spawn or advance trade caravans along active world routes */
export function updateCaravans(
	caravans: CaravanToken[],
	world: World,
	rng: Rng,
	maxCaravans = 14
): CaravanToken[] {
	const c = world.cells;
	const active: CaravanToken[] = [];

	// Advance existing caravans
	for (const cv of caravans) {
		cv.progress += 0.02;
		if (cv.progress < 1 && cv.pathCells.length >= 2) {
			const idx = Math.min(cv.pathCells.length - 2, Math.floor(cv.progress * (cv.pathCells.length - 1)));
			const t = (cv.progress * (cv.pathCells.length - 1)) - idx;
			const c0 = cv.pathCells[idx], c1 = cv.pathCells[idx + 1];
			cv.x = c.x[c0] * (1 - t) + c.x[c1] * t;
			cv.y = c.y[c0] * (1 - t) + c.y[c1] * t;
			active.push(cv);
		}
	}

	// Spawn new caravans if under quota
	if (active.length < maxCaravans && world.routes.length > 0 && rng.chance(0.35)) {
		const rt = rng.pick(world.routes);
		if (rt && rt.cells.length >= 2 && world.burgs[rt.a]?.alive && world.burgs[rt.b]?.alive) {
			const commodityKeys: Commodity[] = ['grain', 'timber', 'iron', 'silver', 'spices', 'silk'];
			const comm = rng.pick(commodityKeys);
			const b0 = world.burgs[rt.a];
			active.push({
				id: Math.floor(rng() * 1000000),
				fromBurg: rt.a,
				toBurg: rt.b,
				commodity: comm,
				pathCells: rt.cells,
				progress: 0,
				x: b0.x,
				y: b0.y
			});
		}
	}

	return active;
}
