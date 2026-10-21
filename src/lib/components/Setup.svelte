<script lang="ts">
	import { GENRES } from '#lib/gen/genre';
	import type { Universe } from '#lib/gen/universe';
	import { deleteSave, exportSave, importSave, listSaves, loadGame, lowStorageWarning, renameSave, type SaveMeta } from '#lib/save';
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

	let { onready }: { onready: (c: Cosmos, slot?: string) => void } = $props();
	let savesNote = $state('');

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
		{ id: 'saves', icon: '📜', label: saves.length ? `Chronicles (${saves.length})` : 'Chronicles' }
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
		const { planets, sphereSet: _set, planetOverrides, ageLockGenre: _ageGenre, ...opts } = $state.snapshot(store.s);
		void _set;
		void _ageGenre;
		// the age lock is stored as a number; absent means free, so unlocked worlds are generated exactly as before
		const age = store.resolvedAgeLock();
		if (age === null) delete opts.ageLock;
		else opts.ageLock = age;
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
		worker.postMessage({ opts: { ...opts, planetOverrides: (planetOverrides ?? []).slice(0, planets) }, planets });
	}

	async function load(slot: string) {
		busy = true;
		stage = 'Unrolling the ancient atlas';
		pct = 0.5;
		const c = await loadGame(slot);
		if (c) onready(c, slot);
		else {
			busy = false;
			savesNote = 'That save could not be loaded (its world data is missing or damaged).';
		}
	}

	async function remove(slot: string) {
		await deleteSave(slot);
		saves = await listSaves();
	}

	async function rename(slot: string, label: string) {
		await renameSave(slot, label);
		saves = await listSaves();
	}

	async function exportSlot(slot: string) {
		try {
			const f = await exportSave(slot);
			if (!f) throw new Error('Save not found.');
			const url = URL.createObjectURL(new Blob([f.bytes as BlobPart], { type: 'application/octet-stream' }));
			const a = document.createElement('a');
			a.href = url;
			a.download = f.filename;
			a.click();
			setTimeout(() => URL.revokeObjectURL(url), 2000);
			savesNote = `Exported ${f.filename}.`;
		} catch (e) {
			savesNote = `Export failed: ${(e as Error).message}`;
		}
	}

	async function importFile(file: File) {
		try {
			const m = await importSave(new Uint8Array(await file.arrayBuffer()));
			saves = await listSaves();
			savesNote = `Imported “${m.label ?? m.name}” (year ${m.year}).`;
			const low = await lowStorageWarning();
			if (low) savesNote += ` ${low}`;
		} catch (e) {
			savesNote = (e as Error).message;
		}
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
			{#if show('saves')}<SavesTab {saves} note={savesNote} onload={load} ondelete={remove} onrename={rename} onexport={exportSlot} onimport={importFile} />{/if}
		</main>

		<ActionBar {store} onforge={generate} />
	{/if}
</div>
