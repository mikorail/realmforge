<script lang="ts">
	import type { Simulation } from '#lib/sim/engine';
	import {
		getTradeLeagues,
		getDefensiveCoalitions,
		getRoyalMarriages,
		getBanditCamps,
		joinTradeLeague,
		clearBanditCamp,
		type TradeLeague,
		type DefensiveCoalition,
		type RoyalMarriage,
		type BanditCamp
	} from '#lib/sim/leagues';
	import { onMount } from 'svelte';

	let {
		sim,
		v = 0,
		onclose,
		onselectburg,
		onselectpolity
	}: {
		sim: Simulation;
		v?: number;
		onclose: () => void;
		onselectburg?: (id: number) => void;
		onselectpolity?: (id: number) => void;
	} = $props();

	let tab = $state<'leagues' | 'coalitions' | 'marriages' | 'outlaws'>('leagues');
	let localV = $state(0);
	let actionMsg = $state<{ type: 'ok' | 'err'; text: string } | null>(null);
	let selectedBurgToJoin = $state<number>(0);
	let closeBtn = $state<HTMLButtonElement>();

	onMount(() => closeBtn?.focus());

	const leagues = $derived.by(() => {
		void v;
		void localV;
		return getTradeLeagues(sim);
	});

	const coalitions = $derived.by(() => {
		void v;
		void localV;
		return getDefensiveCoalitions(sim);
	});

	const marriages = $derived.by(() => {
		void v;
		void localV;
		return getRoyalMarriages(sim);
	});

	const camps = $derived.by(() => {
		void v;
		void localV;
		return getBanditCamps(sim);
	});

	const eligibleJoinBurgs = $derived.by(() => {
		void v;
		void localV;
		return sim.w.burgs.filter((b) => b.id && b.alive && !b.tradeLeague);
	});

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			onclose();
		}
	}

	function handleJoin(leagueId: number) {
		if (!selectedBurgToJoin) {
			actionMsg = { type: 'err', text: 'Select a city from the list to join this trade league.' };
			return;
		}
		const burg = sim.w.burgs[selectedBurgToJoin];
		const res = joinTradeLeague(sim, leagueId, selectedBurgToJoin);
		if (res) {
			actionMsg = { type: 'ok', text: `${burg?.name ?? 'City'} formally entered the chartered trade league.` };
			selectedBurgToJoin = 0;
			localV++;
		} else {
			actionMsg = { type: 'err', text: 'Unable to join league: city may already belong to a trade league.' };
		}
	}

	function handleClearCamp(burgId: number) {
		const res = clearBanditCamp(sim, burgId, 25);
		actionMsg = { type: res.success ? 'ok' : 'err', text: res.msg };
		localV++;
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	class="overlay"
	onclick={(e) => e.target === e.currentTarget && onclose()}
	onkeydown={(e) => e.key === 'Escape' && onclose()}
	role="presentation"
>
	<div
		class="modal scroll"
		role="dialog"
		aria-modal="true"
		aria-labelledby="leagues-modal-title"
		tabindex="-1"
	>
		<header class="mhead">
			<div>
				<h2 id="leagues-modal-title">Diplomacy, Leagues, and Treaties</h2>
				<p class="muted small">
					Realm Year {sim.year} · Trade monopolies, mutual defense pacts, dynastic ties, and frontier outlaws.
				</p>
			</div>
			<button class="btn icon" bind:this={closeBtn} onclick={onclose} aria-label="Close diplomacy modal">✕</button>
		</header>

		<div class="tabs" role="tablist" aria-label="Diplomacy sections">
			<button
				class="btn tab-btn"
				role="tab"
				id="tab-leagues"
				aria-selected={tab === 'leagues'}
				aria-controls="panel-leagues"
				tabindex={tab === 'leagues' ? 0 : -1}
				class:on={tab === 'leagues'}
				onclick={() => {
					tab = 'leagues';
					actionMsg = null;
				}}
			>
				⚖️ Trade Leagues ({leagues.length})
			</button>
			<button
				class="btn tab-btn"
				role="tab"
				id="tab-coalitions"
				aria-selected={tab === 'coalitions'}
				aria-controls="panel-coalitions"
				tabindex={tab === 'coalitions' ? 0 : -1}
				class:on={tab === 'coalitions'}
				onclick={() => {
					tab = 'coalitions';
					actionMsg = null;
				}}
			>
				🛡️ Defensive Coalitions ({coalitions.length})
			</button>
			<button
				class="btn tab-btn"
				role="tab"
				id="tab-marriages"
				aria-selected={tab === 'marriages'}
				aria-controls="panel-marriages"
				tabindex={tab === 'marriages' ? 0 : -1}
				class:on={tab === 'marriages'}
				onclick={() => {
					tab = 'marriages';
					actionMsg = null;
				}}
			>
				👑 Royal Marriages ({marriages.length})
			</button>
			<button
				class="btn tab-btn"
				role="tab"
				id="tab-outlaws"
				aria-selected={tab === 'outlaws'}
				aria-controls="panel-outlaws"
				tabindex={tab === 'outlaws' ? 0 : -1}
				class:on={tab === 'outlaws'}
				onclick={() => {
					tab = 'outlaws';
					actionMsg = null;
				}}
			>
				🏴‍☠️ Outlaw Havens ({camps.length})
			</button>
		</div>

		{#if actionMsg}
			<div class="alert-bar" class:alert-ok={actionMsg.type === 'ok'} class:alert-err={actionMsg.type === 'err'}>
				{actionMsg.text}
			</div>
		{/if}

		<div class="modal-body">
			{#if tab === 'leagues'}
				<div id="panel-leagues" role="tabpanel" aria-labelledby="tab-leagues" class="tab-panel">
					<div class="panel-desc small muted">
						Charters established by wealthy maritime ports and market hubs. Member cities receive +20% trade wealth yields and shared convoy escorts that curb outlaw piracy.
					</div>

					{#if leagues.length === 0}
						<div class="empty-state muted">
							No chartered trade leagues currently operate. Cities with level 2 market infrastructure or chartered ports can form commercial leagues.
						</div>
					{:else}
						<div class="cards-grid">
							{#each leagues as league (league.id)}
								<div class="card league-card">
									<div class="card-head">
										<div>
											<h3 class="card-title">{league.name}</h3>
											<span class="muted tiny">
												Chartered in Year {league.charterYear} · Headquartered in {sim.w.burgs[league.leaderBurgId]?.name ?? 'Charter City'}
											</span>
										</div>
										<div class="badge-group">
											<span class="chip gold">🪙 {league.treasury} Gold</span>
											<span class="chip blue">🛡️ +{league.fleetEscortBonus}% Escort</span>
										</div>
									</div>

									<div class="meta-row">
										<strong class="tiny muted">Commercial Monopolies:</strong>
										<div class="chips-wrap">
											{#each league.monopolies as mono}
												<span class="chip tiny mono-chip">{mono}</span>
											{/each}
										</div>
									</div>

									<div class="meta-row">
										<strong class="tiny muted">Member Cities ({league.memberBurgIds.length}):</strong>
										<div class="chips-wrap">
											{#each league.memberBurgIds as mBurgId}
												{@const mBurg = sim.w.burgs[mBurgId]}
												{#if mBurg}
													<button
														class="chip tiny city-chip"
														onclick={() => onselectburg?.(mBurg.id)}
														title="Inspect city in world"
													>
														🏛️ {mBurg.name}
													</button>
												{/if}
											{/each}
										</div>
									</div>

									<div class="action-footer">
										<div class="join-controls">
											<select class="select tiny" bind:value={selectedBurgToJoin}>
												<option value={0}>Select city to join...</option>
												{#each eligibleJoinBurgs as b (b.id)}
													<option value={b.id}>{b.name} ({sim.polities[b.state]?.name ?? 'Independent'})</option>
												{/each}
											</select>
											<button class="btn tiny" onclick={() => handleJoin(league.id)}>
												Join League
											</button>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else if tab === 'coalitions'}
				<div id="panel-coalitions" role="tabpanel" aria-labelledby="tab-coalitions" class="tab-panel">
					<div class="panel-desc small muted">
						Mutual defense compacts formed by sovereign realms when an aggressive conqueror dominates land and wins continuous offensive wars.
					</div>

					{#if coalitions.length === 0}
						<div class="empty-state muted">
							No defensive coalitions active. Mortal realms currently maintain independent defense postures with no single warmongering hegemon threatening global balance.
						</div>
					{:else}
						<div class="cards-grid">
							{#each coalitions as coalition (coalition.id)}
								{@const target = sim.polities[coalition.targetStateId]}
								<div class="card coalition-card">
									<div class="card-head">
										<div>
											<h3 class="card-title">{coalition.name}</h3>
											<span class="muted tiny">
												Formed in Year {coalition.formedYear} · Pledged to contain {target ? target.name : 'Unknown Empire'}
											</span>
										</div>
										<span class="chip danger">Threat {coalition.threatLevel}</span>
									</div>

									{#if target}
										<div class="target-banner" style="border-left-color: {target.color}">
											<strong class="small">Target Empire: {target.fullName}</strong>
											<span class="tiny muted">{target.cells} provinces held · Ruler: {sim.people[target.ruler]?.name ?? 'Monarch'}</span>
										</div>
									{/if}

									<div class="meta-row">
										<strong class="tiny muted">Coalition Allies ({coalition.memberStateIds.length}):</strong>
										<div class="chips-wrap">
											{#each coalition.memberStateIds as mId}
												{@const pol = sim.polities[mId]}
												{#if pol}
													<button
														class="chip tiny state-chip"
														style="border-color: {pol.color}"
														onclick={() => onselectpolity?.(pol.id)}
													>
														🛡️ {pol.name}
													</button>
												{/if}
											{/each}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else if tab === 'marriages'}
				<div id="panel-marriages" role="tabpanel" aria-labelledby="tab-marriages" class="tab-panel">
					<div class="panel-desc small muted">
						Dynastic matrimonial alliances joining sovereign royal bloodlines. Marriages improve diplomatic harmony (+30 relations) and allow inheritance claims when a crown falls without a living heir.
					</div>

					{#if marriages.length === 0}
						<div class="empty-state muted">
							No royal marriages currently link royal houses. Rulers can arrange matrimonial pacts with friendly neighboring kingdoms.
						</div>
					{:else}
						<div class="cards-grid">
							{#each marriages as marriage (marriage.id)}
								{@const polA = sim.polities[marriage.stateA]}
								{@const polB = sim.polities[marriage.stateB]}
								{@const heirA = polA?.heir ? sim.people[polA.heir] : null}
								{@const heirB = polB?.heir ? sim.people[polB.heir] : null}
								{@const vuln = (!heirA || !heirA.alive) || (!heirB || !heirB.alive)}

								<div class="card marriage-card">
									<div class="card-head">
										<div>
											<h3 class="card-title">House {marriage.houseA} & House {marriage.houseB}</h3>
											<span class="muted tiny">
												Solemnized in Year {marriage.year} · Royal bond between {polA?.name ?? 'Realm A'} and {polB?.name ?? 'Realm B'}
											</span>
										</div>
										<span class="chip gold">Dynasty Union</span>
									</div>

									<div class="marriage-reps">
										<div class="dynasty-side" style="border-left-color: {polA?.color ?? '#aaa'}">
											<strong>{polA?.name ?? 'Realm A'}</strong>
											<span class="tiny muted">House {marriage.houseA}</span>
											<span class="tiny" class:danger-text={!heirA || !heirA.alive}>
												{heirA && heirA.alive ? `Heir: ${heirA.name}` : 'No direct living heir'}
											</span>
										</div>
										<div class="dynasty-bridge">💍</div>
										<div class="dynasty-side" style="border-left-color: {polB?.color ?? '#aaa'}">
											<strong>{polB?.name ?? 'Realm B'}</strong>
											<span class="tiny muted">House {marriage.houseB}</span>
											<span class="tiny" class:danger-text={!heirB || !heirB.alive}>
												{heirB && heirB.alive ? `Heir: ${heirB.name}` : 'No direct living heir'}
											</span>
										</div>
									</div>

									{#if vuln}
										<div class="succession-notice warning">
											⚠️ Succession Vulnerability: A monarch in this union lacks an heir. A succession crisis or Personal Union will trigger upon ruler demise.
										</div>
									{:else}
										<div class="succession-notice ok">
											✓ Direct succession secured for both dynasties.
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else if tab === 'outlaws'}
				<div id="panel-outlaws" role="tabpanel" aria-labelledby="tab-outlaws" class="tab-panel">
					<div class="panel-desc small muted">
						Lawless encampments and pirate havens nesting near unstable, unfortified settlements. Outlaws siphon 5% to 15% of annual trade revenues until cleared by realm forces.
					</div>

					{#if camps.length === 0}
						<div class="empty-state muted">
							Trade routes and maritime waters are secure. No active bandit encampments or pirate havens threaten settlements.
						</div>
					{:else}
						<div class="cards-grid">
							{#each camps as camp (camp.burgId)}
								{@const burg = sim.w.burgs[camp.burgId]}
								{@const pol = burg ? sim.polities[burg.state] : null}
								<div class="card outlaw-card">
									<div class="card-head">
										<div class="outlaw-title-wrap">
											<span class="outlaw-icon">{camp.kind === 'pirate' ? '🏴‍☠️' : '🏹'}</span>
											<div>
												<h3 class="card-title">{camp.name}</h3>
												<span class="muted tiny">
													Nestled near {burg?.name ?? 'Town'} ({pol?.name ?? 'Frontier'}) · {camp.kind === 'pirate' ? 'Maritime Pirate Haven' : 'Wilderness Bandit Lair'}
												</span>
											</div>
										</div>
										<span class="chip danger">⚔️ Strength {camp.strength}</span>
									</div>

									<div class="outlaw-stats">
										<span class="tiny">Looted Treasury: <strong>🪙 {camp.lootedGold} gold</strong></span>
										<span class="tiny muted">Siphoning annual municipal commerce</span>
									</div>

									<div class="action-footer">
										<button
											class="btn danger tiny"
											onclick={() => handleClearCamp(camp.burgId)}
										>
											⚔️ Clear Outlaw Cove
										</button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>

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
		background: var(--panel-bg);
		color: var(--panel-ink);
		border: 1px solid var(--line);
		border-radius: 12px;
		width: 100%;
		max-width: 800px;
		max-height: 88vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
		font-family: inherit;
		overflow: hidden;
	}

	.mhead {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 1rem 1.25rem 0.75rem;
		border-bottom: 1px solid var(--line);
		gap: 1rem;
	}

	.mhead h2 {
		margin: 0 0 0.2rem 0;
		font-size: 1.25rem;
	}

	.btn.icon {
		background: none;
		border: 1px solid var(--line);
		border-radius: 6px;
		color: var(--panel-ink);
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		font-size: 0.9rem;
	}

	.tabs {
		display: flex;
		gap: 0.4rem;
		padding: 0.5rem 1.25rem;
		border-bottom: 1px solid var(--line);
		background: rgba(0, 0, 0, 0.12);
		overflow-x: auto;
	}

	.tab-btn {
		background: none;
		border: 1px solid transparent;
		color: var(--panel-ink);
		opacity: 0.75;
		cursor: pointer;
		padding: 0.35rem 0.65rem;
		border-radius: 6px;
		font-size: 0.82rem;
		white-space: nowrap;
	}

	.tab-btn:hover {
		opacity: 1;
		background: rgba(255, 255, 255, 0.04);
	}

	.tab-btn.on {
		opacity: 1;
		font-weight: 600;
		background: var(--accent);
		color: #fff;
		border-color: var(--accent);
	}

	.alert-bar {
		padding: 0.5rem 1.25rem;
		font-size: 0.82rem;
		font-weight: 500;
		border-bottom: 1px solid var(--line);
	}

	.alert-ok {
		background: rgba(46, 139, 87, 0.15);
		color: #55c48b;
	}

	.alert-err {
		background: rgba(200, 50, 50, 0.15);
		color: #ff7777;
	}

	.modal-body {
		padding: 1rem 1.25rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		flex: 1;
	}

	.tab-panel {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}

	.panel-desc {
		line-height: 1.4;
	}

	.empty-state {
		padding: 2.5rem 1rem;
		text-align: center;
		background: rgba(0, 0, 0, 0.05);
		border-radius: 8px;
		border: 1px dashed var(--line);
	}

	.cards-grid {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.card {
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.8rem 1rem;
		background: rgba(0, 0, 0, 0.03);
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.card-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.card-title {
		margin: 0;
		font-size: 1.05rem;
	}

	.badge-group {
		display: flex;
		gap: 0.35rem;
		align-items: center;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		padding: 0.15rem 0.45rem;
		border-radius: 4px;
		font-size: 0.75rem;
		background: rgba(0, 0, 0, 0.1);
		border: 1px solid var(--line);
	}

	.chip.gold {
		background: rgba(201, 164, 92, 0.2);
		border-color: rgba(201, 164, 92, 0.4);
		color: #e0b86a;
	}

	.chip.blue {
		background: rgba(70, 130, 180, 0.2);
		border-color: rgba(70, 130, 180, 0.4);
		color: #7bb5e5;
	}

	.chip.danger {
		background: rgba(200, 50, 50, 0.15);
		border-color: rgba(200, 50, 50, 0.35);
		color: #ff7777;
	}

	.meta-row {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.chips-wrap {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.mono-chip {
		background: rgba(201, 164, 92, 0.1);
		border-color: rgba(201, 164, 92, 0.3);
	}

	.city-chip, .state-chip {
		background: none;
		border: 1px solid var(--line);
		color: var(--panel-ink);
		cursor: pointer;
	}

	.city-chip:hover, .state-chip:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.action-footer {
		display: flex;
		justify-content: flex-end;
		padding-top: 0.4rem;
		border-top: 1px solid var(--line);
		margin-top: 0.2rem;
	}

	.join-controls {
		display: flex;
		gap: 0.4rem;
		align-items: center;
		width: 100%;
		justify-content: flex-end;
	}

	.select.tiny {
		padding: 0.2rem 0.4rem;
		font-size: 0.75rem;
		border-radius: 4px;
		border: 1px solid var(--line);
		background: var(--panel-bg);
		color: var(--panel-ink);
		max-width: 240px;
	}

	.target-banner {
		border-left: 3px solid;
		background: rgba(0, 0, 0, 0.04);
		padding: 0.4rem 0.6rem;
		border-radius: 4px;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.marriage-reps {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.4rem 0;
	}

	.dynasty-side {
		flex: 1;
		border-left: 3px solid;
		padding: 0.3rem 0.6rem;
		background: rgba(0, 0, 0, 0.03);
		border-radius: 4px;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.dynasty-bridge {
		font-size: 1.2rem;
	}

	.succession-notice {
		padding: 0.35rem 0.6rem;
		border-radius: 4px;
		font-size: 0.78rem;
		line-height: 1.3;
	}

	.succession-notice.warning {
		background: rgba(230, 150, 30, 0.12);
		border-left: 3px solid #e09620;
		color: #e8a740;
	}

	.succession-notice.ok {
		background: rgba(46, 139, 87, 0.1);
		border-left: 3px solid #2e8b57;
		color: #63d198;
	}

	.outlaw-title-wrap {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.outlaw-icon {
		font-size: 1.3rem;
	}

	.outlaw-stats {
		display: flex;
		justify-content: space-between;
		padding: 0.2rem 0;
	}

	.btn.danger {
		border-color: rgba(200, 50, 50, 0.4);
		background: rgba(200, 50, 50, 0.1);
		color: #ff7777;
		cursor: pointer;
	}

	.btn.danger:hover {
		background: rgba(200, 50, 50, 0.2);
	}

	.mfoot {
		display: flex;
		justify-content: flex-end;
		padding: 0.75rem 1.25rem;
		border-top: 1px solid var(--line);
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

	.danger-text {
		color: #ff7777;
	}
</style>
