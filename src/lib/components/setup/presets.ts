import type { Genre } from '#lib/gen/genre';
import type { Climate, PlanetKind, Template } from '#lib/gen/types';

/** A complete option set. `spheres` (a custom list) wins over `sphereSet` (a named set from SPHERE_SETS). */
export interface PresetOptions {
	seed: string;
	genre: Genre;
	planet: PlanetKind;
	template: Template;
	sphereSet: string;
	spheres?: string[];
	cells: number;
	width: number;
	height: number;
	planets: number;
	states: number;
	cultures: number;
	burgs: number;
	religions: number;
	sizeVariety: number;
	growth: number;
	seaLevel: number;
	rivers: number;
	depth: number;
	sky: boolean;
	sea: boolean;
	density: { deep: number; sky: number; sea: number };
	evolve: boolean;
	/** merged over the planet's climate; winds and unlisted fields come from the planet */
	climate?: Partial<Climate>;
}

export interface Preset {
	id: string;
	name: string;
	icon: string;
	blurb: string;
	options: PresetOptions;
}

const base = { cells: 10000, width: 1600, height: 1000, planets: 1, burgs: 0, evolve: false, density: { deep: 1, sky: 1, sea: 1 } };

export const PRESETS: Preset[] = [
	{
		id: 'silk-road', name: 'Silk Road', icon: '🐪', blurb: 'Caravan kingdoms strung along one long overland trade belt.',
		options: { ...base, seed: 'silk-road-1', genre: 'fantasy', planet: 'terran', template: 'pangea', sphereSet: 'Silk Road', cells: 15000, states: 22, cultures: 14, religions: 8, sizeVariety: 5, growth: 1.3, seaLevel: 0, rivers: 0.8, depth: 1, sky: false, sea: false, climate: { latitude: 38, mapSize: 40, prec: 80 } }
	},
	{
		id: 'shattered-isles', name: 'Shattered Isles', icon: '🏝️', blurb: 'Island realms, sea lanes and a sky full of storm.',
		options: { ...base, seed: 'shattered-isles-4', genre: 'fantasy', planet: 'shattered', template: 'archipelago', sphereSet: 'Oceanic', states: 14, cultures: 10, religions: 5, sizeVariety: 3, growth: 0.8, seaLevel: 3, rivers: 0.7, depth: 1, sky: true, sea: true }
	},
	{
		id: 'cyber-collapse', name: 'Cyber Collapse', icon: '🌃', blurb: 'Dozens of corporate fiefs squabbling over a fraying grid.',
		options: { ...base, seed: 'cyber-collapse-7', genre: 'cyberpunk', planet: 'terran', template: 'pangea', sphereSet: 'Asian', cells: 20000, states: 40, cultures: 18, religions: 4, sizeVariety: 7, growth: 0.6, seaLevel: 0, rivers: 0.8, depth: 3, sky: true, sea: false, density: { deep: 1.5, sky: 1.5, sea: 1 }, climate: { tEq: 34 } }
	},
	{
		id: 'solar-commons', name: 'Solar Commons', icon: '🌿', blurb: 'Garden councils of near equals around a warm inland sea.',
		options: { ...base, seed: 'solar-commons-2', genre: 'solarpunk', planet: 'verdant', template: 'inlandSea', sphereSet: 'Global South', states: 18, cultures: 16, religions: 6, sizeVariety: 2, growth: 1, seaLevel: 0, rivers: 1.6, depth: 0, sky: true, sea: true, density: { deep: 1, sky: 1.5, sea: 1.3 } }
	},
	{
		id: 'ashen-vaults', name: 'Ashen Vaults', icon: '☢️', blurb: 'Scavenger towns and raider clans above, vault-bunkers and metro lines below.',
		options: { ...base, seed: 'ashen-vaults-6', genre: 'wasteland', planet: 'terran', template: 'continents', sphereSet: 'Global South', states: 28, cultures: 14, religions: 4, sizeVariety: 6, growth: 0.7, seaLevel: 1, rivers: 0.6, depth: 3, sky: true, sea: true, density: { deep: 1.5, sky: 0.5, sea: 1 }, climate: { tEq: 33 } }
	},
	{
		id: 'hollow-crown', name: 'Hollow Crown', icon: '🕯️', blurb: 'Demigod lords, plague wards and a sunken golden city after the fall.',
		options: { ...base, seed: 'hollow-crown-8', genre: 'twilight', planet: 'terran', template: 'pangea', sphereSet: 'European', states: 22, cultures: 12, religions: 6, sizeVariety: 5, growth: 0.8, seaLevel: 0, rivers: 1, depth: 3, sky: true, sea: true, density: { deep: 1.5, sky: 1, sea: 1.2 } }
	},
	{
		id: 'dwarf-holds', name: 'Dwarf-Holds of the Deep', icon: '⛏️', blurb: 'Stone halls under every mountain, six levels down.',
		options: { ...base, seed: 'deep-holds-9', genre: 'fantasy', planet: 'terran', template: 'highIsland', sphereSet: 'European', states: 12, cultures: 10, religions: 5, sizeVariety: 4, growth: 0.8, seaLevel: -2, rivers: 1, depth: 6, sky: false, sea: false, density: { deep: 2.5, sky: 1, sea: 1 } }
	},
	{
		id: 'ice-age-tribes', name: 'Ice Age Tribes', icon: '❄️', blurb: 'Hunting bands and clan leagues on a frozen world.',
		options: { ...base, seed: 'ice-age-3', genre: 'mythic', planet: 'ice', template: 'continents', sphereSet: 'Custom', spheres: ['inuit', 'norse', 'steppe', 'turtle'], states: 24, cultures: 14, religions: 6, sizeVariety: 3, growth: 0.7, seaLevel: -4, rivers: 0.7, depth: 1, sky: false, sea: false }
	},
	{
		id: 'mythic-bronze', name: 'Mythic Bronze Age', icon: '🏺', blurb: 'River cities and gods of the first age; the era shifts as you play.',
		options: { ...base, seed: 'bronze-age-5', genre: 'mythic', planet: 'terran', template: 'inlandSea', sphereSet: 'Custom', spheres: ['persian', 'arabic', 'latin', 'ethiopic', 'indic'], states: 20, cultures: 12, religions: 8, sizeVariety: 5, growth: 1.2, seaLevel: 0, rivers: 1.4, depth: 0, sky: false, sea: false, evolve: true }
	},
	{
		id: 'heartland', name: 'Heartland Kingdoms', icon: '🏰', blurb: 'Classic crowns, old roads and stone keeps. A safe first world.',
		options: { ...base, seed: 'heartland-6', genre: 'fantasy', planet: 'terran', template: 'continents', sphereSet: 'European', states: 16, cultures: 0, religions: 0, sizeVariety: 4, growth: 1, seaLevel: 0, rivers: 1, depth: 2, sky: true, sea: true }
	},
	{
		id: 'brass-archipelago', name: 'Brass Archipelago', icon: '⚙️', blurb: 'Airships, clockwork ports and maritime empires.',
		options: { ...base, seed: 'brass-isles-8', genre: 'steampunk', planet: 'terran', template: 'archipelago', sphereSet: 'Global South', states: 18, cultures: 12, religions: 6, sizeVariety: 5, growth: 1.1, seaLevel: 2, rivers: 1, depth: 1, sky: true, sea: true, density: { deep: 1, sky: 1.8, sea: 1.3 } }
	},
	{
		id: 'drowned-gods', name: 'Drowned Gods', icon: '🐙', blurb: 'Sunken temples, elder cults and a hungry sea shelf.',
		options: { ...base, seed: 'drowned-gods-11', genre: 'mythic', planet: 'shattered', template: 'peninsulas', sphereSet: 'Eldritch', states: 12, cultures: 8, religions: 6, sizeVariety: 4, growth: 0.9, seaLevel: 4, rivers: 0.8, depth: 3, sky: false, sea: true, density: { deep: 1.2, sky: 1, sea: 2 } }
	}
];
