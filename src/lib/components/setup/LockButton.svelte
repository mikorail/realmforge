<script lang="ts">
	import type { SetupStore } from './store.svelte';

	let { store, k }: { store: SetupStore; k: string } = $props();
	const on = $derived(store.isLocked(k));
</script>

<button
	type="button"
	class="lock"
	class:on
	onclick={() => store.toggleLock(k)}
	aria-pressed={on}
	title={on ? 'Locked: Randomize keeps this setting' : 'Unlocked: Randomize can alter this setting'}
	aria-label={on ? 'Locked setting. Activate to unlock' : 'Unlocked setting. Activate to lock'}
>
	<span class="lock-icon" aria-hidden="true">{on ? '🔒' : '🔓'}</span>
</button>
