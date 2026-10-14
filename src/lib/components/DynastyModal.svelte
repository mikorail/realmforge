<script lang="ts">
	import { buildLineageTree, findOldestAncestor, getHouseMembers, type DynastyNode } from '#lib/sim/dynasty';
	import type { Simulation } from '#lib/sim/engine';
	import type { Artifact } from '#lib/sim/relics';

	let {
		sim,
		rulerId,
		onclose,
		onselectperson
	}: {
		sim: Simulation;
		rulerId: number;
		onclose: () => void;
		onselectperson?: (id: number) => void;
	} = $props();

	const person = $derived(sim.people[rulerId] ?? sim.people[1]);
	const polity = $derived(sim.polities[person.state]);

	const rootAncestorId = $derived(findOldestAncestor(sim, person.id));
	const rootTree = $derived(buildLineageTree(sim, rootAncestorId));
	const houseMembers = $derived(getHouseMembers(sim, person.house));
	const realmArtifacts = $derived(
		sim.artifacts.filter((a) => (a.holderType === 'polity' && a.holderId === person.state) || (a.holderType === 'person' && a.holderId === person.id))
	);

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			onclose();
		}
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="overlay" onclick={(e) => e.target === e.currentTarget && onclose()} onkeydown={(e) => e.key === 'Escape' && onclose()} role="presentation">
	<div class="modal scroll" role="dialog" aria-modal="true" aria-labelledby="dynasty-title" tabindex="-1">
		<header class="mhead">
			<div>
				<h2 id="dynasty-title">House {person.house || 'Wanderer'}</h2>
				<p class="muted small">
					{polity ? polity.fullName : 'Independent bloodline'} · Realm Year {sim.year}
				</p>
			</div>
			<button class="btn icon" onclick={onclose} aria-label="Close dynasty dialog">✕</button>
		</header>

		{#if realmArtifacts.length > 0}
			<section class="section">
				<h3>Sacred Relics and Vaults</h3>
				<div class="relic-grid">
					{#each realmArtifacts as art (art.id)}
						<div class="relic-card">
							<span class="relic-icon">{art.icon}</span>
							<div class="relic-info">
								<strong>{art.name}</strong>
								<span class="small muted">Fame {art.fame}/100 · +{art.bonusVal} {art.bonusStat}</span>
								<p class="tiny muted">{art.origin}</p>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<section class="section">
			<h3>Royal Lineage Tree</h3>
			{#if rootTree}
				<div class="tree-container">
					{#snippet renderNode(node: DynastyNode)}
						<div class="tree-node" class:current={node.id === person.id} class:dead={!node.alive}>
							<div class="node-badge" style="border-color: {node.realmColor}">
								<div class="node-head">
									<strong class="name">{node.name}</strong>
									{#if node.isRuler}<span class="chip gold">Crown</span>{/if}
									{#if node.isHeir}<span class="chip">Heir</span>{/if}
								</div>
								<div class="node-meta small muted">
									{#if node.alive}
										Age {sim.ageOf(sim.people[node.id])} · {node.role}
									{:else}
										Died year {node.died} ({node.cause || 'unknown'})
									{/if}
								</div>
								{#if node.traits.length > 0}
									<div class="node-traits tiny muted">
										{node.traits.join(' · ')}
									</div>
								{/if}
								<div class="node-stats tiny">
									⚔{node.martial} ✉{node.diplomacy} ⚖{node.stewardship} 🗝{node.intrigue}
								</div>
								{#if onselectperson}
									<button class="link tiny" onclick={() => onselectperson(node.id)}>Select person</button>
								{/if}
							</div>

							{#if node.children.length > 0}
								<div class="children-branch">
									{#each node.children as child (child.id)}
										{@render renderNode(child)}
									{/each}
								</div>
							{/if}
						</div>
					{/snippet}

					{@render renderNode(rootTree)}
				</div>
			{:else}
				<p class="muted">No known ancestral lineage recorded for this house.</p>
			{/if}
		</section>

		<section class="section">
			<h3>House Members ({houseMembers.length})</h3>
			<div class="members-list">
				{#each houseMembers as m (m.id)}
					<div class="member-row">
						<div>
							<strong>{m.name}</strong>
							<span class="muted small">{m.alive ? `Age ${sim.ageOf(m)}` : `Died ${m.died}`} · {m.role}</span>
						</div>
						<div class="muted small">
							{m.traits.join(', ') || 'Ordinary'}
						</div>
					</div>
				{/each}
			</div>
		</section>

		<footer class="mfoot">
			<button class="btn" onclick={onclose}>Close</button>
		</footer>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(8, 6, 4, 0.75);
		backdrop-filter: blur(4px);
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}
	.modal {
		background: var(--vellum);
		border: 1px solid var(--line);
		border-radius: 12px;
		max-width: 720px;
		max-height: 88vh;
		width: 100%;
		padding: 1.4rem;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
		overflow-y: auto;
	}
	.mhead {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.2rem;
		border-bottom: 1px solid var(--line);
		padding-bottom: 0.8rem;
	}
	h2 {
		font-size: 1.3rem;
		margin: 0 0 0.2rem 0;
	}
	h3 {
		font-size: 1rem;
		margin: 0 0 0.6rem 0;
	}
	.small {
		font-size: 0.82rem;
		margin: 0;
	}
	.tiny {
		font-size: 0.75rem;
		margin: 0.15rem 0 0 0;
	}
	.section {
		margin-bottom: 1.4rem;
	}
	.relic-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 0.8rem;
	}
	.relic-card {
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.6rem;
		display: flex;
		gap: 0.6rem;
		align-items: flex-start;
		background: rgba(0, 0, 0, 0.02);
	}
	.relic-icon {
		font-size: 1.4rem;
	}
	.relic-info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.tree-container {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		padding: 0.6rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.02);
	}
	.tree-node {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.node-badge {
		border: 1px solid var(--line);
		border-left-width: 4px;
		border-radius: 6px;
		padding: 0.5rem 0.7rem;
		background: var(--vellum);
	}
	.tree-node.current .node-badge {
		border-color: var(--accent);
		background: rgba(247, 215, 116, 0.08);
	}
	.tree-node.dead .node-badge {
		opacity: 0.75;
	}
	.node-head {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.chip.gold {
		background: #f7d774;
		color: #1b140c;
		font-size: 0.68rem;
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
	}
	.children-branch {
		margin-left: 1.4rem;
		padding-left: 0.8rem;
		border-left: 2px dashed var(--line);
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.members-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.member-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.4rem 0.6rem;
		border-bottom: 1px dotted var(--line);
	}
	.mfoot {
		display: flex;
		justify-content: flex-end;
		margin-top: 1rem;
	}
</style>
