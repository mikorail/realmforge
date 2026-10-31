<script lang="ts">
	import { SPHERE_SETS } from '#lib/gen/options';
	import { SPHERES } from '#lib/gen/spheres';
	import { SPECIES, type SpeciesDef } from '#lib/gen/species';
	import type { LayerKind } from '#lib/gen/genre';
	import LockButton from './LockButton.svelte';
	import type { SetupStore } from './store.svelte';

	let { store }: { store: SetupStore } = $props();

	const autoCultures = $derived(Math.max(5, Math.round(store.s.states * 0.75)));
	const racialLabel = $derived(['None', 'Faint', 'Default', 'Marked', 'Strong'][Math.round((store.s.racialStrength ?? 1) * 2)]);
	const autoBurgs = $derived(Math.round(store.s.cells / 45) + store.s.states);

	const customRaces = $derived(store.s.races?.custom ?? []);
	const allSpecies = $derived<SpeciesDef[]>([...SPECIES, ...customRaces]);
	const isSingleRace = $derived(!!store.s.races?.allow && store.s.races.allow.length === 1);
	const raceMode = $derived<'all' | 'single' | 'custom'>(
		isSingleRace ? 'single' : (store.s.races?.allow ? 'custom' : 'all')
	);
	const singleRaceId = $derived(store.s.races?.allow?.[0] ?? 'human');

	let showCustomForm = $state(false);
	let newRaceName = $state('');
	let newRacePlural = $state('');
	let newRaceIcon = $state('✨');
	let newRaceLifespan = $state(1.0);
	let newRaceLayer = $state<LayerKind>('surface');
	let newRaceMartial = $state(0);
	let newRaceDiplomacy = $state(0);
	let newRaceStewardship = $state(0);
	let newRaceIntrigue = $state(0);
	let newRaceHealth = $state(0);

	function submitCustomRace() {
		if (!newRaceName.trim()) return;
		store.addCustomRace({
			name: newRaceName.trim(),
			plural: newRacePlural.trim() || `${newRaceName.trim()}s`,
			icon: newRaceIcon.trim() || '✨',
			lifespanMult: Number(newRaceLifespan) || 1.0,
			layers: [newRaceLayer],
			mods: {
				martial: Number(newRaceMartial) || 0,
				diplomacy: Number(newRaceDiplomacy) || 0,
				stewardship: Number(newRaceStewardship) || 0,
				intrigue: Number(newRaceIntrigue) || 0,
				health: Number(newRaceHealth) || 0
			}
		});
		newRaceName = '';
		newRacePlural = '';
		newRaceIcon = '✨';
		newRaceLifespan = 1.0;
		newRaceLayer = 'surface';
		newRaceMartial = 0;
		newRaceDiplomacy = 0;
		newRaceStewardship = 0;
		newRaceIntrigue = 0;
		newRaceHealth = 0;
		showCustomForm = false;
	}
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
					<label for="f-racial">Racial Advantage</label>
				</div>
				<span class="field-badge">{racialLabel}</span>
			</div>
			<div class="field-input">
				<input id="f-racial" type="range" min="0" max="2" step="0.5" value={store.s.racialStrength ?? 1} oninput={(e) => (store.s.racialStrength = Number(e.currentTarget.value))} />
			</div>
		</div>

		<div class="field">
			<div class="field-head">
				<div class="field-title">
					<label for="f-sentiment">Feelings Between Peoples</label>
				</div>
				<span class="field-badge">{store.s.sentiment === false ? 'Off' : 'On'}</span>
			</div>
			<div class="field-input">
				<label class="evolve"><input id="f-sentiment" type="checkbox" checked={store.s.sentiment !== false} onchange={(e) => (store.s.sentiment = e.currentTarget.checked)} /> Grudges, gratitude and feuds</label>
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

	<div class="races-section">
		<div class="races-head">
			<div>
				<h3 class="races-title">🧬 Inhabitants & Races</h3>
				<span class="sub-label">Choose species composition, mono-species worlds, or forge custom races</span>
			</div>
			<div class="mode-pills">
				<button
					type="button"
					class="mode-pill"
					class:active={raceMode === 'all'}
					onclick={() => store.setRaceMode('all')}
				>
					All Species
				</button>
				<button
					type="button"
					class="mode-pill"
					class:active={raceMode === 'single'}
					onclick={() => store.setRaceMode('single', singleRaceId)}
				>
					Single Race
				</button>
				<button
					type="button"
					class="mode-pill"
					class:active={raceMode === 'custom'}
					onclick={() => store.setRaceMode('custom')}
				>
					Custom Selection
				</button>
			</div>
		</div>

		{#if raceMode === 'single'}
			<div class="single-race-card">
				<label for="f-singlerace" class="single-label">Dominant World Inhabitant:</label>
				<select
					id="f-singlerace"
					class="single-select"
					value={singleRaceId}
					onchange={(e) => store.setRaceMode('single', (e.currentTarget as HTMLSelectElement).value)}
				>
					{#each allSpecies as sp (sp.id)}
						<option value={sp.id}>{sp.icon} {sp.name} ({sp.plural}) - {sp.lifespanMult}× lifespan, {sp.layers.join(', ')}</option>
					{/each}
				</select>
				<span class="single-hint">Every culture and kingdom in this realm will be founded by this species alone.</span>
			</div>
		{:else}
			<div class="races-grid">
				{#each allSpecies as sp (sp.id)}
					{@const allowed = store.isRaceAllowed(sp.id)}
					<div class="race-item" class:on={allowed}>
						<button
							type="button"
							class="race-chip"
							class:on={allowed}
							onclick={() => {
								if (raceMode === 'all') store.setRaceMode('custom');
								store.toggleRace(sp.id);
							}}
							title="{sp.desc} · Planes: {sp.layers.join(', ')} · Lifespan: {sp.lifespanMult}×"
							aria-pressed={allowed}
						>
							<span class="race-icon">{sp.icon}</span>
							<span class="race-name">{sp.name}</span>
							<span class="race-lifespan">{sp.lifespanMult}×</span>
						</button>
						<button
							type="button"
							class="solo-btn"
							title="Make world populated only by {sp.plural}"
							onclick={() => store.setRaceMode('single', sp.id)}
						>
							Solo
						</button>
					</div>
				{/each}
			</div>
		{/if}

		{#if customRaces.length > 0}
			<div class="custom-races-list">
				<span class="sub-label">Forged custom races ({customRaces.length}):</span>
				<div class="custom-chips">
					{#each customRaces as cr (cr.id)}
						<div class="custom-race-tag">
							<span>{cr.icon} {cr.name} ({cr.lifespanMult}×)</span>
							<button
								type="button"
								class="delete-race-btn"
								title="Delete {cr.name}"
								onclick={() => store.removeCustomRace(cr.id)}
							>
								✕
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<div class="custom-forge-toggle">
			<button
				type="button"
				class="btn forge-toggle-btn"
				onclick={() => { showCustomForm = !showCustomForm; }}
			>
				{showCustomForm ? '▾ Close Race Forge' : '+ Forge Custom Race'}
			</button>
		</div>

		{#if showCustomForm}
			<div class="custom-race-form">
				<div class="form-row">
					<label class="form-field">
						<span>Species Name</span>
						<input type="text" placeholder="e.g. Draconian" bind:value={newRaceName} />
					</label>
					<label class="form-field">
						<span>Plural Name</span>
						<input type="text" placeholder="e.g. Draconians" bind:value={newRacePlural} />
					</label>
					<label class="form-field icon-field">
						<span>Icon / Emoji</span>
						<input type="text" maxlength="4" placeholder="✨" bind:value={newRaceIcon} />
					</label>
				</div>

				<div class="form-row">
					<label class="form-field">
						<span>Native Plane</span>
						<select bind:value={newRaceLayer}>
							<option value="surface">Surface</option>
							<option value="deep">Deep Caverns</option>
							<option value="sky">Sky Islands</option>
							<option value="sea">Sunken Sea</option>
						</select>
					</label>
					<label class="form-field">
						<span>Lifespan: ×{newRaceLifespan}</span>
						<input type="range" min="0.4" max="5.0" step="0.1" bind:value={newRaceLifespan} />
					</label>
				</div>

				<div class="form-stats-box">
					<span class="sub-label">Stat Modifiers (War, Diplomacy, Stewardship, Intrigue, Health):</span>
					<div class="stats-row">
						<label>
							<span>Martial: {newRaceMartial > 0 ? `+${newRaceMartial}` : newRaceMartial}</span>
							<input type="range" min="-3" max="5" bind:value={newRaceMartial} />
						</label>
						<label>
							<span>Diplo: {newRaceDiplomacy > 0 ? `+${newRaceDiplomacy}` : newRaceDiplomacy}</span>
							<input type="range" min="-3" max="5" bind:value={newRaceDiplomacy} />
						</label>
						<label>
							<span>Steward: {newRaceStewardship > 0 ? `+${newRaceStewardship}` : newRaceStewardship}</span>
							<input type="range" min="-3" max="5" bind:value={newRaceStewardship} />
						</label>
						<label>
							<span>Intrigue: {newRaceIntrigue > 0 ? `+${newRaceIntrigue}` : newRaceIntrigue}</span>
							<input type="range" min="-3" max="5" bind:value={newRaceIntrigue} />
						</label>
						<label>
							<span>Health: +{newRaceHealth}</span>
							<input type="range" min="0" max="35" step="5" bind:value={newRaceHealth} />
						</label>
					</div>
				</div>

				<button
					type="button"
					class="btn primary create-race-btn"
					disabled={!newRaceName.trim()}
					onclick={submitCustomRace}
				>
					Add {newRaceName.trim() || 'Species'} to World
				</button>
			</div>
		{/if}
	</div>

	<label class="evolve mt-md">
		<input type="checkbox" checked={store.s.motives !== false} onchange={(e) => (store.s.motives = (e.currentTarget as HTMLInputElement).checked)} />
		<span><strong>Ruler motives</strong> <span class="muted">Each ruler is driven by an aim: vengeance, faith, glory, gold, legacy, survival, knowledge or dynasty. It shapes their wars, peace, treaties and monuments, and may pass to an heir.</span></span>
	</label>

	<label class="evolve mt-md" for="f-forces">
		<span><strong>Genre forces</strong> <span class="muted">Pressures of the age: smog and strikes (steam, diesel), war economy (diesel), arms race and fallout (atom), megacorps (cyber), green commons (solar), gene vats (bio), leylines (fantasy, mythic). They follow the voice of the age.</span></span>
		<select id="f-forces" value={String(store.s.genreForces ?? 1)} onchange={(e) => (store.s.genreForces = Number(e.currentTarget.value))}>
			<option value="0">Off</option>
			<option value="0.5">Faint</option>
			<option value="1">Default</option>
			<option value="1.5">Marked</option>
			<option value="2">Strong</option>
		</select>
	</label>
</section>

<style>
	.races-section {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		margin-top: 0.75rem;
		background: rgba(0, 0, 0, 0.22);
		border: 1px solid var(--line);
		border-radius: 9px;
		padding: 0.85rem;
	}
	.races-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.races-title {
		font-size: 0.95rem;
		margin: 0;
		font-family: var(--title);
		color: var(--accent);
	}
	.mode-pills {
		display: flex;
		gap: 0.25rem;
		background: rgba(0, 0, 0, 0.35);
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.15rem;
	}
	.mode-pill {
		background: transparent;
		border: none;
		border-radius: 6px;
		padding: 0.25rem 0.65rem;
		font-size: 0.78rem;
		color: var(--muted);
		cursor: pointer;
		transition: all 0.15s;
	}
	.mode-pill:hover {
		color: #f3e9d2;
	}
	.mode-pill.active {
		background: color-mix(in srgb, var(--accent) 22%, transparent);
		color: var(--accent);
		font-weight: 600;
	}
	.single-race-card {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.75rem;
	}
	.single-label {
		font-size: 0.85rem;
		color: var(--muted);
		font-weight: 500;
	}
	.single-select {
		background: rgba(0, 0, 0, 0.45);
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 0.45rem 0.65rem;
		color: #f3e9d2;
		font-size: 0.9rem;
	}
	.single-hint {
		font-size: 0.78rem;
		color: var(--muted);
	}
	.races-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(135px, 1fr));
		gap: 0.35rem;
	}
	.race-item {
		display: flex;
		align-items: center;
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid var(--line);
		border-radius: 8px;
		overflow: hidden;
		transition: all 0.15s;
	}
	.race-item.on {
		border-color: rgba(243, 233, 210, 0.3);
		background: rgba(0, 0, 0, 0.35);
	}
	.race-chip {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		background: transparent;
		border: none;
		padding: 0.35rem 0.45rem;
		font-size: 0.78rem;
		color: var(--muted);
		cursor: pointer;
		text-align: left;
		min-width: 0;
	}
	.race-chip.on {
		color: var(--accent);
		font-weight: 600;
	}
	.race-icon {
		font-size: 0.9rem;
	}
	.race-name {
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.race-lifespan {
		font-size: 0.7rem;
		opacity: 0.75;
		font-variant-numeric: tabular-nums;
	}
	.solo-btn {
		background: transparent;
		border: none;
		border-left: 1px solid var(--line);
		padding: 0.35rem 0.45rem;
		font-size: 0.68rem;
		color: var(--muted);
		cursor: pointer;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.solo-btn:hover {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
	}
	.custom-races-list {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-top: 0.25rem;
	}
	.custom-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.custom-race-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid var(--accent);
		border-radius: 6px;
		padding: 0.2rem 0.5rem;
		font-size: 0.76rem;
		color: var(--accent);
	}
	.delete-race-btn {
		background: transparent;
		border: none;
		color: var(--muted);
		cursor: pointer;
		padding: 0 0.15rem;
		font-size: 0.75rem;
	}
	.delete-race-btn:hover {
		color: #e06050;
	}
	.custom-forge-toggle {
		display: flex;
		justify-content: flex-end;
		margin-top: 0.25rem;
	}
	.forge-toggle-btn {
		font-size: 0.8rem;
		padding: 0.3rem 0.75rem;
	}
	.custom-race-form {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		background: rgba(0, 0, 0, 0.35);
		border: 1px solid var(--accent);
		border-radius: 8px;
		padding: 0.75rem;
		margin-top: 0.25rem;
	}
	.form-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
		gap: 0.5rem;
	}
	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.78rem;
		color: var(--muted);
	}
	.form-field input,
	.form-field select {
		background: rgba(0, 0, 0, 0.45);
		border: 1px solid var(--line);
		border-radius: 5px;
		padding: 0.35rem 0.5rem;
		color: #f3e9d2;
		font-size: 0.82rem;
	}
	.icon-field input {
		text-align: center;
	}
	.form-stats-box {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 6px;
		padding: 0.5rem;
	}
	.stats-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
		gap: 0.4rem;
	}
	.stats-row label {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		font-size: 0.74rem;
		color: var(--muted);
	}
	.stats-row input[type='range'] {
		accent-color: var(--accent);
	}
	.create-race-btn {
		align-self: flex-end;
		font-size: 0.82rem;
		padding: 0.4rem 0.9rem;
	}
</style>
