<script lang="ts">
	import type { Simulation } from '#lib/sim/engine';
	import {
		commissionCourtTapestry,
		erectHeroicMonument,
		getChronicleSagas,
		composeSagaForEvent,
		type BardicSaga,
		type SagaKind
	} from '#lib/sim/sagas';
	import { onMount } from 'svelte';

	let {
		sim,
		v = 0,
		onclose,
		onselectburg,
		onselectcell
	}: {
		sim: Simulation;
		v?: number;
		onclose: () => void;
		onselectburg?: (id: number) => void;
		onselectcell?: (cell: number) => void;
	} = $props();

	let filterTab = $state<'all' | 'poems' | 'heroic' | 'tapestries' | 'monuments'>('all');
	let localV = $state(0);
	let selectedSagaId = $state<number | null>(null);
	let actionMsg = $state<{ type: 'ok' | 'err'; text: string } | null>(null);
	let targetBurgId = $state<number>(0);
	let targetCellInput = $state<number>(0);
	let closeBtn = $state<HTMLButtonElement>();

	onMount(() => {
		closeBtn?.focus();
	});

	const allSagas = $derived.by(() => {
		void v;
		void localV;
		const list = getChronicleSagas(sim);
		if (list.length === 0) {
			// Auto-compose an initial foundation saga if empty
			const pol = sim.polities.find((p) => p.id && p.alive);
			const hero = sim.people.find((p) => p.alive && p.role === 'hero')?.name ?? 'the First Pioneer';
			composeSagaForEvent(sim, 'resurgence', {
				title: pol ? `The Rise of ${pol.name}` : 'Song of the First Dawn',
				heroName: hero,
				realmName: pol?.name ?? 'the Mortal Realms'
			});
			return getChronicleSagas(sim);
		}
		return list;
	});

	const filteredSagas = $derived.by(() => {
		if (filterTab === 'poems') {
			return allSagas.filter((s) => s.kind === 'epic_poem' || s.kind === 'ballad');
		}
		if (filterTab === 'heroic') {
			return allSagas.filter((s) => s.kind === 'heroic_saga' || s.kind === 'tragedy');
		}
		if (filterTab === 'tapestries') {
			return allSagas.filter((s) => s.tapestryBurgId !== undefined);
		}
		if (filterTab === 'monuments') {
			return allSagas.filter((s) => s.monumentCell !== undefined);
		}
		return allSagas;
	});

	const selectedSaga = $derived.by(() => {
		if (selectedSagaId !== null) {
			const found = allSagas.find((s) => s.id === selectedSagaId);
			if (found) return found;
		}
		return filteredSagas[0] ?? allSagas[0] ?? null;
	});

	const aliveBurgs = $derived.by(() => {
		void v;
		void localV;
		return sim.w.burgs.filter((b) => b.id && b.alive);
	});

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			onclose();
		}
	}

	function handleCommissionTapestry(saga: BardicSaga) {
		if (!targetBurgId) {
			actionMsg = { type: 'err', text: 'Select a city to commission this royal court tapestry.' };
			return;
		}
		const res = commissionCourtTapestry(sim, saga.id, targetBurgId);
		actionMsg = { type: res.success ? 'ok' : 'err', text: res.msg };
		if (res.success) {
			localV++;
		}
	}

	function handleErectMonument(saga: BardicSaga) {
		const cell = targetCellInput;
		if (cell < 0 || cell >= sim.w.cells.n) {
			actionMsg = { type: 'err', text: `Please enter a valid map cell coordinate between 0 and ${sim.w.cells.n - 1}.` };
			return;
		}
		const res = erectHeroicMonument(sim, saga.id, cell);
		actionMsg = { type: res.success ? 'ok' : 'err', text: res.msg };
		if (res.success) {
			localV++;
		}
	}

	function handleComposeInspire() {
		const pol = sim.polities.find((p) => p.id && p.alive);
		const hero = sim.people.find((p) => p.alive && p.role === 'hero')?.name ?? 'the Iron Vanguard';
		const newSaga = composeSagaForEvent(sim, 'war', {
			realmName: pol?.name ?? 'the Sunlit Realm',
			heroName: hero
		});
		selectedSagaId = newSaga.id;
		actionMsg = { type: 'ok', text: `Court bards have composed a new heroic lay: '${newSaga.title}'!` };
		localV++;
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	class="backdrop"
	onclick={(e) => e.target === e.currentTarget && onclose()}
	onkeydown={(e) => e.key === 'Escape' && onclose()}
	role="presentation"
>
	<div
		class="modal-card"
		role="dialog"
		aria-modal="true"
		aria-labelledby="sagas-title"
		tabindex="-1"
	>
		<!-- Header -->
		<div class="mhead">
			<div>
				<h2 id="sagas-title">The Living Bardic Tradition</h2>
				<span class="muted small">
					Epic poetry, heroic sagas, court tapestries, and battlefield monuments of the known world
				</span>
			</div>
			<div class="head-actions">
				<button class="btn small gold-btn" onclick={handleComposeInspire} title="Commission a bard to compose a new epic">
					✍️ Inspire Bard
				</button>
				<button class="btn icon" bind:this={closeBtn} onclick={onclose} aria-label="Close sagas modal">
					✕
				</button>
			</div>
		</div>

		<!-- Filter Tabs -->
		<div class="tabs" role="tablist">
			<button
				class="tab-btn"
				class:on={filterTab === 'all'}
				onclick={() => {
					filterTab = 'all';
					actionMsg = null;
				}}
			>
				📜 All Sagas ({allSagas.length})
			</button>
			<button
				class="tab-btn"
				class:on={filterTab === 'poems'}
				onclick={() => {
					filterTab = 'poems';
					actionMsg = null;
				}}
			>
				🎵 Poems and Ballads
			</button>
			<button
				class="tab-btn"
				class:on={filterTab === 'heroic'}
				onclick={() => {
					filterTab = 'heroic';
					actionMsg = null;
				}}
			>
				⚔️ Heroic Sagas and Tragedies
			</button>
			<button
				class="tab-btn"
				class:on={filterTab === 'tapestries'}
				onclick={() => {
					filterTab = 'tapestries';
					actionMsg = null;
				}}
			>
				🧶 Court Tapestries
			</button>
			<button
				class="tab-btn"
				class:on={filterTab === 'monuments'}
				onclick={() => {
					filterTab = 'monuments';
					actionMsg = null;
				}}
			>
				🗿 Field Monuments
			</button>
		</div>

		{#if actionMsg}
			<div class="alert-bar" class:alert-ok={actionMsg.type === 'ok'} class:alert-err={actionMsg.type === 'err'}>
				{actionMsg.text}
			</div>
		{/if}

		<!-- Body: 2-Column Split -->
		<div class="modal-body">
			<!-- Left Column: Saga List -->
			<div class="sagas-list">
				{#if filteredSagas.length === 0}
					<div class="empty-state muted small">
						No sagas match the selected filter.
					</div>
				{:else}
					{#each filteredSagas as saga (saga.id)}
						<button
							class="saga-item-card"
							class:active={selectedSaga?.id === saga.id}
							onclick={() => {
								selectedSagaId = saga.id;
								targetCellInput = saga.monumentCell ?? 0;
								actionMsg = null;
							}}
						>
							<div class="saga-item-top">
								<span class="saga-item-title">{saga.title}</span>
								<span class="chip gold tiny">⭐ {saga.fame} Fame</span>
							</div>
							<div class="saga-item-meta muted tiny">
								<span>Year {saga.yearComposed}</span>
								<span>·</span>
								<span>{saga.author}</span>
							</div>
							<div class="badges-row">
								<span class="chip tiny kind-chip">{saga.kind.replace('_', ' ')}</span>
								{#if saga.tapestryBurgId}
									<span class="chip tiny tapestry-chip">🧶 Tapestry</span>
								{/if}
								{#if saga.monumentCell !== undefined}
									<span class="chip tiny monument-chip">🗿 Monument</span>
								{/if}
							</div>
						</button>
					{/each}
				{/if}
			</div>

			<!-- Right Column: Detail / Reader View -->
			<div class="saga-detail">
				{#if selectedSaga}
					<div class="detail-header">
						<div>
							<h3 class="detail-title">{selectedSaga.title}</h3>
							<div class="detail-subhead muted small">
								Composed in Year {selectedSaga.yearComposed} by <strong>{selectedSaga.author}</strong>
							</div>
						</div>
						<div class="fame-banner">
							<span class="fame-label">Renown</span>
							<span class="fame-val">⭐ {selectedSaga.fame}</span>
						</div>
					</div>

					<!-- Poetry Stanzas Display -->
					<div class="stanzas-container">
						{#each selectedSaga.stanzas as stanza, idx}
							<div class="stanza-block">
								<div class="stanza-num tiny muted">Stanza {idx + 1}</div>
								<div class="stanza-lines">
									{#each stanza.split('\n') as line}
										<p class="verse-line">{line}</p>
									{/each}
								</div>
							</div>
						{/each}
					</div>

					<!-- Actions / Cultural Commissioning -->
					<div class="commissions-section">
						<h4>Imperial Commissions</h4>

						<div class="commission-grid">
							<!-- Court Tapestry Commission -->
							<div class="commission-card">
								<h5>🧶 Woven Court Tapestry</h5>
								{#if selectedSaga.tapestryBurgId}
									{@const tBurg = sim.w.burgs[selectedSaga.tapestryBurgId]}
									<p class="small ok-text">
										Hangs in the great guildhall of {tBurg?.name ?? 'the capital'} (+10 Realm Stability).
									</p>
									{#if tBurg}
										<button class="btn tiny" onclick={() => onselectburg?.(tBurg.id)}>
											Locate City
										</button>
									{/if}
								{:else}
									<p class="tiny muted">
										Weave this epic into a grand palace tapestry to elevate civic stability and cultural prestige.
									</p>
									<div class="commission-action-row">
										<select class="select tiny" bind:value={targetBurgId}>
											<option value={0}>Choose sovereign city...</option>
											{#each aliveBurgs as b}
												<option value={b.id}>{b.name}</option>
											{/each}
										</select>
										<button class="btn tiny gold-btn" onclick={() => handleCommissionTapestry(selectedSaga)}>
											Commission
										</button>
									</div>
								{/if}
							</div>

							<!-- Field Monument Commission -->
							<div class="commission-card">
								<h5>🗿 Battlefield Obelisk</h5>
								{#if selectedSaga.monumentCell !== undefined}
									<p class="small ok-text">
										Consecrated at cell {selectedSaga.monumentCell} across the frontier.
									</p>
									<button class="btn tiny" onclick={() => onselectcell?.(selectedSaga.monumentCell!)}>
										View on Map
									</button>
								{:else}
									<p class="tiny muted">
										Chisel a tall stone obelisk on a historic battlefield cell to preserve this memory for eternity.
									</p>
									<div class="commission-action-row">
										<input
											type="number"
											class="input tiny"
											placeholder="Cell coordinate"
											bind:value={targetCellInput}
											min="0"
											max={sim.w.cells.n - 1}
										/>
										<button class="btn tiny gold-btn" onclick={() => handleErectMonument(selectedSaga)}>
											Erect Obelisk
										</button>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{:else}
					<div class="empty-state muted">
						Select a saga from the chronicle archives to read its verses.
					</div>
				{/if}
			</div>
		</div>

		<!-- Footer -->
		<div class="mfoot">
			<span class="muted tiny">Living Bardic Tradition · Realmforge World Simulator</span>
			<button class="btn" onclick={onclose}>Close</button>
		</div>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.72);
		z-index: 60;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.modal-card {
		background: var(--panel-bg, #1a1b26);
		color: var(--panel-ink, #cfc9c2);
		border: 1px solid var(--line, #383a4c);
		border-radius: 10px;
		width: 92vw;
		max-width: 960px;
		max-height: 88vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55);
		font-family: inherit;
		overflow: hidden;
	}

	.mhead {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 1rem 1.25rem 0.75rem;
		border-bottom: 1px solid var(--line, #383a4c);
		gap: 1rem;
	}

	.mhead h2 {
		margin: 0 0 0.2rem 0;
		font-size: 1.25rem;
	}

	.head-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid var(--line, #383a4c);
		border-radius: 6px;
		color: var(--panel-ink, #cfc9c2);
		cursor: pointer;
		padding: 0.35rem 0.75rem;
		font-size: 0.82rem;
		transition: background 0.15s ease;
	}

	.btn:hover {
		background: rgba(255, 255, 255, 0.12);
	}

	.btn.icon {
		padding: 0.25rem 0.5rem;
		font-size: 0.9rem;
	}

	.gold-btn {
		background: rgba(201, 164, 92, 0.2);
		border-color: rgba(201, 164, 92, 0.5);
		color: #f1cb7d;
	}

	.gold-btn:hover {
		background: rgba(201, 164, 92, 0.32);
	}

	.tabs {
		display: flex;
		gap: 0.4rem;
		padding: 0.5rem 1.25rem;
		border-bottom: 1px solid var(--line, #383a4c);
		background: rgba(0, 0, 0, 0.15);
		overflow-x: auto;
	}

	.tab-btn {
		background: none;
		border: 1px solid transparent;
		color: var(--panel-ink, #cfc9c2);
		opacity: 0.75;
		cursor: pointer;
		padding: 0.35rem 0.65rem;
		border-radius: 6px;
		font-size: 0.8rem;
		white-space: nowrap;
	}

	.tab-btn:hover {
		opacity: 1;
		background: rgba(255, 255, 255, 0.05);
	}

	.tab-btn.on {
		opacity: 1;
		font-weight: 600;
		background: var(--accent, #6a7ec2);
		color: #fff;
		border-color: var(--accent, #6a7ec2);
	}

	.alert-bar {
		padding: 0.5rem 1.25rem;
		font-size: 0.82rem;
		font-weight: 500;
		border-bottom: 1px solid var(--line, #383a4c);
	}

	.alert-ok {
		background: rgba(46, 139, 87, 0.2);
		color: #63d198;
	}

	.alert-err {
		background: rgba(200, 50, 50, 0.2);
		color: #ff8888;
	}

	.modal-body {
		display: flex;
		flex: 1;
		overflow: hidden;
		min-height: 420px;
	}

	.sagas-list {
		width: 320px;
		border-right: 1px solid var(--line, #383a4c);
		overflow-y: auto;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background: rgba(0, 0, 0, 0.08);
	}

	.saga-item-card {
		text-align: left;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--line, #383a4c);
		border-radius: 6px;
		padding: 0.6rem 0.75rem;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		color: inherit;
		transition: all 0.15s ease;
	}

	.saga-item-card:hover {
		background: rgba(255, 255, 255, 0.07);
		border-color: rgba(201, 164, 92, 0.4);
	}

	.saga-item-card.active {
		background: rgba(201, 164, 92, 0.12);
		border-color: #e0b86a;
	}

	.saga-item-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.4rem;
	}

	.saga-item-title {
		font-weight: 600;
		font-size: 0.88rem;
		line-height: 1.25;
	}

	.saga-item-meta {
		display: flex;
		gap: 0.35rem;
	}

	.badges-row {
		display: flex;
		gap: 0.3rem;
		flex-wrap: wrap;
		margin-top: 0.15rem;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		padding: 0.12rem 0.4rem;
		border-radius: 4px;
		font-size: 0.72rem;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid var(--line, #383a4c);
	}

	.chip.gold {
		background: rgba(201, 164, 92, 0.2);
		border-color: rgba(201, 164, 92, 0.4);
		color: #e0b86a;
	}

	.chip.kind-chip {
		text-transform: capitalize;
		opacity: 0.85;
	}

	.chip.tapestry-chip {
		background: rgba(147, 112, 219, 0.2);
		border-color: rgba(147, 112, 219, 0.4);
		color: #ba9cfc;
	}

	.chip.monument-chip {
		background: rgba(100, 149, 237, 0.2);
		border-color: rgba(100, 149, 237, 0.4);
		color: #8bb5fa;
	}

	.saga-detail {
		flex: 1;
		overflow-y: auto;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
	}

	.detail-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		border-bottom: 1px solid var(--line, #383a4c);
		padding-bottom: 0.75rem;
	}

	.detail-title {
		margin: 0 0 0.25rem 0;
		font-size: 1.3rem;
		color: #f5eedb;
	}

	.fame-banner {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		background: rgba(201, 164, 92, 0.12);
		border: 1px solid rgba(201, 164, 92, 0.3);
		padding: 0.35rem 0.65rem;
		border-radius: 6px;
	}

	.fame-label {
		font-size: 0.68rem;
		text-transform: uppercase;
		opacity: 0.7;
	}

	.fame-val {
		font-size: 0.95rem;
		font-weight: 600;
		color: #e0b86a;
	}

	.stanzas-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		background: rgba(0, 0, 0, 0.15);
		border: 1px solid rgba(201, 164, 92, 0.15);
		border-radius: 8px;
		padding: 1.25rem;
	}

	.stanza-block {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.stanza-num {
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stanza-lines {
		padding-left: 0.75rem;
		border-left: 2px solid rgba(201, 164, 92, 0.35);
	}

	.verse-line {
		margin: 0.15rem 0;
		font-style: italic;
		line-height: 1.45;
		font-size: 0.95rem;
		color: #e6dfd5;
	}

	.commissions-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.commissions-section h4 {
		margin: 0;
		font-size: 1rem;
	}

	.commission-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 0.8rem;
	}

	.commission-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--line, #383a4c);
		border-radius: 6px;
		padding: 0.8rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.commission-card h5 {
		margin: 0;
		font-size: 0.88rem;
	}

	.commission-action-row {
		display: flex;
		gap: 0.4rem;
		margin-top: 0.3rem;
	}

	.select, .input {
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid var(--line, #383a4c);
		border-radius: 4px;
		color: inherit;
		padding: 0.3rem 0.5rem;
		flex: 1;
	}

	.empty-state {
		padding: 2.5rem 1rem;
		text-align: center;
		background: rgba(0, 0, 0, 0.05);
		border-radius: 8px;
		border: 1px dashed var(--line, #383a4c);
	}

	.ok-text {
		color: #63d198;
	}

	.mfoot {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1.25rem;
		border-top: 1px solid var(--line, #383a4c);
		background: rgba(0, 0, 0, 0.12);
	}

	.small {
		font-size: 0.82rem;
	}

	.tiny {
		font-size: 0.74rem;
	}

	.muted {
		opacity: 0.7;
	}
</style>
