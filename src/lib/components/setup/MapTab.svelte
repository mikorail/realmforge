<script lang="ts">
	import { TEMPLATE_NAMES } from '#lib/gen/heightmap';
	import { decodeHeightImage } from './imageGrid';
	import LockButton from './LockButton.svelte';
	import PlanetsSection from './PlanetsSection.svelte';
	import { POINTS, rndSeed, SIZES, type SetupStore } from './store.svelte';

	let { store }: { store: SetupStore } = $props();

	let imageError = $state('');
	async function pickImage(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const f = input.files?.[0];
		if (!f) return;
		try {
			store.heightImage = await decodeHeightImage(f);
			store.heightImageName = f.name;
			imageError = '';
		} catch {
			imageError = 'That file could not be read as an image.';
		}
		input.value = '';
	}
	function clearImage() {
		store.heightImage = null;
		store.heightImageName = '';
	}

	const pointIdx =$derived(Math.max(0, POINTS.findIndex((p) => p >= store.s.cells)));
</script>

<section class="panel-card map-sec">
	<div class="panel-header">
		<h2>🗺️ Map Canvas & Relief</h2>
		<span class="panel-sub">Configure seed, coordinate dimensions, Voronoi mesh, and landforms</span>
	</div>

	<div class="field">
		<div class="field-head">
			<div class="field-title">
				<LockButton {store} k="seed" />
				<label for="f-seed">World Seed</label>
			</div>
			<span class="field-badge">{store.s.seed}</span>
		</div>
		<div class="seed-row">
			<input id="f-seed" bind:value={store.s.seed} aria-label="World generation seed" />
			<button type="button" class="btn seed-roll" onclick={() => (store.s.seed = rndSeed())} aria-label="Roll new random seed" title="Roll new random seed">⟳ Roll</button>
		</div>
	</div>

	<div class="field">
		<div class="field-head">
			<div class="field-title">
				<span>Canvas Dimensions</span>
			</div>
			<span class="field-badge">{store.s.width} × {store.s.height} px</span>
		</div>
		<div class="dim-row">
			<div class="dim-inputs">
				<input type="number" min="400" max="6000" step="50" bind:value={store.s.width} class="num" aria-label="Map width in pixels" />
				<span class="dim-x">×</span>
				<input type="number" min="400" max="6000" step="50" bind:value={store.s.height} class="num" aria-label="Map height in pixels" />
				<span class="dim-unit">px</span>
			</div>
			<select class="dim-select" onchange={(e) => { const [w, h] = (e.currentTarget as HTMLSelectElement).value.split('x').map(Number); if (w) { store.s.width = w; store.s.height = h; } }} aria-label="Preset map dimensions">
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
				<span class="field-badge highlight">{store.s.cells >= 1000 ? `${store.s.cells / 1000}K` : store.s.cells} cells</span>
				<span class="perf-pill {store.s.cells <= 10000 ? 'rapid' : store.s.cells <= 40000 ? 'balanced' : 'heavy'}">
					{store.s.cells <= 10000 ? '⚡ Rapid (<0.5s)' : store.s.cells <= 40000 ? '⚖ Balanced (~1s)' : '🔥 Heavy detail (3s+)'}
				</span>
			</div>
		</div>
		<div class="field-input">
			<input id="f-points" type="range" min="0" max={POINTS.length - 1} value={pointIdx} oninput={(e) => (store.s.cells = POINTS[+(e.currentTarget as HTMLInputElement).value])} />
		</div>
		{#if store.s.cells > 60000}
			<p class="field-hint warn">Very dense meshes create intricate coasts but demand higher processing power.</p>
		{/if}
	</div>

	<div class="field">
		<div class="field-head">
			<div class="field-title">
				<LockButton {store} k="template" />
				<label for="f-template">Heightmap Template</label>
			</div>
			<span class="field-badge">{TEMPLATE_NAMES[store.s.template] ?? store.s.template}</span>
		</div>
		<div class="field-input">
			<select id="f-template" bind:value={store.s.template}>
				{#each Object.entries(TEMPLATE_NAMES) as [k, n] (k)}<option value={k}>{n}</option>{/each}
			</select>
		</div>
		{#if store.s.template === 'earth'}
			<p class="field-hint">Real continents and mountain belts. Pick Climate → Whole world to see all of it; smaller windows show a region.</p>
			<label class="evolve">
				<input type="checkbox" checked={!!store.s.flipX} onchange={(e) => (store.s.flipX = (e.currentTarget as HTMLInputElement).checked)} />
				<span><strong>Mirror east–west</strong> <span class="muted">Flips the world so it is not quite our Earth.</span></span>
			</label>
			<label class="evolve">
				<input type="checkbox" checked={!!store.s.flipY} onchange={(e) => (store.s.flipY = (e.currentTarget as HTMLInputElement).checked)} />
				<span><strong>Flip north–south</strong></span>
			</label>
		{:else if store.s.template === 'image'}
			<div class="field-input">
				<input id="f-heightimg" type="file" accept="image/png,image/jpeg" onchange={pickImage} aria-label="Import a heightmap image" />
			</div>
			{#if store.heightImage}
				<p class="field-hint">Custom image loaded: {store.heightImageName} ({store.heightImage.w}×{store.heightImage.h}). <button type="button" class="btn small danger" onclick={clearImage}>Remove</button></p>
			{:else}
				<p class="field-hint warn">{imageError || 'No image yet: until you import one, this forges Continents. Dark pixels become sea, bright ones land and mountains.'}</p>
			{/if}
			<label class="evolve">
				<input type="checkbox" checked={!!store.s.invertImage} onchange={(e) => (store.s.invertImage = (e.currentTarget as HTMLInputElement).checked)} />
				<span><strong>Invert</strong> <span class="muted">Bright is sea, dark is land.</span></span>
			</label>
			<p class="field-hint">The picture is not saved with settings or share links.</p>
		{/if}
	</div>

	<div class="grid-pair">
		<div class="field">
			<div class="field-head">
				<div class="field-title">
					<LockButton {store} k="seaLevel" />
					<label for="f-sea">Sea Level</label>
				</div>
				<span class="field-badge">{store.s.seaLevel > 0 ? `+${store.s.seaLevel}` : store.s.seaLevel}</span>
			</div>
			<div class="field-input">
				<input id="f-sea" type="range" min="-15" max="15" bind:value={store.s.seaLevel} />
			</div>
		</div>

		<div class="field">
			<div class="field-head">
				<div class="field-title">
					<LockButton {store} k="rivers" />
					<label for="f-rivers">Rivers Multiplier</label>
				</div>
				<span class="field-badge">×{store.s.rivers}</span>
			</div>
			<div class="field-input">
				<input id="f-rivers" type="range" min="0.25" max="3" step="0.05" bind:value={store.s.rivers} />
			</div>
		</div>
	</div>

	<div class="field">
		<div class="field-head">
			<div class="field-title">
				<label for="f-planets">Planets in Multiverse</label>
			</div>
			<span class="field-badge">{store.s.planets} {store.s.planets === 1 ? 'world' : 'worlds joined by rifts'}</span>
		</div>
		<div class="field-input">
			<input id="f-planets" type="range" min="1" max="5" bind:value={store.s.planets} />
		</div>
		{#if store.s.planets > 1}
			<p class="field-hint">Extra planets generate with unique biomes, connected via magical or spatial rifts.</p>
			<PlanetsSection {store} />
		{/if}
	</div>
	<label class="evolve mt-md">
		<input type="checkbox" checked={!!store.s.wrapX} onchange={(e) => { store.s.wrapX = (e.currentTarget as HTMLInputElement).checked; if (store.s.wrapX) store.s.width = store.s.height * 2; }} />
		<span><strong>Spherical world</strong> <span class="muted">Covers the whole globe at 2:1 and joins the east and west edges, so land, rivers, realms and armies wrap around. Use the Globe button in game to turn it around.</span></span>
	</label>
</section>

