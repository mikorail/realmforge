<script lang="ts">
	import Setup from '#lib/components/Setup.svelte';
	import Game from '#lib/components/Game.svelte';
	import type { Cosmos } from '#lib/sim/cosmos';

	let cosmos = $state.raw<Cosmos | null>(null);
</script>

<svelte:head><title>Realmforge</title></svelte:head>

{#if cosmos}
	<Game {cosmos} onquit={() => (cosmos = null)} />
{:else}
	<Setup onready={(c) => (cosmos = c)} />
{/if}
