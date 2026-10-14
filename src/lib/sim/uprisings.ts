import type { Rng } from '../rng';
import type { Person, Polity, UprisingKind, UprisingRecord } from './types';
import type { Simulation } from './engine';
import { packCult, packLine } from './genrepacks';

export interface UprisingEvent {
	kind: 'uprising';
	text: string;
	cell: number;
	state: number;
	uprisingId?: number;
}

const CULT_NAMES = [
	'Order of the Black Eclipse',
	'Disciples of the Void Star',
	'The Veiled Covenant',
	'Children of the Final Dawn',
	'Coven of the Crimson Chalice',
	'Brotherhood of Ash and Stone',
	'Keepers of the Nameless Gate',
	'Sisters of the Pale Moon'
];

/**
 * Process annual riots, cult awakenings, prophet arrivals, folk heroes,
 * and military mutinies across mortal realms.
 */
export function processYearlyUprisings(sim: Simulation): UprisingEvent[] {
	const rng = sim.rng;
	const events: UprisingEvent[] = [];
	const alivePolities = sim.polities.filter((p) => p.id && p.alive && p.cells > 0);
	if (!alivePolities.length) return events;

	// Unrest is budgeted for the whole world: more realms → lower odds each, so the Chronicle
	// isn't drowned once a world fragments. Each realm also rests a few years after a notable event.
	const scale = Math.min(1, 10 / alivePolities.length);
	const roll = (p: number) => rng.chance(p * scale);
	const digest = new Map<string, { kind: string; towns: string[]; realm: string; cell: number; state: number }>();
	const genre = sim.voice;
	const rest = (pol: Polity) => sim.unrestUntil.set(pol.id, sim.year + rng.int(3, 8));

	for (const pol of alivePolities) {
		if ((sim.unrestUntil.get(pol.id) ?? 0) > sim.year) continue;
		const towns = sim.idx.burgsIn(sim.w.burgs, pol.id).filter((b) => b.id && b.alive && b.state === pol.id);
		if (!towns.length) continue;

		// 1. Urban and Provincial Riots
		const activeWars = sim.wars.filter((w) => !w.end && (w.attackers.includes(pol.id) || w.defenders.includes(pol.id)));
		const longWar = activeWars.some((w) => w.months > 18);
		const highTax = pol.tax >= 0.20;
		const lowStab = pol.stability < 35;

		if ((highTax || lowStab || longWar) && roll(0.3)) {
			const town = rng.pick(towns);
			let subtype: 'bread_riot' | 'tax_riot' | 'conscription_riot' | 'sectarian_riot' = 'bread_riot';

			if (longWar && rng.chance(0.45)) {
				subtype = 'conscription_riot';
			} else if (highTax && rng.chance(0.50)) {
				subtype = 'tax_riot';
			} else if (town.culture !== pol.culture && rng.chance(0.40)) {
				subtype = 'sectarian_riot';
			}

			// Consequences
			if (subtype === 'bread_riot') {
				pol.stability = Math.max(5, pol.stability - rng.int(8, 14));
				pol.treasury = Math.max(0, pol.treasury - rng.int(15, 25));
				town.pop = +(Math.max(0.2, town.pop * 0.96)).toFixed(2);
			} else if (subtype === 'tax_riot') {
				pol.stability = Math.max(5, pol.stability - rng.int(6, 12));
				pol.treasury = Math.max(0, pol.treasury - rng.int(20, 35));
			} else if (subtype === 'conscription_riot') {
				pol.stability = Math.max(5, pol.stability - rng.int(8, 14));
				pol.army = +(Math.max(0.5, pol.army * 0.90)).toFixed(1);
			} else {
				pol.stability = Math.max(5, pol.stability - rng.int(7, 13));
			}

			// routine riots are folded into one yearly digest line; only a riot that tips into revolt is narrated
			const severe = pol.stability <= 15 && pol.cells >= 10 && towns.length > 1;
			if (severe) {
				events.push({ kind: 'uprising', text: packLine(genre, `riot.${subtype}`, rng, { town: town.name, realm: pol.name }) ?? narrateRiot(rng, subtype, town.name, pol.name), cell: town.cell, state: pol.id });
				rest(pol);
			} else {
				const key = `${pol.id}:${subtype}`;
				const d = digest.get(key) ?? { kind: subtype, towns: [], realm: pol.name, cell: town.cell, state: pol.id };
				d.towns.push(town.name);
				digest.set(key, d);
			}

			// Severe unrest can ignite an ideological revolt if realm is already on the brink
			if (pol.stability <= 15 && pol.cells >= 10 && towns.length > 1 && rng.chance(0.35)) {
				sim.revolt(pol, town.cell);
			}
		}

		// 2. Secret Cult Awakenings
		const undergroundOrEldritch = towns.some((t) => sim.burgLayer(t) > 0 || sim.w.cultures[t.culture]?.sphere === 'eldritch');
		const cultChance = undergroundOrEldritch ? 0.16 : 0.09;
		if (roll(cultChance)) {
			rest(pol);
			const town = rng.pick(towns);
			const cultName = packCult(genre, rng) ?? rng.pick(CULT_NAMES);
			const subtypes = ['doomsday_cult', 'eldritch_cult', 'blood_coven', 'flagellant_order'] as const;
			const subtype = rng.pick(subtypes);

			pol.stability = Math.max(5, pol.stability - rng.int(5, 10));

			const newUprising: UprisingRecord = {
				id: sim.uprisings.length + 1,
				kind: 'cult',
				subtype,
				title: cultName,
				burgId: town.id,
				burgName: town.name,
				stateId: pol.id,
				stateName: pol.name,
				year: sim.year,
				cell: town.cell,
				description: `Secret ${subtype.replace(/_/g, ' ')} organized in the vaults of ${town.name}.`,
				active: true
			};
			sim.uprisings.push(newUprising);

			const text = packLine(genre, 'cult', rng, { cult: cultName, town: town.name, realm: pol.name }) ?? narrateCult(rng, subtype, cultName, town.name, pol.name);
			events.push({ kind: 'uprising', text, cell: town.cell, state: pol.id, uprisingId: newUprising.id });
		}

		// 3. Charismatic Prophets and Messianic Movements
		if (roll(0.11)) {
			rest(pol);
			const town = rng.pick(towns);
			const prophet = sim.makePerson(town.culture, pol.id, town.id, 'prophet', rng.int(28, 56));
			prophet.traits = [...new Set([...prophet.traits, 'Prophet', 'Visionary', 'Zealot'])];
			prophet.renown += rng.int(30, 60);

			const subtypes = ['ascetic_reformer', 'pacifist_mystic', 'holy_crusader', 'miraculous_healer'] as const;
			const subtype = rng.pick(subtypes);

			if (subtype === 'pacifist_mystic') {
				if (activeWars.length) {
					pol.army = +(Math.max(0.5, pol.army * 0.90)).toFixed(1);
					pol.stability = Math.min(100, pol.stability + 8);
				}
			} else if (subtype === 'holy_crusader') {
				pol.army = +(pol.army * 1.12).toFixed(1);
			} else if (subtype === 'miraculous_healer') {
				town.pop = +(town.pop + 0.3).toFixed(2);
				pol.treasury += 15;
			} else {
				town.pop = +(town.pop + 0.2).toFixed(2);
				pol.stability = Math.min(100, pol.stability + 5);
			}

			const newUprising: UprisingRecord = {
				id: sim.uprisings.length + 1,
				kind: 'prophet',
				subtype,
				title: `Prophecy of ${prophet.name}`,
				burgId: town.id,
				burgName: town.name,
				stateId: pol.id,
				stateName: pol.name,
				year: sim.year,
				cell: town.cell,
				leaderName: prophet.name,
				leaderId: prophet.id,
				description: `Charismatic prophet leading spiritual movements in ${town.name}.`,
				active: true
			};
			sim.uprisings.push(newUprising);

			const text = packLine(genre, 'prophet', rng, { name: prophet.name, town: town.name, realm: pol.name }) ?? narrateProphet(rng, subtype, prophet.name, town.name, pol.name);
			events.push({ kind: 'uprising', text, cell: town.cell, state: pol.id, uprisingId: newUprising.id });
		}

		// 4. Folk Heroes and Popular Champions
		const heroChance = pol.stability < 45 || activeWars.length > 0 ? 0.16 : 0.08;
		if (roll(heroChance)) {
			rest(pol);
			const town = rng.pick(towns);
			const hero = sim.makePerson(town.culture, pol.id, town.id, 'hero', rng.int(20, 38));
			hero.martial = rng.int(16, 24);
			hero.diplomacy = rng.int(14, 20);
			hero.traits = [...new Set([...hero.traits, 'Hero', 'Champion', 'Brave', 'Honorable'])];
			hero.renown += rng.int(40, 80);

			const subtypes = ['greenwood_outlaw', 'gladiator_rebel', 'beast_slayer', 'border_paladin'] as const;
			const subtype = rng.pick(subtypes);

			if (subtype === 'greenwood_outlaw') {
				pol.treasury = Math.max(0, pol.treasury - 18);
				pol.stability = Math.min(100, pol.stability + 6);
			} else {
				pol.stability = Math.min(100, pol.stability + 10);
				pol.army = +(pol.army * 1.05).toFixed(1);
			}

			const newUprising: UprisingRecord = {
				id: sim.uprisings.length + 1,
				kind: 'hero',
				subtype,
				title: `Legend of ${hero.name}`,
				burgId: town.id,
				burgName: town.name,
				stateId: pol.id,
				stateName: pol.name,
				year: sim.year,
				cell: town.cell,
				leaderName: hero.name,
				leaderId: hero.id,
				description: `Folk hero and popular champion defending the common people of ${town.name}.`,
				active: true
			};
			sim.uprisings.push(newUprising);

			const text = packLine(genre, 'hero', rng, { name: hero.name, town: town.name, realm: pol.name }) ?? narrateHero(rng, subtype, hero.name, town.name, pol.name);
			events.push({ kind: 'uprising', text, cell: town.cell, state: pol.id, uprisingId: newUprising.id });
		}

		// 5. Military Mutinies
		if (activeWars.length > 0 && pol.treasury <= 5 && pol.stability < 30 && roll(0.2)) {
			rest(pol);
			const town = rng.pick(towns);
			pol.army = +(Math.max(0.5, pol.army * 0.78)).toFixed(1);
			pol.stability = Math.max(5, pol.stability - 10);

			const text = packLine(genre, 'mutiny', rng, { fort: town.name, realm: pol.name }) ?? narrateMutiny(rng, town.name, pol.name);
			events.push({ kind: 'uprising', text, cell: town.cell, state: pol.id });
		}
	}

	if (digest.size) {
		const LABEL: Record<string, string> = { bread_riot: 'bread riots', tax_riot: 'tax riots', conscription_riot: 'draft riots', sectarian_riot: 'sectarian clashes' };
		const parts = [...digest.values()].slice(0, 6).map((d) => `${LABEL[d.kind] ?? d.kind} in ${d.towns.join(', ')}${d.towns.length === 1 && d.towns[0] === d.realm ? '' : ` (${d.realm})`}`);
		const more = digest.size > 6 ? `, and ${digest.size - 6} more` : '';
		const first = [...digest.values()][0];
		events.push({ kind: 'uprising', text: `Unrest of the year: ${parts.join('; ')}${more}.`, cell: first.cell, state: first.state });
	}
	return events;
}

export function narrateRiot(rng: Rng, subtype: string, townName: string, polityName: string): string {
	if (subtype === 'bread_riot') {
		const templates = [
			`Bread riots convulse the streets of ${townName}! Starving crowds and dockworkers storm the municipal grain vaults, clashing with royal guards and demanding food for their kin.`,
			`Desperate from empty larders and soaring flour prices, the commoners of ${townName} take up clubs and scythes! Granaries are plundered and wagons overturned across the central square.`,
			`Hunger turns to fury in ${townName}. Mobs ransack commercial bakeries and royal storehouses, defying the garrisons of ${polityName} until emergency rations are distributed.`
		];
		return rng.pick(templates);
	}
	if (subtype === 'tax_riot') {
		const templates = [
			`Tax riots erupt across ${townName}! Furious merchants, artisans, and burghers pelt imperial bailiffs with cobblestones, tear down toll barriers, and set fire to municipal tax registers.`,
			`Galled by burdensome tithes and royal exactions, the citizenry of ${townName} rises in violent protest! Royal tax offices are sacked and bailiffs driven out into the wilderness.`,
			`Tolls and customs houses burn in ${townName} as anti-tax riots paralyze commerce. Guild masters openly repudiate imperial tithes, refusing all tribute to ${polityName}.`
		];
		return rng.pick(templates);
	}
	if (subtype === 'conscription_riot') {
		const templates = [
			`Anti-conscription riots shatter the peace of ${townName}! War-weary families and guild apprentices set fire to army recruitment posts, refusing to send more sons to the battlefronts.`,
			`Furious crowds storm the muster halls of ${townName}, tearing down recruiting banners and liberating chained conscripts in open defiance of ${polityName}.`,
			`Refusing further levies for prolonged campaigns, the burghers of ${townName} barricade the streets! Military envoys are driven from the gates with pikes and stones.`
		];
		return rng.pick(templates);
	}
	// sectarian_riot
	const templates = [
		`Sectarian riots break out in the crowded quarters of ${townName}! Rival factions clash in the avenues, setting fires and overwhelming municipal constables before order can be restored.`,
		`Old communal grievances flare into street violence in ${townName}. Armed crowds clash at crossroads and sacred precincts, forcing ${polityName} to deploy spearmen to quell the tumult.`,
		`Tumult grips the plazas of ${townName} as rival neighborhood leagues exchange blows, torching stalls and challenging the authority of the local bailiffs.`
	];
	return rng.pick(templates);
}

export function narrateCult(rng: Rng, subtype: string, cultName: string, townName: string, polityName: string): string {
	if (subtype === 'doomsday_cult') {
		const templates = [
			`Whispers of a millenarian doomsday cult known as the ${cultName} sweep through ${townName}! Zealous converts burn their coin, abandon their workshops, and gather in dark cellars to await the celestial end.`,
			`A doomsday panic takes root in ${townName} as preachers of the ${cultName} proclaim the collapse of the mortal realm! Crowds flock to torchlit vigil caves, repudiating the laws of ${polityName}.`,
			`Fanatics of the ${cultName} march through the night in ${townName}, clad in mourning shrouds and wailing omens of doom. The sudden panic empties markets and roils civic stability.`
		];
		return rng.pick(templates);
	}
	if (subtype === 'eldritch_cult') {
		const templates = [
			`A sinister esoteric cabal, the ${cultName}, is uncovered in the deep catacombs beneath ${townName}. Initiates conduct forbidden midnight rites to nameless star-gods, inciting widespread dread.`,
			`Strange runes appear carved upon lintels across ${townName} as the ${cultName} expands its influence in secret. Several prominent citizens vanish, whispering of ancient powers beneath the stone.`,
			`Rumors of midnight sacrifices in subterranean cisterns trouble ${townName}. The authorities of ${polityName} discover clandestine shrines erected by the shadowy ${cultName}.`
		];
		return rng.pick(templates);
	}
	if (subtype === 'blood_coven') {
		const templates = [
			`An outlawed blood coven, the ${cultName}, is discovered practicing illicit blood sorcery outside ${townName}. Royal inquisitors raid hidden sanctuaries, seizing cursed grimoires and elixirs.`,
			`Fear grips the outskirts of ${townName} as villagers uncover shrines belonging to the ${cultName}. The coven's clandestine activities provoke fervent investigations by the crown.`,
			`Dark covens gather in the shadows of ${townName}. The ${cultName} conducts forbidden rituals, defying the orthodoxy of ${polityName} and spreading unease through the provinces.`
		];
		return rng.pick(templates);
	}
	// flagellant_order
	const templates = [
		`An austere brotherhood of penitents, the ${cultName}, marches into ${townName}! Hundreds of barefoot flagellants whip themselves through the town gates, denouncing worldly corruption and corrupt nobles.`,
		`The austere procession of the ${cultName} draws thousands into the public squares of ${townName}. Their fiery lamentations stir religious fervor and undermine traditional authority.`,
		`Chanting somber litanies, the ${cultName} parades through ${townName}, rebuking high prelates and demanding immediate spiritual penance from the lords of ${polityName}.`
	];
	return rng.pick(templates);
}

export function narrateProphet(rng: Rng, subtype: string, prophetName: string, townName: string, polityName: string): string {
	if (subtype === 'pacifist_mystic') {
		const templates = [
			`A mystic prophet, ${prophetName}, appears in ${townName} preaching divine reconciliation! Thousands weep in the open forum as the holy wanderer urges soldiers to lay down arms and embrace peace.`,
			`Walking unharmed across contested frontiers, ${prophetName} arrives at ${townName} with tidings of sacred peace. War cohorts drop their spears in reverence, touched by the prophet's words.`,
			`The holy ascetic ${prophetName} addresses gathered multitudes in ${townName}, rebuking the vanity of conquerors and turning martial fervor into quiet devotion.`
		];
		return rng.pick(templates);
	}
	if (subtype === 'holy_crusader') {
		const templates = [
			`The fiery prophet ${prophetName} ascends the temple steps in ${townName}, summoning the faithful to sacred struggle! Zealous disciples rally to the holy banner, vowing to defend their sacred honor.`,
			`Proclaiming heavenly revelation, ${prophetName} mobilizes fervent crowds in ${townName}. Militant pilgrims pledge their blades to the divine mandate, filling ranks across ${polityName}.`,
			`Armed with sacred fervor, the visionary herald ${prophetName} rallies the common folk of ${townName}, denouncing blasphemers and inspiring cohorts of devout crusaders.`
		];
		return rng.pick(templates);
	}
	if (subtype === 'miraculous_healer') {
		const templates = [
			`Reports of miraculous cures spread from ${townName}, where the visionary seer ${prophetName} tends to the sick and destitute. Thousands of hopeful pilgrims flood the town gates.`,
			`Pilgrimage caravans stream toward ${townName} to witness the wonders of ${prophetName}. The seer's gentle touch and prophetic dreams draw seekers from distant kingdoms.`,
			`The holy healer ${prophetName} establishes a sanctuary of restoration in ${townName}. Innkeepers prosper and coffers swell as pilgrims journey across continents to seek a blessing.`
		];
		return rng.pick(templates);
	}
	// ascetic_reformer
	const templates = [
		`Clad in simple sackcloth, the reformer ${prophetName} enters the gates of ${townName}, fearlessly rebuking the decadence of imperial courts and summoning magistrates to humility.`,
		`A charismatic ascetic, ${prophetName}, captivates the plazas of ${townName}. Preaching equality before heaven, the prophet inspires a massive moral revival among the common folk.`,
		`The voice of ${prophetName} rings through the great markets of ${townName}, denouncing the arrogance of the wealthy and calling for justice and spiritual purity across ${polityName}.`
	];
	return rng.pick(templates);
}

export function narrateHero(rng: Rng, subtype: string, heroName: string, townName: string, polityName: string): string {
	if (subtype === 'greenwood_outlaw') {
		const templates = [
			`A daring outlaw of the wilderness, ${heroName}, rises to legend around ${townName}! Ambrushing royal tax wagons along forest roads, the rogue distributes seized coin among impoverished hamlets.`,
			`Known as the People's Blade, ${heroName} defies the magistrates of ${polityName} from the woodland hollows of ${townName}, shielding humble villagers from unjust confiscations.`,
			`Folk songs celebrate ${heroName}, a righteous rebel who raids the fortified convoys of ${polityName} to feed starving families in the districts around ${townName}.`
		];
		return rng.pick(templates);
	}
	if (subtype === 'gladiator_rebel') {
		const templates = [
			`The renowned arena champion ${heroName} shatters fighting-pit chains in ${townName}! Leading fellow captives in a daring escape, the hero becomes a celebrated defender of the oppressed.`,
			`Defying cruel overseers, ${heroName} leads an uprising in the arena quarter of ${townName}. Freed combatants rally behind the champion's banner, sworn to protect the weak.`,
			`Acclaimed by the roar of the crowds, ${heroName} turns against tyrannical masters in ${townName}, emerging as a legendary folk champion for the downtrodden.`
		];
		return rng.pick(templates);
	}
	if (subtype === 'beast_slayer') {
		const templates = [
			`A courageous local hunter, ${heroName}, fells a ferocious marauding terror near ${townName}! Grateful townsfolk hoist the slayer on their shoulders and crown their new folk protector.`,
			`When ravenous predators threatened the outskirts of ${townName}, ${heroName} ventured alone into the wilderness, returning with the beast's skull to the thunderous cheers of all.`,
			`The daring defender ${heroName} shields the frontier gates of ${townName} against monstrous beasts, earning undying fame and the devotion of the garrison.`
		];
		return rng.pick(templates);
	}
	// border_paladin
	const templates = [
		`A righteous knight-errant, ${heroName}, rides the threatened marches around ${townName}! The wandering champion repels bandit hordes and shields vulnerable farming settlements.`,
		`Sworn to protect the innocent without regard for courtly politics, ${heroName} raises a banner of justice in ${townName}, bringing hope to a troubled land.`,
		`The valiant protector ${heroName} stands sentinel over the passes of ${townName}, defending common folk from cruel warlords and earning the revered title of Guardian of the Realm.`
	];
	return rng.pick(templates);
}

export function narrateMutiny(rng: Rng, fortName: string, polityName: string): string {
	const templates = [
		`Garrison mutiny breaks out in ${fortName}! Starving and unpaid for seasons, frontline regiments bar the fortress gates against their royal officers, refusing to march without back pay.`,
		`Depleted of coin and rations, royal cohorts stationed at ${fortName} throw down their standards in open mutiny! Officers are placed under guard as troops demand overdue wages from ${polityName}.`,
		`Mutiny paralyzes the barracks of ${fortName}. Disillusioned soldiers repudiate marching orders from ${polityName}, declaring they will no longer bleed for an empty treasury.`
	];
	return rng.pick(templates);
}
