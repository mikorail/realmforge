import type { Rng } from '../rng';
import type { World } from '../gen/types';
import type { LegendaryPlace } from './types';

export interface WonderTemplate {
	kind: LegendaryPlace['kind'];
	nameTpl: string[];
	icon: string;
	description: string;
	effect: string;
	fame: number;
	layer: number;
	candidateFilter: (world: World, cell: number, layer: number) => boolean;
}

export const WONDER_TEMPLATES: WonderTemplate[] = [
	{
		kind: 'world_tree',
		nameTpl: ['The Great World Tree', 'Roots of Eternity', 'Yggdrasil-Arbor', 'The First Timber', 'Crown of Primal Life'],
		icon: '🌳',
		description: 'A colossal mystical tree whose branches touch the clouds and whose deep roots drink from celestial aquifers.',
		effect: '+15 Realm Stability and fertility to surrounding provinces.',
		fame: 50,
		layer: 0,
		candidateFilter: (w, c) => w.cells.h[c] >= 20 && (w.cells.biome[c] === 5 || w.cells.biome[c] === 6 || w.cells.biome[c] === 12)
	},
	{
		kind: 'tower_magic',
		nameTpl: ['High Spire of Sorcery', 'The Arcane Monolith', 'Tower of Starfall', 'The Astral Beacon', 'Caelum Spire'],
		icon: '🗼',
		description: 'A soaring crystalline needle channeling planetary leylines, visible across entire mountain ranges.',
		effect: '+25 Innovation and protection against supernatural disasters.',
		fame: 45,
		layer: 0,
		candidateFilter: (w, c) => w.cells.h[c] > 55
	},
	{
		kind: 'tower_trials',
		nameTpl: ['The Tower of Trials', 'Labyrinth of Champions', 'The Crucible of Valor', 'The Iron Spire', 'Gauntlet of Immortals'],
		icon: '⚔️',
		description: 'An ancient fortress of dueling arenas and subterranean trial chambers where warriors forge their legends.',
		effect: '+15 Martial to rulers and trains celebrated champion heroes.',
		fame: 40,
		layer: 0,
		candidateFilter: (w, c) => w.cells.h[c] >= 20 && (w.cells.biome[c] === 1 || w.cells.biome[c] === 2 || w.cells.biome[c] === 4)
	},
	{
		kind: 'bridge',
		nameTpl: ['The Colossus Span', 'Titan\'s Causeway', 'The Arch of Empires', 'Bridge of the Two Dawns', 'The Skyward Viaduct'],
		icon: '🌉',
		description: 'A monumental stone and iron bridge spanning treacherous chasms or ocean straits, joining partitioned realms.',
		effect: '+25% Trade and caravan speed across frontier territories.',
		fame: 35,
		layer: 0,
		candidateFilter: (w, c) => w.cells.h[c] >= 20 && (w.cells.river[c] > 0 || w.cells.dist[c] <= 1)
	},
	{
		kind: 'university',
		nameTpl: ['Grand University of Sages', 'The Lyceum of Reason', 'Academy of the Seven Mysteries', 'The Imperial Collegium', 'House of Wisdom'],
		icon: '🏛️',
		description: 'A sprawling campus of marble observatories, domed halls, and grand lecture courts drawing foreign polymaths.',
		effect: '+30 Innovation and regularly produces famous thinkers and inventors.',
		fame: 45,
		layer: 0,
		candidateFilter: (w, c) => Boolean(w.cells.burg[c])
	},
	{
		kind: 'giant_harbor',
		nameTpl: ['The Colossus Harbor', 'Great Anchorage of the World', 'Port of the Thousand Sails', 'The Sunken Sea-Gate', 'Titan\'s Basin'],
		icon: '⚓',
		description: 'An immense deepwater harbor guarded by towering sea-fortresses and colossal lighthouse beacons.',
		effect: '+40 Maritime Trade Gold and immune to naval blockades.',
		fame: 40,
		layer: 0,
		candidateFilter: (w, c) => w.cells.dist[c] === 1 && Boolean(w.cells.burg[c])
	},
	{
		kind: 'metropolis',
		nameTpl: ['The Golden Metropolis', 'City of Hundred Spires', 'The Eternal Megacity', 'Crown of Mortal Civilisation', 'The Sun City'],
		icon: '🏙️',
		description: 'A breathtaking metropolis of aqueducts, tiered palaces, and bustling bazaars housing countless souls.',
		effect: '+50 Realm Treasury Gold and doubles local carrying capacity.',
		fame: 55,
		layer: 0,
		candidateFilter: (w, c) => {
			const bid = w.cells.burg[c];
			return Boolean(bid && w.burgs[bid]?.capital);
		}
	},
	{
		kind: 'ancient_forge',
		nameTpl: ['Adamantine Foundry of the Deep', 'The Primeval Forge', 'Anvil of Hephaestus', 'Molten Crucible of Karak', 'The World Furnace'],
		icon: '🔥',
		description: 'A subterranean forge built directly above subterranean magma tubes, where artifacts of myth are hammered.',
		effect: '+20 Army Power and periodically bestows legendary weapons upon the realm.',
		fame: 50,
		layer: 1,
		candidateFilter: (w, c, l) => l > 0 || w.cells.h[c] > 60 || w.cells.biome[c] === 15
	},
	{
		kind: 'sunken_citadel',
		nameTpl: ['Sunken Citadel of the Sun', 'Drowned Palace of Pearls', 'The Abyssal Sanctum', 'Ruins of Atlantis', 'Coral Bastion of the Deeps'],
		icon: '🔱',
		description: 'Drowned marble spires and bioluminescent vaults surviving beneath clear ocean shallows.',
		effect: '+20 Intrigue and reveals sunken treasures of antiquity.',
		fame: 40,
		layer: 0,
		candidateFilter: (w, c) => w.cells.h[c] < 20 || w.cells.dist[c] <= 1
	},
	{
		kind: 'titan_shrine',
		nameTpl: ['Shrine of the Slain Colossus', 'Monument of the Dragon Fall', 'Bones of the Behemoth', 'The Titan Tomb', 'Pillar of the Beast Conqueror'],
		icon: '🗿',
		description: 'A colossal sacred shrine erected around the preserved skeleton and monumental trophies of a slain primordial titan.',
		effect: '+20 Realm Stability and venerates heroes who felled ancient calamities.',
		fame: 60,
		layer: 0,
		candidateFilter: () => true
	}
];

/** Generate world wonders across the planets */
export function generateWonders(world: World, rng: Rng): LegendaryPlace[] {
	const c = world.cells;
	const wonders: LegendaryPlace[] = [];
	let nextId = 1;

	// Pick 5 to 8 distinct wonders (excluding titan_shrine which is built after slaying)
	const templates = rng.shuffle(WONDER_TEMPLATES.filter((t) => t.kind !== 'titan_shrine'));
	for (const tpl of templates) {
		const targetLayer = tpl.layer < world.layers.length ? tpl.layer : 0;
		const L = world.layers[targetLayer];

		// Find candidates
		const candidates: number[] = [];
		for (let i = 0; i < c.n; i++) {
			if (L.open[i] && tpl.candidateFilter(world, i, targetLayer)) {
				candidates.push(i);
			}
		}

		if (!candidates.length) continue;

		// Select a candidate spaced away from existing wonders
		const picked = rng.pick(candidates);
		const burgId = world.cells.burg[picked] || undefined;
		const stateId = L.state[picked] || 0;
		const name = rng.pick(tpl.nameTpl);

		wonders.push({
			id: nextId++,
			name,
			kind: tpl.kind,
			icon: tpl.icon,
			cell: picked,
			layer: targetLayer,
			x: c.x[picked],
			y: c.y[picked],
			burgId,
			stateId,
			description: tpl.description,
			lore: `Erected in the mythic ages of ${world.name}, ${name} remains one of the supreme wonders of the mortal world.`,
			fame: tpl.fame,
			effect: tpl.effect,
			builtYear: -rng.int(100, 800)
		});

		if (wonders.length >= 7) break;
	}

	return wonders;
}

/** Construct a new wonder or tower dynamically during simulation */
export function buildWonder(
	world: World,
	cell: number,
	layer: number,
	kind: LegendaryPlace['kind'],
	builderName: string,
	stateId: number,
	year: number,
	nextId: { val: number },
	rng: Rng,
	customName?: string,
	customDesc?: string
): LegendaryPlace {
	const c = world.cells;
	const burgId = c.burg[cell] || undefined;
	const tpl = WONDER_TEMPLATES.find((t) => t.kind === kind) ?? WONDER_TEMPLATES[1]; // default tower_magic
	const name = customName || rng.pick(tpl.nameTpl);
	const description = customDesc || tpl.description;

	return {
		id: nextId.val++,
		name,
		kind,
		icon: tpl.icon,
		cell,
		layer,
		x: c.x[cell],
		y: c.y[cell],
		burgId,
		stateId,
		description,
		lore: `Commissioned in year ${year} by ${builderName}. Its soaring spires and monumental craftsmanship stand as a testament to mortal ambition.`,
		fame: tpl.fame,
		effect: tpl.effect,
		builtYear: year,
		builder: builderName
	};
}

/** Consecrate a legendary monument or titan shrine where a great beast was felled */
export function createTitanShrineWonder(
	world: World,
	cell: number,
	layer: number,
	monster: { name: string; species: string; tier: string; category: string; icon: string },
	slayerName: string,
	year: number,
	nextId: { val: number }
): LegendaryPlace {
	const c = world.cells;
	const burgId = c.burg[cell] || undefined;
	const L = world.layers[layer] ?? world.layers[0];
	const stateId = L.state[cell] || 0;

	let shrineTitle = `Shrine of the Fallen ${monster.species}`;
	if (monster.category === 'dragon') shrineTitle = `Pyre-Monument of ${monster.name}`;
	else if (monster.species === 'Leviathan') shrineTitle = `Shrine of the Abyssal Sovereign`;
	else if (monster.species === 'Behemoth') shrineTitle = `Bones of the Earth-Shaker`;
	else if (monster.species === 'Ziz') shrineTitle = `Perch of the Slain Storm-Raptor`;

	return {
		id: nextId.val++,
		name: shrineTitle,
		kind: 'titan_shrine',
		icon: '🗿',
		cell,
		layer,
		x: c.x[cell],
		y: c.y[cell],
		burgId,
		stateId,
		description: `A monumental sanctuary erected around the colossal remains and trophies of ${monster.name}.`,
		lore: `Consecrated in year ${year} by ${slayerName} to commemorate the historic victory over ${monster.name}. Pilgrims travel across provinces to touch the fabled bones and give praise.`,
		fame: 65,
		effect: '+20 Realm Stability and attracts pilgrims and valiant champions from foreign lands.',
		builtYear: year,
		builder: slayerName,
		monumentTo: monster.name
	};
}

/** Check if a wonder is still standing and granting its blessings */
export function isWonderStanding(wonder: LegendaryPlace): boolean {
	return !wonder.destroyed;
}

/** Raze or destroy a wonder, reducing it to ruins and generating a chronicle event */
export function destroyWonder(
	wonder: LegendaryPlace,
	destroyerName: string,
	year: number,
	cause: string
): { event: { y: number; m: number; kind: 'wonder'; text: string; cell: number; state?: number }; wonder: LegendaryPlace } {
	wonder.destroyed = true;
	wonder.destroyedYear = year;
	wonder.destroyer = destroyerName;
	wonder.ruinCause = cause;

	const event = {
		y: year,
		m: 0,
		kind: 'wonder' as const,
		text: `WONDER DESTROYED: ${wonder.name} (${wonder.icon}) has fallen! ${destroyerName} brought ruin upon the legendary site (${cause}). Its ancient spires now lie in shattered ruins.`,
		cell: wonder.cell,
		state: wonder.stateId
	};

	return { event, wonder };
}

