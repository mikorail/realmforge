<script lang="ts">
	import type { SetupStore } from './store.svelte';

	let { store, onforge }: { store: SetupStore; onforge: () => void } = $props();
</script>

<div class="action-bar" role="group" aria-label="Forge and randomize">
	<button type="button" id="forge-btn" class="btn primary forge-btn" onclick={onforge}>
		<span class="forge-spark" aria-hidden="true">⚡</span>
		<span>Forge the world</span>
	</button>
	<button type="button" class="btn randomize-btn" onclick={() => store.randomize()} title="Randomize all unlocked fields">
		<span>🎲 Randomize</span>
		{#if store.locked.length > 0}
			<span class="lock-pill">({store.locked.length} locked)</span>
		{/if}
	</button>
	<button type="button" class="btn reset-btn" onclick={() => store.reset()} title="Reset all options to default">
		<span>↺ Reset</span>
	</button>
	{#if store.locked.length > 0}
		<button type="button" class="btn unlock-btn" onclick={() => store.unlockAll()} title="Unlock all locked settings">
			<span>🔓 Clear locks</span>
		</button>
	{/if}
</div>
