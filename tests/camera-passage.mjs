import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const url = process.env.PORTFOLIO_URL ?? "http://localhost:3002/";
const sizes = process.argv.includes("--confirm") ? [[1440, 900], [390, 844]] : [[1440, 900], [390, 844], [1024, 768], [768, 1024], [360, 800], [844, 390]];
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const reports = [];
mkdirSync("test-results/camera-passage", { recursive: true });

async function snapshot(page) {
  return page.locator(".worldline-backdrop canvas").evaluate(canvas => new Promise(resolve => requestAnimationFrame(() => {
    const d = canvas.parentElement.dataset, probes = JSON.parse(d.passageProbes);
    const gl = canvas.getContext("webgl2");
    const scaleX = gl.drawingBufferWidth / canvas.clientWidth, scaleY = gl.drawingBufferHeight / canvas.clientHeight;
    let painted = 0;
    const samples = [];
    for (const p of probes) {
      const x = Math.round(p.x * scaleX), y = Math.round((canvas.clientHeight - p.y) * scaleY);
      if (p.opacity < .3 || x < 5 || y < 5 || x > canvas.width - 5 || y > canvas.height - 5) continue;
      const pixel = new Uint8Array(9 * 9 * 4);
      gl.readPixels(x - 4, y - 4, 9, 9, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      let sum = 0, peak = 0;
      for (let i = 0; i < pixel.length; i += 4) { const light = pixel[i] + pixel[i + 1] + pixel[i + 2]; sum += light; peak = Math.max(peak, light); }
      if (peak - sum / 81 > 24) painted++;
      samples.push({ index: p.index, variation: peak - sum / 81, size: p.size });
    }
    const boxes = [...document.querySelector(".hero-copy").children].map(n => n.getBoundingClientRect());
    const r = { left: Math.min(...boxes.map(r => r.left)), top: Math.min(...boxes.map(r => r.top)), right: Math.max(...boxes.map(r => r.right)), bottom: Math.max(...boxes.map(r => r.bottom)) };
    resolve({ distance: +d.passageDistance, speed: +d.passageSpeed, opacity: +d.passageOpacity, count: +d.passageCount, calls: +d.drawCalls, probes, painted, samples, rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom } });
  })));
}

try {
  for (const [width, height] of sizes) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", m => { if (/Shader Error|THREE.WebGLProgram/.test(m.text())) errors.push(m.text()); });
    await page.addInitScript(() => sessionStorage.setItem("henrylabs-intro-seen", "1"));
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-preferences-ready", "true", { timeout: 20000 });
    const sky = page.locator(".worldline-backdrop");
    await expect(sky).toHaveAttribute("data-ready", "true", { timeout: 20000 });
    await expect.poll(() => sky.getAttribute("data-passage-opacity").then(Number)).toBeGreaterThan(.7);
    const before = await snapshot(page);
    await page.screenshot({ path: `test-results/camera-passage/${width}-idle.png` });
    await page.waitForTimeout(2500);
    const after = await snapshot(page);
    writeFileSync(`test-results/camera-passage/${width}-probes.json`, JSON.stringify({ before, after }, null, 2));
    assert.equal(after.count, width < 700 ? 36 : 72);
    assert.ok(after.calls < 65);
    assert.ok(after.distance > before.distance + .6, "near-star clock moves even at modest frame rates");
    assert.ok(before.painted + after.painted > 0, "near stars paint actual WebGL pixels outside copy");
    const moving = after.probes.filter((p, i) => p.opacity > .3 && before.probes[i].opacity > .3 && p.x > 10 && p.x < width - 10 && p.y > 10 && p.y < height - 10 && Math.hypot(p.x - before.probes[i].x, p.y - before.probes[i].y) > 2);
    assert.ok(moving.length, "visible stars move perceptibly in real time");
    for (const p of after.probes) if (p.x > after.rect.left && p.x < after.rect.right && p.y > after.rect.top && p.y < after.rect.bottom) assert.equal(p.opacity, 0, "hero text has a clear reading window");
    await page.screenshot({ path: `test-results/camera-passage/${width}-moving.png` });
    await page.evaluate(() => {
      window.__passagePeak = 0;
      window.__passageSampling = true;
      const sample = () => { if (!window.__passageSampling) return; window.__passagePeak = Math.max(window.__passagePeak, +document.querySelector(".worldline-backdrop").dataset.passageSpeed); requestAnimationFrame(sample); };
      sample();
    });
    await page.getByRole("button", { name: "Explore the universe", exact: true }).click();
    await expect(page.locator(".hero-stage")).toHaveAttribute("data-phase", "worlds");
    await expect(page.locator("html")).not.toHaveClass(/lenis-scrolling/);
    await expect.poll(() => sky.getAttribute("data-passage-opacity").then(Number)).toBeLessThan(.002);
    const peak = await page.evaluate(() => { window.__passageSampling = false; return window.__passagePeak; });
    assert.ok(peak > .7 && peak <= 2.88, `Explore accelerates but does not warp: ${peak}`);
    await expect(page.locator(".cosmic-canvas")).toBeFocused();
    for (const selector of ["#work", "#method", ".maker-chapter", "#contact"]) {
      await page.locator(selector).evaluate(n => window.scrollTo({ top: scrollY + n.getBoundingClientRect().top, behavior: "instant" }));
      await expect(sky).toHaveAttribute("data-passage-protected", "true");
      await expect.poll(() => sky.getAttribute("data-passage-opacity").then(Number)).toBeLessThan(.002);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect.poll(() => sky.getAttribute("data-passage-opacity").then(Number), { timeout: 10000 }).toBeGreaterThan(.7);
    await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); });
    await page.waitForTimeout(100);
    const paused = await sky.getAttribute("data-passage-distance");
    await page.waitForTimeout(600);
    assert.equal(await sky.getAttribute("data-passage-distance"), paused);
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event("visibilitychange")); });
    await expect.poll(() => sky.getAttribute("data-passage-distance").then(Number)).toBeGreaterThan(+paused);
    const resumed = +await sky.getAttribute("data-passage-distance");
    assert.ok(resumed - +paused < .3, "resume has no time catch-up jump");
    assert.equal(await page.locator("canvas").count(), 2);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    assert.deepEqual(errors, []);
    reports.push({ width, height, painted: before.painted + after.painted, moving: moving.length, peak, calls: after.calls });
    await page.close();
    console.log(`PASS camera passage ${width}x${height}`);
  }
  const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await reduced.goto(url);
  const still = reduced.locator(".worldline-backdrop");
  await expect(still).toHaveAttribute("data-ready", "true", { timeout: 20000 });
  await expect(still).toHaveAttribute("data-passage-opacity", "0.000");
  const stopped = await still.getAttribute("data-passage-distance");
  await reduced.waitForTimeout(200);
  assert.equal(await still.getAttribute("data-passage-distance"), stopped);
  await reduced.close();
  console.log("PASS reduced-motion passage suppression");
} finally { writeFileSync("test-results/camera-passage/report.json", JSON.stringify(reports, null, 2)); await browser.close(); }
