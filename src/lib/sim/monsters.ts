import type { Rng } from '../rng';
import type { World } from '../gen/types';
import type { ChronEvent, Monster } from './types';
import { neighbors } from '../gen/grid';
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
}

export const MONSTER_ARCHETYPES: MonsterArchetype[] = [
	// 1. Biblical & Cosmic Titans
	{
		species: 'Leviathan',
		category: 'biblical',
		tier: 'cataclysm',
		icon: '🐋',
		power: 120,
		maxHealth: 300,
		armor: 0.50,
		regen: 15,
		trophy: 'Abyssal Leviathan Pearls & Serpentine Scales',
		nameTpl: ['Leviathan the World-Coiler', 'Abyssal Leviathan', 'The Great Tide-Swallower'],
		lore: 'A primordial serpentine titan of the abyss, spoken of in holy scriptures as the king over all children of pride.',
		habitatCheck: (w, c) => w.cells.h[c] < 20 && w.cells.dist[c] > 2
	},
	{
		species: 'Behemoth',
		category: 'biblical',
		tier: 'cataclysm',
		icon: '🦣',
		power: 110,
		maxHealth: 280,
		armor: 0.50,
		regen: 15,
		trophy: 'Primeval Behemoth Ivory & Bronze Horns',
		nameTpl: ['Behemoth the Earth-Shaker', 'The Primeval Behemoth', 'Titan of the Steppes'],
		lore: 'A colossal terrestrial colossus whose bones are tubes of bronze and limbs like bars of iron, roaming ancient grasslands.',
		habitatCheck: (w, c) => w.cells.h[c] >= 20 && (w.cells.biome[c] === 2 || w.cells.biome[c] === 3 || w.cells.biome[c] === 4)
	},
	{
		species: 'Ziz',
		category: 'biblical',
		tier: 'cataclysm',
		icon: '🦅',
		power: 105,
		maxHealth: 260,
		armor: 0.45,
		regen: 12,
		trophy: 'Celestial Storm-Feathers of the Ziz',
		nameTpl: ['Ziz the Storm-Sovereign', 'The Sky-Blotter', 'The Celestial Raptor'],
		lore: 'A colossal winged terror of celestial heights whose wingspan eclipses the noon sun and commands cyclones.',
		habitatCheck: (w, c) => w.cells.h[c] > 50 || w.layers.some((l, idx) => idx > 0 && l.kind === 'sky')
	},

	// 2. Legendary & Guardian Beasts
	{
		species: 'White Tiger',
		category: 'guardian',
		tier: 'legendary',
		icon: '🐯',
		power: 80,
		maxHealth: 200,
		armor: 0.30,
		regen: 8,
		trophy: 'White Tiger Pelts & Claws',
		nameTpl: ['The Frost-Maned Guardian', 'Snow-Ghost of the High Passes', 'White Tiger of the Ridge'],
		lore: 'A colossal pale tiger of snow-clad ridges, silent as autumn wind, that warbands speak of only in whispers.',
		habitatCheck: (w, c) => w.cells.h[c] > 40 && (w.cells.temp[c] < 5 || w.cells.biome[c] === 10)
	},
	{
		species: 'Golden Sun Lion',
		category: 'guardian',
		tier: 'legendary',
		icon: '🦁',
		power: 85,
		maxHealth: 210,
		armor: 0.30,
		regen: 8,
		trophy: 'Solar Lion Mane of Golden Light',
		nameTpl: ['The Great Sun Lion', 'The Radiant Sovereign', 'Lion of the Golden Dawn'],
		lore: 'An immortal noble lion with a mane of radiant sunlight, whose majestic roar dispels dark enchantments.',
		habitatCheck: (w, c) => w.cells.h[c] >= 20 && (w.cells.biome[c] === 3 || w.cells.biome[c] === 5)
	},
	{
		species: 'Emerald Qilin',
		category: 'guardian',
		tier: 'legendary',
		icon: '🦄',
		power: 75,
		maxHealth: 190,
		armor: 0.25,
		regen: 6,
		trophy: 'Emerald Qilin Antlers & Jade Scales',
		nameTpl: ['The Emerald Qilin', 'Qilin of the Cloud-Peaks', 'The Auspicious Horned Beast'],
		lore: 'A gentle horned dragon-beast cloaked in scales of jade, appearing only during the reigns of benevolent and enlightened rulers.',
		habitatCheck: (w, c) => w.cells.h[c] >= 20 && (w.cells.biome[c] === 6 || w.cells.biome[c] === 12)
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
		power: 115,
		maxHealth: 320,
		armor: 0.50,
		regen: 15,
		trophy: 'Ancient Dragon Blood & Pyre Scales',
		nameTpl: ['Ignis the Red Calamity', 'Brimstone the Dragon-King', 'Vermithrax Flameseeker', 'Drakon the Pyre-Lord'],
		lore: 'An ancient volcanic dragon sleeping atop mountains of melted gold, reducing invading armies to calcined bones.',
		habitatCheck: (w, c) => w.cells.h[c] > 50 || w.cells.biome[c] === 15
	},
	{
		species: 'Elder Frost Drake',
		category: 'dragon',
		tier: 'dread',
		icon: '🐲',
		power: 90,
		maxHealth: 230,
		armor: 0.35,
		regen: 10,
		trophy: 'Glacial Drake Horns & Rime-Heart',
		nameTpl: ['Glacies the Glacial Drake', 'Winterfang', 'The Rime-Bane'],
		lore: 'A frost-breathing great wyrm dwelling in glacial crevasses, freezing rivers solid with a single exhalation.',
		habitatCheck: (w, c) => w.cells.temp[c] < 2 && w.cells.h[c] >= 20
	},
	{
		species: 'Abyssal Kraken',
		category: 'sea_terror',
		tier: 'cataclysm',
		icon: '🐙',
		power: 100,
		maxHealth: 270,
		armor: 0.45,
		regen: 14,
		trophy: 'Kraken Black Ink & Titan Tentacles',
		nameTpl: ['The Abyssal Kraken', 'Tentacles of the Deep Trench', 'Ship-Bane of the Seven Seas'],
		lore: 'A multi-tentacled sea monster of legendary stature that drags galleons and flagship frigates into ocean trenches.',
		habitatCheck: (w, c) => w.cells.h[c] < 15
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

/** Spawn world monsters during world generation */
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
			hardToKill: arch.armor >= 0.30
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
		monsters.push({
			id: nextId++, name: rng.pick(arch.nameTpl), species: arch.species, tier: arch.tier, category: arch.category, icon: arch.icon,
			cell, layer: 0, x: c.x[cell], y: c.y[cell], power: arch.power, health: arch.maxHealth, maxHealth: arch.maxHealth, alive: true,
			lairCell: cell, lairName: lairNear(world, cell), behavior: rng.pick(['dormant', 'roaming']), lore: arch.lore, armor: arch.armor,
			regen: arch.regen, trophy: arch.trophy, hardToKill: arch.armor >= 0.3
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
	// Beasts with high armor take significantly reduced damage (hard to kill!)
	const effectiveDamage = Math.max(1, Math.round(rawDamage * (1 - armor)));
	monster.health = Math.max(0, monster.health - effectiveDamage);

	// Monster counter-attacks
	const counterDamage = Math.round((monster.power * 0.15) + rng.int(4, 12));

	if (monster.health <= 0) {
		monster.alive = false;
		monster.slayer = attackerName;
		monster.slainYear = year;
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
		if (!m.alive) continue;

		// Annual health regeneration for injured titans
		if (month === 0 && m.health < m.maxHealth) {
			m.health = Math.min(m.maxHealth, m.health + (m.regen ?? 5));
		}

		// 15% chance to wander or hunt each month
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

		// Rare rampage (approx once every few years for aggressive beasts)
		if (month === 0 && rng.chance(0.08) && m.behavior !== 'dormant') {
			const bId = c.burg[m.cell];
			if (bId) {
				const b = world.burgs[bId];
				events.push({
					y: year,
					m: month,
					kind: 'monster',
					text: `${m.name} (${m.species}) rampages near the gates of ${b.name}! Guards scramble to defensive battlements.`,
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
