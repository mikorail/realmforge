<script lang="ts">
	import ClimatePanel from '../ClimatePanel.svelte';
	import LockButton from './LockButton.svelte';
	import type { SetupStore } from './store.svelte';

	let { store }: { store: SetupStore } = $props();
</script>

<section class="panel-card climate-sec">
	<div class="panel-header">
		<h2>🌐 Planetary Climate <LockButton {store} k="climate" /></h2>
		<span class="panel-sub">Rotate wind bands on the interactive globe and fine-tune global temperature gradients</span>
	</div>
	<ClimatePanel bind:climate={store.s.climate} width={store.s.width} height={store.s.height} />
</section>
