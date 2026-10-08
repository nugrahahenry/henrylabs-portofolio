import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const url = process.env.PORTFOLIO_URL ?? "http://localhost:3002/";
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const sizes = [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 360, height: 800 }, { width: 844, height: 390 }];
const targets = process.argv.includes("--phone") ? sizes.slice(3, 5) : process.argv.includes("--landscape") ? sizes.slice(-1) : process.argv.includes("--desktop") ? sizes.slice(0, 1) : process.argv.includes("--tablet") ? sizes.slice(2, 3) : sizes;

async function signalPixels(page, kind) {
  return page.locator(".worldline-backdrop canvas").evaluate((canvas, kind) => {
    const host = canvas.parentElement, gl = canvas.getContext("webgl2");
    const radius = Math.ceil(Number(host.dataset[`${kind}Radius`]));
    const x = Math.round(Number(host.dataset[`${kind}X`])), y = Math.round(gl.drawingBufferHeight - Number(host.dataset[`${kind}Y`]));
    const left = Math.max(0, x - radius), bottom = Math.max(0, y - radius);
    const width = Math.min(radius * 2, gl.drawingBufferWidth - left), height = Math.min(radius * 2, gl.drawingBufferHeight - bottom);
    if (width <= 0 || height <= 0) return 0;
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(left, bottom, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let brightest = 0, total = 0;
    for (let i = 0; i < pixels.length; i += 4) { const light = pixels[i] + pixels[i + 1] + pixels[i + 2]; brightest = Math.max(brightest, light); total += light; }
    return brightest - total / (width * height);
  }, kind);
}

try {
  mkdirSync("test-results", { recursive: true });
  for (const viewport of targets) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (/Shader Error|THREE.WebGLProgram|mergeGeometries/.test(message.text())) errors.push(message.text()); });
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.addInitScript(() => sessionStorage.setItem("henrylabs-intro-seen", "1"));
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const field = page.locator(".worldline-backdrop");
    for (let i = 0; i < 12; i++) await page.clock.fastForward(250);
    await expect(field).toHaveAttribute("data-ready", "true");
    await expect(field).toHaveAttribute("data-spacecraft-capacity", "2");
    const delay = viewport.width / viewport.height < .9 || viewport.height < 620 ? 12.5 : 4.8;
    await expect(field).toHaveAttribute("data-pursuit-delay", String(delay));
    const openingGap = await page.evaluate(() => document.querySelector(".hero-kicker").getBoundingClientRect().top - document.querySelector(".site-header").getBoundingClientRect().bottom);
    if (viewport.width / viewport.height < .9 || viewport.height < 620 || openingGap < 105) {
      console.log(`compact opening (${viewport.width}px, ${openingGap.toFixed(1)}px headroom): verifying the pursuit in Method`);
      await page.locator("#method").evaluate((section) => window.scrollTo({ top: scrollY + section.getBoundingClientRect().top, behavior: "instant" }));
      for (let i = 0; i < 12; i++) await page.clock.fastForward(250);
    }
    let seenPair = false, seenLeader = false, seenShot = false, leadEntry = false, scoutEntry = false, portalClosed = false, shotSignal = 0, nextTrace = 14;
    for (let i = 0; i < 1000; i++) {
      await page.clock.fastForward(250);
      if (i % 8 !== 0) continue;
      const sample = await field.evaluate((host) => ({ time: Number(host.dataset.flightTime), lead: host.dataset.spacecraftVisible === "true", scout: host.dataset.scoutVisible === "true", leadGap: Number(host.dataset.ufoClearance), scoutGap: Number(host.dataset.scoutClearance), calls: Number(host.dataset.drawCalls) }));
      if (sample.lead) assert.ok(sample.leadGap >= .0348, "the UFO must clear real projected bodies/rings");
      if (sample.scout) assert.ok(sample.scoutGap >= .0348, "the scout must clear planets and its leading UFO");
      assert.ok(sample.calls < 65, "two detailed craft must stay within the existing draw budget");
      if (sample.lead && !sample.scout) seenLeader = true;
      if (Number(await field.getAttribute("data-pursuit-bolts")) > 0) {
        seenShot = true;
        shotSignal = Math.max(shotSignal, await signalPixels(page, "bolt"));
      }
      if (!seenPair && sample.time > 6.5 && sample.lead && sample.scout) {
        seenPair = true;
        assert.ok(await signalPixels(page, "ufo") > 35 && await signalPixels(page, "scout") > 35, "both dimensional craft must paint a visible light signal");
        const introVisible = await page.locator(".hero-copy").evaluate((node) => !node.inert);
        if (introVisible) {
          const text = await page.locator(".hero-kicker").boundingBox();
          const header = await page.locator(".site-header").boundingBox();
          const clearance = await field.evaluate((node) => ["ufo", "scout"].map((kind) => ({ y: Number(node.dataset[`${kind}Y`]), radius: Number(node.dataset[`${kind}Radius`]) })));
          for (const craft of clearance) {
            assert.ok(craft.y + craft.radius < text.y - 10, "craft must stay above opening text");
            assert.ok(craft.y - craft.radius > header.y + header.height + 8, "craft must clear the fixed header");
          }
        }
        await page.screenshot({ path: `test-results/${viewport.width}-spacecraft-pursuit.png` });
      }
      const portal = Number(await field.getAttribute("data-wormhole-opacity"));
      if (process.argv.includes("--trace") && sample.time >= nextTrace) {
        console.log(await field.evaluate(h => Object.fromEntries(Object.entries(h.dataset).filter(([k]) => /wormhole|ufo|scout|time/.test(k)))));
        await page.screenshot({ path: `test-results/${viewport.width}-portal-trace-${nextTrace}.png` });
        nextTrace += 2;
      }
      if (!leadEntry && sample.lead && Number(await field.getAttribute("data-ufo-entry")) > .9 && portal > .9) {
        leadEntry = true;
        assert.ok(await signalPixels(page, "wormhole") > 40, "the arrival portal must paint a luminous rim");
        await page.screenshot({ path: `test-results/${viewport.width}-ufo-portal.png` });
      }
      if (!scoutEntry && sample.scout && Number(await field.getAttribute("data-scout-entry")) > .9 && portal > .9) {
        assert.ok(leadEntry, "the UFO enters before the scout"); scoutEntry = true;
        await page.screenshot({ path: `test-results/${viewport.width}-scout-portal.png` });
      }
      if (sample.time > 21.3 + delay && portal < .001) { portalClosed = true; break; }
    }
    assert.ok(seenLeader && seenPair, `the UFO must arrive first, then its scout follower (${viewport.width}px, headroom=${openingGap.toFixed(1)}, leader=${seenLeader}, pair=${seenPair})`);
    if (viewport.width === 1440) assert.ok(seenShot && shotSignal > 30, `the desktop pursuit must paint a visible shot (contrast=${shotSignal})`);
    assert.ok(leadEntry && scoutEntry && portalClosed, `portal sequence must complete (${viewport.width}px: lead=${leadEntry}, scout=${scoutEntry}, close=${portalClosed})`);
    assert.equal(await page.locator("canvas").count(), 2);
    await page.locator(".hero-stage").evaluate((hero) => window.scrollTo({ top: scrollY + hero.getBoundingClientRect().top + (hero.offsetHeight - innerHeight) * .7, behavior: "instant" }));
    let opacity = Number(await field.getAttribute("data-ufo-opacity"));
    for (let i = 0; i < 16; i++) {
      await page.clock.fastForward(250);
      const next = Number(await field.getAttribute("data-ufo-opacity"));
      assert.ok(opacity - next <= .097, "a protected chapter must fade the craft, not remove it in one frame");
      opacity = next;
    }
    await expect(page.locator(".hero-stage")).toHaveAttribute("data-phase", "worlds");
    await expect(field).toHaveAttribute("data-spacecraft-visible", "false");
    await expect(field).toHaveAttribute("data-scout-visible", "false");
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`spacecraft pursuit and clearance passed at ${viewport.width}x${viewport.height}`);
  }
} finally { await browser.close(); }
