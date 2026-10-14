<script lang="ts">
	import type { HistorySnapshot } from '#lib/sim/types';

	let {
		snapshots,
		currentYear,
		onpreview
	}: {
		snapshots: HistorySnapshot[];
		currentYear: number;
		onpreview: (snap: HistorySnapshot | null) => void;
	} = $props();

	let selectedIndex = $state<number>(-1); // -1 means Live

	const activeSnapshot = $derived.by(() => {
		if (selectedIndex < 0 || selectedIndex >= snapshots.length) return null;
		return snapshots[selectedIndex];
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
		{#if activeSnapshot}
			<button class="btn small" onclick={resetLive}>Return to Live</button>
		{/if}
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
	}
	.scrub-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.88rem;
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
	.chip {
		font-size: 0.7rem;
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
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
