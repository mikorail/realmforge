// Offline play: precache the built app + static files, then serve cache-first.
import { immutable, assets, prerendered } from '$app/manifest';
import { version, dev } from '$app/env';
import { self as sw } from '$app/service-worker';

const CACHE = `realmforge-${version}`;
// Precache the app shell, hashed chunks (incl. generation and sim workers), static files and Latin font subsets. Other
// subsets are runtime-cached if ever used.
const SKIP_FONT = /\.(woff2?)$/;
const KEEP_FONT = /-(latin|latin-ext|vietnamese)-\d{3}-(normal|italic)[\w.-]*\.woff2$/;
const ASSETS = [...immutable, ...assets, ...prerendered]
	.map((a) => '/' + String(a.path).replace(/^\//, ''))
	.filter((p) => !SKIP_FONT.test(p) || KEEP_FONT.test(p))
	// never precache dotfiles (.DS_Store and friends): servers refuse them and one 404 would sink the whole install
	.filter((p) => !p.split('/').some((seg) => seg.startsWith('.')));

sw.addEventListener('install', (event: ExtendableEvent) => {
	event.waitUntil(
		caches
			.open(CACHE)
			// cache what we can: one missing file should not leave the game without offline play
			.then((c) => (dev ? undefined : Promise.allSettled(ASSETS.map((a) => c.add(a))).then(() => undefined)))
	);
});

sw.addEventListener('activate', (event: ExtendableEvent) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

// The page asks a waiting worker to take over when the player taps "Reload".
sw.addEventListener('message', (event: ExtendableMessageEvent) => {
	if (event.data === 'SKIP_WAITING') sw.skipWaiting();
});

sw.addEventListener('fetch', (event: FetchEvent) => {
	if (dev) return; // never cache during development, it would fight hot reload
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	// Only same-origin requests; never touch API calls (Claude cards).
	if (url.origin !== sw.location.origin) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			const hit = await cache.match(req, { ignoreVary: true });
			const fetched = fetch(req)
				.then((res) => {
					if (res.ok) cache.put(req, res.clone());
					return res;
				})
				.catch(() => undefined);
			if (hit) return hit;
			const res = await fetched;
			if (res) return res;
			// SPA fallback for navigations while offline
			if (req.mode === 'navigate') {
				const shell = (await cache.match('/', { ignoreVary: true })) ?? (await cache.match('/200.html', { ignoreVary: true }));
				if (shell) return shell;
			}
			return new Response('Offline', { status: 503 });
		})()
	);
});
