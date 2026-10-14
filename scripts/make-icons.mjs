// Renders static/icon.svg into the PNG icons the manifest needs. Run: ./scripts/run-with-nvm.sh node scripts/make-icons.mjs
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const svg = fs.readFileSync('static/icon.svg', 'utf8');
const b = await chromium.launch();
for (const [n, s] of [['icon-192', 192], ['icon-512', 512], ['apple-touch-icon', 180]]) {
	const p = await b.newPage({ viewport: { width: s, height: s } });
	await p.setContent(`<body style="margin:0;background:#16120d">${svg.replace('<svg ', `<svg width="${s}" height="${s}" `)}</body>`);
	await p.screenshot({ path: `static/${n}.png` });
}
await b.close();
