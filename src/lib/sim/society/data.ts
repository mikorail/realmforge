/** Narration tables and definitions for the W3 social systems (all text passes through `log()`, which re-skins it). */
import type { Rng } from '../../rng';
import type { FamineChoice, PersecutionKind, ReformKind } from './state';

export function fill(t: string, v: Record<string, string | number>): string {
	return t.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));
}
export const line = (r: Rng, list: readonly string[], v: Record<string, string | number>) => fill(r.pick(list), v);

export const MIX_LINES = {
	union: [
		'In {town}, {name} of the house of {house} is born to a {a} father and a {b} mother; neighbours bring gifts in both tongues.',
		'A child of two peoples, {name} {house}, is born in {town}. The {a} and the {b} of {realm} now share kin as well as streets.',
		'{town} celebrates a wedding of the {a} and the {b}; their first child is named {name}, of the new house of {house}.',
		'The {a} and {b} quarters of {town} have married so often that a new lineage, the house of {house}, is spoken of; its latest child is {name}.'
	],
	firstUnion: [
		'For the first time the chronicles of {realm} record a marriage between the {a} and the {b}: the house of {house} is founded in {town}.',
		'A {a} and a {b} wed openly in {town}, and the house of {house} begins; some elders frown, more of them smile.'
	],
	people: [
		'After {years} years of shared hearths in {realm}, the children of the {a} and the {b} call themselves the {name}, a people of their own.',
		'Neither {a} nor {b} any longer: in the borderlands of {realm} a mixed folk, the {name}, now keeps its own songs and its own name.',
		'In {realm} the blood and speech of the {a} and the {b} have run together for generations; the chronicles now name them the {name}.'
	]
};

export const PERSECUTION_DEF: Record<PersecutionKind, { name: string; loss: number; convert: number; refugees: number; start: string[] }> = {
	pogrom: {
		name: 'pogrom',
		loss: 0.12,
		convert: 0,
		refugees: 0.4,
		start: [
			'Mobs fall on the {target} of {town} while the officers of {realm} look away; houses burn and many flee.',
			'A pogrom against the {target} sweeps {town}: {ruler} blames them for every ill of {realm}.'
		]
	},
	expulsion: {
		name: 'expulsion',
		loss: 0.2,
		convert: 0.3,
		refugees: 0.65,
		start: [
			'{ruler} decrees the expulsion of the {target} from {realm}; long columns leave {town} with what they can carry.',
			'By edict of {realm}, the {target} must leave {town} and every land of the crown within the year.'
		]
	},
	conversion: {
		name: 'forced conversion',
		loss: 0.06,
		convert: 0.5,
		refugees: 0.5,
		start: [
			'{realm} orders the {target} to bow to the state creed; shrines are closed in {town} and the stubborn flee.',
			'Inquisitors of {realm} arrive in {town}: the {target} must convert or go.'
		]
	}
};

export const PERSECUTION_LINES = {
	haven: [
		'Refugees from {realm} reach {haven}, which opens its gates to the {target}; the two courts trade bitter letters.',
		'{haven} shelters the {target} who fled {realm}, and new quarters rise along its border.'
	],
	nohaven: ['No neighbour will take the {target} who flee {realm}; many perish on the roads.'],
	end: [
		'The persecution of the {target} in {realm} ends; the survivors return quietly to what is left of their homes.',
		'{realm} lifts its measures against the {target}. Few believe it will last, but the burnings stop.'
	]
};

export const REFORM_DEF: Record<ReformKind, { name: string; movement: string[]; icon: string; blurb: string }> = {
	legal: { name: 'Legal reform', icon: '⚖', blurb: 'written law and courts: steadier rule, better revenue', movement: ['Charter League', 'Lawgivers', 'Society of the Written Code', 'Petitioners of Right'] },
	temperance: { name: 'Temperance', icon: '🫖', blurb: 'curbs on drink and vice: calmer streets, lost excise', movement: ['Temperance Union', 'Sober Brotherhood', 'League of the Clear Cup'] },
	franchise: { name: 'Enfranchisement', icon: '🗳', blurb: 'commoners gain a voice in council: loyalty and trade', movement: ['Commons Assembly', 'Voice of the Guilds', 'Franchise Leaguers', 'Friends of the People'] },
	land: { name: 'Land reform', icon: '🌾', blurb: 'fields to those who work them: growth, costly to the nobles', movement: ['Ploughshare League', 'Tillers Union', 'Free Furrow Movement'] },
	tolerance: { name: 'Religious tolerance', icon: '🕊', blurb: 'all faiths may worship freely: no persecution, warmer peoples', movement: ['Edict Party', 'Friends of the Open Altar', 'Peacemakers of the Hearth'] }
};

export const REFORM_LINES = {
	rise: [
		'In {town} the {movement} gathers crowds behind {leader}, demanding {reform} for {realm}.',
		'{leader} founds the {movement} in {town}; its pamphlets call for {reform} across {realm}.'
	],
	passed: [
		'{ruler} of {realm} yields to the {movement}: {reform} becomes the law of the land.',
		'After years of agitation, {reform} is enacted in {realm}; {leader} is cheered through the streets of {town}.'
	],
	failed: [
		'The {movement} of {realm} dwindles; its call for {reform} fades from the taverns of {town}.',
		'{ruler} outwaits the {movement}; {reform} will not come to {realm} in this generation.'
	],
	crushed: [
		'{ruler} breaks the {movement} by force; {leader} is hunted from {town} and {realm} seethes.',
		'Soldiers scatter the marchers of the {movement} in {town}; the demand for {reform} is drowned in blood.'
	]
};

export const FAMINE_LINES: Record<FamineChoice, string[]> = {
	relief: [
		'{ruler} opens the royal granaries of {realm}; bread is carted to every village and the people bless the crown.',
		'In the hungry year {ruler} spends the treasury of {realm} on grain from abroad; few starve, and they remember who fed them.'
	],
	hoard: [
		'While {realm} starves, {ruler} keeps the granaries sealed for the court and the army; the price of bread is cursed in {town}.',
		'The lords of {realm} hoard grain and sell it dear; {ruler} grows richer as the villages empty.'
	],
	requisition: [
		'{ruler} sends soldiers to strip the farms of {realm} for the army; the hosts eat, the farmers do not.',
		'Requisition squads of {realm} seize seed grain at spearpoint; the barracks are full and the fields fall silent.'
	],
	scapegoat: [
		'{ruler} blames the famine of {realm} on the {target}; crowds turn on them in {town} and the crown is spared their anger.',
		'Preachers of {realm} say the {target} cursed the harvest; {ruler} lets the rumour run.'
	]
};

export const LEAN_YEARS = [
	'The {epoch} empties the granaries of {realm}; hunger walks the roads around {town}.',
	'Under the {epoch} the harvests of {realm} fail two years running; {town} rations its bread.'
];

export const PRESTIGE_LINES = [
	'Across {world} the {name} are now the most admired of peoples: courts copy their dress, scholars their books, merchants their speech.',
	'The fame of the {name} eclipses all others in {world}; their songs are sung in foreign halls.'
];
