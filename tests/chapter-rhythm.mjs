import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, expect } from "@playwright/test";
import sharp from "sharp";

const base = process.env.PORTFOLIO_URL ?? "http://localhost:3002/";
const sizes = process.argv.includes("--confirm") ? [[1440, 900], [390, 844]] : [[1440, 900], [390, 844], [1024, 768], [768, 1024], [360, 800], [844, 390]];
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const reports = [];
mkdirSync("test-results/chapter-rhythm", { recursive: true });
const linear = v => (v /= 255) <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
const luminance = rgb => .2126 * linear(rgb[0]) + .7152 * linear(rgb[1]) + .0722 * linear(rgb[2]);

async function readingContrast(page) {
  const rows = await page.locator(".hero-body, .hero-note").evaluateAll(nodes => nodes.map(n => {
    const r = n.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height, color: getComputedStyle(n).color.match(/[\d.]+/g).map(Number) };
  }));
  const hide = await page.addStyleTag({ content: ".hero-body,.hero-note{color:transparent!important;text-shadow:none!important}.hero-note .status-light{visibility:hidden!important}" });
  const pixels = await sharp(await page.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  await hide.evaluate(n => n.remove());
  return rows.map(r => {
    const values = [];
    for (let y = Math.ceil(r.top); y < Math.floor(r.top + r.height); y += 2) for (let x = Math.ceil(r.left); x < Math.floor(r.left + r.width); x += 2) {
      if (x < 0 || y < 0 || x >= pixels.info.width || y >= pixels.info.height) continue;
      const offset = (y * pixels.info.width + x) * 3;
      values.push(luminance(pixels.data.subarray(offset, offset + 3)));
    }
    values.sort((a, b) => a - b);
    return (luminance(r.color) + .05) / (values[Math.floor(values.length * .99)] + .05);
  });
}

async function pose(page, progress) {
  await page.locator(".hero-stage").evaluate((n, p) => window.scrollTo({ top: scrollY + n.getBoundingClientRect().top + (n.offsetHeight - innerHeight) * p, behavior: "instant" }), progress);
  await page.waitForTimeout(700);
  return page.evaluate(() => {
    const hero = document.querySelector(".hero-copy"), map = document.querySelector(".cosmic-frame-wrap"), exit = document.querySelector(".map-departure"), d = document.querySelector(".worldline-backdrop").dataset;
    return { hero: +getComputedStyle(hero).opacity, map: +getComputedStyle(map).opacity * +getComputedStyle(exit).opacity, presence: +d.mapPresence, sky: +d.skyPresence, calls: +d.drawCalls };
  });
}

try {
  for (const [width, height] of sizes) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", m => { if (/Shader Error|THREE.WebGLProgram/.test(m.text())) errors.push(m.text()); });
    await page.addInitScript(() => sessionStorage.setItem("henrylabs-intro-seen", "1"));
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-preferences-ready", "true", { timeout: 20000 });
    await expect(page.locator(".worldline-backdrop")).toHaveAttribute("data-ready", "true", { timeout: 20000 });
    await expect(page.locator(".intro-loader")).toBeHidden();
    await pose(page, 0);
    await page.screenshot({ path: `test-results/chapter-rhythm/${width}-hero.png` });
    const contrast = await readingContrast(page);
    assert.ok(contrast.every(c => c >= 4.5), `reading contrast sample: ${contrast}`);
    const positions = [0, .10, .17, .24, .32, .57, .88, .94, 1];
    const frames = [];
    for (const p of positions) {
      const frame = await pose(page, p); frames.push(frame);
      assert.ok(frame.calls < 65);
      assert.ok(frame.hero < .02 || frame.map < .02, "hero copy and interactive labels do not compete");
      if (frame.hero <= .1) await expect(page.locator(".hero-copy")).toHaveAttribute("inert", "");
      if ([.10, .24, .57, .94].includes(p)) await page.screenshot({ path: `test-results/chapter-rhythm/${width}-${p}.png` });
    }
    assert.ok(frames[1].hero > .3 && frames[1].hero < .8, "hero fade follows scroll before the old binary boundary");
    assert.ok(frames[5].map > .99 && frames[5].sky > .60 && frames[5].sky < .65, "settled galaxy retains a luminous backdrop");
    assert.equal(frames[8].map, 0);
    for (let i = positions.length - 2; i >= 0; i--) {
      const reverse = await pose(page, positions[i]);
      assert.ok(Math.abs(reverse.hero - frames[i].hero) < .015);
      assert.ok(Math.abs(reverse.map - frames[i].map) < .025);
      assert.ok(Math.abs(reverse.presence - frames[i].presence) < .02);
    }
    await page.getByRole("button", { name: "Explore the universe", exact: true }).click();
    await expect(page.locator(".cosmic-canvas")).toBeFocused();
    await expect(page.locator("html")).not.toHaveClass(/lenis-scrolling/);
    await page.locator(".home-project-preview").evaluate(n => window.scrollTo({ top: scrollY + n.getBoundingClientRect().top - innerHeight * .46, behavior: "instant" }));
    await expect.poll(() => page.locator(".home-project-media").evaluate(n => Math.abs(new DOMMatrix(getComputedStyle(n).transform).m42))).toBeLessThan(.1);
    for (const selector of [".home-preview-heading", ".home-project-copy"]) assert.equal(await page.locator(selector).evaluate(n => getComputedStyle(n).opacity), "1");
    await page.locator("#work").evaluate(n => window.scrollTo({ top: scrollY + n.getBoundingClientRect().top - innerHeight * .22, behavior: "instant" }));
    await page.waitForTimeout(500);
    const readingBand = await page.locator("#work").boundingBox();
    assert.ok(Math.abs(readingBand.x) < 1 && Math.abs(readingBand.width - width) < 1, "reading background spans the viewport without a vertical seam");
    assert.equal(await page.locator("#work").evaluate(n => getComputedStyle(n, "::after").animationName), "none");
    const edgeY = await page.locator(".field-continuum").evaluate(n => Math.round(n.getBoundingClientRect().top));
    const workPixels = await sharp(await page.screenshot({ path: `test-results/chapter-rhythm/${width}-work.png` })).removeAlpha().raw().toBuffer();
    const rows = [-3, 3].map(offset => {
      let sum = 0;
      for (let x = 30; x < width - 30; x++) for (let c = 0; c < 3; c++) sum += workPixels[((edgeY + offset) * width + x) * 3 + c];
      return sum / ((width - 60) * 3);
    });
    assert.ok(Math.abs(rows[0] - rows[1]) < 8, `no hard reading-band edge: ${rows}`);
    const canvasData = await page.locator(".worldline-backdrop canvas").evaluate(n => n.toDataURL());
    const stats = await sharp(Buffer.from(canvasData.split(",")[1], "base64")).removeAlpha().stats();
    assert.ok(stats.channels.some(c => c.stdev > 10), "actual 3D canvas remains nonblank");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    assert.deepEqual(errors, []);
    reports.push({ width, height, contrast, frames });
    await page.close();
    console.log(`PASS chapter rhythm ${width}x${height}; contrast ${contrast.map(c => c.toFixed(2)).join("/")}`);
  }
} finally { writeFileSync("test-results/chapter-rhythm/report.json", JSON.stringify(reports, null, 2)); await browser.close(); }
