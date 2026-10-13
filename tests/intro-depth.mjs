import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, expect } from "@playwright/test";
import sharp from "sharp";

const base = (process.env.PORTFOLIO_URL ?? "http://localhost:3002").replace(/\/$/, "");
const baseline = process.argv.includes("--baseline");
const folder = `test-results/intro-depth/${baseline ? "before" : "after"}`;
const sizes = [[1440, 900], [390, 844], [1024, 768], [768, 1024], [360, 800], [844, 390]];
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const report = [];
mkdirSync(folder, { recursive: true });
try {
  for (const [width, height] of baseline || process.argv.includes("--confirm") ? sizes.slice(0, 2) : sizes) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (/Shader Error|THREE.WebGLProgram|hydration/i.test(message.text())) errors.push(message.text()); });
    await page.goto(`${base}/?intro=1`, { waitUntil: "domcontentloaded" });
    const canvas = page.locator(".arrival-field-canvas");
    await expect(canvas).toHaveAttribute("data-ready", "true", { timeout: 20000 });
    const frames = [];
    for (const progress of [12, 28, 44, 64, 74, 87]) {
      await expect.poll(() => page.locator(".arrival-intro").getAttribute("data-intro-progress").then(Number), { timeout: 26000, intervals: [60] }).toBeGreaterThanOrEqual(progress);
      await expect(page.getByRole("button", { name: "Skip intro", exact: true })).toBeVisible();
      const state = await canvas.evaluate(c => ({ camera: c.dataset.camera, calls: +c.dataset.drawCalls, chapter: +c.dataset.chapter, atlas: c.dataset.atlas ? JSON.parse(c.dataset.atlas) : null }));
      await page.screenshot({ path: `${folder}/${width}-${progress}.png` });
      // Read the WebGL layer itself so DOM labels cannot make a blank field pass.
      const canvasImage = await canvas.evaluate(element => element.toDataURL("image/png").split(",")[1]);
      const buffer = await sharp(Buffer.from(canvasImage, "base64")).extract({ left: Math.round(width * .12), top: Math.round(height * .08), width: Math.round(width * .76), height: Math.round(height * .43) }).resize(150, 90).removeAlpha().raw().toBuffer();
      let lit = 0, energy = 0, square = 0;
      for (let i = 0; i < buffer.length; i += 3) {
        const value = (buffer[i] + buffer[i + 1] + buffer[i + 2]) / 3;
        energy += value; square += value * value; if (value > 35) lit++;
      }
      const mean = energy / (buffer.length / 3), variation = Math.sqrt(square / (buffer.length / 3) - mean * mean);
      assert.ok(lit > 20 && variation > 3, `scene paints spatial detail at ${width}px / ${progress}%: ${lit}, ${variation}`);
      assert.ok(state.calls <= 18, "richer atlas must stay batched");
      if (!baseline) {
        assert.equal(state.atlas.galaxies, 61);
        assert.ok(state.atlas.points < 65000);
        assert.equal(state.atlas.compact, width < 600 || height < 500);
      }
      frames.push({ progress, ...state, lit, mean, variation });
    }
    assert.equal(new Set(frames.map(frame => frame.camera)).size, frames.length, "camera must move through the nested field");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole("button", { name: "Skip intro", exact: true }).click();
    await expect(page.locator(".site-shell")).toHaveAttribute("data-intro", "done");
    assert.deepEqual(errors, []);
    report.push({ width, height, frames, errors });
    await page.close();
    console.log(`PASS intro depth ${width}x${height}`);
  }
} finally {
  writeFileSync(`${folder}/${process.argv.includes("--confirm") ? "report-confirm" : "report"}.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
