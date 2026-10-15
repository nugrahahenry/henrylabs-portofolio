import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, expect } from "@playwright/test";
import sharp from "sharp";

const baseline = process.argv.includes("--baseline");
const dir = `test-results/sky-quality/${baseline ? "before" : "after"}`;
const base = (process.env.PORTFOLIO_URL ?? "http://localhost:3002").replace(/\/$/, "");
mkdirSync(dir, { recursive: true });
const reports = [];
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe" });
async function snapshot(sky) {
  return sky.evaluate(node => {
    const canvas = node.querySelector("canvas");
    return { ...node.dataset, width: canvas.width, height: canvas.height, cssWidth: node.clientWidth, cssHeight: node.clientHeight };
  });
}
async function pixels(sky) {
  const data = await sky.locator("canvas").evaluate(canvas => canvas.toDataURL());
  const stats = await sharp(Buffer.from(data.split(",")[1], "base64")).removeAlpha().stats();
  assert.ok(stats.channels.some(channel => channel.stdev > 10), "actual sky pixels must paint");
}
try {
  for (const [width, height, deviceScaleFactor] of [[1440, 900, 1], [390, 844, 3], [2560, 1440, 2]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (/Shader Error|THREE.WebGLProgram/.test(message.text())) errors.push(message.text()); });
    await page.addInitScript(() => sessionStorage.setItem("henrylabs-intro-seen", "1"));
    for (const route of ["/", "/projects"]) {
      await page.goto(`${base}${route}?motion=off`);
      const sky = page.locator(route === "/" ? ".worldline-backdrop" : ".reading-sky");
      await expect(sky).toHaveAttribute("data-ready", "true", { timeout: 30000 });
      await page.waitForTimeout(200);
      await pixels(sky);
      const state = await snapshot(sky);
      reports.push({ width, height, deviceScaleFactor, route, state });
      await page.screenshot({ path: `${dir}/${width}-${route === "/" ? "home" : "projects"}.png`, scale: "css" });
      if (!baseline) {
        assert.ok(state.width * state.height <= 1_500_000, "background pixel budget");
        assert.equal(state.skyQuality, "full", "Still must not sample frame pressure");
      }
      const before = await sky.locator("canvas").evaluate(canvas => canvas.toDataURL());
      await page.waitForTimeout(250);
      assert.equal(await sky.locator("canvas").evaluate(canvas => canvas.toDataURL()), before);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS sky budget ${width}x${height} DPR ${deviceScaleFactor} (${baseline ? "baseline" : "final"})`);
  }
  if (!baseline) for (const [width, height, route] of [[1440, 900, "/"], [390, 844, "/"], [390, 844, "/credentials"]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem("henrylabs-intro-seen", "1"));
    await page.goto(`${base}${route}`);
    const sky = page.locator(route === "/" ? ".worldline-backdrop" : ".reading-sky");
    await expect(sky).toHaveAttribute("data-ready", "true", { timeout: 30000 });
    const canvas = await sky.locator("canvas").elementHandle();
    const initial = await snapshot(sky);
    // Real main-thread pressure, not a fake quality flag or a changed scene clock.
    await page.evaluate(() => {
      window.__skyPressure = true;
      const busy = () => {
        if (!window.__skyPressure) return;
        const end = performance.now() + 34;
        while (performance.now() < end) { /* bounded QA load */ }
        requestAnimationFrame(busy);
      };
      requestAnimationFrame(busy);
    });
    await expect(sky).toHaveAttribute("data-sky-quality", "economy", { timeout: 45000 });
    await page.evaluate(() => { window.__skyPressure = false; });
    const adapted = await snapshot(sky);
    await pixels(sky);
    assert.ok(adapted.width * adapted.height < initial.width * initial.height * .75);
    assert.equal(await canvas.evaluate(node => node.isConnected), true, "retain renderer canvas");
    assert.ok(+adapted.time > +initial.time, "scene clock advances without restarting");
    if (route === "/") {
      assert.equal(adapted.distantStars, initial.distantStars);
      assert.equal(adapted.moonOrbits, initial.moonOrbits);
      await page.locator("#contact").scrollIntoViewIfNeeded();
      await expect.poll(() => sky.getAttribute("data-hole-opacity").then(Number)).toBeGreaterThan(.9);
      await page.waitForTimeout(4500);
      await pixels(sky);
    }
    await page.screenshot({ path: `${dir}/${width}-${route === "/" ? "contact" : "credentials"}-economy.png` });
    await page.setViewportSize({ width: height, height: width });
    await expect(sky).toHaveAttribute("data-sky-quality", "economy");
    await pixels(sky);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    const hiddenTime = await sky.getAttribute("data-time");
    await page.waitForTimeout(350);
    assert.equal(await sky.getAttribute("data-time"), hiddenTime);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect.poll(() => sky.getAttribute("data-time").then(Number)).toBeGreaterThan(+hiddenTime);
    await expect(sky).toHaveAttribute("data-sky-quality", "economy");
    assert.deepEqual(errors, []);
    reports.push({ width, height, route, initial, adapted });
    await page.close();
    console.log(`PASS real pressure, retained scene, resize and hidden pause ${width} ${route}`);
  }
} finally {
  writeFileSync(`${dir}/report.json`, JSON.stringify(reports, null, 2));
  await browser.close();
}
