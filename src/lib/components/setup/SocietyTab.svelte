<script lang="ts">
	import { SPHERE_SETS } from '#lib/gen/options';
	import { SPHERES } from '#lib/gen/spheres';
	import LockButton from './LockButton.svelte';
	import type { SetupStore } from './store.svelte';

	let { store }: { store: SetupStore } = $props();

	const autoCultures = $derived(Math.max(5, Math.round(store.s.states * 0.75)));
	const autoBurgs = $derived(Math.round(store.s.cells / 45) + store.s.states);
</script>

<section class="panel-card society-sec">
	<div class="panel-header">
		<h2>👥 Societies, Faiths & Spheres</h2>
		<span class="panel-sub">Set population density, realm counts, and cultural language families</span>
	</div>

	<div class="grid-pair">
		<div class="field">
			<div class="field-head">
				<div class="field-title">
					<LockButton {store} k="states" />
					<label for="f-states">States Count</label>
				</div>
				<span class="field-badge">{store.s.states} realms</span>
			</div>
			<div class="field-input">
				<input id="f-states" type="range" min="2" max="80" bind:value={store.s.states} />
			</div>
		</div>

		<div class="field">
			<div class="field-head">
				<div class="field-title">
					<LockButton {store} k="cultures" />
					<label for="f-cultures">Cultures Count</label>
				</div>
				<span class="field-badge">{store.s.cultures || `Auto (${autoCultures})`}</span>
			</div>
			<div class="field-input">
				<input id="f-cultures" type="range" min="0" max="40" bind:value={store.s.cultures} />
			</div>
		</div>
	</div>

	<div class="grid-pair">
		<div class="field">
			<div class="field-head">
				<div class="field-title">
					<label for="f-burgs">Settlements (Burgs)</label>
				</div>
				<span class="field-badge">{store.s.burgs || `Auto (${autoBurgs})`}</span>
			</div>
			<div class="field-input">
				<input id="f-burgs" type="range" min="0" max="2000" step="10" bind:value={store.s.burgs} />
			</div>
		</div>

		<div class="field">
			<div class="field-head">
				<div class="field-title">
					<LockButton {store} k="religions" />
					<label for="f-religions">Religions Count</label>
				</div>
				<span class="field-badge">{store.s.religions || 'Auto'}</span>
			</div>
			<div class="field-input">
				<input id="f-religions" type="range" min="0" max="30" bind:value={store.s.religions} />
			</div>
		</div>
	</div>

	<div class="grid-pair">
		<div class="field">
			<div class="field-head">
				<div class="field-title">
					<LockButton {store} k="sizeVariety" />
					<label for="f-variety">Realm Size Variety</label>
				</div>
				<span class="field-badge">{store.s.sizeVariety} / 10</span>
			</div>
			<div class="field-input">
				<input id="f-variety" type="range" min="0" max="10" bind:value={store.s.sizeVariety} />
			</div>
		</div>

		<div class="field">
			<div class="field-head">
				<div class="field-title">
					<LockButton {store} k="growth" />
					<label for="f-growth">Expansion Rate</label>
				</div>
				<span class="field-badge">×{store.s.growth}</span>
			</div>
			<div class="field-input">
				<input id="f-growth" type="range" min="0.2" max="3" step="0.1" bind:value={store.s.growth} />
			</div>
		</div>
	</div>

	<div class="field mt-sm">
		<div class="field-head">
			<div class="field-title">
				<LockButton {store} k="sphereSet" />
				<label for="f-sphereset">Cultures Regional Set</label>
			</div>
			<span class="field-badge">{store.s.sphereSet}</span>
		</div>
		<div class="field-input">
			<select id="f-sphereset" value={store.s.sphereSet} onchange={(e) => store.setSphereSet((e.currentTarget as HTMLSelectElement).value)}>
				{#each Object.keys(SPHERE_SETS) as k (k)}
					<option value={k}>{k === 'All' ? 'All Spheres (Placed by Climate)' : `${k} Set`}</option>
				{/each}
				<option value="Custom">Custom Sphere Selection…</option>
			</select>
		</div>
	</div>

	<div class="spheres-section">
		<div class="spheres-head">
			<span class="sub-label">Active spheres ({store.s.spheres ? store.s.spheres.length : SPHERES.length} of {SPHERES.length}):</span>
			<div class="spheres-actions">
				<button type="button" class="btn tiny" onclick={() => { store.s.sphereSet = 'Custom'; store.s.spheres = SPHERES.map((x) => x.id); }}>All</button>
				<button type="button" class="btn tiny" onclick={() => { store.s.sphereSet = 'Custom'; store.s.spheres = []; }}>None</button>
			</div>
		</div>
		<div class="spheres-grid">
			{#each SPHERES as sp (sp.id)}
				{@const active = !store.s.spheres || store.s.spheres.includes(sp.id)}
				<button
					type="button"
					class="sphere-chip"
					class:on={active}
					onclick={() => store.toggleSphere(sp.id)}
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
