<script lang="ts">
	import { GENRES } from '#lib/gen/genre';
	import { PLANETS } from '#lib/gen/physical';
	import type { PlanetKind } from '#lib/gen/types';
	import LockButton from './LockButton.svelte';
	import type { SetupStore } from './store.svelte';

	let { store }: { store: SetupStore } = $props();
</script>

<section class="panel-card genre-sec">
	<div class="panel-header">
		<h2>🎭 Genre & Aesthetic <LockButton {store} k="genre" /></h2>
		<span class="panel-sub">Select the cultural and technological foundation of the world</span>
	</div>
	<div class="genre-grid">
		{#each Object.values(GENRES) as gd (gd.id)}
			<button
				type="button"
				class="genre-card"
				class:selected={store.s.genre === gd.id}
				style="--ga:{gd.accent}"
				onclick={() => (store.s.genre = gd.id)}
				aria-pressed={store.s.genre === gd.id}
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
				<LockButton {store} k="planet" />
				<label for="f-planet">Planetary Sphere</label>
			</div>
			<span class="field-badge">{PLANETS[store.s.planet].name}</span>
		</div>
		<div class="field-input">
			<select id="f-planet" value={store.s.planet} onchange={(e) => store.setPlanet((e.currentTarget as HTMLSelectElement).value as PlanetKind)}>
				{#each Object.entries(PLANETS) as [k, p] (k)}
					<option value={k}>{p.name}: {p.desc}</option>
				{/each}
			</select>
		</div>
	</div>

	<label class="evolve mt-md">
		<input type="checkbox" checked={!!store.s.evolve} onchange={(e) => (store.s.evolve = (e.currentTarget as HTMLInputElement).checked)} />
		<span><strong>Evolving genre</strong> <span class="muted">The world's voice follows its tech era: mythic, fantasy, steampunk, dieselpunk, then cyberpunk or solarpunk depending on how it got there.</span></span>
	</label>
	<label class="evolve mt-md">
		<input type="checkbox" checked={store.s.sectors !== false} onchange={(e) => (store.s.sectors = (e.currentTarget as HTMLInputElement).checked)} />
		<span><strong>Economic sectors</strong> <span class="muted">Each town works its land: farms, mines, workshops, markets, academies, temples, barracks and harbours. The mix drifts with era, war and policy and nudges growth, income, armies and stability.</span></span>
	</label>
</section>
