<script lang="ts">
	import type { GenreDef } from '#lib/gen/genre';
	import { POWERS, type Power, type Simulation } from '#lib/sim/engine';

	let { sim, v, power, terms, onpower, ontoggle, oncastrandom }: {
		sim: Simulation; v: number; power: Power | null; terms: GenreDef['terms'];
		onpower: (p: Power | null) => void; ontoggle: () => void;
		oncastrandom?: (p?: Power) => void;
	} = $props();

	const mana = $derived.by(() => {
		void v;
		return sim.mana;
	});
	const sandbox = $derived.by(() => {
		void v;
		return sim.sandbox;
	});
	const groups: [string, Power[]][] = [
		['Grace & Destiny', ['bless', 'inspire', 'host', 'peace', 'hero', 'prophet', 'relic', 'enlighten', 'patron']],
		['Earth & Genesis', ['raise', 'sink', 'dig', 'cataclysm', 'species', 'monster', 'wonder']],
		['Chaos & Calamity', ['discord', 'chaos', 'rebel', 'smite', 'villain', 'plague', 'pandemic']],
		['Cosmos & Apocalypse', ['tear', 'meteor', 'alien', 'apocalypse']]
	];
</script>

<div class="mana">
	<div class="row between"><strong>{terms.mana}</strong><span>{sandbox ? '∞' : `${mana.toFixed(0)} / ${sim.manaMax}`}</span></div>
	<div class="bar"><div style="width:{sandbox ? 100 : (mana / sim.manaMax) * 100}%"></div></div>
	<label class="row small"><input type="checkbox" checked={sandbox} onchange={ontoggle} /> Sandbox (unlimited power)</label>
</div>

<div class="random-actions">
	{#if power}
		<button class="btn random-btn primary-random" onclick={() => oncastrandom?.(power)} title="Cast {POWERS[power].name} on a random valid target">
			🎲 Cast {POWERS[power].name} on Random Target
		</button>
	{/if}
	<button class="btn random-btn surprise-btn" onclick={() => oncastrandom?.()} title="Cast a surprise divine miracle on a random target">
		✨ Surprise Divine Miracle
	</button>
</div>

<p class="muted small">{power ? `Click the map or tap 'Cast on Random Target' to invoke ${POWERS[power].name}. Esc to cancel.` : 'Pick a power, then click the map or cast on a random target. Realm powers target whoever owns the clicked land on the current layer.'}</p>

{#each groups as [title, list] (title)}
	<h3>{title}</h3>
	<div class="powers">
		{#each list as p (p)}
			{@const P = POWERS[p]}
			<button class="power" class:on={power === p} disabled={!sandbox && mana < P.cost} onclick={() => onpower(power === p ? null : p)} title={P.desc}>
				<span class="ico">{P.icon}</span>
				<span class="nm">{P.name}</span>
				<span class="cost">{P.cost}</span>
				<span class="desc">{P.desc}</span>
			</button>
		{/each}
	</div>
{/each}

<style>
	.mana { margin-bottom: 0.6rem; }
	.between { justify-content: space-between; }
	.bar { height: 8px; border-radius: 99px; background: var(--line); overflow: hidden; margin: 0.3rem 0; }
	.bar div { height: 100%; background: linear-gradient(90deg, var(--accent), #fff6); transition: width 0.3s; }
	.small { font-size: 0.85rem; }
	h3 { font-size: 0.9rem; margin: 0.7rem 0 0.35rem; }
	.powers { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; }
	.power { display: grid; grid-template-columns: auto 1fr auto; gap: 0 0.4rem; align-items: center; text-align: left; border: 1px solid var(--line); background: transparent; border-radius: 8px; padding: 0.4rem 0.5rem; }
	.power.on { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 20%, transparent); }
	.ico { font-size: 1.3rem; grid-row: span 2; color: var(--accent); }
	.nm { font-weight: 600; font-size: 0.9rem; }
	.cost { font-size: 0.75rem; color: var(--muted); }
	.desc { grid-column: 2 / 4; font-size: 0.72rem; color: var(--muted); line-height: 1.2; }
	.random-actions { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.6rem; }
	.random-btn { width: 100%; font-size: 0.85rem; padding: 0.45rem 0.6rem; border-radius: 6px; cursor: pointer; border: 1px solid var(--line); font-weight: 500; transition: all 0.2s; }
	.primary-random { background: color-mix(in srgb, var(--accent) 15%, transparent); border-color: var(--accent); color: var(--text); }
	.primary-random:hover { background: color-mix(in srgb, var(--accent) 28%, transparent); }
	.surprise-btn { background: color-mix(in srgb, #9d4edd 18%, transparent); border-color: #9d4edd; color: var(--text); }
	.surprise-btn:hover { background: color-mix(in srgb, #9d4edd 32%, transparent); }
</style>
