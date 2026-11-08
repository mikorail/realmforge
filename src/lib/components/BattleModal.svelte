<script lang="ts">
	import type { Simulation } from '#lib/sim/engine';
	import {
		createTacticalBattle,
		commandBattle,
		autoResolveBattle,
		createCitadelSiege,
		commandSiege,
		type TacticalBattle,
		type CitadelSiege
	} from '#lib/sim/tactical_war';
	import { onMount } from 'svelte';

	let {
		sim,
		v = 0,
		warId,
		burgId,
		onclose,
		onrefresh
	}: {
		sim: Simulation;
		v?: number;
		warId?: number;
		burgId?: number;
		onclose: () => void;
		onrefresh?: () => void;
	} = $props();

	let activeTab = $state<'field' | 'siege'>('field');
	let battle = $state<TacticalBattle | null>(null);
	let siege = $state<CitadelSiege | null>(null);
	let canvasRef = $state<HTMLCanvasElement>();
	let closeBtn = $state<HTMLButtonElement>();

	// Initialize battle and siege state
	$effect(() => {
		void v;
		if (burgId && !battle) {
			activeTab = 'siege';
		}
		if (!battle) {
			// Find an active war or default to first alive realms
			const war = (warId !== undefined && sim.wars[warId]) ? sim.wars[warId] : sim.wars.find((w) => !w.end);
			let attId = war?.attackers[0] ?? 1;
			let defId = war?.defenders[0] ?? 2;
			if (attId === defId || !sim.polities[defId]) {
				const alive = sim.polities.filter((p) => p.alive);
				attId = alive[0]?.id ?? 1;
				defId = alive[1]?.id ?? 2;
			}
			const cellId = sim.polities[defId]?.capital ?? 100;
			battle = createTacticalBattle(sim, attId, defId, cellId);
		}

		if (!siege) {
			const bId = burgId ?? (sim.w.burgs.find((b) => b && b.state > 0)?.id ?? 0);
			const b = sim.w.burgs[bId];
			const defRealm = b?.state ?? 1;
			const attRealm = sim.polities.find((p) => p.alive && p.id !== defRealm)?.id ?? 2;
			siege = createCitadelSiege(sim, bId, attRealm);
		}
	});

	onMount(() => {
		closeBtn?.focus();
		drawBattlefield();
	});

	$effect(() => {
		if (battle || siege || activeTab) {
			drawBattlefield();
		}
	});

	function drawBattlefield() {
		if (!canvasRef) return;
		const ctx = canvasRef.getContext('2d');
		if (!ctx) return;

		const W = canvasRef.width;
		const H = canvasRef.height;
		ctx.clearRect(0, 0, W, H);

		if (activeTab === 'field' && battle) {
			// 1. Terrain Background
			if (battle.terrain === 'mountain' || battle.terrain === 'hills') {
				ctx.fillStyle = '#1e293b';
			} else if (battle.terrain === 'forest') {
				ctx.fillStyle = '#064e3b';
			} else if (battle.terrain === 'river') {
				ctx.fillStyle = '#0f172a';
			} else {
				ctx.fillStyle = '#143026';
			}
			ctx.fillRect(0, 0, W, H);

			// Draw grid lines
			ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
			ctx.lineWidth = 1;
			for (let x = 0; x <= 10; x++) {
				const px = (x / 10) * W;
				ctx.beginPath();
				ctx.moveTo(px, 0);
				ctx.lineTo(px, H);
				ctx.stroke();
			}
			for (let y = 0; y <= 6; y++) {
				const py = (y / 6) * H;
				ctx.beginPath();
				ctx.moveTo(0, py);
				ctx.lineTo(W, py);
				ctx.stroke();
			}

			// Draw river if present
			if (battle.terrain === 'river') {
				ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
				ctx.fillRect(W * 0.45, 0, W * 0.1, H);
			}

			// 2. Draw Regiments
			for (const reg of battle.regiments) {
				const rx = (reg.x / 10) * W + (W / 20);
				const ry = (reg.y / 6) * H + (H / 12);
				const isDead = reg.hp <= 0 || reg.status === 'routed';

				ctx.save();
				ctx.translate(rx, ry);

				// Regiment banner background
				ctx.fillStyle = isDead
					? 'rgba(71, 85, 105, 0.4)'
					: reg.isAttacker
						? '#dc2626'
						: '#2563eb';
				ctx.strokeStyle = isDead ? '#64748b' : '#f8fafc';
				ctx.lineWidth = 1.5;

				ctx.beginPath();
				ctx.roundRect(-24, -18, 48, 36, 4);
				ctx.fill();
				ctx.stroke();

				// Unit Type Icon
				ctx.fillStyle = '#ffffff';
				ctx.font = '14px sans-serif';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				let icon = '⚔️';
				if (reg.type === 'cavalry') icon = '🏇';
				else if (reg.type === 'archers') icon = '🏹';
				else if (reg.type === 'siege_engine') icon = '🪨';
				else if (reg.type === 'war_beast') icon = '🦣';
				ctx.fillText(icon, 0, -4);

				// HP Bar
				const hpRatio = Math.max(0, reg.hp / reg.maxHp);
				ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
				ctx.fillRect(-20, 10, 40, 4);
				ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
				ctx.fillRect(-20, 10, 40 * hpRatio, 4);

				// Morale indicator
				if (!isDead && reg.morale < 40) {
					ctx.fillStyle = '#f97316';
					ctx.font = '9px sans-serif';
					ctx.fillText('PANIC', 0, -22);
				}

				ctx.restore();
			}
		} else if (activeTab === 'siege' && siege) {
			// Siege Visual Representation
			ctx.fillStyle = '#0f172a';
			ctx.fillRect(0, 0, W, H);

			// Rampart walls
			const wallRatio = Math.max(0, siege.wallsHP / siege.maxWallsHP);
			ctx.fillStyle = wallRatio > 0 ? '#475569' : '#1e293b';
			ctx.fillRect(W * 0.55, H * 0.15, W * 0.35, H * 0.7);

			// Wall health bar
			ctx.fillStyle = 'rgba(0,0,0,0.5)';
			ctx.fillRect(W * 0.55, H * 0.1, W * 0.35, 10);
			ctx.fillStyle = '#38bdf8';
			ctx.fillRect(W * 0.55, H * 0.1, W * 0.35 * wallRatio, 10);

			// Gatehouse
			const gateRatio = Math.max(0, siege.gateHP / siege.maxGateHP);
			ctx.fillStyle = gateRatio > 0 ? '#78350f' : '#292524';
			ctx.fillRect(W * 0.65, H * 0.4, W * 0.15, H * 0.3);

			ctx.fillStyle = 'rgba(0,0,0,0.5)';
			ctx.fillRect(W * 0.65, H * 0.36, W * 0.15, 8);
			ctx.fillStyle = '#f59e0b';
			ctx.fillRect(W * 0.65, H * 0.36, W * 0.15 * gateRatio, 8);

			// Besiegers Camp on Left
			ctx.fillStyle = '#dc2626';
			ctx.font = '13px sans-serif';
			ctx.fillText(`⚔️ ${siege.attackerName} Encampment`, W * 0.08, H * 0.3);

			// Sapper Tunnels
			ctx.fillStyle = '#e2e8f0';
			ctx.font = '11px sans-serif';
			ctx.fillText(`⛏️ Sapper Progress: ${siege.sapperProgress}%`, W * 0.08, H * 0.55);
			ctx.fillStyle = '#94a3b8';
			ctx.fillRect(W * 0.08, H * 0.58, W * 0.3, 8);
			ctx.fillStyle = '#f97316';
			ctx.fillRect(W * 0.08, H * 0.58, (W * 0.3 * siege.sapperProgress) / 100, 8);

			// Pitch Cauldrons
			ctx.fillStyle = '#fbbf24';
			ctx.fillText(`🛢️ Boiled Pitch Reserves: ${siege.boiledPitchCount}`, W * 0.58, H * 0.88);
		}
	}

	function handleAction(act: 'advance' | 'cavalry_flank' | 'archer_volley' | 'shield_wall' | 'rally') {
		if (!battle) return;
		commandBattle(sim, battle, act);
		drawBattlefield();
		onrefresh?.();
	}

	function handleAutoResolve() {
		if (!battle) return;
		autoResolveBattle(sim, battle);
		drawBattlefield();
		onrefresh?.();
	}

	function handleSiegeAction(act: 'bombard' | 'sapper' | 'ram_gate' | 'pour_pitch' | 'storm_citadel') {
		if (!siege) return;
		commandSiege(sim, siege, act);
		drawBattlefield();
		onrefresh?.();
	}
</script>

<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="battle-modal-title">
	<div class="modal-card">
		<header class="modal-header">
			<div class="title-group">
				<h2 id="battle-modal-title">
					{activeTab === 'field' ? '⚔️ Tactical Battlefield' : '🏰 Citadel Siege Operations'}
				</h2>
				<span class="subtext">
					{activeTab === 'field' && battle
						? `${battle.attackerName} vs ${battle.defenderName} · ${battle.terrain} · Year ${sim.year}`
						: siege
							? `Siege of ${siege.burgName} · ${siege.attackerName} investing walls`
							: ''}
				</span>
			</div>
			<div class="tab-toggles">
				<button class="tab-btn" class:active={activeTab === 'field'} onclick={() => (activeTab = 'field')}>
					Field Battle
				</button>
				<button class="tab-btn" class:active={activeTab === 'siege'} onclick={() => (activeTab = 'siege')}>
					Citadel Siege
				</button>
			</div>
			<button bind:this={closeBtn} class="close-btn" onclick={onclose} title="Close window">✕</button>
		</header>

		<div class="modal-body">
			<!-- Canvas Viewport -->
			<div class="canvas-wrap">
				<canvas bind:this={canvasRef} width="640" height="320"></canvas>
			</div>

			<!-- Tactical Commander Controls -->
			{#if activeTab === 'field' && battle}
				<div class="controls-bar">
					<button class="cmd-btn" onclick={() => handleAction('advance')} disabled={!!battle.winner}>
						⚔️ Advance Line
					</button>
					<button class="cmd-btn" onclick={() => handleAction('cavalry_flank')} disabled={!!battle.winner}>
						🏇 Cavalry Flank
					</button>
					<button class="cmd-btn" onclick={() => handleAction('archer_volley')} disabled={!!battle.winner}>
						🏹 Archer Volley
					</button>
					<button class="cmd-btn" onclick={() => handleAction('shield_wall')} disabled={!!battle.winner}>
						🛡️ Shield Wall
					</button>
					<button class="cmd-btn" onclick={() => handleAction('rally')} disabled={!!battle.winner}>
						📯 Sound Rally
					</button>
					<button class="cmd-btn auto" onclick={handleAutoResolve} disabled={!!battle.winner}>
						⚡ Auto-Resolve
					</button>
				</div>
			{:else if activeTab === 'siege' && siege}
				<div class="controls-bar">
					<button class="cmd-btn" onclick={() => handleSiegeAction('bombard')} disabled={siege.phase === 'sacked'}>
						🪨 Trebuchet Barrage
					</button>
					<button class="cmd-btn" onclick={() => handleSiegeAction('sapper')} disabled={siege.phase === 'sacked'}>
						⛏️ Dig Sapper Tunnels
					</button>
					<button class="cmd-btn" onclick={() => handleSiegeAction('ram_gate')} disabled={siege.phase === 'sacked'}>
						🔨 Ram Gatehouse
					</button>
					<button class="cmd-btn" onclick={() => handleSiegeAction('pour_pitch')} disabled={siege.phase === 'sacked'}>
						🛢️ Pour Boiling Pitch
					</button>
					<button class="cmd-btn storm" onclick={() => handleSiegeAction('storm_citadel')} disabled={siege.phase === 'sacked'}>
						🚩 Storm Citadel!
					</button>
				</div>
			{/if}

			<!-- Combat Casualty & Annals Log -->
			<div class="combat-log">
				<div class="log-header">
					<span>Tactical Field Chronicle</span>
					{#if activeTab === 'field' && battle}
						<span class="losses">
							Casualties: Attacker -{battle.casualtiesA} · Defender -{battle.casualtiesD}
						</span>
					{/if}
				</div>
				<ul class="log-entries">
					{#if activeTab === 'field' && battle}
						{#each battle.log as entry}
							<li>{entry}</li>
						{/each}
					{:else if siege}
						{#each siege.log as entry}
							<li>{entry}</li>
						{/each}
					{/if}
				</ul>
			</div>
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(4, 19, 18, 0.82);
		backdrop-filter: blur(4px);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
	}

	.modal-card {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 8px;
		width: 100%;
		max-width: 720px;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		background: #1e293b;
		border-bottom: 1px solid #334155;
	}

	.title-group h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #f8fafc;
	}

	.subtext {
		font-size: 0.75rem;
		color: #94a3b8;
	}

	.tab-toggles {
		display: flex;
		gap: 6px;
	}

	.tab-btn {
		background: #0f172a;
		border: 1px solid #475569;
		color: #94a3b8;
		padding: 4px 10px;
		border-radius: 4px;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.tab-btn.active {
		background: #2563eb;
		border-color: #3b82f6;
		color: #ffffff;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: #94a3b8;
		font-size: 1.1rem;
		cursor: pointer;
		padding: 4px 8px;
	}

	.close-btn:hover {
		color: #f8fafc;
	}

	.modal-body {
		padding: 12px 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.canvas-wrap {
		width: 100%;
		background: #000000;
		border: 1px solid #334155;
		border-radius: 6px;
		overflow: hidden;
		display: flex;
		justify-content: center;
	}

	canvas {
		width: 100%;
		height: auto;
		display: block;
	}

	.controls-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.cmd-btn {
		background: #1e293b;
		border: 1px solid #475569;
		color: #f8fafc;
		padding: 6px 12px;
		border-radius: 4px;
		font-size: 0.8rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 4px;
		transition: all 0.15s ease;
	}

	.cmd-btn:hover:not(:disabled) {
		background: #334155;
		border-color: #64748b;
	}

	.cmd-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.cmd-btn.auto {
		background: #4338ca;
		border-color: #6366f1;
		margin-left: auto;
	}

	.cmd-btn.storm {
		background: #dc2626;
		border-color: #ef4444;
		margin-left: auto;
	}

	.combat-log {
		background: #020617;
		border: 1px solid #1e293b;
		border-radius: 6px;
		padding: 8px 12px;
		max-height: 120px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.log-header {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		font-weight: 600;
		color: #94a3b8;
		border-bottom: 1px solid #1e293b;
		padding-bottom: 4px;
	}

	.log-entries {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.log-entries li {
		font-size: 0.75rem;
		color: #cbd5e1;
		line-height: 1.3;
	}
</style>
