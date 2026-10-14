/**
 * Genres re-skin the same simulation: vocabulary, polity forms, settlement kinds per layer,
 * and how exotic layers (deep / sky / sea) are populated.
 */
export type Genre = 'fantasy' | 'mythic' | 'steampunk' | 'dieselpunk' | 'atompunk' | 'cyberpunk' | 'biopunk' | 'solarpunk';
export type LayerKind = 'surface' | 'deep' | 'sky' | 'sea';

export interface GenreDef {
	id: Genre;
	name: string;
	blurb: string;
	/** extra polity forms mixed with the culture sphere's own */
	forms: string[];
	/** chance a polity uses a genre form instead of a sphere form */
	formBias: number;
	kinds: Record<LayerKind, string[]>;
	layerNames: Record<LayerKind, string>;
	/** how common each exotic layer is (0..1) */
	density: Record<Exclude<LayerKind, 'surface'>, number>;
	terms: { army: string; gold: string; mana: string; god: string; road: string; tunnel: string; skylane: string; rift: string; plague: string };
	/** UI accent */
	accent: string;
	ink: string;
}

export const GENRES: Record<Genre, GenreDef> = {
	fantasy: {
		id: 'fantasy', name: 'High Fantasy', blurb: 'Dwarf-holds beneath the peaks, floating mage-citadels, merfolk domes.',
		forms: ['Kingdom', 'Elven Realm', 'Dwarf-Hold', 'Mage Republic'], formBias: 0.15,
		kinds: { surface: ['Town', 'City', 'Fortress', 'Port'], deep: ['Dwarf-Hold', 'Deep Warren', 'Gem Delve', 'Underdark Bazaar'], sky: ['Floating Citadel', 'Cloud Monastery', 'Sky-Isle Aerie'], sea: ['Merfolk Dome', 'Coral Palace', 'Drowned Abbey'] },
		layerNames: { surface: 'Overworld', deep: 'Underdark', sky: 'Sky Isles', sea: 'Abyss' },
		density: { deep: 1, sky: 0.6, sea: 0.7 },
		terms: { army: 'Hosts', gold: 'Gold', mana: 'Faith', god: 'God', road: 'Road', tunnel: 'Tunnel', skylane: 'Sky-lane', rift: 'Rift', plague: 'Plague' },
		accent: '#c9a45c', ink: '#2b2116'
	},
	mythic: {
		id: 'mythic', name: 'Mythic Ages', blurb: 'Heroes, oracles and monsters; gods walk among mortals.',
		forms: ['Hegemony', 'Oracle-State', 'Titan-Throne'], formBias: 0.1,
		kinds: { surface: ['Polis', 'City', 'Citadel', 'Harbour'], deep: ['Underworld Gate', 'Labyrinth', 'Cyclops Forge'], sky: ['Olympian Hall', 'Garuda Roost', 'Sun-Chariot Port'], sea: ['Sunken Atlantis', 'Naga Palace', 'Dragon-King Hall'] },
		layerNames: { surface: 'Middle Realm', deep: 'Underworld', sky: 'Heavens', sea: 'Dragon Seas' },
		density: { deep: 0.6, sky: 0.7, sea: 0.6 },
		terms: { army: 'Warbands', gold: 'Drachma', mana: 'Worship', god: 'Pantheon', road: 'Way', tunnel: 'Catabasis', skylane: 'Rainbow Bridge', rift: 'Veil-Tear', plague: 'Curse' },
		accent: '#d7b46a', ink: '#2a1f12'
	},
	steampunk: {
		id: 'steampunk', name: 'Steampunk', blurb: 'Airship ports, brass undercities, coal-black canals.',
		forms: ['Industrial Combine', 'Guild Republic', 'Steam Empire', 'Clockwork Directorate'], formBias: 0.45,
		kinds: { surface: ['Mill Town', 'Foundry City', 'Rail Junction', 'Harbour'], deep: ['Coal Warren', 'Brass Undercity', 'Boiler Deep'], sky: ['Airship Dock', 'Zeppelin City', 'Aether Station'], sea: ['Bathysphere Colony', 'Diving-Bell Port'] },
		layerNames: { surface: 'Surface', deep: 'Undercity', sky: 'Aetherways', sea: 'Fathoms' },
		density: { deep: 0.8, sky: 0.9, sea: 0.4 },
		terms: { army: 'Regiments', gold: 'Sovereigns', mana: 'Steam', god: 'Engineer', road: 'Railway', tunnel: 'Shaft', skylane: 'Air route', rift: 'Aether Rift', plague: 'Black Lung' },
		accent: '#b8793b', ink: '#21170f'
	},
	dieselpunk: {
		id: 'dieselpunk', name: 'Dieselpunk', blurb: 'Iron blocs, bunker-cities, dreadnought harbours.',
		forms: ['Bloc', 'Directorate', 'Iron Republic', 'Junta'], formBias: 0.5,
		kinds: { surface: ['Factory Town', 'Bloc City', 'Rail Hub', 'Naval Base'], deep: ['Bunker City', 'Deep Shelter', 'Mine Complex'], sky: ['Carrier Zeppelin', 'Skyfort'], sea: ['U-Boat Pen', 'Seabed Station'] },
		layerNames: { surface: 'Front', deep: 'Bunkers', sky: 'Air Fleet', sea: 'Deep Pens' },
		density: { deep: 0.9, sky: 0.4, sea: 0.4 },
		terms: { army: 'Divisions', gold: 'Marks', mana: 'Propaganda', god: 'Chancellor', road: 'Highway', tunnel: 'Tunnel', skylane: 'Air corridor', rift: 'Anomaly', plague: 'Gas cloud' },
		accent: '#8f8a6a', ink: '#1c1b14'
	},
	atompunk: {
		id: 'atompunk', name: 'Atompunk', blurb: 'Rocket-age optimism: atomic vaults, orbital pads, bubble-domes.',
		forms: ['Federation', 'Atomic Union', 'Technocracy'], formBias: 0.5,
		kinds: { surface: ['Suburb', 'Atom City', 'Launch Town', 'Port'], deep: ['Vault', 'Fallout Shelter', 'Reactor Deep'], sky: ['Orbital Pad', 'Rocket Spire', 'Sky Ring'], sea: ['Bubble Dome', 'Aqua-Lab'] },
		layerNames: { surface: 'Surface', deep: 'Vaults', sky: 'Orbit', sea: 'Aquadomes' },
		density: { deep: 0.9, sky: 0.7, sea: 0.6 },
		terms: { army: 'Divisions', gold: 'Credits', mana: 'Atomics', god: 'Overseer', road: 'Freeway', tunnel: 'Transit tube', skylane: 'Rocket lane', rift: 'Wormhole', plague: 'Fallout' },
		accent: '#e0a83a', ink: '#1a1b22'
	},
	cyberpunk: {
		id: 'cyberpunk', name: 'Cyberpunk', blurb: 'Megacorps, arcologies, neon undercities and orbital elites.',
		forms: ['Megacorp', 'Arcology Zone', 'Syndicate', 'Free Zone', 'Corporate Protectorate'], formBias: 0.7,
		kinds: { surface: ['Sprawl', 'Arcology', 'Megablock', 'Freeport'], deep: ['Undercity', 'Neon Warren', 'Data Vault', 'Black Clinic'], sky: ['Orbital Habitat', 'Sky-Arcology', 'Corp Spire'], sea: ['Seastead', 'Abyssal Datacenter'] },
		layerNames: { surface: 'Street', deep: 'Undercity', sky: 'Upper Tiers', sea: 'Seasteads' },
		density: { deep: 1, sky: 0.9, sea: 0.5 },
		terms: { army: 'Security', gold: 'Creds', mana: 'Root Access', god: 'Sysadmin', road: 'Maglev', tunnel: 'Service duct', skylane: 'AV lane', rift: 'Net-Breach', plague: 'Viral code' },
		accent: '#ff3fa4', ink: '#0d0b18'
	},
	biopunk: {
		id: 'biopunk', name: 'Biopunk', blurb: 'Grown cities, gene-clans, fungal undernets, living airships.',
		forms: ['Gene-Clan', 'Hive Collective', 'Splice Republic'], formBias: 0.55,
		kinds: { surface: ['Grown Town', 'Hive City', 'Spore Port', 'Vat Town'], deep: ['Mycelial Warren', 'Root Hive'], sky: ['Gasbag Colony', 'Sky-Whale City'], sea: ['Kelp City', 'Coral Hive'] },
		layerNames: { surface: 'Canopy', deep: 'Mycelium', sky: 'Drift', sea: 'Reef' },
		density: { deep: 0.8, sky: 0.6, sea: 0.8 },
		terms: { army: 'Swarms', gold: 'Biomass', mana: 'Gene-Will', god: 'Progenitor', road: 'Vine-road', tunnel: 'Root tunnel', skylane: 'Spore drift', rift: 'Membrane Tear', plague: 'Blight' },
		accent: '#7ccf5a', ink: '#101a10'
	},
	solarpunk: {
		id: 'solarpunk', name: 'Solarpunk', blurb: 'Garden cities, cooperatives, kite-ports and reef-farms.',
		forms: ['Commune', 'Bioregion', 'Cooperative', 'Assembly', 'Garden League'], formBias: 0.6,
		kinds: { surface: ['Garden Town', 'Eco-City', 'Solar Village', 'Tide Port'], deep: ['Cool-Earth Archive', 'Seed Vault', 'Geothermal Hall'], sky: ['Kite City', 'Sun-Sail Port', 'Cloud Garden'], sea: ['Reef Farm', 'Tidal Commune'] },
		layerNames: { surface: 'Commons', deep: 'Earthworks', sky: 'Sun Sails', sea: 'Tides' },
		density: { deep: 0.5, sky: 0.8, sea: 0.8 },
		terms: { army: 'Militia', gold: 'Credits', mana: 'Harmony', god: 'Gaia', road: 'Greenway', tunnel: 'Earthway', skylane: 'Kite route', rift: 'Gaia Fold', plague: 'Blight' },
		accent: '#e2b93b', ink: '#13201a'
	}
};
