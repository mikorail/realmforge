/**
 * Culture pack: literature grammars. Pure data (plus a few tiny helpers). Slots in templates:
 * {A} {B} actor and target; {Ah} {Bv} the same with a bias epithet; {O} {T} our side and theirs;
 * {place} {n} {unit} {y} {thing} {Thing} {war} {deity} {land} {beast} {host} {arm} {sky} {sim} {work} {realm}
 * {after} {force} {moral} {answer} {sig} {obj} {act}. No em dashes anywhere.
 */
import type { LitBias, LitForm, Register } from '../../../adventure/culturepack';

export type Family = 'east' | 'monsoon' | 'steppe' | 'desert' | 'afr' | 'amer' | 'sea' | 'north' | 'eldritch';

export const FAMILY: Record<string, Family> = {
	sinic: 'east', japonic: 'east', indic: 'monsoon', sea: 'monsoon', steppe: 'steppe', persian: 'desert', arabic: 'desert',
	mande: 'afr', yoruba: 'afr', bantu: 'afr', ethiopic: 'afr', nahua: 'amer', maya: 'amer', andean: 'amer', turtle: 'amer',
	inuit: 'sea', polynesian: 'sea', norse: 'north', celtic: 'north', latin: 'north', slavic: 'north', eldritch: 'eldritch'
};

export const SPHERE_REGISTER: Record<string, Register> = {
	sinic: 'courtly', japonic: 'terse', indic: 'flowery', sea: 'flowery', steppe: 'blunt', persian: 'courtly', arabic: 'flowery',
	mande: 'earthy', yoruba: 'earthy', bantu: 'earthy', ethiopic: 'formal', nahua: 'formal', maya: 'formal', andean: 'terse', turtle: 'earthy',
	inuit: 'terse', polynesian: 'flowery', norse: 'blunt', celtic: 'flowery', latin: 'formal', slavic: 'earthy', eldritch: 'terse'
};

export interface Banks { land: string[]; beast: string[]; sky: string[]; work: string[]; sim: string[]; proverbs: string[]; foe: string[] }

export const BANKS: Record<Family, Banks> = {
	east: {
		land: ['mountain pass', 'plum orchard', 'rice terrace', 'river bend', 'cold shrine path'],
		beast: ['crane', 'carp', 'tiger', 'heron', 'fox'],
		sky: ['pale morning mist', 'low plum-rain cloud', 'cold clear dawn', 'smoky evening', 'white winter sky'],
		work: ['inkstone', 'loom', 'rice flail', 'lacquer bench'],
		sim: ['like snow on a bamboo grove', 'like a crane rising from a pond', 'like a lantern in fog', 'like ink in water', 'like a falling blossom'],
		proverbs: ['A full bowl needs no sermon.', 'The old tree bows to the same wind as the young.', 'Mend the roof before you study the sky.', 'A closed gate keeps out friends first.', 'Even a good brush leaves a stain.', 'The kettle that boils dry forgets the spring.'],
		foe: ['the faithless', 'the rootless', 'the grasping']
	},
	monsoon: {
		land: ['rice paddy', 'river delta', 'spice garden', 'temple tank', 'mangrove shore'],
		beast: ['elephant', 'peacock', 'tiger', 'hornbill', 'buffalo'],
		sky: ['heavy monsoon cloud', 'white heat', 'low red sunset', 'rain-bright dusk', 'still hot noon'],
		work: ['loom', 'brass bowl', 'rice mortar', 'caulking mallet'],
		sim: ['like a river in flood', 'like a lotus after rain', 'like drums before the rains', 'like smoke on warm water', 'like a lamp floating on a tank'],
		proverbs: ['The rain does not ask whose field.', 'A boat is judged in the second storm.', 'Even the elephant keeps to the path.', 'Rice forgives the farmer more than the king.', 'A lamp lit twice is a lamp not trusted.'],
		foe: ['the faithless', 'the greedy', 'the proud']
	},
	steppe: {
		land: ['open grass', 'salt flat', 'felt-camp valley', 'wolf ridge', 'cold river crossing'],
		beast: ['wolf', 'horse', 'eagle', 'saiga', 'mare'],
		sky: ['bare blue sky', 'dust-yellow dusk', 'low iron cloud', 'star-hard night', 'wind-scraped dawn'],
		work: ['felt blanket', 'saddle', 'horn bow', 'milk skin'],
		sim: ['like wind through feather-grass', 'like a herd at full run', 'like a hawk on a hare', 'like smoke from a single yurt', 'like dust behind a rider'],
		proverbs: ['A rider without a mount is a guest on their own land.', 'The grass does not remember who rode on it.', 'A good horse is a short road.', 'Two wolves share a kill; two khans share nothing.', 'The sky is wide and the oath is narrow.'],
		foe: ['the pen-dwellers', 'the oath-breakers', 'the wall-lovers']
	},
	desert: {
		land: ['dry well', 'date grove', 'caravan road', 'salt pan', 'wind-cut cliff'],
		beast: ['camel', 'falcon', 'jackal', 'gazelle', 'scorpion'],
		sky: ['white noon', 'red sand-haze', 'night of hard stars', 'cool blue dawn', 'dust-yellow evening'],
		work: ['loom', 'well rope', 'date press', 'copper pot'],
		sim: ['like a mirage over salt', 'like a caravan on the horizon', 'like rain in a dry bed', 'like a falcon over dunes', 'like water poured on hot sand'],
		proverbs: ['The well remembers every thirst.', 'A guest is a door the sky opens.', 'Trust the camel, count the water.', 'Sand takes the wise and the foolish alike.', 'A promise is a shade tree.'],
		foe: ['the faithless', 'the wasters of water', 'the proud']
	},
	afr: {
		land: ['baobab shade', 'red-earth road', 'river crossing', 'drum-ground', 'tall-grass plain'],
		beast: ['lion', 'hornbill', 'elephant', 'crocodile', 'guinea-fowl'],
		sky: ['bright dry-wind sky', 'rain-heavy afternoon', 'dust-hazed dry season sky', 'wide red sunset', 'clear drum-night'],
		work: ['drum', 'loom', 'gold pan', 'millet mortar'],
		sim: ['like a drum answering a drum', 'like the river after the first rain', 'like a lion crossing the grass', 'like smoke from the evening fires', 'like a mask at dusk'],
		proverbs: ['A single hand does not tie a bundle.', 'The river does not hurry and still arrives.', 'The elder sits and sees what the runner misses.', 'Pound the millet before you count the feast.', 'A bad guest leaves his shadow at your door.'],
		foe: ['the thieves of grain', 'the oath-eaters', 'the strangers']
	},
	amer: {
		land: ['maize terrace', 'high plateau', 'lake shore', 'stepped temple', 'canyon wall'],
		beast: ['jaguar', 'eagle', 'serpent', 'heron', 'turkey'],
		sky: ['thin high-mountain air', 'storm over the maize', 'red dry-season sky', 'bright cold dawn', 'thick rain-forest haze'],
		work: ['loom', 'terrace wall', 'clay pot', 'grinding stone'],
		sim: ['like rain on a dry field', 'like a serpent in the grass', 'like an eagle over a canyon', 'like drums on a temple stair', 'like smoke from a thousand hearths'],
		proverbs: ['The corn remembers the hand that planted it.', 'What the mountain gives, it asks back.', 'A debt to the dead is paid in seed.', 'One thread breaks; the cloth does not.', 'The sun counts every day, and so should you.'],
		foe: ['the bloodless', 'the takers of tribute', 'the faceless']
	},
	sea: {
		land: ['ice edge', 'reef', 'blow-hole shore', 'far island', 'long beach'],
		beast: ['seal', 'whale', 'frigate bird', 'walrus', 'shark'],
		sky: ['green-lit night', 'low fog', 'bright wave-light morning', 'high wind sky', 'still grey dawn'],
		work: ['net', 'canoe', 'skin boat', 'fishing line'],
		sim: ['like a whale rising', 'like a canoe on a long swell', 'like fog on black water', 'like light on ice', 'like a gull over a harbour'],
		proverbs: ['The sea keeps no promises but one.', 'A full net is shared, an empty net is shared more.', 'Learn the wind before the island.', 'Fog hides the shore and the liar equally.', 'The one who counts the waves drowns.'],
		foe: ['the landers', 'the takers of the catch', 'the dry-footed']
	},
	north: {
		land: ['mead-hall', 'cold fjord', 'stone fort', 'birch wood', 'market road'],
		beast: ['wolf', 'raven', 'boar', 'stag', 'hound'],
		sky: ['iron-grey sky', 'low snow cloud', 'cold green dawn', 'rain-dark evening', 'pale northern night'],
		work: ['anvil', 'plough', 'loom', 'net'],
		sim: ['like wolves at a fold', 'like a raven on a wall', 'like fog off a cold sea', 'like a hearth-fire in a storm', 'like iron cooling'],
		proverbs: ['A cold hall makes a short oath.', 'The sword forgets; the kin do not.', 'Trust the fire, test the friend.', 'The ravens are never early and never late.', 'He who rows alone chooses the storm.', 'Frost finds the crack the carpenter hid.'],
		foe: ['the oath-breakers', 'the kin-slayers', 'the grasping']
	},
	eldritch: {
		land: ['black stair', 'drowned hall', 'star-cold pit', 'whispering wall', 'tide cave'],
		beast: ['many-eyed thing', 'pale crawler', 'deep singer', 'blind hound', 'sleeper'],
		sky: ['starless dome', 'low green glow', 'tide-dark ceiling', 'hum of the deep', 'long unlit hour'],
		work: ['bone knife', 'glyph chisel', 'counting cord', 'dream bell'],
		sim: ['like a thought you did not have', 'like a door opening under water', 'like breath on cold glass', 'like a hum in the teeth', 'like a hand you cannot see'],
		proverbs: ['What is counted cannot be unseen.', 'The deep keeps the ledger.', 'Do not answer the third whisper.', 'A quiet room is only listening.', 'Eyes are a loan.'],
		foe: ['the unawake', 'the loud ones', 'the surface-born']
	}
};

export interface GenreBank { host: string[]; arm: string[]; sky: string[]; work: string[]; sim: string[]; sig: string }

export const GENRE_BANK: Record<string, GenreBank> = {
	fantasy: { host: ['spears', 'riders', 'shields', 'bowmen'], arm: ['sword', 'spear', 'bow', 'shield'], sky: [], work: [], sim: [], sig: 'rider' },
	mythic: { host: ['spears', 'chariots', 'shield-bearers'], arm: ['bronze spear', 'sling', 'shield'], sky: ['sky of omens'], work: ['altar bowl'], sim: ['like a god passing in a cloud'], sig: 'messenger' },
	steampunk: { host: ['rifles', 'bayonets', 'ironclad crews', 'lancers'], arm: ['rifle', 'bayonet', 'steam-cannon'], sky: ['soot-brown smog'], work: ['boiler', 'rivet hammer'], sim: ['like steam from a split valve'], sig: 'telegraph' },
	dieselpunk: { host: ['tanks', 'riflemen', 'half-tracks', 'airmen'], arm: ['rifle', 'tank gun', 'bomber'], sky: ['oil-black cloud'], work: ['engine block', 'wire spool'], sim: ['like an engine at red line'], sig: 'wireless' },
	atompunk: { host: ['riflemen', 'armoured cars', 'rocket crews'], arm: ['rifle', 'rocket', 'radar mast'], sky: ['white fallout haze'], work: ['valve set', 'radio dial'], sim: ['like a needle in the red'], sig: 'radio' },
	cyberpunk: { host: ['drones', 'troopers', 'augmented guards', 'strike teams'], arm: ['pulse rifle', 'drone swarm', 'ICE'], sky: ['rain-lit neon haze'], work: ['circuit board', 'data spike'], sim: ['like a signal dropping out'], sig: 'secure line' },
	biopunk: { host: ['bonded beasts', 'spore-troops', 'thorn-guards'], arm: ['thorn gun', 'bone blade', 'spore sac'], sky: ['spore-yellow haze'], work: ['growth vat', 'graft knife'], sim: ['like a bloom opening in the dark'], sig: 'spore-post' },
	solarpunk: { host: ['volunteers', 'sun-lancers', 'guardians'], arm: ['sun-lance', 'mirror shield', 'harvest blade'], sky: ['clean glass-bright sky'], work: ['solar panel', 'seed jar'], sim: ['like sunlight on a leaf'], sig: 'mesh' },
	wasteland: { host: ['raiders', 'scrap-riders', 'wall-guards'], arm: ['salvaged rifle', 'chain-blade', 'scrap-cannon'], sky: ['rust-red dust sky'], work: ['scrap sack', 'water drum'], sim: ['like dust over a dead road'], sig: 'runner' },
	twilight: { host: ['old guards', 'lamp-bearers', 'last spears'], arm: ['old sword', 'lamp-staff', 'worn shield'], sky: ['long gold dusk'], work: ['old lamp', 'record book'], sim: ['like a candle in a great hall'], sig: 'lamp signal' }
};

/** the author's trade by form; a genre may override some */
export const ROLE: Record<LitForm, string> = {
	epic: 'court bard', ballad: 'wandering singer', history: 'annalist', sermon: 'preacher', satire: 'pamphleteer', tale: 'story-teller', lament: 'mourner',
	hymn: 'cantor', proverb: 'elder', love: 'poet', dispatch: 'field officer', travelogue: 'traveller', riddle: 'riddler'
};
export const ROLE_GENRE: Record<string, Partial<Record<LitForm, string>>> = {
	mythic: { epic: 'temple singer', history: 'priest-scribe', dispatch: 'herald' },
	steampunk: { epic: 'broadsheet balladeer', history: 'gazette editor', satire: 'penny-press satirist', dispatch: 'telegraph officer' },
	dieselpunk: { epic: 'newsreel poet', history: 'radio chronicler', satire: 'cabaret writer', dispatch: 'wireless operator' },
	atompunk: { epic: 'broadcast bard', history: 'bureau historian', satire: 'cabaret writer', dispatch: 'radio officer' },
	cyberpunk: { epic: 'netbard', history: 'archive curator', satire: 'feed satirist', dispatch: 'feed reporter' },
	biopunk: { epic: 'grove singer', history: 'seed-archivist', dispatch: 'spore-post runner' },
	solarpunk: { epic: 'commons singer', history: 'commons archivist', dispatch: 'mesh scout' },
	wasteland: { epic: 'scrap-bard', history: 'caravan memory-keeper', dispatch: 'road runner' },
	twilight: { epic: 'last bard', history: 'keeper of the dim archive', dispatch: 'lamp-signaller' }
};

/** what a work is called, per genre, for the taste line */
export const MEDIUM: Record<string, string> = {
	fantasy: 'scrolls and sung verse', mythic: 'temple songs and clay tablets', steampunk: 'broadsheets and penny pamphlets', dieselpunk: 'wireless serials and newsreels',
	atompunk: 'radio plays and bureau bulletins', cyberpunk: 'feeds and pirate archives', biopunk: 'grown books and spore-sung tales', solarpunk: 'commons libraries and open songbooks',
	wasteland: 'caravan songs and scratched walls', twilight: 'faded scrolls and half-remembered songs'
};

// ---------- what happened, by kind ----------
export type KindId = 'war' | 'capital' | 'siege' | 'fall' | 'disaster' | 'wonder' | 'coup' | 'revolt' | 'peace' | 'vassal' | 'golden' | 'crusade' | 'prophet' | 'beast' | 'reign' | 'founding' | 'hero' | 'monster';

export interface KindDef {
	/** accurate clauses */
	true: string[];
	/** a flattering account of our side (used by propagandists when we lost, and by partisans) */
	flatter: string[];
	/** blame moved to the other side */
	blame: string[];
	/** credit or fault moved to a god */
	pious: string[];
	moral: string[];
	after: string[];
	answer: string;
	/** forms a kind suits best, in order of preference */
	forms: LitForm[];
	/** a base weight for picking this event over others */
	weight: number;
	unit: 'host' | 'dead' | 'years' | 'households' | 'followers' | 'gold';
}

export const KIND: Record<KindId, KindDef> = {
	war: {
		true: ['{A} marched on {B}, and {war} began', '{war} opened when {A} sent {n} {host} across the line against {B}', '{A} declared against {B}, and {war} followed'],
		flatter: ['{O} drew the {arm} only when {T} left no other road', '{O} met {T} as the {beast} meets a thief at the door'],
		blame: ['{T} broke the peace, and {war} is theirs to answer for', '{T} paid for the trouble at the border, and then wept about {war}'],
		pious: ['{deity} let {war} come to try the {land}', '{war} came as a trial from {deity}, weighing the pride of both courts'],
		moral: ['A war is a debt the grandchildren pay.', 'Whoever sharpens the {arm} first buries first.'],
		after: ['{after_war}'], answer: 'a war', forms: ['epic', 'ballad', 'history', 'dispatch', 'satire', 'hymn'], weight: 9, unit: 'host'
	},
	capital: {
		true: ['{A} broke into {place} and took the seat of {B}', 'the gates of {place} gave way, and {B} lost its capital to {A}', '{A} stormed {place}, the seat of {B}, and held it'],
		flatter: ['{O} left {place} in good order and in good time, as the plan allowed', '{place} was not lost, only lent to {T} until the day of return'],
		blame: ['{T} took {place} by bribery and betrayal, not by arms', 'a traitor at the gate let {T} into {place}'],
		pious: ['{place} fell because {deity} was angry at its pride', '{deity} turned away from {place} for one night, and that was enough'],
		moral: ['A capital is a gate that forgot it was a gate.', 'Walls hold what the people hold.'],
		after: ['{B} never again kept a court at {place}', 'the seat of {B} was moved, and its treasury was smaller', 'the banners of {A} flew at {place} from that day'],
		answer: 'a fallen capital', forms: ['lament', 'epic', 'ballad', 'dispatch', 'history', 'satire'], weight: 9, unit: 'dead'
	},
	siege: {
		true: ['{A} took {place} from {B} after hard fighting', 'the walls of {place} were carried by {A}, and {B} lost the town', '{place} surrendered to {A}, and the banner of {B} came down'],
		flatter: ['{place} was given up in good faith to spare its people', '{O} yielded {place} only to the weight of numbers, not of courage'],
		blame: ['the officers of {T} burned the granaries before they took {place}', '{T} promised terms at {place} and kept none'],
		pious: ['{deity} withdrew from {place}, and the walls fell soon after', '{place} was lost as {deity} willed it, to teach us watchfulness'],
		moral: ['A wall is an argument; do not lose it.', 'The garrison that waits for rescue starves twice.'],
		after: ['the magistrates of {place} swore to {A}', 'the people of {place} learned a new set of taxes', '{place} changed hands, and the market opened as before'],
		answer: 'a siege', forms: ['ballad', 'dispatch', 'satire', 'history', 'lament'], weight: 4, unit: 'dead'
	},
	fall: {
		true: ['the realm of {A} came to its end after {n} {unit}', '{A} ended, and its banners were not raised again', 'the last strongholds of {A} gave up, and its name was struck from the rolls'],
		flatter: ['{O} did not die; it went underground, and waits', '{O} lost no more than a name, and its people and its {work} went on'],
		blame: ['its neighbours fed on {O} until nothing was left', 'the neighbours of {O} divided it like a carcass'],
		pious: ['{A} had grown proud, and {deity} withdrew the roof from it', '{deity} counted the days of {A}, and the count ran out'],
		moral: ['Every crown is borrowed.', 'A name outlives its walls, but not by long.'],
		after: ['its towns went to other banners', 'its people scattered along the roads', 'nothing of it stood but the memory'],
		answer: 'a fallen realm', forms: ['lament', 'history', 'sermon', 'travelogue', 'hymn'], weight: 9, unit: 'years'
	},
	disaster: {
		true: ['{force} struck {place} and held it for a season', '{force} came to {place}, and the count of the dead began', '{force} lay on {place} until {n} {unit} were gone'],
		flatter: ['{place} stood fast, and the crown fed the people through {force}', '{force} found {place} ready, and did less harm than it meant'],
		blame: ['{force} struck {place} because the tax-gatherers let the {work} rot', 'the tax-gatherers sold the grain of {place} before {force} came'],
		pious: ['{deity} sent {force} on {place} for its pride', '{force} was a warning from {deity} to {place}, and few listened'],
		moral: ['Count your grain before you count your gods.', 'The people forgive the storm, never the one who sold the seed.'],
		after: ['{place} was rebuilt slowly, and not as it had been', 'the survivors of {place} left by every road', 'the fields around {place} were empty for years'],
		answer: '{force}', forms: ['lament', 'sermon', 'history', 'hymn', 'tale', 'proverb', 'dispatch'], weight: 7, unit: 'dead'
	},
	wonder: {
		true: ['{A} raised {obj} at {place}, and it took {n} {unit}', '{obj} was finished at {place} under {A}', '{A} built {obj} at {place} over {n} {unit}'],
		flatter: ['no other people could have raised {obj}; {O} did it alone', '{obj} stands at {place} because {O} would not be second to anyone'],
		blame: ['{obj} cost more than {O} could bear, and {T} laughed', '{T} claimed {obj} and its plans, which were ours'],
		pious: ['{obj} is a prayer in stone, and {deity} accepted it', '{deity} guided the hands that raised {obj}'],
		moral: ['What the many raise, the one remembers.', 'A great work is a debt to the dead.'],
		after: ['travellers came from far to see {obj}', 'the market of {place} doubled', '{obj} became the first thing a stranger asks about'],
		answer: 'a great work', forms: ['hymn', 'travelogue', 'history', 'riddle', 'epic'], weight: 8, unit: 'years'
	},
	coup: {
		true: ['{A} seized the palace of {B} in the night', '{A} took power in {B}, and the old order ended', 'armed men and {A} walked into the court of {B}'],
		flatter: ['{O} was rescued from weakness in a single night', 'the crown of {O} passed to stronger hands, as the people asked'],
		blame: ['{T} bought the guard, and the coup was made in foreign coin', 'a clique of the {host} stole the crown of {O}'],
		pious: ['{deity} willed it, say the priests of the new order', '{deity} had left the old court long before {A} came'],
		moral: ['A guard that is paid is a guard that can be paid again.', 'The throne is warm for one night and cold after.'],
		after: ['the new order sat in the old chairs', 'the old officers were quietly replaced', 'the people were told it was all for the best'],
		answer: 'a coup', forms: ['satire', 'history', 'dispatch', 'ballad'], weight: 6, unit: 'host'
	},
	revolt: {
		true: ['{A} rose against {B}, and a new realm broke away', 'the people of {place} threw out the officers of {B}', '{A} took up the {arm} against {B} and was not put down'],
		flatter: ['{O} rose as one, and the tyrants fled', '{O} wanted only justice, and took it'],
		blame: ['the officers of {T} taxed the people until they had nothing else to lose', 'the officers of {T} had asked for it a hundred times'],
		pious: ['{deity} sent the fire into the hearts of {place}', 'the faithful of {place} rose at the word of {deity}'],
		moral: ['A people can be taxed only so far.', 'The loudest rebel is often the best fed.'],
		after: ['a new banner flew at {place}', 'the old realm shrank, and did not recover', 'the officers were hanged or sent away'],
		answer: 'a rising', forms: ['ballad', 'satire', 'sermon', 'dispatch', 'epic'], weight: 6, unit: 'host'
	},
	peace: {
		true: ['{A} and {B} ended {war} after {n} years', '{war} was closed by treaty, {n} years after it began', 'envoys of {A} and {B} sealed the end of {war}'],
		flatter: ['{O} dictated the peace, and {T} signed it', 'the peace after {war} was a victory for {O}, whatever {T} says'],
		blame: ['{T} sued for peace only when it had run out of {host}', '{T} has kept no old treaty, and will not keep this one'],
		pious: ['{deity} gave the weary lands their peace after {war}', '{war} ended on a day of prayer'],
		moral: ['A peace is only a war that is resting.', 'Peace is made by the tired and kept by the careful.'],
		after: ['the border markers were set again', 'the dead of both sides were counted and forgotten', 'merchants crossed the line before the ink was dry'],
		answer: 'a peace', forms: ['history', 'satire', 'dispatch', 'proverb', 'hymn'], weight: 6, unit: 'years'
	},
	vassal: {
		true: ['{B} bent the knee to {A} and agreed to pay tribute', '{A} took {B} as a vassal, and the tribute began', 'the court of {B} swore service to {A}'],
		flatter: ['{O} bent to no one; it took a protector and paid for the protection', 'the tribute from {O} to {T} was a gift between friends'],
		blame: ['{T} named it protection and sent the bill', 'the tribute demanded by {T} was heavier than any peace could bear'],
		pious: ['{deity} counted the pride of {B} and found it light', 'it was written by {deity} that the proud shall serve'],
		moral: ['A vassal pays twice: once in gold, once in pride.', 'The tribute is small the first year.'],
		after: ['the tribute carts went out each spring', 'the old court kept its title and lost its say', 'the sons of {B} were raised in the house of {A}'],
		answer: 'a tribute', forms: ['satire', 'lament', 'history', 'proverb'], weight: 5, unit: 'gold'
	},
	golden: {
		true: ['{A} had a golden age, with good harvests and open roads', 'a time of plenty began in {A}, centred on {place}', 'the granaries of {A} were full, and {place} grew rich'],
		flatter: ['it was a golden age and {O} deserved every day of it', '{O} was wealthy because it was wise'],
		blame: ['{T} envied the gold of {O} and invented stories about it', 'the plenty of {O} was paid for by the poverty of {T}'],
		pious: ['{deity} blessed {A} with plenty, and {A} remembered to give thanks', 'the golden age was {deity}\'s gift, and a loan'],
		moral: ['A full granary is a short memory.', 'Good years are for building walls.'],
		after: ['{place} grew new quarters and a larger market', 'the poets of {place} wrote more than they could sell', 'the next generation took it for granted'],
		answer: 'a good age', forms: ['hymn', 'history', 'love', 'tale'], weight: 5, unit: 'years'
	},
	crusade: {
		true: ['{A} called the faithful to a crusade against {B}', 'banners rose in every town for the crusade on {B}', '{A} sent out the call, and {n} {unit} answered'],
		flatter: ['{O} took up the cause of the faith, and the faith took up {O}', 'the call of {O} was heard in every hall'],
		blame: ['{T} had long defiled the holy places', 'the lies of {T} about the faith could not stand'],
		pious: ['{deity} called, and the faithful answered', 'the crusade was {deity}\'s, and the swords were only lent'],
		moral: ['A holy war has no end that the holy can see.', 'The banner is bright and the road is long.'],
		after: ['the roads filled with pilgrims and soldiers', 'the border towns armed themselves', 'the priests blessed the banners and the grain stores'],
		answer: 'a crusade', forms: ['sermon', 'epic', 'dispatch', 'satire'], weight: 6, unit: 'followers'
	},
	prophet: {
		true: ['{A} began to preach at {place}, and the crowds came', 'the prophet {A} won {n} {unit} at {place}', '{A} announced a new teaching at {place}, and it spread'],
		flatter: ['{O} was the first to hear the truth and did not look away', 'the teaching of {O} was plain, and the plain are many'],
		blame: ['{T} paid agitators to cry out at {place}', 'the so-called prophet {A} was only a clever beggar'],
		pious: ['{deity} spoke through {A}, say the faithful', '{A} was inspired, or mad, or both, and {deity} knows which'],
		moral: ['A crowd is a prophet that has not yet chosen a god.', 'Truth is rarely sold in the market.'],
		after: ['the temples of {place} lost some of their custom', 'a new gathering-place was built at {place}', 'the officers watched {place} closely'],
		answer: 'a new teaching', forms: ['sermon', 'satire', 'tale'], weight: 5, unit: 'followers'
	},
	beast: {
		true: ['{A} fought {B} near {place}', '{B} came down on {place}, and {A} went out to meet it', '{A} and {B} met at {place}, and the ground shook'],
		flatter: ['{O} faced {T} alone, as the old songs say', '{T} fled from {O}, and was not seen for years'],
		blame: ['rival officers had fed {B} to frighten {place}', 'those who sold the {land} to {B} never paid for it'],
		pious: ['{B} was sent by {deity} to try {place}', '{deity} turned {B} aside from {place} at the last hour'],
		moral: ['Everyone is brave until the beast speaks.', 'The beast is only the visible part of the trouble.'],
		after: ['{place} was shut and silent for a month', 'the hunters of {place} counted their dead', 'children were told to stay out of the {land}'],
		answer: 'a beast', forms: ['epic', 'tale', 'ballad', 'riddle'], weight: 5, unit: 'dead'
	},
	reign: {
		true: ['{A} was crowned ruler of {B}', '{B} took {A} as its ruler, in {place}', '{A} was acclaimed at {place}, and the reign began'],
		flatter: ['{O} was chosen by every voice and spurned none', 'the reign of {O} began as the dawn does, and without asking'],
		blame: ['{T} wanted the crown and did not get it', 'the rival claimants of {B} were quietly persuaded'],
		pious: ['{deity} touched {A} in {place}, and the people saw it', 'the crown went to {A}, as {deity} had marked'],
		moral: ['A crown is a weight that pays no wages.', 'Praise the new ruler quietly; there will be time.'],
		after: ['the coins were struck again with a new face', 'the court was refilled', 'the people waited to see what would be taxed'],
		answer: 'a crown', forms: ['hymn', 'history', 'proverb', 'love'], weight: 3, unit: 'years'
	},
	founding: {
		true: ['{A} lit the first hearth at {place}, and {B} grew around it', '{A} led the first families to {place} and named the place {B}', 'the founders of {B} came to {place} with {n} {unit}'],
		flatter: ['{O} was never a colony, but the oldest people of the {land}', 'the first hearth of {O} was lit before any other in the {land}'],
		blame: ['the neighbours of {O} claim the {land} and have no deeds for it', '{T} came later and has never forgiven us for being first'],
		pious: ['{deity} showed {A} the place, and {place} was founded where the sign lay', '{A} lit the hearth, and {deity} kept it burning'],
		moral: ['The first hearth is the last to go cold.', 'Every old people begins as a few who stayed.'],
		after: ['{place} became the heart of {B}', 'every road in {B} still leads back to {place}', 'the children of {place} carried the name onward'],
		answer: 'a first hearth', forms: ['epic', 'tale', 'hymn', 'history', 'proverb', 'riddle'], weight: 5, unit: 'households'
	},
	hero: {
		true: ['{A} went out from {place} alone and came back with the news', '{A} held the {land} against {B}, and was not forgotten', '{A} was a hand in the field, then a name in every hall', '{A} walked into the camp of {B} and walked out again, and {B} never forgot it', '{A} drove {B} out of {place} with a handful of followers'],
		flatter: ['no {arm} turned {O}, and no counsel moved {O}', '{O} was greater than every tale told of it'],
		blame: ['{T} envied {A} and told stories of its own', '{T} called {A} a thief and was not believed'],
		pious: ['{deity} walked behind {A} on every road', '{A} was kind to the poor, and {deity} noticed'],
		moral: ['A hero is a person with luck and a good scribe.', 'No one is a hero to the one who washes the boots.'],
		after: ['{place} keeps the memory in its songs', 'children play at being {A} in the {land}', 'the tomb of {A} is still visited'],
		answer: 'a hero', forms: ['epic', 'ballad', 'love', 'tale', 'proverb'], weight: 5, unit: 'followers'
	},
	monster: {
		true: ['{B} came out of the {land} and took {n} villages before {A} went to meet it', '{A} met {B} at {place}, and one of them did not walk home', '{B} woke under {place}, and {A} was sent to quiet it'],
		flatter: ['{O} drove {T} off with a single call', '{T} knew the name of {O} and left the {land}'],
		blame: ['greedy treasure-hunters woke {B} and fled', 'the officers of the {land} had known of {B} and said nothing'],
		pious: ['{deity} sent {B} to test the people, and {A} passed', '{B} was driven off by {deity} at the prayers of {A}'],
		moral: ['Do not wake what the old ones put to sleep.', 'The beast is old; the fear is older.'],
		after: ['the {land} around {place} stayed empty for a generation', 'the people carved a sign at {place} to keep {B} away', 'the {beast} is not welcome at {place} to this day'],
		answer: 'a monster', forms: ['tale', 'epic', 'ballad', 'riddle', 'travelogue'], weight: 4, unit: 'dead'
	}
};

export const DISASTER_FORCE: Record<string, { force: string[]; name: string }> = {
	famine: { force: ['the hunger', 'the empty granaries'], name: 'famine' },
	plague: { force: ['the sickness', 'the pale fever'], name: 'plague' },
	flood: { force: ['the flood', 'the rising river'], name: 'flood' },
	quake: { force: ['the quake', 'the shaking of the ground'], name: 'quake' },
	tsunami: { force: ['the great wave', 'the wall of water'], name: 'great wave' },
	storm: { force: ['the storm', 'the great wind'], name: 'storm' },
	tornado: { force: ['the whirlwind', 'the roaring wind'], name: 'whirlwind' },
	eruption: { force: ['the ash', 'the burning mountain'], name: 'eruption' },
	locust: { force: ['the locusts', 'the swarm'], name: 'locust year' },
	wildfire: { force: ['the fire', 'the wildfire'], name: 'fire' },
	landslide: { force: ['the landslide', 'the falling mountainside'], name: 'landslide' }
};

// ---------- forms: line frames per position ----------
export const FRAMES: Record<LitForm, { verse: boolean; lines: string[][] }> = {
	epic: {
		verse: true,
		lines: [
			['Sing of {thing}, and of {Ah}, who was there.', 'Voices of the {land}, give me breath: {thing} is my theme.', 'I begin with {thing}, as my teachers began.', 'Let the {work} fall silent: I tell of {thing}.'],
			['In the year {y}, under a {sky}, {act}.', 'It was the year {y}, and {act}.', 'Under the {sky} of that year, {act}.', 'The tellers fix it in the year {y}: {act}.'],
			['{Ah} stood at {place} and did not give way.', 'Where {Ah} stood, the {sky} itself seemed to bend.', 'No {arm} turned {Ah}, and no counsel moved {Bv}.', 'The tellers count {n} {unit}, before the end.'],
			['{Bv} came on {sim}.', 'Against {Bv} there was no easy road.', 'And {Bv} bore it, as the {beast} bears the {sky}.', 'Nobody asked the {land} what it thought.'],
			['{after}.', 'And so, {after}.', '{after}, and the {land} remembers.'],
			['So the {work}-makers sing it, and so I sing it: {thing}.', 'Remember {place}; remember the year {y}.', 'Let the children of the {land} learn this by heart.', 'That is the song of {thing}, and it is not finished.']
		]
	},
	ballad: {
		verse: true,
		lines: [
			['In the year {y} came {A} to {place},', 'They still tell it at {place}: {act}.', 'Down at {place}, in the year {y},', 'Come hear it, friends, of {place}:'],
			['{n} {unit}, so the old ones say,', 'And {n} {unit} by the count,', '{act}, and the {sky} above.', 'The {sky} was {sim}.'],
			['{after}.', '{after}, and the singers have not forgotten.', 'And {after}, they say.'],
			['Oh {place}, oh {place}, the road is long.', 'Hey {place}! Hey {place}! The {sky} is long.', 'And I will not forget {place}.', 'Sing it again, sing it softer, {place}.']
		]
	},
	hymn: {
		verse: true,
		lines: [
			['{deity}, keeper of the {land}, hear us.', '{deity}, who saw {place}, hear us.', 'Praise to {deity}, in the {sky} and out of it.', 'To {deity} we bring {thing}, as we bring all things.'],
			['You saw it: {act}.', 'Before you, {act}.', 'You counted every one of the {n} {unit}.', 'In the year {y}, {act}; and you did not look away.'],
			['{after}, and still we stand.', 'Keep {place} as you kept it then.', 'Let {place} be a lamp and not a grave.', 'Turn the {sky} from {place}, {deity}, as you can.'],
			['Bless the {work}, bless the {land}, bless {realm}.', 'Hold {realm} in your hands, {deity}.', 'So it is, and so it will be kept.']
		]
	},
	lament: {
		verse: true,
		lines: [
			['{place} is quiet now.', 'Who will mourn {place}, in this {sky}?', 'I have walked the road to {place}, and the year {y} walks it with me.', 'The {sky} over {place} has not lifted since the year {y}.'],
			['{act}, and the count was {n} {unit}.', '{n} {unit}, and nobody asked the {land}.', 'I have counted {n} {unit} and it is not enough.', '{act}, and we were not asked.'],
			['{after}.', '{after}, and the {work} stands idle.', '{after}; I put down the {work}.'],
			['Who will keep the {work} for the dead of {place}?', 'Let the {sky} be witness; I am too tired.', 'Let {place} be remembered, if nothing else.']
		]
	},
	love: {
		verse: true,
		lines: [
			['My love was at {place} when {act}.', 'I waited at {place} in the year {y}, and {act}.', 'They sent my love to {place} in the year {y}.', 'In the year {y} my love went out, and {act}.'],
			['I keep the {work} alone now.', 'The {sky} comes and I do not look.', 'I have asked the {beast} and the {sky}, and neither speaks.'],
			['Of {n} {unit}, I count one.', '{n} {unit}, the tellers say; I count one only.', 'The tellers say {n} {unit}. I say: one, and one.'],
			['Come home; {place} is only a road.', 'Come home. The {land} is where you left it.', 'Come home by the {land} road; I have kept the lamp.']
		]
	},
	proverb: {
		verse: true,
		lines: [
			['Remember {thing}.', 'They say in the {land}, since the year {y}:', 'This saying is as old as {thing}:'],
			['{moral}', '{pv}'],
			['It came from {place}, in the year {y}.', '{n} {unit} went into it, and it is cheap.', 'Teach it to the children of the {land}.']
		]
	},
	riddle: {
		verse: true,
		lines: [
			['I came to {place} in the year {y}, and {n} {unit} came after me.', 'I have no banner, no seal and no name, yet {after}.', 'Everyone in {place} knows me and no one will say my name.', 'I came in the year {y}, and {place} is still counting me.'],
			['I am older than the {work} and younger than the {land}.', 'Sometimes I wear a {sky}, sometimes a crown.', 'A child can carry me; a ruler cannot lift me.', 'Those who met me do not speak of me kindly, but they speak.'],
			['What am I?'],
			['Answer: {answer}.']
		]
	},
	history: {
		verse: false,
		lines: [
			['In the year {y}, {act}.', 'It is recorded that in the year {y} {act}.', 'The annals place it in the year {y}: {act}.', 'Year {y}: {act}.'],
			['The {realm} reckoning gives {n} {unit}, which may be too many or too few.', 'By the count of the {realm} registers, {n} {unit}.', 'The sources agree on {place} and the year {y}; they do not agree on the {n} {unit}.'],
			['{after}.', 'In the end, {after}.', 'The consequence was plain: {after}.'],
			['The causes are argued; the guilds blame {Bv}, the court blames the {sky}.', 'This account follows the {realm} registers; other accounts differ.', 'Later writers have added much to {thing}; this is what can be kept.']
		]
	},
	sermon: {
		verse: false,
		lines: [
			['Friends, hear what became of {place}.', 'Hear me, you who think {thing} is far from you.', 'Listen: {thing} is not a story but a warning.', 'I speak today of {thing}.'],
			['Hear how it was when {act}.', 'Know that {act}, and {deity} did not look away.', '{act}; and where was your faith then?'],
			['Take from {place} this lesson: {moral}', 'From {thing} learn only this: {moral}', 'The wise took this from {place}: {moral}'],
			['Keep the faith, and {deity} will keep the {land}.', 'Go in peace, and be better than {place} was.', 'Be thankful, and keep your doors in good repair.']
		]
	},
	satire: {
		verse: false,
		lines: [
			['Great was the glory of {Bv}, say the heralds of {Bv}.', 'They say {act}. They also say the {beast} can read.', 'The court calls it {thing}; the market calls it a bad quarter.'],
			['The tax collectors counted all {n} {unit}, and billed for each.', '{n} {unit}, they say, and a very good thing for the accounts.', '{n} {unit}: the clerks were paid by the head, so the number rose.'],
			['{after}, though nobody who matters was hurt.', '{after}; the {realm} court has since awarded itself a medal.', '{after}, and the {realm} court gave a feast about it.'],
			['Let it be written thus: bad luck for the poor, a feast for the court.', 'Praise them in verse, as they have paid for.', 'I am told {Ah} was brave. I was not there. Neither was anyone who says so.']
		]
	},
	tale: {
		verse: false,
		lines: [
			['There was once a {work}-maker near {place} who woke in the year {y} to find that {act}.', 'Near {place}, in the year {y}, a herder saw it first: {act}.', 'They tell of a child of {place} who saw how {act}.', 'When my grandmother was small, {act}, and she told it so.'],
			['The child counted {n} {unit} and then stopped counting.', 'The people of {place} gathered under the {sky} and did not speak.', 'The old woman at {place} said the {beast} had warned her.'],
			['{after}.', '{after}, and this is why we do as we do.', 'Then {after}.'],
			['And that is why, in {place}, we keep a lamp lit.', 'That is how it was told to me, and how I tell it.', 'That is why the {beast} is not welcome at {place}.']
		]
	},
	dispatch: {
		verse: false,
		lines: [
			['To the council of {realm}: {act}.', 'Report from {place}, year {y}: {act}.', 'Urgent. {place}. {act}.'],
			['Figure on record: {n} {unit}.', 'Count so far: {n} {unit}.', 'Tally: {n} {unit}.'],
			['Position: {place}. {after}.', 'Situation at {place}: {after}.', 'Present state: {after}.'],
			['Await instruction by {sig}.', 'Will send the full count by {sig} when the road is clear.', 'No relief has yet come. Send word by {sig}.']
		]
	},
	travelogue: {
		verse: false,
		lines: [
			['I came to {place} some years after {thing}, and the {sky} was low.', 'At {place} I was shown where {act}, though nobody had more to say.', 'The road to {place} is long; the people there still speak of {thing}.'],
			['They told me {n} {unit}; I heard other numbers on the road.', 'The {realm} guide counted {n} {unit} and corrected the count twice.', 'An old trader at {place} said {n} {unit}, and then said she could not be sure.'],
			['{after}.', 'There I saw how it was: {after}.', 'They keep it so: {after}.'],
			['I left by the {land} road and bought a small {work} tool as a keepsake.', 'Of the food I will say only that it was good.', 'If you go, ask for the oldest {work}-maker.']
		]
	}
};

export const TITLES: Record<LitForm, string[]> = {
	epic: ['The Lay of {thing}', '{Thing}: An Epic', 'The Deeds of {A}', 'Of {A} and {B}', 'The Long Song of {place}', 'The {Beast} Epic of {place}'],
	ballad: ['The Ballad of {place}', '{A} at {place}', 'The Road to {place}', '{Thing}, as Sung', 'What They Sing at {place}'],
	history: ['Annals of {realm}: {thing}', 'A Short History of {thing}', '{Thing}, Set Down', 'The {realm} Register for the Year {y}', 'On {thing}'],
	sermon: ['On {thing}', 'Against Pride, from {place}', 'A Sermon for the Day of {place}', 'Lessons of {place}', '{deity} and {thing}'],
	satire: ['In Praise of {B}', 'The Court at {place}', 'How {thing} Was Won', 'A Short Account of the Brave', '{Thing}, Free of Charge'],
	tale: ['The {Work}-Maker of {place}', 'The Child Who Saw {place}', 'How {place} Got Its Name', 'The {Beast} and {place}', 'The Night of {thing}'],
	lament: ['Lament for {place}', 'The Empty {Work}', 'After {thing}', 'Who Will Mourn {place}', 'The Quiet at {place}'],
	hymn: ['Hymn to {deity}', 'Praise for {place}', '{deity} Over {place}', 'A Hymn of the {Land}', 'For the Dead of {place}'],
	proverb: ['Sayings from {place}', 'What {place} Taught', 'The {Beast} Proverb', 'A Saying of the {Land}', 'Words After {thing}'],
	love: ['My Love at {place}', 'Come Home from {place}', 'The Lamp at {place}', 'Letters to {place}', 'A Song for the One Who Went'],
	dispatch: ['Report from {place}', 'Dispatch, Year {y}', 'To the Council of {realm}', 'Field Note on {Thing}', 'Urgent: {place}'],
	travelogue: ['A Journey to {place}', 'Notes on the Road to {place}', 'What I Saw at {place}', 'Letters from the {Land}', 'The Long Road Past {place}'],
	riddle: ['The Riddle of {place}', 'What Came to {place}', 'A Riddle for the Children of the {Land}', 'The Nameless Visitor', 'Guess, Guess: {place}']
};

/** extra line that colours the account, per bias */
export const BIAS_LINE: Record<LitBias, string[]> = {
	propagandist: ['No one in {O} was ever seen to flinch.', 'The people of {O} bore it with a steadiness that astonished the world.', 'Even strangers admit that {O} was the greater for it.', 'The banner of {O} was never lowered, whatever the rumours say.'],
	pious: ['{deity} saw it all, and judged.', 'It was not strength, it was the will of {deity}.', 'Those who suffered were weighed, and found nearer to {deity} for it.', 'Pray, and {deity} will hear it as {deity} heard it then.'],
	cynical: ['The merchants did well out of it.', 'Ask who sold the {arm}, not who used it.', 'The tax went up the next year, as taxes do.', 'Every count of the dead was made by someone paid by the count.'],
	partisan: ['Remember who began it: {Tv}.', '{Oh} bore the burden, and {Tv} bore the blame and earned it.', 'Say what you like of {T}; we know who opened the gate at {place}.'],
	romantic: ['I remember the {sky} over {place}, and I remember the sound.', 'I carried a name from {place} for years and told no one.', 'The {sky} was lovelier that year than in any year since.'],
	neutral: ['So much is certain: the year {y}, {place}, and about {n} {unit}.', 'The rest is argument.', 'Other hands will tell it differently, and may be right.']
};

export const EPITHET: Record<'hero' | 'villain' | 'soft', string[]> = {
	hero: ['the Unbroken', 'the Steadfast', 'the Bright-Handed', 'the Faithful', 'Shield of the {land}', 'the {beast}-Hearted'],
	villain: ['the Oath-Breaker', 'the Butcher', 'the Faithless', 'the Jackal', 'the Kin-Slayer', 'the Gap-Toothed'],
	soft: ['the Mistaken', 'the Weary', 'the Grieving', 'the Unlucky']
};

/** a short, plain riddle bank for the riddle form (clue, clue, answer) */
export const RIDDLES: [string, string, string][] = [
	['I rise without wings and fall without feet.', 'I warm the hands and burn the house.', 'fire'],
	['I am heaviest when you give me away.', 'A promise made me; a breath can break me.', 'an oath'],
	['I go before the army and arrive after it.', 'Nobody loads me, and everyone carries me.', 'rumour'],
	['Four walls and no door, and the guest never leaves.', 'The living bring flowers and do not stay.', 'a grave'],
	['I am poured but never drunk, and the field drinks me.', 'Without me the granary is a rumour.', 'rain'],
	['I have no purse, yet I make beggars of kings.', 'I am counted in sacks and spent in blood.', 'debt'],
	['I follow you in the day and leave you at night.', 'The tallest are longest in my company.', 'a shadow'],
	['I am the last guest at the feast and the first at the poor door.', 'Bread is my enemy, and ash is my sister.', 'hunger']
];

/** hand-counted syllable lines for the five-seven-five form */
export const SYL5 = ['Grey rain on the roofs', 'Smoke from one low hearth', 'The river runs on', 'Wind in the dry grass', 'Crows leave the cold field', 'Frost on the old gate', 'A lamp in the hall', 'Snow on the high pass'];
export const SYL7 = ['The ferryman will not wait', 'Who now remembers the road', 'Bread is cooling on the sill', 'No one has come to the door', 'Ash settles on the old walls', 'The bridge is gone, the ford stays', 'Last light on the cold water', 'Someone is burning old leaves'];
export const ALLIT = ['Hard hands held the harbour', 'Wolves wait where the water widens', 'Black beams bore the burning', 'Keen keels cut the cold', 'Stone stood stubborn at the sound', 'Crows came to the cold crossing', 'Fire found the fallow field', 'Grey gulls gather over graves'];

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
