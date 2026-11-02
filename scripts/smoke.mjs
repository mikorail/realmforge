#!/usr/bin/env node
/**
 * Browser smoke test: build, `vite preview` on a free port (5198 first), headless Chromium (preinstalled
 * `playwright`, never `playwright install`). Setup → forge a small world → run years → every map mode and
 * sim layer → info-panel tabs, God and Avatar panels → Export dialog → save, reload, resume.
 * Fails on page errors, console errors, failed requests or a blank map canvas.
 * Flags: --no-build, --port N, --headed, --cells N (default 4000), --years N (default 15), --perf (time r.draw()).
 */
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const CELLS = Number(opt('--cells', 4000)), YEARS = Number(opt('--years', 15));
const t0 = Date.now();
const log = (m) => console.log(`[smoke ${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('@playwright/test')); }

const free = (p) => new Promise((res) => { const s = net.createServer().once('error', () => res(false)).once('listening', () => s.close(() => res(true))).listen(p, '127.0.0.1'); });
async function pickPort(p) { for (let q = p; q < p + 50; q++) if (await free(q)) return q; throw new Error('no free port'); }

if (!flag('--no-build')) { log('building'); execSync('npm run build', { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] }); }
const port = await pickPort(Number(opt('--port', 5198)));
const server = spawn('./scripts/run-with-nvm.sh', ['vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
const stop = () => { try { process.kill(-server.pid, 'SIGTERM'); } catch { /* gone */ } };
process.on('exit', stop);
const base = `http://127.0.0.1:${port}`;
for (let i = 0; ; i++) {
	try { if ((await fetch(base)).ok) break; } catch { /* not yet */ }
	if (i > 100) throw new Error('preview did not start');
	await new Promise((r) => setTimeout(r, 200));
}
log(`preview on ${base}`);

let browser;
try { browser = await chromium.launch({ headless: !flag('--headed') }); }
catch { browser = await chromium.launch({ headless: !flag('--headed'), executablePath: '/opt/pw-browsers/chromium' }); }
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
page.on('requestfailed', (r) => { if (!r.url().startsWith('blob:')) problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`); });
page.on('dialog', (d) => d.accept(''));
await page.addInitScript(([cells]) => {
	if (sessionStorage.getItem('smoke-init')) return;
	sessionStorage.setItem('smoke-init', '1');
	localStorage.clear();
	localStorage.setItem('realmforge:setup', JSON.stringify({ s: { seed: 'smoke-world', cells, planets: 1, genre: 'steampunk' }, locked: ['seed'] }));
	localStorage.setItem('realmforge:overlays', '[]');
}, [CELLS]);

const step = async (name, fn) => {
	try { await fn(); log(`ok  ${name}`); }
	catch (e) { problems.push(`${name}: ${e.message.split('\n')[0]}`); log(`FAIL ${name}`); }
};
const click = (loc) => loc.first().click({ timeout: 8000 });
const mapCanvas = () => page.locator('.stage canvas').first();
const blank = () => mapCanvas().evaluate((cv) => {
	const g = cv.getContext('2d');
	const seen = new Set();
	for (let i = 0; i < 40; i++) {
		const d = g.getImageData(Math.floor(((i % 8) + 0.5) * cv.width / 8), Math.floor((Math.floor(i / 8) + 0.5) * cv.height / 5), 1, 1).data;
		seen.add(`${d[0] >> 4},${d[1] >> 4},${d[2] >> 4},${d[3] >> 6}`);
	}
	return seen.size < 3;
});

await step('setup loads', async () => {
	await page.goto(`${base}/?probe`);
	await page.locator('#forge-btn').waitFor({ timeout: 15000 });
});
await step('forge world', async () => {
	await click(page.locator('#forge-btn'));
	await page.locator('.modebar').waitFor({ timeout: 60000 });
	await page.waitForTimeout(500);
	if (await blank()) throw new Error('map canvas is blank');
});
await step(`run ${YEARS} years`, async () => {
	await click(page.getByRole('button', { name: '36 months per second' }));
	await page.waitForFunction((y) => { const m = /Year (\d+)/.exec(document.querySelector('.date strong')?.textContent ?? ''); return m && +m[1] >= y; }, YEARS, { timeout: 60000, polling: 250 });
	await click(page.getByRole('button', { name: 'Pause' }));
});
await step('map modes', async () => {
	for (const b of await page.locator('.modebar .btn:not(.ov)').all()) { await b.click(); await page.waitForTimeout(150); }
	await click(page.locator('.modebar .btn:not(.ov)', { hasText: 'Realms' }));
});
await step('sim layers on', async () => {
	for (const b of await page.locator('.modebar .btn.ov').all()) { await b.click(); await page.waitForTimeout(150); }
	if ((await page.locator('.modebar .btn.ov.on').count()) !== (await page.locator('.modebar .btn.ov').count())) throw new Error('a layer did not toggle on');
	await page.locator('.legend .ovl').waitFor({ timeout: 3000 }).catch(async () => { await click(page.locator('.legend .lhead')); await page.locator('.legend .ovl').waitFor({ timeout: 3000 }); });
	const cv = mapCanvas(), box = await cv.boundingBox();
	await page.mouse.wheel(0, 0);
	for (let i = 0; i < 4; i++) { await page.mouse.move(box.x + box.width * (0.3 + i * 0.1), box.y + box.height * 0.5); await page.waitForTimeout(80); }
	if (await blank()) throw new Error('map canvas is blank with layers on');
});
if (flag('--perf')) await step('frame timing', async () => {
	const t = await page.evaluate(() => {
		const r = window.__rfRenderer;
		const flush = () => r.ctx.getImageData(0, 0, 1, 1);
		const time = () => { flush(); const a = performance.now(); for (let i = 0; i < 20; i++) { r.draw(); flush(); } return (performance.now() - a) / 20; };
		const keys = [...r.simLayers.on];
		// warm the terrain tiles first (blitTerrain spends up to 40 ms per frame refining them)
		for (let i = 0; i < 30; i++) r.draw();
		const on = time();
		for (const k of keys) r.simLayers.toggle(k, false);
		const off = time();
		const each = {};
		for (const k of keys) { r.simLayers.toggle(k, true); time(); each[k] = +time().toFixed(1); r.simLayers.toggle(k, false); }
		r.zoomAt(r.w / 2, r.h / 2, 3);
		for (let i = 0; i < 30; i++) r.draw();
		const offZoom = time();
		for (const k of keys) r.simLayers.toggle(k, true);
		const onZoom = time();
		// the layers alone (the base frame above is dominated by terrain tile refinement in software rendering)
		const ctx = r.ctx, S = (x, y) => [x * r.k + r.tx, y * r.k + r.ty];
		const layersOnly = (n = 20) => { flush(); const a = performance.now(); for (let i = 0; i < n; i++) { ctx.setTransform(r.dpr * r.k, 0, 0, r.dpr * r.k, r.dpr * r.tx, r.dpr * r.ty); r.simLayers.drawWorld(ctx, r); ctx.setTransform(r.dpr, 0, 0, r.dpr, 0, 0); r.simLayers.drawScreen(ctx, r, S, []); flush(); } return (performance.now() - a) / n; };
		layersOnly(2);
		const lz = layersOnly();
		const lzEach = {};
		for (const k of keys) { for (const q of keys) r.simLayers.toggle(q, q === k); layersOnly(2); lzEach[k] = +layersOnly().toFixed(2); }
		for (const k of keys) r.simLayers.toggle(k, true);
		r.fit();
		layersOnly(2);
		const lf = layersOnly();
		r.politicalVersion++;
		const a = performance.now(); r.draw(); const rebuild = performance.now() - a;
		return { off, on, onZoom, offZoom, rebuild, each, lz, lf, lzEach, labelsMs: r.simLayers.labels.lastMs };
	});
	log(`draw(): layers off ${t.off.toFixed(1)}ms, all on ${t.on.toFixed(1)}ms (zoomed ×3: off ${t.offZoom.toFixed(1)}ms, on ${t.onZoom.toFixed(1)}ms), cache rebuild frame ${t.rebuild.toFixed(1)}ms, names compute ${t.labelsMs.toFixed(0)}ms; layers alone ${t.lf.toFixed(2)}ms fit / ${t.lz.toFixed(2)}ms zoomed ${JSON.stringify(t.lzEach)}; per layer ${JSON.stringify(t.each)}`);
});
await step('sim layers off', async () => {
	for (const b of await page.locator('.modebar .btn.ov').all()) if ((await b.getAttribute('aria-pressed')) === 'true') await b.click();
	if (await page.locator('.modebar .btn.ov.on').count()) throw new Error('a layer stayed on');
});
await step('info panel tabs', async () => {
	await click(page.getByRole('button', { name: 'Chronicle', exact: true }));
	for (const b of await page.locator('.sub-nav .nav-pill').all()) { await b.click(); await page.waitForTimeout(120); }
	await click(page.locator('.sub-nav .nav-pill', { hasText: 'Overview' }));
});
await step('god panel', async () => {
	// the god tab is named by the genre (God, Overseer…): it sits between Chronicle and Avatar
	const chron = page.getByRole('button', { name: 'Chronicle', exact: true }).first();
	await chron.locator('xpath=following-sibling::button[1]').click({ timeout: 8000 });
	await page.waitForFunction(() => !document.body.textContent.includes('Loading…'), null, { timeout: 10000 });
	await page.waitForTimeout(200);
});
await step('avatar panel', async () => { await click(page.getByRole('button', { name: 'Avatar', exact: true })); await page.waitForTimeout(200); await click(page.getByRole('button', { name: 'Chronicle', exact: true })); });
await step('export dialog', async () => {
	await click(page.getByRole('button', { name: 'Export', exact: true }));
	await page.locator('[role="dialog"]').first().waitFor({ timeout: 10000 });
	await page.keyboard.press('Escape');
	await page.waitForTimeout(300);
});
let savedYear = 0;
await step('save', async () => {
	savedYear = +(/Year (\d+)/.exec(await page.locator('.date strong').textContent())[1]);
	await click(page.getByRole('button', { name: 'Save', exact: true }));
	await page.getByText('Chronicle saved.').waitFor({ timeout: 15000 });
});
await step('reload + resume', async () => {
	await page.reload();
	await page.locator('#forge-btn').waitFor({ timeout: 15000 });
	await click(page.getByRole('tab', { name: /Chronicles/ }));
	await click(page.getByRole('button', { name: new RegExp(`^Resume .*year ${savedYear}$`) }));
	await page.locator('.modebar').waitFor({ timeout: 30000 });
	const y = +(/Year (\d+)/.exec(await page.locator('.date strong').textContent())[1]);
	if (y !== savedYear) throw new Error(`resumed at year ${y}, saved ${savedYear}`);
	await page.waitForTimeout(400);
	if (await blank()) throw new Error('map canvas is blank after resume');
});

await browser.close();
stop();
const secs = ((Date.now() - t0) / 1000).toFixed(1);
if (problems.length) { console.error(`smoke FAILED in ${secs}s:\n  ${problems.join('\n  ')}`); process.exit(1); }
console.log(`smoke ok in ${secs}s`);
process.exit(0);
