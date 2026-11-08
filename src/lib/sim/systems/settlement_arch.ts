import type { Simulation } from '../engine';
import type { Burg } from '../../gen/types';
import { SPECIES_BY_ID } from '../../gen/species';

export interface SettlementArchitecture {
	silhouette: string;
	gateType: string;
	wallMaterial: string;
	roofStyle: string;
	monument: string;
	culturalTrait: string;
}

export function settlementArchitecture(sim: Simulation, burg: Burg): SettlementArchitecture {
	const cult = sim.w.cultures[burg.culture];
	const spId = cult?.species ?? 'human';
	const sphere = cult?.sphere ?? 'generic';
	const dists = burg.districts ?? { market: 0, temple: 0, granary: 0, walls: 0, academy: 0 };
	const isCapital = Boolean(burg.capital);
	const layer = burg.layer ?? 'surface';

	let wallMaterial = 'Ashlar Stone';
	let gateType = 'Reinforced Portcullis Gate';
	let silhouette = 'Gabled Towers & Keeps';
	let roofStyle = 'Tile Roofs';
	let monument = 'Plaza Obelisk';
	let culturalTrait = 'Masonry & Timber';

	if (layer === 'deep' || spId === 'dwarf' || spId === 'chaos_dwarf') {
		wallMaterial = 'Dressed Granite & Riveted Iron';
		gateType = 'Runic Adamantine Great-Gate';
		silhouette = 'Subterranean Bastions & Megaliths';
		roofStyle = 'Living Rock Vaults';
		monument = 'Ancestral Forge Shrine';
		culturalTrait = 'Subterranean Deep Mining';
	} else if (spId === 'elf' || spId === 'celestial') {
		wallMaterial = 'Fluted White Marble';
		gateType = 'Starlight Archway';
		silhouette = 'Slender Spires & Crystal Terraces';
		roofStyle = 'Nacreous Domes';
		monument = 'Astral Chronometer';
		culturalTrait = 'Primal Harmonization';
	} else if (spId === 'wood_elf' || spId === 'halfling') {
		wallMaterial = 'Hewn Timber & Living Briar-Hedges';
		gateType = 'Ironwood Postern Gate';
		silhouette = 'Sylvan Longhouses & Burrows';
		roofStyle = 'Sod & Thatch';
		monument = 'Sacred Grove Tree';
		culturalTrait = 'Verdant Arboriculture';
	} else if (spId === 'dark_elf' || spId === 'void_elf' || spId === 'warp_fiend') {
		wallMaterial = 'Glassy Volcanic Obsidian';
		gateType = 'Barbed Iron Bastion Gate';
		silhouette = 'Jagged Spikes & Shadow Keeps';
		roofStyle = 'Gargoyle Cornices';
		monument = 'Void Monolith';
		culturalTrait = 'Eldritch Metallurgy';
	} else if (spId === 'orc' || spId === 'troll' || spId === 'ogor' || spId === 'beastman' || spId === 'ratfolk') {
		wallMaterial = 'Mammoth Bone & Heavy Timber Palisade';
		gateType = 'Tusked Spiked Gate';
		silhouette = 'Horde Yurts & Watchtowers';
		roofStyle = 'Stretched Hide & Fur';
		monument = 'Totem Skull Pole';
		culturalTrait = 'Nomadic Blood-Pact';
	} else if (spId === 'merfolk') {
		wallMaterial = 'Calcified Reef-Coral & Nacre';
		gateType = 'Submerged Water-Gate';
		silhouette = 'Spiral Conch Citadels';
		roofStyle = 'Bioluminescent Domes';
		monument = 'Tide Pearl Sanctuary';
		culturalTrait = 'Pelagic Architecture';
	} else if (spId === 'lizardfolk' || spId === 'saurian') {
		wallMaterial = 'Sun-Baked Ochre Adobe & Basalt';
		gateType = 'Stepped Sun-Pylon Gate';
		silhouette = 'Stepped Ziggurats & Terraces';
		roofStyle = 'Reed Mats & Sun-Terraces';
		monument = 'Solar Feathered Altar';
		culturalTrait = 'Solar Astronomy';
	} else {
		// Human / Cultural Sphere breakdowns
		if (sphere.includes('sinic') || sphere.includes('japonic') || sphere.includes('asian')) {
			wallMaterial = 'Kiln Brick & Lacquered Bamboo';
			gateType = 'Sweeping Paifang Arch Gate';
			silhouette = 'Multi-Tiered Pagodas & Courtyards';
			roofStyle = 'Curved Eaves & Clay Shingles';
			monument = 'Imperial Spirit Bell';
			culturalTrait = 'Siheyuan Courtyards';
		} else if (sphere.includes('semitic') || sphere.includes('persianate') || sphere.includes('sahel') || sphere.includes('ethiop')) {
			wallMaterial = 'Sun-Baked Ochre Adobe & Terracotta';
			gateType = 'Carved Iwan Arch Gate';
			silhouette = 'Minarets, Riads & Domes';
			roofStyle = 'Geometric Mosaic Domes';
			monument = 'Bazaar Fountain';
			culturalTrait = 'Desert Hydraulic Engineering';
		} else if (sphere.includes('nordic') || sphere.includes('celtic') || sphere.includes('slavic') || sphere.includes('boreal')) {
			wallMaterial = 'Notched Pine Timber & Peat';
			gateType = 'Carved Dragon-Post Gate';
			silhouette = 'Apsidal Great Halls & Stave Spires';
			roofStyle = 'Pitch-Tarred Shingles';
			monument = 'Clan Runestone';
			culturalTrait = 'Communal Hearth-Fire';
		} else {
			wallMaterial = 'Dressed Ashlar Limestone';
			gateType = 'Twin-Towered Portcullis Barbican';
			silhouette = 'Crenellated Keeps & Bell Towers';
			roofStyle = 'Slate Gables';
			monument = 'Town Hall Belfry';
			culturalTrait = 'Guild Guildhalls';
		}
	}

	if (isCapital) {
		silhouette = 'Grand Imperial ' + silhouette;
		monument = 'High Citadel Throne Monument';
	}
	if ((dists.walls ?? 0) >= 2) {
		wallMaterial = 'Moated ' + wallMaterial;
		gateType = 'Twin-Bastion Barbican Gate';
	}

	return { silhouette, gateType, wallMaterial, roofStyle, monument, culturalTrait };
}
