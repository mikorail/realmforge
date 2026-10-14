import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	server: { port: 5180, strictPort: true, watch: { ignored: ['**/build/**', '**/test-results/**', '**/playwright-report/**'] } },
	worker: { format: 'es' },
	plugins: [
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({ fallback: '200.html' }),
			// registered by PwaBar in production only
			serviceWorker: { register: false }
		})
	]
});
