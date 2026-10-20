import type { Simulation } from './engine';

export type SagaKind = 'epic_poem' | 'ballad' | 'tragedy' | 'heroic_saga' | 'court_tapestry';

export interface BardicSaga {
	id: number;
	title: string;
	kind: SagaKind;
	yearComposed: number;
	author: string;
	culture: number;
	subjectPersonId?: number;
	subjectStateId?: number;
	stanzas: string[];
	fame: number;
	monumentCell?: number;
	tapestryBurgId?: number;
}

export interface SagasState {
	sagas: BardicSaga[];
	nextSagaId: number;
}

const simSagasMap = new WeakMap<Simulation, SagasState>();

export function getSagasState(sim: Simulation): SagasState {
	let state = simSagasMap.get(sim);
	if (!state) {
		const raw = (sim as unknown as { _sagasState?: SagasState })._sagasState;
		if (raw) {
			state = raw;
		} else {
			state = {
				sagas: [],
				nextSagaId: 1
			};
			(sim as unknown as { _sagasState?: SagasState })._sagasState = state;
		}
		simSagasMap.set(sim, state);
	}
	return state;
}

const BARDIC_AUTHORS = [
	'Bragi of the Iron Harp',
	'Oisin the Silver-Voiced',
	'Taliesin the Wanderer',
	'Kaelen of the Mist',
	'Morwen the Chronicler',
	'Elowen of the Western Shore',
	'Viggo the Skald',
	'Althaea the Melodious',
	'Cynewulf of the High Moors',
	'Daeron the Singer',
	'Rhiannon of the Whispering Pines',
	'Gildas the Far-Traveled'
];

interface EventContext {
	title?: string;
	heroName?: string;
	foeName?: string;
	realmName?: string;
	cell?: number;
	subjectPersonId?: number;
	subjectStateId?: number;
	culture?: number;
}

/**
 * Generate alliterative stanzas and heroic poetry commemorating actual world events.
 * Strictly zero em dashes across all stanzas and lines.
 */
export function composeSagaForEvent(
	sim: Simulation,
	eventKind: 'war' | 'titan_slain' | 'fall' | 'apotheosis' | 'resurgence',
	context: EventContext = {}
): BardicSaga {
	const state = getSagasState(sim);
	const rng = sim.rng;

	const id = state.nextSagaId++;
	const hero = context.heroName || 'the Champion of the Sun';
	const foe = context.foeName || 'the World-Eater';
	const realm = context.realmName || 'the Crown Realm';

	let sagaKind: SagaKind = 'epic_poem';
	let title = context.title || '';
	const stanzas: string[] = [];
	let fame = 30 + Math.floor(rng() * 40);

	if (eventKind === 'war') {
		sagaKind = rng() < 0.5 ? 'epic_poem' : 'heroic_saga';
		if (!title) {
			const titles = [
				`The Song of ${realm}'s Legions`,
				`The Lay of the Blood-Red Plains`,
				`The Clash of Iron Banners`,
				`The Stand of ${hero}`,
				`The March of the Ten Thousand Shields`
			];
			title = titles[Math.floor(rng() * titles.length)];
		}
		stanzas.push(
			`Horns echoed hollow from mist-covered hills,\n` +
			`Warriors assembled with ash-wood and steel;\n` +
			`Banners blazed bright in the cold winter breath,\n` +
			`Marching to measure their might on the field.`
		);
		stanzas.push(
			`Shields shattered loudly when battle was joined,\n` +
			`Blades broke through bronze in the furious fray;\n` +
			`Ravens wheeled high above reddened mud,\n` +
			`Feasting where fallen combatants lay.`
		);
		stanzas.push(
			`Stout stood the line where ${hero} fought,\n` +
			`Carving a path through the crushing press;\n` +
			`No man turned back from the thunderous front,\n` +
			`Winning eternal renown in distress.`
		);
		stanzas.push(
			`Now songs shall sound by the feast-hall fires,\n` +
			`Telling the tale of that crimson strand;\n` +
			`Long will the bards chant of valor and blood,\n` +
			`Shielding the borders of ${realm}'s land.`
		);
		fame += 15;
	} else if (eventKind === 'titan_slain') {
		sagaKind = rng() < 0.6 ? 'heroic_saga' : 'ballad';
		if (!title) {
			const titles = [
				`The Lay of ${foe}'s Fall`,
				`The Doom of the World-Beast`,
				`The Song of the Slain Colossus`,
				`The Death-Chant of ${foe}`,
				`The Triumph of ${hero}`
			];
			title = titles[Math.floor(rng() * titles.length)];
		}
		stanzas.push(
			`From cavernous depths did ${foe} arise,\n` +
			`A titan of terror with scales black as pitch;\n` +
			`Earth shook with fury where claws tore the stone,\n` +
			`Leaving the valleys in desolate ruins.`
		);
		stanzas.push(
			`Yet fear found no home in the heart of ${hero},\n` +
			`Grasping a spear forged in star-fallen gold;\n` +
			`Climbing the crags where the beast made its lair,\n` +
			`Braving the blizzard and venomous cold.`
		);
		stanzas.push(
			`Lightning flashed fierce as the monster was pierced,\n` +
			`A thunderous roar shook the mountain to ash;\n` +
			`Down crashed the tyrant on broken basalt,\n` +
			`Ending its reign in a deafening crash.`
		);
		stanzas.push(
			`The horns of the free peoples echo anew,\n` +
			`The shadow has perished, the sun shines again;\n` +
			`Hymns for ${hero} shall outlive the stars,\n` +
			`Slayer of horrors and savior of men.`
		);
		fame += 25;
	} else if (eventKind === 'fall') {
		sagaKind = 'tragedy';
		if (!title) {
			const titles = [
				`The Lament of the Sacked Citadel`,
				`The Fall of ${realm}`,
				`Elegy of the Ruined Spires`,
				`The Weeping of ${realm}`,
				`Ashes of the High Throne`
			];
			title = titles[Math.floor(rng() * titles.length)];
		}
		stanzas.push(
			`The high gates were broken by iron and flame,\n` +
			`Great ramparts crumbled like sea-battered sand;\n` +
			`Fierce fires swallowed the towers of old,\n` +
			`Casting deep mourning across all the land.`
		);
		stanzas.push(
			`Where rulers once sat in their halls of delight,\n` +
			`Now ashes drift cold in the weeping wind;\n` +
			`Folk weep in sorrow for comrades struck down,\n` +
			`Mourning for glories that no one can mend.`
		);
		stanzas.push(
			`The jewels are plundered, the throne-room is bare,\n` +
			`The harps are made silent, the hearthfires are dead;\n` +
			`Only the ghosts walk the moss-covered walls,\n` +
			`Remembering blood that the valiant shed.`
		);
		stanzas.push(
			`Though stone turns to dust and dynasties fade,\n` +
			`The lay of ${realm} shall never decay;\n` +
			`Carved in the hearts of the wandering folk,\n` +
			`Waiting the dawn of a brighter day.`
		);
		fame += 10;
	} else if (eventKind === 'apotheosis') {
		sagaKind = 'ballad';
		if (!title) {
			const titles = [
				`The Ascendance of ${hero}`,
				`The Star-Crowned Sovereign`,
				`Song of the Golden Dawn`,
				`The Hymn of Divine Ascension`,
				`The Transfiguration of ${hero}`
			];
			title = titles[Math.floor(rng() * titles.length)];
		}
		stanzas.push(
			`A radiance pierced through the midnight of time,\n` +
			`As mortal clay yielded to celestial grace;\n` +
			`Starfire descended on ${hero}'s brow,\n` +
			`Shining supreme across boundless space.`
		);
		stanzas.push(
			`No blade of this realm can ever pierce more,\n` +
			`The spirit unchained from the sorrow of bone;\n` +
			`Rising on wings of immaculate white,\n` +
			`Taking their place on the heavenly throne.`
		);
		stanzas.push(
			`The crops bloom with silver, the rivers run sweet,\n` +
			`A sacred blessing descends from the height;\n` +
			`Hate turns to peace where the hallowed foot trod,\n` +
			`Bathing the world in miraculous light.`
		);
		stanzas.push(
			`Watch over the wanderer, shepherd of souls,\n` +
			`Guide our frail barques on the perilous sea;\n` +
			`Long as the firmament circles the earth,\n` +
			`Thy holy name shall remembered be.`
		);
		fame += 30;
	} else {
		// 'resurgence'
		sagaKind = 'heroic_saga';
		if (!title) {
			const titles = [
				`The Rebirth of ${realm}`,
				`The Song of the Unbroken Banner`,
				`The Iron Resurgence`,
				`Return of the Exiled King`,
				`The Dawn of ${realm}`
			];
			title = titles[Math.floor(rng() * titles.length)];
		}
		stanzas.push(
			`From scattered ashes the small spark awoke,\n` +
			`Hidden through winters of sorrow and scorn;\n` +
			`Exiles returned to the lands of their sires,\n` +
			`Greeting the light of a glorious morn.`
		);
		stanzas.push(
			`The eagle banner was lifted once more,\n` +
			`Oaths were renewed with the clasping of hands;\n` +
			`Chains were struck off from the prisoner's wrists,\n` +
			`Freedom reclaimed through the ancestral lands.`
		);
		stanzas.push(
			`New walls were raised where the ruin had lain,\n` +
			`Anvils rang sweet in the blossoming spring;\n` +
			`Trade ships set sail for the welcoming ports,\n` +
			`Bringing rich tributes to honor the king.`
		);
		stanzas.push(
			`Never shall ${realm} be broken again,\n` +
			`Its roots run as deep as the mountain's cold core;\n` +
			`Proud stand the people through storm and through strife,\n` +
			`Flourishing now and forevermore.`
		);
		fame += 20;
	}

	// Pick author from living artist/thinker people or from traditional skalds
	let author = BARDIC_AUTHORS[Math.floor(rng() * BARDIC_AUTHORS.length)];
	const livingBards = sim.people.filter(
		(p) => p.alive && (p.role === 'artist' || p.role === 'thinker' || p.role === 'priest')
	);
	if (livingBards.length > 0 && rng() < 0.6) {
		const bard = livingBards[Math.floor(rng() * livingBards.length)];
		author = `${bard.name} ${bard.house ? 'of House ' + bard.house : 'the Skald'}`;
	}

	const culture = context.culture ?? (context.subjectStateId && sim.polities[context.subjectStateId]?.culture ? sim.polities[context.subjectStateId].culture : 1);

	const saga: BardicSaga = {
		id,
		title,
		kind: sagaKind,
		yearComposed: sim.year,
		author,
		culture,
		subjectPersonId: context.subjectPersonId,
		subjectStateId: context.subjectStateId,
		stanzas,
		fame,
		monumentCell: context.cell
	};

	state.sagas.push(saga);
	return saga;
}

/**
 * Rulers hang woven tapestries in guildhalls/palaces, granting +10 local stability and culture prestige.
 */
export function commissionCourtTapestry(
	sim: Simulation,
	sagaId: number,
	burgId: number
): { success: boolean; msg: string } {
	const state = getSagasState(sim);
	const saga = state.sagas.find((s) => s.id === sagaId);
	if (!saga) {
		return { success: false, msg: 'Saga not found in the chronicle records.' };
	}

	const burg = sim.w.burgs[burgId];
	if (!burg || !burg.alive) {
		return { success: false, msg: 'City not found or abandoned.' };
	}

	saga.tapestryBurgId = burgId;
	saga.fame += 10;

	if (burg.state && sim.polities[burg.state]?.alive) {
		const polity = sim.polities[burg.state];
		polity.stability = Math.min(100, polity.stability + 10);
	}

	const msg = `Master weavers hung the court tapestry of '${saga.title}' in the guildhall of ${burg.name}, bolstering civic stability (+10) and cultural prestige.`;
	return { success: true, msg };
}

/**
 * Builds a stone obelisk or heroic monument at the battlefield cell.
 */
export function erectHeroicMonument(
	sim: Simulation,
	sagaId: number,
	cell: number
): { success: boolean; msg: string } {
	const state = getSagasState(sim);
	const saga = state.sagas.find((s) => s.id === sagaId);
	if (!saga) {
		return { success: false, msg: 'Saga not found in the chronicle records.' };
	}

	if (cell < 0 || cell >= sim.w.cells.n) {
		return { success: false, msg: 'Invalid territory coordinates for monument.' };
	}

	if (sim.w.cells.h[cell] < 20) {
		return { success: false, msg: 'Cannot erect stone obelisk in open ocean water.' };
	}

	saga.monumentCell = cell;
	saga.fame += 15;
	sim.dirty.terrain = true;

	const msg = `Heroic stone obelisk carved and consecrated at cell ${cell} to immortalize '${saga.title}'.`;
	return { success: true, msg };
}

/**
 * Returns all recorded bardic sagas.
 */
export function getChronicleSagas(sim: Simulation): BardicSaga[] {
	return getSagasState(sim).sagas;
}
