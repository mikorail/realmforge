/**
 * Phrase banks for rites, festivals and law. Tokens like <drink> are filled by customs.ts;
 * schema placeholders like {faith} are left for the engine. Variant tuples are [tags, text]
 * where tags are space separated trait or genre names.
 */
import type { LawEntry, Punishment, Rite } from '../../../adventure/culturepack';
import type { FeastKind } from '../data';

export type V = [string, string];
export interface RiteDef {
	names: string[];
	/** each slot is one ordered step; one variant is drawn per slot */
	slots: V[][];
	roles: string[];
	gifts: string[];
	dress: string[];
	song: string[];
	/** per genre: one extra step inserted somewhere */
	genre: Record<string, string>;
}
export type RiteId = Exclude<Rite['id'], 'harvest' | 'departure' | 'homecoming'>;

export const RITES: Record<RiteId, RiteDef> = {
	birth: {
		names: ['First Breath', 'Cradle Welcome', 'Hearth Greeting', 'Threshold of the Newborn'],
		slots: [
			[['', 'A kinsman carries word to the <house> row that a child has come.'], ['pious', 'The midwife gives the hour of birth to the keepers of {faith}, so the day can be read.'], ['nomadic', 'A rider carries a knotted cord to the next camp; the knots tell the hour of birth.']],
			[['', 'The child is washed in warm water and wrapped in cloth woven by the mother\'s kin.'], ['seafaring', 'The child is rinsed in salt water and a single drop is put on the lips.'], ['martial', 'The child is laid for one breath on the household\'s <weapon>-cloth and the line is recited.'], ['ancestral', 'The child is held up to <anc> so the dead can see who has joined the line.']],
			[['', 'Neighbours bring <gift> and set it by the cradle without a word.'], ['mercantile', 'Each guest drops a coin in the cradle-box; the sum is read out and entered in the ledger.'], ['pious', 'A keeper of {faith} marks the child\'s brow with ash and oil.']],
			[['', 'The household serves <staple> and <drink> to all who come, for three days.'], ['insular', 'Only close kin enter; the rest leave gifts at the gate and are fed there.'], ['scholarly', 'A verse or a figure is read aloud over the cradle as the child\'s first lesson.']],
			[['', 'The birth is <mark> before the first moon is out.'], ['', 'The mother rests, and no one asks anything of her until the feast is cleared.'], ['ancestral', 'A lock of hair is kept in the household box beside those of the elders.']]
		],
		roles: ['the midwife', 'the eldest aunt', 'the father or his brother', 'a neighbour', '<elder> of the house'],
		gifts: ['<gift>', 'a swaddling cloth', 'a small bell', 'a charm against fever', 'a spoon of <staple>'],
		dress: ['The child is wrapped in plain cloth with nothing sewn on it.', 'Guests come in their best: <sdress>.', 'The mother wears her wedding <head>.'],
		song: ['A lullaby is sung over the cradle, played on <smusic>.', 'The household hums the family cradle-song, one line for each ancestor named.', 'A short blessing is sung three times at the door.'],
		genre: {
			fantasy: 'A hedge-witch or priest reads the child\'s omen in the hearth smoke.', mythic: 'A lamp is lit in the <hall> so that the gods may find the child.',
			steampunk: 'The birth is entered in the parish register and a brass tag is stamped with the hour.', dieselpunk: 'The union adds the child to the roll and the foreman sends a bag of coal.',
			atompunk: 'The child is entered in the civil register and issued a shelter card.', cyberpunk: 'A clan-ledger entry and a gene tag are made before the first feeding.',
			biopunk: 'A cutting of the family vine is grafted to a new sprout beside the cradle.', solarpunk: 'A tree is planted for the child in the commons orchard.',
			wasteland: 'The first cup of clean water for the child is drawn from the oldest cistern.', twilight: 'The child is named for one of the lost houses, in a pale hope of its return.'
		}
	},
	naming: {
		names: ['Naming Day', 'Name-Giving', 'Calling of the Name', 'Binding of the Name'],
		slots: [
			[['', 'On the day after the first moon the kin gather at the <house> door.'], ['pious', 'A keeper of {faith} reads the omens for the day and picks the hour.'], ['nomadic', 'The camp gathers around the child\'s tent as the sun clears the horizon.']],
			[['ancestral', 'The eldest names the child after a grandparent, so that name lives on.'], ['', 'Three names are offered by the family, and the child\'s grip on a token picks one.'], ['scholarly', 'A learned friend of the house explains the meaning of the name aloud.']],
			[['', 'The name is spoken once softly and three times loud, and the kin answer it back.'], ['martial', 'The name is shouted over the household <weapon> so the steel remembers it.'], ['seafaring', 'The name is called out over the water and the waves are asked to keep it.']],
			[['', 'The child is given <gift> as a first possession.'], ['mercantile', 'A small share in the family trade is written in the child\'s name.'], ['insular', 'The name is told only to the kin; strangers hear a house-name and nothing more.']],
			[['', 'All eat <staple> and drink <drink> to the new name\'s health.'], ['pious', 'A prayer to {deity} closes the day and the name is added to the temple book.'], ['', 'The elder drinks first, then the parents, then every guest toasts the name.']]
		],
		roles: ['the eldest of the house', 'the name-keeper', 'a chosen name-friend', 'a keeper of {faith}', 'the mother\'s brother'],
		gifts: ['<gift>', 'a name-cord', 'a spoon carved with the name', 'a sip of <drink>'],
		dress: ['The child wears a plain smock and the kin wear their house colours.', 'All wear a <head> for the speaking of the name.'],
		song: ['The kin sing the name back in a round, each voice a little late.', 'The name-song is played on <smusic>, one verse for each name in the line.', 'A short chant is repeated until the child laughs.'],
		genre: {
			fantasy: 'The name is whispered to the hearth fire so that no spirit takes it by mistake.', mythic: 'The name is spoken to the sky so that the gods may know it by its first sound.',
			steampunk: 'A name plate is engraved and the clerk enters it in the guild book.', dieselpunk: 'The union clerk types the name on the union card with the date.',
			atompunk: 'The name is entered on the shelter roll next to the family\'s block number.', cyberpunk: 'The name is hashed into the clan ledger and a handle is registered with the contract-house.',
			biopunk: 'The name is read out over the family culture; a sprig of the vine is tied to the child\'s wrist.', solarpunk: 'The name is added to the commons register and a hand-written card goes on the orchard gate.',
			wasteland: 'The name is scratched on the cistern wall, below those of the living kin.', twilight: 'The name is written beside those on the memorial wall, before it is lost too.'
		}
	},
	comingofage: {
		names: ['Crossing', 'Day of Standing Up', 'Taking of the Belt', 'Rite of the Threshold'],
		slots: [
			[['', 'The youth fasts a day and a night and speaks to no one.'], ['nomadic', 'The youth is sent out alone with a knife and a skin of water for two nights.'], ['scholarly', 'The youth sits an examination before the elders, and the first failure is forgiven.'], ['martial', 'The youth runs a long course in full gear while the troop looks on.']],
			[['', 'The elders question the youth on the kin\'s history, and the youth answers by memory.'], ['pious', 'A keeper of {faith} asks the youth to recite the creed and name the sins.'], ['mercantile', 'The youth makes a first trade alone, and the elders judge both profit and manners.']],
			[['', 'The youth receives a <head> or a belt that only grown people wear.'], ['martial', 'The youth is given a <weapon> of their own, and the family line is told over it.'], ['ancestral', 'The youth\'s hair is cut or bound in the way of a grown person of the house.']],
			[['', 'The youth swears to keep the customs of the people and to speak for the household\'s honour.'], ['pious', 'The youth swears before {deity} to follow the teachings.'], ['insular', 'The youth is shown the boundary stones and swears never to name the way in to a stranger.']],
			[['', 'A feast of <staple> and <drink> is held in the youth\'s honour; the youth serves the elders first.'], ['', 'The youth sits for the first time at the table of the grown and nobody corrects their manners that night.']]
		],
		roles: ['the elder who judges', 'the youth\'s sponsor', 'the cousin who carries the water', 'the weapon-master', 'the keeper of the rolls'],
		gifts: ['<gift>', 'a belt or sash', 'a first tool of the trade', 'a knife with the house mark'],
		dress: ['The youth changes at the end into grown dress: <sdress>.', 'The youth is bare-headed until the <head> is placed.'],
		song: ['A marching song is sung by the elders as the youth crosses the threshold.', 'The youth sings the lineage alone, with <smusic> answering at the end of each line.'],
		genre: {
			fantasy: 'The youth is tested at a standing stone and the stone is said to ring for the worthy.', mythic: 'The youth carries a stone to the god-hall and sets it on the heap of all who came before.',
			steampunk: 'The youth is apprenticed formally and signs the first line of the indenture.', dieselpunk: 'The youth gets a union card and a first shift on the line.',
			atompunk: 'The youth passes the civil-defence course and is given a warden\'s armband.', cyberpunk: 'The youth gets a first contract and a registered handle under the clan\'s name.',
			biopunk: 'The youth receives a first graft or a seed of their own, chosen by the family.', solarpunk: 'The youth takes a full turn at the commons labour and the commons votes their welcome.',
			wasteland: 'The youth is trusted with the well-key for one day and must account for every drop.', twilight: 'The youth is shown the old rooms that are no longer lit and told what stood there.'
		}
	},
	betrothal: {
		names: ['Promise', 'Binding of Hands', 'Exchange of Tokens', 'Asking'],
		slots: [
			[['', 'The families meet on neutral ground and each speaks for its own.'], ['mercantile', 'Go-betweens agree the terms in writing, and the families read them aloud.'], ['nomadic', 'Riders carry the offer between camps, and the answer returns with the same riders.']],
			[['ancestral', 'Each family recites its line back to the fifth generation, and any quarrel in it is named openly.'], ['', 'Gifts are weighed: <gift> from one side and a matching present from the other.'], ['martial', 'The two houses clasp forearms and promise not to raise the <weapon> against each other.']],
			[['', 'The couple exchange small tokens before witnesses, things meant to be kept for life.'], ['pious', 'A keeper of {faith} asks the couple if they come freely, and each answers once.'], ['insular', 'The couple meet once under watch and speak only a few words.']],
			[['', 'A cup of <drink> is shared and a day is set for the wedding.'], ['scholarly', 'A poem is read aloud, written by the family\'s best voice, naming the couple\'s virtues.']],
			[['', 'Neighbours are told, and the match cannot be broken without repaying every gift.'], ['', 'The promise is <mark>, so that no one can say later they did not hear it.']]
		],
		roles: ['the go-between', 'the two eldest kin', 'the keeper of the lineage roll', 'the couple\'s friends'],
		gifts: ['<gift>', 'a ring or cord', 'a bundle of cloth', 'a pair of cups'],
		dress: ['Both families wear their best, and the couple wear a matching sash or cord.', 'Guests come in <sdress>.'],
		song: ['A short promise-song is sung by both families, and each line is answered across the room.', '<smusic> plays while the tokens are exchanged.'],
		genre: {
			fantasy: 'The couple pledge before a herald and a wax seal is pressed on the token.', mythic: 'The couple pledge at the hearth of the god-hall and ask the gods to witness.',
			steampunk: 'A solicitor drafts the marriage articles and both sides sign in brass-nibbed pens.', dieselpunk: 'Both sides post the banns on the union board and the shop steward reads them out.',
			atompunk: 'The couple register at the civic hall and are given a shared ration book.', cyberpunk: 'A marriage contract is drawn up with clauses for property, children and exit.',
			biopunk: 'Cuttings from both families\' vines are twined together in a single pot.', solarpunk: 'The couple\'s commitment is announced at the commons assembly and posted on the notice wall.',
			wasteland: 'The families trade a measure of water each, drunk together from the same flask.', twilight: 'The couple promise one another in the hall of a house that no longer has a roof.'
		}
	},
	wedding: {
		names: ['Joining', 'Wedding Feast', 'Binding of Two Hearths', 'Day of Two Houses'],
		slots: [
			[['', 'One house escorts the couple to the other\'s door, and the door is barred until a toll is paid.'], ['nomadic', 'The groom\'s riders carry off a token of the bride\'s camp, and the camp pursues with mock anger.'], ['seafaring', 'The couple are rowed or ferried across water to the new home.']],
			[['', 'The couple stand before the elders and each speaks a vow in their own words.'], ['pious', 'A keeper of {faith} binds the couple\'s hands with a cord and says the words of the faith.'], ['martial', 'The couple swear on the household <weapon>, and the line is told to the witnesses.']],
			[['', 'The couple share a cup of <drink> and a piece of <staple>, one bite each.'], ['ancestral', 'The couple bow to <anc> so that the dead will know the new bond.']],
			[['', 'Guests bring <gift> and set it on the long table in the <hall>.'], ['mercantile', 'The dowry and the gifts are read aloud, and each is written in the ledger.']],
			[['', 'A feast of <sfood> runs from midday until the lamps are lit.'], ['insular', 'A small feast is held with kin only; the rest of the town sends food and leaves quietly.']],
			[['', 'The couple are escorted to their new home, and guests may not enter after the door is closed.'], ['', 'The next morning the couple are visited by the eldest and told the first lesson of married life.']]
		],
		roles: ['the elder who binds', 'the two witnesses', 'the cup-bearer', 'the one who holds the cord', 'the singer'],
		gifts: ['<gift>', '<gift2>', 'a household tool', 'a bolt of cloth'],
		dress: ['The couple wear matching sashes, and the bride\'s or groom\'s <head> is of the house colour.', 'All wear <sdress>, with the couple dressed richest.'],
		song: ['Wedding songs are played on <smusic>, and the guests answer each line.', 'The singer calls the names of both houses, and the guests answer with the old refrain.'],
		genre: {
			fantasy: 'A ring blessed at the hearth is exchanged, and the village hangs rowan above the door.', mythic: 'The couple leap a fire together, and the god-hall is lit through the night.',
			steampunk: 'The marriage is stamped in the parish ledger and a brass bell is rung from the guild tower.', dieselpunk: 'The couple are cheered by the union hall band, and the wedding supper is held in the canteen.',
			atompunk: 'The wedding is held in the civic hall, with a photo taken for the block album.', cyberpunk: 'The contract is signed by both parties and hashed to the ledger, with the clan as witness.',
			biopunk: 'The couple\'s vines are planted together, and the grow-hall is hung with fresh flowers.', solarpunk: 'The wedding takes place in the commons garden with every household bringing one dish.',
			wasteland: 'The couple share the first cup of water from a new cistern and bury a keepsake by the well.', twilight: 'The couple marry in the old hall by the light of the last candles in the house.'
		}
	},
	funeral: {
		names: ['Last Road', 'Farewell Vigil', 'The Carrying', 'Closing of the Door'],
		slots: [
			[['', 'The body is washed by close kin and wrapped in plain cloth.'], ['seafaring', 'The body is sewn into sailcloth with a stone at the feet.'], ['nomadic', 'The body is carried at dawn to a place outside the camp and laid facing the sun.'], ['pious', 'A keeper of {faith} washes the body and anoints it with oil.']],
			[['', 'The household keeps a vigil through the night, and no lamp is allowed to die.'], ['ancestral', 'The household names every ancestor aloud, ending with the dead and the child most like them.'], ['mercantile', 'The ledger is closed and the debts read out so that none are left to the heirs.']],
			[['', 'Mourners come in <sdress>, but wear white or ash on the face.'], ['martial', 'The <weapon> of the dead is laid across the body and the troop salutes.']],
			[['', 'The body is carried to the place of burial by those closest in blood.'], ['insular', 'Only kin walk the last road; the street stands at the doors and does not follow.']],
			[['', 'A share of <staple> and <drink> is poured out for the dead before the living eat.'], ['pious', 'The keepers read the last blessing, and the name is added to the book of the dead.'], ['', 'The dead\'s tools or favourite things are laid beside them.']],
			[['', 'The door of the house is kept open for three nights so that the dead may leave.'], ['', 'After the mourning month the household shares the dead\'s belongings, and the heir takes the name-bowl.']]
		],
		roles: ['the one who washes', 'the lamp-keeper', 'the eldest mourner', 'the singer of the lament', 'the heir who holds the bowl'],
		gifts: ['<gift>', 'a token placed in the hand', 'bread for the road', 'a copy of the name'],
		dress: ['Mourners wear white or undyed cloth, and no jewellery.', 'The kin wear plain dress with a sash of the house colour reversed.'],
		song: ['A lament is sung through the night, with <smusic> played softly.', 'The mourners sing the dead\'s favourite song and stop mid-line.', 'A farewell chant is sung by each person in turn.'],
		genre: {
			fantasy: 'A coin is placed under the tongue to pay the ferryman, and a candle is lit for each year of life.', mythic: 'A feast is laid in the <hall> for the dead, and the gods are asked to take them.',
			steampunk: 'A black-plumed hearse carries the coffin and the guild tolls a bell for each year.', dieselpunk: 'The union lowers its banner and the hall falls silent at the stroke of noon.',
			atompunk: 'The name is added to the town memorial, and the siren is sounded once at noon.', cyberpunk: 'The dead\'s accounts are closed, the backup is wiped and a short memorial is posted to the clan ledger.',
			biopunk: 'The body is composted at the base of a family tree, and the vine is allowed to climb it.', solarpunk: 'The body is returned to the commons garden and a tree is planted on the spot.',
			wasteland: 'The dead\'s last water is poured on the grave and the cistern is closed for a day.', twilight: 'The name is carved on the memorial wall with a dry chisel, and the wall is touched by all.'
		}
	},
	oath: {
		names: ['Swearing', 'Binding Word', 'Taking the Oath', 'Weight of the Word'],
		slots: [
			[['', 'The oath-taker names their house and their parents before anything else is said.'], ['mercantile', 'The terms are read aloud twice, once by each side, and every clause is agreed in turn.'], ['scholarly', 'The oath is written out in full and read by the one who will hold the swearer to it.']],
			[['martial', 'The swearer lays a hand on the <weapon> and states the oath in a clear voice.'], ['pious', 'The swearer places a hand on the sacred object of {faith} and calls on {deity} as witness.'], ['', 'The swearer holds a cup of <drink> and says the words over it.'], ['ancestral nomadic', 'The swearer touches <anc> and says the oath before the dead.']],
			[['', 'The swearer names the penalty for breaking the oath, in their own words.'], ['', 'Witnesses repeat the oath back, and each says: we heard it.']],
			[['', 'The swearer drinks from the cup and passes it on, so that the oath is carried by every mouth.'], ['', 'A mark is made on the swearer\'s hand or on the post, and the mark is kept.']],
			[['', 'The oath is <mark>.'], ['', 'A small gift is exchanged between those bound, and no one speaks of the oath again.']]
		],
		roles: ['the oath-taker', 'the witnesses', 'the one who holds the cup', 'the keeper of the oath-roll'],
		gifts: ['<gift>', 'a token kept by the other side', 'a cup of <drink>', 'a signed scrap'],
		dress: ['The swearer wears their best and is bareheaded or hooded according to the custom of the <hall>.', 'The witnesses wear the house colours and carry no steel.'],
		song: ['A short chant is sung by all witnesses at the end, in <smusic> or voice alone.', 'The oath is spoken without music; silence is the witness.'],
		genre: {
			fantasy: 'The oath is sealed with a drop of blood on the oath-post, which is said to remember.', mythic: 'The oath is sworn on the hearth of the god-hall so the gods hear it.',
			steampunk: 'The oath is sealed with a brass stamp and a signature on the guild ledger.', dieselpunk: 'The oath is sworn on the union charter, hand raised, in front of the whole hall.',
			atompunk: 'The oath is taken with a hand raised and the pledge card signed before a civil-defence warden.', cyberpunk: 'The oath is signed and hashed into the ledger, and the keys are split among the witnesses.',
			biopunk: 'The oath is sealed with a drop of blood on a graft that grows into the family vine.', solarpunk: 'The oath is entered in the commons ledger and read aloud at the next assembly.',
			wasteland: 'The oath is sworn over a cup of water that both parties drink, and the empty cup is kept.', twilight: 'The oath is sworn beside a faded banner, and the swearer promises to restore what was lost.'
		}
	},
	initiation: {
		names: ['Admission', 'Trial of Entry', 'Raising', 'Passing the Door'],
		slots: [
			[['', 'The candidate is blindfolded and led to the door of the <hall> by their sponsor.'], ['martial', 'The candidate marches through the night with a full pack, and must not complain once.'], ['scholarly', 'The candidate is given a text to read and told to say nothing until it is finished.']],
			[['', 'The candidate is asked three questions by three different elders, and each answer must be true.'], ['martial', 'The candidate fights a ceremonial bout and is judged on their conduct rather than the result.'], ['scholarly', 'The candidate defends a thesis before the assembled members, who may ask anything.']],
			[['', 'The candidate swears to keep the secrets of the order and to aid its members.'], ['pious', 'The candidate swears before {deity} to serve the order and the faith above their own kin.']],
			[['', 'The candidate receives the mark of the order, worn on the shoulder, the hand or the cloak.'], ['martial', 'The candidate is given a blade bearing the order\'s mark, which is never to be sold.']],
			[['', 'The members welcome the candidate with a cup of <drink>; the old name is set aside.']]
		],
		roles: ['the sponsor', 'the three questioners', 'the keeper of the secrets', 'the master of the order'],
		gifts: ['a mark of the order', 'a blade or pen with the order\'s mark', '<gift>'],
		dress: ['The candidate wears a plain shift and the members come in the order\'s full robes or armour.'],
		song: ['The members chant the order\'s founding verse, and the candidate repeats the last line.'],
		genre: {
			fantasy: 'The candidate\'s name is inscribed in the order\'s book with a quill dipped in the founder\'s ink.', mythic: 'The candidate\'s name is spoken to the gods from the roof of the <hall>.',
			steampunk: 'The candidate receives a numbered brass badge and a locker key in the guild hall.', dieselpunk: 'The candidate is given a union card and a numbered hard hat.',
			atompunk: 'The candidate is issued a badge and a code word for the shelter door.', cyberpunk: 'The candidate is issued a key-pair and told that the old ones are never to be shared.',
			biopunk: 'The candidate receives a graft of the order\'s own living badge.', solarpunk: 'The candidate is given a seat on the commons council\'s workgroup and a ceremonial trowel.',
			wasteland: 'The candidate is given a well-token and sworn to guard the order\'s water.', twilight: 'The candidate is shown the order\'s oldest relic, which is no longer understood by anyone.'
		}
	}
};

// ---------- festivals ----------

export interface FeastDef {
	/** [order 0..9, text, tags] */
	steps: [number, string, string][];
	offerings: string[];
	dress: string[];
	food: string[];
	song: string[];
	taboo: string[];
	custom: string[];
}

export const FEASTS: Record<FeastKind, FeastDef> = {
	spring: {
		steps: [
			[0, 'Before dawn the <house> row sweeps its doorsteps and throws the winter out.', ''], [0, 'Green boughs are cut at first light and hung over every door in {town}.', ''],
			[1, 'Children run through the lanes ringing bells to wake the sleeping earth.', ''], [1, 'A keeper of {faith} reads the first blessing of the year at the shrine.', 'pious'],
			[2, 'The boats are launched for the first time and each is given a drop of <drink>.', 'seafaring'], [2, 'The elders bless the seed grain with a pour of <drink> at the field\'s edge.', ''],
			[3, 'A fire is lit of last year\'s brush, and the winter\'s quarrels are burned with it.', ''], [3, 'The herds are driven through smoke to ward off sickness.', 'nomadic'],
			[4, 'Neighbours exchange <gift> and promises for the season.', ''], [4, 'The first caravan of the year is greeted at the gate and the first goods are sold at fair price.', 'mercantile'],
			[5, 'The first greens are eaten standing, and no one sits until the bowl is empty.', ''], [6, 'A feast of <staple> is eaten by the fire until the stars rise.', '']
		],
		offerings: ['seed grain in a bowl', 'a pour of <drink> on the doorstep', 'a green bough', '<gift> laid at the field\'s edge', 'the first eggs and early greens'],
		dress: ['green and white, with flowers in the <head>', 'winter clothes turned inside out and burned at dusk', 'new clothes, however small: a ribbon or a clean apron'],
		food: ['young greens, eggs and fresh <staple>', 'sweet cakes shaped like buds', '<sfood>, with the first cheese or curds of the year'],
		song: ['The spring-call is sung in a round, each house answering the next, to <smusic>.', 'Children sing verses about the thaw from the rooftops.', 'The old bell-song is played from the hill at dawn.'],
		taboo: ['No knife is put to living wood today.', 'No one speaks of the dead until sunset.', 'Anger spoken today follows you through the year.'],
		custom: ['A race to the first well or stream, where the winner draws the year\'s first water.', 'Neighbours swap doorsteps: each household sweeps another\'s.', 'Mock fights with green boughs; the loser is crowned for the day.', 'Seeds are traded freely between households, and no price may be named.']
	},
	harvest: {
		steps: [
			[0, 'The last sheaf is cut by the eldest, and everyone stands back while it falls.', ''], [0, 'The granaries of {realm} are opened at {town} and counted before the town.', ''],
			[1, 'The first loaf from the new grain is broken and shared, a crumb to each household.', ''], [1, 'A keeper of {faith} blesses the sheaves and the stores before they are carried in.', 'pious'],
			[2, 'The harvest cart is led through {town} by the best field-hand, and the street throws grain.', ''], [2, 'The merchants buy the first crop at a fixed price so that no field is left cheap.', 'mercantile'],
			[3, 'A share is set aside for the dead and for the poor, before any is sold.', 'ancestral'], [3, 'The herds are brought down from the heights and counted before the camp.', 'nomadic'],
			[4, 'The <hall> is hung with sheaves and the long table is laid out.', ''], [5, 'The elders pour <drink> on the threshing floor and thank the soil aloud.', ''],
			[6, 'Everyone eats until dusk, and no one may leave a plate unfinished.', ''], [7, 'Songs are sung until the lamps burn down.', '']
		],
		offerings: ['the last sheaf', 'a measure of new <staple>', 'the first cup of <drink> poured on the ground', '<gift>', 'a loaf with the harvest mark pressed on it'],
		dress: ['straw hats and aprons dyed with harvest colours', 'best clothes with a sheaf-sprig pinned to the <head>', '<sdress>, with the day\'s dust left on proudly'],
		food: ['new <staple> with roast fowl and the sweetest preserve of the year', 'a great loaf shaped like a sheaf', '<sfood>, in more quantity than anyone can finish'],
		song: ['The reapers\' round is sung with <smusic>, each verse a field.', 'A work-song is sung in time by the whole table.', 'The thanksgiving is sung once, quietly, before anyone eats.'],
		taboo: ['No one begins a quarrel on the threshing floor.', 'No scrap of food is thrown away today.', 'No debt may be called in before the third day.'],
		custom: ['The reapers race to the last sheaf, and the winner sits at the head of the table.', 'The youngest binds the first sheaf and the oldest binds the last.', 'The two fields with the best crop swap a loaf, and the loser pays the winner a cup.', 'A bowl of grain is left outside for any traveller who passes.']
	},
	dead: {
		steps: [
			[0, 'The households sweep the family graves at first light and pull the weeds.', ''], [0, 'A <light> is set at every threshold in {town} at dusk.', ''],
			[1, 'The names of the year\'s dead are read at the gate by the eldest.', ''], [1, 'A keeper of {faith} walks the rows of graves and blesses each in turn.', 'pious'],
			[2, 'Food is set out for the dead, a plate for each name, and left untouched.', ''], [2, 'A cup of <drink> is poured out at each grave and the empty cup left standing.', ''],
			[3, 'Families gather at <anc> to tell stories of those who have gone.', 'ancestral'], [3, 'The warriors march past the memorial and name their fallen aloud.', 'martial'],
			[4, 'The doors are left open and a chair is kept for the dead at every table.', ''], [4, 'The shops close and every ledger is shut for the night.', 'mercantile'],
			[5, 'The lamps are carried in procession to the water or the hill and set down.', ''], [6, 'The living eat quietly, speak low and tell each other kind lies about the dead.', '']
		],
		offerings: ['a lit <light> at each threshold', 'a plate of the dead\'s favourite food', 'a cup of <drink> poured out', '<gift> left at the grave', 'a folded letter placed under a stone'],
		dress: ['white or undyed cloth, with ash on the brow', 'black or the deepest dye of the house, nothing bright', 'the old clothes of the dead, worn once more by their kin'],
		food: ['the dead\'s favourite dish, cooked by their kin', 'plain <staple> and salted fish, eaten in silence', '<sfood>, set out first for the dead'],
		song: ['A slow lament is played on <smusic> through the night.', 'Mourners sing the names of the dead one by one.', 'A single bell is rung once for every year gone by.'],
		taboo: ['No one speaks loudly or laughs in the burial ground.', 'No one is allowed to sweep the house after dark; the dead are visiting.', 'No new debt is made, and no old one called.'],
		custom: ['Children place a stone on each grave and say the dead\'s name to the wind.', 'Neighbours bring food to the families who have no one left to cook.', 'Letters to the dead are written and burned at the family hearth.', 'The oldest tells the dead the year\'s news at the grave, in full.']
	},
	midwinter: {
		steps: [
			[0, 'The longest night begins with every fire in {town} put out and relit from a single flame.', ''], [0, 'The <hall> is shut at dusk, and the household sits in the dark for as long as they can bear.', ''],
			[1, 'A great fire is lit at the heart of {town}, and every household brings a log.', ''], [1, 'A keeper of {faith} stands the long watch and calls the hours of the night.', 'pious'],
			[2, 'Stories are told, one for each hour, and the best teller is carried home.', ''], [3, 'Gifts of <gift> are exchanged, and the giver is never named.', ''],
			[4, 'The elders trade old grudges for new ones, and the grudges are written and burned.', 'ancestral'], [4, 'The merchants forgive one debt each, in public, with a handshake.', 'mercantile'],
			[5, 'Everyone eats the heaviest meal of the year and no one is allowed to go hungry.', ''], [6, 'At the turn of the night the first lamp is lit and the whole town cheers.', ''], [7, 'The household sleeps late, and no work is done until noon.', '']
		],
		offerings: ['a log for the great fire', '<gift> left at a neighbour\'s door', 'a lit <light> in the window', 'a portion of the best meat for the poor', 'a cup of <drink> poured onto the fire'],
		dress: ['the warmest layers, with a bright sash or ribbon for the sun to find', 'masks and furs, so that the winter spirits will pass by', 'old clothes worn inside out to confuse the cold'],
		food: ['a heavy stew with <staple> and the last of the preserves', 'spiced cakes and mulled <drink>', '<sfood>, cooked slowly over the great fire'],
		song: ['The long-night songs are sung until dawn, accompanied by <smusic>.', 'A round is begun at dusk and passed from house to house.', 'The dawn song is sung at the first grey, by everyone left awake.'],
		taboo: ['No quarrel may be begun, and any begun must be ended by dawn.', 'No one sleeps before the midnight bell.', 'No door is barred, and no stranger is turned away.'],
		custom: ['A guest is chosen by lot and seated at the head of every table.', 'The youngest relights the hearth from the great fire and carries the flame home.', 'Households trade gifts and pretend not to know who gave what.', 'A mock lord of misrule is crowned and obeyed until dawn.']
	},
	sea: {
		steps: [
			[0, 'The boats are blessed at dawn, each with a splash of <drink> on the bow.', ''], [0, 'Nets and sails are mended in a long row along the quay of {town}.', ''],
			[1, 'A keeper of {faith} speaks the names of those lost at sea and casts a wreath on the water.', 'pious'], [1, 'The harbour master reads the roll of the ships, aloud and in full.', 'mercantile'],
			[2, 'The boats race to the headland and back, and the whole of {town} lines the shore.', ''], [3, 'The first catch is shared on the quay, a piece for every household.', ''],
			[4, 'Sailors are toasted ashore, and the best tale of the year wins a free round.', 'seafaring'], [4, 'The warriors of {realm} parade their ships and name their battles.', 'martial'],
			[5, 'A small raft of flowers is set on the tide with a wish for the year.', ''], [6, 'Lanterns are hung in the rigging and the town eats on the water\'s edge.', '']
		],
		offerings: ['a splash of <drink> on the bow', 'a wreath cast on the water', 'the first fish of the season, returned to the sea', '<gift> hung from the mast', 'a coin pressed into the mast-foot'],
		dress: ['blue and white, with rope or shell ornaments', 'oilskins and bright scarves, so that the sea can see who they are', '<sdress>, with the boat\'s colour pinned on'],
		food: ['grilled fish with <staple> and salted greens', 'a seafood stew shared from one great pot', '<sfood>, with the day\'s freshest catch'],
		song: ['Work-songs of the oars and nets are sung on <smusic>.', 'A harbour chant is called by the oldest sailor and answered by the crowd.', 'A lament for the drowned is sung once at dusk.'],
		taboo: ['No one whistles on the quay.', 'No boat leaves the shore until the last blessing is said.', 'No one speaks of drownings until the wreath is cast.'],
		custom: ['A sailors\' race, rowed with whatever oars the crew can find.', 'A boat-launch contest: the crew whose hull slides furthest wins the quay for the night.', 'Knot-tying duels between old sailors and children.', 'A fisherman is chosen by lot to tell the year\'s best lie.']
	},
	war: {
		steps: [
			[0, 'The banners are carried out of the <hall> and set up in the great square of {town}.', ''], [0, 'The weapons of the town are cleaned, oiled and laid out on cloth for all to see.', 'martial'],
			[1, 'The names of the old battles are read, with the names of the dead who won them.', ''], [1, 'A keeper of {faith} blesses the weapons and the warriors.', 'pious'],
			[2, 'The warriors of {realm} march past in full dress, and the crowd throws grain.', ''], [3, 'The old veterans tell the young how it really was, and the young are told to listen.', ''],
			[4, 'Contests of strength and skill are held in the square: wrestling, archery and the long run.', ''], [4, 'The merchants sponsor the prizes and quietly lay bets.', 'mercantile'],
			[5, 'The winners are carried on shoulders and given <gift>.', ''], [6, 'A feast is held for the veterans, and the youngest soldiers serve them.', ''], [7, 'An oath of peace is sworn by all the old enemies who are present, with a cup of <drink>.', '']
		],
		offerings: ['a weapon laid on the altar or the <hall> table', 'a cup of <drink> poured on the ground for the fallen', '<gift>', 'a bundle of arrows', 'the first cut of the roast, set at the empty seat'],
		dress: ['full battle dress, polished and without a speck of rust', 'the colours of the household or regiment, worn proudly', '<sdress>, with the old scars bared'],
		food: ['roast meat with <staple>, plain and hearty', 'the soldiers\' stew, eaten from a shared pot', '<sfood>, served at the long tables of the <hall>'],
		song: ['The marching songs are played on <smusic> and roared by all.', 'Each regiment sings its own battle hymn.', 'The names of the fallen are called, and all answer: remembered.'],
		taboo: ['No blade is drawn in anger, on pain of exile.', 'No coward is named, and no old grudge spoken of aloud.', 'No one drinks before the fallen have been toasted.'],
		custom: ['Wrestling bouts between the households, with a point for each fall and no bad blood after.', 'A mock siege of the square, with the youngest as defenders.', 'The best archer shoots a single arrow at a dawn target and the town cheers a hit.', 'Old enemies share a cup and swear to fight no more this year.']
	},
	learning: {
		steps: [
			[0, 'The students gather in the great hall of {town} and the masters take their seats.', ''], [0, 'The oldest book of the town is carried out and opened to a page chosen by lot.', ''],
			[1, 'A keeper of {faith} reads a passage and offers a blessing for the year\'s study.', 'pious'], [1, 'Poets and singers present their finest work, each in turn, before the assembly.', ''],
			[2, 'The masters pose three riddles, and the students must answer without books.', ''], [3, 'The best verse of the year is chosen by popular vote and carried through the streets.', ''],
			[4, 'The merchants of {realm} hold a book fair, and the best printer or copyist is paid a prize.', 'mercantile'], [4, 'The scholars debate a question that has no answer, and the debate is the prize.', 'scholarly'],
			[5, 'The winners are crowned with a wreath or hat and give a short speech.', ''], [6, 'A meal of <staple> and <drink> is eaten with the masters, and the students pay with questions.', '']
		],
		offerings: ['a new book placed on the shelf', 'a fresh pen or brush', 'a cup of <drink> poured over the ink-stone', '<gift>', 'a verse written and left at the door of a master'],
		dress: ['the formal robes of the school, ironed and ink-stained at the cuff', 'plain dark dress with a coloured band for each degree', '<sdress>, with the school badge worn on the left'],
		food: ['a plain scholars\' meal of <staple> and cheap wine', 'honey cakes and <drink>, shared among students and masters', '<sfood>, served in small portions to keep the minds sharp'],
		song: ['The school song is sung by all, with <smusic> played softly.', 'Competitors sing their verses and the crowd answers with a chorus.', 'A single clear voice reads out the year\'s best line.'],
		taboo: ['No one speaks over a master, and no one interrupts a reader.', 'No book is folded, torn or placed on the ground.', 'No answer may be given in anger.'],
		custom: ['A riddle contest between the schools, with a free meal for the winners.', 'A poet is chosen by lot to improvise on any subject the crowd calls out.', 'Old students return and are examined by the new ones.', 'A silent hour is observed at midday, when no one may speak and everyone may read.']
	},
	sun: {
		steps: [
			[0, 'At dawn the whole of {town} climbs the hill to greet the high sun.', ''], [0, 'Bonfires are laid on the hills of {realm} at dusk the night before.', ''],
			[1, 'A keeper of {faith} calls the sun by name and the crowd answers in one voice.', 'pious'], [1, 'The herds are driven round the great fire, and each animal is counted.', 'nomadic'],
			[2, 'Wreaths of flowers and herbs are cast on the fire and the smoke is breathed deeply.', ''], [3, 'Couples leap the fire together, hand in hand, and the crowd cheers.', ''],
			[4, 'The people dance until the sun is high, and the music does not stop.', ''], [5, 'A feast is spread on the hillside, and each household brings a dish.', ''],
			[6, 'The elders tell of the year\'s harvest and what the sun foretells.', 'ancestral'], [7, 'At dusk the fires are let burn down, and the embers are carried home to the hearths.', '']
		],
		offerings: ['a wreath of flowers and herbs cast on the fire', 'a pour of <drink> at dawn', '<gift>', 'a bright cloth tied to a tree', 'a loaf baked in the shape of the sun'],
		dress: ['white, yellow and gold, with sun-wreaths on the <head>', 'light clothes dyed in bright colours', '<sdress>, with a sun-sign pinned to the breast'],
		food: ['grilled meat with <staple> and fresh fruit on the hillside', 'sun-cakes baked round and golden', '<sfood>, eaten cold on the grass'],
		song: ['The sun-song is played on <smusic> from dawn to dusk.', 'The crowd sings in rounds that rise with the sun.', 'A single high note is held as the sun clears the horizon.'],
		taboo: ['No one wears black or dark colours today.', 'No one goes indoors from dawn until dusk.', 'No one lights a fire except from the great one.'],
		custom: ['Couples leap the fire together and make a wish for the year.', 'A wheel of fire is rolled down the hill, and each household reads its omen.', 'Young people stay up all night to see the first light on the hills.', 'The oldest of the town is carried up the hill so that the sun may greet them first.']
	}
};

export const FEAST_GENRE_CUSTOM: Record<string, string> = {
	fantasy: 'A lantern parade of fire-sprites and masked guests winds through the streets, and the best costume wins a cask.',
	mythic: 'The best singer is asked to name a god, and the whole crowd answers the call.',
	steampunk: 'The guilds parade their finest engines through the streets, with brass bands and steam whistles.',
	dieselpunk: 'The union halls hold a rally with a brass band, a long speech and a free supper.',
	atompunk: 'The block holds a drill and a picnic, and the siren is sounded once with the town cheering.',
	cyberpunk: 'The neon streets are packed with a night-market, and every stall runs a free hour of data.',
	biopunk: 'The grow-halls display their finest living works, and the town votes for the most beautiful graft.',
	solarpunk: 'The commons hold a skill-share and repair fair, and everything is mended for free.',
	wasteland: 'A water-sharing: every cistern is opened for the day and all are served in turn.',
	twilight: 'The old houses open their sealed rooms for the day and invite the public to look.'
};

// ---------- law ----------

export const JUDGE_BY_IDEOLOGY: Record<string, string[]> = {
	monarchy: ['the ruler\'s magistrate', 'the crown\'s justiciar', 'the ruler\'s reeve and two assessors'],
	republic: ['a jury of twelve citizens', 'the citizens\' assize under a sworn magistrate', 'an elected bench of three judges'],
	theocracy: ['the keepers of {faith}', 'the temple court under the high keeper', 'a council of priests with a lay assessor'],
	oligarchy: ['the bench of the great houses', 'the merchant lords\' court', 'a panel of the three richest guilds'],
	autocracy: ['the governor and his sergeants', 'the ruler\'s own word', 'a military tribunal under the local commander'],
	communal: ['the open moot of all adults', 'the council of elders', 'the commons assembly under a rotating chair'],
	technocracy: ['an arbitration board of licensed examiners', 'the registry\'s panel of experts', 'a panel of three certified arbiters']
};
export const JUDGE_BY_TRAIT: Record<string, string[]> = {
	nomadic: ['the clan moot around the fire', 'the chief and the circle of elders'],
	ancestral: ['the council of elders of the house', 'the eldest of each of the families involved'],
	mercantile: ['the guild bench', 'a merchant arbiter chosen by both parties'],
	pious: ['the keepers of {faith}', 'the shrine\'s council of judges'],
	martial: ['the war leader and the captains', 'the lord of the <hall> and his sworn men'],
	scholarly: ['a board of masters from the school', 'the senior reader and two scribes'],
	seafaring: ['the harbour-court of captains', 'the ship\'s master or, ashore, the quay council'],
	insular: ['the headman and the oldest households', 'the village council meeting behind closed doors']
};
export const JUDGE_BY_GENRE: Record<string, string[]> = {
	steampunk: ['the guild bench at the hall', 'a magistrate with a clerk and a brass bell'],
	dieselpunk: ['the union tribunal', 'a court of the works committee'],
	atompunk: ['the civil-defence tribunal', 'a warden-judge and two block captains'],
	cyberpunk: ['a licensed arbitration panel under a corporate charter', 'a privately retained arbiter agreed by both parties'],
	biopunk: ['the grow-hall council of keepers', 'a panel of three senior gardeners'],
	solarpunk: ['the commons assembly with a mediator', 'a restorative circle chosen by lot'],
	wasteland: ['the water-court at the main cistern', 'the well-keepers and the oldest survivors'],
	twilight: ['the last surviving magistrate of the old order', 'the council of the old houses']
};

export const ORDEALS: [string, string][] = [
	['trial by combat in the yard, with the accuser or a champion', 'martial'],
	['hot iron carried three paces under the keepers\' eyes', 'pious'],
	['twelve kin swear the accused clean, and the twelve are held to their word', 'ancestral'],
	['a public examination before the masters, answered without notes', 'scholarly'],
	['the accused is tied to a line and rowed out, and judged by the water', 'seafaring'],
	['the accused walks between two fires and swears over the horse', 'nomadic'],
	['a sworn fast in the temple, and the god is trusted to show the truth', 'pious ancestral'],
	['a day without water beside the open cistern', 'nomadic seafaring'],
	['a public audit of the accused\'s ledgers, open to all', 'mercantile']
];
export const ORDEAL_GENRE: Record<string, string> = {
	steampunk: 'the pressure-gauge test: the accused stands before the guild and swears with a hand on the boiler',
	cyberpunk: 'an open forensic audit of the accused\'s accounts and logs',
	wasteland: 'a day without water beside the open cistern',
	atompunk: 'a lie-detector hearing before the warden and two neighbours',
	biopunk: 'a vine-test: the accused plants a cutting and the family judges the growth',
	solarpunk: 'a long public circle where the accused answers every question without hurry',
	twilight: 'an oath on the broken seal of the old court',
	dieselpunk: 'an open hearing at the union hall with the crowd as jury'
};

type PW = Partial<Record<Punishment, number>>;
export const CRIME_BASE: Record<LawEntry['crime'], PW> = {
	theft: { fine: 4, lash: 3, scorn: 1, exile: 1, mutilation: 1, hang: 0.4, enslave: 0.5 },
	murder: { hang: 4, exile: 2, weregild: 1, duel: 0.5, mutilation: 0.5, ordeal: 0.5 },
	adultery: { fine: 3, scorn: 3, exile: 1, lash: 2, none: 0.6, mutilation: 0.3 },
	blasphemy: { lash: 3, exile: 2, ordeal: 2, fine: 2, scorn: 2, hang: 0.8 },
	debt: { fine: 4, enslave: 1, scorn: 2, exile: 1, lash: 0.4 },
	trespass: { fine: 4, scorn: 2, lash: 1, duel: 0.5, exile: 0.4 },
	assault: { fine: 4, lash: 2, duel: 1, weregild: 0.5, exile: 0.8, scorn: 1 },
	treason: { hang: 4, exile: 2, mutilation: 1, enslave: 0.3, ordeal: 0.4 },
	forgery: { fine: 3, mutilation: 2, lash: 2, exile: 2, hang: 0.5 },
	smuggling: { fine: 4, lash: 1, exile: 1, scorn: 0.6, hang: 0.2 }
};

export const CRIME_CLAUSE: Record<LawEntry['crime'], string[]> = {
	theft: ['Two witnesses must swear to the taking.', 'The stolen goods are returned before anything else is done.', 'A thief caught with the goods needs no further proof.', 'The value of the goods decides how hard it falls.'],
	murder: ['The killing must be proved by a body and a witness.', 'The dead\'s kin are heard before any other voice.', 'Whether it was fair or foul decides the weight.', 'A killing in defence is told to the <hall> within a day.'],
	adultery: ['The wronged spouse brings the charge, and no one else.', 'Both parties are heard in private before the judge.', 'The kin on both sides are called to settle it first.', 'The charge needs a witness and a sworn word.'],
	blasphemy: ['The keepers say whether a word is a sin, and the court only chooses the cost.', 'Only a deliberate insult counts; a slip of the tongue is forgiven once.', 'The offence is heard in public, so all may learn from it.', 'A person who recants within a day is let off lightly.'],
	debt: ['The creditor must show the tally or the mark.', 'The debtor is given a season to pay before the court acts.', 'Kin may stand surety for the debtor.', 'Debts to the dead and to the temple come before all others.'],
	trespass: ['The owner must show the boundary stones.', 'A first offence is only a warning at the gate.', 'A trespass at night is judged worse than one by day.', 'Hunger is accepted as a plea, once.'],
	assault: ['The wound is shown to the court and its worth is set.', 'The first blow decides who is at fault.', 'Both sides may bring friends to speak.', 'A fight in a <hall> or temple is judged twice as hard.'],
	treason: ['The ruler or the council must name the charge in open court.', 'No one speaks for the accused until the sentence is heard.', 'The accused is held until the full court can meet.', 'Two sworn witnesses of the plot are required.'],
	forgery: ['A seal, a mark or a coin is shown to the court and judged false by experts.', 'The forger\'s tools are seized and broken before the town.', 'The forged item is nailed to the <hall> door.', 'The more official the mark, the harder the sentence.'],
	smuggling: ['The cargo is seized at the gate and the amount judged.', 'A first offence is a fine; a second is a ban on trade.', 'Informers share a quarter of the seized goods.', 'The ship or cart is held until the fine is paid.']
};

export const PUNISH_CLAUSE: Record<Punishment, string[]> = {
	none: ['No penalty is set; the shame is the punishment.', 'The court only warns, and the neighbours do the rest.'],
	fine: ['The fine is set at three times the loss.', 'A fine is paid to the injured party and a tenth to the court.', 'The fine is counted in <coin>.'],
	scorn: ['The offender is publicly named and shunned for a season.', 'The offender must stand at the gate while all pass by and say nothing.', 'No one may trade with the offender for a month.'],
	exile: ['The offender is banished beyond the boundary stones for a term of years.', 'Banishment is for life, and the name is removed from the roll.', 'The offender is escorted to the border with one day\'s food.'],
	lash: ['The lash is given in public, one stroke for each part of the loss.', 'A set number of strokes are given before the crowd.', 'The offender is lashed at the <hall> door.'],
	mutilation: ['A hand, ear or nose is marked or taken as a lasting sign.', 'The offender is branded and cannot hold office again.'],
	hang: ['The offender is hanged at the crossroads and left for three days.', 'The sentence is hanging, carried out at dawn.', 'The offender is put to death in the manner of the <hall>.'],
	weregild: ['Blood-money is paid to the kin, set by rank of the dead.', 'The offender\'s kin pay the weregild, and the whole line is bound to peace.', 'The kin of the dead may take the blood-money or the blood.'],
	ordeal: ['The accused must undergo the ordeal, and the outcome is accepted as the judgement.', 'The accused is put to the ordeal, and the court abides by the sign.'],
	enslave: ['The offender is bound to the creditor or the court for a term of years.', 'The offender and kin are bound into service until the debt is paid.'],
	duel: ['The matter is settled by a duel with the offended chosen to name the ground.', 'The two parties settle it with steel in the yard, with the whole street watching.']
};
