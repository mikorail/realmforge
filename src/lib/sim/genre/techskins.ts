/**
 * Genre re-skins for the 25 tech discoveries (src/lib/sim/tech.ts). Fantasy and mythic keep the base names.
 * Lookups by id only: the discovery's branch, era, bonuses and reqs stay in tech.ts.
 */
import type { Genre } from '../../gen/genre';

export type SkinGenre = Exclude<Genre, 'fantasy' | 'mythic'>;
export interface TechSkin {
	name: string;
	desc: string;
}

type SkinTable = Partial<Record<Genre, Record<string, TechSkin>>>;

export const TECH_SKINS: Record<SkinGenre, Record<string, TechSkin>> = {
	steampunk: {
		bronze: { name: 'Brass Foundry Alloys', desc: 'Cast brass and bronze gears arm the first clockwork-ready regiments.' },
		runes: { name: 'Punch-Card Ledgers', desc: "Perforated cards and cipher wheels keep the realm's accounts in order." },
		irrigation: { name: 'Hydraulic Sluice Works', desc: 'Brass-geared sluices and pressure pipes carry water to every factory town.' },
		herbalism: { name: 'Laboratory Apothecary', desc: 'Glass retorts and steam stills turn out tinctures for the mill towns.' },
		wayfinding: { name: 'Chronometer Navigation', desc: "Marine chronometers and sextants fix a ship's position anywhere at sea." },
		ironwork: { name: 'Steel Foundry Battalions', desc: 'Bessemer converters forge steel for the first armoured steam columns.' },
		alchemy: { name: 'Chemical Works', desc: 'Dye vats and acid tanks industrialise the study of reagents.' },
		aqueducts: { name: 'Iron Viaduct Works', desc: 'Riveted iron viaducts carry water and rail across the valleys.' },
		crop_rotation: { name: 'Mechanical Seed Drills', desc: 'Steam-powered seed drills and reapers multiply the harvest.' },
		astrolabe: { name: 'Brass Marine Sextants', desc: "Gimballed compasses and brass sextants steady the steamship's course." },
		rifling: { name: 'Rifled Breech Cannon', desc: 'Grooved steel barrels give line infantry a deadly reach.' },
		spectroscopy: { name: 'Prismatic Telescopes', desc: 'Achromatic lenses on brass mounts read the spectra of distant stars.' },
		steam_engine: { name: 'Automated Pressure Works', desc: 'Steam pistons drive looms, pit-pumps and foundry trip-hammers.' },
		pasteurization: { name: 'Sterilising Autoclaves', desc: 'Steam autoclaves and boiled water end the worst of the city cholera.' },
		railways: { name: 'Locomotive Lines', desc: 'Iron rails join frontier towns to the capital in days, not months.' },
		diesel_armor: { name: 'Steam-Armoured Walkers', desc: 'Armoured steam walkers stride over trenches and rubble.' },
		electrodynamics: { name: 'Galvanic Dynamos', desc: 'Brass dynamos and spark coils light the first electric streets.' },
		combustion: { name: 'Gas Engine Works', desc: 'Coal-gas engines drive small workshops and river barges.' },
		synthetic_cure: { name: 'Chemical Compound Pharmacies', desc: 'Steam-distilled compounds fill sealed bottles in every pharmacy.' },
		aviation: { name: 'Airship Routes', desc: 'Hydrogen airships ply the lanes between the great cities.' },
		directed_energy: { name: 'Arc-Coil Cannon', desc: 'Electric arc cannons throw lightning across the battlefield.' },
		quantum_mesh: { name: 'Telegraph Lattice', desc: 'A lattice of telegraph wires carries messages to every council.' },
		clean_power: { name: 'Aether Coil Reactors', desc: 'Compact aether coils draw clean power out of the open sky.' },
		bio_harmony: { name: 'Steam-Heated Glasshouses', desc: 'Heated glasshouses and steam irrigation grow crops all year round.' },
		orbital_transit: { name: 'Stratospheric Balloon Ports', desc: 'Balloon-ships climb to the aether stations above the clouds.' }
	},
	dieselpunk: {
		bronze: { name: 'Manganese Armour Casting', desc: 'Cast manganese steel plates shield early bunker garrisons.' },
		runes: { name: 'Propaganda Codes', desc: 'Coded broadcasts and stamped ledgers keep the ministries in line.' },
		irrigation: { name: 'Dam and Canal Programmes', desc: "State dams and pump canals feed the bloc's industrial cities." },
		herbalism: { name: 'Field Hospitals', desc: 'Mobile surgical trains and ward blocks treat the wounded at scale.' },
		wayfinding: { name: 'Radio Beacons', desc: 'Radio fixes and sonar buoys guide convoys through fog and blackouts.' },
		ironwork: { name: 'Tank Divisions', desc: 'Heavy tank hulls and anti-tank guns reshape the front.' },
		alchemy: { name: 'Synthetic Chemistry', desc: 'Ersatz fuels and nitrate compounds keep the war economy running.' },
		aqueducts: { name: 'Reinforced Concrete Works', desc: 'Poured concrete raises dams, bunkers and bridges in months.' },
		crop_rotation: { name: 'Fertiliser Quotas', desc: "State nitrate plants and quota farms feed the bloc's cities." },
		astrolabe: { name: 'Convoy Navigation', desc: "Coded convoy routes and submarine charts guide the fleets." },
		rifling: { name: 'Machine-Gun Nests', desc: 'Belt-fed machine guns turn trenches into kill zones.' },
		spectroscopy: { name: 'Radar-Optics Research', desc: 'Wavelength studies reveal enemy movements through cloud and night.' },
		steam_engine: { name: 'Heavy Diesel Plants', desc: "Diesel generators power the bloc's factories around the clock." },
		pasteurization: { name: 'Public Hygiene Campaigns', desc: 'State sanitation drives and disinfected sewers keep the masses healthy.' },
		railways: { name: 'Armoured Train Network', desc: 'Heavy armoured trains move troops and munitions along a fixed grid.' },
		diesel_armor: { name: 'Diesel Tank Armour', desc: 'Diesel-engined tanks in rolled steel plate dominate the field.' },
		electrodynamics: { name: 'Radio Propaganda Grid', desc: 'Electrified broadcast towers blanket the bloc with state radio.' },
		combustion: { name: 'Diesel Mass Production', desc: 'Diesel engines are mass produced for trucks, ships and the front.' },
		synthetic_cure: { name: 'Sulfa Drug Plants', desc: 'Mass-produced sulfa drugs are issued to troops and cities alike.' },
		aviation: { name: 'Bomber Squadrons', desc: 'Heavy bombers and fighter squadrons rule the skies.' },
		directed_energy: { name: 'Radar-Guided Flak', desc: 'Radar-guided flak batteries guard every frontier town.' },
		quantum_mesh: { name: 'Wireless Command Net', desc: 'A wireless command network ties every division together.' },
		clean_power: { name: 'Fission Plants', desc: "Nuclear fission plants offer cheap power to the bloc's factories." },
		bio_harmony: { name: 'Soil Reclamation Programme', desc: 'State projects restore poisoned soils across the bloc.' },
		orbital_transit: { name: 'Rocket Mail', desc: 'Experimental rockets carry fast mail and cargo between cities.' }
	},
	atompunk: {
		bronze: { name: 'Titanium-Copper Alloys', desc: 'Early light alloys harden the first vault blast doors.' },
		runes: { name: 'Standardised Schematics', desc: 'Blueprint microfilm and punch codes standardise the new bureaucracy.' },
		irrigation: { name: 'Reservoir Grids', desc: 'Concrete reservoirs and automated sprinklers green the new suburbs.' },
		herbalism: { name: 'Pharmaceutical Labs', desc: 'Mass-produced vitamins and antibiotics reach every pharmacy.' },
		wayfinding: { name: 'Radar Navigation', desc: 'Radar screens and inertial guidance plot courses through any weather.' },
		ironwork: { name: 'Power Armour Legions', desc: 'Powered armour turns infantry squads into walking fortresses.' },
		alchemy: { name: 'Isotope Chemistry', desc: 'Radioisotope tracers reveal how matter changes at the atomic scale.' },
		aqueducts: { name: 'Prestressed Megastructures', desc: 'Prestressed girders span stadiums and reactor halls.' },
		crop_rotation: { name: 'Tractor Cooperatives', desc: 'Diesel tractors and hybrid seed lines transform the rural suburbs.' },
		astrolabe: { name: 'Gyro-Stabilised Navigation', desc: 'Gyrocompasses and inertial units keep ships on course without stars.' },
		rifling: { name: 'Precision Rifle Platoons', desc: 'Scoped semi-automatic rifles make every squad a marksman.' },
		spectroscopy: { name: 'Spectroscopic Analysis', desc: 'Spectrometers identify every element in a sample, from ore to sunlight.' },
		steam_engine: { name: 'Turbine Power Stations', desc: 'Steam turbines driven by fission heat supply the new cities.' },
		pasteurization: { name: 'Antiseptic Clean Rooms', desc: 'Sterile labs and filtered-air rooms keep infection at bay.' },
		railways: { name: 'Electric Rail Corridors', desc: 'Electrified mainlines carry commuters across the new suburbs.' },
		diesel_armor: { name: 'Armoured Carrier Fleets', desc: 'Armoured carriers and all-terrain jeeps roll across any ground.' },
		electrodynamics: { name: 'Television Networks', desc: 'Broadcast towers and cathode screens bring every home the same news.' },
		combustion: { name: 'Jet Propulsion', desc: 'Jet turbines push machines past the sound barrier.' },
		synthetic_cure: { name: 'Penicillin Mass Production', desc: 'Industrial fermentation tanks flood the world with penicillin.' },
		aviation: { name: 'Jetliner Airways', desc: 'Jetliners carry passengers across continents in hours.' },
		directed_energy: { name: 'Laser Defence Grid', desc: 'Orbital laser platforms and rail guns watch the borders.' },
		quantum_mesh: { name: 'Mainframe Computers', desc: 'Room-sized computers run payroll, weapons and planning for the state.' },
		clean_power: { name: 'Atomic Power Plants', desc: 'Atomic reactors power the rocket-age cities.' },
		bio_harmony: { name: 'Hydroponic Domes', desc: 'Bubble domes grow lush gardens inside sterile suburbs.' },
		orbital_transit: { name: 'Orbital Launch Pads', desc: 'Reusable shuttles lift crews and cargo from the pads to orbit.' }
	},
	cyberpunk: {
		bronze: { name: 'Polymer Alloy Plating', desc: 'Cheap composite plating turns gang crews into walking armour.' },
		runes: { name: 'Encryption Ciphers', desc: 'Cryptographic keys lock down every ledger in the sprawl.' },
		irrigation: { name: 'Hydroponic Terraces', desc: 'Stacked vertical farms and recycled water loops feed the arcology towers.' },
		herbalism: { name: 'Nanite Triage', desc: 'Injectable nano-patches stop bleeding before the medics arrive.' },
		wayfinding: { name: 'GPS Lattice', desc: 'A satellite lattice pins every vehicle and courier to the metre.' },
		ironwork: { name: 'Chrome Augment Corps', desc: 'Cybernetic limbs and smart rifles turn security teams into killers.' },
		alchemy: { name: 'Nanochemistry', desc: 'Programmable molecules assemble drugs, polymers and fuel on demand.' },
		aqueducts: { name: 'Modular Megablock Frames', desc: 'Prefab frames stack housing blocks into the sky.' },
		crop_rotation: { name: 'Vertical Crop Pods', desc: 'Sealed crop pods in the towers grow year-round under LED light.' },
		astrolabe: { name: 'Autonomous Routing', desc: 'Route-planning AIs sail cargo ships through the ocean lanes unaided.' },
		rifling: { name: 'Smart-Targeting Rifles', desc: 'Networked scopes lock on targets through walls and smoke.' },
		spectroscopy: { name: 'Multispectral Sensors', desc: 'Multispectral sensors see through smog, skin and walls.' },
		steam_engine: { name: 'Corporate Turbine Grids', desc: 'Corporate turbines sell power to the sprawl by subscription.' },
		pasteurization: { name: 'Biohazard Scrubbers', desc: "Automated decontamination sweeps purge the sprawl's sewers." },
		railways: { name: 'Maglev Spines', desc: 'Maglev spines link the arcologies at train speed.' },
		diesel_armor: { name: 'Exo-Armour Assault', desc: 'Exo-frames and drone escorts make heavy assault squads nearly unstoppable.' },
		electrodynamics: { name: 'Neon Power Grids', desc: 'Mains power lights the neon districts, and a corp owns the grid.' },
		combustion: { name: 'Hover-Car Fuel Cells', desc: 'Hydrogen fuel cells power cars and hovercraft in the streets.' },
		synthetic_cure: { name: 'Designer Pharmacology', desc: "Subscription drugs tailored to each patient's genome." },
		aviation: { name: 'Autonomous Air Taxis', desc: 'Air taxis weave between the arcology spires without pilots.' },
		directed_energy: { name: 'Laser Drone Patrols', desc: 'Swarms of laser drones patrol corporate borders and the orbital ring.' },
		quantum_mesh: { name: 'Neural Lace Mesh', desc: 'Neural lace implants wire minds straight into a city-wide mesh network.' },
		clean_power: { name: 'Fusion Microreactors', desc: 'Corporate fusion microreactors power the arcology towers.' },
		bio_harmony: { name: 'Gene-Tailored Biomes', desc: "Designer crops and bio-filters clean the sprawl's waste basins." },
		orbital_transit: { name: 'Orbital Elevator', desc: 'A cable-tethered elevator lifts cargo and elites from surface to orbit.' }
	},
	biopunk: {
		bronze: { name: 'Chitin Shell Grafts', desc: 'Engineered chitin shells, grown in vats, harden the first living battle-suits.' },
		runes: { name: 'Genetic Codices', desc: 'Annotated gene-sequence scrolls record every bloodline and graft.' },
		irrigation: { name: 'Bio-Irrigated Roots', desc: 'Living root networks route and filter water through the grown cities.' },
		herbalism: { name: 'Symbiotic Remedies', desc: 'Gut-flora cultures and fungal salves cure what old herbs could not.' },
		wayfinding: { name: 'Pheromone Trails', desc: 'Bred navigator-birds and scent trails mark safe routes across the drift.' },
		ironwork: { name: 'Bone-Lattice Growths', desc: 'Cultivated bone lattice and keratin plates reinforce living soldiers.' },
		alchemy: { name: 'Enzyme Alchemy', desc: 'Engineered enzymes transmute raw sludge into usable reagents.' },
		aqueducts: { name: 'Grown Lattice Arches', desc: 'Living coral-lattice arches are grown rather than built, and self-repair.' },
		crop_rotation: { name: 'Engineered Soil Microbes', desc: 'Designed soil bacteria fix nitrogen and restore depleted land.' },
		astrolabe: { name: 'Living Sonar Routing', desc: 'Bioluminescent sonar-animals chart the reefs for ship pilots.' },
		rifling: { name: 'Venom-Dart Launchers', desc: 'Bred spine-darts and toxin launchers deliver precise, silent injury.' },
		spectroscopy: { name: 'Bioluminescent Assays', desc: 'Glowing reporter cells reveal the chemistry inside any living tissue.' },
		steam_engine: { name: 'Biogas Digesters', desc: 'Methane digesters and fermentation engines power the living cities.' },
		pasteurization: { name: 'Pathogen Mapping', desc: 'Gene-level tracing isolates each pathogen before it spreads.' },
		railways: { name: 'Living Vine Rails', desc: 'Grown rail-vines carry sap-cars along the root roads.' },
		diesel_armor: { name: 'Living Battle Beasts', desc: 'Bio-engineered war-beasts carry armour plates grown into their hides.' },
		electrodynamics: { name: 'Bioelectric Ganglia', desc: 'Living nerve clusters conduct current through grown networks.' },
		combustion: { name: 'Algae Fuel Vats', desc: 'Algae vats brew oil-like fuel from waste sugar.' },
		synthetic_cure: { name: 'Phage Therapy Clinics', desc: 'Engineered phages hunt the bacteria that cause disease.' },
		aviation: { name: 'Gasbag Airlifts', desc: 'Grown gasbag-whales carry cargo through the drifts.' },
		directed_energy: { name: 'Bioluminescent Turrets', desc: 'Light-organs grown into turrets sear intruders from afar.' },
		quantum_mesh: { name: 'Neural Mycelium Net', desc: 'Fungal networks carry signals between living nodes across the land.' },
		clean_power: { name: 'Photosynthetic Power Organs', desc: 'Engineered photosynthetic organs supply power to the grown cities.' },
		bio_harmony: { name: 'Symbiont Ecosystems', desc: 'Engineered flora and symbiotic fungi turn toxic basins into gardens.' },
		orbital_transit: { name: 'Sky-Whale Routes', desc: 'Living sky-whales carry passengers between the grown orbital gardens.' }
	},
	solarpunk: {
		bronze: { name: 'Reclaimed Bronze Works', desc: 'Salvaged bronze is recast into tools and shields by village smiths.' },
		runes: { name: 'Commons Charters', desc: 'Shared charters and seed-keeper glyphs bind villages in mutual care.' },
		irrigation: { name: 'Permaculture Swales', desc: 'Contour swales and rain gardens hold water where the land needs it.' },
		herbalism: { name: 'Community Herbalism', desc: 'Neighbourhood herb gardens and healers share remedies freely.' },
		wayfinding: { name: 'Star-Path Commons', desc: 'Open star charts and tide calendars let every sailor find the way.' },
		ironwork: { name: 'Ploughshare Forges', desc: 'Forges turn from weapons to tools, and militia drill in simple defence.' },
		alchemy: { name: 'Green Chemistry', desc: 'Non-toxic solvents and plant reagents replace the old poisons.' },
		aqueducts: { name: 'Earthen Aqueducts', desc: 'Rammed earth and clay channels carry water with little energy.' },
		crop_rotation: { name: 'Agroecology Rotation', desc: 'Polycultures and cover crops rebuild topsoil and feed the commons.' },
		astrolabe: { name: 'Tidal Charting', desc: 'Open tide and current charts let coastal fleets sail with the sea.' },
		rifling: { name: 'Sling and Bow Guards', desc: 'Village archers and slingers defend the commons without a standing army.' },
		spectroscopy: { name: 'Sky-Watch Observatories', desc: "Community observatories chart the seasons and the sun's cycles." },
		steam_engine: { name: 'Community Biogas Mills', desc: 'Shared biogas mills and hot-water works serve the whole village.' },
		pasteurization: { name: 'Clean Water Commons', desc: "Public wells and sand filters keep every village's water clean." },
		railways: { name: 'Commons Light Rail', desc: 'Light rail and bike lanes connect villages without fossil fuel.' },
		diesel_armor: { name: 'Common Defence Vehicles', desc: 'Shared armoured buses and militia rovers protect the commons.' },
		electrodynamics: { name: 'Local Microgrids', desc: 'Community microgrids share power across neighbourhoods.' },
		combustion: { name: 'Electric Commuter Fleets', desc: 'Shared electric vehicles replace private combustion cars.' },
		synthetic_cure: { name: 'Herbal Pharmacopoeia', desc: 'Community pharmacopoeias share plant-based cures freely.' },
		aviation: { name: 'Sun-Sail Gliders', desc: 'Solar-sail gliders carry mail and passengers on warm thermals.' },
		directed_energy: { name: 'Sunlight Shield Arrays', desc: 'Mirror arrays concentrate sunlight to guard the commons.' },
		quantum_mesh: { name: 'Open Data Councils', desc: 'An open data mesh and citizen councils decide by shared consensus.' },
		clean_power: { name: 'Solar Commons Grid', desc: 'Rooftop solar and shared batteries power the whole commons.' },
		bio_harmony: { name: 'Rewilding Projects', desc: 'Community rewilding turns ruined basins back into forest and wetland.' },
		orbital_transit: { name: 'Sun-Sail Orbital Ferries', desc: 'Light sails carry cargo between the surface and orbital gardens.' }
	}
};

const TABLES = TECH_SKINS as SkinTable;

/** Genre-specific discovery name, or `fallbackName` for fantasy, mythic and unknown ids. */
export function techName(genre: Genre, discoveryId: string, fallbackName: string): string {
	return TABLES[genre]?.[discoveryId]?.name ?? fallbackName;
}

/** Genre-specific one-line discovery description, or `fallbackDesc` for fantasy, mythic and unknown ids. */
export function techDesc(genre: Genre, discoveryId: string, fallbackDesc: string): string {
	return TABLES[genre]?.[discoveryId]?.desc ?? fallbackDesc;
}
