<script lang="ts">
	import type { Simulation } from '#lib/sim/engine';
	import { realmForces } from '#lib/sim/genre/forces';

	/** genre forces touching one realm (smog, arms race, megacorps, commons, leylines...) */
	let { sim, v, realm }: { sim: Simulation; v: number; realm: number } = $props();

	const chips = $derived.by(() => {
		void v;
		return realmForces(sim, realm);
	});
</script>

{#if chips.length}
	<div class="stat small forces">
		<span>Forces</span>
		<span class="list">
			{#each chips as c, i (i)}<span class="chip" title={c.title}>{c.icon} {c.label}</span>{/each}
		</span>
	</div>
{/if}

<style>
	.forces { align-items: flex-start; gap: 6px; }
	.list { display: flex; flex-wrap: wrap; gap: 4px; justify-content: flex-end; }
	.chip { font-size: 0.72rem; padding: 1px 6px; }
</style>
