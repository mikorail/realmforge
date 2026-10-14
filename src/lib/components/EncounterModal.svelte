<script lang="ts">
	import type { Simulation } from '#lib/sim/engine';

	let { sim, v, ondone }: { sim: Simulation; v: number; ondone: (text: string) => void } = $props();
	const enc = $derived.by(() => {
		void v;
		return sim.pending;
	});
	const me = $derived.by(() => {
		void v;
		return sim.me;
	});
	let result = $state<{ ok: boolean; text: string } | null>(null);

	const STAT_ICON = { martial: '⚔', diplomacy: '✉', stewardship: '⚖', intrigue: '🗝' } as const;
	function chooseOpt(i: number) {
		result = sim.resolve(i);
	}
</script>

<svelte:window onkeydown={(e) => {
	if (e.key === 'Escape' && result) {
		const t = result.text;
		result = null;
		ondone(t);
	}
}} />

{#if enc || result}
	<div class="backdrop">
		<div class="modal" role="dialog" aria-modal="true" aria-labelledby="enc-title">
			{#if result}
				<h2 id="enc-title">{result.ok ? 'Fortune smiles' : 'Ill fortune'}</h2>
				<p>{result.text}</p>
				<button class="btn primary" onclick={() => { const t = result!.text; result = null; ondone(t); }}>Continue</button>
			{:else if enc}
				<h2 id="enc-title">{enc.title}</h2>
				<p>{enc.text}</p>
				{#if me}<p class="muted small">{me.name} · ⚔{me.martial} ✉{me.diplomacy} ⚖{me.stewardship} 🗝{me.intrigue} · {me.gold} gold · ♥{me.health}</p>{/if}
				<div class="opts">
					{#each enc.options as o, i (i)}
						<button class="btn" onclick={() => chooseOpt(i)}>
							{o.label}
							{#if o.stat}<span class="chip">{STAT_ICON[o.stat]} {o.stat} vs {o.dc}</span>{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); display: grid; place-items: center; z-index: 10; padding: 1rem; }
	.modal { background: var(--panel); color: var(--panel-ink); border: 1px solid var(--accent); border-radius: 12px; padding: 1.2rem; max-width: 460px; width: 100%; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); }
	h2 { font-size: 1.25rem; margin-bottom: 0.4rem; color: var(--accent); }
	.opts { display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.8rem; }
	.opts .btn { text-align: left; display: flex; justify-content: space-between; gap: 0.5rem; align-items: center; }
	.small { font-size: 0.85rem; }
</style>
