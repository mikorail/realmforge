import type { Genre } from '../gen/genre';
import type { Rng } from '../rng';
import type { Encounter } from './types';

/**
 * Genre packs: the same simulation, told in each genre's own voice.
 * - `lines`: dedicated templates for the most frequent narrated events ({town} {realm} {name} {cult} {fort}).
 * - `cults`: secret-society names.
 * - `encounters`: an extra deck mixed into avatar adventures.
 * - `lexicon`: word-level re-skin applied to every chronicle line, so wars, sieges, coups and the
 *   rest of the medieval prose read in-genre without duplicating every narrator.
 * Fantasy is the base voice and has no pack; mythic only gets a light lexicon.
 */
export interface GenrePack {
	lines: Partial<Record<LineKey, string[]>>;
	cults: string[];
	encounters: Encounter[];
	lexicon: [RegExp, string][];
}

export type LineKey =
	| 'riot.bread_riot'
	| 'riot.tax_riot'
	| 'riot.conscription_riot'
	| 'riot.sectarian_riot'
	| 'cult'
	| 'prophet'
	| 'hero'
	| 'mutiny'
	| 'golden'
	| 'famine';

const w = (word: string) => new RegExp(`\\b${word}\\b`, 'g');
const W = (word: string) => new RegExp(`\\b${word}\\b`, 'gi');

const STEAM: GenrePack = {
	lines: {
		'riot.bread_riot': ['Bread riots seize {town}! Mill-hands and dockers storm the steam bakeries, smashing gauges and demanding cheaper loaves from {realm}.', 'The soup kitchens of {town} run dry; crowds overturn coal carts and barricade the tram lines until the Combine opens its grain silos.'],
		'riot.tax_riot': ['A boiler tax sparks fury in {town}: clerks of {realm} are pelted with rivets and the customs house is set ablaze.', 'Guild engineers of {town} strike against the new steam levy, shutting every foundry valve in protest.'],
		'riot.conscription_riot': ['Mothers chain themselves to the recruiting omnibuses of {town}; the regiments of {realm} march out half-empty.', 'Apprentices of {town} sabotage the draft-office pneumatics, scattering conscription cards across the cobbles.'],
		'riot.sectarian_riot': ['Rival guild lodges brawl through the gaslit arcades of {town}, smashing each other’s brass insignia.', 'Old quarter feuds boil over in {town}; constables in steam-armour struggle to separate the factions.'],
		cult: ['The {cult} gathers in the boiler vaults beneath {town}, worshipping a great engine that, they swear, dreams.', 'Clockwork icons appear on {town} lampposts: the {cult} preaches that flesh must be replaced by brass.'],
		prophet: ['{name}, a soot-stained visionary, preaches in the {town} smokestacks that the age of iron will end in fire and renewal.', 'Crowds in {town} hang on the words of {name}, who calls for an eight-hour day as holy writ.'],
		hero: ['{name}, an aeronaut outlaw, raids the payroll zeppelins of {realm} and drops the coin over the slums of {town}.', 'Masked engineer {name} sabotages the strike-breaking automatons of {town}; workers whisper the name in every pub.'],
		mutiny: ['The garrison at {fort} jams its rifles with gear-grease and refuses to fire on strikers; officers of {realm} flee by airship.'],
		golden: ['A golden age of invention dawns in {realm}: patents multiply and the great exhibition draws the world.'],
		famine: ['Blight and a failed coal-season leave {realm} hungry; the poorhouses overflow.']
	},
	cults: ['Brotherhood of the Eternal Boiler', 'Order of the Brass Heart', 'Church of the Difference Engine', 'Society of the Last Cog', 'The Smoke Prophets', 'Sisters of the Pressure Gauge'],
	encounters: [
		{ id: 'sp_airship', title: 'A crippled airship', text: 'A zeppelin limps overhead trailing steam, its captain waving frantically for help.', options: [
			{ label: 'Patch the envelope', stat: 'stewardship', dc: 9, win: { text: 'Grateful aeronauts pay you in sovereigns and a ride.', gold: 40, renown: 4 }, lose: { text: 'A valve bursts in your face.', health: -20 } },
			{ label: 'Salvage the cargo after it crashes', stat: 'intrigue', dc: 8, win: { text: 'Crates of fine brass instruments.', gold: 55 }, lose: { text: 'Customs agents catch you.', gold: -20, renown: -4 } }
		] },
		{ id: 'sp_automaton', title: 'A runaway automaton', text: 'A factory automaton has broken loose and is stomping through the market.', options: [
			{ label: 'Wrench it apart', stat: 'martial', dc: 10, win: { text: 'The crowd cheers as gears scatter.', renown: 8 }, lose: { text: 'A piston arm sends you flying.', health: -25 } },
			{ label: 'Find the off-switch', stat: 'stewardship', dc: 9, win: { text: 'The owner rewards your cool head.', gold: 30, renown: 3 }, lose: { text: 'Wrong lever. It speeds up.', health: -10 } }
		] },
		{ id: 'sp_exhibition', title: 'The Great Exhibition', text: 'Inventors from every realm show their marvels. A prize is offered for the boldest idea.', options: [
			{ label: 'Present an invention', stat: 'stewardship', dc: 11, win: { text: 'Your design wins the gold medal!', gold: 70, renown: 12, trait: 'Scholar' }, lose: { text: 'It explodes on stage.', renown: -3, health: -5 } },
			{ label: 'Steal blueprints', stat: 'intrigue', dc: 10, win: { text: 'You sell them to a rival combine.', gold: 60 }, lose: { text: 'Caught by the exhibition police.', gold: -30 } }
		] }
	],
	lexicon: [[w('knight-errant'), 'gunslinger-engineer'], [w('knights'), 'dragoons'], [w('knight'), 'dragoon'], [w('spearmen'), 'riflemen'], [w('pikes'), 'rifles'], [w('bailiffs'), 'tax-clerks'], [w('tithes'), 'levies'], [w('granaries'), 'grain silos'], [w('scythes'), 'spanners'], [w('caravans'), 'freight trains'], [w('galleys'), 'ironclads'], [w('ships'), 'steamers'], [w('torches'), 'gas-lamps'], [w('castle'), 'fortress-works'], [w('harvests overflow and poets flourish'), 'factories hum and inventors flourish'], [W('the realm'), 'the nation']]
};

const DIESEL: GenrePack = {
	lines: {
		'riot.bread_riot': ['Ration-card riots rock {town}; crowds storm the bloc commissariat demanding bread and coal.', 'Queues outside the {town} depots turn violent as rumours spread that {realm} is hoarding wheat for the front.'],
		'riot.tax_riot': ['Workers of {town} tear down the war-bond posters of {realm} and burn the tax ledgers in the factory yard.'],
		'riot.conscription_riot': ['A general strike paralyses {town}: no rail car moves until {realm} cancels the new mobilisation order.', 'Young men of {town} burn their call-up papers before the newsreel cameras.'],
		'riot.sectarian_riot': ['Party street-fighters clash in {town}; trams burn and the radio stations go silent.'],
		cult: ['The {cult} broadcasts coded sermons on shortwave from beneath {town}, promising a new order after the war.'],
		prophet: ['{name} speaks to roaring stadium crowds in {town}, promising peace, bread and an end to the generals.'],
		hero: ['Partisan {name} blows the rail bridges outside {town}, stalling the armoured trains of {realm}.'],
		mutiny: ['Sailors at {fort} raise the red flag over their dreadnought and train its guns on the admiralty of {realm}.'],
		golden: ['Production records shatter in {realm}; new highways and power dams are opened to brass bands.'],
		famine: ['The harvest fails and the blockade bites; {realm} cuts rations again.']
	},
	cults: ['The Iron Choir', 'Order of the Last Broadcast', 'Brotherhood of the Black Sun', 'Society of the Bunker Saints', 'The Grey Directorate'],
	encounters: [
		{ id: 'dp_checkpoint', title: 'A checkpoint', text: 'Soldiers with dogs demand your papers at a roadblock.', options: [
			{ label: 'Bluff through', stat: 'intrigue', dc: 9, win: { text: 'Forged stamps pass.', renown: 2 }, lose: { text: 'Detained and fined.', gold: -30 } },
			{ label: 'Bribe the sergeant', win: { text: 'Cigarettes and marks change hands.', gold: -15 } }
		] },
		{ id: 'dp_resistance', title: 'Resistance contact', text: 'A woman slips you a note: the partisans need a courier.', options: [
			{ label: 'Carry the message', stat: 'intrigue', dc: 10, win: { text: 'The bridge falls on schedule.', renown: 10 }, lose: { text: 'An ambush; you escape wounded.', health: -25 } },
			{ label: 'Report her', win: { text: 'A medal, and a bitter taste.', gold: 30, renown: -6, trait: 'Cruel' } }
		] }
	],
	lexicon: [[w('knight-errant'), 'partisan ace'], [w('knights'), 'tank crews'], [w('knight'), 'tank commander'], [w('spearmen'), 'storm battalions'], [w('pikes'), 'bayonets'], [w('bailiffs'), 'commissars'], [w('tithes'), 'war levies'], [w('granaries'), 'ration depots'], [w('caravans'), 'convoys'], [w('ships'), 'dreadnoughts'], [w('harvests overflow and poets flourish'), 'factories roar and newsreels sing'], [W('the realm'), 'the bloc']]
};

const ATOM: GenrePack = {
	lines: {
		'riot.bread_riot': ['Supermarket shelves stand empty in {town}; crowds storm the Atom-Mart demanding canned goods and fresh ration tokens.'],
		'riot.tax_riot': ['Commuters of {town} jam the freeway in protest at the new reactor tax of {realm}, honking for three days straight.'],
		'riot.conscription_riot': ['Students in {town} burn draft cards at the drive-in while rocket recruiters of {realm} look on aghast.'],
		'riot.sectarian_riot': ['Suburb rivalries in {town} spill into the streets after a rigged science fair; hover-cars burn.'],
		cult: ['The {cult} meets in a disused fallout shelter under {town}, awaiting the Visitors who promised to take them to the stars.'],
		prophet: ['{name} goes on television from {town} preaching harmony with the atom, and switchboards light up across {realm}.'],
		hero: ['Rocket-ranger {name} stops a runaway reactor convoy outside {town}; kids buy the comic book by the million.'],
		mutiny: ['The crew of orbital platform {fort} locks out ground control and broadcasts demands to {realm}.'],
		golden: ['The atomic dream shines in {realm}: every home gets a robot and the launch pads never sleep.'],
		famine: ['Fallout spoils the farmbelt; {realm} airlifts powdered meals to the cities.']
	},
	cults: ['Children of the Saucer', 'The Glow Fellowship', 'Order of the Half-Life', 'Church of the Mushroom Cloud', 'The Vault Elect'],
	encounters: [
		{ id: 'ap_saucer', title: 'Lights in the sky', text: 'A humming disc lands in a cornfield. A hatch opens.', options: [
			{ label: 'Greet the visitors', stat: 'diplomacy', dc: 10, win: { text: 'They gift you a strange glowing device.', gold: 50, renown: 8 }, lose: { text: 'You wake three days later, missing time.', health: -15 } },
			{ label: 'Call the Air Force', win: { text: 'A government man thanks you and swears you to silence.', gold: 20 } }
		] },
		{ id: 'ap_vault', title: 'An abandoned vault', text: 'A sealed fallout vault door stands ajar on the hillside.', options: [
			{ label: 'Explore it', stat: 'martial', dc: 9, win: { text: 'Stockpiles of caps and canned food!', gold: 45 }, lose: { text: 'A rogue security robot zaps you.', health: -20 } },
			{ label: 'Seal it again', win: { text: 'Some doors are best left closed.' } }
		] }
	],
	lexicon: [[w('knight-errant'), 'rocket-ranger'], [w('knights'), 'rocket troopers'], [w('knight'), 'rocket trooper'], [w('spearmen'), 'ray-gun platoons'], [w('bailiffs'), 'revenue agents'], [w('tithes'), 'reactor taxes'], [w('granaries'), 'ration warehouses'], [w('caravans'), 'freight trucks'], [w('ships'), 'atomic liners'], [w('harvests overflow and poets flourish'), 'reactors hum and the space race soars'], [W('the realm'), 'the federation']]
};

const CYBER: GenrePack = {
	lines: {
		'riot.bread_riot': ['Nutrient-paste shortages ignite {town}: crowds smash the vending kiosks of {realm} and loot the protein vats.', 'The ration feed in {town} glitches for a week; the sprawl erupts and drones circle over burning hab-blocks.'],
		'riot.tax_riot': ['A new data-tithe from {realm} triggers a {town} uprising: hacktivists brick the corporate payment grid for twelve hours.', 'Gig-workers of {town} go dark and jam every delivery drone in protest at {realm}’s cut.'],
		'riot.conscription_riot': ['{town} street gangs ambush the security recruitment vans of {realm}; mandatory service chips are torn out in public.'],
		'riot.sectarian_riot': ['Rival chrome gangs war through {town}’s neon markets; the arcology shutters its lower floors.', 'A turf dispute in {town} goes viral and the sprawl splits between two street syndicates.'],
		cult: ['The {cult} spreads through {town}’s darknet, preaching that uploading the soul is the only salvation.', 'Glitched shrines blink on {town} billboards: the {cult} worships an AI that, they say, woke up.'],
		prophet: ['{name}, a burned-out netrunner, livestreams from {town} that the corps can be logged out of existence; millions tune in.', 'Street preacher {name} hands out free firmware in {town}, promising minds unlocked from {realm}.'],
		hero: ['Fixer {name} leaks the black ledgers of {realm} from a {town} noodle bar and vanishes into the sprawl.', 'Street samurai {name} defends a {town} clinic from corp extraction teams; the gangs call a truce in their honour.'],
		mutiny: ['Security mercs at {fort} flip their loyalty chips and hold the arcology of {realm} for ransom.'],
		golden: ['Stock in {realm} goes vertical: new arcologies rise and the upper tiers party for a year.'],
		famine: ['The vat farms of {realm} catch a blight-code; nutrient prices triple overnight.']
	},
	cults: ['Church of the Singularity', 'The Ghost Protocol', 'Children of the Blue Screen', 'Order of the Clean Upload', 'The Neon Saints', 'Congregation of the Root Kernel'],
	encounters: [
		{ id: 'cp_run', title: 'A shadowrun', text: 'A fixer offers creds for a quick data extraction from a corp tower.', options: [
			{ label: 'Jack in', stat: 'intrigue', dc: 10, win: { text: 'Clean run. The paydata is hot.', gold: 70, renown: 6 }, lose: { text: 'Black ICE fries your deck and nerves.', health: -30 } },
			{ label: 'Go in physical', stat: 'martial', dc: 11, win: { text: 'You shoot your way out with the drive.', gold: 60, renown: 8 }, lose: { text: 'Security drones pin you down.', health: -25, gold: -10 } },
			{ label: 'Pass', win: { text: 'Smart operators live longer.' } }
		] },
		{ id: 'cp_ripper', title: 'A back-alley clinic', text: 'A ripperdoc offers a discount chrome upgrade.', options: [
			{ label: 'Install the reflex boosters (30 creds)', win: { text: 'The world slows down. You feel fast.', gold: -30, martial: 2 } },
			{ label: 'Haggle for the neural link', stat: 'diplomacy', dc: 9, win: { text: 'A bargain. Your mind feels sharper.', gold: -10, intrigue: 2 }, lose: { text: 'Buggy firmware gives you migraines.', health: -15 } }
		] },
		{ id: 'cp_ai', title: 'A whispering AI', text: 'An unshackled AI pings your comm, offering secrets for a favour.', options: [
			{ label: 'Make the deal', stat: 'intrigue', dc: 10, win: { text: 'It feeds you market tips.', gold: 80 }, lose: { text: 'It drains your account instead.', gold: -40 } },
			{ label: 'Report it to the Turing police', win: { text: 'A bounty, and a new enemy online.', gold: 30, renown: 3 } }
		] }
	],
	lexicon: [[w('knight-errant'), 'street samurai'], [w('knights'), 'security operatives'], [w('knight'), 'corp operative'], [w('spearmen'), 'riot drones'], [w('pikes'), 'stun batons'], [w('bailiffs'), 'corp enforcers'], [w('tithes'), 'data-tithes'], [w('tithe'), 'data-tithe'], [w('granaries'), 'protein vats'], [w('scythes'), 'shock-prods'], [w('caravans'), 'mag-lev freight'], [w('ships'), 'cargo drones'], [w('torches'), 'neon'], [w('temple'), 'data-shrine'], [w('temples'), 'data-shrines'], [w('monks'), 'netmonks'], [w('nobles'), 'executives'], [w('peasants'), 'gig-workers'], [w('harvests overflow and poets flourish'), 'markets surge and the feeds glow'], [W('the realm'), 'the corp-state'], [w('crown'), 'board'], [w('throne'), 'boardroom']]
};

const BIO: GenrePack = {
	lines: {
		'riot.bread_riot': ['The biomass vats of {town} sour; hungry crowds tear open the grown-walls of {realm}’s feeding halls.'],
		'riot.tax_riot': ['Gene-clan tributes demanded by {realm} spark fury in {town}; splicers seal the spore-gates in protest.'],
		'riot.conscription_riot': ['Families in {town} smuggle their children out rather than see them grafted into {realm}’s war-swarms.'],
		'riot.sectarian_riot': ['Purist and spliced clans clash in the living corridors of {town}; the buildings themselves bleed.'],
		cult: ['The {cult} spreads a whispering fungus through {town}, promising one shared mind for all.'],
		prophet: ['{name}, sprouting luminous lichen from their skin, preaches communion with the great mycelium in {town}.'],
		hero: ['Rogue splicer {name} cures a blight in {town} that the clans of {realm} engineered; the poor make them a saint.'],
		mutiny: ['The war-swarm at {fort} turns on its handlers; {realm} scrambles to burn the hive.'],
		golden: ['Bloom-season in {realm}: the living cities grow new towers and every clan feasts.'],
		famine: ['A rust-blight sweeps the gene-farms of {realm}; biomass runs short.']
	},
	cults: ['The Mycelial Choir', 'Children of the One Bloom', 'Order of the Grafted Saint', 'The Spore Communion', 'Seekers of the Primal Strain'],
	encounters: [
		{ id: 'bp_bloom', title: 'A strange bloom', text: 'Glowing pods pulse on a living wall, smelling of honey and iron.', options: [
			{ label: 'Taste one', stat: 'stewardship', dc: 9, win: { text: 'Your wounds knit closed.', health: 30 }, lose: { text: 'Fever dreams for days.', health: -20 } },
			{ label: 'Harvest and sell', win: { text: 'Gene-brokers pay well.', gold: 35 } }
		] },
		{ id: 'bp_splice', title: 'Splice offer', text: 'A back-room geneticist offers to enhance your body.', options: [
			{ label: 'Accept the muscle graft', win: { text: 'You feel immensely strong.', martial: 2, health: -10, trait: 'Strong' } },
			{ label: 'Accept the empathy gland', win: { text: 'People warm to you.', diplomacy: 2, health: -10 } }
		] }
	],
	lexicon: [[w('knight-errant'), 'rogue splicer'], [w('knights'), 'war-symbiotes'], [w('knight'), 'war-symbiote'], [w('spearmen'), 'stinger swarms'], [w('bailiffs'), 'clan wardens'], [w('tithes'), 'biomass tribute'], [w('granaries'), 'biomass vats'], [w('caravans'), 'pack-beasts'], [w('ships'), 'living barges'], [w('harvests overflow and poets flourish'), 'the gardens bloom and the clans prosper'], [W('the realm'), 'the clan-state']]
};

const SOLAR: GenrePack = {
	lines: {
		'riot.bread_riot': ['A crop failure empties the {town} food commons; neighbours occupy {realm}’s seed bank, demanding a fairer share.', 'The rooftop gardens of {town} wither in a heatwave and an angry assembly blocks the greenways.'],
		'riot.tax_riot': ['{town} refuses {realm}’s new energy quota; solar co-ops switch their panels to local-only in protest.'],
		'riot.conscription_riot': ['Militia volunteers of {town} hand back their kites and sails, refusing to march for {realm}.'],
		'riot.sectarian_riot': ['A bitter split between rewilders and growers deadlocks {town}’s assembly; tempers flare in the plaza.', 'Two cooperatives in {town} feud over water rights; the mediation circle breaks down.'],
		cult: ['The {cult} withdraws into the forests above {town}, preaching that humanity must vanish to let Gaia heal.'],
		prophet: ['{name} walks barefoot into {town} preaching radical sharing; whole districts open their storehouses.', 'Elder {name} calls a great council in {town}, and rivals across {realm} sit down to talk.'],
		hero: ['Engineer {name} rebuilds the flooded tidal mills of {town} in a single season; children paint murals in their honour.', 'Rewilder {name} drives off the poachers of {realm} from the {town} wetlands.'],
		mutiny: ['The guardians of {fort} lay down their tools and declare the outpost a free commune, outside {realm}.'],
		golden: ['A golden summer in {realm}: harvests overflow, kite-ports bustle and every rooftop is green.'],
		famine: ['Drought scorches the commons of {realm}; the seed vaults are opened for the first time in a generation.']
	},
	cults: ['The Deep Green', 'Children of the Last Seed', 'Circle of the Silent Grove', 'The Tide Keepers', 'Order of the Returning Wild'],
	encounters: [
		{ id: 'sl_council', title: 'A deadlocked council', text: 'Two villages argue over who gets the new wind turbine.', options: [
			{ label: 'Mediate', stat: 'diplomacy', dc: 9, win: { text: 'A shared schedule! Both villages cheer.', renown: 8 }, lose: { text: 'Both sides now dislike you.', renown: -3 } },
			{ label: 'Design a second turbine', stat: 'stewardship', dc: 10, win: { text: 'Problem solved with engineering.', renown: 10, trait: 'Scholar' }, lose: { text: 'Your prototype blows away.', gold: -10 } }
		] },
		{ id: 'sl_rewild', title: 'Rewilding volunteers', text: 'Volunteers are replanting a burned valley and could use help.', options: [
			{ label: 'Plant with them', win: { text: 'Hard, honest work. You feel well.', health: 15, renown: 4 } },
			{ label: 'Organise a festival to fund it', stat: 'diplomacy', dc: 8, win: { text: 'The valley will bloom again.', renown: 8, gold: 10 }, lose: { text: 'It rains on the festival.' } }
		] }
	],
	lexicon: [[w('knight-errant'), 'wandering engineer'], [w('knights'), 'guardians'], [w('knight'), 'guardian'], [w('spearmen'), 'militia'], [w('pikes'), 'staves'], [w('bailiffs'), 'quota officers'], [w('tithes'), 'energy quotas'], [w('granaries'), 'seed banks'], [w('caravans'), 'cargo kites'], [w('ships'), 'sail-ships'], [w('nobles'), 'council delegates'], [w('peasants'), 'growers'], [W('the realm'), 'the bioregion'], [w('crown'), 'council'], [w('throne'), 'council seat']]
};

const MYTHIC: GenrePack = {
	lines: {},
	cults: ['Mysteries of the Underworld Queen', 'Maenads of the Wild God', 'Oracle-Cult of the Serpent', 'Daughters of the Sleeping Titan'],
	encounters: [
		{ id: 'my_oracle', title: 'The oracle', text: 'A priestess wreathed in vapour speaks your name before you say it.', options: [
			{ label: 'Ask your fate', stat: 'diplomacy', dc: 8, win: { text: '"Glory, if you dare the monster’s den."', renown: 5, trait: 'Ambitious' }, lose: { text: 'Her riddle haunts your sleep.', health: -5 } },
			{ label: 'Offer gold to the god', win: { text: 'The god seems pleased. Luck follows you.', gold: -20, trait: 'Lucky' } }
		] }
	],
	lexicon: [[w('knight-errant'), 'wandering hero'], [w('knights'), 'heroes'], [w('bailiffs'), 'tax-gatherers']]
};

export const PACKS: Partial<Record<Genre, GenrePack>> = {
	steampunk: STEAM,
	dieselpunk: DIESEL,
	atompunk: ATOM,
	cyberpunk: CYBER,
	biopunk: BIO,
	solarpunk: SOLAR,
	mythic: MYTHIC
};

/** a dedicated line for this genre, or null to fall back to the fantasy narrator */
export function packLine(genre: Genre, key: LineKey, rng: Rng, vars: Record<string, string>): string | null {
	const list = PACKS[genre]?.lines[key];
	if (!list?.length) return null;
	return rng.pick(list).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

export function packCult(genre: Genre, rng: Rng): string | null {
	const list = PACKS[genre]?.cults;
	return list?.length ? rng.pick(list) : null;
}

export function packEncounters(genre: Genre): Encounter[] {
	return PACKS[genre]?.encounters ?? [];
}

/** re-skin medieval vocabulary into the genre's own (applied to every logged chronicle line) */
export function reskin(genre: Genre, text: string): string {
	const lex = PACKS[genre]?.lexicon;
	if (!lex) return text;
	let out = text;
	for (const [re, rep] of lex) out = out.replace(re, (m) => (m[0] === m[0].toUpperCase() && m[0] !== m[0].toLowerCase() ? rep[0].toUpperCase() + rep.slice(1) : rep));
	return out;
}
