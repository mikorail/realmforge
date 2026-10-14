<script lang="ts">
	import { GENRES, type Genre } from '#lib/gen/genre';
	import { TEMPLATE_NAMES } from '#lib/gen/heightmap';
	import { PLANETS } from '#lib/gen/physical';
	import type { PlanetKind, Template } from '#lib/gen/types';
	import type { SetupStore } from './store.svelte';

	let { store }: { store: SetupStore } = $props();

	const extra = $derived(Array.from({ length: Math.max(0, store.s.planets - 1) }, (_, k) => k + 1));
	const get = (i: number) => store.s.planetOverrides?.[i] ?? {};
	const val = (e: Event) => (e.currentTarget as HTMLSelectElement).value;
	const num = (e: Event) => Number((e.currentTarget as HTMLInputElement).value);
</script>

<div class="planets-sec">
	<h3 class="planets-title">Planets <span class="muted small">(blank = rolled from the seed)</span></h3>
	{#each extra as i (i)}
		{@const o = get(i)}
		<fieldset class="planet-row">
			<legend>Planet {i + 1}</legend>
			<label>Kind
				<select value={o.planet ?? ''} onchange={(e) => store.setOverride(i, 'planet', (val(e) || undefined) as PlanetKind | undefined)}>
					<option value="">Rolled</option>
					{#each Object.entries(PLANETS) as [k, p] (k)}<option value={k}>{p.name}</option>{/each}
				</select>
			</label>
			<label>Template
				<select value={o.template ?? ''} onchange={(e) => store.setOverride(i, 'template', (val(e) || undefined) as Template | undefined)}>
					<option value="">Rolled</option>
					{#each Object.entries(TEMPLATE_NAMES) as [k, n] (k)}<option value={k}>{n}</option>{/each}
				</select>
			</label>
			<label>Genre
				<select value={o.genre ?? ''} onchange={(e) => store.setOverride(i, 'genre', (val(e) || undefined) as Genre | undefined)}>
					<option value="">Same as world</option>
					{#each Object.entries(GENRES) as [k, gd] (k)}<option value={k}>{gd.name}</option>{/each}
				</select>
			</label>
			<label>Realms
				<input type="number" min="0" max="60" placeholder="auto" value={o.states ?? ''} onchange={(e) => store.setOverride(i, 'states', num(e) > 0 ? num(e) : undefined)} />
			</label>
			<label>Layer detail ×{o.layerDetail?.deep ?? 1}
				<input type="range" min="0.5" max="2" step="0.1" value={o.layerDetail?.deep ?? 1} oninput={(e) => store.setOverrideDetail(i, num(e))} />
			</label>
		</fieldset>
	{/each}
</div>

<style>
	.planets-sec { margin-top: 0.75rem; }
	.planets-title { font-size: 0.9rem; margin: 0 0 0.4rem; }
	.planet-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: 0.5rem; margin: 0 0 0.5rem; padding: 0.5rem 0.6rem; border: 1px solid var(--border, #3a3a3a); border-radius: 6px; }
	.planet-row legend { font-size: 0.8rem; padding: 0 0.3rem; }
	.planet-row label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.75rem; }
</style>
