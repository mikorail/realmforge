<script lang="ts">
	import { onMount } from 'svelte';
	import { dev } from '$app/env';

	interface InstallEvent extends Event {
		prompt: () => Promise<void>;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	}

	let installEvt = $state<InstallEvent | null>(null);
	let iosHint = $state(false);
	let update = $state<ServiceWorker | null>(null);
	let offline = $state(false);
	let dismissed = $state(false);

	const standalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

	onMount(() => {
		try {
			dismissed = localStorage.getItem('realmforge:install-dismissed') === '1';
		} catch {}

		// Android / desktop Chromium install prompt
		const onPrompt = (e: Event) => {
			e.preventDefault();
			installEvt = e as InstallEvent;
		};
		addEventListener('beforeinstallprompt', onPrompt);
		addEventListener('appinstalled', () => (installEvt = null));

		// iOS Safari has no prompt: show instructions instead
		const ua = navigator.userAgent;
		const isIOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
		if (isIOS && !standalone()) iosHint = true;

		// Online/offline badge
		offline = !navigator.onLine;
		const on = () => (offline = false);
		const off = () => (offline = true);
		addEventListener('online', on);
		addEventListener('offline', off);

		// Ask the browser not to evict saves
		navigator.storage?.persist?.().catch(() => {});

		// New version waiting → offer reload (production only; dev rebuilds constantly)
		if ('serviceWorker' in navigator && !dev) {
			navigator.serviceWorker.register('/service-worker.js', { type: 'module' }).catch(() => {});
			navigator.serviceWorker.getRegistration().then((reg) => {
				if (!reg) return;
				if (reg.waiting && navigator.serviceWorker.controller) update = reg.waiting;
				reg.addEventListener('updatefound', () => {
					const sw = reg.installing;
					sw?.addEventListener('statechange', () => {
						if (sw.state === 'installed' && navigator.serviceWorker.controller) update = sw;
					});
				});
				// check for updates when the app comes back to the foreground
				document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && reg.update().catch(() => {}));
			});
			let reloading = false;
			// only an *update* should reload the page, not the very first install taking control
			const hadController = !!navigator.serviceWorker.controller;
			navigator.serviceWorker.addEventListener('controllerchange', () => {
				if (reloading || !hadController) return;
				reloading = true;
				location.reload();
			});
		}

		return () => {
			removeEventListener('beforeinstallprompt', onPrompt);
			removeEventListener('online', on);
			removeEventListener('offline', off);
		};
	});

	async function install() {
		if (!installEvt) return;
		await installEvt.prompt();
		await installEvt.userChoice;
		installEvt = null;
	}
	function hide() {
		dismissed = true;
		iosHint = false;
		installEvt = null;
		try {
			localStorage.setItem('realmforge:install-dismissed', '1');
		} catch {}
	}
	function applyUpdate() {
		update?.postMessage('SKIP_WAITING');
	}
</script>

{#if update}
	<div class="bar">
		<span>A new version of Realmforge is ready.</span>
		<button class="go" onclick={applyUpdate}>Reload</button>
	</div>
{:else if !dismissed && installEvt}
	<div class="bar">
		<span>Play offline from your home screen.</span>
		<button class="go" onclick={install}>Install</button>
		<button class="x" onclick={hide} aria-label="Dismiss">✕</button>
	</div>
{:else if !dismissed && iosHint}
	<div class="bar ios">
		<span>Install: tap <b>Share</b> <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 12v8h14v-8" fill="none" stroke="currentColor" stroke-width="2" /></svg> then <b>Add to Home Screen</b>.</span>
		<button class="x" onclick={hide} aria-label="Dismiss">✕</button>
	</div>
{/if}
{#if offline}<div class="offline" title="No connection: the game still works">● offline</div>{/if}

<style>
	.bar {
		position: fixed;
		left: 50%;
		bottom: calc(12px + env(safe-area-inset-bottom));
		transform: translateX(-50%);
		z-index: 30;
		display: flex;
		align-items: center;
		gap: 10px;
		width: max-content;
		max-width: calc(100vw - 24px);
		padding: 8px 10px 8px 14px;
		border-radius: 999px;
		background: #16120d;
		color: #faf3e2;
		font-size: 0.9rem;
		box-shadow: 0 8px 24px rgba(0,0,0,0.5);
		animation: up 0.3s ease-out;
	}
	.bar.ios {
		border-radius: 14px;
	}
	.bar svg {
		vertical-align: -3px;
	}
	.go {
		font: inherit;
		font-weight: 600;
		padding: 5px 14px;
		border-radius: 999px;
		border: 0;
		background: var(--accent);
		color: #2b2116;
		cursor: pointer;
	}
	.x {
		font: inherit;
		background: none;
		border: 0;
		color: #faf3e2;
		opacity: 0.7;
		cursor: pointer;
	}
	.offline {
		position: fixed;
		top: calc(6px + env(safe-area-inset-top));
		left: 50%;
		transform: translateX(-50%);
		z-index: 30;
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		color: var(--muted);
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 1px 9px;
	}
	@keyframes up {
		from {
			transform: translate(-50%, 20px);
			opacity: 0;
		}
	}
</style>
