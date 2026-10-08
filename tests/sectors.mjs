import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const url = process.env.PORTFOLIO_URL ?? "http://localhost:3002/";
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const viewports = [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 360, height: 800 }, { width: 844, height: 390 }];
const targets = process.argv.includes("--landscape") ? viewports.filter((viewport) => viewport.width === 844) : viewports;

async function enterOrbit(page) {
  await page.locator(".intro-loader").waitFor({ state: "hidden" });
  await page.locator(".hero-stage").evaluate((hero) => window.scrollTo({
    top: scrollY + hero.getBoundingClientRect().top + (hero.offsetHeight - innerHeight) * .7,
    behavior: "instant",
  }));
  await expect(page.locator(".hero-stage")).toHaveAttribute("data-phase", "worlds");
}

async function chooseGalaxy(page, name) {
  if (await page.locator(".cosmic-canvas").getAttribute("data-view") === "orbit") {
    await page.getByRole("button", { name: "Back to universe" }).click();
    await expect(page.locator(".cosmic-canvas")).toHaveAttribute("data-flight", "0.000");
  }
  const galaxy = page.getByRole("button", { name: `Explore ${name} galaxy`, exact: true });
  await galaxy.focus();
  await galaxy.click();
  await expect(page.locator(".cosmic-canvas")).toHaveAttribute("data-flight", "1.000");
}

async function paintedScene(page) {
  await expect(page.locator(".cosmic-canvas")).toHaveAttribute("data-ready", "true");
  const painted = await page.locator(".cosmic-canvas canvas").evaluate((canvas) => new Promise((resolve) => {
    requestAnimationFrame(() => {
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (!gl) return resolve(false);
      const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
      gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let count = 0;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 20) count++;
      resolve(count > pixels.length / 1000);
    });
  }));
  assert.equal(painted, true, "satellite scene must render visible 3D pixels");
}

async function waitForAnchorArrival(page, selector) {
  await expect(page.locator(selector)).toBeInViewport();
  // Let the authored anchor animation finish before testing a return to the orbit.
  await page.evaluate(() => new Promise((resolve, reject) => {
    let previous = scrollY;
    let stableFrames = 0;
    const timeout = setTimeout(() => reject(new Error("anchor scroll did not settle")), 3000);
    const sample = () => {
      stableFrames = Math.abs(scrollY - previous) < .2 ? stableFrames + 1 : 0;
      previous = scrollY;
      if (stableFrames >= 12) { clearTimeout(timeout); resolve(); }
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
}

try {
  mkdirSync("test-results", { recursive: true });
  for (const viewport of targets) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await enterOrbit(page);
    await chooseGalaxy(page, "University");
    const scene = page.locator(".cosmic-canvas");
    await expect(scene).toHaveAttribute("data-world-count", "3");
    await expect(scene).toHaveAttribute("data-tech-count", "8");
    await expect(page.locator(".planet-label")).toHaveCount(3);
    await expect(page.locator(".project-showcase")).toHaveCount(0);
    await paintedScene(page);
    await scene.focus();
    await page.keyboard.press("ArrowRight");
    await expect(scene).toHaveAttribute("data-active-world", "pos");
    await expect(page.locator(".project-showcase")).toHaveCount(0);
    await page.getByRole("button", { name: "Open active world" }).click();
    await expect(page.locator(".satellite-readout")).toContainText("POS Z Shoes");
    await expect(page.locator('.satellite-readout a[href="https://github.com/nugrahahenry/POS_APBDS"]')).toHaveCount(1);
    await expect(page.locator(".satellite-readout").getByRole("button", { name: /^(Previous|Next) project$/ })).toHaveCount(0);
    await page.locator(".satellite-readout").getByRole("button", { name: "Focus LabQ", exact: true }).click();
    await expect(page.locator(".satellite-readout")).toContainText("LabQ");
    await expect(page.locator(".home-project-preview")).toHaveAttribute("data-project", "labq");
    await expect.poll(() => page.locator(".satellite-readout").evaluate((panel) => Number(getComputedStyle(panel).opacity))).toBe(1);
    if (viewport.height < 620) {
      const panel = page.locator(".satellite-readout");
      const bounds = await panel.boundingBox();
      const documentPosition = await page.evaluate(() => scrollY);
      await page.mouse.move(bounds.x + bounds.width * .85, bounds.y + bounds.height * .7);
      await page.mouse.wheel(0, 180);
      await expect.poll(() => panel.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
      assert.equal(await page.evaluate(() => scrollY), documentPosition, "inspector wheel must not move the page");
      await panel.evaluate((node) => node.scrollTo({ top: 0, behavior: "instant" }));
    }
    await page.screenshot({ path: `test-results/${viewport.width}-university-sector.png` });
    await page.locator('.satellite-readout a[href^="/projects/labq"]').click();
    await expect(page.locator("h1")).toHaveText("LabQ");
    await page.getByRole("link", { name: "Back to the universe" }).click();
    await enterOrbit(page);
    await expect(scene).toHaveAttribute("data-active-world", "labq");
    await expect(page.locator(".project-showcase")).toHaveCount(0);
    await chooseGalaxy(page, "Client Work");
    await expect(scene).toHaveAttribute("data-world-count", "2");
    await expect(scene).toHaveAttribute("data-tech-count", "5");
    await paintedScene(page);
    // A real pointer click on the projected label must select without reopening the panel.
    const soreva = page.locator(".planet-label").filter({ hasText: "Soreva" });
    await expect(soreva).toBeInViewport();
    const bounds = await soreva.boundingBox();
    await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await expect(scene).toHaveAttribute("data-active-world", "soreva");
    await expect(page.locator(".home-project-preview")).toHaveAttribute("data-project", "soreva");
    await expect(page.locator(".home-project-preview")).toContainText("Vieri");
    await expect(page.locator(".project-showcase")).toHaveCount(0);
    await page.getByRole("button", { name: "Open active world" }).click();
    await expect(page.locator(".satellite-readout")).toContainText("Vieri prototype account");
    await expect.poll(() => page.locator(".satellite-readout").evaluate((panel) => Number(getComputedStyle(panel).opacity))).toBe(1);
    await expect(page.locator('.satellite-readout a[target="_blank"]')).toHaveCount(0);
    await page.screenshot({ path: `test-results/${viewport.width}-client-sector.png` });
    await expect(page.locator('.satellite-readout a[href^="/projects/soreva"]')).toHaveCount(1);
    await page.getByRole("button", { name: "Close active world" }).click();
    await chooseGalaxy(page, "HenryLabs");
    await expect(scene).toHaveAttribute("data-world-count", "5");
    await expect(scene).toHaveAttribute("data-tech-count", "15");
    await expect(scene).toHaveAttribute("data-active-world", "catmoji");
    await paintedScene(page);
    await expect(page.locator(".project-showcase")).toHaveCount(0);
    await chooseGalaxy(page, "University");
    await expect(scene).toHaveAttribute("data-active-world", "labq");
    await page.getByRole("button", { name: "Toggle language" }).click();
    await expect(page.getByRole("button", { name: "Kembali ke semesta" })).toBeVisible();
    await page.getByRole("button", { name: "Kembali ke semesta" }).click();
    await expect(page.getByRole("group", { name: "Peta galaksi" })).toBeVisible();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`sector QA passed at ${viewport.width}x${viewport.height}`);
  }

  const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await reduced.goto(url);
  await reduced.locator(".intro-loader").waitFor({ state: "hidden" });
  await reduced.getByRole("button", { name: "Explore University galaxy" }).click();
  await expect(reduced.locator(".cosmic-canvas")).toHaveAttribute("data-world-count", "3");
  const time = await reduced.locator(".cosmic-canvas").getAttribute("data-time");
  await reduced.waitForTimeout(160);
  assert.equal(await reduced.locator(".cosmic-canvas").getAttribute("data-time"), time);
  await reduced.close();

  const fallback = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (String(type).startsWith("webgl")) return null;
      return original.call(this, type, ...args);
    };
  });
  await fallback.goto(url);
  await fallback.locator(".intro-loader").waitFor({ state: "hidden" });
  await fallback.getByRole("button", { name: "Explore Client Work galaxy" }).click();
  await expect(fallback.locator(".cosmic-canvas")).toHaveClass(/canvas-fallback/);
  await expect(fallback.locator(".planet-label")).toHaveCount(2);
  await fallback.getByRole("button", { name: "Soreva", exact: true }).click();
  await fallback.getByRole("button", { name: "Open active world" }).click();
  await expect(fallback.locator(".satellite-readout")).toContainText("Soreva");
  await fallback.screenshot({ path: "test-results/390-sectors-webgl-fallback.png" });
  await fallback.close();
  console.log("sector reduced motion and WebGL fallback passed");
} finally {
  await browser.close();
}
