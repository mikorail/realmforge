<script lang="ts">
	import type { Simulation } from '#lib/sim/engine';
	import {
		conveneWorldCongress,
		voteOnResolution,
		enactCongressSummit,
		getCongressState,
		type WorldCongressSummit,
		type WorldResolution
	} from '#lib/sim/congress';
	import {
		getActiveMegaprojects,
		findPotentialCanalSites,
		initiateMegaproject,
		contributeToMegaproject,
		type Megaproject,
		type MegaprojectKind
	} from '#lib/sim/megaprojects';
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

	let currentTab = $state<'chamber' | 'accords' | 'rogues' | 'megaprojects'>('chamber');
	let localV = $state(0);
	let actionMsg = $state<{ type: 'ok' | 'err'; text: string } | null>(null);
	let closeBtn = $state<HTMLButtonElement>();

	// Megaproject state
	let newProjectKind = $state<MegaprojectKind>('continental_canal');
	let sponsorStateId = $state<number>(1);
	let canalSiteIndex = $state<number>(0);
	let contributeAmount = $state<number>(100);

	onMount(() => {
		closeBtn?.focus();
	});

	const congressState = $derived.by(() => {
		void v;
		void localV;
		return getCongressState(sim);
	});

	const activeSummit = $derived.by(() => {
		void v;
		void localV;
		if (!congressState.currentSummit) {
			return conveneWorldCongress(sim);
		}
		return congressState.currentSummit;
	});

	const megaprojects = $derived.by(() => {
		void v;
		void localV;
		return getActiveMegaprojects(sim);
	});

	const canalSites = $derived.by(() => {
		void v;
		void localV;
		return findPotentialCanalSites(sim);
	});

	const alivePolities = $derived.by(() => {
		void v;
		void localV;
		return sim.polities.filter((p) => p.id && p.alive);
	});

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			onclose();
		}
	}

	function handleVote(resId: number, stateId: number, voteFor: boolean) {
		voteOnResolution(sim, activeSummit, resId, stateId, voteFor);
		localV++;
	}

	function handleEnactSummit() {
		const res = enactCongressSummit(sim, activeSummit);
		actionMsg = {
			type: 'ok',
			text: `Congress concluded: ${res.passedCount} resolutions enacted into international law.`
		};
		localV++;
	}

	function handleConveneNew() {
		conveneWorldCongress(sim);
		actionMsg = { type: 'ok', text: `A new session of the Grand World Congress has convened in Year ${sim.year}!` };
		localV++;
	}

	function handleInitiateProject() {
		const polity = sim.polities[sponsorStateId];
		if (!polity || !polity.alive) {
			actionMsg = { type: 'err', text: 'Please select an active sponsoring realm.' };
			return;
		}

		let cells: number[] = [];
		if (newProjectKind === 'continental_canal') {
			if (canalSites.length === 0) {
				actionMsg = { type: 'err', text: 'No suitable narrow isthmus canal sites found on this map.' };
				return;
			}
			const site = canalSites[canalSiteIndex] ?? canalSites[0];
			cells = site.isthmusCells;
		} else if (newProjectKind === 'bastion_wall') {
			// Pick 4 frontier or capital cells
			const cap = sim.w.burgs[polity.capital]?.cell ?? 0;
			cells = [cap];
			const start = sim.w.cells.nStart[cap];
			const end = sim.w.cells.nStart[cap + 1];
			for (let k = start; k < Math.min(start + 3, end); k++) {
				cells.push(sim.w.cells.nList[k]);
			}
		} else {
			// Celestial orrery: capital cell
			const cap = sim.w.burgs[polity.capital]?.cell ?? 0;
			cells = [cap];
		}

		const initRes = initiateMegaproject(sim, sponsorStateId, newProjectKind, cells);
		actionMsg = { type: initRes.success ? 'ok' : 'err', text: initRes.msg };
		if (initRes.success) {
			localV++;
		}
	}

	function handleContribute(projId: number) {
		const res = contributeToMegaproject(sim, projId, contributeAmount);
		actionMsg = { type: 'ok', text: res.msg };
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
		aria-labelledby="congress-title"
		tabindex="-1"
	>
		<!-- Header -->
		<div class="mhead">
			<div>
				<h2 id="congress-title">The Grand World Congress</h2>
				<span class="muted small">
					Pan-continental diplomacy, binding treaties, sovereign sanctions, and planetary megaprojects
				</span>
			</div>
			<div class="head-actions">
				<button class="btn small gold-btn" onclick={handleConveneNew} title="Call a new international summit session">
					🏛️ Convene Summit
				</button>
				<button class="btn icon" bind:this={closeBtn} onclick={onclose} aria-label="Close congress modal">
					✕
				</button>
			</div>
		</div>

		<!-- Summit Banner -->
		<div class="summit-banner">
			<div class="summit-info">
				<span class="summit-pill">Session Year {activeSummit.year}</span>
				<span class="summit-host">
					Host Metropolis: <strong>{activeSummit.hostBurgName}</strong>
				</span>
			</div>
			<button class="btn small enact-btn" onclick={handleEnactSummit} title="Enact vote outcomes into binding international treaties">
				⚖️ Enact Resolutions
			</button>
		</div>

		<!-- Tabs -->
		<div class="tabs" role="tablist">
			<button
				class="tab-btn"
				class:on={currentTab === 'chamber'}
				onclick={() => {
					currentTab = 'chamber';
					actionMsg = null;
				}}
			>
				🗳️ Voting Chamber ({activeSummit.resolutions.length})
			</button>
			<button
				class="tab-btn"
				class:on={currentTab === 'accords'}
				onclick={() => {
					currentTab = 'accords';
					actionMsg = null;
				}}
			>
				📜 International Treaties ({congressState.activeAccords.length})
			</button>
			<button
				class="tab-btn"
				class:on={currentTab === 'rogues'}
				onclick={() => {
					currentTab = 'rogues';
					actionMsg = null;
				}}
			>
				⚔️ Rogue States ({congressState.rogueStates.length})
			</button>
			<button
				class="tab-btn"
				class:on={currentTab === 'megaprojects'}
				onclick={() => {
					currentTab = 'megaprojects';
					actionMsg = null;
				}}
			>
				🏗️ Planetary Megaprojects ({megaprojects.length})
			</button>
		</div>

		{#if actionMsg}
			<div class="alert-bar" class:alert-ok={actionMsg.type === 'ok'} class:alert-err={actionMsg.type === 'err'}>
				{actionMsg.text}
			</div>
		{/if}

		<!-- Body -->
		<div class="modal-body">
			{#if currentTab === 'chamber'}
				<div class="resolutions-grid">
					{#each activeSummit.resolutions as res (res.id)}
						<div class="card resolution-card" class:passed-card={res.passed}>
							<div class="card-head">
								<div>
									<div class="res-tag-row">
										<span class="chip tiny kind-chip">{res.kind.replace(/_/g, ' ')}</span>
										{#if res.passed}
											<span class="chip tiny ok-chip">Enacted Law</span>
										{/if}
									</div>
									<h4 class="card-title">{res.title}</h4>
								</div>
								<div class="vote-tally">
									<span class="vote-for-count">✓ {res.votesFor.length}</span>
									<span class="vote-div">/</span>
									<span class="vote-against-count">✗ {res.votesAgainst.length}</span>
								</div>
							</div>

							<p class="res-desc small muted">{res.desc}</p>

							<!-- Voting rosters -->
							<div class="rosters-section">
								<div class="roster-col">
									<strong class="tiny for-text">Aye ({res.votesFor.length}):</strong>
									<div class="chips-wrap">
										{#each res.votesFor as vid}
											{@const vPol = sim.polities[vid]}
											{#if vPol}
												<button
													class="chip tiny polity-chip for"
													onclick={() => onselectpolity?.(vPol.id)}
												>
													{vPol.name}
												</button>
											{/if}
										{/each}
									</div>
								</div>

								<div class="roster-col">
									<strong class="tiny against-text">Nay ({res.votesAgainst.length}):</strong>
									<div class="chips-wrap">
										{#each res.votesAgainst as vid}
											{@const vPol = sim.polities[vid]}
											{#if vPol}
												<button
													class="chip tiny polity-chip against"
													onclick={() => onselectpolity?.(vPol.id)}
												>
													{vPol.name}
												</button>
											{/if}
										{/each}
									</div>
								</div>
							</div>

							<!-- Player Vote Override -->
							<div class="vote-action-footer">
								<span class="tiny muted">Cast Sovereign Vote:</span>
								<div class="btn-group">
									{#each alivePolities.slice(0, 4) as pol}
										<div class="polity-vote-controls">
											<span class="tiny pol-label">{pol.name}:</span>
											<button
												class="btn tiny vote-btn"
												class:selected-for={res.votesFor.includes(pol.id)}
												onclick={() => handleVote(res.id, pol.id, true)}
											>
												Aye
											</button>
											<button
												class="btn tiny vote-btn"
												class:selected-against={res.votesAgainst.includes(pol.id)}
												onclick={() => handleVote(res.id, pol.id, false)}
											>
												Nay
											</button>
										</div>
									{/each}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			{#if currentTab === 'accords'}
				<div class="accords-view">
					<div class="panel-desc small muted">
						Binding international treaties currently enforced across all civilized sovereign states.
					</div>

					{#if congressState.activeAccords.length === 0}
						<div class="empty-state muted">
							No international accords have been ratified yet. Enact resolutions in the Voting Chamber.
						</div>
					{:else}
						<div class="accords-list">
							{#each congressState.activeAccords as accord}
								<div class="card accord-item">
									<div class="accord-icon">📜</div>
									<div class="accord-body">
										<h4 class="accord-title">{accord}</h4>
										<p class="small muted">
											Ratified by majority vote of the Grand World Congress. Sovereign member states receive collective economic, defensive, and naval privileges.
										</p>
									</div>
									<span class="chip gold small">Active Law</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			{#if currentTab === 'rogues'}
				<div class="rogues-view">
					<div class="panel-desc small muted">
						Pariah realms in defiance of international treaties or targeted by pan-continental trade embargoes.
					</div>

					{#if congressState.rogueStates.length === 0}
						<div class="empty-state muted">
							All sovereign nations currently respect the decrees of the World Congress.
						</div>
					{:else}
						<div class="rogues-list">
							{#each congressState.rogueStates as rid}
								{@const rogue = sim.polities[rid]}
								{#if rogue}
									<div class="card rogue-card">
										<div class="rogue-head">
											<div>
												<h4 class="card-title danger-text">⚠️ {rogue.name}</h4>
												<span class="tiny muted">Form: {rogue.form} · Ruler: {sim.people[rogue.ruler]?.name ?? 'Autocrat'}</span>
											</div>
											<span class="chip danger tiny">Under Sanctions</span>
										</div>
										<p class="small muted">
											Suffering -15% trade revenue penalties and international diplomatic isolation. Commercial caravans and maritime ships avoid rogue ports.
										</p>
										<div class="rogue-actions">
											<button class="btn tiny" onclick={() => onselectpolity?.(rogue.id)}>
												Inspect Realm
											</button>
										</div>
									</div>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			{#if currentTab === 'megaprojects'}
				<div class="megaprojects-view">
					<div class="initiate-box card">
						<div class="card-head">
							<h4 class="card-title">Initiate New Planetary Megaproject</h4>
						</div>
						<div class="initiate-controls">
							<div class="form-group">
								<label for="project-kind-select" class="tiny muted">Megaproject Kind:</label>
								<select id="project-kind-select" class="select tiny" bind:value={newProjectKind}>
									<option value="continental_canal">Continental Canal (Carves Sea Tiles & +40% Trade)</option>
									<option value="bastion_wall">Bastion Wall (Frontier Ramparts & +70% Defense)</option>
									<option value="celestial_orrery">Celestial Orrery (+15 Annual Innovation & Cosmic Rifts)</option>
								</select>
							</div>

							<div class="form-group">
								<label for="sponsor-realm-select" class="tiny muted">Sponsoring Realm:</label>
								<select id="sponsor-realm-select" class="select tiny" bind:value={sponsorStateId}>
									{#each alivePolities as p}
										<option value={p.id}>{p.name} ({p.treasury} Gold)</option>
									{/each}
								</select>
							</div>

							{#if newProjectKind === 'continental_canal' && canalSites.length > 0}
								<div class="form-group">
									<label for="canal-isthmus-select" class="tiny muted">Candidate Isthmus Site:</label>
									<select id="canal-isthmus-select" class="select tiny" bind:value={canalSiteIndex}>
										{#each canalSites as site, idx}
											<option value={idx}>{site.name} ({site.isthmusCells.length} cells, {site.cost} Gold)</option>
										{/each}
									</select>
								</div>
							{/if}

							<button class="btn gold-btn" onclick={handleInitiateProject}>
								Initiate Megaproject
							</button>
						</div>
					</div>

					<div class="active-projects-list">
						<h4>Active and Completed Works ({megaprojects.length})</h4>
						{#if megaprojects.length === 0}
							<div class="empty-state muted small">
								No planetary megaprojects are currently underway. Initiate one above.
							</div>
						{:else}
							<div class="cards-grid">
								{#each megaprojects as p (p.id)}
									{@const sponsor = sim.polities[p.sponsorStateId]}
									<div class="card project-card" class:completed-card={p.completed}>
										<div class="card-head">
											<div>
												<div class="tag-row">
													<span class="chip tiny kind-chip">{p.kind.replace('_', ' ')}</span>
													{#if p.completed}
														<span class="chip tiny gold">Completed in Year {p.completionYear}</span>
													{:else}
														<span class="chip tiny blue">In Progress ({p.progress}%)</span>
													{/if}
												</div>
												<h4 class="card-title">{p.name}</h4>
												<span class="tiny muted">Sponsored by {sponsor?.name ?? 'Sovereign Realm'}</span>
											</div>
											<div class="funding-tally">
												<span class="gold-text">{p.fundedGold}</span>
												<span class="muted">/ {p.totalCostGold} Gold</span>
											</div>
										</div>

										<p class="small muted">{p.benefitsDesc}</p>

										<!-- Progress Bar -->
										<div class="progress-track">
											<div class="progress-bar" style="width: {p.progress}%"></div>
										</div>

										{#if !p.completed}
											<div class="project-actions">
												<span class="tiny muted">Fund Construction:</span>
												<div class="fund-controls">
													<input
														type="number"
														class="input tiny"
														bind:value={contributeAmount}
														min="25"
														max="1000"
														step="25"
													/>
													<button class="btn tiny gold-btn" onclick={() => handleContribute(p.id)}>
														Contribute Gold
													</button>
												</div>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="mfoot">
			<span class="muted tiny">Grand World Congress · Planetary Sovereign Assembly</span>
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

	.summit-banner {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.6rem 1.25rem;
		background: rgba(201, 164, 92, 0.08);
		border-bottom: 1px solid var(--line, #383a4c);
	}

	.summit-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.summit-pill {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		background: rgba(201, 164, 92, 0.2);
		color: #e0b86a;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
	}

	.summit-host {
		font-size: 0.88rem;
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

	.enact-btn {
		background: rgba(46, 139, 87, 0.2);
		border-color: rgba(46, 139, 87, 0.5);
		color: #63d198;
	}

	.enact-btn:hover {
		background: rgba(46, 139, 87, 0.35);
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
		flex: 1;
		overflow-y: auto;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.resolutions-grid {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--line, #383a4c);
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.passed-card {
		border-color: rgba(46, 139, 87, 0.45);
		background: rgba(46, 139, 87, 0.04);
	}

	.card-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.res-tag-row, .tag-row {
		display: flex;
		gap: 0.35rem;
		margin-bottom: 0.2rem;
	}

	.card-title {
		margin: 0;
		font-size: 1.05rem;
	}

	.vote-tally {
		font-size: 1.05rem;
		font-weight: 600;
		display: flex;
		gap: 0.3rem;
		align-items: center;
		padding: 0.2rem 0.5rem;
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.25);
	}

	.vote-for-count {
		color: #63d198;
	}

	.vote-against-count {
		color: #ff8888;
	}

	.vote-div {
		opacity: 0.4;
	}

	.rosters-section {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.8rem;
		background: rgba(0, 0, 0, 0.15);
		padding: 0.6rem 0.8rem;
		border-radius: 6px;
	}

	.roster-col {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.chips-wrap {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
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

	.chip.blue {
		background: rgba(100, 149, 237, 0.2);
		border-color: rgba(100, 149, 237, 0.4);
		color: #8bb5fa;
	}

	.chip.kind-chip {
		text-transform: capitalize;
		opacity: 0.85;
	}

	.chip.ok-chip {
		background: rgba(46, 139, 87, 0.2);
		border-color: rgba(46, 139, 87, 0.4);
		color: #63d198;
	}

	.chip.danger {
		background: rgba(200, 50, 50, 0.2);
		border-color: rgba(200, 50, 50, 0.4);
		color: #ff8888;
	}

	.polity-chip {
		cursor: pointer;
		color: inherit;
	}

	.polity-chip.for {
		border-color: rgba(46, 139, 87, 0.4);
	}

	.polity-chip.against {
		border-color: rgba(200, 50, 50, 0.4);
	}

	.vote-action-footer {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		border-top: 1px solid var(--line, #383a4c);
		padding-top: 0.5rem;
	}

	.btn-group {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.polity-vote-controls {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		background: rgba(0, 0, 0, 0.12);
		padding: 0.2rem 0.4rem;
		border-radius: 4px;
	}

	.vote-btn.selected-for {
		background: rgba(46, 139, 87, 0.4);
		border-color: #63d198;
		color: #fff;
		font-weight: 600;
	}

	.vote-btn.selected-against {
		background: rgba(200, 50, 50, 0.4);
		border-color: #ff8888;
		color: #fff;
		font-weight: 600;
	}

	.accords-list, .rogues-list, .cards-grid {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.accord-item {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.accord-icon {
		font-size: 1.8rem;
	}

	.accord-body {
		flex: 1;
	}

	.accord-title {
		margin: 0 0 0.2rem 0;
	}

	.rogue-card {
		border-left: 3px solid #ff5555;
	}

	.rogue-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.megaprojects-view {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.initiate-box {
		background: rgba(0, 0, 0, 0.18);
	}

	.initiate-controls {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.select, .input {
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid var(--line, #383a4c);
		border-radius: 4px;
		color: inherit;
		padding: 0.35rem 0.6rem;
		font-size: 0.85rem;
	}

	.progress-track {
		width: 100%;
		height: 8px;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 4px;
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		background: linear-gradient(90deg, #e0b86a, #63d198);
		transition: width 0.3s ease;
	}

	.project-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.fund-controls {
		display: flex;
		gap: 0.4rem;
	}

	.empty-state {
		padding: 2.5rem 1rem;
		text-align: center;
		background: rgba(0, 0, 0, 0.05);
		border-radius: 8px;
		border: 1px dashed var(--line, #383a4c);
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

	.for-text {
		color: #63d198;
	}

	.against-text {
		color: #ff8888;
	}

	.gold-text {
		color: #e0b86a;
	}

	.danger-text {
		color: #ff8888;
	}
</style>
