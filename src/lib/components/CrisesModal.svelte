<script lang="ts">
	import type { Simulation } from '#lib/sim/engine';
	import {
		getActiveCrises,
		getAllCrises,
		quarantineCrisisArea,
		triggerPlanetaryCrisis,
		type CrisisKind,
		type WorldCrisis
	} from '#lib/sim/crises';
	import { onMount } from 'svelte';

	let {
		sim,
		v = 0,
		onclose,
		onselectcell,
		onrefresh
	}: {
		sim: Simulation;
		v?: number;
		onclose: () => void;
		onselectcell?: (cell: number) => void;
		onrefresh?: () => void;
	} = $props();

	let localV = $state(0);
	let selectedCrisisId = $state<number>(0);
	let fundingAmount = $state<number>(100);
	let actionMsg = $state<{ type: 'ok' | 'err'; text: string } | null>(null);
	let closeBtn = $state<HTMLButtonElement>();

	onMount(() => {
		closeBtn?.focus();
	});

	const activeCrises = $derived.by<WorldCrisis[]>(() => {
		void v;
		void localV;
		return getActiveCrises(sim);
	});

	const allCrises = $derived.by<WorldCrisis[]>(() => {
		void v;
		void localV;
		return getAllCrises(sim);
	});

	const currentCrisis = $derived.by<WorldCrisis | null>(() => {
		if (selectedCrisisId > 0) {
			const found = allCrises.find((c) => c.id === selectedCrisisId);
			if (found) return found;
		}
		return activeCrises.length > 0 ? activeCrises[0] : allCrises[0] ?? null;
	});

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			onclose();
		}
	}

	function handleFundQuarantine(crisisId: number, amount: number) {
		const res = quarantineCrisisArea(sim, crisisId, amount);
		actionMsg = { type: res.success ? 'ok' : 'err', text: res.msg };
		localV++;
		onrefresh?.();
	}

	function handleTrigger(kind: CrisisKind) {
		const c = triggerPlanetaryCrisis(sim, kind);
		selectedCrisisId = c.id;
		actionMsg = { type: 'ok', text: `Grand crisis initiated: ${c.name} has emerged at cell ${c.epicenter}!` };
		localV++;
		onrefresh?.();
	}

	function handleMobilizeAlliance(crisis: WorldCrisis) {
		// Mobilize living polities into mutual emergency response
		let mobilizedStates = 0;
		for (const pol of sim.polities) {
			if (pol && pol.id > 0 && pol.alive) {
				pol.treasury = Math.max(0, pol.treasury - 30);
				pol.stability = Math.min(100, pol.stability + 10);
				mobilizedStates++;
			}
		}
		// Apply combined emergency funds to the crisis
		const allianceFunds = Math.max(100, mobilizedStates * 30);
		quarantineCrisisArea(sim, crisis.id, allianceFunds);
		const msg = `Grand Planetary Coalition formed: ${mobilizedStates} sovereign realms pledge emergency treasuries totaling ${allianceFunds} gold to suppress ${crisis.name}!`;
		sim.log('disaster', msg, crisis.epicenter);
		actionMsg = { type: 'ok', text: msg };
		localV++;
		onrefresh?.();
	}

	function getKindIcon(kind: CrisisKind): string {
		if (kind === 'pale_blight') return '🌫️';
		if (kind === 'midas_curse') return '🪙';
		if (kind === 'blood_eclipse') return '🩸';
		return '⚠️';
	}

	function getKindBadge(kind: CrisisKind): string {
		if (kind === 'pale_blight') return 'PALE BLIGHT';
		if (kind === 'midas_curse') return 'MIDAS CURSE';
		if (kind === 'blood_eclipse') return 'BLOOD ECLIPSE';
		return 'CRISIS';
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
		aria-labelledby="crises-title"
		tabindex="-1"
	>
		<header class="mhead">
			<div>
				<h2 id="crises-title">Planetary Grand Crises</h2>
				<p class="muted small">
					Realm Year {sim.year} · Planetary contagions, astrological cataclysms, and quarantine management.
				</p>
			</div>
			<button class="btn icon" bind:this={closeBtn} onclick={onclose} aria-label="Close dialog">✕</button>
		</header>

		{#if actionMsg}
			<div class="msg-box" class:ok={actionMsg.type === 'ok'} class:err={actionMsg.type === 'err'}>
				{actionMsg.text}
			</div>
		{/if}

		<!-- Active Threats Radar / Overview -->
		<div class="radar-header">
			<div class="radar-title">
				<span class="radar-pulse"></span>
				<strong>PLANETARY THREAT RADAR</strong>
			</div>
			<div class="chip" class:alert={activeCrises.length > 0}>
				{activeCrises.length} Active Threat{activeCrises.length === 1 ? '' : 's'}
			</div>
		</div>

		{#if allCrises.length === 0}
			<div class="empty-state">
				<div class="empty-icon">🛡️</div>
				<h3>The Planets Are In Balance</h3>
				<p class="muted small">
					No grand planetary crises are currently unfolding across the realms.
				</p>
			</div>
		{:else}
			<div class="crises-layout">
				<!-- Threat List -->
				<div class="crisis-selector-list">
					{#each allCrises as c}
						<button
							type="button"
							class="threat-item-btn"
							class:active={currentCrisis?.id === c.id}
							class:cured={Boolean(c.curedYear)}
							onclick={() => (selectedCrisisId = c.id)}
						>
							<div class="threat-icon">{getKindIcon(c.kind)}</div>
							<div class="threat-summary">
								<div class="threat-name-row">
									<strong class="threat-title">{c.name}</strong>
									<span class="chip tiny" class:contained-chip={c.contained && !c.curedYear}>
										{c.curedYear ? 'CURED' : c.contained ? 'CONTAINED' : 'SPREADING'}
									</span>
								</div>
								<div class="threat-meta tiny muted">
									Intensity: {c.intensity}% · Casualties: {c.casualties.toLocaleString()}
								</div>
							</div>
						</button>
					{/each}
				</div>

				<!-- Selected Threat Details -->
				{#if currentCrisis}
					<div class="crisis-detail-card">
						<div class="card-head">
							<div>
								<span class="chip kind-chip">{getKindBadge(currentCrisis.kind)}</span>
								<h3 class="crisis-headline">{currentCrisis.name}</h3>
								<p class="crisis-lore">{currentCrisis.description}</p>
							</div>
						</div>

						<!-- Contagion Intensity Meter -->
						<div class="meter-block">
							<div class="meter-labels">
								<span class="small bold">CONTAGION INTENSITY</span>
								<span class="small bold" class:high-danger={currentCrisis.intensity > 50}>
									{currentCrisis.intensity}%
								</span>
							</div>
							<div class="intensity-bar">
								<div
									class="intensity-fill"
									class:high={currentCrisis.intensity > 60}
									class:mid={currentCrisis.intensity > 25 && currentCrisis.intensity <= 60}
									class:low={currentCrisis.intensity <= 25}
									style="width: {currentCrisis.intensity}%"
								></div>
							</div>
						</div>

						<!-- Statistics Grid -->
						<div class="stats-grid">
							<div class="s-tile">
								<div class="s-label">EPICENTER CELL</div>
								<div class="s-val">
									{#if onselectcell}
										<button
											class="cell-link-btn"
											onclick={() => onselectcell?.(currentCrisis.epicenter)}
										>
											Cell #{currentCrisis.epicenter} 🔍
										</button>
									{:else}
										Cell #{currentCrisis.epicenter}
									{/if}
								</div>
							</div>

							<div class="s-tile">
								<div class="s-label">BLIGHTED REGION</div>
								<div class="s-val">{currentCrisis.blightedCells.length} Tiles</div>
							</div>

							<div class="s-tile">
								<div class="s-label">ACTIVE THREAT HORDES</div>
								<div class="s-val">{currentCrisis.activeHordes} Hordes</div>
							</div>

							<div class="s-tile">
								<div class="s-label">ESTIMATED CASUALTIES</div>
								<div class="s-val danger-text">{currentCrisis.casualties.toLocaleString()}</div>
							</div>
						</div>

						{#if !currentCrisis.curedYear}
							<!-- Quarantine Controls -->
							<div class="quarantine-box">
								<h4>Quarantine and Arcane Containment</h4>
								<p class="muted tiny">
									Dispatch sanitation legions, alchemical wards, and divine containment cordons to halt contagion.
								</p>

								<div class="funding-controls">
									<div class="preset-funds">
										<button class="btn tiny" onclick={() => (fundingAmount = 50)}>50g</button>
										<button class="btn tiny" onclick={() => (fundingAmount = 100)}>100g</button>
										<button class="btn tiny" onclick={() => (fundingAmount = 250)}>250g</button>
										<button class="btn tiny" onclick={() => (fundingAmount = 500)}>500g</button>
									</div>

									<div class="fund-input-row">
										<label for="fund-amt" class="small">Gold Allocation:</label>
										<input
											id="fund-amt"
											type="number"
											class="number-input"
											bind:value={fundingAmount}
											min="10"
											step="25"
										/>
										<button
											class="btn primary"
											onclick={() => handleFundQuarantine(currentCrisis.id, fundingAmount)}
										>
											Establish Containment Wards
										</button>
									</div>
								</div>
							</div>

							<!-- Emergency Alliance Call -->
							<div class="alliance-box">
								<div class="alliance-info">
									<strong>Emergency Planetary Alliance</strong>
									<p class="tiny muted">
										Summon rulers into a unified coalition to pool gold reserves and crush the crisis.
									</p>
								</div>
								<button class="btn emergency-btn" onclick={() => handleMobilizeAlliance(currentCrisis)}>
									Mobilize Grand Coalition
								</button>
							</div>
						{:else}
							<div class="cured-banner">
								✓ This crisis was eradicated in Realm Year {currentCrisis.curedYear}.
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Trigger Crises Sandbox Panel -->
		<div class="trigger-panel">
			<h4>Divine Spark: Unleash Planetary Crisis (Sandbox)</h4>
			<p class="muted tiny">
				Awaken dormant celestial horrors or alchemical plagues for testing.
			</p>
			<div class="trigger-btn-row">
				<button class="btn trigger-btn" onclick={() => handleTrigger('pale_blight')}>
					🌫️ Trigger Pale Blight
				</button>
				<button class="btn trigger-btn" onclick={() => handleTrigger('midas_curse')}>
					🪙 Trigger Midas Curse
				</button>
				<button class="btn trigger-btn" onclick={() => handleTrigger('blood_eclipse')}>
					🩸 Trigger Blood Eclipse
				</button>
			</div>
		</div>
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
		max-width: 860px;
		max-height: 88vh;
		width: 100%;
		padding: 1.4rem;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
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
	.radar-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0.8rem;
		background: rgba(0, 0, 0, 0.03);
		border: 1px solid var(--line);
		border-radius: 8px;
	}
	.radar-title {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.85rem;
		letter-spacing: 0.05em;
	}
	.radar-pulse {
		display: inline-block;
		width: 8px;
		height: 8px;
		background: #ff5555;
		border-radius: 50%;
		box-shadow: 0 0 8px #ff5555;
	}
	.chip.alert {
		background: rgba(200, 50, 50, 0.12);
		border-color: #c83232;
		color: #a82020;
		font-weight: 600;
	}
	.crises-layout {
		display: grid;
		grid-template-columns: 280px 1fr;
		gap: 1rem;
	}
	.crisis-selector-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.threat-item-btn {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		padding: 0.6rem 0.8rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--vellum);
		cursor: pointer;
		text-align: left;
		transition: border-color 0.15s, background 0.15s;
	}
	.threat-item-btn:hover {
		border-color: var(--accent);
	}
	.threat-item-btn.active {
		border-color: var(--accent);
		background: rgba(201, 164, 92, 0.1);
		box-shadow: 0 0 0 1px var(--accent);
	}
	.threat-item-btn.cured {
		opacity: 0.65;
	}
	.threat-icon {
		font-size: 1.4rem;
	}
	.threat-summary {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.threat-name-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.3rem;
	}
	.threat-title {
		font-size: 0.86rem;
	}
	.contained-chip {
		background: rgba(46, 139, 87, 0.15);
		border-color: #2e8b57;
		color: #277949;
	}
	.crisis-detail-card {
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 1.2rem;
		background: var(--vellum);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.crisis-headline {
		font-size: 1.25rem;
		margin: 0.2rem 0;
	}
	.crisis-lore {
		font-size: 0.86rem;
		opacity: 0.85;
		margin: 0.2rem 0;
	}
	.kind-chip {
		font-size: 0.72rem;
		letter-spacing: 0.05em;
		font-weight: 600;
	}
	.meter-block {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		background: rgba(0, 0, 0, 0.03);
		padding: 0.7rem;
		border-radius: 6px;
		border: 1px solid var(--line);
	}
	.meter-labels {
		display: flex;
		justify-content: space-between;
	}
	.intensity-bar {
		height: 10px;
		background: rgba(0, 0, 0, 0.08);
		border-radius: 99px;
		overflow: hidden;
		border: 1px solid var(--line);
	}
	.intensity-fill {
		height: 100%;
		transition: width 0.3s ease;
	}
	.intensity-fill.high {
		background: linear-gradient(90deg, #e05555 0%, #ff2222 100%);
	}
	.intensity-fill.mid {
		background: linear-gradient(90deg, #e09620 0%, #ffaa33 100%);
	}
	.intensity-fill.low {
		background: linear-gradient(90deg, #2e8b57 0%, #44cc88 100%);
	}
	.high-danger {
		color: #cc2222;
	}
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.6rem;
	}
	.s-tile {
		background: rgba(0, 0, 0, 0.02);
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 0.5rem 0.7rem;
	}
	.s-label {
		font-size: 0.68rem;
		opacity: 0.7;
		letter-spacing: 0.04em;
	}
	.s-val {
		font-size: 1.05rem;
		font-weight: 600;
	}
	.cell-link-btn {
		background: none;
		border: none;
		padding: 0;
		color: var(--accent);
		text-decoration: underline;
		cursor: pointer;
		font: inherit;
	}
	.quarantine-box {
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.9rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		background: rgba(201, 164, 92, 0.05);
	}
	.quarantine-box h4 {
		margin: 0;
		font-size: 0.95rem;
	}
	.funding-controls {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.preset-funds {
		display: flex;
		gap: 0.4rem;
	}
	.fund-input-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}
	.number-input {
		width: 100px;
		padding: 0.35rem 0.5rem;
		border: 1px solid var(--line);
		border-radius: 4px;
		background: var(--vellum);
	}
	.alliance-box {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.8rem;
		padding: 0.8rem 1rem;
		border: 1px solid #c89632;
		background: rgba(200, 150, 50, 0.08);
		border-radius: 8px;
	}
	.emergency-btn {
		background: #c89632;
		color: #1b140c;
		font-weight: 600;
		border-color: #b08020;
		white-space: nowrap;
	}
	.cured-banner {
		padding: 0.8rem;
		border-radius: 6px;
		background: rgba(46, 139, 87, 0.12);
		border: 1px solid #2e8b57;
		color: #277949;
		font-weight: 600;
		text-align: center;
	}
	.trigger-panel {
		border-top: 1px solid var(--line);
		padding-top: 0.8rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.trigger-panel h4 {
		margin: 0;
		font-size: 0.88rem;
	}
	.trigger-btn-row {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.trigger-btn {
		font-size: 0.82rem;
		padding: 0.4rem 0.8rem;
	}
	.empty-state {
		text-align: center;
		padding: 2.5rem 1rem;
		border: 1px dashed var(--line);
		border-radius: 8px;
	}
	.empty-icon {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
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
	.danger-text {
		color: #cc2222;
	}
</style>
