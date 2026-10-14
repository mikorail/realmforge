<script lang="ts">
	import { GENRES } from '#lib/gen/genre';
	import { TEMPLATE_NAMES } from '#lib/gen/heightmap';
	import { PLANETS } from '#lib/gen/physical';
	import { PRESETS, type Preset } from './presets';
	import type { SetupStore } from './store.svelte';

	let { store, onforge }: { store: SetupStore; onforge: () => void } = $props();

	let applied = $state('');
	const appliedName = $derived(PRESETS.find((p) => p.id === applied)?.name ?? '');

	function apply(p: Preset) {
		store.applyPreset(p);
		applied = p.id;
	}
	function forge(p: Preset) {
		apply(p);
		onforge();
	}
</script>

<section class="panel-card gallery-sec">
	<div class="panel-header">
		<h2>🧭 Seed Gallery</h2>
		<span class="panel-sub">One click sets every option. Locked settings are kept, and you can tweak anything afterwards.</span>
	</div>
	<ul class="gallery">
		{#each PRESETS as p (p.id)}
			{@const o = p.options}
			<li class="preset" class:applied={applied === p.id} style="--ga:{GENRES[o.genre].accent}">
				<button type="button" class="preset-main" onclick={() => apply(p)} aria-pressed={applied === p.id}>
					<span class="preset-head"><span class="preset-icon" aria-hidden="true">{p.icon}</span><strong>{p.name}</strong></span>
					<span class="preset-blurb">{p.blurb}</span>
					<span class="preset-tags">
						<span class="tag">{GENRES[o.genre].name}</span>
						<span class="tag">{PLANETS[o.planet].name}</span>
						<span class="tag">{TEMPLATE_NAMES[o.template]}</span>
						<span class="tag">{o.states} realms</span>
					</span>
				</button>
				<button type="button" class="preset-go" onclick={() => forge(p)} aria-label="Apply {p.name} and forge the world">Forge now →</button>
			</li>
		{/each}
	</ul>
	<p class="muted small" role="status" aria-live="polite">{appliedName ? `${appliedName} applied. Press Forge the world, or adjust the other tabs first.` : 'Pick a preset, or skip to the other tabs to build your own.'}</p>
</section>

<style>
	.gallery { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr)); gap: 0.65rem; }
	.preset { display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: 10px; background: rgba(0, 0, 0, 0.3); overflow: hidden; }
	.preset:hover, .preset:focus-within { border-color: var(--ga); }
	.preset.applied { border-color: var(--ga); box-shadow: 0 0 0 1px var(--ga); background: color-mix(in srgb, var(--ga) 12%, rgba(0, 0, 0, 0.4)); }
	.preset-main { flex: 1; text-align: left; background: transparent; border: 0; padding: 0.7rem 0.8rem 0.4rem; display: flex; flex-direction: column; gap: 0.35rem; color: inherit; min-height: 40px; }
	.preset-head { display: flex; align-items: center; gap: 0.45rem; font-family: var(--title); color: var(--ga); font-size: 0.98rem; }
	.preset-icon { font-size: 1.2rem; }
	.preset-blurb { font-size: 0.86rem; color: var(--muted); line-height: 1.3; }
	.preset-tags { display: flex; flex-wrap: wrap; gap: 0.25rem; }
	.preset-go { border: 0; border-top: 1px solid var(--line); background: transparent; color: var(--ga); text-align: right; padding: 0 0.8rem; min-height: 40px; font-size: 0.86rem; font-weight: 600; }
	.preset-go:hover { background: color-mix(in srgb, var(--ga) 14%, transparent); }
	.preset-main:focus-visible, .preset-go:focus-visible { outline-offset: -3px; }
</style>
