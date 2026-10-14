import { defineConfig, devices } from '@playwright/test';

// Plays the real production build (service worker included) in headless Chromium.
// Port 5196, never the dev port 5180.
const PORT = 5196;
export default defineConfig({
	testDir: 'e2e',
	timeout: 120_000,
	fullyParallel: false,
	workers: 1,
	reporter: 'list',
	use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		{ name: 'phone', use: { ...devices['Pixel 7'] } }
	],
	webServer: {
		command: `./scripts/run-with-nvm.sh npm run build && ./scripts/run-with-nvm.sh npx vite preview --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !process.env.CI,
		timeout: 300_000
	}
});
