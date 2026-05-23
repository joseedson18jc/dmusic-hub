#!/usr/bin/env node
/**
 * Ladle visual QA — abre cada story do Ladle (port 61000) num Chromium
 * headless via Playwright e tira screenshot.
 *
 * Output: ./screenshots/<story-id>.png  +  ./screenshots/qa-report.json
 *
 * Para rodar:
 *   bun run ladle       # em outra aba
 *   node scripts/ladle-visual-qa.mjs
 *
 * Tira screenshot da viewport (1280x720). Captura console errors também.
 */

import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = 'http://localhost:61000';
const OUT  = resolve('screenshots');
const DELAY_MS = 800; // tempo pra fontes + animações resolverem

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

// Lista de stories exatamente como o Ladle expõe na URL `?story=<id>`.
// Carregada dinamicamente do `meta.json` do servidor (formato Ladle: levels
// separados por `--`, exportName em kebab-case).
const metaRes = await fetch(`${BASE}/meta.json`);
const meta = await metaRes.json();
const STORIES = Object.keys(meta.stories ?? {});

const report = [];

console.log(`📸 Visual QA — capturing ${STORIES.length} stories…\n`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
});
const page = await ctx.newPage();

const consoleMessages = [];
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  }
});
page.on('pageerror', (err) => {
  consoleMessages.push({ type: 'pageerror', text: err.message });
});

for (const [i, storyId] of STORIES.entries()) {
  const url = `${BASE}/?story=${storyId}&mode=preview`;
  const tag = `[${String(i + 1).padStart(2, '0')}/${STORIES.length}]`;

  consoleMessages.length = 0;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(DELAY_MS);

    // story IDs contain `--` which is safe for filenames
    const screenshot = `${OUT}/${storyId.replace(/\//g, '_')}.png`;
    await page.screenshot({ path: screenshot, fullPage: false });

    // Detect obvious visual issues
    const issues = await page.evaluate(() => {
      const out = [];
      const body = document.body;
      const bg = getComputedStyle(body).backgroundColor;
      const fg = getComputedStyle(body).color;

      // Dark theme expected — bg should be near-black
      const rgb = bg.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
      const luminance = (rgb[0] + rgb[1] + rgb[2]) / 3;
      if (luminance > 200) out.push(`Body bg looks light (luminance=${Math.round(luminance)}) — dark theme may not apply`);
      if (fg === 'rgb(0, 0, 0)' && luminance < 50) out.push('Body color is black on dark bg — contrast fail');

      // Check for elements with zero dimensions that shouldn't be (commonly buggy)
      const all = Array.from(document.querySelectorAll('button, span, svg, circle, path'));
      const zeroSized = all.filter((el) => {
        const r = el.getBoundingClientRect();
        return el.tagName !== 'PATH' && el.tagName !== 'CIRCLE' &&
               r.width === 0 && r.height === 0 &&
               (el.textContent?.trim().length ?? 0) > 0;
      });
      if (zeroSized.length > 0) out.push(`${zeroSized.length} elements with text have zero dimensions`);

      return out;
    });

    const errors = consoleMessages.filter((m) => m.type === 'pageerror' || m.type === 'error');
    report.push({
      story: storyId,
      screenshot,
      consoleIssues: consoleMessages,
      visualIssues: issues,
      errorCount: errors.length,
    });

    const flag = errors.length || issues.length ? '⚠' : '✓';
    console.log(`${flag} ${tag} ${storyId}${errors.length ? ` (${errors.length} errors)` : ''}${issues.length ? ` (${issues.length} visual issues)` : ''}`);
    if (errors.length) errors.forEach((e) => console.log(`     console: ${e.text.slice(0, 200)}`));
    if (issues.length) issues.forEach((i) => console.log(`     visual: ${i}`));
  } catch (err) {
    console.log(`✗ ${tag} ${storyId} — FAILED: ${err.message}`);
    report.push({ story: storyId, error: err.message });
  }
}

await browser.close();

writeFileSync(`${OUT}/qa-report.json`, JSON.stringify(report, null, 2));

const flagged = report.filter((r) => r.errorCount > 0 || (r.visualIssues?.length ?? 0) > 0 || r.error);
console.log(`\n📊 Done — ${report.length} stories captured · ${flagged.length} flagged for review`);
console.log(`   Screenshots: ${OUT}`);
console.log(`   Report:      ${OUT}/qa-report.json`);
