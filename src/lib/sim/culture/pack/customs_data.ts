/**
 * Phrase banks for the customs pack: sphere nouns, genre surface, taboos, etiquette, hospitality, ideals.
 * Own tokens look like <drink> and are filled by customs.ts; schema placeholders like {faith} stay for the engine.
 * Tag strings are space separated trait names (martial pious ...) or genre names.
 */
import type { ActId, Etiquette, Punishment, Taboo } from '../../../adventure/culturepack';

export interface SphereFlav {
	drink: string;
	staple: string;
	gesture: string;
	gifts: [string, string, string];
	head: string;
	elder: string;
	seat: string;
	anc: string;
}

const S = (drink: string, staple: string, gesture: string, gifts: [string, string, string], head: string, elder: string, seat: string, anc: string): SphereFlav => ({ drink, staple, gesture, gifts, head, elder, seat, anc });

export const SPHERE_FLAV: Record<string, SphereFlav> = {
	sinic: S('tea', 'rice', 'a two-handed bow', ['a box of tea', 'red paper packets', 'a jade token'], 'cap', 'venerable one', 'the low table', 'the ancestor tablets'),
	japonic: S('tea', 'rice', 'a deep bow', ['a wrapped sweet', 'a folded paper crane', 'a flask of rice wine'], 'straw hat', 'honoured elder', 'the floor cushion', 'the household shrine'),
	indic: S('milk tea', 'flatbread', 'palms pressed together', ['a garland of marigolds', 'sweets in a leaf', 'a length of cotton'], 'turban', 'respected elder', 'the woven mat', 'the lamp shrine'),
	sea: S('coconut water', 'rice', 'palms raised to the chin', ['fruit on a banana leaf', 'a woven mat', 'a batik cloth'], 'headcloth', 'honoured elder', 'the floor mat', 'the spirit house'),
	steppe: S('kumis', 'curds', 'a hand on the heart', ['a bridle', 'a bolt of felt', 'a skin of kumis'], 'felt cap', 'grey-beard', 'the felt rug', 'the cairn-shrine'),
	persian: S('sweet tea', 'saffron rice', 'a hand on the chest and a nod', ['a dish of sweets', 'a bunch of pomegranates', 'a book of verses'], 'turban', 'elder of the house', 'the carpet', 'the family tomb garden'),
	arabic: S('cardamom coffee', 'dates', 'a hand to the heart', ['a dish of dates', 'a flask of rosewater', 'a carved box'], 'headcloth', 'elder of the tent', 'the cushioned divan', 'the family graves'),
	mande: S('millet beer', 'millet porridge', 'a hand to the chest', ['kola nuts', 'a length of dyed cloth', 'a gourd of honey'], 'embroidered cap', 'honoured elder', 'the shaded bench', 'the ancestor altar'),
	yoruba: S('palm wine', 'yam', 'a deep bow', ['kola nuts', 'a length of woven cloth', 'a measure of palm oil'], 'folded cap', 'elder', 'the carved stool', 'the ancestor shrine'),
	bantu: S('sorghum beer', 'maize meal', 'clapped hands', ['a basket of fruit', 'a string of beads', 'a bundle of tobacco'], 'beaded band', 'elder', 'the low stool', 'the spirit tree'),
	ethiopic: S('honey wine', 'spiced flatbread', 'three kisses on the cheeks', ['a bundle of incense', 'a woven basket', 'a silver amulet'], 'white shawl', 'holy elder', 'the low stool', 'the memorial stones'),
	nahua: S('chocolate drink', 'maize flatbread', 'a touch to the earth, then the lips', ['cacao beans', 'a bundle of feathers', 'a jade bead'], 'feathered band', 'elder of the ward', 'the reed mat', 'the household shrine'),
	maya: S('cacao', 'maize cakes', 'a hand on the shoulder', ['a bundle of copal incense', 'a jade bead', 'a painted bowl'], 'plumed band', 'day-keeper', 'the carved bench', 'the family tomb'),
	andean: S('maize beer', 'boiled potatoes', 'a first drop poured to the earth', ['coca leaves', 'a woven strip', 'a pair of silver pins'], 'wool cap', 'elder of the commune', 'the woven blanket', 'the mummy-bundles'),
	turtle: S('herb tea', 'corn mush', 'a handclasp and a nod', ['tobacco', 'a string of shell beads', 'a pouch of seed corn'], 'feathered cap', 'clan mother', 'the bark mat', 'the clan fire'),
	inuit: S('hot broth', 'dried fish', 'a nod and an open palm', ['a sealskin pouch', 'a carved bone charm', 'a strip of dried meat'], 'hood', 'old one', 'the sleeping bench', 'the name-souls'),
	polynesian: S('kava', 'taro', 'a flower garland and a nod', ['a garland of flowers', 'a woven mat', 'a length of bark cloth'], 'flower crown', 'elder', 'the woven mat', 'the family platform'),
	norse: S('ale', 'rye bread', 'a handclasp at the forearm', ['a silver arm-ring', 'a drinking horn', 'a wool cloak'], 'fur cap', 'hall-elder', 'the high bench', 'the grave mounds'),
	celtic: S('mead', 'oatcakes', 'a hand on the heart', ['a cask of mead', 'a bronze brooch', 'a sprig of rowan'], 'wool hood', 'elder of the clan', 'the hearth bench', 'the standing stones'),
	latin: S('wine', 'bread', 'a raised right hand', ['a jug of oil', 'a bundle of figs', 'a signet ring'], 'cloak hood', 'senior', 'the dining couch', 'the household altar'),
	slavic: S('kvass', 'black bread', 'a bow and a kiss on both cheeks', ['a loaf with salt', 'a jar of honey', 'an embroidered towel'], 'headscarf', 'village elder', 'the bench by the stove', 'the corner shrine'),
	eldritch: S('warm brine', 'pale fungus', 'a slow tilt of the head', ['a shard of humming stone', 'a bone bead', 'a sealed jar of dark water'], 'veil', 'one who has counted', 'the cold stone ledge', 'the sleepers')
};
export const FALLBACK_FLAV: SphereFlav = S('ale', 'bread', 'a nod', ['a loaf', 'a knotted cord', 'a small flask'], 'cap', 'elder', 'the bench', 'the family graves');

export interface GenreFlav {
	hall: string;
	weapon: string;
	oath: string;
	mark: string;
	light: string;
	coin: string;
	house: string;
}
export const GENRE_FLAV: Record<string, GenreFlav> = {
	fantasy: { hall: 'feast hall', weapon: 'sword', oath: 'sacred oath', mark: 'carved on the oath-post', light: 'rushlight', coin: 'silver', house: 'house' },
	mythic: { hall: 'god-hall', weapon: 'spear', oath: 'oath sworn on the gods', mark: 'cut into the standing stone', light: 'torch', coin: 'bronze', house: 'hearth' },
	steampunk: { hall: 'guild hall', weapon: 'pistol', oath: 'brass oath', mark: 'stamped in the guild ledger', light: 'gas lamp', coin: 'sovereigns', house: 'house' },
	dieselpunk: { hall: 'union hall', weapon: 'sidearm', oath: 'union pledge', mark: 'typed into the union roll', light: 'carbide lamp', coin: 'scrip', house: 'tenement' },
	atompunk: { hall: 'civic hall', weapon: 'sidearm', oath: 'pledge', mark: 'filed with the civil-defence office', light: 'strip light', coin: 'ration tokens', house: 'block flat' },
	cyberpunk: { hall: 'commons deck', weapon: 'sidearm', oath: 'signed contract', mark: 'hashed into the clan ledger', light: 'neon strip', coin: 'credit chits', house: 'unit' },
	biopunk: { hall: 'grow hall', weapon: 'spore lance', oath: 'blood-bond', mark: 'grafted onto the family vine', light: 'glow-moss', coin: 'seed tokens', house: 'grow-house' },
	solarpunk: { hall: 'commons house', weapon: 'blade', oath: 'commons oath', mark: 'entered in the commons ledger', light: 'solar lantern', coin: 'labour hours', house: 'commons house' },
	wasteland: { hall: 'cistern hall', weapon: 'pipe-gun', oath: 'water oath', mark: 'scratched on the cistern wall', light: 'oil lamp', coin: 'water tokens', house: 'shelter' },
	twilight: { hall: 'old hall', weapon: 'blade', oath: 'old vow', mark: 'inscribed beside the faded names', light: 'last candle', coin: 'tarnished silver', house: 'old house' }
};

export const COLOR_RULES: [string, string][] = [
	['Yellow', 'the ruling house'], ['White', 'the bereaved'], ['Black', 'priests and executioners'], ['Purple', 'the ruler and the ruler\'s heirs'],
	['Red', 'oath-sworn warriors'], ['Indigo', 'the guild masters'], ['Green', 'the keepers of the sacred groves'], ['Gold thread', 'those who hold office']
];

// ---------- taboos ----------

interface TabooT { act: ActId; tr: string; sev: 1 | 2 | 3; pen: Punishment; where: Taboo['where'] | ''; text: string; rebuke: string; }
const TB = (act: ActId, tr: string, sev: 1 | 2 | 3, pen: Punishment, where: Taboo['where'] | '', text: string, rebuke: string): TabooT => ({ act, tr, sev, pen, where, text, rebuke });

export const TABOOS: TabooT[] = [
	TB('draw_weapon_indoors', 'martial', 3, 'duel', 'hall', 'A <weapon> bared in the <hall> is answered on the spot, and the answer is a duel in the yard.', 'Not under this roof. Take it outside if you want it settled.'),
	TB('draw_weapon_indoors', 'martial ancestral', 3, 'weregild', 'table', 'Steel at table breaks the peace of the meal; blood spilled there is paid for in full.', 'Sheathe it. A guest who bleeds my table pays the cloth and the kin.'),
	TB('draw_weapon_indoors', 'pious', 3, 'exile', 'temple', 'A drawn <weapon> in a place of {faith} defiles it, and the drawer is cast out until purified.', '{deity} saw that steel. Go, before the keepers see it too.'),
	TB('draw_weapon_indoors', 'insular ancestral', 2, 'fine', 'home', 'No <weapon> is drawn under another\'s roof; the <house> belongs to the family and the guest alike.', 'Hands off the hilt in my house, stranger.'),
	TB('draw_weapon_indoors', 'mercantile', 2, 'fine', 'market', 'Weapons are tied with a peace-cord in the market; a loose <weapon> voids the stallholders\' protection.', 'Cord it or carry it elsewhere. This market keeps its peace.'),
	TB('draw_weapon_indoors', 'nomadic', 3, 'weregild', 'home', 'A blade drawn inside a tent offends the host and the tent spirits, and is paid for in livestock.', 'Not in the tent. That will cost you horses.'),
	TB('draw_weapon_indoors', 'scholarly', 2, 'scorn', 'hall', 'In a house of learning a bared <weapon> is a confession that you have lost the argument.', 'Put it away. We settle things with words here.'),
	TB('refuse_hospitality', 'nomadic', 3, 'scorn', '', 'Refusing a cup of <drink> from a host is refusing the host, and people of the road do not forgive it.', 'You will drink, or you will tell me what you have against my fire.'),
	TB('refuse_hospitality', 'seafaring', 2, 'scorn', '', 'A sailor never refuses a berth or a bowl from someone who has shared a storm.', 'Sit and eat, you ungrateful gull.'),
	TB('refuse_hospitality', 'insular', 2, 'scorn', 'home', 'An insular host offers one cup and no more; refuse it and the host decides you are an enemy.', 'One cup. It is the one kindness we owe, and you will take it.'),
	TB('refuse_hospitality', 'pious', 2, 'scorn', '', 'Hospitality is a duty to {faith}; refusing a meal is refusing the god who sent the traveller.', '{deity} sent you to my door. Do not send the bread back.'),
	TB('refuse_hospitality', 'mercantile', 1, 'scorn', 'market', 'A bargain is sealed over <drink>; refuse the cup and no one trades with you again.', 'No cup, no deal. Those are the rules of this street.'),
	TB('refuse_gift', 'mercantile ancestral', 2, 'scorn', '', 'A gift refused is a debt refused; take it, then return one of equal worth within the season.', 'You may not like it, but you will take it and say thank you.'),
	TB('refuse_gift', 'martial', 2, 'duel', '', 'To refuse a gift from a warrior\'s hand is to say you doubt his honour.', 'Take it, or tell me to my face that my honour is poor.'),
	TB('refuse_gift', 'scholarly pious', 1, 'scorn', '', 'A gift of a book or a token from a teacher is never refused, whatever you think of the teacher.', 'It is rude to hand back what was given in respect.'),
	TB('insult_ancestors', 'ancestral', 3, 'weregild', '', 'To speak ill of a household\'s dead is to wound every living member, and wounds are paid for.', 'Mind your tongue about my grandmother, or mind your teeth.'),
	TB('insult_ancestors', 'ancestral pious', 3, 'exile', 'home', 'Mocking <anc> is the worst insult a family knows; the offender is shunned past the boundary stones.', 'You do not touch <anc>. Out.'),
	TB('insult_ancestors', 'martial', 3, 'duel', '', 'Insulting a warrior\'s fallen comrades is answered by steel, and the offended chooses the ground.', 'Say that about the dead again, and name your second.'),
	TB('insult_ancestors', 'insular', 2, 'scorn', '', 'Outsiders who sneer at the old ways are not struck, only remembered, and no door opens to them again.', 'We have buried better people than you. Mind how you speak of them.'),
	TB('blaspheme', 'pious', 3, 'lash', 'temple', 'Speaking lightly of {faith} or {deity} is a public offence; the lash is given at the temple door.', 'Say {deity} with respect, or say nothing at all.'),
	TB('blaspheme', 'pious', 3, 'ordeal', '', 'A cursing word against {faith} must be answered by ordeal, and the keepers choose the ordeal.', 'You have cursed a holy name. The keepers will have a word.'),
	TB('blaspheme', 'scholarly', 2, 'scorn', '', 'Mocking the teachings of the school is not a crime, but no master will ever take you again.', 'We argue with the text. We do not spit on it.'),
	TB('blaspheme', 'ancestral insular', 2, 'fine', 'home', 'Swearing by the dead without cause lightens their names and is fined at the family shrine.', 'Do not swear by my dead. Pay the shrine for that.'),
	TB('work_on_holy_day', 'pious', 2, 'fine', '', 'Work on a day sacred to {faith} steals the god\'s hours, and the street fines the worker.', 'It is a holy day. Put the tools down.'),
	TB('work_on_holy_day', 'ancestral', 1, 'scorn', '', 'On the days of the dead no field is ploughed and no loom runs; the household keeps still.', 'Not today. Today the house is for the dead.'),
	TB('work_on_holy_day', 'mercantile pious', 2, 'fine', 'market', 'Opening a stall on the rest day cheats the whole town of its peace.', 'Shutters down. Even coin has a day off.'),
	TB('speak_before_elder', 'ancestral', 1, 'scorn', '', 'The young wait until the eldest has spoken; to speak first is to show you were raised badly.', 'Wait, child. The grey heads have not spoken yet.'),
	TB('speak_before_elder', 'martial', 2, 'scorn', 'hall', 'No one speaks in the <hall> before the war leader has spoken.', 'Hold your tongue until the captain has said his piece.'),
	TB('speak_before_elder', 'scholarly', 1, 'scorn', '', 'Students never answer before the master has finished the question.', 'Let the master finish. You can be clever afterward.'),
	TB('bare_head', 'pious', 2, 'scorn', 'temple', 'Heads are covered before {faith}; a bare head is a bare insult.', 'Cover your head in this house.'),
	TB('bare_head', 'nomadic insular', 1, 'scorn', '', 'A <head> is worn outdoors by every grown person; bare heads are for children and slaves.', 'Where is your <head>? Are you a child?'),
	TB('bare_arms', 'pious ancestral', 2, 'scorn', '', 'Arms and shoulders are covered before any elder or priest; bare skin is read as contempt.', 'Cover yourself before the elders.'),
	TB('bare_arms', 'martial', 1, 'scorn', 'hall', 'Showing bare arms in the <hall> means you are looking for a fight, and one will be found.', 'Sleeves down, or take it outside.'),
	TB('public_anger', 'scholarly', 2, 'scorn', '', 'Raised voices mean the argument is lost; the shouter is led out and not asked back.', 'Lower your voice, or lose the room.'),
	TB('public_anger', 'insular', 2, 'fine', '', 'A brawl in the street shames every <house> on it, so every <house> fines the brawlers.', 'Take your temper home. The street has to live here.'),
	TB('public_anger', 'mercantile', 2, 'fine', 'market', 'Shouting in the market spoils trade for all; the market-warden fines the shouter on the spot.', 'Anger belongs outside the market gate.'),
	TB('public_anger', 'martial', 2, 'duel', '', 'Public threats are not spoken lightly; whoever makes one is expected to back it in the yard.', 'Say that again outside, and bring your friends.'),
	TB('stare', 'insular', 2, 'scorn', '', 'Staring at a stranger\'s door is how thieves choose; gawkers are told off, and sometimes struck.', 'What are you looking at? Keep walking.'),
	TB('stare', 'nomadic martial', 3, 'duel', '', 'A long stare at a rider\'s family, horse or weapon is read as a challenge, and challenges are answered.', 'Look at my horse again and see what happens.'),
	TB('stare', 'scholarly', 1, 'scorn', '', 'Looking over a scribe\'s shoulder is stealing the page.', 'Eyes on your own work.'),
	TB('eat_unclean', 'pious', 2, 'scorn', 'table', '{faith} names certain meats and drinks unclean; offering them to the faithful is an insult.', 'Take that dish away. {faith} does not allow it.'),
	TB('eat_unclean', 'insular ancestral', 3, 'exile', '', 'Eating the clan\'s totem beast is a crime against the clan, and the eater is turned out.', 'That was our beast. You eat it, you leave us.'),
	TB('eat_alone', 'nomadic', 1, 'scorn', '', 'Eating where others can see and not sharing marks you as a miser or a thief.', 'Share it or put it away. We do not watch anyone eat alone.'),
	TB('eat_alone', 'ancestral', 1, 'scorn', 'home', 'The household eats together; an empty seat at the family meal is noticed and remembered.', 'We keep your place. Come and sit in it.'),
	TB('enter_unbidden', 'insular', 3, 'duel', 'home', 'Crossing a threshold unbidden is theft of the home\'s peace, and the owner may answer with force.', 'Nobody asked you in. Back out, slowly.'),
	TB('enter_unbidden', 'insular ancestral', 2, 'fine', 'home', 'The door is asked at and waited at; to walk in uninvited is to steal the house\'s luck.', 'Knock, and wait. We have been here a thousand years.'),
	TB('enter_unbidden', 'martial', 3, 'duel', 'hall', 'No one enters the <hall> unannounced; the doorkeeper calls the name and waits for leave.', 'Wait at the door until your name is called.'),
	TB('enter_unbidden', 'pious', 3, 'exile', 'temple', 'The inner sanctum of {faith} is closed to all but the keepers; the profaner is driven out.', 'That room is not for you. Out, before {deity} notices.'),
	TB('enter_unbidden', 'mercantile', 2, 'fine', 'home', 'A merchant\'s back room holds his ledgers; entering it uninvited is spying.', 'That is my counting room. What were you after?'),
	TB('turn_back', 'martial ancestral', 2, 'scorn', 'hall', 'Turning your back on a host or ruler is read as contempt; guests back out of the room.', 'Do not show me your back. Walk out facing us.'),
	TB('turn_back', 'scholarly', 1, 'scorn', '', 'Walking away from a speaking master is a lesson refused, and the master remembers.', 'I was not finished.'),
	TB('turn_back', 'nomadic', 2, 'fine', 'home', 'Turning your back to a tent fire is turning it on the host; guests circle sunwise and face the flames.', 'Face the fire, friend. It has ears.'),
	TB('break_oath', 'martial', 3, 'hang', '', 'An oath sworn on a <weapon> and broken is not mended; the oath-breaker hangs and no one speaks for him.', 'You swore it on steel. Steel does not forgive.'),
	TB('break_oath', 'mercantile', 3, 'exile', 'market', 'A broken contract ends a merchant\'s name in every market; stalls will not sell to him.', 'Your word was your credit, and your credit is gone.'),
	TB('break_oath', 'pious', 3, 'ordeal', '', 'An oath sworn before {faith} and broken must be answered by ordeal; the keepers trust the god to show the truth.', 'Swear it again before {deity} and see what happens.'),
	TB('break_oath', 'ancestral nomadic', 3, 'weregild', '', 'The word given to a guest or a kinsman is worth blood, and a broken one is paid for in it.', 'You gave your word. Now pay what it was worth.'),
	TB('break_oath', 'scholarly', 2, 'scorn', '', 'A scholar who breaks a given word is struck from the rolls and his books are not lent.', 'Your name is off the list. Do not come back.'),
	TB('haggle_sacred', 'mercantile', 2, 'fine', 'feast', 'Haggling at a feast shames the host; prices are settled the day before or the day after.', 'Not today, friend. Today we eat. Tomorrow we argue the price.'),
	TB('haggle_sacred', 'pious', 3, 'lash', 'temple', 'Bargaining over offerings or holy things is a sin; only the keepers name a price.', 'That is not for sale, and you may not ask.'),
	TB('haggle_sacred', 'nomadic', 1, 'scorn', 'feast', 'Bargaining at a festival fire shows you came for profit and not for the people.', 'Put the purse away. This is a fire, not a stall.'),
	TB('haggle_sacred', 'ancestral', 2, 'scorn', '', 'Selling anything that belonged to the ancestors, even the cheapest cup, is worse than theft.', 'That cup belonged to my mother\'s mother. It is not for sale.'),
	TB('wear_forbidden_color', 'ancestral pious', 2, 'fine', '', '<Col> is worn only by <who>; anyone else in it is mocking them.', 'You wear <col>. That is not yours to wear.'),
	TB('wear_forbidden_color', 'martial', 2, 'scorn', '', '<Col> belongs to <who>; wearing it unearned is a lie on the body.', 'Who gave you the right to <col>? Take it off.'),
	TB('wear_forbidden_color', 'scholarly mercantile', 1, 'scorn', 'market', '<Col> marks <who>; strangers who wear it are mocked at the gate.', 'Nice <col>. Who did you borrow it from?'),
	TB('touch_head', 'nomadic pious', 2, 'scorn', '', 'The head holds the spirit; touching another\'s head, even a child\'s, is a blow.', 'Hands off the head.'),
	TB('touch_head', 'ancestral', 2, 'scorn', '', 'The crown of the head is sacred to the ancestors; no one touches it without leave.', 'Do not touch her head. It is not yours to touch.'),
	TB('touch_head', 'martial', 3, 'duel', '', 'A hand laid on a warrior\'s head is a challenge to his honour.', 'Take that hand off, or lose it.'),
	TB('left_hand', 'nomadic pious insular', 1, 'scorn', 'table', 'The left hand is for dirty work; give, take and eat with the right.', 'Right hand, friend. The other one has chores.'),
	TB('left_hand', 'scholarly ancestral', 1, 'scorn', '', 'Offer anything to an elder with both hands; one hand is a dismissal.', 'Use both hands for your elders.'),
	TB('whistle_night', 'seafaring', 1, 'scorn', 'road', 'Whistling aboard or on the shore at night calls the wind to hear its name, and it comes angry.', 'Stop whistling. You will call the squall.'),
	TB('whistle_night', 'insular', 1, 'scorn', 'home', 'Whistling after dark calls things that were not invited, and neighbours do not forgive it.', 'Not after dark. Do you want something to answer?'),
	TB('whistle_night', 'nomadic', 2, 'fine', 'road', 'Whistling in camp at night wakes the wolves and the plain spirits; the offender takes the next watch.', 'Whistle again and you take the dawn watch.'),
	TB('whistle_night', 'martial', 2, 'lash', '', 'Whistling in barracks at night is how deserters signal; the watch seizes whoever does it.', 'Whistle like that and the sergeant will hear it.'),
	TB('waste_food', 'nomadic', 2, 'scorn', 'table', 'Where the next meal is a week away, wasting food is wasting a life.', 'Finish it. Somebody on the road is hungry.'),
	TB('waste_food', 'ancestral pious', 2, 'scorn', 'table', 'Crumbs are offerings; spilling or binning food insults the givers of the harvest.', 'That was a gift. Do not throw it away.'),
	TB('waste_food', 'mercantile', 1, 'fine', '', 'Wasting food is wasting coin, and a merchant who does it is not trusted with a ledger.', 'Pennies add up. Eat it or sell it.'),
	TB('drink_to_excess', 'pious', 2, 'scorn', 'feast', 'Drinking until you stagger at a holy feast is an insult to the god and the host.', 'Enough. {deity} is watching.'),
	TB('drink_to_excess', 'scholarly', 1, 'scorn', '', 'A drunk scholar loses his students, his hand and soon his post.', 'You are slurring, and the master is listening.'),
	TB('drink_to_excess', 'martial', 2, 'lash', 'road', 'Drinking on watch or before a march is a gate left open, and the sergeant remembers.', 'Sober up. We march at dawn.'),
	TB('drink_to_excess', 'mercantile', 1, 'fine', 'market', 'A bargain signed drunk is void, and the drunk pays the fee for wasting everyone\'s time.', 'Sleep it off. We will count it again in the morning.'),
	TB('shirk_duty', 'martial', 2, 'lash', '', 'Missing the muster or the night watch puts the whole <house> row in danger.', 'Where were you at the horn? We stood your watch.'),
	TB('shirk_duty', 'mercantile', 2, 'fine', 'market', 'A merchant who skips the guild watch loses his seat at the bench.', 'Your turn on the watch was Tuesday. The bench is waiting.'),
	TB('shirk_duty', 'pious', 2, 'scorn', 'temple', 'Skipping the daily offering invites loss on the whole street.', 'Nobody lit the lamp. We are all poorer for it.'),
	TB('shirk_duty', 'ancestral', 2, 'scorn', 'home', 'Missing the family rites on the days of the dead is to disown the household.', 'The family stood for the dead. Where were you?'),
	TB('shirk_duty', 'scholarly', 1, 'scorn', 'hall', 'Missing a master\'s lesson returns the master\'s gift unopened.', 'The master waited. He is a patient man, but he counts.')
];

/** one or two taboos the genre adds, fixed text */
export const GENRE_TABOOS: Record<string, TabooT[]> = {
	fantasy: [TB('break_oath', 'pious martial', 3, 'ordeal', '', 'A <oath> once broken calls a curse down on the oath-breaker\'s whole line.', 'You swore it, and the stones heard.')],
	mythic: [TB('blaspheme', 'pious', 3, 'exile', 'hall', 'Naming the gods idly in the <hall> draws their eyes on the whole <house>.', 'Hush. The gods have long ears.')],
	steampunk: [TB('shirk_duty', 'mercantile', 2, 'fine', '', 'Leaving a boiler or a pressure gauge unwatched endangers the street; the guild fines whoever held the shift.', 'Who was on the gauge?'), TB('break_oath', 'mercantile martial', 3, 'exile', 'hall', 'A <oath> stamped in the ledger is never unsworn; the breaker\'s name is chiselled off the guild plaque.', 'Your name came off the plaque this morning.')],
	dieselpunk: [TB('shirk_duty', 'martial mercantile', 3, 'scorn', '', 'Crossing a picket or breaking a strike is the unforgivable act of the union halls.', 'Scab. Turn around and go home.')],
	atompunk: [TB('shirk_duty', 'martial', 2, 'fine', '', 'Skipping a shelter drill endangers every neighbour on the block, and the warden writes the name down.', 'The siren sounded. Where were you?'), TB('eat_unclean', 'insular', 2, 'scorn', 'table', 'Opening a ration tin without checking the seal is treated as stupidity bordering on crime.', 'Check the seal first. Do you want us all sick?')],
	cyberpunk: [TB('break_oath', 'mercantile', 3, 'exile', '', 'A breached <oath> is flagged in every ledger; the breacher finds every door closed.', 'Your contract has a red flag now. Good luck.'), TB('stare', 'insular', 2, 'scorn', '', 'Scanning someone\'s implant port or cipher-badge without leave is worse than staring.', 'Stop pinging me, chrome-face.')],
	biopunk: [TB('eat_unclean', 'insular ancestral', 2, 'scorn', 'table', 'Eating from another household\'s vat or culture is theft of its life and a vector for sickness.', 'That vat is ours. You will wash out before you eat again.'), TB('touch_head', 'insular', 2, 'scorn', '', 'Touching another\'s grafts or living ornaments without leave is assault.', 'Do not touch my graft. It is alive, and so am I.')],
	solarpunk: [TB('waste_food', 'ancestral', 2, 'scorn', '', 'Wasting the shared harvest or burning power the commons stored is an offence against everyone.', 'The commons grew that. Do not throw it away.'), TB('shirk_duty', 'scholarly mercantile', 2, 'scorn', '', 'Missing your turn at commons labour is noticed by all, and the commons has a long memory.', 'It was your week at the compost heap.')],
	wasteland: [TB('waste_food', 'nomadic', 3, 'exile', '', 'Wasting or fouling water is the gravest crime the dry lands know; the offender is turned out with nothing.', 'You spilled water. Take your own and go.'), TB('refuse_hospitality', 'nomadic insular', 3, 'scorn', 'home', 'Refusing a cup of clean water from a host is an insult beyond mending.', 'I opened my cistern for you. Drink.')],
	twilight: [TB('insult_ancestors', 'ancestral', 2, 'scorn', '', 'Calling the golden age a fable sneers at the makers, and the old houses do not forgive it.', 'My ancestors built this. Mind your words about them.')]
};

/** taboos that follow the home's kind (culture.type) */
export const TYPE_TABOOS: Record<string, TabooT> = {
	Deep: TB('whistle_night', 'insular', 2, 'fine', '', 'Whistling or shouting in the tunnels brings the roof down, so every voice below is kept low.', 'Quiet. Do you want the ceiling to hear you?'),
	Sky: TB('shirk_duty', 'insular', 3, 'exile', '', 'Leaving a mooring line unchecked can drop the isle\'s neighbours into the clouds; no one forgives it.', 'Who tied that knot? Answer me, or you walk the plank.'),
	Sea: TB('whistle_night', 'seafaring', 2, 'scorn', 'road', 'Whistling on the water calls the wind to hear its name, and it comes angry.', 'Stop that whistling or I will have you over the side.'),
	Naval: TB('shirk_duty', 'martial', 3, 'lash', 'road', 'Abandoning a watch aboard ship is a crime against everyone who sleeps below.', 'Who was on watch? Step forward.'),
	Highland: TB('refuse_hospitality', 'insular', 3, 'exile', 'home', 'In the high passes shelter is never refused; turning a traveller from the door in snow is murder.', 'You would shut the door on a traveller in snow? Shame on you.'),
	Hunting: TB('waste_food', 'nomadic', 2, 'scorn', 'table', 'A kill is shared and used whole; wasting a part of it insults the beast.', 'Use all of it. The animal gave everything.'),
	Nomadic: TB('turn_back', 'nomadic', 2, 'scorn', 'home', 'Never turn your back on a tent fire or its host.', 'Face the fire, friend.')
};

export const DESERT_TABOO: TabooT = TB('waste_food', 'nomadic', 3, 'scorn', '', 'Wasting water or throwing it away is the worst crime a dry land knows.', 'That was water. Water is life, and you poured it out.');

/** one non-human taboo per species and a short etiquette line */
export const SPECIES_EXTRA: Record<string, { taboo: TabooT; etiq: [Etiquette['kind'], string] }> = {
	elf: { taboo: TB('public_anger', 'scholarly', 2, 'scorn', '', 'Raised voices and haste offend a people who count years in centuries; it marks you as a child.', 'Slowly. We have all the time there is.'), etiq: ['speech', 'Speak slowly and finish your sentences; the long-lived treat hurry as bad breeding.'] },
	dwarf: { taboo: TB('touch_head', 'ancestral', 3, 'duel', '', 'A dwarf\'s beard is the record of his life; touching it uninvited is an assault.', 'Hands off the beard, or lose them.'), etiq: ['gesture', 'Show interest in a dwarf\'s craft; asking after the forge is the best opening.'] },
	orc: { taboo: TB('turn_back', 'martial', 3, 'duel', '', 'Turning your back on a challenge is cowardice; the challenger may strike at once.', 'Face me, or be known as a runner.'), etiq: ['gesture', 'Show scars and tell where you got them; honest scars are good currency.'] },
	troll: { taboo: TB('eat_alone', 'nomadic', 2, 'scorn', '', 'A kill belongs to the pack; a troll that eats first is shunned from the bridge.', 'Share it, or find your own bridge.'), etiq: ['food', 'Never reach for meat before the eldest has bitten into it.'] },
	beastman: { taboo: TB('stare', 'nomadic', 2, 'scorn', '', 'Staring at horns, fur or tail is rude and is read as pity or hunger.', 'Eyes up. I have a face as well.'), etiq: ['space', 'Keep a pace apart; touching a pelt without being invited is an affront.'] },
	halfling: { taboo: TB('refuse_hospitality', 'ancestral', 2, 'scorn', 'table', 'Declining a second helping is read as disliking the cook and the family she came from.', 'You will have another. The pot is not empty.'), etiq: ['food', 'Accept a second breakfast and compliment the pie; the small folk measure kinship in plates.'] },
	giant: { taboo: TB('enter_unbidden', 'insular', 3, 'weregild', 'home', 'Stepping under a giant\'s lintel unannounced risks being stepped on, and the owner owes no blood-price.', 'Shout first. I cannot see small things at my feet.'), etiq: ['space', 'Stay out of the stride: stand to the side of a doorway and speak up.'] },
	goblin: { taboo: TB('refuse_gift', 'mercantile', 2, 'scorn', 'market', 'Refusing a trade offer is an insult, and a goblin keeps count of who still owes him one.', 'You do not like my offer? Then name one, and quickly.'), etiq: ['gift', 'Always counter-offer; a goblin who is not haggled with feels ignored.'] },
	saurian: { taboo: TB('shirk_duty', 'nomadic', 2, 'scorn', '', 'Missing the morning basking at the warm stones is shirking the clutch\'s common duty.', 'The sun-stones were cold. Where were you?'), etiq: ['time', 'Never call before the morning warmth; the cold-blooded are poor company until midday.'] },
	merfolk: { taboo: TB('eat_unclean', 'seafaring', 3, 'exile', '', 'Eating the fish of the tide-kin is cannibalism; the guilty are driven to the dry shores.', 'Those fish are our kin. Out of the water.'), etiq: ['gesture', 'Keep your hands wet when you greet; dryness is read as coldness.'] },
	celestial: { taboo: TB('bare_head', 'pious', 2, 'scorn', 'temple', 'The Starborn keep the crown veiled in the presence of the unlit; to tear it away is blasphemy.', 'The light is not for the unready.'), etiq: ['speech', 'Do not interrupt a long silence; the starborn think in the pauses.'] },
	ratfolk: { taboo: TB('eat_alone', 'insular', 2, 'scorn', '', 'The nest eats together; hiding food is the worst betrayal the warren knows.', 'We share. Why hide it from us?'), etiq: ['space', 'Stay close and keep to the run; ratfolk read loose wandering as spying.'] },
	lizardfolk: { taboo: TB('public_anger', 'insular', 2, 'scorn', '', 'Hissing in anger at a council is a declaration that the hisser will not heed the council\'s ruling.', 'Hiss and you are outside the circle.'), etiq: ['greeting', 'Greet with a slow blink and a lowered head; a hard stare is a challenge.'] },
	tomb_undead: { taboo: TB('insult_ancestors', 'ancestral', 3, 'exile', '', 'Speaking of the long sleepers as dead is the deepest insult; they are merely waiting.', 'We are not dead. We are patient.'), etiq: ['speech', 'Address the old ones by the title they held in life, not the one the grave gave them.'] },
	ogor: { taboo: TB('waste_food', 'martial', 2, 'scorn', 'table', 'Leaving meat on the plate insults the hunt and the hunters who risked themselves for it.', 'You leave that? A hungry child would not.'), etiq: ['food', 'Eat a lot and loudly, and ask for more; a polite appetite is a suspicious one.'] },
	void_elf: { taboo: TB('stare', 'scholarly', 3, 'exile', '', 'Meeting a void elf\'s eyes holds the stare a moment too long; the unready are said to hear the dark.', 'Look away. Now. Before the dark looks back.'), etiq: ['gesture', 'Lower your eyes to the chin; eye contact is rationed.'] },
	warp_fiend: { taboo: TB('break_oath', 'martial', 3, 'hang', '', 'A bargain with the warp-touched is sealed in something worse than ink; those who break it are hunted.', 'We both signed. Only one of us is still bound.'), etiq: ['speech', 'Never say yes without reading the terms twice, and never say the terms aloud.'] },
	chitin_swarm: { taboo: TB('speak_before_elder', 'insular', 2, 'scorn', '', 'Speaking over the hive-voice is an act of treason against the many.', 'The hive is speaking. Be quiet.'), etiq: ['gesture', 'Tap two fingers on a surface to be heard before you speak; the swarm answers to the pulse.'] }
};

// ---------- etiquette ----------

interface EtiqT { kind: Etiquette['kind']; tr: string; r: number; text: string; }
const ET = (kind: Etiquette['kind'], tr: string, r: number, text: string): EtiqT => ({ kind, tr, r, text });

export const ETIQUETTE: EtiqT[] = [
	ET('greeting', '', 1, 'Greet with <gesture> and wait for the same before speaking.'),
	ET('greeting', 'ancestral', 2, 'Ask after the other\'s family and elders before any business; skipping it says you have none.'),
	ET('greeting', 'martial', 1, 'Show an empty palm first, then name your house; never open with your business.'),
	ET('greeting', 'mercantile', 1, 'Greet with a piece of fresh news; a fact for a fact is the opening bid.'),
	ET('greeting', 'pious', 2, 'Greet in the name of {deity}, and let the other finish the blessing.'),
	ET('greeting', 'nomadic', 2, 'Ask first about the water, the grass and the herds; they are the real greeting.'),
	ET('greeting', 'insular', 1, 'Do not greet strangers in the street; wait at the gate until the household has seen you.'),
	ET('greeting', 'scholarly', 2, 'Greet with a question or a line of verse and let the other finish it.'),
	ET('greeting', 'seafaring', 1, 'Greet with fair winds and ask what port you hail from; news is a sailor\'s first duty.'),
	ET('gesture', 'pious', 1, 'Touch lips and brow when {deity} is named, even in jest.'),
	ET('gesture', 'ancestral', 2, 'Pass anything to an elder with both hands.'),
	ET('gesture', 'martial', 1, 'Salute a banner or a worn scar with a closed fist on the chest.'),
	ET('gesture', 'nomadic', 2, 'Walk around a hearth, never across it, and step over no tent-rope.'),
	ET('gesture', 'insular', 1, 'Keep your hands where they can be seen and do not point at doors.'),
	ET('gesture', 'mercantile', 2, 'Seal a bargain with a clasp of right hands over the scales; no clasp, no bargain.'),
	ET('gesture', 'scholarly', 1, 'Never turn the page of a borrowed book with a wet finger; ask first.'),
	ET('gesture', 'seafaring', 1, 'Never step over a coiled line; coil it the local way before you hand it back.'),
	ET('gift', '', 2, 'Bring <gift> to a first visit; arriving empty-handed is worse than arriving late.'),
	ET('gift', 'ancestral pious', 1, 'Give gifts in odd numbers for the living and in even numbers for the dead.'),
	ET('gift', 'mercantile', 2, 'Gifts are returned in kind within the season; keep a note, since your host certainly does.'),
	ET('gift', 'martial', 2, 'Offer a fighter something useful, a whetstone, a strap or a tin of oil; trinkets insult.'),
	ET('gift', 'nomadic', 1, 'A guest leaves something small behind, a coin or a tied cloth, to mark the visit.'),
	ET('gift', 'insular', 1, 'Hand gifts over at the gate; only a friend of years is carried indoors with the gift.'),
	ET('gift', 'scholarly', 2, 'A gift of ink, a book or a good question lands better than silver.'),
	ET('gift', 'seafaring', 1, 'Gifts for a sailor\'s household are salt, sugar or wine; things that do not spoil in the hold.'),
	ET('food', '', 1, 'Take <staple> with the right hand from the shared dish and never reach across a neighbour.'),
	ET('food', '', 1, 'The first and last cup of <drink> belong to the host; wait until he lifts it.'),
	ET('food', 'pious', 2, 'Say the blessing and wait for the eldest to taste before anyone eats.'),
	ET('food', 'nomadic', 2, 'Take what is offered, finish what you take and praise the cook; leaving food is a slight.'),
	ET('food', 'martial', 1, 'The host seats the senior warrior by the door; do not argue about the seat.'),
	ET('food', 'ancestral', 2, 'Set a portion aside for the household\'s dead before you eat.'),
	ET('food', 'mercantile', 1, 'Never talk price at table until the second cup has been poured.'),
	ET('food', 'insular', 1, 'Do not praise the food loudly; quiet thanks and a clean plate are the compliment.'),
	ET('food', 'seafaring', 1, 'Fish is served whole and turned only by the host; turning it yourself brings a boat down.'),
	ET('speech', '', 1, 'Use <elder> for anyone older than your parents until told otherwise.'),
	ET('speech', 'scholarly', 2, 'Open with praise of the host\'s house; a flat start is read as contempt.'),
	ET('speech', 'martial', 1, 'Speak plainly and briefly; long words are for those who hide something.'),
	ET('speech', 'mercantile', 1, 'Never say no outright; say we will see, and let the price speak.'),
	ET('speech', 'pious', 1, 'Do not swear in front of anyone who wears the sign of {faith}, even in a foreign tongue.'),
	ET('speech', 'ancestral', 2, 'Name your house and your mother\'s house before anything else; strangers without a lineage are suspected.'),
	ET('speech', 'insular', 1, 'Give short answers; a long answer implies you wish to stay.'),
	ET('speech', 'nomadic', 1, 'Open every talk with the road, the weather and the herds before business.'),
	ET('speech', 'scholarly', 2, 'Quote a line when you disagree; bare contradiction is for children.'),
	ET('dress', '', 1, 'Wear a <head> out of doors; bare heads belong to the very young and the very poor.'),
	ET('dress', '', 2, 'Locals wear <sdress>; matching the cut earns easy goodwill.'),
	ET('dress', 'pious', 2, 'Cover shoulders and head before entering any shrine of {faith}.'),
	ET('dress', 'martial', 1, 'A warrior wears his scars bare and his rank on the shoulder; hiding either is shameful.'),
	ET('dress', 'mercantile', 1, 'Dress above your means in a market; a shabby merchant is a poor bargain.'),
	ET('dress', 'ancestral', 1, 'Wear a token of your house, a knot or a cord; the unmarked are treated as masterless.'),
	ET('dress', 'scholarly', 1, 'Ink on the fingers is a mark of honour; wash it off for no one.'),
	ET('dress', 'nomadic', 1, 'Leave your boots at the tent flap, but keep your belt on.'),
	ET('dress', 'insular', 1, 'Wear plain colours in town; bright dress draws the attention the neighbours do not want.'),
	ET('dress', 'seafaring', 1, 'Do not wear green aboard ship; the sea claims what matches it.'),
	ET('space', '', 1, 'Stand an arm\'s length from the person you speak to; closer is intimacy or threat.'),
	ET('space', 'ancestral', 2, 'Do not step on the threshold stone; the <house>\'s luck sleeps there.'),
	ET('space', 'martial', 2, 'Leave weapons at the <hall> door unless the lord says otherwise; he never says so.'),
	ET('space', 'insular', 1, 'Do not follow a local into a lane they have not named; the side streets are theirs.'),
	ET('space', 'pious', 2, 'Walk around a shrine the way the sun goes, never against it.'),
	ET('space', 'nomadic', 2, 'In a tent the guest sits left of the door, the host right; the back belongs to the elders.'),
	ET('space', 'mercantile', 1, 'Never lean on another\'s stall or touch goods you do not mean to buy.'),
	ET('space', 'scholarly', 1, 'In a library speak low and never fold a leaf; the keepers keep a ledger of faces.'),
	ET('space', 'seafaring', 1, 'Step onto a ship with the right foot first, and ask the master\'s leave before you board.'),
	ET('time', '', 1, 'Arrive at the hour the host named, not before: early is greedy, late is rude.'),
	ET('time', 'mercantile', 1, 'Business waits until after the second bell; before then only friends and fools call.'),
	ET('time', 'pious', 2, 'Stop work and speech at the hour of prayer, even mid-sentence; the speaker resumes without complaint.'),
	ET('time', 'ancestral', 2, 'Be home for the days of the dead; whoever travels then is thought to be avoiding his kin.'),
	ET('time', 'nomadic', 1, 'Time is told by the sun and the herd; asking for the hour marks you as a townsman.'),
	ET('time', 'martial', 1, 'Dawn is for drill; visiting before drill ends trespasses on the troop.'),
	ET('time', 'insular', 2, 'Do not call after dusk; a lamp lit is a house closed.'),
	ET('time', 'scholarly', 1, 'Never interrupt a master\'s hour; wait at the door until the lamp is trimmed.'),
	ET('time', 'seafaring', 1, 'Plan around the tide, never against it; a departure missed by the tide is not apologised for.')
];

export const GENRE_ETIQUETTE: Record<string, EtiqT[]> = {
	fantasy: [ET('speech', 'pious scholarly', 2, 'Take a <oath> only when you mean it; the stones are said to listen.')],
	mythic: [ET('gesture', 'pious', 2, 'Pour a drop of <drink> on the ground before drinking; the old gods drink first.')],
	steampunk: [ET('greeting', 'mercantile scholarly', 2, 'Tip the hat and offer a calling card; a stranger without one is not announced.'), ET('time', '', 1, 'Be punctual to the minute; the town clock is law and the guild keeps its time.')],
	dieselpunk: [ET('greeting', 'martial mercantile', 2, 'Greet with a brisk nod and ask the shift; a worker is judged by his union and his hours.'), ET('speech', '', 1, 'Call workmates comrade or brother; boss is for the other side of the hall.')],
	atompunk: [ET('greeting', '', 1, 'Show your ration card or badge when asked; unregistered strangers are not spoken to.'), ET('time', 'insular', 2, 'Stop at the siren and move to the shelter point; ask questions afterward.')],
	cyberpunk: [ET('greeting', 'mercantile insular', 2, 'Offer a contact tag; unmarked strangers are assumed to be agents and treated accordingly.'), ET('space', '', 1, 'Switch your lens and implant to passive in a private room; scanning is a form of trespass.')],
	biopunk: [ET('gesture', 'ancestral insular', 2, 'Ask before touching a graft, a vine or a vat; each is someone\'s living kin.'), ET('food', '', 1, 'Eat only what you are handed from the house\'s own culture; trading plates is theft.')],
	solarpunk: [ET('greeting', '', 2, 'Greet with an open palm to the sun, then ask where you can help; the commons runs on work.'), ET('food', '', 1, 'Scrape your plate into the compost and thank the growers by name.')],
	wasteland: [ET('greeting', 'nomadic insular', 3, 'Show both hands and a flask; water is offered first, names after.'), ET('food', '', 2, 'Never pour water on the ground, even as a toast; the host drinks the first cup to show it is safe.')],
	twilight: [ET('speech', 'ancestral scholarly', 2, 'Speak of the old makers with a lowered voice; the houses that remember are proud and fading.')]
};

// ---------- hospitality ----------

export const OFFER_FIRST: string[] = [
	'<drink> before any question is asked', 'a cup of cool water and a place to wash', 'a bowl of warm broth by the fire',
	'a damp cloth for the face and hands', 'the first cup, which the host drinks from first to show it is clean'
];
export const OFFER_FIRST_GENRE: Record<string, string[]> = {
	fantasy: ['bread and salt at the threshold, then <drink>'], mythic: ['a libation for the gods, then a cup for the guest'],
	steampunk: ['tea and a seat by the stove'], dieselpunk: ['a mug of black coffee from the union pot'], atompunk: ['a thermos of coffee and a seat on the shelter bench'],
	cyberpunk: ['a cup of hot tea, a charging socket and no questions'], biopunk: ['a sip of the house\'s fermented sap'],
	solarpunk: ['a glass of cool water from the commons cistern'], wasteland: ['a measure of clean water, poured where you can see it'], twilight: ['the last of the good <drink>, opened for you']
};
export const OFFER_FOOD: string[] = ['a share of the household meal of <staple>', 'the best dish in the house, whether or not it can be spared', 'a plate of <staple> with whatever the house has', '<sfood> from the family pot'];
export const OFFER_ROOF: string[] = ['a bed by the hearth, the warmest place in the house', 'a place on <seat> and a blanket', 'the guest room, kept for exactly this', 'a bed under the roof of the <house>', 'a corner of the <hall> with a blanket'];
export const OFFER_ROOF_NOMAD: string[] = ['a sleeping place in the tent nearest the door', 'a felt rug by the fire and a place at the herd\'s edge'];
export const OFFER_LAST: string[] = ['a guide to the next village or camp', 'a packed meal for the road and <gift>', 'an escort to the boundary who carries your bag', 'a blessing for the road in the name of {deity}', 'a warning about the road ahead, kindly meant'];

export const DUTIES: [string, string][] = [
	['bring no steel into the room, or leave it with the host', 'martial insular'],
	['do no harm to the host\'s house, kin or stock', ''],
	['share news from the road freely and truthfully', 'mercantile nomadic seafaring'],
	['not stay past the guest right without offering work or payment', 'mercantile ancestral'],
	['keep the host\'s counsel and name no one the host has hidden', 'insular martial'],
	['help with a task the host sets, however small', 'nomadic ancestral'],
	['not ask after the host\'s affairs or purse', 'insular mercantile'],
	['leave something behind: a coin, a tool or a story', 'nomadic scholarly'],
	['honour the household\'s gods and eat what is served', 'pious ancestral'],
	['rise before the household and fold the bedding', 'ancestral insular'],
	['wash before eating and speak the blessing before the host drinks', 'pious scholarly'],
	['speak only when spoken to by an elder of the house', 'ancestral'],
	['pay the host back with a service within the year if the host asks', 'mercantile martial']
];
export const BREACHES: [string, string][] = [
	['The breaker is a pariah: no door in the culture opens to him again.', ''],
	['The host\'s kin may take blood or blood-price, and the whole <house> row stands behind them.', 'martial ancestral'],
	['The breaker is stripped of cloak and boots and driven out into the weather.', 'nomadic insular seafaring'],
	['The offence is cried at every market and in every <hall>, and the name is struck from the rolls.', 'mercantile scholarly'],
	['The servants of {faith} refuse the breaker\'s offerings and bury him outside the wall.', 'pious'],
	['The bench voids the breaker\'s contracts and seizes his stock.', 'mercantile'],
	['The offence follows the breaker\'s whole kin for three generations.', 'ancestral'],
	['He is turned out with no water and no word spoken for him.', 'nomadic']
];
export const BREACH_GENRE: Record<string, string> = {
	wasteland: 'The breaker is left at the nearest dry well with a single empty flask and no company.',
	cyberpunk: 'The breaker\'s contracts are flagged red in every ledger, and the flag does not expire.',
	steampunk: 'The guild strikes the breaker from the ledger and his tools are seized at the gate.',
	solarpunk: 'The commons assembly cuts the breaker off from shared stores until the matter is mended.',
	atompunk: 'The warden strips the breaker\'s shelter card and no block will take him in.'
};

// ---------- ideals ----------

export const IDEAL_DEATH: Record<string, string[]> = {
	martial: ['To fall facing the enemy with the <weapon> in hand and the name still spoken in the <hall>.', 'To die in the front rank so that the others see you do not turn.'],
	pious: ['To die in the arms of the keepers, shriven, with {deity}\'s name on the lips.', 'To die at peace with the neighbours, with no quarrel unsettled.'],
	mercantile: ['To die solvent, with the ledgers closed and every debt paid or forgiven.', 'To die in your own bed with the stock sold and the heirs well provided for.'],
	nomadic: ['To die on the road under the open sky, and be left where the wind can take you.', 'To die among the herds with the kin close, and be carried by the next camp.'],
	insular: ['To die inside the home valley, buried where your parents lie.', 'To die quietly, without giving the neighbours a story.'],
	ancestral: ['To die in the old house, surrounded by kin who can say your name for a hundred years.', 'To die with the line secure and a grandchild to carry the name.'],
	scholarly: ['To die with a finished work on the desk and a pupil to carry the next one.', 'To die mid-sentence in the middle of an argument you were winning.'],
	seafaring: ['To be given to the water in sailcloth, so the sea gives back the fish.', 'To die on deck with the sheets in hand, and be mourned by the whole crew.']
};
export const IDEAL_HOST: Record<string, string[]> = {
	martial: ['One who gives the guest the best seat, the best blade of bread and the full weight of his protection.'],
	pious: ['One who treats the stranger as {deity}\'s messenger and sets the best food before him.'],
	mercantile: ['One who feeds the guest well, never asks his business and never lets the bill come up.'],
	nomadic: ['One who gives up his own bed, shares the last of the water and never asks how long the guest means to stay.'],
	insular: ['One who is cold at the gate but fair at the table, and never speaks of the guest to the neighbours.'],
	ancestral: ['One who seats the guest beside the elders and speaks to him as to a cousin.'],
	scholarly: ['One who feeds the guest and the guest\'s questions with equal patience.'],
	seafaring: ['One who takes in the shipwrecked without asking what flag they flew.']
};
export const IDEAL_NAME: Record<string, string[]> = {
	martial: ['A name that is feared by enemies and trusted by the troop, and a debt of honour that is always paid.'],
	pious: ['A name that the keepers can say aloud in the temple without blushing.'],
	mercantile: ['A name that is good for credit in three markets and never needs to be explained.'],
	nomadic: ['A name that is carried by the herds and repeated at distant fires.'],
	insular: ['A name no one in town has ever had reason to repeat.'],
	ancestral: ['A name that adds to the lineage and never shortens it.'],
	scholarly: ['A name cited by others who never met you.'],
	seafaring: ['A name sung in every port where you have paid your debts.']
};
export const IDEAL_WEALTH: Record<string, string[]> = {
	martial: ['Wealth is what you take and what you give back to the troop; hoarded gold is a coward\'s idol.'],
	pious: ['Wealth is held in trust; the pious give a tenth and distrust the rest.'],
	mercantile: ['Wealth is the proof of good judgement, and wealth that does not move is dead stock.'],
	nomadic: ['Wealth is the herd, the horses and the guest-gifts you can carry; stone houses mean little.'],
	insular: ['Wealth is stored grain, a sound roof and a locked chest; showy people are noticed.'],
	ancestral: ['Wealth is land and name, and it belongs to the line, not to the person who holds it.'],
	scholarly: ['Wealth is books, time and a good teacher; coin is only the way to buy them.'],
	seafaring: ['Wealth is a sound hull, a trusted crew and a cargo that sells at the far port.']
};
export const IDEAL_WEALTH_GENRE: Record<string, string> = {
	steampunk: 'Wealth is shares in the works, a stamped deed and a name on the guild plaque.',
	dieselpunk: 'Wealth is steady work, a union card and a pension that will not be cut.',
	atompunk: 'Wealth is a stocked shelter, a good ration card and a neighbour who will share.',
	cyberpunk: 'Wealth is clean credit, a sealed contract and access that no one else can revoke.',
	biopunk: 'Wealth is a healthy vat, a living line and a seed bank no one has raided.',
	solarpunk: 'Wealth is a full commons store, a skilled neighbourhood and a garden that outlasts you.',
	wasteland: 'Wealth is clean water, a working well and a neighbour who will not poison it.',
	twilight: 'Wealth is what survives of the old makers: a title, a key, a book that still opens.'
};
export const IDEAL_DEATH_GENRE: Record<string, string> = {
	wasteland: 'To die with the last water shared, and a dry grave that no scavenger digs up.',
	cyberpunk: 'To die with the contracts cleared and the backup deleted, so no copy of you runs on.',
	solarpunk: 'To be returned to the commons garden, so that a tree can have your name.',
	steampunk: 'To die in the shop with a finished piece on the bench and the apprentices around.',
	atompunk: 'To be buried in the town cemetery with a full civil record and a small flag on the stone.'
};
