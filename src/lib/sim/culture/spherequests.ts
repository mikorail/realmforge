/**
 * Sphere-specific story quests: two or more per culture sphere, with their own targets and rewards.
 * Hooked into quests.ts: `applySphereQuest` re-skins a freshly spawned quest, `sphereQuestText` and
 * `sphereQuestBonus` supply the later stages. Content is generated and inspired by real traditions;
 * it never uses sacred figures of living faiths. Uses a side rng, so `sim.rng` draws never shift.
 */
import { makeRng } from '../../rng';
import type { Simulation } from '../engine';
import type { Person, Polity, Quest } from '../types';
import type { World } from '../../gen/types';

type BaseKind = 'treasure' | 'rescue' | 'expedition';

export interface SphereQuestDef {
	id: string;
	sphere: string;
	/** base stage machine and reward: treasure = relic, rescue = gold, expedition = renown */
	kind: BaseKind;
	/** 'home' = a settlement of the hero's own culture, 'far' = one of another culture */
	target: 'home' | 'far';
	icon: string;
	/** `{t}` is the target name */
	title: string;
	scout: string;
	confront: string;
	/** `{r}` is the reward description */
	triumph: string;
	/** extra reward: steadier realm (+8 stability) */
	boost?: 'stability';
}

const Q = (sphere: string, id: string, kind: BaseKind, target: 'home' | 'far', icon: string, title: string, scout: string, confront: string, triumph: string, boost?: 'stability'): SphereQuestDef => ({
	id: `${sphere}.${id}`, sphere, kind, target, icon, title, scout, confront, triumph, boost
});

export const SPHERE_QUESTS: SphereQuestDef[] = [
	Q('sinic', 'seal', 'treasure', 'home', '🪷', 'Recovery of the Drowned Seal at {t}',
		'{h} reads canal registers that place the lost jade seal in a flooded quarter of {t}.',
		'{h} poles a flat boat through the sunken lanes of {t}, diving beneath fallen eaves for the seal chest.',
		'{h} lifts the mud-sealed chest from the water and returns the seal, winning {r}!'),
	Q('sinic', 'scrolls', 'expedition', 'far', '📜', 'Escort of the Examination Scrolls to {t}',
		'{h} gathers couriers and drafts a road plan to carry the examination papers to {t} before the deadline.',
		'{h} drives the scroll carts over washed-out passes toward {t}, turning back bandits at every ford.',
		'{h} delivers the papers on the last morning and the examinations proceed, winning {r}!', 'stability'),
	Q('japonic', 'blade', 'treasure', 'home', '⛩️', 'Return of the Hidden Blade of {t}',
		'{h} questions old shrine keepers who say a famous blade was walled into a cliff chapel near {t}.',
		'{h} climbs the cedar stairs above {t} in the dark and breaks the chapel seal with the keepers at hand.',
		'{h} bears the blade down in a silk wrap and the shrine rings its bell, bringing {r}!'),
	Q('japonic', 'gate', 'expedition', 'home', '🏮', 'Raising the Storm-Felled Gate of {t}',
		'{h} surveys the toppled gate of {t} and calls carpenters from three provinces before the festival.',
		'{h} sets the great beams by lantern light at {t} while storm winds still pull at the ropes.',
		'{h} sees the last beam seated at dawn and the festival opens beneath the gate, winning {r}!', 'stability'),
	Q('indic', 'stepwell', 'expedition', 'home', '🪔', 'Clearing the Silted Stepwell of {t}',
		'{h} learns that the stepwell of {t} has silted up and the dry season is close.',
		'{h} leads diggers down the stone stairs of {t}, hauling out silt basket by basket as the water table drops.',
		'{h} sees clear water rise again in {t}, and the district sings of {r}!', 'stability'),
	Q('indic', 'manuscript', 'treasure', 'far', '📖', 'Recovering the Palm-Leaf Library of {t}',
		'{h} hears of a lost palm-leaf library kept by a vanished school near {t}.',
		'{h} bargains with a wary abbot of {t} and copies faded leaves under the monsoon eaves.',
		'{h} carries home the preserved texts and a rare prize, {r}!'),
	Q('sea', 'rice', 'expedition', 'home', '🌾', 'Saving the Terraces of {t} Before the Rains',
		'{h} hears that the terrace walls above {t} are cracking just before the planting season.',
		'{h} organizes villagers of {t} to rebuild channels and walls through a night of first rain.',
		'{h} sees the terraces hold and the first seedlings stand green, winning {r}!', 'stability'),
	Q('sea', 'barge', 'rescue', 'far', '🛶', 'Rescue of the Stranded River Barges at {t}',
		'{h} learns that a trading fleet has run aground on a falling river bend near {t}.',
		'{h} wades the shallows with poles and rope to free the barges and their crews at {t}.',
		'{h} brings the fleet and its crews to deep water, and grateful merchants pay {r}!'),
	Q('steppe', 'herds', 'rescue', 'far', '🐎', 'Recovery of the Scattered Herds at {t}',
		'{h} reads signs of a bitter storm that has scattered the clan herds toward the hills near {t}.',
		'{h} rides hard through the sleet toward {t}, gathering foals and mares in the lee of the ridges.',
		'{h} returns with the full herd and the clans reward the rider with {r}!'),
	Q('steppe', 'standard', 'treasure', 'home', '🏹', 'Quest for the Lost War Standard of {t}',
		'{h} hears elders tell of a horsetail standard buried with an old khan near {t}.',
		'{h} crosses the open grass to {t} and digs the cairn by torchlight while storm clouds build.',
		'{h} raises the standard over the camp and the clans cheer, giving {r}!'),
	Q('persian', 'qanat', 'expedition', 'home', '💧', 'Reopening the Dry Qanat of {t}',
		'{h} learns that the underground channel feeding {t} has collapsed in the night.',
		'{h} crawls the tunnel of {t} with diggers, shoring the roof by lamp until the water finds its way again.',
		'{h} watches the channel run clear into the gardens of {t}, and the district gives {r}!', 'stability'),
	Q('persian', 'verse', 'treasure', 'far', '📜', 'Search for the Lost Poet Cycle of {t}',
		'{h} follows a rumor that a famous cycle of poems was hidden in a tower library at {t}.',
		'{h} trades verses with the guardians of {t} and earns the right to search the dusty shelves.',
		'{h} recites the found cycle at court and is granted {r}!'),
	Q('arabic', 'caravan', 'rescue', 'far', '🐪', 'Rescue of the Lost Caravan Near {t}',
		'{h} hears that a pilgrim caravan has missed its well and is overdue near {t}.',
		'{h} follows the star paths and a trail of discarded packs through the dunes toward {t}.',
		'{h} leads the thirsty travellers to water and they press {r} into the rescuer\'s hands!'),
	Q('arabic', 'astrolabe', 'treasure', 'home', '🧭', 'Recovery of the Master\'s Astrolabe at {t}',
		'{h} traces a famed astrolabe to a sealed observatory room in {t}.',
		'{h} bypasses the sand-choked stair of {t} and works the stuck lock with a locksmith\'s patience.',
		'{h} brings the instrument into daylight and the scholars of {t} crown the effort with {r}!'),
	Q('mande', 'epic', 'treasure', 'home', '🥁', 'Recovery of the Lost Epic of {t}',
		'{h} hears that the oldest griot of {t} is the last who knows the full epic and has fallen ill.',
		'{h} sits nightly beside the elder of {t}, learning every verse and the right drum answer for each.',
		'{h} recites the epic before the court and a gift of {r} follows!'),
	Q('mande', 'wall', 'expedition', 'home', '🏺', 'Replastering the Great Mud Wall of {t}',
		'{h} learns that the rains have scoured the walls of {t} and the replastering day is near.',
		'{h} calls every household of {t} to carry mud and chaff and climb the timber ribs together.',
		'{h} sees the walls shine fresh at sunset, and the town honours the work with {r}!', 'stability'),
	Q('yoruba', 'mask', 'treasure', 'far', '🎭', 'Return of the Stolen Mask of {t}',
		'{h} hears that a carved masquerade mask was stolen from a compound at {t}.',
		'{h} tracks the thief through markets and back lanes of {t} to a locked storeroom.',
		'{h} returns the mask before the masquerade season opens, winning {r}!'),
	Q('yoruba', 'drum', 'expedition', 'home', '🥁', 'Mending the Talking Drum Tower of {t}',
		'{h} learns that the drum house of {t} is broken and cannot carry messages for the festival.',
		'{h} gathers drummers and carvers at {t} to cut new hides and set the frame before dusk.',
		'{h} hears the drum speak across the city again, and elders bestow {r}!', 'stability'),
	Q('bantu', 'dhow', 'expedition', 'far', '⛵', 'Voyage of the Late Dhow to {t}',
		'{h} hears that the dhow fair at {t} will close before the cargo arrives.',
		'{h} races the changing monsoon winds toward {t}, trimming sail through the night.',
		'{h} reaches the fair on its last day and the merchants of {t} hail {r}!'),
	Q('bantu', 'granary', 'rescue', 'home', '🌽', 'Rescue of the Flooded Granary at {t}',
		'{h} learns that river floods are creeping toward the stored grain at {t}.',
		'{h} forms a chain of villagers at {t} to carry sacks to high ground through the night.',
		'{h} saves the grain and the village settles its debt with {r}!'),
	Q('ethiopic', 'church', 'expedition', 'home', '⛰️', 'Reopening the Collapsed Rock Church of {t}',
		'{h} hears that a hillside chapel near {t} has been sealed by a rockfall just before the feast.',
		'{h} leads masons and monks at {t} to clear the stone by hand, hauling rubble down the gorge.',
		'{h} sees the doors open before the feast and the chanting begins, winning {r}!', 'stability'),
	Q('ethiopic', 'manuscript', 'treasure', 'far', '📖', 'Recovery of the Illuminated Book of {t}',
		'{h} learns of an illuminated book hidden in a cave monastery near {t} during an old war.',
		'{h} scales the cliff paths of {t} and bargains with a silent abbot for access to the cave.',
		'{h} brings the book down unharmed, bringing {r}!'),
	Q('nahua', 'flower', 'rescue', 'far', '🌺', 'The Flower-War Duel at {t}',
		'{h} receives a formal challenge to a flower-war duel with the champion of {t}, fought for honour, not for conquest.',
		'{h} faces the champion of {t} in the plaza in feathered armour, trading blunted blows before the watching league.',
		'{h} wins the bout and the hosts of {t} send tribute in the form of {r}!'),
	Q('nahua', 'causeway', 'expedition', 'home', '🛤️', 'Raising the Broken Causeway of {t}',
		'{h} learns that the lake causeway of {t} has sunk and the market cannot reach the island.',
		'{h} sets stakes and lashes reed bundles with the canoe crews of {t}, rebuilding the road before market day.',
		'{h} sees the first loaded porters cross, and the council of {t} grants {r}!', 'stability'),
	Q('maya', 'stela', 'treasure', 'home', '🗿', 'Search for the Buried Stela of {t}',
		'{h} hears that a founding stela was buried by jungle growth near {t}.',
		'{h} cuts through vines at {t} with a team of scribes who read the carved day-signs aloud.',
		'{h} raises the stela and the city reads its count again, bringing {r}!'),
	Q('maya', 'calendar', 'expedition', 'far', '🔭', 'Observation of the Rare Alignment at {t}',
		'{h} learns that a rare sky alignment will cross the observatory of {t} within days.',
		'{h} hurries the astronomers of {t} to repair the sighting lines before the night of the count.',
		'{h} witnesses the alignment with the court and the scribes award {r}!', 'stability'),
	Q('andean', 'bridge', 'expedition', 'home', '🌉', 'Repairing the Mountain Bridge Before the Festival at {t}',
		'{h} learns that the rope bridge above the gorge at {t} is fraying and the sun festival is days away.',
		'{h} calls the labour levy of {t} to braid new cables and haul them across the gorge by hand.',
		'{h} sees the bridge walk firm for the first procession, and the community bestows {r}!', 'stability'),
	Q('andean', 'quipu', 'treasure', 'far', '🧶', 'Recovery of the Knotted Records of {t}',
		'{h} hears that a storehouse of knotted-cord records survives in a cliff vault near {t}.',
		'{h} climbs the cliff road to {t} with a cord-reader who counts each knot by touch.',
		'{h} returns the records to the registry and wins {r}!'),
	Q('turtle', 'council', 'expedition', 'far', '🔥', 'Carrying the Council Fire to {t}',
		'{h} is chosen to carry word and embers to the council gathering at {t} across a flooded valley.',
		'{h} paddles and portages the swollen rivers toward {t}, shielding the embers through the rain.',
		'{h} sets the fire in the council house and the nations of {t} agree, offering {r}!', 'stability'),
	Q('turtle', 'strings', 'treasure', 'home', '🐢', 'Recovery of the Lost Belts of {t}',
		'{h} hears that the record belts of an old treaty were misplaced in a lodge fire near {t}.',
		'{h} searches the burned lodge and nearby caches of {t} with the elders who remember each pattern.',
		'{h} returns the belts to the council and gains {r}!'),
	Q('inuit', 'hunt', 'rescue', 'home', '🧊', 'Rescue of the Ice-Stranded Hunters near {t}',
		'{h} learns that a hunting party has drifted out on a broken ice floe near {t}.',
		'{h} crosses the groaning ice toward {t} with sleds and long poles, reading the floe by sound.',
		'{h} brings every hunter back and the camp shares out {r}!'),
	Q('inuit', 'cache', 'treasure', 'far', '🛷', 'Search for the Winter Cache of {t}',
		'{h} hears of an old food and tool cache buried in snow near {t}.',
		'{h} follows cairn markers across the white plain to {t}, digging through drifts in a rising wind.',
		'{h} opens the cache and the camp feasts, gaining {r}!'),
	Q('polynesian', 'canoe', 'expedition', 'far', '🛶', 'Voyage of the Star-Path Canoe to {t}',
		'{h} joins a navigator who will follow the star paths to {t} with a new double canoe.',
		'{h} reads swells and bird flights through a cloudy night, keeping the course toward {t}.',
		'{h} lands at {t} to cheers and a feast, winning {r}!'),
	Q('polynesian', 'genealogy', 'treasure', 'home', '🌺', 'Recovery of the Chant Staff of {t}',
		'{h} hears that the carved staff that holds the genealogy chant of {t} was lost in a storm.',
		'{h} dives the reef and searches the shore caves near {t} while the tide drains.',
		'{h} brings the staff to the elders, who chant it whole again and reward {r}!'),
	Q('norse', 'ship', 'treasure', 'home', '⚓', 'Raising the Sunken Ship of {t}',
		'{h} hears of an old longship that went down in the fjord near {t} with its owner\'s gear.',
		'{h} dives and hauls chains from the cold waters of {t} with a crew of rowers.',
		'{h} brings up the ship and its sword-hoard, winning {r}!'),
	Q('norse', 'thing', 'expedition', 'far', '🏔️', 'Ride to the Midwinter Assembly at {t}',
		'{h} must bring an important dispute to the winter assembly at {t} before the passes close.',
		'{h} rides through blizzards toward {t}, camping in stone huts and trading news with hearth keepers.',
		'{h} arrives before the oaths are sworn, and the assembly settles the matter, giving {r}!', 'stability'),
	Q('celtic', 'harp', 'treasure', 'home', '🎶', 'Search for the Hidden Harp of {t}',
		'{h} hears that the harp of an old bard was hidden in a ring fort near {t}.',
		'{h} sings the old airs outside the fort of {t} until the guardians open the gate.',
		'{h} plays the harp at the feast and wins {r}!'),
	Q('celtic', 'cattle', 'rescue', 'far', '🐄', 'Recovery of the Raided Herd of {t}',
		'{h} learns that raiders have driven a clan herd into the hills beyond {t}.',
		'{h} tracks the herd through mist and bog to {t} with a few riders.',
		'{h} returns the cattle and the clan sends {r}!'),
	Q('latin', 'aqueduct', 'expedition', 'home', '🏛️', 'Repairing the Broken Aqueduct of {t}',
		'{h} learns that the aqueduct arches of {t} have cracked in the hard frost.',
		'{h} organizes legionary labor and master builders at {t}, raising timber centering for the new arch stones.',
		'{h} sees the water flow into the city fountains, and the senate decrees {r}!', 'stability'),
	Q('latin', 'standard', 'treasure', 'far', '🦅', 'Return of the Lost Eagle of {t}',
		'{h} hears that a legion standard lost long ago lies in the marsh near {t}.',
		'{h} wades the marsh of {t} with a handful of veterans and a map drawn by an old soldier.',
		'{h} returns the standard to the parade ground and wins {r}!'),
	Q('slavic', 'bridge', 'expedition', 'home', '🪵', 'Rebuilding the Ice-Torn Bridge of {t}',
		'{h} learns that spring ice has smashed the timber bridge of {t} and the grain wagons are stuck.',
		'{h} rallies the carpenters of {t} to float logs and set new pilings in the cold current.',
		'{h} walks the first loaded wagon across, and the town awards {r}!', 'stability'),
	Q('slavic', 'bells', 'treasure', 'far', '🔔', 'Recovery of the Buried Bells of {t}',
		'{h} hears that bells were buried near {t} before an old raid and never found.',
		'{h} digs with the townspeople of {t} in a frozen field while a snow squall blows.',
		'{h} raises the bells and rings them in the square, earning {r}!'),
	Q('eldritch', 'tome', 'treasure', 'far', '👁️', 'Retrieval of the Whispering Tome of {t}',
		'{h} hears that a restless tome that murmurs to its readers is hidden in the vaults of {t}.',
		'{h} descends the spiral stair of {t} with wax-stoppered ears, reading the wards by candle.',
		'{h} seals the tome in lead and brings out the relic, winning {r}!'),
	Q('eldritch', 'tide', 'expedition', 'home', '🌊', 'Charting the Tide Below {t}',
		'{h} is asked to chart a strange black tide that has risen in the lower halls of {t}.',
		'{h} paddles the flooded halls of {t} with a lantern and a rope, marking every drowned stair.',
		'{h} returns with a clear chart and the conclave grants {r}!', 'stability')
];

const BY_ID: Record<string, SphereQuestDef> = Object.fromEntries(SPHERE_QUESTS.map((d) => [d.id, d]));

function fill(tpl: string, h: string, t: string, r = ''): string {
	return tpl.replace(/\{h\}/g, h).replace(/\{t\}/g, t).replace(/\{r\}/g, r);
}

/** culture id of the hero's home (burg first, then realm, then the person) */
function heroCulture(w: World, polities: Polity[], hero: Person): number {
	const burg = hero.burg ? w.burgs[hero.burg] : null;
	return burg ? burg.culture : polities[hero.state]?.culture ?? hero.culture;
}

/** sphere id of the hero's home culture, or null */
export function heroSphere(w: World, polities: Polity[], hero: Person): string | null {
	return w.cultures[heroCulture(w, polities, hero)]?.sphere || null;
}

export function sphereQuestsFor(sphere: string): SphereQuestDef[] {
	return SPHERE_QUESTS.filter((d) => d.sphere === sphere);
}

/**
 * Called once from yearlyQuests after a quest spawns. With a 55% chance the quest becomes one of the
 * hero's sphere quests (same stage machine, own title, target, texts and bonus). Uses a side rng.
 */
export function applySphereQuest(sim: Simulation, q: Quest): void {
	if (q.kind === 'subjugation') return;
	const hero = sim.people[q.heroId];
	if (!hero) return;
	const sphere = heroSphere(sim.w, sim.polities, hero);
	if (!sphere) return;
	const defs = sphereQuestsFor(sphere);
	if (!defs.length) return;
	const rng = makeRng(`${sim.w.opts.seed}:sq:${q.id}:${q.year}`);
	if (!rng.chance(0.55)) return;
	const def = rng.pick(defs);
	const cu = heroCulture(sim.w, sim.polities, hero);
	const pool = sim.w.burgs.filter((b) => b.id && b.alive && b.id !== hero.burg && (def.target === 'home' ? b.culture === cu : b.culture !== cu));
	const fallback = sim.w.burgs.filter((b) => b.id && b.alive && b.id !== hero.burg);
	const list = pool.length ? pool : fallback;
	if (!list.length) return;
	const b = rng.pick(list);
	q.sq = def.id;
	q.kind = def.kind;
	q.icon = def.icon;
	q.targetCell = b.cell;
	q.targetName = b.name;
	q.title = fill(def.title, hero.name, b.name);
	q.reward = (def.kind === 'treasure' ? 'a Legendary Relic' : def.kind === 'rescue' ? '100 Gold' : 'Immortal Renown') + (def.boost ? ' and a steadier realm' : '');
	q.storyLog = [fill(def.scout, hero.name, b.name)];
}

/** stage text for a sphere quest, or null for ordinary quests */
export function sphereQuestText(q: Quest, stage: 'confront' | 'triumph', hero: string, reward = ''): string | null {
	const def = q.sq ? BY_ID[q.sq] : null;
	if (!def) return null;
	return fill(stage === 'confront' ? def.confront : def.triumph, hero, q.targetName, reward);
}

/** extra reward on completion (steadier home realm) */
export function sphereQuestBonus(q: Quest, polities: Polity[]): void {
	const def = q.sq ? BY_ID[q.sq] : null;
	if (!def?.boost) return;
	const p = polities[q.stateId];
	if (q.stateId && p?.alive) p.stability = Math.min(100, p.stability + 8);
}
