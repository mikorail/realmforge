/**
 * Genre re-skins for monster species (src/lib/sim/monsters.ts) and wonder kinds (src/lib/sim/wonders.ts).
 * Display only: ids, stats, habitats and effects stay on the base archetype. Fantasy and mythic have no skin (null).
 */
import type { Genre } from '../../gen/genre';

export type SkinGenre = Exclude<Genre, 'fantasy' | 'mythic'>;
export interface CreatureSkin {
	name: string;
	icon: string;
	lore: string;
}

type SkinTable = Partial<Record<Genre, Record<string, CreatureSkin>>>;

export const MONSTER_SKINS: Record<SkinGenre, Record<string, CreatureSkin>> = {
	steampunk: {
		Leviathan: { name: 'Iron Leviathan', icon: '🛳️', lore: 'A riveted steam-hulled colossus that tows whole harbours down into the fathoms.' },
		Behemoth: { name: 'Siege Juggernaut', icon: '🤖', lore: 'A steam walker the size of a cathedral, crushing fortifications under its brass tread.' },
		Ziz: { name: 'Clockwork Roc', icon: '🐦', lore: 'A brass-feathered sky-engine whose gears clatter through the cloud banks.' },
		'White Tiger': { name: 'Brass Tiger Automaton', icon: '🐅', lore: 'A clockwork tiger with ruby eyes that patrols the mountain railways.' },
		'Golden Sun Lion': { name: 'Gilded Sun-Engine Lion', icon: '🦁', lore: 'A golden lion of brass and gears that pulls the sun-chariot of the aetherways.' },
		'Emerald Qilin': { name: 'Brass Qilin Automaton', icon: '🦄', lore: 'A bronze-and-jade qilin of gears that heralds the arrival of airships.' },
		'Loch Monster': { name: 'Loch Steam-Serpent', icon: '🐍', lore: 'A riveted serpent of steel hidden beneath the loch, puffing steam from its gills.' },
		'Storm Roc': { name: 'Storm Airship', icon: '🎈', lore: 'A huge hydrogen-bagged storm skiff with lightning rods, sailing the aetherways.' },
		'Dread Wolf': { name: 'Iron Hound', icon: '🐺', lore: 'A clockwork wolf-hound that tracks fugitives across the coal fields.' },
		'Ancient Red Dragon': { name: 'Rogue War-Mech', icon: '🤖', lore: 'A runaway war-mech with screaming boilers, which has burned three supply depots to the ground.' },
		'Elder Frost Drake': { name: 'Ice-Automaton Drake', icon: '❄️', lore: 'A cold-iron drake of steam pipes that freezes boiler works solid.' },
		'Abyssal Kraken': { name: 'Clockwork Kraken', icon: '🦑', lore: 'A brass-tentacled engine of the deep that drags diving-bell ports under the waves.' },
		'Titan Boar Herd': { name: 'Steam-Boar Herd', icon: '🐗', lore: 'A herd of riveted boar-engines that trample the mining towns.' }
	},
	dieselpunk: {
		Leviathan: { name: 'Submarine Leviathan', icon: '🚢', lore: 'A dreadnought-sized U-boat that torpedoes convoys, its hull crusted with depth charges.' },
		Behemoth: { name: 'Bunker-Buster Tank', icon: '🛡️', lore: 'A super-heavy tank that wallows through the front and shrugs off artillery.' },
		Ziz: { name: 'Bomber Harpy', icon: '✈️', lore: 'A ruthless dive-bomber that strafes airfields and convoys alike.' },
		'White Tiger': { name: 'Armoured Tiger Tank', icon: '🐯', lore: 'A camouflaged tank named for the white tiger, prowling the frontier at dusk.' },
		'Golden Sun Lion': { name: 'Gold-Plated War Lion', icon: '🦁', lore: 'A propaganda icon of the bloc: a golden mech-lion that leads the parades and the tanks.' },
		'Emerald Qilin': { name: 'Jade-Armoured Walker', icon: '🦄', lore: 'A heavy jade-plated walker that stamps along the bloc frontier.' },
		'Loch Monster': { name: 'Loch Submersible', icon: '🐍', lore: 'An experimental submersible serpent that shadows the fleet beneath the loch.' },
		'Storm Roc': { name: 'Storm Bomber Wing', icon: '🌩️', lore: 'A heavy bomber flight that rides the storm fronts to slip past the radar.' },
		'Dread Wolf': { name: 'Armoured War-Hound', icon: '🐺', lore: 'A mechanised wolf-pack kept by the secret police, fed on rationed steel.' },
		'Ancient Red Dragon': { name: 'Runaway Dreadnought Zeppelin', icon: '🎈', lore: 'A dreadnought zeppelin gone rogue, raining incendiary bombs on the border towns.' },
		'Elder Frost Drake': { name: 'Cryo-Bomber', icon: '❄️', lore: 'A frost-bomber that drops liquid-cold gas over enemy lines before the artillery moves.' },
		'Abyssal Kraken': { name: 'Depth-Charge Kraken', icon: '🦑', lore: 'A kraken-class sub-hunter whose cables drag convoys down to the seabed.' },
		'Titan Boar Herd': { name: 'Boar Shock Brigade', icon: '🐗', lore: 'Armoured boar-walkers trained as shock troops and loosed on enemy trenches.' }
	},
	atompunk: {
		Leviathan: { name: 'Reactor Leviathan', icon: '☢️', lore: 'A radioactive sea-titan glowing green beneath the aquadome shells.' },
		Behemoth: { name: 'Fallout Behemoth', icon: '🦖', lore: 'A mutated mega-beast, irradiated by the test sites, that stomps suburbs flat.' },
		Ziz: { name: 'Sky Ray-Guardian', icon: '🛸', lore: 'A saucer-shaped flying titan of the rocket age, its wings humming with reactors.' },
		'White Tiger': { name: 'Chrome Tiger', icon: '🐯', lore: 'A chrome-plated prototype guardian that stalks the rocket cities.' },
		'Golden Sun Lion': { name: 'Solar Lion Reactor', icon: '🦁', lore: 'A lion-shaped solar generator that glows over the atomic plains.' },
		'Emerald Qilin': { name: 'Emerald Reactor Qilin', icon: '🦄', lore: 'A green-glowing reactor qilin humming with contained fission.' },
		'Loch Monster': { name: 'Loch Reactor Beast', icon: '🐍', lore: 'A serpent with a glowing reactor core, seen flickering in the lake depths.' },
		'Storm Roc': { name: 'Storm Rocket Glider', icon: '🚀', lore: 'A rocket-powered storm glider that punches through the ionosphere.' },
		'Dread Wolf': { name: 'Fallout Dire-Wolf', icon: '🐺', lore: 'A mutated wolf of the wasteland, faintly glowing in the dark vaults.' },
		'Ancient Red Dragon': { name: 'Atomic Dragon Mech', icon: '🔥', lore: 'A rogue atomic war-machine that breathes incendiary plasma over the plains.' },
		'Elder Frost Drake': { name: 'Cryo-Reactor Drake', icon: '🧊', lore: 'A cooling-core reactor drake leaking frost through the shelter vaults.' },
		'Abyssal Kraken': { name: 'Aquadome Kraken', icon: '🐙', lore: 'A kraken that cracks bubble domes with reactor-tipped tentacles.' },
		'Titan Boar Herd': { name: 'Mutant Boar Herd', icon: '🐗', lore: 'Mutant boars grazing in the fallout zones, their tusks faintly glowing.' }
	},
	cyberpunk: {
		Leviathan: { name: 'Seastead Breaker', icon: '🛥️', lore: 'A corporate salvage hull that rams unlicensed seasteads and drags them to the abyss.' },
		Behemoth: { name: 'Mech Colossus', icon: '🤖', lore: 'A corp-owned walking war-frame that clears protest blocks and tunnels under the streets.' },
		Ziz: { name: 'Surveillance Drone Ziz', icon: '🛰️', lore: 'A vast drone flock in bird shape, watching the upper tiers from above.' },
		'White Tiger': { name: 'Cyber Tiger Enforcer', icon: '🐅', lore: 'A cybernetic enforcer that hunts runners through the neon night.' },
		'Golden Sun Lion': { name: 'Gold-Chrome Corp Lion', icon: '🦁', lore: 'A corporate mascot-mech in gold chrome, watching the market towers.' },
		'Emerald Qilin': { name: 'Jade Data-Qilin', icon: '🦄', lore: 'A holographic qilin of jade light that guards the data vaults.' },
		'Loch Monster': { name: 'Loch Drone-Serpent', icon: '🐍', lore: 'A drone-serpent that patrols corporate reservoirs and sinks trespassers.' },
		'Storm Roc': { name: 'Storm-Drone Hive', icon: '🌩️', lore: 'A weather-control drone flock that calls storms over the sprawl.' },
		'Dread Wolf': { name: 'Cyber-Wolf Pack', icon: '🐕', lore: 'A pack of cybernetic hunter-hounds leashed to a security firm.' },
		'Ancient Red Dragon': { name: 'Rogue Corp Gunship', icon: '🚁', lore: 'A corporate gunship gone rogue, firing on the upper tiers it was built to guard.' },
		'Elder Frost Drake': { name: 'Cryo-Drone Dragon', icon: '🧊', lore: 'A cryo-drone that freezes an entire grid in a single pass.' },
		'Abyssal Kraken': { name: 'Abyssal Drone Swarm', icon: '🦑', lore: 'A swarm of deep-sea drones coiling around seasteads and datacentres in the dark.' },
		'Titan Boar Herd': { name: 'Cyber-Boar Gang Herd', icon: '🐗', lore: 'Chrome-tusked boar-bikes that street gangs ride through the sprawl.' }
	},
	biopunk: {
		Leviathan: { name: 'Kelp Leviathan', icon: '🌊', lore: 'A reef-sized organism grown from engineered whale stock, shedding toxic spores as it swims.' },
		Behemoth: { name: 'Gene-Titan Mammoth', icon: '🦣', lore: 'A grown mammoth bred for labour and war, its hide as thick as armour plate.' },
		Ziz: { name: 'Gasbag Ziz', icon: '🎈', lore: 'A bloated living sky-bird that floats on hydrogen sacs and drops spores over the cities.' },
		'White Tiger': { name: 'Albino Tiger Chimera', icon: '🐅', lore: 'A gene-spliced tiger that serves as the gene-clans\' sentinel.' },
		'Golden Sun Lion': { name: 'Golden Gene-Lion', icon: '🦁', lore: 'A lion bred for gold-tinted fur and sharper hunting in the grown savanna.' },
		'Emerald Qilin': { name: 'Emerald Spore-Qilin', icon: '🦄', lore: 'A grown qilin whose jade scales release spore-blooms over the reef cities.' },
		'Loch Monster': { name: 'Loch Chimera', icon: '🐍', lore: 'A bioengineered lake serpent, escaped from its vat, leaving toxic slime-trails.' },
		'Storm Roc': { name: 'Storm Gasbag', icon: '🎈', lore: 'A grown storm-roc filled with lightning-conducting spores.' },
		'Dread Wolf': { name: 'Grown Dire-Wolf', icon: '🐺', lore: 'A bioengineered wolf-pack that hunts the mycelial warrens.' },
		'Ancient Red Dragon': { name: 'Mutant Fire-Wyrm', icon: '🔥', lore: 'A bioengineered fire-wyrm, escaped from a flame-gland vat.' },
		'Elder Frost Drake': { name: 'Frost-Gland Wyrm', icon: '🧊', lore: 'A bio-wyrm with frost glands, grown to freeze the drift-lanes.' },
		'Abyssal Kraken': { name: 'Reef Kraken', icon: '🐙', lore: 'A reef kraken grown to clear the coral hives of invaders.' },
		'Titan Boar Herd': { name: 'Gene-Boar Herd', icon: '🐗', lore: 'Bioengineered boars that root out and digest the blight-fungus.' }
	},
	solarpunk: {
		Leviathan: { name: 'Tidal Guardian', icon: '🌊', lore: 'An old sea-spirit of the commons that rides the tides and sinks only those who foul the reef.' },
		Behemoth: { name: 'Ancient Ox-Mother', icon: '🐂', lore: 'A great ox of the old fields, gentle until the granaries are threatened.' },
		Ziz: { name: 'Sun-Sail Ziz', icon: '🪁', lore: 'A gentle wind-spirit of the sun sails that guards the kite cities.' },
		'White Tiger': { name: 'Guardian Tiger Spirit', icon: '🐯', lore: 'A protective spirit that patrols the forest edge and keeps the commons safe.' },
		'Golden Sun Lion': { name: 'Sun Lion of the Commons', icon: '🦁', lore: 'A solar-powered spirit lion that brings warmth and light to the fields.' },
		'Emerald Qilin': { name: 'Emerald Qilin of Harmony', icon: '🦄', lore: 'A gentle green spirit said to appear wherever a just council forms.' },
		'Loch Monster': { name: 'Loch Guardian', icon: '🐍', lore: 'A kindly lake spirit that guards the fisheries of the commons.' },
		'Storm Roc': { name: 'Storm Sail Spirit', icon: '🌪️', lore: 'A windborne spirit that rides the storms and powers the sun-sail ports.' },
		'Dread Wolf': { name: 'Shepherd Wolf', icon: '🐺', lore: 'A feared old wolf, now a shepherd-guardian tamed by the commons.' },
		'Ancient Red Dragon': { name: 'Ancient Sun-Wyrm', icon: '🌞', lore: 'An old sun-wyrm who warms the cold fields but scorches the careless.' },
		'Elder Frost Drake': { name: 'Winter Spirit Drake', icon: '❄️', lore: 'A winter spirit that brings hard frosts to test the commons\' resilience.' },
		'Abyssal Kraken': { name: 'Tidal Kraken', icon: '🐙', lore: 'A slumbering sea-kraken of the tides, woken only by reckless fishing.' },
		'Titan Boar Herd': { name: 'Commons Boar Herd', icon: '🐗', lore: 'Wild boar herds of the old forest that the villages now protect.' }
	}
};

export const WONDER_SKINS: Record<SkinGenre, Record<string, CreatureSkin>> = {
	steampunk: {
		world_tree: { name: 'Great Brass Tree', icon: '🌳', lore: 'A clockwork arboretum of copper leaves that feeds steam into the city pipes.' },
		tower_magic: { name: 'Aether Spire', icon: '🗼', lore: 'A brass lightning-tower channelling aether through the mountain ranges.' },
		tower_trials: { name: 'Gauntlet Foundry', icon: '⚙️', lore: 'A brass-walled training arena where automatons and recruits test their mettle.' },
		bridge: { name: 'Iron Viaduct', icon: '🌉', lore: 'A riveted iron bridge carrying steam trains over the chasm.' },
		university: { name: 'Polytechnic Institute', icon: '🏛️', lore: 'A brass-domed academy of lecture halls and steam labs.' },
		giant_harbor: { name: 'Airship Dock', icon: '⚓', lore: 'A vast iron harbour built for airships and steamers alike.' },
		metropolis: { name: 'Clockwork Metropolis', icon: '🏙️', lore: 'A sprawling city of brass chimneys and gaslit avenues.' },
		ancient_forge: { name: 'Foundry of the Engineers', icon: '🏭', lore: 'A brass-and-iron foundry that once forged the first automatons.' },
		sunken_citadel: { name: 'Sunken Diving-Bell Citadel', icon: '🌊', lore: 'A bathysphere citadel on the sea floor where brass lamps still burn.' },
		titan_shrine: { name: 'Titan Engine Shrine', icon: '⚙️', lore: 'A shrine of colossal gears where a fallen automaton-titan is venerated.' }
	},
	dieselpunk: {
		world_tree: { name: 'Concrete Arbor', icon: '🏛️', lore: 'A towering concrete monument, its roots threaded through the bunker grid.' },
		tower_magic: { name: 'Radio Tower', icon: '📡', lore: "A steel broadcast tower that carries the regime's voice across the bloc." },
		tower_trials: { name: 'Proving Grounds', icon: '🎖️', lore: 'A concrete training fortress where conscripts are broken and rebuilt.' },
		bridge: { name: 'Blockade Bridge', icon: '🌉', lore: 'A reinforced bridge fortified with gun emplacements and checkpoints.' },
		university: { name: 'State Academy', icon: '🏛️', lore: "A propaganda-minded academy that trains the bloc's engineers." },
		giant_harbor: { name: 'Naval Dockyard', icon: '⚓', lore: 'A fortified dockyard where dreadnoughts are built and berthed.' },
		metropolis: { name: 'Bloc Capital', icon: '🏙️', lore: 'A monumental capital of concrete boulevards and marching columns.' },
		ancient_forge: { name: 'Armaments Works', icon: '🏭', lore: 'A forge of heavy shell and tank plate that never sleeps.' },
		sunken_citadel: { name: 'Sunken U-Boat Base', icon: '⚓', lore: 'A bomb-proof submarine base sealed beneath the sea.' },
		titan_shrine: { name: 'Titan Memorial Monolith', icon: '🗿', lore: 'A monolith raised to a fallen war-titan, its engine still warm.' }
	},
	atompunk: {
		world_tree: { name: 'Atomic Arboretum', icon: '🌳', lore: 'A glowing tree-shaped reactor whose roots tap the aquifers.' },
		tower_magic: { name: 'Rocket Spire', icon: '🚀', lore: 'A slender launch tower that stands watch over the orbital pads.' },
		tower_trials: { name: 'Simulation Tower', icon: '🎯', lore: 'A test-range tower of simulators for pilots and vault wardens.' },
		bridge: { name: 'Span of Tomorrow', icon: '🌉', lore: 'A sleek suspension span lit by neon and monorail cables.' },
		university: { name: 'Atomic Research Institute', icon: '🔬', lore: 'A lab complex where reactor and rocket science advance at breakneck pace.' },
		giant_harbor: { name: 'Aquadome Port', icon: '🛳️', lore: 'A giant undersea-linked port inside a transparent aquadome.' },
		metropolis: { name: 'Atom City Megaplex', icon: '🌆', lore: 'A glowing bubble-metropolis of monorails and neon.' },
		ancient_forge: { name: 'Reactor Forge', icon: '⚛️', lore: 'A forge heated by a buried reactor, shaping plutonium-age alloys.' },
		sunken_citadel: { name: 'Sunken Aquadome', icon: '🫧', lore: 'A flooded aquadome city whose lights still flicker in the deep.' },
		titan_shrine: { name: 'Reactor Cenotaph', icon: '☢️', lore: 'A cenotaph over the core of a fallen atomic titan.' }
	},
	cyberpunk: {
		world_tree: { name: 'Arcology Root Server', icon: '🖥️', lore: 'A tree of data cables and server racks that feeds the arcology grid.' },
		tower_magic: { name: 'Corporate Spire', icon: '🏢', lore: 'A glass-and-chrome corporate headquarters towering over the upper tiers.' },
		tower_trials: { name: 'Gladiator Arena Spire', icon: '🏟️', lore: 'A neon arena where bounty hunters fight for sponsor credits.' },
		bridge: { name: 'Toll Bridge Megastructure', icon: '🌉', lore: 'A corporate toll bridge that bills every crossing by the second.' },
		university: { name: 'Corporate Research Campus', icon: '🎓', lore: "A walled campus where the corp's R&D keeps its secrets." },
		giant_harbor: { name: 'Megadock Freeport', icon: '🚢', lore: 'A megadock where freight is tracked and taxed by the minute.' },
		metropolis: { name: 'Sprawl Megaplex', icon: '🌆', lore: 'An endless megacity of neon, smog and corporate arcologies.' },
		ancient_forge: { name: 'Chip Fab', icon: '🔧', lore: 'A fabrication plant printing neural chips and drone frames.' },
		sunken_citadel: { name: 'Drowned Datacentre', icon: '🌊', lore: 'A flooded datacentre fortress humming in the abyss.' },
		titan_shrine: { name: 'Corp Relic Shrine', icon: '🗿', lore: "A glowing shrine to a fallen corp-titan, sponsored by its shareholders." }
	},
	biopunk: {
		world_tree: { name: 'Bio-Arcology', icon: '🧬', lore: 'A living arcology grown as a single tree, its roots drinking from engineered aquifers.' },
		tower_magic: { name: 'Hive Spire', icon: '🐝', lore: 'A spiralling hive-tower of grown resin that broadcasts pheromone orders.' },
		tower_trials: { name: 'Gene-Trial Tower', icon: '🧬', lore: 'A gene-selection tower where only the fittest clones survive.' },
		bridge: { name: 'Living Bridge', icon: '🌉', lore: 'A bridge of woven vines and grafted roots spanning the gorge.' },
		university: { name: 'Genome Library', icon: '📚', lore: 'A vault-library of living gene archives and bio-samples.' },
		giant_harbor: { name: 'Kelp Harbour', icon: '⚓', lore: 'A harbour of grown kelp piers and living breakwaters.' },
		metropolis: { name: 'Grown Megacity', icon: '🏙️', lore: 'A metropolis grown from a single seed-city, and still growing.' },
		ancient_forge: { name: 'Vat Forge', icon: '🧪', lore: 'A forge of vats that grows armour and tools from living tissue.' },
		sunken_citadel: { name: 'Sunken Reef Hive', icon: '🪸', lore: 'A reef hive that sank beneath the waves, still glowing with bioluminescence.' },
		titan_shrine: { name: 'Titan Bone-Shrine', icon: '🦴', lore: "A shrine of grown bone where a fallen gene-titan's lineage is tended." }
	},
	solarpunk: {
		world_tree: { name: 'Commons Tree', icon: '🌳', lore: 'A great communal tree where the village gathers, its canopy feeding the sun-sail grid.' },
		tower_magic: { name: 'Sun Spire', icon: '☀️', lore: "A glass-walled tower that focuses sunlight into the commons' storage cells." },
		tower_trials: { name: 'Commons Trial Hall', icon: '🤝', lore: 'A community hall where disputes are settled by open contest and mediation.' },
		bridge: { name: 'Footbridge of the Commons', icon: '🌉', lore: 'A pedestrian and cycle bridge built by the whole valley.' },
		university: { name: 'Open Commons Academy', icon: '📚', lore: 'A free school and library open to every village.' },
		giant_harbor: { name: 'Tide Harbour', icon: '⛵', lore: 'A harbour of wind-powered boats and shared tidal docks.' },
		metropolis: { name: 'Garden Metropolis', icon: '🏙️', lore: 'A green city of terraced gardens and sun-sail towers.' },
		ancient_forge: { name: 'Community Smithy', icon: '⚒️', lore: 'A shared forge where villagers repair tools and build ploughs.' },
		sunken_citadel: { name: 'Drowned Commons', icon: '🌊', lore: 'A village swallowed by the sea, now a reef sanctuary.' },
		titan_shrine: { name: 'Memorial Grove', icon: '🕯️', lore: 'A memorial grove where the fallen are honoured with planted trees.' }
	}
};

const MONSTERS = MONSTER_SKINS as SkinTable;
const WONDERS = WONDER_SKINS as SkinTable;

/** Genre skin for a monster species, or null for fantasy, mythic and unknown species. */
export function monsterSkin(genre: Genre, species: string): CreatureSkin | null {
	return MONSTERS[genre]?.[species] ?? null;
}

/** Genre skin for a wonder kind, or null for fantasy, mythic and unknown kinds. */
export function wonderSkin(genre: Genre, kind: string): CreatureSkin | null {
	return WONDERS[genre]?.[kind] ?? null;
}
