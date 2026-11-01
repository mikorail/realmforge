import type { Rng } from '../rng';
import type { Genre } from '../gen/genre';

export type TechBranch = 'warfare' | 'arcana' | 'engineering' | 'agronomy' | 'navigation';

export interface BranchMeta {
	id: TechBranch;
	name: string;
	icon: string;
	color: string;
	description: string;
}

export const TECH_BRANCHES: Record<TechBranch, BranchMeta> = {
	warfare: {
		id: 'warfare',
		name: 'Warfare & Tactics',
		icon: '⚔️',
		color: '#e06c75',
		description: 'Martial arms, siege craft, and strategic doctrines.'
	},
	arcana: {
		id: 'arcana',
		name: 'Arcana & Science',
		icon: '🔮',
		color: '#c678dd',
		description: 'Leyline physics, celestial mathematics, and esoteric theory.'
	},
	engineering: {
		id: 'engineering',
		name: 'Engineering & Masonry',
		icon: '⚙️',
		color: '#d19a66',
		description: 'Structural architecture, hydraulics, and prime mover engines.'
	},
	agronomy: {
		id: 'agronomy',
		name: 'Agronomy & Medicine',
		icon: '🌿',
		color: '#98c379',
		description: 'Crop domestication, curative apothecaries, and synthetic biomes.'
	},
	navigation: {
		id: 'navigation',
		name: 'Navigation & Transit',
		icon: '🧭',
		color: '#61afef',
		description: 'Cartography, open-ocean sails, and dimensional transit.'
	}
};

export interface TechDiscovery {
	id: string;
	name: string;
	branch: TechBranch;
	era: number;
	icon: string;
	description: string;
	reqs?: string[];
	inventions: string[];
	bonus: {
		army?: number;
		tax?: number;
		stability?: number;
		popGrowth?: number;
	};
}

export interface EraDef {
	index: number;
	name: string;
	genreName: string;
	threshold: number;
	blurb: string;
}

export const ERAS: EraDef[] = [
	{ index: 0, name: 'Age of Myth and Foundation', genreName: 'Mythic Antiquity', threshold: 0, blurb: 'Carved runestones, oral epics, and primal hearthfires.' },
	{ index: 1, name: 'Age of Iron and Sails', genreName: 'High Feudal', threshold: 100, blurb: 'Steel armaments, parchment charters, and deep-keeled cog ships.' },
	{ index: 2, name: 'Age of Steam and Gears', genreName: 'Clockwork Steampunk', threshold: 250, blurb: 'Piston forges, brass undercities, and aether locomotives.' },
	{ index: 3, name: 'Age of Steel and Combustion', genreName: 'Industrial Dieselpunk', threshold: 450, blurb: 'Telegraph networks, dreadnought hulls, and chemical foundries.' },
	{ index: 4, name: 'Age of Silicon and Light', genreName: 'Synthetic Solarpunk', threshold: 700, blurb: 'Living cybergrids, clean solar towers, and bio-engineered flora.' }
];

/** Era a genre naturally starts in, for the setup's "lock to my genre's era" age lock. */
export const GENRE_AGE: Record<Genre, number> = {
	mythic: 0,
	fantasy: 1,
	steampunk: 2,
	dieselpunk: 3,
	atompunk: 4,
	cyberpunk: 4,
	biopunk: 4,
	solarpunk: 4,
	wasteland: 4,
	twilight: 1
};

/** The era a world is pinned to by `GenOptions.ageLock` (clamped to the ERAS range), or null when the age is free. */
export function lockedEra(lock: number | null | undefined): number | null {
	if (lock == null || !Number.isFinite(lock)) return null;
	return Math.min(ERAS.length - 1, Math.max(0, Math.round(lock)));
}

export const DISCOVERIES: TechDiscovery[] = [
	// Era 0: Mythic Antiquity
	{
		id: 'bronze',
		name: 'Bronze Metallurgy',
		branch: 'warfare',
		era: 0,
		icon: '🗡',
		description: 'Alloying copper and tin produces forged spears and stout shields.',
		inventions: ['Cast Bronze Broadsword', 'Phalanx Aspis Shield', 'Scale Cuirass'],
		bonus: { army: 0.1 }
	},
	{
		id: 'runes',
		name: 'Codified Runes',
		branch: 'arcana',
		era: 0,
		icon: 'ᚱ',
		description: 'Codified inscriptions and glyphs stabilize realm administrative governance.',
		inventions: ['Parchment Scrolls', 'Astrological Almanacs', 'Glyph of Sealing'],
		bonus: { stability: 6 }
	},
	{
		id: 'irrigation',
		name: 'Terrace Irrigation',
		branch: 'engineering',
		era: 0,
		icon: '🌊',
		description: 'Canal systems and stone sluices boost regional harvest yields.',
		inventions: ['Stone Sluice Gates', 'Qanat Water Channels', 'Terraced Earthworks'],
		bonus: { popGrowth: 0.12 }
	},
	{
		id: 'herbalism',
		name: 'Herbal Medicine',
		branch: 'agronomy',
		era: 0,
		icon: '🌿',
		description: 'Botanical extracts, salves, and poultices curb early infant mortality.',
		inventions: ['Willowbark Tincture', 'Poultice Compresses', 'Field Dressings'],
		bonus: { popGrowth: 0.08, stability: 3 }
	},
	{
		id: 'wayfinding',
		name: 'Celestial Wayfinding',
		branch: 'navigation',
		era: 0,
		icon: '🧭',
		description: 'Navigating by seasonal stellar paths and coastline landmarks expands coastal trade.',
		inventions: ['Sunstone Polarizer', 'Pole Star Sextant Stick', 'Coastal Sounding Poles'],
		bonus: { tax: 0.03 }
	},

	// Era 1: High Feudal / Iron & Sails
	{
		id: 'ironwork',
		name: 'Blast Furnaces',
		branch: 'warfare',
		era: 1,
		icon: '⚒',
		description: 'Hardened iron and pattern-welded steel arm disciplined standing infantry.',
		reqs: ['bronze'],
		inventions: ['Pattern-Welded Longsword', 'Heavy Crossbow Winch', 'Plate Mail Breastplate'],
		bonus: { army: 0.15 }
	},
	{
		id: 'alchemy',
		name: 'Natural Philosophy & Alchemy',
		branch: 'arcana',
		era: 1,
		icon: '🧪',
		description: 'Systematic observation and distillation uncover reactive elemental reagents.',
		reqs: ['runes'],
		inventions: ['Aqua Regia Solvent', 'Distillation Retort', 'Refined Saltpeter'],
		bonus: { tax: 0.04, stability: 4 }
	},
	{
		id: 'aqueducts',
		name: 'Monumental Masonry',
		branch: 'engineering',
		era: 1,
		icon: '🏛',
		description: 'Volcanic pozzolana mortar and tiered archways supply sprawling fortified burgs.',
		reqs: ['irrigation'],
		inventions: ['Hydraulic Lime Cement', 'Flying Buttresses', 'Tiered Aqueduct Viaducts'],
		bonus: { stability: 6, popGrowth: 0.08 }
	},
	{
		id: 'crop_rotation',
		name: 'Three-Field Rotation',
		branch: 'agronomy',
		era: 1,
		icon: '🌾',
		description: 'Legume planting and heavy wheeled ploughs rejuvenate depleted topsoil.',
		reqs: ['herbalism'],
		inventions: ['Mouldboard Iron Plough', 'Rigid Horse Collar Harness', 'Tide Watermills'],
		bonus: { popGrowth: 0.15 }
	},
	{
		id: 'astrolabe',
		name: 'Naval Astrolabes',
		branch: 'navigation',
		era: 1,
		icon: '⚓',
		description: 'Open-sea astronomical navigation accelerates oceanic commerce.',
		reqs: ['wayfinding'],
		inventions: ['Lateen-Rigged Caravel', 'Dry Mariner Box Compass', 'Portolan Sea Charts'],
		bonus: { tax: 0.06 }
	},

	// Era 2: Clockwork Steampunk / Steam & Gears
	{
		id: 'rifling',
		name: 'Rifled Barrels',
		branch: 'warfare',
		era: 2,
		icon: '💥',
		description: 'Spiral bore grooving grants unprecedented accuracy to massed line infantry.',
		reqs: ['ironwork'],
		inventions: ['Expanding Conical Bullet', 'Breech-Loading Field Cannon', 'Ironclad Casemate'],
		bonus: { army: 0.2 }
	},
	{
		id: 'spectroscopy',
		name: 'Prismatic Optics',
		branch: 'arcana',
		era: 2,
		icon: '🔮',
		description: 'Achromatic lenses reveal stellar spectra and invisible wavelengths of light.',
		reqs: ['alchemy'],
		inventions: ['Solar Spectrograph', 'Achromatic Refracting Lens', 'Silver Halide Daguerreotype'],
		bonus: { stability: 6, tax: 0.05 }
	},
	{
		id: 'steam_engine',
		name: 'High-Pressure Steam',
		branch: 'engineering',
		era: 2,
		icon: '⚙',
		description: 'Expanding steam pistons power automated looms, pit-pumps, and foundry trip-hammers.',
		reqs: ['aqueducts'],
		inventions: ['Watt Double-Acting Engine', 'Centrifugal Flyball Governor', 'Steam Drop-Hammer'],
		bonus: { tax: 0.08, army: 0.15 }
	},
	{
		id: 'pasteurization',
		name: 'Germ Theory & Sanitation',
		branch: 'agronomy',
		era: 2,
		icon: '🧫',
		description: 'Microscopic pathogen isolation cleanses urban water and curtails seasonal pestilence.',
		reqs: ['crop_rotation'],
		inventions: ['Thermal Pasteurizer', 'Phenol Antiseptic Spray', 'Sterile Surgical Bandages'],
		bonus: { popGrowth: 0.18, stability: 4 }
	},
	{
		id: 'railways',
		name: 'Iron Railways',
		branch: 'navigation',
		era: 2,
		icon: '🛤',
		description: 'Locomotives connect distant frontier provinces in a fraction of previous transit time.',
		reqs: ['astrolabe', 'steam_engine'],
		inventions: ['Steam Flanged-Wheel Engine', 'Electric Telegraph Dispatch', 'Bessemer Steel Rails'],
		bonus: { popGrowth: 0.15, stability: 5 }
	},

	// Era 3: Industrial Dieselpunk / Steel & Combustion
	{
		id: 'diesel_armor',
		name: 'Mechanized Armor',
		branch: 'warfare',
		era: 3,
		icon: '🚜',
		description: 'Heavy diesel engines and rolled steel armor plates dominate contested battlefields.',
		reqs: ['rifling'],
		inventions: ['Continuous Caterpillar Tread', 'Revolving Cast Turret', 'High-Frequency Tank Transceiver'],
		bonus: { army: 0.25 }
	},
	{
		id: 'electrodynamics',
		name: 'Electromagnetic Grids',
		branch: 'arcana',
		era: 3,
		icon: '⚡',
		description: 'Alternating current dynamos and high-voltage transmission lines illuminate whole metropolises.',
		reqs: ['spectroscopy'],
		inventions: ['AC Polyphase Generator', 'Cathode Ray Tube', 'Thermionic Vacuum Triode'],
		bonus: { tax: 0.1, stability: 6 }
	},
	{
		id: 'combustion',
		name: 'Internal Combustion',
		branch: 'engineering',
		era: 3,
		icon: '🏭',
		description: 'Liquid fuel cylinders deliver compact, high-density torque for factories and transit.',
		reqs: ['steam_engine'],
		inventions: ['Four-Stroke Spark Engine', 'Catalytic Cracking Still', 'Moving Assembly Conveyor'],
		bonus: { tax: 0.12, army: 0.1 }
	},
	{
		id: 'synthetic_cure',
		name: 'Medicinal Refining',
		branch: 'agronomy',
		era: 3,
		icon: '💉',
		description: 'Industrial fermentation of antibacterial molds eradicates historic plagues.',
		reqs: ['pasteurization'],
		inventions: ['Penicillin Crystallization', 'Synthetic Sulfa Compounds', 'Cryogenic Plasma Storage'],
		bonus: { popGrowth: 0.2 }
	},
	{
		id: 'aviation',
		name: 'Atmospheric Aviation',
		branch: 'navigation',
		era: 3,
		icon: '✈️',
		description: 'Rigid duralumin airframes and radial combustion engines conquer cloud heights.',
		reqs: ['railways', 'combustion'],
		inventions: ['Cantilever Monoplane Wing', 'Supercharged Radial Engine', 'Gyroscopic Flight Horizon'],
		bonus: { tax: 0.08, stability: 6 }
	},

	// Era 4: Synthetic Solarpunk / Silicon & Light
	{
		id: 'directed_energy',
		name: 'Coherent Particle Arrays',
		branch: 'warfare',
		era: 4,
		icon: '📡',
		description: 'Solid-state maser arrays and kinetic rail systems protect orbital and planetary borders.',
		reqs: ['diesel_armor'],
		inventions: ['High-Power Optical Maser', 'Superconducting Railgun', 'Magnetic Deflection Screen'],
		bonus: { army: 0.25, stability: 8 }
	},
	{
		id: 'quantum_mesh',
		name: 'Optical Data Mesh',
		branch: 'arcana',
		era: 4,
		icon: '🌐',
		description: 'Ubiquitous photonic computing and decentralized civic consensus councils.',
		reqs: ['electrodynamics'],
		inventions: ['Topological Quantum Core', 'Global Holographic Node', 'Decentralized Neural Council'],
		bonus: { stability: 12, tax: 0.12 }
	},
	{
		id: 'clean_power',
		name: 'Aether Micro-reactors',
		branch: 'engineering',
		era: 4,
		icon: '☀️',
		description: 'Compact magnetic confinement and solar collectors provide inexhaustible clean power.',
		reqs: ['combustion'],
		inventions: ['Compact Magnetic Torus', 'Dyson Collector Swarm', 'High-Yield Perovskite Solar Skin'],
		bonus: { popGrowth: 0.25 }
	},
	{
		id: 'bio_harmony',
		name: 'Symbiotic Biospheres',
		branch: 'agronomy',
		era: 4,
		icon: '🌿',
		description: 'Engineered flora and fungal bio-filters restore industrial waste basins into lush gardens.',
		reqs: ['synthetic_cure'],
		inventions: ['Bioluminescent Carbon Sink Trees', 'Mycelial Biodegradable Polymer', 'Gene-Repaired Flora'],
		bonus: { stability: 10, army: 0.1 }
	},
	{
		id: 'orbital_transit',
		name: 'Suborbital Transit & Shuttles',
		branch: 'navigation',
		era: 4,
		icon: '🚀',
		description: 'Vacuum tube maglevs and reusable aerospike shuttles connect planets and floating orbitals.',
		reqs: ['aviation'],
		inventions: ['Vacuum Maglev Hyperloop', 'Single-Stage Aerospike Shuttle', 'Orbital Skyhook Cable'],
		bonus: { tax: 0.15, stability: 8 }
	}
];

/** Retrieve all tech discoveries available up to the given era */
export function techsForEra(eraIndex: number): TechDiscovery[] {
	return DISCOVERIES.filter((d) => d.era <= eraIndex);
}

/** Check if any new discoveries can be unlocked given current innovation and prerequisites */
export function checkNextDiscovery(
	unlockedIds: Set<string>,
	currentEra: number,
	rng: Rng
): TechDiscovery | null {
	const candidates = DISCOVERIES.filter((d) => {
		if (d.era > currentEra || unlockedIds.has(d.id)) return false;
		if (d.reqs && !d.reqs.every((req) => unlockedIds.has(req))) return false;
		return true;
	});
	if (!candidates.length) return null;
	return rng.pick(candidates);
}
