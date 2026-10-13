import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, expect } from "@playwright/test";
import sharp from "sharp";

const base = (process.env.PORTFOLIO_URL ?? "http://localhost:3002").replace(/\/$/, "");
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const sizes = [[1440, 900], [390, 844], [1024, 768], [768, 1024], [360, 800], [844, 390]];
const reports = [];
mkdirSync("test-results/handoff", { recursive: true });
async function capture(page, label) {
  const buffer = await page.screenshot({ path: `test-results/handoff/${page.viewportSize().width}-${label}.png` });
  // Sample only the scene: UI text must not make a blank WebGL field pass.
  const { width, height } = page.viewportSize();
  const pixels = await sharp(buffer).extract({ left: Math.round(width * .12), top: Math.round(height * .1), width: Math.round(width * .76), height: Math.round(height * .42) }).resize(120, 80).removeAlpha().raw().toBuffer();
  let energy = 0, squared = 0, lit = 0;
  for (let i = 0; i < pixels.length; i += 3) {
    const value = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    energy += value; squared += value * value; if (value > 26) lit++;
  }
  const mean = energy / (pixels.length / 3);
  const variation = Math.sqrt(Math.max(0, squared / (pixels.length / 3) - mean * mean));
  assert.ok(lit > 40, `blank scene at ${label}: ${lit} lit samples`);
  assert.ok(variation > 5, `flat scene at ${label}: ${variation} pixel variation`);
  return { label, mean, variation, lit };
}
try {
  for (const [width, height] of process.argv.includes("--confirm") ? sizes.slice(0, 2) : sizes) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", message => { if (message.type() === "error" && /WebGL|THREE|hydrat/i.test(message.text())) errors.push(message.text()); });
    await page.goto(`${base}/?intro=1`, { waitUntil: "domcontentloaded" });
    const intro = page.locator(".arrival-intro");
    const sky = page.locator(".worldline-backdrop");
    await expect(page.locator(".arrival-field-canvas")).toHaveAttribute("data-ready", "true", { timeout: 20000 });
    await expect(sky).toHaveAttribute("data-ready", "true", { timeout: 20000 });
    const captures = [];
    for (const progress of [80, 87, 93, 97]) {
      await expect.poll(() => intro.getAttribute("data-intro-progress").then(Number), { timeout: 26000, intervals: [80] }).toBeGreaterThanOrEqual(progress);
      await expect(page.locator(".hero-copy")).toHaveAttribute("inert", "");
      await expect(page.getByRole("button", { name: "Skip intro", exact: true })).toBeVisible();
      captures.push(await capture(page, String(progress)));
      if (progress === 87) {
        assert.ok(Number(await page.locator(".arrival-field-canvas").getAttribute("data-sky-opacity")) < .3);
        assert.ok(Number(await sky.getAttribute("data-arrival-depth")) > 0);
      }
    }
    await expect(intro).toBeHidden({ timeout: 7000 });
    await expect(page.locator(".arrival-field-canvas")).toHaveCount(0);
    await expect(page.locator(".hero-copy")).not.toHaveAttribute("inert", "");
    await expect(sky).toHaveAttribute("data-arrival-depth", "0.000");
    captures.push(await capture(page, "hero"));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole("button", { name: "Explore the universe", exact: true }).click();
    await expect(page.locator(".cosmic-canvas")).toBeFocused();
    await expect(page.locator(".hero-stage")).toHaveAttribute("data-phase", "worlds");
    // Focus transfers before the programmatic flight ends; do not fight its scroll lock.
    await expect(page.locator("html")).not.toHaveClass(/lenis-scrolling/);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(page.locator(".hero-stage")).toHaveAttribute("data-phase", "intro");
    await expect(sky).toHaveAttribute("data-arrival-depth", "0.000");
    await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-preferences-ready", "true", { timeout: 20000 });
    await expect(page.locator(".site-shell")).toHaveAttribute("data-intro", "done", { timeout: 20000 });
    await expect(page.locator(".arrival-field-canvas")).toHaveCount(0);
    assert.deepEqual(errors, []);
    reports.push({ width, height, captures, errors });
    await page.close();
    console.log(`PASS handoff + reverse scroll + session return ${width}x${height}`);
  }
  const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await reduced.goto(`${base}/?intro=1`);
  await expect(reduced.locator(".site-shell")).toHaveAttribute("data-intro", "done", { timeout: 20000 });
  await expect(reduced.locator(".arrival-field-canvas")).toHaveCount(0);
  await expect(reduced.locator(".worldline-backdrop")).toHaveAttribute("data-arrival-depth", "0.000", { timeout: 20000 });
  await reduced.close();
  const fallback = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await fallback.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /webgl/i.test(type) ? null : getContext.call(this, type, ...args); };
  });
  await fallback.goto(`${base}/?intro=1`);
  await expect(fallback.locator(".arrival-field-canvas")).toHaveAttribute("data-fallback", "true", { timeout: 20000 });
  await fallback.getByRole("button", { name: "Skip intro", exact: true }).click();
  await expect(fallback.locator(".intro-loader")).toBeHidden();
  await expect(fallback.getByRole("button", { name: "Explore the universe", exact: true })).toBeVisible();
  await fallback.close();
  console.log("PASS reduced motion + no-WebGL skip");
} finally {
  writeFileSync("test-results/handoff/report.json", JSON.stringify(reports, null, 2));
  await browser.close();
}
