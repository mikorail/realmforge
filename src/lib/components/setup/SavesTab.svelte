<script lang="ts">
	import { GENRES, type Genre } from '#lib/gen/genre';
	import type { SaveMeta } from '#lib/save';

	let { saves, onload, ondelete }: { saves: SaveMeta[]; onload: (slot: string) => void; ondelete: (slot: string) => void } = $props();
</script>

<section class="panel-card saves-sec">
	<div class="panel-header">
		<h2>📜 Saved Chronicles</h2>
		<span class="panel-sub">Resume an existing simulation or remove old saves</span>
	</div>

	{#if saves.length}
		<ul class="saves-list">
			{#each saves as sv (sv.slot)}
				<li class="save-item">
					<div class="save-info">
						<strong>{sv.name}</strong>
						<span class="save-meta">Year {sv.year} · {GENRES[sv.genre as Genre]?.name ?? sv.genre}{sv.planets > 1 ? ` · ${sv.planets} planets` : ''}</span>
					</div>
					<div class="save-actions">
						<button type="button" class="btn primary small" onclick={() => onload(sv.slot)}>Resume</button>
						<button type="button" class="btn small danger" aria-label="Delete save {sv.name}" onclick={() => ondelete(sv.slot)}>✕</button>
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="muted small">No saved chronicles found yet. Generate a world and click Save in the top bar to record history.</p>
	{/if}
</section>
