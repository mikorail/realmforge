import { makeRng } from '../rng';

export type ShieldShape = 'heater' | 'round' | 'square' | 'banner' | 'spanish';

export type Division =
	| 'plain'
	| 'per_pale'
	| 'per_fess'
	| 'quarterly'
	| 'bend'
	| 'chevron'
	| 'saltire'
	| 'bordure';

export type StandardTincture = 'or' | 'argent' | 'gules' | 'azure' | 'vert' | 'sable' | 'purpure';

export type Tincture = StandardTincture | string;

export type ChargeKind =
	| 'lion'
	| 'eagle'
	| 'dragon'
	| 'crown'
	| 'sword'
	| 'tower'
	| 'sun'
	| 'crescent'
	| 'tree'
	| 'anchor'
	| 'star'
	| 'cross'
	| 'wolf'
	| 'scales'
	| 'wheat'
	| 'flame'
	| 'anvil'
	| 'skull';

export interface CoatOfArms {
	shape: ShieldShape;
	division: Division;
	tinctureA: string;
	tinctureB: string;
	charge: {
		kind: ChargeKind;
		color: string;
		count: 1 | 2 | 3;
	};
	blazon: string;
	emblem: string;
}

export interface TinctureInfo {
	name: string;
	hex: string;
	isMetal: boolean;
}

export const TINCTURES: Record<StandardTincture, TinctureInfo> = {
	or: { name: 'Or', hex: '#f59e0b', isMetal: true },
	argent: { name: 'Argent', hex: '#e2e8f0', isMetal: true },
	gules: { name: 'Gules', hex: '#dc2626', isMetal: false },
	azure: { name: 'Azure', hex: '#2563eb', isMetal: false },
	vert: { name: 'Vert', hex: '#16a34a', isMetal: false },
	sable: { name: 'Sable', hex: '#1e293b', isMetal: false },
	purpure: { name: 'Purpure', hex: '#7c3aed', isMetal: false }
};

export const SHIELD_SHAPES: ShieldShape[] = ['heater', 'round', 'square', 'banner', 'spanish'];

export const DIVISIONS: Division[] = [
	'plain',
	'per_pale',
	'per_fess',
	'quarterly',
	'bend',
	'chevron',
	'saltire',
	'bordure'
];

export const CHARGE_KINDS: ChargeKind[] = [
	'lion',
	'eagle',
	'dragon',
	'crown',
	'sword',
	'tower',
	'sun',
	'crescent',
	'tree',
	'anchor',
	'star',
	'cross',
	'wolf',
	'scales',
	'wheat',
	'flame',
	'anvil',
	'skull'
];

/** SVG path data for shield outlines (viewBox 0 0 100 100) */
export const SHIELD_PATHS: Record<ShieldShape, string> = {
	heater: 'M 12,10 L 88,10 L 88,48 C 88,74 50,94 50,94 C 50,94 12,74 12,48 Z',
	round: 'M 50,6 A 44,44 0 1 0 50,94 A 44,44 0 1 0 50,6 Z',
	square: 'M 12,10 L 88,10 C 88,10 88,78 88,80 C 88,86 84,90 78,90 L 22,90 C 16,90 12,86 12,80 Z',
	banner: 'M 14,8 L 86,8 L 86,70 L 50,94 L 14,70 Z',
	spanish: 'M 14,10 L 86,10 L 86,54 A 36,36 0 0 1 14,54 Z'
};

/** SVG path data for heraldic charges centered in [-22, 22] */
export const CHARGE_PATHS: Record<ChargeKind, string> = {
	lion: 'M -3,-20 C -2,-21 0,-21 1,-19 C 1,-18 0,-17 0,-16 C 3,-15 6,-12 6,-8 C 6,-5 4,-3 3,-1 C 5,1 7,5 7,10 C 7,13 9,17 11,19 L 8,20 C 6,18 5,15 4,13 C 3,16 1,19 -1,20 L -3,19 C -2,16 -1,13 -1,10 C -4,10 -6,8 -7,6 L -5,5 C -3,6 -1,6 0,5 C 0,2 -2,-1 -4,-3 L -11,-2 L -11,-5 L -6,-5 L -9,-9 L -7,-11 L -4,-8 C -3,-10 -3,-13 -5,-15 L -10,-16 L -9,-18 L -6,-17 C -6,-19 -7,-20 -9,-21 L -8,-22 C -6,-21 -5,-20 -4,-21 Z M 4,-5 C 7,-9 10,-15 7,-18 C 5,-21 2,-21 0,-20 L 0,-18 C 2,-19 4,-19 5,-17 C 6,-14 4,-9 2,-6 Z',
	eagle: 'M -3,-17 C -5,-17 -8,-16 -9,-14 L -6,-14 C -5,-12 -4,-12 -3,-10 C -6,-9 -10,-10 -15,-16 L -16,-14 C -12,-9 -9,-5 -14,-7 L -15,-5 C -10,-2 -7,1 -12,2 L -12,4 C -7,4 -5,2 -7,7 L -9,8 C -5,9 -4,7 -4,11 L -7,15 L -5,16 L -3,13 L -3,16 L -1,18 L -1,21 L 1,21 L 1,18 L 3,16 L 3,13 L 5,16 L 7,15 L 4,11 C 4,7 5,9 9,8 L 7,7 C 5,2 7,4 12,4 L 12,2 C 7,1 10,-2 15,-5 L 14,-7 C 9,-5 12,-9 16,-14 L 15,-16 C 10,-10 6,-9 3,-10 C 4,-12 5,-12 6,-14 L 3,-14 C 2,-16 -1,-17 -3,-17 Z',
	dragon: 'M -12,-18 C -9,-18 -7,-16 -6,-14 C -4,-15 -2,-15 0,-13 C 2,-14 4,-13 6,-10 C 9,-14 13,-17 17,-18 L 16,-15 C 13,-14 10,-11 12,-7 C 15,-8 17,-7 19,-5 L 17,-4 C 14,-5 11,-4 10,-1 C 12,3 13,8 11,13 C 14,13 17,11 19,8 L 20,10 C 17,14 13,16 9,16 C 7,19 4,21 0,21 L 1,19 C 4,19 6,17 7,15 C 4,16 1,15 -1,13 C -3,14 -6,14 -8,13 C -9,16 -12,18 -15,19 L -14,17 C -12,16 -10,14 -9,11 C -11,9 -12,6 -12,3 C -14,3 -16,4 -18,6 L -19,4 C -17,2 -14,1 -13,-1 C -15,-2 -17,-2 -19,-2 L -19,-4 C -16,-4 -14,-3 -13,-4 C -14,-7 -14,-10 -12,-12 C -15,-12 -17,-13 -19,-15 L -19,-17 C -16,-16 -14,-15 -12,-15 C -13,-17 -14,-17 -12,-18 Z',
	crown: 'M -18,10 L 18,10 L 18,15 L -18,15 Z M -18,9 L -18,-4 L -13,3 L -7,-9 L 0,4 L 7,-9 L 13,3 L 18,-4 L 18,9 Z M -18,-5 A 1.8,1.8 0 1 0 -18,-8.6 A 1.8,1.8 0 1 0 -18,-5 Z M -7,-10 A 1.8,1.8 0 1 0 -7,-13.6 A 1.8,1.8 0 1 0 -7,-10 Z M 7,-10 A 1.8,1.8 0 1 0 7,-13.6 A 1.8,1.8 0 1 0 7,-10 Z M 18,-5 A 1.8,1.8 0 1 0 18,-8.6 A 1.8,1.8 0 1 0 18,-5 Z M 0,2 A 1.8,1.8 0 1 0 0,-1.6 A 1.8,1.8 0 1 0 0,2 Z',
	sword: 'M 0,-21 L 2.5,-16 L 2,4 L 12,4 L 13,2 L 14,4 L 14,7 L 12,7 L 2,7 L 1.5,15 L 3.5,15 L 3.5,18 L 2.5,18 C 2.5,19.5 1.5,21 0,21 C -1.5,21 -2.5,19.5 -2.5,18 L -3.5,18 L -3.5,15 L -1.5,15 L -2,7 L -12,7 L -14,7 L -14,4 L -13,2 L -12,4 L -2,4 L -2.5,-16 Z',
	tower: 'M -15,-15 L -9,-15 L -9,-10 L -4,-10 L -4,-15 L 4,-15 L 4,-10 L 9,-10 L 9,-15 L 15,-15 L 15,-7 L 12,-4 L 13,16 L 16,16 L 16,20 L -16,20 L -16,16 L -13,16 L -12,-4 L -15,-7 Z M -4,20 L -4,10 C -4,7.8 -2.2,6 0,6 C 2.2,6 4,7.8 4,10 L 4,20 Z M -2,-2 L 2,-2 L 2,2 L -2,2 Z',
	sun: 'M 0,-7 A 7,7 0 1 0 0,7 A 7,7 0 1 0 0,-7 Z M 0,-21 L 2.5,-10 L 5,-13 L 7,-8 L 13,-13 L 10,-5 L 15,-7 L 12,-2 L 21,0 L 12,2 L 15,7 L 10,5 L 13,13 L 7,8 L 5,13 L 2.5,10 L 0,21 L -2.5,10 L -5,13 L -7,8 L -13,13 L -10,5 L -15,7 L -12,2 L -21,0 L -12,-2 L -15,-7 L -10,-5 L -13,-13 L -7,-8 L -5,-13 L -2.5,-10 Z',
	crescent: 'M -18,-9 C -13,7 13,7 18,-9 C 14,17 -14,17 -18,-9 Z',
	tree: 'M -4,5 C -7,5 -10,3 -12,1 C -15,-1 -16,-5 -15,-8 C -17,-11 -15,-15 -12,-17 C -10,-20 -5,-21 0,-20 C 5,-21 10,-20 12,-17 C 15,-15 17,-11 15,-8 C 16,-5 15,-1 12,1 C 10,3 7,5 4,5 L 3,13 C 6,15 11,16 14,18 L 13,20 C 9,19 6,17 3,15 L 2,21 L -2,21 L -3,15 C -6,17 -9,19 -13,20 L -14,18 C -11,16 -6,15 -3,13 Z',
	anchor: 'M -2,-17 A 3,3 0 1 1 2,-17 A 3,3 0 1 1 -2,-17 Z M -1.5,-17 A 1.5,1.5 0 1 0 1.5,-17 A 1.5,1.5 0 1 0 -1.5,-17 Z M -14,-13 L 14,-13 L 14,-10 L 2,-10 L 2,13 C 7,12 13,8 15,2 L 11,2 L 16,-3 L 19,4 L 17,4 C 15,11 8,16 2,17 L 2,20 L -2,20 L -2,17 C -8,16 -15,11 -17,4 L -19,4 L -16,-3 L -11,2 L -15,2 C -13,8 -7,12 -2,13 L -2,-10 L -14,-10 Z',
	star: 'M 0,-20 L 4.7,-6.2 L 19,-6.2 L 7.4,2.4 L 11.8,16.2 L 0,7.6 L -11.8,16.2 L -7.4,2.4 L -19,-6.2 L -4.7,-6.2 Z',
	cross: 'M -3,-3 L -3,-14 L -8,-18 L 8,-18 L 3,-14 L 3,-3 L 14,-3 L 18,-8 L 18,8 L 14,3 L 3,3 L 3,14 L 8,18 L -8,18 L -3,14 L -3,3 L -14,3 L -18,8 L -18,-8 L -14,-3 Z',
	wolf: 'M -5,-18 C -3,-19 0,-18 1,-16 C 3,-16 5,-14 6,-11 C 7,-9 9,-8 11,-7 L 9,-5 C 7,-6 6,-6 4,-5 C 5,-2 7,2 7,6 C 9,8 11,12 13,17 L 11,18 C 9,14 7,11 5,9 C 3,12 1,16 -1,18 L -3,17 C -1,13 0,9 0,6 C -3,7 -6,6 -8,4 L -6,3 C -4,4 -2,4 0,3 C -1,0 -3,-3 -5,-5 L -12,-3 L -11,-6 L -7,-6 L -10,-10 L -8,-11 L -5,-8 C -4,-11 -4,-14 -6,-16 Z M 5,-2 C 8,-5 12,-9 11,-14 L 9,-13 C 10,-9 7,-6 4,-3 Z',
	scales: 'M -1.5,-18 L 1.5,-18 L 1.5,-10 L 16,-10 L 16,-7 L 2,-7 L 2,17 L 6,19 L 6,21 L -6,21 L -6,19 L -2,17 L -2,-7 L -16,-7 L -16,-10 L -1.5,-10 Z M -16,-6 L -20,6 L -11,6 Z M -21,7 L -10,7 C -10,11 -21,11 -21,7 Z M 16,-6 L 11,6 L 20,6 Z M 10,7 L 21,7 C 21,11 10,11 10,7 Z',
	wheat: 'M 0,-19 C 2,-16 2,-10 0,-5 C -2,-10 -2,-16 0,-19 Z M -6,-17 C -4,-15 -2,-9 -2,-4 C -4,-6 -6,-11 -6,-17 Z M 6,-17 C 6,-11 4,-6 2,-4 C 2,-9 4,-15 6,-17 Z M -5,-3 L 5,-3 L 4,2 L -4,2 Z M -3,3 L 3,3 L 6,18 L 4,19 L 1,7 L 0,20 L -1,7 L -4,19 L -6,18 Z',
	flame: 'M 0,-21 C 3,-16 5,-11 3,-6 C 7,-11 10,-8 9,-3 C 12,-6 15,-4 14,2 C 13,9 7,16 0,18 C -7,16 -13,9 -14,2 C -15,-4 -12,-6 -9,-3 C -10,-8 -7,-11 -3,-6 C -5,-11 -3,-16 0,-21 Z M 0,-4 C 2,-2 3,2 2,5 C 0,8 -3,7 -3,4 C -3,1 -1,-2 0,-4 Z',
	anvil: 'M -16,-8 L 8,-8 C 12,-8 18,-6 20,-3 L 10,-3 L 8,0 L 5,3 L 6,10 L 12,13 L 14,17 L -14,17 L -12,13 L -6,10 L -5,3 L -8,0 L -10,-3 L -16,-3 Z',
	skull: 'M -10,-17 C -4,-21 4,-21 10,-17 C 15,-12 15,-5 12,0 C 13,3 11,6 8,7 L 8,13 L 5,13 L 5,10 L 3,10 L 3,13 L 1,13 L 1,10 L -1,10 L -1,13 L -3,13 L -3,10 L -5,10 L -5,13 L -8,13 L -8,7 C -11,6 -13,3 -12,0 C -15,-5 -15,-12 -10,-17 Z M -7,-6 C -5,-6 -4,-4 -4,-2 C -4,0 -5,1 -7,1 C -9,1 -10,0 -10,-2 C -10,-4 -9,-6 -7,-6 Z M 7,-6 C 9,-6 10,-4 10,-2 C 10,0 9,1 7,1 C 5,1 4,0 4,-2 C 4,-4 5,-6 7,-6 Z M 0,2 L 2,6 L -2,6 Z'
};

const CHARGE_DESCRIPTORS: Record<ChargeKind, { singular: string; plural: string }> = {
	lion: { singular: 'lion rampant', plural: 'lions rampant' },
	eagle: { singular: 'eagle displayed', plural: 'eagles displayed' },
	dragon: { singular: 'dragon rampant', plural: 'dragons rampant' },
	crown: { singular: 'coronet', plural: 'coronets' },
	sword: { singular: 'sword erect', plural: 'swords erect' },
	tower: { singular: 'tower', plural: 'towers' },
	sun: { singular: 'sun in splendour', plural: 'suns in splendour' },
	crescent: { singular: 'crescent', plural: 'crescents' },
	tree: { singular: 'oak tree eradicated', plural: 'oak trees eradicated' },
	anchor: { singular: 'anchor', plural: 'anchors' },
	star: { singular: 'mullet of five points', plural: 'mullets of five points' },
	cross: { singular: 'cross couped', plural: 'crosses couped' },
	wolf: { singular: 'wolf salient', plural: 'wolves salient' },
	scales: { singular: 'pair of scales', plural: 'pairs of scales' },
	wheat: { singular: 'garb of wheat', plural: 'garbs of wheat' },
	flame: { singular: 'flame', plural: 'flames' },
	anvil: { singular: 'anvil', plural: 'anvils' },
	skull: { singular: 'skull', plural: 'skulls' }
};

export function isLightColor(colorStr: string): boolean {
	if (!colorStr) return false;
	const norm = colorStr.toLowerCase().trim();
	if (norm === 'or' || norm === 'argent') return true;
	if (['gules', 'azure', 'vert', 'sable', 'purpure'].includes(norm)) return false;

	const c = norm.replace('#', '');
	if (c.length === 3) {
		const r = parseInt(c[0] + c[0], 16) || 0;
		const g = parseInt(c[1] + c[1], 16) || 0;
		const b = parseInt(c[2] + c[2], 16) || 0;
		return 0.299 * r + 0.587 * g + 0.114 * b > 145;
	}
	if (c.length >= 6) {
		const r = parseInt(c.slice(0, 2), 16) || 0;
		const g = parseInt(c.slice(2, 4), 16) || 0;
		const b = parseInt(c.slice(4, 6), 16) || 0;
		return 0.299 * r + 0.587 * g + 0.114 * b > 145;
	}
	return false;
}

export function parseColorToRgb(colorStr: string): [number, number, number] {
	const norm = colorStr.toLowerCase().trim();
	if (norm in TINCTURES) {
		return parseColorToRgb(TINCTURES[norm as StandardTincture].hex);
	}
	const c = norm.replace('#', '');
	if (c.length === 3) {
		return [
			parseInt(c[0] + c[0], 16) || 0,
			parseInt(c[1] + c[1], 16) || 0,
			parseInt(c[2] + c[2], 16) || 0
		];
	}
	if (c.length >= 6) {
		return [
			parseInt(c.slice(0, 2), 16) || 0,
			parseInt(c.slice(2, 4), 16) || 0,
			parseInt(c.slice(4, 6), 16) || 0
		];
	}
	return [128, 128, 128];
}

export function getTinctureName(hexOrName: string): string {
	if (!hexOrName) return 'Gules';
	const norm = hexOrName.toLowerCase().trim();
	if (norm in TINCTURES) {
		return TINCTURES[norm as StandardTincture].name;
	}

	const [r, g, b] = parseColorToRgb(norm);
	let bestKey: StandardTincture = 'gules';
	let minDist = Infinity;

	for (const key of Object.keys(TINCTURES) as StandardTincture[]) {
		const [tr, tg, tb] = parseColorToRgb(TINCTURES[key].hex);
		const dist = (r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2;
		if (dist < minDist) {
			minDist = dist;
			bestKey = key;
		}
	}
	return TINCTURES[bestKey].name;
}

export function resolveColorHex(tinctureOrHex: string): string {
	if (!tinctureOrHex) return TINCTURES.gules.hex;
	const norm = tinctureOrHex.toLowerCase().trim();
	if (norm in TINCTURES) {
		return TINCTURES[norm as StandardTincture].hex;
	}
	if (norm.startsWith('#')) return norm;
	return TINCTURES.gules.hex;
}

export function generateHeraldry(
	seed: string,
	primaryColor?: string,
	sphere?: string,
	ideology?: string
): CoatOfArms {
	const rng = makeRng(seed);

	// 1. Pick shield shape
	const shapeWeights: Record<ShieldShape, number> = {
		heater: 4,
		spanish: 3,
		round: 2,
		square: 2,
		banner: 2
	};

	if (ideology === 'monarchy') {
		shapeWeights.heater += 4;
		shapeWeights.banner += 2;
	} else if (ideology === 'republic') {
		shapeWeights.square += 3;
		shapeWeights.spanish += 3;
	} else if (ideology === 'theocracy') {
		shapeWeights.square += 3;
		shapeWeights.heater += 2;
	}

	if (sphere === 'sea' || sphere === 'polynesian') {
		shapeWeights.spanish += 4;
		shapeWeights.round += 3;
	} else if (sphere === 'norse' || sphere === 'steppe' || sphere === 'inuit') {
		shapeWeights.round += 5;
	} else if (sphere === 'sinic' || sphere === 'japonic') {
		shapeWeights.banner += 5;
		shapeWeights.square += 2;
	}

	const shape = rng.weighted(
		SHIELD_SHAPES,
		SHIELD_SHAPES.map((s) => shapeWeights[s])
	);

	// 2. Pick division
	const divisionWeights: Record<Division, number> = {
		plain: 4,
		per_pale: 3,
		per_fess: 3,
		quarterly: 2,
		bend: 2,
		chevron: 2,
		saltire: 2,
		bordure: 2
	};

	const division = rng.weighted(
		DIVISIONS,
		DIVISIONS.map((d) => divisionWeights[d])
	);

	// 3. Tinctures
	const colors: StandardTincture[] = ['gules', 'azure', 'vert', 'sable', 'purpure'];
	const metals: StandardTincture[] = ['or', 'argent'];

	let tinctureA: string;
	let tinctureB: string;
	let chargeColor: string;

	if (primaryColor) {
		tinctureA = resolveColorHex(primaryColor);
		const isMetalA = isLightColor(tinctureA);
		if (isMetalA) {
			tinctureB = TINCTURES[rng.pick(colors)].hex;
			chargeColor = rng.chance(0.6) ? tinctureB : TINCTURES[rng.pick(colors)].hex;
		} else {
			tinctureB = TINCTURES[rng.pick(metals)].hex;
			chargeColor = rng.chance(0.6) ? tinctureB : TINCTURES[rng.pick(metals)].hex;
		}
	} else {
		const fieldIsMetal = rng.chance(0.35);
		if (fieldIsMetal) {
			tinctureA = TINCTURES[rng.pick(metals)].hex;
			tinctureB = TINCTURES[rng.pick(colors)].hex;
			chargeColor = rng.chance(0.65) ? tinctureB : TINCTURES[rng.pick(colors)].hex;
		} else {
			tinctureA = TINCTURES[rng.pick(colors)].hex;
			tinctureB = TINCTURES[rng.pick(metals)].hex;
			chargeColor = rng.chance(0.65) ? tinctureB : TINCTURES[rng.pick(metals)].hex;
		}
	}

	// 4. Charge Kind
	const chargeWeights: Record<ChargeKind, number> = {
		lion: 1,
		eagle: 1,
		dragon: 1,
		crown: 1,
		sword: 1,
		tower: 1,
		sun: 1,
		crescent: 1,
		tree: 1,
		anchor: 1,
		star: 1,
		cross: 1,
		wolf: 1,
		scales: 1,
		wheat: 1,
		flame: 1,
		anvil: 1,
		skull: 1
	};

	// Boost according to ideology
	if (ideology === 'monarchy') {
		chargeWeights.crown += 6;
		chargeWeights.lion += 5;
		chargeWeights.eagle += 4;
		chargeWeights.sword += 3;
		chargeWeights.dragon += 3;
	} else if (ideology === 'republic') {
		chargeWeights.scales += 6;
		chargeWeights.eagle += 4;
		chargeWeights.star += 4;
		chargeWeights.tower += 3;
	} else if (ideology === 'theocracy') {
		chargeWeights.sun += 6;
		chargeWeights.cross += 6;
		chargeWeights.crescent += 5;
		chargeWeights.flame += 4;
		chargeWeights.star += 3;
	} else if (ideology === 'oligarchy') {
		chargeWeights.scales += 5;
		chargeWeights.tower += 4;
		chargeWeights.crown += 3;
		chargeWeights.anchor += 3;
	} else if (ideology === 'autocracy') {
		chargeWeights.sword += 6;
		chargeWeights.eagle += 5;
		chargeWeights.dragon += 4;
		chargeWeights.skull += 4;
		chargeWeights.wolf += 3;
	} else if (ideology === 'communal') {
		chargeWeights.wheat += 6;
		chargeWeights.tree += 5;
		chargeWeights.anvil += 5;
		chargeWeights.sun += 3;
	} else if (ideology === 'technocracy') {
		chargeWeights.anvil += 6;
		chargeWeights.star += 5;
		chargeWeights.tower += 4;
		chargeWeights.scales += 3;
		chargeWeights.flame += 3;
	}

	// Boost according to sphere
	if (sphere === 'sea' || sphere === 'polynesian') {
		chargeWeights.anchor += 6;
		chargeWeights.star += 4;
		chargeWeights.sun += 3;
	} else if (sphere === 'norse' || sphere === 'celtic') {
		chargeWeights.wolf += 5;
		chargeWeights.dragon += 4;
		chargeWeights.sword += 4;
		chargeWeights.tree += 3;
	} else if (sphere === 'sinic' || sphere === 'japonic') {
		chargeWeights.dragon += 6;
		chargeWeights.sun += 4;
		chargeWeights.sword += 3;
		chargeWeights.tree += 3;
	} else if (sphere === 'persian' || sphere === 'arabic') {
		chargeWeights.crescent += 6;
		chargeWeights.sun += 5;
		chargeWeights.flame += 4;
		chargeWeights.sword += 3;
	} else if (sphere === 'indic') {
		chargeWeights.sun += 5;
		chargeWeights.crown += 4;
		chargeWeights.tree += 4;
		chargeWeights.crescent += 3;
	} else if (sphere === 'mande' || sphere === 'yoruba' || sphere === 'bantu') {
		chargeWeights.lion += 5;
		chargeWeights.sun += 4;
		chargeWeights.tree += 4;
		chargeWeights.sword += 3;
	} else if (sphere === 'ethiopic') {
		chargeWeights.lion += 6;
		chargeWeights.cross += 5;
		chargeWeights.crown += 4;
	} else if (sphere === 'nahua' || sphere === 'maya') {
		chargeWeights.sun += 6;
		chargeWeights.eagle += 5;
		chargeWeights.skull += 4;
		chargeWeights.flame += 3;
	} else if (sphere === 'steppe') {
		chargeWeights.wolf += 6;
		chargeWeights.eagle += 5;
		chargeWeights.sword += 4;
		chargeWeights.star += 3;
	} else if (sphere === 'eldritch') {
		chargeWeights.skull += 6;
		chargeWeights.flame += 5;
		chargeWeights.crescent += 4;
		chargeWeights.dragon += 4;
	}

	const chargeKind = rng.weighted(
		CHARGE_KINDS,
		CHARGE_KINDS.map((c) => chargeWeights[c])
	);

	// Count: 1 (65%), 2 (10%), 3 (25%)
	const chargeCount = rng.weighted([1, 2, 3] as const, [65, 10, 25]);

	// 5. Procedural Blazon (strictly no em dashes)
	const tinctureAName = getTinctureName(tinctureA);
	const tinctureBName = getTinctureName(tinctureB);
	const chargeColorName = getTinctureName(chargeColor);

	let fieldBlazon = '';
	if (division === 'plain') {
		fieldBlazon = tinctureAName;
	} else if (division === 'per_pale') {
		fieldBlazon = `Per pale ${tinctureAName} and ${tinctureBName}`;
	} else if (division === 'per_fess') {
		fieldBlazon = `Per fess ${tinctureAName} and ${tinctureBName}`;
	} else if (division === 'quarterly') {
		fieldBlazon = `Quarterly ${tinctureAName} and ${tinctureBName}`;
	} else if (division === 'bend') {
		fieldBlazon = `${tinctureAName}, a bend ${tinctureBName}`;
	} else if (division === 'chevron') {
		fieldBlazon = `${tinctureAName}, a chevron ${tinctureBName}`;
	} else if (division === 'saltire') {
		fieldBlazon = `${tinctureAName}, a saltire ${tinctureBName}`;
	} else if (division === 'bordure') {
		fieldBlazon = `${tinctureAName}, a bordure ${tinctureBName}`;
	}

	const descriptor = CHARGE_DESCRIPTORS[chargeKind];
	let chargePhrase = '';

	if (chargeCount === 1) {
		const isVowel = /^[aeiou]/i.test(descriptor.singular);
		const article = isVowel ? 'an' : 'a';
		chargePhrase = `${article} ${descriptor.singular} ${chargeColorName}`;
	} else if (chargeCount === 2) {
		chargePhrase = `two ${descriptor.plural} in fess ${chargeColorName}`;
	} else {
		chargePhrase = `three ${descriptor.plural} ${chargeColorName}, two and one`;
	}

	let blazon = '';
	if (division === 'plain') {
		blazon = `${fieldBlazon}, ${chargePhrase}.`;
	} else if (division === 'per_pale' || division === 'per_fess' || division === 'quarterly') {
		blazon = `${fieldBlazon}, overall ${chargePhrase}.`;
	} else {
		blazon = `${fieldBlazon}, charged with ${chargePhrase}.`;
	}

	return {
		shape,
		division,
		tinctureA,
		tinctureB,
		charge: {
			kind: chargeKind,
			color: chargeColor,
			count: chargeCount
		},
		blazon,
		emblem: CHARGE_PATHS[chargeKind]
	};
}

let svgIdCounter = 0;

export function heraldrySvg(coa: CoatOfArms, size = 64): string {
	const clipId = `rf-coa-clip-${++svgIdCounter}`;
	const shapePath = SHIELD_PATHS[coa.shape];

	let divisionElements = '';

	switch (coa.division) {
		case 'plain':
			break;
		case 'per_pale':
			divisionElements = `<rect x="50" y="0" width="50" height="100" fill="${coa.tinctureB}" />`;
			break;
		case 'per_fess':
			divisionElements = `<rect x="0" y="50" width="100" height="50" fill="${coa.tinctureB}" />`;
			break;
		case 'quarterly':
			divisionElements = `
				<rect x="50" y="0" width="50" height="50" fill="${coa.tinctureB}" />
				<rect x="0" y="50" width="50" height="50" fill="${coa.tinctureB}" />
			`;
			break;
		case 'bend':
			divisionElements = `<polygon points="-10,12 12,-10 110,88 88,110" fill="${coa.tinctureB}" />`;
			break;
		case 'chevron':
			divisionElements = `<polygon points="-10,72 50,32 110,72 110,92 50,52 -10,92" fill="${coa.tinctureB}" />`;
			break;
		case 'saltire':
			divisionElements = `
				<polygon points="-10,12 12,-10 110,88 88,110" fill="${coa.tinctureB}" />
				<polygon points="88,-10 110,12 12,110 -10,88" fill="${coa.tinctureB}" />
			`;
			break;
		case 'bordure':
			divisionElements = `
				<rect x="0" y="0" width="100" height="100" fill="${coa.tinctureB}" />
				<g transform="translate(50, 50) scale(0.76) translate(-50, -50)">
					<path d="${shapePath}" fill="${coa.tinctureA}" />
				</g>
			`;
			break;
	}

	const chargePath = coa.emblem;
	let chargeElements = '';

	if (coa.charge.count === 1) {
		chargeElements = `
			<g transform="translate(50, 48) scale(1)">
				<path d="${chargePath}" fill="${coa.charge.color}" stroke="rgba(0,0,0,0.3)" stroke-width="0.8" stroke-linejoin="round" />
			</g>
		`;
	} else if (coa.charge.count === 2) {
		chargeElements = `
			<g transform="translate(34, 44) scale(0.58)">
				<path d="${chargePath}" fill="${coa.charge.color}" stroke="rgba(0,0,0,0.3)" stroke-width="0.8" stroke-linejoin="round" />
			</g>
			<g transform="translate(66, 44) scale(0.58)">
				<path d="${chargePath}" fill="${coa.charge.color}" stroke="rgba(0,0,0,0.3)" stroke-width="0.8" stroke-linejoin="round" />
			</g>
		`;
	} else {
		chargeElements = `
			<g transform="translate(33, 34) scale(0.45)">
				<path d="${chargePath}" fill="${coa.charge.color}" stroke="rgba(0,0,0,0.3)" stroke-width="0.8" stroke-linejoin="round" />
			</g>
			<g transform="translate(67, 34) scale(0.45)">
				<path d="${chargePath}" fill="${coa.charge.color}" stroke="rgba(0,0,0,0.3)" stroke-width="0.8" stroke-linejoin="round" />
			</g>
			<g transform="translate(50, 66) scale(0.45)">
				<path d="${chargePath}" fill="${coa.charge.color}" stroke="rgba(0,0,0,0.3)" stroke-width="0.8" stroke-linejoin="round" />
			</g>
		`;
	}

	const escapedBlazon = coa.blazon.replace(/"/g, '&quot;');

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${escapedBlazon}">
	<defs>
		<clipPath id="${clipId}">
			<path d="${shapePath}" />
		</clipPath>
	</defs>
	<g clip-path="url(#${clipId})">
		<rect x="0" y="0" width="100" height="100" fill="${coa.tinctureA}" />
		${divisionElements}
		${chargeElements}
	</g>
	<path d="${shapePath}" fill="none" stroke="#0f172a" stroke-width="3.5" stroke-linejoin="round" />
	<path d="${shapePath}" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.2" stroke-linejoin="round" />
</svg>`;
}

export function traceShieldPath(ctx: CanvasRenderingContext2D, shape: ShieldShape): void {
	ctx.beginPath();
	switch (shape) {
		case 'heater':
			ctx.moveTo(12, 10);
			ctx.lineTo(88, 10);
			ctx.lineTo(88, 48);
			ctx.bezierCurveTo(88, 74, 50, 94, 50, 94);
			ctx.bezierCurveTo(50, 94, 12, 74, 12, 48);
			ctx.closePath();
			break;
		case 'round':
			ctx.arc(50, 50, 44, 0, Math.PI * 2);
			ctx.closePath();
			break;
		case 'square':
			if (typeof ctx.roundRect === 'function') {
				ctx.roundRect(12, 10, 76, 80, 8);
			} else {
				ctx.rect(12, 10, 76, 80);
			}
			break;
		case 'banner':
			ctx.moveTo(14, 8);
			ctx.lineTo(86, 8);
			ctx.lineTo(86, 70);
			ctx.lineTo(50, 94);
			ctx.lineTo(14, 70);
			ctx.closePath();
			break;
		case 'spanish':
			ctx.moveTo(14, 10);
			ctx.lineTo(86, 10);
			ctx.lineTo(86, 54);
			ctx.arc(50, 54, 36, 0, Math.PI, false);
			ctx.closePath();
			break;
	}
}

export function drawHeraldry(
	ctx: CanvasRenderingContext2D,
	coa: CoatOfArms,
	x: number,
	y: number,
	size: number
): void {
	ctx.save();
	ctx.translate(x, y);
	const s = size / 100;
	ctx.scale(s, s);

	// Clip within shield
	ctx.save();
	traceShieldPath(ctx, coa.shape);
	ctx.clip();

	// Base tinctureA fill
	ctx.fillStyle = coa.tinctureA;
	ctx.fillRect(0, 0, 100, 100);

	// Division overlays
	ctx.fillStyle = coa.tinctureB;
	switch (coa.division) {
		case 'plain':
			break;
		case 'per_pale':
			ctx.fillRect(50, 0, 50, 100);
			break;
		case 'per_fess':
			ctx.fillRect(0, 50, 100, 50);
			break;
		case 'quarterly':
			ctx.fillRect(50, 0, 50, 50);
			ctx.fillRect(0, 50, 50, 50);
			break;
		case 'bend':
			ctx.beginPath();
			ctx.moveTo(-10, 12);
			ctx.lineTo(12, -10);
			ctx.lineTo(110, 88);
			ctx.lineTo(88, 110);
			ctx.closePath();
			ctx.fill();
			break;
		case 'chevron':
			ctx.beginPath();
			ctx.moveTo(-10, 72);
			ctx.lineTo(50, 32);
			ctx.lineTo(110, 72);
			ctx.lineTo(110, 92);
			ctx.lineTo(50, 52);
			ctx.lineTo(-10, 92);
			ctx.closePath();
			ctx.fill();
			break;
		case 'saltire':
			ctx.beginPath();
			ctx.moveTo(-10, 12);
			ctx.lineTo(12, -10);
			ctx.lineTo(110, 88);
			ctx.lineTo(88, 110);
			ctx.closePath();
			ctx.fill();

			ctx.beginPath();
			ctx.moveTo(88, -10);
			ctx.lineTo(110, 12);
			ctx.lineTo(12, 110);
			ctx.lineTo(-10, 88);
			ctx.closePath();
			ctx.fill();
			break;
		case 'bordure':
			ctx.fillRect(0, 0, 100, 100);
			ctx.save();
			ctx.translate(50, 50);
			ctx.scale(0.76, 0.76);
			ctx.translate(-50, -50);
			traceShieldPath(ctx, coa.shape);
			ctx.fillStyle = coa.tinctureA;
			ctx.fill();
			ctx.restore();
			break;
	}

	// Render Charges
	if (typeof Path2D !== 'undefined') {
		const path2d = new Path2D(coa.emblem);
		ctx.fillStyle = coa.charge.color;
		ctx.strokeStyle = 'rgba(0,0,0,0.3)';
		ctx.lineWidth = 0.8;

		const renderChargeInstance = (cx: number, cy: number, cScale: number) => {
			ctx.save();
			ctx.translate(cx, cy);
			ctx.scale(cScale, cScale);
			ctx.fill(path2d);
			ctx.stroke(path2d);
			ctx.restore();
		};

		if (coa.charge.count === 1) {
			renderChargeInstance(50, 48, 1);
		} else if (coa.charge.count === 2) {
			renderChargeInstance(34, 44, 0.58);
			renderChargeInstance(66, 44, 0.58);
		} else {
			renderChargeInstance(33, 34, 0.45);
			renderChargeInstance(67, 34, 0.45);
			renderChargeInstance(50, 66, 0.45);
		}
	}

	ctx.restore(); // restore shield clip

	// Shield Border Outline
	traceShieldPath(ctx, coa.shape);
	ctx.strokeStyle = '#0f172a';
	ctx.lineWidth = 3.5;
	ctx.stroke();

	traceShieldPath(ctx, coa.shape);
	ctx.strokeStyle = 'rgba(255,255,255,0.25)';
	ctx.lineWidth = 1.2;
	ctx.stroke();

	ctx.restore();
}

export function getRealmCoatOfArms(
	seed: string,
	pol: { id: number; color?: string; sphere?: string; ideology?: string }
): CoatOfArms {
	const realmSeed = `${seed}:realm:${pol.id}`;
	return generateHeraldry(realmSeed, pol.color, pol.sphere, pol.ideology);
}

export function getBurgCoatOfArms(
	seed: string,
	burg: { id: number; name: string; culture?: number; port?: boolean },
	pol?: { id: number; color?: string }
): CoatOfArms {
	const burgSeed = `${seed}:burg:${burg.id}:${burg.name}`;
	const sphere = burg.port ? 'sea' : undefined;
	return generateHeraldry(burgSeed, pol?.color, sphere);
}
