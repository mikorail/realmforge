/**
 * Phrase banks for the faith lore pack (prayers, liturgy, scripture, saints, heresies, sins, blessings, holy days).
 * Tokens filled by faith.ts: {D} {D2} {D3} (deity names), {P} place, {lamp} {bread} {book} {bell} {hall} {T} clergy title.
 * Placeholders left for the engine: {name} {time}. No em dashes, lines under 120 characters. Invented, no real scripture.
 */
import type { Genre } from '../../../gen/genre';
import type { DoctrineKind, TheologyKind } from '../../../gen/types';

export interface GenreFaith {
	lamp: string;
	book: string;
	bell: string;
	hall: string;
	bread: string;
	vessel: string;
}

export const GENRE_FAITH: Record<Genre, GenreFaith> = {
	fantasy: { lamp: 'candle', book: 'vellum book', bell: 'bell', hall: 'temple', bread: 'bread', vessel: 'chalice' },
	mythic: { lamp: 'oil lamp', book: 'clay tablet', bell: 'bronze gong', hall: 'sanctuary', bread: 'barley cake', vessel: 'libation bowl' },
	steampunk: { lamp: 'gas lamp', book: 'printed psalter', bell: 'steam whistle', hall: 'chapel', bread: 'loaf', vessel: 'brass cup' },
	dieselpunk: { lamp: 'storm lantern', book: 'mimeographed hymnal', bell: 'siren', hall: 'chapel', bread: 'ration loaf', vessel: 'tin cup' },
	atompunk: { lamp: 'glow lamp', book: 'bound hymnal', bell: 'chime', hall: 'meeting hall', bread: 'wafer', vessel: 'steel cup' },
	cyberpunk: { lamp: 'signal light', book: 'data slate', bell: 'alert tone', hall: 'shrine room', bread: 'protein cake', vessel: 'plastic cup' },
	biopunk: { lamp: 'glow-moss', book: 'grown codex', bell: 'drum bladder', hall: 'grow-chapel', bread: 'spore cake', vessel: 'gourd cup' },
	solarpunk: { lamp: 'sun lamp', book: 'woven record', bell: 'wind chime', hall: 'garden shrine', bread: 'seed loaf', vessel: 'clay cup' },
	wasteland: { lamp: 'oil rag', book: 'scratched plate', bell: 'scrap bell', hall: 'ruin shrine', bread: 'hardtack', vessel: 'dented cup' },
	twilight: { lamp: 'dim candle', book: 'blackened book', bell: 'tolling bell', hall: 'chapel', bread: 'black bread', vessel: 'pewter cup' }
};

/** names for further gods when the theology needs more than one voice */
export const LESSER_GODS = [
	'the Hearth-Mother', 'the Storm-Father', 'the Grain-Lord', 'the Ferryman', 'the Lady of Rivers', 'the Forge-Elder', 'the Moon-Weaver',
	'the Hunter in the Hills', 'the Keeper of Roads', 'the Reaper', 'the Bright Child', 'the Salt Mother', 'the Judge Beneath', 'the Lord of Fires',
	'the Loom-Keeper', 'the Well-Warden', 'the Watchman of Bridges', 'the Shepherd of Winds'
];
export const DARK_FORCES = [
	'the Unlit One', 'the Hollow Flame', 'the Devourer', 'the Quiet Dark', 'the Cold Gnawer', 'the Shadow Under', 'the Unmaker',
	'the Rust-Eater', 'the Ash-Tide'
];

// ---------------- prayers ----------------

export const THEO_PRAYERS: Record<TheologyKind, string[]> = {
	monotheism: [
		'{D}, one and only, keep this house under your single eye.',
		'There is no god but {D}; to {D} I give the morning and the {lamp}.',
		'{D}, you alone made the hills and {P}; hear a small voice.',
		'One maker, one judge: {D}, weigh me gently and do not look away.',
		'{D}, who needs no second, be the first thing I name and the last.',
		'Before the {bread} is broken, I say your name, {D}, and none other.',
		'{D}, light the {lamp} in me that I may see my own faults first.',
		'All roads end in you, {D}; lead my feet and the feet of {P}.'
	],
	polytheism: [
		'{D}, first of the high seats, and {D2}, hear us together.',
		'{D2} for the fields, {D3} for the roads, {D} for all that remains.',
		'Gods of the many hands, {D}, {D2} and {D3}, share this {bread} among you.',
		'We light a {lamp} to each of you: {D}, {D2}, {D3}. Do not quarrel over the smoke.',
		'{D}, lord of the high seat, let {D3} guard my journey and {D2} my sleep.',
		'Many gods, one town: {D}, bless {P}, and the others bless what {D} forgets.',
		'{D2}, turn your face to us; {D}, keep your thunder in its sack.',
		'To every god a gift: {bread} for {D}, water for {D2}, silence for {D3}.'
	],
	animism: [
		'Spirit of {P}, we walk softly on your back and take only what we need.',
		'Old ones of the stream and the stone, {D} among you, forgive our feet.',
		'I leave a crumb of {bread} for the one who lives in this place.',
		'{D}, spirit of the long water, carry the day gently past my door.',
		'Hear me, owners of the trees; the axe is hungry but I am sorry.',
		'Spirit of this threshold, let me pass, let my children pass, let strangers pass.',
		'We ask the hill for leave before we climb it, and thank it at the top.',
		'{D}, keeper of the wild things, count me among your guests and not your prey.'
	],
	pantheism: [
		'{D}, who is the road, the walker and the dust, let me know I am not apart.',
		'The world breathes, and I am one breath of it; {D}, let me breathe well.',
		'In the {lamp} and the rain alike I see {D}; let me not be blind to either.',
		'All things are {D} thinking; may my small thought be a kind one.',
		'{D}, whole and woven, I am a thread of you; keep me from fraying.',
		'When I eat the {bread} I eat the field and the sun; {D}, grant I give it back.',
		'There is no outside to {D}; therefore there is nowhere I am alone.',
		'May {P} and I be one mind a little longer, {D}.'
	],
	dualism: [
		'{D}, light of the first morning, hold back {D2} from this house tonight.',
		'Two powers pull the world; {D}, be the stronger in my hands.',
		'I light the {lamp} against {D2}, and ask {D} to stand beside it.',
		'{D2} is patient; {D}, be more patient still.',
		'Between {D} and {D2} the world is stretched: let me not be torn.',
		'I do not curse {D2}; I only ask {D} to arrive first.',
		'Let my left hand do the shadow’s work no more; let my right keep the {lamp} of {D}.',
		'{D}, in the long war, count me a soldier, not a prize.'
	],
	chaos_cult: [
		'{D}, devour the order of this hour and leave us the hunger.',
		'Break the day, {D}; we are the pieces you will not miss.',
		'Let the rule slip and the {lamp} gutter; {D}, we ask for the change.',
		'{D}, lord of the red tide, take the first of what we make.',
		'Nothing holds, nothing stays: praise to {D} who keeps it moving.',
		'We drink to ruin, and ask {D} to spare the drinker for one more night.',
		'{D}, make me strong by taking from me; let me be worth the taking.',
		'Let the walls of {P} remember they were only ever borrowed. {D}, hear us.'
	],
	eldritch_horror: [
		'{D}, sleeping beneath {P}, do not turn over tonight.',
		'We hum the low note so that {D} dreams of us kindly.',
		'Ones who wait beyond the stars, let our small {lamp} be unseen by you.',
		'{D}, we do not understand, and we praise you for it.',
		'The deep has no mouth yet it speaks; {D}, let me mishear nothing.',
		'Open my eyes only as far as I can bear, {D}, and then close them.',
		'Under the floor the old one counts us. {D}, let the count be long.',
		'I have heard the silence answer. {D}, make me worthy of the next question.'
	],
	ancestral: [
		'{D}, first of our line, look down on {P} and keep the hearth lit.',
		'Fathers and mothers behind me, {D} at the head: stand at my back.',
		'I set out {bread} and the {lamp} for those who walked here before.',
		'Blood of {D}, blood in me; let me not shame the name.',
		'{D}, who wore the first crown, advise the ones who wear it now.',
		'Elders in the earth, your child asks: which way is the road?',
		'We are the leaves, {D} is the root; let the root drink well.',
		'Let the dead be fed and the living honoured, {D}, in that order.'
	]
};

export const DOC_PRAYERS: Record<DoctrineKind, string[]> = {
	caste: [
		'Let each keep the post {D} set, the hand to the plough and the mind to the book.',
		'I do my own work and not another’s; so the world stays whole, {D}.',
		'Grant that I be born again to the rank I earn by doing this one well.'
	],
	evangelical: [
		'{D}, send me to the door that has not heard your name.',
		'Give me words for the stranger, {D}, and ears for the stranger’s answer.',
		'The harvest is wide and the hands are few; {D}, call more.'
	],
	militant: [
		'{D}, steady the shield arm and sharpen the vow; we do not march alone.',
		'Let me be the wall at {P}, {D}, and let the wall hold.',
		'Give the enemies of the faith a short road, and my brothers a long one.'
	],
	liberation: [
		'No chain is of {D}’s making; let every one I meet be struck off.',
		'{D}, grant me a free tongue and a free road, and the courage to use both.',
		'Let no lord stand between me and {D}, nor any priest who takes his coin.'
	],
	compassion: [
		'{D}, let my hands be a bowl for the hungry and a roof for the cold.',
		'May no one at my door go unfed, and none at my bed go unwept.',
		'Make me gentle to the beast and the beggar, {D}, even when they are not gentle to me.'
	],
	esoteric: [
		'{D}, let the veil thin one more fold, and let me keep what I see behind my teeth.',
		'I know the first letter. {D}, grant me the second and the silence after.',
		'What is hidden is hidden for a reason: {D}, be that reason.'
	],
	ancestral: [
		'I bow to the line before me, {D}, and promise to be bowed to by the line after.',
		'Let the names be said and the graves be swept, and the hearth be fed.',
		'Elders, I ask nothing but that you see how I try.'
	],
	blood_offering: [
		'Take this, {D}, and know it is the best I had.',
		'The altar is thirsty and so am I; {D}, drink first.',
		'What is spilled for {D} is never lost. What is withheld is.'
	],
	mutation_rites: [
		'{D}, change me; I will not ask into what.',
		'Let the flesh forget its shape, and the new shape be useful.',
		'I welcome the twist in the bone, the second heartbeat, the eye that opens in the palm.'
	],
	void_whispers: [
		'{D}, I heard you in the quiet; do not stop.',
		'Teach me the word that cannot be spoken and spare my voice.',
		'Let my silence be a door, and let you pass through it kindly.'
	],
	cyclopean_rites: [
		'Stone above stone, {D}, let me set one more and not be crushed.',
		'We build what we cannot understand; {D}, hold the keystone.',
		'May the angles be true and the corners keep their secret.'
	],
	sacred_grove: [
		'Root and leaf of {P}, {D} walks among you; I will not cut without asking.',
		'I plant before I take. {D}, remember it when you count.',
		'Let the oak outlive me and the acorn outlive the oak.'
	],
	mountain_pact: [
		'Old stone, {D} in the deep: I keep the oath my fathers swore with you.',
		'Let the pass hold and the vein run; {D}, we pay you in labour and in silence.',
		'Under the peak the pact stands. Let it outlast me.'
	]
};

// ---------------- liturgy ----------------

export interface LiturgyBank {
	names: string[];
	/** eight ordered steps; 5 to 8 are kept in order */
	steps: string[];
}

export const DOC_LITURGY: Record<DoctrineKind, LiturgyBank> = {
	caste: {
		names: ['The Rite of Stations', 'The Ordered Hours', 'The Seating of the Ranks'],
		steps: [
			'The faithful enter by the door of their station, the high first and the low last.',
			'The {T} lights the {lamp} and names the duty of each rank aloud.',
			'Each rank answers with its own line of the creed.',
			'The {book} is read from the page of the day.',
			'Each house brings its tithe in the goods of its trade.',
			'The {T} blesses the tithe, and the lowest rank is fed first, as the rule requires.',
			'The vows of station are renewed together.',
			'The ranks leave in reverse, and no one speaks across a boundary until the door is passed.'
		]
	},
	evangelical: {
		names: ['The Sending Service', 'The Open Door Hour', 'The Telling'],
		steps: [
			'The {bell} sounds and the doors of the {hall} are propped wide.',
			'A new face is sought and welcomed by name before anything else.',
			'The {T} tells the story of {D} in plain words.',
			'The congregation sings the long hymn, loud enough for the street.',
			'Testimony: any may stand and say what {D} has done for them.',
			'The faithful are paired with those who are new.',
			'The {T} names the road for the next sending, and who goes.',
			'Everyone leaves carrying a copy of the first verse to give away.'
		]
	},
	militant: {
		names: ['The Muster of the Faithful', 'The Rite of the Drawn Blade', 'The Vigil of Arms'],
		steps: [
			'The faithful gather armed at the {hall} door and ground their weapons.',
			'The {T} walks the ranks and checks each oath.',
			'The creed is chanted in the cadence of a march.',
			'Blades are raised to {D} and returned unblooded.',
			'The roll of the fallen is called; a voice answers for each: here, in spirit.',
			'The {T} names the enemy of the season and the ground to hold.',
			'Bread and sour wine are taken standing.',
			'The {bell} sounds three times; the ranks file out as they came.'
		]
	},
	liberation: {
		names: ['The Open Circle', 'The Breaking of Bonds', 'The Gathering Without Rank'],
		steps: [
			'All gather in a ring, with no seat higher than another.',
			'The {T} sits among them and speaks last, never first.',
			'Any person may name a chain they wish struck off.',
			'The {lamp} is passed from hand to hand around the circle.',
			'A short verse on the freedom of {D} is read by whoever holds the {lamp}.',
			'A knotted cord is cut for each chain named.',
			'Debts and grudges are spoken and forgiven where possible.',
			'The ring breaks and no one is told when to leave.'
		]
	},
	compassion: {
		names: ['The Feeding and the Telling', 'The Hour of Mercy', 'The Rite of Open Hands'],
		steps: [
			'The {hall} doors are opened and the sick and hungry are led in before the faithful.',
			'The {T} washes the hands of the first guest.',
			'A common pot is served to all, beggar and elder alike.',
			'The wounded are tended in a side room while a verse is read.',
			'The {book} is read, a little, by the {lamp}.',
			'Those with plenty lay their gifts on the alms table without being watched.',
			'The {T} asks aloud who is without a bed tonight and finds one.',
			'The faithful leave in pairs and carry what is left to the doors of the sick.'
		]
	},
	esoteric: {
		names: ['The Closed Hour', 'The Lesser and Greater Veil', 'The Sealed Reading'],
		steps: [
			'The doors are barred and the {lamp} is covered but one.',
			'Each initiate whispers a word of the day to the one beside them.',
			'The {T} reads from the {book} in the cipher, and no one writes anything down.',
			'The first circle answers, the second listens, the third leaves.',
			'A question is asked that has no answer, and is left unanswered.',
			'The pass-sign is given hand to hand in the dark.',
			'The {lamp} is uncovered and the first circle recites the closing line.',
			'The {T} burns the day’s notes, and all depart by different doors.'
		]
	},
	ancestral: {
		names: ['The Calling of the Names', 'The Hearth Service', 'The Sweeping of the Graves'],
		steps: [
			'The household sweeps the family shrine and lays out {bread} and the {lamp}.',
			'The eldest speaks the names of the line, back as far as they are known.',
			'After each name, the household answers: we remember.',
			'The {T} asks the dead for advice on the matter of the day.',
			'A silence is kept long enough for an answer to come, or not.',
			'The oldest child places the first portion before the shrine.',
			'The family eats the rest together, speaking of the departed.',
			'The {lamp} is left burning till it dies of its own accord.'
		]
	},
	blood_offering: {
		names: ['The Red Hour', 'The Feeding of the Altar', 'The Giving'],
		steps: [
			'The {hall} is darkened and the altar stone is cleansed with salt.',
			'The {T} cuts a mark on their own forearm to open the rite.',
			'The offerer is led forward, willing, and the creed is shouted over them.',
			'The offering is made and the blood is caught in the {vessel}.',
			'The {vessel} is passed through the crowd; all touch two fingers to it.',
			'The {T} reads from the {book}, the page stained and black.',
			'The meat is shared among the faithful, and none is wasted.',
			'The altar stone is left bare until the next cycle, and no one washes it.'
		]
	},
	mutation_rites: {
		names: ['The Turning', 'The Rite of the Second Shape', 'The Warp Gathering'],
		steps: [
			'The faithful gather unclothed or half-clothed, showing their changes with pride.',
			'The {T} calls each by the name of their gift, not the name they were born with.',
			'A bitter draught is passed, and no one asks what is in it.',
			'The newly touched are brought to the middle and their marks examined.',
			'The faithful dance until the changes sing, or until someone falls.',
			'The {T} lays a hand on a seeker and speaks the word of the turning.',
			'The seeker’s first change is announced to the crowd with a cheer.',
			'The least changed leave first; the most, last.'
		]
	},
	void_whispers: {
		names: ['The Listening', 'The Hour Without Words', 'The Opening of the Ear'],
		steps: [
			'The faithful sit in a ring, eyes closed, no {lamp} lit.',
			'The {T} hums the low note and the ring takes it up.',
			'The note is held until it is no longer a sound.',
			'Whoever hears the answer raises one finger and is led out.',
			'The {book} is turned but not read; the {T} lays a hand on the blank page.',
			'The ring speaks in a single voice, the words belonging to no one.',
			'The {T} asks the void a question and keeps the answer.',
			'All rise in silence and leave; those who heard nothing return next week.'
		]
	},
	cyclopean_rites: {
		names: ['The Setting of the Stone', 'The Measured Procession', 'The Rite of Angles'],
		steps: [
			'The faithful assemble at a half-built wall in the {hall} court.',
			'The {T} lays a cord along the ground and calls the angle true or false.',
			'Each faithful carries a stone from the quarry and sets it in order.',
			'The creed is chanted in a rhythm to match the setting of each block.',
			'The keystone is touched, the {bell} struck once.',
			'The {T} walks the wall’s edge reading the number of the course.',
			'No mortar is used on the holy course, only weight and patience.',
			'The faithful depart facing the wall, backing out until the gate.'
		]
	},
	sacred_grove: {
		names: ['The Grove Meeting', 'The Walk of the Oaks', 'The Seed Service'],
		steps: [
			'The faithful gather beneath the oldest tree and bare their heads.',
			'The {T} asks the trees’ leave to hold the meeting.',
			'A branch is struck softly, and the answer listened for in the leaves.',
			'Each faithful lays a seed or a handful of water at the roots.',
			'A verse is spoken from memory; the {book} stays closed in a grove.',
			'The {T} walks the circle blessing each tree by name.',
			'A fallen branch is gathered, never cut, to feed the fire.',
			'The faithful leave a plain gift of {bread} at the trunk and go quietly.'
		]
	},
	mountain_pact: {
		names: ['The Renewal of the Pact', 'The Descent Service', 'The Stone Hour'],
		steps: [
			'The faithful carry lamps down to the lowest chamber of the {hall}.',
			'The {T} lays a palm on the living rock and listens.',
			'The old pact is read aloud in the oldest words, no changes allowed.',
			'Each house presents a tool of its craft to be touched to the stone.',
			'Ore or gem from the new cutting is laid on the altar for the mountain’s share.',
			'The {bell} is struck on stone and the echo timed.',
			'A new oath is cut on the wall by a mason, a letter at a time.',
			'The faithful climb out in order of age, eldest last.'
		]
	}
};

// ---------------- scripture ----------------

export const SCRIPTURE_TITLES_A = ['The Book of', 'The Ledger of', 'The Sayings of', 'The Law of', 'The Roll of', 'The Songs of', 'The Wisdom of', 'The Teaching of'];
export const SCRIPTURE_TITLES_B = ['the Long Road', 'the Open Hand', 'Seven Winters', 'the First Light', 'the Water and the Stone', 'the Patient Flame', 'Many Doors', 'the Salt and the Seed', 'the Quiet Hour', 'the Deep Roots'];

export const THEO_SCRIPTURE: Record<TheologyKind, string[]> = {
	monotheism: [
		'In the beginning {D} spoke once, and the speaking is the world.',
		'Verse: Every hair on your head is counted, and not one wasted.',
		'Law: You shall bear no second name before {D}, neither in jest nor in need.',
		'Parable of the Lamp: A man hid his {lamp} under a bowl, and walked into a well.',
		'Verse: What you owe {D} you cannot pay, and so you are asked only to try.',
		'Law: The seventh day is {D}’s; let the ox and the servant rest with you.'
	],
	polytheism: [
		'Verse: The gods made the world in a quarrel and finished it in a feast.',
		'Parable of the Three Gifts: Each god gave a man a gift, and he kept the one he used least.',
		'Law: When you pass a shrine, leave a coin or a kind word, to whichever god is nearest.',
		'Verse: {D} may rule the high seat, but {D2} holds the keys to the larder.',
		'Parable of the Slighted God: A farmer forgot {D3}, and his well ran bitter for a season.',
		'Law: Never swear by a god you have not fed.'
	],
	animism: [
		'Verse: Every stone was somebody once; walk as if it still minds.',
		'Law: Ask the tree before you take the branch, and wait for the wind to answer.',
		'Parable of the Hunter and the Hare: A hunter killed without thanks and found no meat the next year.',
		'Verse: The river is a long body; do not foul its mouth.',
		'Law: A guest of the spirits leaves no trace but footprints and thanks.',
		'Verse: The wolf prays too; listen when he sings.'
	],
	pantheism: [
		'Verse: Do not look for {D} in a temple; you are standing in one.',
		'Law: To harm the least living thing is to wound the whole.',
		'Parable of the Weaver: A weaver cut a thread and the whole cloth in {P} frayed by autumn.',
		'Verse: The sea does not own the wave; neither do you own your thoughts.',
		'Law: Use, and return. Take, and replant.',
		'Verse: The first prayer is attention.'
	],
	dualism: [
		'Verse: Two hands made the world: one lit it, one was jealous.',
		'Law: You shall not lie to the light, nor flatter the dark.',
		'Parable of the Two Doors: A traveller took the door that looked brighter, and found the dark behind it.',
		'Verse: {D2} does not hate you. It only waits.',
		'Law: In every choice, ask which power it feeds.',
		'Verse: The long war is fought one small kindness at a time.'
	],
	chaos_cult: [
		'Verse: The order of things is a thin ice. We are the thaw.',
		'Law: Nothing built may stand beyond three summers.',
		'Parable of the Ash King: He bound the chaos in law, and the law burned him.',
		'Verse: Hunger is the only honest god.',
		'Law: Take what is offered, and what is not.',
		'Verse: Praise the crack in the wall; light enters.'
	],
	eldritch_horror: [
		'Verse: The sleeper does not dream of us; we are in its dream.',
		'Law: Do not count the stars aloud after midnight.',
		'Parable of the Lowered Lamp: A man took his {lamp} deeper than the stairs, and returned wearing another face.',
		'Verse: The sea knows a word we have forgotten.',
		'Law: Never answer the second knock.',
		'Verse: What listens, grows.'
	],
	ancestral: [
		'Verse: A house without a grave has not been lived in.',
		'Law: Speak of the dead as you speak to the living, and listen as well.',
		'Parable of the Forgotten Name: A line forgot its grandfather, and its fields would not bear.',
		'Verse: {D} wore the first crown so you might not have to.',
		'Law: The eldest speaks first and the youngest keeps the lamp.',
		'Verse: We are the ones who were told to carry on.'
	]
};

export const DOC_SCRIPTURE: Record<DoctrineKind, string[]> = {
	caste: [
		'Law: The hand belongs to its work; the work belongs to its house.',
		'Verse: The river does not argue with its banks.',
		'Law: Marry within your station; the line is the first obligation.',
		'Parable of the Potter’s Son: He turned a scribe and spoiled both trades.',
		'Verse: The humblest duty done well outweighs the highest done ill.',
		'Law: The high shall not strike the low; the low shall not speak first to the high.',
		'Verse: A rank is not a cage but a bridge for the one who walks it with grace.'
	],
	evangelical: [
		'Verse: A lamp that is only shown to the house is a poor lamp.',
		'Law: Carry the word to the door that has not heard, and leave a gift at the door that has.',
		'Parable of the Sower: A man threw seed on stone and soil alike, and was told he was right.',
		'Verse: The stranger is a guest of {D} before they are a guest of yours.',
		'Law: Answer a question once with the truth, and a second time with patience.',
		'Verse: Ten who hear are better than one who is certain.',
		'Parable of the Shut Gate: A town barred its walls and the faith went round them like water.'
	],
	militant: [
		'Law: The sword is drawn only for the faith, and sheathed only for the dead.',
		'Verse: Peace is the reward of those who held the line.',
		'Parable of the Wall: One stone fell and a city followed.',
		'Law: The coward’s share is the weight of the faithful.',
		'Verse: We do not hate the heathen; we are sent past them.',
		'Law: A faithful soldier owes the {T} one obedience and no more.',
		'Verse: The bell calls once; the army forms before it ends.'
	],
	liberation: [
		'Verse: No man is born with a collar; someone had to teach him to wear it.',
		'Law: A debt that grows beyond its loan is theft, and may be refused.',
		'Parable of the Open Door: A prisoner stayed in his cell for love of the keeper, and was freed by his own hand.',
		'Verse: A lord’s seat is made of the backs of those who knelt.',
		'Law: None shall be held who does not wish to be held.',
		'Verse: Break the chain, then forgive the smith.',
		'Law: Priest and ploughman answer to {D} in the same voice.'
	],
	compassion: [
		'Verse: Feed the one before you; the one behind you will be fed by another.',
		'Law: You shall take no life for food that can be had without it.',
		'Parable of the Bowl: A man gave his last bowl to a stranger and found it full each morning.',
		'Verse: The wound you ease is the wound you carry.',
		'Law: A guest is fed before they are asked their name.',
		'Verse: Mercy is not weakness, but a harder kind of strength.',
		'Law: The sick are the first in the {hall}, and the last to leave.'
	],
	esoteric: [
		'Verse: The first truth is that there are more truths.',
		'Law: What is told outside the circle is no longer true.',
		'Parable of the Open Book: A fool read all of it and understood a third.',
		'Verse: Under the visible word is a word that moves.',
		'Law: Each initiate shall teach one, and tell no one who taught them.',
		'Verse: A secret that is kept grows; a secret that is shared becomes a rumour.',
		'Law: Write nothing you could not burn.'
	],
	ancestral: [
		'Law: Sweep the graves in the season of the dead, and do not hurry.',
		'Verse: Your father’s face is in your child’s, and both are watching you.',
		'Parable of the Silent Hearth: A son left the shrine unlit and his sons forgot him.',
		'Law: No house shall be sold without telling its dead.',
		'Verse: The wise ask the dead, and the foolish merely outlive them.',
		'Law: Elders are heard before they speak.',
		'Verse: A name is a debt passed hand to hand.'
	],
	blood_offering: [
		'Law: The altar is fed before the table, and the table before the heir.',
		'Verse: What is spilled in faith returns tenfold in strength.',
		'Parable of the Withheld Hand: A man kept his best calf and lost his herd by spring.',
		'Law: The willing give once; the unwilling give always.',
		'Verse: Pain is the coin the powers prize.',
		'Law: The {T} shall not take more than the altar can hold.',
		'Verse: We bleed that we may not be bled.'
	],
	mutation_rites: [
		'Verse: The body is clay, and clay was made to be reshaped.',
		'Law: Reveal your change to the faithful, and never to a doubter.',
		'Parable of the Second Skin: A woman shed her first and was ashamed, then learned to run.',
		'Law: Those unchanged owe a service to those touched.',
		'Verse: The fair face is a mask over the true one.',
		'Verse: Every wound is a door.',
		'Law: Do not cut away what has grown in with grace.'
	],
	void_whispers: [
		'Verse: The silence between two sounds is the loudest voice.',
		'Law: Never repeat what you heard in the Listening.',
		'Parable of the Deaf Man: He was the first to hear, because nothing else was in the way.',
		'Verse: The void is not empty. It is waiting for your attention.',
		'Law: The Listeners shall have no loud days.',
		'Verse: Madness is an honest answer to a dishonest question.',
		'Law: Leave one ear open at night.'
	],
	cyclopean_rites: [
		'Law: Raise the wall in even courses, and do not ask what it keeps out.',
		'Verse: The stone remembers what the mason forgets.',
		'Parable of the Crooked Angle: A mason bent a corner and the whole hall learned to lean.',
		'Law: The measure of the holy is the number of its courses, not its beauty.',
		'Verse: What we build was already there; we only uncover it.',
		'Law: No light shall touch the lowest stone.',
		'Verse: Great is the weight that does not move.'
	],
	sacred_grove: [
		'Law: For every tree felled, plant two, and tell the grove.',
		'Verse: The oak is the elder of the world; bend your head.',
		'Parable of the Axeman: He cut the old ash and the spring went dry beneath it.',
		'Law: No fire is lit in the grove save the holy one.',
		'Verse: The forest does not hurry, and is never late.',
		'Law: Take only what has fallen, and thank it for falling.',
		'Verse: A bird’s quarrel is wiser than a king’s decree.'
	],
	mountain_pact: [
		'Law: The mountain gives, the mountain keeps. Take no more than the pact allows.',
		'Verse: Stone is the oldest oath; do not break what is older than you.',
		'Parable of the Greedy Delver: He cut past the mark and the roof forgot him.',
		'Law: No pick shall bite the holy seam.',
		'Verse: Under the root is the root of the world.',
		'Law: A debt to the mountain is paid in labour and in silence.',
		'Verse: Where the echo is longest, the pact is oldest.'
	]
};

// ---------------- afterlife ----------------

export const THEO_AFTERLIFE: Record<TheologyKind, string[]> = {
	monotheism: [
		'At death {D} weighs each life once; the light are lifted and the heavy are left to be lightened.',
		'The faithful wake in the house of {D}, where there is no hunger and every door stands open.',
		'{D} judges and is merciful: a soul is asked what it did with the single life it was given.'
	],
	polytheism: [
		'The dead cross the grey river and each god claims the souls that served them best.',
		'Heroes feast at the table of {D}; the common dead drift to the quiet fields of {D2}.',
		'A soul stands before three gods in turn and takes the road the last of them points to.'
	],
	animism: [
		'The dead go into the places they loved: the river, the hill, the roots of old trees.',
		'A soul walks the land as a spirit for seven winters, then joins the wider wild.',
		'The dead are not gone; they have become the weather of the places they walked.'
	],
	pantheism: [
		'At death the self dissolves back into the whole, as a wave returns to the sea.',
		'No soul is lost; each is returned to the world as grass, as wind, as a face in a stranger.',
		'The dead are not elsewhere, only more widely spread.'
	],
	dualism: [
		'The soul is claimed by light or dark; most are claimed by both and must be sorted by the long war.',
		'Those who fed the dark are dragged under; those who tended the light rise.',
		'After death the soul stands on a narrow bridge; what it carried decides which way it leans.'
	],
	chaos_cult: [
		'The dead are devoured, and the strongest are remade as something worse.',
		'Death is the first change; the faithful are reborn wearing a new hunger.',
		'No judgement, only appetite; the dead feed what comes next.'
	],
	eldritch_horror: [
		'The dead sink to where the sleeper dreams and are folded into the dream.',
		'The soul is a small thing in a large hush; it falls until it cannot be told from the deep.',
		'At death one hears the whole of the word, once, and then is the word.'
	],
	ancestral: [
		'The dead join the line behind the living, watching, advising, and sometimes quarrelling.',
		'A good ancestor dwells in the hearth and is fed; a forgotten one goes cold.',
		'The dead cross to the house of {D} and wait there for their line to remember them.'
	]
};

export const DOC_AFTERLIFE: Record<DoctrineKind, string> = {
	caste: 'The next life is the rank this one has earned.',
	evangelical: 'The unconverted wait at the door, and the faithful are asked to go and fetch them.',
	militant: 'Those who fall in the faith’s wars are carried straight to the high seat.',
	liberation: 'No soul is chained in the next life; there is nothing to be bound to.',
	compassion: 'Those who fed the hungry are fed first; those who refused wait at an empty table.',
	esoteric: 'Only the initiated know the true shape of the road, and they do not say.',
	ancestral: 'The remembered dead dwell warm; the forgotten go cold, so the living must keep the names.',
	blood_offering: 'Those who gave blood in life are welcomed at the table, and the miserly are the meal.',
	mutation_rites: 'The soul keeps the shape it grew into, and the more changed it is, the nearer the throne.',
	void_whispers: 'The listening soul is carried by its silence into the answer.',
	cyclopean_rites: 'The dead are laid in the lowest chamber and become part of the wall.',
	sacred_grove: 'The dead are planted, and a tree grows where they lie to keep their memory.',
	mountain_pact: 'The faithful return to the stone, and their bones are laid in the deep halls.'
};

// ---------------- holy days ----------------

export interface HolyDayBank {
	name: string;
	/** month on the 12 month scale, 0 = midwinter */
	month: number;
	rite: string;
}

export const DOC_HOLYDAYS: Record<DoctrineKind, HolyDayBank[]> = {
	caste: [
		{ name: 'Day of Stations', month: 0, rite: 'Each rank renews its vows in order before the {T}.' },
		{ name: 'The Weighing of Tithes', month: 8, rite: 'Houses bring the year’s goods and the lowest rank is fed first.' },
		{ name: 'Feast of the Four Tools', month: 3, rite: 'Plough, pen, sword and scales are blessed on the {hall} steps.' },
		{ name: 'Night of the Returning', month: 10, rite: 'The faithful recite the names of past lives, one rank at a time.' },
		{ name: 'The Walk of the Gate', month: 5, rite: 'All ranks walk the boundary of the quarter and mend what is broken.' }
	],
	evangelical: [
		{ name: 'The Sending', month: 2, rite: 'Pairs of the faithful depart for far towns with a {book} each.' },
		{ name: 'Feast of the Open Door', month: 5, rite: 'Every house sets a place at table for a stranger.' },
		{ name: 'Day of Testimony', month: 8, rite: 'Any may stand in the square and tell what {D} has done.' },
		{ name: 'The Long Hymn', month: 0, rite: 'The whole town sings the hymn through the shortest day.' },
		{ name: 'The Welcoming', month: 10, rite: 'New converts are named before the town and given the first loaf.' }
	],
	militant: [
		{ name: 'Muster Day', month: 2, rite: 'The faithful assemble under arms and renew the oath.' },
		{ name: 'The Vigil of Arms', month: 7, rite: 'A night spent awake with the weapon laid before the altar.' },
		{ name: 'Day of the Fallen', month: 10, rite: 'The roll of the dead is called and each is answered for.' },
		{ name: 'The Blessing of Banners', month: 4, rite: 'The {T} sprinkles every standard with wine and ash.' },
		{ name: 'The Victory March', month: 9, rite: 'The host parades past the {hall} to the beat of a single drum.' }
	],
	liberation: [
		{ name: 'The Breaking of Chains', month: 3, rite: 'Symbolic bonds are cut in the square and debts forgiven where possible.' },
		{ name: 'Day Without Rank', month: 6, rite: 'Lord and labourer sit at the same table and swap tasks.' },
		{ name: 'Night of Open Doors', month: 0, rite: 'Every house leaves its door unlatched until dawn.' },
		{ name: 'The Open Voice', month: 9, rite: 'Any may speak in the square without fear of reprisal.' }
	],
	compassion: [
		{ name: 'Feast of the Common Pot', month: 0, rite: 'All households bring one dish to a shared table in the square.' },
		{ name: 'The Hospice Days', month: 4, rite: 'The faithful tend the sick in the {hall} for three days without pay.' },
		{ name: 'Day of Gentle Hands', month: 7, rite: 'No animal is slaughtered; the faithful eat only what the earth gives.' },
		{ name: 'The Healing Walk', month: 9, rite: 'The {T} walks the streets and blesses every invalid door.' },
		{ name: 'Night of the Lamps for the Lost', month: 11, rite: 'A {lamp} is set at the door for each missing soul.' }
	],
	esoteric: [
		{ name: 'The Closing of the Doors', month: 0, rite: 'The inner circle meets in silence on the darkest night.' },
		{ name: 'The Opening of the Second Veil', month: 3, rite: 'The newly initiated receive the next layer of the cipher.' },
		{ name: 'Night of Unspoken Names', month: 6, rite: 'No name is said aloud from dusk to dawn.' },
		{ name: 'The Burning of Notes', month: 9, rite: 'All written records of the year are burnt in the inner court.' },
		{ name: 'The Quiet Fast', month: 11, rite: 'Members fast and speak no word until the {bell} sounds.' }
	],
	ancestral: [
		{ name: 'Sweeping of the Graves', month: 2, rite: 'Families clean and feed the graves of the line.' },
		{ name: 'Feast of the Names', month: 10, rite: 'The eldest recites the whole line before the shared meal.' },
		{ name: 'Night of the Hearth', month: 0, rite: 'Every household keeps its hearth lit through the dark and calls the dead.' },
		{ name: 'Day of the Return', month: 7, rite: 'Those living far away come home to eat at the family table.' },
		{ name: 'The Naming of the Newborn', month: 4, rite: 'Children born in the year are named after the dead of the line.' }
	],
	blood_offering: [
		{ name: 'The Red Moon Feast', month: 8, rite: 'An offering is made at dusk and the altar stone runs dark.' },
		{ name: 'Day of the Giving', month: 2, rite: 'Each faithful gives a measure of their own blood to the altar.' },
		{ name: 'The Taking of the Throat', month: 5, rite: 'The finest beast of the year is dedicated and slain at dawn.' },
		{ name: 'Night of the Unwashed Stone', month: 0, rite: 'The altar is left unwashed through the longest night.' }
	],
	mutation_rites: [
		{ name: 'The Day of Turning', month: 2, rite: 'The newly changed are presented to the faithful in the {hall}.' },
		{ name: 'The Dance of Second Skins', month: 6, rite: 'All dance until their changes show and the unchanged are carried out.' },
		{ name: 'Feast of the Twisted Harvest', month: 8, rite: 'Odd and misshapen crops are the honoured dish.' },
		{ name: 'Night of the Opening Eyes', month: 0, rite: 'The faithful meet in darkness and compare what they see.' },
		{ name: 'The Warp Bloom', month: 4, rite: 'Rare flowers grown in tainted soil are blessed.' }
	],
	void_whispers: [
		{ name: 'The Long Quiet', month: 0, rite: 'The faithful fast from speech for a night and a day.' },
		{ name: 'The Night of the Answer', month: 7, rite: 'The ring meets beneath the open sky and listens for the word.' },
		{ name: 'The Opening of the Ear', month: 3, rite: 'New Listeners are led to a still pool and left alone.' },
		{ name: 'Day of Unmade Words', month: 10, rite: 'All written holy words are scratched out and left blank.' }
	],
	cyclopean_rites: [
		{ name: 'The Setting of the Stone', month: 3, rite: 'A new block is laid in the great wall and measured by the {T}.' },
		{ name: 'The Day of Angles', month: 6, rite: 'Masons recite the measures of the holy courses.' },
		{ name: 'Night of the Lowest Chamber', month: 0, rite: 'A single {lamp} is carried to the deepest room and left there.' },
		{ name: 'Feast of the Keystone', month: 9, rite: 'The faithful gather beneath the keystone and sing the low note.' },
		{ name: 'The Weighing of Weights', month: 11, rite: 'Great stones are lifted by the whole town in turn.' }
	],
	sacred_grove: [
		{ name: 'The Planting Day', month: 2, rite: 'The faithful plant a sapling for each child born in the year.' },
		{ name: 'Midsummer Rest', month: 5, rite: 'No axe is lifted and no ground is broken for three days.' },
		{ name: 'Leaf Fall Walk', month: 9, rite: 'The {T} walks the grove and each tree is named and thanked.' },
		{ name: 'Night of the Holy Fire', month: 0, rite: 'The only fire in the grove is lit from the oldest oak.' },
		{ name: 'Feast of First Fruit', month: 7, rite: 'The first fruit of each tree is left at the trunk.' }
	],
	mountain_pact: [
		{ name: 'The Renewal of the Pact', month: 0, rite: 'The pact is read in the lowest chamber and sealed with ore.' },
		{ name: 'Day of Stone Offerings', month: 3, rite: 'Each house lays a worked stone at the mountain’s foot.' },
		{ name: 'Descent of Lamps', month: 7, rite: 'The faithful carry lit {lamp}s into the deep and sing.' },
		{ name: 'The Day of Echoes', month: 10, rite: 'A great stone is struck and the length of its answer is read as an omen.' }
	]
};

// ---------------- sins, blessings, observances ----------------

export const GENERIC_SINS = [
	'swearing falsely in the name of {D}',
	'neglecting the dead',
	'letting a guest leave hungry',
	'breaking a vow sworn at the {hall}',
	'mocking the {T} to their face',
	'wasting {bread} for spite',
	'abandoning kin in need',
	'defiling the {hall} with a brawl'
];

export const DOC_SINS: Record<DoctrineKind, string[]> = {
	caste: ['marrying out of rank', 'taking up a trade not your own', 'speaking first to a higher rank', 'sharing a cup across ranks', 'refusing the tithe of your house', 'leaving your station without leave', 'teaching a low-born child to read'],
	evangelical: ['turning a seeker from the door', 'keeping the word to yourself', 'mocking a convert', 'refusing to give the first verse', 'silence before a blasphemer', 'refusing a call to be sent', 'hiding your faith in fear'],
	militant: ['cowardice in the field', 'laying down arms before the end of the vow', 'sparing a sworn enemy of the faith', 'disobeying a {T}', 'dishonouring the fallen', 'selling arms to unbelievers', 'sleeping on watch'],
	liberation: ['holding another against their will', 'collecting a false debt', 'kneeling to a lord who demands it', 'informing on a neighbour', 'silencing a free voice', 'forcing the faith on another', 'refusing sanctuary to a runaway'],
	compassion: ['killing for sport', 'turning away the sick', 'eating while another starves at your door', 'striking a child or an animal', 'refusing to forgive', 'keeping a surplus while others are hungry', 'laughing at the dying'],
	esoteric: ['revealing the circle’s word to the uninitiated', 'writing down the cipher', 'speaking of the closed hour outside it', 'faking a vision', 'forcing an initiation', 'doubting aloud before the circle', 'selling a secret for coin'],
	ancestral: ['forgetting the names of the line', 'leaving a grave unswept', 'selling the family shrine', 'shaming the dead by deed', 'refusing the eldest’s word', 'dying unmourned by neglect of kin', 'letting the hearth go cold'],
	blood_offering: ['withholding the best of your herd', 'shedding blood without the altar', 'refusing the giving when it is your turn', 'washing the holy stone', 'revealing the red hour to outsiders', 'fainting at the rite', 'keeping back a child from the offering'],
	mutation_rites: ['cutting away a gift', 'hiding your change in shame', 'mocking the touched', 'refusing the bitter draught', 'seeking a cure for a change', 'speaking the old name of a turned one', 'fleeing the Turning'],
	void_whispers: ['speaking during the Listening', 'repeating the whispers aloud', 'sleeping through the Quiet', 'lighting a {lamp} in the ring', 'writing down the answer', 'refusing the silence', 'telling a lie to the ring'],
	cyclopean_rites: ['setting a stone out of order', 'using mortar on the holy course', 'entering the lowest chamber with a light', 'bending a measure', 'damaging the wall', 'questioning the angles', 'leaving the work unfinished'],
	sacred_grove: ['felling a tree without leave', 'lighting an unholy fire in the grove', 'killing in the grove', 'leaving a seedling unplanted', 'fouling a spring', 'plucking the holy mistletoe in haste', 'mocking the birdsong'],
	mountain_pact: ['cutting past the marked seam', 'breaking a pledge of silence', 'taking ore without the share', 'speaking loudly in the deep', 'leaving a collapsed tunnel unmarked', 'disrespecting the stone', 'abandoning a delving brother']
};

export const GENERIC_BLESSINGS = [
	'May {D} keep your door.',
	'May your {lamp} burn through the night.',
	'May your table never be bare.',
	'Go gently, and arrive.',
	'May the road be kind to your feet.',
	'May your name be remembered.',
	'Peace to your house.',
	'May the work of your hands outlast you.'
];

export const DOC_BLESSINGS: Record<DoctrineKind, string[]> = {
	caste: ['May you keep your station well.', 'May your house be known for its craft.', 'Rise in your next life.', 'May the rank bless you as you bless it.', 'May your lineage be spotless.'],
	evangelical: ['May the word ride with you.', 'May every door open to your voice.', 'May you find a hundred listeners.', 'Go, and be heard.', 'May the stranger become kin.'],
	militant: ['May your shield hold.', 'May your oath be heavier than your blade.', 'Go and return with honour.', 'May the faithful stand at your back.', 'Victory to the line.'],
	liberation: ['Walk free.', 'May no chain find you.', 'May your voice be heard.', 'Break what binds you.', 'Be your own keeper.'],
	compassion: ['May your hands be gentle.', 'May you be fed as you feed.', 'May no one go cold at your door.', 'May you be healed as you heal.', 'Mercy keep you.'],
	esoteric: ['May the veil lift for you.', 'May you keep your own counsel.', 'Know, and be silent.', 'May the second door open.', 'Walk in shadow, see in light.'],
	ancestral: ['May the dead be kind.', 'May your name be spoken after.', 'May your hearth stay warm.', 'May the line not break.', 'Be remembered.'],
	blood_offering: ['May your blood be strong.', 'May the altar favour you.', 'May you give well.', 'May the red tide spare you.', 'Be worth the taking.'],
	mutation_rites: ['May you change well.', 'May your gifts bloom.', 'May the second shape be kind.', 'Be turned.', 'May none know your old face.'],
	void_whispers: ['May you hear the answer.', 'May the silence keep you.', 'Be unheard.', 'May your ear stay open.', 'Listen well.'],
	cyclopean_rites: ['May your stone be true.', 'May the wall hold.', 'May your angles be exact.', 'Be set firmly.', 'May you outlast the weather.'],
	sacred_grove: ['May the oak shelter you.', 'May your roots go deep.', 'Grow, and be patient.', 'May the leaf fall kindly.', 'Be green.'],
	mountain_pact: ['May the vein run true.', 'May the roof hold.', 'May the stone remember you.', 'May your pick strike clean.', 'Go deep, return safe.']
};

export const GENERIC_OBSERVANCES = [
	'Light a {lamp} and name {D} at the start of each day.',
	'Keep the weekly rest day and give no work to others.',
	'Attend the {hall} on every holy day.',
	'Give a tithe to the {hall} each season.',
	'Say a short prayer before every meal.',
	'Settle your quarrels before the holy day.'
];

export const DOC_OBSERVANCES: Record<DoctrineKind, string[]> = {
	caste: ['Keep the dress and hours of your rank.', 'Never eat with a lower rank.', 'Teach your craft to your own line only.', 'Renew station vows each new year.', 'Bring the tithe of your trade.'],
	evangelical: ['Share the faith with one stranger every month.', 'Keep a spare {book} for the curious.', 'Sing the hymn in the street on holy days.', 'Welcome a stranger to your table once a week.', 'Support a mission each season.'],
	militant: ['Keep your weapon clean and blessed.', 'Drill with the faithful each week.', 'Answer the muster bell at once.', 'Fast the day before a campaign.', 'Never lay your arms among unbelievers.'],
	liberation: ['Hold your own counsel, and your own conscience.', 'Sit in the circle without rank.', 'Offer the runaway a night’s shelter.', 'Forgive one debt each year.', 'Speak plainly in public.'],
	compassion: ['Feed one hungry person each day.', 'Tend the sick once a week.', 'Eat no flesh on holy days.', 'Forgive one wrong each month.', 'Give away a tenth of what you have.'],
	esoteric: ['Keep the cipher in your head, never on paper.', 'Meet the circle at the closed hour.', 'Speak of the mysteries to no outsider.', 'Seek one new insight each season.', 'Burn your notes after use.'],
	ancestral: ['Sweep the shrine each week.', 'Speak the names of the line at the evening meal.', 'Visit the graves each season.', 'Ask the elders before any great choice.', 'Keep the hearth fed.'],
	blood_offering: ['Give a drop at every new moon.', 'Dedicate the first of every litter to the altar.', 'Keep the altar stone unwashed.', 'Attend the Red Hour in full.', 'Never refuse the {T}’s call.'],
	mutation_rites: ['Show your changes proudly to the faithful.', 'Drink the draught each month.', 'Keep no mirror that flatters.', 'Welcome the unchanged to learn.', 'Mark each change on your skin.'],
	void_whispers: ['Keep a daily quiet hour.', 'Listen at the well before dawn.', 'Never repeat what you hear.', 'Attend the Listening when called.', 'Sleep with one window open.'],
	cyclopean_rites: ['Bring one stone each year to the great wall.', 'Measure your own house by the holy angles.', 'Walk the wall at dusk.', 'Attend the setting of the stone.', 'Never speak above a murmur in the {hall}.'],
	sacred_grove: ['Plant a seed every spring.', 'Walk the grove on each holy day.', 'Take no wood that is not fallen.', 'Thank a tree each morning.', 'Keep no fire after the grove is dark.'],
	mountain_pact: ['Descend to the stone hall each season.', 'Keep your pick blessed.', 'Pay the mountain its share of every find.', 'Speak softly underground.', 'Honour the oldest miner at the table.']
};

// ---------------- clergy ----------------

export const DOC_CLERGY: Record<DoctrineKind, { faithful: string[]; stranger: string[] }> = {
	caste: { faithful: ['Hail, {name}. Keep your station and be at peace.', 'Well met, {name}. Has your house paid its tithe?'], stranger: ['Traveller, state your house and rank, and I will know how to greet you.', 'You are not of the order. Mind the doors you pass.'] },
	evangelical: { faithful: ['{name}, my friend! Who have you told this week?', 'Well met, {name}. The harvest is wide.'], stranger: ['Stranger, come in; there is a place and a word for you.', 'You look weary. Sit, and hear what {D} has to say.'] },
	militant: { faithful: ['Hail, {name}. Is your blade clean?', 'At ease, {name}. The line holds because of you.'], stranger: ['State your business and your creed, stranger, and keep your hands in view.', 'Unbeliever or friend? Say it plain.'] },
	liberation: { faithful: ['Walk free, {name}.', 'Sit, {name}. No one here sits higher.'], stranger: ['You are free to stay or go, stranger.', 'Welcome. Take what you need and owe nothing.'] },
	compassion: { faithful: ['Peace, {name}. Have you eaten?', 'Gentle day, {name}. Who needs us today?'], stranger: ['Come in from the road, stranger. There is a bowl and a bed.', 'Your name can wait. Warm yourself first.'] },
	esoteric: { faithful: ['The veil thins, {name}.', 'Speak the word, {name}, and pass.'], stranger: ['You stand at a door. Think before you knock.', 'Some doors open only one way, stranger.'] },
	ancestral: { faithful: ['The line be with you, {name}.', 'Have you swept the shrine, {name}?'], stranger: ['Whose house do you come from, stranger? The dead will ask.', 'Welcome to our hearth. Mind the elders.'] },
	blood_offering: { faithful: ['The altar is hungry, {name}. Are you?', 'Strong blood, {name}.'], stranger: ['You are not marked. Tread softly.', 'Stranger, have you the stomach?'] },
	mutation_rites: { faithful: ['Well turned, {name}. How is the new shape?', 'Show me your gift, {name}.'], stranger: ['Plain-faced, aren’t you? Come and be shown.', 'Stranger, do not be afraid of what you see.'] },
	void_whispers: { faithful: ['Hush, {name}. Did you hear it?', 'The quiet be with you, {name}.'], stranger: ['Keep your voice low, stranger.', 'You have a loud mind. Sit, and be still.'] },
	cyclopean_rites: { faithful: ['Square and true, {name}.', 'Well set, {name}. Is the course complete?'], stranger: ['Mind your step, stranger; the stones were laid before your people.', 'Do not touch the walls.'] },
	sacred_grove: { faithful: ['Green be your days, {name}.', 'The oak knows you, {name}.'], stranger: ['Walk softly in the grove, stranger, and take nothing.', 'You are a guest of the trees.'] },
	mountain_pact: { faithful: ['Deep be your seam, {name}.', 'Stone keep you, {name}.'], stranger: ['Surface-dweller, mind the pact.', 'You are welcome in the hall; not beyond it.'] }
};

// ---------------- heresies ----------------

export interface HeresyBank {
	names: string[];
	claims: string[];
}

export const DOC_HERESIES: Record<DoctrineKind, HeresyBank> = {
	caste: {
		names: ['the Levellers of the Quarter', 'the Open Station', 'the Crossed Hands', 'the Rank-Breakers', 'the Reborn in Error'],
		claims: ['that rank is a veil and every soul may serve at any post', 'that rebirth is not earned by station but by kindness', 'that the tithe of the low is worth more than the high’s', 'that the {T} are only men and may be wrong about stations', 'that marriage across ranks is blessed by {D}']
	},
	evangelical: {
		names: ['the Quiet Ones', 'the Silent Flock', 'the Word Kept', 'the Closed Door', 'the Stay-at-Homes'],
		claims: ['that the faith need not be spread, only lived', 'that {D} speaks differently to each people and none should be taught another’s word', 'that conversion by song is no conversion at all', 'that the stranger is better left in peace', 'that the {book} is for the faithful alone']
	},
	militant: {
		names: ['the Gentle Shield', 'the Sheathed Blade', 'the Peacemakers of the Line', 'the Unarmed Hosts', 'the Weepers at the Gate'],
		claims: ['that {D} wants no war fought in the name', 'that the holy sword is a shame and the shield alone is holy', 'that the enemy of the faith is within, not beyond', 'that the fallen are no more blessed than the living', 'that martial vows are a snare of the {T}']
	},
	liberation: {
		names: ['the Obedient', 'the Gentle Yoke', 'the Order of the Bound', 'the Lordly Faithful', 'the Kneeling Few'],
		claims: ['that a rightful lord is a gift of {D}', 'that freedom without order is ruin', 'that the chain is a blessing and a teacher', 'that the {T} should rule as well as guide', 'that debt is holy and must be paid']
	},
	compassion: {
		names: ['the Sharp-Handed', 'the Tough Charity', 'the Hard Bread', 'the Strict Mercy', 'the Salt Brothers'],
		claims: ['that mercy to the wicked is cruelty to the good', 'that the beggar must work for the bowl', 'that the sick are punished and should not be healed', 'that the hungry deserve their hunger', 'that flesh may be eaten without sin']
	},
	esoteric: {
		names: ['the Open Book', 'the Plain Readers', 'the Light Seekers', 'the Many-Mouthed', 'the Unveiled'],
		claims: ['that the cipher should be printed for all to read', 'that the mysteries belong to the people, not the circle', 'that the {T} are keeping truth from the poor', 'that there is no second door, only a first one', 'that every soul is initiated by being born']
	},
	ancestral: {
		names: ['the Forward-Facing', 'the Unremembered', 'the Newborn Line', 'the Graveless', 'the Sons of the Morning'],
		claims: ['that the dead have no say in the living’s affairs', 'that no name is owed to ancestors who did nothing', 'that one may choose one’s own line', 'that {D} is a story and the dead are only gone', 'that the shrine may be sold']
	},
	blood_offering: {
		names: ['the Bloodless Cult', 'the Gentle Altar', 'the Grain-Givers', 'the Clean Stone', 'the Ones Who Stayed'],
		claims: ['that the altar needs grain, not blood', 'that {D} is shamed by what is spilled', 'that the old rites were mistaken symbols', 'that the {T} are butchers in a priest’s coat', 'that the best offering is to be left unspent']
	},
	mutation_rites: {
		names: ['the Pure Flesh', 'the Unturned', 'the Clean Skin', 'the Smooth-Faced', 'the Keepers of the First Shape'],
		claims: ['that the original body is the sacred one', 'that mutation is disease and not a gift', 'that the {T} are corrupted and not blessed', 'that {D} made us once and perfectly', 'that the changed should be healed, not praised']
	},
	void_whispers: {
		names: ['the Loud Ones', 'the Singers of the Day', 'the Lamp-Bearers', 'the Open Mouths', 'the Chorus'],
		claims: ['that the void should be answered aloud', 'that the Listening is madness, not wisdom', 'that {D} wants song, not silence', 'that the answer is in the sun, not the dark', 'that the faithful should speak of what they hear']
	},
	cyclopean_rites: {
		names: ['the Mortar-Men', 'the Crooked Course', 'the Soft Builders', 'the Light-in-the-Deep', 'the Unmeasured'],
		claims: ['that mortar and craft are no sin', 'that the angles are a convention', 'that the lowest chamber should be opened to light', 'that the wall is a prison and not a shrine', 'that {D} cares nothing for stone']
	},
	sacred_grove: {
		names: ['the Axe Brethren', 'the Clear-Fellers', 'the Open Sky', 'the Tame Gardeners', 'the Stone Gatherers'],
		claims: ['that the forest exists to be used', 'that the grove is a heap of wood and nothing more', 'that {D} lives in the sky, not the trees', 'that fire is sacred anywhere', 'that the old ash may be cut when the {T} approve']
	},
	mountain_pact: {
		names: ['the Surface Folk', 'the Sky-Seekers', 'the Pact-Breakers', 'the Deep Doubters', 'the Open Miners'],
		claims: ['that the pact binds only the first delvers', 'that {D} lives in the open and not the deep', 'that the holy seam may be cut for the common good', 'that the {T} are hoarding the vein', 'that the echo is only air']
	}
};

/** doctrine-neutral extra splits keyed by theology flavour, used when a real rival faith is named */
export const SCHISM_CLAIMS = [
	'that the true line of teaching was broken by the {T} of the mother faith',
	'that {D} was misnamed and the true name is older',
	'that the mother faith has grown fat on tithes and lost the way',
	'that the holy days were moved and the old calendar is the right one'
];

export const INQUISITION_LINES = [
	'The inquisitors of the faith have burned or banished those who held it, and its followers keep their voices low.',
	'Under the watch of the Inquisitor, the claim is spoken only behind shut doors.'
];

// ---------------- saints ----------------

export const VIRTUE_LEGENDS: Record<string, string[]> = {
	Mercy: [
		'{n} fed a besieged town from a single pot and was found dead of hunger, the pot still warm.',
		'{n} tended the sick through the plague at {P} and took no payment.',
		'{n} gave a cloak to a beggar who was later found to be {D} in disguise.'
	],
	Valour: [
		'{n} held the ford at {P} alone for a night and a day, and the river ran red around them.',
		'{n} walked into a burning {hall} to carry out the {book}, and returned unscorched.',
		'{n} broke a siege by challenging the enemy’s champion and winning with a bare hand.'
	],
	Wisdom: [
		'{n} spoke the law so plainly that two enemy villages made peace at the sound.',
		'{n} copied the {book} by hand, three times, from memory, and the copies agreed.',
		'{n} answered nine questions from {D} in a dream and was never again heard to boast.'
	],
	Martyrdom: [
		'{n} refused to recant before the magistrate and was given to the crowd at {P}.',
		'{n} walked unarmed to the enemy camp and was killed; the army broke camp the next morning.',
		'{n} sang the old hymn until the end, and the singing was taken up by those who watched.'
	],
	Purity: [
		'{n} lived on water and {bread} for forty winters and was never ill.',
		'{n} kept a single {lamp} alive in {P} for a lifetime without letting it gutter.',
		'{n} walked away from a crown and was found a week later tending goats.'
	]
};

export const LEGEND_EPITHETS = ['the Gentle', 'the Lamp-bearer', 'of the Long Road', 'the Barefoot', 'the Unbroken', 'who Listened', 'the Plain Speaker', 'the Patient', 'of the Third Gate', 'the Mender'];

/** legendary saints when the faith has none canonised: virtue plus a one-line life */
export const LEGENDARY_LIVES: [string, string][] = [
	['Mercy', '{n} {e} gave away the whole of a rich inheritance and died with only a bowl.'],
	['Valour', '{n} {e} stood alone against a raiding band and turned them with a single word.'],
	['Wisdom', '{n} {e} judged a feud between brothers and left both of them in tears of shame.'],
	['Martyrdom', '{n} {e} was seized by a tyrant and refused to renounce {D} to the last breath.'],
	['Purity', '{n} {e} lived for years in a hollow tree and was fed by birds.'],
	['Mercy', '{n} {e} sheltered a village in a harsh winter and was never seen again after the thaw.'],
	['Wisdom', '{n} {e} first wrote down the sayings and burned the draft that was too proud.'],
	['Valour', '{n} {e} walked into a burning {hall} and returned with the {book} and no scorch.']
];
