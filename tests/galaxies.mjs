import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const url = process.env.PORTFOLIO_URL ?? "http://localhost:3002/";
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const sizes = [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 360, height: 800 }, { width: 844, height: 390 }];
const targets = process.argv.includes("--touch") ? [] : process.argv.includes("--landscape") ? sizes.slice(-1) : process.argv.includes("--phone") ? sizes.slice(3, 5) : sizes;

async function reveal(page) {
  await page.locator(".intro-loader").waitFor({ state: "hidden" });
  await page.locator(".hero-stage").evaluate((hero) => window.scrollTo({ top: scrollY + hero.getBoundingClientRect().top + (hero.offsetHeight - innerHeight) * .7, behavior: "instant" }));
  await expect(page.locator(".hero-stage")).toHaveAttribute("data-phase", "worlds");
  await expect.poll(() => page.locator(".hero-copy").evaluate((node) => Number(getComputedStyle(node).opacity))).toBe(0);
}
async function universe(page) {
  await page.getByRole("button", { name: "Back to universe" }).click();
  await expect(page.locator(".cosmic-canvas")).toHaveAttribute("data-flight", "0.000");
  await expect(page.locator(".galaxy-label")).toHaveCount(3);
}
async function enter(page, name, count) {
  await page.getByRole("button", { name: `Explore ${name} galaxy`, exact: true }).click();
  await expect(page.locator(".cosmic-canvas")).toHaveAttribute("data-flight", "1.000");
  await expect(page.locator(".planet-label")).toHaveCount(count);
}

async function observeFlight(page) {
  await page.evaluate(() => {
    const scene = document.querySelector(".cosmic-canvas");
    const samples = [];
    const frames = {};
    window.__galaxyFlight = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("galaxy approach did not settle")), 10000);
      const sample = () => {
        const rect = scene.getBoundingClientRect();
        samples.push({ progress: Number(scene.dataset.flight), pan: Number(scene.dataset.flightPan), scale: Number(scene.dataset.orbitScale), galaxy: Number(scene.dataset.galaxyVisibility), angle: Number(scene.dataset.universeAngle), stage: scene.dataset.flightStage, x: rect.x, y: rect.y, width: rect.width, height: rect.height });
        const p = Number(scene.dataset.flight);
        const phase = p > .18 && p < .46 ? "approach" : p > .63 && p < .9 ? "arrival" : null;
        if (phase && !frames[phase]) {
          const canvas = scene.querySelector("canvas");
          const gl = canvas.getContext("webgl2");
          const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
          gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          let painted = 0;
          for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 20) painted++;
          frames[phase] = { painted, image: [1440, 390].includes(innerWidth) ? canvas.toDataURL("image/png") : null };
        }
        if (scene.dataset.flight === "1.000") { clearTimeout(timeout); resolve({ samples, frames }); }
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
  });
}

try {
  mkdirSync("test-results", { recursive: true });
  for (const viewport of targets) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (error) => { errors.push(error.message); console.log("galaxy page error", error.message); });
    page.on("console", (message) => { if (/Shader Error|THREE.WebGLProgram/.test(message.text())) errors.push(message.text()); });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await reveal(page);
    const scene = page.locator(".cosmic-canvas");
    await expect(scene).toHaveAttribute("data-ready", "true");
    await expect(scene).toHaveAttribute("data-branded-worlds", "5");
    await expect(scene).toHaveAttribute("data-planet-surface", "transparent-identity");
    await expect(scene).toHaveAttribute("data-sculpture-worlds", "10");
    await expect(scene).toHaveAttribute("data-view", "universe");
    await expect(page.locator(".planet-label")).toHaveCount(0);
    await expect(page.locator(".galaxy-label")).toHaveCount(3);
    await expect(page.locator(".sector-navigation")).toHaveCount(0);
    const overviewAngle = Number(await scene.getAttribute("data-universe-angle"));
    await expect.poll(async () => Number(await scene.getAttribute("data-universe-angle"))).toBeGreaterThan(overviewAngle + .003);
    const epoch = await scene.getAttribute("data-renderer-epoch");
    for (const label of await page.locator(".galaxy-label").all()) await expect(label).toBeInViewport({ ratio: .99 });
    await page.screenshot({ path: `test-results/${viewport.width}-three-galaxies.png` });
    const label = page.getByRole("button", { name: "Explore HenryLabs galaxy" });
    const bounds = await scene.boundingBox();
    // Click the 3D core, not its semantic label.
    await page.mouse.move(bounds.x + Number(await label.getAttribute("data-core-x")), bounds.y + Number(await label.getAttribute("data-core-y")));
    await expect(scene).toHaveAttribute("data-hovered-galaxy", "main");
    await expect(label).toHaveAttribute("data-highlighted", "true");
    const beforeFlight = await scene.boundingBox();
    await observeFlight(page);
    await page.mouse.click(bounds.x + Number(await label.getAttribute("data-core-x")), bounds.y + Number(await label.getAttribute("data-core-y")));
    await expect(scene).toHaveAttribute("data-view", "orbit");
    await expect(scene).toHaveAttribute("data-flight", "1.000");
    const { samples: flight, frames } = await page.evaluate(() => window.__galaxyFlight);
    const approach = flight.filter(({ stage }) => stage === "approach");
    const arrival = flight.filter(({ stage }) => stage === "arrival");
    assert.ok(approach.length > 1 && arrival.length > 1, "the journey must expose both real camera stages");
    assert.ok(approach.every(({ scale, galaxy }) => scale === 0 && galaxy > .97), "the selected galaxy must remain while the local system is hidden");
    assert.ok(arrival.some(({ scale, galaxy }) => scale > .1 && scale < .9 && galaxy > .1), "dust and local planets must overlap during the shared arrival");
    const inFlight = flight.filter(({ progress }) => progress > 0 && progress < 1);
    assert.ok(inFlight.every(({ angle }) => Math.abs(angle - inFlight[0].angle) < .0001), "the approach must not chase a moving galaxy");
    for (const phase of ["approach", "arrival"]) {
      assert.ok(frames[phase]?.painted > 100, `${phase} must paint real scene pixels`);
      if (frames[phase].image) writeFileSync(`test-results/${viewport.width}-flight-${phase}.png`, Buffer.from(frames[phase].image.split(",")[1], "base64"));
    }
    if (viewport.width <= 640) for (const sample of flight) {
      assert.ok(Math.abs(sample.x - beforeFlight.x) < 1 && Math.abs(sample.y - beforeFlight.y) < 1);
      assert.ok(Math.abs(sample.width - beforeFlight.width) < 1 && Math.abs(sample.height - beforeFlight.height) < 1, "phone viewport must not jump between galaxy and project scenes");
    }
    await expect(scene).toHaveAttribute("data-flight-ready", "true");
    await expect(scene).toHaveAttribute("data-orbit-scale", "1.000");
    await expect(page.locator(".planet-label")).toHaveCount(5);
    if (viewport.width <= 640) for (const planet of await page.locator(".planet-label").all()) {
      await expect(planet).toBeInViewport({ ratio: .99 });
      const box = await planet.boundingBox();
      assert.ok(box.x >= bounds.x && box.x + box.width <= bounds.x + bounds.width, "all phone project labels must fit the canvas");
    }
    await expect(scene).toHaveAttribute("data-project-orbits", "4");
    await expect(scene).toHaveAttribute("data-orbit-connectors", "0");
    await expect(scene).toHaveAttribute("data-orbit-center", "catmoji");
    await expect(page.locator(".project-showcase")).toHaveCount(0);
    await expect(scene).toHaveAttribute("data-tech-transfers", "0");
    assert.ok(Number(await scene.getAttribute("data-tech-orbit-error")) < .001);
    await page.screenshot({ path: `test-results/${viewport.width}-galaxy-entered.png` });
    const naliraBounds = await page.getByRole("button", { name: "Nalira", exact: true }).boundingBox();
    assert.ok(naliraBounds, "the moving project must expose a pointer target");
    await page.mouse.click(naliraBounds.x + naliraBounds.width / 2, naliraBounds.y + naliraBounds.height / 2);
    await expect(scene).toHaveAttribute("data-active-world", "nalira");
    await expect(scene).toHaveAttribute("data-tech-transfers", "0");
    assert.ok(Number(await scene.getAttribute("data-tech-orbit-error")) < .001);
    const polaraBounds = await page.getByRole("button", { name: "Polara", exact: true }).boundingBox();
    assert.ok(polaraBounds, "the shared-stack project must expose a pointer target");
    await page.mouse.click(polaraBounds.x + polaraBounds.width / 2, polaraBounds.y + polaraBounds.height / 2);
    await expect(scene).toHaveAttribute("data-active-world", "polara");
    await expect(scene).toHaveAttribute("data-orbit-center", "polara");
    await expect.poll(async () => Number(await scene.getAttribute("data-tech-transfers"))).toBeGreaterThan(0);
    await expect(scene).toHaveAttribute("data-tech-transfers", "0");
    assert.ok(Number(await scene.getAttribute("data-tech-orbit-error")) < .001, "shared tools must settle on the selected owner's lanes");
    assert.ok(Number(await scene.getAttribute("data-project-orbit-error")) < .001);
    await expect(page.locator(".project-showcase")).toHaveCount(0);
    await scene.focus();
    await page.keyboard.press("Escape");
    await expect(scene).toHaveAttribute("data-flight", "0.000");
    await enter(page, "University", 3);
    await expect(scene).toHaveAttribute("data-tech-count", "8");
    await expect(scene).toHaveAttribute("data-linked-tech-count", "2");
    await expect(scene).toHaveAttribute("data-project-orbits", "2");
    await page.screenshot({ path: `test-results/${viewport.width}-university-sculptures.png` });
    await scene.focus();
    await page.keyboard.press("ArrowRight");
    await expect(scene).toHaveAttribute("data-active-world", "pos");
    await expect(scene).toHaveAttribute("data-linked-tech-count", "2");
    await page.keyboard.press("ArrowRight");
    await expect(scene).toHaveAttribute("data-active-world", "labq");
    await expect(scene).toHaveAttribute("data-linked-tech-count", "4");
    await expect(scene).toHaveAttribute("data-tech-transfers", "0");
    assert.ok(Number(await scene.getAttribute("data-tech-orbit-error")) < .001);
    await page.keyboard.press("ArrowLeft");
    await universe(page);
    await enter(page, "Client Work", 2);
    await expect(scene).toHaveAttribute("data-tech-count", "5");
    await expect(scene).toHaveAttribute("data-linked-tech-count", "1");
    await scene.focus();
    await page.keyboard.press("ArrowRight");
    await expect(scene).toHaveAttribute("data-active-world", "soreva");
    await expect(scene).toHaveAttribute("data-linked-tech-count", "4");
    await expect(scene).toHaveAttribute("data-tech-transfers", "0");
    assert.ok(Number(await scene.getAttribute("data-tech-orbit-error")) < .001);
    await page.keyboard.press("ArrowLeft");
    await expect(scene).toHaveAttribute("data-project-orbits", "1");
    await page.screenshot({ path: `test-results/${viewport.width}-client-sculptures.png` });
    await page.getByRole("button", { name: "Open active world" }).click();
    await expect(page.locator(".satellite-readout")).toContainText("Solo by Henry");
    await scene.focus();
    await page.keyboard.press("Escape");
    await expect(page.locator(".project-showcase")).toHaveCount(0);
    await expect(scene).toHaveAttribute("data-view", "orbit");
    await universe(page);
    await enter(page, "University", 3);
    await expect(scene).toHaveAttribute("data-active-world", "pos");
    await expect(page.locator(".project-showcase")).toHaveCount(0);
    assert.equal(await scene.getAttribute("data-renderer-epoch"), epoch, "galaxy selection must reuse its scene and renderer");
    assert.equal(await page.locator("canvas").count(), 2);
    await universe(page);
    await page.getByRole("button", { name: "Explore HenryLabs galaxy" }).click();
    await expect(scene).toHaveAttribute("data-flight-ready", "false");
    await expect(page.getByRole("button", { name: "Open active world" })).toBeHidden();
    await page.getByRole("button", { name: "Back to universe" }).click();
    await expect(scene).toHaveAttribute("data-flight", "0.000");
    await expect(page.locator(".galaxy-label")).toHaveCount(3);
    await page.getByRole("button", { name: "Toggle language" }).click();
    await expect(page.getByRole("button", { name: "Jelajahi Kuliah galaksi" })).toBeVisible();
    const cameraDistance = Number(await scene.getAttribute("data-camera-distance"));
    await page.locator(".hero-stage").evaluate((hero) => window.scrollTo({ top: scrollY + hero.getBoundingClientRect().top + (hero.offsetHeight - innerHeight) * .94, behavior: "instant" }));
    await expect(page.locator(".hero-stage")).toHaveAttribute("data-phase", "departing");
    await expect.poll(async () => Number(await scene.getAttribute("data-departure"))).toBeGreaterThan(.65);
    assert.ok(Number(await scene.getAttribute("data-camera-distance")) > cameraDistance + 10, "the map must recede in real camera depth");
    assert.ok(Number(await scene.getAttribute("data-departure")) > .65);
    assert.equal(await page.locator(".cosmic-frame-wrap").evaluate((node) => node.inert), true);
    await page.screenshot({ path: `test-results/${viewport.width}-galaxy-departure.png` });
    await page.locator(".hero-stage").evaluate((hero) => window.scrollTo({ top: scrollY + hero.getBoundingClientRect().top + (hero.offsetHeight - innerHeight) * .7, behavior: "instant" }));
    await expect(page.locator(".hero-stage")).toHaveAttribute("data-phase", "worlds");
    await expect(scene).toHaveAttribute("data-departure", "0.000");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), viewport.width);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`galaxy QA passed at ${viewport.width}x${viewport.height}`);
  }
  const touch = await browser.newPage({ viewport: sizes[3], hasTouch: true, isMobile: true });
  await touch.goto(url);
  await reveal(touch);
  const touchScene = touch.locator(".cosmic-canvas");
  await expect(touchScene).toHaveAttribute("data-ready", "true");
  const touchCore = touch.getByRole("button", { name: "Explore Client Work galaxy" });
  const touchBounds = await touchScene.boundingBox();
  const touchPoint = { x: touchBounds.x + Number(await touchCore.getAttribute("data-core-x")), y: touchBounds.y + Number(await touchCore.getAttribute("data-core-y")) };
  const touchTarget = await touch.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.outerHTML.slice(0, 200), touchPoint);
  await touch.screenshot({ path: "test-results/touch-galaxies.png" });
  await touch.touchscreen.tap(touchPoint.x, touchPoint.y);
  await expect(touchScene).toHaveAttribute("data-flight", "1.000");
  if (await touch.locator(".planet-label").count() !== 2) console.log("touch core diagnostic", { touchPoint, touchBounds, touchTarget, world: await touchScene.getAttribute("data-active-world") });
  await expect(touch.locator(".planet-label")).toHaveCount(2);
  const sorevaBounds = await touch.getByRole("button", { name: "Soreva", exact: true }).boundingBox();
  assert.ok(sorevaBounds, "Soreva must have a projected touch target");
  await touch.touchscreen.tap(sorevaBounds.x + sorevaBounds.width / 2, sorevaBounds.y + sorevaBounds.height / 2);
  await expect(touchScene).toHaveAttribute("data-active-world", "soreva");
  await touch.getByRole("button", { name: "Back to universe" }).tap();
  await expect(touchScene).toHaveAttribute("data-flight", "0.000");
  await touch.close();
  console.log("galaxy touch QA passed at 390x844");
  const reduced = await browser.newPage({ viewport: sizes[3], reducedMotion: "reduce" });
  await reduced.goto(url);
  await reduced.locator(".intro-loader").waitFor({ state: "hidden" });
  await enter(reduced, "University", 3);
  await expect(reduced.locator(".cosmic-canvas")).toHaveAttribute("data-flight-stage", "orbit");
  await expect(reduced.locator(".cosmic-canvas")).toHaveAttribute("data-orbit-scale", "1.000");
  const time = await reduced.locator(".cosmic-canvas").getAttribute("data-time");
  await reduced.waitForTimeout(200);
  assert.equal(await reduced.locator(".cosmic-canvas").getAttribute("data-time"), time);
  await reduced.close();
  const fallback = await browser.newPage({ viewport: sizes[3], reducedMotion: "reduce" });
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return String(kind).startsWith("webgl") ? null : original.call(this, kind, ...args); };
  });
  await fallback.goto(url);
  await fallback.locator(".intro-loader").waitFor({ state: "hidden" });
  await fallback.getByRole("button", { name: "Explore Client Work galaxy" }).click();
  await expect(fallback.locator(".planet-label")).toHaveCount(2);
  await fallback.getByRole("button", { name: "Soreva", exact: true }).click();
  await fallback.getByRole("button", { name: "Open active world" }).click();
  await expect(fallback.locator(".satellite-readout")).toContainText("Vieri prototype account");
  await fallback.close();
  console.log("galaxy reduced-motion and fallback QA passed");
} finally { await browser.close(); }
