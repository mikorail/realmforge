<script lang="ts">
	import { GENRES, type Genre } from '#lib/gen/genre';
	import { TEMPLATE_NAMES } from '#lib/gen/heightmap';
	import { climateFor, DEFAULTS, SPHERE_SETS } from '#lib/gen/options';
	import { PLANETS } from '#lib/gen/physical';
	import { SPHERES } from '#lib/gen/spheres';
	import type { GenOptions, PlanetKind, Template } from '#lib/gen/types';
	import type { Universe } from '#lib/gen/universe';
	import { deleteSave, listSaves, loadGame, type SaveMeta } from '#lib/save';
	import { Cosmos } from '#lib/sim/cosmos';
	import { onMount } from 'svelte';
	import { decodeSharePayload } from '#lib/share';
	import ClimatePanel from './ClimatePanel.svelte';

	let { onready }: { onready: (c: Cosmos) => void } = $props();

	const words = ['amber', 'ash', 'brine', 'cinder', 'dusk', 'ember', 'fable', 'gale', 'hollow', 'iron', 'jade', 'kestrel', 'lumen', 'moss', 'nadir', 'onyx', 'pyre', 'quill', 'rune', 'sable', 'thorn', 'umber', 'vale', 'wyrm', 'zephyr'];
	const pickW = () => words[Math.floor(Math.random() * words.length)];
	const rndSeed = () => `${pickW()}-${pickW()}-${Math.floor(Math.random() * 1000)}`;
	const STORE = 'realmforge:setup';

	type Settings = Omit<GenOptions, 'seed'> & { seed: string; planets: number; sphereSet: string };
	const initial: Settings = { ...structuredClone(DEFAULTS), seed: rndSeed(), planets: 1, sphereSet: 'All' };
	let s = $state<Settings>(initial);
	let locked = $state<string[]>([]);
	let busy = $state(false);
	let stage = $state('');
	let pct = $state(0);
	let saves = $state<SaveMeta[]>([]);
	let loaded = false;

	type TabId = 'genre' | 'map' | 'climate' | 'society' | 'layers' | 'saves';
	let activeTab = $state<TabId>('genre');
	let viewMode = $state<'tabs' | 'all'>('tabs');

	interface Archetype {
		id: string;
		name: string;
		icon: string;
		genre: Genre;
		planet: PlanetKind;
		template: Template;
		sphereSet: string;
		blurb: string;
	}

	const ARCHETYPES: Archetype[] = [
		{ id: 'fantasy', name: 'High Fantasy', icon: '🏰', genre: 'fantasy', planet: 'terran', template: 'continents', sphereSet: 'European', blurb: 'Chivalric crowns, ancient roads, and stone keeps' },
		{ id: 'steampunk', name: 'Brass Steampunk', icon: '⚙️', genre: 'steampunk', planet: 'terran', template: 'archipelago', sphereSet: 'Silk Road', blurb: 'Airships, clockwork spires, and maritime trade' },
		{ id: 'cyberpunk', name: 'Neon Cyberpunk', icon: '🌃', genre: 'cyberpunk', planet: 'exotic', template: 'pangea', sphereSet: 'Asian', blurb: 'Synthetic highways, megacity wards, and grid fiefs' },
		{ id: 'solarpunk', name: 'Verdant Solarpunk', icon: '🌿', genre: 'solarpunk', planet: 'verdant', template: 'inlandSea', sphereSet: 'Global South', blurb: 'Living towers, clean aquifers, and garden councils' },
		{ id: 'mythic', name: 'Mythic Deep', icon: '🐙', genre: 'mythic', planet: 'shattered', template: 'peninsulas', sphereSet: 'Eldritch', blurb: 'Sunken temples, coral monoliths, and elder gods' },
		{ id: 'frost', name: 'Boreal Frost', icon: '❄️', genre: 'fantasy', planet: 'ice', template: 'highIsland', sphereSet: 'European', blurb: 'Frozen fjords, tundra clans, and polar nights' }
	];

	onMount(async () => {
		try {
			const raw = localStorage.getItem(STORE);
			if (raw) {
				const saved = JSON.parse(raw) as { s: Settings; locked: string[] };
				s = { ...initial, ...saved.s, seed: saved.locked?.includes('seed') ? saved.s.seed : rndSeed(), density: { ...initial.density, ...saved.s.density }, climate: { ...initial.climate, ...saved.s.climate } };
				locked = saved.locked ?? [];
			}
		} catch { /* private mode etc. */ }
		if (typeof window !== 'undefined' && window.location.hash) {
			const shared = decodeSharePayload(window.location.hash);
			if (shared) {
				s = {
					...s,
					seed: shared.seed,
					genre: (shared.genre as Genre) in GENRES ? (shared.genre as Genre) : s.genre,
					planet: (shared.planet as PlanetKind) in PLANETS ? (shared.planet as PlanetKind) : s.planet,
					template: (shared.template as Template) in TEMPLATE_NAMES ? (shared.template as Template) : s.template,
					cells: shared.cells ?? s.cells,
					states: shared.states ?? s.states,
					width: shared.width ?? s.width,
					height: shared.height ?? s.height,
					climate: { ...s.climate, ...(shared.climate ?? {}) }
				};
				if (!locked.includes('seed')) locked = [...locked, 'seed'];
			}
		}
		loaded = true;
		saves = await listSaves();
	});

	$effect(() => {
		const snap = JSON.stringify({ s, locked });
		if (!loaded) return;
		try { localStorage.setItem(STORE, snap); } catch { /* ignore */ }
	});

	const POINTS = [1000, 2000, 4000, 6000, 8000, 10000, 15000, 20000, 30000, 40000, 60000, 80000, 100000, 150000, 200000];
	const pointIdx = $derived(Math.max(0, POINTS.findIndex((p) => p >= s.cells)));
	const SIZES: [number, number, string][] = [
		[1600, 1000, '16:10 Wide'],
		[1920, 1080, '16:9 HD'],
		[2000, 1000, '2:1 Atlas'],
		[2600, 1000, 'Panorama'],
		[1300, 1300, 'Square'],
		[1000, 1500, 'Portrait'],
		[3200, 2000, 'Huge 16:10']
	];

	const isLocked = (k: string) => locked.includes(k);
	const toggleLock = (k: string) => (locked = isLocked(k) ? locked.filter((x) => x !== k) : [...locked, k]);
	const unlockAll = () => (locked = []);

	const r = (a: number, b: number) => a + Math.random() * (b - a);
	const ri = (a: number, b: number) => Math.round(r(a, b));
	const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];

	function randomize() {
		const n = { ...s, climate: { ...s.climate }, density: { ...s.density } };
		const u = (k: string) => !isLocked(k);
		if (u('seed')) n.seed = rndSeed();
		if (u('template')) n.template = pick(Object.keys(TEMPLATE_NAMES) as Template[]);
		if (u('planet')) {
			n.planet = pick(Object.keys(PLANETS) as PlanetKind[]);
			if (u('climate')) n.climate = { ...climateFor(n.planet), mapSize: ri(20, 80), latitude: ri(10, 90), longitude: ri(0, 100) };
		}
		if (u('genre')) n.genre = pick(Object.keys(GENRES) as Genre[]);
		if (u('states')) n.states = ri(6, 30);
		if (u('cultures')) n.cultures = pick([0, 0, ri(4, 24)]);
		if (u('sizeVariety')) n.sizeVariety = ri(0, 10);
		if (u('growth')) n.growth = +r(0.5, 2).toFixed(1);
		if (u('seaLevel')) n.seaLevel = ri(-8, 8);
		if (u('rivers')) n.rivers = +r(0.5, 2).toFixed(1);
		if (u('religions')) n.religions = pick([0, ri(2, 10)]);
		if (u('sphereSet')) { n.sphereSet = pick(Object.keys(SPHERE_SETS).filter((x) => x !== 'Eldritch')); n.spheres = SPHERE_SETS[n.sphereSet]; }
		if (u('layers')) { n.depth = ri(0, 4); n.sky = Math.random() < 0.7; n.sea = Math.random() < 0.7; n.density = { deep: +r(0.5, 2).toFixed(1), sky: +r(0.5, 2).toFixed(1), sea: +r(0.5, 2).toFixed(1) }; }
		if (u('climate') && isLocked('planet')) n.climate = { ...n.climate, tEq: ri(15, 38), tN: ri(-40, -5), tS: ri(-40, -5), mapSize: ri(20, 80), latitude: ri(10, 90), prec: ri(50, 180) };
		s = n;
	}

	function applyArchetype(arch: Archetype) {
		const n = { ...s };
		if (!isLocked('genre')) n.genre = arch.genre;
		if (!isLocked('planet')) {
			n.planet = arch.planet;
			if (!isLocked('climate')) {
				n.climate = { ...climateFor(arch.planet), mapSize: n.climate.mapSize, latitude: n.climate.latitude, longitude: n.climate.longitude, winds: [...n.climate.winds] };
			}
		}
		if (!isLocked('template')) n.template = arch.template;
		if (!isLocked('sphereSet')) {
			n.sphereSet = arch.sphereSet;
			n.spheres = SPHERE_SETS[arch.sphereSet] ? [...SPHERE_SETS[arch.sphereSet]!] : null;
		}
		s = n;
	}

	function resetAll() {
		s = { ...structuredClone(DEFAULTS), seed: rndSeed(), planets: 1, sphereSet: 'All' };
		locked = [];
	}

	function setPlanet(p: PlanetKind) {
		s.planet = p;
		if (!isLocked('climate')) s.climate = { ...climateFor(p), mapSize: s.climate.mapSize, latitude: s.climate.latitude, longitude: s.climate.longitude, winds: [...s.climate.winds] };
	}

	function setSphereSet(name: string) {
		s.sphereSet = name;
		if (name !== 'Custom') s.spheres = SPHERE_SETS[name] ? [...SPHERE_SETS[name]!] : null;
		else if (!s.spheres) s.spheres = ['sinic', 'yoruba', 'nahua'];
	}

	const toggleSphere = (id: string) => {
		s.sphereSet = 'Custom';
		const cur = s.spheres ?? [];
		s.spheres = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
	};

	function generate() {
		busy = true;
		stage = 'Weaving tectonic plates';
		pct = 0.05;
		const { planets, sphereSet: _set, ...opts } = $state.snapshot(s);
		void _set;
		if (opts.spheres && !opts.spheres.length) opts.spheres = null;
		const worker = new Worker(new URL('../gen/worker.ts', import.meta.url), { type: 'module' });
		worker.onmessage = (e: MessageEvent<{ type: string; stage?: string; pct?: number; universe?: Universe }>) => {
			if (e.data.type === 'progress') {
				stage = e.data.stage!;
				pct = Math.max(pct, e.data.pct!);
			} else if (e.data.type === 'done') {
				stage = 'Breathing life into the realm';
				pct = 1;
				worker.terminate();
				setTimeout(() => onready(new Cosmos(e.data.universe!)), 20);
			}
		};
		worker.onerror = (err) => {
			stage = `Generation failed: ${err.message}`;
			busy = false;
		};
		worker.postMessage({ opts, planets });
	}

	async function load(slot: string) {
		busy = true;
		stage = 'Unrolling the ancient atlas';
		pct = 0.5;
		const c = await loadGame(slot);
		if (c) onready(c);
		else busy = false;
	}

	const g = $derived(GENRES[s.genre]);
	const autoCultures = $derived(Math.max(5, Math.round(s.states * 0.75)));
	const autoBurgs = $derived(Math.round(s.cells / 45) + s.states);
</script>

{#snippet lock(k: string)}
	<button
		type="button"
		class="lock"
		class:on={isLocked(k)}
		onclick={() => toggleLock(k)}
		aria-pressed={isLocked(k)}
		title={isLocked(k) ? 'Locked: Randomize keeps this setting' : 'Unlocked: Randomize can alter this setting'}
		aria-label={isLocked(k) ? 'Locked setting' : 'Unlocked setting'}
	>
		<span class="lock-icon">{isLocked(k) ? '🔒' : '🔓'}</span>
	</button>
{/snippet}

<div class="setup" style="--accent:{g.accent}">
	<header class="hero">
		<div class="brand-row">
			<span class="realm-rune">◈</span>
			<h1>Realmforge</h1>
			<span class="realm-rune">◈</span>
		</div>
		<p class="subtitle">Procedural world atlas and living-world simulator. Forge realms, shape continents, and observe history.</p>

		<div class="archetypes" aria-label="Thematic archetypes">
			<span class="archetype-label">Presets:</span>
			<div class="archetype-scroll">
				{#each ARCHETYPES as a (a.id)}
					<button
						type="button"
						class="archetype-pill"
						class:active={s.genre === a.genre && s.planet === a.planet}
						onclick={() => applyArchetype(a)}
						title="{a.name}: {a.blurb}"
					>
						<span class="pill-icon">{a.icon}</span>
						<span class="pill-name">{a.name}</span>
					</button>
				{/each}
			</div>
		</div>
	</header>

	{#if busy}
		<div class="progress-overlay" role="status" aria-live="polite">
			<div class="progress-card">
				<div class="compass-spinner" aria-hidden="true">
					<div class="compass-core"></div>
					<div class="compass-ring"></div>
				</div>
				<h2>Forging the Cosmos</h2>
				<div class="bar-wrap">
					<div class="bar"><div style="width:{(pct * 100).toFixed(0)}%"></div></div>
				</div>
				<div class="progress-meta">
					<p class="stage-text">{stage}…</p>
					<span class="pct-text">{(pct * 100).toFixed(0)}%</span>
				</div>
				<p class="lore-hint">Synthesizing Voronoi tessellations, simulating climate winds, and seeding cultures.</p>
			</div>
		</div>
	{:else}
		<div class="action-bar">
			<button type="button" class="btn primary forge-btn" onclick={generate}>
				<span class="forge-spark">⚡</span>
				<span>Forge the world</span>
			</button>
			<button type="button" class="btn randomize-btn" onclick={randomize} title="Randomize all unlocked fields">
				<span>🎲 Randomize</span>
				{#if locked.length > 0}
					<span class="lock-pill">({locked.length} locked)</span>
				{/if}
			</button>
			<button type="button" class="btn reset-btn" onclick={resetAll} title="Reset all options to default">
				<span>↺ Reset</span>
			</button>
			{#if locked.length > 0}
				<button type="button" class="btn unlock-btn" onclick={unlockAll} title="Unlock all locked settings">
					<span>🔓 Clear locks</span>
				</button>
			{/if}
		</div>

		<div class="setup-tabs" role="tablist" aria-label="Configuration sections">
			<button type="button" class="tab-btn" class:active={activeTab === 'genre'} onclick={() => (activeTab = 'genre')} role="tab" aria-selected={activeTab === 'genre'}>
				<span class="tab-icon">🎭</span>
				<span class="tab-text">Genre & Theme</span>
			</button>
			<button type="button" class="tab-btn" class:active={activeTab === 'map'} onclick={() => (activeTab = 'map')} role="tab" aria-selected={activeTab === 'map'}>
				<span class="tab-icon">🗺️</span>
				<span class="tab-text">World & Relief</span>
			</button>
			<button type="button" class="tab-btn" class:active={activeTab === 'climate'} onclick={() => (activeTab = 'climate')} role="tab" aria-selected={activeTab === 'climate'}>
				<span class="tab-icon">🌐</span>
				<span class="tab-text">Climate & Globe</span>
			</button>
			<button type="button" class="tab-btn" class:active={activeTab === 'society'} onclick={() => (activeTab = 'society')} role="tab" aria-selected={activeTab === 'society'}>
				<span class="tab-icon">👥</span>
				<span class="tab-text">Societies</span>
			</button>
			<button type="button" class="tab-btn" class:active={activeTab === 'layers'} onclick={() => (activeTab = 'layers')} role="tab" aria-selected={activeTab === 'layers'}>
				<span class="tab-icon">⛏️</span>
				<span class="tab-text">Exotic Planes</span>
			</button>
			{#if saves.length > 0}
				<button type="button" class="tab-btn" class:active={activeTab === 'saves'} onclick={() => (activeTab = 'saves')} role="tab" aria-selected={activeTab === 'saves'}>
					<span class="tab-icon">📜</span>
					<span class="tab-text">Chronicles ({saves.length})</span>
				</button>
			{/if}
			<button
				type="button"
				class="tab-btn view-toggle"
				class:active={viewMode === 'all'}
				onclick={() => (viewMode = viewMode === 'all' ? 'tabs' : 'all')}
				title={viewMode === 'all' ? 'Switch to focused tabbed view' : 'Switch to full studio view'}
			>
				<span class="tab-icon">{viewMode === 'all' ? '📑' : '📖'}</span>
				<span class="tab-text">{viewMode === 'all' ? 'Focus View' : 'Studio View'}</span>
			</button>
		</div>

		<main class="sections-container" class:studio-view={viewMode === 'all'}>
			<!-- SECTION 1: GENRE & THEME -->
			{#if viewMode === 'all' || activeTab === 'genre'}
				<section class="panel-card genre-sec">
					<div class="panel-header">
						<h2>🎭 Genre & Aesthetic {@render lock('genre')}</h2>
						<span class="panel-sub">Select the cultural and technological foundation of the world</span>
					</div>
					<div class="genre-grid">
						{#each Object.values(GENRES) as gd (gd.id)}
							<button
								type="button"
								class="genre-card"
								class:selected={s.genre === gd.id}
								style="--ga:{gd.accent}"
								onclick={() => (s.genre = gd.id)}
								aria-pressed={s.genre === gd.id}
							>
								<div class="genre-head">
									<span class="genre-dot" style="background:{gd.accent}"></span>
									<strong class="genre-name">{gd.name}</strong>
								</div>
								<p class="genre-blurb">{gd.blurb}</p>
								<div class="genre-tags">
									<span class="tag">{gd.forms[0]}</span>
									<span class="tag">{gd.layerNames.deep}</span>
								</div>
							</button>
						{/each}
					</div>

					<div class="field mt-md">
						<div class="field-head">
							<div class="field-title">
								{@render lock('planet')}
								<label for="f-planet">Planetary Sphere</label>
							</div>
							<span class="field-badge">{PLANETS[s.planet].name}</span>
						</div>
						<div class="field-input">
							<select id="f-planet" value={s.planet} onchange={(e) => setPlanet((e.currentTarget as HTMLSelectElement).value as PlanetKind)}>
								{#each Object.entries(PLANETS) as [k, p] (k)}
									<option value={k}>{p.name}: {p.desc}</option>
								{/each}
							</select>
						</div>
					</div>

					<label class="evolve mt-md">
						<input type="checkbox" checked={!!s.evolve} onchange={(e) => (s.evolve = (e.currentTarget as HTMLInputElement).checked)} />
						<span><strong>Evolving genre</strong> <span class="muted">The world's voice follows its tech era: mythic, fantasy, steampunk, dieselpunk, then cyberpunk or solarpunk depending on how it got there.</span></span>
					</label>
				</section>
			{/if}

			<!-- SECTION 2: MAP & RELIEF -->
			{#if viewMode === 'all' || activeTab === 'map'}
				<section class="panel-card map-sec">
					<div class="panel-header">
						<h2>🗺️ Map Canvas & Relief</h2>
						<span class="panel-sub">Configure seed, coordinate dimensions, Voronoi mesh, and landforms</span>
					</div>

					<div class="field">
						<div class="field-head">
							<div class="field-title">
								{@render lock('seed')}
								<label for="f-seed">World Seed</label>
							</div>
							<span class="field-badge">{s.seed}</span>
						</div>
						<div class="seed-row">
							<input id="f-seed" bind:value={s.seed} aria-label="World generation seed" />
							<button type="button" class="btn seed-roll" onclick={() => (s.seed = rndSeed())} aria-label="Roll new random seed" title="Roll new random seed">⟳ Roll</button>
						</div>
					</div>

					<div class="field">
						<div class="field-head">
							<div class="field-title">
								<span>Canvas Dimensions</span>
							</div>
							<span class="field-badge">{s.width} × {s.height} px</span>
						</div>
						<div class="dim-row">
							<div class="dim-inputs">
								<input type="number" min="400" max="6000" step="50" bind:value={s.width} class="num" aria-label="Map width in pixels" />
								<span class="dim-x">×</span>
								<input type="number" min="400" max="6000" step="50" bind:value={s.height} class="num" aria-label="Map height in pixels" />
								<span class="dim-unit">px</span>
							</div>
							<select class="dim-select" onchange={(e) => { const [w, h] = (e.currentTarget as HTMLSelectElement).value.split('x').map(Number); if (w) { s.width = w; s.height = h; } }} aria-label="Preset map dimensions">
								<option value="">Dimensions Preset…</option>
								{#each SIZES as [w, h, n] (n)}<option value="{w}x{h}">{n} ({w}×{h})</option>{/each}
							</select>
						</div>
					</div>

					<div class="field">
						<div class="field-head">
							<div class="field-title">
								<label for="f-points">Points Density</label>
							</div>
							<div class="cell-stats">
								<span class="field-badge highlight">{s.cells >= 1000 ? `${s.cells / 1000}K` : s.cells} cells</span>
								<span class="perf-pill {s.cells <= 10000 ? 'rapid' : s.cells <= 40000 ? 'balanced' : 'heavy'}">
									{s.cells <= 10000 ? '⚡ Rapid (<0.5s)' : s.cells <= 40000 ? '⚖ Balanced (~1s)' : '🔥 Heavy detail (3s+)'}
								</span>
							</div>
						</div>
						<div class="field-input">
							<input id="f-points" type="range" min="0" max={POINTS.length - 1} value={pointIdx} oninput={(e) => (s.cells = POINTS[+(e.currentTarget as HTMLInputElement).value])} />
						</div>
						{#if s.cells > 60000}
							<p class="field-hint warn">Very dense meshes create intricate coasts but demand higher processing power.</p>
						{/if}
					</div>

					<div class="field">
						<div class="field-head">
							<div class="field-title">
								{@render lock('template')}
								<label for="f-template">Heightmap Template</label>
							</div>
							<span class="field-badge">{TEMPLATE_NAMES[s.template] ?? s.template}</span>
						</div>
						<div class="field-input">
							<select id="f-template" bind:value={s.template}>
								{#each Object.entries(TEMPLATE_NAMES) as [k, n] (k)}<option value={k}>{n}</option>{/each}
							</select>
						</div>
					</div>

					<div class="grid-pair">
						<div class="field">
							<div class="field-head">
								<div class="field-title">
									{@render lock('seaLevel')}
									<label for="f-sea">Sea Level</label>
								</div>
								<span class="field-badge">{s.seaLevel > 0 ? `+${s.seaLevel}` : s.seaLevel}</span>
							</div>
							<div class="field-input">
								<input id="f-sea" type="range" min="-15" max="15" bind:value={s.seaLevel} />
							</div>
						</div>

						<div class="field">
							<div class="field-head">
								<div class="field-title">
									{@render lock('rivers')}
									<label for="f-rivers">Rivers Multiplier</label>
								</div>
								<span class="field-badge">×{s.rivers}</span>
							</div>
							<div class="field-input">
								<input id="f-rivers" type="range" min="0.25" max="3" step="0.05" bind:value={s.rivers} />
							</div>
						</div>
					</div>

					<div class="field">
						<div class="field-head">
							<div class="field-title">
								<label for="f-planets">Planets in Multiverse</label>
							</div>
							<span class="field-badge">{s.planets} {s.planets === 1 ? 'world' : 'worlds joined by rifts'}</span>
						</div>
						<div class="field-input">
							<input id="f-planets" type="range" min="1" max="5" bind:value={s.planets} />
						</div>
						{#if s.planets > 1}
							<p class="field-hint">Extra planets generate with unique biomes, connected via magical or spatial rifts.</p>
						{/if}
					</div>
				</section>
			{/if}

			<!-- SECTION 3: CLIMATE & GLOBE -->
			{#if viewMode === 'all' || activeTab === 'climate'}
				<section class="panel-card climate-sec">
					<div class="panel-header">
						<h2>🌐 Planetary Climate {@render lock('climate')}</h2>
						<span class="panel-sub">Rotate wind bands on the interactive globe and fine-tune global temperature gradients</span>
					</div>
					<ClimatePanel bind:climate={s.climate} width={s.width} height={s.height} />
				</section>
			{/if}

			<!-- SECTION 4: SOCIETIES & CULTURES -->
			{#if viewMode === 'all' || activeTab === 'society'}
				<section class="panel-card society-sec">
					<div class="panel-header">
						<h2>👥 Societies, Faiths & Spheres</h2>
						<span class="panel-sub">Set population density, realm counts, and cultural language families</span>
					</div>

					<div class="grid-pair">
						<div class="field">
							<div class="field-head">
								<div class="field-title">
									{@render lock('states')}
									<label for="f-states">States Count</label>
								</div>
								<span class="field-badge">{s.states} realms</span>
							</div>
							<div class="field-input">
								<input id="f-states" type="range" min="2" max="80" bind:value={s.states} />
							</div>
						</div>

						<div class="field">
							<div class="field-head">
								<div class="field-title">
									{@render lock('cultures')}
									<label for="f-cultures">Cultures Count</label>
								</div>
								<span class="field-badge">{s.cultures || `Auto (${autoCultures})`}</span>
							</div>
							<div class="field-input">
								<input id="f-cultures" type="range" min="0" max="40" bind:value={s.cultures} />
							</div>
						</div>
					</div>

					<div class="grid-pair">
						<div class="field">
							<div class="field-head">
								<div class="field-title">
									<label for="f-burgs">Settlements (Burgs)</label>
								</div>
								<span class="field-badge">{s.burgs || `Auto (${autoBurgs})`}</span>
							</div>
							<div class="field-input">
								<input id="f-burgs" type="range" min="0" max="2000" step="10" bind:value={s.burgs} />
							</div>
						</div>

						<div class="field">
							<div class="field-head">
								<div class="field-title">
									{@render lock('religions')}
									<label for="f-religions">Religions Count</label>
								</div>
								<span class="field-badge">{s.religions || 'Auto'}</span>
							</div>
							<div class="field-input">
								<input id="f-religions" type="range" min="0" max="30" bind:value={s.religions} />
							</div>
						</div>
					</div>

					<div class="grid-pair">
						<div class="field">
							<div class="field-head">
								<div class="field-title">
									{@render lock('sizeVariety')}
									<label for="f-variety">Realm Size Variety</label>
								</div>
								<span class="field-badge">{s.sizeVariety} / 10</span>
							</div>
							<div class="field-input">
								<input id="f-variety" type="range" min="0" max="10" bind:value={s.sizeVariety} />
							</div>
						</div>

						<div class="field">
							<div class="field-head">
								<div class="field-title">
									{@render lock('growth')}
									<label for="f-growth">Expansion Rate</label>
								</div>
								<span class="field-badge">×{s.growth}</span>
							</div>
							<div class="field-input">
								<input id="f-growth" type="range" min="0.2" max="3" step="0.1" bind:value={s.growth} />
							</div>
						</div>
					</div>

					<div class="field mt-sm">
						<div class="field-head">
							<div class="field-title">
								{@render lock('sphereSet')}
								<label for="f-sphereset">Cultures Regional Set</label>
							</div>
							<span class="field-badge">{s.sphereSet}</span>
						</div>
						<div class="field-input">
							<select id="f-sphereset" value={s.sphereSet} onchange={(e) => setSphereSet((e.currentTarget as HTMLSelectElement).value)}>
								{#each Object.keys(SPHERE_SETS) as k (k)}
									<option value={k}>{k === 'All' ? 'All Spheres (Placed by Climate)' : `${k} Set`}</option>
								{/each}
								<option value="Custom">Custom Sphere Selection…</option>
							</select>
						</div>
					</div>

					<div class="spheres-section">
						<div class="spheres-head">
							<span class="sub-label">Active spheres ({s.spheres ? s.spheres.length : SPHERES.length} of {SPHERES.length}):</span>
							<div class="spheres-actions">
								<button type="button" class="btn tiny" onclick={() => { s.sphereSet = 'Custom'; s.spheres = SPHERES.map((x) => x.id); }}>All</button>
								<button type="button" class="btn tiny" onclick={() => { s.sphereSet = 'Custom'; s.spheres = []; }}>None</button>
							</div>
						</div>
						<div class="spheres-grid">
							{#each SPHERES as sp (sp.id)}
								{@const active = !s.spheres || s.spheres.includes(sp.id)}
								<button
									type="button"
									class="sphere-chip"
									class:on={active}
									onclick={() => toggleSphere(sp.id)}
									title="{sp.forms.join(', ')} · {sp.rulers.join(', ')}"
									aria-pressed={active}
								>
									<span class="sphere-icon">{sp.climate === -1 ? '❄' : sp.climate === 1 ? '☀️' : '🌿'}</span>
									<span class="sphere-text">{sp.name}</span>
								</button>
							{/each}
						</div>
					</div>
				</section>
			{/if}

			<!-- SECTION 5: EXOTIC PLANES & LAYERS -->
			{#if viewMode === 'all' || activeTab === 'layers'}
				<section class="panel-card layers-sec">
					<div class="panel-header">
						<h2>⛏️ Dimensional Layers {@render lock('layers')}</h2>
						<span class="panel-sub">Simulate vertical depths, soaring sky isles, and deep sea shelves</span>
					</div>

					<div class="field">
						<div class="field-head">
							<div class="field-title">
								<label for="f-depth">{g.layerNames.deep} Levels</label>
							</div>
							<span class="field-badge">{s.depth} under-levels</span>
						</div>
						<div class="field-input">
							<input id="f-depth" type="range" min="0" max="6" bind:value={s.depth} />
						</div>
					</div>

					{#if s.depth > 0}
						<div class="field sub-field">
							<div class="field-head">
								<div class="field-title">
									<label for="f-deep-dens">{g.kinds.deep[0]} Density</label>
								</div>
								<span class="field-badge">×{s.density.deep}</span>
							</div>
							<div class="field-input">
								<input id="f-deep-dens" type="range" min="0.2" max="3" step="0.1" bind:value={s.density.deep} />
							</div>
						</div>
					{/if}

					<div class="field-toggle-card" class:checked={s.sky}>
						<label class="check-label">
							<input type="checkbox" bind:checked={s.sky} />
							<span class="check-title">{g.layerNames.sky}</span>
							<span class="muted small">({g.kinds.sky.slice(0, 2).join(', ')})</span>
						</label>
						{#if s.sky}
							<div class="sub-slider">
								<span class="sub-badge">Density: ×{s.density.sky}</span>
								<input type="range" min="0.2" max="3" step="0.1" bind:value={s.density.sky} aria-label="Sky layer density" />
							</div>
						{/if}
					</div>

					<div class="field-toggle-card" class:checked={s.sea}>
						<label class="check-label">
							<input type="checkbox" bind:checked={s.sea} />
							<span class="check-title">{g.layerNames.sea}</span>
							<span class="muted small">({g.kinds.sea.slice(0, 2).join(', ')})</span>
						</label>
						{#if s.sea}
							<div class="sub-slider">
								<span class="sub-badge">Density: ×{s.density.sea}</span>
								<input type="range" min="0.2" max="3" step="0.1" bind:value={s.density.sea} aria-label="Sea shelf density" />
							</div>
						{/if}
					</div>
				</section>
			{/if}

			<!-- SECTION 6: SAVED CHRONICLES -->
			{#if (viewMode === 'all' || activeTab === 'saves') && (saves.length > 0 || activeTab === 'saves')}
				<section class="panel-card saves-sec">
					<div class="panel-header">
						<h2>📜 Saved Chronicles</h2>
						<span class="panel-sub">Resume an existing simulation or remove old saves</span>
					</div>

					{#if saves.length}
						<ul class="saves-list">
							{#each saves as sv (sv.slot)}
								<li class="save-item">
									<div class="save-info">
										<strong>{sv.name}</strong>
										<span class="save-meta">Year {sv.year} · {GENRES[sv.genre as Genre]?.name ?? sv.genre}{sv.planets > 1 ? ` · ${sv.planets} planets` : ''}</span>
									</div>
									<div class="save-actions">
										<button type="button" class="btn primary small" onclick={() => load(sv.slot)}>Resume</button>
										<button type="button" class="btn small danger" aria-label="Delete save" onclick={async () => { await deleteSave(sv.slot); saves = await listSaves(); }}>✕</button>
									</div>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="muted small">No saved chronicles found yet. Generate a world and click Save in the top bar to record history.</p>
					{/if}
				</section>
			{/if}
		</main>
	{/if}
</div>

<style>
	.setup {
		min-height: 100dvh;
		padding: 1.25rem 0.75rem 3.5rem;
		background: radial-gradient(ellipse at 50% 0%, #2f2214, #120e0a 75%);
		color: #f3e9d2;
		--line: rgba(243, 233, 210, 0.16);
		--muted: #b8a888;
		--ink: #1b140c;
		display: flex;
		flex-direction: column;
		align-items: center;
		overflow-x: hidden;
	}

	.hero {
		text-align: center;
		max-width: 900px;
		width: 100%;
		margin: 0 auto 1.25rem;
		padding: 0 0.5rem;
	}

	.brand-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
	}

	.realm-rune {
		color: var(--accent);
		font-size: 1.3rem;
		opacity: 0.7;
	}

	.hero h1 {
		font-size: clamp(2.2rem, 5.5vw, 3.6rem);
		color: var(--accent);
		text-shadow: 0 2px 24px rgba(0, 0, 0, 0.7);
		margin: 0;
		letter-spacing: 0.05em;
	}

	.subtitle {
		margin: 0.4rem auto 1rem;
		font-size: clamp(0.95rem, 2vw, 1.1rem);
		color: var(--muted);
		max-width: 680px;
		line-height: 1.4;
	}

	.archetypes {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		justify-content: center;
		flex-wrap: wrap;
		margin-top: 0.75rem;
	}

	.archetype-label {
		font-size: 0.82rem;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.archetype-scroll {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.archetype-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		background: rgba(0, 0, 0, 0.35);
		border: 1px solid var(--line);
		border-radius: 99px;
		padding: 0.3rem 0.7rem;
		font-size: 0.85rem;
		color: inherit;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}

	.archetype-pill:hover {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 15%, transparent);
	}

	.archetype-pill.active {
		border-color: var(--accent);
		background: var(--accent);
		color: var(--ink);
		font-weight: 600;
	}

	.action-bar {
		position: sticky;
		top: 0.5rem;
		z-index: 10;
		display: flex;
		gap: 0.5rem;
		justify-content: center;
		flex-wrap: wrap;
		background: rgba(18, 14, 10, 0.85);
		backdrop-filter: blur(10px);
		padding: 0.5rem 0.75rem;
		border-radius: 12px;
		border: 1px solid var(--line);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
		margin-bottom: 1.25rem;
		max-width: 900px;
		width: 100%;
	}

	.forge-btn {
		font-family: var(--title);
		font-size: 1.05rem;
		padding: 0.55rem 1.4rem;
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		box-shadow: 0 0 20px color-mix(in srgb, var(--accent) 30%, transparent);
	}

	.forge-spark {
		font-size: 1.15rem;
	}

	.randomize-btn, .reset-btn, .unlock-btn {
		font-size: 0.9rem;
		padding: 0.45rem 0.85rem;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.lock-pill {
		font-size: 0.76rem;
		opacity: 0.85;
	}

	.setup-tabs {
		display: flex;
		gap: 0.35rem;
		overflow-x: auto;
		max-width: 100%;
		padding: 0.2rem 0.4rem 0.75rem;
		scrollbar-width: none;
		-webkit-overflow-scrolling: touch;
		margin-bottom: 1rem;
	}

	.setup-tabs::-webkit-scrollbar {
		display: none;
	}

	.tab-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.45rem 0.85rem;
		font-size: 0.88rem;
		color: var(--muted);
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.15s;
		min-height: 40px;
	}

	.tab-btn:hover {
		color: #f3e9d2;
		border-color: rgba(243, 233, 210, 0.35);
	}

	.tab-btn.active {
		background: color-mix(in srgb, var(--accent) 18%, transparent);
		border-color: var(--accent);
		color: var(--accent);
		font-weight: 600;
	}

	.tab-btn.view-toggle {
		border-style: dashed;
		margin-left: 0.25rem;
	}

	.sections-container {
		width: 100%;
		max-width: 1100px;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.sections-container.studio-view {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 480px), 1fr));
		gap: 1.25rem;
	}

	.panel-card {
		background: rgba(22, 17, 12, 0.82);
		border: 1px solid var(--line);
		border-radius: 14px;
		padding: 1.25rem;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
	}

	.panel-header {
		margin-bottom: 0.4rem;
	}

	.panel-header h2 {
		font-size: 1.15rem;
		color: var(--accent);
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.panel-sub {
		font-size: 0.82rem;
		color: var(--muted);
		margin-top: 0.15rem;
		display: block;
	}

	.genre-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
		gap: 0.65rem;
	}

	.genre-card {
		text-align: left;
		border: 1px solid var(--line);
		background: rgba(0, 0, 0, 0.3);
		border-radius: 10px;
		padding: 0.65rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		cursor: pointer;
		transition: all 0.15s;
		min-height: 85px;
	}

	.genre-card:hover {
		border-color: var(--ga);
		background: rgba(0, 0, 0, 0.45);
	}

	.genre-card.selected {
		border-color: var(--ga);
		box-shadow: 0 0 0 1px var(--ga), 0 0 16px color-mix(in srgb, var(--ga) 25%, transparent);
		background: color-mix(in srgb, var(--ga) 12%, rgba(0, 0, 0, 0.4));
	}

	.genre-head {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.genre-dot {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 50%;
		display: inline-block;
	}

	.genre-name {
		font-family: var(--title);
		color: var(--ga);
		font-size: 0.95rem;
	}

	.genre-blurb {
		font-size: 0.8rem;
		color: var(--muted);
		margin: 0;
		line-height: 1.25;
		flex: 1;
	}

	.genre-tags {
		display: flex;
		gap: 0.3rem;
		flex-wrap: wrap;
		margin-top: 0.2rem;
	}

	.tag {
		font-size: 0.72rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--line);
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
		color: var(--muted);
	}

	.field {
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid var(--line);
		border-radius: 9px;
		padding: 0.65rem 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
	}

	.field-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
	}

	.field-title {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-weight: 500;
		min-width: 0;
	}

	.field-badge {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.field-badge.highlight {
		font-size: 0.9rem;
	}

	.field-input {
		display: flex;
		align-items: center;
		width: 100%;
	}

	.field-input input[type='range'] {
		width: 100%;
		accent-color: var(--accent);
		height: 1.5rem;
		cursor: pointer;
	}

	.field-input select {
		width: 100%;
		background: rgba(0, 0, 0, 0.45);
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 0.4rem 0.6rem;
		color: inherit;
		min-height: 38px;
	}

	.lock {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 0.2rem;
		font-size: 0.82rem;
		min-width: 1.85rem;
		min-height: 1.85rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.15s;
		opacity: 0.65;
	}

	.lock:hover {
		opacity: 1;
		border-color: var(--accent);
	}

	.lock.on {
		opacity: 1;
		background: color-mix(in srgb, var(--accent) 22%, transparent);
		border-color: var(--accent);
	}

	.seed-row {
		display: flex;
		gap: 0.4rem;
	}

	.seed-row input {
		flex: 1;
		background: rgba(0, 0, 0, 0.45);
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 0.4rem 0.6rem;
		min-width: 0;
	}

	.seed-roll {
		padding: 0.4rem 0.75rem;
		font-size: 0.85rem;
		min-height: 38px;
	}

	.dim-row {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.dim-inputs {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex: 1 1 200px;
	}

	.dim-inputs input {
		width: 5.5rem;
		background: rgba(0, 0, 0, 0.45);
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 0.35rem 0.5rem;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	.dim-x, .dim-unit {
		color: var(--muted);
		font-size: 0.85rem;
	}

	.dim-select {
		flex: 1 1 180px;
		background: rgba(0, 0, 0, 0.45);
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 0.4rem 0.6rem;
		min-height: 38px;
	}

	.cell-stats {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.perf-pill {
		font-size: 0.75rem;
		padding: 0.15rem 0.45rem;
		border-radius: 99px;
		font-weight: 600;
		white-space: nowrap;
	}

	.perf-pill.rapid {
		background: rgba(80, 200, 120, 0.15);
		color: #85e8a6;
		border: 1px solid rgba(80, 200, 120, 0.3);
	}

	.perf-pill.balanced {
		background: rgba(200, 160, 60, 0.15);
		color: #f0c868;
		border: 1px solid rgba(200, 160, 60, 0.3);
	}

	.perf-pill.heavy {
		background: rgba(220, 80, 60, 0.15);
		color: #f28b7a;
		border: 1px solid rgba(220, 80, 60, 0.3);
	}

	.field-hint {
		font-size: 0.8rem;
		color: var(--muted);
		margin: 0.1rem 0 0;
	}

	.field-hint.warn {
		color: #f0a060;
	}

	.grid-pair {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
		gap: 0.65rem;
	}

	.spheres-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.5rem;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid var(--line);
		border-radius: 9px;
		padding: 0.75rem;
	}

	.spheres-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
	}

	.sub-label {
		color: var(--muted);
	}

	.spheres-actions {
		display: flex;
		gap: 0.25rem;
	}

	.spheres-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.sphere-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid var(--line);
		border-radius: 99px;
		padding: 0.2rem 0.55rem;
		font-size: 0.78rem;
		color: var(--muted);
		cursor: pointer;
		transition: all 0.15s;
		min-height: 30px;
	}

	.sphere-chip:hover {
		border-color: var(--accent);
		color: #f3e9d2;
	}

	.sphere-chip.on {
		background: var(--accent);
		color: var(--ink);
		border-color: var(--accent);
		font-weight: 600;
	}

	.sphere-icon {
		font-size: 0.85rem;
	}

	.field-toggle-card {
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid var(--line);
		border-radius: 9px;
		padding: 0.75rem 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.field-toggle-card.checked {
		border-color: rgba(243, 233, 210, 0.3);
		background: rgba(0, 0, 0, 0.32);
	}

	.check-label {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		font-size: 0.92rem;
		cursor: pointer;
	}

	.check-label input {
		width: 1.15rem;
		height: 1.15rem;
		accent-color: var(--accent);
		cursor: pointer;
	}

	.check-title {
		font-weight: 600;
	}

	.sub-slider {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding-left: 1.7rem;
	}

	.sub-badge {
		font-size: 0.78rem;
		color: var(--accent);
	}

	.sub-slider input[type='range'] {
		width: 100%;
		accent-color: var(--accent);
	}

	.sub-field {
		margin-left: 1rem;
		border-left: 2px solid var(--accent);
	}

	.saves-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.save-item {
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.6rem 0.85rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.save-info {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.save-meta {
		font-size: 0.8rem;
		color: var(--muted);
	}

	.save-actions {
		display: flex;
		gap: 0.35rem;
	}

	.btn.danger {
		color: var(--danger, #e06050);
		border-color: rgba(220, 80, 60, 0.4);
	}

	.btn.danger:hover {
		background: rgba(220, 80, 60, 0.18);
		border-color: var(--danger, #e06050);
	}

	.btn.tiny {
		font-size: 0.75rem;
		padding: 0.15rem 0.45rem;
	}

	.mt-md {
		margin-top: 0.6rem;
	}

	.mt-sm {
		margin-top: 0.4rem;
	}

	/* Progress Overlay */
	.progress-overlay {
		position: fixed;
		inset: 0;
		background: rgba(12, 9, 6, 0.85);
		backdrop-filter: blur(12px);
		z-index: 50;
		display: grid;
		place-items: center;
		padding: 1.5rem;
	}

	.progress-card {
		background: rgba(24, 18, 12, 0.95);
		border: 1px solid var(--accent);
		border-radius: 16px;
		padding: 2.2rem 1.8rem;
		max-width: 480px;
		width: 100%;
		text-align: center;
		box-shadow: 0 24px 70px rgba(0, 0, 0, 0.7), 0 0 30px color-mix(in srgb, var(--accent) 25%, transparent);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.progress-card h2 {
		font-family: var(--title);
		color: var(--accent);
		margin: 0;
		font-size: 1.4rem;
	}

	.compass-spinner {
		width: 52px;
		height: 52px;
		position: relative;
		display: grid;
		place-items: center;
		margin-bottom: 0.3rem;
	}

	.compass-ring {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		border: 2px dashed color-mix(in srgb, var(--accent) 40%, transparent);
		animation: spin 8s linear infinite;
	}

	.compass-core {
		width: 14px;
		height: 14px;
		background: var(--accent);
		border-radius: 50%;
		box-shadow: 0 0 16px var(--accent);
		animation: pulse 1.8s ease-in-out infinite;
	}

	.bar-wrap {
		width: 100%;
	}

	.bar {
		height: 8px;
		border-radius: 99px;
		background: rgba(255, 255, 255, 0.1);
		overflow: hidden;
		width: 100%;
	}

	.bar div {
		height: 100%;
		background: var(--accent);
		transition: width 0.25s ease-out;
	}

	.progress-meta {
		display: flex;
		justify-content: space-between;
		width: 100%;
		font-size: 0.88rem;
	}

	.stage-text {
		color: #f3e9d2;
		margin: 0;
	}

	.pct-text {
		color: var(--accent);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.lore-hint {
		font-size: 0.8rem;
		color: var(--muted);
		margin: 0;
		line-height: 1.35;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	@keyframes pulse {
		0%, 100% { transform: scale(0.9); opacity: 0.7; }
		50% { transform: scale(1.2); opacity: 1; }
	}

	@media (max-width: 600px) {
		.setup {
			padding: 1rem 0.5rem 3rem;
		}

		.action-bar {
			padding: 0.45rem;
			gap: 0.35rem;
		}

		.forge-btn {
			width: 100%;
			justify-content: center;
			padding: 0.6rem;
		}

		.randomize-btn, .reset-btn, .unlock-btn {
			flex: 1;
			justify-content: center;
		}

		.panel-card {
			padding: 1rem 0.8rem;
		}

		.genre-grid {
			grid-template-columns: 1fr;
		}

		.field {
			padding: 0.55rem 0.7rem;
		}

		.dim-row {
			flex-direction: column;
			align-items: stretch;
		}

		.dim-inputs {
			width: 100%;
		}

		.dim-inputs input {
			flex: 1;
			width: auto;
		}

		.dim-select {
			width: 100%;
		}

		.cell-stats {
			width: 100%;
			justify-content: space-between;
			margin-top: 0.2rem;
		}

		.field-head {
			flex-wrap: wrap;
		}
	}
	.evolve { display: flex; gap: 0.5rem; align-items: flex-start; font-size: 0.9rem; line-height: 1.35; cursor: pointer; }
	.evolve input { margin-top: 0.2rem; accent-color: var(--accent); }
</style>
