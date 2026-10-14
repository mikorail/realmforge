<script lang="ts">
	import { GENRES } from '#lib/gen/genre';
	import type { Universe } from '#lib/gen/universe';
	import { deleteSave, listSaves, loadGame, type SaveMeta } from '#lib/save';
	import { Cosmos } from '#lib/sim/cosmos';
	import { onMount } from 'svelte';
	import './setup/setup.css';
	import './setup/layout.css';
	import ActionBar from './setup/ActionBar.svelte';
	import ClimateTab from './setup/ClimateTab.svelte';
	import GenreTab from './setup/GenreTab.svelte';
	import LayersTab from './setup/LayersTab.svelte';
	import MapTab from './setup/MapTab.svelte';
	import PresetGallery from './setup/PresetGallery.svelte';
	import ProgressOverlay from './setup/ProgressOverlay.svelte';
	import SavesTab from './setup/SavesTab.svelte';
	import SetupTabs, { type TabDef } from './setup/SetupTabs.svelte';
	import SocietyTab from './setup/SocietyTab.svelte';
	import { SetupStore } from './setup/store.svelte';

	let { onready }: { onready: (c: Cosmos) => void } = $props();

	/** all generator settings, locks, presets and persistence (`localStorage['realmforge:setup']`) live in the store */
	const store = new SetupStore();
	let busy = $state(false);
	let stage = $state('');
	let pct = $state(0);
	let saves = $state<SaveMeta[]>([]);
	let activeTab = $state('gallery');
	let viewMode = $state<'tabs' | 'all'>('tabs');

	onMount(async () => {
		store.restore();
		saves = await listSaves();
	});

	$effect(() => store.persist());

	const tabs = $derived<TabDef[]>([
		{ id: 'gallery', icon: '🧭', label: 'Gallery' },
		{ id: 'genre', icon: '🎭', label: 'Genre' },
		{ id: 'map', icon: '🗺️', label: 'World' },
		{ id: 'climate', icon: '🌐', label: 'Climate' },
		{ id: 'society', icon: '👥', label: 'Societies' },
		{ id: 'layers', icon: '⛏️', label: 'Planes' },
		...(saves.length > 0 ? [{ id: 'saves', icon: '📜', label: `Chronicles (${saves.length})` }] : [])
	]);
	// a deleted last save must not leave the tab bar pointing at a missing tab
	$effect(() => {
		if (!tabs.some((t) => t.id === activeTab)) activeTab = 'gallery';
	});
	const show = (id: string) => viewMode === 'all' || activeTab === id;

	function generate() {
		busy = true;
		stage = 'Weaving tectonic plates';
		pct = 0.05;
		const { planets, sphereSet: _set, ...opts } = $state.snapshot(store.s);
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

	async function remove(slot: string) {
		await deleteSave(slot);
		saves = await listSaves();
	}

	const g = $derived(GENRES[store.s.genre]);
</script>

<div class="setup" style="--accent:{g.accent}">
	<header class="hero">
		<div class="brand-row">
			<span class="realm-rune" aria-hidden="true">◈</span>
			<h1>Realmforge</h1>
			<span class="realm-rune" aria-hidden="true">◈</span>
		</div>
		<p class="subtitle">Procedural world atlas and living-world simulator. Forge realms, shape continents, and observe history.</p>
		<button type="button" class="skip" onclick={() => document.getElementById('forge-btn')?.focus()}>Skip to Forge</button>
	</header>

	{#if busy}
		<ProgressOverlay {stage} {pct} />
	{:else}
		<SetupTabs {tabs} bind:active={activeTab} bind:viewMode />

		<main id="setup-panel" class="sections-container" class:studio-view={viewMode === 'all'} role={viewMode === 'tabs' ? 'tabpanel' : undefined} aria-labelledby={viewMode === 'tabs' ? `tab-${activeTab}` : undefined}>
			{#if show('gallery')}<PresetGallery {store} onforge={generate} />{/if}
			{#if show('genre')}<GenreTab {store} />{/if}
			{#if show('map')}<MapTab {store} />{/if}
			{#if show('climate')}<ClimateTab {store} />{/if}
			{#if show('society')}<SocietyTab {store} />{/if}
			{#if show('layers')}<LayersTab {store} />{/if}
			{#if (viewMode === 'all' && saves.length > 0) || activeTab === 'saves'}<SavesTab {saves} onload={load} ondelete={remove} />{/if}
		</main>

		<ActionBar {store} onforge={generate} />
	{/if}
</div>
