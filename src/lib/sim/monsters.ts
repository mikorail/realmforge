import type { Rng } from '../rng';
import type { World } from '../gen/types';
import type { ChronEvent, Monster, Polity } from './types';
import type { Simulation } from './engine';
import { neighbors } from '../gen/grid';
import { landPath } from '../gen/society';
import { destroyWonder } from './wonders';
import { SPHERE_CREATURES } from './spherelore';

export interface MonsterArchetype {
	species: string;
	category: Monster['category'];
	tier: Monster['tier'];
	icon: string;
	power: number;
	maxHealth: number;
	armor: number;
	regen: number;
	trophy: string;
	nameTpl: string[];
	lore: string;
	habitatCheck: (world: World, cell: number, layer: number) => boolean;
	immortal?: boolean;
	traitsResented?: string[];
}

export const MONSTER_ARCHETYPES: MonsterArchetype[] = [
	// 1. Biblical & Cosmic Titans
	{
		species: 'Leviathan',
		category: 'biblical',
		tier: 'cataclysm',
		icon: '🐋',
		power: 130,
		maxHealth: 350,
		armor: 0.60,
		regen: 15,
		trophy: 'Abyssal Leviathan Pearls & Serpentine Scales',
		nameTpl: ['Leviathan the World-Coiler', 'Abyssal Leviathan', 'The Great Tide-Swallower'],
		lore: 'A primordial serpentine titan of the abyss, spoken of in holy scriptures as the king over all children of pride.',
		habitatCheck: (w, c) => w.cells.h[c] < 20 && w.cells.dist[c] > 2,
		immortal: true,
		traitsResented: ['blasphemy', 'iconoclasm', 'esoteric_cult', 'sacrilege']
	},
	{
		species: 'Behemoth',
		category: 'biblical',
		tier: 'cataclysm',
		icon: '🦣',
		power: 125,
		maxHealth: 330,
		armor: 0.55,
		regen: 15,
		trophy: 'Primeval Behemoth Ivory & Bronze Horns',
		nameTpl: ['Behemoth the Earth-Shaker', 'The Primeval Behemoth', 'Titan of the Steppes'],
		lore: 'A colossal terrestrial colossus whose bones are tubes of bronze and limbs like bars of iron, roaming ancient grasslands.',
		habitatCheck: (w, c) => w.cells.h[c] >= 20 && (w.cells.biome[c] === 2 || w.cells.biome[c] === 3 || w.cells.biome[c] === 4),
		immortal: true,
		traitsResented: ['deforestation', 'strip_mining', 'dust_bowl', 'tyranny']
	},
	{
		species: 'Ziz',
		category: 'biblical',
		tier: 'cataclysm',
		icon: '🦅',
		power: 120,
		maxHealth: 300,
		armor: 0.50,
		regen: 12,
		trophy: 'Celestial Storm-Feathers of the Ziz',
		nameTpl: ['Ziz the Storm-Sovereign', 'The Sky-Blotter', 'The Celestial Raptor'],
		lore: 'A colossal winged terror of celestial heights whose wingspan eclipses the noon sun and commands cyclones.',
		habitatCheck: (w, c) => w.cells.h[c] > 50 || w.layers.some((l, idx) => idx > 0 && l.kind === 'sky'),
		immortal: true,
		traitsResented: ['arcane_meltdown', 'hubris', 'air_pollution', 'tyranny']
	},

	// 2. Legendary & Guardian Beasts
	{
		species: 'White Tiger',
		category: 'guardian',
		tier: 'legendary',
		icon: '🐯',
		power: 90,
		maxHealth: 220,
		armor: 0.35,
		regen: 8,
		trophy: 'White Tiger Pelts & Claws',
		nameTpl: ['The Frost-Maned Guardian', 'Snow-Ghost of the High Passes', 'White Tiger of the Ridge'],
		lore: 'A colossal pale tiger of snow-clad ridges, silent as autumn wind, that warbands speak of only in whispers.',
		habitatCheck: (w, c) => w.cells.h[c] > 40 && (w.cells.temp[c] < 5 || w.cells.biome[c] === 10),
		immortal: true,
		traitsResented: ['cruelty', 'tyranny', 'defiling_wilds']
	},
	{
		species: 'Golden Sun Lion',
		category: 'guardian',
		tier: 'legendary',
		icon: '🦁',
		power: 95,
		maxHealth: 230,
		armor: 0.35,
		regen: 8,
		trophy: 'Solar Lion Mane of Golden Light',
		nameTpl: ['The Great Sun Lion', 'The Radiant Sovereign', 'Lion of the Golden Dawn'],
		lore: 'An immortal noble lion with a mane of radiant sunlight, whose majestic roar dispels dark enchantments.',
		habitatCheck: (w, c) => w.cells.h[c] >= 20 && (w.cells.biome[c] === 3 || w.cells.biome[c] === 5),
		immortal: true,
		traitsResented: ['dark_cult', 'blasphemy', 'cruelty']
	},
	{
		species: 'Emerald Qilin',
		category: 'guardian',
		tier: 'legendary',
		icon: '🦄',
		power: 85,
		maxHealth: 210,
		armor: 0.30,
		regen: 6,
		trophy: 'Emerald Qilin Antlers & Jade Scales',
		nameTpl: ['The Emerald Qilin', 'Qilin of the Cloud-Peaks', 'The Auspicious Horned Beast'],
		lore: 'A gentle horned dragon-beast cloaked in scales of jade, appearing only during the reigns of benevolent and enlightened rulers.',
		habitatCheck: (w, c) => w.cells.h[c] >= 20 && (w.cells.biome[c] === 6 || w.cells.biome[c] === 12),
		immortal: true,
		traitsResented: ['tyranny', 'unrest', 'belligerence']
	},

	// 3. Mythos & Cryptids
	{
		species: 'Loch Monster',
		category: 'mythos',
		tier: 'mythos',
		icon: '🦕',
		power: 65,
		maxHealth: 170,
		armor: 0.15,
		regen: 4,
		trophy: 'Mist-Wyrm Fins & Abyssal Amber',
		nameTpl: ['Nessie the Mist-Lurker', 'The Deep Lake Wyrm', 'Shadow of the Loch'],
		lore: 'An elusive plesiosaur-like lake cryptid spoken of in local campfire folklore, surfacing only when mists veil the waters.',
		habitatCheck: (w, c) => {
			if (w.cells.h[c] >= 20 && w.cells.river[c] > 0) return true;
			const f = w.features[w.cells.feature[c]];
			return Boolean(f && f.type === 'lake');
		}
	},
	{
		species: 'Storm Roc',
		category: 'mythos',
		tier: 'mythos',
		icon: '🦅',
		power: 70,
		maxHealth: 180,
		armor: 0.20,
		regen: 5,
		trophy: 'Roc Talons & Dust-Storm Pinions',
		nameTpl: ['The Storm Roc of the Badlands', 'Roc the Sky-Render', 'The Dune-Shadow Roc'],
		lore: 'The roc of sailors\' and caravaneers\' tall tales, a bird vast enough to carry off an elephant; its wingbeats raise dust storms over the canyons.',
		habitatCheck: (w, c) => w.cells.h[c] >= 20 && (w.cells.biome[c] === 1 || w.cells.biome[c] === 2)
	},
	{
		species: 'Dread Wolf',
		category: 'mythos',
		tier: 'dread',
		icon: '🐺',
		power: 75,
		maxHealth: 190,
		armor: 0.30,
		regen: 8,
		trophy: 'Dread Wolf Fangs & Midnight Pelts',
		nameTpl: ['Fenrir Shadow-Stalker', 'The Eclipse Wolf', 'Hati of the North'],
		lore: 'A terrifying dread wolf of midnight taigas, capable of swallowing whole warbands beneath the winter moon.',
		habitatCheck: (w, c) => w.cells.h[c] >= 20 && (w.cells.biome[c] === 9 || w.cells.biome[c] === 10)
	},

	// 4. Dangerous Tiered Monsters
	{
		species: 'Ancient Red Dragon',
		category: 'dragon',
		tier: 'cataclysm',
		icon: '🐉',
		power: 125,
		maxHealth: 340,
		armor: 0.55,
		regen: 15,
		trophy: 'Ancient Dragon Blood & Pyre Scales',
		nameTpl: ['Ignis the Red Calamity', 'Brimstone the Dragon-King', 'Vermithrax Flameseeker', 'Drakon the Pyre-Lord'],
		lore: 'An ancient volcanic dragon sleeping atop mountains of melted gold, reducing invading armies to calcined bones.',
		habitatCheck: (w, c) => w.cells.h[c] > 50 || w.cells.biome[c] === 15,
		immortal: true,
		traitsResented: ['greed', 'hoarding', 'blasphemy']
	},
	{
		species: 'Elder Frost Drake',
		category: 'dragon',
		tier: 'dread',
		icon: '🐲',
		power: 95,
		maxHealth: 240,
		armor: 0.40,
		regen: 10,
		trophy: 'Glacial Drake Horns & Rime-Heart',
		nameTpl: ['Glacies the Glacial Drake', 'Winterfang', 'The Rime-Bane'],
		lore: 'A frost-breathing great wyrm dwelling in glacial crevasses, freezing rivers solid with a single exhalation.',
		habitatCheck: (w, c) => w.cells.temp[c] < 2 && w.cells.h[c] >= 20,
		immortal: true,
		traitsResented: ['hubris', 'encroachment']
	},
	{
		species: 'Abyssal Kraken',
		category: 'sea_terror',
		tier: 'cataclysm',
		icon: '🐙',
		power: 115,
		maxHealth: 310,
		armor: 0.50,
		regen: 12,
		trophy: 'Kraken Beaks & Abyssal Ink Sacks',
		nameTpl: ['Kraken the Fleet-Devourer', 'The Thousand-Tentacled Horror', 'Abyssal Terror'],
		lore: 'A colossal multi-tentacled sea monster capable of pulling entire armadas down into the black abyss.',
		habitatCheck: (w, c) => w.cells.h[c] < 15,
		immortal: true,
		traitsResented: ['seafaring_hubris', 'overfishing', 'esoteric_cult']
	},
	{
		species: 'Titan Boar Herd',
		category: 'herd',
		tier: 'apex',
		icon: '🐗',
		power: 55,
		maxHealth: 150,
		armor: 0.10,
		regen: 2,
		trophy: 'Calydonian Boar Great Tusks & Armored Hide',
		nameTpl: ['The Great Calydonian Boar', 'Tusk-Lord of the Briars', 'Iron-Hide Boar'],
		lore: 'A massive armored tusker leading wild forest herds, tearing up farmland and trampling watchtowers.',
		habitatCheck: (w, c) => w.cells.h[c] >= 20 && (w.cells.biome[c] === 4 || w.cells.biome[c] === 5)
	}
];

/** a readable lair name: the settlement in the cell, or the nearest one */
function lairNear(world: World, cell: number): string {
	const c = world.cells;
	const bId = c.burg[cell];
	if (bId) return `Lair near ${world.burgs[bId].name}`;
	let best = -1, bd = Infinity;
	for (const b of world.burgs) {
		if (!b.id || !b.alive || b.layer !== 'surface') continue;
		const d = (b.x - c.x[cell]) ** 2 + (b.y - c.y[cell]) ** 2;
		if (d < bd) { bd = d; best = b.id; }
	}
	return best > 0 ? `Wilds beyond ${world.burgs[best].name}` : 'The trackless wilds';
}

export function generateMonsters(world: World, rng: Rng): Monster[] {
	const c = world.cells;
	const monsters: Monster[] = [];
	let nextId = 1;

	// Pick 6 to 9 distinct archetypes
	const archetypes = rng.shuffle(MONSTER_ARCHETYPES);
	for (const arch of archetypes) {
		const targetLayer = 0;
		const candidates: number[] = [];
		for (let i = 0; i < c.n; i++) {
			if (arch.habitatCheck(world, i, targetLayer)) {
				candidates.push(i);
			}
		}

		if (!candidates.length) continue;

		const cell = rng.pick(candidates);
		const name = rng.pick(arch.nameTpl);
		const lairName = lairNear(world, cell);
		const immortal = arch.immortal ?? (arch.tier === 'cataclysm' || arch.category === 'guardian' || arch.category === 'biblical');

		monsters.push({
			id: nextId++,
			name,
			species: arch.species,
			tier: arch.tier,
			category: arch.category,
			icon: arch.icon,
			cell,
			layer: targetLayer,
			x: c.x[cell],
			y: c.y[cell],
			power: arch.power,
			health: arch.maxHealth,
			maxHealth: arch.maxHealth,
			alive: true,
			lairCell: cell,
			lairName,
			behavior: rng.pick(['dormant', 'roaming', 'hunting']),
			lore: arch.lore,
			armor: arch.armor,
			regen: arch.regen,
			trophy: arch.trophy,
			hardToKill: arch.armor >= 0.30,
			immortal,
			birthYear: -rng.int(500, 3000),
			traitsResented: arch.traitsResented ? [...arch.traitsResented] : undefined,
			destructionCount: 0
		});

		if (monsters.length >= 8) break;
	}

	// folklore creatures of the spheres actually present on this world (up to 4)
	const folkPool = rng.shuffle(SPHERE_CREATURES);
	let folkCount = 0;
	for (const arch of folkPool) {
		if (folkCount >= 4) break;
		const candidates: number[] = [];
		for (let i = 0; i < c.n; i++) if (arch.habitatCheck(world, i, 0)) candidates.push(i);
		if (!candidates.length) continue;
		const cell = rng.pick(candidates);
		const immortal = arch.tier === 'cataclysm' || arch.tier === 'mythos' || arch.power >= 65;
		monsters.push({
			id: nextId++,
			name: rng.pick(arch.nameTpl),
			species: arch.species,
			tier: arch.tier,
			category: arch.category,
			icon: arch.icon,
			cell,
			layer: 0,
			x: c.x[cell],
			y: c.y[cell],
			power: arch.power,
			health: arch.maxHealth,
			maxHealth: arch.maxHealth,
			alive: true,
			lairCell: cell,
			lairName: lairNear(world, cell),
			behavior: rng.pick(['dormant', 'roaming']),
			lore: arch.lore,
			armor: arch.armor,
			regen: arch.regen,
			trophy: arch.trophy,
			hardToKill: arch.armor >= 0.3,
			immortal,
			birthYear: -rng.int(300, 2000),
			destructionCount: 0
		});
		folkCount++;
	}

	return monsters;
}

export interface MonsterCombatResult {
	slain: boolean;
	effectiveDamage: number;
	damageTaken: number;
	monsterHpRemaining: number;
	summary: string;
}

/** Resolve combat between an attacker (hero, avatar, or army) and a monster */
export function resolveMonsterCombat(
	monster: Monster,
	rawDamage: number,
	attackerName: string,
	year: number,
	rng: Rng
): MonsterCombatResult {
	const armor = monster.armor ?? 0.1;
	// Beasts with high armor take significantly reduced damage (superhard to fight!)
	const effectiveDamage = Math.max(1, Math.round(rawDamage * (1 - armor)));
	monster.health = Math.max(0, monster.health - effectiveDamage);

	// Monster counter-attacks
	const counterDamage = Math.round((monster.power * 0.25) + rng.int(6, 20));

	if (monster.health <= 0) {
		monster.alive = false;
		monster.slayer = attackerName;
		monster.slainYear = year;
		if (monster.immortal) {
			// Immortal titans cannot truly perish: they retreat into deep slumber for centuries
			monster.slumberUntil = year + rng.int(80, 250);
			return {
				slain: true,
				effectiveDamage,
				damageTaken: counterDamage,
				monsterHpRemaining: 0,
				summary: `${attackerName} strikes a cataclysmic blow against the immortal ${monster.name}! The ancient titan crashes down into deep slumber in ${monster.lairName}, awaiting the turn of the ages.`
			};
		}
		return {
			slain: true,
			effectiveDamage,
			damageTaken: counterDamage,
			monsterHpRemaining: 0,
			summary: `${attackerName} strikes a mortal blow against ${monster.name}! The titan crashes down in defeat.`
		};
	}

	const resilienceNote = armor >= 0.45
		? `Thick primordial scales and supernatural fortitude absorb ${Math.round(armor * 100)}% of the blow.`
		: armor >= 0.25
			? `Tough armored hide deflects ${Math.round(armor * 100)}% of the damage.`
			: '';

	return {
		slain: false,
		effectiveDamage,
		damageTaken: counterDamage,
		monsterHpRemaining: monster.health,
		summary: `${attackerName} strikes ${monster.name} for ${effectiveDamage} damage (${monster.health}/${monster.maxHealth} HP remains). ${resilienceNote} ${monster.name} retaliates with primal fury!`
	};
}

/** Periodic monthly/yearly update for wandering beasts */
export function updateMonsters(
	monsters: Monster[],
	world: World,
	rng: Rng,
	year: number,
	month: number
): ChronEvent[] {
	const events: ChronEvent[] = [];
	const c = world.cells;

	for (const m of monsters) {
		// Reawaken dormant immortal titans when their slumber ends
		if (m.immortal && !m.alive && m.slumberUntil && year >= m.slumberUntil) {
			m.alive = true;
			m.behavior = 'roaming';
			m.slumberUntil = undefined;
			m.health = m.maxHealth;
			events.push({
				y: year,
				m: month,
				kind: 'monster',
				text: `TITAN REAWAKENING: After centuries of primordial slumber, the immortal ${m.name} (${m.species}) awakens in ${m.lairName}! Its primeval fury shakes the continent.`,
				cell: m.cell
			});
		}

		if (!m.alive) continue;

		// Annual health regeneration for injured titans
		if (month === 0 && m.health < m.maxHealth && !m.slumberUntil) {
			m.health = Math.min(m.maxHealth, m.health + (m.regen ?? 5));
		}

		if (m.slumberUntil) continue;

		// 18% chance to wander or hunt each month
		if (rng.chance(0.18)) {
			const nb = Array.from(neighbors(c, m.cell));
			const valid = nb.filter((j) => {
				const isWater = c.h[j] < 20;
				// Sea terrors stay in water, land beasts stay on land
				if (m.category === 'sea_terror' || m.species === 'Leviathan') return isWater;
				return !isWater;
			});

			if (valid.length) {
				m.cell = rng.pick(valid);
				m.x = c.x[m.cell];
				m.y = c.y[m.cell];
			}
		}

		// Rare ambient rampage roar
		if (month === 0 && rng.chance(0.08) && m.behavior !== 'dormant') {
			const bId = c.burg[m.cell];
			if (bId) {
				const b = world.burgs[bId];
				events.push({
					y: year,
					m: month,
					kind: 'monster',
					text: `${m.name} (${m.species}) prowls near the gates of ${b.name}! Guards scramble to defensive battlements.`,
					cell: m.cell,
					state: b.state
				});
			} else if (rng.chance(0.15)) {
				events.push({
					y: year,
					m: month,
					kind: 'monster',
					text: `Roars of ${m.name} echo across the wilderness, striking fear into travelers and local herders.`,
					cell: m.cell
				});
			}
		}
	}

	return events;
}

/** Evaluate if a realm has weird, blasphemous, or destructive traits that offend/awaken beasts */
export function evaluateRealmWeirdness(
	sim: Simulation,
	pol: Polity,
	m: Monster
): { score: number; reason: string } {
	let score = 0;
	const reasons: string[] = [];

	// 1. Cultural weirdness: Eldritch sphere or aberrant customs
	const cult = sim.w.cultures[pol.culture];
	if (cult?.sphere === 'eldritch') {
		score += 35;
		reasons.push('eldritch sorcery');
	}

	// 2. Religious weirdness: Esoteric Mysteries, radical State Atheism or iconoclasm
	const rel = sim.w.religions.find((r) => r.id === pol.religion);
	if (rel && (rel.doctrine === 'esoteric' || rel.doctrine === 'militant')) {
		score += 25;
		reasons.push('esoteric rites');
	}
	if (pol.ideology === 'technocracy' || pol.religion === 0) {
		score += 25;
		reasons.push('blasphemous iconoclasm');
	}

	// 3. Tyrannical, mad or cursed rulers
	const ruler = sim.ruler(pol);
	if (ruler?.alive) {
		const traits = ruler.traits ?? [];
		if (
			traits.includes('Cruel') ||
			traits.includes('Mad') ||
			traits.includes('Tyrant') ||
			traits.includes('Greedy') ||
			traits.includes('Cursed')
		) {
			score += 30;
			reasons.push(`tyrannical depravity of ${ruler.name}`);
		}
	}

	// 4. Low stability / societal bloodshed / rampant unrest
	if (pol.stability < 25) {
		score += 20;
		reasons.push('bloody societal chaos');
	}

	// 5. Environmental desecration: volcanic/ashlands or ravaged biomes near capital
	const cap = sim.w.burgs[pol.capital];
	if (cap && sim.w.cells.biome[cap.cell] === 15) {
		score += 25;
		reasons.push('environmental desecration');
	}

	// 6. Sacked sacred wonders
	const sackedWonders = sim.wonders.filter((w) => w.destroyed && w.destroyer === pol.name);
	if (sackedWonders.length > 0) {
		score += 35;
		reasons.push('desecration of sacred wonders');
	}

	// Distance factor: beasts care far more about proximity
	if (cap) {
		const dist = Math.hypot(m.x - cap.x, m.y - cap.y);
		if (dist > 500) score *= 0.35;
		else if (dist < 180) score *= 1.4;
	}

	return { score, reason: reasons.join(', ') || 'profane resonance' };
}

/**
 * Annual titan wrath and rampage:
 * Beasts provoked by weird/destructive traits seek retribution,
 * trampling settlements and potentially destroying nations completely.
 */
export function processMonsterWrath(sim: Simulation): ChronEvent[] {
	const events: ChronEvent[] = [];
	const rng = sim.rng;
	const c = sim.w.cells;

	for (const m of sim.monsters) {
		if (!m.alive || m.slumberUntil) continue;

		// 1. If currently roaming or hunting, check if provoked by weird traits of any nearby realm
		if (m.behavior !== 'rampage') {
			let bestPol: Polity | null = null;
			let maxWeirdness = 0;
			let bestReason = '';

			for (const pol of sim.polities) {
				if (!pol.id || !pol.alive) continue;
				const { score, reason } = evaluateRealmWeirdness(sim, pol, m);
				if (score > maxWeirdness && score >= 35) {
					maxWeirdness = score;
					bestPol = pol;
					bestReason = reason;
				}
			}

			if (bestPol && rng.chance(0.35)) {
				m.behavior = 'rampage';
				m.wrathTarget = bestPol.id;
				events.push({
					y: sim.year,
					m: sim.month,
					kind: 'monster',
					text: `TITAN WRATH: Agitated by the ${bestReason} of ${bestPol.name}, ${m.name} (${m.species}) stirs with ancient fury, embarking on a catastrophic rampage toward ${bestPol.name}!`,
					cell: m.cell,
					state: bestPol.id
				});
			}
		}

		// 2. If rampaging against a target realm
		if (m.behavior === 'rampage' && m.wrathTarget) {
			const targetPol = sim.polities[m.wrathTarget];
			if (!targetPol || !targetPol.alive) {
				m.behavior = 'roaming';
				m.wrathTarget = undefined;
				continue;
			}

			const targetBurgs = sim.idx.burgsIn(sim.w.burgs, targetPol.id).filter((b) => b.alive);
			if (!targetBurgs.length) {
				m.behavior = 'roaming';
				m.wrathTarget = undefined;
				continue;
			}

			// Prioritize capital if active, else nearest burg
			const cap = sim.w.burgs[targetPol.capital];
			const targetBurg = cap && cap.alive && cap.state === targetPol.id ? cap : targetBurgs[0];

			// Move closer to the target burg
			const isWaterMonster = m.category === 'sea_terror' || m.species === 'Leviathan';
			const path = landPath(c, m.cell, targetBurg.cell, isWaterMonster);
			if (path && path.length > 1) {
				m.cell = path[1];
				m.x = c.x[m.cell];
				m.y = c.y[m.cell];
			}

			// Check if beast reached a settlement or is adjacent
			const bId = c.burg[m.cell] || (path && path.length <= 2 ? targetBurg.id : 0);
			const b = bId ? sim.w.burgs[bId] : null;

			if (b && b.alive && b.state === targetPol.id && (m.power >= 75 || m.tier === 'cataclysm' || m.tier === 'dread')) {
				// Defending host clashes with the beast
				const titanDamage = Math.round(m.power * 0.45 + rng.int(10, 25));
				targetPol.army = Math.max(0, +(targetPol.army - titanDamage).toFixed(1));

				// Trample settlement
				b.pop = +(b.pop * 0.35).toFixed(2);
				targetPol.stability = Math.max(0, targetPol.stability - 30);
				targetPol.treasury = Math.max(0, targetPol.treasury * 0.2);

				// Wonder destruction if present
				const wonder = sim.wonders.find((w) => w.cell === b.cell && !w.destroyed);
				if (wonder) {
					const res = destroyWonder(wonder, m.name, sim.year, `smashed by titan rampage of ${m.name}`);
					events.push(res.event);
				}

				// Check if it's the capital or if the nation cannot relocate
				const isCapital = b.id === targetPol.capital || targetBurgs.length <= 1;
				if (isCapital) {
					const ruler = sim.ruler(targetPol);
					if (ruler?.alive) {
						sim.kill(ruler, 'devoured by titan rampage');
					}

					// Can the realm survive?
					const canRelocate = targetBurgs.length > 1 && targetPol.cells > 18 && sim.relocateCapital(targetPol);

					if (!canRelocate) {
						// NATION COMPLETELY DESTROYED BY THE BEAST!
						sim.fall(targetPol);
						for (let li = 0; li < sim.w.layers.length; li++) {
							const S = sim.st(li);
							for (let i = 0; i < c.n; i++) {
								if (S[i] === targetPol.id) S[i] = 0;
							}
						}
						sim.recount();
						sim.idx.touch();
						sim.dirty.political = true;
						m.destructionCount = (m.destructionCount ?? 0) + 1;
						m.behavior = 'roaming';
						m.wrathTarget = undefined;

						events.push({
							y: sim.year,
							m: sim.month,
							kind: 'fall',
							text: `TITAN APOCALYPSE: ${m.name} (${m.species}) crushes the citadel of ${b.name} and devours the royal court of ${targetPol.name}! Defenseless and shattered, ${targetPol.fullName} has fallen into total ruin, its realm erased and reclaimed by the wild.`,
							cell: b.cell,
							state: targetPol.id
						});
					} else {
						targetPol.stability = 0;
						events.push({
							y: sim.year,
							m: sim.month,
							kind: 'monster',
							text: `CAPITAL SACKED: ${m.name} (${m.species}) obliterates the citadel of ${b.name}! ${targetPol.name} flees to a new seat amid rampant panic and splintering provinces.`,
							cell: b.cell,
							state: targetPol.id
						});
					}
				} else {
					events.push({
						y: sim.year,
						m: sim.month,
						kind: 'monster',
						text: `TITAN RAMPAGE: ${m.name} (${m.species}) descends upon ${b.name}, tearing down walls and scattering the garrison (${targetPol.name} stability -30)!`,
						cell: b.cell,
						state: targetPol.id
					});
				}
			}
		}
	}

	return events;
}
