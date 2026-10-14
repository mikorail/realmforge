import type { Encounter } from './types';

export const TRAITS = ['Brave', 'Craven', 'Just', 'Cruel', 'Ambitious', 'Content', 'Pious', 'Cynical', 'Greedy', 'Generous', 'Scholar', 'Strong', 'Sickly', 'Charming', 'Paranoid', 'Lucky'] as const;

/** stat nudges per trait */
export const TRAIT_FX: Record<string, Partial<Record<'martial' | 'diplomacy' | 'stewardship' | 'intrigue', number>>> = {
	Brave: { martial: 2 },
	Craven: { martial: -2, intrigue: 1 },
	Just: { diplomacy: 1, stewardship: 1 },
	Cruel: { martial: 1, diplomacy: -2 },
	Ambitious: { intrigue: 2 },
	Content: { stewardship: 1 },
	Pious: { diplomacy: 1 },
	Greedy: { stewardship: 2, diplomacy: -1 },
	Generous: { diplomacy: 2, stewardship: -1 },
	Scholar: { stewardship: 2 },
	Strong: { martial: 2 },
	Charming: { diplomacy: 3 },
	Paranoid: { intrigue: 2, diplomacy: -1 }
};

export const WAR_NAMES = ['War of {a}', '{a}–{b} War', 'Conquest of {b}', '{b} Campaign', 'War of the {c} Crown', 'Border War of {b}', 'Great {a} War', '{c} Succession War', 'Invasion of {b}', 'Hundred Days War of {b}'];
export const REBEL_FORMS = ['Free State', 'Republic', 'Principality', 'League', 'Duchy', 'Free Cities', 'Commonwealth'];
export const AGES = [
	[0, 'Age of Founding'],
	[60, 'Age of Kings'],
	[180, 'Age of Iron'],
	[350, 'Age of Sails'],
	[550, 'Age of Lanterns'],
	[800, 'Age of Wonders']
] as const;

export const ENCOUNTERS: Encounter[] = [
	{
		id: 'bandits',
		title: 'Bandits on the road',
		text: 'A band of ragged cutthroats blocks the path, blades drawn. Their leader demands a toll.',
		options: [
			{ label: 'Fight them', stat: 'martial', dc: 9, win: { text: 'You scatter them and take their purse.', gold: 25, renown: 4 }, lose: { text: 'You are beaten and robbed.', gold: -20, health: -20 } },
			{ label: 'Talk them down', stat: 'diplomacy', dc: 10, win: { text: 'They laugh and wave you on, and one even joins as a guide.', renown: 2 }, lose: { text: 'Words fail. You pay double.', gold: -30 } },
			{ label: 'Pay the toll', win: { text: 'You hand over coin and ride on.', gold: -12 } }
		]
	},
	{
		id: 'shrine',
		title: 'Wayside shrine',
		text: 'A moss-grown shrine to a forgotten god. Offerings of copper glint in the bowl.',
		options: [
			{ label: 'Leave an offering', win: { text: 'A strange calm settles on you.', gold: -5, health: 15, trait: 'Lucky' } },
			{ label: 'Take the coins', stat: 'intrigue', dc: 8, win: { text: 'Nobody saw. Probably.', gold: 15 }, lose: { text: 'A curse follows you; you sicken.', gold: 15, health: -25 } },
			{ label: 'Study the carvings', stat: 'stewardship', dc: 9, win: { text: 'You decipher an old tongue.', stewardship: 1, renown: 2 }, lose: { text: 'The script means nothing to you.' } }
		]
	},
	{
		id: 'tourney',
		title: 'A tourney!',
		text: 'Banners snap above the lists. The lord of the town offers a purse to the champion.',
		options: [
			{ label: 'Enter the lists', stat: 'martial', dc: 11, win: { text: 'You unhorse all comers. The crowd chants your name.', gold: 60, renown: 12 }, lose: { text: 'A lance to the chest ends your day.', health: -25, renown: -2 } },
			{ label: 'Bet on a champion', stat: 'intrigue', dc: 9, win: { text: 'Your pick wins handsomely.', gold: 35 }, lose: { text: 'Your pick eats dirt.', gold: -25 } },
			{ label: 'Watch from the stands', win: { text: 'A fine day out.', health: 5 } }
		]
	},
	{
		id: 'plaguevillage',
		title: 'The sick village',
		text: 'Coughing echoes from shuttered huts. A child begs you for help.',
		options: [
			{ label: 'Tend the sick', stat: 'stewardship', dc: 10, win: { text: 'Your remedies work. They will sing of you.', renown: 10, trait: 'Just' }, lose: { text: 'You catch the fever.', health: -35, renown: 4 } },
			{ label: 'Give alms and go', win: { text: 'Coin is all you can spare.', gold: -15, renown: 3 } },
			{ label: 'Hurry past', win: { text: 'You do not look back.' } }
		]
	},
	{
		id: 'ruins',
		title: 'Ruins in the hills',
		text: 'Broken towers of an elder kingdom. Something glitters below the collapsed hall.',
		options: [
			{ label: 'Delve inside', stat: 'martial', dc: 10, win: { text: 'You find an ancient hoard!', gold: 90, renown: 8 }, lose: { text: 'The floor gives way.', health: -30 } },
			{ label: 'Map the site', stat: 'stewardship', dc: 8, win: { text: 'Scholars pay well for your maps.', gold: 30, renown: 3 }, lose: { text: 'Rain ruins your notes.' } },
			{ label: 'Leave it be', win: { text: 'Some doors are best left shut.' } }
		]
	},
	{
		id: 'noble',
		title: 'A noble in distress',
		text: 'An overturned carriage; a young noble pinned beneath. Retainers flee.',
		options: [
			{ label: 'Rescue them', stat: 'martial', dc: 7, win: { text: 'Grateful, the house names you a friend.', renown: 8, gold: 30 }, lose: { text: 'You strain your back but free them.', health: -10, renown: 5 } },
			{ label: 'Demand a reward first', stat: 'intrigue', dc: 9, win: { text: 'They pay, and resent it.', gold: 60, renown: -3 }, lose: { text: 'Others arrive and call you a brigand.', renown: -8 } }
		]
	},
	{
		id: 'merchant',
		title: 'A caravan master',
		text: 'A spice-scented caravan offers you a share in their venture.',
		options: [
			{ label: 'Invest 40 gold', stat: 'stewardship', dc: 9, win: { text: 'The venture triples your stake.', gold: 80 }, lose: { text: 'The caravan never returns.', gold: -40 } },
			{ label: 'Guard them for pay', stat: 'martial', dc: 7, win: { text: 'An uneventful journey, well paid.', gold: 30 }, lose: { text: 'Raiders strike; you barely survive.', health: -20, gold: 10 } },
			{ label: 'Decline', win: { text: 'You part ways.' } }
		]
	},
	{
		id: 'witch',
		title: 'The hedge witch',
		text: 'An old woman by a bubbling pot offers to read your fate, or sell you a draught.',
		options: [
			{ label: 'Buy the draught (20g)', win: { text: 'Fire runs through your veins. You feel younger.', gold: -20, health: 30 } },
			{ label: 'Hear your fate', stat: 'diplomacy', dc: 8, win: { text: '"A crown awaits the bold." You feel emboldened.', intrigue: 1, trait: 'Ambitious' }, lose: { text: '"Death walks beside you." You sleep poorly.', health: -5 } },
			{ label: 'Denounce her', win: { text: 'The villagers cheer; the witch smiles oddly.', renown: 2, health: -10 } }
		]
	},
	{
		id: 'duel',
		title: 'A challenge',
		text: 'A swaggering knight insults your house and demands satisfaction.',
		options: [
			{ label: 'Accept the duel', stat: 'martial', dc: 10, win: { text: 'Steel rings; the knight yields.', renown: 10, martial: 1 }, lose: { text: 'You are cut badly.', health: -30, renown: -4 } },
			{ label: 'Out-wit him', stat: 'intrigue', dc: 10, win: { text: 'You turn the crowd; he slinks off.', renown: 6 }, lose: { text: 'Laughter follows you out.', renown: -6 } },
			{ label: 'Apologise', win: { text: 'Prudence over pride.', renown: -3 } }
		]
	},
	{
		id: 'scholar',
		title: 'The wandering sage',
		text: 'A sage offers to teach you, for a fee, the arts of rule and war.',
		options: [
			{ label: 'Study statecraft (30g)', win: { text: 'Ledgers and laws grow clear.', gold: -30, stewardship: 1, diplomacy: 1 } },
			{ label: 'Study strategy (30g)', win: { text: 'Battle maps fill your dreams.', gold: -30, martial: 2 } },
			{ label: 'Debate the sage', stat: 'diplomacy', dc: 11, win: { text: 'You win! The sage pays YOU.', gold: 20, renown: 5, trait: 'Scholar' }, lose: { text: 'Humbled, you learn a little anyway.', stewardship: 1 } }
		]
	},
	{
		id: 'storm',
		title: 'Storm on the pass',
		text: 'Black clouds swallow the mountain road. Shelter is a cave, already occupied by something growling.',
		options: [
			{ label: 'Drive the beast out', stat: 'martial', dc: 11, win: { text: 'You win the cave and a fine pelt.', gold: 20, renown: 4, trait: 'Brave' }, lose: { text: 'Claws rake you.', health: -30 } },
			{ label: 'Weather the storm outside', win: { text: 'Frozen and miserable, you survive.', health: -15 } }
		]
	},
	{
		id: 'spy',
		title: 'A whisper in the tavern',
		text: 'A hooded figure offers secrets of the local lord, for a price.',
		options: [
			{ label: 'Buy the secret (25g)', stat: 'intrigue', dc: 8, win: { text: 'Blackmail pays handsomely.', gold: 45, intrigue: 1 }, lose: { text: 'It was a trap; you flee.', gold: -25, health: -10 } },
			{ label: 'Report them to the watch', win: { text: 'The lord thanks you.', renown: 5 } },
			{ label: 'Ignore', win: { text: 'Not your business.' } }
		]
	},
	{
		id: 'festival',
		title: 'Harvest festival',
		text: 'Lanterns, music, roast boar. The whole town is dancing.',
		options: [
			{ label: 'Join the revels', win: { text: 'A night to remember.', health: 10, gold: -5 } },
			{ label: 'Win the drinking contest', stat: 'martial', dc: 9, win: { text: 'Legend!', renown: 6, gold: 15 }, lose: { text: 'You wake in a ditch, purse gone.', gold: -15, health: -5 } },
			{ label: 'Sell wares to revellers', stat: 'stewardship', dc: 7, win: { text: 'Brisk trade.', gold: 30 }, lose: { text: 'Nobody buys.' } }
		]
	},
	{
		id: 'deserters',
		title: 'Deserters',
		text: 'Hungry soldiers who fled a lost battle beg to follow you.',
		options: [
			{ label: 'Take them in (20g)', win: { text: 'A loyal band forms around you.', gold: -20, renown: 6, martial: 1 } },
			{ label: 'Turn them in for bounty', win: { text: 'Coin, and a bitter taste.', gold: 30, renown: -4, trait: 'Cruel' } },
			{ label: 'Send them home', win: { text: 'They thank you with tears.', renown: 2 } }
		]
	}
];
