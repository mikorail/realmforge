<script lang="ts">
	import type { HistorySnapshot } from '#lib/sim/types';
	import type { Simulation } from '#lib/sim/engine';
	import {
		compareTimelines,
		forkFromSnapshot,
		runForkYears,
		type TimelineComparison
	} from '#lib/sim/timeline_fork';

	let {
		sim,
		snapshots,
		currentYear,
		onpreview
	}: {
		sim?: Simulation;
		snapshots: HistorySnapshot[];
		currentYear: number;
		onpreview: (snap: HistorySnapshot | null) => void;
	} = $props();

	let selectedIndex = $state<number>(-1); // -1 means Live
	let drawerOpen = $state(false);
	let divergenceLabel = $state('Alternate History');
	let forkYears = $state(15);
	let comparison = $state<TimelineComparison | null>(null);
	let forkError = $state('');

	const activeSnapshot = $derived.by(() => {
		if (selectedIndex < 0 || selectedIndex >= snapshots.length) return null;
		return snapshots[selectedIndex];
	});

	const targetSnapIndex = $derived.by(() => {
		if (selectedIndex >= 0 && selectedIndex < snapshots.length) return selectedIndex;
		return Math.max(0, snapshots.length - 1);
	});

	function onChange(e: Event) {
		const val = +(e.target as HTMLInputElement).value;
		if (val >= snapshots.length) {
			selectedIndex = -1;
			onpreview(null);
		} else {
			selectedIndex = val;
			onpreview(snapshots[val]);
		}
	}

	function resetLive() {
		selectedIndex = -1;
		onpreview(null);
	}

	function openForkDrawer() {
		drawerOpen = true;
		forkError = '';
		if (!comparison) {
			runWhatIfFork();
		}
	}

	function runWhatIfFork() {
		if (!sim || !snapshots.length) return;
		forkError = '';
		try {
			const fork = forkFromSnapshot(sim, targetSnapIndex, divergenceLabel);
			runForkYears(fork, forkYears);
			comparison = compareTimelines(sim, fork);
		} catch (err) {
			forkError = err instanceof Error ? err.message : 'Unable to fork timeline.';
		}
	}

	function signed(n: number): string {
		if (n > 0) return `+${n}`;
		return `${n}`;
	}
</script>

<div class="scrubber" role="region" aria-label="Chronicle timeline playback">
	<div class="scrub-head">
		<div class="scrub-title">
			<strong>{activeSnapshot ? `Year ${activeSnapshot.year} Archive` : `Live: Year ${currentYear}`}</strong>
			{#if activeSnapshot}
				<span class="chip warn">Historical Preview</span>
				<span class="small muted">{activeSnapshot.activeRealms} realms · {activeSnapshot.activeWars} wars</span>
			{:else}
				<span class="chip on">Real-time</span>
			{/if}
		</div>
		<div class="scrub-actions">
			{#if sim && snapshots.length > 0}
				<button class="btn small fork-btn" onclick={openForkDrawer}>
					Fork Timeline (What-If)
				</button>
			{/if}
			{#if activeSnapshot}
				<button class="btn small" onclick={resetLive}>Return to Live</button>
			{/if}
		</div>
	</div>

	{#if snapshots.length > 1}
		<div class="slider-row">
			<span class="tiny muted">{snapshots[0].year}</span>
			<input
				type="range"
				min="0"
				max={snapshots.length}
				value={selectedIndex < 0 ? snapshots.length : selectedIndex}
				oninput={onChange}
				aria-label="Timeline year scrubber"
			/>
			<span class="tiny muted">{currentYear}</span>
		</div>
	{:else}
		<p class="tiny muted">Simulate forward to record chronicle snapshots for timeline playback.</p>
	{/if}

	{#if drawerOpen && sim}
		<div class="fork-drawer" role="region" aria-label="What-If timeline fork comparison">
			<div class="fork-head">
				<strong>What-If Fork from Year {snapshots[targetSnapIndex]?.year ?? currentYear}</strong>
				<button class="btn small" onclick={() => (drawerOpen = false)} aria-label="Close fork comparison">Close</button>
			</div>

			<div class="fork-controls">
				<label class="tiny">
					Label
					<input type="text" bind:value={divergenceLabel} maxlength="40" />
				</label>
				<label class="tiny">
					Advance
					<select bind:value={forkYears}>
						<option value={10}>10 yrs</option>
						<option value={15}>15 yrs</option>
						<option value={25}>25 yrs</option>
						<option value={50}>50 yrs</option>
					</select>
				</label>
				<button class="btn small fork-btn" onclick={runWhatIfFork}>Run Fork</button>
			</div>

			{#if forkError}
				<p class="tiny err">{forkError}</p>
			{/if}

			{#if comparison}
				<div class="compare-grid">
					<div class="compare-col">
						<div class="col-title">Original (Year {comparison.original.year})</div>
						<div class="stat"><span>Surviving realms</span><strong>{comparison.original.survivingRealms}</strong></div>
						<div class="stat"><span>Territory cells</span><strong>{comparison.original.totalCells}</strong></div>
						<div class="stat"><span>Population</span><strong>{comparison.original.totalPop}</strong></div>
						<div class="stat"><span>Wars (total / active)</span><strong>{comparison.original.totalWars} / {comparison.original.activeWars}</strong></div>
					</div>
					<div class="compare-col alt">
						<div class="col-title">Fork: {comparison.divergenceLabel} (Year {comparison.fork.year})</div>
						<div class="stat">
							<span>Surviving realms</span>
							<strong>{comparison.fork.survivingRealms} <em class="delta">({signed(comparison.deltas.survivingRealms)})</em></strong>
						</div>
						<div class="stat">
							<span>Territory cells</span>
							<strong>{comparison.fork.totalCells} <em class="delta">({signed(comparison.deltas.totalCells)})</em></strong>
						</div>
						<div class="stat">
							<span>Population</span>
							<strong>{comparison.fork.totalPop} <em class="delta">({signed(comparison.deltas.totalPop)})</em></strong>
						</div>
						<div class="stat">
							<span>Wars (total / active)</span>
							<strong>{comparison.fork.totalWars} / {comparison.fork.activeWars} <em class="delta">({signed(comparison.deltas.totalWars)})</em></strong>
						</div>
					</div>
				</div>

				{#if comparison.realmDiffs.length > 0}
					<div class="diff-section">
						<div class="section-label">Notable Realm Shifts</div>
						<div class="diff-list">
							{#each comparison.realmDiffs.slice(0, 5) as row (row.id)}
								<div class="diff-row tiny">
									<span class="rname">{row.name}</span>
									<span class="muted">{row.originalCells} -> {row.forkCells} cells</span>
									<strong class="delta">{signed(row.cellDelta)}</strong>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if comparison.divergentHighlights.length > 0}
					<div class="diff-section">
						<div class="section-label">Divergent Chronicle Highlights</div>
						<ul class="highlights">
							{#each comparison.divergentHighlights.slice(0, 6) as h, i (`${h.timeline}-${h.year}-${i}`)}
								<li class="tiny">
									<span class="chip" class:on={h.timeline === 'fork'} class:warn={h.timeline === 'original'}>
										{h.timeline === 'fork' ? 'Fork' : 'Orig'} Y{h.year}
									</span>
									<span>{h.text}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</div>

<style>
	.scrubber {
		background: var(--vellum);
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.5rem 0.8rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}
	.scrub-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.scrub-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.88rem;
	}
	.scrub-actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.slider-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	input[type='range'] {
		flex: 1;
		accent-color: var(--accent);
		cursor: pointer;
	}
	.fork-btn {
		border-color: var(--accent);
	}
	.fork-drawer {
		margin-top: 0.4rem;
		padding-top: 0.55rem;
		border-top: 1px solid var(--line);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 50vh;
		overflow-y: auto;
	}
	.fork-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.84rem;
	}
	.fork-controls {
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.fork-controls label {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.fork-controls input,
	.fork-controls select {
		background: var(--bg, rgba(0, 0, 0, 0.08));
		color: inherit;
		border: 1px solid var(--line);
		border-radius: 4px;
		padding: 0.2rem 0.4rem;
		font-size: 0.78rem;
	}
	.compare-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.5rem;
	}
	.compare-col {
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 0.45rem 0.55rem;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.compare-col.alt {
		border-color: var(--accent);
	}
	.col-title {
		font-size: 0.76rem;
		font-weight: 700;
		margin-bottom: 0.15rem;
	}
	.stat {
		display: flex;
		justify-content: space-between;
		gap: 0.4rem;
		font-size: 0.75rem;
	}
	.delta {
		font-style: normal;
		opacity: 0.85;
	}
	.diff-section {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.section-label {
		font-size: 0.74rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		opacity: 0.8;
	}
	.diff-list {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.diff-row {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.rname {
		font-weight: 600;
	}
	.highlights {
		margin: 0;
		padding-left: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.highlights li {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		line-height: 1.3;
	}
	.err {
		color: #d9534f;
	}
	.chip {
		font-size: 0.7rem;
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
		white-space: nowrap;
	}
	.chip.warn {
		background: #f7d774;
		color: #1b140c;
		font-weight: 600;
	}
	.chip.on {
		background: var(--accent);
		color: var(--ink);
	}
	.small {
		font-size: 0.8rem;
	}
	.tiny {
		font-size: 0.72rem;
	}
</style>
