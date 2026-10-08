import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const url = process.env.PORTFOLIO_URL ?? "http://localhost:3002/";
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const viewports = [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 360, height: 800 }, { width: 844, height: 390 }];

async function scrollToEnd(page) {
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await expect.poll(async () => Number(await page.locator(".worldline-backdrop").getAttribute("data-hole-opacity"))).toBeGreaterThan(.95);
}

async function holePixels(page) {
  return page.locator(".worldline-backdrop canvas").evaluate((canvas) => new Promise((resolve) => requestAnimationFrame(() => {
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return resolve(null);
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const x = Math.round(Math.min(.95, Number(canvas.parentElement.dataset.holeX)) * width);
    const y = Math.round((1 - Number(canvas.parentElement.dataset.holeY)) * height);
    const center = new Uint8Array(4);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, center);
    const radius = Math.floor(Math.min(width, height) * .15);
    const left = Math.max(0, x - radius);
    const bottom = Math.max(0, y - radius);
    const patchWidth = Math.min(width - left, radius * 2);
    const patchHeight = Math.min(height - bottom, radius * 2);
    const pixels = new Uint8Array(patchWidth * patchHeight * 4);
    gl.readPixels(left, bottom, patchWidth, patchHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let lit = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 45 && pixels[i + 3] > 40) lit++;
    resolve({ center: [...center], lit });
  })));
}

async function readingPlanets(page, chapter) {
  const background = page.locator(".worldline-backdrop");
  await expect(background).toHaveAttribute("data-solar-chapter", "reading");
  await expect.poll(async () => Number(await background.getAttribute("data-reading-blend"))).toBeGreaterThan(.98);
  await expect.poll(async () => Number(await background.getAttribute("data-solar-visibility"))).toBeGreaterThan(.65);
  const signals = await background.locator("canvas").evaluate(canvas => new Promise(resolve => requestAnimationFrame(() => {
    const gl = canvas.getContext("webgl2");
    const bodies = JSON.parse(canvas.parentElement.dataset.solarBodies);
    resolve(bodies.filter(body => body.x > body.radius && body.x < canvas.clientWidth - body.radius && body.y > body.radius && body.y < canvas.clientHeight - body.radius).map(body => {
      const radius = Math.max(2, Math.floor(body.radius * .7));
      const x = Math.round(body.x), y = Math.round(gl.drawingBufferHeight - body.y);
      const pixels = new Uint8Array(radius * radius * 16);
      gl.readPixels(x - radius, y - radius, radius * 2, radius * 2, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let min = 765, max = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const brightness = pixels[i] + pixels[i + 1] + pixels[i + 2];
        min = Math.min(min, brightness); max = Math.max(max, brightness);
      }
      return { radius: body.radius, variation: max - min, brightest: max };
    }));
  })));
  assert.ok(signals.length >= 1, `${chapter} must retain an onscreen natural planet`);
  assert.ok(signals.some(body => body.radius >= 3 && body.variation > 15 && body.brightest > 50), `${chapter} must paint a shaded planet surface, not only set visibility metadata: ${JSON.stringify(signals)}`);
}

try {
  mkdirSync("test-results", { recursive: true });
  for (const viewport of process.argv.includes("--fallback") ? [] : viewports) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    const bitmapBackdrops = [];
    page.on("request", (request) => { if (request.url().includes("cosmic-nebula.png")) bitmapBackdrops.push(request.url()); });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (/THREE.WebGLProgram|Shader Error|VALIDATE_STATUS/.test(message.text())) errors.push(message.text()); });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.locator(".intro-loader").waitFor({ state: "hidden" });
    const background = page.locator(".worldline-backdrop");
    await expect(background).toHaveAttribute("data-ready", "true");
    await expect(background).toHaveAttribute("data-planet-surface", "opaque-terrain");
    await expect(background).toHaveAttribute("data-hole-opacity", "0.000");
    await expect(background).toHaveAttribute("data-constellation-links", "0");
    await expect(background).toHaveAttribute("data-solar-orbits", "5");
    await expect(background).toHaveAttribute("data-central-star", "true");
    await expect(background).toHaveAttribute("data-background-source", "volumetric-3d");
    await expect(background).toHaveAttribute("data-visitor-capacity", "5");
    await expect(background).toHaveAttribute("data-bright-stars", "18");
    await expect(background).toHaveAttribute("data-dust-flow", "inward");
    await expect(background).toHaveAttribute("data-dust-sources", "top,left,bottom,right");
    await expect(background).toHaveAttribute("data-dust-motion", "orbital-accretion");
    await expect(background).toHaveAttribute("data-feeding-dust-count", "240");
    await expect(background).toHaveAttribute("data-dust-streaks", "60");
    await expect(background).toHaveAttribute("data-distant-star-pull", "0.000");
    await expect(background).toHaveAttribute("data-star-twinkle", "on");
    await expect(background).toHaveAttribute("data-distant-stars", viewport.width < 700 ? "1000" : "1800");
    const starPixel = await background.locator("canvas").evaluate((canvas) => new Promise((resolve) => requestAnimationFrame(() => {
      const gl = canvas.getContext("webgl2");
      const host = canvas.parentElement;
      const x = Math.round(Number(host.dataset.stellarX) / host.clientWidth * gl.drawingBufferWidth);
      const y = Math.round((1 - Number(host.dataset.stellarY) / host.clientHeight) * gl.drawingBufferHeight);
      const pixel = new Uint8Array(4);
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      resolve([...pixel]);
    })));
    assert.ok(starPixel[0] > 60 && starPixel[3] > 220, "the opening must contain a painted luminous stellar surface");
    await page.screenshot({ path: `test-results/${viewport.width}-solar-opening.png` });
    assert.equal(await background.evaluate((node) => getComputedStyle(node).pointerEvents), "none");
    await page.locator("#work").evaluate(section => window.scrollTo({ top: scrollY + section.getBoundingClientRect().top + section.offsetHeight / 2 - innerHeight / 2, behavior: "instant" }));
    await readingPlanets(page, "selected project");
    await page.locator("#method").evaluate((section) => window.scrollTo({ top: scrollY + section.getBoundingClientRect().top + section.offsetHeight / 2 - innerHeight / 2, behavior: "instant" }));
    await expect(page.locator('#method [aria-current="step"] i')).toHaveText("03");
    await expect(background).toHaveAttribute("data-hole-opacity", "0.000");
    await readingPlanets(page, "method");
    await page.screenshot({ path: `test-results/${viewport.width}-connected-background.png` });
    await page.locator("#stack-title").scrollIntoViewIfNeeded();
    await readingPlanets(page, "technology orbit");
    await page.locator("#proof h2").scrollIntoViewIfNeeded();
    await expect(background).toHaveAttribute("data-hole-opacity", "0.000");
    await expect(background).toHaveAttribute("data-pull", "0.000");
    await readingPlanets(page, "credentials");
    await page.screenshot({ path: `test-results/${viewport.width}-persistent-planets.png` });
    await scrollToEnd(page);
    await expect(background).toHaveAttribute("data-hole-growth", "1.000", { timeout: 10000 });
    await expect(page.locator("footer")).toBeInViewport();
    const pixels = await holePixels(page);
    assert.ok(pixels && pixels.center[3] > 160, "event horizon must be painted in the lower-right corner");
    assert.ok(pixels.center.slice(0, 3).every((value) => value < 25), `horizon must be dark, not an additive star: ${pixels.center}`);
    assert.ok(pixels.lit > 10, "the disk must have luminous pixels around the dark center");
    assert.ok(Number(await background.getAttribute("data-hole-y")) >= .68);
    assert.ok(Number(await background.getAttribute("data-hole-x")) > 1, "the enlarged horizon must be cropped by the right boundary");
    assert.ok(Number(await background.getAttribute("data-hole-diameter")) > Math.min(viewport.width, viewport.height) * .7);
    await expect(background).toHaveAttribute("data-background-galaxies", "3");
    await expect(background).toHaveAttribute("data-gravity-active", "true");
    await expect(background).toHaveAttribute("data-distant-star-pull", "0.000");
    await expect(background).toHaveAttribute("data-spacecraft-visible", "false");
    await expect(background).toHaveAttribute("data-scout-visible", "false");
    await expect(background).toHaveAttribute("data-gravity-rest", "30");
    assert.ok(Number(await background.getAttribute("data-pull")) < .1, "jumping to Contact must not skip the slow intake");
    assert.ok(Number(await background.getAttribute("data-draw-calls")) < 65, "background must stay within its draw-call budget");
    assert.equal(await background.evaluate((node) => Math.round(node.getBoundingClientRect().height)), viewport.height);
    const time = Number(await background.getAttribute("data-time"));
    await expect.poll(async () => Number(await background.getAttribute("data-time"))).toBeGreaterThan(time + .03);
    assert.equal(await page.locator("canvas").count(), 2, "background must not add another WebGL renderer");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), viewport.width);
    await page.screenshot({ path: `test-results/${viewport.width}-black-hole-close.png` });
    await expect.poll(async () => Number(await background.getAttribute("data-visitor-opacity"))).toBeGreaterThan(.35);
    await expect(page.locator('#contact a[href*="wa.me"]')).toBeInViewport();
    await page.screenshot({ path: `test-results/${viewport.width}-gravity-infall.png` });
    await page.locator("#proof h2").scrollIntoViewIfNeeded();
    await expect(background).toHaveAttribute("data-gravity-active", "false");
    await expect(background).toHaveAttribute("data-pull", "0.000");
    const pausedAge = await background.getAttribute("data-gravity-age");
    await page.waitForTimeout(250);
    assert.equal(await background.getAttribute("data-gravity-age"), pausedAge);
    await scrollToEnd(page);
    await expect.poll(async () => Number(await background.getAttribute("data-gravity-age"))).toBeGreaterThan(Number(pausedAge));
    assert.deepEqual(errors, []);
    assert.deepEqual(bitmapBackdrops, [], "the production background must not request a PNG plate");
    await page.close();
    console.log(`background QA passed at ${viewport.width}x${viewport.height}`);
  }

  const reduced = await browser.newPage({ viewport: viewports[3], reducedMotion: "reduce" });
  await reduced.goto(url, { waitUntil: "domcontentloaded" });
  await expect(reduced.locator("html")).toHaveAttribute("data-preferences-ready", "true", { timeout: 20000 });
  await expect(reduced.locator(".intro-loader")).toBeHidden();
  await expect(reduced.locator(".worldline-backdrop")).toHaveAttribute("data-ready", "true");
  await expect(reduced.locator(".site-shell")).toHaveAttribute("data-motion", "off");
  await scrollToEnd(reduced);
  assert.ok(await holePixels(reduced), "reduced motion must retain the terminal landmark");
  await expect(reduced.locator(".worldline-backdrop")).toHaveAttribute("data-pull", "0.000");
  await expect(reduced.locator(".worldline-backdrop")).toHaveAttribute("data-visitor-opacity", "0.000");
  await expect(reduced.locator(".worldline-backdrop")).toHaveAttribute("data-gravity-age", "0.00");
  await expect(reduced.locator(".worldline-backdrop")).toHaveAttribute("data-star-twinkle", "off");
  const stillTime = await reduced.locator(".worldline-backdrop").getAttribute("data-time");
  await reduced.waitForTimeout(200);
  assert.equal(await reduced.locator(".worldline-backdrop").getAttribute("data-time"), stillTime);
  await reduced.close();

  const fallback = await browser.newPage({ viewport: viewports[3] });
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return String(kind).startsWith("webgl") ? null : original.call(this, kind, ...args); };
  });
  await fallback.goto(url, { waitUntil: "domcontentloaded" });
  await fallback.locator(".intro-loader").waitFor({ state: "hidden" });
  await expect(fallback.locator(".worldline-backdrop")).toHaveAttribute("data-fallback", "true");
  await expect(fallback.locator(".worldline-backdrop")).toHaveAttribute("data-hole-opacity", "0.000");
  await scrollToEnd(fallback);
  await expect(fallback.locator(".black-hole-fallback")).toBeVisible();
  await expect(fallback.locator('#contact a[href*="wa.me"]')).toBeVisible();
  await fallback.screenshot({ path: "test-results/390-black-hole-fallback.png" });
  await fallback.close();
  console.log("background reduced-motion and WebGL-fallback QA passed");
} finally {
  await browser.close();
}
