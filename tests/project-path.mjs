import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const base = (process.env.PORTFOLIO_URL ?? "http://localhost:3002").replace(/\/$/, "");
const sizes = process.argv.includes("--confirm") ? [[1440, 900], [390, 844]] : [[1440, 900], [1024, 768], [768, 1024], [390, 844], [360, 800], [844, 390]];
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
mkdirSync("test-results/project-path", { recursive: true });

async function world(page, id) {
  const scene = page.locator(".cosmic-canvas");
  await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 20000 });
  await expect(scene).toHaveAttribute("data-active-world", id);
  await expect(scene).toHaveAttribute("data-flight", "1.000");
  await expect(page.locator(".hero-stage")).toHaveAttribute("data-phase", "worlds");
  await expect(page.locator(".world-inspector")).toHaveCount(0);
  return scene;
}
async function fit(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal overflow");
  for (const item of await page.locator(".detail-overview > div, .detail-flow li").all()) {
    assert.ok(await item.evaluate(n => n.scrollWidth <= n.clientWidth + 1), "facts and workflow fit their columns");
  }
}
try {
  for (const [width, height] of process.argv.includes("--edges") ? [] : sizes) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 500 });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(`${base}/?world=catmoji`);
    const scene = await world(page, "catmoji");
    await expect(scene).toBeFocused();
    const historyLength = await page.evaluate(() => history.length);
    const top = await page.evaluate(() => scrollY);
    const epoch = await scene.getAttribute("data-renderer-epoch");
    const pixels = await scene.locator("canvas").evaluate(canvas => new Promise(resolve => requestAnimationFrame(() => {
      const gl = canvas.getContext("webgl2"), data = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
      let painted = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 20) painted++;
      resolve(painted);
    })));
    assert.ok(pixels > 250, "restored project scene has real painted WebGL pixels");
    // Orbiting targets intentionally move. Keyboard activation tests the stable semantic target.
    await page.getByRole("button", { name: "Nalira", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(scene).toHaveAttribute("data-active-world", "nalira");
    await expect(page).toHaveURL(/world=nalira/);
    assert.equal(await page.evaluate(() => history.length), historyLength, "selection replaces history instead of adding every planet");
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - top) < 2, "selection does not replay the entry scroll");
    assert.equal(await scene.getAttribute("data-renderer-epoch"), epoch);
    await page.getByRole("button", { name: "Open active world", exact: true }).click();
    await page.getByRole("link", { name: "Read project", exact: true }).click();
    await expect(page.locator("h1")).toHaveText("Nalira");
    await expect(page.locator(".detail-overview")).toContainText("MVP");
    await expect(page.locator(".detail-flow li p")).toHaveCount(3);
    await expect(page.getByRole("link", { name: "Find in the universe", exact: true })).toHaveCount(0);
    await expect(page.locator(".project-visual figcaption")).toContainText("Concept artwork");
    await fit(page);
    await page.screenshot({ path: `test-results/project-path/${width}-detail.png`, fullPage: true });
    await page.goBack();
    await world(page, "nalira");
    await page.reload();
    await world(page, "nalira");
    await expect(scene).toBeFocused();
    await page.getByRole("button", { name: "Back to universe", exact: true }).click();
    await expect(page).toHaveURL(/view=universe/);
    assert.equal(new URL(page.url()).searchParams.has("world"), false);
    await expect(scene).toHaveAttribute("data-flight", "0.000");
    await page.reload();
    await expect(scene).toHaveAttribute("data-ready", "true", { timeout: 20000 });
    await expect(scene).toHaveAttribute("data-view", "universe");
    await expect(scene).toBeFocused();
    await page.getByRole("button", { name: "Explore Client Work galaxy", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(scene).toHaveAttribute("data-flight", "1.000");
    await expect(page).toHaveURL(/world=yventures/);
    await page.getByRole("button", { name: "Soreva", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/world=soreva/);
    await page.getByRole("button", { name: "Open active world", exact: true }).click();
    await page.getByRole("link", { name: "Read project", exact: true }).click();
    await expect(page.locator("h1")).toHaveText("Soreva Autonomous Content");
    await expect(page.locator(".detail-overview")).toContainText("Vieri prototype account");
    await expect(page.locator(".privacy-note")).toBeVisible();
    await expect(page.getByRole("link", { name: "Read source", exact: true })).toHaveCount(0);
    await fit(page);
    await page.screenshot({ path: `test-results/project-path/${width}-private.png`, fullPage: true });
    await page.getByRole("link", { name: "Back to the universe", exact: true }).click();
    await world(page, "soreva");
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS project return and detail ${width}x${height}`);
  }
  for (const mode of ["still", "reduced", "fallback"]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: mode === "still" ? "no-preference" : "reduce" });
    if (mode === "fallback") await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(kind, ...args) { return String(kind).startsWith("webgl") ? null : original.call(this, kind, ...args); };
    });
    await page.goto(`${base}/projects/rentalmobil-sg?from=universe&lang=id${mode === "still" ? "&motion=off" : ""}`);
    await expect(page.locator(".detail-flow li p")).toHaveCount(3);
    await page.locator(".detail-neighbor--next").click();
    await expect(page.locator("h1")).toHaveText("POS Z Shoes");
    await expect(page).toHaveURL(/from=universe.*lang=id/);
    await page.getByRole("link", { name: "Kembali ke semesta", exact: true }).click();
    await expect(page.locator(".cosmic-frame")).toHaveAttribute("data-sector", "university");
    await expect(page.locator(".planet-label[data-selected=true]")).toContainText("POS");
    await expect(page.locator(".world-inspector")).toHaveCount(0);
    await expect(page.locator(".cosmic-canvas")).toBeFocused();
    if (mode === "still") await expect(page).toHaveURL(/motion=off/);
    await page.close();
    console.log(`PASS project path Indonesian ${mode}`);
  }
  const modePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await modePage.goto(`${base}/?world=nalira`);
  await world(modePage, "nalira");
  for (const enabled of [false, true]) {
    await modePage.getByRole("button", { name: "Animation", exact: true }).focus();
    await modePage.keyboard.press("Enter");
    await expect(modePage.locator("html")).toHaveAttribute("data-motion", enabled ? "on" : "off");
    await expect(modePage.locator(".cosmic-canvas")).toBeInViewport({ ratio: .95 });
    await expect(modePage.locator(".cosmic-canvas")).toHaveAttribute("data-active-world", "nalira");
  }
  await modePage.close();
  console.log("PASS live motion-toggle map framing");
} finally { await browser.close(); }
