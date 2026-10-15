<script lang="ts">
	import type { Simulation } from '#lib/sim/engine';
	import type { DelveDungeon } from '#lib/sim/delves';
	import { attemptDelveRoom } from '#lib/sim/delves';
	import {
		assignPartyRole,
		getPartyAggregateSkills,
		type PartyRole
	} from '#lib/sim/party';

	let {
		sim,
		v = 0,
		dungeon,
		onclose,
		onchanged
	}: {
		sim: Simulation;
		v?: number;
		dungeon: DelveDungeon;
		onclose: () => void;
		onchanged?: () => void;
	} = $props();

	let localV = $state(0);
	let outcome = $state<{
		success: boolean;
		text: string;
		damage: number;
		gold: number;
		relicAwarded?: string;
		finished: boolean;
	} | null>(null);

	const avatar = $derived.by(() => {
		void v;
		void localV;
		return sim.avatar >= 0 ? sim.people[sim.avatar] : null;
	});

	const companions = $derived.by(() => {
		void v;
		void localV;
		return (avatar?.companions ?? [])
			.map((id) => sim.people[id])
			.filter((p) => p && p.alive);
	});

	const skills = $derived.by(() => {
		void v;
		void localV;
		return avatar
			? getPartyAggregateSkills(sim, avatar.id)
			: { martial: 0, diplomacy: 0, stewardship: 0, intrigue: 0, arcana: 0 };
	});

	const currentRoom = $derived.by(() => {
		void v;
		void localV;
		return dungeon.rooms[dungeon.currentRoom] ?? null;
	});

	const THEME_NAMES: Record<string, string> = {
		ancient_catacomb: 'Ancient Catacomb',
		sunken_vault: 'Sunken Vault',
		arcane_labyrinth: 'Arcane Labyrinth',
		underdark_chasm: 'Underdark Chasm',
		titan_barrow: 'Titan Barrow'
	};

	const ALL_ROLES: PartyRole[] = ['champion', 'spymaster', 'quartermaster', 'lorekeeper'];

	function handleAction(tactic: 'assault' | 'cunning' | 'lore' | 'bribe') {
		if (!avatar) return;
		outcome = attemptDelveRoom(sim, dungeon, avatar.id, tactic);
		localV++;
		onchanged?.();
	}

	function handleSetRole(personId: number, role: PartyRole) {
		assignPartyRole(sim, personId, role);
		localV++;
		onchanged?.();
	}

	function retreat() {
		if (sim.log && avatar) {
			sim.log('avatar', `${avatar.name}'s company retreated from ${dungeon.name}.`);
		}
		onclose();
	}

	function healthColor(hp: number): string {
		if (hp > 50) return '#4caf50';
		if (hp > 25) return '#ff9800';
		return 'var(--danger, #f44336)';
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') {
			onclose();
		}
	}}
/>

<div class="overlay" role="presentation">
	<div
		class="modal"
		role="dialog"
		aria-modal="true"
		aria-labelledby="delve-title"
	>
		<!-- Header -->
		<header class="mhead">
			<div class="title-block">
				<div class="title-row">
					<h2 id="delve-title">{dungeon.name}</h2>
					<span class="chip theme-chip">{THEME_NAMES[dungeon.theme] ?? dungeon.theme}</span>
					{#if dungeon.cleared}
						<span class="chip gold">Conquered</span>
					{:else}
						<span class="chip depth-chip">Chamber {dungeon.currentRoom + 1} of {dungeon.rooms.length}</span>
					{/if}
				</div>
				<p class="muted small">Procedural Delve at cell {dungeon.cell}, layer {dungeon.layer}</p>
			</div>
			<button class="close-btn" aria-label="Close dialog" onclick={retreat}>✕</button>
		</header>

		<!-- Live Loot Accumulator -->
		<div class="loot-bar">
			<div class="loot-item">
				<span class="loot-label">Loot Plundered:</span>
				<strong class="gold-text">💰 {dungeon.lootEarned.gold} gold</strong>
			</div>
			<div class="loot-item relics-list">
				<span class="loot-label">Relics Recovered:</span>
				{#if dungeon.lootEarned.relics.length}
					{#each dungeon.lootEarned.relics as rel (rel)}
						<span class="chip gold tiny">✦ {rel}</span>
					{/each}
				{:else}
					<span class="muted small">None yet</span>
				{/if}
			</div>
		</div>

		<!-- Chamber Narrative & Atmospheric Description -->
		<section class="chamber-card">
			{#if dungeon.cleared}
				<div class="triumph-box">
					<h3>🏆 Dungeon Cleared in Full</h3>
					<p>Every guardian has fallen and every ancient ward has been dismantled. Your company emerges bearing rich plunder and legendary renown.</p>
					<div class="triumph-stats">
						<span>Gold: <strong>{dungeon.lootEarned.gold}</strong></span>
						<span>Relics: <strong>{dungeon.lootEarned.relics.length}</strong></span>
					</div>
					<button class="btn primary" onclick={onclose}>Return to Surface in Triumph</button>
				</div>
			{:else if currentRoom}
				<div class="room-head">
					<div class="room-title">
						<h3>{currentRoom.name}</h3>
						<span class="chip tiny room-type">{currentRoom.type.toUpperCase()}</span>
						<span class="chip tiny dc-chip">DC {currentRoom.dc} ({currentRoom.challengeStat})</span>
					</div>
					<span class="gold-text small">Vault: ~{currentRoom.gold}g</span>
				</div>
				<p class="room-desc">{currentRoom.description}</p>

				{#if outcome}
					<div class="outcome-banner" class:ok={outcome.success} class:err={!outcome.success}>
						<strong>{outcome.success ? 'Victory!' : 'Peril & Failure:'}</strong> {outcome.text}
					</div>
				{/if}
			{/if}
		</section>

		<!-- Aggregate Party Skills Banner -->
		<div class="skills-summary">
			<span class="skill-tag">⚔️ Martial: <strong>{skills.martial}</strong></span>
			<span class="skill-tag">🗝️ Intrigue: <strong>{skills.intrigue}</strong></span>
			<span class="skill-tag">📜 Arcana: <strong>{skills.arcana}</strong></span>
			<span class="skill-tag">💰 Stewardship: <strong>{skills.stewardship}</strong></span>
		</div>

		<!-- Action Buttons -->
		{#if !dungeon.cleared && currentRoom}
			<section class="actions-section">
				<h4>Choose Company Tactic</h4>
				<div class="acts-grid">
					<button class="btn action-btn assault" onclick={() => handleAction('assault')}>
						<div class="btn-top">⚔️ Martial Assault</div>
						<div class="btn-sub">Uses Champion / Martial ({skills.martial})</div>
					</button>

					<button class="btn action-btn cunning" onclick={() => handleAction('cunning')}>
						<div class="btn-top">🗝️ Cunning Disarm</div>
						<div class="btn-sub">Uses Spymaster / Intrigue ({skills.intrigue})</div>
					</button>

					<button class="btn action-btn lore" onclick={() => handleAction('lore')}>
						<div class="btn-top">📜 Arcane Decipher</div>
						<div class="btn-sub">Uses Lorekeeper / Arcana ({skills.arcana})</div>
					</button>

					<button class="btn action-btn bribe" onclick={() => handleAction('bribe')}>
						<div class="btn-top">💰 Negotiate / Offer Tribute</div>
						<div class="btn-sub">Uses Quartermaster / Stewardship ({skills.stewardship})</div>
					</button>
				</div>
				<div class="retreat-bar">
					<button class="btn retreat-btn" onclick={retreat}>🏃 Retreat from Dungeon</button>
				</div>
			</section>
		{/if}

		<!-- Active Party Roster & Health Bars -->
		<section class="roster-section">
			<h4>Active Warband Roster</h4>
			<div class="roster-list">
				{#if avatar}
					<div class="member-card leader">
						<div class="member-info">
							<div class="name-row">
								<strong>{avatar.name} {avatar.house}</strong>
								<span class="chip leader-chip">Leader</span>
								{#if avatar.partyRole}
									<span class="chip role-chip">{avatar.partyRole}</span>
								{/if}
							</div>
							<div class="hp-row">
								<span class="small muted">Health:</span>
								<div class="hp-bar" role="progressbar" aria-valuenow={avatar.health} aria-valuemin="0" aria-valuemax="100">
									<div class="hp-fill" style="width: {Math.min(100, avatar.health)}%; background: {healthColor(avatar.health)}"></div>
								</div>
								<span class="hp-val" style="color: {healthColor(avatar.health)}">♥ {avatar.health}</span>
							</div>
							<div class="stats-row small muted">
								<span>⚔{avatar.martial}</span>
								<span>✉{avatar.diplomacy}</span>
								<span>⚖{avatar.stewardship}</span>
								<span>🗝{avatar.intrigue}</span>
								<span>💰{avatar.gold}g</span>
							</div>
						</div>
						<div class="role-selector">
							<span class="small muted">Role:</span>
							<div class="role-chips">
								{#each ALL_ROLES as r (r)}
									<button
										class="chip role-btn"
										class:selected={avatar.partyRole === r}
										onclick={() => handleSetRole(avatar.id, r)}
									>
										{r}
									</button>
								{/each}
							</div>
						</div>
					</div>
				{/if}

				{#each companions as c (c.id)}
					<div class="member-card">
						<div class="member-info">
							<div class="name-row">
								<strong>{c.name} {c.house}</strong>
								{#if c.partyRole}
									<span class="chip role-chip">{c.partyRole}</span>
								{:else}
									<span class="chip unassigned">Unassigned</span>
								{/if}
							</div>
							<div class="hp-row">
								<span class="small muted">Health:</span>
								<div class="hp-bar" role="progressbar" aria-valuenow={c.health} aria-valuemin="0" aria-valuemax="100">
									<div class="hp-fill" style="width: {Math.min(100, c.health)}%; background: {healthColor(c.health)}"></div>
								</div>
								<span class="hp-val" style="color: {healthColor(c.health)}">♥ {c.health}</span>
							</div>
							<div class="stats-row small muted">
								<span>⚔{c.martial}</span>
								<span>✉{c.diplomacy}</span>
								<span>⚖{c.stewardship}</span>
								<span>🗝{c.intrigue}</span>
							</div>
						</div>
						<div class="role-selector">
							<span class="small muted">Assign Role:</span>
							<div class="role-chips">
								{#each ALL_ROLES as r (r)}
									<button
										class="chip role-btn"
										class:selected={c.partyRole === r}
										onclick={() => handleSetRole(c.id, r)}
									>
										{r}
									</button>
								{/each}
							</div>
						</div>
					</div>
				{/each}

				{#if companions.length === 0}
					<p class="muted small empty-party">No companions in your fellowship. You delve into the ruins alone.</p>
				{/if}
			</div>
		</section>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(6, 4, 3, 0.82);
		backdrop-filter: blur(5px);
		z-index: 120;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.75rem;
	}

	.modal {
		background: var(--panel, #1a1614);
		color: var(--panel-ink, #f5ebd9);
		border: 1px solid var(--line, #3a2e26);
		border-radius: 12px;
		width: min(820px, 100%);
		max-height: 92dvh;
		display: flex;
		flex-direction: column;
		padding: 1rem 1.25rem;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.75);
		overflow-y: auto;
		gap: 0.85rem;
	}

	.mhead {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		border-bottom: 1px solid var(--line, #3a2e26);
		padding-bottom: 0.6rem;
		gap: 0.5rem;
	}

	.title-block {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.title-row h2 {
		font-size: 1.35rem;
		margin: 0;
		color: var(--accent, #d4a359);
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--muted, #9e8e82);
		font-size: 1.25rem;
		cursor: pointer;
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
	}

	.close-btn:hover {
		color: var(--panel-ink, #f5ebd9);
		background: rgba(255, 255, 255, 0.08);
	}

	.loot-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid var(--line, #3a2e26);
		border-radius: 8px;
		padding: 0.5rem 0.8rem;
		gap: 0.8rem;
		flex-wrap: wrap;
	}

	.loot-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.loot-label {
		font-size: 0.82rem;
		color: var(--muted, #9e8e82);
	}

	.gold-text {
		color: var(--accent, #d4a359);
	}

	.relics-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.chamber-card {
		background: rgba(0, 0, 0, 0.18);
		border: 1px solid var(--line, #3a2e26);
		border-radius: 8px;
		padding: 0.85rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.room-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.room-title {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		flex-wrap: wrap;
	}

	.room-title h3 {
		margin: 0;
		font-size: 1.15rem;
		color: var(--accent, #d4a359);
	}

	.room-desc {
		font-size: 0.92rem;
		line-height: 1.45;
		color: var(--panel-ink, #f5ebd9);
		margin: 0;
	}

	.outcome-banner {
		padding: 0.6rem 0.8rem;
		border-radius: 6px;
		font-size: 0.88rem;
		line-height: 1.35;
	}

	.outcome-banner.ok {
		background: rgba(76, 175, 80, 0.15);
		border: 1px solid rgba(76, 175, 80, 0.45);
		color: #81c784;
	}

	.outcome-banner.err {
		background: rgba(244, 67, 54, 0.15);
		border: 1px solid rgba(244, 67, 54, 0.45);
		color: #e57373;
	}

	.triumph-box {
		text-align: center;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
	}

	.triumph-box h3 {
		margin: 0;
		color: var(--accent, #d4a359);
		font-size: 1.3rem;
	}

	.triumph-stats {
		display: flex;
		gap: 1.2rem;
		font-size: 0.95rem;
	}

	.skills-summary {
		display: flex;
		gap: 0.6rem;
		background: rgba(212, 163, 89, 0.08);
		border: 1px solid rgba(212, 163, 89, 0.25);
		border-radius: 6px;
		padding: 0.45rem 0.75rem;
		font-size: 0.82rem;
		flex-wrap: wrap;
	}

	.actions-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.actions-section h4,
	.roster-section h4 {
		margin: 0;
		font-size: 0.86rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted, #9e8e82);
	}

	.acts-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.5rem;
	}

	.action-btn {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		text-align: left;
		padding: 0.6rem 0.8rem;
		gap: 0.2rem;
		border: 1px solid var(--line, #3a2e26);
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.2);
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s;
	}

	.action-btn:hover {
		background: rgba(255, 255, 255, 0.07);
		border-color: var(--accent, #d4a359);
	}

	.btn-top {
		font-weight: 600;
		font-size: 0.88rem;
	}

	.btn-sub {
		font-size: 0.74rem;
		color: var(--muted, #9e8e82);
	}

	.retreat-bar {
		display: flex;
		justify-content: flex-end;
		margin-top: 0.2rem;
	}

	.retreat-btn {
		font-size: 0.82rem;
		color: var(--muted, #9e8e82);
	}

	.roster-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.roster-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.member-card {
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid var(--line, #3a2e26);
		border-radius: 8px;
		padding: 0.55rem 0.8rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.8rem;
		flex-wrap: wrap;
	}

	.member-card.leader {
		border-left: 3px solid var(--accent, #d4a359);
	}

	.member-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 200px;
	}

	.name-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.hp-row {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.hp-bar {
		width: 100px;
		height: 6px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
		overflow: hidden;
	}

	.hp-fill {
		height: 100%;
		transition: width 0.3s ease;
	}

	.hp-val {
		font-size: 0.76rem;
		font-weight: 600;
	}

	.stats-row {
		display: flex;
		gap: 0.5rem;
	}

	.role-selector {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
	}

	.role-chips {
		display: flex;
		gap: 0.25rem;
		flex-wrap: wrap;
	}

	.role-btn {
		font-size: 0.72rem;
		cursor: pointer;
		background: none;
		border: 1px solid var(--line, #3a2e26);
		color: var(--muted, #9e8e82);
		border-radius: 4px;
		padding: 0.15rem 0.4rem;
		transition: all 0.12s;
	}

	.role-btn:hover {
		color: var(--panel-ink, #f5ebd9);
		border-color: var(--muted, #9e8e82);
	}

	.role-btn.selected {
		background: var(--accent, #d4a359);
		color: #1a1614;
		border-color: var(--accent, #d4a359);
		font-weight: 600;
	}

	.chip {
		font-size: 0.76rem;
		padding: 0.1rem 0.45rem;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
	}

	.chip.gold {
		background: var(--accent, #d4a359);
		color: #1a1614;
		font-weight: 600;
		border-color: var(--accent, #d4a359);
	}

	.chip.tiny {
		font-size: 0.7rem;
		padding: 0.05rem 0.35rem;
	}

	.chip.role-chip {
		background: rgba(212, 163, 89, 0.2);
		color: var(--accent, #d4a359);
		border-color: rgba(212, 163, 89, 0.4);
		text-transform: capitalize;
	}

	.chip.leader-chip {
		background: rgba(33, 150, 243, 0.2);
		color: #64b5f6;
		border-color: rgba(33, 150, 243, 0.4);
	}

	.chip.unassigned {
		color: var(--muted, #9e8e82);
	}

	.chip.room-type {
		background: rgba(255, 152, 0, 0.2);
		color: #ffb74d;
		border-color: rgba(255, 152, 0, 0.4);
	}

	.chip.dc-chip {
		background: rgba(156, 39, 176, 0.2);
		color: #ce93d8;
		border-color: rgba(156, 39, 176, 0.4);
	}

	.small {
		font-size: 0.8rem;
	}

	.muted {
		color: var(--muted, #9e8e82);
	}

	.empty-party {
		padding: 0.5rem 0;
	}
</style>
