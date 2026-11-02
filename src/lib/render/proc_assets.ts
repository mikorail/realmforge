import type { Burg, Cells, World } from '../gen/types';
import { archStyleOf } from '../gen/spheres';
import { getBurgDistricts } from '../sim/burgs';
import type { Simulation } from '../sim/engine';
import type { Person, Role } from '../sim/types';
import type { MapTheme } from './theme';

/**
 * Deterministic 32-bit hash for procedural asset variation.
 * Never touches sim.rng so simulation determinism is 100% preserved.
 */
export function hash32(seed: number, a = 0, b = 0): number {
	let h = (seed ^ Math.imul(a, 0x9e3779b1) ^ Math.imul(b, 0x85ebca6b)) >>> 0;
	h ^= h >>> 16;
	h = Math.imul(h, 0x7feb352d) >>> 0;
	h ^= h >>> 15;
	h = Math.imul(h, 0x846ca68b) >>> 0;
	h ^= h >>> 16;
	return h >>> 0;
}

export function hashStr32(s: string): number {
	let h = 2166136261 >>> 0;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619) >>> 0;
	}
	return h >>> 0;
}

function pickH<T>(arr: readonly T[], h: number, shift = 0): T {
	return arr[(h >>> shift) % arr.length];
}

// ───────────────────────── Procedural Character Appearance & Lore ─────────────────────────

export interface ProceduralAppearance {
	build: string;
	feature: string;
	eyes: string;
	hairOrHead: string;
	attireDetail: string;
	trinket: string;
	demeanour: string;
	summary: string;
}

const BUILDS = [
	'wiry', 'broad-shouldered', 'tall and gaunt', 'compact and muscular', 'statuesque',
	'weather-beaten', 'lithe', 'stocky', 'graceful', 'heavy-set', 'sinewy', 'lean-jawed'
] as const;

const FEATURES = [
	'a faded duelling scar across the cheek',
	'calloused hands stained with ink and oil',
	'sharp cheekbones and a crooked nose',
	'ritual ash-marks along the brow',
	'a braided jawline and wind-chapped skin',
	'sun-creased eyes and a steady gaze',
	'a silver-stitched scar at the collarbone',
	'freckled skin and a wry half-smile',
	'stern, deeply etched brow lines',
	'a tattoo of a coiled serpent on the wrist',
	'a burn-mark from an old forge spark',
	'pierced ears hung with small river-pearls'
] as const;

const EYES = [
	'amber', 'slate-grey', 'sea-green', 'dark obsidian', 'pale ice-blue',
	'hazel', 'copper-flecked', 'deep violet', 'storm-grey', 'bright gold'
] as const;

const HAIR_STYLES = [
	'closely cropped hair', 'a long battle-braid', 'wind-tangled curls', 'shoulder-length locks',
	'a oiled topknot pinned with bone', 'silver-streaked temples', 'shaved sides and a braided crest',
	'ringed dreads', 'a neat courtly coif', 'wild, sun-bleached locks'
] as const;

const SPECIES_HEAD: Record<string, readonly string[]> = {
	elf: ['swept-back silver-blond tresses and long tapered ears', 'braided starlight hair and high pointed ears', 'raven hair pinned with leaf-filigree'],
	void_elf: ['void-dyed braids set with a glowing spirit-stone', 'pale astral locks and obsidian-ringed eyes'],
	dwarf: ['a thick,铜-ringed beard braided into three forks', 'a soot-darkened beard clasped with rune-iron', 'heavy sideburns and a plaited war-beard'],
	orc: ['jutting lower tusks, one capped in hammered iron', 'scarred green-grey brow ridges and a horsehair topknot', 'notched ears and twin war-tusks'],
	troll: ['moss-crusted stone-grey skin and swept horn-buds', 'long tusks andriver-pebble dermal ridges'],
	beastman: ['tufted lupine ears and a scarred muzzle', 'amber feline slit-eyes and a striped mane', 'curved horn-bosses and a bristling mane'],
	halfling: ['curly chestnut hair and ruddy cheeks', 'side-whiskers and laugh-lines around bright eyes'],
	giant: ['frost-rimed braids and granite-carved features', 'braided beard hung with ancient bronze talismans'],
	goblin: ['wide bat-like ears pierced with brass gears', 'a sharp grin and soot-smudged goggles on the forehead'],
	saurian: ['iridescent crest-scales and slit gold pupils', 'horned draconic frills and bronze throat-plates'],
	lizardfolk: ['turquoise dewlap frills and turquoise temple-paint', 'ridged crocodile brow-scales and jade plugs'],
	merfolk: ['iridescent gill-fins and coral-threaded hair', 'pearlescent scales along the temples and webbed ears'],
	celestial: ['a faint solar halo and luminous gold-white hair', 'star-freckled skin and eyes like captured nebulae'],
	ratfolk: ['twitching whiskers, notched ears, and keen ruby eyes', 'sleek brindled fur and ascarred snout'],
	tomb_undead: ['desiccated royal wrappings and a gilded death-mask', 'parchment skin, sunken sockets alight with cold blue fire'],
	ogor: ['a barrel-jawed scowl and a gut-plate hung with trophies', 'shaved pate and a braided chin-tuft'],
	warp_fiend: ['swept obsidian horns and ember-lit eyes', 'asymmetric crown-horns and warp-etched skin'],
	chitin_swarm: ['glossy iridescent mandibles and compound facets', 'chitinous cranial crest and twitching antennae']
};

const ROLE_TRINKETS: Record<Role, readonly string[]> = {
	ruler: ['a signet ring of state', 'a circlet of realm-gold', 'an orb-pommelled ceremonial blade'],
	heir: ['a princely gorget', 'a dynastic crest-brooch', 'a gilded riding crop'],
	general: ['a dented command baton', 'a wolf-pelisse clasp', 'a veteran’s Campaign medal'],
	merchant: ['a brass abacus at the belt', 'a velvet coin-pouch and ledger', 'a set of folding pocket-scales'],
	trader: ['a weathered compass and route-map case', 'a string of foreign trade-tokens', 'a salt-stained oilskin satchel'],
	entrepreneur: ['a gold pocket-chronometer', 'a bundle of stamped guild charters', 'an engraved seal-cylinder'],
	priest: ['a censer of sweet resin', 'a prayer-wheel of carved bone', 'a holy reliquary pendant'],
	prophet: ['a staff hung with scripture-strips', 'ash-streaked robes and a铜 bell', 'a tablet of prophecies'],
	wanderer: ['apatched travel-cloak and walking stave', 'a canteen and worn wayfinder charm', 'road-dull boots and a bedroll'],
	hero: ['a notched masterwork blade', 'a trophy-clasp from a slain beast', 'a polished buckler'],
	villain: ['a poisoned stiletto in the sleeve', 'a black-iron signet', 'a cloak clasped with a skull-pin'],
	magician: ['a bandolier of glass phials', 'a rune-inscribed focus rod', 'a grimoire bound in drake-hide'],
	thinker: ['brass reading-lenses on a ribbon', 'an astrolabe and ink-horn', 'a sheaf of annotated scrolls'],
	artist: ['charcoal-stained cuffs and a lute', 'a case of pigments and silverpoint styluses', 'a plumed beret'],
	athlete: ['a champion’s leather wrist-wraps', 'a bronze laurel token', 'a braided silk sash'],
	inventor: ['multi-lens loupe goggles', 'a leather apron of calipers and wrenches', 'a ticking clockwork gizmo']
};

const DEMEANOURS = [
	'speaks in measured, unhurried tones',
	'watches every doorway with restless eyes',
	'laughs easily but keeps a hand near the belt',
	'carries themselves with rigid military posture',
	'gestures animatedly while speaking',
	'Tilts their head as if listening to distant music',
	'squints thoughtfully before every reply',
	'moves with a quiet, cat-like economy'
] as const;

export function describeProceduralAppearance(p: Person, worldSeed: number | string = 1): ProceduralAppearance {
	const seedNum = typeof worldSeed === 'string' ? hashStr32(worldSeed) : worldSeed;
	const h = hash32(seedNum, p.id, hashStr32(p.name));
	const sp = p.species || 'human';
	const build = pickH(BUILDS, h, 0);
	const feature = pickH(FEATURES, h, 4);
	const eyes = `${pickH(EYES, h, 8)} eyes`;
	const headPool = SPECIES_HEAD[sp] ?? HAIR_STYLES;
	const hairOrHead = pickH(headPool, h, 12);
	const trinketPool = ROLE_TRINKETS[p.role] ?? ROLE_TRINKETS.wanderer;
	const trinket = pickH(trinketPool, h, 16);
	const demeanour = pickH(DEMEANOURS, h, 20);
	const attireDetail = p.traits?.includes('Pious')
		? 'embroidered devotional stole'
		: p.traits?.includes('Strong') || p.martial >= 12
			? 'riveted shoulder-guards'
			: p.traits?.includes('Greedy') || p.gold >= 120
				? 'velvet-trimmed brocade collar'
				: 'weather-dyed travelling mantle';

	return {
		build,
		feature,
		eyes,
		hairOrHead,
		attireDetail,
		trinket,
		demeanour,
		summary: `A ${build} figure with ${eyes}, ${hairOrHead}, and ${feature}. Carries ${trinket} and ${demeanour}.`
	};
}

// ───────────────────────── Procedural Canvas Character Portrait ─────────────────────────

const SKIN_PALETTES: Record<string, readonly [string, string][]> = {
	human: [
		['#f1c27d', '#c68642'], ['#e0ac69', '#a56b38'], ['#ffdbac', '#d19a66'],
		['#c68642', '#8d5524'], ['#8d5524', '#5c3310'], ['#d9a066', '#996433']
	],
	elf: [['#f7e2c6', '#c9a67d'], ['#e8d8f0', '#b298c4'], ['#dff2e2', '#9bbfa2']],
	void_elf: [['#c5b8e8', '#7d6ba8'], ['#a8b5e0', '#63709e']],
	dwarf: [['#e2a76f', '#a66b38'], ['#d4945a', '#8c5526'], ['#f0be8a', '#b57c47']],
	orc: [['#6b8e4e', '#445e2f'], ['#5a7a4c', '#364d2b'], ['#7d8c55', '#4f5932']],
	troll: [['#5e7368', '#384740'], ['#4f6b75', '#2e4147']],
	beastman: [['#a67b5b', '#6e4e35'], ['#8c6239', '#593b1f'], ['#b88b61', '#7a5636']],
	halfling: [['#f3c68f', '#c28d53'], ['#e5b278', '#ad7942']],
	giant: [['#9ba8b5', '#64717d'], ['#b8aba0', '#7d7066']],
	goblin: [['#7ca355', '#4c692f'], ['#8fb058', '#587030']],
	saurian: [['#b84a39', '#78281c'], ['#3b7a57', '#1f4731'], ['#c99738', '#855f16']],
	lizardfolk: [['#3a8c6e', '#1e5440'], ['#4e9a51', '#275929']],
	merfolk: [['#68b5c9', '#387687'], ['#7ad1c2', '#428a7d']],
	celestial: [['#fff3cf', '#d4b86a'], ['#e6f2ff', '#9ab8d9']],
	ratfolk: [['#8c7a6b', '#54473d'], ['#6e6259', '#3d352f']],
	tomb_undead: [['#b8b09c', '#736c5c'], ['#9e9583', '#5c5548']],
	ogor: [['#c49a76', '#856244'], ['#b08968', '#73543a']],
	warp_fiend: [['#b8324f', '#6e1427'], ['#7a3b8c', '#431a52']],
	chitin_swarm: [['#4a3b5c', '#261c33'], ['#2e5449', '#162e27']]
};

const HAIR_COLORS = ['#1e1b18', '#3d2817', '#6e4726', '#b58143', '#8c3322', '#d9c29c', '#7a8288', '#e6e8ea'];
const CLOTHS = ['#8c2d2d', '#2d5a8c', '#2d7348', '#6e3d82', '#8c6928', '#2b5e66', '#5c3c28', '#3a4659'];

/**
 * Draw a crisp procedural character portrait onto any Canvas2D context inside [x, y, size, size].
 */
export function drawCharacterPortrait(
	ctx: CanvasRenderingContext2D,
	p: Person,
	x: number,
	y: number,
	size: number,
	realmColor?: string,
	worldSeed: number | string = 1
) {
	const seedNum = typeof worldSeed === 'string' ? hashStr32(worldSeed) : worldSeed;
	const h = hash32(seedNum, p.id, hashStr32(p.name));
	const sp = p.species || 'human';
	const skinList = SKIN_PALETTES[sp] ?? SKIN_PALETTES.human;
	const [skin, skinShadow] = pickH(skinList, h, 0);
	const hairCol = pickH(HAIR_COLORS, h, 3);
	const clothCol = realmColor || pickH(CLOTHS, h, 6);
	const accentCol = '#e6c15a';

	ctx.save();
	ctx.beginPath();
	ctx.roundRect(x, y, size, size, size * 0.16);
	ctx.clip();

	// 1. Background aura / vignette
	const bgGrad = ctx.createLinearGradient(x, y, x, y + size);
	bgGrad.addColorStop(0, '#18141c');
	bgGrad.addColorStop(1, clothCol);
	ctx.fillStyle = bgGrad;
	ctx.fillRect(x, y, size, size);

	// Subtle geometric emblem behind head
	ctx.strokeStyle = 'rgba(255,255,255,0.12)';
	ctx.lineWidth = Math.max(1, size * 0.025);
	ctx.beginPath();
	ctx.arc(x + size * 0.5, y + size * 0.46, size * 0.36, 0, Math.PI * 2);
	ctx.stroke();

	const cx = x + size * 0.5;
	const cy = y + size * 0.48;
	const r = size * 0.24;

	// 2. Role weapon / tool behind shoulder
	ctx.strokeStyle = '#c8cfd6';
	ctx.lineWidth = Math.max(1.5, size * 0.045);
	if (p.role === 'general' || p.role === 'hero' || p.martial >= 12) {
		// Sword hilt over right shoulder
		ctx.beginPath();
		ctx.moveTo(cx + r * 0.7, cy + r * 0.8);
		ctx.lineTo(cx + r * 1.45, cy - r * 1.25);
		ctx.stroke();
		ctx.strokeStyle = accentCol;
		ctx.beginPath();
		ctx.moveTo(cx + r * 0.95, cy - r * 0.65);
		ctx.lineTo(cx + r * 1.5, cy - r * 0.35);
		ctx.stroke();
	} else if (p.role === 'magician' || p.role === 'prophet' || p.role === 'priest') {
		// Staff / orb behind left shoulder
		ctx.strokeStyle = '#9c7344';
		ctx.beginPath();
		ctx.moveTo(cx - r * 1.15, cy + r * 1.5);
		ctx.lineTo(cx - r * 1.35, cy - r * 1.2);
		ctx.stroke();
		ctx.fillStyle = p.role === 'magician' ? '#70d6ff' : '#ffd166';
		ctx.beginPath();
		ctx.arc(cx - r * 1.35, cy - r * 1.25, r * 0.24, 0, Math.PI * 2);
		ctx.fill();
	}

	// 3. Shoulders / Tunic / Armor
	ctx.fillStyle = clothCol;
	ctx.beginPath();
	ctx.ellipse(cx, y + size * 0.96, r * 1.65, r * 1.15, 0, Math.PI, 0);
	ctx.fill();

	// Armor pauldrons or collar trim
	if (p.role === 'general' || p.role === 'hero' || p.role === 'ruler' || p.martial >= 11) {
		ctx.fillStyle = '#7c858e';
		ctx.beginPath();
		ctx.ellipse(cx - r * 1.15, y + size * 0.84, r * 0.55, r * 0.38, -0.3, 0, Math.PI * 2);
		ctx.ellipse(cx + r * 1.15, y + size * 0.84, r * 0.55, r * 0.38, 0.3, 0, Math.PI * 2);
		ctx.fill();
	}
	// Collar V-trim
	ctx.strokeStyle = accentCol;
	ctx.lineWidth = Math.max(1, size * 0.035);
	ctx.beginPath();
	ctx.moveTo(cx - r * 0.55, y + size * 0.72);
	ctx.lineTo(cx, y + size * 0.88);
	ctx.lineTo(cx + r * 0.55, y + size * 0.72);
	ctx.stroke();

	// 4. Neck
	ctx.fillStyle = skinShadow;
	ctx.fillRect(cx - r * 0.34, cy + r * 0.65, r * 0.68, r * 0.55);

	// 5. Species Ears / Horns (back layer)
	if (sp === 'elf' || sp === 'void_elf' || sp === 'goblin' || sp === 'troll') {
		const earLen = sp === 'goblin' ? r * 0.95 : r * 0.75;
		ctx.fillStyle = skin;
		ctx.beginPath();
		ctx.moveTo(cx - r * 0.9, cy - r * 0.1);
		ctx.lineTo(cx - r - earLen, cy - r * 0.45);
		ctx.lineTo(cx - r * 0.85, cy + r * 0.3);
		ctx.closePath();
		ctx.moveTo(cx + r * 0.9, cy - r * 0.1);
		ctx.lineTo(cx + r + earLen, cy - r * 0.45);
		ctx.lineTo(cx + r * 0.85, cy + r * 0.3);
		ctx.closePath();
		ctx.fill();
	}
	if (sp === 'warp_fiend' || sp === 'saurian' || sp === 'beastman') {
		ctx.fillStyle = '#3b2f2f';
		ctx.beginPath();
		ctx.moveTo(cx - r * 0.65, cy - r * 0.65);
		ctx.quadraticCurveTo(cx - r * 1.4, cy - r * 1.3, cx - r * 0.95, cy - r * 1.65);
		ctx.quadraticCurveTo(cx - r * 0.7, cy - r * 1.2, cx - r * 0.35, cy - r * 0.85);
		ctx.moveTo(cx + r * 0.65, cy - r * 0.65);
		ctx.quadraticCurveTo(cx + r * 1.4, cy - r * 1.3, cx + r * 0.95, cy - r * 1.65);
		ctx.quadraticCurveTo(cx + r * 0.7, cy - r * 1.2, cx + r * 0.35, cy - r * 0.85);
		ctx.fill();
	}

	// 6. Head shape
	ctx.fillStyle = skin;
	ctx.beginPath();
	const jawW = sp === 'orc' || sp === 'ogor' || sp === 'dwarf' ? r * 1.06 : r * 0.95;
	ctx.ellipse(cx, cy, jawW, r * 1.12, 0, 0, Math.PI * 2);
	ctx.fill();

	// Facial shading
	ctx.fillStyle = skinShadow;
	ctx.beginPath();
	ctx.arc(cx, cy, jawW, 0.15 * Math.PI, 0.85 * Math.PI);
	ctx.fill();

	// 7. Eyes & Brows
	const eyeY = cy - r * 0.08;
	const eyeDX = r * 0.38;
	const eyeCol =
		sp === 'celestial' ? '#fff3b0'
		: sp === 'warp_fiend' || p.role === 'villain' ? '#ff4d4d'
		: sp === 'tomb_undead' ? '#5ce1e6'
		: sp === 'void_elf' ? '#c77dff'
		: '#1d1e22';

	ctx.fillStyle = '#f4f4f6';
	if (sp !== 'tomb_undead' && sp !== 'chitin_swarm') {
		ctx.beginPath();
		ctx.ellipse(cx - eyeDX, eyeY, r * 0.18, r * 0.11, 0, 0, Math.PI * 2);
		ctx.ellipse(cx + eyeDX, eyeY, r * 0.18, r * 0.11, 0, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.fillStyle = eyeCol;
	ctx.beginPath();
	ctx.arc(cx - eyeDX, eyeY, r * 0.1, 0, Math.PI * 2);
	ctx.arc(cx + eyeDX, eyeY, r * 0.1, 0, Math.PI * 2);
	ctx.fill();

	// Brows
	ctx.strokeStyle = hairCol;
	ctx.lineWidth = Math.max(1, size * 0.032);
	const browTilt = p.role === 'villain' || p.martial >= 12 ? r * 0.08 : 0;
	ctx.beginPath();
	ctx.moveTo(cx - eyeDX - r * 0.2, eyeY - r * 0.2 - browTilt);
	ctx.lineTo(cx - eyeDX + r * 0.18, eyeY - r * 0.2 + browTilt);
	ctx.moveTo(cx + eyeDX - r * 0.18, eyeY - r * 0.2 + browTilt);
	ctx.lineTo(cx + eyeDX + r * 0.2, eyeY - r * 0.2 - browTilt);
	ctx.stroke();

	// 8. Scar (if battle-hardened or by hash)
	if ((h & 7) === 0 || p.martial >= 13 || p.role === 'hero' || p.role === 'villain') {
		ctx.strokeStyle = 'rgba(160, 45, 45, 0.65)';
		ctx.lineWidth = Math.max(1, size * 0.025);
		ctx.beginPath();
		ctx.moveTo(cx + eyeDX - r * 0.06, eyeY - r * 0.35);
		ctx.lineTo(cx + eyeDX + r * 0.12, eyeY + r * 0.45);
		ctx.stroke();
	}

	// 9. Nose & Mouth / Tusks / Beard
	ctx.strokeStyle = skinShadow;
	ctx.lineWidth = Math.max(1, size * 0.028);
	ctx.beginPath();
	ctx.moveTo(cx, eyeY + r * 0.05);
	ctx.lineTo(cx - r * 0.08, cy + r * 0.28);
	ctx.lineTo(cx + r * 0.08, cy + r * 0.28);
	ctx.stroke();

	// Mouth
	ctx.beginPath();
	ctx.moveTo(cx - r * 0.24, cy + r * 0.55);
	ctx.lineTo(cx + r * 0.24, cy + r * 0.55);
	ctx.stroke();

	// Orc / Troll / Ogor tusks
	if (sp === 'orc' || sp === 'troll' || sp === 'ogor') {
		ctx.fillStyle = '#f5eedc';
		ctx.beginPath();
		ctx.moveTo(cx - r * 0.32, cy + r * 0.58);
		ctx.lineTo(cx - r * 0.22, cy + r * 0.32);
		ctx.lineTo(cx - r * 0.14, cy + r * 0.58);
		ctx.moveTo(cx + r * 0.32, cy + r * 0.58);
		ctx.lineTo(cx + r * 0.22, cy + r * 0.32);
		ctx.lineTo(cx + r * 0.14, cy + r * 0.58);
		ctx.fill();
	}

	// Beard for dwarves, giants, or hashed older/martial characters
	if (sp === 'dwarf' || sp === 'giant' || ((h >>> 5) % 4 === 0 && sp === 'human')) {
		ctx.fillStyle = hairCol;
		ctx.beginPath();
		ctx.moveTo(cx - jawW * 0.9, cy + r * 0.25);
		ctx.quadraticCurveTo(cx, cy + r * (sp === 'dwarf' ? 1.85 : 1.35), cx + jawW * 0.9, cy + r * 0.25);
		ctx.quadraticCurveTo(cx, cy + r * 0.65, cx - jawW * 0.9, cy + r * 0.25);
		ctx.fill();
	}

	// 10. Hair & Role Headgear
	if (p.role === 'ruler' || p.role === 'heir') {
		// Hair base
		ctx.fillStyle = hairCol;
		ctx.beginPath();
		ctx.arc(cx, cy - r * 0.2, jawW * 1.04, Math.PI, 0);
		ctx.fill();
		// Crown / Circlet
		ctx.fillStyle = '#f5c542';
		ctx.strokeStyle = '#8c6214';
		ctx.lineWidth = Math.max(1, size * 0.025);
		ctx.beginPath();
		ctx.moveTo(cx - r * 0.85, cy - r * 0.65);
		ctx.lineTo(cx - r * 0.85, cy - r * 1.15);
		ctx.lineTo(cx - r * 0.45, cy - r * 0.85);
		ctx.lineTo(cx, cy - r * 1.3);
		ctx.lineTo(cx + r * 0.45, cy - r * 0.85);
		ctx.lineTo(cx + r * 0.85, cy - r * 1.15);
		ctx.lineTo(cx + r * 0.85, cy - r * 0.65);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	} else if (p.role === 'general' || (p.role === 'hero' && (h & 1) === 0)) {
		// Crest Helm
		ctx.fillStyle = '#8d99ae';
		ctx.beginPath();
		ctx.arc(cx, cy - r * 0.15, jawW * 1.08, Math.PI * 1.05, -0.05 * Math.PI);
		ctx.fill();
		// Nasal bar
		ctx.fillRect(cx - r * 0.07, cy - r * 0.6, r * 0.14, r * 0.72);
		// Plume
		ctx.fillStyle = clothCol;
		ctx.beginPath();
		ctx.ellipse(cx, cy - r * 1.28, r * 0.45, r * 0.2, 0, 0, Math.PI * 2);
		ctx.fill();
	} else if (p.role === 'priest' || p.role === 'prophet' || p.role === 'magician') {
		// Hood / Mitre / Arcane cowl
		ctx.fillStyle = clothCol;
		ctx.beginPath();
		ctx.moveTo(cx - jawW * 1.2, cy + r * 0.4);
		ctx.quadraticCurveTo(cx - jawW * 1.15, cy - r * 1.2, cx, cy - r * 1.42);
		ctx.quadraticCurveTo(cx + jawW * 1.15, cy - r * 1.2, cx + jawW * 1.2, cy + r * 0.4);
		ctx.arc(cx, cy - r * 0.1, jawW * 0.96, 0.1 * Math.PI, 0.9 * Math.PI, true);
		ctx.closePath();
		ctx.fill();
	} else {
		// Procedural hair variations
		ctx.fillStyle = hairCol;
		const style = (h >>> 9) % 4;
		ctx.beginPath();
		if (style === 0) {
			// Swept bangs
			ctx.arc(cx, cy - r * 0.18, jawW * 1.05, Math.PI * 0.92, Math.PI * 0.08);
		} else if (style === 1) {
			// Topknot + undercut
			ctx.arc(cx, cy - r * 0.25, jawW * 0.98, Math.PI * 1.1, -0.1 * Math.PI);
			ctx.arc(cx, cy - r * 1.25, r * 0.32, 0, Math.PI * 2);
		} else if (style === 2) {
			// Long flowing locks
			ctx.arc(cx, cy - r * 0.18, jawW * 1.06, Math.PI * 0.8, Math.PI * 0.2);
			ctx.fillRect(cx - jawW * 1.05, cy - r * 0.2, r * 0.28, r * 1.25);
			ctx.fillRect(cx + jawW * 0.77, cy - r * 0.2, r * 0.28, r * 1.25);
		} else {
			// Beret / Merchant cap
			ctx.fillStyle = clothCol;
			ctx.ellipse(cx, cy - r * 0.92, jawW * 1.15, r * 0.42, -0.12, 0, Math.PI * 2);
		}
		ctx.fill();
	}

	// 11. Inventor / Thinker spectacles or goggles
	if (p.role === 'inventor' || p.role === 'thinker') {
		ctx.strokeStyle = '#d4a359';
		ctx.lineWidth = Math.max(1, size * 0.03);
		ctx.beginPath();
		ctx.arc(cx - eyeDX, eyeY, r * 0.24, 0, Math.PI * 2);
		ctx.arc(cx + eyeDX, eyeY, r * 0.24, 0, Math.PI * 2);
		ctx.moveTo(cx - eyeDX + r * 0.24, eyeY);
		ctx.lineTo(cx + eyeDX - r * 0.24, eyeY);
		ctx.stroke();
	}

	// Frame border
	ctx.strokeStyle = 'rgba(255, 235, 190, 0.35)';
	ctx.lineWidth = Math.max(1, size * 0.04);
	ctx.strokeRect(x, y, size, size);
	ctx.restore();
}

// ───────────────────────── Procedural Environment Scatter on World Map ─────────────────────────

/**
 * Renders subtle procedural environmental landmarks, flora, and terrain details on the map
 * when zoomed in (k >= 1.15). Deterministic per cell & world seed.
 */
export function drawProceduralEnvironment(
	ctx: CanvasRenderingContext2D,
	w: World,
	s: Simulation,
	layer: number,
	k: number,
	S: (x: number, y: number) => [number, number],
	vw: number,
	vh: number,
	theme: MapTheme
) {
	if (k < 1.15) return;
	const c: Cells = w.cells;
	const L = w.layers[layer];
	if (!L) return;

	const seed = hashStr32(String(w.opts.seed));
	const step = k > 2.4 ? 1 : k > 1.6 ? 2 : 3;
	const scale = Math.min(2.0, Math.max(0.75, Math.sqrt(k) * 0.72));

	ctx.save();
	ctx.lineWidth = 1.1 * scale;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';

	for (let i = 0; i < c.n; i += step) {
		if (!L.open[i]) continue;
		const hVal = hash32(seed, i, layer);
		// Only ~28% of cells carry a visible landmark/flora cluster so the map stays clean
		if ((hVal & 15) > 4) continue;
		if (c.burg[i]) continue;

		const [sx, sy] = S(c.x[i], c.y[i]);
		if (sx < -24 || sy < -24 || sx > vw + 24 || sy > vh + 24) continue;

		const biome = c.biome[i];
		const height = c.h[i];

		if (L.kind === 'deep') {
			drawDeepFeature(ctx, sx, sy, scale, hVal, theme);
			continue;
		}
		if (L.kind === 'sky') {
			drawSkyFeature(ctx, sx, sy, scale, hVal, theme);
			continue;
		}
		if (L.kind === 'sea' || height < 20) {
			if ((hVal & 31) === 0) drawSeaFeature(ctx, sx, sy, scale, hVal, theme);
			continue;
		}

		// Surface elevation & biome assets
		if (height >= 68) {
			drawMountainCrag(ctx, sx, sy, scale * 1.15, hVal, height >= 82, theme);
		} else if (biome >= 5 && biome <= 9) {
			drawForestCluster(ctx, sx, sy, scale, biome, hVal, theme);
		} else if (biome === 1 || biome === 2) {
			drawAridFeature(ctx, sx, sy, scale, biome, hVal, theme);
		} else if (biome === 12) {
			drawWetlandFeature(ctx, sx, sy, scale, hVal, theme);
		} else if (biome === 14) {
			drawCrystalSpire(ctx, sx, sy, scale, hVal);
		} else if (biome === 15) {
			drawGiantMushrooms(ctx, sx, sy, scale, hVal);
		} else if (biome === 13 || biome === 16) {
			drawVolcanicVent(ctx, sx, sy, scale, hVal);
		} else if (biome === 10 || biome === 11) {
			drawTundraCairn(ctx, sx, sy, scale, hVal);
		} else if ((hVal & 63) === 1) {
			drawWaysideMonolith(ctx, sx, sy, scale, hVal, theme);
		}
	}
	ctx.restore();
}

function drawMountainCrag(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, h: number, snow: boolean, th: MapTheme) {
	const peaks = 1 + ((h >>> 4) & 1);
	for (let p = 0; p < peaks; p++) {
		const ox = (p - (peaks - 1) * 0.5) * 6 * r;
		const ph = (5.5 + ((h >>> (6 + p * 2)) & 3)) * r;
		const pw = ph * 0.85;
		ctx.beginPath();
		ctx.moveTo(x + ox - pw, y + ph * 0.4);
		ctx.lineTo(x + ox, y - ph * 0.6);
		ctx.lineTo(x + ox + pw, y + ph * 0.4);
		ctx.fillStyle = th.glow ? 'rgba(90,110,140,0.45)' : 'rgba(95,82,70,0.42)';
		ctx.fill();
		ctx.strokeStyle = th.glow ? 'rgba(160,190,230,0.55)' : 'rgba(60,48,38,0.55)';
		ctx.stroke();
		if (snow) {
			ctx.beginPath();
			ctx.moveTo(x + ox - pw * 0.38, y - ph * 0.22);
			ctx.lineTo(x + ox, y - ph * 0.6);
			ctx.lineTo(x + ox + pw * 0.38, y - ph * 0.22);
			ctx.closePath();
			ctx.fillStyle = 'rgba(250,252,255,0.75)';
			ctx.fill();
		}
	}
}

function drawForestCluster(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, biome: number, h: number, th: MapTheme) {
	const pine = biome === 9 || biome === 6 && (h & 1) === 1;
	const palm = biome === 7 && (h & 3) === 0;
	const count = 2 + ((h >>> 4) % 2);
	const col = biome === 9 ? 'rgba(38,78,54,0.55)' : biome === 7 ? 'rgba(34,105,58,0.55)' : 'rgba(54,110,52,0.52)';
	const stroke = th.glow ? 'rgba(110,210,150,0.55)' : 'rgba(28,56,28,0.55)';

	for (let t = 0; t < count; t++) {
		const ox = ((t - (count - 1) * 0.5) * 4.2 + (((h >>> (t * 3)) & 3) - 1.5)) * r;
		const oy = (((h >>> (t * 4 + 2)) & 3) - 1.5) * r;
		const tx = x + ox, ty = y + oy;
		ctx.fillStyle = col;
		ctx.strokeStyle = stroke;
		if (pine) {
			ctx.beginPath();
			ctx.moveTo(tx, ty - 4.8 * r);
			ctx.lineTo(tx + 2.6 * r, ty + 1.8 * r);
			ctx.lineTo(tx - 2.6 * r, ty + 1.8 * r);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
		} else if (palm) {
			ctx.beginPath();
			ctx.moveTo(tx, ty + 2.2 * r);
			ctx.quadraticCurveTo(tx + 0.8 * r, ty - 1.5 * r, tx + 0.4 * r, ty - 3.5 * r);
			ctx.stroke();
			for (const a of [-2.2, -1.1, 0, 1.1, 2.2]) {
				ctx.beginPath();
				ctx.moveTo(tx + 0.4 * r, ty - 3.5 * r);
				ctx.quadraticCurveTo(tx + Math.cos(a) * 3.2 * r, ty - 4.5 * r, tx + Math.cos(a) * 4.2 * r, ty - 2.0 * r);
				ctx.stroke();
			}
		} else {
			ctx.beginPath();
			ctx.arc(tx, ty - 1.5 * r, 2.5 * r, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
		}
	}
}

function drawAridFeature(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, biome: number, h: number, th: MapTheme) {
	ctx.strokeStyle = th.glow ? 'rgba(235,190,110,0.5)' : 'rgba(135,98,52,0.52)';
	if (biome === 1 && (h & 3) === 0) {
		// Saguaro cactus silhouette
		ctx.strokeStyle = 'rgba(58,118,58,0.68)';
		ctx.beginPath();
		ctx.moveTo(x, y + 3 * r);
		ctx.lineTo(x, y - 3.5 * r);
		ctx.moveTo(x - 2.2 * r, y - 2.2 * r);
		ctx.lineTo(x - 2.2 * r, y - 0.5 * r);
		ctx.lineTo(x, y - 0.5 * r);
		ctx.moveTo(x + 2.2 * r, y - 2.8 * r);
		ctx.lineTo(x + 2.2 * r, y - 1.2 * r);
		ctx.lineTo(x, y - 1.2 * r);
		ctx.stroke();
	} else {
		// Sand dune ripples
		ctx.beginPath();
		ctx.moveTo(x - 4.5 * r, y + 0.8 * r);
		ctx.quadraticCurveTo(x, y - 1.8 * r, x + 4.5 * r, y + 0.8 * r);
		ctx.moveTo(x - 3 * r, y + 2.5 * r);
		ctx.quadraticCurveTo(x + 1 * r, y + 0.5 * r, x + 5 * r, y + 2.5 * r);
		ctx.stroke();
	}
}

function drawWetlandFeature(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, h: number, _th: MapTheme) {
	ctx.strokeStyle = 'rgba(45,110,95,0.6)';
	for (let k = -1; k <= 1; k++) {
		const rx = x + k * 2.2 * r;
		ctx.beginPath();
		ctx.moveTo(rx, y + 2 * r);
		ctx.lineTo(rx + ((h >>> (k + 2)) & 1 ? 0.6 : -0.6) * r, y - 2.6 * r);
		ctx.stroke();
	}
}

function drawCrystalSpire(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, _h: number) {
	ctx.fillStyle = 'rgba(205,110,250,0.52)';
	ctx.strokeStyle = 'rgba(240,180,255,0.75)';
	ctx.beginPath();
	ctx.moveTo(x, y - 5 * r);
	ctx.lineTo(x + 2 * r, y);
	ctx.lineTo(x, y + 2 * r);
	ctx.lineTo(x - 2 * r, y);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
}

function drawGiantMushrooms(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, _h: number) {
	ctx.strokeStyle = 'rgba(210,185,165,0.7)';
	ctx.beginPath();
	ctx.moveTo(x, y + 2.5 * r);
	ctx.lineTo(x, y - 1 * r);
	ctx.stroke();
	ctx.fillStyle = 'rgba(175,68,185,0.58)';
	ctx.beginPath();
	ctx.arc(x, y - 1 * r, 3 * r, Math.PI, 0);
	ctx.closePath();
	ctx.fill();
}

function drawVolcanicVent(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, _h: number) {
	ctx.fillStyle = 'rgba(70,58,55,0.6)';
	ctx.beginPath();
	ctx.moveTo(x - 3.5 * r, y + 2 * r);
	ctx.lineTo(x - 1.4 * r, y - 2.2 * r);
	ctx.lineTo(x + 1.4 * r, y - 2.2 * r);
	ctx.lineTo(x + 3.5 * r, y + 2 * r);
	ctx.closePath();
	ctx.fill();
	ctx.fillStyle = 'rgba(255,105,35,0.8)';
	ctx.beginPath();
	ctx.ellipse(x, y - 2.2 * r, 1.3 * r, 0.6 * r, 0, 0, Math.PI * 2);
	ctx.fill();
}

function drawTundraCairn(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, _h: number) {
	ctx.fillStyle = 'rgba(140,150,160,0.58)';
	ctx.strokeStyle = 'rgba(75,85,95,0.65)';
	for (let k = 0; k < 3; k++) {
		const w = (3.0 - k * 0.75) * r;
		ctx.beginPath();
		ctx.ellipse(x, y + (1.5 - k * 1.4) * r, w, 0.9 * r, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
	}
}

function drawWaysideMonolith(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, _h: number, _th: MapTheme) {
	ctx.fillStyle = 'rgba(110,120,130,0.6)';
	ctx.strokeStyle = 'rgba(50,55,60,0.75)';
	ctx.beginPath();
	ctx.moveTo(x - 1.2 * r, y + 2.5 * r);
	ctx.lineTo(x - 0.9 * r, y - 3.5 * r);
	ctx.lineTo(x, y - 4.6 * r);
	ctx.lineTo(x + 0.9 * r, y - 3.5 * r);
	ctx.lineTo(x + 1.2 * r, y + 2.5 * r);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
}

function drawDeepFeature(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, h: number, _th: MapTheme) {
	if ((h & 1) === 0) {
		drawCrystalSpire(ctx, x, y, r * 0.85, h);
	} else {
		drawGiantMushrooms(ctx, x, y, r * 0.85, h);
	}
}

function drawSkyFeature(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, _h: number, _th: MapTheme) {
	ctx.strokeStyle = 'rgba(180,215,255,0.5)';
	ctx.beginPath();
	ctx.arc(x - 1.5 * r, y, 1.8 * r, Math.PI * 0.8, Math.PI * 1.9);
	ctx.arc(x + 1.2 * r, y - 0.4 * r, 2.1 * r, Math.PI * 1.1, Math.PI * 0.2);
	ctx.stroke();
}

function drawSeaFeature(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, _h: number, _th: MapTheme) {
	ctx.strokeStyle = 'rgba(140,210,235,0.42)';
	ctx.beginPath();
	ctx.moveTo(x - 3.5 * r, y);
	ctx.quadraticCurveTo(x - 1.7 * r, y - 1.4 * r, x, y);
	ctx.quadraticCurveTo(x + 1.7 * r, y + 1.4 * r, x + 3.5 * r, y);
	ctx.stroke();
}

// ───────────────────────── Procedural Settlement Skyline Vignette ─────────────────────────

/**
 * Deterministically renders a mini panoramic skyline of a settlement (`burg`) onto a Canvas2D context
 * based on its biome, elevation, port/citadel/walls/temple/plaza/university/slums features,
 * cultural `arch` shape, and realm color. Uses pure hashing `hash32`, NEVER `sim.rng` or `Math.random()`.
 */
export function drawSettlementVignette(
	ctx: CanvasRenderingContext2D,
	sim: Simulation,
	burg: Burg,
	width: number,
	height: number
) {
	const worldSeed = hashStr32(String(sim.w.opts.seed));
	const h = hash32(worldSeed, burg.id, burg.cell);
	const cells = sim.w.cells;
	const cell = Math.max(0, Math.min(cells.n - 1, burg.cell));
	const biome = cells.biome[cell] ?? 4;
	const elev = cells.h[cell] ?? 30;
	const cult = sim.w.cultures[burg.culture];
	const pol = burg.state ? sim.polities[burg.state] : null;
	const realmColor = pol?.color || cult?.color || '#c59b45';
	const arch = archStyleOf(cult?.sphere)?.shape ?? 'tower';
	const dists = getBurgDistricts(burg);

	const hasPort = Boolean(burg.port || burg.pirateCove);
	const hasCitadel = Boolean(burg.capital || (burg.garrison ?? 0) >= 2 || burg.charter);
	const wallsLvl = dists.walls ?? (burg.capital ? 1 : 0);
	const templeLvl = dists.temple ?? 0;
	const plazaLvl = (dists.market ?? 0) + (dists.granary ?? 0);
	const univLvl = dists.academy ?? 0;
	const hasSlums = Boolean(burg.banditCove || burg.pirateCove || burg.pop >= 12);

	ctx.save();
	ctx.beginPath();
	ctx.roundRect(0, 0, width, height, 6);
	ctx.clip();

	// 1. Sky / Plane Backdrop Gradient
	const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
	if (burg.layer === 'deep') {
		skyGrad.addColorStop(0, '#0f0c1b');
		skyGrad.addColorStop(0.65, '#1e1633');
		skyGrad.addColorStop(1, '#2a203f');
	} else if (burg.layer === 'sky') {
		skyGrad.addColorStop(0, '#182b49');
		skyGrad.addColorStop(0.6, '#3b6998');
		skyGrad.addColorStop(1, '#8ab6d6');
	} else if (burg.layer === 'sea') {
		skyGrad.addColorStop(0, '#072235');
		skyGrad.addColorStop(0.6, '#0e4459');
		skyGrad.addColorStop(1, '#1a6b7c');
	} else if (biome === 1 || biome === 2) {
		// Arid warm dusk
		skyGrad.addColorStop(0, '#1f162b');
		skyGrad.addColorStop(0.55, '#5e2c38');
		skyGrad.addColorStop(1, '#c97a4b');
	} else if (biome >= 9 && biome <= 11) {
		// Boreal / polar crisp twilight
		skyGrad.addColorStop(0, '#0d1b2a');
		skyGrad.addColorStop(0.55, '#1b3b5a');
		skyGrad.addColorStop(1, '#648dae');
	} else if (biome === 13 || biome === 16) {
		// Volcanic ember sky
		skyGrad.addColorStop(0, '#1a0f12');
		skyGrad.addColorStop(0.6, '#4a1c1c');
		skyGrad.addColorStop(1, '#a84225');
	} else {
		// Temperate / lush twilight
		skyGrad.addColorStop(0, '#121829');
		skyGrad.addColorStop(0.58, '#283859');
		skyGrad.addColorStop(1, '#6e5773');
	}
	ctx.fillStyle = skyGrad;
	ctx.fillRect(0, 0, width, height);

	// Celestial body (sun/moon or cavern crystals)
	const sunX = width * (0.18 + ((h & 255) / 255) * 0.64);
	const sunY = height * (0.24 + (((h >>> 8) & 63) / 63) * 0.16);
	if (burg.layer === 'deep') {
		// Stalactites & glowing crystals on ceiling
		ctx.fillStyle = '#140f24';
		for (let i = 0; i < 9; i++) {
			const sx = (i / 8) * width;
			const sh = 6 + ((hash32(h, i, 1) & 7) * 1.8);
			ctx.beginPath();
			ctx.moveTo(sx - 9, 0);
			ctx.lineTo(sx, sh);
			ctx.lineTo(sx + 9, 0);
			ctx.fill();
		}
		ctx.fillStyle = 'rgba(180, 120, 255, 0.35)';
		ctx.beginPath();
		ctx.arc(sunX, sunY, 9, 0, Math.PI * 2);
		ctx.fill();
	} else {
		ctx.fillStyle = 'rgba(255, 236, 179, 0.22)';
		ctx.beginPath();
		ctx.arc(sunX, sunY, 13, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = 'rgba(255, 245, 210, 0.72)';
		ctx.beginPath();
		ctx.arc(sunX, sunY, 7.5, 0, Math.PI * 2);
		ctx.fill();
	}

	const groundY = height * 0.78;

	// 2. Distant Horizon Ridge (scaled by elevation & biome)
	ctx.beginPath();
	ctx.moveTo(0, height);
	ctx.lineTo(0, groundY - 6);
	const ridgeSteps = 7;
	const elevFactor = Math.min(1.4, Math.max(0.25, (elev - 15) / 55));
	for (let i = 1; i <= ridgeSteps; i++) {
		const rx = (i / ridgeSteps) * width;
		const rh = (8 + (hash32(h, i, 2) % 18)) * elevFactor;
		const mx = ((i - 0.5) / ridgeSteps) * width;
		ctx.lineTo(mx, groundY - rh);
		ctx.lineTo(rx, groundY - 4 - (hash32(h, i, 3) % 7));
	}
	ctx.lineTo(width, height);
	ctx.closePath();
	ctx.fillStyle =
		biome >= 9 && biome <= 11
			? 'rgba(72, 95, 118, 0.55)'
			: biome === 1 || biome === 2
				? 'rgba(110, 62, 48, 0.52)'
				: 'rgba(36, 42, 64, 0.58)';
	ctx.fill();

	// 3. Ground Plane & Port Harbor Water
	ctx.fillStyle =
		biome === 1 || biome === 2
			? '#4a3228'
			: biome >= 9 && biome <= 11
				? '#334452'
				: '#232938';
	ctx.fillRect(0, groundY, width, height - groundY);

	if (hasPort) {
		const waterX = width * 0.62;
		const waterGrad = ctx.createLinearGradient(waterX, groundY, width, height);
		waterGrad.addColorStop(0, '#143d59');
		waterGrad.addColorStop(1, '#0b2236');
		ctx.fillStyle = waterGrad;
		ctx.fillRect(waterX, groundY, width - waterX, height - groundY);

		// Shimmer lines & ship silhouette
		ctx.strokeStyle = 'rgba(180, 225, 255, 0.35)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(waterX + 8, groundY + 5);
		ctx.lineTo(width - 10, groundY + 5);
		ctx.moveTo(waterX + 18, groundY + 10);
		ctx.lineTo(width - 18, groundY + 10);
		ctx.stroke();

		// Tall ship hull + sail in harbor
		const shipX = width * 0.82;
		const shipY = groundY + 2;
		ctx.fillStyle = '#2e1f18';
		ctx.beginPath();
		ctx.moveTo(shipX - 11, shipY - 2);
		ctx.lineTo(shipX + 11, shipY - 2);
		ctx.lineTo(shipX + 7, shipY + 3);
		ctx.lineTo(shipX - 7, shipY + 3);
		ctx.closePath();
		ctx.fill();
		ctx.strokeStyle = '#cbb89d';
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		ctx.moveTo(shipX, shipY - 2);
		ctx.lineTo(shipX, shipY - 19);
		ctx.stroke();
		ctx.fillStyle = burg.pirateCove ? '#2b2628' : '#efe6d5';
		ctx.beginPath();
		ctx.moveTo(shipX, shipY - 18);
		ctx.quadraticCurveTo(shipX + 9, shipY - 12, shipX, shipY - 5);
		ctx.closePath();
		ctx.fill();
	}

	// 4. Settlement Skyline Silhouette
	const skySpan = hasPort ? width * 0.66 : width * 0.88;
	const startX = hasPort ? width * 0.05 : width * 0.06;
	const bCount = Math.min(13, Math.max(5, 5 + Math.floor(Math.sqrt(burg.pop || 1) * 1.6)));
	const slotW = skySpan / bCount;

	// Outer slums / shanties on the left fringe if applicable
	if (hasSlums) {
		ctx.fillStyle = '#2d252a';
		for (let s = 0; s < 3; s++) {
			const sx = 4 + s * 8;
			const sh = 6 + (s % 2) * 3;
			ctx.fillRect(sx, groundY - sh, 7, sh);
		}
	}

	for (let i = 0; i < bCount; i++) {
		const bhHash = hash32(h, i, 10);
		const bx = startX + i * slotW;
		const bw = Math.max(7, slotW * 0.84);
		const centerDist = Math.abs(i - (bCount - 1) * 0.45) / (bCount * 0.5);
		const isCenter = i === Math.floor(bCount * 0.45);
		const isTempleSlot = (templeLvl > 0 || i === Math.floor(bCount * 0.62)) && i === Math.floor(bCount * 0.62);
		const isUnivSlot = univLvl > 0 && i === Math.floor(bCount * 0.28);

		let bh = (11 + (bhHash % 12)) * (1.15 - centerDist * 0.45);
		if (isCenter && hasCitadel) bh = Math.min(height * 0.58, bh * 1.48 + 8);
		else if (isTempleSlot) bh = Math.min(height * 0.54, bh * 1.28 + templeLvl * 3);
		else if (isUnivSlot) bh = Math.min(height * 0.48, bh * 1.2 + univLvl * 2.5);

		const by = groundY - bh;
		ctx.fillStyle = isCenter ? '#232838' : (i & 1) === 0 ? '#1c202e' : '#262b3d';
		ctx.fillRect(bx, by, bw, bh);

		// Cultural Roof / Arch Silhouette
		ctx.fillStyle = isCenter || isTempleSlot ? realmColor : '#353c52';
		ctx.beginPath();
		if (arch === 'dome' || arch === 'onion' || isUnivSlot) {
			ctx.arc(bx + bw * 0.5, by, bw * 0.45, Math.PI, 0);
			ctx.moveTo(bx + bw * 0.5, by - bw * 0.45);
			ctx.lineTo(bx + bw * 0.5, by - bw * 0.72);
		} else if (arch === 'pagoda' || arch === 'gate') {
			ctx.moveTo(bx - 3, by);
			ctx.quadraticCurveTo(bx + bw * 0.5, by - 7, bx + bw + 3, by);
			ctx.closePath();
		} else if (arch === 'stepped' || arch === 'temple' || arch === 'terrace') {
			ctx.rect(bx + bw * 0.15, by - 4, bw * 0.7, 4);
			ctx.rect(bx + bw * 0.3, by - 8, bw * 0.4, 4);
		} else if (arch === 'tent') {
			ctx.moveTo(bx - 1, by + 2);
			ctx.lineTo(bx + bw * 0.5, by - 6);
			ctx.lineTo(bx + bw + 1, by + 2);
			ctx.closePath();
		} else if (arch === 'spire' || arch === 'minaret' || arch === 'jagged' || isTempleSlot) {
			ctx.moveTo(bx + bw * 0.15, by);
			ctx.lineTo(bx + bw * 0.5, by - 12 - templeLvl * 2);
			ctx.lineTo(bx + bw * 0.85, by);
			ctx.closePath();
		} else {
			// Pitched hall / tower roof
			ctx.moveTo(bx - 1, by);
			ctx.lineTo(bx + bw * 0.5, by - 6);
			ctx.lineTo(bx + bw + 1, by);
			ctx.closePath();
		}
		ctx.fill();

		// Citadel Realm Banner on tallest keep
		if (isCenter && hasCitadel) {
			ctx.strokeStyle = '#d8dee9';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(bx + bw * 0.5, by - 5);
			ctx.lineTo(bx + bw * 0.5, by - 15);
			ctx.stroke();
			ctx.fillStyle = realmColor;
			ctx.beginPath();
			ctx.moveTo(bx + bw * 0.5, by - 15);
			ctx.lineTo(bx + bw * 0.5 + 8, by - 12);
			ctx.lineTo(bx + bw * 0.5, by - 9);
			ctx.closePath();
			ctx.fill();
		}

		// Warm lit windows
		if ((bhHash & 3) !== 0 && bh > 12) {
			ctx.fillStyle = 'rgba(255, 209, 102, 0.78)';
			const wy = by + 4;
			ctx.fillRect(bx + bw * 0.28, wy, 2, 3);
			if (bw > 11) ctx.fillRect(bx + bw * 0.62, wy + 3, 2, 3);
		}
	}

	// Market Plaza stalls in foreground
	if (plazaLvl > 0) {
		const px = startX + skySpan * 0.22;
		for (let m = 0; m < Math.min(3, plazaLvl + 1); m++) {
			ctx.fillStyle = m % 2 === 0 ? realmColor : '#d9a05b';
			ctx.beginPath();
			ctx.moveTo(px + m * 11, groundY);
			ctx.lineTo(px + m * 11 + 4.5, groundY - 5);
			ctx.lineTo(px + m * 11 + 9, groundY);
			ctx.closePath();
			ctx.fill();
		}
	}

	// 5. Foreground Fortified Walls & Crenellations
	if (wallsLvl > 0) {
		const wallW = hasPort ? width * 0.64 : width * 0.86;
		const wallX = startX - 2;
		const wallH = 6 + Math.min(5, wallsLvl * 1.8);
		const wallY = groundY - wallH;
		ctx.fillStyle = '#3b4254';
		ctx.fillRect(wallX, wallY, wallW, wallH);
		for (let cx = wallX; cx < wallX + wallW - 3; cx += 6) {
			ctx.fillRect(cx, wallY - 2.5, 3.5, 2.5);
		}
		// Central arched gate
		ctx.fillStyle = '#151821';
		ctx.beginPath();
		ctx.arc(wallX + wallW * 0.45, groundY, 3.2, Math.PI, 0);
		ctx.fill();
	}

	// Subtle border
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
	ctx.lineWidth = 1;
	ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
	ctx.restore();
}
