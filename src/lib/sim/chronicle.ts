import type { Rng } from '../rng';
import type { ChronEvent, EventKind, IdeologyKind } from './types';

export interface AnnalEntry {
	year: number;
	month?: number;
	eraName?: string;
	headline: string;
	prose: string;
	events: ChronEvent[];
}

/** Procedural war declaration narration with rich pretexts and ally rally descriptions */
export function narrateWar(
	rng: Rng,
	attackerName: string,
	defenderName: string,
	warName: string,
	reason?: string,
	alliesJoined?: string
): string {
	const allies = alliesJoined ? ` ${alliesJoined}` : '';

	if (reason === 'to crush the rebels') {
		const templates = [
			`Outraged by treason, the crown of ${attackerName} mobilizes imperial cohorts to crush the upstart insurrection in ${defenderName}. The ${warName} begins in fire and iron.`,
			`Vowing to eradicate rebellion, ${attackerName} marches swiftly upon ${defenderName}. The drums of the ${warName} echo across the provinces.`,
			`Seeking to restore imperial order by force, ${attackerName} dispatches punitive legions to subdue ${defenderName}. The bitter ${warName} is underway.`
		];
		return rng.pick(templates);
	}

	if (reason === 'apocalyptic conquest') {
		const templates = [
			`Swearing ruin upon all mortal realms, ${attackerName} launches an onslaught against ${defenderName}. The terrifying ${warName} begins!`,
			`Banners of black iron unfurl as ${attackerName} descends upon ${defenderName} to scour civilization. The apocalyptic ${warName} begins!`,
			`A tide of darkness pours across the frontier: ${attackerName} marches to obliterate ${defenderName}. The ${warName} erupts in terror.`
		];
		return rng.pick(templates);
	}

	if (reason) {
		const templates = [
			`Citing ${reason}, the heralds of ${attackerName} deliver an ultimatum of war to ${defenderName}. The ${warName} begins.${allies}`,
			`${attackerName} declares open hostility against ${defenderName} on pretexts of ${reason}: the ${warName} erupts across the borders.${allies}`,
			`Driven by ${reason}, ${attackerName} draws the sword against ${defenderName}. Across the borderlands, the ${warName} begins.${allies}`
		];
		return rng.pick(templates);
	}

	const templates = [
		`Denouncing ancient covenants, the heralds of ${attackerName} proclaim war upon ${defenderName}. Trumpets sound across the frontier as the ${warName} begins.${allies}`,
		`Citing border encroachments and bitter territorial grievances, ${attackerName} mobilizes its hosts against ${defenderName}. Banners unfurl for the ${warName}.${allies}`,
		`Ambition stirs in the courts of ${attackerName}, which openly claims dominion over ${defenderName}. The realm braces as the ${warName} erupts.${allies}`,
		`Old border feuds boil over into open bloodshed: ${attackerName} launches a determined invasion into ${defenderName}, igniting the ${warName}.${allies}`,
		`With swords drawn and ancient pacts invoked, ${attackerName} marches against ${defenderName}. The ${warName} begins.${allies}`
	];
	return rng.pick(templates);
}

/** Procedural siege & town capture narration */
export function narrateSiege(
	rng: Rng,
	winnerName: string,
	loserName: string,
	placeName: string,
	isCapital: boolean
): string {
	if (isCapital) {
		const templates = [
			`After a bitter siege, the ramparts of ${placeName} give way! Vanguard forces of ${winnerName} storm the royal seat of ${loserName}, casting down imperial banners and plundering the state vaults.`,
			`The walls of ${placeName} crumble under heavy assault! Cohorts of ${winnerName} breach the defenses of ${loserName}'s capital, scattering the garrison and sacking the palace.`,
			`Flames engulf the towers of ${placeName}! Soldiers of ${winnerName} force the inner courtyards of ${loserName}'s capital; the royal garrison breaks, and the seat of power falls.`,
			`A catastrophic blow to ${loserName}: legions of ${winnerName} overrun the citadel of ${placeName}, seizing the royal seat and routing the high council.`
		];
		return rng.pick(templates);
	}

	const templates = [
		`Garrisons of ${winnerName} storm the ramparts of ${placeName}, driving out the defenders of ${loserName} and hoisting their triumphant colors.`,
		`Following fierce fighting along the fortifications, ${placeName} surrenders to ${winnerName}; its magistrates swear fealty as ${loserName}'s banner is hauled down.`,
		`${winnerName} overruns the defensive holdfasts of ${placeName}, annexing the town and its fertile environs from ${loserName}.`,
		`The banners of ${winnerName} are raised over ${placeName} as victorious cohorts march in, ending ${loserName}'s dominion over the district.`
	];
	return rng.pick(templates);
}

/** Procedural relic looting narration */
export function narrateRelicLoot(
	rng: Rng,
	winnerName: string,
	loserName: string,
	relicName: string
): string {
	const templates = [
		`Amid the smoldering citadel of ${loserName}, champions of ${winnerName} uncover the legendary relic ${relicName}, bearing it away in triumph!`,
		`The sacred relic ${relicName} is wrested from the treasure vaults of ${loserName} by the victorious conquerors of ${winnerName}.`,
		`Legions of ${winnerName} seize the ancient relic ${relicName} from the fallen halls of ${loserName}, claiming its storied power.`
	];
	return rng.pick(templates);
}

/** Procedural realm collapse and dynastic extinction narration */
export function narrateFall(
	rng: Rng,
	realmFullName: string,
	rulerName?: string,
	rulerHouse?: string
): string {
	if (rulerName && rulerHouse) {
		const templates = [
			`The final citadels fall, and the crown of ${realmFullName} is broken forever. With treasuries emptied and borders dissolved, ${rulerName} ${rulerHouse} flees into bitter exile as the realm fades into legend.`,
			`The sun sets upon ${realmFullName}. Bereft of armies and abandoned by vassals, the realm collapses into history; ${rulerName} ${rulerHouse} escapes into the wilderness.`,
			`An ancient sovereign power falls to dust: ${realmFullName} is extinguished. Royal archives smolder, and ${rulerName} ${rulerHouse} flees into obscurity.`,
			`Banners trampled and throne abandoned, ${realmFullName} ceases to exist as a sovereign power. ${rulerName} ${rulerHouse} flees the ashes of their former dominion.`
		];
		return rng.pick(templates);
	}

	const templates = [
		`The last strongholds of ${realmFullName} have fallen. With its towns annexed and treasuries exhausted, the realm dissolves into the annals of antiquity.`,
		`The crown of ${realmFullName} is shattered. Its territories partitioned and its banners buried, the realm fades into myth.`
	];
	return rng.pick(templates);
}

/** Procedural peace treaty and concordat narration */
export function narratePeace(
	rng: Rng,
	warName: string,
	durationYears: number,
	outcome: 'attackers' | 'defenders' | 'white',
	winnerText: string
): string {
	const dur = durationYears <= 0 ? 'less than a year' : `${durationYears} year${durationYears === 1 ? '' : 's'}`;

	if (outcome === 'attackers') {
		const templates = [
			`Envoys convene upon neutral ground to ratify a solemn treaty, concluding the ${warName} after ${dur}. With frontiers redrawn, ${winnerText} dictate terms to the vanquished.`,
			`The ${warName} reaches its conclusion after ${dur} of bloodshed: ${winnerText} triumph decisively, forcing a humiliating treaty upon their foes.`,
			`A victor's peace is forged: after ${dur} of campaign in the ${warName}, ${winnerText} prevail, annexing contested borderlands.`
		];
		return rng.pick(templates);
	}

	if (outcome === 'defenders') {
		const templates = [
			`Beaten back from stubborn ramparts, the invasion stalls. The ${warName} concludes after ${dur} as ${winnerText} successfully preserve their independence.`,
			`Through stubborn resolve, ${winnerText} shatter the enemy offensive. The ${warName} ends after ${dur} with the defenders holding firm.`,
			`Peace returns as invading hosts withdraw in disarray: ${winnerText} defend their ancestral soil, concluding the ${warName} (${dur}).`
		];
		return rng.pick(templates);
	}

	const templates = [
		`Exhausted by protracted attrition, both sides sign an armistice concluding the ${warName} (${dur}). Scabbards are sheathed and the status quo ante is restored.`,
		`Neither camp can break the front: envoys sign a mutual cessation of hostilities, ending the ${warName} (${dur}) in an uneasy truce.`,
		`White banners flutter over the war camps. The ${warName} ends in mutual exhaustion after ${dur}; borders return to former lines.`
	];
	return rng.pick(templates);
}

/** Procedural monarch passing and succession narration */
export function narrateDeath(
	rng: Rng,
	rulerName: string,
	rulerHouse: string,
	polName: string,
	cause: string,
	heirName: string,
	isChild: boolean,
	heirAge: number
): string {
	if (isChild) {
		const templates = [
			`In ${polName}, ${rulerName} ${rulerHouse} departs this life, succumbing to ${cause}. The child ${heirName} (age ${heirAge}) is crowned beneath a wary council of regents.`,
			`Mourning envelops ${polName}: ${rulerName} ${rulerHouse} dies of ${cause}. The royal scepter passes to ${heirName}, an underage youth of ${heirAge} years, under the stewardship of high chancellors.`,
			`The bells of ${polName} toll for the passing of ${rulerName} ${rulerHouse} (${cause}). The youth ${heirName} ascends the throne under a regency council.`
		];
		return rng.pick(templates);
	}

	const templates = [
		`In the royal halls of ${polName}, ${rulerName} ${rulerHouse} breathes their last, succumbing to ${cause}. ${heirName} ascends the ancestral throne amid solemn acclamation.`,
		`The reign of ${rulerName} ${rulerHouse} in ${polName} concludes with their death (${cause}). ${heirName} takes up the royal mantle, vowing to defend the realm.`,
		`Solemn rites echo through ${polName} following the death of ${rulerName} ${rulerHouse} (${cause}). ${heirName} is crowned sovereign before the assembled court.`
	];
	return rng.pick(templates);
}

/** Procedural heirless crisis and usurper ascension narration */
export function narrateHeirlessCrisis(
	rng: Rng,
	rulerName: string,
	rulerHouse: string,
	polName: string,
	cause: string,
	claimantHouse: string
): string {
	const templates = [
		`The death of ${rulerName} ${rulerHouse} (${cause}) leaves ${polName} without an acknowledged heir. In the ensuing succession crisis, House ${claimantHouse} seizes the high throne amidst palace turmoil.`,
		`Dynastic extinction strikes ${polName}: ${rulerName} dies heirless (${cause}). Amid whispers of poison and sword-drawn councils, House ${claimantHouse} claims the vacant crown.`,
		`A perilous interregnum grips ${polName} following the heirless death of ${rulerName} (${cause}). Retainers of House ${claimantHouse} storm the assembly and usurp the crown.`
	];
	return rng.pick(templates);
}

/** Procedural rebellion and secession narration */
export function narrateRebellion(
	rng: Rng,
	townName: string,
	oldPolityName: string,
	newPolityFullName: string,
	leaderName: string,
	ideology?: IdeologyKind
): string {
	if (ideology === 'republic') {
		const templates = [
			`REPUBLICAN REVOLT: Weary of monarchical tyranny, the burghers and civic guilds of ${townName} take up arms for freedom! Seceding from ${oldPolityName}, they hoist republican banners beneath ${leaderName} to establish the ${newPolityFullName}.`,
			`REPUBLICAN REVOLT: Declaring citizen liberty inviolable, the populace of ${townName} casts out imperial governors! Renouncing allegiance to ${oldPolityName}, ${leaderName} proclaims the sovereign ${newPolityFullName}.`
		];
		return rng.pick(templates);
	}
	if (ideology === 'communal') {
		const templates = [
			`AGRARIAN REVOLT: Crushed by feudal tithes and noble exploitation, the laborers of ${townName} rise in open insurrection! Renouncing the lords of ${oldPolityName}, they establish the ${newPolityFullName} with ${leaderName} leading the commune.`,
			`POPULAR UPRISING: Folk moots and agrarian communes in ${townName} seize local granaries and cast off the yoke of ${oldPolityName}! The people inaugurate the ${newPolityFullName} under the stewardship of ${leaderName}.`
		];
		return rng.pick(templates);
	}
	if (ideology === 'oligarchy') {
		const templates = [
			`MERCANTILE SECESSION: Wealthy patricians and merchant cartels in ${townName} rebel against royal tariffs! Declaring commercial independence from ${oldPolityName}, ${leaderName} establishes the ${newPolityFullName}.`
		];
		return rng.pick(templates);
	}
	if (ideology === 'theocracy') {
		const templates = [
			`ZEALOT UPRISING: Inspired by divine visions and clerical fury, the faithful of ${townName} rise against the secular court of ${oldPolityName}! Proclaiming holy mandate, ${leaderName} consecrates the ${newPolityFullName}.`
		];
		return rng.pick(templates);
	}
	const templates = [
		`Galled by heavy tithes and distant decrees, the citizens of ${townName} cast out their bailiffs! Renouncing all allegiance to ${oldPolityName}, ${leaderName} proclaims the sovereign ${newPolityFullName}.`,
		`Insurrection flares in ${townName}! Declaring their liberties inviolable, the populace casts off the yoke of ${oldPolityName} and rallies beneath the banner of ${leaderName}, establishing the ${newPolityFullName}.`,
		`Defying the crown of ${oldPolityName}, the garrison and civic guilds of ${townName} mutiny! The sovereign ${newPolityFullName} is declared with ${leaderName} at its helm.`
	];
	return rng.pick(templates);
}

/** Procedural regime transformation and constitutional shift narration */
export function narrateSystemChange(
	rng: Rng,
	polName: string,
	oldFullName: string,
	newFullName: string,
	context: 'revolution' | 'reform' | 'conquest' | 'interregnum' | 'avatar' | 'coup' | 'revolt',
	leaderOrRulerName: string,
	victorName?: string
): string {
	if (context === 'revolt') {
		const templates = [
			`PROVINCIAL SECESSION: Renouncing all allegiance to ${oldFullName}, ${leaderOrRulerName} rallies insurgent towns in ${polName} to proclaim the independent ${newFullName}!`,
			`REBEL SOVEREIGNTY: Defying imperial decrees, provincial rebels in ${polName} establish their own constitution, inaugurating the sovereign ${newFullName}!`
		];
		return rng.pick(templates);
	}

	if (context === 'coup') {
		const templates = [
			`COUP D'ETAT: Mutinous conspirators led by ${leaderOrRulerName} strike at midnight in ${polName}! The revolutionary council seizes control, overthrowing the sovereign and proclaiming the ${newFullName}!`,
			`COUP D'ETAT: Armed regiments loyal to ${leaderOrRulerName} storm the government palace in ${polName}! The faction seizes control, establishing the ${newFullName}.`,
			`COUP D'ETAT: A sudden palace putsch overthrows the established order in ${polName}! ${leaderOrRulerName} seizes control amidst martial decrees, proclaiming the ${newFullName}!`
		];
		return rng.pick(templates);
	}

	if (context === 'revolution') {
		const templates = [
			`POPULAR REVOLUTION: Crowds fill the avenues of ${polName} as a mass uprising topples the throne of ${oldFullName}! The ancient autocracy is abolished, and ${leaderOrRulerName} proclaims the sovereign ${newFullName}!`,
			`POPULAR REVOLUTION: Spurred by cries for liberty and bread, popular assemblies across ${polName} overthrow the old order! Monarchy is dismantled, and the revolutionary convention inaugurates the ${newFullName}.`,
			`POPULAR REVOLUTION: Rising against tyranny and privilege, the populace of ${polName} storms the seat of government! With the former regime swept aside, ${leaderOrRulerName} proclaims the foundation of the ${newFullName}!`
		];
		return rng.pick(templates);
	}

	if (context === 'reform') {
		const templates = [
			`CONSTITUTIONAL REFORM: The Grand Assembly of ${polName} peacefully promulgates a new constitutional charter! Yielding absolute authority, ${leaderOrRulerName} transitions ${oldFullName} into the ${newFullName}.`,
			`CONSTITUTIONAL REFORM: Amid national debate and civic petitions, the government of ${polName} adopts sweeping constitutional reforms! ${oldFullName} peacefully reorganizes as the ${newFullName}.`,
			`CONSTITUTIONAL REFORM: Sovereign and citizens forge a historic concordat in ${polName}! Relinquishing autocratic rule, the state formally reconstitutes as the ${newFullName}.`
		];
		return rng.pick(templates);
	}

	if (context === 'conquest') {
		const victor = victorName || 'victorious forces';
		const templates = [
			`ENFORCED REGIME CHANGE: Dictated at swordpoint by ${victor}, the old institutions of ${oldFullName} are dismantled! The defeated realm is reorganized into the ${newFullName} under a new constitutional treaty.`,
			`ENFORCED REGIME CHANGE: Following decisive defeat in war, ${victor} imposes constitutional terms upon ${polName}! The former rulers are ousted, and the ${newFullName} is inaugurated.`,
			`ENFORCED REGIME CHANGE: Victorious armies from ${victor} mandate total political reorganization in ${polName}! Overthrowing the vanquished elite, they inaugurate the ${newFullName}.`
		];
		return rng.pick(templates);
	}

	if (context === 'interregnum') {
		const templates = [
			`INTERREGNUM ABOLITION: With the royal lineage of ${polName} extinct and no heir to claim the throne, the citizens refuse another monarch! The High Council dissolves the crown and inaugurates the ${newFullName}.`,
			`INTERREGNUM ABOLITION: Following the death of the sovereign without heirs, the estates of ${polName} reject dynastic succession! A citizen senate convenes, proclaiming the ${newFullName}.`,
			`INTERREGNUM ABOLITION: Dynastic collapse in ${polName} ends centuries of kingship! The people formally abolish the monarchy, establishing the ${newFullName}.`
		];
		return rng.pick(templates);
	}

	// avatar or sovereign decree
	const templates = [
		`SYSTEM TRANSFORMATION: By sovereign decree in ${polName}, ${leaderOrRulerName} dissolves the old administrative order, reconstituting the realm as the ${newFullName}!`,
		`SYSTEM TRANSFORMATION: Proclaiming an epoch of renewal, ${leaderOrRulerName} enacts a fundamental shift in governance, transitioning ${oldFullName} into the ${newFullName}!`
	];
	return rng.pick(templates);
}

/** Procedural palace coup narration */
export function narratePalaceCoup(
	rng: Rng,
	plotterName: string,
	rulerName: string,
	polName: string
): string {
	const templates = [
		`Under cover of midnight, General ${plotterName} leads mutinous palace guards into the royal chambers. ${rulerName} is overthrown in a swift coup, and ${plotterName} seizes the crown of ${polName}!`,
		`A bloody conspiracy in the capital: General ${plotterName} marches veterans into the council hall, deposing ${rulerName} and proclaiming military rule over ${polName}.`,
		`Treachery in the halls of state: General ${plotterName} strikes down ${rulerName} in a palace revolt, donning the bloodstained mantle of ${polName}.`
	];
	return rng.pick(templates);
}

/** Procedural religious conversion narration */
export function narrateConversion(
	rng: Rng,
	polName: string,
	religionName: string
): string {
	const templates = [
		`Spiritual fervor grips the court: ${polName} officially embraces the ${religionName}, throwing open temples and dedicating the realm to new divine rites.`,
		`Missionaries and divine portents sway the ruling councils: ${polName} formally converts to the ${religionName}, mandating sacred observances across the provinces.`,
		`An epochal spiritual turning: the monarch and lords of ${polName} embrace the ${religionName}, casting aside former traditions.`
	];
	return rng.pick(templates);
}

/** Procedural prophet and heresy narration */
export function narrateProphet(
	rng: Rng,
	prophetName: string,
	townName: string,
	religionName: string
): string {
	const templates = [
		`In the bustling market squares of ${townName}, the charismatic prophet ${prophetName} begins preaching miraculous visions, winning throngs of converts to the newly revealed ${religionName}.`,
		`A wandering mystic named ${prophetName} appears before the gates of ${townName}, gathering disciples with impassioned sermons and igniting the fervent ${religionName}.`,
		`Ecstatic revelations shake ${townName}: the prophet ${prophetName} proclaims divine truths, establishing the foundations of the ${religionName}.`
	];
	return rng.pick(templates);
}

/** Procedural realm founding narration */
export function narrateFounding(
	rng: Rng,
	newPolityFullName: string,
	townName: string
): string {
	const templates = [
		`Upon the fertile crossroads of ${townName}, allied elders and chieftains swear a founding compact, raising the banners of the sovereign ${newPolityFullName}.`,
		`The civic bell of ${townName} tolls as magistrates and clan heads inaugurate the ${newPolityFullName}, establishing its seat of power.`,
		`A new realm takes its place upon the world stage: the ${newPolityFullName} is founded at ${townName}.`
	];
	return rng.pick(templates);
}

/** Procedural settlement incorporation narration */
export function narrateColonization(
	rng: Rng,
	realmName: string,
	townName: string
): string {
	const templates = [
		`Settlers and frontier patrols from ${realmName} incorporate ${townName} into the realm, extending their laws over its fields and markets.`,
		`The magistrates of ${realmName} establish order over ${townName}, bringing its folk and waterways beneath the imperial banner.`,
		`${realmName} peacefully absorbs ${townName}, expanding its sovereign borders and establishing formal trade garrisons.`
	];
	return rng.pick(templates);
}

/** Procedural natural disaster narration */
export function narrateDisaster(
	rng: Rng,
	kind: 'famine' | 'fire' | 'plague',
	targetName: string,
	realmName?: string
): string {
	if (kind === 'famine') {
		const templates = [
			`Scorched fields and dry wells bring a devastating famine across ${realmName ?? targetName}. Granaries run dry, and gaunt crowds pray for relief.`,
			`Blight strikes the grain harvests of ${realmName ?? targetName}; hunger stalks village and city alike as bread prices soar.`,
			`The curse of drought descends upon ${realmName ?? targetName}: fields yield only dust, and famine spreads across the provinces.`
		];
		return rng.pick(templates);
	}

	if (kind === 'fire') {
		const templates = [
			`A catastrophic fire tears through the wooden quarters of ${targetName}, consuming whole avenues and reducing venerable storehouses to smoldering ash.`,
			`Flames sweep unimpeded through ${targetName}; hundreds flee into the streets as bucket brigades battle the raging conflagration.`,
			`Sparks from a smithy ignite a fierce firestorm in ${targetName}, destroying ancient temples and market pavilions.`
		];
		return rng.pick(templates);
	}

	const templates = [
		`The black rot strikes${targetName ? ` ${targetName}` : ''}! Church bells toll without ceasing as pestilence stalks streets and houses.`,
		`A virulent pestilence erupts${targetName ? ` in ${targetName}` : ''}, decimating trade and filling mass graves outside the city gates.`,
		`Sickness walks by day and night in ${targetName}: a deadly plague takes hold, emptying bustling thoroughfares.`
	];
	return rng.pick(templates);
}

/** Procedural golden age and portents narration */
export function narrateMiscEvent(
	rng: Rng,
	kind: 'golden_age' | 'comet' | 'library' | 'wall' | 'road' | 'omen',
	targetName: string,
	realmName?: string
): string {
	if (kind === 'golden_age') {
		const templates = [
			`An illustrious Golden Age dawns in ${realmName ?? targetName}: overflowing granaries, peaceful trade routes, and renowned artists bring unprecedented splendor to ${targetName}.`,
			`Prosperity shines upon ${realmName ?? targetName}: master architects and poets flock to ${targetName} as coffers overflow and harvests reach record yields.`,
			`Peace and commerce flourish across ${realmName ?? targetName}: chroniclers record a magnificent golden era centered upon the palaces of ${targetName}.`
		];
		return rng.pick(templates);
	}

	if (kind === 'comet') {
		return `A blazing crimson comet arcs across the night skies above ${targetName}; court astrologers dispute whether it foretells glorious conquest or catastrophic ruin.`;
	}

	if (kind === 'library') {
		return `Scholars and scribes of ${targetName} inaugurate a magnificent Great Library, drawing philosophers and alchemists from distant lands.`;
	}

	if (kind === 'wall') {
		return `Masons in ${realmName ?? targetName} lay the final battlements upon monumental stone walls encircling ${targetName}, fortifying the jewel of the realm.`;
	}

	if (kind === 'road') {
		return `Merchant guilds of ${targetName} open an expansive paved trade highway, linking mountain passes to bustling lowlands.`;
	}

	return `Strange portents disturb the folk of ${targetName}: two-headed calves are born and springs run wine-dark. Priests offer fervent sacrifices.`;
}

/** Synthesize a list of ChronEvents into structured annual annal entries */
export function synthesizeAnnualAnnals(
	events: readonly ChronEvent[],
	worldName: string,
	maxYears = 1000
): AnnalEntry[] {
	if (!events.length) return [];

	// Group events by year
	const byYear = new Map<number, ChronEvent[]>();
	for (const e of events) {
		const list = byYear.get(e.y) ?? [];
		list.push(e);
		byYear.set(e.y, list);
	}

	const sortedYears = [...byYear.keys()].sort((a, b) => b - a).slice(0, maxYears);
	const annals: AnnalEntry[] = [];

	for (const y of sortedYears) {
		const yearEvents = byYear.get(y)!;
		const headline = deriveYearHeadline(yearEvents);
		const prose = weaveYearProse(yearEvents, y, worldName);

		annals.push({
			year: y,
			headline,
			prose,
			events: yearEvents
		});
	}

	return annals;
}

/** Determine an evocative summary headline for a year's events */
function deriveYearHeadline(events: ChronEvent[]): string {
	const kinds = new Set(events.map((e) => e.kind));

	if (kinds.has('uprising')) return 'Riots, Cabals, and Populist Uprisings';
	if (kinds.has('fall')) return 'The Breaking of Crowns and Thrones';
	if (kinds.has('war')) return 'Drums of War Echo Across the Frontiers';
	if (kinds.has('capture')) return 'Citadels Stormed and Borders Redrawn';
	if (kinds.has('disaster')) return 'Seasons of Calamity and Trial';
	if (kinds.has('god')) return 'Miracles and Heavens in Motion';
	if (kinds.has('rebel')) return 'Insurrections and Defiant Banners';
	if (kinds.has('peace')) return 'Concordats and Treaties of Peace';
	if (kinds.has('death')) return 'The Passing of Rulers';
	if (kinds.has('faith')) return 'Revelations and Spiritual Awakenings';
	if (kinds.has('found')) return 'New Foundations and Settler Roads';
	return 'Tidings and Annals of the Realm';
}

/** Weave multiple individual events into a cohesive historical narrative paragraph */
function weaveYearProse(events: ChronEvent[], year: number, worldName: string): string {
	if (events.length === 0) {
		return `The year ${year} passed in tranquility across ${worldName}, with seasons turning without major upheaval recorded in the archives.`;
	}

	if (events.length === 1) {
		return events[0].text;
	}

	// Weave 2 to 4 major events with literary transitions
	const sentences = events.map((e) => e.text.trim());
	const parts: string[] = [];

	for (let i = 0; i < sentences.length; i++) {
		const s = sentences[i];
		if (i === 0) {
			parts.push(s);
		} else if (i === 1) {
			parts.push(`Meanwhile, ${lowercaseFirst(s)}`);
		} else if (i === 2) {
			parts.push(`Before the seasons turned, ${lowercaseFirst(s)}`);
		} else {
			parts.push(`Across other quarters of ${worldName}, ${lowercaseFirst(s)}`);
		}
	}

	return parts.join(' ');
}

function lowercaseFirst(str: string): string {
	if (!str) return '';
	// Avoid lowercasing proper names or acronyms (e.g. "Free City", "DOOMSDAY", "House")
	const firstWord = str.split(' ')[0];
	if (/^[A-Z][a-z]+$/.test(firstWord) && !['House', 'General', 'Lord', 'King', 'Queen', 'Emperor', 'Prince'].includes(firstWord)) {
		return str.charAt(0).toLowerCase() + str.slice(1);
	}
	return str;
}

/** Compile all chronicle annals into an exportable, formatted Markdown chronicle book */
export function compileAnnalsBookMarkdown(events: readonly ChronEvent[], worldName: string, maxYears = 1000): string {
	const annals = synthesizeAnnualAnnals(events, worldName, maxYears);
	const lines: string[] = [
		`# The Annals of ${worldName}`,
		`*Transcribed from the Great Archives and Royal Chronicles.*\n`
	];

	if (!annals.length) {
		lines.push('*The pages of this chronicle remain unwritten.*');
		return lines.join('\n');
	}

	for (const a of annals) {
		lines.push(`### Year ${a.year}: ${a.headline}\n`);
		lines.push(a.prose);
		lines.push('');
		if (a.events.length > 1) {
			lines.push('*Key occurrences:*');
			for (const e of a.events) {
				lines.push(`- **Month ${e.m + 1}** (${e.kind}): ${e.text}`);
			}
			lines.push('');
		}
	}

	return lines.join('\n');
}
