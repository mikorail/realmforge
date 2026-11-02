/**
 * Hazard data: disease profiles and chronicle lines. Engine logic lives in disasters.ts / disease.ts;
 * every line goes through `sim.log()` (which re-skins it per genre voice).
 * Placeholders: {town} {realm} {name} {mag} {fault} {volcano} {disease} {month} {n}
 */
import type { Genre } from '../../gen/genre';

export type HazardKind = 'quake' | 'tsunami' | 'eruption' | 'storm' | 'tornado' | 'flood' | 'landslide' | 'avalanche' | 'locust' | 'wildfire';
export const HAZARD_KINDS: HazardKind[] = ['quake', 'tsunami', 'eruption', 'storm', 'tornado', 'flood', 'landslide', 'avalanche', 'locust', 'wildfire'];

export type Vector = 'flea' | 'water' | 'contact' | 'mosquito' | 'air' | 'crop' | 'radiation' | 'engineered';

export interface DiseaseProfile {
	id: string;
	/** generic label ("plague"), outbreaks get their own names */
	label: string;
	vector: Vector;
	/** base spread chance to a neighbouring cell per month at intensity 1 */
	trans: number;
	/** share of cell population lost per month at intensity 1 */
	lethal: number;
	/** monthly intensity multiplier (lower = shorter outbreaks) */
	decay: number;
	/** 0..1 how well survivors are protected afterwards (decays over decades) */
	immunity: number;
	/** days from catching it to the first symptom, and days it lasts (Wanderer) */
	incubation: number;
	duration: number;
	/** which stats it hits in the Wanderer (str agi tou int wil ego) */
	hits: string[];
	symptoms: string[];
	/** what helps: physician, herbal, priest, medicine (late genres), rest */
	cures: string[];
	/** genres where it is at home (empty = any) */
	genres: Genre[];
	/** name parts: adjectives and nouns for outbreak names */
	adj: string[];
	noun: string[];
	desc: string;
}

const ANY: Genre[] = [];
export const DISEASES: DiseaseProfile[] = [
	{ id: 'pestilence', label: 'plague', vector: 'flea', trans: 0.3, lethal: 0.045, decay: 0.93, immunity: 0.3, incubation: 2, duration: 6, hits: ['tou', 'str'], symptoms: ['swollen black buboes', 'a burning fever', 'blackened fingertips'], cures: ['physician', 'priest', 'medicine'], genres: ANY, adj: ['Black', 'Grey', 'Red', 'Great', 'Swollen'], noun: ['Death', 'Pestilence', 'Plague', 'Buboes', 'Mortality'], desc: 'carried by fleas on rats and on the cloth of traders; it rides the roads and the ships' },
	{ id: 'flux', label: 'flux', vector: 'water', trans: 0.24, lethal: 0.035, decay: 0.9, immunity: 0.2, incubation: 1, duration: 4, hits: ['tou', 'agi'], symptoms: ['cramps that fold you double', 'a thirst no water quenches', 'sunken eyes'], cures: ['physician', 'herbal', 'medicine', 'rest'], genres: ANY, adj: ['Blue', 'River', 'Harbour', 'Bloody', 'Watery'], noun: ['Flux', 'Gripe', 'Purging', 'Cramp'], desc: 'drunk from fouled wells and river water; it follows the rivers downstream and haunts the ports' },
	{ id: 'pox', label: 'pox', vector: 'contact', trans: 0.26, lethal: 0.028, decay: 0.92, immunity: 0.95, incubation: 4, duration: 8, hits: ['ego', 'tou'], symptoms: ['weeping pustules', 'an aching back', 'a rash that scars'], cures: ['physician', 'medicine', 'rest'], genres: ANY, adj: ['Speckled', 'Red', 'Small', 'Spotted', 'White'], noun: ['Pox', 'Speckle', 'Rash', 'Blain'], desc: 'passed hand to hand and breath to breath; those who live through it never take it again' },
	{ id: 'fever', label: 'marsh fever', vector: 'mosquito', trans: 0.2, lethal: 0.018, decay: 0.95, immunity: 0.5, incubation: 5, duration: 10, hits: ['str', 'wil'], symptoms: ['chills that rattle your teeth', 'sweats every third day', 'a yellow cast to the skin'], cures: ['herbal', 'physician', 'medicine'], genres: ANY, adj: ['Marsh', 'Yellow', 'Shaking', 'Tertian', 'Swamp'], noun: ['Fever', 'Ague', 'Shakes', 'Chill'], desc: 'brought by biting flies in hot wetlands; it lingers where the water stands still' },
	{ id: 'consumption', label: 'consumption', vector: 'air', trans: 0.12, lethal: 0.008, decay: 0.985, immunity: 0, incubation: 10, duration: 30, hits: ['tou', 'str'], symptoms: ['a cough that brings up blood', 'a hollow chest', 'night sweats'], cures: ['rest', 'physician', 'medicine'], genres: ANY, adj: ['White', 'Wasting', 'Pale', 'Slow', 'Hollow'], noun: ['Consumption', 'Wasting', 'Decline', 'Cough'], desc: 'a slow sickness of crowded cities that eats the lungs over years' },
	{ id: 'blight', label: 'blight', vector: 'crop', trans: 0.22, lethal: 0.012, decay: 0.9, immunity: 0, incubation: 0, duration: 0, hits: [], symptoms: ['blackened grain', 'rotting roots'], cures: [], genres: ANY, adj: ['Black', 'Grey', 'Creeping', 'Silver', 'Root'], noun: ['Blight', 'Rot', 'Rust', 'Smut', 'Mildew'], desc: 'a rot of the crops, not of people: it kills by hunger' },
	{ id: 'miasma', label: 'miasma', vector: 'air', trans: 0.22, lethal: 0.022, decay: 0.92, immunity: 0.1, incubation: 2, duration: 6, hits: ['tou', 'int'], symptoms: ['a soot-black cough', 'stinging eyes', 'a lead taste in the mouth'], cures: ['physician', 'medicine', 'rest'], genres: ['steampunk', 'dieselpunk'], adj: ['Coal', 'Brown', 'Soot', 'Foul', 'Yellow'], noun: ['Miasma', 'Fog-Sickness', 'Choke', 'Vapours'], desc: 'the bad air of the factory towns, thickest where the chimneys stand closest' },
	{ id: 'radiation', label: 'radiation sickness', vector: 'radiation', trans: 0.06, lethal: 0.03, decay: 0.96, immunity: 0, incubation: 1, duration: 12, hits: ['tou', 'str', 'agi'], symptoms: ['hair coming out in clumps', 'bleeding gums', 'sores that will not close'], cures: ['medicine', 'physician'], genres: ['atompunk', 'wasteland'], adj: ['Glow', 'Ash', 'Atom', 'Burning', 'Quiet'], noun: ['Sickness', 'Burn', 'Rot', 'Wasting'], desc: 'not caught but soaked up: it clings to fallout grounds and the dust of old craters' },
	{ id: 'strain', label: 'engineered strain', vector: 'engineered', trans: 0.36, lethal: 0.04, decay: 0.9, immunity: 0.6, incubation: 2, duration: 5, hits: ['int', 'tou', 'wil'], symptoms: ['fever spikes on a schedule', 'skin that itches from inside', 'twitching hands'], cures: ['medicine', 'physician'], genres: ['biopunk', 'cyberpunk'], adj: ['Lab', 'Grey', 'Patented', 'Vat', 'Escaped'], noun: ['Strain', 'Vector', 'Bloom', 'Variant'], desc: 'something made in a vat or a lab that got out; it spreads fast and burns out fast' },
	{ id: 'hollowing', label: 'hollowing', vector: 'contact', trans: 0.18, lethal: 0.02, decay: 0.94, immunity: 0.7, incubation: 3, duration: 8, hits: ['wil', 'ego'], symptoms: ['eyes gone dim and silvery', 'a cold that no fire warms', 'dreams of deep places'], cures: ['priest', 'herbal'], genres: ['fantasy', 'mythic', 'twilight'], adj: ['Hollow', 'Grey', 'Silver', 'Dreaming', 'Cold'], noun: ['Sleep', 'Hollowing', 'Fade', 'Wasting'], desc: 'a sickness of the spirit; the old wives say it comes from broken wards' }
];
export const DISEASE_BY_ID: Record<string, DiseaseProfile> = Object.fromEntries(DISEASES.map((d) => [d.id, d]));
export const diseaseIndex = (id: string) => Math.max(0, DISEASES.findIndex((d) => d.id === id));

export const MONTHS_SEASON = ['in the depth of winter', 'in late winter', 'in early spring', 'in spring', 'in late spring', 'at midsummer', 'in high summer', 'in late summer', 'at summer’s end', 'in autumn', 'in late autumn', 'as winter came'];

export const HZ_LINES: Record<string, string[]> = {
	quake: [
		'EARTHQUAKE: The {fault} wakes with a roar (magnitude {mag}). In {town} walls fold like paper and {realm} counts its dead in the thousands.',
		'The earth heaves along the {fault}: a magnitude {mag} quake splits the streets of {town}, and fires follow the falling roofs.',
		'A great quake (magnitude {mag}) runs the length of the {fault}; {town} and its neighbours are left in rubble and the roads of {realm} are broken.'
	],
	quakeSmall: [
		'The ground trembles beneath {town} (magnitude {mag}); chimneys topple and cracks open in old walls along the {fault}.',
		'A quake on the {fault} shakes {town}: crockery smashes, a bell tower leans, and the people sleep out of doors for a week.'
	],
	tsunami: [
		'TSUNAMI: The sea draws back from the shore of {realm}, then returns as a wall of water; {town} is swept away to its upper streets.',
		'After the quake on the {fault} a great wave strikes the coast: harbours from {town} along the shore are smashed and the fields drowned in salt.'
	],
	eruption: [
		'ERUPTION: {volcano} bursts open in fire; ash buries the fields around {town} and the sky over {realm} goes dark at noon.',
		'{volcano} wakes after long sleep: rivers of fire run down its flanks, and {town} lies under a grey shroud of ash.',
		'With a roar heard a hundred leagues away, {volcano} erupts; burning stones fall on {town} and the herds of {realm} choke on ash.'
	],
	eruptionSmall: [
		'{volcano} smokes and rumbles; a thin fall of ash dusts the roofs of {town}.',
		'Fire glows in the throat of {volcano}; lava creeps down one flank and the people of {town} move their flocks.'
	],
	darkSky: [
		'The ash of {volcano} hangs in the high sky: the sun rises red and weak over {world}, and the summers that follow are cold.',
		'Years without summer: the veil thrown up by {volcano} cools the whole of {world}.'
	],
	skyClears: ['The veil of {volcano} thins at last; the sun burns clear over {world} again.'],
	fertileAsh: [
		'The ash fields of {name} near {town} have weathered into the richest soil of {realm}; farmers crowd back to the slopes.',
		'Vines and barley grow thick on the old ash of {name}; {town} prospers where it once mourned.'
	],
	fertileSilt: [
		'Where the {name} left its silt, the fields of {town} now yield double; {realm} remembers the flood with mixed feelings.',
		'The flood-silt of the {name} makes the bottomlands of {town} the greenest in {realm}.'
	],
	storm: [
		'HURRICANE: A great storm comes out of the warm sea {month}; {town} loses its roofs and its fleet, and the coast of {realm} is drowned in surge.',
		'A typhoon named by the fisherfolk “{name}” strikes {town} {month}: wharves torn up, ships thrown inland, the dead counted for weeks.',
		'Winds that bend palms to the ground hammer the coast of {realm} {month}; {town} is flooded to the market square.'
	],
	tornado: [
		'A twisting storm drops from a green sky onto {town}, tearing a mile-long scar through houses and barns.',
		'A whirlwind walks across the plains of {realm} {month} and through the heart of {town}, scattering roofs like leaves.'
	],
	flood: [
		'FLOOD: The {name} bursts its banks {month}; the low quarters of {town} are under water and the harvest of {realm} rots in the fields.',
		'Rains swell the {name} until it takes the bridges of {town}; whole villages float away downstream.',
		'The spring flood of the {name} is the worst in living memory: {town} is cut off for a month.'
	],
	landslide: [
		'A mountainside gives way above {town}; houses, a road and a mill are buried in a single roar of mud and stone.',
		'Rain-soaked slopes slide into the valley of {town}, burying the lower village of {realm}.'
	],
	avalanche: [
		'An avalanche thunders down onto {town}; the high pass is closed and a whole hamlet lies under the snow.',
		'The snows above {town} break loose {month}; the bells of {realm} ring for the buried.'
	],
	locust: [
		'LOCUSTS: A cloud of locusts darkens the sky over {realm}; in three days the fields around {town} are stripped bare.',
		'The swarm comes from the dry lands {month}: every green thing around {town} is eaten, and the granaries of {realm} cannot fill.'
	],
	wildfire: [
		'WILDFIRE: In the dry heat {month} the forests around {town} catch fire; smoke hangs over {realm} for weeks.',
		'Lightning sets the dry woods of {realm} alight; the fire runs to the edge of {town} before the rains come.'
	],
	famine: [
		'Hunger follows ruin: with fields lost, famine spreads across {realm}.',
		'The granaries of {realm} cannot make good what was lost; famine stalks the villages around {town}.'
	],
	wonderCrack: ['The shaking cracks {name}: a great fissure runs through it, and pilgrims whisper of ill omen.'],
	wonderFall: ['{name} could not stand the quake; it collapses into rubble.'],
	outbreak: [
		'OUTBREAK: {disease} appears in {town}: {desc}.',
		'A sickness the people call {disease} breaks out in {town}; the bells of {realm} toll for its first dead.',
		'{disease} comes to {town}. Doors are marked, carts of the dead roll at night, and {realm} trembles.'
	],
	blight: [
		'BLIGHT: {disease} spreads through the fields of {realm}; the grain around {town} turns black on the stalk.',
		'The crops of {town} wither under {disease}; {realm} faces a hungry year.'
	],
	outbreakEnd: [
		'{disease} burns itself out at last; survivors in {realm} bury the dead and open the shutters.',
		'After {n} months, {disease} is gone; {realm} counts the empty houses.'
	],
	quarantine: [
		'{realm} closes the gates of {town} against {disease}; caravans are turned back and trade withers.',
		'Guards and chains at the gates: {town} is put under quarantine by {realm} while {disease} rages.'
	],
	physicians: [
		'Physicians of {realm} go into the sick quarters of {town}, burning the bedding and boiling the water; {disease} kills fewer.',
		'{realm} opens fever hospitals in {town}; the sisters and surgeons slow {disease}.'
	],
	vaccination: [
		'{realm} inoculates its towns against {disease}: lines form outside the dispensaries of {town}.',
		'Vaccinators of {realm} work through {town}, and {disease} finds fewer to take.'
	],
	procession: [
		'Penitents carry relics through the streets of {town} to beg an end to {disease}; the crowds only spread it further.',
		'Great prayer processions wind through {realm} against {disease}, and the sickness walks among the faithful.'
	],
	scapegoat: [
		'The zealots of {realm} blame {target} for {disease}: witch hunts begin in {town}.',
		'Mobs in {town} say {target} poisoned the wells; {realm} looks away as the hunts begin.'
	]
};

/** genre-specific swaps for a few lines (fallbacks above) */
export const HZ_GENRE: Partial<Record<Genre, Partial<Record<string, string[]>>>> = {
	steampunk: { physicians: ['The Sanitary Board of {realm} lays sewers and lime-washes {town}; {disease} loses its grip.'] },
	dieselpunk: { physicians: ['Field hospitals and DDT trucks roll into {town}; {realm} pushes {disease} back.'] },
	atompunk: { vaccination: ['Mobile clinics of {realm} vaccinate {town} street by street against {disease}.'] },
	cyberpunk: { quarantine: ['Corp security cordons {town}: drones enforce the lockdown against {disease} and the feeds go dark.'] },
	biopunk: { vaccination: ['{realm} pushes a counter-strain through the water of {town}; {disease} stalls.'] },
	solarpunk: { physicians: ['Commons clinics of {realm} trace every case in {town}; {disease} is caught early.'] }
};
