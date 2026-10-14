import type { World } from '../gen/types';
import type { MonsterArchetype } from './monsters';
import type { Simulation } from './engine';

/**
 * Culture-sphere depth: festivals, customs and great works told in each sphere's own idiom,
 * plus folklore creatures that only appear where that sphere's peoples live.
 * Inspired by real traditions, kept to widely shared folklore (no sacred figures of living faiths).
 */
export interface SphereLore {
	festivals: string[];
	customs: { text: string; stability?: number; treasury?: number; army?: number; renown?: number }[];
	works: string[];
}

export const SPHERE_LORE: Record<string, SphereLore> = {
	sinic: {
		festivals: ['Lanterns float over {town} for the Mid-Autumn moon; families of {realm} share round cakes and old poems.', 'Firecrackers and lion dancers drive the Nian beast from {town} as the new year turns in {realm}.'],
		customs: [{ text: '{realm} holds the great examinations; a peasant’s son from {town} tops the scholars’ list.', stability: 4, renown: 3 }, { text: 'Officials of {realm} repair the Grand Canal locks near {town}; grain barges flow again.', treasury: 25 }],
		works: ['a thousand-li canal', 'a nine-storey pagoda', 'an imperial observatory']
	},
	japonic: {
		festivals: ['Cherry blossoms fall over {town}; the court of {realm} holds poetry contests beneath the trees.', 'Paper lanterns drift down the river at {town} for the festival of returning ancestors.'],
		customs: [{ text: 'Swordsmiths of {town} temper a blade the whole of {realm} talks about.', army: 1, renown: 3 }, { text: 'A tea master in {town} teaches {realm}’s warlords the way of stillness.', stability: 4 }],
		works: ['a castle of white plaster and black pine', 'a vermilion shrine gate over the sea', 'a stone garden of raked gravel']
	},
	indic: {
		festivals: ['Ten thousand oil lamps light {town} for the festival of lights; {realm} feasts for five nights.', 'Coloured powders fill the air of {town} as {realm} welcomes spring with music and laughter.'],
		customs: [{ text: 'Mathematicians of {town} compute the zero and the turning of the planets; scholars flock to {realm}.', renown: 4, stability: 2 }, { text: 'Stepwells are dug across {realm}; {town} survives the dry season with water to spare.', treasury: 20, stability: 3 }],
		works: ['a rock-cut temple', 'a great stepwell', 'a university of nine storeys of books']
	},
	sea: {
		festivals: ['Water is thrown in joyous battles through the streets of {town} as {realm} greets the new year.', 'Shadow-puppet plays run all night in {town}, retelling the epics of heroes and gods.'],
		customs: [{ text: 'Spice ships fill the harbour of {town}; {realm} grows rich on cloves and nutmeg.', treasury: 30 }, { text: 'Rice terraces climb the hills above {town}, shared under the old water-temple councils of {realm}.', stability: 4 }],
		works: ['a terraced temple-mountain of a thousand reliefs', 'a floating market city', 'a great water-temple']
	},
	steppe: {
		festivals: ['Wrestling, archery and horse racing: the summer games draw every clan of {realm} to the pastures by {town}.'],
		customs: [{ text: 'Relay riders of {realm} carry word from {town} to the frontier in a single week.', stability: 3, army: 1 }, { text: 'A great kurultai gathers at {town}; the clans of {realm} swear fresh oaths.', stability: 5 }],
		works: ['a tent-city that can be packed in a day', 'a stone stele of the khans', 'a caravanserai chain across the steppe']
	},
	persian: {
		festivals: ['Fires leap on rooftops of {town} for the new-year spring; {realm} jumps the flames for luck.', 'Poets of {town} recite through the longest night while {realm} eats pomegranates till dawn.'],
		customs: [{ text: 'Underground qanats are extended to {town}; gardens bloom in {realm}’s desert.', treasury: 20, stability: 3 }, { text: 'A royal road with posting stations links {town} to every corner of {realm}.', stability: 3 }],
		works: ['a paradise garden of four rivers', 'a hall of a hundred columns', 'a turquoise-domed madrasa']
	},
	arabic: {
		festivals: ['Lanterns and sweets fill the souks of {town} as {realm} breaks the long fast together.'],
		customs: [{ text: 'A House of Wisdom opens in {town}; translators of {realm} gather the knowledge of every land.', renown: 5, stability: 2 }, { text: 'Caravans of a thousand camels reach {town}; {realm} prospers on the incense road.', treasury: 30 }],
		works: ['a House of Wisdom', 'a minaret of spiralling brick', 'a great covered souk']
	},
	mande: {
		festivals: ['Griots of {realm} sing the deeds of the founders at {town}; the epic lasts seven nights.', 'The whole town of {town} replasters its earthen mosque in a single joyful day.'],
		customs: [{ text: 'Gold from the southern fields reaches {town}; the mansa of {realm} is spoken of across the desert.', treasury: 35 }, { text: 'Scholars copy manuscripts in the libraries of {town}; salt and books trade weight for weight.', renown: 4 }],
		works: ['an earthen great mosque', 'a library of desert manuscripts', 'a hall of the griots']
	},
	yoruba: {
		festivals: ['Masked dancers fill {town} for the festival of the ancestors; the spirits walk among the people of {realm}.'],
		customs: [{ text: 'Bronze-casters of {town} craft heads of the kings so lifelike visitors to {realm} fall silent.', renown: 4, treasury: 10 }, { text: 'The council of elders in {town} checks the ruler of {realm}; balance is restored.', stability: 5 }],
		works: ['a palace of bronze plaques', 'a sacred grove of carved shrines', 'a ring of city walls and moats']
	},
	bantu: {
		festivals: ['Drums sound from {town} as {realm} gathers for the first fruits of the harvest.'],
		customs: [{ text: 'Dhows from far coasts anchor at {town}; {realm} trades ivory and gold for porcelain and silk.', treasury: 30 }, { text: 'The age-sets of {realm} hold council at {town}; disputes are settled by talking under the tree.', stability: 4 }],
		works: ['a great stone enclosure', 'a coral-stone harbour mosque', 'a royal kraal of a thousand huts']
	},
	ethiopic: {
		festivals: ['Bonfires burn in {town} for the finding of the true cross; {realm} sings in an ancient liturgical tongue.'],
		customs: [{ text: 'Monks of {realm} carve a church straight down into the rock near {town}.', renown: 4, stability: 3 }, { text: 'Coffee is first brewed in the highlands above {town}; {realm} shares a new ceremony.', treasury: 15 }],
		works: ['a church hewn from living rock', 'a towering stone stele', 'a mountain monastery reached by rope']
	},
	nahua: {
		festivals: ['Marigolds and sugar skulls fill {town} as {realm} welcomes the dead home for a night.'],
		customs: [{ text: 'Floating gardens are extended across the lake at {town}; {realm} feeds a great city.', treasury: 20, stability: 3 }, { text: 'A ritual flower war is fought between {realm} and its neighbours; captives, not land, are the prize.', army: 1, renown: 3 }],
		works: ['a twin-temple pyramid', 'a causeway city on a lake', 'a great calendar stone']
	},
	maya: {
		festivals: ['Astronomers of {town} predict the eclipse to the day; {realm} celebrates the turning of a great cycle.'],
		customs: [{ text: 'The ballgame at {town} is played for the fate of {realm}’s harvest.', stability: 3 }, { text: 'Scribes of {realm} write bark-paper codices at {town}, recording the kings in glyphs.', renown: 4 }],
		works: ['a stepped temple rising from the jungle', 'an observatory of perfect alignments', 'a court for the sacred ballgame']
	},
	andean: {
		festivals: ['At the winter solstice {realm} gathers in {town} to call the sun back from the mountains.'],
		customs: [{ text: 'Every village of {realm} sends workers in turn; the road through {town} now crosses the highest passes.', stability: 3, treasury: 15 }, { text: 'Relay runners carry knotted-cord records from {town} across {realm} in days.', stability: 3 }],
		works: ['a mountain citadel of fitted stone', 'a woven-grass suspension bridge', 'terraces carved into a whole mountainside']
	},
	turtle: {
		festivals: ['Nations of {realm} gather at {town} for a great council and dances that last through the night.'],
		customs: [{ text: 'A league of peace is renewed at {town}; the council fire of {realm} burns again.', stability: 6 }, { text: 'Wampum belts record a new treaty between {realm} and its neighbours.', stability: 3, renown: 2 }],
		works: ['a great earthwork mound city', 'a longhouse of the confederacy', 'a cliff dwelling in the canyon walls']
	},
	inuit: {
		festivals: ['The sun returns over {town} after the long night; drums and throat-singing ring across {realm}.'],
		customs: [{ text: 'Hunters of {realm} share a great whale at {town}; no family goes hungry this winter.', stability: 4 }, { text: 'Stone markers are raised on the tundra beyond {town} to guide travellers home.', stability: 2 }],
		works: ['a snow-palace of the long night', 'a field of stone guide-markers', 'a whalebone great hall']
	},
	polynesian: {
		festivals: ['Canoes from every island of {realm} race into the lagoon at {town}.'],
		customs: [{ text: 'Navigators of {realm} sail from {town} by stars and swells and return with a new island.', renown: 5 }, { text: 'Great stone faces are raised on the headlands of {town}, watching over {realm}.', stability: 3 }],
		works: ['a ring of stone ancestor-faces', 'a great voyaging canoe house', 'a terraced stone platform-temple']
	},
	norse: {
		festivals: ['Bonfires blaze for midwinter in {town}; the hall of {realm} rings with sagas and mead.'],
		customs: [{ text: 'The Thing gathers at {town}; the free folk of {realm} settle feuds by law.', stability: 5 }, { text: 'Longships of {realm} return to {town} laden with far-off silver.', treasury: 30, army: 1 }],
		works: ['a stave church of carved dragons', 'a great mead hall', 'a runestone field']
	},
	celtic: {
		festivals: ['Bonfires on the hills of {town} mark the turning of summer; {realm} drives the herds between the flames.'],
		customs: [{ text: 'Bards of {realm} gather at {town}; a satire topples a greedy lord.', stability: 3, renown: 2 }, { text: 'Smiths of {town} work gold into torcs and spirals coveted across {realm}.', treasury: 15 }],
		works: ['a ring of standing stones', 'a hillfort of seven ramparts', 'an illuminated gospel of a thousand pages']
	},
	latin: {
		festivals: ['Games fill the arena of {town}; {realm} feasts for a week in honour of its founding.'],
		customs: [{ text: 'An aqueduct reaches {town}; fountains run in every square of {realm}.', stability: 3, treasury: 10 }, { text: 'Jurists of {realm} codify the law at {town}; disputes are settled by writ, not sword.', stability: 4 }],
		works: ['a great aqueduct', 'an arena of a hundred arches', 'a domed temple to all gods']
	},
	slavic: {
		festivals: ['Wreaths float down the river at {town} on midsummer night; young folk of {realm} leap the fires.'],
		customs: [{ text: 'The veche of {town} rings its bell; citizens of {realm} choose their own prince.', stability: 3 }, { text: 'Furs and amber from {realm} reach the great fair at {town}.', treasury: 25 }],
		works: ['a kremlin of onion domes', 'a wooden church of twenty-two domes', 'a great fair-city on the river']
	},
	eldritch: {
		festivals: ['Something sings beneath {town} on the night without stars; the people of {realm} hum along without knowing why.'],
		customs: [{ text: 'The geometry of {town} is rebuilt at angles that hurt to look at; {realm} calls it progress.', renown: 4, stability: -3 }],
		works: ['a non-Euclidean spire', 'a well with no bottom', 'a temple whose doors open inward forever']
	}
};

const onSphere = (ids: string[]) => (w: World, c: number) => w.cells.h[c] >= 20 && ids.includes(w.cultures[w.cells.culture[c]]?.sphere ?? '');
const onSphereSea = (ids: string[]) => (w: World, c: number) => {
	if (w.cells.h[c] >= 20 || w.cells.dist[c] < -3) return false;
	// coastal water next to that sphere's lands
	for (let k = w.cells.nStart[c]; k < w.cells.nStart[c + 1]; k++) {
		const j = w.cells.nList[k];
		if (w.cells.h[j] >= 20 && ids.includes(w.cultures[w.cells.culture[j]]?.sphere ?? '')) return true;
	}
	return false;
};

const folk = (species: string, icon: string, power: number, hp: number, names: string[], lore: string, trophy: string, habitat: MonsterArchetype['habitatCheck']): MonsterArchetype => ({
	species, category: 'folklore', tier: power >= 60 ? 'mythos' : 'apex', icon, power, maxHealth: hp, armor: power >= 60 ? 0.25 : 0.12, regen: 6, trophy, nameTpl: names, lore, habitatCheck: habitat
});

/** folklore creatures, each bound to the lands of particular spheres */
export const SPHERE_CREATURES: MonsterArchetype[] = [
	folk('Nian', '🦁', 55, 150, ['Nian the New-Year Beast', 'The Red-Fearing Nian'], 'A horned beast that comes down from the mountains each new year, driven off only by red banners and firecrackers.', 'Nian Horn Lanterns', onSphere(['sinic'])),
	folk('Kappa', '🐢', 35, 90, ['The River Kappa', 'Kappa of the Reed Pools'], 'A water imp with a dish of water on its head; bow to it, and courtesy forces it to bow back and spill its strength.', 'Kappa Dish-Shell', onSphere(['japonic'])),
	folk('Makara', '🐊', 60, 170, ['The Makara of the Delta', 'Makara the Gate-Guardian'], 'Half crocodile, half elephant, the sea-dragon whose jaws are carved over temple gates.', 'Makara Tusk-Jaw', onSphereSea(['indic', 'sea'])),
	folk('Naga', '🐍', 65, 180, ['The Naga King of the Lake', 'Seven-Hooded Naga'], 'A great serpent-lord of rivers and lakes who guards hidden treasures and the rains.', 'Naga Jewel-Crown', onSphere(['sea', 'indic'])),
	folk('Tepegöz', '👁', 58, 170, ['Tepegöz the One-Eyed', 'The Steppe Cyclops'], 'A one-eyed giant of the steppe epics, slain only by a hero clever enough to blind him.', 'Tepegöz Eye-Stone', onSphere(['steppe'])),
	folk('Simurgh', '🦚', 70, 200, ['The Simurgh of Mount Qaf', 'The All-Knowing Simurgh'], 'A vast and wise bird that has seen the world destroyed three times; it may help a hero or test them.', 'Simurgh Feather of Healing', onSphere(['persian'])),
	folk('Ifrit', '🔥', 62, 160, ['The Ifrit of the Brass Bottle', 'Smokeless-Fire Ifrit'], 'A spirit of smokeless fire, proud and cunning, bound by old seals and older bargains.', 'Brass Bottle of Binding', onSphere(['arabic', 'persian'])),
	folk('Ninki Nanka', '🐉', 64, 180, ['Ninki Nanka of the Swamps', 'The River Ninki Nanka'], 'A dragon of the mangrove swamps; it is said that to see it is to fall ill.', 'Ninki Nanka Crest-Scale', onSphere(['mande'])),
	folk('Sasabonsam', '🦇', 40, 110, ['Sasabonsam of the High Branches', 'The Forest Sasabonsam'], 'A long-legged forest being that dangles from the canopy to snatch the careless traveller.', 'Sasabonsam Hook-Claws', onSphere(['yoruba'])),
	folk('Mokele-mbembe', '🦕', 66, 210, ['Mokele-mbembe, Stopper of Rivers', 'The River-Blocker'], 'A huge river creature of the deep forest that blocks the flow of rivers with its body.', 'Mokele-mbembe Hide', onSphere(['bantu'])),
	folk('Ahuizotl', '🐕', 42, 110, ['The Ahuizotl of the Lake', 'Hand-Tailed Ahuizotl'], 'A water dog with a hand at the end of its tail that drags fishermen beneath the lake.', 'Ahuizotl Tail-Hand Talisman', onSphere(['nahua'])),
	folk('Cadejo', '🐺', 30, 90, ['The Black Cadejo', 'The White Cadejo'], 'Spectral dogs of the night roads: the white one guards travellers, the black one leads them astray.', 'Cadejo Night-Collar', onSphere(['maya'])),
	folk('Amaru', '🐲', 60, 175, ['Amaru the Winged Serpent', 'The Mountain Amaru'], 'A two-headed winged serpent of the high lakes, bringer of storms and of the underworld’s waters.', 'Amaru Twin-Fang', onSphere(['andean'])),
	folk('Qalupalik', '🧜', 34, 95, ['The Qalupalik of the Ice Edge'], 'A sea creature with long nails that steals children who wander too close to the ice.', 'Qalupalik Amauti', onSphereSea(['inuit'])),
	folk('Taniwha', '🌊', 58, 180, ['The Taniwha of the Harbour', 'Guardian Taniwha'], 'A great water guardian of rivers and harbours, protector of some peoples and terror of others.', 'Taniwha Bone Carving', onSphereSea(['polynesian'])),
	folk('Draugr', '💀', 45, 140, ['The Barrow Draugr', 'Draugr of the Howe'], 'An undead warrior who guards the treasure of its burial mound, growing heavier than an ox.', 'Draugr Barrow-Ring', onSphere(['norse'])),
	folk('Each-uisge', '🐎', 40, 110, ['The Each-uisge of the Loch'], 'A water horse that lets riders mount, then plunges into the loch with them stuck fast.', 'Each-uisge Bridle', onSphere(['celtic'])),
	folk('Basilisk', '🦎', 50, 130, ['The Basilisk of the Ruins', 'King-Serpent Basilisk'], 'A crowned serpent whose gaze turns the living to stone; only a mirror or a weasel defeats it.', 'Basilisk Mirror-Shield', onSphere(['latin'])),
	folk('Zmey', '🐉', 68, 200, ['Zmey Gorynych', 'The Three-Headed Zmey'], 'A many-headed dragon of the steppe-forests that grows heads back as fast as heroes cut them.', 'Zmey Fire-Heart', onSphere(['slavic'])),
	folk('Shoggoth', '🫧', 75, 230, ['The Shoggoth Beneath', 'Tekeli-li'], 'A shapeless mass of eyes and mouths left over from an older creation. It remembers its masters.', 'Shoggoth Protoplasm Jar', onSphere(['eldritch']))
];

/** one or two cultural events per year, budgeted across the world */
export function yearlySphereLore(sim: Simulation) {
	const r = sim.rng;
	const alive = sim.polities.filter((p) => p.alive && p.id && p.cells > 0);
	if (!alive.length) return;
	const n = r.chance(0.5) ? 1 : r.chance(0.5) ? 2 : 0;
	for (let k = 0; k < n; k++) {
		const pol = r.pick(alive);
		const sphere = sim.w.cultures[pol.culture]?.sphere;
		const lore = sphere ? SPHERE_LORE[sphere] : undefined;
		if (!lore) continue;
		const towns = sim.idx.burgsIn(sim.w.burgs, pol.id).filter((b) => b.id && b.alive && b.state === pol.id);
		const town = towns.length ? r.pick(towns) : sim.w.burgs[pol.capital];
		const fill = (t: string) => t.replace(/\{town\}/g, town?.name ?? pol.name).replace(/\{realm\}/g, pol.name);
		const roll = r();
		if (roll < 0.4) {
			sim.log('culture', fill(r.pick(lore.festivals)), town?.cell, pol.id);
			pol.stability = Math.min(100, pol.stability + 2);
		} else if (roll < 0.85) {
			const c = r.pick(lore.customs);
			sim.log('culture', fill(c.text), town?.cell, pol.id);
			if (c.stability) pol.stability = Math.max(0, Math.min(100, pol.stability + c.stability));
			if (c.treasury) pol.treasury += c.treasury;
			if (c.army) pol.army += c.army;
			const ruler = sim.people[pol.ruler];
			if (c.renown && ruler?.alive) ruler.renown += c.renown;
		} else if (pol.treasury > 60) {
			pol.treasury -= 40;
			pol.stability = Math.min(100, pol.stability + 4);
			sim.log('culture', `${pol.name} completes ${r.pick(lore.works)} at ${town?.name ?? pol.name}, a marvel of the ${sim.w.cultures[pol.culture].name} people.`, town?.cell, pol.id);
		}
	}
}
