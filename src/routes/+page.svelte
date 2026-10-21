<script lang="ts">
	import Setup from '#lib/components/Setup.svelte';
	import Game from '#lib/components/Game.svelte';
	import type { Cosmos } from '#lib/sim/cosmos';

	let cosmos = $state.raw<Cosmos | null>(null);
	/** slot the running game was resumed from (null = never saved) */
	let slot = $state<string | null>(null);
	const start = (c: Cosmos, s: string | null = null) => {
		cosmos = c;
		slot = s;
	};
</script>

<svelte:head><title>Realmforge</title></svelte:head>

{#if cosmos}
	{#key cosmos}
		<Game {cosmos} initialSlot={slot} onquit={() => (cosmos = null)} onload={start} />
	{/key}
{:else}
	<Setup onready={start} />
{/if}
