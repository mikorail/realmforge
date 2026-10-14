<script lang="ts">
	import { GENRES } from '#lib/gen/genre';
	import LockButton from './LockButton.svelte';
	import type { SetupStore } from './store.svelte';

	let { store }: { store: SetupStore } = $props();

	const g = $derived(GENRES[store.s.genre]);
</script>

<section class="panel-card layers-sec">
	<div class="panel-header">
		<h2>⛏️ Dimensional Layers <LockButton {store} k="layers" /></h2>
		<span class="panel-sub">Simulate vertical depths, soaring sky isles, and deep sea shelves</span>
	</div>

	<div class="field">
		<div class="field-head">
			<div class="field-title">
				<label for="f-depth">{g.layerNames.deep} Levels</label>
			</div>
			<span class="field-badge">{store.s.depth} under-levels</span>
		</div>
		<div class="field-input">
			<input id="f-depth" type="range" min="0" max="6" bind:value={store.s.depth} />
		</div>
	</div>

	{#if store.s.depth > 0}
		<div class="field sub-field">
			<div class="field-head">
				<div class="field-title">
					<label for="f-deep-dens">{g.kinds.deep[0]} Density</label>
				</div>
				<span class="field-badge">×{store.s.density.deep}</span>
			</div>
			<div class="field-input">
				<input id="f-deep-dens" type="range" min="0.2" max="3" step="0.1" bind:value={store.s.density.deep} />
			</div>
			<div class="field-head">
				<div class="field-title"><label for="f-deep-det">Cavern detail</label></div>
				<span class="field-badge">×{store.s.layerDetail.deep}</span>
			</div>
			<div class="field-input">
				<input id="f-deep-det" type="range" min="0.5" max="2" step="0.1" bind:value={store.s.layerDetail.deep} />
			</div>
		</div>
	{/if}

	<div class="field-toggle-card" class:checked={store.s.sky}>
		<label class="check-label">
			<input type="checkbox" bind:checked={store.s.sky} />
			<span class="check-title">{g.layerNames.sky}</span>
			<span class="muted small">({g.kinds.sky.slice(0, 2).join(', ')})</span>
		</label>
		{#if store.s.sky}
			<div class="sub-slider">
				<span class="sub-badge">Density: ×{store.s.density.sky}</span>
				<input type="range" min="0.2" max="3" step="0.1" bind:value={store.s.density.sky} aria-label="Sky layer density" />
				<span class="sub-badge">Isle detail: ×{store.s.layerDetail.sky}</span>
				<input type="range" min="0.5" max="2" step="0.1" bind:value={store.s.layerDetail.sky} aria-label="Sky isle detail" />
			</div>
		{/if}
	</div>

	<div class="field-toggle-card" class:checked={store.s.sea}>
		<label class="check-label">
			<input type="checkbox" bind:checked={store.s.sea} />
			<span class="check-title">{g.layerNames.sea}</span>
			<span class="muted small">({g.kinds.sea.slice(0, 2).join(', ')})</span>
		</label>
		{#if store.s.sea}
			<div class="sub-slider">
				<span class="sub-badge">Density: ×{store.s.density.sea}</span>
				<input type="range" min="0.2" max="3" step="0.1" bind:value={store.s.density.sea} aria-label="Sea shelf density" />
				<span class="sub-badge">Shelf detail: ×{store.s.layerDetail.sea}</span>
				<input type="range" min="0.5" max="2" step="0.1" bind:value={store.s.layerDetail.sea} aria-label="Sea shelf detail" />
			</div>
		{/if}
	</div>
</section>
