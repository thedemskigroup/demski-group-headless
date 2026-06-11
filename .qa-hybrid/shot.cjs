const { chromium } = require('playwright');
const sharp = require('sharp');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://localhost:4321/technologies/hybrid/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '.qa-hybrid/result-full.png', fullPage: true });
  await browser.close();
  const meta = await sharp('.qa-hybrid/result-full.png').metadata();
  console.log('result size', meta.width, meta.height);

  const wantMeta = await sharp('public/technologies-hybrid.png').metadata();
  console.log('want size', wantMeta.width, wantMeta.height);

  for (let i = 0; i * 1000 < meta.height; i++) {
    const top = i * 1000;
    const height = Math.min(1000, meta.height - top);
    await sharp('.qa-hybrid/result-full.png').extract({ left: 0, top, width: meta.width, height }).toFile(`.qa-hybrid/result-${i}.png`);
  }
  for (let i = 0; i * 1000 < wantMeta.height; i++) {
    const top = i * 1000;
    const height = Math.min(1000, wantMeta.height - top);
    await sharp('public/technologies-hybrid.png').extract({ left: 0, top, width: wantMeta.width, height }).toFile(`.qa-hybrid/want-${i}.png`);
  }
  console.log('done');
})();
