/**
 * Genre forces (genre/forces.ts): which voices each force belongs to, its chip on the realm card,
 * and the chronicle lines it logs. Data only; placeholders are {town} {realm} {other} {corp} {site} {site2} {beast}.
 */
import type { Genre } from '../../gen/genre';
import type { Rng } from '../../rng';
import type { Monster } from '../types';

export type ForceKey = 'smog' | 'strikes' | 'wareconomy' | 'armsrace' | 'fallout' | 'megacorps' | 'commons' | 'leylines' | 'genevats';

export const FORCES: Record<ForceKey, { name: string; icon: string; voices: Genre[]; blurb: string }> = {
	smog: { name: 'Smog', icon: '🏭', voices: ['steampunk', 'dieselpunk'], blurb: 'Industrial towns choke on their own smoke: fewer people and a sullen populace around the works.' },
	strikes: { name: 'Factory strikes', icon: '✊', voices: ['steampunk', 'dieselpunk'], blurb: 'Unhappy industrial realms face walkouts that empty the treasury and feed unrest.' },
	wareconomy: { name: 'War economy', icon: '⚙', voices: ['dieselpunk'], blurb: 'Realms at war convert their factories: bigger armies, rationing, drained coffers.' },
	armsrace: { name: 'Arms race', icon: '🚀', voices: ['atompunk'], blurb: 'Hostile neighbours race each other in arms: armies swell, treasuries bleed.' },
	fallout: { name: 'Fallout', icon: '☢', voices: ['atompunk'], blurb: 'Long wars can end in an atomic strike: towns are poisoned, the land turns to ash for decades.' },
	megacorps: { name: 'Megacorps', icon: '🏢', voices: ['cyberpunk'], blurb: 'Rich market and factory towns grow corporations that buy influence, capture policy and fight proxy wars.' },
	commons: { name: 'Green commons', icon: '🌱', voices: ['solarpunk'], blurb: 'Stable peaceful realms charter green commons: steadier, friendlier to neighbours, forests regrow.' },
	leylines: { name: 'Leylines', icon: '✨', voices: ['fantasy', 'mythic'], blurb: 'Lines of power run between wonders and holy seats: their holders learn faster, but overdrawn lines surge and wake beasts.' },
	genevats: { name: 'Gene vats', icon: '🧬', voices: ['biopunk'], blurb: 'Gene-crafted harvests swell towns, until an overworked vat breeds a blight.' }
};
export const FORCE_KEYS = Object.keys(FORCES) as ForceKey[];

export type ForceLineKey =
	| 'smog' | 'strike' | 'mobilise' | 'race.start' | 'race.end' | 'fallout' | 'fallout.clear'
	| 'corp.found' | 'corp.capture' | 'corp.war' | 'corp.fold' | 'commons.adopt' | 'commons.lapse' | 'commons.regrow'
	| 'ley.bind' | 'ley.surge' | 'ley.beast' | 'vats.harvest' | 'vats.blight';

export const FORCE_LINES: Record<ForceLineKey, string[]> = {
	smog: [
		'A brown smog settles over {town} in {realm}; children cough in the mill streets and the well-to-do flee to the hills.',
		'The chimneys of {town} never sleep. Soot blackens every wall in {realm} and the sickly mill hands curse the owners.',
		'Physicians of {realm} name it the {town} lung: a wasting cough born of the furnaces and the yellow fog.'
	],
	strike: [
		'The furnaces of {town} go cold: the workers of {realm} walk out, and the lockout costs the crown dearly.',
		'Strike! The mill hands of {town} bar the factory gates against the owners, and {realm} is shaken by the walkout.',
		'A general strike spreads from the works of {town}; pickets and mounted police clash in the streets of {realm}.'
	],
	mobilise: [
		'{realm} turns every factory to the war: shell works roar day and night and bread is rationed by the ounce.',
		'Total mobilisation in {realm}: the assembly lines of {town} now turn out armour, and the people tighten their belts.',
		'Posters on every wall of {town}: {realm} rations fuel and bread so that the war machine never stalls.'
	],
	'race.start': [
		'An arms race begins between {realm} and {other}: each pours its treasury into rockets and bunkers.',
		'{realm} unveils a new bomber; {other} answers with a missile silo. The race of arms has begun.',
		'Spies report that {other} is enriching fuel for a bomb. {realm} orders its own crash program.'
	],
	'race.end': [
		'A thaw: {realm} and {other} sign a treaty limiting their arsenals, and the arms race winds down.',
		'Exhausted and wary, {realm} and {other} agree to inspections; the arms race between them ends.'
	],
	fallout: [
		'The flash over {town}: {realm} is struck by an atomic weapon of {other}. Ash falls for a week and the fields around the town die.',
		'{other} drops the bomb on {town}. Half of the town is gone, and the fallout poisons the farms of {realm} for a generation.',
		'A mushroom cloud rises over {town}. {realm} mourns, the world condemns {other}, and the land turns to grey ash.'
	],
	'fallout.clear': [
		'Grass returns to the ash fields around {town}; the fallout has faded at last.',
		'The exclusion zone around {town} is lifted. Farmers return to soil that no longer glows.'
	],
	'corp.found': [
		'{corp} incorporates in {town}: a market giant with its own guards, its own courts and its own ambitions in {realm}.',
		'The houses of commerce of {town} merge into {corp}. Its tower now looms higher than the palace of {realm}.',
		'{corp} lists its shares in {town}; within a year it owns half the streets of {realm}.'
	],
	'corp.capture': [
		'{corp} owns the council now: the laws of {realm} are written in its boardroom.',
		'The ministers of {realm} wear {corp} badges; policy is set by shareholders, not by the throne.',
		'Through bribes and debt, {corp} captures the government of {realm}.'
	],
	'corp.war': [
		'A corporate war: {corp} drags {realm} into war with {other} to settle a hostile takeover.',
		'Contract soldiers of {corp} cross into {other}; {realm} follows its masters into a corporate war.'
	],
	'corp.fold': [
		'{corp} collapses in scandal and debt; its tower in {town} stands empty.',
		'The board of {corp} flees {town}; the corporation is dissolved and its assets seized.'
	],
	'commons.adopt': [
		'{realm} charters the green commons: shared fields, open workshops and solar gardens for every town.',
		'The assemblies of {realm} vote the commons into law; land is held in trust and the forests are left to grow.',
		'{realm} becomes a commons realm: no lord owns the sun, the water or the seed.'
	],
	'commons.lapse': [
		'The green commons of {realm} lapse amid strife; fences go back up around the fields.',
		'Hard times end the commons charter of {realm}; the shared gardens are parcelled and sold.'
	],
	'commons.regrow': [
		'Forest returns to the plains of {realm}: the commons plant a million trees and the rivers run clear.',
		'Rewilding in {realm}: old grazing land near {town} is a young forest again.'
	],
	'ley.bind': [
		'The mages of {realm} bind the leyline between {site} and {site2}; its power flows into their academies.',
		'{realm} now holds both ends of the leyline from {site} to {site2}, and its spellwrights grow wise on the flow.',
		'A ley-road of light runs from {site} to {site2}. The seers of {realm} claim it for the crown.'
	],
	'ley.surge': [
		'The overdrawn leyline at {site} surges: wild magic scours the land of {realm} and the mages are struck down.',
		'A ley storm breaks over {site}. Crops wither, wells turn to quicksilver and {realm} counts its dead.',
		'Too much power drawn from {site}: the line ruptures in a pillar of light that burns across {realm}.'
	],
	'ley.beast': [
		'From the ruptured leyline at {site} crawls {beast}, a thing of raw magic, and it hunts the folk of {realm}.',
		'The ley surge at {site} gives birth to {beast}. It stalks the borderlands of {realm}.'
	],
	'vats.harvest': [
		'The gene vats of {realm} yield a bumper harvest: fat grain and fast-grown livestock swell its towns.',
		'Spliced crops from the vat-gardens of {town} feed all of {realm}; the cradles fill.',
		'{realm} unveils a self-seeding wheat; granaries overflow from {town} to the frontier.'
	],
	'vats.blight': [
		'An engineered strain escapes the vats of {town}: a blight sweeps {realm}, killing crops and then people.',
		'The overworked vats of {town} breed a plague. {realm} seals its gates, too late.',
		'Something grown in the gene vats of {town} gets out. Fevers spread through {realm}.'
	]
};

/** what each force announces when the voice of the age brings it in or takes it away */
export const FORCE_RISE: Record<ForceKey, string> = {
	smog: 'factory chimneys rise over the great towns and the sky turns brown',
	strikes: 'the mill hands begin to organise against the owners',
	wareconomy: 'factories learn to build for war as fast as for peace',
	armsrace: 'rival realms begin to stockpile weapons that could end the world',
	fallout: 'the atom is split, and war can now poison the land itself',
	megacorps: 'trading houses swell into corporations richer than crowns',
	commons: 'realms begin to share land, sun and seed as common wealth',
	leylines: 'the lines of power between wonders and holy seats wake',
	genevats: 'the gene vats bubble and life itself becomes a crop'
};
export const FORCE_FADE: Record<ForceKey, string> = {
	smog: 'the smokestacks fall silent and the sky clears',
	strikes: 'the old factory unions dwindle',
	wareconomy: 'the war factories are retooled',
	armsrace: 'the great arsenals are dismantled',
	fallout: 'the atomic age passes',
	megacorps: 'the corporations break up',
	commons: 'the green commons give way to new ways',
	leylines: 'the leylines grow dim',
	genevats: 'the gene vats are drained'
};

export const CORP_SUFFIXES = ['Dynamics', 'Holdings', 'Consolidated', 'Heavy Industries', 'Zaibatsu', 'Systems', 'Biolabs', 'Combine', 'Arcology Group', 'Networks', 'Logistics', 'Securities'];

export const LEY_BEASTS: { species: string; names: string[]; icon: string; lore: string; trophy: string }[] = [
	{ species: 'Ley Wyrm', names: ['the Spellscar Wyrm', 'the Coil of Light', 'the Burning Line'], icon: '🐍', lore: 'A serpent of raw magic born where a leyline tore open.', trophy: 'Wyrmglass Scales' },
	{ species: 'Mana Wraith', names: ['the Hollow Lantern', 'the Drinker of Spells', 'the Pale Surge'], icon: '👻', lore: 'A hungry ghost of spent magic that drains the living.', trophy: 'Wraith Lantern' },
	{ species: 'Aether Elemental', names: ['the Storm of Runes', 'the Shard Colossus', 'the Walking Rift'], icon: '🌀', lore: 'Wild magic given a body, it wanders the land the surge burned.', trophy: 'Aether Heartstone' }
];

export function forceLine(key: ForceLineKey, rng: Rng, vars: Record<string, string>): string {
	return rng.pick(FORCE_LINES[key]).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

export type LeyBeastTier = Pick<Monster, 'tier' | 'category' | 'power' | 'maxHealth' | 'armor' | 'regen'>;
export const LEY_BEAST_STATS: LeyBeastTier = { tier: 'dread', category: 'mythos', power: 55, maxHealth: 150, armor: 0.2, regen: 5 };
