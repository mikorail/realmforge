<script lang="ts">
	let { stage, pct }: { stage: string; pct: number } = $props();
</script>

<div class="progress-overlay" role="status" aria-live="polite">
	<div class="progress-card">
		<div class="compass-spinner" aria-hidden="true">
			<div class="compass-core"></div>
			<div class="compass-ring"></div>
		</div>
		<h2>Forging the Cosmos</h2>
		<div class="bar-wrap">
			<div class="bar"><div style="width:{(pct * 100).toFixed(0)}%"></div></div>
		</div>
		<div class="progress-meta">
			<p class="stage-text">{stage}…</p>
			<span class="pct-text">{(pct * 100).toFixed(0)}%</span>
		</div>
		<p class="lore-hint">Synthesizing Voronoi tessellations, simulating climate winds, and seeding cultures.</p>
	</div>
</div>
