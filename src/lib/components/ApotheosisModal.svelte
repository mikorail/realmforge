<script lang="ts">
	import type { Simulation } from '#lib/sim/engine';
	import {
		canAscendToGodhood,
		performApotheosis,
		castApotheosisMiracle,
		getApotheosis,
		PORTFOLIO_CONFIG,
		type ApotheosisPortfolio,
		type ApotheosisState
	} from '#lib/sim/apotheosis';
	import { onMount } from 'svelte';

	let {
		sim,
		personId,
		v = 0,
		onclose,
		onrefresh
	}: {
		sim: Simulation;
		personId?: number;
		v?: number;
		onclose: () => void;
		onrefresh?: () => void;
	} = $props();

	let localV = $state(0);
	let selectedPortfolio = $state<ApotheosisPortfolio>('sun');
	let customDeityName = $state('');
	let customOrderName = $state('');
	let targetCell = $state<number>(0);
	let actionMsg = $state<{ type: 'ok' | 'err'; text: string } | null>(null);
	let closeBtn = $state<HTMLButtonElement>();

	onMount(() => {
		closeBtn?.focus();
	});

	const activePersonId = $derived.by(() => {
		if (personId !== undefined && personId > 0 && sim.people[personId]) {
			return personId;
		}
		if (sim.avatar > 0 && sim.people[sim.avatar]) {
			return sim.avatar;
		}
		// Default to first living hero or ruler
		const cand = sim.people.find((p) => p && p.id > 0 && p.alive && (p.role === 'ruler' || p.role === 'hero'));
		return cand ? cand.id : 1;
	});

	const person = $derived.by(() => {
		void v;
		void localV;
		return sim.people[activePersonId];
	});

	const apotheosis = $derived.by<ApotheosisState | null>(() => {
		void v;
		void localV;
		return getApotheosis(sim, activePersonId);
	});

	const eligibility = $derived.by(() => {
		void v;
		void localV;
		return canAscendToGodhood(sim, activePersonId);
	});

	const portfolioList: ApotheosisPortfolio[] = [
		'sun',
		'war',
		'storm',
		'secrets',
		'harvest',
		'death',
		'forge',
		'chaos',
		'abyss'
	];

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			onclose();
		}
	}

	function handleAscend() {
		try {
			const res = performApotheosis(
				sim,
				activePersonId,
				selectedPortfolio,
				customDeityName.trim() || undefined,
				customOrderName.trim() || undefined
			);
			actionMsg = { type: 'ok', text: res.msg };
			localV++;
			onrefresh?.();
		} catch (err: any) {
			actionMsg = { type: 'err', text: err?.message || 'Ascension ritual failed.' };
		}
	}

	function handleCast(miracle: 'smite_army' | 'bless_province' | 'quell_revolt' | 'avatar_host') {
		const cell = targetCell > 0 && targetCell < sim.w.cells.n ? targetCell : (person?.burg > 0 ? sim.w.burgs[person.burg]?.cell ?? 0 : 0);
		const res = castApotheosisMiracle(sim, activePersonId, miracle, cell);
		actionMsg = { type: res.success ? 'ok' : 'err', text: res.msg };
		localV++;
		onrefresh?.();
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
		aria-labelledby="apotheosis-title"
		tabindex="-1"
	>
		<header class="mhead">
			<div>
				<h2 id="apotheosis-title">Apotheosis and Divine Ascension</h2>
				<p class="muted small">
					Realm Year {sim.year} · Transcend mortal limits into an immortal God-King.
				</p>
			</div>
			<button class="btn icon" bind:this={closeBtn} onclick={onclose} aria-label="Close dialog">✕</button>
		</header>

		{#if actionMsg}
			<div class="msg-box" class:ok={actionMsg.type === 'ok'} class:err={actionMsg.type === 'err'}>
				{actionMsg.text}
			</div>
		{/if}

		{#if person}
			<div class="candidate-card">
				<div class="candidate-header">
					<div class="avatar-badge">⚡</div>
					<div>
						<div class="candidate-name">{person.name} {person.house ? `of House ${person.house}` : ''}</div>
						<div class="muted small">
							Role: {person.role} · Renown: {person.renown ?? 0} · State: {person.state > 0 && sim.polities[person.state] ? sim.polities[person.state].name : 'Wandering'}
						</div>
					</div>
				</div>
			</div>
		{/if}

		{#if apotheosis && apotheosis.ascended}
			<!-- ASCENDED DIVINE GODHOOD VIEW -->
			<section class="ascended-section">
				<div class="radiant-card">
					<div class="divine-titles">
						<span class="chip gold">{apotheosis.portfolio.toUpperCase()} DEITY</span>
						<h3 class="divine-name">{apotheosis.deityName}</h3>
						<p class="constellation-text">Constellation: <strong>{apotheosis.constellation}</strong></p>
						<p class="muted small">Holy Order: <strong>{apotheosis.holyOrderName}</strong></p>
					</div>

					<div class="stats-row">
						<div class="stat-box">
							<div class="stat-label">PRAYER MANA</div>
							<div class="stat-value">{apotheosis.prayerMana}</div>
						</div>
						<div class="stat-box">
							<div class="stat-label">DEVOUT FOLLOWERS</div>
							<div class="stat-value">{apotheosis.followers.toLocaleString()}</div>
						</div>
						<div class="stat-box">
							<div class="stat-label">MIRACLES ENACTED</div>
							<div class="stat-value">{apotheosis.miraclesCast}</div>
						</div>
					</div>

					<!-- Prayer Mana Gauge -->
					<div class="mana-gauge-wrap">
						<div class="gauge-head">
							<span class="tiny bold">SACRED PRAYER RESONANCE</span>
							<span class="tiny muted">{apotheosis.prayerMana} Mana Available</span>
						</div>
						<div class="gauge-bar">
							<div
								class="gauge-fill"
								style="width: {Math.min(100, Math.round((apotheosis.prayerMana / 150) * 100))}%"
							></div>
						</div>
					</div>

					<!-- Domain Perks -->
					<div class="perks-section">
						<h4>Domain Perks</h4>
						<div class="perks-tags">
							{#each apotheosis.domainPerks as perk}
								<span class="chip perk-chip">✦ {perk}</span>
							{/each}
						</div>
					</div>
				</div>

				<!-- Miracle Invocations -->
				<div class="miracles-card">
					<h3>Invoke Divine Miracles</h3>
					<p class="muted small">
						Direct celestial intervention to protect the faithful and vanquish mortal threats.
					</p>

					<div class="target-row">
						<label for="cell-target" class="small">Target Cell:</label>
						<input
							id="cell-target"
							type="number"
							class="cell-input"
							bind:value={targetCell}
							min="0"
							max={sim.w.cells.n - 1}
							placeholder="Cell ID (0-{sim.w.cells.n - 1})"
						/>
					</div>

					<div class="miracles-grid">
						<button
							class="btn miracle-btn"
							disabled={apotheosis.prayerMana < 40}
							onclick={() => handleCast('smite_army')}
						>
							<div class="m-icon">⚡</div>
							<div class="m-info">
								<strong>Smite Hostile Army</strong>
								<span class="small muted">Shatters enemy regiments and strikes titans.</span>
							</div>
							<span class="cost-badge">40 Mana</span>
						</button>

						<button
							class="btn miracle-btn"
							disabled={apotheosis.prayerMana < 30}
							onclick={() => handleCast('bless_province')}
						>
							<div class="m-icon">🌿</div>
							<div class="m-info">
								<strong>Bless Province</strong>
								<span class="small muted">Purifies pestilence, enhances harvests and stability.</span>
							</div>
							<span class="cost-badge">30 Mana</span>
						</button>

						<button
							class="btn miracle-btn"
							disabled={apotheosis.prayerMana < 35}
							onclick={() => handleCast('quell_revolt')}
						>
							<div class="m-icon">🕊️</div>
							<div class="m-info">
								<strong>Quell Heretical Revolt</strong>
								<span class="small muted">Pacifies active rebellions and unrest.</span>
							</div>
							<span class="cost-badge">35 Mana</span>
						</button>

						<button
							class="btn miracle-btn"
							disabled={apotheosis.prayerMana < 50}
							onclick={() => handleCast('avatar_host')}
						>
							<div class="m-icon">👑</div>
							<div class="m-info">
								<strong>Manifest Avatar Host</strong>
								<span class="small muted">Summons celestial spirits and restores vitality.</span>
							</div>
							<span class="cost-badge">50 Mana</span>
						</button>
					</div>
				</div>
			</section>
		{:else}
			<!-- MORTAL CANDIDATE ASCENSION CEREMONY -->
			<section class="ceremony-section">
				<!-- Eligibility Checklist -->
				<div class="checklist-card">
					<h3>Divine Spark Eligibility</h3>
					<div class="checklist">
						<div class="check-item" class:met={(person?.renown ?? 0) >= 85}>
							<span class="check-icon">{(person?.renown ?? 0) >= 85 ? '✓' : '○'}</span>
							<div>
								<strong>Mortal Renown 85+</strong>
								<p class="tiny muted">Current Renown: {person?.renown ?? 0} / 85</p>
							</div>
						</div>

						<div class="check-item" class:met={eligibility.reqTrophyOrFeat}>
							<span class="check-icon">{eligibility.reqTrophyOrFeat ? '✓' : '○'}</span>
							<div>
								<strong>Cataclysm Beast Slayer or Legendary Reign</strong>
								<p class="tiny muted">Proof of slaying cataclysmic horrors or ruling as archmage / sovereign.</p>
							</div>
						</div>
					</div>

					<div class="status-box" class:ready={eligibility.eligible}>
						<span class="bold">Status:</span> {eligibility.reason}
					</div>
				</div>

				<!-- Portfolio Selection -->
				<div class="portfolio-section">
					<h3>Choose Divine Portfolio</h3>
					<div class="portfolio-grid">
						{#each portfolioList as p}
							{@const conf = PORTFOLIO_CONFIG[p]}
							<button
								type="button"
								class="portfolio-card"
								class:selected={selectedPortfolio === p}
								onclick={() => (selectedPortfolio = p)}
							>
								<div class="p-header">
									<span class="p-title">{conf.title}</span>
									<span class="chip tiny">{p.toUpperCase()}</span>
								</div>
								<div class="constellation-mini">✦ {conf.constellation}</div>
								<div class="perks-mini">
									{#each conf.perks as perk}
										<span class="perk-bullet">· {perk}</span>
									{/each}
								</div>
							</button>
						{/each}
					</div>
				</div>

				<!-- Name Customization -->
				<div class="naming-card">
					<h3>Sacred Consecration</h3>
					<div class="form-row">
						<label for="deity-name" class="small">Divine Deity Title (optional):</label>
						<input
							id="deity-name"
							class="text-input"
							type="text"
							bind:value={customDeityName}
							placeholder="{person?.name} {PORTFOLIO_CONFIG[selectedPortfolio].namePrefix}"
						/>
					</div>

					<div class="form-row">
						<label for="order-name" class="small">Holy Order Designation (optional):</label>
						<input
							id="order-name"
							class="text-input"
							type="text"
							bind:value={customOrderName}
							placeholder={PORTFOLIO_CONFIG[selectedPortfolio].orderDefault}
						/>
					</div>
				</div>

				<!-- Action Controls -->
				<div class="action-footer">
					<button
						class="btn primary ascend-btn"
						disabled={!eligibility.eligible && !sim.sandbox}
						onclick={handleAscend}
					>
						✨ Ascend to Divine Godhood
					</button>
					{#if !eligibility.eligible && sim.sandbox}
						<span class="tiny muted">Sandbox bypass enabled for deity ascension testing.</span>
					{/if}
				</div>
			</section>
		{/if}
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(8, 6, 4, 0.78);
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
		max-width: 820px;
		max-height: 88vh;
		width: 100%;
		padding: 1.4rem;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
	}
	.mhead {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		border-bottom: 1px solid var(--line);
		padding-bottom: 0.8rem;
	}
	.mhead h2 {
		margin: 0 0 0.2rem 0;
		font-size: 1.35rem;
	}
	.msg-box {
		padding: 0.6rem 0.9rem;
		border-radius: 6px;
		font-size: 0.88rem;
		line-height: 1.3;
	}
	.msg-box.ok {
		background: rgba(46, 139, 87, 0.12);
		border: 1px solid #2e8b57;
		color: #277949;
	}
	.msg-box.err {
		background: rgba(200, 50, 50, 0.12);
		border: 1px solid #c83232;
		color: #a82020;
	}
	.candidate-card {
		background: rgba(0, 0, 0, 0.03);
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.8rem 1rem;
	}
	.candidate-header {
		display: flex;
		align-items: center;
		gap: 0.8rem;
	}
	.avatar-badge {
		font-size: 1.5rem;
		width: 2.4rem;
		height: 2.4rem;
		background: var(--accent);
		color: var(--ink);
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
	}
	.candidate-name {
		font-size: 1.1rem;
		font-weight: 600;
	}
	.radiant-card {
		background: linear-gradient(135deg, rgba(201, 164, 92, 0.12) 0%, rgba(201, 164, 92, 0.02) 100%);
		border: 1px solid var(--accent);
		border-radius: 10px;
		padding: 1.2rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.divine-name {
		font-size: 1.4rem;
		margin: 0.3rem 0;
	}
	.constellation-text {
		margin: 0.2rem 0;
		font-size: 0.95rem;
	}
	.stats-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.8rem;
		margin-top: 0.5rem;
	}
	.stat-box {
		background: rgba(0, 0, 0, 0.04);
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 0.6rem;
		text-align: center;
	}
	.stat-label {
		font-size: 0.68rem;
		letter-spacing: 0.06em;
		opacity: 0.75;
	}
	.stat-value {
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--accent);
	}
	.mana-gauge-wrap {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.gauge-head {
		display: flex;
		justify-content: space-between;
	}
	.gauge-bar {
		height: 10px;
		background: rgba(0, 0, 0, 0.08);
		border-radius: 99px;
		overflow: hidden;
		border: 1px solid var(--line);
	}
	.gauge-fill {
		height: 100%;
		background: linear-gradient(90deg, #c9a45c 0%, #ffd700 100%);
		transition: width 0.3s ease;
	}
	.perks-section h4 {
		margin: 0 0 0.4rem 0;
		font-size: 0.85rem;
		letter-spacing: 0.04em;
	}
	.perks-tags {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
	.perk-chip {
		background: rgba(201, 164, 92, 0.15);
		border-color: var(--accent);
		color: var(--ink);
	}
	.miracles-card {
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 1.2rem;
		margin-top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}
	.target-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin: 0.3rem 0;
	}
	.cell-input {
		width: 140px;
		padding: 0.3rem 0.5rem;
		border: 1px solid var(--line);
		border-radius: 4px;
		background: var(--vellum);
	}
	.miracles-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.8rem;
	}
	.miracle-btn {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.8rem;
		text-align: left;
		background: rgba(0, 0, 0, 0.02);
		border: 1px solid var(--line);
		border-radius: 8px;
	}
	.miracle-btn:hover:not(:disabled) {
		border-color: var(--accent);
		background: rgba(201, 164, 92, 0.08);
	}
	.m-icon {
		font-size: 1.4rem;
	}
	.m-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.cost-badge {
		font-size: 0.72rem;
		font-weight: 600;
		background: rgba(201, 164, 92, 0.2);
		padding: 0.2rem 0.4rem;
		border-radius: 4px;
		white-space: nowrap;
	}
	.checklist-card {
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.checklist {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.check-item {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		padding: 0.4rem;
		border-radius: 6px;
	}
	.check-item.met {
		background: rgba(46, 139, 87, 0.06);
	}
	.check-icon {
		font-weight: 700;
		font-size: 1.1rem;
		width: 1.2rem;
	}
	.status-box {
		padding: 0.5rem 0.8rem;
		border-radius: 6px;
		font-size: 0.85rem;
		background: rgba(0, 0, 0, 0.04);
		border-left: 3px solid var(--line);
	}
	.status-box.ready {
		border-left-color: #2e8b57;
		background: rgba(46, 139, 87, 0.08);
	}
	.portfolio-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.6rem;
	}
	.portfolio-card {
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.7rem;
		text-align: left;
		background: var(--vellum);
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		transition: border-color 0.15s, background 0.15s;
	}
	.portfolio-card:hover {
		border-color: var(--accent);
	}
	.portfolio-card.selected {
		border-color: var(--accent);
		background: rgba(201, 164, 92, 0.12);
		box-shadow: 0 0 0 1px var(--accent);
	}
	.p-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.p-title {
		font-weight: 600;
		font-size: 0.9rem;
	}
	.constellation-mini {
		font-size: 0.78rem;
		color: var(--accent);
	}
	.perks-mini {
		display: flex;
		flex-direction: column;
		font-size: 0.72rem;
		opacity: 0.8;
	}
	.naming-card {
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.form-row {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.text-input {
		padding: 0.45rem 0.7rem;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--vellum);
	}
	.action-footer {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}
	.ascend-btn {
		font-size: 1.05rem;
		padding: 0.6rem 1.6rem;
	}
	.small {
		font-size: 0.84rem;
	}
	.tiny {
		font-size: 0.74rem;
	}
	.muted {
		opacity: 0.75;
	}
	.bold {
		font-weight: 600;
	}
</style>
