<script lang="ts">
	import { makeRng, clamp } from '#lib/rng';

	let {
		sim,
		world,
		site,
		personId,
		onclose,
		onrefresh
	}: {
		sim: any;
		world: any;
		site: any;
		personId: number;
		onclose: () => void;
		onrefresh?: () => void;
	} = $props();

	// Local reactive state
	let localV = $state(0);
	let currentTab = $state<'trials' | 'rankers' | 'outpost'>('trials');

	// Site properties with reactive fallbacks
	let activeFloor = $state(Number(site?.currentFloor ?? site?.floor ?? 24));
	let maxFloors = $state(Number(site?.maxFloors ?? 100));
	let floorBreakRisk = $state(Number(site?.floorBreakRisk ?? site?.breakRisk ?? 35));
	let currentDepth = $state(Number(site?.currentDepth ?? site?.depth ?? 1));
	let lastDiveConfirmed = $state(false);
	let lastDiveActive = $state(false);

	// Battle / Trial local state
	let floorCleared = $state(false);
	let outcome = $state<{
		success: boolean;
		title: string;
		text: string;
		statChange?: string;
	} | null>(null);

	// Relics recovered by delver during session
	interface ExcavatedRelic {
		id: string;
		name: string;
		tier: string;
		gold: number;
		innovation: number;
	}

	let delverStash = $state<ExcavatedRelic[]>([
		{
			id: 'rel-1',
			name: 'Unbreakable Lapis Thread',
			tier: 'Grade 3',
			gold: 120,
			innovation: 15
		},
		{
			id: 'rel-2',
			name: 'Astral Resonance Prism',
			tier: 'Grade 2',
			gold: 240,
			innovation: 30
		}
	]);

	// Resolved avatar from simulation
	const avatar = $derived.by(() => {
		void localV;
		if (personId >= 0 && sim?.people?.[personId]) {
			return sim.people[personId];
		}
		if (sim?.avatar >= 0 && sim?.people?.[sim.avatar]) {
			return sim.people[sim.avatar];
		}
		return null;
	});

	// Derived skills
	const skills = $derived.by(() => {
		void localV;
		if (!avatar) {
			return { martial: 14, intrigue: 12, stewardship: 10, arcana: 15 };
		}
		const arc =
			avatar.traits?.includes('sorcerer') ||
			avatar.role === 'magician' ||
			avatar.species === 'Starborn Celestial' ||
			avatar.species === 'Elf'
				? 20
				: 12;
		return {
			martial: avatar.martial ?? 12,
			intrigue: avatar.intrigue ?? 10,
			stewardship: avatar.stewardship ?? 10,
			arcana: arc
		};
	});

	// Determine kind
	const kindStr = String(site?.kind ?? '').toLowerCase();
	const nameStr = String(site?.name ?? '').toLowerCase();

	const isTower = $derived.by(() => {
		return (
			kindStr === 'tower' ||
			kindStr === 'spire' ||
			kindStr === 'tower_trials' ||
			nameStr.includes('spire') ||
			nameStr.includes('tower')
		);
	});

	const isAbyss = $derived.by(() => {
		return (
			kindStr === 'abyss' ||
			kindStr === 'bottomless_abyss' ||
			nameStr.includes('abyss') ||
			nameStr.includes('chasm')
		);
	});

	// Procedural Floor Details for Spire of Trials
	const floorData = $derived.by(() => {
		void localV;
		const seed = `${site?.id ?? 'spire'}-fl-${activeFloor}`;
		const rng = makeRng(seed);

		const floorNames = [
			'The Celestial Threshold',
			'Court of Quicksilver Mirrors',
			'The Astral Promenade',
			'Sanctum of the Iron Nebula',
			'Hall of Resonant Spheres',
			'The Chronos Labyrinth',
			'Crucible of the Starforged Knight',
			'The Sovereign Observatory',
			'Apex of the Ascended Pantheon'
		];
		const floorTitle = floorNames[(activeFloor - 1) % floorNames.length];

		const bossNames = [
			'Aethelgard the Astral Warden',
			'Vaelok the Mirrorblade',
			'Caelia Star-Singer',
			'Ignis the Solar Sovereign',
			'Xythor the Void Drake',
			'Arbiter Thalor of the Scales',
			'Morvath the Unyielding Titan'
		];
		const bossTitles = [
			`Keeper of the ${activeFloor}th Constellation`,
			'Warden of the Eternal Leyline',
			'Champion of the Astral Ring',
			'Guardian of the Sun-Core',
			'Lord of the Skyway Bastion'
		];
		const bossIcons = ['⚔️', '👑', '🐉', '👁️', '🗿', '⚡', '✨'];

		const name = bossNames[(activeFloor + 2) % bossNames.length];
		const title = bossTitles[(activeFloor + 1) % bossTitles.length];
		const icon = bossIcons[(activeFloor + 3) % bossIcons.length];
		const maxHp = 80 + activeFloor * 12;
		const power = 25 + Math.floor(activeFloor * 1.5);
		const dc = 11 + Math.floor(activeFloor * 0.35);

		return {
			floorTitle,
			name,
			title,
			icon,
			maxHp,
			power,
			dc
		};
	});

	// Guardian HP tracker
	let guardianCurrentHp = $state(100);
	$effect(() => {
		guardianCurrentHp = floorData.maxHp;
		floorCleared = false;
	});

	// Abyssal Layers definition
	const ABYSS_LAYERS = [
		{
			depth: 1,
			name: 'Edge of the Abyss',
			range: '0m to 1,350m',
			strain: 'Light Dizziness and Mild Vertigo',
			strainDesc: 'Ascent produces brief disorientation and subtle nausea like rocking sea waves.',
			desc: 'Moss-slicked basalt cliffs where sunlight still penetrates. Ancient stone bell shrines and prayer wind-chimes line the upper ledges.',
			whistle: 'Bell (Apprentice)',
			whistleColor: '#94a3b8'
		},
		{
			depth: 2,
			name: 'Forest of Temptation',
			range: '1,350m to 2,600m',
			strain: 'Severe Nausea, Headaches, and Limb Numbness',
			strainDesc: 'Climbing upward triggers intense sickness and throbbing pressure behind the eyes.',
			desc: 'A subterranean jungle of inverted petrified trees and predatory botanical traps, housing fortified Delver waystations.',
			whistle: 'Red Whistle (Novice)',
			whistleColor: '#ef4444'
		},
		{
			depth: 3,
			name: 'The Great Fault',
			range: '2,600m to 7,000m',
			strain: 'Auditory Hallucinations and Loss of Equilibrium',
			strainDesc: 'Voices echo from the rock face, and balance fails completely without safety harnesses.',
			desc: 'A sheer 4,000m vertical drop of razor-sharp stalactites and cavernous updrafts where wingless beasts hunt.',
			whistle: 'Blue Whistle (Adept)',
			whistleColor: '#3b82f6'
		},
		{
			depth: 4,
			name: 'Goblet of Giants',
			range: '7,000m to 12,000m',
			strain: 'Intense Full-Body Pain and Hemorrhaging',
			strainDesc: 'Every upward meter feels like crushing iron bands across the chest, causing bleeding from the mouth and ears.',
			desc: 'Towering translucent chalice-stalks rising through sulfuric steam and golden spores, inhabited by primeval dreadbeasts.',
			whistle: 'Moon Whistle (Master)',
			whistleColor: '#a855f7'
		},
		{
			depth: 5,
			name: 'Sea of Corpses',
			range: '12,000m to 13,000m',
			strain: 'Sensory Deprivation and Memory Fracturing',
			strainDesc: 'Ascent strips away mortal senses and scrambles memories of the surface realm.',
			desc: 'A colossal subterranean sea of crystallized skeletons and petrified titan carcasses beneath a freezing bioluminescent vault.',
			whistle: 'Black Whistle (High Delver)',
			whistleColor: '#1e293b'
		},
		{
			depth: 6,
			name: 'Capital of the Unreturned / The Last Dive',
			range: '13,000m and deeper',
			strain: 'Irreversible Biological Transmutation or Death',
			strainDesc: 'The Strain of the Unreturned. Upward movement strips mortal humanity forever or proves fatal.',
			desc: 'Crystalline geometric ruins hovering in utter silence above an unfathomable cosmic vortex. Those who enter this depth never return.',
			whistle: 'White Whistle (Sovereign of the Deep)',
			whistleColor: '#f8fafc'
		}
	];

	const currentLayerInfo = $derived.by(() => {
		const idx = clamp(currentDepth - 1, 0, ABYSS_LAYERS.length - 1);
		return ABYSS_LAYERS[idx];
	});

	// Life Echo Titles for White Whistles
	const LIFE_ECHO_TITLES = [
		'Sovereign of Dawn',
		'Lord of the Deep Void',
		'Lady of Annihilation',
		'Seeker of the Far Horizon',
		'Herald of the Abyss',
		'Guardian of the Unreturned'
	];

	const lifeEchoTitle = $derived.by(() => {
		const s = site?.id ? String(site.id) : 'abyss';
		const rng = makeRng(`${s}-echo`);
		return rng.pick(LIFE_ECHO_TITLES);
	});

	// Hall of Rankers Leaderboard
	const rankersLeaderboard = $derived.by(() => {
		void localV;
		const seed = `${site?.id ?? 'spire'}-rankers`;
		const rng = makeRng(seed);

		const rankers = [
			{
				name: 'Lord Vaelen of Highmount',
				origin: 'Imperial Sun realm',
				tier: 'SSS',
				floor: 98,
				blessing: 'Crown of the Nova Star'
			},
			{
				name: 'Archmage Seraphina',
				origin: 'Academy of Seven Mysteries',
				tier: 'SS',
				floor: 84,
				blessing: 'Gaze of the Celestial Serpent'
			},
			{
				name: 'Kaelen the Ironclad',
				origin: 'Grand March of Valdor',
				tier: 'S',
				floor: 71,
				blessing: 'Aegis of the Astral Core'
			},
			{
				name: 'Sylas Shadow-Step',
				origin: 'Free Ports Confederation',
				tier: 'A',
				floor: 56,
				blessing: 'Whisper of the Nebula'
			},
			{
				name: 'Gareth of the Red Tower',
				origin: 'Borderland Principalities',
				tier: 'B',
				floor: 42,
				blessing: 'Blessing of the Iron Comet'
			},
			{
				name: 'Morrigan Swiftblade',
				origin: 'Eldritch Reaches',
				tier: 'C',
				floor: 30,
				blessing: 'Glint of the Starlight Dagger'
			}
		];

		// Include avatar in the leaderboard if present
		if (avatar) {
			const avatarTier =
				activeFloor >= 90
					? 'SSS'
					: activeFloor >= 75
						? 'SS'
						: activeFloor >= 55
							? 'S'
							: activeFloor >= 40
								? 'A'
								: activeFloor >= 25
									? 'B'
									: 'C';
			rankers.unshift({
				name: `${avatar.name} (You)`,
				origin: 'Living Avatar',
				tier: avatarTier,
				floor: activeFloor,
				blessing: 'Astral Resonance of the Avatar'
			});
			rankers.sort((a, b) => b.floor - a.floor);
		}

		return rankers;
	});

	// --- Actions: Spire of Trials ---

	function handleMartialAssault() {
		const roll = 10 + Math.floor(skills.martial * 0.8);
		const win = roll >= floorData.dc;

		if (win) {
			const dmg = Math.max(35, Math.floor(skills.martial * 3.5));
			guardianCurrentHp = Math.max(0, guardianCurrentHp - dmg);

			if (guardianCurrentHp === 0) {
				floorCleared = true;
				floorBreakRisk = Math.max(0, floorBreakRisk - 15);
				if (avatar) {
					avatar.renown = (avatar.renown ?? 0) + 25;
					avatar.gold = (avatar.gold ?? 0) + 60;
				}
				outcome = {
					success: true,
					title: 'Guardian Sunder Victory!',
					text: `You broke ${floorData.name}'s astral bulwark with martial prowess. The floor portal unlocks!`,
					statChange: '+25 Renown, +60 Gold, Floor Break Risk reduced by 15%'
				};
			} else {
				outcome = {
					success: true,
					title: 'Heavy Martial Strike',
					text: `Your weapon struck true, dealing ${dmg} damage to ${floorData.name}. The guardian staggers!`,
					statChange: `Guardian HP: ${guardianCurrentHp} / ${floorData.maxHp}`
				};
			}
		} else {
			floorBreakRisk = Math.min(100, floorBreakRisk + 6);
			if (avatar) {
				avatar.health = Math.max(10, (avatar.health ?? 100) - 15);
			}
			outcome = {
				success: false,
				title: 'Guardian Repelled the Assault',
				text: `${floorData.name} parried your blow with celestial force, sending shockwaves through the chamber.`,
				statChange: 'Took 15 damage. Floor Break Risk increased by 6%'
			};
		}

		syncSite();
		localV++;
		onrefresh?.();
	}

	function handleTacticalInfiltration() {
		const roll = 10 + Math.floor(skills.intrigue * 0.9);
		const win = roll >= floorData.dc;

		if (win) {
			floorCleared = true;
			floorBreakRisk = Math.max(0, floorBreakRisk - 10);
			if (avatar) {
				avatar.gold = (avatar.gold ?? 0) + 45;
				avatar.renown = (avatar.renown ?? 0) + 15;
			}
			outcome = {
				success: true,
				title: 'Trial Mechanism Solved!',
				text: 'You decoded the celestial rune puzzle and bypassed the guardian defense matrix without brute force.',
				statChange: '+15 Renown, +45 Gold, Floor Break Risk reduced by 10%'
			};
		} else {
			floorBreakRisk = Math.min(100, floorBreakRisk + 8);
			if (avatar) {
				avatar.health = Math.max(10, (avatar.health ?? 100) - 12);
			}
			outcome = {
				success: false,
				title: 'Astrological Ward Triggered',
				text: 'A misaligned cipher triggered an arcane backlash, startling the floor sentinels.',
				statChange: 'Took 12 damage. Floor Break Risk increased by 8%'
			};
		}

		syncSite();
		localV++;
		onrefresh?.();
	}

	function handleArcaneOverwhelm() {
		const roll = 10 + Math.floor(skills.arcana * 0.85);
		const win = roll >= floorData.dc + 2;

		if (win) {
			floorCleared = true;
			guardianCurrentHp = 0;
			floorBreakRisk = Math.max(0, floorBreakRisk - 18);

			// Award astral relic
			delverStash = [
				...delverStash,
				{
					id: `rel-${Date.now()}`,
					name: `Astral Core of Floor ${activeFloor}`,
					tier: 'Grade 1 Rare',
					gold: 220,
					innovation: 25
				}
			];

			if (avatar) {
				avatar.renown = (avatar.renown ?? 0) + 30;
			}

			outcome = {
				success: true,
				title: 'Arcane Leyline Resonance!',
				text: 'You channeled raw celestial leylines, dissolving the guardian ward into shimmering astral fragments.',
				statChange: '+30 Renown, Astral Relic recovered, Floor Break Risk reduced by 18%'
			};
		} else {
			floorBreakRisk = Math.min(100, floorBreakRisk + 10);
			if (avatar) {
				avatar.health = Math.max(10, (avatar.health ?? 100) - 20);
			}
			outcome = {
				success: false,
				title: 'Arcane Leyline Feedback',
				text: 'The monolith siphon resisted your spellcraft, triggering a violent burst of planar feedback.',
				statChange: 'Took 20 damage. Floor Break Risk increased by 10%'
			};
		}

		syncSite();
		localV++;
		onrefresh?.();
	}

	function handleAscendNextFloor() {
		if (activeFloor >= maxFloors) {
			outcome = {
				success: true,
				title: 'Apex of the Monolith Reached',
				text: 'You have conquered the highest peak of the Spire of Trials. Your name shines among the stars.',
				statChange: 'Sovereign of Rankers'
			};
			return;
		}

		activeFloor += 1;
		floorCleared = false;
		outcome = {
			success: true,
			title: `Ascended to Floor ${activeFloor}`,
			text: `You stepped through the starlight portal onto ${floorData.floorTitle}.`,
			statChange: `Welcome to Floor ${activeFloor}`
		};

		syncSite();
		localV++;
		onrefresh?.();
	}

	// --- Actions: Bottomless Abyss ---

	function handleDescendNextLayer() {
		if (currentDepth >= 6) {
			outcome = {
				success: false,
				title: 'Boundary of Mortal Delving',
				text: 'You are at Layer 6: Capital of the Unreturned. To go deeper requires The Last Dive.',
				statChange: 'Requires Last Dive'
			};
			return;
		}

		currentDepth += 1;
		outcome = {
			success: true,
			title: `Descended to Layer ${currentDepth}: ${currentLayerInfo.name}`,
			text: `Your descent lines reached ${currentLayerInfo.range}. The atmosphere thickens around you.`,
			statChange: `Strain: ${currentLayerInfo.strain}`
		};

		syncSite();
		localV++;
		onrefresh?.();
	}

	function handleExcavateRelic() {
		const seed = `${site?.id ?? 'abyss'}-exc-${Date.now()}`;
		const rng = makeRng(seed);

		const relicNames = [
			'Bioluminescent Fossilized Egg',
			'Pillar of Sunken Glass',
			'Thousand-Men Needles',
			'Abyssal Prism Shard',
			'Unmelting Primordial Ice',
			'Echo-Stone of the Deep'
		];

		const pickedName = rng.pick(relicNames);
		const tier = currentDepth >= 4 ? 'Grade 1 Rare' : currentDepth >= 2 ? 'Grade 2' : 'Grade 3';
		const goldVal = 70 + currentDepth * 40;
		const innovVal = 10 + currentDepth * 8;

		delverStash = [
			...delverStash,
			{
				id: `rel-${Date.now()}`,
				name: `${pickedName} (Layer ${currentDepth})`,
				tier,
				gold: goldVal,
				innovation: innovVal
			}
		];

		outcome = {
			success: true,
			title: 'Excavation Successful',
			text: `You excavated a ${tier} relic: ${pickedName} from the basalt crevices of Layer ${currentDepth}.`,
			statChange: `Recovered: +${goldVal} Gold value, +${innovVal} Innovation`
		};

		syncSite();
		localV++;
		onrefresh?.();
	}

	function handleRestDelverCamp() {
		if (avatar) {
			avatar.health = 100;
		}
		floorBreakRisk = Math.max(0, floorBreakRisk - 8);

		outcome = {
			success: true,
			title: 'Rested at Frontier Delver Outpost',
			text: 'You pitched camp with fellow delvers, boiled clean moss tea, and rested your weary limbs.',
			statChange: 'Health fully restored to 100. Local Breach Risk reduced by 8%'
		};

		syncSite();
		localV++;
		onrefresh?.();
	}

	function handleAscendToSurface() {
		const strain = currentLayerInfo.strain;
		const damageTaken = currentDepth * 8;

		if (avatar) {
			avatar.health = Math.max(5, (avatar.health ?? 100) - damageTaken);
			avatar.renown = (avatar.renown ?? 0) + currentDepth * 15;
		}

		currentDepth = 1;

		outcome = {
			success: true,
			title: 'Ascended to Surface Outpost',
			text: `You endured the Strain of Ascension (${strain}) and surfaced at the mouth of the abyss with your relics intact.`,
			statChange: `Endured ${damageTaken} strain damage. Safe at surface rim.`
		};

		syncSite();
		localV++;
		onrefresh?.();
	}

	function handleEnterLastDive() {
		lastDiveConfirmed = true;
		lastDiveActive = true;
		currentDepth = 6;

		if (avatar) {
			avatar.renown = (avatar.renown ?? 0) + 150;
			avatar.traits = [...(avatar.traits ?? []), 'White Whistle Sovereign'];
		}

		if (sim?.log && avatar) {
			sim.log(
				'avatar',
				`${avatar.name} blew the White Whistle and plunged into The Last Dive at ${site?.name ?? 'The Bottomless Abyss'}, crossing beyond mortal return.`
			);
		}

		outcome = {
			success: true,
			title: 'The Last Dive Commenced',
			text: `You sounded your White Whistle and crossed the final threshold. Your mortal name is etched into realm history as ${lifeEchoTitle}.`,
			statChange: 'White Whistle Awakened. Eternal Renown +150.'
		};

		syncSite();
		localV++;
		onrefresh?.();
	}

	// --- Outpost & Relic Guild Actions ---

	function handleSellRelic(relic: ExcavatedRelic) {
		delverStash = delverStash.filter((r) => r.id !== relic.id);

		if (avatar) {
			avatar.gold = (avatar.gold ?? 0) + relic.gold;
		}

		// Innovation to realm
		if (sim?.tech?.innovation != null) {
			sim.tech.innovation += relic.innovation;
		}

		outcome = {
			success: true,
			title: 'Relic Appraised and Sold',
			text: `The Guild appraised ${relic.name}. Scholars analyzed its mechanisms, advancing realm innovation.`,
			statChange: `+${relic.gold} Gold for avatar, +${relic.innovation} Innovation for realm`
		};

		syncSite();
		localV++;
		onrefresh?.();
	}

	function handleSellAllRelics() {
		if (delverStash.length === 0) return;

		let totalGold = 0;
		let totalInnov = 0;
		for (const r of delverStash) {
			totalGold += r.gold;
			totalInnov += r.innovation;
		}

		delverStash = [];

		if (avatar) {
			avatar.gold = (avatar.gold ?? 0) + totalGold;
		}
		if (sim?.tech?.innovation != null) {
			sim.tech.innovation += totalInnov;
		}

		outcome = {
			success: true,
			title: 'Entire Delver Haul Appraised',
			text: 'The Guild acquired all excavated relics, cataloguing ancient artifacts in the capital repository.',
			statChange: `+${totalGold} Gold for avatar, +${totalInnov} Innovation for realm`
		};

		syncSite();
		localV++;
		onrefresh?.();
	}

	function handleDispatchScouts() {
		floorBreakRisk = Math.max(0, floorBreakRisk - 25);
		if (avatar) {
			avatar.gold = Math.max(0, (avatar.gold ?? 0) - 40);
		}

		outcome = {
			success: true,
			title: 'Frontier Vanguard Dispatched',
			text: 'Realm wardens and experienced scouts purged rampaging beasts along the perimeter.',
			statChange: 'Floor Break Risk reduced by 25%. Paid 40 Gold guild fee.'
		};

		syncSite();
		localV++;
		onrefresh?.();
	}

	function handleReinforceWards() {
		floorBreakRisk = Math.max(0, floorBreakRisk - 35);

		outcome = {
			success: true,
			title: 'Leyline Containment Sealed',
			text: 'Arcane artificers reinforced the anchoring containment runes, suppressing rift emanations.',
			statChange: 'Floor Break Risk reduced by 35%.'
		};

		syncSite();
		localV++;
		onrefresh?.();
	}

	function syncSite() {
		if (site) {
			site.currentFloor = activeFloor;
			site.currentDepth = currentDepth;
			site.floorBreakRisk = floorBreakRisk;
		}
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') {
			onclose();
		}
	}}
/>

<div class="overlay" role="presentation" onclick={onclose}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="modal"
		role="dialog"
		aria-modal="true"
		aria-labelledby="megastructure-title"
		onclick={(e) => e.stopPropagation()}
	>
		<!-- Header -->
		<header class="mhead">
			<div class="title-block">
				<div class="title-row">
					<span class="site-icon">{isTower ? '🗼' : '🌀'}</span>
					<h2 id="megastructure-title">
						{site?.name || (isTower ? 'The Spire of Trials' : 'The Bottomless Abyss')}
					</h2>
					<span class="chip type-chip">
						{isTower ? 'Ethereal Monolith' : 'Primordial Chasm'}
					</span>
				</div>
				<p class="muted small">
					Megastructure at cell {site?.cell ?? 0}, layer {site?.layer ?? 0}
				</p>
			</div>
			<button class="close-btn" aria-label="Close dialog" onclick={onclose}>✕</button>
		</header>

		<!-- Floor Break Alert Banner if risk > 75% -->
		{#if floorBreakRisk > 75}
			<div class="alert-banner pulsing-danger">
				<span class="alert-icon">⚠️</span>
				<div class="alert-body">
					<strong>CRITICAL: Floor Break Imminent ({floorBreakRisk}%)</strong>
					<p class="small">
						Containment wards are fracturing! Primordial anomalies may spill out into neighboring
						settlements unless mitigated.
					</p>
				</div>
			</div>
		{/if}

		<!-- Tabs -->
		<nav class="tab-bar">
			<button
				class="tab-btn"
				class:active={currentTab === 'trials'}
				onclick={() => (currentTab = 'trials')}
			>
				{isTower ? '⚔️ Ascension & Trials' : '🧗 Abyssal Descent'}
			</button>
			<button
				class="tab-btn"
				class:active={currentTab === 'rankers'}
				onclick={() => (currentTab = 'rankers')}
			>
				{isTower ? '🏆 Hall of Rankers' : '📜 Delver Roster'}
			</button>
			<button
				class="tab-btn"
				class:active={currentTab === 'outpost'}
				onclick={() => (currentTab = 'outpost')}
			>
				🏛️ Outpost & Relic Guild
			</button>
		</nav>

		<!-- Outcome Banner -->
		{#if outcome}
			<div class="outcome-box" class:success={outcome.success} class:danger={!outcome.success}>
				<div class="outcome-head">
					<strong>{outcome.title}</strong>
				</div>
				<p class="small outcome-text">{outcome.text}</p>
				{#if outcome.statChange}
					<span class="chip outcome-chip">{outcome.statChange}</span>
				{/if}
			</div>
		{/if}

		<!-- Content: TAB 1 (Trials / Descent) -->
		{#if currentTab === 'trials'}
			{#if isTower}
				<!-- TOWER INTERACTION VIEW -->
				<section class="card tower-card">
					<div class="card-head">
						<div>
							<span class="sub-label">ACTIVE FLOOR</span>
							<h3>Floor {activeFloor} of {maxFloors}</h3>
							<p class="floor-title-text">{floorData.floorTitle}</p>
						</div>
						<!-- Floor Break Risk Meter -->
						<div class="risk-meter-box">
							<div class="risk-meta">
								<span class="small">Floor Break Risk</span>
								<strong class="risk-pct" class:danger-text={floorBreakRisk > 75}>
									{floorBreakRisk}%
								</strong>
							</div>
							<div class="risk-bar">
								<div
									class="risk-fill"
									class:high={floorBreakRisk > 75}
									class:mid={floorBreakRisk > 40 && floorBreakRisk <= 75}
									style="width: {floorBreakRisk}%;"
								></div>
							</div>
						</div>
					</div>

					<!-- Floor Guardian Dossier -->
					<div class="guardian-dossier">
						<div class="boss-icon-frame">{floorData.icon}</div>
						<div class="boss-details">
							<span class="boss-title-chip">{floorData.title}</span>
							<h4>{floorData.name}</h4>
							<div class="boss-stats-row">
								<div class="stat-pill">
									<span class="stat-label">Power</span>
									<strong>{floorData.power}</strong>
								</div>
								<div class="stat-pill">
									<span class="stat-label">Trial DC</span>
									<strong>{floorData.dc}</strong>
								</div>
								<div class="stat-pill hp-stat">
									<span class="stat-label">Guardian Vitality</span>
									<strong>{guardianCurrentHp} / {floorData.maxHp} HP</strong>
								</div>
							</div>
						</div>
					</div>

					<!-- Action Buttons -->
					<div class="actions-group">
						<h4>Ascension Directives</h4>
						<div class="actions-grid">
							<button class="action-btn martial" onclick={handleMartialAssault}>
								<div class="btn-icon">⚔️</div>
								<div class="btn-text">
									<strong>Martial Assault</strong>
									<span class="small muted">Challenge Guardian in Direct Combat</span>
								</div>
							</button>

							<button class="action-btn intrigue" onclick={handleTacticalInfiltration}>
								<div class="btn-icon">🧠</div>
								<div class="btn-text">
									<strong>Tactical Infiltration</strong>
									<span class="small muted">Solve Celestial Rune Puzzle</span>
								</div>
							</button>

							<button class="action-btn arcana" onclick={handleArcaneOverwhelm}>
								<div class="btn-icon">✨</div>
								<div class="btn-text">
									<strong>Arcane Overwhelm</strong>
									<span class="small muted">Leyline Magic Duel for Relics</span>
								</div>
							</button>

							<button
								class="action-btn ascend"
								class:ready={floorCleared}
								onclick={handleAscendNextFloor}
							>
								<div class="btn-icon">🪜</div>
								<div class="btn-text">
									<strong>Ascend Next Floor</strong>
									<span class="small muted">
										{floorCleared ? 'Portal Open' : `Pass Trial to Advance to Floor ${activeFloor + 1}`}
									</span>
								</div>
							</button>
						</div>
					</div>
				</section>
			{:else}
				<!-- ABYSS INTERACTION VIEW -->
				<section class="card abyss-card">
					<div class="card-head">
						<div>
							<span class="sub-label">CURRENT DEPTH</span>
							<h3>Layer {currentDepth}: {currentLayerInfo.name}</h3>
							<p class="floor-title-text">{currentLayerInfo.range}</p>
						</div>

						<!-- Whistle Badge -->
						<div class="whistle-badge-card">
							<span class="small muted">DELVER BADGE</span>
							<div class="whistle-row">
								<span class="whistle-icon">🔔</span>
								<strong>{currentLayerInfo.whistle}</strong>
							</div>
							<span class="chip gold tiny">{lifeEchoTitle}</span>
						</div>
					</div>

					<!-- Strain of Ascension Danger Indicator -->
					<div class="strain-indicator-card">
						<div class="strain-header">
							<span class="strain-warning-tag">⚠️ Strain of Ascension</span>
							<strong>{currentLayerInfo.strain}</strong>
						</div>
						<p class="small strain-desc">{currentLayerInfo.strainDesc}</p>
					</div>

					<!-- Atmospheric Description -->
					<div class="atmosphere-box">
						<p class="atmo-text">{currentLayerInfo.desc}</p>
					</div>

					<!-- Abyss Action Buttons -->
					<div class="actions-group">
						<h4>Delver Actions</h4>
						<div class="actions-grid">
							<button class="action-btn descend" onclick={handleDescendNextLayer}>
								<div class="btn-icon">🧗</div>
								<div class="btn-text">
									<strong>Descend to Next Layer</strong>
									<span class="small muted">
										{currentDepth < 6 ? `Plunge to Layer ${currentDepth + 1}` : 'Maximum Depth Reached'}
									</span>
								</div>
							</button>

							<button class="action-btn excavate" onclick={handleExcavateRelic}>
								<div class="btn-icon">🎒</div>
								<div class="btn-text">
									<strong>Excavate Ancient Relic</strong>
									<span class="small muted">Unearth Abyssal Treasures</span>
								</div>
							</button>

							<button class="action-btn rest" onclick={handleRestDelverCamp}>
								<div class="btn-icon">⛺</div>
								<div class="btn-text">
									<strong>Rest at Delver Camp</strong>
									<span class="small muted">Restore Health and Fortify Wards</span>
								</div>
							</button>

							<button class="action-btn ascend-surface" onclick={handleAscendToSurface}>
								<div class="btn-icon">🔺</div>
								<div class="btn-text">
									<strong>Ascend to Surface</strong>
									<span class="small muted">Endure Curse and Secure Relics</span>
								</div>
							</button>
						</div>

						<!-- The Last Dive (Special Irreversible Action) -->
						{#if currentDepth >= 5}
							<div class="last-dive-card">
								<div class="last-dive-info">
									<strong>🪦 The Last Dive (Irreversible)</strong>
									<p class="small muted">
										Plunge past Layer 6 into the endless abyss. You will never return to the
										surface realm, but your soul awakens as a White Whistle immortal.
									</p>
								</div>
								<button class="last-dive-btn" onclick={handleEnterLastDive}>
									Sound White Whistle
								</button>
							</div>
						{/if}
					</div>
				</section>
			{/if}
		{/if}

		<!-- Content: TAB 2 (Hall of Rankers / Delvers) -->
		{#if currentTab === 'rankers'}
			<section class="card leaderboard-card">
				<div class="card-head">
					<div>
						<h3>{isTower ? 'Hall of Rankers' : 'Delver Order of White Whistles'}</h3>
						<p class="muted small">
							{isTower
								? 'High Rankers of the Spire acknowledged across the celestial firmament'
								: 'Legendary pioneers who braved the depths and left their Life Echoes'}
						</p>
					</div>
				</div>

				<div class="table-wrap">
					<table class="rank-table">
						<thead>
							<tr>
								<th>Rank</th>
								<th>Name</th>
								<th>Realm / Origin</th>
								<th>Highest Floor / Depth</th>
								<th>Constellation Blessing / Echo</th>
							</tr>
						</thead>
						<tbody>
							{#each rankersLeaderboard as r (r.name)}
								<tr class:avatar-row={r.origin === 'Living Avatar'}>
									<td>
										<span
											class="chip rank-chip"
											class:high-rank={r.tier === 'SSS' || r.tier === 'SS'}
										>
											{r.tier}
										</span>
									</td>
									<td>
										<strong>{r.name}</strong>
									</td>
									<td>
										<span class="muted small">{r.origin}</span>
									</td>
									<td>
										<span class="gold-text">
											{isTower ? `Floor ${r.floor}` : `Depth ${Math.min(6, Math.floor(r.floor / 15) + 1)}`}
										</span>
									</td>
									<td>
										<span class="blessing-text">✦ {r.blessing}</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/if}

		<!-- Content: TAB 3 (Outpost & Relic Guild) -->
		{#if currentTab === 'outpost'}
			<section class="card outpost-card">
				<div class="card-head">
					<div>
						<h3>Frontier Outpost & Relic Guild</h3>
						<p class="muted small">
							Appraise recovered relics to enrich your treasury and advance realm innovation.
						</p>
					</div>
					{#if delverStash.length > 0}
						<button class="action-btn-small gold-bg" onclick={handleSellAllRelics}>
							Sell All Relics
						</button>
					{/if}
				</div>

				<!-- Excavated Relics List -->
				<div class="relics-shelf">
					<h4>Recovered Artifacts ({delverStash.length})</h4>
					{#if delverStash.length === 0}
						<p class="muted small empty-notice">
							No unappraised relics in stash. Excavate the site to uncover ancient treasures.
						</p>
					{:else}
						<div class="relic-grid">
							{#each delverStash as relic (relic.id)}
								<div class="relic-item-card">
									<div class="relic-item-info">
										<span class="chip tiny gold">{relic.tier}</span>
										<strong>{relic.name}</strong>
										<span class="small muted">
											Worth {relic.gold} Gold · +{relic.innovation} Realm Innovation
										</span>
									</div>
									<button class="appraise-btn" onclick={() => handleSellRelic(relic)}>
										Appraise & Sell
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Threat Mitigation Section -->
				<div class="mitigation-section">
					<div class="mitigation-head">
						<div>
							<h4>Threat Mitigation & Frontier Defense</h4>
							<p class="small muted">
								Dispatch realm scouts to contain subterranean beasts and lower Floor Break Risk.
							</p>
						</div>
						<span class="risk-badge" class:danger={floorBreakRisk > 75}>
							Risk: {floorBreakRisk}%
						</span>
					</div>

					<div class="mitigation-grid">
						<div class="mitigation-card">
							<h5>🛡️ Dispatch Frontier Vanguard</h5>
							<p class="small muted">
								Deploy royal scouts and hunters to patrol the outer perimeter.
							</p>
							<button class="action-btn-small" onclick={handleDispatchScouts}>
								Dispatch (-40 Gold, -25% Risk)
							</button>
						</div>

						<div class="mitigation-card">
							<h5>🔮 Reinforce Leyline Wards</h5>
							<p class="small muted">
								Weave stabilization barriers using arcane innovation to suppress ruptures.
							</p>
							<button class="action-btn-small" onclick={handleReinforceWards}>
								Reinforce Wards (-35% Risk)
							</button>
						</div>
					</div>
				</div>
			</section>
		{/if}
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.78);
		backdrop-filter: blur(4px);
		display: grid;
		place-items: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal {
		background: var(--panel, #1a1614);
		color: var(--panel-ink, #f5ebd9);
		border: 1px solid var(--line, #3a2e26);
		border-radius: 12px;
		width: min(840px, 96vw);
		max-height: 92dvh;
		display: flex;
		flex-direction: column;
		padding: 1.1rem 1.35rem;
		box-shadow: 0 24px 64px rgba(0, 0, 0, 0.85);
		overflow-y: auto;
		gap: 0.9rem;
	}

	.mhead {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		border-bottom: 1px solid var(--line, #3a2e26);
		padding-bottom: 0.65rem;
		gap: 0.5rem;
	}

	.title-block {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.site-icon {
		font-size: 1.4rem;
	}

	.title-row h2 {
		font-size: 1.35rem;
		margin: 0;
		color: var(--accent, #d4a359);
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--muted, #9e8e82);
		font-size: 1.3rem;
		cursor: pointer;
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		transition: all 0.15s;
	}

	.close-btn:hover {
		color: var(--panel-ink, #f5ebd9);
		background: rgba(255, 255, 255, 0.08);
	}

	/* Alert Banner */
	.alert-banner {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		padding: 0.65rem 0.9rem;
		border-radius: 8px;
		border: 1px solid rgba(239, 68, 68, 0.6);
		background: rgba(239, 68, 68, 0.18);
	}

	.pulsing-danger {
		animation: pulseWarning 2s infinite ease-in-out;
	}

	@keyframes pulseWarning {
		0%,
		100% {
			background: rgba(239, 68, 68, 0.18);
			border-color: rgba(239, 68, 68, 0.6);
		}
		50% {
			background: rgba(239, 68, 68, 0.35);
			border-color: rgba(239, 68, 68, 0.9);
		}
	}

	.alert-icon {
		font-size: 1.4rem;
	}

	.alert-body p {
		margin: 0.15rem 0 0 0;
	}

	/* Tab Bar */
	.tab-bar {
		display: flex;
		gap: 0.4rem;
		border-bottom: 1px solid var(--line, #3a2e26);
		padding-bottom: 0.4rem;
	}

	.tab-btn {
		background: none;
		border: 1px solid transparent;
		color: var(--muted, #9e8e82);
		font-size: 0.85rem;
		padding: 0.45rem 0.85rem;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.tab-btn:hover {
		color: var(--panel-ink, #f5ebd9);
		background: rgba(255, 255, 255, 0.05);
	}

	.tab-btn.active {
		background: rgba(212, 163, 89, 0.15);
		border-color: var(--accent, #d4a359);
		color: var(--accent, #d4a359);
		font-weight: 600;
	}

	/* Outcome Box */
	.outcome-box {
		padding: 0.65rem 0.9rem;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.outcome-box.success {
		background: rgba(76, 175, 80, 0.14);
		border: 1px solid rgba(76, 175, 80, 0.4);
		color: #81c784;
	}

	.outcome-box.danger {
		background: rgba(244, 67, 54, 0.14);
		border: 1px solid rgba(244, 67, 54, 0.4);
		color: #e57373;
	}

	.outcome-text {
		margin: 0;
		color: var(--panel-ink, #f5ebd9);
	}

	/* Cards */
	.card {
		background: rgba(0, 0, 0, 0.22);
		border: 1px solid var(--line, #3a2e26);
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.card-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.8rem;
		flex-wrap: wrap;
	}

	.card-head h3 {
		margin: 0.1rem 0;
		font-size: 1.2rem;
		color: var(--accent, #d4a359);
	}

	.sub-label {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted, #9e8e82);
	}

	.floor-title-text {
		margin: 0;
		font-size: 0.88rem;
		color: var(--panel-ink, #f5ebd9);
	}

	/* Risk Meter */
	.risk-meter-box {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 170px;
	}

	.risk-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.risk-pct {
		font-size: 0.88rem;
		color: #81c784;
	}

	.risk-pct.danger-text {
		color: #ef4444;
	}

	.risk-bar {
		width: 100%;
		height: 8px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		overflow: hidden;
	}

	.risk-fill {
		height: 100%;
		background: #4caf50;
		transition: width 0.3s ease;
	}

	.risk-fill.mid {
		background: #f59e0b;
	}

	.risk-fill.high {
		background: #ef4444;
	}

	/* Guardian Dossier */
	.guardian-dossier {
		display: flex;
		align-items: center;
		gap: 1rem;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid var(--line, #3a2e26);
		border-radius: 8px;
		padding: 0.85rem;
		flex-wrap: wrap;
	}

	.boss-icon-frame {
		font-size: 2.2rem;
		width: 60px;
		height: 60px;
		display: grid;
		place-items: center;
		background: rgba(212, 163, 89, 0.1);
		border: 1px solid rgba(212, 163, 89, 0.35);
		border-radius: 8px;
	}

	.boss-details {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.boss-details h4 {
		margin: 0;
		font-size: 1.1rem;
		color: var(--panel-ink, #f5ebd9);
	}

	.boss-title-chip {
		font-size: 0.72rem;
		color: var(--accent, #d4a359);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.boss-stats-row {
		display: flex;
		gap: 0.8rem;
		margin-top: 0.3rem;
		flex-wrap: wrap;
	}

	.stat-pill {
		display: flex;
		flex-direction: column;
		background: rgba(255, 255, 255, 0.05);
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		font-size: 0.8rem;
	}

	.stat-label {
		font-size: 0.68rem;
		color: var(--muted, #9e8e82);
	}

	/* Whistle Badge */
	.whistle-badge-card {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
	}

	.whistle-row {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.95rem;
	}

	/* Strain Indicator */
	.strain-indicator-card {
		background: rgba(239, 68, 68, 0.12);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 8px;
		padding: 0.65rem 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.strain-header {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.strain-warning-tag {
		font-size: 0.75rem;
		color: #f87171;
		font-weight: 600;
	}

	.strain-desc {
		margin: 0;
		color: var(--panel-ink, #f5ebd9);
	}

	.atmosphere-box {
		padding: 0.65rem 0.85rem;
		background: rgba(0, 0, 0, 0.25);
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.06);
	}

	.atmo-text {
		margin: 0;
		font-size: 0.88rem;
		line-height: 1.45;
		color: var(--muted, #9e8e82);
		font-style: italic;
	}

	/* Actions Grid */
	.actions-group {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.actions-group h4 {
		margin: 0;
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted, #9e8e82);
	}

	.actions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
		gap: 0.6rem;
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.65rem 0.8rem;
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid var(--line, #3a2e26);
		border-radius: 8px;
		color: var(--panel-ink, #f5ebd9);
		cursor: pointer;
		text-align: left;
		transition: all 0.15s;
		min-height: 48px;
	}

	.action-btn:hover {
		border-color: var(--accent, #d4a359);
		background: rgba(212, 163, 89, 0.1);
	}

	.action-btn.ascend.ready {
		border-color: #4caf50;
		background: rgba(76, 175, 80, 0.15);
	}

	.btn-icon {
		font-size: 1.4rem;
	}

	.btn-text {
		display: flex;
		flex-direction: column;
	}

	/* Last Dive Card */
	.last-dive-card {
		margin-top: 0.4rem;
		background: rgba(15, 23, 42, 0.7);
		border: 1px solid rgba(148, 163, 184, 0.4);
		border-radius: 8px;
		padding: 0.85rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.8rem;
		flex-wrap: wrap;
	}

	.last-dive-btn {
		background: #e2e8f0;
		color: #0f172a;
		border: none;
		border-radius: 6px;
		padding: 0.5rem 1rem;
		font-weight: 700;
		font-size: 0.88rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.last-dive-btn:hover {
		background: #ffffff;
		box-shadow: 0 0 16px rgba(255, 255, 255, 0.5);
	}

	/* Table for Rankers */
	.table-wrap {
		overflow-x: auto;
	}

	.rank-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.86rem;
	}

	.rank-table th {
		text-align: left;
		padding: 0.5rem 0.6rem;
		color: var(--muted, #9e8e82);
		border-bottom: 1px solid var(--line, #3a2e26);
		font-weight: 600;
	}

	.rank-table td {
		padding: 0.55rem 0.6rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.rank-table tr.avatar-row {
		background: rgba(212, 163, 89, 0.12);
	}

	.rank-chip {
		font-weight: 700;
		padding: 0.1rem 0.45rem;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.08);
	}

	.rank-chip.high-rank {
		background: var(--accent, #d4a359);
		color: #1a1614;
	}

	.blessing-text {
		color: #38bdf8;
		font-size: 0.82rem;
	}

	/* Outpost & Relic Guild */
	.relics-shelf {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.relics-shelf h4,
	.mitigation-head h4 {
		margin: 0;
		font-size: 0.95rem;
		color: var(--accent, #d4a359);
	}

	.relic-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 0.6rem;
	}

	.relic-item-card {
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid var(--line, #3a2e26);
		border-radius: 8px;
		padding: 0.65rem 0.85rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.6rem;
	}

	.relic-item-info {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.appraise-btn {
		background: rgba(212, 163, 89, 0.15);
		border: 1px solid var(--accent, #d4a359);
		color: var(--accent, #d4a359);
		padding: 0.35rem 0.65rem;
		border-radius: 4px;
		font-size: 0.8rem;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.15s;
	}

	.appraise-btn:hover {
		background: var(--accent, #d4a359);
		color: #1a1614;
	}

	.mitigation-section {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		border-top: 1px solid var(--line, #3a2e26);
		padding-top: 0.8rem;
	}

	.mitigation-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.risk-badge {
		font-size: 0.82rem;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		background: rgba(76, 175, 80, 0.2);
		color: #81c784;
		border: 1px solid rgba(76, 175, 80, 0.4);
	}

	.risk-badge.danger {
		background: rgba(239, 68, 68, 0.2);
		color: #f87171;
		border-color: rgba(239, 68, 68, 0.5);
	}

	.mitigation-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 0.6rem;
	}

	.mitigation-card {
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid var(--line, #3a2e26);
		border-radius: 8px;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.mitigation-card h5 {
		margin: 0;
		font-size: 0.9rem;
		color: var(--panel-ink, #f5ebd9);
	}

	.action-btn-small {
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid var(--line, #3a2e26);
		color: var(--panel-ink, #f5ebd9);
		padding: 0.35rem 0.65rem;
		border-radius: 6px;
		font-size: 0.82rem;
		cursor: pointer;
		margin-top: 0.3rem;
		align-self: flex-start;
		transition: all 0.15s;
	}

	.action-btn-small:hover {
		background: rgba(255, 255, 255, 0.15);
		border-color: var(--muted, #9e8e82);
	}

	.action-btn-small.gold-bg {
		background: var(--accent, #d4a359);
		color: #1a1614;
		font-weight: 600;
		border-color: var(--accent, #d4a359);
	}

	/* Chips and Utilities */
	.chip {
		font-size: 0.75rem;
		padding: 0.1rem 0.45rem;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
	}

	.chip.gold {
		background: rgba(212, 163, 89, 0.2);
		color: var(--accent, #d4a359);
		border-color: rgba(212, 163, 89, 0.4);
	}

	.chip.tiny {
		font-size: 0.68rem;
		padding: 0.05rem 0.35rem;
	}

	.chip.type-chip {
		background: rgba(56, 189, 248, 0.15);
		color: #38bdf8;
		border-color: rgba(56, 189, 248, 0.35);
	}

	.chip.outcome-chip {
		background: rgba(255, 255, 255, 0.1);
		align-self: flex-start;
	}

	.gold-text {
		color: var(--accent, #d4a359);
		font-weight: 600;
	}

	.small {
		font-size: 0.8rem;
	}

	.muted {
		color: var(--muted, #9e8e82);
	}
</style>
