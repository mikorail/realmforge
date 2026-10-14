<script lang="ts">
	import { GENRES } from '#lib/gen/genre';
	import { PLANETS } from '#lib/gen/physical';
	import type { MapMode, MapRenderer } from '#lib/render/renderer';
	import { THEMES } from '#lib/render/theme';
	import { saveGame } from '#lib/save';
	import type { Cosmos } from '#lib/sim/cosmos';
	import type { Power } from '#lib/sim/engine';
	import { onMount } from 'svelte';
	import AvatarPanel from './AvatarPanel.svelte';
	import ClimatePanel from './ClimatePanel.svelte';
	import DynastyModal from './DynastyModal.svelte';
	import type { Climate } from '#lib/gen/types';
	import EncounterModal from './EncounterModal.svelte';
	import ExportModal from './ExportModal.svelte';
	import GodPanel from './GodPanel.svelte';
	import InfoPanel from './InfoPanel.svelte';
	import MapView from './MapView.svelte';
	import TimelineScrubber from './TimelineScrubber.svelte';
	import CompleteSimModal from './CompleteSimModal.svelte';

	let { cosmos, onquit }: { cosmos: Cosmos; onquit: () => void } = $props();

	const genre = $derived(cosmos.u.planets[0].opts.genre);
	const G = $derived(GENRES[genre]);
	const theme = $derived(THEMES[genre]);

	let v = $state(0); // bumps whenever the simulation changes: panels recompute
	let pi = $state(0); // planet being viewed
	let layer = $state(0);
	let mode = $state<MapMode>('political');
	let tab = $state<'observe' | 'god' | 'avatar'>('observe');
	let speed = $state(0);
	let cell = $state(-1);
	let power = $state<Power | null>(null);
	let toast = $state('');
	let panelOpen = $state(true);
	let hover = $state<{ cell: number; x: number; y: number } | null>(null);
	let worldOpen = $state(false);
	let exportOpen = $state(false);
	let dynastyRuler = $state<number | null>(null);
	let scrubberOpen = $state(false);
	let completeSimOpen = $state(false);
	let peeking = $state(true);
	function togglePeeking() {
		peeking = !peeking;
		if (r) {
			r.showGhost = peeking;
			needDraw = true;
		}
	}
	function getInitialClimate(): Climate {
		return structuredClone(cosmos.u.planets[0].opts.climate);
	}
	let climate = $state<Climate>(getInitialClimate());
	let autoApply = $state(true);
	let applyTimer = 0;
	let interacting = 0;
	function applyClimate() {
		cosmos.sims[pi].reclimate($state.snapshot(climate));
		v++;
	}
	function climateChanged() {
		if (!autoApply) return;
		clearTimeout(applyTimer);
		applyTimer = window.setTimeout(applyClimate, 250);
	}
	let r = $state.raw<MapRenderer | null>(null);
	let modal = $state.raw<import('#lib/sim/engine').Simulation | null>(null);
	let needDraw = true;
	let lastPol = 0;

	const sim = $derived.by(() => {
		void v;
		return cosmos.sims[pi];
	});
	const date = $derived.by(() => {
		void v;
		const s = cosmos.sims[pi];
		return { year: s.year, month: s.month, age: s.age };
	});
	const world = $derived(cosmos.u.planets[pi]);
	const layers = $derived(world.layers);

	function say(t: string) {
		if (!t) return;
		toast = t;
		setTimeout(() => toast === t && (toast = ''), 3800);
	}

	function syncOverlay() {
		if (!r) return;
		const s = cosmos.sims[pi];
		const ov = r.overlay;
		ov.rifts = new Set(cosmos.u.rifts.flatMap((x) => [x.a, x.b]).filter((e) => e.planet === pi).map((e) => e.burg));
		const me = cosmos.avatarPlanet === pi ? s.me : null;
		ov.avatarBurg = me && s.burgLayer(s.w.burgs[me.burg]) === layer ? me.burg : 0;
		ov.travel = me && s.travel ? s.travel.path.slice(s.travel.leg) : null;
		ov.selectedCell = cell;
		const L = s.w.layers[layer];
		ov.selectedBurg = cell >= 0 ? s.lb[layer][cell] : 0;
		ov.selectedState = cell >= 0 && L.open[cell] ? L.state[cell] : 0;
	}

	function bindRenderer(rr: MapRenderer) {
		r = rr;
		r.layer = layer;
		r.mode = mode;
		r.showGhost = peeking;
		r.setWorld(world, cosmos.sims[pi], theme);
		fit();
		needDraw = true;
	}

	/** fit the map into the area not covered by the side panel */
	function fit() {
		if (!r) return;
		const inset = panelOpen && innerWidth >= 760 ? 380 : 0;
		const w0 = r.w;
		r.w = w0 - inset;
		r.fit();
		r.w = w0;
		needDraw = true;
	}

	$effect(() => {
		// planet / layer / mode switches
		const w = world, l = layer, m = mode;
		if (!r) return;
		if (r.world !== w) {
			r.setWorld(w, cosmos.sims[pi], theme);
			fit();
		}
		r.layer = l;
		r.mode = m;
		if (l !== 0 && r.previewHistoryStates) {
			r.previewHistoryStates = null;
			r.invalidatePolitical();
		}
		needDraw = true;
	});

	$effect(() => {
		if (!scrubberOpen && r?.previewHistoryStates) {
			r.previewHistoryStates = null;
			r.invalidatePolitical();
			needDraw = true;
		}
	});

	function handleTimelinePreview(snap: import('#lib/sim/types').HistorySnapshot | null) {
		if (!r) return;
		r.previewHistoryStates = snap ? snap.surfaceStates : null;
		r.invalidatePolitical();
		needDraw = true;
	}

	$effect(() => {
		void cell;
		if (r) {
			syncOverlay();
			r.drawDynamic();
		}
	});

	onMount(() => {
		if (G.accent) document.documentElement.style.setProperty('--accent', G.accent);
		if (theme.glow || !theme.paper && theme.tintAmt > 0.4) document.documentElement.toggleAttribute('data-neon', !!theme.glow || genre === 'biopunk');
		document.documentElement.style.setProperty('--title', theme.font);
		document.documentElement.style.setProperty('--body', theme.bodyFont);
		let raf = 0;
		let last = performance.now();
		let acc = 0;
		let lastRift = 0;
		const frame = (t: number) => {
			const dt = Math.min(0.25, (t - last) / 1000);
			last = t;
			if (cosmos.pending && !modal) modal = cosmos.pending;
			if (speed > 0 && !cosmos.pending && !modal) {
				acc += dt * speed;
				let n = 0;
				while (acc >= 1 && n < 12) {
					cosmos.tick();
					acc -= 1;
					n++;
				}
				if (n) v++;
			}
			const s = cosmos.sims[pi];
			if (r && (s.dirty.political || s.dirty.terrain) && t - lastPol > (speed > 12 ? 450 : 200)) {
				if (s.dirty.terrain) r.invalidateTerrain();
				r.invalidatePolitical();
				s.dirty.political = s.dirty.terrain = false;
				lastPol = t;
				needDraw = true;
			}
			const isInteracting = t - interacting < 140;
			const hasActiveRifts = !!(r && r.overlay.rifts.size > 0);

			if (r) {
				if (isInteracting) {
					r.drawSnapshot();
				} else if (needDraw) {
					syncOverlay();
					r.draw();
					needDraw = false;
				} else if (hasActiveRifts && t - lastRift > 90) {
					lastRift = t;
					r.drawDynamic();
				}
			}
			raf = requestAnimationFrame(frame);
		};
		raf = requestAnimationFrame(frame);
		const key = (e: KeyboardEvent) => {
			if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
			if (e.key === ' ') { e.preventDefault(); speed = speed ? 0 : 3; }
			else if (e.key >= '1' && e.key <= '5') speed = [0, 1, 3, 12, 36][+e.key - 1];
			else if (e.key === 'Escape') {
				if (worldOpen) { worldOpen = false; return; }
				power = null; cell = -1;
			}
			else if (e.key === 'f') fit();
		};
		addEventListener('keydown', key);
		return () => {
			cancelAnimationFrame(raf);
			removeEventListener('keydown', key);
			document.documentElement.removeAttribute('data-neon');
		};
	});

	function pick(c: number) {
		if (c < 0) return;
		if (tab === 'god' && power) {
			say(cosmos.sims[pi].cast(power, c, layer) ?? '');
			if (cosmos.sims[pi].dirty.terrain) r?.invalidateTerrain();
			r?.invalidatePolitical();
			v++;
		}
		cell = c;
		if (innerWidth < 760) panelOpen = true;
	}

	function castRandom(p?: Power) {
		const defaultPowers: Power[] = ['bless', 'inspire', 'host', 'hero', 'prophet', 'relic', 'cataclysm', 'discord', 'plague', 'alien', 'monster', 'species'];
		const targetPower = p ?? defaultPowers[Math.floor(Math.random() * defaultPowers.length)];
		const targetSim = cosmos.sims[pi];
		const res = targetSim.castRandom(targetPower, layer);
		if (res.text) say(res.text);
		if (targetSim.dirty.terrain) r?.invalidateTerrain();
		r?.invalidatePolitical();
		focus(res.cell, pi);
		v++;
	}

	function focus(c: number | undefined, planet = pi) {
		if (c === undefined || !r) return;
		if (planet !== pi) pi = planet;
		const w = cosmos.u.planets[planet];
		const k = Math.max(r.k, 2.2);
		r.k = k;
		r.tx = r.w / 2 - w.cells.x[c] * k;
		r.ty = r.h / 2 - w.cells.y[c] * k;
		cell = c;
		needDraw = true;
	}

	async function save() {
		try {
			await saveGame(`${cosmos.u.seed}`, cosmos);
			say('Chronicle saved.');
		} catch (e) {
			say(`Save failed: ${(e as Error).message}`);
		}
	}

	const months = ['Frostmoot', 'Thawmonth', 'Seedtide', 'Rainmoon', 'Bloomtide', 'Highsun', 'Emberfall', 'Harvest', 'Leafturn', 'Mistmoon', 'Darkening', 'Longnight'];
	const modes: [MapMode, string][] = [['political', 'Realms'], ['biome', 'Biomes'], ['height', 'Relief'], ['culture', 'Cultures'], ['religion', 'Faiths'], ['population', 'People']];
</script>

<div class="game" class:neon={!!theme.glow}>
	<header class="top">
		<div class="brand">
			<h1>{world.name}</h1>
			<span class="muted small">{PLANETS[world.opts.planet].name} · {G.name}</span>
		</div>
		{#if cosmos.sims.length > 1}
			<div class="planets" role="tablist" aria-label="Planets">
				{#each cosmos.u.planets as p, i (i)}
					<button class="btn" class:on={pi === i} role="tab" aria-selected={pi === i} onclick={() => { pi = i; layer = 0; cell = -1; }}>{p.name}{cosmos.avatarPlanet === i ? ' ◆' : ''}</button>
				{/each}
			</div>
		{/if}
		<div class="date">
			<strong>Year {date.year}</strong>
			<span class="muted small">{months[date.month]} · {date.age}</span>
		</div>
		<div class="speed" role="group" aria-label="Time">
			{#each [[0, '❚❚'], [1, '▶'], [3, '▶▶'], [12, '▶▶▶'], [36, '⏩']] as [sp, label] (sp)}
				<button class="btn" class:on={speed === sp} onclick={() => (speed = sp as number)} aria-label={sp ? `${sp} months per second` : 'Pause'}>{label}</button>
			{/each}
		</div>
		<div class="right">
			<button class="btn" onclick={() => (completeSimOpen = true)} title="Fast-forward complete history preserving all annals & timeline snapshots">Complete Sim</button>
			<button class="btn" class:on={scrubberOpen} onclick={() => (scrubberOpen = !scrubberOpen)} aria-pressed={scrubberOpen} title="Scrub past realm borders and eras">Timeline</button>
			<button class="btn" onclick={() => (exportOpen = true)} title="Export poster, vector map, or dossier">Export</button>
			<button class="btn" onclick={() => { climate = structuredClone(cosmos.sims[pi].w.opts.climate); worldOpen = !worldOpen; }} aria-expanded={worldOpen}>Configure world</button>
			<button class="btn" onclick={save}>Save</button>
			<button class="btn" onclick={onquit}>New world</button>
		</div>
	</header>

	<div class="stage">
		<MapView onready={bindRenderer} onpick={pick} onchange={() => { needDraw = true; interacting = performance.now(); }} onhover={(c, x, y) => (hover = c >= 0 ? { cell: c, x, y } : null)} />

		<div class="layerbar" role="tablist" aria-label="Layers">
			{#each [...layers].reverse() as L (L.id)}
				<button class="btn lay" class:on={layer === L.id} onclick={() => { layer = L.id; cell = -1; }} title={L.name}>
					<span class="ico">{L.kind === 'sky' ? '☁' : L.kind === 'sea' ? '≈' : L.kind === 'deep' ? '⛏' : '◉'}</span>
					<span class="lname">{L.name}</span>
				</button>
			{/each}
			<button class="btn lay" class:on={peeking} onclick={togglePeeking} title="Toggle cross-layer subterranean and surface peeking">
				<span class="ico">👁</span>
				<span class="lname">Peeking</span>
			</button>
		</div>

		<div class="modebar" role="tablist" aria-label="Map mode">
			{#each modes as [m, label] (m)}
				<button class="btn" class:on={mode === m} onclick={() => (mode = m)}>{label}</button>
			{/each}
		</div>

		{#if scrubberOpen}
			<div class="timeline-bar">
				<TimelineScrubber
					snapshots={sim.historySnapshots}
					currentYear={sim.year}
					onpreview={handleTimelinePreview}
				/>
			</div>
		{/if}

		{#if hover && hover.cell >= 0}
			{@const hc = hover.cell}
			{@const L = world.layers[layer]}
			{@const st = L.open[hc] ? sim.polities[L.state[hc]] : null}
			<div class="tip" style="left:{hover.x + 14}px; top:{hover.y + 14}px">
				{#if st?.alive && st.id}<span class="swatch" style="background:{st.color}"></span>{st.name}{:else}<span class="muted">{L.kind === 'surface' ? (world.cells.h[hc] < 20 ? 'Sea' : 'Unclaimed') : L.open[hc] ? 'Unclaimed' : 'Solid rock'}</span>{/if}
			</div>
		{/if}

		{#if toast}<div class="toast" role="status">{toast}</div>{/if}

		<button class="btn paneltoggle" onclick={() => (panelOpen = !panelOpen)} aria-expanded={panelOpen}>{panelOpen ? '✕' : '☰'}</button>

		<aside class="panel" class:open={panelOpen}>
			<div class="tabs" role="tablist">
				<button class="btn" class:on={tab === 'observe'} onclick={() => (tab = 'observe')}>Chronicle</button>
				<button class="btn" class:on={tab === 'god'} onclick={() => (tab = 'god')}>{G.terms.god}</button>
				<button class="btn" class:on={tab === 'avatar'} onclick={() => (tab = 'avatar')}>Avatar</button>
			</div>
			<div class="body scroll">
				{#if tab === 'observe'}
					<InfoPanel {sim} {v} {cell} {layer} terms={G.terms} onfocus={focus} onselect={(c) => (cell = c)} ondynasty={(id) => (dynastyRuler = id)} />
				{:else if tab === 'god'}
					<GodPanel {sim} {v} {power} terms={G.terms} onpower={(p) => (power = p)} ontoggle={() => { sim.sandbox = !sim.sandbox; for (const s of cosmos.sims) s.sandbox = sim.sandbox; v++; }} oncastrandom={castRandom} />
				{:else}
					<AvatarPanel {cosmos} {pi} {v} {cell} {layer} terms={G.terms} onsay={say} onchanged={() => { v++; needDraw = true; r?.invalidatePolitical(); }} onfocus={focus} onplanet={(p) => { pi = p; layer = 0; }} />
				{/if}
			</div>
		</aside>
	</div>

	{#if worldOpen}
		<div class="worldcfg" role="dialog" aria-label="Configure world">
			<div class="row between">
				<h2>Configure {world.name}</h2>
				<button class="btn" onclick={() => (worldOpen = false)} aria-label="Close">✕</button>
			</div>
			<ClimatePanel bind:climate width={world.opts.width} height={world.opts.height} onchange={climateChanged} />
			<div class="row between">
				<label class="row"><input type="checkbox" bind:checked={autoApply} /> auto-apply changes</label>
				<button class="btn primary" onclick={applyClimate}>Update world</button>
			</div>
			<p class="muted small">Re-runs temperature, rain and biomes on the living world; borders and history stay, populations adapt.</p>
		</div>
	{/if}

	{#if modal}
		<EncounterModal sim={modal} {v} ondone={(t) => { say(t); modal = null; v++; }} />
	{/if}

	{#if exportOpen}
		<ExportModal
			{cosmos}
			{pi}
			{r}
			onclose={() => (exportOpen = false)}
			onsay={say}
		/>
	{/if}

	{#if dynastyRuler !== null}
		<DynastyModal
			sim={cosmos.sims[pi]}
			rulerId={dynastyRuler}
			onclose={() => (dynastyRuler = null)}
			onselectperson={(id) => {
				const pers = sim.people[id];
				if (!pers) return;
				const c = pers.burg ? sim.w.burgs[pers.burg]?.cell : sim.polities[pers.state]?.capital;
				if (c !== undefined && c >= 0) focus(c);
			}}
		/>
	{/if}

	{#if completeSimOpen}
		<CompleteSimModal
			{cosmos}
			{pi}
			onclose={() => (completeSimOpen = false)}
			onsay={say}
			onsave={save}
			onopenscrubber={() => (scrubberOpen = true)}
			onrefresh={() => { v++; needDraw = true; }}
		/>
	{/if}
</div>

<style>
	.game { position: fixed; inset: 0; display: flex; flex-direction: column; background: var(--bg); }
	.top {
		display: flex; align-items: center; gap: 0.8rem; padding: 0.4rem 0.75rem; flex-wrap: wrap;
		background: var(--panel); color: var(--panel-ink); border-bottom: 1px solid var(--line); z-index: 3;
		padding-top: max(0.4rem, env(safe-area-inset-top));
	}
	.brand h1 { font-size: 1.15rem; color: var(--panel-ink); }
	.brand { display: flex; flex-direction: column; line-height: 1.1; }
	.small { font-size: 0.78rem; }
	.date { display: flex; flex-direction: column; line-height: 1.1; min-width: 9rem; }
	.planets, .speed { display: flex; gap: 0.25rem; flex-wrap: wrap; }
	.speed .btn { min-width: 2.4rem; padding: 0.3rem 0.4rem; font-size: 0.85rem; }
	.right { margin-left: auto; display: flex; gap: 0.35rem; }
	.stage { position: relative; flex: 1; min-height: 0; }
	.layerbar { position: absolute; left: 0.6rem; top: 0.6rem; display: flex; flex-direction: column; gap: 0.25rem; z-index: 2; }
	.lay { background: var(--panel); display: flex; gap: 0.4rem; align-items: center; text-align: left; font-size: 0.85rem; }
	.lay .ico { width: 1.1em; text-align: center; }
	.lay.on { background: var(--accent); color: var(--ink); }
	.modebar { position: absolute; left: 50%; transform: translateX(-50%); bottom: 0.7rem; display: flex; gap: 0.25rem; z-index: 2; background: var(--panel); padding: 0.3rem; border-radius: 10px; border: 1px solid var(--line); flex-wrap: wrap; justify-content: center; max-width: calc(100% - 1.2rem); }
	.modebar .btn { font-size: 0.85rem; padding: 0.25rem 0.55rem; }
	.timeline-bar { position: absolute; left: 50%; transform: translateX(-50%); bottom: 3.8rem; width: min(520px, calc(100% - 1.2rem)); z-index: 2; }
	.panel {
		position: absolute; right: 0; top: 0; bottom: 0; width: min(380px, 100%); z-index: 2;
		background: var(--panel); color: var(--panel-ink); border-left: 1px solid var(--line);
		display: flex; flex-direction: column; transform: translateX(100%); transition: transform 0.2s;
		backdrop-filter: blur(6px);
	}
	.panel.open { transform: none; }
	.paneltoggle { position: absolute; right: 0.6rem; top: 0.6rem; z-index: 3; background: var(--panel); }
	.paneltoggle:has(+ .panel.open) { right: calc(min(380px, 100%) + 0.6rem); }
	.tabs { display: flex; gap: 0.3rem; padding: 0.6rem 3rem 0.5rem 0.6rem; border-bottom: 1px solid var(--line); }
	.tabs .btn { flex: 1; font-family: var(--title); font-size: 0.85rem; }
	.body { flex: 1; padding: 0.75rem; min-height: 0; }
	.tip { position: absolute; pointer-events: none; background: var(--panel); border: 1px solid var(--line); padding: 0.15rem 0.45rem; border-radius: 5px; font-size: 0.85rem; z-index: 2; white-space: nowrap; }
	.toast { position: absolute; left: 50%; top: 0.8rem; transform: translateX(-50%); background: var(--panel); border: 1px solid var(--accent); padding: 0.45rem 0.9rem; border-radius: 8px; z-index: 4; max-width: 90%; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35); }
	.worldcfg { position: fixed; left: 50%; bottom: 1rem; transform: translateX(-50%); width: min(720px, calc(100% - 1.5rem)); max-height: 80dvh; overflow-y: auto; z-index: 6; background: var(--panel); color: var(--panel-ink); border: 1px solid var(--accent); border-radius: 12px; padding: 0.9rem; box-shadow: 0 20px 60px rgba(0,0,0,0.45); display: flex; flex-direction: column; gap: 0.6rem; }
	.worldcfg h2 { font-size: 1.05rem; }
	.between { justify-content: space-between; }
	.neon .top, .neon .panel { box-shadow: 0 0 24px rgba(255, 63, 164, 0.08); }
	@media (max-width: 760px) {
		.top { gap: 0.4rem; padding: 0.35rem 0.5rem; justify-content: space-between; }
		.brand h1 { font-size: 1rem; }
		.speed .btn { min-width: 2rem; padding: 0.25rem 0.3rem; font-size: 0.8rem; }
		.right { margin-left: 0; gap: 0.25rem; }
		.right .btn { padding: 0.25rem 0.45rem; font-size: 0.8rem; }
		.panel { top: auto; height: 58%; width: 100%; border-left: 0; border-top: 1px solid var(--line); transform: translateY(100%); border-radius: 14px 14px 0 0; }
		.panel.open { transform: none; }
		.paneltoggle { top: auto; bottom: 4.2rem; }
		.paneltoggle:has(+ .panel.open) { right: 0.6rem; bottom: calc(58% + 0.5rem); }
		.lname { display: none; }
		.date { min-width: 0; }
		.brand .small { display: none; }
		.modebar { bottom: 0.4rem; }
		.timeline-bar { bottom: 3.4rem; width: calc(100% - 1rem); }
	}
</style>
