import { expect, test, type Page } from '@playwright/test';

// Runs against the production build + `vite preview`, on a desktop and a phone viewport.

const errors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
	const list: string[] = [];
	errors.set(page, list);
	page.on('pageerror', (e) => list.push(e.message));
});

test.afterEach(async ({ page }) => {
	expect(errors.get(page), 'uncaught page errors').toEqual([]);
});

async function fresh(page: Page) {
	await page.goto('/');
	await page.evaluate(async () => {
		try {
			localStorage.clear();
			for (const db of await indexedDB.databases()) if (db.name) indexedDB.deleteDatabase(db.name);
		} catch {}
	});
	await page.reload();
	await expect(page.getByRole('heading', { name: /Realmforge/i }).first()).toBeVisible();
}

/** Forge the safe first preset ("Heartland Kingdoms": 10k cells, deep + sky + sea layers) and wait for the map. */
async function forge(page: Page) {
	await page.getByRole('button', { name: /Apply Heartland Kingdoms and forge/ }).click();
	await expect(page.locator('canvas[aria-label^="World map"]')).toBeVisible({ timeout: 90_000 });
	await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
}

async function pause(page: Page) {
	await page.getByRole('button', { name: 'Pause' }).click();
}

/** The phone layout stacks the panel over the map bottom; open or close it through its toggle. */
async function setPanel(page: Page, open: boolean) {
	const toggle = page.locator('.paneltoggle');
	if (!(await toggle.isVisible())) return;
	if ((await toggle.getAttribute('aria-expanded')) !== String(open)) await toggle.click();
	await expect(toggle).toHaveAttribute('aria-expanded', String(open));
}
const openPanel = (page: Page) => setPanel(page, true);

const yearOf = async (page: Page) => Number((await page.locator('.date strong').innerText()).replace(/\D/g, ''));

test('setup loads with the preset gallery', async ({ page }) => {
	await fresh(page);
	await expect(page.getByRole('tablist', { name: 'Configuration sections' })).toBeVisible();
	await expect(page.getByRole('button', { name: /Forge the world/ })).toBeVisible();
	expect(await page.locator('.preset').count()).toBeGreaterThanOrEqual(10);
	const manifest = await page.evaluate(() => fetch('/manifest.webmanifest').then((r) => r.json()));
	expect(manifest.name).toBe('Realmforge');
});

test('a gallery preset forges a world and the game screen draws the map', async ({ page }) => {
	await fresh(page);
	await forge(page);
	const painted = await page.locator('canvas[aria-label^="World map"]').evaluate((c: HTMLCanvasElement) => {
		const ctx = c.getContext('2d')!;
		const d = ctx.getImageData(0, 0, c.width, c.height).data;
		const seen = new Set<number>();
		for (let i = 0; i < d.length; i += 4 * 997) seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
		return seen.size;
	});
	expect(painted).toBeGreaterThan(8);
	await expect(page.locator('.date')).toContainText('Year');
});

test('layers, map modes and panel tabs switch', async ({ page }) => {
	await fresh(page);
	await forge(page);
	await pause(page);

	const layers = page.getByRole('tablist', { name: 'Layers' }).getByRole('button');
	expect(await layers.count()).toBeGreaterThan(2);
	await layers.nth(0).click();
	await expect(layers.nth(0)).toHaveClass(/on/);
	const peek = layers.last(); // Peeking toggle, on by default
	await expect(peek).toHaveClass(/on/);
	await peek.click();
	await expect(peek).not.toHaveClass(/on/);
	await peek.click();
	await expect(peek).toHaveClass(/on/);

	await setPanel(page, false);
	for (const mode of ['Biomes', 'Relief', 'Cultures', 'Faiths', 'People', 'Realms']) {
		const b = page.getByRole('tablist', { name: 'Map mode' }).getByRole('button', { name: mode, exact: true });
		await b.click();
		await expect(b).toHaveClass(/on/);
	}

	await openPanel(page);
	const tabs = page.locator('.panel .tabs');
	for (const name of [/^Avatar$/, /^Chronicle$/]) {
		const b = tabs.getByRole('button', { name });
		await b.click();
		await expect(b).toHaveClass(/on/);
	}
	const god = tabs.locator('button').nth(1);
	await god.click();
	await expect(god).toHaveClass(/on/);
});

test('avatar: Become, then pick an ambition', async ({ page }) => {
	await fresh(page);
	await forge(page);
	await pause(page);
	await openPanel(page);
	await page.locator('.panel .tabs').getByRole('button', { name: /^Avatar$/ }).click();
	await expect(page.getByRole('heading', { name: 'Choose a life' })).toBeVisible();
	await page.getByRole('button', { name: 'Become' }).first().click();
	await expect(page.getByRole('heading', { name: 'Ambition' })).toBeVisible();
	const choice = page.locator('.amb-choice').first();
	await expect(choice).toBeVisible();
	await choice.click();
	await expect(page.locator('.amb-choice')).toHaveCount(0);
});

test('save, reload, load restores the year', async ({ page }) => {
	await fresh(page);
	await forge(page);
	// let a little history pass, then freeze it
	await page.keyboard.press('4');
	await page.waitForFunction(() => /Year (\d+)/.test(document.querySelector('.date strong')?.textContent ?? '') && Number(document.querySelector('.date strong')!.textContent!.replace(/\D/g, '')) >= 2);
	await pause(page);
	const year = await yearOf(page);
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByRole('status')).toContainText('saved', { ignoreCase: true });
	await page.reload();
	await page.getByRole('tab', { name: /Saves|Chronicles|Saved/i }).click();
	await page.getByRole('button', { name: 'Resume' }).first().click();
	await expect(page.locator('canvas[aria-label^="World map"]')).toBeVisible({ timeout: 60_000 });
	await expect(page.locator('.date strong')).toContainText(`Year ${year}`);
});

test('works offline after the first visit (shell, fonts, generation worker)', async ({ page, context }) => {
	await fresh(page);
	// wait until the service worker controls the page and has precached the shell
	await page.evaluate(async () => {
		await navigator.serviceWorker.ready;
		if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
	});
	await expect
		.poll(async () => page.evaluate(async () => (await (await caches.keys()).length ? (await (await caches.open((await caches.keys())[0])).keys()).length : 0)), { timeout: 60_000 })
		.toBeGreaterThan(10);

	await context.setOffline(true);
	await page.reload();
	await expect(page.getByRole('button', { name: /Forge the world/ })).toBeVisible();
	await forge(page); // the gen worker and sim must load from the cache
	await expect(page.locator('.date')).toContainText('Year');
	await context.setOffline(false);
});

test.describe('keyboard', () => {
	test('skip link jumps to the map and focus is visible through the top bar', async ({ page, isMobile }) => {
		test.skip(!!isMobile, 'keyboard flow is a desktop concern');
		await fresh(page);
		await forge(page);
		await pause(page);
		const skip = page.getByRole('link', { name: 'Skip to map' });
		// first stop in the tab order, then it appears on focus
		expect(await page.evaluate(() => document.querySelector('a[href], button:not([disabled]), [tabindex="0"]')?.textContent)).toBe('Skip to map');
		await skip.focus();
		await expect(skip).toBeInViewport();
		await page.keyboard.press('Enter');
		await expect(page.locator('canvas[aria-label^="World map"]')).toBeFocused();

		// Tab order: top bar first (speed, actions), then the map
		await page.locator('.top .speed button').first().focus();
		await page.keyboard.press('Tab');
		const outline = await page.evaluate(() => {
			const el = document.activeElement as HTMLElement;
			const cs = getComputedStyle(el);
			return { tag: el.tagName, width: cs.outlineWidth, style: cs.outlineStyle };
		});
		expect(outline.style).not.toBe('none');
		expect(parseFloat(outline.width)).toBeGreaterThan(0);
	});

	test('Escape closes every modal', async ({ page, isMobile }) => {
		test.skip(!!isMobile, 'keyboard flow is a desktop concern');
		await fresh(page);
		await forge(page);
		await pause(page);

		for (const [button, dialog] of [
			['History', page.getByRole('dialog', { name: /histor/i })],
			['Export', page.getByRole('dialog', { name: /export|studio|cartograph/i })],
			['Complete Sim', page.getByRole('dialog', { name: /Complete Chronicle/i })]
		] as const) {
			await page.getByRole('button', { name: button, exact: true }).click();
			await expect(dialog).toBeVisible();
			await page.keyboard.press('Escape');
			await expect(dialog).toHaveCount(0);
		}

		await page.getByRole('button', { name: 'Configure world' }).click();
		await expect(page.getByRole('dialog', { name: 'Configure world' })).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog', { name: 'Configure world' })).toHaveCount(0);
	});
});
