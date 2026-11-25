/**
 * Phrase banks for the culture voice (voice.ts). Pure data, no logic beyond tiny parsers.
 * Internal tokens <x> are resolved by voice.ts (genre words and land words); schema placeholders
 * {name} {title} {realm} {town} {time} {deity} are left for the engine.
 */
import type { Genre } from '../../../gen/genre';
import type { Register } from '../../../adventure/culturepack';

/** one entry per line */
export const L = (s: string): string[] => s.split('\n').map((x) => x.trim()).filter(Boolean);
export const IDIOMS = (s: string): { say: string; meaning: string }[] =>
	L(s).map((l) => {
		const [say, meaning] = l.split(' :: ');
		return { say, meaning };
	});
/** "key: a | b | c" per line */
export const BARKS = (s: string): Record<string, string[]> => {
	const out: Record<string, string[]> = {};
	for (const l of L(s)) {
		const i = l.indexOf(':');
		out[l.slice(0, i).trim()] = l.slice(i + 1).split(' | ').map((x) => x.trim()).filter(Boolean);
	}
	return out;
};

export const BARK_KEYS = ['market', 'guard', 'tavern', 'temple', 'road', 'night', 'rain', 'crowd', 'smith', 'farm', 'harbor', 'school'] as const;

export interface RegBank {
	greet: string[];
	farewell: string[];
	thanks: string[];
	apology: string[];
	agree: string[];
	refuse: string[];
	praise: string[];
	insults: string[];
	curses: string[];
	oaths: string[];
	fillers: string[];
	gossip: string[];
	humour: string[];
	address: { formal: string; familiar: string }[];
	barks: Record<string, string[]>;
}

export const REG: Record<Register, RegBank> = {
	formal: {
		greet: L(`
Good {time} to you, {title} {name}, and to all beneath your roof.
I greet you, {title} {name}, and trust the day has treated you as your station deserves.
It is an honour to be received by you, {title} {name}.
May the {time} find you in good health, {title}, and your household in good order.
Be welcome in {town}, {title} {name}, as custom and law require.
I present myself and my respects, {title}, and ask your leave to speak.
The {time} greets you, {title} {name}; may our business be brief and fair.
Permit me to bid you good {time}, {title}, in the name of {realm}.
I am pleased to find you well, {title} {name}, and the affairs of {town} in order.
On behalf of those I serve, I offer you the courtesies of the {time}.
Peace and order to your house this {time}, {title} {name}.
I come in due form, {title} {name}, and ask a moment of your counsel.
May the annals of {town} record this meeting kindly, {title}.
Your presence brings credit to this hall, {title} {name}.`),
		farewell: L(`
I take my leave of you, {title} {name}, with thanks for your time and attention.
May your affairs prosper until we meet again, {title}.
With your permission I shall withdraw; the hour and my duties require it.
Farewell, {title} {name}, and may your house stand firm.
I commend you to a peaceful {time} and a safe road.
Until we are again in the same company, {title}, I remain in your debt.
Let it be recorded that this meeting was conducted in good order. Farewell.
I depart, {title}, as custom allows, and wish you every success.
May the roads of {realm} lie smooth before you, {title} {name}.
I withdraw with respect, {title}, and leave your house in peace.
Keep well until the next assembly, {title} {name}.`),
		thanks: L(`
I am obliged to you, {title} {name}, more than I can properly say.
You have my sincere thanks, and the debt is recorded in my memory.
Your kindness will not be forgotten by me or by my house.
I thank you, {title}, for a service performed with such care.
Accept my gratitude, {title} {name}, as the law of courtesy requires.
It was generous of you, and I shall repay it in due season.
My thanks, {title}; the favour has been duly noted.`),
		apology: L(`
I beg your pardon, {title} {name}; the fault lies entirely with me.
Please accept my formal apology for the offence, which was not intended.
I acknowledge my error, {title}, and will make amends as custom demands.
Forgive the lapse, {title} {name}; it shall not be repeated.
I regret the matter deeply and place myself at your disposal to set it right.
The slight was mine, {title}; I ask that you hold it against no one else.`),
		agree: L(`
I find myself in complete agreement with you, {title} {name}.
Your reasoning is sound, {title}, and I see no cause to object.
Let it be done as you propose; I consider the terms acceptable.
That is correct, {title}, and I would add my voice to yours.
I concur, {title}, and will say so before any who ask.
The proposal has my full consent and support.
It stands to reason, {title} {name}; I accept it.`),
		refuse: L(`
I regret that I am unable to comply, {title}, for reasons of duty and custom.
With the greatest respect, {title} {name}, I must decline.
It would be improper of me to agree, and I trust you will understand.
I cannot, {title}; my obligations to {realm} do not permit it.
Much as I honour you, {title}, the answer must be no.
I am not at liberty to grant that, and I would not mislead you by pretending otherwise.
The request is refused, {title}, though not without regret.`),
		praise: L(`
{title} {name} has conducted this matter with exemplary skill and restraint.
Few in {realm} could have done as well, and none with greater dignity.
It is to your lasting credit, {title} {name}, and so I shall say before others.
Your conduct reflects honour upon your house and upon {town}.
A most distinguished performance, {title}, worthy of the record.
You have earned the respect of all who witnessed it, {title} {name}.
Such diligence deserves public acknowledgement, and it has mine.`),
		insults: L(`
You are a disgrace to your station and an embarrassment to your name.
Your conduct is unworthy of any person of standing in {realm}.
I find you incompetent, graceless, and wholly lacking in shame.
You have the manners of a tax-collector and the wit of a fence-post.
A person of so little breeding should not be received in {town}.
Your word is worth less than the page it is written on.
You are a fraud, {name}, and I shall say so before the assembly.
Nothing about you, from your title to your temper, deserves the respect you demand.`),
		curses: L(`
May your name be struck from every register in {realm}.
May your house fall into debt and your debts into the hands of strangers.
May your heirs inherit nothing but your reputation.
May no door in {town} open to you, and no table be laid.
May your seal be doubted and your signature forged.
May the courts of <god> find against you in every suit.
May your lineage be forgotten before the next generation is named.
May you be remembered only in the footnotes of better people.
May every petition you file be lost between two desks.
May your witnesses forget your face when you need them most.`),
		oaths: L(`
I swear it upon my name and the name of my house.
Before witnesses and in the sight of <god>, I give my word.
Upon my honour, which I hold above my life.
I swear before <god>, it is true.
By the seal of my office, I affirm it.
By {deity}, and by every oath I have sworn before this.
I pledge it formally, and let the record show it.
Let my seat in the hall stand empty if I break this word.
I bind my house to this pledge, in open daylight.`),
		fillers: L(`
as is proper
if I may say so
to be precise
with respect
as the custom has it
in all fairness
properly speaking`),
		gossip: L(`
I would not repeat it without cause, {title}, but it is said that
It has come to my notice, and I mention it only in confidence, that
Those who keep careful records tell me that
A matter of some delicacy, {title}: I am told that
You did not hear this from me, {title} {name}, but
Reliable persons in {town} have remarked that`),
		humour: L(`
Formal humour: a carefully built sentence delivered with a straight face and a pause for appreciation.
Wit is quoted, not improvised: old lines from the courts and a mock-solemn reading of the rules.
Humour is understated and polite, aimed at procedure, rank and one's own pomposity.`),
		address: [
			{ formal: '{title} {name}', familiar: '{name}' },
			{ formal: 'Honoured {title} {name}', familiar: 'Master {name}' }
		],
		barks: BARKS(`
market: Fair weights and fair prices, as the market law requires. | Please have your goods inspected before the bell, and do not obstruct the aisle. | Every measure here is stamped and certified, by order of {realm}. | I must ask you to form an orderly line; each will be served in turn. | The scales are open to inspection by any buyer, without charge.
guard: Kindly state your business within {town}. | Weapons are to be declared at the gate, as the ordinance directs. | I must request that you proceed in an orderly manner. | The watch has been instructed to be courteous, and also thorough. | Your papers, if you please, and then you may pass.
tavern: The house requests that disputes be settled outside, and in writing. | Allow me to recommend the stew; it has been consistently reliable. | A round for the table, and a quiet corner for the gentleman? Very good. | We close at the bell, as the licence requires. | The company here is respectable; we shall keep it so.
temple: Please lower your voice; the rites are in progress. | Offerings are received at the left, and with dignity. | Kindly remove your hat and your weapons before approaching the altar. | The ceremony will commence at the appointed hour and not before. | All who enter are asked to observe the proper order of precedence.
road: Travellers are advised that the next stage is a full day's walk. | The road is maintained by order of {realm}; kindly report any damage. | Please keep to the right and yield to carts and officials. | A toll is due at the next post, and receipts will be issued. | I would advise against the lower track after dark; the surface is poor.
night: The hour is late, and honest persons are generally abed. | Curfew has been called; I must ask that you return home. | A quiet night, thank you; I record it as such. | Please do not trouble the lamp-lighters; they have a long route. | I shall note that all is well in {town}.
rain: It is raining again; the drains were inspected last month, regrettably. | One does not complain of rain, but one does remark upon it. | Kindly mind the step; the stones are slippery. | The weather, as always, ignores the almanac. | Shelter is available beneath the arcade for those who ask politely.
crowd: Please make way for the procession; there will be room for all. | Kindly refrain from pushing; precedence will be observed. | The assembly will proceed in order of rank, then of arrival. | A great turnout, and a tolerably well-behaved one. | Silence, please, for the reading of the notice.
smith: Quality takes time, and I do not hurry it. | The commission is in order; you will have it by the appointed day. | Kindly stand clear of the forge; it is a hazard to the unprepared. | Each piece bears my mark, and I answer for it. | A good edge is a matter of method, not temper.
farm: The boundaries were set by survey and are recorded in the register. | The harvest will be brought in according to the established schedule. | Please close the gate; the livestock are accounted for and should remain so. | I keep careful accounts of every sack and every head. | The soil is tolerable; the tax, less so.
harbor: Vessels will be berthed in order of arrival, per harbour regulation. | The manifest must be filed before unloading commences. | The tide table is posted; kindly consult it before complaining. | All cargo is subject to inspection and duty. | The harbourmaster will receive you presently.
school: Attention, please; the lesson will begin when all are seated. | Copy the passage precisely, including the errors; they are instructive. | The exercises are due at the bell, and not a moment after. | A pupil who asks a question is a pupil who is learning. | Recite from the beginning, and do not skip the difficult parts.`)
	},
	blunt: {
		greet: L(`
Well met, {name}.
State your business.
Good {time}. What do you want?
{name}. Sit if you will.
You're here. Good.
Hello. Make it quick.
Ah, {name}. What now?
{time}. Speak.
You look rough, {name}. Come in anyway.
Right. I'm listening.
Step inside, {name}, and shut the door.
Say your piece, {name}.
Still standing, {name}? Good.
Come on then, {name}, out with it.`),
		farewell: L(`
Go.
Leave when you're ready, {name}.
Walk safe.
Done here. Off you go.
See you, {name}. Don't be late next time.
That's all. Go well.
Watch your back out there.
Enough talk. Go.
Keep your boots dry, {name}.
Road's waiting. Move.
Until next time. Stay sharp.`),
		thanks: L(`
Good. I owe you.
Thanks. I mean it.
You did well. Thanks.
I'll remember this, {name}.
That helped. Thanks.
Fair. You have my thanks.
Right, we're even. Almost.`),
		apology: L(`
My fault.
I was wrong, {name}. Sorry.
That was stupid of me. Sorry.
I'll fix it. Sorry.
Wrong of me. It won't happen again.
I mean no harm. Forgive it.`),
		agree: L(`
Yes.
Agreed.
Fine by me.
That's right.
Done.
You're not wrong, {name}.
Aye, do it.`),
		refuse: L(`
No.
Not a chance.
I won't, {name}. Ask something else.
Never.
Find another fool.
That's a no, and I'm not changing it.
Not for that price. Not for any.`),
		praise: L(`
Well done.
Good work, {name}.
That took guts.
You can stand with me anywhere.
Solid.
Not bad at all.
You've earned it.`),
		insults: L(`
Fool.
You couldn't hit a barn from inside it.
Coward and a liar, both.
Get out of my sight, you waste of breath.
You're all mouth, {name}.
Slow, stupid and proud of it.
Your mother raised a pest.
Useless. Absolutely useless.`),
		curses: L(`
Rot.
Choke on it.
Damn you, and damn your luck.
May you walk the long road alone.
Break your neck, {name}.
Black luck on you.
Ruin and rot on your house.
Be gone, and stay gone.`),
		oaths: L(`
On my life.
I swear it.
By <god>, I'll do it.
My word. That's all I've got.
On my word and my hands.
By {deity}, I mean it.
I give my word. Break it and I'm dead to you.`),
		fillers: L(`
look
right
listen
well
aye
here's the thing
straight up`),
		gossip: L(`
Word is
I heard
Don't repeat it, but
Here's what they say:
You didn't hear it from me, but
Plain fact, then:`),
		humour: L(`
Blunt humour: short flat jabs and teasing insults between friends; if it does not insult, it is not affection.
Jokes are one line long and land like a slap on the back; nobody explains them.
Humour is mockery of whoever is slowest, delivered without a smile.`),
		address: [
			{ formal: '{title} {name}', familiar: '{name}' },
			{ formal: '{title}', familiar: '{name}, you' }
		],
		barks: BARKS(`
market: Buy or move on. | Fresh. Cheap. Pick one. | No haggling. Price is the price. | Hands off the goods. | Coin first, then goods.
guard: Halt. State your name. | Move along. | No weapons drawn. Not here. | Trouble and you're out. | Gate's shut at dusk. Don't be late.
tavern: Sit. Drink. Don't fight. | Pay up before you pass out. | Hot food's gone. Cold's left. | Spill it, you clean it. | Last call. Drink up.
temple: Quiet in here. | Offerings by the door. | Pray or leave. | Hats off. | Priest's busy. Wait.
road: Long way yet. | Road's bad past the ridge. | Keep moving. | Toll's due. Don't argue. | Bandits out there. Stay close.
night: Lock your door. | Nothing good happens after dark. | Lights out. | Keep quiet out there. | Dawn can't come soon enough.
rain: Wet again. | Rain won't stop. Neither will work. | Mud to the knees. | Get under cover. | Good for crops. Bad for everything else.
crowd: Push and I push back. | Make room. | Too many people. | Watch your purse. | Quiet. Listen.
smith: Hammer's hot. Back off. | Good steel takes time. | Pay up, take it, go. | I don't make toys. | It'll hold. It'll hold.
farm: Work's not done. | Feed the beasts first. | Rain's late. Bad sign. | Fence is down again. | Gate shut. Always shut.
harbor: Ship's in. Unload. | Tide waits for nobody. | Rope's loose. Fix it. | Cargo first. Talk later. | Gulls got the fish again.
school: Sit. Listen. | Again. Do it again. | No talking. | Get it right. | Class is over. Go.`)
	},
	flowery: {
		greet: L(`
May the {time} open before you like a garden, {name}.
Greetings, {name}; your arrival is a lamp lit in a dark window.
Bright {time} to you, {name}, and may joy follow you like a loyal river.
Welcome, welcome, {name}; the house blooms because you walked into it.
I greet you, {title} {name}, whose name is a song in {town}.
The {time} bows to you, {name}, as the grass bows to the wind.
Hail, {name}, a pearl on the thread of my day.
May every road you walk be paved with kind weather, {title}.
Sweet {time}, {name}; the very stones are glad to hear your step.
You come like spring to a frozen street, {name}.
Blessings on the threshold that brings you here, {name}.
Ah, {name}, the lanterns burn brighter for your company.
May the {time} pour gold upon your shoulders, {title} {name}.`),
		farewell: L(`
Go, {name}, and may the wind be a gentle hand at your back.
Part we must, as the river parts the shore, but we shall meet at the sea.
May your path unroll like silk, {title} {name}.
The door is a wound when you walk through it; return and heal it.
Farewell, bright one; my thoughts will follow you like birds.
May the stars keep watch over your sleeping, {name}.
Until the moon is round again, dear {name}.
Walk in light, and may the evening be soft as a cloak.
May every mile shorten itself beneath your feet, {name}.
Go with music in your ears and a warm hearth ahead, {title}.`),
		thanks: L(`
Your kindness is rain upon my dry fields, {name}.
A thousand thanks, and each one as warm as a hearthstone.
You have planted a blossom in my heart, {title}.
My gratitude is a river that has no end, {name}.
Words are poor coin for such a gift, yet I pay them gladly.
You have made my day a feast, {name}.
May your generosity return to you tenfold, like seed in good earth.`),
		apology: L(`
Forgive me, {name}; my words fell like stones into still water.
I wounded you, and the wound is mine to carry. Forgive me.
A thoughtless moment has bruised the petal; I beg your mercy.
I would unsay it if the wind would carry it back to me.
My tongue stumbled, {name}; my heart did not.
Let my sorrow be the bridge by which I return to you.`),
		agree: L(`
Your words are honey on the tongue, and I say yes.
Yes, as the river says yes to the sea.
It is so, {name}, as surely as the sun climbs.
My heart sings the same song as yours.
Let it be so, and let it blossom.
I lay my agreement at your feet like fallen petals.
You have spoken truth, and truth is a clear bell.`),
		refuse: L(`
I cannot, {name}, though my heart weeps to say it.
The door of my answer is closed, yet the garden outside it is yours.
A cloud has crossed my willingness; it will not clear today.
Dear {name}, the river cannot flow uphill, nor can I agree.
I must refuse, as the winter must refuse the flowers.
No, gentle {name}; ask the wind, which is kinder than I.
My hands are open, but this one thing they cannot hold.`),
		praise: L(`
You shine like a lantern on dark water, {name}!
Your deeds are a song the children of {town} will sing.
A heart of gold and a hand of silver, {title} {name}.
You carry yourself like a banner in the morning wind.
Such splendour! The very sky stands taller for it.
Your courage is a mountain, and your kindness the spring beneath it.
Let the bards put this in verse, for prose cannot hold it.`),
		insults: L(`
You are a withered reed in a dry riverbed.
Your wit is a candle in a gale, and the gale has won.
You are a thistle in the garden of {town}.
Your heart is a cracked jug that holds no water.
A crow has more music in him than you have sense.
You are the stain on the silk, the worm in the rose.
Your words fall like rotten fruit, and smell the same.
You are a cloud with neither rain nor shade.`),
		curses: L(`
May your rivers run dry and your orchards bear only thorns.
May your name wither on every tongue like a flower in frost.
May the moon turn her face from you for a hundred nights.
May the wind carry your lies to every ear in {realm}.
May your songs choke and your lamps gutter in the night.
May your heart be a house where no fire is ever lit.
May the earth refuse your seed and the sea refuse your ship.
May you walk a road of mirrors and meet only yourself.`),
		oaths: L(`
By the bright sky above and the earth below, it is true.
By every flower that ever bloomed, I swear.
As the sun returns each morning, so shall I keep my word.
By {deity}, whose light I follow.
By the river of my fathers, I do not lie.
Let the stars strike me dark if I speak falsely.
I swear it on the sweetest song I know.`),
		fillers: L(`
as the poets say
like a blossom
my dear
ah, the sweet truth is
in the light of the day
as if it were a song
you see, the heart of it is`),
		gossip: L(`
The wind whispers, and I listen, that
A little bird in silk feathers told me that
They say, in the soft hours of the {time}, that
Oh, the tale that drifts through {town}:
Between you, me and the lamplight:
A rumour, sweet as a ripe plum:`),
		humour: L(`
Flowery humour: elaborate mock praise and absurd metaphors, an insult wrapped in so much silk it is hard to find.
Jokes are comparisons stretched until they snap: the target is some creature in a garden, and the laugh is the gardener's.`),
		address: [
			{ formal: 'Radiant {title} {name}', familiar: '{name}, my heart' },
			{ formal: 'Bright {title} {name}', familiar: 'dear {name}' }
		],
		barks: BARKS(`
market: Silks soft as a sigh, spices sweet as a promise! | Come, come, the finest of the {town} harvest sings to you! | A bargain so fair it should be framed in gold! | Taste, and your tongue will compose a poem. | Prices that fall like petals, friend!
guard: Peace to you, traveller; but peace needs a name at the gate. | The gate is a mouth; it asks who you are before it swallows you. | Pass, and may the road be a river for you. | A sharp spear guards a gentle town, friend. | Be a flower in {town}, not a thorn.
tavern: Our ale is liquid sunshine and our stew a hug in a bowl! | Sit, sit; the fire has been waiting for you all {time}. | Let the cups be rivers and the company a sea. | Another round! The songs will not sing themselves. | Drink deep, for the night is a long, sweet song.
temple: Hush, for the heavens lean close to listen. | Lay your heart on the altar like a flower. | The lamps burn like prayers that learned to dance. | Here the soul washes in light. | Come, child of the dust, and be reminded of the stars.
road: The road unrolls like a ribbon; follow it to wonder. | Every milestone is a verse in the long poem of the world. | The hills ahead wear mist like a bride's veil. | May your boots be as light as clouds. | Beyond that bend, the world keeps its best secrets.
night: The stars are scattered gems; has the sky been robbed? | Sleep, {town}; the moon keeps the watch tonight. | The night wraps the roofs like a dark velvet cloak. | A lantern is a small sun for small hours. | Hush now; even the wind tiptoes at this hour.
rain: The sky weeps silver, and the earth drinks gladly. | Listen: a thousand tiny drums on the roof! | The rain is the sky's long, wet poem. | Let it fall; every drop is a seed of green. | The gutters sing, and the puddles hold the heavens.
crowd: A river of people, and every drop a story! | Such a blossoming of faces! | The square hums like a hive in spring. | Sing out, {town}, the whole sky is listening! | Joy has a thousand throats today.
smith: See how the sparks dance, like stars set free! | Iron sings when kissed by fire, and I am its bard. | Each blade is a song waiting for a hand. | The hammer's rhythm is the heartbeat of the town. | Out of flame and fury, beauty is born.
farm: The earth wakes like a sleeper, yawning green. | See the wheat bow in the wind, like courtiers! | Rain-blessed soil, mother of all feasts. | The furrows are lines of a poem the plough writes. | Every seed is a promise whispered to the dark.
harbor: The sea breathes, and the ships rise and fall with her sighs. | Sails like swan wings, hulls like sleeping whales! | The gulls cry the names of far countries. | Every wave brings a letter from the horizon. | The tide is the moon's long fingers on the shore.
school: Little buds, open your minds to the sun of learning! | Each letter is a seed; plant it with care. | Knowledge is a lamp, and you will carry it far. | The slate is a field; write your harvest. | Listen, for the old words glitter like fish in a stream.`)
	},
	terse: {
		greet: L(`
{name}.
Hail.
{time}.
Speak.
Yes?
Here.
Well?
Welcome. Brief.
{title}.
Come in. Quiet.`),
		farewell: L(`
Go.
Gone.
Later.
Safe road.
Done.
Leave.
Fare well.
Move on.`),
		thanks: L(`
Thanks.
Owed.
Noted.
Good.
Fair.
Gratitude.
Remembered.`),
		apology: L(`
Sorry.
My fault.
Regret.
Wrong.
Forgive.
Mistake. Mine.`),
		agree: L(`
Yes.
Agreed.
So.
Aye.
Good.
True.
Done.`),
		refuse: L(`
No.
Never.
Refused.
Not so.
Cannot.
Enough.
Leave it.`),
		praise: L(`
Good.
Well done.
Strong.
Skilled.
Worthy.
Respect.
Fine work.`),
		insults: L(`
Fool.
Wretch.
Weak.
Liar.
Coward.
Waste.
Dog.
Nothing.`),
		curses: L(`
Rot.
Freeze.
Ash.
Starve.
Drown.
Be forgotten.
Fall.
Gone and cold.`),
		oaths: L(`
My word.
I swear.
By {deity}.
Sworn.
On my life.
By <god>.
True.
My bond.
On my name.`),
		fillers: L(`
so
well
hm
yes
aye
quiet
enough`),
		gossip: L(`
Heard:
Word:
Quiet, now:
Rumour:
Say this:
Pass it on:`),
		humour: L(`
Terse humour: one dry word at the right moment, then a long silence that does the rest.
The joke is in what is left unsaid; a raised eyebrow counts as a whole routine.`),
		address: [
			{ formal: '{title}', familiar: '{name}' },
			{ formal: '{title} {name}', familiar: 'you' }
		],
		barks: BARKS(`
market: Buy. | Fresh. | Cheap, today. | Weigh it. | Pay.
guard: Halt. | Name? | Pass. | Hold there. | Quiet.
tavern: Drink. | Sit. | Pay first. | Full tonight. | Closing.
temple: Quiet. | Pray. | Kneel. | Offer something. | Leave.
road: Far yet. | Mud. | Wind. | Toll ahead. | Careful.
night: Dark. | Sleep. | Watch. | Still. | Cold.
rain: Wet. | Mud. | Rain again. | Cold rain. | Shelter.
crowd: Move. | Crowded. | Listen. | Hush. | Mind your feet.
smith: Hot. | Hammer. | Good steel. | Wait. | Done.
farm: Sow. | Reap. | Dry year. | Feed them. | Close the gate.
harbor: Tide. | Rope. | Haul. | Sail. | Fish.
school: Write. | Repeat. | Again. | Silence. | Learn.`)
	},
	earthy: {
		greet: L(`
Well, if it isn't {name}, fat as a <beast> in spring!
Morning, {name}! You smell like <work>.
Ho there, {name}, come sit and get your boots dirty.
Eh, {name}, still alive? Good, the stew's not done.
{name}! Look at you, thin as a winter <beast>.
Good {time}, {name}. Eat something.
Come in, come in, you're letting the <weather> in.
How goes it, {name}? Hands full or belly empty?
There's the face I was hoping for, {name}, ugly as ever.
Sit down before you fall down, {name}.
Pull up a stool, {name}; the kettle's just singing.
Good {time} to you, {name}! Wipe your boots or don't, I've given up.
Ah, {name}, just in time to help lift something heavy.`),
		farewell: L(`
Off you go, then, and mind the mud.
Go on, {name}, before the stew gets cold.
Take some bread with you, you'll need it.
Walk easy, {name}, and don't step in anything.
Good night to you, and warm feet.
Come back when you're hungry. That'll be soon.
Mind the <beast>s on the road, {name}.
May your belly be full and your roof dry.
Keep the <weather> off your back, {name}.
Shut the gate on your way out, mind.`),
		thanks: L(`
Bless you, {name}, that's worth a loaf.
You're a good one, {name}. I'll bring you a <beast> for it.
That's kind, and I won't forget it, not even when I'm old and daft.
Thanks, friend. I owe you a drink. And a meal.
Good as bread, that was.
Warm hands, warm heart, {name}.
I'll pay you back at harvest, mark me.`),
		apology: L(`
Sorry, {name}. I'm a clumsy ox sometimes.
My mouth ran off without me. Sorry.
That was daft of me. Forgive an old goat.
I stepped in it, didn't I. Sorry, {name}.
Don't stay cross with me. I'll bake you something.
My fault, plain as mud.`),
		agree: L(`
Aye, that's the way of it.
Right as rain, {name}.
You've got the right of it.
Quite so, as the <beast> said.
Fair as a loaf, that.
Sounds sound to me.
Can't argue with a full belly, can I?`),
		refuse: L(`
Not on your life, {name}. I'm not a fool.
You'd get more milk from a stone.
No, and that's final as frost.
I'd sooner kiss a <beast>.
Not today, not tomorrow, not at harvest.
Ask me again when pigs fly, and bring a ladder.
That's a daft idea and I won't touch it.`),
		praise: L(`
There's a good sort, {name}, worth their weight in grain.
You're strong as a <beast>, and nearly as clever.
That's a fine piece of work, that is!
Well done. Come eat.
You've got a heart bigger than your belly.
Salt of the earth, {name}.
That deserves a drink and a second helping.`),
		insults: L(`
You great lumbering ox.
You've got the brains of a boiled turnip.
Spawn of a muddy sow.
You stink worse than a wet <beast>.
Pot-bellied, slack-jawed, empty-headed lump.
You're as much use as a hole in a bucket.
A cow would show better sense.
Dung-footed, stew-wasting pest.`),
		curses: L(`
May your cows go dry and your bread fall flat.
May your roof leak and your <beast> run off.
May the frost take your seedlings.
May you eat sour milk till you die.
Fleas in your bed and mice in your flour!
Burn your porridge and bruise your knees.
Rot in a ditch and feed the crows.
May your well go bad.`),
		oaths: L(`
By my mother's bread.
By the grain and the grave, it's true.
As sure as the sun comes up over <land>.
By <god>, I'll eat my boots if it's false.
On my best <beast>.
Cross my belly and hope to starve.
By the earth under my feet.`),
		fillers: L(`
mind you
like
you know
right enough
what with
there's a thing
I'll tell you what`),
		gossip: L(`
Heard it at the well, so it must be true:
Old {name}'s wife says
You'll not believe it, but
They're saying down at <work>:
Over the fence I heard that
Spilled with the soup, this:
The baker's boy swears that
I got this straight from the road:`),
		humour: L(`
Earthy humour: bawdy, loud and full of food, animals and bodily trouble; the best joke is at one's own expense.
Jokes come out as stories about stubborn animals and worse neighbours, told at the table with much elbowing.`),
		address: [
			{ formal: 'good {title} {name}', familiar: 'old {name}' },
			{ formal: '{title} {name}', familiar: '{name}, friend' }
		],
		barks: BARKS(`
market: Fresh eggs, still warm! | Cheese that'd knock out a <beast>! | Pick it yourself, don't poke mine. | Best onions in {town}, and I'm no liar. | Half a loaf for a song, a whole for two.
guard: Mind where you put your feet, friend. | Don't make me spill my breakfast. | Hold on there, what's in the cart? Smells good. | Quiet night so far. Fed the dog, too. | Go on through. Wipe your boots.
tavern: Stew's hot, the ale's warm, the company's loud. | Who's been at my <beast>'s bucket? | Another jug, and a heel of bread. | Sing it loud or don't sing it. | Mind the dog, he bites. Sometimes.
temple: Put the offering in the bowl, not your pocket. | Bless the harvest and bless the stew. | Sit down, the priest's got a cold again. | Pray for the rain, pray for the lambs. | Keep your belly quiet, there's a rite on.
road: Mud to the shin, all the way to market. | Watch for <beast> dung. | Long road, short bread. | A cart's broken down ahead. Again. | Beautiful day for walking, if you like wet feet.
night: Dogs are barking. Something's about. | Shut the barn, bank the fire. | Stars thick as flour tonight. | Owls out, mice running. | Bed's warm. Go to it.
rain: Rain's good for the barley, bad for the boots. | Wet as a drowned <beast> out here. | Stay in, have some soup. | Ducks are happy, nobody else. | Thatch is leaking again.
crowd: Elbows out, folks! | Smells like a hog fair in here. | Somebody's pie is burning. | Shove along, I've got a hungry brood. | Good crowd. Good for pickpockets, too.
smith: Hammer in, soot on, sweat down. | Fresh nails, plough tips, horseshoes. | A good blade is like a good stew: slow. | Mind the sparks, they bite like wasps. | Bring me the pot, I'll mend it.
farm: Cows need milking, always. | Grass is high, grain is ripe. | Pigs got out again. | Hands in the dirt, that's the work. | Muck on your boots means a good day.
harbor: Fish by the bucket! Smell it from here! | Gulls have been at the herring. | Nets need mending, always. | Salt air, salt hands, salt tongue. | Boats in, bellies out.
school: Don't chew your slate, it's chalk, not cheese. | Sit up, you sack of flour. | Count it on your fingers, then on your toes. | No sleeping, we're nearly done. | Letters first, supper after.`)
	},
	courtly: {
		greet: L(`
If it would not trouble you, {title}, I would wish you a gentle {time}.
I hardly dare presume, {title} {name}, but I am glad to see you well.
Your presence honours this humble place, {title}.
One could not wish for a more auspicious {time}, {title}, than this.
May I be so bold as to bid you welcome, {title} {name}?
Pray, {title}, do not rise on my account.
It is whispered you are in town; I rejoiced to hear it, {title}.
Allow me to say how well the {time} suits you, {title}.
I would not intrude, {title}, but it would be churlish not to greet you.
The very walls brighten for you, {title} {name}.`),
		farewell: L(`
If you must go, {title}, I shall count the hours until your return.
I would not detain you, {title}, though I wish I could.
Pray, remember me kindly when you are among better company.
You will, I hope, forgive a poor host for a poor farewell.
May fortune walk before you, {title}, and I behind.
The {time} is poorer for your leaving, {title} {name}.
I shall take your leave as granted, {title}, with great reluctance.
Think of us now and then, {title}, as we shall think of you.`),
		thanks: L(`
You are too kind, {title}, far kinder than I deserve.
I scarcely know how to thank you, {title} {name}.
Your generosity does me more honour than I can repay.
I shall carry the memory of your favour, {title}.
It is more than I could ask, and you gave it unasked.
One hardly dares thank so great a kindness; one only treasures it.
You overwhelm me, {title}, and I bow.`),
		apology: L(`
I would not have offended you for the world, {title}; pray forgive me.
I fear I have been clumsy, {title}, and I blush at it.
Would that I could withdraw the word; I cannot, so I ask your mercy.
I am quite undone by my own discourtesy, {title}.
Pray believe that no slight was ever meant, {title} {name}.
I place myself at your mercy and your gracious silence.`),
		agree: L(`
It would be unseemly of me to differ from you, {title}.
You are, as ever, perfectly right, {title}.
If you consider it so, then so it must be.
I could not have put it better, nor half so well.
I yield most gladly to your judgment, {title}.
As you say, {title}; I would not presume otherwise.
Your wisdom rather makes the question redundant.`),
		refuse: L(`
I fear that may not be possible, {title}, though I wish it were.
It grieves me to disappoint you, {title}, but I must.
Perhaps another time, {title}, when circumstances are kinder.
I am afraid it lies beyond my poor ability.
I should dearly love to, {title}, and yet I cannot.
You must forgive me if I seem unwilling; it is only unwise.
Would it offend you very much if I did not?`),
		praise: L(`
It was delicately done, {title}; one scarcely noticed the skill.
Your grace in this matter is the talk of {town}.
One can only admire how effortlessly you managed it, {title}.
You do {realm} honour, {title} {name}.
The court has seldom seen such refinement.
I am in awe of your tact, {title}.
A masterly touch, {title}; I shall say so wherever I am heard.`),
		insults: L(`
Some people are born to the manner, others merely to the manor.
One hesitates to call you a boor, but the word insists.
You have the grace of a dropped tray.
It is remarkable how little you understand of how much.
Your taste is as tedious as your company.
I would call you a rogue, but rogues have charm.
How very brave of you to wear that.
You are, if I may be candid, a disappointment in every key.`),
		curses: L(`
May your invitations dwindle and your enemies be well-bred.
May your name be mispronounced at every banquet.
May you be seated below the salt at every feast.
May your debts be forgiven by no one.
May the court forget you, and remember only your errors.
May your secrets be known and your virtues forgotten.
May the door of every pleasant house be closed to you, softly.
May no one ever quite meet your eye.`),
		oaths: L(`
Upon my honour, if I have any.
By {deity}, and by the esteem in which I hold you.
I give my word, as one gives a gift, freely.
On my family's good name, I swear it.
By all that is gracious, it is true.
I swear it by the favour of <god>.
Let me be unwelcome at every door if I lie.
Upon the grace of this house, I pledge it.
Let my name never be spoken in good company if I prove false.`),
		fillers: L(`
if I may be so bold
forgive me
one might say
pray
as it were
with your permission
it seems to me`),
		gossip: L(`
Forgive me if I tell you what I should not:
It is whispered, with great discretion, that
I would never say it, but they do:
A delicate rumour, passed from hand to glove:
One hears, though one ought not to listen, that
Between friends, and in the strictest confidence, {title}:`),
		humour: L(`
Courtly humour: veiled barbs wrapped in compliments, so polite the target thanks you before they understand.
Wit is allusive and light: a raised fan, a long pause, an apparent compliment that cuts.`),
		address: [
			{ formal: 'Most Gracious {title} {name}', familiar: 'dear {name}' },
			{ formal: 'Esteemed {title}', familiar: '{name}, if I may' }
		],
		barks: BARKS(`
market: May I show you something fine, if it would please you? | Our wares are modest, but we hope they may be found worthy. | Perhaps the {title} would care to examine the cloth? | A small trifle, a great honour, and a fair price. | Do take your time; I would not rush a person of taste.
guard: Pray, forgive the inconvenience; I must ask your name. | The gate is, alas, rather strict about visitors. | I do hope you will not take offence at the search. | You may pass, with my compliments. | A fine {time} to you, and my apologies for the delay.
tavern: May I suggest the corner table, where the draught is gentler? | The house hopes the wine is to your taste. | We shall have your supper brought at once, if you can wait. | A quiet song, perhaps, for the company? | Do remain as long as you like; the fire is yours.
temple: Pray enter softly; the gods are easily startled. | We hope your offering will be pleasing, in whatever size. | Kindly follow the priest's lead; he will be graceful about your errors. | The ceremony is delicate; one asks for stillness. | Please accept this blessing, which costs you nothing.
road: Forgive me, but the road ahead is rather ungracious. | An inn awaits, a little way on, with tolerable beds. | If you are bound for {town}, I pray you travel well. | Do mind the mud; it has no manners. | A pleasant day for travelling, if one is brave.
night: The hour grows late; shall I light you home? | Might I suggest that discretion advises an early bed? | The streets are quiet; I fear they are also watching. | A gentle night to you, and to your dreams. | The watch has been told to be gracious.
rain: It rains, I fear; may I offer you shelter? | The sky is rather indelicate this {time}. | Pray, take my arm; the cobbles are treacherous. | A wet evening, but a fine excuse for company. | One cannot hold it against the rain; it knows no better.
crowd: Pardon me, might I pass? I mean no offence. | The crowd is, alas, rather large and rather warm. | Would you be so kind as to make a little room? | What a splendid gathering; I could weep. | Everyone is here; I am almost embarrassed for the rest.
smith: I would be honoured to make it, if you would trust me. | A fine commission, and a finer patron. | It is not ready, but it will be worthy of you. | Pray stand back; a spark is a poor courtier. | The blade will arrive as soon as perfection allows.
farm: The soil, I fear, is modest; it does its best. | The harvest, with luck, will be pleasing. | We do hope the livestock have not disturbed your walk. | The orchard is at your disposal, if you wish to pick. | We are humble folk, but our bread is warm.
harbor: The ships are in, though not, alas, on time. | Pray be careful on the quay; the planks are shy. | The harbourmaster will receive you shortly, with his regrets. | A fine vessel, if I may say; she wears her sails well. | The tide has promised to cooperate.
school: Pray, take your seats; it would be a pity to begin without you. | The master hopes that diligence will not prove too wearisome. | A fine question; I wonder you had not asked it sooner. | Shall we attempt the lesson once more, with feeling? | You may be excused, if you promise to return wiser.`)
	}
};

// ---------- genre ----------

export interface GenreBank {
	lex: Record<string, string>;
	greet: string[];
	farewell: string[];
	thanks: string[];
	apology: string[];
	agree: string[];
	refuse: string[];
	praise: string[];
	insults: string[];
	curses: string[];
	oaths: string[];
	fillers: string[];
	gossip: string[];
	barks: Record<string, string[]>;
	proverbs: string[];
	idioms: { say: string; meaning: string }[];
}

interface GIn {
	lex: string;
	greet: string; farewell: string; thanks: string; apology: string; agree: string; refuse: string; praise: string;
	insults: string; curses: string; oaths: string; fillers: string; gossip: string; barks: string; proverbs: string; idioms: string;
}
const lexOf = (s: string): Record<string, string> => {
	const o: Record<string, string> = {};
	for (const part of s.split(';')) {
		const [k, v] = part.split('=');
		o[k.trim()] = v.trim();
	}
	return o;
};
const G = (b: GIn): GenreBank => ({
	lex: lexOf(b.lex), greet: L(b.greet), farewell: L(b.farewell), thanks: L(b.thanks), apology: L(b.apology), agree: L(b.agree), refuse: L(b.refuse), praise: L(b.praise),
	insults: L(b.insults), curses: L(b.curses), oaths: L(b.oaths), fillers: L(b.fillers), gossip: L(b.gossip), barks: BARKS(b.barks), proverbs: L(b.proverbs), idioms: IDIOMS(b.idioms)
});

export const GENRE: Record<Genre, GenreBank> = {
	fantasy: G({
		lex: 'coin=silver;drink=ale;bad=the crown reeves;power=the old magic;hall=the hall;god=the gods;folk=good folk;metal=iron;road=the road;home=the hearth;vermin=rats;light=lamplight',
		greet: `
Well met on the road, {name}.
The hearth is warm and the door is open, {name}.
Good {time}, {name}; may the gods keep you.`,
		farewell: `
May the road rise to meet you.
Go safely, and mind the old trees.
The gods keep you, {name}, till next we meet.`,
		thanks: `
The gods bless you for it, {name}.
A good deed, and a good turn: I'll repay it.`,
		apology: `
By the hearth, I was wrong, {name}.
The gods forgive me, and I hope you do.`,
		agree: `
By my sword, you speak well.
As the old law says, so I say.`,
		refuse: `
Not by my hearth and not by the gods.
I'll not do it, {name}, not for silver nor for fear.`,
		praise: `
A hero's heart, {name}, worth a song.
The gods smile on a deed like that.`,
		insults: `
You hedge-born knave.
You pup of a goblin.
You mud-wading, ale-soaked oaf.
Spawn of a sheep-stealing cur.`,
		curses: `
May the old magic wither you.
The crows take you.
May the barrow-wights have your bones.
May no hearth ever warm you.`,
		oaths: `
By the old gods, I swear.
By iron and by fire, it is true.
By the hearth and the road, I keep my word.
On my sword and my name.
By {deity}, I will.
By the stones of {town}, it is done.`,
		fillers: `
by the hearth
aye, truly
as the old tale goes`,
		gossip: `
A peddler on the road swore that
They say in the {town} taproom that`,
		barks: `
market: Fresh bread, honey and herbs, straight from the fields! | Charms against the evil eye, a copper each!
guard: Halt in the name of {realm}. | The wolves have been bold. Keep to the road.
tavern: The minstrel plays at dusk, and the mead is good. | They say a dragon was seen over the hills.
temple: The gods hear every whisper, so mind yours. | Light a candle for the road ahead.
road: Beware the wolves in the high wood. | The old stones mark the way.
night: Wights walk the barrow-fields. Stay in. | The moon is full; the dogs know it.
rain: The gods are weeping again. | Rain on the thatch, a good night for a tale.
crowd: Make way for the herald of {realm}! | Fine day for a fair.
smith: Good iron, and ash-wood for the handle. | Swords for heroes, nails for the rest.
farm: The barley is high and the elves have been dancing. | The old stone keeps the blight off the fields.
harbor: Sails on the horizon, lads. | The sea-wives sing at dusk. Block your ears.
school: Runes first, then letters. | The old scrolls bite if you're careless.`,
		proverbs: `
A dragon sleeps lightest when the treasure is moved.
Trust the hearth over the crown.
Old roads remember the feet that wore them.
Even a wizard needs a roof.`,
		idioms: `
to light a candle for the old gods :: to hope for luck
to sleep with one eye on the dragon :: to be wary
hearth-sworn :: loyal to home
to walk the barrow road :: to risk death`
	}),
	mythic: G({
		lex: 'coin=silver;drink=wine;bad=the envious gods;power=fate;hall=the hall;god=the heavens;folk=mortals;metal=bronze;road=the way;home=the hearth;vermin=snakes;light=dawn',
		greet: `
Hail, {name}, mortal and honoured.
The gods watch our meeting, {name}.
May the heavens favour your steps, {name}.`,
		farewell: `
Go, and may fate be kind.
Farewell, {name}; let the stars remember you.
The heavens keep you, {name}.`,
		thanks: `
The gods repay what mortals cannot.
You have honoured me, {name}, as a hero honours a guest.`,
		apology: `
I offended fate and you, {name}. Forgive me.
Even the gods err; forgive a mortal.`,
		agree: `
So say the heavens, so say I.
Let it be spoken and sealed.`,
		refuse: `
Fate forbids it, {name}.
I will not, though the gods demand it.`,
		praise: `
Worthy of the heroes of old, {name}.
The poets will hear of this, {name}.`,
		insults: `
You craven shadow of a man.
Child of cowards.
Oathbreaker, wine-sodden fool.
You would flee from your own echo.`,
		curses: `
May the Furies hunt you.
May the heavens turn their faces from you.
May you drink only the waters of forgetting.
May fate tangle your thread.`,
		oaths: `
By the heavens and the earth below, I swear.
By {deity}, who sees all.
By the river of oaths, it is true.
On the bones of my fathers.
By bronze and by blood, I keep my word.
As the sun is witness, so am I true.`,
		fillers: `
so the old poets say
by fate
as the gods will it`,
		gossip: `
The oracle's servants let slip that
A wandering bard sang, half in jest, that`,
		barks: `
market: Oil, figs and wine, blessed by the harvest-god! | Amulets against fate, cheap today!
guard: Halt, stranger, and name your house. | The heroes are at the gate; stand aside.
tavern: A bard sings of the fall of a great city. | Wine for a hero, water for the rest.
temple: Pour a libation, mortal. | The oracle will see you after the sacrifice.
road: A stranger was seen on the road, with a god's eyes. | The way to the hills is long, and watched.
night: The stars are the eyes of the heavens. | Even the owls speak in omens tonight.
rain: Thunder. The heavens are angry. | Rain is the sky-father's tears.
crowd: Make way for the sacrifice! | A hero is passing. Hush.
smith: The god of the forge guides my hand. | Bronze for kings, iron for beggars.
farm: The harvest-mother has smiled this year. | Pour the first-fruits on the earth.
harbor: The ships wait for a wind from the gods. | Sea-nymphs in the bay, they say.
school: Memorize the lineages of the heroes. | Recite the ode, and do not stumble.`,
		proverbs: `
Fate is a loom, and no one sees the whole cloth.
The gods love a bold mortal and a humble one.
Pride builds tall towers for the lightning.
Even heroes die; only deeds endure.`,
		idioms: `
to cross the river's far side :: to die
to wrestle with fate :: to fight the inevitable
a hero's wage :: glory with no pay
to pour out for the dead :: to honour the lost`
	}),
	steampunk: G({
		lex: 'coin=sovereigns;drink=tea;bad=the guild-masters;power=steam;hall=the works;god=the Engineer;folk=hands;metal=brass;road=the line;home=the lodgings;vermin=soot-rats;light=gaslight',
		greet: `
Good {time}, {name}; mind the steam.
Splendid to see you, {name}, and in one piece!
How do you do, {name}? The boilers are well, I hope.`,
		farewell: `
Mind the soot, {name}.
Pressure steady, {name}, until we meet.
The Engineer keep your gears turning.`,
		thanks: `
Capital, {name}. I'm in your debt, to the last sovereign.
Obliged, {name}; I'll oil the favour.`,
		apology: `
A thousand pardons, {name}; a valve slipped.
My error, {name}; I'll see to the repair.`,
		agree: `
Precisely so, {name}.
Sound as a brass bolt.`,
		refuse: `
I'll not be pressed, {name}.
The pressure's too high for that.`,
		praise: `
Beautifully engineered, {name}.
A fine bit of work, by gaslight and by day.`,
		insults: `
You cog-brained blunderer.
You rust-eaten dolt.
You soot-faced swindler.
A clockwork fool with a loose spring.`,
		curses: `
May your boiler burst.
May the guild-masters foreclose on you.
May your gears seize and your gauges lie.
May the smog swallow you whole.`,
		oaths: `
By the Engineer and the boiler.
By brass and by steam, it is true.
By the guild charter, I swear.
On my honour and my gauges.
By {deity}, and by all that turns.
By the whistle at dawn, I will.`,
		fillers: `
I say
what
I daresay`,
		gossip: `
The foreman's wife has it from the shift-bell that
A clerk at the works whispers that`,
		barks: `
market: Brass cogs, copper pipes, clockwork toys! | Pocket-watches, guaranteed to lose only a minute a day.
guard: Papers, please; the guild requires them. | Stand clear of the engine house.
tavern: Tea and a pint, and a pie fresh from the oven. | The inventor at the back says he'll fly by Tuesday.
temple: The Engineer bless the turning wheel. | Oil the offering, wind the prayer.
road: The line is delayed; a boiler's cracked. | Soot all down the cutting; keep a cloth to your face.
night: The gas-lamps flicker. Walk quick. | Somewhere a boiler hisses in the dark.
rain: Soot and rain make black puddles. | Mind the drain; it spouts.
crowd: Stand back, the engine's coming through! | The factory whistle has emptied the works.
smith: Brass fittings, steel gears, made to measure. | Pressure-tested, every last one.
farm: Steam-plough's broken again. | The harvester's back in service, thank the Engineer.
harbor: Steamers in and out all day. | The cranes have swung since dawn.
school: Gears first, then Greek. | Draw the engine in section, and label it.`,
		proverbs: `
A good boiler keeps its own counsel.
Brass shines brightest in the workshop's shadow.
Steam under pressure is a fool's friend.
The guild that forgets the apprentice forgets the trade.`,
		idioms: `
to let off steam :: to release anger
to clock in :: to start work
a loose rivet :: a small problem that becomes large
to oil the wheels :: to bribe or smooth the way`
	}),
	dieselpunk: G({
		lex: 'coin=marks;drink=coffee;bad=the ministry;power=diesel;hall=the canteen;god=the Chancellor;folk=the crew;metal=steel;road=the highway;home=the flat;vermin=rats;light=arc-light',
		greet: `
Good {time}, {name}. Papers in order?
Comrade {name}, the shift is long.
Hello, {name}. Coffee's on.`,
		farewell: `
Keep your head down, {name}.
Move out, {name}, and stay sharp.
Till the next shift, {name}.`,
		thanks: `
Solid, {name}. I owe you a round.
You pulled through, {name}. Thanks.`,
		apology: `
My mistake, {name}. I'll answer for it.
Out of line. I apologise.`,
		agree: `
That's correct, {name}.
Orders understood.`,
		refuse: `
Denied, {name}.
Not on this shift, not for this pay.`,
		praise: `
Fine work, {name}, worthy of a medal.
You held the line, {name}.`,
		insults: `
You ministry lickspittle.
Desk-bound coward.
Spineless informer.
You couldn't start a motor if it were running.`,
		curses: `
May the ministry find you.
May your engine cut out on the road.
May your ration card be revoked.
May the searchlights find you.`,
		oaths: `
By steel and by oil, I swear.
By the Chancellor, I'll do it.
On my ration card and my life.
By the engine and the oath.
By {deity}, and the party card in my pocket.
On my crew's honour.`,
		fillers: `
listen
comrade
straight talk`,
		gossip: `
The canteen cook has it from a clerk that
Off the record, the night shift says that`,
		barks: `
market: Ration-free coffee, if you pay in marks! | Tyres, belts, batteries, no questions.
guard: Papers. Now. | The curfew siren sounds at ten.
tavern: The jukebox plays the same song again. | Cheap whiskey and cheaper news.
temple: The Chancellor's portrait watches every pew. | Light a candle for the missing.
road: The highway's closed past the checkpoint. | Convoy ahead; give it room.
night: The searchlights sweep the roofs. | Boots on cobbles. Don't be seen.
rain: Rain on the tin roof. Good cover. | Everything smells of oil and wet iron.
crowd: The rally starts at noon, attendance expected. | Keep moving, citizens.
smith: Welded, riveted, tested. | We make engine parts, not promises.
farm: The collective's tractor needs fuel again. | Quotas met, barely.
harbor: Cargo ships queue for the dock. | The foghorn sounds hourly.
school: Recite the Chancellor's address. | Lessons in mechanics at nine.`,
		proverbs: `
A running engine is a loud promise.
Steel does not argue, but it does rust.
An empty tank makes a quiet king.
Do not trust a clean ledger in a dirty factory.`,
		idioms: `
to run on fumes :: to be nearly exhausted
to throw a wrench :: to sabotage
a clean checkpoint :: a safe passage
to ride the convoy :: to go along with the powerful`
	}),
	atompunk: G({
		lex: 'coin=credits;drink=soda;bad=the bureau;power=the atom;hall=the diner;god=the Committee;folk=neighbours;metal=chrome;road=the parkway;home=the bungalow;vermin=roaches;light=neon',
		greet: `
Well hello, {name}! Swell {time}.
How's the family, {name}? And the fallout shelter?
Good {time}, neighbour {name}; coffee's hot.`,
		farewell: `
Be seeing you, {name}.
Duck and cover, {name}. See you around.
Stay bright, {name}.`,
		thanks: `
Gee, thanks, {name}; that's real swell.
I owe you one, pal.`,
		apology: `
Gosh, sorry about that, {name}.
My bad, {name}. Honest mistake.`,
		agree: `
Sure thing, {name}.
You said it.`,
		refuse: `
No dice, {name}.
Not on your life, pal.`,
		praise: `
A real stand-up person, {name}.
Out of this world work, {name}!`,
		insults: `
You square.
You two-bit crook.
Stool pigeon.
Bureau stooge.`,
		curses: `
May the Geiger counter sing for you.
May the bureau audit you.
May your shelter flood.
May your fuse blow at midnight.`,
		oaths: `
Cross my heart and hope to glow.
By the atom, it's true.
By the Committee and the flag.
On my chrome and my life.
By {deity}, I swear.
By the neon sign over the diner.`,
		fillers: `
swell
pal
you bet`,
		gossip: `
Over the diner counter I heard that
The radio man at the corner swears that`,
		barks: `
market: Atom-fresh vegetables, now with extra shelf life! | Tin cans for the shelter, three for one credit.
guard: Evening, citizen. Papers, please. | Civil defence drill at noon. Be ready.
tavern: Jukebox is broken but the soda's cold. | The bartender swears the radio said something about launches.
temple: The Committee blesses the neighbourhood. | Let us bow our heads for the safe return.
road: The parkway's clogged with chrome cruisers. | A glowing sign says "Last diner for fifty miles."
night: The neon buzzes and the sirens test. | Somebody's television is still on. Static.
rain: Rain's mildly hot today, they say. Stay in. | Wet pavement and neon: a pretty sight.
crowd: A new ray-gun fair is in town! | The parade has begun; everyone wave.
smith: Chrome plating, free estimate. | Atomic-grade bolts, certified.
farm: The soil glows a little, but the crops are big. | Hybrid corn, taller than the farmhouse.
harbor: A new reactor-ship docked this morning. | Dockworkers wear the badge that clicks.
school: Duck and cover practice at ten. | Physics before lunch.`,
		proverbs: `
The atom is a good servant and a terrible master.
A bright future needs a deep shelter.
Chrome shines; the dust beneath it does not.
Trust the neighbour, but check the meter.`,
		idioms: `
to go critical :: to lose your temper
glow in the dark :: to be conspicuous
to duck and cover :: to hide from trouble
a bright tomorrow :: an empty promise`
	}),
	cyberpunk: G({
		lex: 'coin=creds;drink=synth-brew;bad=the corps;power=the grid;hall=the noodle stall;god=the wire;folk=runners;metal=chrome;road=the strip;home=the stack;vermin=drones;light=neon',
		greet: `
Yo {name}, you still jacked in?
{time}, {name}. Talk fast, the ads are watching.
Hey {name}. What's the signal?`,
		farewell: `
Stay off the grid, {name}.
Ghost out, {name}.
Burn bright, {name}, and don't get traced.`,
		thanks: `
Solid, {name}. Creds on me next time.
Respect, {name}. Debt logged.`,
		apology: `
My bad, {name}. Glitch in judgement.
Sorry. Bad packet.`,
		agree: `
Copy that, {name}.
Signal clear.`,
		refuse: `
Negative, {name}.
Not for all the creds in the corps.`,
		praise: `
Clean work, {name}, chrome-clean.
You've got the edge, {name}.`,
		insults: `
You corp-sucking drone.
Cheap clone.
Packet-sniffer.
You glitchy meat-bag.`,
		curses: `
Burn out, {name}.
May the corps repossess your spine.
May the ice find your mind.
May your implants brick.`,
		oaths: `
By the wire, I swear.
On my chrome, it's true.
By the last light in the sprawl.
On my deck and my debts.
By {deity}, or whoever's listening.
Cross my circuit.`,
		fillers: `
choom
listen up
no static`,
		gossip: `
Chatter on the back channel says that
A fixer I trust swears that`,
		barks: `
market: Knock-off implants, no returns! | Real ramen. Real, I swear. Mostly.
guard: Scan your chip. Move along. | Corp security. Stay where you are.
tavern: Synth-ale and a data-spike chaser. | A hacker in the corner is losing a bet.
temple: The wire gods hear every upload. | Burn a data-incense, five creds.
road: The strip is clogged with delivery drones. | Neon rain over the overpass.
night: The corps' ad-blimps glow all night. | Somewhere, a drone is watching your window.
rain: Acid rain. Keep your coat sealed. | Neon bleeds in the puddles.
crowd: Packed stacks, packed streets. | Somebody's livestream is blocking traffic.
smith: Cyberware repair, black-market prices. | Chrome limbs, fitted while you wait.
farm: Vat-grown rice, three levels up. | The rooftop farm's grow-lamps hum.
harbor: Cargo drones queue on the pier. | Container stacks tower over the docks.
school: Class is jacked in. Don't lag. | Code first, ethics never.`,
		proverbs: `
Every wire has two ends, and someone is on the other.
Chrome is cheap; a clean name is not.
The corp always gets its cut, even from your sleep.
Trust the runner, not the contract.`,
		idioms: `
to jack out :: to leave a situation
to run cold :: to keep a low profile
a glitch in the sky :: a bad omen
to burn the stack :: to destroy your own past`
	}),
	biopunk: G({
		lex: 'coin=culture-scrip;drink=ferment;bad=the vat-lords;power=the vats;hall=the grow-hall;god=the First Cell;folk=kin;metal=chitin;road=the vine-road;home=the nest;vermin=mites;light=glow-moss',
		greet: `
Good {time}, kin {name}; may your cells thrive.
Warm blood to you, {name}.
The hive hums, and so do I, {name}.`,
		farewell: `
Divide well, {name}.
May your graft take, {name}.
Grow strong, kin.`,
		thanks: `
You fed my cells, {name}; I'll feed yours.
A gift of life, {name}. Thank you.`,
		apology: `
A mutation of manner; forgive me, {name}.
I spoiled the culture; sorry, {name}.`,
		agree: `
The strain is true, {name}.
I'll graft to it.`,
		refuse: `
The tissue rejects it, {name}.
My cells say no.`,
		praise: `
A fine specimen of courage, {name}.
Hardy and well-cultured, {name}.`,
		insults: `
You blighted cutting.
You sick mutation.
You mould on a good loaf.
You failed graft.`,
		curses: `
May your cells rot.
May the blight take your vats.
May your grafts reject and your fever climb.
May you spawn only weeds.`,
		oaths: `
By the First Cell, I swear.
By blood and sap, it is true.
By the vats and the seed.
On my graft and my kin.
By {deity}, whose spores bless us.
By the glow of the hall.`,
		fillers: `
kin
by the cell
in the culture`,
		gossip: `
The grow-hall hums with word that
A vat-tender, sweating over a batch, claims that`,
		barks: `
market: Fresh graft-fruit, still twitching! | Antibiotic moss, three scrip a bundle.
guard: Quarantine check. Roll up your sleeve. | Stand back; the vats are venting.
tavern: Ferment and stew, flavoured with something alive. | The mushroom wine is aged in a skull. Don't ask.
temple: The First Cell blesses every division. | Lay your hand on the living wall.
road: The vine-road shudders under your feet. | A fungus bloom blocks the path ahead.
night: The glow-moss shows the way. | Something in the vats is humming.
rain: Spore-rain again. Keep your mouth closed. | The leaves drink greedily.
crowd: The hive is busy and the air is warm. | A mutant parade! Cheer for the tallest.
smith: Chitin plates, grown to measure. | Bone-saw and splint, quick and clean.
farm: The crops are alive. Mind the teeth. | Vat-fed wheat grows overnight.
harbor: Kelp-barges are in. | The tide-vats are overflowing.
school: Grafting before letters. | The teacher has two extra eyes. Listen.`,
		proverbs: `
A graft takes better when the host is willing.
The vat remembers what the hand forgets.
A strong culture feeds the weak ones.
Growth without roots is only a tumour.`,
		idioms: `
to graft on :: to join a group
a bad culture :: a harmful group
to shed the old skin :: to start anew
to split the cell :: to divide a family`
	}),
	solarpunk: G({
		lex: 'coin=hours;drink=tea;bad=the hoarders;power=sunlight;hall=the commons;god=the green;folk=neighbours;metal=copper;road=the greenway;home=the commons-house;vermin=aphids;light=sunlight',
		greet: `
Good {time}, neighbour {name}.
Sun on you, {name}!
Welcome to the commons, {name}.`,
		farewell: `
Grow well, {name}.
May the green keep you.
See you at the next market, {name}.`,
		thanks: `
Thanks, neighbour; I'll share it forward.
The commons thanks you, {name}.`,
		apology: `
I mis-stepped, neighbour. Sorry.
Let me make it right, {name}.`,
		agree: `
Sounds right for the commons.
Together, then, {name}.`,
		refuse: `
That harms the commons, {name}.
I'll not do it, and I'll tell you why.`,
		praise: `
The commons is richer for you, {name}.
A fine piece of caring, {name}.`,
		insults: `
You hoarder.
You waste-maker.
You smoke-brained taker.
Selfish as a weed.`,
		curses: `
May your roof leak and your garden shade.
May your batteries never charge.
May the hoarders take your seed.
May the green forget you.`,
		oaths: `
By the green and the sun, I swear.
By the commons and the seed.
On my hours and my hands.
By the roots and the sky.
By {deity}, and the neighbours.
By every leaf in {town}.`,
		fillers: `
neighbour
friend
to share`,
		gossip: `
Overheard at the commons meeting, and not for the first time:
The seed-swap grapevine says that`,
		barks: `
market: Swap your tools, share your seeds! | Fresh greens, grown on the roof!
guard: Welcome to {town}, please enjoy and leave it clean. | Peacekeepers on the corner, ask if you need help.
tavern: Fruit wine and shared plates. | The band plays on solar power tonight.
temple: Hold hands and breathe with the garden. | The sun gets thanks every dawn.
road: The greenway is lined with fruit trees; take one. | Electric trams hum by every hour.
night: The solar lanterns glow green. | Owls have returned to the park.
rain: The rain barrels are filling nicely. | Good for the reservoirs.
crowd: The commons meeting is full; make space. | Bring a dish to share.
smith: Repair, never replace. | Salvaged metal, reforged with sunlight.
farm: Terraces are ripe; come pick. | The bees are happy, so are we.
harbor: Wind-ships dock with the tide. | Sea-gardens float in the bay.
school: Today we learn to mend. | Ask questions; the answers are shared.`,
		proverbs: `
The sun belongs to all, and so does the shade.
What you plant, you pass on.
A shared garden has no fences.
Mend before you make anew.`,
		idioms: `
to take the long light :: to think of future generations
to plant a tree for a stranger :: to act selflessly
commons-sworn :: devoted to the common good
to borrow the sun :: to use what is freely given`
	}),
	wasteland: G({
		lex: 'coin=scrap;drink=clean water;bad=the raiders;power=the old fuel;hall=the shelter;god=the water;folk=survivors;metal=scrap;road=the dust road;home=the bunker;vermin=rad-roaches;light=firelight',
		greet: `
Water and peace, {name}.
Still breathing, {name}? Good.
{time}, {name}. Got water?`,
		farewell: `
Stay out of the dust, {name}.
Keep your rads low, {name}.
Walk safe. Walk armed.`,
		thanks: `
Water to you, {name}. I owe you.
Good scrap, that. Thanks.`,
		apology: `
My bad, {name}. Hard times.
Sorry. Dust got in my head.`,
		agree: `
Aye. Makes sense out here.
That's how we survive.`,
		refuse: `
No. I'd sooner starve.
Not for water. Not for scrap.`,
		praise: `
You'd survive anywhere, {name}.
Tougher than rust.`,
		insults: `
You raider scum.
You dust-blind fool.
Scrap-licker.
Rad-sick wretch.`,
		curses: `
May the dust take you.
May your water go bad.
May the rads find your bones.
May raiders find your fire.`,
		oaths: `
By the water, I swear.
On my scrap and my scars.
By the last clean well.
By the shelter door.
By {deity}, if any are left.
On my blood, which is still red.`,
		fillers: `
out here
survivor
water first`,
		gossip: `
A trader off the dust road says that
Round the shelter fire, folks whisper that`,
		barks: `
market: Clean water, three scrap a cup! | Salvage, sorted by how much it still works.
guard: Halt. Weapons on the ground. | Gate's closed. Raiders in the dust.
tavern: Moonshine from nobody knows what. | Boiled rat stew, fresh tonight.
temple: Pray to the water, it never left. | The old shelter bell calls to the faithful.
road: Dust storm ahead. Cover your mouth. | Rusted wrecks line the road; take what you can.
night: Cold as bone. Stay by the fire. | Raiders prowl; keep the lights low.
rain: Black rain. Don't drink it. | Rain tastes of metal.
crowd: Crowd at the water ration! | Lots of eyes, little trust.
smith: Weld it, hammer it, hope it holds. | Scrap turned into spearheads.
farm: The tomatoes glow, but they're edible. | Water the crops before the sun scorches.
harbor: The dried-up docks are our trade post. | A wrecked ship is our home.
school: Learn what's safe to eat. | Reading is old magic.`,
		proverbs: `
Water first, then friends, then fire.
Scrap remembers what the world forgot.
A full canteen is a short prayer answered.
In the dust, a smile is the first bribe.`,
		idioms: `
to cross the glass :: to cross a dangerous place
to drink the last cup :: to risk everything
hard as scrap :: tough
to hear the dust :: to sense danger`
	}),
	twilight: G({
		lex: 'coin=old coin;drink=thin wine;bad=the hollow court;power=the old lamps;hall=the old hall;god=the old gods;folk=the remnant;metal=tarnished silver;road=the old road;home=the hearth;vermin=crows;light=dusk-light',
		greet: `
Good {time}, {name}, while any good remains.
Well met, {name}, in these last hours.
The old hall welcomes you, {name}, though it is dim.`,
		farewell: `
May the lamps last the night, {name}.
Go gently, {name}; the roads are long and quiet.
Till we meet, if we meet, {name}.`,
		thanks: `
Your kindness is a lamp in the dusk, {name}.
We have little left, but my thanks are whole.`,
		apology: `
Forgive me, {name}; we are all tired.
An old pride speaks sometimes; forgive it.`,
		agree: `
As in the old days, {name}.
Let it be so, while we still can.`,
		refuse: `
No, {name}. Some things must not be spent.
The old ways forbid it.`,
		praise: `
You carry the old glory well, {name}.
A deed worthy of better days.`,
		insults: `
You gilded husk.
Heir to a ruin.
You hollow courtier.
You grave-dusting fool.`,
		curses: `
May the dusk take you.
May the crows pick your name clean.
May you be forgotten before the old lamps fail.
May the hollow court hold you.`,
		oaths: `
By the old gods, wherever they sleep.
By the lamps of {town}.
By the dust of the first kings.
On my name, which is nearly all I have.
By {deity}, who may yet hear.
By the last bell of the old hall.`,
		fillers: `
as it was
in the old days
alas`,
		gossip: `
An old archivist, dusting a ledger, muttered that
In the empty galleries they say that`,
		barks: `
market: Old coins, faded silks, memory in a jar. | Everything here was grand once.
guard: Pass, if you can find anything to guard. | The hollow court keeps its gates, if nothing else.
tavern: Thin wine and thinner songs. | They toast the dead, and then the other dead.
temple: The old gods sleep, but the candles do not. | Lay a flower where a god once stood.
road: The old road crumbles beneath the weeds. | A broken milestone points to a town long gone.
night: The lamps gutter, one after another. | Crows gather on the broken towers.
rain: Even the rain feels tired. | The gutters weep, as they always have.
crowd: A small crowd, but a faithful one. | The remnant gathers for the evening bell.
smith: Mending what we cannot replace. | Silver gone grey beneath my hammer.
farm: The fields are half fallow, half remembered. | We plant as our grandfathers did.
harbor: The old quay holds, the ships do not. | A single lamp burns at the harbour mouth.
school: Memorize the lineages before they are lost. | The books are old; handle them softly.`,
		proverbs: `
Dusk is only a long goodbye to those who stay.
A cracked bell still rings for the faithful.
We keep the lamps, though we cannot remember the oil.
The old king's crown still fits the dust.`,
		idioms: `
to keep the last lamp :: to stay loyal to a lost cause
to count the fallen towers :: to mourn
dusk-hearted :: melancholy
to sweep the old hall :: to keep pride in decline`
	})
};

// ---------- land ----------

export type Domain = 'sea' | 'steppe' | 'trade' | 'highland' | 'desert' | 'forest' | 'farm' | 'north' | 'deep' | 'sky';

export const DOMAIN_LEX: Record<Domain, Record<string, string>> = {
	sea: { beast: 'gull', weather: 'squall', work: 'the nets', land: 'the coast' },
	steppe: { beast: 'mare', weather: 'wind', work: 'the herd', land: 'the grass' },
	trade: { beast: 'pack-mule', weather: 'rain', work: 'the ledger', land: 'the trade roads' },
	highland: { beast: 'goat', weather: 'snow', work: 'the terraces', land: 'the heights' },
	desert: { beast: 'camel', weather: 'dust', work: 'the well', land: 'the dunes' },
	forest: { beast: 'boar', weather: 'mist', work: 'the hunt', land: 'the wood' },
	farm: { beast: 'ox', weather: 'frost', work: 'the plough', land: 'the fields' },
	north: { beast: 'seal', weather: 'blizzard', work: 'the ice', land: 'the snows' },
	deep: { beast: 'cave-eel', weather: 'damp', work: 'the seam', land: 'the tunnels' },
	sky: { beast: 'gull', weather: 'wind', work: 'the rigging', land: 'the clouds' }
};

export const DOMAIN_PROVERBS: Record<Domain, string[]> = {
	sea: L(`
A calm sea breeds bad sailors.
The tide waits for no tide-table.
Mend the net before you need the fish.
A full hold sinks a ship as surely as a hole.
No harbour is far from one who can swim.
Salt and patience cure most wounds.
Trust the captain on the water and the cook on the land.
A leaking boat has no friends in the crew.
Fish do not argue with the net.
Even the biggest wave ends on a beach.
A dry oar never crossed a strait.
Check the knot twice before the squall checks it once.`),
	steppe: L(`
The horse knows the road better than the rider.
Grass is wealth; the herd is life.
A rider without a mare is only half a rider.
Do not drive your herd into another's pasture.
The wind never asks for a map.
Winter takes the weak and the lazy first.
A cold fire still smokes.
Tents are made for moving, people for staying faithful.
Lame foal, long journey.
The wolf follows the herd, but the herd follows the shepherd.
Count the water-skins before you count the miles.
A loose cinch teaches a short lesson.`),
	trade: L(`
A short measure costs a long reputation.
The ledger remembers what the heart forgets.
Cheap cloth wears out the buyer's patience.
Buy when the others weep, sell when they sing.
A closed shop earns nothing, however clean.
One honest scale feeds a whole street.
Debts, like cats, find their way home.
Do not count another's coins at your own table.
Two hands can wash a bargain clean.
The best price is the one both can live with.`),
	highland: L(`
A goat knows the cliff by the dung.
Stones keep promises better than people.
The high road is the long road made short.
Snow forgives nothing.
A mountain has no neighbours, only echoes.
The pass is held by the one who stays.
Climb slowly; the summit is patient.
The thin air teaches thin speech.
Terrace the slope and the slope feeds you.
A rope is only as honest as its last knot.`),
	desert: L(`
A well is worth more than a crown.
The dry traveller says little and drinks slowly.
Sand covers all footprints in time.
Shade is a gift; thank the giver.
The camel carries what the camel can bear.
A night in the dunes teaches more than a year in the city.
Do not curse the sun that ripens your dates.
The oasis belongs to all who guard it.
Two thirsts do not share a bowl, but two friends do.
Water spilled is more lost than gold.`),
	forest: L(`
A tree that bends survives the storm.
Do not hunt where the hunters have prayed.
The deer knows the hunter's step.
Moss grows on the quiet side.
A good axe needs a patient arm.
The forest keeps the secrets of those who feed it.
Roots hold what branches boast.
Even a small fire can take down a great wood.
Follow the stream and it will find the village.
The wise hunter hears more than he sees.`),
	farm: L(`
Plough early, sleep late; the weeds do not rest.
A good ox is worth two proud lords.
Sow in tears, reap in song.
Rain follows the patient farmer.
The first furrow decides the field.
The mill grinds slowly but grinds fine.
One sack of seed, a thousand sacks of grain.
A hungry plough runs crooked.
Frost forgives no late planter.
The barn tells the truth about the year.`),
	north: L(`
Wear your wool before you need it.
The ice forgives no careless step.
A shared fire warms two houses.
Seal-fat and silence keep a family through winter.
Short days teach long stories.
Dogs know the weather before the elders do.
Thin ice, thin patience.
The long night is for mending and telling.
He who hoards the wood freezes alone.
Snow hides the path, not the destination.`),
	deep: L(`
A candle in the mine is worth a mountain of gold.
The vein rewards patience, not greed.
Listen to the rock; it speaks before it falls.
The dark has no secrets from those who live in it.
A brave miner is a living one.
Many tunnels, one wall.
Water under the floor is a patient enemy.
Never dig past your own lantern.
The deeper the seam, the thinner the air and the oath.
A shaft shared is a shaft that holds.`),
	sky: L(`
Do not trust a wind you cannot read.
A thin rope holds a heavy home.
The cloud keeps no promises.
Look up, but mind your step on the edge.
The isle drifts for those who sleep.
Every storm is a toll on the sky road.
Falling is quick; mending is slow.
Wings are borrowed; ropes are your own.
A sailor of clouds loves the ground best.
The wind gives, the wind takes, the wind is not sorry.`)
};

export const DOMAIN_IDIOMS: Record<Domain, { say: string; meaning: string }[]> = {
	sea: IDIOMS(`
to cut the painter :: to break ties and leave
a fair wind for you :: good luck on your errand
to trim the sail :: to adjust to circumstances
as dry as a beached oar :: thirsty or broke
to be hauled in the net :: to be caught or recruited
to sound the bottom :: to test someone's depth or honesty
a long swell :: a slow but certain change`),
	steppe: IDIOMS(`
to ride the third wind :: to push on past exhaustion
to share the mare's milk :: to be sworn friends
grass in the saddle :: a person who never settles
to count the foals in spring :: to be prudent about the future
a lame horse tells no tales :: a failure leaves no witness
to follow the smoke :: to find a camp by instinct`),
	trade: IDIOMS(`
to balance the scale :: to settle fairly
a clipped coin :: a cheat or a half-honest person
to open the ledger on someone :: to examine their debts
good weight :: honest dealing
a loss leader :: a favour given to win a bigger one
to haggle the sun down :: to bargain until dusk
to mind your measure :: to watch what you promise`),
	highland: IDIOMS(`
to hold the pass :: to stand firm for others
goat-footed :: surefooted, not easily fooled
to read the snow :: to sense danger before it arrives
to carry stones uphill :: to do hard, thankless work
cold as a cairn :: unfeeling or silent
to dig in for the winter :: to prepare for a hard time`),
	desert: IDIOMS(`
to dig for the well :: to seek hidden help
a mirage-seller :: a liar with a good story
to cross the dunes :: to endure a hard trial
shade-sharer :: a generous friend
dry as old bread :: dull or humourless
to know where the stars end :: to be well travelled`),
	forest: IDIOMS(`
to hear the leaves :: to notice small signs
to blaze a trail :: to lead the way
rooted like an oak :: stubborn or loyal
to chase two deer :: to lose both by wanting both
to walk where the moss is thin :: to take a known risk
an axe without a handle :: a plan without means`),
	farm: IDIOMS(`
to turn the sod :: to begin something hard
a good furrow :: a clean, straight job
to bring in the late hay :: to finish what others abandoned
fat as a harvest hen :: well fed and complacent
to sow wind and reap hail :: to bring trouble on oneself
mud to the knees :: deeply involved in hard work`),
	north: IDIOMS(`
to wait for the thaw :: to be patient in hardship
to feed the sled-dog first :: to put the practical first
ice in the beard :: a hard, weathered person
to keep the lamp trimmed :: to stay alert through long nights
to walk on thin ice :: to take a dangerous risk
a fire with no smoke :: a quiet, steady helper`),
	deep: IDIOMS(`
to strike the seam :: to find good fortune
to follow the vein :: to pursue a promising lead
dust in the lamp :: a small flaw that causes trouble
to dig in the dark :: to work without hope of thanks
to shore the roof :: to prepare for collapse
a hollow tunnel :: an empty promise`),
	sky: IDIOMS(`
to catch the wind :: to seize an opportunity
to drop anchor on a cloud :: to try something impossible
to read the weather-vane :: to judge the mood of the powerful
with both feet on the isle :: practical and steady
to ride the downdraft :: to fall fast in fortune
to fly low :: to avoid attention`)
};

export const COMMON_IDIOMS = IDIOMS(`
to break bread :: to make peace
to wear a heavy hat :: to hold a responsibility
a quiet fire :: a calm, steady person
to keep the door on the latch :: to be hospitable but careful
to carry water for someone :: to serve humbly
a long table :: a generous household`);

export const VALUE_PROVERBS: Record<string, string[]> = {
	martial: L(`
A sharp blade is a kind of promise.
Fear a quiet enemy more than a loud one.
Steel is cheap; courage is dear.
A broken spear can still guard a door.
The wall holds because someone stands behind it.
Better a short life with honour than a long one in debt.
Peace is the war you won in advance.
Every scar is a lesson with interest.`),
	pious: L(`
The gods hear the quiet prayer first.
A kind word is a small offering.
The altar is only as clean as the hand that tends it.
Faith is a lamp, not a sword.
Pray with your feet: walk toward the one in need.
The oath sworn at the altar outlasts the stone.
Gratitude is the shortest prayer.
No prayer is lost; it only waits.`),
	scholarly: L(`
A book is a door left open.
The wise ask twice, the fool answers once.
Ink outlasts the strongest king.
The question is half the answer.
Learning is a river: drink, but do not drown.
Teach what you know and you will learn what you do not.
A lie repeated is a book the reader did not write.
Knowledge weighs nothing and feeds everyone.`),
	ancestral: L(`
Honour the roots; the fruit will follow.
The dead listen better than the living.
A name carried well is a house built twice.
The old road was walked by someone you owe.
Forget the grave and the field will not forget you.
Take the lamp from your grandfather's hand and keep it lit.
A child is the family's memory, walking.
Every house stands on the bones of the one before.`),
	insular: L(`
A closed gate keeps the wolf and the neighbour alike.
Trust the roof you built.
The stranger brings news, and often the rain.
A small village knows its own.
Count your own sheep before you count a guest's.
A wall is a form of kindness to those inside.
Who travels far rarely returns the same.
Bread from your own oven tastes safest.`),
	common: L(`
Hospitality given is hospitality owed.
A shared meal ends many quarrels.
Do not judge the day until evening.
Hands that work have no time to quarrel.
A guest is a gift with feet.
Say little, listen long.
A debt of kindness is the lightest to carry.
The family is the first and last roof.`)
};

// ---------- people ----------

export const TICS: Record<string, string[]> = {
	calm: L(`
as it happens
let us see
in good time
there is no hurry
one thing at a time`),
	proud: L(`
mark me
as I have always said
I will not repeat it
you will remember this
as is my right`),
	anxious: L(`
if I may
you understand
I only ask
just in case
forgive me, but`),
	wry: L(`
naturally
of course
as one does
how very kind
as luck would have it`),
	gruff: L(`
hm
bah
right then
enough
spit it out`),
	warm: L(`
friend
dear one
ah now
bless you
there, there`),
	cold: L(`
indeed
noted
as expected
I see
that will do`),
	eager: L(`
quickly now
come, come
yes, yes
at once
ah, good`)
};

export const BELIEF_DOCTRINE: Record<string, string[]> = {
	caste: L(`
Every soul has a station, and honour lies in serving it.
Purity of hand and house keeps the world in order.`),
	evangelical: L(`
The faith must be carried to every door.
A silent believer has half believed.`),
	militant: L(`
Faith without a sword is only a wish.
An unbeliever is an enemy who has not yet admitted it.`),
	liberation: L(`
No person is bound by birth.
The faith frees; the chain is the sin.`),
	compassion: L(`
Mercy is the first duty and the last.
A full table does more than any sermon.`),
	esoteric: L(`
The true meaning lies behind the plain one.
Silence teaches what speech cannot.`),
	ancestral: L(`
The dead guide the living, if the living listen.
Every house owes its ancestors a tended shrine.`),
	blood_offering: L(`
Life is owed and life must be paid.
The gods drink what we give gladly.`),
	mutation_rites: L(`
Change is the only holy thing.
The flesh is clay, and the faith the hand.`),
	void_whispers: L(`
The void listens, and answers those who listen back.
What sleeps beneath will wake when it is ready.`),
	cyclopean_rites: L(`
Older things than the gods wait in the deep places.
Madness is only sight we cannot bear.`),
	sacred_grove: L(`
The forest was here first and will be here last.
Take only what the grove permits.`),
	mountain_pact: L(`
The mountain keeps its oaths; so must we.
Stone remembers, and so will we.`),
	_monotheism: L(`There is one maker, and all answer to it.`),
	_polytheism: L(`Every god has its due, and it must be paid.`),
	_animism: L(`Every stream and stone has a will of its own.`),
	_pantheism: L(`The world is one living thing, and we are in it.`),
	_dualism: L(`Light and dark are balanced, and so must we be.`),
	_other: L(`The gods are owed their share, in rite and in deed.`)
};

export const BELIEF_IDEOLOGY: Record<string, string> = {
	monarchy: 'The crown holds the realm together.',
	republic: 'Power belongs to the many and is lent to the few.',
	theocracy: 'The faith should govern what law cannot.',
	oligarchy: 'The wise and the wealthy should hold the reins.',
	autocracy: 'One firm hand is better than many soft ones.',
	communal: 'What the village makes, the village shares.',
	technocracy: 'Let those who understand the machine run it.'
};

export const VALUE_BELIEF_TPL = [
	'Hold fast to {v}, whatever it costs.',
	'Never trade {v} for gain.',
	'A house without {v} will not stand.',
	'Teach the young {v} before anything else.'
];

export const QUIRKS_GENERAL = L(`
Counts coins twice, then a third time out of habit.
Taps the table before saying anything important.
Never sits with their back to a door.
Hums when nervous, and is nervous often.
Keeps a small token and rubs it while thinking.
Eats slowly and watches everyone else eat.
Never finishes a sentence about their family.
Always arrives early and leaves first.
Laughs a beat too late.
Writes everything down, even jokes.
Cannot pass a beggar without giving something.
Refuses to speak of the weather.
Wears one old thing they will not replace.
Checks the sky before every answer.
Names their tools and scolds them by name.
Falls silent when a certain song is played.
Always has one more question.
Loves a good bargain, even when rich.
Repeats the last word of what others say, softly.
Touches the doorframe when entering and leaving.
Never wastes a crumb of bread.
Peers at strangers' hands before their faces.
Keeps a pinch of <metal> in a pocket for luck.
Swears by <drink> and nothing else.
Distrusts <bad> on principle.
Polishes a <metal> trinket when nervous.`);

export const QUIRKS_ROLE: Record<string, string[]> = {
	martial: L(`
Tests the edge of every blade by thumb.
Stands as though the line were still behind them.
Cannot sleep indoors for more than three nights.`),
	diplomacy: L(`
Pours the first cup before the talk begins.
Remembers every name and what it cost.
Smiles before answering, whatever the question.`),
	stewardship: L(`
Knows the price of every loaf in the realm.
Walks the granary at dawn.
Counts the steps between landmarks.`),
	intrigue: L(`
Reads everyone's hands first.
Never answers the first question.
Always sits near an exit.`)
};

export const REG_TONE_WORD: Record<Register, string> = { formal: 'formal', blunt: 'blunt', flowery: 'flowery', terse: 'terse', earthy: 'earthy', courtly: 'courtly' };

export const FRIEND_WORD: Record<Genre, string> = {
	fantasy: 'friend', mythic: 'good mortal', steampunk: 'fellow', dieselpunk: 'comrade', atompunk: 'pal', cyberpunk: 'choom', biopunk: 'kin', solarpunk: 'neighbour', wasteland: 'survivor', twilight: 'old friend'
};

export const REG_HONOR: Record<Register, { low: string; common: string; high: string; elder: string; stranger: string; noble: string }> = {
	formal: { low: 'citizen', common: 'good citizen', high: 'Honoured Master', elder: 'Venerable One', stranger: 'honoured guest', noble: 'Honourable Lord' },
	blunt: { low: 'you', common: 'friend', high: 'boss', elder: 'old one', stranger: 'stranger', noble: 'my lord' },
	flowery: { low: 'little one', common: 'dear friend', high: 'Radiant Master', elder: 'Silver-haired Wise One', stranger: 'bright traveller', noble: 'Gleaming Lord' },
	terse: { low: 'you', common: 'friend', high: 'chief', elder: 'elder', stranger: 'outlander', noble: 'lord' },
	earthy: { low: 'sprout', common: 'neighbour', high: 'good master', elder: 'old gaffer', stranger: 'wanderer', noble: 'my lord' },
	courtly: { low: 'gentle soul', common: 'good friend', high: 'Most Esteemed', elder: 'Honoured Elder', stranger: 'gracious visitor', noble: 'Most Noble Lord' }
};
